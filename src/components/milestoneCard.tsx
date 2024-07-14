import {FundraiserMilestone, GenericMedia} from "@/types/apiResponses";
import {EuiFlexGroup, EuiFlexItem, EuiIcon, EuiImage, EuiPanel, EuiSpacer, EuiText} from "@elastic/eui";
import {FundraiserPageProps} from "@/pages/fundraisers/[fundraiserId]";
import Link from "next/link";


type MilestoneCardProps = FundraiserMilestone & {
	fundraiserDefaultMedia?: GenericMedia
	fundraiserTarget: FundraiserPageProps["fundraiserTarget"],
	fundraiserRaisedAmount: FundraiserPageProps["fundraiserRaisedAmount"],
	fundraiserToken: FundraiserPageProps["fundraiserToken"]
}

function MilestoneCard(props: MilestoneCardProps) {
	const {
		milestoneStatus,
		milestoneId,
		milestoneFundraiserId,
		milestoneMedia,
		milestoneReachedOn,
		milestoneTitle,
		milestoneAmount,
		fundraiserDefaultMedia,
		fundraiserTarget,
		fundraiserRaisedAmount,
		fundraiserToken
	} = props

	const parsedReachedOnDate = new Date(milestoneReachedOn)

	let selectedMilestoneMedia: GenericMedia | null = null
	for (const mediaObject of milestoneMedia) {
		const {mediaContentType} = mediaObject
		if (mediaContentType.startsWith("image/")) {
			selectedMilestoneMedia = mediaObject
			break
		}
	}
	if (!selectedMilestoneMedia) {
		selectedMilestoneMedia = fundraiserDefaultMedia ?? null
	}

	return (
		<EuiPanel
			color={"subdued"}
		>
			<EuiFlexGroup
				alignItems={"center"}
			>
				<EuiFlexItem
					grow={1}
					style={{
						flexShrink: 0
					}}
				>
					{
						selectedMilestoneMedia ? (
							<Link
								href={selectedMilestoneMedia.mediaURL}
								target={"_blank"}
							>
								<EuiImage
									src={selectedMilestoneMedia.mediaURL}
									alt={`Media for milestone ${milestoneTitle}`}
									width={120}
								/>
							</Link>
						) : (
							<EuiSpacer/>
						)
					}
				</EuiFlexItem>
				<EuiFlexItem grow={3}>
					<EuiFlexGroup
						alignItems={"center"}
					>
						<EuiFlexItem grow={0}>
							{
								milestoneStatus ? (
									<EuiIcon
										type={"check"}
										color={"success"}
										size={"xxl"}
									/>
								) : (
									<EuiIcon
										type={"cross"}
										color={"danger"}
										size={"xxl"}
									/>
								)
							}
						</EuiFlexItem>
						<EuiFlexItem grow={0}>
							<EuiText
								color={milestoneStatus ? "success" : "danger"}
							>
								<h3>
									{
										milestoneStatus ? (
											"Reached"
										) : (
											"Not Reached"
										)
									}
								</h3>
							</EuiText>
						</EuiFlexItem>
					</EuiFlexGroup>
				</EuiFlexItem>
				<EuiFlexItem grow={10}>
					<EuiText>
						<h3>{milestoneTitle}</h3>
					</EuiText>
				</EuiFlexItem>
				<EuiFlexItem grow={2}>
					{milestoneStatus ? (
						<EuiText color={"success"}>
							<h3>
								{fundraiserRaisedAmount.toFixed(2)}&nbsp;/&nbsp;{milestoneAmount.toFixed(2)}&nbsp;{fundraiserToken}
							</h3>
						</EuiText>
					) : (
						<EuiText color={"danger"}>
							<h3>
								{fundraiserRaisedAmount.toFixed(2)}&nbsp;/&nbsp;{milestoneAmount.toFixed(2)}&nbsp;{fundraiserToken}
							</h3>
						</EuiText>
					)}
				</EuiFlexItem>
				{/*<EuiFlexItem grow={1}>*/}
				{/*	<EuiText>*/}
				{/*		Reached on {parsedReachedOnDate.toLocaleDateString()}*/}
				{/*	</EuiText>*/}
				{/*</EuiFlexItem>*/}
			</EuiFlexGroup>
		</EuiPanel>
	)
}

export {
	MilestoneCard
}