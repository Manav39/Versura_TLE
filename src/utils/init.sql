CREATE TABLE "authUsers"
(
	"walletAddress" TEXT UNIQUE NOT NULL,
	"userPass"      TEXT        NOT NULL,
	"userRole"      TEXT        NOT NULL DEFAULT 'CLIENT',

	CONSTRAINT "pk_authUsers_walletAddress_userName"
		PRIMARY KEY ("walletAddress"),

	CONSTRAINT "chk_authUsers_userRole_isValidRole"
		CHECK ( "userRole" IN ('CLIENT', 'ADMIN'))
);

CREATE TABLE "fundRaisers"
(
	"fundraiserId"                SERIAL PRIMARY KEY,
	"fundraiserCreator"           TEXT    NOT NULL,

	"fundraiserTitle"             TEXT    NOT NULL,
	"fundraiserDescription"       TEXT    NOT NULL,

	"fundraiserTarget"            NUMERIC NOT NULL,
	"fundraiserToken"             TEXT    NOT NULL DEFAULT 'ETH',
	"fundraiserMinDonationAmount" NUMERIC          DEFAULT 1e-18,

	"fundraiserRaisedAmount"      NUMERIC NOT NULL DEFAULT 0,
	"fundraiserWithdrawnAmount"   NUMERIC NOT NULL DEFAULT 0,

	"fundraiserContributorCount"  INTEGER NOT NULL DEFAULT 0,
	"fundraiserMilestoneCount"    INTEGER NOT NULL DEFAULT 0,

	"fundraiserCreatedOn"         TIMESTAMP WITH TIME ZONE,

	"fundraiserMediaObjectKeys"   TEXT[]           DEFAULT '{}'::text[],
	"fundraiserStatus"            TEXT             DEFAULT 'IN_QUEUE',

	"fundraiserUpdateCount"       INTEGER NOT NULL DEFAULT 0,

	CONSTRAINT "fk_fundRaisers_fundraiserCreator_authUsers_walletAddress"
		FOREIGN KEY ("fundraiserCreator")
			REFERENCES "authUsers" ("walletAddress"),

	CONSTRAINT "chk_fundRaisers_fundraiserStatus_validStatus"
		CHECK ( "fundraiserStatus" IN ('IN_QUEUE', 'OPEN', 'CLOSED') )
);

CREATE TABLE "fundraiserUpdates"
(
	"updateId"              SERIAL,
	"updateFundraiserId"    INTEGER                  NOT NULL,

	"updateTitle"           TEXT                     NOT NULL,
	"updateDescription"     TEXT                     NOT NULL,

	"updatePostedOn"        TIMESTAMP WITH TIME ZONE NOT NULL,
	"updateMediaObjectKeys" TEXT[] DEFAULT '{}'::text[],

	CONSTRAINT "pk_fundraiserUpdates_updateId_updateFundraiserId"
		PRIMARY KEY ("updateId", "updateFundraiserId"),

	CONSTRAINT "fk_fundraiserUpdates_updateFundraiser_fundRaisers_fundraiserId"
		FOREIGN KEY ("updateFundraiserId") REFERENCES "fundRaisers" ("fundraiserId")
);

CREATE TABLE "fundraiserMilestones"
(
	"milestoneId"              SERIAL,
	"milestoneFundraiserId"    INTEGER                                       NOT NULL,

	"milestoneTitle"           TEXT                                          NOT NULL,
	"milestoneAmount"          NUMERIC,
	"milestoneStatus"          BOOLEAN                  DEFAULT FALSE,

	"milestoneMediaObjectKeys" TEXT[]                   DEFAULT '{}'::TEXT[] NOT NULL,

	"milestoneReachedOn"       TIMESTAMP WITH TIME ZONE DEFAULT NULL,

	CONSTRAINT "pk_fundraiserMilestones_milestoneId_milestoneFundraiserId"
		PRIMARY KEY ("milestoneId", "milestoneFundraiserId"),

	CONSTRAINT "fk_fundraiserMilestone_milestoneFundId_fundRaisers_fundraiserId"
		FOREIGN KEY ("milestoneFundraiserId") REFERENCES "fundRaisers" ("fundraiserId")

);

CREATE TABLE "fundraiserDonations"
(
	"donatedFundraiser" INTEGER                  NOT NULL,
	"donorAddress"      TEXT                     NOT NULL,
	"donatedAmount"     NUMERIC,
	"transactionHash"   TEXT                     NOT NULL,

	"donationTimestamp" TIMESTAMP WITH TIME ZONE NOT NULL,

	CONSTRAINT "fk_fundraiserDonations_donatedFundraiser_fundRaisers_fundId"
		FOREIGN KEY ("donatedFundraiser") REFERENCES "fundRaisers" ("fundraiserId"),

	CONSTRAINT "fk_fundraiserDonations_donorAddress_authUsers_walletAddress"
		FOREIGN KEY ("donorAddress") REFERENCES "authUsers" ("walletAddress")

);

CREATE TABLE "fundraiserWithdrawalRequests"
(
	"requestId"        SERIAL PRIMARY KEY,
	"walletAddress"    TEXT    NOT NULL,
	"targetFundraiser" INTEGER NOT NULL,
	"withdrawalAmount" NUMERIC NOT NULL,
	"withdrawalToken"  TEXT    NOT NULL DEFAULT 'ETH',
	"requestStatus"    TEXT             DEFAULT 'OPEN',

	CONSTRAINT "fk_withdrawalRequests_walletAddress_authUsers_walletAddress"
		FOREIGN KEY ("walletAddress") REFERENCES "authUsers" ("walletAddress"),

	CONSTRAINT "fk_withdrawalRequests_targetFundraiser_fundRaisers_fundraiserId"
		FOREIGN KEY ("targetFundraiser") REFERENCES "fundRaisers" ("fundraiserId"),

	CONSTRAINT "chk_withdrawalRequests_requestStatus_validStatus"
		CHECK ( "requestStatus" IN ('OPEN', 'APPROVED', 'REJECTED'))
);

CREATE TABLE "internalS3Buckets"
(
	"bucketName"        TEXT PRIMARY KEY,
	"bucketLocation"    TEXT NOT NULL,
	"bucketObjectCount" INTEGER DEFAULT 0
);

CREATE TABLE "internalS3BucketObjects"
(
	"bucketName"        TEXT        NOT NULL,
	"objectName"        TEXT        NOT NULL,
	"objectKey"         TEXT UNIQUE NOT NULL,
	"objectSizeBytes"   INTEGER DEFAULT 0,
	"objectContentType" TEXT        NOT NULL,

	CONSTRAINT "fk_S3BucketObjects_bucketName_S3Buckets_bucketName"
		FOREIGN KEY ("bucketName") REFERENCES "internalS3Buckets" ("bucketName")
);