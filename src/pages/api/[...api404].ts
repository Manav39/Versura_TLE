import {CustomApiRequest, CustomApiResponse} from "@/utils/customMiddleware";

export default async function catchAllAPINotFound(req: CustomApiRequest, res: CustomApiResponse) {
	res.status(404).json({
		requestStatus: "ERR_NOT_FOUND"
	})
}