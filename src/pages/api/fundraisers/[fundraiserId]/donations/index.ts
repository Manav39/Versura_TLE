import {
	CustomApiRequest,
	CustomApiResponse,
	requireAuthenticatedUser,
	requireBodyParams,
	requireBodyValidators,
	requireMethods,
	requireMiddlewareChecks,
	requireQueryParams,
	requireQueryParamValidators,
	requireValidBody
} from "@/utils/customMiddleware";
import {FundraiserDonationBody, FundraiserDonationParams} from "@/types/apiRequests";
import {db} from "@/utils/db";
import {FundRaisers} from "@/types/queryTypedefs";
import {STRLEN_NZ, VALID_FUNDRAISER_ID_CHECK} from "@/utils/validatorUtils";

export default async function donateToFundraiser(req: CustomApiRequest<FundraiserDonationBody, FundraiserDonationParams>, res: CustomApiResponse) {
	const dbClient = await db.connect()

	const middlewareStatus = await requireMiddlewareChecks(
		req,
		res,
		{
			[requireMethods.name]: requireMethods("POST"),
			[requireAuthenticatedUser.name]: requireAuthenticatedUser(),
			[requireValidBody.name]: requireValidBody(),
			[requireQueryParams.name]: requireQueryParams(
				"fundraiserId"
			),
			[requireQueryParamValidators.name]: requireQueryParamValidators({
				fundraiserId: VALID_FUNDRAISER_ID_CHECK
			}),
			[requireBodyParams.name]: requireBodyParams(
				"donatedAmount"
			),
			[requireBodyValidators.name]: requireBodyValidators({
				donatedAmount: async (donatedAmount: number) => {
					const {fundraiserId} = req.query

					const {rows} = await dbClient.query<Pick<FundRaisers, "fundraiserMinDonationAmount">>(
						`SELECT "fundraiserMinDonationAmount"
                         FROM "fundRaisers"
                         WHERE "fundraiserId" = $1`,
						[fundraiserId]
					)

					const selectedFundraiser = rows[0]
					const {fundraiserMinDonationAmount} = selectedFundraiser

					if (donatedAmount < fundraiserMinDonationAmount) {
						return false
					}

					return true
				},
				transactionHash: STRLEN_NZ
			})
		}
	)

	if (!middlewareStatus) {
		dbClient.release()
		return
	}

	try {
		const {fundraiserId} = req.query
		const {walletAddress} = req.user!
		const {donatedAmount, transactionHash} = req.body

		const {rows: currentFundraiserRows} = await dbClient.query<Pick<FundRaisers, "fundraiserStatus">>(
			`SELECT "fundraiserStatus"
             FROM "fundRaisers"
             WHERE "fundraiserId" = $1`,
			[fundraiserId]
		)

		const {fundraiserStatus: currentFundraiserStatus} = currentFundraiserRows[0]
		if (currentFundraiserStatus !== "OPEN") {
			res.status(403).json({
				requestStatus: "ERR_UNAUTHORIZED"
			})
			dbClient.release()
			return
		}

		await dbClient.query(
			`INSERT INTO "fundraiserDonations"
             VALUES ($1, $2, $3, $4, NOW())`,
			[fundraiserId, walletAddress, donatedAmount, transactionHash]
		)

		const {rows: donorRows} = await dbClient.query<{ contributorCount: number }>(
			`SELECT COUNT(DISTINCT "donorAddress") AS "contributorCount"
             FROM "fundraiserDonations"
             WHERE "donatedFundraiser" = $1`,
			[fundraiserId]
		)

		const {contributorCount: updatedContribCount} = donorRows[0]

		const {rows: fundraiserRows} = await dbClient.query<Pick<FundRaisers, "fundraiserRaisedAmount">>(
			`UPDATE "fundRaisers"
             SET "fundraiserRaisedAmount"     = "fundraiserRaisedAmount" + $1,
                 "fundraiserContributorCount" = $2
             WHERE "fundraiserId" = $3
             RETURNING "fundraiserRaisedAmount"`,
			[donatedAmount, updatedContribCount, fundraiserId]
		)

		const selectedFundraiser = fundraiserRows[0]
		const {fundraiserRaisedAmount} = selectedFundraiser

		await dbClient.query(
			`UPDATE "fundraiserMilestones"
             SET "milestoneStatus"    = TRUE,
                 "milestoneReachedOn" = NOW()
             WHERE "milestoneFundraiserId" = $1
               AND "milestoneStatus" = FALSE
               AND "milestoneAmount" <= $2`,
			[fundraiserId, fundraiserRaisedAmount]
		)

		dbClient.release()
		res.status(200).json({
			requestStatus: "SUCCESS"
		})
	} catch (e) {
		console.error(e)
		dbClient.release()
		res.status(500).json({
			requestStatus: "ERR_INTERNAL_ERROR"
		})
	}
}