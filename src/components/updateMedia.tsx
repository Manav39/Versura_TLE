import {EuiFilePicker, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiImage, EuiPanel, EuiText} from "@elastic/eui";
import {FundraiserPageProps} from "@/pages/fundraisers/[fundraiserId]";
import Link from "next/link";
import {AuthContext} from "@/pages/_app";
import {useCallback, useContext, useRef, useState} from "react";
import {manageMedia} from "@/utils/common";
import {makeAPIRequest} from "@/utils/apiHandler";
import {APIResponse, FundraiserUpdate} from "@/types/apiResponses";
import {AddFundraiserUpdateMediaBody, AddFundraiserUpdateMediaParams} from "@/types/apiRequests";
import {ToastUtils} from "@/utils/toastUtils";
import {useRouter} from "next/router";

type UpdateMediaProps = Pick<
	FundraiserPageProps,
	"fundraiserCreator" | "fundraiserId"
> & {
	updateId: FundraiserUpdate["updateId"]
	updateMedia: FundraiserUpdate["updateMedia"]
	addToast: ToastUtils["addToast"]
}

function UpdateMedia(props: UpdateMediaProps) {
	const {updateId, updateMedia, fundraiserCreator, fundraiserId, addToast} = props;

	const authCtx = useContext(AuthContext);

	const navRouter = useRouter()

	const [fileUploadInProgress, setFileUploadInProgress] = useState(false);

	const filePickerRef = useRef();
	const uploadAddedMedia = useCallback(async (mediaFiles: FileList | null) => {
		if (mediaFiles === null) {
			return;
		}

		const filesToUpload = Array.from(mediaFiles);
		if (filesToUpload.length === 0) {
			return;
		}

		const keygenFn = (mediaFile: File, fileIdx: number) => {
			return `fundraisers/${fundraiserId}/updates/${updateId}/media/${updateMedia.length + fileIdx + 1}`;
		};

		const fileUploadStatuses = await manageMedia({
			mediaFiles: filesToUpload,
			mediaMethod: "PUT",
			objectKeyGenFn: keygenFn
		});

		const accFileUploadStatus = fileUploadStatuses.reduce((prev, curr) => {
			return prev && curr
		}, true)

		if (!accFileUploadStatus) {
			addToast(
				"An unexpected error occurred",
				"We could not upload your file",
				"danger"
			);
			return;
		}

		await Promise.all(
			filesToUpload.map(async (fileObject, fileIdx) => {
				const {
					isSuccess,
					isError,
					error,
					code,
					data
				} = await makeAPIRequest<APIResponse, AddFundraiserUpdateMediaBody, AddFundraiserUpdateMediaParams>({
					endpointPath: "/api/fundraisers/:fundraiserId//updates/:updateId/media",
					requestMethod: "POST",
					queryParams: {
						fundraiserId: fundraiserId.toString(),
						updateId: updateId.toString()
					},
					bodyParams: {
						objectKey: keygenFn(fileObject, fileIdx)
					}
				});
				if (isError && error) {
					console.error(error);
					addToast(
						"An unexpected error occurred",
						"We could not upload your file",
						"danger"
					);
					return;
				}
				if (isSuccess && data) {
					const {requestStatus} = data;
					if (requestStatus === "SUCCESS") {
						addToast(
							"File(s) uploaded successfully",
							"They are now publicly visible to all users",
							"success"
						);
						setTimeout(() => {
							navRouter.reload();
						}, 5000);
						return;
					}
				}
			})
		);
	}, [fundraiserId, updateId, updateMedia.length, addToast, navRouter]);


	return (
		<EuiPanel
			color={"subdued"}
			grow={false}
		>
			<EuiFlexGroup
				direction={"column"}
				gutterSize={"s"}
			>
				<EuiFlexItem>
					<EuiFlexGroup
						direction={"row"}
						style={{
							overflowX: "scroll"
						}}
						className={"eui-scrollBar"}
						gutterSize={"s"}
					>
						{
							updateMedia.map((mediaObject, mediaIndex) => {
								const {mediaContentType, mediaURL, mediaName} = mediaObject;
								if (mediaContentType.startsWith("image/")) {
									return (
										<EuiFlexItem key={mediaURL} grow={0} style={{
											flexShrink: 0
										}}>
											<EuiPanel color={"subdued"}>
												<Link href={mediaURL} target={"_blank"}>
													<EuiImage
														src={mediaURL}
														alt={`Update Media ${mediaIndex}`}
														height={64}
													/>
												</Link>
											</EuiPanel>
										</EuiFlexItem>
									);
								} else {
									return (
										<EuiFlexItem key={mediaURL} grow={0} style={{
											flexShrink: 0
										}}>
											<EuiPanel
												color={"subdued"}
												style={{
													display: "flex"
												}}
											>
												<EuiFlexGroup
													direction={"column"}
													justifyContent={"spaceEvenly"}
													alignItems={"center"}
												>
													<EuiFlexItem grow={0}>
														<EuiIcon type={"filebeatApp"} size={"xxl"}/>
													</EuiFlexItem>
													<EuiFlexItem grow={0}>
														<Link href={mediaURL} target={"_blank"}>
															<EuiText>
																<h5>{mediaName}</h5>
															</EuiText>
														</Link>
													</EuiFlexItem>
												</EuiFlexGroup>
											</EuiPanel>

										</EuiFlexItem>
									);
								}
							})
						}
						{
							fundraiserCreator === authCtx.metamaskAddress ? (
								<EuiFlexItem grow={0} style={{
									flexShrink: 0
								}}>
									<EuiPanel
										color={"subdued"}
										style={{
											display: "flex"
										}}
									>
										<EuiFlexItem>
											<EuiFilePicker
												display={"large"}
												onChange={(filesToUpload) => {
													setFileUploadInProgress(true);
													uploadAddedMedia(filesToUpload);
												}}
												// @ts-ignore
												ref={filePickerRef}
												disabled={fileUploadInProgress}
											/>
										</EuiFlexItem>
									</EuiPanel>
								</EuiFlexItem>
							) : (
								null
							)
						}
					</EuiFlexGroup>
				</EuiFlexItem>
			</EuiFlexGroup>
		</EuiPanel>
	);
}

export {
	UpdateMedia
}