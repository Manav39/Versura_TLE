import {AdminGetWithdrawalResponse, APIResponse} from "@/types/apiResponses";
import {useCallback, useState} from "react";
import {AdminUpdateWithdrawalBody, AdminUpdateWithdrawalParams} from "@/types/apiRequests";
import {makeAPIRequest} from "@/utils/apiHandler";
import {useToastList} from "@/utils/toastUtils";
import {
	EuiButton,
	EuiFlexGroup,
	EuiFlexItem,
	EuiGlobalToastList,
	EuiIcon,
	EuiLink,
	EuiPanel,
	EuiText
} from "@elastic/eui";
import {useRouter} from "next/router";
import Image from "next/image";
import {LINK_TEXT_COLOR_OVERRIDE} from "@/utils/common";
import Link from "next/link";

type WithdrawalApprovalProps = AdminGetWithdrawalResponse["pendingWithdrawals"][0] & {
	withdrawalProcessActive: boolean,
	global_setWithdrawalProcessActive: (activeState: boolean) => void
}

export default function WithdrawalApprovalCard(props: WithdrawalApprovalProps) {
	const {
		targetFundraiser: {
			fundraiserId, fundraiserTitle, fundraiserTarget, fundraiserRaisedAmount
		}, withdrawalAmount, withdrawalToken, withdrawalStatus, walletAddress, requestId,
		global_setWithdrawalProcessActive,
		withdrawalProcessActive
	} = props;

	const [withdrawalUpdateCompleted, setWithdrawalUpdateCompleted] = useState(false);

	const {toasts, addToast, dismissToast} = useToastList({
		toastIdFactoryFn: (toastCount, toastType) => {
			return `admin-dashboard-withdrawals-${toastCount}`;
		}
	});

	const navRouter = useRouter();

	const updateWithdrawalStatus = useCallback(async (updatedStatus: AdminUpdateWithdrawalBody["withdrawalStatus"]) => {
		global_setWithdrawalProcessActive(true);
		const {
			isSuccess,
			isError,
			code,
			data,
			error
		} = await makeAPIRequest<APIResponse, AdminUpdateWithdrawalBody, AdminUpdateWithdrawalParams>({
			endpointPath: "/api/admin/withdrawals/:withdrawalId/",
			requestMethod: "POST",
			bodyParams: {
				withdrawalStatus: updatedStatus
			},
			queryParams: {
				withdrawalId: requestId.toString()
			}
		});

		if (isError && error) {
			console.error(error);
			addToast(
				"An unexpected error occurred",
				"We weren't able to update the withdrawal",
				"danger"
			);
			global_setWithdrawalProcessActive(false);
			return;
		}

		if (isSuccess && data) {
			const {requestStatus} = data;
			if (updatedStatus === "APPROVED") {
				addToast(
					"Withdrawal approved successfully",
					(
						<EuiText>
							Funds will be transferred to the user in a short while.
							<Link
								href={`https://${process.env.NEXT_PUBLIC_EVM_CHAIN_NAME}.etherscan.io/address/${process.env.NEXT_PUBLIC_VERSURA_ACCOUNT_ADDRESS}`}
								target={"_blank"}
							>
								<EuiText color={LINK_TEXT_COLOR_OVERRIDE}>&nbsp;Track on Etherscan</EuiText>
							</Link>
						</EuiText>
					),
					"success"
				);
			} else if (updatedStatus === "REJECTED") {
				addToast(
					"Withdrawal rejected successfully",
					"No funds have been transferred and all assets have been retained",
					"success"
				);
			}
			global_setWithdrawalProcessActive(false);
			return;
		}
	}, [addToast, global_setWithdrawalProcessActive, navRouter, requestId]);

	const approveWithdrawal = () => {
		updateWithdrawalStatus("APPROVED");
	};

	const rejectWithdrawal = () => {
		updateWithdrawalStatus("REJECTED");
	};

	if (withdrawalUpdateCompleted) {
		return (
			null
		)
	}

	return (
		<EuiPanel grow={false}>
			<EuiFlexGroup direction={"column"}>
				<EuiFlexItem>
					<EuiFlexGroup alignItems={"center"}>
						<EuiFlexItem grow={0}>
							<Image
								src={
									`https://gravatar.com/avatar/${walletAddress.slice(2)}?d=retro&f=y&s=128`
								}
								alt={walletAddress}
								height={128}
								width={128}
								style={{
									borderRadius: 12
								}}
							/>
						</EuiFlexItem>
						<EuiFlexItem>
							<EuiFlexGroup direction={"column"}>
								<EuiFlexItem>
									<EuiLink
										style={{
											textDecorationColor: LINK_TEXT_COLOR_OVERRIDE
										}}
									>
										<Link
											href={`https://${process.env.NEXT_PUBLIC_EVM_CHAIN_NAME}.etherscan.io/address/${walletAddress}`}
										>
											<EuiText
												color={LINK_TEXT_COLOR_OVERRIDE}
											>
												<h3>
													{
														walletAddress.slice(0, 12) + "..." + walletAddress.slice(-12)
													}
												</h3>
											</EuiText>
										</Link>
									</EuiLink>
								</EuiFlexItem>
								<EuiFlexItem>
									<EuiLink
										style={{
											textDecorationColor: LINK_TEXT_COLOR_OVERRIDE
										}}
									>
										<Link
											href={`/fundraisers/${fundraiserId}`}
										>
											<EuiText
												color={LINK_TEXT_COLOR_OVERRIDE}
											>
												{fundraiserTitle}
											</EuiText>
										</Link>
									</EuiLink>
								</EuiFlexItem>
							</EuiFlexGroup>
						</EuiFlexItem>
					</EuiFlexGroup>
				</EuiFlexItem>
				<EuiFlexItem>
					<EuiFlexGroup>
						<EuiFlexItem grow={8}>
							<EuiPanel
								color={"subdued"}
							>
								<EuiFlexGroup justifyContent={"center"}>
									<EuiFlexItem>
										<EuiFlexGroup direction={"column"}>
											<EuiFlexItem>
												<EuiText textAlign={"center"}>
													<h2>{withdrawalAmount} {withdrawalToken}</h2>
												</EuiText>
											</EuiFlexItem>
											<EuiFlexItem>
												<EuiText textAlign={"center"}>
													<h4>Requested</h4>
												</EuiText>
											</EuiFlexItem>
										</EuiFlexGroup>
									</EuiFlexItem>
									<EuiFlexItem>
										<EuiFlexGroup direction={"column"}>
											<EuiFlexItem>
												<EuiText textAlign={"center"}>
													<h2>{fundraiserRaisedAmount} {withdrawalToken}</h2>
												</EuiText>
											</EuiFlexItem>
											<EuiFlexItem>
												<EuiText textAlign={"center"}>
													<h4>Raised</h4>
												</EuiText>
											</EuiFlexItem>
										</EuiFlexGroup>
									</EuiFlexItem>
									<EuiFlexItem>
										<EuiFlexGroup direction={"column"}>
											<EuiFlexItem>
												<EuiText textAlign={"center"}>
													<h2>{fundraiserTarget} {withdrawalToken}</h2>
												</EuiText>
											</EuiFlexItem>
											<EuiFlexItem>
												<EuiText textAlign={"center"}>
													<h4>Target</h4>
												</EuiText>
											</EuiFlexItem>
										</EuiFlexGroup>
									</EuiFlexItem>
								</EuiFlexGroup>
							</EuiPanel>
						</EuiFlexItem>
						<EuiFlexItem grow={2}>
							<EuiFlexGroup direction={"column"}>
								<EuiFlexGroup direction={"column"}>
									<EuiFlexItem>
										<EuiButton
											color={"primary"}
											fill
											onClick={approveWithdrawal}
										>
											<EuiIcon type={"check"}/> Approve
										</EuiButton>
									</EuiFlexItem>
									<EuiFlexItem>
										<EuiButton
											color={"danger"}
											fill
											onClick={rejectWithdrawal}
										>
											<EuiIcon type={"cross"}/> Reject
										</EuiButton>
									</EuiFlexItem>
								</EuiFlexGroup>
							</EuiFlexGroup>
						</EuiFlexItem>
					</EuiFlexGroup>
				</EuiFlexItem>
				<EuiGlobalToastList
					toasts={toasts}
					toastLifeTimeMs={5000}
					dismissToast={dismissToast}
				/>
			</EuiFlexGroup>
		</EuiPanel>
	);
}