import {Pool, types} from 'pg';

const db = new Pool({
	connectionString: process.env.AWS_RDS_DB_URL,
})

if (!db) {
	console.error(
		"Critical error connecting to database!" +
		"Perhaps check the connection string and instance status"
	)
}

types.setTypeParser(1700 /* NUMERIC */, (numericValue) => {
	return Number.parseFloat(numericValue)
})

types.setTypeParser(20 /* BIG INT (INT8) */, (bigIntValue) => {
	return Number.parseInt(bigIntValue)
})

export {
	db
}