import {compare} from "bcryptjs";
import {sign} from "jsonwebtoken"
import {
	CustomApiRequest,
	CustomApiResponse,
	requireBodyParams,
	requireMethods,
	requireMiddlewareChecks,
	requireValidBody
} from "@/utils/customMiddleware"
import {db} from "@/utils/db";
import type {AuthUsers} from "@/types/queryTypedefs";
import {DecodedJWTCookie} from "@/types/apiTypedefs";
import {LoginResponse} from "@/types/apiResponses";
import {LoginUserRequestBody} from "@/types/apiRequests";

export default async function loginUser(req: CustomApiRequest<LoginUserRequestBody>, res: CustomApiResponse) {
	const middlewarePassed = await requireMiddlewareChecks(
		req,
		res,
		{
			"requireMethods": requireMethods("POST"),
			"requireValidBody": requireValidBody(),
			"requireBodyParams": requireBodyParams("walletAddress", "userPass")
		}
	)
	if (!middlewarePassed) {
		return
	}

	const {walletAddress, userPass} = req.body
	const dbClient = await db.connect();
	try {
		const {rows} = await dbClient.query<AuthUsers>(
			`SELECT "userPass", "userRole"
             FROM "authUsers"
             WHERE "walletAddress" = $1`,
			[walletAddress]
		)
		if (rows.length === 0) {
			res.status(400).json<LoginResponse>({
				requestStatus: "ERR_INVALID_BODY_PARAMS",
				invalidParams: ["walletAddress"]
			})
			dbClient.release()
			return
		}

		const currentUserRow = rows[0]
		const {userPass: hashedPass, userRole} = currentUserRow

		const isPassMatch = await compare(userPass, hashedPass)
		if (isPassMatch) {
			const authToken = sign(
				{
					walletAddress: walletAddress,
					userRole: userRole
				} as DecodedJWTCookie,
				process.env.JWT_SECRET!,
				{
					algorithm: "HS256"
				}
			)
			res.setHeader("Set-Cookie", `versura-auth-token=${authToken}; Path=/; HttpOnly; SameSite=Strict`)
			res.status(200).json<LoginResponse>({
				requestStatus: "SUCCESS",
				userRole: userRole
			})
			dbClient.release()
			return
		} else {
			res.status(400).json<LoginResponse>({
				requestStatus: "ERR_INVALID_BODY_PARAMS",
				invalidParams: ["userPass"]
			})
			dbClient.release()
			return
		}
	} catch (err: unknown) {
		console.error(err)
		await dbClient.query("ROLLBACK")
		dbClient.release()
		res.status(500).json({
			requestStatus: "ERR_INTERNAL_ERROR"
		})
	}
}