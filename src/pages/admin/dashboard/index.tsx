/*
 * Sample dashboard data
 * Use this data to create a mock dashboard UI
 * Page component *must* accept the following data as props
 * */
import {
	EuiCard,
	EuiFlexGroup,
	EuiFlexItem,
	EuiHorizontalRule,
	EuiIcon,
	EuiPageTemplate,
	EuiPanel,
	EuiSpacer,
	EuiText,
} from "@elastic/eui";
import {GetServerSideProps, GetServerSidePropsContext} from "next";
import {Suspense, useState} from "react";
import Head from "next/head";
import {
	AdminDashboardData,
	AdminGetDashboardResponse,
	AdminGetFundraisersResponse,
	AdminGetWithdrawalResponse,
} from "@/types/apiResponses";
import {makeAPIRequest} from "@/utils/apiHandler";
import {AdminGetFundraisersParams, AdminGetWithdrawalsParams} from "@/types/apiRequests";
import {NON_ZERO_NON_NEGATIVE, STRING_TO_NUM_FN} from "@/utils/validatorUtils";
import {FundraiserApprovalCard} from "@/components/fundraiserApprovalCard";
import WithdrawalApprovalCard from "@/components/withdrawalApprovalCard";

type AdminDashboardProps = {
	fundraiserPage: number; // Paginated
	withdrawalPage: number; // Paginated
	pendingFundraisers: AdminGetFundraisersResponse["pendingFundraisers"]; // Array of pending fundraiser data
	pendingWithdrawals: AdminGetWithdrawalResponse["pendingWithdrawals"];
	dashboardData: AdminDashboardData;
};

export const getServerSideProps: GetServerSideProps<
	AdminDashboardProps
	// @ts-ignore
> = async (ctx: GetServerSidePropsContext<AdminGetFundraisersParams & AdminGetWithdrawalsParams>) => {
	const withdrawalPage = (ctx.query.withdrawalPage as string) || "1";
	const fundraiserPage = (ctx.query.fundraiserPage as string) || "1";

	const validWithdrawalPage = await STRING_TO_NUM_FN(NON_ZERO_NON_NEGATIVE)(withdrawalPage);
	const validFundraiserPage = await STRING_TO_NUM_FN(NON_ZERO_NON_NEGATIVE)(fundraiserPage);

	if (!validWithdrawalPage || !validFundraiserPage) {
		console.log(withdrawalPage, fundraiserPage);
		return {
			redirect: {
				destination: "/404",
				permanent: false
			},
		};
	}

	const parsedFundraiserPage = Number.parseInt(fundraiserPage);
	const parsedWithdrawalPage = Number.parseInt(withdrawalPage);

	const requestStatuses: boolean[] = [];
	const requestErrors: any[] = [];

	const dashboardResponse = await makeAPIRequest<AdminGetDashboardResponse>({
		endpointPath: `/api/admin/dashboard`,
		requestMethod: "GET",
		// @ts-ignore
		ssrContext: ctx,
	});

	const {
		isSuccess: isDashboardSuccess,
		isError: isDashboardError,
		error: dashboardError,
		data: dashboardResponseData,
		code: dashboardResponseCode,
	} = dashboardResponse;

	requestStatuses.push(isDashboardSuccess);
	requestErrors.push(dashboardError);

	const withdrawalResponse = await makeAPIRequest<AdminGetWithdrawalResponse, {}, AdminGetWithdrawalsParams>({
		endpointPath: `/api/admin/withdrawals`,
		requestMethod: "GET",
		queryParams: {
			withdrawalPage: withdrawalPage,
		},
		// @ts-ignore
		ssrContext: ctx,
	});

	const {
		isSuccess: isWithdrawalSuccess,
		isError: isWithdrawalError,
		code: withdrawalResponseCode,
		error: withdrawalError,
		data: withdrawalResponseData,
	} = withdrawalResponse;

	requestStatuses.push(isWithdrawalSuccess);
	requestErrors.push(withdrawalError);

	const fundraiserResponse = await makeAPIRequest<AdminGetFundraisersResponse, {}, AdminGetFundraisersParams>({
		endpointPath: `/api/admin/fundraisers`,
		requestMethod: "GET",
		queryParams: {
			fundraiserPage: fundraiserPage,
		},
		// @ts-ignore
		ssrContext: ctx,
	});

	const {
		isSuccess: isFundraiserSuccess,
		isError: isFundraiserError,
		code: fundraiserResponseCode,
		error: fundraiserError,
		data: fundraiserResponseData,
	} = fundraiserResponse;

	requestStatuses.push(isFundraiserSuccess);
	requestErrors.push(fundraiserError);

	const adminRequestStatusAcc = requestStatuses.reduce((prev, curr) => {
		return prev && curr;
	}, true);

	if (!adminRequestStatusAcc) {
		requestErrors.forEach((err) => {
			err && console.error(err);
		});
		return {
			redirect: {
				destination: "/500",
				permanent: false
			},
		};
	}

	const requestDataAcc = [dashboardResponseData!, fundraiserResponseData!, withdrawalResponseData!];

	const dataRequestsAuth = requestDataAcc.map((responseData) => {
		const {requestStatus} = responseData;
		return requestStatus === "ERR_AUTH_REQUIRED" || requestStatus === "ERR_ADMIN_REQUIRED";
	});

	const authAcc = dataRequestsAuth.reduce((prev, curr) => {
		return prev && curr
	}, true)

	if (authAcc) {
		return {
			redirect: {
				destination: "/404",
				permanent: false
			}
		}
	}

	const dataRequestsSuccess = requestDataAcc.map((responseData) => {
		const {requestStatus} = responseData;
		return requestStatus === "SUCCESS";
	});

	const successAcc = dataRequestsSuccess.reduce((prev, curr) => {
		return prev && curr
	}, true)

	if (!successAcc) {
		return {
			redirect: {
				destination: "/500",
				permanent: false
			}
		};
	}

	const {pendingFundraisers} = fundraiserResponseData!;
	const {pendingWithdrawals} = withdrawalResponseData!;
	const {dashboardData} = dashboardResponseData!;

	return {
		props: {
			dashboardData,
			pendingWithdrawals,
			pendingFundraisers,
			fundraiserPage: parsedFundraiserPage,
			withdrawalPage: parsedWithdrawalPage,
		},
	};
};

export default function AdminDashboard(props: AdminDashboardProps) {
	const {dashboardData, fundraiserPage, withdrawalPage, pendingWithdrawals, pendingFundraisers} = props;

	const [approvalOrRejectionProcessActive, setApprovalOrRejectionProcessActive] = useState(false);
	const [withdrawalProcessActive, setWithdrawalProcessActive] = useState<boolean>(false);

	// Add UI Code Here

	return (
		<Suspense>
			<Head>
				<title>Admin</title>
				<meta name="description" content="Admin Page"/>
				<meta name="viewport" content="width=device-width, initial-scale=1"/>
				<link rel="icon" href="/favicon.ico"/>
			</Head>
			<EuiPageTemplate.Section color={"subdued"}>
				<EuiFlexGroup direction={"column"}>
					<EuiFlexItem>
						<EuiFlexGroup>
							<EuiFlexItem>
								<EuiCard
									title={
										<EuiText>
											<h1>
												{dashboardData.totalFundraiserCount}
											</h1>
										</EuiText>
									}
									description={
										<EuiText>
											Fundraisers
										</EuiText>
									}
									icon={
										<EuiIcon type="tableDensityExpanded" size="xxl"/>
									}
								/>
							</EuiFlexItem>
							<EuiFlexItem>
								<EuiCard
									title={
										<EuiText>
											<h1>
												{dashboardData.totalWithdrawalAmount.toFixed(3)} ETH
											</h1>
										</EuiText>
									}
									description={
										<EuiText>
											Withdrawn
										</EuiText>
									}
									icon={
										<EuiIcon type="indexEdit" size="xxl"/>
									}
								/>
							</EuiFlexItem>
							<EuiFlexItem>
								<EuiCard
									title={
										<EuiText>
											<h1>
												{dashboardData.totalDonatedAmount.toFixed(3)} ETH
											</h1>
										</EuiText>}
									description={
										<EuiText>
											Donated
										</EuiText>
									}
									icon={
										<EuiIcon type="flag" size="xxl"/>
									}
								/>
							</EuiFlexItem>
							<EuiFlexItem>
								<EuiCard
									title={
										<EuiText>
											<h1>
												{dashboardData.totalUserCount}
											</h1>
										</EuiText>
									}
									description={
										<EuiText>
											Users
										</EuiText>
									}
									icon={
										<EuiIcon type="users" size="xxl"/>
									}
								/>
							</EuiFlexItem>
							<EuiFlexItem>
								<EuiCard
									title={
										<EuiText>
											<h1>
												{dashboardData.totalSuccessfulCampaigns}
											</h1>
										</EuiText>
									}
									description={
										<EuiText>
											Successful Campaigns
										</EuiText>
									}
									icon={
										<EuiIcon type="checkInCircleFilled" size="xxl"/>
									}
								/>
							</EuiFlexItem>
						</EuiFlexGroup>
					</EuiFlexItem>
					<EuiFlexItem>
						<EuiFlexGroup>
							<EuiFlexItem>
								<EuiCard
									title={
										<EuiText>
											<h1>
												{dashboardData.totalPendingFundraiserCount}
											</h1>
										</EuiText>
									}
									description={
										<EuiText>
											Pending Fundraisers
										</EuiText>
									}
									icon={<EuiIcon type="clock" size="xxl"/>}
								/>

							</EuiFlexItem>
							<EuiFlexItem>
								<EuiCard
									title={
										<EuiText>
											<h1>
												{dashboardData.totalPendingWithdrawalCount}
											</h1>
										</EuiText>
									}
									description={
										<EuiText>
											Pending Withdrawals
										</EuiText>
									}
									icon={<EuiIcon type="percent" size="xxl"/>}
								/>

							</EuiFlexItem>
							<EuiFlexItem>
								<EuiCard
									title={
										<EuiText>
											<h1>
												{dashboardData.reachedMilestoneCount}
											</h1>
										</EuiText>
									}
									description={
										<EuiText>
											Milestones Reached
										</EuiText>
									}
									icon={
										<EuiIcon type="flag" size="xxl"/>
									}
								/>
							</EuiFlexItem>
							<EuiFlexItem>
								<EuiCard
									title={
										<EuiText>
											<h1>
												{dashboardData.totalUniqueDonors}
											</h1>
										</EuiText>
									}
									description={
										<EuiText>
											Donors
										</EuiText>
									}
									icon={
										<EuiIcon type="user" size="xxl"/>
									}
								/>
							</EuiFlexItem>
							<EuiFlexItem>
								<EuiCard
									title={
										<EuiText>
											<h1>
												{dashboardData.totalUpdateCount}
											</h1>
										</EuiText>
									}
									description={
										<EuiText>
											Updates
										</EuiText>
									}
									icon={
										<EuiIcon type="pencil" size="xxl"/>
									}
								/>
							</EuiFlexItem>
						</EuiFlexGroup>
					</EuiFlexItem>
					<EuiFlexItem>
						<EuiHorizontalRule margin={"m"}/>
					</EuiFlexItem>
					<EuiFlexItem>
						<EuiFlexGroup
							direction={"row"}
							justifyContent={"spaceEvenly"}
						>
							<EuiFlexItem>
								<EuiFlexGroup direction={"column"}>
									<EuiFlexItem>
										<EuiPanel grow={false}>
											<EuiText>
												<h2>Approve Fundraisers</h2>
											</EuiText>
										</EuiPanel>
									</EuiFlexItem>
									{
										pendingFundraisers.length ? (
											<>
												{
													pendingFundraisers.map((pendingFundraiser) => {
														return (
															<EuiFlexItem
																key={pendingFundraiser.fundraiserId}
																grow={0}
															>
																<FundraiserApprovalCard
																	approvalOrRejectionProcessActive={approvalOrRejectionProcessActive}
																	global_setApprovalOrRejectionProcessActive={setApprovalOrRejectionProcessActive}
																	{...pendingFundraiser}
																/>
															</EuiFlexItem>
														);
													})
												}
											</>
										) : (
											<EuiCard
												title={"No fundraisers pending!"}
												titleElement={"h2"}
												icon={
													<EuiIcon
														type={"checkInCircleFilled"}
														size={"xxl"}
													/>
												}
											/>
										)
									}
									{Array(20 - pendingFundraisers.length).fill(0).map((elem, index) => {
										return (
											<EuiFlexItem key={`spacer-${index}`}>
												<EuiSpacer/>
											</EuiFlexItem>
										);
									})}
								</EuiFlexGroup>
							</EuiFlexItem>
							<EuiFlexItem>
								<EuiFlexGroup direction={"column"}>
									<EuiFlexItem>
										<EuiPanel grow={false}>
											<EuiText>
												<h2>Approve Withdrawals</h2>
											</EuiText>
										</EuiPanel>
									</EuiFlexItem>
									{
										pendingWithdrawals.length ? (
											<>
												{
													pendingWithdrawals.map((pendingWithdrawal) => {
														return (
															<EuiFlexItem
																key={pendingWithdrawal.requestId}
															>
																<WithdrawalApprovalCard
																	{...pendingWithdrawal}
																	withdrawalProcessActive={withdrawalProcessActive}
																	global_setWithdrawalProcessActive={setWithdrawalProcessActive}
																/>
															</EuiFlexItem>
														);
													})
												}
											</>
										) : (
											<EuiCard
												title={"All done here!"}
												titleElement={"h2"}
												icon={
													<EuiIcon
														type={"checkInCircleFilled"}
														size={"xxl"}
													/>
												}
											/>
										)
									}
									{Array(20 - pendingWithdrawals.length).fill(0).map((elem, index) => {
										return (
											<EuiFlexItem key={`spacer-${index}`}>
												<EuiSpacer/>
											</EuiFlexItem>
										);
									})}
								</EuiFlexGroup>
							</EuiFlexItem>
						</EuiFlexGroup>
					</EuiFlexItem>
				</EuiFlexGroup>
			</EuiPageTemplate.Section>

		</Suspense>
	);
}
