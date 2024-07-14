import {FundraiserPageProps} from "@/pages/fundraisers/[fundraiserId]";
import {EuiButton, EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiIcon, EuiPanel, EuiText} from "@elastic/eui";
import {useContext, useState} from "react";
import {AuthContext} from "@/pages/_app";
import {MilestoneCard} from "@/components/milestoneCard";
import {GenericMedia} from "@/types/apiResponses";
import {ToastUtils} from "@/utils/toastUtils";
import {MilestoneForm} from "@/components/milestoneForm";

type FundraiserMilestonesProps = Pick<
	FundraiserPageProps,
	"fundraiserMilestones" | "fundraiserCreator" | "fundraiserStatus" | "fundraiserToken" | "fundraiserRaisedAmount" | "fundraiserTarget" | "fundraiserId"
> & {
	fundraiserDefaultMedia?: GenericMedia,
	addToast: ToastUtils["addToast"]
}

function FundraiserMilestones(props: FundraiserMilestonesProps) {
	const authCtx = useContext(AuthContext);

	const {
		fundraiserMilestones,
		fundraiserCreator,
		fundraiserStatus,
		fundraiserToken,
		fundraiserRaisedAmount,
		fundraiserTarget,
		fundraiserDefaultMedia,
		fundraiserId,
		addToast,
	} = props;

	const mappedMilestones = fundraiserMilestones.map((milestoneData) => {
		const {milestoneStatus} = milestoneData;
		if (milestoneStatus === true) {
			return 1 as number;
		}
		return 0 as number;
	});

	const successfulMilestoneCount = mappedMilestones.reduce((prev, curr) => {
		return prev + curr;
	}, 0);

	const [showMilestoneForm, setShowMilestoneForm] = useState(false);

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
								<h2>Milestones</h2>
							</EuiText>
						</EuiFlexItem>
						{
							fundraiserCreator === authCtx.metamaskAddress ? (
								<EuiFlexItem grow={0}>
									{
										showMilestoneForm ? (
											<EuiButton
												color={"danger"}
												fill
												onClick={() => setShowMilestoneForm(false)}
											>
												<EuiIcon type={"cross"}/>Hide Form
											</EuiButton>
										) : (
											<EuiButton
												color={"primary"}
												fill
												onClick={() => setShowMilestoneForm(true)}
											>
												<EuiIcon type={"plus"}/>Add Milestone
											</EuiButton>
										)
									}
								</EuiFlexItem>
							) : (
								null
							)
						}
					</EuiFlexGroup>
				</EuiFlexItem>
				<EuiHorizontalRule margin={"xs"}/>
				<EuiFlexItem>
					<EuiFlexGroup direction={"column"}>
						{
							fundraiserMilestones.length > 0 ? (
								fundraiserMilestones.map((fundraiserMilestoneData) => {
									return (
										<EuiFlexItem key={fundraiserMilestoneData.milestoneId}>
											<MilestoneCard
												{...fundraiserMilestoneData}
												fundraiserToken={fundraiserToken}
												fundraiserRaisedAmount={fundraiserRaisedAmount}
												fundraiserTarget={fundraiserTarget}
												fundraiserDefaultMedia={fundraiserDefaultMedia}
											/>
										</EuiFlexItem>
									);
								})
							) : (
								<EuiFlexItem>
									<EuiText>
										<h3>No Milestones to display</h3>
									</EuiText>
								</EuiFlexItem>
							)
						}
					</EuiFlexGroup>
				</EuiFlexItem>
				{
					showMilestoneForm ? (
						<>
							<EuiHorizontalRule margin={"xs"}/>
							<EuiFlexItem>
								<MilestoneForm
									fundraiserId={fundraiserId}
									fundraiserToken={fundraiserToken}
									fundraiserTarget={fundraiserTarget}
									addToast={addToast}
									hideForm={() => setShowMilestoneForm(false)}
								/>
							</EuiFlexItem>
						</>
					) : (
						null
					)
				}
			</EuiFlexGroup>
		</EuiPanel>
	);
}

export {
	FundraiserMilestones
};