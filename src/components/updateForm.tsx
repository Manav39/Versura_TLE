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
	EuiTextArea
} from "@elastic/eui";
import {FundraiserPageProps} from "@/pages/fundraisers/[fundraiserId]";
import {ToastUtils} from "@/utils/toastUtils";
import {makeAPIRequest} from "@/utils/apiHandler";
import {APIResponse, CreateFundraiserUpdateResponse} from "@/types/apiResponses";
import {
	AddFundraiserMilestoneMediaBody,
	AddFundraiserMilestoneMediaParams,
	AddFundraiserUpdateBody,
	AddFundraiserUpdateParams
} from "@/types/apiRequests";
import {manageMedia} from "@/utils/common";
import {useCallback, useState} from "react";
import {useRouter} from "next/router";

type UpdateFormProps = Pick<
	FundraiserPageProps,
	"fundraiserId"
> & {
	addToast: ToastUtils["addToast"],
	hideForm: () => void
}

function UpdateForm(props: UpdateFormProps) {
	const {hideForm, addToast, fundraiserId} = props;

	const navRouter = useRouter()
	const {pathname, query} = navRouter

	let thisPagePath = pathname
	for (const queryElement in query) {
		thisPagePath = thisPagePath.replace(
			`[${queryElement}]`,
			query[queryElement]! as string
		)
	}

	const [updateTitle, setUpdateTitle] = useState("");
	const [updateDescription, setUpdateDescription] = useState("");
	const [updateMedia, setUpdateMedia] = useState<File[]>([]);

	const [{
		updateDescription: descriptionInvalid,
		updateTitle: titleInvalid
	}, setMilestoneDataInvalid] = useState({
		updateTitle: false,
		updateDescription: false
	});

	const [updateCreateProcessActive, setUpdateCreateProcessActive] = useState(false);
	const [updateCreateStage, setUpdateCreateStage] = useState(0);

	const commonFileCallback = () => {
		setUpdateCreateStage((prevStage) => {
			return prevStage + 1;
		});
	};

	const createUpdate = useCallback(async () => {
		setUpdateCreateProcessActive(true);
		const createUpdateResponse = await makeAPIRequest<CreateFundraiserUpdateResponse, AddFundraiserUpdateBody, AddFundraiserUpdateParams>({
			endpointPath: "/api/fundraisers/:fundraiserId/updates",
			requestMethod: "POST",
			queryParams: {
				fundraiserId: fundraiserId.toString()
			},
			bodyParams: {
				updateTitle: updateTitle,
				updateDescription: updateDescription
			}
		});

		const {
			isSuccess: isUpdateSuccess,
			isError: isUpdateError,
			code: updateCode,
			error: updateError,
			data: updateData
		} = createUpdateResponse;

		if (isUpdateError && updateError) {
			console.error(updateError);
			addToast(
				"An unexpected error occurred",
				"We weren't able to process your request",
				"danger"
			);
			setUpdateCreateStage(0);
			setUpdateCreateProcessActive(false);
			return;
		}
		if (isUpdateSuccess && updateData) {
			const {requestStatus} = updateData;
			if (requestStatus === "SUCCESS") {
				setUpdateCreateStage(4);

				const {updateId} = updateData;

				const objectKeyGenFn = (mediaFile: File, fileIdx: number) => {
					return `fundraisers/${fundraiserId}/updates/${updateId}/media/${fileIdx + 1}`;
				};

				if (updateMedia.length > 0) {
					const fileUploadResult = await manageMedia({
						mediaFiles: updateMedia,
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
						setUpdateCreateStage(0);
						setUpdateCreateProcessActive(false);
						return;
					}

					const mediaStatuses = await Promise.all(
						updateMedia.map(async (mediaFile, fileIdx) => {
							const objectKey = objectKeyGenFn(mediaFile, fileIdx);
							const milestoneMediaResponse = await makeAPIRequest<APIResponse, AddFundraiserMilestoneMediaBody, AddFundraiserMilestoneMediaParams>({
								endpointPath: "/api/fundraisers/:fundraiserId/updates/:milestoneId/media",
								requestMethod: "POST",
								queryParams: {
									fundraiserId: fundraiserId.toString(),
									milestoneId: updateId.toString(),
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
								setUpdateCreateStage(0);
								setUpdateCreateProcessActive(false);
								return false;
							}
							if (isMediaSuccess && mediaData) {
								const {requestStatus} = mediaData;
								if (requestStatus === "SUCCESS") {
									setUpdateCreateStage((prevStage) => {
										return prevStage + 1;
									});
									return true;
								} else {
									addToast(
										"An unexpected error occurred",
										"We weren't able to upload your files",
										"danger"
									);
									setUpdateCreateStage(0);
									setUpdateCreateProcessActive(false);
									return false;
								}
							}
							return false;
						})
					);
					const mediaStatusAcc = mediaStatuses.reduce((prev, curr) => {
						return prev && curr;
					}, true);

					if (mediaStatusAcc === true) {
						addToast(
							"Milestone created successfully",
							"Your files have also been uploaded successfully",
							"success"
						);
						setMilestoneDataInvalid({
							updateDescription: false,
							updateTitle: false
						})
						setUpdateCreateProcessActive(false)
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
						updateTitle: false,
						updateDescription: false
					})
					setUpdateCreateProcessActive(false)
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
				setUpdateCreateStage(0);
				setUpdateCreateProcessActive(false);
				return;
			} else if (requestStatus === "ERR_INVALID_BODY_PARAMS") {
				const {invalidParams} = updateData;
				if (invalidParams) {
					if (invalidParams.includes("updateTitle")) {
						setMilestoneDataInvalid((prevData) => {
							return {
								...prevData,
								milestoneTitle: true
							}
						})
					}
					if (invalidParams.includes("updateDescription")) {
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

	}, [updateDescription, fundraiserId, updateTitle, addToast, updateMedia, updateCreateStage]);

	return (
		<EuiPanel color={"subdued"}>
			<EuiFlexGroup
				direction={"column"}
			>
				<EuiFlexItem>
					<EuiForm>
						<EuiFormRow label={"Update Title"} fullWidth>
							<EuiFieldText
								fullWidth
								placeholder={"Enter a short title of your update"}
								required
								onChange={(e) => {
									setUpdateTitle(e.target.value);
								}}
								isInvalid={titleInvalid}
							/>
						</EuiFormRow>
						<EuiFormRow fullWidth label={"Update Description"}>
							<EuiTextArea
								fullWidth
								placeholder={"Enter a short description of your update"}
								required
								onChange={(e) => {
									setUpdateDescription(e.target.value);
								}}
								isInvalid={descriptionInvalid}
							/>
						</EuiFormRow>
						<EuiFormRow fullWidth label={"Upload Optional Media"}>
							<EuiFilePicker
								fullWidth
								display={"large"}
								onChange={(fileList) => {
									if (fileList === null) {
										setUpdateMedia([]);
									} else {
										const mediaFiles = Array.from(fileList);
										setUpdateMedia(mediaFiles);
									}
								}}
							/>
						</EuiFormRow>
						<EuiHorizontalRule/>
						<EuiFormRow label={""} fullWidth>
							<EuiFlexGroup>
								<EuiFlexItem>
									<EuiButton
										fill
										color={"primary"}
										onClick={createUpdate}
										disabled={updateCreateProcessActive}
									>
										Add Update
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
	UpdateForm
};