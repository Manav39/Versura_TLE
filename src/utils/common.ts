import {ValidatorMapType} from "@/utils/customMiddleware";
import {makeAPIRequest} from "@/utils/apiHandler";
import {MediaCallbackResponse, PresignedURLResponse} from "@/types/apiResponses";
import {MediaCallbackBody, PresignedURLBody} from "@/types/apiRequests";

const LINK_TEXT_COLOR_OVERRIDE = "#DFE5EF" as const

const ETH_GAS_FEES_WEI = 21 * 1e12

const gasTokenMap = {
	"ETH": "WEI"
}

const gasAmountMap = {
	"ETH": ETH_GAS_FEES_WEI
}

export type ValidationResultMap<T> = {
	[propName in keyof T]: boolean
}

type MediaManagementStepCallback = (mediaIndex: number) => void

export type MediaManagementArgs = {
	mediaFiles: File[],
	mediaMethod: "PUT" | "DELETE"
	objectKeyGenFn: (mediaFile: File, fileIdx: number) => string,
	stepCompletionCallbacks?: {
		onAcquirePresignedUrl: MediaManagementStepCallback,
		onStorageRequest: MediaManagementStepCallback,
		onAPIMediaCallback: MediaManagementStepCallback
	}
}

export type UseValueScaleArgs<T> = {
	currValue: number
	minValue: number,
	maxValue: number,
	minScale: number,
	maxScale: number,
	scaledValues: T[]
}

async function requireBasicObjectValidation<T>(objToValidate: T, validationMap: ValidatorMapType<T>): Promise<[boolean, ValidationResultMap<T>]> {
	const keysToValidate = Object.keys(validationMap) as (keyof T)[]
	const validationResultMap: ValidationResultMap<T> = {} as ValidationResultMap<T>
	const validationResultAcc = await Promise.all(
		keysToValidate.map(async (propKey) => {
			const validationFn = validationMap[propKey]
			const valueToValidate = objToValidate[propKey]
			const validationResult = await validationFn(valueToValidate)
			validationResultMap[propKey] = validationResult
			return validationResult
		})
	)

	const reducedValidationResult = validationResultAcc.reduce((prev, next) => {
		return prev && next
	}, true)

	return [
		reducedValidationResult,
		validationResultMap
	]
}

async function manageMedia(args: MediaManagementArgs): Promise<boolean[]> {
	const {mediaFiles, mediaMethod, objectKeyGenFn, stepCompletionCallbacks} = args
	const mediaManagementStatuses: boolean[] = [false, false, false]

	let presignedUrls: string[] = []
	// Get presigned URLs for each media
	{
		presignedUrls = await Promise.all(
			mediaFiles.map(async (mediaFile, mediaIdx) => {
				const objectKey = objectKeyGenFn(mediaFile, mediaIdx)
				const {
					isSuccess,
					isError,
					code,
					data,
					error,
				} = await makeAPIRequest<PresignedURLResponse, PresignedURLBody>({
					endpointPath: `/api/media/presigned_url`,
					requestMethod: "POST",
					bodyParams: {
						objectKey: objectKey,
						requestMethod: mediaMethod
					}
				})
				if (isSuccess && data) {
					const {requestStatus} = data
					if (requestStatus === "SUCCESS") {
						const {presignedUrl} = data
						stepCompletionCallbacks?.onAcquirePresignedUrl(mediaIdx)
						return presignedUrl
					} else {
						return ""
					}
				}
				return ""
			})
		)
		presignedUrls = presignedUrls.filter((presignedUrl) => {
			return presignedUrl.length > 0
		})
		if (presignedUrls.length === mediaFiles.length) {
			mediaManagementStatuses[0] = true
		}
	}
	{
		if (!mediaManagementStatuses[0]) {
			return mediaManagementStatuses
		}
		// Put to each PresignedURL
		let mediaStatuses = await Promise.all(
			presignedUrls.map(async (presignedUrl, mediaIdx) => {
				const fileToPut = mediaFiles[mediaIdx]

				const fetchOpts: RequestInit = {}

				if (mediaMethod === "PUT") {
					fetchOpts.body = fileToPut
					fetchOpts.headers = {
						"Content-Type": fileToPut.type
					}
				}

				try {
					await fetch(
						presignedUrl,
						{
							...fetchOpts,
							method: mediaMethod
						}
					)
					stepCompletionCallbacks?.onStorageRequest(mediaIdx)
					return true
				} catch (e) {
					console.error(e)
					console.error(`Unable to upload file ${fileToPut.name}`)
					return false
				}
			})
		)
		mediaStatuses = mediaStatuses.filter(Boolean)
		if (mediaStatuses.length == mediaFiles.length) {
			mediaManagementStatuses[1] = true
		}
	}
	{
		if (!mediaManagementStatuses[1]) {
			return mediaManagementStatuses
		}
		let mediaCallbackStatuses = await Promise.all(
			mediaFiles.map(async (mediaFile, fileIdx) => {
				const objectKey = objectKeyGenFn(mediaFile, fileIdx)
				const {type: objectContentType, size: objectSizeBytes, name} = mediaFile
				const {
					isSuccess,
					isError,
					code,
					data,
					error
				} = await makeAPIRequest<MediaCallbackResponse, MediaCallbackBody>({
					endpointPath: `/api/media/callback`,
					requestMethod: "POST",
					bodyParams: {
						objectKey: objectKey,
						requestMethod: mediaMethod,
						objectContentType: objectContentType,
						objectSizeBytes: objectSizeBytes,
						objectName: name
					}
				})
				if (isSuccess && data) {
					const {requestStatus} = data
					if (requestStatus === "SUCCESS") {
						stepCompletionCallbacks?.onAPIMediaCallback(fileIdx)
						return true
					}
				}
				return false
			})
		)
		mediaCallbackStatuses = mediaCallbackStatuses.filter(Boolean)
		if (mediaCallbackStatuses.length === mediaFiles.length) {
			mediaManagementStatuses[2] = true
		}
	}

	return mediaManagementStatuses
}

function useValueScale<T>(args: UseValueScaleArgs<T>): T {
	const {
		minValue, maxValue, minScale, maxScale, scaledValues, currValue
	} = args
	const minMaxDelta = maxValue - minValue
	const scaleDelta = maxScale - minScale
	const scaleUnit = minMaxDelta / scaleDelta
	const currValueMultiplier = currValue - (currValue % scaleUnit)
	let currValueScaled = currValueMultiplier / scaleUnit
	if (currValueScaled < minScale) {
		currValueScaled = minScale
	}
	if (currValueScaled > maxScale) {
		currValueScaled = maxScale
	}
	const scaledValue = scaledValues[currValueScaled]
	return scaledValue
}

function calculateServiceFeeWeiForAmount(tokenAmount: number, chainToken: string) {
	// @ts-ignore
	const gasAmountWei = gasAmountMap[chainToken]

	return (
		gasAmountWei +
		(tokenAmount * 2) * 1e14
	)
}

export {
	LINK_TEXT_COLOR_OVERRIDE,
	manageMedia,
	useValueScale,
	requireBasicObjectValidation,
	gasAmountMap,
	gasTokenMap,
	calculateServiceFeeWeiForAmount
}