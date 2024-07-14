import {AuthContext} from "@/pages/_app";
import {AuthContextType} from "@/types/componentTypedefs";
import {EuiAvatar, EuiGlobalToastList, EuiHeader, EuiHeaderLink, EuiHeaderLinks, EuiHeaderSection} from "@elastic/eui"
import {useCallback, useContext, useState} from "react";
import Link from "next/link";
import Image from "next/image";

import VersuraIcon from "@/assets/versura-icon.png"
import {useRouter} from "next/router"
import {LINK_TEXT_COLOR_OVERRIDE} from "@/utils/common";
import {makeAPIRequest} from "@/utils/apiHandler";
import {LogoutResponse} from "@/types/apiResponses";
import {LogoutUserRequestBody} from "@/types/apiRequests";
import {useToastList} from "@/utils/toastUtils";

export default function PageHeader(): JSX.Element {
	const LOGOUT_REDIRECT_TIMER_S = 5 as const

	const authCtx = useContext<AuthContextType>(AuthContext)
	const {isAuthenticated, metamaskAddress, userRole} = authCtx
	const navRouter = useRouter()
	const {pathname, query} = navRouter
	const {returnTo} = query

	let returnPagePath = pathname
	for (const queryElement in query) {
		returnPagePath = returnPagePath.replace(
			`[${queryElement}]`,
			query[queryElement]! as string
		)
	}

	const {toasts, addToast, dismissToast} = useToastList({
		toastIdFactoryFn: (toastCount, toastType) => {
			return `global-${toastType}-toast-${toastCount}`
		}
	})

	const [logoutHandlerActive, setLogoutHandlerActive] = useState<boolean>(false)

	const attemptUserLogout = useCallback(async () => {
		if (!isAuthenticated) {
			return
		}

		setLogoutHandlerActive(true)
		const {isSuccess, isError, code, data, error} = await makeAPIRequest<LogoutResponse, LogoutUserRequestBody>({
			endpointPath: `/api/auth/logout`,
			requestMethod: "POST"
		})

		if (isError && error) {
			addToast(
				"An error occurred when processing your request",
				(error as Error).message || "",
				"danger"
			)
			return
		}

		if (isSuccess && data) {
			const {requestStatus} = data
			if (code === 500 && requestStatus === "ERR_INTERNAL_ERROR") {
				addToast(
					"An error occurred when processing your request",
					"An internal error occurred",
					"danger"
				)
				setLogoutHandlerActive(false)
				return
			}
			if (code === 403 && requestStatus === "ERR_AUTH_REQUIRED") {
				addToast(
					"You are not authenticated yet",
					"Log in before attempting to log out of an account",
					"danger"
				)
				setLogoutHandlerActive(false)
				return
			}
			if (code === 200 && requestStatus === "SUCCESS") {
				addToast(
					"You have been logged out successfully",
					"",
					"success"
				)
				authCtx.updateAuthData({
					isAuthenticated: false,
					metamaskAddress: undefined,
					userRole: undefined
				})
				setLogoutHandlerActive(false)
				setTimeout(() => {
					navRouter.reload()
				}, LOGOUT_REDIRECT_TIMER_S * 1000)
				return
			}
		}
	}, [navRouter, authCtx])

	return (
		<EuiHeader
			style={{
				alignItems: "center"
			}}
		>
			<EuiHeaderSection
				side={"left"}
			>
				<EuiHeaderLinks
					popoverBreakpoints={"none"}
				>
					<EuiHeaderLink>
						<Link
							href={"/fundraisers"}
							style={{
								color: LINK_TEXT_COLOR_OVERRIDE
							}}
						>
							Explore
						</Link>
					</EuiHeaderLink>
					<EuiHeaderLink>
						<Link
							href={"/fundraisers/create"}
							style={{
								color: LINK_TEXT_COLOR_OVERRIDE
							}}
						>
							Create
						</Link>
					</EuiHeaderLink>
				</EuiHeaderLinks>
			</EuiHeaderSection>
			<EuiHeaderSection>
				<Link
					href={"/"}
					key={"header-link-home"}
					style={{
						display: "flex",
						flexDirection: "column",
						justifyContent: "center",
						alignItems: "center"
					}}
				>
					<Image
						src={VersuraIcon}
						alt={"Versura Icon. Click to return to the home page"}
						height={24}
					/>
				</Link>
			</EuiHeaderSection>
			<EuiHeaderSection
				side={"right"}
				style={{
					alignItems: "center"
				}}
			>
				{isAuthenticated ? (
					<>
						<EuiHeaderLinks
							popoverBreakpoints={"none"}
						>
							{
								userRole === "ADMIN" ? (
									<EuiHeaderLink>
										<Link
											href={`/admin/dashboard`}
											style={{
												color: LINK_TEXT_COLOR_OVERRIDE
											}}
										>
											Dashboard
										</Link>
									</EuiHeaderLink>
								) : null
							}
							<EuiHeaderLink
								onClick={attemptUserLogout}
							>
								Log Out
							</EuiHeaderLink>
						</EuiHeaderLinks>
						<EuiAvatar
							name={metamaskAddress || ""}
							imageUrl={
								`//gravatar.com/avatar/${metamaskAddress?.slice(2) || ""}?d=retro&f=y`
							}
							color={"plain"}
							type={"space"}
						/>
					</>
				) : (
					<EuiHeaderLinks
						popoverBreakpoints={"none"}
					>
						<EuiHeaderLink>
							<Link
								href={`/auth/login?returnTo=${returnPagePath}`}
								style={{
									color: LINK_TEXT_COLOR_OVERRIDE
								}}
							>
								Log In
							</Link>
						</EuiHeaderLink>
						<EuiHeaderLink>
							<Link
								href={`/auth/signup?returnTo=${returnPagePath}`}
								style={{
									color: LINK_TEXT_COLOR_OVERRIDE
								}}
							>
								Sign Up
							</Link>
						</EuiHeaderLink>
					</EuiHeaderLinks>
				)}
			</EuiHeaderSection>
			<EuiGlobalToastList
				dismissToast={dismissToast}
				toastLifeTimeMs={5000}
				toasts={toasts}
			/>
		</EuiHeader>
	)
}