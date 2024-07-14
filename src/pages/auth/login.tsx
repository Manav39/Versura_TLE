import React, {useCallback, useContext, useEffect, useState} from "react";
import EuiCenter from '@/components/customCenter'
import Link from "next/link"
import Image from 'next/image'
import Head from 'next/head'
import {
	EuiButton,
	EuiFieldPassword,
	EuiFieldText,
	EuiFlexGroup,
	EuiFlexItem,
	EuiForm,
	EuiFormRow,
	EuiGlobalToastList,
	EuiLoadingSpinner,
	EuiPanel
} from "@elastic/eui";

import VersuraIcon from "@/assets/versura-icon.png";
import MetamaskFoxIcon from "@/assets/metamask-fox.svg"

import {useToastList} from "@/utils/toastUtils";
import {AuthContext} from "@/pages/_app"
import {makeAPIRequest} from "@/utils/apiHandler";
import {useRouter} from "next/router";
import {AuthContextType, PageHeaderControlComponentProps} from "@/types/componentTypedefs";
import {LoginResponse} from "@/types/apiResponses";
import {LoginUserRequestBody} from "@/types/apiRequests";

function MetamaskFoxIconWrapped(): JSX.Element {
	return (
		<Image
			src={MetamaskFoxIcon}
			alt={"Metamask Icon"}
			height={16}
			width={16}
		/>
	)
}

function LoginPage(props: PageHeaderControlComponentProps): JSX.Element {
	const authCtx = useContext<AuthContextType>(AuthContext)

	useEffect(() => {
		props.setShowPageHeader(false)

		return () => {
			props.setShowPageHeader(true)
		}
	}, [])

	const LOGIN_SUCCESS_REDIR_TIMEOUT_S = 5

	const [
		[metamaskConnected, metamaskAddress],
		setMetamaskInfo
	] = useState<[boolean, string]>([false, ""])

	const [userPassword, setUserPassword] = useState<string>("")
	const [passwordInvalid, setPasswordInvalid] = useState<boolean>(false);

	const {toasts, addToast, dismissToast} = useToastList({
		toastIdFactoryFn: (toastCount, toastType) => {
			return `login-page-${toastCount}`
		}
	})

	const [loginHandlerActive, setLoginHandlerActive] = useState<boolean>(false);

	const navRouter = useRouter()
	const {query} = navRouter
	const {returnTo} = query

	const authenticateWithMetamask = useCallback(async () => {
		// @ts-ignore
		if (!window.ethereum) {
			addToast(
				"We couldn't connect to MetaMask",
				"Check if you have the MetaMask extension installed!",
				"danger"
			)
			return
		}
		// @ts-ignore
		if (!window.ethereum.isMetaMask) {
			addToast(
				"Non-MetaMask wallet detected",
				"We only support Metamask wallets as of now",
				"danger"
			)
			return
		}

		try {
			// @ts-ignore
			const ethAccounts: string[] = await window.ethereum.request({method: "eth_requestAccounts"})

			// @ts-ignore
			await window.ethereum.request({
				method: "wallet_switchEthereumChain",
				params: [{
					chainId: process.env.NEXT_PUBLIC_EVM_CHAIN // Sepolia Testnet
				}]
			})

			const selectedAccount = ethAccounts[0]

			setMetamaskInfo([true, selectedAccount])

		} catch (err: unknown) {
			addToast(
				"Please authenticate with MetaMask",
				"Connect your MetaMask account with Versura to continue",
				"danger"
			)
			return
		}
	}, [])

	const attemptUserLogin = useCallback(async () => {
		if (!metamaskConnected) {
			addToast(
				"Metamask Authentication is required",
				"Connect to Metamask by clicking the \"Connect\" button",
				"danger"
			)
			return
		}
		if (userPassword.trim() === "") {
			addToast(
				"Input a valid password",
				"Make sure the password matches the one used when signing up",
				"danger"
			)
			return
		}

		setLoginHandlerActive(true)
		const loginAPIResponse = await makeAPIRequest<LoginResponse, LoginUserRequestBody>({
			endpointPath: `/api/auth/login`,
			requestMethod: "POST",
			bodyParams: {
				walletAddress: metamaskAddress,
				userPass: userPassword
			}
		})

		const {isSuccess, isError, code, data, error} = loginAPIResponse
		if (isError && error) {
			addToast(
				"An error occurred when processing your request",
				(error as Error).message || "",
				"danger"
			)
			setLoginHandlerActive(false)
			return
		}

		if (isSuccess && data) {
			const {requestStatus} = data
			if (code === 400) {
				if (requestStatus === "ERR_INVALID_BODY_PARAMS") {
					const {invalidParams} = data
					if (invalidParams && invalidParams.includes("userPass")) {
						setPasswordInvalid(true)
						addToast(
							"Invalid password provided",
							"Make sure the password matches the one used when signing up",
							"danger"
						)
						setLoginHandlerActive(false)
					}
					if (invalidParams && invalidParams.includes("walletAddress")) {
						addToast(
							"That account doesn't exist",
							"Make sure you are connecting with the right Metamask Account",
							"danger"
						)
						setLoginHandlerActive(false)
					}
					return
				}
			} else if (code === 200) {
				if (requestStatus === "SUCCESS") {
					const {userRole} = data
					authCtx.updateAuthData({
						isAuthenticated: true,
						metamaskAddress: metamaskAddress,
						userRole: userRole
					})
					addToast(
						"You have logged in successfully",
						`You will be redirected in ${LOGIN_SUCCESS_REDIR_TIMEOUT_S} seconds`,
						"success"
					)
					setLoginHandlerActive(false)
					await navRouter.prefetch(returnTo as string || '/')
					setTimeout(() => {
						navRouter.push(returnTo as string || "/")
					}, LOGIN_SUCCESS_REDIR_TIMEOUT_S * 1000)
				}
			}
		}
	}, [metamaskConnected, metamaskAddress, userPassword])

	return (

		<>
			<Head>
				<title>Login | Versura</title>
				<meta name="description" content="Login to Versura"/>
				<meta name="viewport" content="width=device-width, initial-scale=1"/>
				<link rel="icon" href="/favicon.ico"/>
			</Head>


			<EuiCenter
				height={"100vh"}
				width={"100vw"}
				growChildren={false}
			>
				<EuiPanel
					hasShadow={true}
					paddingSize={"xl"}
					style={{
						minWidth: 341,
						maxWidth: "60vw"
					}}
				>
					<EuiFlexGroup
						direction={"column"}
						justifyContent={"center"}
						alignItems={"center"}
						gutterSize={"xl"}
					>
						<EuiFlexItem>
							<Link href={"/"}>
								<Image
									src={VersuraIcon}
									alt={"Versura Icon"}
									placeholder={"blur"}
									height={40}
									width={291}
								/>
							</Link>
						</EuiFlexItem>
						<EuiFlexItem>
							<EuiForm
								component={"form"}
								style={{
									minWidth: "20vw"
								}}
								onSubmit={(e) => {
									e.preventDefault()
									attemptUserLogin()
								}}
							>
								<EuiFormRow
									label={"Metamask Authentication"}
								>
									{metamaskConnected ? (
										<EuiFieldText
											value={metamaskAddress}
											disabled
										/>
									) : (
										<EuiButton
											iconType={MetamaskFoxIconWrapped}
											color={"warning"}
											fullWidth
											onClick={authenticateWithMetamask}
										>
											Connect to Metamask
										</EuiButton>
									)}
								</EuiFormRow>
								<EuiFormRow
									label={"Password"}
								>
									<EuiFieldPassword
										type={"dual"}
										fullWidth
										disabled={!metamaskConnected}
										isInvalid={passwordInvalid}
										onChange={(e) => {
											setPasswordInvalid(false)
											setUserPassword(e.target.value)
										}}
									/>
								</EuiFormRow>
								<EuiFormRow
									label={""}
								>
									<EuiButton
										fill fullWidth
										onClick={attemptUserLogin}
										disabled={!metamaskConnected || loginHandlerActive}
									>
										{
											loginHandlerActive ? (
												<EuiLoadingSpinner/>
											) : (
												"Log In"
											)
										}
									</EuiButton>
								</EuiFormRow>
								<EuiFormRow
									label={""}
								>
									<Link
										href={"/auth/signup"}
									>
										<EuiButton
											fullWidth
										>
											Sign Up Instead
										</EuiButton>
									</Link>
								</EuiFormRow>
							</EuiForm>
						</EuiFlexItem>
					</EuiFlexGroup>
				</EuiPanel>
			</EuiCenter>
			<EuiGlobalToastList
				toasts={toasts}
				dismissToast={dismissToast}
				toastLifeTimeMs={5000}
			/>
		</>
	)
}

export default LoginPage;