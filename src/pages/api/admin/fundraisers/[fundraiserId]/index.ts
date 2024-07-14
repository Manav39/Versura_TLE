import {
	CustomApiRequest,
	CustomApiResponse,
	requireAdminUser,
	requireAuthenticatedUser,
	requireBodyParams,
	requireBodyValidators,
	requireMethods,
	requireMiddlewareChecks,
	requireQueryParams,
	requireQueryParamValidators,
	requireValidBody
} from "@/utils/customMiddleware";
import {AdminUpdateFundraiserBody, AdminUpdateFundraiserParams} from "@/types/apiRequests";
import {IN_ARR, VALID_FUNDRAISER_ID_CHECK} from "@/utils/validatorUtils";
import {db} from "@/utils/db";

export default async function updateFundraiserStatus(req: CustomApiRequest<AdminUpdateFundraiserBody, AdminUpdateFundraiserParams>, res: CustomApiResponse) {
	const middlewareStatus = await requireMiddlewareChecks(
		req,
		res,
		{
			[requireMethods.name]: requireMethods("POST"),
			[requireValidBody.name]: requireValidBody(),
			[requireAuthenticatedUser.name]: requireAuthenticatedUser(),
			[requireAdminUser.name]: requireAdminUser(),
			[requireQueryParams.name]: requireQueryParams("fundraiserId"),
			[requireQueryParamValidators.name]: requireQueryParamValidators({
				fundraiserId: VALID_FUNDRAISER_ID_CHECK
			}),
			[requireBodyParams.name]: requireBodyParams("fundraiserStatus"),
			[requireBodyValidators.name]: requireBodyValidators({
				fundraiserStatus: IN_ARR<AdminUpdateFundraiserBody["fundraiserStatus"]>(
					["OPEN", "CLOSED"]
				)
			})
		}
	)

	if (!middlewareStatus) return

	try {
		const dbClient = await db.connect()

		const {fundraiserId} = req.query
		const {fundraiserStatus} = req.body

		await dbClient.query(
			`UPDATE "fundRaisers"
             SET "fundraiserStatus" = $1
             WHERE "fundraiserId" = $2`,
			[fundraiserStatus, fundraiserId]
		)

		res.status(200).json({
			requestStatus: "SUCCESS"
		})
	} catch (err) {
		console.error(err)
		res.status(500).json({
			requestStatus: "ERR_INTERNAL_ERROR"
		})
	}
}