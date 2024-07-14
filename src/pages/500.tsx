import {PageHeaderControlComponentProps} from "@/types/componentTypedefs";
import {EuiButton, EuiFlexGroup, EuiFlexItem, EuiPageTemplate, EuiText} from "@elastic/eui";
import {useEffect} from "react";
import CustomCenter from "@/components/customCenter";

import Link from "next/link"
import Head from "next/head";


export default function NotFoundPage({setShowPageHeader}: PageHeaderControlComponentProps) {
	useEffect(() => {
		setShowPageHeader(false)

		return () => {
			setShowPageHeader(true)
		}
	}, [])

	return (
		<>
			<Head>
				<title>Internal Server Error</title>
				<meta name="description" content="Internal Server Error"/>
				<meta name="viewport" content="width=device-width, initial-scale=1"/>
				<link rel="icon" href="/favicon.ico"/>
			</Head>
			<EuiPageTemplate
				panelled={true}
				bottomBorder={"extended"}
			>
				<CustomCenter>
					<EuiFlexGroup
						direction={"column"}
						justifyContent={"center"}
						alignItems={"center"}
					>
						<EuiFlexItem>
							<EuiText color={"danger"}>
								<h1>500 Internal Server Error</h1>
							</EuiText>
						</EuiFlexItem>
						<EuiFlexItem>
							<EuiText>
								<h2>The server experienced an error processing your request</h2>
							</EuiText>
						</EuiFlexItem>
						<EuiFlexItem>
							<Link
								href={"/"}
							>
								<EuiButton
									color={"ghost"}
								>
									Take me to the Home Page
								</EuiButton>
							</Link>
						</EuiFlexItem>
					</EuiFlexGroup>
				</CustomCenter>
			</EuiPageTemplate>
		</>
	)
}