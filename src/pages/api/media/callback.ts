import {
	CustomApiRequest,
	CustomApiResponse,
	requireAuthenticatedUser,
	requireBodyParams,
	requireBodyValidators,
	requireMethods,
	requireMiddlewareChecks,
	requireValidBody
} from "@/utils/customMiddleware";
import {MediaCallbackBody} from "@/types/apiRequests";
import {NON_ZERO_NON_NEGATIVE, STRLEN_NZ} from "@/utils/validatorUtils";
import {S3ObjectMethods} from "@/types/apiTypedefs";
import {db} from "@/utils/db";

export default async function mediaCallback(req: CustomApiRequest<MediaCallbackBody>, res: CustomApiResponse) {
	const dbClient = await db.connect()

	const middlewareExecStatus = await requireMiddlewareChecks(
		req,
		res,
		{
			[requireMethods.name]: requireMethods("POST"),
			[requireAuthenticatedUser.name]: requireAuthenticatedUser(),
			[requireValidBody.name]: requireValidBody(),
			[requireBodyParams.name]: requireBodyParams("objectKey", "requestMethod", "objectSizeBytes", "objectContentType"),
			[requireBodyValidators.name]: requireBodyValidators({
				requestMethod: (requestMethod: S3ObjectMethods) => {
					return ["PUT", "DELETE"].includes(requestMethod)
				},
				objectKey: async (objectKey) => {
					if (req.body.requestMethod !== "DELETE") {
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
				},
				objectSizeBytes: NON_ZERO_NON_NEGATIVE,
				objectContentType: STRLEN_NZ,
				objectName: STRLEN_NZ
			})
		}
	)
	if (!middlewareExecStatus) {
		dbClient.release()
		return
	}

	try {
		const {requestMethod, objectKey, objectSizeBytes, objectContentType, objectName} = req.body

		switch (requestMethod) {
			case "DELETE":
				await dbClient.query(
					`DELETE
					 FROM "internalS3BucketObjects"
					 WHERE "objectKey" = $1`,
					[objectKey]
				)
				await dbClient.query(
					`UPDATE "internalS3Buckets"
					 SET "bucketObjectCount" = "bucketObjectCount" - 1
					 WHERE "bucketName" = $1`,
					[process.env.AWS_S3_BUCKET!]
				)
				break;
			case "PUT":
				await dbClient.query(
					`INSERT INTO "internalS3BucketObjects"
					 VALUES ($1, $2, $3, $4, $5)`,
					[process.env.AWS_S3_BUCKET!, objectKey, objectSizeBytes, objectContentType, objectName]
				)
				await dbClient.query(
					`UPDATE "internalS3Buckets"
					 SET "bucketObjectCount" = "bucketObjectCount" + 1
					 WHERE "bucketName" = $1`,
					[process.env.AWS_S3_BUCKET!]
				)
				break;
		}

		dbClient.release()
		res.status(200).json({
			requestStatus: "SUCCESS"
		})

	} catch (err: unknown) {
		console.error(err)
		dbClient.release()
		res.status(500).json({
			requestStatus: "ERR_INTERNAL_ERROR"
		})
	}
}