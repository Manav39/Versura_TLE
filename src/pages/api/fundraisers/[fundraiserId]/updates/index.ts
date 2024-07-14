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
import {AddFundraiserUpdateBody, AddFundraiserUpdateParams} from "@/types/apiRequests";
import {STRLEN_NZ, VALID_FUNDRAISER_ID_CHECK} from "@/utils/validatorUtils";
import {db} from "@/utils/db";
import {FundRaisers, FundraiserUpdates} from "@/types/queryTypedefs";
import {CreateFundraiserUpdateResponse} from "@/types/apiResponses";

export default async function createFundraiserUpdate(req: CustomApiRequest<AddFundraiserUpdateBody, AddFundraiserUpdateParams>, res: CustomApiResponse) {
	try {
		const middlewareStatus = await requireMiddlewareChecks(
			req,
			res,
			{
				[requireMethods.name]: requireMethods("POST"),
				[requireValidBody.name]: requireValidBody(),
				[requireAuthenticatedUser.name]: requireAuthenticatedUser(),
				[requireQueryParams.name]: requireQueryParams("fundraiserId"),
				[requireQueryParamValidators.name]: requireQueryParamValidators({
					fundraiserId: VALID_FUNDRAISER_ID_CHECK
				}),
				[requireBodyParams.name]: requireBodyParams("updateDescription", "updateTitle"),
				[requireBodyValidators.name]: requireBodyValidators({
					updateTitle: STRLEN_NZ,
					updateDescription: STRLEN_NZ
				})
			}
		)

		if (!middlewareStatus) return

		const dbClient = await db.connect()

		const {fundraiserId} = req.query
		const {updateTitle, updateDescription} = req.body

		const {walletAddress, userRole} = req.user!

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

		const {rows} = await dbClient.query<Pick<FundraiserUpdates, "updateId">>(
			`INSERT INTO "fundraiserUpdates"
             VALUES (DEFAULT, $1, $2, $3, NOW(), DEFAULT)
             RETURNING "updateId"`,
			[fundraiserId, updateTitle, updateDescription]
		)

		const createdRow = rows[0]
		const {updateId} = createdRow

		await dbClient.query(
			`UPDATE "fundRaisers"
             SET "fundraiserUpdateCount" = "fundraiserUpdateCount" + 1
             WHERE "fundraiserId" = $1`,
			[fundraiserId]
		)

		res.status(200).json<CreateFundraiserUpdateResponse>({
			requestStatus: "SUCCESS",
			updateId: updateId
		})
	} catch (err) {
		console.error(err)
		res.status(500).json({
			requestStatus: "ERR_INTERNAL_ERROR"
		})
	}
}