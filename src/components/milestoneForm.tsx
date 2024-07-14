import {
	EuiButton,
	EuiFieldText,
	EuiFilePicker,
	EuiFlexGroup,
	EuiFlexItem,
	EuiForm,
	EuiFormRow,
	EuiHorizontalRule,
	EuiPanel,
	EuiProgress
} from "@elastic/eui";
import {FundraiserPageProps} from "@/pages/fundraisers/[fundraiserId]";
import {ToastUtils} from "@/utils/toastUtils";
import {makeAPIRequest} from "@/utils/apiHandler";
import {APIResponse, CreateFundraiserMilestoneResponse} from "@/types/apiResponses";
import {
	AddFundraiserMilestoneBody,
	AddFundraiserMilestoneMediaBody,
	AddFundraiserMilestoneMediaParams,
	AddFundraiserMilestoneParams
} from "@/types/apiRequests";
import {manageMedia, useValueScale} from "@/utils/common";
import {useCallback, useState} from "react";
import {useRouter} from "next/router";

type MilestoneFormProps = Pick<FundraiserPageProps, "fundraiserId" | "fundraiserTarget" | "fundraiserToken"> & {
	addToast: ToastUtils["addToast"],
	hideForm: () => void
}

function MilestoneForm(props: MilestoneFormProps) {
	const {hideForm, addToast, fundraiserId, fundraiserToken, fundraiserTarget} = props;

	const navRouter = useRouter()
	const {pathname, query} = navRouter

	let thisPagePath = pathname
	for (const queryElement in query) {
		thisPagePath = thisPagePath.replace(
			`[${queryElement}]`,
			query[queryElement]! as string
		)
	}

	const [milestoneTitle, setMilestoneTitle] = useState("");
	const [milestoneTarget, setMilestoneTarget] = useState(0);
	const [milestoneMedia, setMilestoneMedia] = useState<File[]>([]);

	const [{
		milestoneTarget: targetInvalid,
		milestoneTitle: titleInvalid
	}, setMilestoneDataInvalid] = useState({
		milestoneTitle: false,
		milestoneTarget: false
	});

	const [milestoneCreateProcessActive, setMilestoneCreateProcessActive] = useState(false);
	const [milestoneCreateStage, setMilestoneCreateStage] = useState(0);

	const commonFileCallback = () => {
		setMilestoneCreateStage((prevStage) => {
			return prevStage + 1;
		});
	};

	const progressColor = useValueScale({
		minValue: 0,
		maxValue: 4 + (milestoneMedia.length * 4),
		minScale: 0,
		maxScale: 4,
		scaledValues: ["danger", "orange", "yellow", "green", "success"],
		currValue: milestoneCreateStage
	});

	const createMilestone = useCallback(async () => {
		if (milestoneTarget > fundraiserTarget) {
			addToast(
				"Invalid target entered",
				"Milestone amount cannot be greater than the fundraiser target",
				"danger"
			);
			return;
		}

		setMilestoneCreateProcessActive(true);
		const createMilestoneResponse = await makeAPIRequest<CreateFundraiserMilestoneResponse, AddFundraiserMilestoneBody, AddFundraiserMilestoneParams>({
			endpointPath: "/api/fundraisers/:fundraiserId/milestones",
			requestMethod: "POST",
			queryParams: {
				fundraiserId: fundraiserId.toString()
			},
			bodyParams: {
				milestoneTitle: milestoneTitle,
				milestoneAmount: milestoneTarget
			}
		});

		const {
			isSuccess: isMilestoneSuccess,
			isError: isMilestoneError,
			code: milestoneCode,
			error: milestoneError,
			data: milestoneData
		} = createMilestoneResponse;

		if (isMilestoneError && milestoneError) {
			console.error(milestoneError);
			addToast(
				"An unexpected error occurred",
				"We weren't able to process your request",
				"danger"
			);
			setMilestoneCreateStage(0);
			setMilestoneCreateProcessActive(false);
			return;
		}
		if (isMilestoneSuccess && milestoneData) {
			const {requestStatus} = milestoneData;
			if (requestStatus === "SUCCESS") {
				setMilestoneCreateStage(4);

				const {milestoneId} = milestoneData;

				const objectKeyGenFn = (mediaFile: File, fileIdx: number) => {
					return `fundraisers/${fundraiserId}/milestones/${milestoneId}/media/${fileIdx + 1}`;
				};

				if (milestoneMedia.length > 0) {
					const fileUploadResult = await manageMedia({
						mediaFiles: milestoneMedia,
						mediaMethod: "PUT",
						objectKeyGenFn: objectKeyGenFn,
						stepCompletionCallbacks: {
							onAcquirePresignedUrl: commonFileCallback,
							onAPIMediaCallback: commonFileCallback,
							onStorageRequest: commonFileCallback
						}
					});
					const fileUploadResultAcc = fileUploadResult.reduce((prev, curr) => {
						return prev && curr;
					}, true);
					if (!fileUploadResultAcc) {
						addToast(
							"An unexpected error occurred",
							"We weren't able to upload your files",
							"danger"
						);
						setMilestoneCreateStage(0);
						setMilestoneCreateProcessActive(false);
						return;
					}

					const mediaStatuses = await Promise.all(
						milestoneMedia.map(async (mediaFile, fileIdx) => {
							const objectKey = objectKeyGenFn(mediaFile, fileIdx);
							const milestoneMediaResponse = await makeAPIRequest<APIResponse, AddFundraiserMilestoneMediaBody, AddFundraiserMilestoneMediaParams>({
								endpointPath: "/api/fundraisers/:fundraiserId/milestones/:milestoneId/media",
								requestMethod: "POST",
								queryParams: {
									fundraiserId: fundraiserId.toString(),
									milestoneId: milestoneId.toString(),
								},
								bodyParams: {
									objectKey: objectKey
								}
							});
							const {
								isSuccess: isMediaSuccess,
								isError: isMediaError,
								code: mediaCode,
								data: mediaData,
								error: mediaError
							} = milestoneMediaResponse;

							if (isMediaError && mediaError) {
								addToast(
									"An unexpected error occurred",
									"We weren't able to upload your files",
									"danger"
								);
								setMilestoneCreateStage(0);
								setMilestoneCreateProcessActive(false);
								return false;
							}
							if (isMediaSuccess && mediaData) {
								const {requestStatus} = mediaData;
								if (requestStatus === "SUCCESS") {
									setMilestoneCreateStage((prevStage) => {
										return prevStage + 1;
									});
									return true;
								} else {
									addToast(
										"An unexpected error occurred",
										"We weren't able to upload your files",
										"danger"
									);
									setMilestoneCreateStage(0);
									setMilestoneCreateProcessActive(false);
									return false;
								}
							}
							return false;
						})
					);
					const mediaStatusAcc = mediaStatuses.reduce((prev, curr) => {
						return prev && curr;
					}, true);

					console.log(mediaStatusAcc)

					if (mediaStatusAcc === true) {
						addToast(
							"Milestone created successfully",
							"Your files have also been uploaded successfully",
							"success"
						);
						setMilestoneDataInvalid({
							milestoneTarget: false,
							milestoneTitle: false
						})
						setMilestoneCreateProcessActive(false)
						navRouter.prefetch(thisPagePath)
						setTimeout(() => {
							navRouter.reload()
						}, 5000)
					}
				} else {
					addToast(
						"Milestone created successfully",
						"",
						"success"
					);
					setMilestoneDataInvalid({
						milestoneTarget: false,
						milestoneTitle: false
					})
					setMilestoneCreateProcessActive(false)
					navRouter.prefetch(thisPagePath)
					setTimeout(() => {
						navRouter.reload()
					}, 5000)
				}

			} else if (requestStatus === "ERR_INTERNAL_ERROR") {
				addToast(
					"An unexpected error occurred",
					"We weren't able to process your request",
					"danger"
				);
				setMilestoneCreateStage(0);
				setMilestoneCreateProcessActive(false);
				return;
			} else if (requestStatus === "ERR_INVALID_BODY_PARAMS") {
				const {invalidParams} = milestoneData;
				if (invalidParams) {
					if (invalidParams.includes("milestoneTitle")) {
						setMilestoneDataInvalid((prevData) => {
							return {
								...prevData,
								milestoneTitle: true
							}
						})
					}
					if (invalidParams.includes("milestoneTarget")) {
						setMilestoneDataInvalid((prevData) => {
							return {
								...prevData,
								milestoneTarget: true
							}
						})
					}
				}
			}
		}

	}, [milestoneTarget, fundraiserTarget, fundraiserId, milestoneTitle, addToast, milestoneMedia, milestoneCreateStage]);

	return (
		<EuiPanel color={"subdued"}>
			<EuiFlexGroup
				direction={"column"}
			>
				<EuiFlexItem>
					<EuiForm>
						<EuiFormRow label={"Milestone Title"} fullWidth>
							<EuiFieldText
								fullWidth
								placeholder={"Enter a short title of your milestone"}
								required
								onChange={(e) => {
									setMilestoneTitle(e.target.value);
								}}
								isInvalid={titleInvalid}
							/>
						</EuiFormRow>
						<EuiFormRow fullWidth label={"Milestone amount"}>
							<EuiFieldText
								fullWidth
								placeholder={"Enter the amount for your milestone"}
								append={fundraiserToken}
								required
								onChange={(e) => {
									const parsedValue = Number.parseFloat(e.target.value);
									if (Number.isNaN(parsedValue) || !Number.isFinite(parsedValue)) {
										setMilestoneDataInvalid((prevValue) => {
											return {
												...prevValue,
												milestoneTarget: true
											}
										})
										return;
									}
									setMilestoneDataInvalid((prevValue) => {
										return {
											...prevValue,
											milestoneTarget: false
										}
									})
									setMilestoneTarget(parsedValue);
								}}
								isInvalid={targetInvalid}
							/>
						</EuiFormRow>
						<EuiFormRow fullWidth label={"Upload Optional Media"}>
							<EuiFilePicker
								fullWidth
								display={"large"}
								onChange={(fileList) => {
									if (fileList === null) {
										setMilestoneMedia([]);
									} else {
										const mediaFiles = Array.from(fileList);
										setMilestoneMedia(mediaFiles);
									}
								}}
							/>
						</EuiFormRow>
						<EuiHorizontalRule/>
						{
							milestoneCreateProcessActive ? (
								<>
									<EuiProgress
										color={progressColor}
										max={4 + milestoneMedia.length * 2}
										value={milestoneCreateStage}
									/>
									<EuiHorizontalRule/>
								</>
							) : (
								null
							)
						}
						<EuiFormRow label={""} fullWidth>
							<EuiFlexGroup>
								<EuiFlexItem>
									<EuiButton
										fill
										color={"primary"}
										onClick={createMilestone}
									>
										Add Milestone
									</EuiButton>
								</EuiFlexItem>
								<EuiFlexItem>
									<EuiButton
										fill
										color={"danger"}
										onClick={hideForm}
									>
										Close Form
									</EuiButton>
								</EuiFlexItem>
							</EuiFlexGroup>
						</EuiFormRow>
					</EuiForm>
				</EuiFlexItem>
			</EuiFlexGroup>
		</EuiPanel>
	);
}

export {
	MilestoneForm
};