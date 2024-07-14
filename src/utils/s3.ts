import {DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client} from "@aws-sdk/client-s3"
import {getSignedUrl} from "@aws-sdk/s3-request-presigner"
import {S3ObjectMethods} from "@/types/apiTypedefs";

const s3Client = new S3Client({
	region: process.env.AWS_S3_REGION!,
	credentials: {
		accessKeyId: process.env.AWS_S3_KEY_ID!,
		secretAccessKey: process.env.AWS_S3_KEY_SECRET!
	}
})

type ObjectUrlOpts = {
	requestMethod: S3ObjectMethods
	objectKey: string
}

type RequestCommandMap = {
	[reqMethod in S3ObjectMethods]:
	typeof GetObjectCommand |
	typeof PutObjectCommand |
	typeof DeleteObjectCommand
}

const requestCommandMap: RequestCommandMap = {
	GET: GetObjectCommand,
	PUT: PutObjectCommand,
	DELETE: DeleteObjectCommand
}

async function getObjectUrl({requestMethod, objectKey}: ObjectUrlOpts): Promise<string> {
	const assocMethodCommand = requestCommandMap[requestMethod]

	const objCommand = new assocMethodCommand({
		Bucket: process.env.AWS_S3_BUCKET!,
		Key: objectKey
	})

	const presignedUrl = await getSignedUrl(
		s3Client,
		objCommand,
		{
			expiresIn: 600		// 10min for PUT / DELETE
		}
	)

	if (requestMethod === "GET") {
		// Strip authentication for GET requests
		const objectUrl = new URL(presignedUrl)
		const {origin: s3Origin, pathname: s3Pathname} = objectUrl
		const resolvedS3Url = `${s3Origin}${s3Pathname}`
		return resolvedS3Url
	}

	return presignedUrl
}

export {
	getObjectUrl
}