import {UserRole} from "@/types/queryTypedefs";

export type AuthData = {
	isAuthenticated: boolean,
	metamaskAddress?: string
	userRole?: UserRole
}

export type AuthContextType = AuthData & {
	updateAuthData: (newAuthData: AuthData) => void
}

interface PageHeaderControlComponentProps {
	setShowPageHeader: (boolean) => void
}

export {
	PageHeaderControlComponentProps
}