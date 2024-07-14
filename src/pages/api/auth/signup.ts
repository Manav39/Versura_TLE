import {hash} from "bcryptjs";
import {
	CustomApiRequest,
	CustomApiResponse,
	requireBodyParams,
	requireMethods,
	requireMiddlewareChecks,
	requireValidBody
} from "@/utils/customMiddleware"
import {db} from "@/utils/db";
import {SignupResponse} from "@/types/apiResponses";
import {SignupUserRequestBody} from "@/types/apiRequests";

export default async function signupUser(req: CustomApiRequest<SignupUserRequestBody>, res: CustomApiResponse) {
	const middlewarePassed = await requireMiddlewareChecks(
		req,
		res,
		{
			[requireMethods.name]: requireMethods("POST"),
			[requireValidBody.name]: requireValidBody(),
			[requireBodyParams.name]: requireBodyParams("walletAddress", "userPass")
		}
	)
	if (!middlewarePassed) {
		return
	}

	const {walletAddress, userPass} = req.body
	const dbClient = await db.connect();
	try {
		const {rows} = await dbClient.query(
			`SELECT 1 FROM "authUsers" WHERE "walletAddress" = $1`,
			[walletAddress]
		)

		if (rows.length > 0) {
			res.status(400).json<SignupResponse>({
				requestStatus: "ERR_INVALID_BODY_PARAMS",
				invalidParams: ["walletAddress"]
			})
			dbClient.release()
			return
		}

		const hashedPassword = await hash(userPass, 10)
		await dbClient.query("BEGIN")
		await dbClient.query(
			`INSERT INTO "authUsers" VALUES ($1, $2)`,
			[walletAddress, hashedPassword]
		)
		await dbClient.query("COMMIT")
		dbClient.release()
		res.status(200).json({
			requestStatus: "SUCCESS"
		})
	} catch (err: unknown) {
		console.error(err)
		await dbClient.query("ROLLBACK")
		dbClient.release()
		res.status(500).json({
			requestStatus: "ERR_INTERNAL_ERROR"
		})
	}
}