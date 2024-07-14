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
import {AddFundraiserMilestoneBody, AddFundraiserMilestoneParams} from "@/types/apiRequests";
import {STRLEN_GT, VALID_FUNDRAISER_ID_CHECK} from "@/utils/validatorUtils";
import {db} from "@/utils/db";
import {FundraiserMilestones, FundRaisers} from "@/types/queryTypedefs";
import {CreateFundraiserMilestoneResponse} from "@/types/apiResponses";

export default async function createMilestone(req: CustomApiRequest<AddFundraiserMilestoneBody, AddFundraiserMilestoneParams>, res: CustomApiResponse) {
	const dbClient = await db.connect()
	const middlewareChecks = await requireMiddlewareChecks(
		req,
		res,
		{
			[requireMethods.name]: requireMethods("POST"),
			[requireAuthenticatedUser.name]: requireAuthenticatedUser(),
			[requireValidBody.name]: requireValidBody(),
			[requireQueryParams.name]: requireQueryParams("fundraiserId"),
			[requireQueryParamValidators.name]: requireQueryParamValidators({
				fundraiserId: VALID_FUNDRAISER_ID_CHECK
			}),
			[requireBodyParams.name]: requireBodyParams(
				"milestoneTitle", "milestoneAmount"
			),
			[requireBodyValidators.name]: requireBodyValidators({
				milestoneTitle: STRLEN_GT(12),
				milestoneAmount: async (milestoneAmt: number) => {
					const fundraiserId = req.query.fundraiserId
					const {rows} = await dbClient.query<Pick<FundRaisers, "fundraiserTarget">>(
						`SELECT "fundraiserTarget"
						 FROM "fundRaisers"
						 WHERE "fundraiserId" = $1`,
						[fundraiserId]
					)
					const selectedFundraiser = rows[0]
					const {fundraiserTarget} = selectedFundraiser
					if (fundraiserTarget < milestoneAmt) {
						return false
					}

					const {rows: existingMilestoneRows} = await dbClient.query(
						`SELECT 1
						 FROM "fundraiserMilestones"
						 WHERE "milestoneFundraiserId" = $1
						   AND "milestoneAmount" = $2`,
						[fundraiserId, milestoneAmt]
					)

					if (existingMilestoneRows.length) {
						return false
					}

					return true
				}
			})
		}
	)
	if (!middlewareChecks) {
		dbClient.release()
		return
	}
	try {
		const {milestoneTitle, milestoneAmount} = req.body
		const {fundraiserId} = req.query

		const {walletAddress, userRole} = req.user!

		const {rows: currentFundraiserRows} = await dbClient.query<Pick<FundRaisers, "fundraiserCreator" | "fundraiserRaisedAmount">>(
			`SELECT "fundraiserCreator", "fundraiserRaisedAmount"
			 FROM "fundRaisers"
			 WHERE "fundraiserId" = $1`,
			[fundraiserId]
		)

		const currentFundraiser = currentFundraiserRows[0]
		const {fundraiserCreator, fundraiserRaisedAmount} = currentFundraiser

		if (userRole === "CLIENT" && walletAddress !== fundraiserCreator) {
			res.status(403).json({
				requestStatus: "ERR_UNAUTHORIZED"
			})
			dbClient.release()
			return
		}

		const {rows: createdMilestoneRows} = await dbClient.query<Pick<FundraiserMilestones, "milestoneId">>(
			`INSERT INTO "fundraiserMilestones"
			 VALUES (DEFAULT, $1, $2, $3, DEFAULT, DEFAULT, DEFAULT)
			 RETURNING "milestoneId"`,
			[fundraiserId, milestoneTitle, milestoneAmount]
		)

		const createdMilestoneRow = createdMilestoneRows[0]
		const {milestoneId} = createdMilestoneRow

		await dbClient.query(
			`UPDATE "fundRaisers"
			 SET "fundraiserMilestoneCount" = "fundraiserMilestoneCount" + 1
			 WHERE "fundraiserId" = $1`,
			[fundraiserId]
		)

		if (milestoneAmount <= fundraiserRaisedAmount) {
			await dbClient.query(
				`UPDATE "fundraiserMilestones"
				 SET "milestoneStatus"    = TRUE,
					 "milestoneReachedOn" = NOW()
				 WHERE "milestoneId" = $1
				   AND "milestoneFundraiserId" = $2`,
				[milestoneId, fundraiserId]
			)
		}

		res.status(200).json<CreateFundraiserMilestoneResponse>({
			requestStatus: "SUCCESS",
			milestoneId: milestoneId
		})
	} catch (err: unknown) {
		console.error(err)
		dbClient.release()
		res.status(500).json({
			requestStatus: "ERR_INTERNAL_ERROR"
		})
	}

}