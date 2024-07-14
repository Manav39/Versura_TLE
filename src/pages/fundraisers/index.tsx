import {GetServerSideProps} from "next";
import {GetFundraiserFeedResponse} from "@/types/apiResponses";
import {GetFundraiserFeedRequestParams} from "@/types/apiRequests";
import {makeAPIRequest} from "@/utils/apiHandler";

import {FundraiserCard} from "@/components/fundraiserCard"
import {
	EuiButton,
	EuiEmptyPrompt,
	EuiFlexGroup,
	EuiFlexItem,
	EuiHorizontalRule,
	EuiIcon,
	EuiPageTemplate,
	EuiSpacer,
	EuiText
} from "@elastic/eui";
import Link from "next/link";
import {useRouter} from "next/router";
import Head from "next/head";
import React from "react";

type FundraiserFeedData = {
	feedPage: number
} & GetFundraiserFeedResponse

// @ts-ignore
export const getServerSideProps: GetServerSideProps<FundraiserFeedData> = async (ctx) => {
	const feedPage = ctx.query.feedPage as string || "1"
	const parsedFeedPage = Number.parseInt(feedPage)
	if (Number.isNaN(parsedFeedPage) || parsedFeedPage < 1) {
		return {
			redirect: {
				destination: "404"
			}
		}
	}
	const {
		isSuccess,
		isError,
		code,
		data,
		error
	} = await makeAPIRequest<GetFundraiserFeedResponse, {}, GetFundraiserFeedRequestParams>({
		endpointPath: "/api/fundraisers",
		requestMethod: "GET",
		queryParams: {
			feedPage: parsedFeedPage.toString()
		},
		ssrContext: ctx
	})
	if (isSuccess && data) {
		const {requestStatus} = data
		if (requestStatus === "SUCCESS") {
			const {feedData} = data
			return {
				props: {
					feedPage: parsedFeedPage,
					feedData: feedData
				}
			}
		}
		if (requestStatus === "ERR_INTERNAL_ERROR") {
			return {
				redirect: {
					destination: "500"
				}
			}
		}
	}
	return {
		redirect: {
			destination: "404"
		}
	}
}

export default function FundraiserFeed(props: FundraiserFeedData): JSX.Element {
	const {feedData, feedPage} = props

	const navRouter = useRouter()

	return (
		<>
			<Head>
				<title>Explore | Versura</title>
				<meta name="description" content="Explore Fundraisers"/>
				<meta name="viewport" content="width=device-width, initial-scale=1"/>
				<link rel="icon" href="/favicon.ico"/>
			</Head>
			<EuiPageTemplate>
				{
					feedData.length ? (
						<EuiFlexGroup
							direction={"column"}
							alignItems={"center"}
						>
							<EuiSpacer/>
							{
								feedData.map((fundraiserData, fundraiserIdx) => {
									return (
										<EuiFlexItem
											key={fundraiserData.fundraiserId}
										>
											<FundraiserCard
												{...fundraiserData}
											/>
										</EuiFlexItem>
									)
								})
							}
						</EuiFlexGroup>
					) : (
						<EuiEmptyPrompt
							color={"plain"}
							title={
								<EuiText>
									<h2>No fundraisers to display</h2>
								</EuiText>
							}
							body={
								<EuiText>
									<h4>Create your own fundraiser to add to the list!</h4>
								</EuiText>
							}
							actions={
								<EuiFlexGroup
									direction={"row"}
								>
									<EuiFlexItem>
										<Link
											href={"/fundraisers/create"}
										>
											<EuiButton
												color={"primary"}
												fill={true}
												fullWidth
											>
												Create Fundraiser
											</EuiButton>
										</Link>
									</EuiFlexItem>
									<EuiFlexItem>
										<Link
											href={
												feedPage > 1 ?
													`${navRouter.pathname}?feedPage=${feedPage - 1}`
													: `/`
											}
										>
											<EuiButton
												color={"ghost"}
												fullWidth
											>
												{
													feedPage > 1 ?
														`Take me back`
														: `Take me home`
												}
											</EuiButton>
										</Link>
									</EuiFlexItem>
								</EuiFlexGroup>
							}
						/>
					)
				}
				{
					feedData.length ? (
						<>
							<EuiSpacer/>
							<EuiHorizontalRule/>
							<EuiPageTemplate.Section
								color={"subdued"}
							>
								<EuiFlexGroup justifyContent="spaceBetween">
									<EuiFlexItem grow={0}>
										<Link
											href={`/fundraisers?feedPage=${feedPage - 1}`}
										>
											<EuiButton
												color={"ghost"}
												disabled={
													feedPage === 1
												}
											>
												<EuiText>
													<h5>
														<EuiIcon type={"arrowLeft"}/> Previous
													</h5>
												</EuiText>
											</EuiButton>
										</Link>
									</EuiFlexItem>
									<EuiFlexItem
										grow={0}
									>
										<Link
											href={`/fundraisers?feedPage=${feedPage + 1}`}
										>
											<EuiButton
												color={"ghost"}
												disabled={
													feedData.length === 0
												}
											>
												<EuiText>
													<h5>
														Next <EuiIcon type={"arrowRight"}/>
													</h5>
												</EuiText>
											</EuiButton>
										</Link>
									</EuiFlexItem>
								</EuiFlexGroup>
							</EuiPageTemplate.Section>
						</>
					) : (
						null
					)
				}
			</EuiPageTemplate>
		</>
	)
}