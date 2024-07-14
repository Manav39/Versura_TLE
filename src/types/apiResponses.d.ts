import {
	FundraiserDonations,
	FundraiserMilestones,
	FundRaisers,
	FundraiserUpdates,
	FundraiserWithdrawalRequests,
	UserRole
} from "@/types/queryTypedefs";
import {DecodedJWTCookie} from "@/types/apiTypedefs";
import {AdminDashboardData} from "@/pages/api/admin/dashboard";

export type APIResponseCode =
	0 | 200 | 400 | 403 | 404 | 405 | 500
export type APIResponseRequestStatus =
// 2xx
	"SUCCESS" |
	// 3xx
	// 4xx
	"ERR_BODY_REQUIRED" |
	"ERR_INTERNAL_ERROR" |
	"ERR_INVALID_METHOD" |
	"ERR_INVALID_BODY_PARAMS" |
	"ERR_MISSING_BODY_PARAMS" |
	"ERR_INVALID_QUERY_PARAMS" |
	"ERR_MISSING_QUERY_PARAMS" |
	"ERR_AUTH_REQUIRED" |
	"ERR_ADMIN_REQUIRED" |
	"ERR_UNAUTHORIZED" |
	"ERR_NOT_FOUND"

interface APIResponse {
	requestStatus: APIResponseRequestStatus
	invalidParams?: string[],
	missingParams?: string[]
}

interface LoginResponse extends APIResponse {
	userRole?: UserRole,
}

interface SignupResponse extends APIResponse {

}

interface LogoutResponse extends APIResponse {

}

interface AuthRefreshResponse extends APIResponse {
	authStatus: "NO_AUTH" | "AUTH_ACTIVE",
	authData?: DecodedJWTCookie
}

interface CreateFundraiserResponse extends APIResponse {
	fundraiserId: number,
}

interface GenericMedia {
	mediaName: string,
	mediaURL: string,
	mediaContentType: string
}

type FundraiserMilestone = Omit<FundraiserMilestones, "milestoneMediaObjectKeys"> & {
	milestoneMedia: GenericMedia[]
}

type FundraiserDonation = Pick<
	FundraiserDonations,
	"donatedAmount" | "donationTimestamp" | "donorAddress" | "transactionHash"
>

type FundraiserUpdate = Pick<
	FundraiserUpdates,
	"updateId" | "updateTitle" | "updateDescription" | "updatePostedOn"
> & {
	updateMedia: GenericMedia[]
}

interface GetFundraiserResponse extends APIResponse {
	fundraiserData: Omit<
		FundRaisers,
		"fundraiserMediaObjectKeys"
	> & {
		fundraiserMedia: GenericMedia[],
		fundraiserMilestones: FundraiserMilestone[],
		fundraiserUpdates: FundraiserUpdate[],
		fundraiserDonations: FundraiserDonation[]
	}
}

interface GetFundraiserFeedResponse extends APIResponse {
	feedData: Omit<
		GetFundraiserResponse["fundraiserData"],
		"fundraiserMilestones" | "fundraiserDonations" | "fundraiserUpdates"
	>[]
}

interface PresignedURLResponse extends APIResponse {
	presignedUrl: string
}

interface MediaCallbackResponse extends APIResponse {

}

interface CreateFundraiserMilestoneResponse extends APIResponse {
	milestoneId: number
}

interface CreateFundraiserUpdateResponse extends APIResponse {
	updateId: number
}

interface AdminGetWithdrawalResponse extends APIResponse {
	pendingWithdrawals: (
		Omit<FundraiserWithdrawalRequests, "targetFundraiser"> & {
		targetFundraiser: {
			fundraiserId: number,
			fundraiserTitle: string,
			fundraiserRaisedAmount: number,
			fundraiserTarget: number
		}
	}
		)[]
}

interface AdminGetFundraisersResponse extends APIResponse {
	pendingFundraisers: Omit<
		GetFundraiserResponse["fundraiserData"],
		"fundraiserMilestones" | "fundraiserDonations" | "fundraiserUpdates"
	>[]
}

interface AdminGetDashboardResponse extends APIResponse {
	dashboardData: AdminDashboardData
}

export {
	SignupResponse,
	LoginResponse,
	LogoutResponse,
	AuthRefreshResponse,
	APIResponse,
	CreateFundraiserResponse,
	GetFundraiserResponse,
	GetFundraiserFeedResponse,
	PresignedURLResponse,
	GenericMedia,
	MediaCallbackResponse,
	CreateFundraiserMilestoneResponse,
	CreateFundraiserUpdateResponse,
	FundraiserMilestone,
	FundraiserDonation,
	FundraiserUpdate,
	AdminGetFundraisersResponse,
	AdminGetWithdrawalResponse,
	AdminGetDashboardResponse,
	AdminDashboardData
};
