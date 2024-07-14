import {FundraiserUpdate} from "@/types/apiResponses";
import {EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiMarkdownFormat, EuiPanel, EuiText} from "@elastic/eui";
import {FundraiserPageProps} from "@/pages/fundraisers/[fundraiserId]";
import {ToastUtils} from "@/utils/toastUtils";

type FundraiserUpdateCardProps = FundraiserUpdate & {
	fundraiserId: FundraiserPageProps["fundraiserId"]
	fundraiserCreator: FundraiserPageProps["fundraiserCreator"]
} & {
	addToast: ToastUtils["addToast"]
}

function FundraiserUpdateCard(props: FundraiserUpdateCardProps) {
	const {
		updateId, updateTitle, updateDescription, updatePostedOn, fundraiserCreator, fundraiserId, updateMedia, addToast
	} = props

	const parsedDate = new Date(updatePostedOn)

	return (
		<EuiPanel
			hasShadow={false}
			style={{
				border: `2px solid #343741`
			}}
		>
			<EuiFlexGroup direction={"column"} gutterSize={"s"}>
				<EuiFlexItem>
					<EuiFlexGroup justifyContent={"spaceBetween"}>
						<EuiFlexItem>
							<EuiText>
								<h3>{updateTitle}</h3>
							</EuiText>
						</EuiFlexItem>
						<EuiFlexItem grow={0}>
							<EuiText>
								<h4>{parsedDate.toLocaleDateString()}</h4>
							</EuiText>
						</EuiFlexItem>
					</EuiFlexGroup>
				</EuiFlexItem>
				<EuiHorizontalRule margin={"xs"}/>
				<EuiFlexItem>
					<EuiMarkdownFormat>
						{updateDescription}
					</EuiMarkdownFormat>
				</EuiFlexItem>
				{/*<EuiFlexItem grow={0}>*/}
				{/*	<UpdateMedia*/}
				{/*		fundraiserId={fundraiserId}*/}
				{/*		fundraiserCreator={fundraiserCreator}*/}
				{/*		updateMedia={updateMedia}*/}
				{/*		updateId={updateId}*/}
				{/*		addToast={addToast}*/}
				{/*	/>*/}
				{/*</EuiFlexItem>*/}
			</EuiFlexGroup>
		</EuiPanel>
	)
}

export {
	FundraiserUpdateCard
}