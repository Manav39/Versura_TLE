import {
	CustomApiRequest,
	CustomApiResponse,
	requireAdminUser,
	requireAuthenticatedUser,
	requireMethods,
	requireMiddlewareChecks,
	requireQueryParamValidators
} from "@/utils/customMiddleware";
import {AdminGetWithdrawalsParams} from "@/types/apiRequests";
import {ALLOW_UNDEFINED_WITH_FN, NON_ZERO_NON_NEGATIVE, STRING_TO_NUM_FN} from "@/utils/validatorUtils";
import {db} from "@/utils/db";
import {FundRaisers, FundraiserWithdrawalRequests} from "@/types/queryTypedefs";
import {AdminGetWithdrawalResponse} from "@/types/apiResponses";

export default async function getWithdrawals(req: CustomApiRequest<{}, AdminGetWithdrawalsParams>, res: CustomApiResponse) {
	const middlewareStatus = await requireMiddlewareChecks(
		req,
		res,
		{
			[requireMethods.name]: requireMethods("GET"),
			[requireAuthenticatedUser.name]: requireAuthenticatedUser(),
			[requireAdminUser.name]: requireAdminUser(),
			[requireQueryParamValidators.name]: requireQueryParamValidators({
				withdrawalPage: ALLOW_UNDEFINED_WITH_FN(
					STRING_TO_NUM_FN(
						NON_ZERO_NON_NEGATIVE
					)
				)
			}, true)
		}
	)

	if (!middlewareStatus) {
		return
	}

	try {
		const dbClient = await db.connect()
		const withdrawalPage = req.query.withdrawalPage || "1"
		const parsedWithdrawalPage = Number.parseInt(withdrawalPage)
		const withdrawalOffset = (parsedWithdrawalPage - 1) * 10

		const {rows} = await dbClient.query<FundraiserWithdrawalRequests>(
			`SELECT *
			 FROM "fundraiserWithdrawalRequests"
			 WHERE "requestStatus" = 'OPEN'
			 OFFSET $1 LIMIT 10`,
			[withdrawalOffset]
		)

		const mappedFeedRows = await Promise.all(
			rows.map(async (withdrawalRow) => {
				const {targetFundraiser} = withdrawalRow
				const {rows} = await dbClient.query<Pick<FundRaisers, "fundraiserTitle" | "fundraiserRaisedAmount" | "fundraiserTarget">>(
					`SELECT "fundraiserTitle", "fundraiserRaisedAmount", "fundraiserTarget"
					 FROM "fundRaisers"
					 WHERE "fundraiserId" = $1`,
					[targetFundraiser]
				)
				const {fundraiserTitle, fundraiserTarget, fundraiserRaisedAmount} = rows[0]
				return {
					...withdrawalRow,
					targetFundraiser: {
						fundraiserId: targetFundraiser,
						fundraiserTitle: fundraiserTitle,
						fundraiserRaisedAmount: fundraiserRaisedAmount,
						fundraiserTarget: fundraiserTarget
					}
				}
			})
		)

		res.status(200).json<AdminGetWithdrawalResponse>({
			requestStatus: "SUCCESS",
			pendingWithdrawals: mappedFeedRows
		})
	} catch (err) {
		console.error(err)
		res.status(500).json({
			requestStatus: "ERR_INTERNAL_ERROR"
		})
	}
}