import {ValidRequestMethods} from "@/utils/customMiddleware";
import {APIResponse, APIResponseCode} from "@/types/apiResponses";
import {GetServerSidePropsContext} from "next";

export type APIRequestParams<Body, Params> = {
	endpointPath: string,
	requestMethod: ValidRequestMethods,
	queryParams?: Params,
	bodyParams?: Body,
	ssrContext?: GetServerSidePropsContext
}

export type APIRequestResponse<T> = {
	isSuccess: boolean,
	isError: boolean,

	code: APIResponseCode,
	data?: T,
	error?: unknown
}

async function makeAPIRequest<ResponseT extends APIResponse, RequestBodyT = {}, RequestParamsT = {}>(reqParams: APIRequestParams<RequestBodyT, RequestParamsT>): Promise<APIRequestResponse<ResponseT>> {
	let {requestMethod, endpointPath, queryParams, bodyParams, ssrContext} = reqParams
	let requestOptions: RequestInit = {
		method: requestMethod,
		headers: {
			"Content-Type": "application/json"
		}
	}

	const bodyMethods: ValidRequestMethods[] = ["POST", "PUT", "PATCH"]

	try {
		let resolvedQueryString = ``;
		if (bodyMethods.includes(requestMethod)) {
			requestOptions.body = JSON.stringify(bodyParams)
		}
		if (queryParams) {
			for (const queryParam in queryParams) {
				if (endpointPath.includes(`:${queryParam}`)) {
					endpointPath = endpointPath.replace(
						`:${queryParam}`,
						// @ts-ignore
						queryParams[queryParam].toString()
					)
					delete queryParams[queryParam]
				}
				if (endpointPath.includes(`[${queryParam}]`)) {
					endpointPath = endpointPath.replace(
						`[${queryParam}]`,
						// @ts-ignore
						queryParams[queryParam].toString()
					)
					delete queryParams[queryParam]
				}
			}
			const queryParamsObj = new URLSearchParams()
			for (const queryParamKey in queryParams) {
				const queryParamValue = queryParams[queryParamKey]
				// @ts-ignore
				queryParamsObj.set(queryParamKey, queryParamValue.toString())
			}
			resolvedQueryString = `?${queryParamsObj.toString()}`
		}


		let resolvedUrl: string = `${endpointPath}${resolvedQueryString}`

		if (ssrContext) {
			const {
				req: {
					headers: {
						host: hostName,
					}
				}
			} = ssrContext
			resolvedUrl = `${hostName}${resolvedUrl}`
			if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === undefined) {
				resolvedUrl = `http://${resolvedUrl}`
			} else if (process.env.NODE_ENV === "production") {
				resolvedUrl = `https://${resolvedUrl}`
			} else {
				throw new Error(
					"Could not distinguish process environment" + process.env.NODE_ENV
				)
			}

			const authCookie = ssrContext.req.cookies["versura-auth-token"]
			if (authCookie) {
				// @ts-ignore
				requestOptions.headers!["Cookie"] = `versura-auth-token=${authCookie}`
			}
		}

		const reqResponse = await fetch(
			resolvedUrl,
			requestOptions
		)
		const responseCode = reqResponse.status
		const responseJSON = await reqResponse.json() as ResponseT

		return {
			isSuccess: true,
			isError: false,
			code: responseCode as APIResponseCode,
			data: responseJSON,
			error: undefined
		}
	} catch (err: unknown) {
		return {
			isSuccess: false,
			isError: true,
			code: 0,
			data: undefined,
			error: err
		}
	}
}

export {
	makeAPIRequest
}