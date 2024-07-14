import {
	CustomApiRequest,
	CustomApiResponse,
	requireAdminUser,
	requireAuthenticatedUser,
	requireMethods,
	requireMiddlewareChecks,
	requireQueryParamValidators
} from "@/utils/customMiddleware";
import {AdminGetFundraisersParams} from "@/types/apiRequests";
import {ALLOW_UNDEFINED_WITH_FN, NON_ZERO_NON_NEGATIVE, STRING_TO_NUM_FN} from "@/utils/validatorUtils";
import {db} from "@/utils/db";
import {FundRaisers, S3BucketObjects} from "@/types/queryTypedefs";
import {AdminGetFundraisersResponse} from "@/types/apiResponses";
import {getObjectUrl} from "@/utils/s3";

export default async function getPendingFundraisers(req: CustomApiRequest<{}, AdminGetFundraisersParams>, res: CustomApiResponse) {
	const middlewareStatus = await requireMiddlewareChecks(
		req,
		res,
		{
			[requireMethods.name]: requireMethods("GET"),
			[requireAuthenticatedUser.name]: requireAuthenticatedUser(),
			[requireAdminUser.name]: requireAdminUser(),
			[requireQueryParamValidators.name]: requireQueryParamValidators({
				fundraiserPage: ALLOW_UNDEFINED_WITH_FN(
					STRING_TO_NUM_FN(
						NON_ZERO_NON_NEGATIVE
					)
				)
			}, true)
		}
	)

	if (!middlewareStatus) return

	try {
		const dbClient = await db.connect()

		const fundraiserPage = req.query.fundraiserPage || "1"
		const parsedFundraiserPage = Number.parseInt(fundraiserPage)
		const fundraiserPageOffset = (parsedFundraiserPage - 1) * 10

		const {rows} = await dbClient.query<FundRaisers>(
			`SELECT *
			 FROM "fundRaisers"
			 WHERE "fundraiserStatus" = 'IN_QUEUE'
			 OFFSET $1 LIMIT 10`,
			[fundraiserPageOffset]
		)

		const fundraisersWithMedia = await Promise.all(
			rows.map(async (fundraiserRow) => {
				const {fundraiserMediaObjectKeys} = fundraiserRow
				const fundraiserMedia = await Promise.all(
					fundraiserMediaObjectKeys.map(async (objectKey) => {
						const {rows: mediaRows} = await dbClient.query<Pick<S3BucketObjects, "objectContentType" | "objectName">>(
							`SELECT "objectContentType", "objectName"
							 FROM "internalS3BucketObjects"
							 WHERE "objectKey" = $1`,
							[objectKey]
						)

						const selectedRow = mediaRows[0]
						const {objectContentType: mediaContentType, objectName} = selectedRow
						const mediaURL = await getObjectUrl({
							objectKey: objectKey,
							requestMethod: "GET"
						})

						return {
							mediaURL,
							mediaContentType,
							mediaName: objectName
						}
					})
				)

				// @ts-ignore
				delete fundraiserRow["fundraiserMediaObjectKeys"]

				return {
					...fundraiserRow,
					fundraiserMedia
				}
			})
		)


		res.status(200).json<AdminGetFundraisersResponse>({
			requestStatus: "SUCCESS",
			pendingFundraisers: fundraisersWithMedia
		})
	} catch (err) {
		console.error(err)
		res.status(500).json({
			requestStatus: "ERR_INTERNAL_ERROR"
		})
	}
}