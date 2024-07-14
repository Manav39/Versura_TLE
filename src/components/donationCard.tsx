import {
	EuiButton,
	EuiCheckbox,
	EuiFieldText,
	EuiFlexGroup,
	EuiFlexItem,
	EuiForm,
	EuiFormRow,
	EuiHorizontalRule,
	EuiLoadingSpinner,
	EuiPanel,
	EuiText,
	useGeneratedHtmlId
} from "@elastic/eui";
import {FundraiserPageProps} from "@/pages/fundraisers/[fundraiserId]";
import {useCallback, useContext, useState} from "react";
import {AuthContext} from "@/pages/_app";
import {makeAPIRequest} from "@/utils/apiHandler";
import {APIResponse} from "@/types/apiResponses";
import {FundraiserDonationBody, FundraiserDonationParams} from "@/types/apiRequests";
import {calculateServiceFeeWeiForAmount, gasAmountMap, gasTokenMap, LINK_TEXT_COLOR_OVERRIDE} from "@/utils/common";
import {ToastUtils} from "@/utils/toastUtils";
import Link from "next/link";

type DonationCardProps = Pick<
	FundraiserPageProps,
	"fundraiserMinDonationAmount" | "fundraiserToken" | "fundraiserId"
> & {
	addToast: ToastUtils["addToast"]
}

function DonationCard(props: DonationCardProps) {
	const authCtx = useContext(AuthContext);
	const {fundraiserToken, fundraiserMinDonationAmount, fundraiserId, addToast} = props;

	const [donationAmount, setDonationAmount] = useState(fundraiserMinDonationAmount);
	const [donationInvalid, setDonationInvalid] = useState(false);
	const [donationRequestActive, setDonationRequestActive] = useState(false);

	const [conditionsAccepted, setConditionsAccepted] = useState(false);

	const checkboxId = useGeneratedHtmlId({
		prefix: "fundraiser-checkbox",
	});

	const calculatedServiceFeeWei = calculateServiceFeeWeiForAmount(donationAmount, fundraiserToken);
	const calculatedServiceFeeEth = calculatedServiceFeeWei * 1e-18;
	const finalAmountEth = donationAmount + calculatedServiceFeeEth;

	// @ts-ignore
	const selectedGasToken = gasTokenMap[fundraiserToken];
	// @ts-ignore
	const gasAmountWei = gasAmountMap[fundraiserToken];

	const sendFundraiserDonation = useCallback(async () => {
		if (!authCtx.isAuthenticated) {
			addToast("Log in to send funds", "You must be authenticated to send funds", "danger");
			return;
		}

		if (donationInvalid) {
			addToast(
				"Invalid amount entered",
				`Please enter a value greater than ${fundraiserMinDonationAmount} ${fundraiserToken}`,
				"danger"
			);
			return;
		}

		if (!conditionsAccepted) {
			addToast("You must accept the Terms and Conditions", "", "danger");
			return;
		}

		const holdingAccountAddress = process.env.NEXT_PUBLIC_VERSURA_ACCOUNT_ADDRESS;

		try {
			setDonationRequestActive(true);

			const finalAmountWei = finalAmountEth * 1e18;
			const finalAmountString = finalAmountWei.toString(16);

			const requestParams = {
				from: authCtx.metamaskAddress!,
				to: holdingAccountAddress,
				value: finalAmountString,
			};

			// @ts-ignore
			const ethResponse: string = await window.ethereum.request({
				method: "eth_sendTransaction",
				params: [requestParams],
			});

			const {isSuccess, isError, code, data, error} = await makeAPIRequest<
				APIResponse,
				FundraiserDonationBody,
				FundraiserDonationParams
			>({
				endpointPath: `/api/fundraisers/:fundraiserId/donations`,
				requestMethod: "POST",
				queryParams: {
					fundraiserId: fundraiserId.toString(),
				},
				bodyParams: {
					donatedAmount: donationAmount,
					transactionHash: ethResponse,
				},
			});

			if (isError && error) {
				addToast(
					"We encountered an error when processing your request",
					(error as Error).message || "",
					"danger"
				);
				setDonationRequestActive(false);
				return;
			}

			if (isSuccess && data) {
				const {requestStatus} = data;
				if (requestStatus === "SUCCESS") {
					addToast(
						"Transaction created successfully!",
						<Link
							href={`https://${process.env.NEXT_PUBLIC_EVM_CHAIN_NAME}.etherscan.io/tx/${ethResponse}`}
							target={"_blank"}
						>
							<EuiText color={LINK_TEXT_COLOR_OVERRIDE}>View on Etherscan</EuiText>
						</Link>,
						"success"
					);
					setDonationRequestActive(false);
					return;
				} else {
					addToast("We encountered an error when processing your request", "", "danger");
					setDonationRequestActive(false);
					return;
				}
			}
		} catch (err) {
			// @ts-ignore
			if (err.code === 4001) {
				addToast("Transaction was cancelled", "Transaction was cancelled by the user", "warning");
				setDonationRequestActive(false);
				return;
			}
			console.error(err);
			addToast("An unexpected error occurred", "We weren't able to complete your transaction", "danger");
			setDonationRequestActive(false);
			return;
		}
	}, [authCtx.isAuthenticated, authCtx.metamaskAddress, donationInvalid, conditionsAccepted, addToast, fundraiserMinDonationAmount, fundraiserToken, finalAmountEth, fundraiserId, donationAmount]);

	return (
		<EuiPanel>
			<EuiFlexGroup direction={"column"} alignItems={"center"}>
				<EuiFlexItem>
					<EuiText>
						<h1>Fund this Campaign</h1>
					</EuiText>
				</EuiFlexItem>
				<EuiHorizontalRule margin={"none"}/>
				<EuiFlexItem>
					<EuiForm fullWidth>
						<EuiFormRow
							label={"Base Amount"}
							helpText={
								"This amount will directly go to the fundraiser creator"
							}
						>
							<EuiFieldText
								placeholder={`${fundraiserMinDonationAmount}`}
								defaultValue={fundraiserMinDonationAmount}
								append={fundraiserToken}
								onChange={(e) => {
									const parsedDonationAmount = Number.parseFloat(
										e.target.value
									);
									if (Number.isNaN(parsedDonationAmount)) {
										setDonationInvalid(true);
										return;
									}
									if (
										parsedDonationAmount <
										fundraiserMinDonationAmount
									) {
										setDonationInvalid(true);
										return;
									}
									setDonationAmount(parsedDonationAmount);
									setDonationInvalid(false);
								}}
								isInvalid={donationInvalid}
							/>
						</EuiFormRow>
						<EuiFormRow
							label={"Service Fees"}
							helpText={"This service fee is levied by Versura"}
						>
							<EuiFieldText
								readOnly
								value={calculatedServiceFeeEth.toFixed(8)}
								append={fundraiserToken}
							/>
						</EuiFormRow>
						<EuiFormRow
							label={"Final Transaction Amount"}
							fullWidth
							helpText={"Final Amount Payable"}
						>
							<EuiFieldText
								value={finalAmountEth.toFixed(8)}
								readOnly
								append={fundraiserToken}
								fullWidth
							/>
						</EuiFormRow>
						<EuiFormRow>
							<EuiCheckbox
								id={checkboxId}
								checked={conditionsAccepted}
								onChange={(e) => {
									setConditionsAccepted(e.target.checked);
								}}
								label={"I accept the Terms and Conditions"}
							/>
						</EuiFormRow>
						<EuiFormRow fullWidth>
							{authCtx.isAuthenticated ? (
								<EuiButton
									color={"primary"}
									fill
									fullWidth
									onClick={sendFundraiserDonation}
									disabled={
										(!donationInvalid && !conditionsAccepted) ||
										donationRequestActive
									}
								>
									{donationRequestActive ? (
										<EuiLoadingSpinner/>
									) : (
										`Send ${fundraiserToken}`
									)}
								</EuiButton>
							) : (
								<EuiButton
									color={"primary"}
									fill
									disabled
									fullWidth
								>
									Log in to donate funds
								</EuiButton>
							)}
						</EuiFormRow>
					</EuiForm>
				</EuiFlexItem>
			</EuiFlexGroup>
		</EuiPanel>
	);
}

export {
	DonationCard
}