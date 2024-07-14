// Refer to file `@/utils/init.sql` for PostgreSQL type definitions

import {UserRole} from "@/types/queryTypedefs";

interface DecodedJWTCookie {
	walletAddress: string,
	userRole: UserRole
}

type S3ObjectMethods = "GET" | "PUT" | "DELETE"

type WithdrawalStatus = "OPEN" | "APPROVED" | "REJECTED"

export {
	DecodedJWTCookie,
	S3ObjectMethods,
	WithdrawalStatus,
	UserRole
}