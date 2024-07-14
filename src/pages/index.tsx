import Head from 'next/head'
import {EuiButton, EuiFlexGroup, EuiFlexItem, EuiPageTemplate, EuiText} from "@elastic/eui"

import Image from 'next/image'

import EthereumIcon from "@/assets/eth-icon.png"
import MetamaskFox from "@/assets/metamask-fox.svg"
import BlockchainNetwork from "@/assets/blockchain-network.png"
import Link from "next/link";

export default function IndexPage() {
	return (
		<>
			<Head>
				<title>Versura</title>
				<meta name="description" content="Versura, a blockchain based crowdfunding platform"/>
				<meta name="viewport" content="width=device-width, initial-scale=1"/>
				<link rel="icon" href="/favicon.ico"/>
			</Head>
			<EuiPageTemplate
				panelled={true}
				bottomBorder={"extended"}
			>
				<EuiPageTemplate.Section
					color={"subdued"}
					restrictWidth={false}
					style={{
						justifyContent: "center"
					}}
				>
					<EuiFlexGroup
						direction={"rowReverse"}
						justifyContent={"spaceAround"}
						alignItems={"center"}
						style={{
							minHeight: "50vh",
						}}
					>
						<Image
							src={EthereumIcon}
							alt={"Ethereum Logo"}
							height={240}
						/>
						<EuiFlexGroup
							direction={"column"}
							style={{
								maxWidth: "50vw"
							}}
						>
							<EuiFlexItem>
								<EuiText>
									<h1>Welcome to Versura</h1>
								</EuiText>
							</EuiFlexItem>
							<EuiFlexItem>
								<EuiText>
									<h4>
										Versura is a revolutionary crowdfunding platform that assists founders to
										acquire crucial seed funding for the next big thing.
										Using revolutionary Ethereum blockchain technology, we guarantee* management of
										funds to the last <i>wei</i>.
									</h4>
									<br/>
									<small>
										<i>* Terms and Conditions Apply</i>
									</small>
								</EuiText>
							</EuiFlexItem>
						</EuiFlexGroup>
					</EuiFlexGroup>
				</EuiPageTemplate.Section>
				<EuiPageTemplate.Section
					color={"plain"}
					restrictWidth={false}
					style={{
						justifyContent: "center"
					}}
				>
					<EuiFlexGroup
						direction={"row"}
						justifyContent={"spaceAround"}
						alignItems={"center"}
						style={{
							minHeight: "50vh",
						}}
					>
						<Image
							src={MetamaskFox}
							alt={"Metamask Logo"}
							height={240}
						/>
						<EuiFlexGroup
							direction={"column"}
							style={{
								maxWidth: "50vw"
							}}
						>
							<EuiFlexItem>
								<EuiText>
									<h1>Decentralised Transactions</h1>
								</EuiText>
							</EuiFlexItem>
							<EuiFlexItem>
								<EuiText>
									<h4>
										Connect your MetaMask wallet dive right into sourcing and contributing funds to
										projects.
										Kickstart your project idea while keeping your identity private*
									</h4>
								</EuiText>
							</EuiFlexItem>
							<EuiFlexItem>
								<EuiFlexGroup>
									<Link
										href={"/fundraisers/create"}
									>
										<EuiButton
											color={"primary"}
											fill
										>
											Create Your Own
										</EuiButton>
									</Link>
								</EuiFlexGroup>
							</EuiFlexItem>
						</EuiFlexGroup>
					</EuiFlexGroup>
				</EuiPageTemplate.Section>
				<EuiPageTemplate.Section
					color={"subdued"}
					restrictWidth={false}
					style={{
						justifyContent: "center"
					}}
				>
					<EuiFlexGroup
						direction={"rowReverse"}
						justifyContent={"spaceAround"}
						alignItems={"center"}
						style={{
							minHeight: "50vh",
						}}
					>
						<Image
							src={BlockchainNetwork}
							alt={"Blockchain Network"}
							width={300}
						/>
						<EuiFlexGroup
							direction={"column"}
							style={{
								maxWidth: "50vw"
							}}
						>
							<EuiFlexItem>
								<EuiText>
									<h1>Secured Funding</h1>
								</EuiText>
							</EuiFlexItem>
							<EuiFlexItem>
								<EuiText>
									<h4>
										We employ multiple security measures to ensure that your funds reach exactly
										where they need to be.
										No <i>wei</i> is left unaccounted for.
										All campaigns are verified before being publicly displayed.
									</h4>
								</EuiText>
							</EuiFlexItem>
							<EuiFlexItem>
								<EuiFlexGroup>
									<Link
										href={"/fundraisers"}
									>
										<EuiButton
											color={"primary"}
											fill
										>
											Explore Fundraisers
										</EuiButton>
									</Link>
								</EuiFlexGroup>
							</EuiFlexItem>
						</EuiFlexGroup>
					</EuiFlexGroup>
				</EuiPageTemplate.Section>
			</EuiPageTemplate>
		</>
	)
}
