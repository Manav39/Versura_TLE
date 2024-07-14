import {FundraiserPageProps} from "@/pages/fundraisers/[fundraiserId]";
import {EuiTimelineProps} from "@elastic/eui/src/components/timeline/timeline";
import {
	EuiAvatar,
	EuiButton,
	EuiFlexGroup,
	EuiFlexItem,
	EuiHorizontalRule,
	EuiPanel,
	EuiText,
	EuiTimeline
} from "@elastic/eui";
import {FundraiserUpdateCard} from "@/components/fundraiserUpdateCard";
import {useContext, useState} from "react";
import {UpdateForm} from "@/components/updateForm";
import {ToastUtils} from "@/utils/toastUtils";
import {AuthContext} from "@/pages/_app";

type FundraiserUpdatesProps = Pick<
	FundraiserPageProps,
	"fundraiserId" | "fundraiserUpdates" | "fundraiserCreator"
> & {
	addToast: ToastUtils["addToast"]
}

function FundraiserUpdates(props: FundraiserUpdatesProps) {
	const authCtx = useContext(AuthContext)

	const {
		fundraiserId,
		fundraiserUpdates,
		fundraiserCreator,
		addToast
	} = props;

	const [showUpdateForm, setShowUpdateForm] = useState(false);

	const timelineItems: EuiTimelineProps["items"] = fundraiserUpdates.map((updateData) => {
		return {
			icon: (
				<EuiAvatar
					name={fundraiserCreator}
					color={"plain"}
					type={"space"}
					imageUrl={
						`//gravatar.com/avatar/${fundraiserCreator.slice(2)}?d=retro&f=y`
					}
				/>
			),
			iconAriaLabel: fundraiserCreator,
			verticalAlign: "top",
			children: (
				<FundraiserUpdateCard
					fundraiserId={fundraiserId}
					fundraiserCreator={fundraiserCreator}
					addToast={addToast}
					{...updateData}
				/>
			)
		};
	});

	return (
		<EuiPanel
			style={{
				width: "90vw"
			}}
			color={"plain"}
		>
			<EuiFlexGroup direction={"column"} gutterSize={"s"}>
				<EuiFlexItem>
					<EuiFlexGroup justifyContent={"spaceBetween"}>
						<EuiFlexItem>
							<EuiText>
								<h2>Fundraiser Updates</h2>
							</EuiText>
						</EuiFlexItem>
						<EuiFlexItem grow={0}>
							{
								authCtx.metamaskAddress === fundraiserCreator ? (
									<>
										{
											showUpdateForm ? (
												<EuiButton
													fill
													onClick={() => setShowUpdateForm(false)}
													color={"danger"}
													iconType={"cross"}
												>
													Hide Form
												</EuiButton>
											) : (
												<EuiButton
													fill
													onClick={() => setShowUpdateForm(true)}
													color={"primary"}
													iconType={"plus"}
												>
													Create Update
												</EuiButton>
											)
										}
									</>
								) : (
									null
								)
							}
						</EuiFlexItem>
					</EuiFlexGroup>
				</EuiFlexItem>
				<EuiHorizontalRule margin={"xs"}/>
				<EuiFlexItem>
					{
						fundraiserUpdates.length > 0 ? (
							<EuiTimeline
								items={
									showUpdateForm ? (
										[
											...timelineItems,
											{
												icon: "plus",
												iconAriaLabel: "add update",
												verticalAlign: "top",
												children: (
													<UpdateForm
														fundraiserId={fundraiserId}
														hideForm={() => setShowUpdateForm(false)}
														addToast={addToast}
													/>
												)
											}
										]
									) : (
										timelineItems
									)
								}
							/>
						) : (
							<>
								<EuiFlexItem>
									<EuiText>
										<h3>No Updates Posted</h3>
									</EuiText>
								</EuiFlexItem>
								{
									(fundraiserUpdates.length === 0 && showUpdateForm) ? (
										<>
											<EuiHorizontalRule/>
											<EuiFlexItem>
												<UpdateForm
													fundraiserId={fundraiserId}
													hideForm={() => setShowUpdateForm(false)}
													addToast={addToast}
												/>
											</EuiFlexItem>
										</>
									) : (
										null
									)
								}

							</>
						)
					}
				</EuiFlexItem>
			</EuiFlexGroup>
		</EuiPanel>
	);

}

export {
	FundraiserUpdates
};