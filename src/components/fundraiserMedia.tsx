import {
	EuiFilePicker,
	EuiFlexGroup,
	EuiFlexItem,
	EuiHorizontalRule,
	EuiIcon,
	EuiImage,
	EuiPanel,
	EuiText
} from "@elastic/eui";
import {FundraiserPageProps} from "@/pages/fundraisers/[fundraiserId]";
import Link from "next/link";
import {AuthContext} from "@/pages/_app";
import {useCallback, useContext, useRef, useState} from "react";
import {manageMedia} from "@/utils/common";
import {makeAPIRequest} from "@/utils/apiHandler";
import {APIResponse} from "@/types/apiResponses";
import {AddFundraiserMediaBody, AddFundraiserMediaParams} from "@/types/apiRequests";
import {ToastUtils} from "@/utils/toastUtils";
import {useRouter} from "next/router";

type FundraiserMediaProps = Pick<
	FundraiserPageProps,
	"fundraiserMedia" | "fundraiserCreator" | "fundraiserId"
> & {
	addToast: ToastUtils["addToast"]
}

function FundraiserMedia(props: FundraiserMediaProps) {
	const {fundraiserMedia, fundraiserCreator, fundraiserId, addToast} = props;

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
			return `fundraisers/${fundraiserId}/media/${fundraiserMedia.length + fileIdx + 1}`;
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
				} = await makeAPIRequest<APIResponse, AddFundraiserMediaBody, AddFundraiserMediaParams>({
					endpointPath: "/api/fundraisers/:fundraiserId/media",
					requestMethod: "POST",
					queryParams: {
						fundraiserId: fundraiserId.toString()
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
	}, []);


	return (
		<EuiPanel
			style={{
				width: "90vw"
			}}
		>
			<EuiFlexGroup
				direction={"column"}
				gutterSize={"s"}
			>
				<EuiFlexItem>
					<EuiFlexGroup
						justifyContent={
							fundraiserCreator === authCtx.metamaskAddress ?
								"spaceBetween" : "flexStart"
						}
						alignItems={"baseline"}
					>
						<EuiFlexItem grow={0}>
							<EuiText>
								<h2>Fundraiser Media</h2>
							</EuiText>
						</EuiFlexItem>
						{
							fundraiserCreator === authCtx.metamaskAddress ? (
								<EuiFlexItem grow={0}>
									<EuiText>
										Note: Media once added cannot be removed. Do not upload sensitive documents!
									</EuiText>
								</EuiFlexItem>
							) : (
								null
							)
						}
					</EuiFlexGroup>
				</EuiFlexItem>
				<EuiHorizontalRule margin={"xs"}/>
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
							fundraiserMedia.map((mediaObject, mediaIndex) => {
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
														alt={`Fundraiser Media ${mediaIndex}`}
														height={128}
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
	FundraiserMedia
}