import EuiCenter from "@/components/customCenter";
import {
	EuiButton,
	EuiFieldText,
	EuiFilePicker,
	EuiFlexGroup,
	EuiFlexItem,
	EuiForm,
	EuiFormRow,
	EuiGlobalToastList,
	EuiHorizontalRule,
	EuiPanel,
	EuiProgress,
	EuiSelect,
	EuiText,
	EuiTextArea
} from "@elastic/eui";
// @ts-ignore
import VersuraIcon from "@/assets/versura-icon.png";
import Link from "next/link"
import Image from "next/image"
import {EuiSelectOption} from "@elastic/eui/src/components/form/select/select";
import React, {useCallback, useRef, useState} from "react";
import {AddFundraiserMediaBody, AddFundraiserMediaParams, CreateFundraiserRequestBody} from "@/types/apiRequests";
import {makeAPIRequest} from "@/utils/apiHandler";
import {APIResponse, CreateFundraiserResponse} from "@/types/apiResponses";
import {useToastList} from "@/utils/toastUtils";
import {useRouter} from "next/router";
import {manageMedia, useValueScale} from "@/utils/common";
import Head from "next/head";

type InvalidMap<T> = {
	[propName in keyof Required<T>]: boolean
}

export default function CreateFundraiser(): JSX.Element {
	const FUNDRAISER_REDIR_TIMEOUT_S = 5 as const;

	const [fundraiserFormData, setFundraiserFormData] = useState<CreateFundraiserRequestBody>({
		fundraiserTitle: "",
		fundraiserDescription: "",
		fundraiserTarget: 0,
		fundraiserToken: "ETH",
		fundraiserMinDonationAmount: 0
	});
	const [fundraiserMedia, setFundraiserMedia] = useState<File[]>([]);

	const [invalidInputMap, setInvalidInputMap] = useState<InvalidMap<CreateFundraiserRequestBody>>({
		fundraiserToken: false,
		fundraiserTarget: false,
		fundraiserMinDonationAmount: false,
		fundraiserDescription: false,
		fundraiserTitle: false
	})

	const [creationProcessActive, setCreationProcessActive] = useState<boolean>(false);

	const navRouter = useRouter()

	const {
		fundraiserTitle,
		fundraiserDescription,
		fundraiserTarget,
		fundraiserToken,
		fundraiserMinDonationAmount
	} = fundraiserFormData
	const {
		fundraiserToken: isTokenInvalid,
		fundraiserTarget: isTargetInvalid,
		fundraiserMinDonationAmount: isDonationAmtInvalid,
		fundraiserTitle: isTitleInvalid,
		fundraiserDescription: isDescriptionInvalid
	} = invalidInputMap

	const {toasts, addToast, dismissToast} = useToastList({
		toastIdFactoryFn: (toastCount, toastType) => {
			return `create-fundraiser-${toastCount}`
		}
	})

	const filePickerRef = useRef<EuiFilePicker>()

	const fundraiserTokenOptions: EuiSelectOption[] = [
		{
			value: "ETH",
			text: "Ethereum (ETH)"
		}
	]

	const [fundraiserCreationProgressValue, setFundraiserCreationProgressValue] = useState<number>(0)

	const fundraiserProgressColor = useValueScale({
		minValue: 0,
		maxValue: fundraiserMedia.length * 5,
		minScale: 0,
		maxScale: 4,
		scaledValues: ["danger", "orange", "yellow", "green", "success"],
		currValue: fundraiserCreationProgressValue
	})

	const createFundraiserWithMedia = useCallback(async () => {
		let successFundraiserId: number = -1;

		let fundraiserCreationStatus = {
			createFundraiser: false,
			getPresignedUrls: false,
			uploadMediaToUrl: false,
			contentMediaCallback: false,
			fundraiserContentUpdate: false
		}

		const commonProgressCallback = (fileIdx: number) => {
			setFundraiserCreationProgressValue((progressValue) => {
				return progressValue + 1
			})
		}

		const fundraiserImages = fundraiserMedia.filter((mediaFile) => {
			return mediaFile.type.startsWith("image/")
		})

		// Require media before creating fundraisers
		if (fundraiserMedia.length === 0 || fundraiserImages.length === 0) {
			addToast(
				"Please attach media to your campaign",
				"Images will attract more contributors to your fundraiser",
				"danger"
			)
			return
		}

		// Create fundraiser in API
		{
			setCreationProcessActive(true)
			const {isSuccess, isError, code, data, error} = await makeAPIRequest<CreateFundraiserResponse>({
				endpointPath: `/api/fundraisers`,
				requestMethod: "POST",
				bodyParams: fundraiserFormData
			})
			if (isError && error) {
				addToast(
					"An error occurred when processing your request",
					(error as Error).message || "",
					"danger"
				)
				setCreationProcessActive(false)
				return
			}
			if (isSuccess && data) {
				const {requestStatus} = data
				if (requestStatus === "ERR_MISSING_BODY_PARAMS" || requestStatus === "ERR_INVALID_BODY_PARAMS") {
					const missingParams = data.missingParams || data.invalidParams || []
					const clonedInvalidMap = {...invalidInputMap}
					for (const missingParam of missingParams) {
						// @ts-ignore
						clonedInvalidMap[missingParam] = true
					}
					setInvalidInputMap(clonedInvalidMap)
					addToast(
						"Please fill all required fields",
						"",
						"danger"
					)
					setCreationProcessActive(false)
					return
				}
				if (requestStatus === "ERR_AUTH_REQUIRED") {
					addToast(
						"You need to be authenticated to create fundraisers",
						"Log in or Create an account to set up fundraisers",
						"danger"
					)
					setCreationProcessActive(false)
					return
				}
				if (requestStatus === "SUCCESS") {
					const {fundraiserId} = data
					successFundraiserId = fundraiserId
					fundraiserCreationStatus.createFundraiser = true
					setFundraiserCreationProgressValue(fundraiserMedia.length)
				}
			}
		}
		{
			if (!fundraiserCreationStatus.createFundraiser) {
				setCreationProcessActive(false)
				return
			}
			const mediaManagementStatuses = await manageMedia({
				mediaFiles: fundraiserMedia,
				objectKeyGenFn: (mediaFile, fileIdx) => {
					return `fundraisers/${successFundraiserId}/media/${fileIdx + 1}`
				},
				mediaMethod: "PUT",
				stepCompletionCallbacks: {
					onAcquirePresignedUrl: commonProgressCallback,
					onStorageRequest: commonProgressCallback,
					onAPIMediaCallback: commonProgressCallback
				}
			})
			const [
				presignedUrl,
				urlRequest,
				mediaCallback
			] = mediaManagementStatuses
			fundraiserCreationStatus = {
				...fundraiserCreationStatus,
				...{
					getPresignedUrls: presignedUrl,
					uploadMediaToUrl: urlRequest,
					contentMediaCallback: mediaCallback
				}
			}
		}
		{
			if (!fundraiserCreationStatus.contentMediaCallback) {
				setCreationProcessActive(false)
				return
			}
			let fundraiserContentUpdateStatus = await Promise.all(
				fundraiserMedia.map(async (mediaFile, mediaIdx) => {
					const objectKey = `fundraisers/${successFundraiserId}/media/${mediaIdx + 1}`
					const {
						isSuccess,
						isError,
						code,
						data,
						error
					} = await makeAPIRequest<APIResponse, AddFundraiserMediaBody, AddFundraiserMediaParams>({
						endpointPath: "/api/fundraisers/:fundraiserId/media",
						requestMethod: "POST",
						queryParams: {
							fundraiserId: successFundraiserId.toString()
						},
						bodyParams: {
							objectKey: objectKey
						}
					})
					if (isSuccess && data) {
						const {requestStatus} = data
						if (requestStatus === "SUCCESS") {
							setFundraiserCreationProgressValue((oldProgress) => {
								return oldProgress + 1
							})
							return true
						}
					}
					return false
				})
			)
			if (fundraiserContentUpdateStatus.length === fundraiserMedia.length) {
				fundraiserCreationStatus.fundraiserContentUpdate = true
			}
		}
		{
			if (fundraiserCreationStatus.fundraiserContentUpdate == true) {
				addToast(
					"Fundraiser created successfully",
					`You will be redirected in ${FUNDRAISER_REDIR_TIMEOUT_S} seconds`,
					"success"
				)
				await navRouter.prefetch(`/fundraisers/${successFundraiserId}`)
				setTimeout(
					() => {
						navRouter.push(`/fundraisers/${successFundraiserId}`)
					},
					FUNDRAISER_REDIR_TIMEOUT_S * 1000
				)
				setCreationProcessActive(false)
				return
			}

			// Fundraiser creation failed, somewhere along the way!
			addToast(
				"We had trouble creating your fundraiser",
				"Please try again later",
				"danger"
			)
			setCreationProcessActive(false)
			return
		}
	}, [fundraiserFormData, fundraiserMedia, addToast])

	const resetForm = () => {
		setFundraiserFormData({
			fundraiserTitle: "",
			fundraiserDescription: "",
			fundraiserTarget: 0,
			fundraiserToken: "ETH",
			fundraiserMinDonationAmount: 0
		})
		setInvalidInputMap({
			fundraiserTitle: false,
			fundraiserDescription: false,
			fundraiserTarget: false,
			fundraiserToken: false,
			fundraiserMinDonationAmount: false
		})
		filePickerRef.current?.removeFiles()
	}

	return (
		<>
			<Head>
				<title>Create | Versura</title>
				<meta name="description" content="Create a fundraiser"/>
				<meta name="viewport" content="width=device-width, initial-scale=1"/>
				<link rel="icon" href="/favicon.ico"/>
			</Head>
			<EuiCenter
				height={"180vh"}
				width={"100vw"}
			>
				<EuiPanel
					hasShadow={true}
					grow={true}
					style={{
						minWidth: "80vw"
					}}
				>
					<EuiFlexGroup
						direction={"row"}
						justifyContent={"spaceBetween"}
						alignItems={"flexEnd"}
					>
						<EuiFlexItem
							grow={0}
							style={{
								alignItems: "center"
							}}
						>
							<EuiText>
								<h1>Kickstart your fundraiser</h1>
							</EuiText>
						</EuiFlexItem>
						<EuiFlexItem grow={0}>
							<Link href={"/"}>
								<Image
									src={VersuraIcon}
									alt={"Versura Icon"}
									placeholder={"blur"}
									height={40}
									width={291}
								/>
							</Link>
						</EuiFlexItem>
					</EuiFlexGroup>
					<EuiHorizontalRule/>
					<EuiFlexGroup
						direction={"column"}
					>
						<EuiForm
							component={"form"}
							onSubmit={e => e.preventDefault()}
						>
							<EuiFormRow
								label={"Fundraiser Title"}
								fullWidth
							>
								<EuiFieldText
									placeholder={"A title, short and sweet"}
									fullWidth
									required
									onChange={e => {
										setFundraiserFormData((oldFormData) => {
											return {
												...oldFormData,
												fundraiserTitle: e.target.value
											}
										})
									}}
									defaultValue={fundraiserTitle}
									isInvalid={isTitleInvalid}
								/>
							</EuiFormRow>
							<EuiFormRow
								label={"Fundraiser Description"}
								fullWidth
							>
								<EuiTextArea
									placeholder={"A descriptive summary of your fundraiser. Explain your targets, and how you plan on achieving them"}
									fullWidth
									required
									resize={"none"}
									onChange={e => {
										setFundraiserFormData((oldFormData) => {
											return {
												...oldFormData,
												fundraiserDescription: e.target.value
											}
										})
									}}
									defaultValue={fundraiserDescription}
									isInvalid={isDescriptionInvalid}
								/>
							</EuiFormRow>
							<EuiFormRow
								label={"Fundraiser Token"}
								fullWidth
							>
								<EuiSelect
									options={fundraiserTokenOptions}
									fullWidth
									required
									value={fundraiserToken}
									onChange={e => {
										setFundraiserFormData((oldFormData) => {
											return {
												...oldFormData,
												fundraiserToken: e.target.value
											}
										})
									}}
									defaultValue={fundraiserDescription}
									isInvalid={isTokenInvalid}
								/>
							</EuiFormRow>
							<EuiFormRow
								label={"Fundraiser Target"}
								fullWidth
							>
								<EuiFieldText
									placeholder={`Target ${fundraiserToken} amount for the fundraiser`}
									fullWidth
									required
									onChange={e => {
										setFundraiserFormData((oldFormData) => {
											const targetAmtString = e.target.value
											const parsedTargetAmt = Number.parseFloat(targetAmtString)
											if (Number.isNaN(parsedTargetAmt)) {
												return oldFormData
											}
											return {
												...oldFormData,
												fundraiserTarget: parsedTargetAmt
											}
										})
									}}
									defaultValue={fundraiserTarget}
									append={fundraiserToken}
									isInvalid={isTargetInvalid}
								/>
							</EuiFormRow>
							<EuiFormRow
								label={"Fundraiser Minimum Amount"}
								fullWidth
							>
								<EuiFieldText
									placeholder={`Minimum ${fundraiserToken} value that can be donated`}
									fullWidth
									required
									onChange={e => {
										setFundraiserFormData((oldFormData) => {
											const minDonationAmtString = e.target.value
											const parsedDonationAmt = Number.parseFloat(minDonationAmtString)
											if (Number.isNaN(parsedDonationAmt)) {
												return oldFormData
											}

											return {
												...oldFormData,
												fundraiserMinDonationAmount: parsedDonationAmt
											}
										})
									}}
									defaultValue={fundraiserMinDonationAmount}
									append={fundraiserToken}
									isInvalid={isDonationAmtInvalid}
								/>
							</EuiFormRow>
							<EuiHorizontalRule/>
							<EuiFormRow
								label={"Fundraiser Media"}
								fullWidth
							>
								<EuiFilePicker
									display={"large"}
									fullWidth
									multiple
									initialPromptText={"Select or drag and drop multiple files"}
									onChange={(fileList) => {
										const fileArray = Array.from(fileList || [])
										setFundraiserMedia(fileArray)
									}}
									// @ts-ignore
									ref={filePickerRef}
								/>
							</EuiFormRow>
							<EuiHorizontalRule/>
							{
								creationProcessActive ? (
									<>
										<EuiProgress
											value={fundraiserCreationProgressValue}
											max={fundraiserMedia.length * 5}
											color={fundraiserProgressColor}
										/>
										<EuiHorizontalRule/>
									</>
								) : (
									null
								)
							}
							<EuiFormRow
								label={""}
								fullWidth
							>
								<EuiFlexGroup
									direction={"row"}
								>
									<EuiButton
										color={"primary"}
										onClick={createFundraiserWithMedia}
										fullWidth
										fill
										disabled={creationProcessActive || !fundraiserMedia.length}
									>
										Create Fundraiser
									</EuiButton>
									<EuiButton
										color={"danger"}
										onClick={resetForm}
										fullWidth
										fill
									>
										Clear Data
									</EuiButton>
								</EuiFlexGroup>
							</EuiFormRow>
						</EuiForm>
					</EuiFlexGroup>
				</EuiPanel>
				<EuiGlobalToastList
					dismissToast={dismissToast}
					toastLifeTimeMs={5000}
					toasts={toasts}
				/>
			</EuiCenter>
		</>
	)
}