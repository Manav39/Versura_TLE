import {EuiProvider} from '@elastic/eui';
import {createContext, useEffect, useState} from "react";

import type {AppProps} from 'next/app'

import '@elastic/eui/dist/eui_theme_dark.css'
import PageHeader from "@/components/pageHeader";
import {AuthContextType, AuthData} from "@/types/componentTypedefs";
import {useRouter} from "next/router";
import {makeAPIRequest} from "@/utils/apiHandler";
import {AuthRefreshResponse} from "@/types/apiResponses";


const AuthContext = createContext<AuthContextType>({
	isAuthenticated: false,
	metamaskAddress: undefined,
	userRole: undefined,
	updateAuthData: (newAuth) => {
		throw new Error(
			"Attempted to update authentication context before initialization of main application!"
		)
	}
})

export default function App({Component, pageProps}: AppProps) {
	const [authData, setAuthData] = useState<AuthData>({
		isAuthenticated: false,
		metamaskAddress: undefined,
		userRole: undefined
	})

	const authContextValue: AuthContextType = {
		...authData,
		updateAuthData: (autD) => {
			setAuthData(autD)
		}
	}

	const [showPageHeader, setShowPageHeader] = useState<boolean>(true);

	const navRouter = useRouter()

	useEffect(() => {
		makeAPIRequest<AuthRefreshResponse>({
			endpointPath: "/api/auth/refresh",
			requestMethod: "POST"
		}).then((responseData) => {
			const {isSuccess, isError, code, data, error} = responseData
			if (isError && error) {
				console.error(error)
				return
			}
			if (isSuccess && data) {
				const {requestStatus, authStatus, authData} = data
				if (requestStatus === "SUCCESS") {
					if (authStatus === "NO_AUTH") {
						setAuthData({
							isAuthenticated: false,
							metamaskAddress: undefined,
							userRole: undefined
						})
						return
					}
					if (authStatus === "AUTH_ACTIVE") {
						const {userRole, walletAddress} = authData!
						setAuthData({
							isAuthenticated: true,
							userRole: userRole,
							metamaskAddress: walletAddress
						})
						return
					}
				}
			}
		}).catch((err) => {
			console.error(err)
		})
	}, [navRouter.pathname, navRouter.query])

	return (
		<>
			<EuiProvider colorMode={"dark"}>
				<AuthContext.Provider value={authContextValue}>
					{showPageHeader ? (
						<PageHeader/>
					) : null}
					<Component
						{...pageProps}
						setShowPageHeader={setShowPageHeader}
					/>
				</AuthContext.Provider>
			</EuiProvider>
		</>
	)
}

export {
	AuthContext,
}