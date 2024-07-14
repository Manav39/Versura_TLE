import web3 from "web3"

const web3Client = new web3(
	new web3.providers.HttpProvider(
		`https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`
	)
)

const {eth: web3Eth} = web3Client

const versuraAccount = web3Eth.accounts.privateKeyToAccount(
	process.env.VERSURA_ACCOUNT_PRIVATE_KEY!,
)

web3Eth.accounts.wallet.add(
	versuraAccount
)

const {address} = versuraAccount

web3Eth.defaultAccount = address

export {
	web3Client,
	web3Eth,
	address as versuraAddress,
	versuraAccount
}