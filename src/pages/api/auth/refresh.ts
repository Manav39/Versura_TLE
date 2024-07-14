import {CustomApiRequest, CustomApiResponse} from "@/utils/customMiddleware";
import {verify} from "jsonwebtoken";
import {AuthRefreshResponse} from "@/types/apiResponses";
import {DecodedJWTCookie} from "@/types/apiTypedefs";

export default async function authRefresh(req: CustomApiRequest, res: CustomApiResponse) {
	try {
		const authCookie = req.cookies["versura-auth-token"]
		if (authCookie == null) {
			res.status(200).json<AuthRefreshResponse>({
				requestStatus: "SUCCESS",
				authStatus: "NO_AUTH"
			})
			return
		}

		const decodedCookie = verify(
			authCookie,
			process.env.JWT_SECRET!,
		) as DecodedJWTCookie

		res.status(200).json<AuthRefreshResponse>({
			requestStatus: "SUCCESS",
			authStatus: "AUTH_ACTIVE",
			authData: decodedCookie
		})
	} catch (err) {
		console.error(err)
		res.status(500).json({
			requestStatus: "ERR_INTERNAL_ERROR"
		})
	}
}