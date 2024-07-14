import {CustomApiRequest, CustomApiResponse, ValidRequestMethods} from "@/utils/customMiddleware";

export type APIHandler<T = any, P = any> = (req: CustomApiRequest<T, P>, res: CustomApiResponse) => Promise<void>


export type MethodDispatchTypeMap<T> = {
	[reqMethod in keyof T]: T[reqMethod];
};

export type MethodDispatchMap<T, P> = {
	// @ts-ignore
	[reqMethod in keyof T]: APIHandler<MethodDispatchTypeMap<T>[reqMethod], MethodDispatchTypeMap<P>[reqMethod]>;
};

async function unsupportedMethod(req: CustomApiRequest, res: CustomApiResponse) {
	res.status(400).json({
		requestStatus: "ERR_INVALID_METHOD"
	})
}

function withMethodDispatcher<BodyT, ParamT>(dispatchMap: MethodDispatchMap<BodyT, ParamT>): APIHandler {
	return async function (req, res) {
		for (const dispatchMapKey in dispatchMap) {
			const reqMethod = req.method as ValidRequestMethods
			if (reqMethod === dispatchMapKey) {
				const dispatchFn = dispatchMap[dispatchMapKey]
				await dispatchFn(
					// @ts-ignore
					req,
					res
				)
				return
			}
		}
		// No method matched
		await unsupportedMethod(
			req,
			res
		)
		return
	}
}

export {
	withMethodDispatcher
}