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
import {AddFundraiserMediaBody, AddFundraiserMediaParams} from "@/types/apiRequests";
import {FundRaisers} from "@/types/queryTypedefs"
import {db} from "@/utils/db";
import {VALID_FUNDRAISER_ID_CHECK, VALID_OBJECT_KEY_CHECK} from "@/utils/validatorUtils";

// type FundraiserMediaBodyMap = {
// 	POST: AddFundraiserMediaBody,
// 	DELETE: DeleteFundraiserMediaBody
// }
//
// type FundraiserMediaQueryMap = {
// 	POST: AddFundraiserMediaParams,
// 	DELETE: DeleteFundraiserMediaParams
// }

export default async function addFundraiserMedia(req: CustomApiRequest<AddFundraiserMediaBody, AddFundraiserMediaParams>, res: CustomApiResponse) {
	const dbClient = await db.connect()

	const middlewareStatus = await requireMiddlewareChecks(
		req,
		res,
		{
			[requireMethods.name]: requireMethods("POST"),
			[requireAuthenticatedUser.name]: requireAuthenticatedUser(),
			[requireValidBody.name]: requireValidBody(),
			[requireQueryParams.name]: requireQueryParams("fundraiserId"),
			[requireQueryParamValidators.name]: requireQueryParamValidators({
				fundraiserId: VALID_FUNDRAISER_ID_CHECK
			}),
			[requireBodyParams.name]: requireBodyParams("objectKey"),
			[requireBodyValidators.name]: requireBodyValidators({
				objectKey: async (objectKey) => {
					const objectKeyExists = await VALID_OBJECT_KEY_CHECK(objectKey)
					if (objectKeyExists === true) {
						const {rows: fundraiserMediaRows} = await dbClient.query(
							`SELECT 1
							 FROM "fundRaisers"
							 WHERE $1 = ANY ("fundraiserMediaObjectKeys")`,
							[objectKey]
						)
						if (fundraiserMediaRows.length > 0) {
							// Don't allow duplication
							return false
						}
						return true
					}
					return false
				}
			})
		}
	)

	if (!middlewareStatus) return

	try {
		const {objectKey} = req.body
		const {fundraiserId} = req.query
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

		await dbClient.query(
			`UPDATE "fundRaisers"
			 SET "fundraiserMediaObjectKeys" = ARRAY_APPEND("fundraiserMediaObjectKeys", $1)
			 WHERE "fundraiserId" = $2`,
			[objectKey, fundraiserId]
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

/*
async function deleteFundraiserMedia(req: CustomApiRequest<DeleteFundraiserMediaBody, DeleteFundraiserMediaParams>, res: CustomApiResponse) {
	const dbClient = await db.connect()

	const middlewareStatus = await requireMiddlewareChecks(
		req,
		res,
		{
			[requireMethods.name]: requireMethods("DELETE"),
			[requireAuthenticatedUser.name]: requireAuthenticatedUser(),
			[requireValidBody.name]: requireValidBody(),
			[requireQueryParams.name]: requireQueryParams("fundraiserId"),
			[requireQueryParamValidators.name]: requireQueryParamValidators({
				fundraiserId: VALID_FUNDRAISER_ID_CHECK
			}),
			[requireBodyParams.name]: requireBodyParams("objectKey"),
			[requireBodyValidators.name]: requireBodyValidators({
				objectKey: async (objectKey) => {
					const {rows} = await dbClient.query(
						`SELECT 1
                         FROM "internalS3BucketObjects"
                         WHERE "objectKey" = $1`,
						[objectKey]
					)
					if (rows.length == 1) {
						const {rows: fundraiserMediaRows} = await dbClient.query(
							`SELECT 1
                             FROM "fundRaisers"
                             WHERE $1 = ANY ("fundraiserMediaObjectKeys")`,
							[objectKey]
						)
						if (fundraiserMediaRows.length > 0) {
							// Only allow deletion on existing object keys
							return true
						}
						return false
					}
					return false
				}
			})
		}
	)

	if (!middlewareStatus) {
		dbClient.release()
		return
	}

	try {
		const {objectKey} = req.body
		const {fundraiserId} = req.query

		await dbClient.query(
			`UPDATE "fundRaisers"
             SET "fundraiserMediaObjectKeys" = ARRAY_REMOVE("fundraiserMediaObjectKeys", $1)
             WHERE "fundraiserId" = $2`,
			[objectKey, fundraiserId]
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
*/
