import {
	CustomApiRequest,
	CustomApiResponse,
	requireAdminUser,
	requireAuthenticatedUser,
	requireBodyParams,
	requireBodyValidators,
	requireMethods,
	requireMiddlewareChecks,
	requireQueryParams,
	requireQueryParamValidators,
	requireValidBody
} from "@/utils/customMiddleware";
import {AdminUpdateWithdrawalBody, AdminUpdateWithdrawalParams} from "@/types/apiRequests";
import {IN_ARR} from "@/utils/validatorUtils";
import {WithdrawalStatus} from "@/types/apiTypedefs";
import {db} from "@/utils/db";
import {FundraiserWithdrawalRequests} from "@/types/queryTypedefs";
import {versuraAccount, versuraAddress, web3Client, web3Eth} from "@/utils/web3Provider";
import {calculateServiceFeeWeiForAmount, gasAmountMap} from "@/utils/common";


export default async function updateWithdrawalStatus(req: CustomApiRequest<AdminUpdateWithdrawalBody, AdminUpdateWithdrawalParams>, res: CustomApiResponse) {
	const dbClient = await db.connect()

	const middlewareStatus = await requireMiddlewareChecks(
		req,
		res,
		{
			[requireMethods.name]: requireMethods("POST"),
			[requireAuthenticatedUser.name]: requireAuthenticatedUser(),
			[requireAdminUser.name]: requireAdminUser(),
			[requireQueryParams.name]: requireQueryParams(
				"withdrawalId"
			),
			[requireQueryParamValidators.name]: requireQueryParamValidators({
				withdrawalId: async (withdrawalId) => {
					const {rows} = await dbClient.query(
						`SELECT 1
						 FROM "fundraiserWithdrawalRequests"
						 WHERE "requestId" = $1
						   AND "requestStatus" = 'OPEN'`,
						[withdrawalId]
					)

					if (rows.length) {
						return true
					}

					return false
				}
			}),
			[requireValidBody.name]: requireValidBody(),
			[requireBodyParams.name]: requireBodyParams(
				"withdrawalStatus"
			),
			[requireBodyValidators.name]: requireBodyValidators({
				withdrawalStatus: IN_ARR(["OPEN", "APPROVED", "REJECTED"] satisfies WithdrawalStatus[])
			})
		}
	)

	if (!middlewareStatus) {
		dbClient.release()
		return
	}

	try {
		const {withdrawalId} = req.query
		const {withdrawalStatus} = req.body

		const {rows: dbRows} = await dbClient.query<FundraiserWithdrawalRequests>(
			`SELECT *
			 FROM "fundraiserWithdrawalRequests"
			 WHERE "requestId" = $1`,
			[withdrawalId]
		)

		const selectedRequest = dbRows[0]
		const {
			walletAddress,
			withdrawalAmount,
			withdrawalToken,
			targetFundraiser: fundraiserId
		} = selectedRequest

		switch (withdrawalStatus) {
			case "APPROVED": {
				const currentWalletBalance = await web3Eth.getBalance(
					web3Eth.defaultAccount!
				)
				const parsedBalanceWei = Number.parseInt(currentWalletBalance)
				const parsedBalanceEth = parsedBalanceWei * 1e-18

				const calculatedServiceFeeWei = calculateServiceFeeWeiForAmount(
					withdrawalAmount,
					withdrawalToken
				)

				const calculatedServiceFeeEth = calculatedServiceFeeWei * 1e-18

				const outgoingAmountEth = withdrawalAmount
				const outgoingAmountWei = outgoingAmountEth * 1e18

				// @ts-ignore
				const gasFee = gasAmountMap[withdrawalToken]

				if (parsedBalanceEth <= outgoingAmountEth) {
					dbClient.release()
					console.error(
						`ERROR: Holding account address may have run out of funds!`
					)
					res.status(500).json({
						requestStatus: "ERR_INTERNAL_ERROR"
					})
					return
				}

				const signedTransaction = await versuraAccount.signTransaction({
					from: versuraAddress,
					to: walletAddress,
					value: outgoingAmountWei,
					gas: web3Client.utils.fromWei(gasFee.toString(), "gwei")
				})

				web3Eth.sendSignedTransaction(signedTransaction.rawTransaction!)

				await dbClient.query(
					`UPDATE "fundraiserWithdrawalRequests"
					 SET "requestStatus" = 'APPROVED'
					 WHERE "requestId" = $1
					   AND "targetFundraiser" = $2`,
					[withdrawalId, fundraiserId]
				)

				await dbClient.query(
					`UPDATE "fundRaisers"
					 SET "fundraiserWithdrawnAmount" = "fundraiserWithdrawnAmount" + $1
					 WHERE "fundraiserId" = $2`,
					[outgoingAmountEth, fundraiserId]
				)

				dbClient.release()
				res.status(200).json({
					requestStatus: "SUCCESS"
				})
				return
			}
			case "REJECTED": {
				await dbClient.query(
					`UPDATE "fundraiserWithdrawalRequests"
					 SET "requestStatus" = 'REJECTED'
					 WHERE "requestId" = $1
					   AND "targetFundraiser" = $2`,
					[withdrawalId, fundraiserId]
				)

				res.status(200).json({
					requestStatus: "SUCCESS"
				})

				dbClient.release()
				return
			}
			default: {
				dbClient.release()
				return
			}
		}
	} catch (err) {
		console.error(err)
		dbClient.release()
		res.status(500).json({
			requestStatus: "ERR_INTERNAL_ERROR"
		})
	}
}