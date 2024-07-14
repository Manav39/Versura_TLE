import {
	CustomApiRequest,
	CustomApiResponse,
	optionalAuthenticatedUser,
	requireMethods,
	requireMiddlewareChecks,
	requireQueryParams,
	requireQueryParamValidators
} from "@/utils/customMiddleware";
import {db} from "@/utils/db";
import {GetFundraiserRequestParams} from "@/types/apiRequests";
import {VALID_FUNDRAISER_ID_CHECK} from "@/utils/validatorUtils";
import {
	FundraiserDonations,
	FundraiserMilestones,
	FundRaisers,
	FundraiserUpdates,
	S3BucketObjects
} from "@/types/queryTypedefs";
import {FundraiserMilestone, FundraiserUpdate, GenericMedia, GetFundraiserResponse} from "@/types/apiResponses";
import {getObjectUrl} from "@/utils/s3";

/*type FundraiserBodyDispatch = {
	GET: any
}

type FundraiserQueryDispatch = {
	GET: GetFundraiserRequestParams
}*/

export default async function getFundraiser(req: CustomApiRequest<any, GetFundraiserRequestParams>, res: CustomApiResponse): Promise<void> {
	const dbClient = await db.connect()

	const middlewareStatus = await requireMiddlewareChecks(
		req,
		res,
		{
			[requireMethods.name]: requireMethods("GET"),
			[optionalAuthenticatedUser.name]: optionalAuthenticatedUser(),
			[requireQueryParams.name]: requireQueryParams(
				"fundraiserId"
			),
			[requireQueryParamValidators.name]: requireQueryParamValidators({
				fundraiserId: VALID_FUNDRAISER_ID_CHECK
			})
		}
	)

	if (!middlewareStatus) {
		dbClient.release()
		return
	}

	try {
		const {fundraiserId} = req.query

		const adminAccess = req.user?.userRole === "ADMIN"

		const {rows: dbRows} = await db.query<FundRaisers>(
			`SELECT *
			 FROM "fundRaisers"
			 WHERE "fundraiserId" = $1`,
			[fundraiserId]
		)

		const reqUser = req.user?.walletAddress

		if (dbRows.length === 0) {
			res.status(404).json({
				requestStatus: "ERR_NOT_FOUND",
			})
			return
		}

		const selectedFundraiser = dbRows[0]
		const {fundraiserMediaObjectKeys, fundraiserCreator, fundraiserStatus} = selectedFundraiser

		if (!adminAccess && reqUser !== fundraiserCreator) {
			if (fundraiserStatus !== "OPEN") {
				res.status(404).json({
					requestStatus: "ERR_NOT_FOUND",
				})
				return
			}
		}

		const {rows: objectContentTypeRows} = await dbClient.query<Pick<S3BucketObjects, "objectKey" | "objectContentType" | "objectName">>(
			`SELECT "objectKey", "objectContentType", "objectName"
			 FROM "internalS3BucketObjects"
			 WHERE "objectKey" = ANY ($1)`,
			[fundraiserMediaObjectKeys]
		)

		const objectKeyContentMap: { [objKey: string]: string } = {}
		const objectKeyNameMap: { [objKey: string]: string } = {}

		for (const objectContentTypeRow of objectContentTypeRows) {
			const {objectKey, objectContentType, objectName} = objectContentTypeRow
			objectKeyContentMap[objectKey] = objectContentType
			objectKeyNameMap[objectKey] = objectName
		}

		const fundraiserMedia: GenericMedia[] = []

		for (const objectKey of fundraiserMediaObjectKeys) {
			const presignedURL = await getObjectUrl({
				requestMethod: "GET",
				objectKey: objectKey
			})
			const mappedContentType = objectKeyContentMap[objectKey]
			const mappedName = objectKeyNameMap[objectKey]
			fundraiserMedia.push({
				mediaURL: presignedURL,
				mediaContentType: mappedContentType,
				mediaName: mappedName
			})
		}

		const {rows: dbMilestoneRows} = await dbClient.query<FundraiserMilestones>(
			`SELECT *
			 FROM "fundraiserMilestones"
			 WHERE "milestoneFundraiserId" = $1`,
			[fundraiserId]
		)

		const fundraiserResponseMilestones: FundraiserMilestone[] = await Promise.all(
			dbMilestoneRows.map(async (milestoneRow) => {
				const {milestoneMediaObjectKeys} = milestoneRow

				const {rows: mediaObjectContentTypeRows} = await dbClient.query<Pick<S3BucketObjects, "objectKey" | "objectContentType" | "objectName">>(
					`SELECT "objectKey", "objectContentType", "objectName"
					 FROM "internalS3BucketObjects"
					 WHERE "objectKey" = ANY ($1)`,
					[milestoneMediaObjectKeys]
				)

				for (const mediaObjectContentTypeRow of mediaObjectContentTypeRows) {
					const {objectKey, objectContentType, objectName} = mediaObjectContentTypeRow
					objectKeyContentMap[objectKey] = objectContentType
					objectKeyNameMap[objectKey] = objectName
				}

				const milestoneMedia: GenericMedia[] = await Promise.all(
					milestoneMediaObjectKeys.map(async (objectKey) => {
						const presignedUrl = await getObjectUrl({
							objectKey: objectKey,
							requestMethod: "GET"
						})

						const mappedContentType = objectKeyContentMap[objectKey]
						const mappedName = objectKeyNameMap[objectKey]
						return {
							mediaURL: presignedUrl,
							mediaContentType: mappedContentType,
							mediaName: mappedName
						}
					})
				)

				const resolvedMilestoneData = {
					...milestoneRow,
					milestoneMedia: milestoneMedia
				}

				// @ts-ignore
				delete resolvedMilestoneData["milestoneMediaObjectKeys"]

				return resolvedMilestoneData
			})
		)

		const {rows: fundraiserUpdateRows} = await dbClient.query<FundraiserUpdates>(
			`SELECT *
			 FROM "fundraiserUpdates"
			 WHERE "updateFundraiserId" = $1
			 ORDER BY "updatePostedOn" DESC`,
			[fundraiserId]
		)

		const mappedUpdateRows: FundraiserUpdate[] = await Promise.all(
			fundraiserUpdateRows.map(async (updateRow) => {
				const {updateMediaObjectKeys} = updateRow

				const {rows: mediaObjectContentTypeRows} = await dbClient.query<Pick<S3BucketObjects, "objectKey" | "objectContentType" | "objectName">>(
					`SELECT "objectKey", "objectContentType", "objectName"
					 FROM "internalS3BucketObjects"
					 WHERE "objectKey" = ANY ($1)`,
					[updateMediaObjectKeys]
				)

				for (const mediaObjectContentTypeRow of mediaObjectContentTypeRows) {
					const {objectKey, objectContentType, objectName} = mediaObjectContentTypeRow
					objectKeyContentMap[objectKey] = objectContentType
					objectKeyNameMap[objectKey] = objectName
				}

				const updateMedia: GenericMedia[] = await Promise.all(
					updateMediaObjectKeys.map(async (objectKey) => {
						const objectUrl = await getObjectUrl({
							objectKey: objectKey,
							requestMethod: "GET"
						})

						return {
							mediaURL: objectUrl,
							mediaContentType: objectKeyContentMap[objectKey],
							mediaName: objectKeyNameMap[objectKey]
						}
					})
				)

				// @ts-ignore
				delete updateRow["updateMediaObjectKeys"]

				return {
					...updateRow,
					updateMedia
				}
			})
		)

		const {rows: fundraiserDonationRows} = await dbClient.query<FundraiserDonations>(
			`SELECT "donorAddress", "donatedAmount", "donationTimestamp", "transactionHash"
			 FROM "fundraiserDonations"
			 WHERE "donatedFundraiser" = $1
			 ORDER BY "donatedAmount" DESC
			 LIMIT 10`,
			[fundraiserId]
		)

		const fundraiserData = {
			...selectedFundraiser,
			fundraiserMedia: fundraiserMedia,
			fundraiserMilestones: fundraiserResponseMilestones,
			fundraiserDonations: fundraiserDonationRows,
			fundraiserUpdates: mappedUpdateRows
		}

		// @ts-ignore
		delete fundraiserData["fundraiserMediaObjectKeys"]

		dbClient.release()
		res.status(200).json<GetFundraiserResponse>({
			requestStatus: "SUCCESS",
			fundraiserData: fundraiserData
		})
	} catch (err: unknown) {
		console.error(err)
		dbClient.release()
		res.status(500).json({
			requestStatus: "ERR_INTERNAL_ERROR"
		})
	}
}