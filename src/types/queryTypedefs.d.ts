import {WithdrawalStatus} from "@/types/apiTypedefs";

export type UserRole = "CLIENT" | "ADMIN"
export type FundraiserStatus = "IN_QUEUE" | "OPEN" | "CLOSED"

export type AuthUsers = {
	walletAddress: string,
	userPass: string,
	userRole: UserRole
}

export type FundRaisers = {
	fundraiserId: number,
	fundraiserCreator: string,
	fundraiserTitle: string,
	fundraiserDescription: string,
	fundraiserTarget: number,
	fundraiserToken: string,
	fundraiserMinDonationAmount: number,
	fundraiserRaisedAmount: number,
	fundraiserContributorCount: number,
	fundraiserMilestoneCount: number,
	fundraiserMediaObjectKeys: string[]
	fundraiserCreatedOn: string,
	fundraiserWithdrawnAmount: number,
	fundraiserStatus: FundraiserStatus
}

export type FundraiserDonations = {
	donatedFundraiser: number,
	donorAddress: string
	donatedAmount: number
	transactionHash: string,
	donationTimestamp: string,
}

export type S3BucketObjects = {
	bucketName: string,
	objectName: string,
	objectKey: string,
	objectSizeBytes: number,
	objectContentType: string
}

export type FundraiserMilestones = {
	milestoneId: number,
	milestoneFundraiserId: number,
	milestoneTitle: string,
	milestoneAmount: number,
	milestoneStatus: boolean,
	milestoneMediaObjectKeys: string[],
	milestoneReachedOn: string,
}

export type FundraiserUpdates = {
	updateId: number,
	updateFundraiserId: number,
	updateTitle: string,
	updateDescription: string,
	updatePostedOn: string,
	updateMediaObjectKeys: string[]
}

export type FundraiserWithdrawalRequests = {
	requestId: number,
	walletAddress: string,
	targetFundraiser: number,
	withdrawalAmount: number,
	withdrawalToken: string,
	withdrawalStatus: WithdrawalStatus,
}