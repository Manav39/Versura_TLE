import {
	EuiButton,
	EuiFieldText,
	EuiFlexGroup,
	EuiFlexItem,
	EuiForm,
	EuiFormRow,
	EuiLoadingSpinner,
	EuiPanel,
	EuiText
} from "@elastic/eui";
import {FundraiserPageProps} from "@/pages/fundraisers/[fundraiserId]";
import {useCallback, useState} from "react";
import {makeAPIRequest} from "@/utils/apiHandler";
import {APIResponse} from "@/types/apiResponses";
import {FundraiserWithdrawalRequestBody, FundraiserWithdrawalRequestParams} from "@/types/apiRequests";
import {ToastUtils} from "@/utils/toastUtils";

export type WithdrawalRequestCardProps = Pick<
	FundraiserPageProps,
	"fundraiserToken" | "fundraiserId"
> & {
	maxWithdrawableAmount: number,
	addToast: ToastUtils["addToast"]
}

function WithdrawalRequestCard(props: WithdrawalRequestCardProps) {
	const {maxWithdrawableAmount, fundraiserToken, fundraiserId, addToast} = props;

	const [withdrawalAmount, setWithdrawalAmount] = useState(maxWithdrawableAmount);
	const [withdrawalInvalid, setWithdrawalInvalid] = useState(false);
	const [withdrawalRequestActive, setWithdrawalRequestActive] = useState(false);

	const createWithdrawalRequest = useCallback(async () => {
		if (withdrawalInvalid) {
			addToast(
				"Invalid withdrawal amount provided",
				"The withdrawal amount cannot be greater than the funds accumulated",
				"danger"
			);
			return;
		}

		setWithdrawalRequestActive(true);
		const {isSuccess, isError, code, data, error} = await makeAPIRequest<
			APIResponse,
			FundraiserWithdrawalRequestBody,
			FundraiserWithdrawalRequestParams
		>({
			endpointPath: "/api/fundraisers/:fundraiserId/withdrawals",
			requestMethod: "POST",
			queryParams: {
				fundraiserId: fundraiserId.toString(),
			},
			bodyParams: {
				withdrawalAmount: withdrawalAmount,
			},
		});

		if (isError && error) {
			addToast("We encountered an error when processing your request", (error as Error).message || "", "danger");
			setWithdrawalRequestActive(false);
			return;
		}

		if (isSuccess && data) {
			const {requestStatus, invalidParams} = data;
			if (requestStatus === "SUCCESS") {
				addToast(
					"Your request was successfully registered",
					"Funds will be made available to you once the request is manually approved",
					"success"
				);
				setWithdrawalRequestActive(false);
				return;
			} else if (requestStatus === "ERR_INVALID_BODY_PARAMS") {
				if (invalidParams!.includes("withdrawalAmount")) {
					addToast(
						"Invalid withdrawal amount specified",
						"The amount you entered has not been acquired yet",
						"danger"
					);
					setWithdrawalRequestActive(false);
					return;
				}
			} else {
				addToast("We encountered an error when processing your request", "", "danger");
				setWithdrawalRequestActive(false);
				return;
			}
		}
	}, [withdrawalAmount, withdrawalInvalid]);

	return (
		<EuiPanel>
			<EuiFlexGroup direction={"column"} alignItems={"center"}>
				<EuiFlexItem>
					<EuiText>
						<h1>Request Withdrawal</h1>
					</EuiText>
				</EuiFlexItem>
				<EuiFlexItem>
					<EuiForm fullWidth>
						<EuiFormRow label={"Amount to withdraw"} fullWidth>
							<EuiFieldText
								fullWidth
								defaultValue={maxWithdrawableAmount}
								append={fundraiserToken}
								isInvalid={withdrawalInvalid}
								onChange={(e) => {
									const withdrawalAmtString = e.target.value;
									const parsedAmount =
										Number.parseFloat(withdrawalAmtString);
									if (Number.isNaN(parsedAmount)) {
										setWithdrawalInvalid(true);
										return;
									}
									if (parsedAmount > maxWithdrawableAmount) {
										setWithdrawalInvalid(true);
										return;
									}
									if (parsedAmount <= 0) {
										setWithdrawalInvalid(true);
										return;
									}
									setWithdrawalAmount(parsedAmount);
									setWithdrawalInvalid(false);
								}}
							/>
						</EuiFormRow>
						<EuiFormRow fullWidth>
							<EuiButton
								color={"primary"}
								fullWidth
								fill
								disabled={
									withdrawalInvalid ||
									withdrawalRequestActive ||
									maxWithdrawableAmount == 0
								}
								onClick={createWithdrawalRequest}
							>
								{withdrawalRequestActive ? (
									<EuiLoadingSpinner/>
								) : (
									`Create Request`
								)}
							</EuiButton>
						</EuiFormRow>
					</EuiForm>
				</EuiFlexItem>
			</EuiFlexGroup>
		</EuiPanel>
	);
}

export {
	WithdrawalRequestCard
}