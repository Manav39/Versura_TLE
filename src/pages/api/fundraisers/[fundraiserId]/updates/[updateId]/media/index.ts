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
import {AddFundraiserUpdateMediaBody, AddFundraiserUpdateMediaParams} from "@/types/apiRequests";
import {VALID_FUNDRAISER_ID_CHECK, VALID_OBJECT_KEY_CHECK, VALID_UPDATE_ID_CHECK} from "@/utils/validatorUtils";
import {db} from "@/utils/db";

export default async function addMilestoneMedia(req: CustomApiRequest<AddFundraiserUpdateMediaBody, AddFundraiserUpdateMediaParams>, res: CustomApiResponse) {
	const middlewareStatus = await requireMiddlewareChecks(
		req,
		res,
		{
			[requireMethods.name]: requireMethods("POST"),
			[requireValidBody.name]: requireValidBody(),
			[requireAuthenticatedUser.name]: requireAuthenticatedUser(),
			[requireQueryParams.name]: requireQueryParams(
				"updateId", "fundraiserId"
			),
			[requireQueryParamValidators.name]: requireQueryParamValidators({
				fundraiserId: VALID_FUNDRAISER_ID_CHECK,
				updateId: VALID_UPDATE_ID_CHECK
			}),
			[requireBodyParams.name]: requireBodyParams(
				"objectKey"
			),
			[requireBodyValidators.name]: requireBodyValidators({
				objectKey: VALID_OBJECT_KEY_CHECK
			}),
		}
	)
	if (!middlewareStatus) return

	try {
		const {updateId, fundraiserId} = req.query
		const {objectKey} = req.body

		const dbClient = await db.connect()

		await dbClient.query(
			`UPDATE "fundraiserUpdates"
			 SET "updateMediaObjectKeys" = ARRAY_APPEND("updateMediaObjectKeys", $1)
			 WHERE "updateId" = $2
			   AND "updateFundraiserId" = $3`,
			[objectKey, updateId, fundraiserId]
		)

		dbClient.release()

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