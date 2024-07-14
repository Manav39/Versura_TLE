import {db} from "@/utils/db";

enum PARSE_METHOD {
	PARSE_INT,
	PARSE_FLOAT
}

function NON_ZERO(value: number) {
	return value != 0
}

function NON_NEGATIVE(value: number) {
	return value >= 0
}

function NON_ZERO_NON_NEGATIVE(value: number) {
	return value > 0
}

function NON_ZERO_NON_POSITIVE(value: number) {
	return value < 0
}

function PASSTHROUGH<T>(value: T) {
	return true
}

function STRLEN_GT(len: number) {
	return (value: string) => {
		return value.length > len
	}
}

function STRLEN_GT_EQ(len: number) {
	return (value: string) => {
		return value.length >= len
	}
}

function STRLEN_EQ(len: number) {
	return (value: string) => {
		return value.length == len
	}
}

function STRLEN_LT_EQ(len: number) {
	return (value: string) => {
		return value.length <= len
	}
}

function STRLEN_LT(len: number) {
	return (value: string) => {
		return value.length < len
	}
}

function STRLEN_NZ(value: string) {
	return value.length > 0
}

function ALLOW_UNDEFINED_WITH_FN<T>(fn: (value: T) => (boolean | Promise<boolean>)) {
	return async function (value: T | undefined) {
		if (!value) {
			return true
		} else {
			return await fn(value)
		}
	}
}

async function VALID_FUNDRAISER_ID_CHECK(fundraiserId: string) {
	const dbClient = await db.connect()
	const {rows} = await dbClient.query(
		`SELECT 1
		 FROM "fundRaisers"
		 WHERE "fundraiserId" = $1`,
		[fundraiserId]
	)

	dbClient.release()
	if (rows.length) {
		return true
	}

	return false
}

async function VALID_MILESTONE_ID_CHECK(milestoneId: string) {
	const dbClient = await db.connect()
	const {rows} = await dbClient.query(
		`SELECT 1
		 FROM "fundraiserMilestones"
		 WHERE "milestoneId" = $1`,
		[milestoneId]
	)

	dbClient.release()
	if (rows.length) {
		return true
	}

	return false
}

async function VALID_UPDATE_ID_CHECK(updateId: string) {
	const dbClient = await db.connect()
	const {rows} = await dbClient.query(
		`SELECT 1
		 FROM "fundraiserUpdates"
		 WHERE "updateId" = $1`,
		[updateId]
	)

	dbClient.release()
	if (rows.length) {
		return true
	}

	return false
}

async function VALID_OBJECT_KEY_CHECK(objectKey: string) {
	const dbClient = await db.connect()
	const {rows} = await dbClient.query(
		`SELECT 1
		 FROM "internalS3BucketObjects"
		 WHERE "objectKey" = $1`,
		[objectKey]
	)

	dbClient.release()
	if (rows.length) {
		return true
	}

	return false
}


function IN_ARR<T>(elemArray: T[]) {
	return function (value: T) {
		return elemArray.includes(value)
	}
}

function NOT_IN_ARR<T>(elemArray: T[]) {
	return function (value: T) {
		return !elemArray.includes(value)
	}
}

function STRING_TO_NUM_FN(handlerFn: (number: number) => (boolean | Promise<boolean>), parseMethod: PARSE_METHOD = PARSE_METHOD.PARSE_INT) {
	return async function (value: string) {
		const parsedValueFn = [
			Number.parseFloat,
			Number.parseInt
		][parseMethod]
		const parsedValue = parsedValueFn(value)
		if (Number.isNaN(parsedValue)) {
			return false
		}
		if (!Number.isFinite(parsedValue)) {
			return false
		}
		return handlerFn(parsedValue)
	}
}

export {
	PARSE_METHOD,

	NON_ZERO,
	NON_NEGATIVE,
	NON_ZERO_NON_NEGATIVE,
	NON_ZERO_NON_POSITIVE,

	PASSTHROUGH,
	ALLOW_UNDEFINED_WITH_FN,

	STRLEN_LT,
	STRLEN_GT,
	STRLEN_EQ,
	STRLEN_LT_EQ,
	STRLEN_GT_EQ,
	STRLEN_NZ,

	IN_ARR,
	NOT_IN_ARR,

	VALID_FUNDRAISER_ID_CHECK,
	VALID_MILESTONE_ID_CHECK,
	VALID_UPDATE_ID_CHECK,
	VALID_OBJECT_KEY_CHECK,
	STRING_TO_NUM_FN
}