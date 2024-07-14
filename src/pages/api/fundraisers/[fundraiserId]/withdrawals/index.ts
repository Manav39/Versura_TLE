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
import {FundraiserWithdrawalRequestBody, FundraiserWithdrawalRequestParams} from "@/types/apiRequests";
import {db} from "@/utils/db";
import {FundRaisers} from "@/types/queryTypedefs";
import {VALID_FUNDRAISER_ID_CHECK} from "@/utils/validatorUtils";

export default async function addWithdrawalRequest(req: CustomApiRequest<FundraiserWithdrawalRequestBody, FundraiserWithdrawalRequestParams>, res: CustomApiResponse) {
	const dbClient = await db.connect()

	const middlewareChecks = await requireMiddlewareChecks(
		req,
		res,
		{
			[requireMethods.name]: requireMethods("POST"),
			[requireAuthenticatedUser.name]: requireAuthenticatedUser(),
			[requireQueryParams.name]: requireQueryParams(
				"fundraiserId"
			),
			[requireQueryParamValidators.name]: requireQueryParamValidators({
				fundraiserId: VALID_FUNDRAISER_ID_CHECK
			}),
			[requireValidBody.name]: requireValidBody(),
			[requireBodyParams.name]: requireBodyParams(
				"withdrawalAmount"
			),
			[requireBodyValidators.name]: requireBodyValidators({
				withdrawalAmount: async (withdrawalAmount) => {
					const {fundraiserId} = req.query

					const {rows: fundraiserRows} = await dbClient.query<Pick<FundRaisers, "fundraiserRaisedAmount">>(
						`SELECT "fundraiserRaisedAmount"
                         FROM "fundRaisers"
                         WHERE "fundraiserId" = $1`,
						[fundraiserId]
					)

					const selectedFundraiser = fundraiserRows[0]
					const {fundraiserRaisedAmount} = selectedFundraiser

					const {rows: withdrawalRows} = await dbClient.query<{ accumulatedSum: number }>(
						`SELECT SUM("withdrawalAmount") AS "accumulatedSum"
                         FROM "fundraiserWithdrawalRequests"
                         WHERE "requestStatus" IN ('OPEN', 'APPROVED')
                           AND "targetFundraiser" = $1`,
						[fundraiserId]
					)

					const withdrawalSumRow = withdrawalRows[0]
					const {accumulatedSum} = withdrawalSumRow

					if (accumulatedSum + withdrawalAmount > fundraiserRaisedAmount) {
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
		const {walletAddress, userRole} = req.user!
		const {fundraiserId} = req.query
		const {withdrawalAmount} = req.body

		const {rows: currentFundraiserRows} = await dbClient.query<Pick<FundRaisers, "fundraiserCreator">>(
			`SELECT "fundraiserCreator"
             FROM "fundRaisers"
             WHERE "fundraiserId" = $1`,
			[fundraiserId]
		)

		const currentFundraiser = currentFundraiserRows[0]
		const {fundraiserCreator} = currentFundraiser

		if (userRole === "CLIENT" && walletAddress !== fundraiserCreator) {
			res.status(403).json({
				requestStatus: "ERR_UNAUTHORIZED"
			})
			dbClient.release()
			return
		}


		const {rows: fundraiserRows} = await dbClient.query<Pick<FundRaisers, "fundraiserToken">>(
			`SELECT "fundraiserToken"
             FROM "fundRaisers"
             WHERE "fundraiserId" = $1`,
			[fundraiserId]
		)

		const selectedFundraiser = fundraiserRows[0]
		const {fundraiserToken} = selectedFundraiser

		await dbClient.query(
			`INSERT INTO "fundraiserWithdrawalRequests"
             VALUES (DEFAULT, $1, $2, $3, $4, DEFAULT)`,
			[walletAddress, fundraiserId, withdrawalAmount, fundraiserToken]
		)


		dbClient.release()
		res.status(200).json({
			requestStatus: "SUCCESS"
		})
	} catch (err) {
		console.error(err)
		dbClient.release()
		res.status(500).json({
			requestStatus: "ERR_INTERNAL_ERROR"
		})
	}
}

