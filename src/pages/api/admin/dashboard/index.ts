import {
	CustomApiRequest,
	CustomApiResponse,
	requireAdminUser,
	requireAuthenticatedUser,
	requireMethods,
	requireMiddlewareChecks
} from "@/utils/customMiddleware";
import {AdminGetDashboardResponse} from "@/types/apiResponses";
import {db} from "@/utils/db";

export type AdminDashboardData = {
	totalPendingFundraiserCount: number; // NON-Paginated, total number of pending fundraisers
	totalPendingWithdrawalCount: number; // Same as above
	// ADDITIONAL STATS DATA FOR DASHBOARD VISUALISATION
	totalFundraiserCount: number; // Count of all fundraisers, pending, open or closed
	totalWithdrawalAmount: number; // Total amount withdrawn (APPROVED)
	totalDonatedAmount: number; // Total amount contributed by users
	totalUniqueDonors: number; // No of unique contributors
	totalSuccessfulCampaigns: number; // Count of campaigns where amount collected exceeded target,
	totalUserCount: number; // Number of users signed up
	totalMilestoneCount: number; // of milestones,
	reachedMilestoneCount: number; // No of milestones reached,
	totalUpdateCount: number; // Number of updates posted by founders
};

export default async function getDashboardData(req: CustomApiRequest, res: CustomApiResponse) {
	const middlewareStatus = await requireMiddlewareChecks(
		req,
		res,
		{
			[requireMethods.name]: requireMethods("GET"),
			[requireAuthenticatedUser.name]: requireAuthenticatedUser(),
			[requireAdminUser.name]: requireAdminUser(),
		}
	)

	if (!middlewareStatus) return

	try {
		const dbClient = await db.connect()

		const {rows: totalPendingFundraiserRows} = await dbClient.query<Pick<AdminDashboardData, "totalPendingFundraiserCount">>(
			`SELECT COUNT(*) AS "totalPendingFundraiserCount"
			 FROM "fundRaisers"
			 WHERE "fundraiserStatus" = 'IN_QUEUE'`
		)

		const {totalPendingFundraiserCount} = totalPendingFundraiserRows[0]

		const {rows: totalPendingWithdrawalRows} = await dbClient.query<Pick<AdminDashboardData, "totalPendingWithdrawalCount">>(
			`SELECT COUNT(*) AS "totalPendingWithdrawalCount"
			 FROM "fundraiserWithdrawalRequests"
			 WHERE "requestStatus" = 'OPEN'`
		)

		const {totalPendingWithdrawalCount} = totalPendingWithdrawalRows[0]


		const {rows: fundraiserRows} = await dbClient.query<Pick<AdminDashboardData, "totalFundraiserCount">>(
			`SELECT COUNT(*) AS "totalFundraiserCount"
			 FROM "fundRaisers"`
		)

		const {totalFundraiserCount} = fundraiserRows[0]

		const {rows: totalWithdrawalRows} = await dbClient.query<Pick<AdminDashboardData, "totalWithdrawalAmount">>(
			`SELECT SUM("withdrawalAmount") AS "totalWithdrawalAmount"
			 FROM "fundraiserWithdrawalRequests"
			 WHERE "requestStatus" = 'APPROVED'`
		)

		const {totalWithdrawalAmount} = totalWithdrawalRows[0]

		const {rows: totalDonationRows} = await dbClient.query<Pick<AdminDashboardData, "totalDonatedAmount">>(
			`SELECT SUM("donatedAmount") AS "totalDonatedAmount"
			 FROM "fundraiserDonations"`
		)

		const {totalDonatedAmount} = totalDonationRows[0]

		const {rows: totalDonorsRows} = await dbClient.query<Pick<AdminDashboardData, "totalUniqueDonors">>(
			`SELECT COUNT(DISTINCT "donorAddress") AS "totalUniqueDonors"
			 FROM "fundraiserDonations"`
		)

		const {totalUniqueDonors} = totalDonorsRows[0]

		const {rows: successfulCampaignRows} = await dbClient.query<Pick<AdminDashboardData, "totalSuccessfulCampaigns">>(
			`SELECT COUNT(*) AS "totalSuccessfulCampaigns"
			 FROM "fundRaisers"
			 WHERE "fundraiserRaisedAmount" >= "fundraiserTarget"`
		)

		const {totalSuccessfulCampaigns} = successfulCampaignRows[0]

		const {rows: userRows} = await dbClient.query<Pick<AdminDashboardData, "totalUserCount">>(
			`SELECT COUNT(*) AS "totalUserCount"
			 FROM "authUsers"
			 WHERE "userRole" = 'CLIENT'`
		)

		const {totalUserCount} = userRows[0]

		const {rows: totalMilestoneRows} = await dbClient.query<Pick<AdminDashboardData, "totalMilestoneCount">>(
			`SELECT COUNT(*) AS "totalMilestoneCount"
			 FROM "fundraiserMilestones"`
		)

		const {totalMilestoneCount} = totalMilestoneRows[0]

		const {rows: completedMilestoneRows} = await dbClient.query<Pick<AdminDashboardData, "reachedMilestoneCount">>(
			`SELECT COUNT(*) AS "reachedMilestoneCount"
			 FROM "fundraiserMilestones"
			 WHERE "milestoneStatus" = TRUE`
		)

		const {reachedMilestoneCount} = completedMilestoneRows[0]

		const {rows: totalUpdateRows} = await dbClient.query<Pick<AdminDashboardData, "totalUpdateCount">>(
			`SELECT COUNT(*) AS "totalUpdateCount"
			 FROM "fundraiserUpdates"`
		)

		const {totalUpdateCount} = totalUpdateRows[0]

		res.status(200).json<AdminGetDashboardResponse>({
			requestStatus: "SUCCESS",
			dashboardData: {
				"totalPendingFundraiserCount": totalPendingFundraiserCount,
				"totalPendingWithdrawalCount": totalPendingWithdrawalCount,
				"totalFundraiserCount": totalFundraiserCount,
				"totalWithdrawalAmount": totalWithdrawalAmount,
				"totalDonatedAmount": totalDonatedAmount,
				"totalUniqueDonors": totalUniqueDonors,
				"totalSuccessfulCampaigns": totalSuccessfulCampaigns,
				"totalUserCount": totalUserCount,
				"totalMilestoneCount": totalMilestoneCount,
				"reachedMilestoneCount": reachedMilestoneCount,
				"totalUpdateCount": totalUpdateCount
			}
		})
	} catch (err) {
		console.error(err)
		res.status(500).json({
			requestStatus: "ERR_INTERNAL_ERROR"
		})
	}
}