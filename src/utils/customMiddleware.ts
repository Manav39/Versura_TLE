import type {NextApiRequest, NextApiResponse} from "next";
import type {DecodedJWTCookie} from "@/types/apiTypedefs";
import {verify} from "jsonwebtoken";
import {db} from "@/utils/db";
import {APIResponse, APIResponseCode} from "@/types/apiResponses";

// @ts-ignore
export interface CustomApiRequest<BodyType = any, QueryType = any> extends NextApiRequest {
	user?: DecodedJWTCookie,
	body: Required<BodyType>,
	query: Required<QueryType>
}

export interface CustomApiResponse extends NextApiResponse {
	status: (statusCode: number | APIResponseCode) => CustomApiResponse
	json: <T extends APIResponse>(body: T) => void
}

export type MiddlewareOptions = {
	middlewareCallStack: string[]
	nextMiddleware: NextMiddleware,
	// setRequestProperty: (propertyName: string, value: any) => void
}

export type MiddlewareAdapterArgs<BodyT, ParamT> = {
	req: CustomApiRequest<BodyT, ParamT>,
	res: CustomApiResponse,
	emulatedMiddlewareStack?: string[],
	middlewareToEmulate: MiddlewareFn<BodyT, ParamT>
}

export type MiddlewareFn<T = any, P = any> = (req: CustomApiRequest<T, P>, res: CustomApiResponse, opts: MiddlewareOptions) => Promise<void>

export type NextMiddleware = (currentMiddlewareStatus: boolean) => void

export type ValidRequestMethods = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

type MiddlewareCallArgs<T, P> = { [middlewareFnName: string]: MiddlewareFn<T, P> }

export type ValidatorMapType<T> = {
	[validateProperty in keyof T]: (propValue: T[validateProperty]) => (Promise<boolean> | boolean);
};

function requireMethods(...acceptedMethods: ValidRequestMethods[]): MiddlewareFn {
	return async function (req: CustomApiRequest, res: CustomApiResponse, middlewareOptions: MiddlewareOptions): Promise<void> {
		const reqMethod = req.method as ValidRequestMethods || "GET"
		const {middlewareCallStack, nextMiddleware} = middlewareOptions
		if (!acceptedMethods.includes(reqMethod)) {
			res.status(405).json({
				requestStatus: "ERR_INVALID_METHOD"
			})
			nextMiddleware(false)
			return
		}
		// We don't need context of previous middleware evaluated here

		nextMiddleware(true)

	}
}

function requireValidBody(): MiddlewareFn {
	return async function (req: CustomApiRequest, res: CustomApiResponse, middlewareOptions: MiddlewareOptions): Promise<void> {
		const {middlewareCallStack, nextMiddleware} = middlewareOptions

		const acceptedRequestMethods: ValidRequestMethods[] = ["POST", "PUT", "PATCH"]
		if (!acceptedRequestMethods.includes(req.method as ValidRequestMethods || "GET")) {
			if (!middlewareCallStack.includes(requireMethods.name)) {
				throw new Error(`Incorrect body check called for method ${req.method}. Are you calling requireMethod?`)
			} else {
				throw new Error(`requireMethod was called with mismatching methods and body`)
			}
		}

		if (req.body === null) {
			res.status(400).json({
				requestStatus: "ERR_BODY_REQUIRED"
			})
			nextMiddleware(false)
			return
		}
		// Body will only exist on "POST", "PUT", "PATCH" methods

		nextMiddleware(true)
	}
}


function requireBodyParams<T>(...bodyParams: (keyof T)[]): MiddlewareFn<T> {
	return async function (req: CustomApiRequest<T>, res: CustomApiResponse, middlewareOptions: MiddlewareOptions): Promise<void> {
		const {middlewareCallStack, nextMiddleware} = middlewareOptions
		if (!middlewareCallStack.includes(requireValidBody.name)) {
			throw new Error(
				"requireBodyParams was called without verifying a valid body"
			)
		}
		const requestBodyKeys = Object.keys(req.body) as (keyof T)[]
		const missingBodyParams: (keyof T)[] = bodyParams.filter((bodyParam) => {
			if (requestBodyKeys.includes(bodyParam as keyof T) && req.body[bodyParam] !== undefined) {
				return false
			}
			return true
		})

		if (missingBodyParams.length > 0) {
			res.status(400).json({
				requestStatus: "ERR_MISSING_BODY_PARAMS",
				missingParams: missingBodyParams as string[]
			})
			nextMiddleware(false)
			return
		}

		nextMiddleware(true)
	}
}

function requireQueryParams<T, P>(...queryParams: (keyof P)[]): MiddlewareFn<T, P> {
	return async function (req: CustomApiRequest<T, P>, res: CustomApiResponse, middlewareOptions: MiddlewareOptions): Promise<void> {
		const {middlewareCallStack, nextMiddleware} = middlewareOptions
		const requestQueryKeys = Object.keys(req.query) as (keyof P)[]
		const missingQueryParams: (keyof P)[] = queryParams.filter((queryParam) => {
			if (requestQueryKeys.includes(queryParam as keyof P) && req.query[queryParam] !== undefined) {
				return false
			}
			return true
		})

		if (missingQueryParams.length > 0) {
			res.status(400).json({
				requestStatus: "ERR_MISSING_QUERY_PARAMS",
				missingParams: missingQueryParams as string[]
			})
			nextMiddleware(false)
			return
		}

		nextMiddleware(true)
	}
}

function requireAuthenticatedUser(): MiddlewareFn {
	return async function (req: CustomApiRequest, res: CustomApiResponse, middlewareOptions: MiddlewareOptions): Promise<void> {
		const authCookie = req.cookies["versura-auth-token"];
		const {nextMiddleware} = middlewareOptions
		if (authCookie == null || authCookie == '') {
			res.status(403).json({
				requestStatus: "ERR_AUTH_REQUIRED"
			})
			nextMiddleware(false)
			return
		}

		const dbClient = await db.connect()

		try {
			const decodedCookie: DecodedJWTCookie = verify(
				authCookie,
				process.env.JWT_SECRET!
			) as DecodedJWTCookie
			const {walletAddress, userRole} = decodedCookie

			const {rows: currentUserRows} = await dbClient.query(
				`SELECT 1
                 FROM "authUsers"
                 WHERE "walletAddress" = $1
                   AND "userRole" = $2`,
				[walletAddress, userRole]
			)

			if (currentUserRows.length == 0) {
				// Silently fail
				// Having a signed token, but with invalid user means that the JWT_SECRET is compromised
				// We should never reach this point
				res.status(403).json({
					requestStatus: "ERR_AUTH_REQUIRED"
				})
				nextMiddleware(false)
				dbClient.release()
				return
			}

			// Having 1 row means that the current user exists in our database
			// We can go ahead and assume that the user is authenticated

			req.user = decodedCookie

			nextMiddleware(true)
			dbClient.release()

		} catch (err: unknown) {
			// Corrupted or invalid token
			res.status(403).json({
				requestStatus: "ERR_AUTH_REQUIRED"
			})
			nextMiddleware(false)
			dbClient.release()
			return
		}
	}
}

function requireAdminUser(): MiddlewareFn {
	return async function (req, res, opts) {
		const {middlewareCallStack, nextMiddleware} = opts
		if (!middlewareCallStack.includes(requireAuthenticatedUser.name)) {
			throw new Error(
				"requireAdminUser was called without verifying authentication status"
			)
		}

		const currentUser = req.user!
		const {userRole} = currentUser
		if (userRole == "ADMIN") {
			nextMiddleware(true)
			return
		}

		res.status(403).json({
			requestStatus: "ERR_ADMIN_REQUIRED"
		})
		nextMiddleware(false)
	}
}

function optionalAuthenticatedUser(): MiddlewareFn {
	return async function (req: CustomApiRequest, res: CustomApiResponse, middlewareOptions: MiddlewareOptions): Promise<void> {
		const authCookie = req.cookies["versura-auth-token"];
		const {nextMiddleware} = middlewareOptions
		if (authCookie == null || authCookie == '') {
			nextMiddleware(true)
			return
		}

		const dbClient = await db.connect()

		try {
			const decodedCookie: DecodedJWTCookie = verify(
				authCookie,
				process.env.JWT_SECRET!
			) as DecodedJWTCookie
			const {walletAddress, userRole} = decodedCookie

			const {rows: currentUserRows} = await dbClient.query(
				`SELECT 1
                 FROM "authUsers"
                 WHERE "walletAddress" = $1
                   AND "userRole" = $2`,
				[walletAddress, userRole]
			)

			if (currentUserRows.length == 0) {
				// Silently fail
				// Having a signed token, but with invalid user means that the JWT_SECRET is compromised
				// We should never reach this point
				res.status(403).json({
					requestStatus: "ERR_AUTH_REQUIRED"
				})
				nextMiddleware(false)
				dbClient.release()
				return
			}

			// Having 1 row means that the current user exists in our database
			// We can go ahead and assume that the user is authenticated

			req.user = decodedCookie

			nextMiddleware(true)
			dbClient.release()

		} catch (err: unknown) {
			// Corrupted or invalid token
			res.status(403).json({
				requestStatus: "ERR_AUTH_REQUIRED"
			})
			nextMiddleware(false)
			dbClient.release()
			return
		}
	}
}

function requireBodyValidators<T, P>(validatorsToRun: ValidatorMapType<T>, skipBodyParamRequirement: boolean = false): MiddlewareFn<T, P> {
	return async function (req: CustomApiRequest<T, P>, res: CustomApiResponse, middlewareOptions: MiddlewareOptions) {
		const {middlewareCallStack, nextMiddleware} = middlewareOptions
		if (!skipBodyParamRequirement && !middlewareCallStack.includes(requireBodyParams.name)) {
			throw new Error(
				"requireBodyValidators was called without verifying all properties in body (requireBodyParams)"
			)
		}
		const validParams: string[] = []
		const invalidParams: string[] = []
		// Only run validators on passed values
		for (const paramKey in validatorsToRun) {
			const paramValue = req.body[paramKey]
			const validatorToRun = validatorsToRun[paramKey]
			const validatorResult = await validatorToRun(paramValue)
			if (validatorResult == true) {
				validParams.push(paramKey)
			} else {
				invalidParams.push(paramKey)
			}
		}
		if (invalidParams.length > 0) {
			res.status(400).json({
				requestStatus: "ERR_INVALID_BODY_PARAMS",
				invalidParams: invalidParams
			})
			nextMiddleware(false)
			return
		}
		nextMiddleware(true)
		return
	}
}

function requireQueryParamValidators<T, P>(validatorsToRun: ValidatorMapType<P>, skipQueryParamRequirement: boolean = false): MiddlewareFn<T, P> {
	return async function (req: CustomApiRequest<T, P>, res: CustomApiResponse, middlewareOptions: MiddlewareOptions) {
		const {middlewareCallStack, nextMiddleware} = middlewareOptions
		if (!skipQueryParamRequirement && !middlewareCallStack.includes(requireQueryParams.name)) {
			throw new Error(
				"requireQueryParamValidators was called without verifying all properties in body (requireQueryParams)"
			)
		}
		const validParams: string[] = []
		const invalidParams: string[] = []
		// Only run validators on passed values
		for (const paramKey in validatorsToRun) {
			const paramValue = req.query[paramKey]
			const validatorToRun = validatorsToRun[paramKey]
			const validatorResult = await validatorToRun(paramValue)
			if (validatorResult == true) {
				validParams.push(paramKey)
			} else {
				invalidParams.push(paramKey)
			}
		}
		if (invalidParams.length > 0) {
			res.status(400).json({
				requestStatus: "ERR_INVALID_QUERY_PARAMS",
				invalidParams: invalidParams
			})
			nextMiddleware(false)
			return
		}
		nextMiddleware(true)
		return
	}
}

async function requireMiddlewareChecks<T, P>(req: CustomApiRequest<T, P>, res: CustomApiResponse, middlewaresToCall: MiddlewareCallArgs<T, P>): Promise<boolean> {
	const middlewareStack: string[] = []
	let middlewareExecutionStatus: boolean = true
	// true & successfulMiddleware => true
	// true & failedMiddleware => false
	// false & true | false & false => false

	for (const middlewareName in middlewaresToCall) {
		if (!middlewareExecutionStatus) {
			break
		}
		const middlewareFnToExecute = middlewaresToCall[middlewareName]
		const nextFn: NextMiddleware = (middlewareStatus: boolean) => {
			middlewareExecutionStatus &&= middlewareStatus
		}

		const middlewareOptions: MiddlewareOptions = {
			middlewareCallStack: middlewareStack,
			nextMiddleware: nextFn,
		}

		try {
			await middlewareFnToExecute(
				req,
				res,
				middlewareOptions
			)
			middlewareStack.push(middlewareName)
		} catch (err: unknown) {
			console.error(err)
			res.status(500).json({
				"requestStatus": "ERR_INTERNAL_ERROR"
			})
			// Halt execution right here
			return false
		}
	}

	return middlewareExecutionStatus
}

async function adaptedMiddleware<BodyT, ParamT>(adapterArgs: MiddlewareAdapterArgs<BodyT, ParamT>): Promise<boolean> {
	const {req, res, emulatedMiddlewareStack, middlewareToEmulate} = adapterArgs

	const emulatedMiddlewareStatus = {
		middlewareStatus: false
	}
	const emulatedNextFn: NextMiddleware = (middlewareStatus) => {
		emulatedMiddlewareStatus.middlewareStatus = middlewareStatus
	}

	const emulatedMiddlewareCallArgs: MiddlewareOptions = {
		middlewareCallStack: emulatedMiddlewareStack || [],
		nextMiddleware: emulatedNextFn
	}

	await middlewareToEmulate(
		req,
		res,
		emulatedMiddlewareCallArgs
	)

	return emulatedMiddlewareStatus.middlewareStatus
}

export {
	requireMethods,
	requireValidBody,
	requireBodyParams,
	requireQueryParams,
	requireAuthenticatedUser,
	optionalAuthenticatedUser,
	requireAdminUser,
	requireBodyValidators,
	requireQueryParamValidators,

	requireMiddlewareChecks,

	adaptedMiddleware
}