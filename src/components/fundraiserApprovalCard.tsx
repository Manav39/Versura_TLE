import {APIResponse, GenericMedia, GetFundraiserResponse} from "@/types/apiResponses";
import {
	EuiAvatar,
	EuiButton,
	EuiFlexGroup,
	EuiFlexItem,
	EuiGlobalToastList,
	EuiIcon,
	EuiLink,
	EuiLoadingSpinner,
	EuiPanel,
	EuiText
} from "@elastic/eui";

import PlaceholderImage from "@/assets/placeholder-image.png";
import Image from "next/image";
import {LINK_TEXT_COLOR_OVERRIDE} from "@/utils/common";
import Link from "next/link";
import {useCallback} from "react";
import {makeAPIRequest} from "@/utils/apiHandler";
import {AdminUpdateFundraiserBody, AdminUpdateFundraiserParams} from "@/types/apiRequests";
import {useToastList} from "@/utils/toastUtils";
import {useRouter} from "next/router";

type FundraiserCardProps = Omit<
	GetFundraiserResponse["fundraiserData"],
	"fundraiserMilestones" | "fundraiserDonations" | "fundraiserUpdates"
> & {
	approvalOrRejectionProcessActive: boolean,
	global_setApprovalOrRejectionProcessActive: (activeState: boolean) => void
}

function FundraiserApprovalCard(props: FundraiserCardProps) {
	const {
		fundraiserId, fundraiserTitle,
		fundraiserDescription, fundraiserCreator,
		fundraiserTarget, fundraiserToken,
		fundraiserMinDonationAmount, fundraiserContributorCount,
		fundraiserRaisedAmount, fundraiserCreatedOn,
		fundraiserMedia, fundraiserMilestoneCount,
		approvalOrRejectionProcessActive, global_setApprovalOrRejectionProcessActive
	} = props;

	const {toasts, addToast, dismissToast} = useToastList({
		toastIdFactoryFn: (toastCount, toastType) => {
			return `admin-dashboard-fundraisers-${toastCount}`;
		}
	});

	const navRouter = useRouter()

	let selectedFundraiserImage: GenericMedia | null = null;
	for (const media of fundraiserMedia) {
		const {mediaContentType} = media;
		if (mediaContentType.startsWith("image")) {
			selectedFundraiserImage = media;
			break;
		}
	}

	const parsedFundraiserDate = new Date(fundraiserCreatedOn);

	const updateFundraiserStatus = useCallback(async (fundraiserStatus: AdminUpdateFundraiserBody["fundraiserStatus"]) => {
		if (approvalOrRejectionProcessActive) return;
		global_setApprovalOrRejectionProcessActive(true);
		const {
			isSuccess,
			isError,
			code,
			data,
			error
		} = await makeAPIRequest<APIResponse, AdminUpdateFundraiserBody, AdminUpdateFundraiserParams>({
			endpointPath: "/api/admin/fundraisers/:fundraiserId/",
			requestMethod: "POST",
			queryParams: {
				fundraiserId: fundraiserId.toString()
			},
			bodyParams: {
				fundraiserStatus: fundraiserStatus
			}
		});

		if (isError && error) {
			console.error(error);
			addToast(
				"An internal server error occurred",
				"The fundraiser could not be updated",
				"danger"
			);
			global_setApprovalOrRejectionProcessActive(false);
			return;
		}

		if (isSuccess && data) {
			const {requestStatus} = data;
			if (requestStatus === "SUCCESS") {
				if (fundraiserStatus === "OPEN") {
					addToast(
						"Fundraiser approved successfully",
						(
							<EuiText>
								The fundraiser can now be viewed and donated to publicly
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
											&nbsp;here
										</EuiText>
									</Link>
								</EuiLink>
							</EuiText>
						),
						"success"
					);
				} else if (fundraiserStatus === "CLOSED") {
					addToast(
						"Fundraiser rejected successfully",
						"The fundraiser has been rejected and cannot be accessed by the public",
						"success"
					);
				}
				setTimeout(() => {
					navRouter.reload()
				}, 500)
				global_setApprovalOrRejectionProcessActive(false);
				return;
			}

			addToast(
				"An internal server error occurred",
				"The fundraiser could not be updated",
				"danger"
			);
			return;
		}
	}, [addToast, approvalOrRejectionProcessActive, fundraiserId, global_setApprovalOrRejectionProcessActive]);

	const approveFundraiser = () => {
		updateFundraiserStatus("OPEN");
	};

	const rejectFundraiser = () => {
		updateFundraiserStatus("CLOSED");
	}

	return (
		<EuiPanel grow={false}>
			<EuiFlexGroup direction={"column"}>
				<EuiFlexItem>
					<EuiFlexGroup
						direction={"row"}
						alignItems={"center"}
						justifyContent={"spaceAround"}
						gutterSize={"xl"}
					>
						<EuiFlexItem
							grow={0}
						>
							<Image
								src={
									selectedFundraiserImage ? selectedFundraiserImage.mediaURL : PlaceholderImage
								}
								alt={`${fundraiserTitle} Banner Image`}
								width={240}
								height={-1}
								style={{
									borderRadius: 12,
									maxHeight: 150
								}}
							/>
						</EuiFlexItem>
						<EuiFlexItem>
							<EuiFlexGroup
								direction={"column"}
							>
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
												<h3>{fundraiserTitle}</h3>
											</EuiText>
										</Link>
									</EuiLink>
								</EuiFlexItem>
								<EuiFlexItem>
									<EuiFlexGroup>
										<EuiFlexItem
											grow={0}
										>
											<EuiAvatar
												name={fundraiserCreator}
												color={"plain"}
												type={"space"}
												imageUrl={
													`//gravatar.com/avatar/${fundraiserCreator.slice(2)}?d=retro&f=y`
												}
											/>
										</EuiFlexItem>
										<EuiFlexItem
											grow={0}
										>
											<EuiLink
												style={{
													textDecorationColor: LINK_TEXT_COLOR_OVERRIDE
												}}
											>
												<Link
													href={`https://${process.env.NEXT_PUBLIC_EVM_CHAIN_NAME}.etherscan.io/address/${fundraiserCreator}`}
													target={"_blank"}
												>
													<EuiText
														color={LINK_TEXT_COLOR_OVERRIDE}
													>
														{fundraiserCreator}
													</EuiText>
												</Link>
											</EuiLink>
										</EuiFlexItem>
									</EuiFlexGroup>
								</EuiFlexItem>
							</EuiFlexGroup>
						</EuiFlexItem>
					</EuiFlexGroup>
				</EuiFlexItem>
				<EuiFlexItem>
					<EuiFlexGroup>
						<EuiFlexItem grow={8}>
							<EuiPanel color={"subdued"}>
								<EuiFlexGroup justifyContent={"center"}>
									<EuiFlexItem>
										<EuiFlexGroup
											direction={"column"}
											justifyContent={"center"}
										>
											<EuiFlexItem>
												<EuiText textAlign={"center"}>
													<h2>
														{fundraiserTarget} {fundraiserToken}
													</h2>
												</EuiText>
											</EuiFlexItem>
											<EuiFlexItem>
												<EuiText textAlign={"center"}>
													<h4>
														Target
													</h4>
												</EuiText>
											</EuiFlexItem>
										</EuiFlexGroup>
									</EuiFlexItem>
									<EuiFlexItem>
										<EuiFlexGroup
											direction={"column"}
											justifyContent={"center"}
										>
											<EuiFlexItem>
												<EuiText textAlign={"center"}>
													<h2>
														{fundraiserMinDonationAmount} {fundraiserToken}
													</h2>
												</EuiText>
											</EuiFlexItem>
											<EuiFlexItem>
												<EuiText textAlign={"center"}>
													<h4>
														Min. Amount
													</h4>
												</EuiText>
											</EuiFlexItem>
										</EuiFlexGroup>
									</EuiFlexItem>
									<EuiFlexItem>
										<EuiFlexGroup
											direction={"column"}
											justifyContent={"center"}
										>
											<EuiFlexItem>
												<EuiText textAlign={"center"}>
													<h2>
														{parsedFundraiserDate.toLocaleDateString()}
													</h2>
												</EuiText>
											</EuiFlexItem>
											<EuiFlexItem>
												<EuiText textAlign={"center"}>
													<h4>
														Created On
													</h4>
												</EuiText>
											</EuiFlexItem>
										</EuiFlexGroup>
									</EuiFlexItem>
								</EuiFlexGroup>
							</EuiPanel>
						</EuiFlexItem>
						<EuiFlexItem grow={2}>
							<EuiFlexGroup direction={"column"}>
								<EuiFlexItem>
									<EuiButton
										color={"primary"}
										fill
										onClick={approveFundraiser}
										disabled={approvalOrRejectionProcessActive}
									>
										{
											approvalOrRejectionProcessActive ? (
												<EuiLoadingSpinner/>
											) : (
												<>
													<EuiIcon type={"check"}/> Approve
												</>
											)
										}
									</EuiButton>
								</EuiFlexItem>
								<EuiFlexItem>
									<EuiButton
										color={"danger"}
										fill
										onClick={rejectFundraiser}
										disabled={approvalOrRejectionProcessActive}
									>
										{
											approvalOrRejectionProcessActive ? (
												<EuiLoadingSpinner/>
											) : (
												<>
													<EuiIcon type={"cross"}/> Reject
												</>
											)
										}
									</EuiButton>
								</EuiFlexItem>
							</EuiFlexGroup>
						</EuiFlexItem>
					</EuiFlexGroup>
				</EuiFlexItem>
				<EuiGlobalToastList
					dismissToast={dismissToast}
					toasts={toasts}
					toastLifeTimeMs={5000}
				/>
			</EuiFlexGroup>
		</EuiPanel>
	);
}

export {
	FundraiserApprovalCard
};