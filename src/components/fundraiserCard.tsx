import {GenericMedia, GetFundraiserResponse} from "@/types/apiResponses";
import {EuiAvatar, EuiFlexGroup, EuiFlexItem, EuiLink, EuiPanel, EuiText} from "@elastic/eui";

import PlaceholderImage from "@/assets/placeholder-image.png"
import Image from "next/image";
import {LINK_TEXT_COLOR_OVERRIDE, useValueScale} from "@/utils/common";
import Link from "next/link";

type FundraiserCardProps = Omit<
	GetFundraiserResponse["fundraiserData"],
	"fundraiserMilestones" | "fundraiserDonations" | "fundraiserUpdates"
>

function FundraiserCard(props: FundraiserCardProps) {
	const {
		fundraiserId, fundraiserTitle,
		fundraiserDescription, fundraiserCreator,
		fundraiserTarget, fundraiserToken,
		fundraiserMinDonationAmount, fundraiserContributorCount,
		fundraiserRaisedAmount, fundraiserCreatedOn,
		fundraiserMedia, fundraiserMilestoneCount
	} = props

	const progressStatusColors = ["danger", "orange", "yellow", "green", "success"]

	const fundraiserCompletionPercentage = (fundraiserRaisedAmount * 100) / fundraiserTarget

	const selectedColor = useValueScale({
		minScale: 0,
		maxScale: 4,
		minValue: 0,
		maxValue: 100,
		currValue: fundraiserCompletionPercentage,
		scaledValues: progressStatusColors
	})

	const fundraiserPercentageInt = Number.parseInt(
		fundraiserCompletionPercentage.toString()
	)

	let selectedFundraiserImage: GenericMedia | null = null;
	for (const media of fundraiserMedia) {
		const {mediaContentType} = media
		if (mediaContentType.startsWith("image")) {
			selectedFundraiserImage = media
			break
		}
	}

	return (
		<EuiPanel
			color={"plain"}
			style={{
				width: "90vw"
			}}
		>
			<EuiFlexGroup
				direction={"row"}
				alignItems={"center"}
				justifyContent={"spaceAround"}
				gutterSize={"xl"}
			>
				<EuiFlexItem
					grow={0}
				>
					<Image
						src={
							selectedFundraiserImage ? selectedFundraiserImage.mediaURL : PlaceholderImage
						}
						alt={`${fundraiserTitle} Banner Image`}
						width={240}
						height={-1}
						style={{
							borderRadius: 12,
							maxHeight: 150
						}}
					/>
				</EuiFlexItem>
				<EuiFlexItem>
					<EuiFlexGroup
						direction={"column"}
					>
						<EuiFlexItem>
							<EuiLink
								style={{
									textDecorationColor: LINK_TEXT_COLOR_OVERRIDE
								}}
							>
								<Link
									href={`/fundraisers/${fundraiserId}`}
								>
									<EuiText
										color={LINK_TEXT_COLOR_OVERRIDE}
									>
										<h3>{fundraiserTitle}</h3>
									</EuiText>
								</Link>
							</EuiLink>
						</EuiFlexItem>
						<EuiFlexItem>
							<EuiFlexGroup>
								<EuiFlexItem
									grow={0}
								>
									<EuiAvatar
										name={fundraiserCreator}
										color={"plain"}
										type={"space"}
										imageUrl={
											`//gravatar.com/avatar/${fundraiserCreator.slice(2)}?d=retro&f=y`
										}
									/>
								</EuiFlexItem>
								<EuiFlexItem
									grow={0}
								>
									<EuiLink
										style={{
											textDecorationColor: LINK_TEXT_COLOR_OVERRIDE
										}}
									>
										<Link
											href={`https://${process.env.NEXT_PUBLIC_EVM_CHAIN_NAME}.etherscan.io/address/${fundraiserCreator}`}
											target={"_blank"}
										>
											<EuiText
												color={LINK_TEXT_COLOR_OVERRIDE}
											>
												{fundraiserCreator}
											</EuiText>
										</Link>
									</EuiLink>
								</EuiFlexItem>
							</EuiFlexGroup>
						</EuiFlexItem>
					</EuiFlexGroup>
				</EuiFlexItem>
				<EuiFlexItem
					grow={0}
				>
					<EuiFlexGroup>
						<EuiFlexItem>
							<EuiFlexGroup
								direction={"column"}
								gutterSize={"s"}
							>
								<EuiFlexItem>
									<EuiText
										textAlign={"center"}
										color={selectedColor}
									>
										<h3>
											{fundraiserPercentageInt}%
										</h3>
									</EuiText>
								</EuiFlexItem>
								<EuiFlexItem>
									<EuiText
										textAlign={"center"}
									>
										<h5>Complete</h5>
									</EuiText>
								</EuiFlexItem>
							</EuiFlexGroup>
						</EuiFlexItem>
						<EuiFlexItem>
							<EuiFlexGroup
								direction={"column"}
								gutterSize={"s"}
							>
								<EuiFlexItem>
									<EuiText
										textAlign={"center"}
									>
										<h3>
											{fundraiserContributorCount}
										</h3>
									</EuiText>
								</EuiFlexItem>
								<EuiFlexItem>
									<EuiText
										textAlign={"center"}
									>
										<h5>Contributors</h5>
									</EuiText>
								</EuiFlexItem>
							</EuiFlexGroup>
						</EuiFlexItem>
						<EuiFlexItem>
							<EuiFlexGroup
								direction={"column"}
								gutterSize={"s"}
							>
								<EuiFlexItem>
									<EuiText
										textAlign={"center"}
									>
										<h3>
											{fundraiserMilestoneCount}
										</h3>
									</EuiText>
								</EuiFlexItem>
								<EuiFlexItem>
									<EuiText
										textAlign={"center"}
									>
										<h5>Milestones</h5>
									</EuiText>
								</EuiFlexItem>
							</EuiFlexGroup>
						</EuiFlexItem>
					</EuiFlexGroup>
				</EuiFlexItem>
			</EuiFlexGroup>
		</EuiPanel>
	)
}

export {
	FundraiserCard
}