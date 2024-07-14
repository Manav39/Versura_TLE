import {
	adaptedMiddleware,
	CustomApiRequest,
	CustomApiResponse,
	requireAuthenticatedUser,
	requireBodyParams,
	requireBodyValidators,
	requireMethods,
	requireMiddlewareChecks,
	requireValidBody
} from "@/utils/customMiddleware";
import {db} from "@/utils/db";
import {getObjectUrl} from "@/utils/s3";
import {PresignedURLBody} from "@/types/apiRequests";
import {PresignedURLResponse} from "@/types/apiResponses";
import {S3ObjectMethods} from "@/types/apiTypedefs";

export default async function presignedUrlEndpoint(req: CustomApiRequest<PresignedURLBody>, res: CustomApiResponse) {
	const dbClient = await db.connect()

	let middlewareExecStatus = await requireMiddlewareChecks(
		req,
		res,
		{
			[requireMethods.name]: requireMethods("POST"),
			[requireValidBody.name]: requireValidBody(),
			[requireBodyParams.name]: requireBodyParams("requestMethod", "objectKey"),
			[requireBodyValidators.name]: requireBodyValidators({
				requestMethod: (reqMethod: S3ObjectMethods) => {
					return ["GET", "PUT", "DELETE"].includes(reqMethod)
				},
				objectKey: async (objectKey: string) => {
					// Check if object key exists if GET or DELETE media
					if (req.body.requestMethod === "PUT") {
						return true
					}

					const {rows} = await dbClient.query(
						`SELECT 1
						 FROM "internalS3BucketObjects"
						 WHERE "objectKey" = $1`,
						[objectKey]
					)

					if (rows.length > 0) {
						return true
					}

					return false
				}
			})
		}
	)

	if (!middlewareExecStatus) {
		dbClient.release()
		return
	}

	const {requestMethod, objectKey} = req.body

	if (requestMethod !== "GET") {
		// Require authentication for PUT or DELETE S3 Calls
		const authCheck = await adaptedMiddleware({
			req,
			res,
			middlewareToEmulate: requireAuthenticatedUser()
		})
		if (!authCheck) {
			dbClient.release()
			return
		}
	}

	try {

		const presignedUrl = await getObjectUrl({
			requestMethod,
			objectKey
		})

		dbClient.release()
		res.status(200).json<PresignedURLResponse>({
			requestStatus: "SUCCESS",
			presignedUrl: presignedUrl
		})
	} catch (err: unknown) {
		console.error(err)
		dbClient.release()
		res.status(500).json({
			requestStatus: "ERR_INTERNAL_ERROR"
		})
	}
}