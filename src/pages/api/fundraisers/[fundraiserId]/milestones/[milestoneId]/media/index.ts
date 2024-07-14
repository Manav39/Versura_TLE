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
import {AddFundraiserMilestoneMediaBody, AddFundraiserMilestoneMediaParams} from "@/types/apiRequests";
import {VALID_FUNDRAISER_ID_CHECK, VALID_MILESTONE_ID_CHECK, VALID_OBJECT_KEY_CHECK} from "@/utils/validatorUtils";
import {db} from "@/utils/db";

export default async function addMilestoneMedia(req: CustomApiRequest<AddFundraiserMilestoneMediaBody, AddFundraiserMilestoneMediaParams>, res: CustomApiResponse) {
	const middlewareStatus = await requireMiddlewareChecks(
		req,
		res,
		{
			[requireMethods.name]: requireMethods("POST"),
			[requireValidBody.name]: requireValidBody(),
			[requireAuthenticatedUser.name]: requireAuthenticatedUser(),
			[requireQueryParams.name]: requireQueryParams(
				"milestoneId", "fundraiserId"
			),
			[requireQueryParamValidators.name]: requireQueryParamValidators({
				fundraiserId: VALID_FUNDRAISER_ID_CHECK,
				milestoneId: VALID_MILESTONE_ID_CHECK
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
		const {milestoneId, fundraiserId} = req.query
		const {objectKey} = req.body

		const dbClient = await db.connect()

		await dbClient.query(
			`UPDATE "fundraiserMilestones"
			 SET "milestoneMediaObjectKeys" = ARRAY_APPEND("milestoneMediaObjectKeys", $1)
			 WHERE "milestoneId" = $2
			   AND "milestoneFundraiserId" = $3`,
			[objectKey, milestoneId, fundraiserId]
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