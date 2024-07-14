import {GetServerSideProps} from "next";
import {GetFundraiserRequestParams,} from "@/types/apiRequests";
import {GenericMedia, GetFundraiserResponse} from "@/types/apiResponses";
import {NON_ZERO_NON_NEGATIVE} from "@/utils/validatorUtils";
import {LINK_TEXT_COLOR_OVERRIDE, requireBasicObjectValidation, useValueScale,} from "@/utils/common";
import {makeAPIRequest} from "@/utils/apiHandler";
import {
	EuiFlexGroup,
	EuiFlexItem,
	EuiGlobalToastList,
	EuiHorizontalRule,
	EuiLink,
	EuiMarkdownFormat,
	EuiPanel,
	EuiSpacer,
	EuiText,
} from "@elastic/eui";
import Image from "next/image";

import React, {useContext} from "react";
import {AuthContext} from "@/pages/_app";
import {useToastList} from "@/utils/toastUtils";
import Link from "next/link";
import Head from "next/head";
import {useRouter} from "next/router";
import {WithdrawalRequestCard} from "@/components/withdrawalRequestCard";
import {DonationCard} from "@/components/donationCard";
import {FundraiserMedia} from "@/components/fundraiserMedia";
import {FundraiserMilestones} from "@/components/fundraiserMilestones";
import {FundraiserUpdates} from "@/components/fundraiserUpdates";

export type FundraiserPageProps = GetFundraiserResponse["fundraiserData"];

// @ts-ignore
export const getServerSideProps: GetServerSideProps<FundraiserPageProps, GetFundraiserRequestParams> = async (ctx) => {
	if (ctx.params === undefined) {
		return {
			redirect: {
				destination: "/404",
			},
		};
	}

	const [isValidFundraiserId, _] = await requireBasicObjectValidation(ctx.params, {
		fundraiserId: (fundraiserId) => {
			const parsedFundraiserId = Number.parseInt(fundraiserId);
			if (Number.isNaN(parsedFundraiserId)) {
				return false;
			}
			return NON_ZERO_NON_NEGATIVE(parsedFundraiserId);
		},
	});

	if (!isValidFundraiserId) {
		return {
			redirect: {
				destination: "/400",
				permanent: true,
			},
		};
	}

	const {fundraiserId} = ctx.params;

	const {isSuccess, isError, code, data, error} = await makeAPIRequest<
		GetFundraiserResponse,
		{},
		GetFundraiserRequestParams
	>({
		endpointPath: `/api/fundraisers/:fundraiserId`,
		requestMethod: "GET",
		queryParams: {
			fundraiserId: fundraiserId,
		},
		// @ts-ignore
		ssrContext: ctx,
	});

	if (isError) {
		console.error(error);
		return {
			redirect: {
				destination: "/500",
				permanent: true,
			},
		};
	}

	if (isSuccess) {
		const {requestStatus} = data!;
		if (code === 500 && requestStatus === "ERR_INTERNAL_ERROR") {
			return {
				redirect: {
					destination: "/500",
					permanent: true,
				},
			};
		}
		if (code === 200 && requestStatus === "SUCCESS") {
			return {
				props: data!.fundraiserData,
			};
		}
		if (code === 400 && requestStatus === "ERR_INVALID_QUERY_PARAMS") {
			return {
				redirect: {
					destination: "/404",
					permanent: true,
				},
			};
		}
		if (code === 404 && requestStatus === "ERR_NOT_FOUND") {
			return {
				redirect: {
					destination: "/404",
					permanent: true,
				},
			};
		}
	}

	return {
		redirect: {
			destination: "/404",
			permanent: true,
		},
	};
};

export default function FundraiserPage(props: FundraiserPageProps): JSX.Element {
	const authCtx = useContext(AuthContext);

	const navRouter = useRouter();

	const {
		fundraiserId,
		fundraiserTarget,
		fundraiserMedia,
		fundraiserCreatedOn,
		fundraiserToken,
		fundraiserMilestoneCount,
		fundraiserContributorCount,
		fundraiserCreator,
		fundraiserDescription,
		fundraiserTitle,
		fundraiserMilestones,
		fundraiserRaisedAmount,
		fundraiserMinDonationAmount,
		fundraiserWithdrawnAmount,
		fundraiserStatus,
		fundraiserDonations,
		fundraiserUpdates
	} = props;

	const parsedFundraiserCreationDate = new Date(fundraiserCreatedOn);

	const relativeFundraiserDate = parsedFundraiserCreationDate.toDateString();

	const {toasts, addToast, dismissToast} = useToastList({
		toastIdFactoryFn: (toastCount, toastType) => {
			return `fundraiser-page-${toastCount}`;
		},
	});

	const progressStatusColors = ["danger", "orange", "yellow", "green", "success"];
	const fundraiserCompletionPercentage = (fundraiserRaisedAmount * 100) / fundraiserTarget;
	const selectedColor = useValueScale({
		minScale: 0,
		maxScale: 4,
		minValue: 0,
		maxValue: 100,
		currValue: fundraiserCompletionPercentage,
		scaledValues: progressStatusColors,
	});
	const fundraiserPercentageInt = fundraiserCompletionPercentage.toFixed(0);

	const maxWithdrawableAmount = ((fundraiserRaisedAmount * 1e8) - (fundraiserWithdrawnAmount * 1e8)) / 1e8;

	let selectedFundraiserMedia: GenericMedia | null = null
	for (const mediaObject of fundraiserMedia) {
		const {mediaContentType} = mediaObject
		if (mediaContentType.startsWith("image/")) {
			selectedFundraiserMedia = mediaObject
			break
		}
	}

	return (
		<>
			<Head>
				<title>{fundraiserTitle}</title>
				<meta name="description" content={fundraiserDescription}/>
				<meta name="viewport" content="width=device-width, initial-scale=1"/>
				<link rel="icon" href="/favicon.ico"/>
			</Head>
			<EuiFlexGroup direction={"column"} alignItems={"center"}>
				<EuiSpacer/>
				<EuiFlexItem>
					<EuiPanel
						style={{
							width: "90vw",
						}}
					>
						<EuiFlexGroup direction={"row"} alignItems={"center"}>
							<EuiFlexItem>
								<EuiText>
									<h1>{fundraiserTitle}</h1>
								</EuiText>
							</EuiFlexItem>
							<EuiFlexItem grow={0}>
								<EuiText grow={false}>
									<h4>{relativeFundraiserDate}</h4>
								</EuiText>
							</EuiFlexItem>
						</EuiFlexGroup>
					</EuiPanel>
				</EuiFlexItem>
				<EuiFlexItem>
					<EuiFlexGroup
						style={{
							width: "90vw",
						}}
					>
						<EuiFlexItem grow={7}>
							<EuiPanel>
								<EuiMarkdownFormat grow={true}>{fundraiserDescription}</EuiMarkdownFormat>
							</EuiPanel>
						</EuiFlexItem>
						<EuiFlexItem grow={3}>
							<EuiFlexGroup direction={"column"}>
								<EuiFlexItem>
									<EuiPanel>
										<EuiFlexGroup direction={"column"} alignItems={"center"}>
											<EuiFlexItem>
												<Image
													src={`https://gravatar.com/avatar/${fundraiserCreator.slice(
														2
													)}?d=retro&f=y&s=180`}
													alt={fundraiserCreator}
													width={180}
													height={180}
													style={{
														borderRadius: 18,
													}}
												/>
											</EuiFlexItem>
											<EuiFlexItem>
												<EuiLink
													style={{
														textDecorationColor: LINK_TEXT_COLOR_OVERRIDE,
													}}
												>
													<Link
														href={`https://${process.env.NEXT_PUBLIC_EVM_CHAIN_NAME}.etherscan.io/address/${fundraiserCreator}`}
														target={"_blank"}
													>
														<EuiText color={LINK_TEXT_COLOR_OVERRIDE}>
															{fundraiserCreator.slice(0, 12) +
																"..." +
																fundraiserCreator.slice(-12)}
														</EuiText>
													</Link>
												</EuiLink>
											</EuiFlexItem>
											<EuiHorizontalRule margin={"none"}/>
											<EuiFlexItem>
												<EuiFlexGroup>
													<EuiFlexItem>
														<EuiFlexGroup direction={"column"} gutterSize={"s"}>
															<EuiFlexItem>
																<EuiText textAlign={"center"} color={selectedColor}>
																	<h3>{fundraiserRaisedAmount}&nbsp;{fundraiserToken}</h3>
																</EuiText>
															</EuiFlexItem>
															<EuiFlexItem>
																<EuiText textAlign={"center"}>
																	<h5>Raised</h5>
																</EuiText>
															</EuiFlexItem>
														</EuiFlexGroup>
													</EuiFlexItem>
													<EuiFlexItem>
														<EuiFlexGroup direction={"column"} gutterSize={"s"}>
															<EuiFlexItem>
																<EuiText textAlign={"center"}>
																	<h3>{fundraiserTarget}&nbsp;{fundraiserToken}</h3>
																</EuiText>
															</EuiFlexItem>
															<EuiFlexItem>
																<EuiText textAlign={"center"}>
																	<h5>Target</h5>
																</EuiText>
															</EuiFlexItem>
														</EuiFlexGroup>
													</EuiFlexItem>
													<EuiFlexItem>
														<EuiFlexGroup direction={"column"} gutterSize={"s"}>
															<EuiFlexItem>
																<EuiText textAlign={"center"}>
																	<h3>{fundraiserContributorCount}</h3>
																</EuiText>
															</EuiFlexItem>
															<EuiFlexItem>
																<EuiText textAlign={"center"}>
																	<h5>Contributors</h5>
																</EuiText>
															</EuiFlexItem>
														</EuiFlexGroup>
													</EuiFlexItem>
												</EuiFlexGroup>
											</EuiFlexItem>
										</EuiFlexGroup>
									</EuiPanel>
								</EuiFlexItem>
								{fundraiserStatus !== "IN_QUEUE" ? (
									<>
										{authCtx.metamaskAddress === fundraiserCreator ? (
											<EuiFlexItem>
												<WithdrawalRequestCard
													fundraiserId={fundraiserId}
													fundraiserToken={fundraiserToken}
													maxWithdrawableAmount={maxWithdrawableAmount}
													addToast={addToast}
												/>
											</EuiFlexItem>
										) : (
											<EuiFlexItem>
												<DonationCard
													fundraiserId={fundraiserId}
													fundraiserToken={fundraiserToken}
													fundraiserMinDonationAmount={fundraiserMinDonationAmount}
													addToast={addToast}
												/>
											</EuiFlexItem>
										)}
									</>
								) : null}
							</EuiFlexGroup>
						</EuiFlexItem>
					</EuiFlexGroup>
				</EuiFlexItem>
				<EuiFlexItem>
					<FundraiserMedia
						fundraiserId={fundraiserId}
						fundraiserCreator={fundraiserCreator}
						fundraiserMedia={fundraiserMedia}
						addToast={addToast}
					/>
				</EuiFlexItem>
				<EuiFlexItem>
					<FundraiserMilestones
						{...props}
						fundraiserDefaultMedia={selectedFundraiserMedia ?? undefined}
						addToast={addToast}
					/>
				</EuiFlexItem>
				{/*{*/}
				{/*	fundraiserStatus !== "IN_QUEUE" ? (*/}
				{/*		<EuiFlexItem>*/}
				{/*			<FundraiserDonationTable*/}
				{/*				fundraiserToken={fundraiserToken}*/}
				{/*				fundraiserDonations={fundraiserDonations}*/}
				{/*			/>*/}
				{/*		</EuiFlexItem>*/}
				{/*	) : (*/}
				{/*		null*/}
				{/*	)*/}
				{/*}*/}
				<EuiFlexItem>
					<FundraiserUpdates
						fundraiserCreator={fundraiserCreator}
						fundraiserUpdates={fundraiserUpdates}
						fundraiserId={fundraiserId}
						addToast={addToast}
					/>
				</EuiFlexItem>
				<EuiSpacer/>
				<EuiGlobalToastList dismissToast={dismissToast} toasts={toasts} toastLifeTimeMs={5000}/>
			</EuiFlexGroup>
		</>
	);
}