import {
	EuiBasicTable,
	EuiBasicTableColumn,
	EuiFlexGroup,
	EuiFlexItem,
	EuiHorizontalRule,
	EuiPanel,
	EuiText
} from "@elastic/eui";
import {FundraiserPageProps} from "@/pages/fundraisers/[fundraiserId]";
import {FundraiserDonation} from "@/types/apiResponses";

export type FundraiserDonationTableProps = Pick<FundraiserPageProps, "fundraiserDonations" | "fundraiserToken">

function FundraiserDonationTable(props: FundraiserDonationTableProps) {
	const {fundraiserDonations, fundraiserToken} = props

	const columns: Array<EuiBasicTableColumn<FundraiserDonation>> = [
		{
			field: "donorAddress",
			name: "Donor Address",
			mobileOptions: {
				render: (donations: FundraiserDonation) => <span>{donations.donorAddress}</span>,
				header: false,
				truncateText: false,
			},
		},
		{
			field: "donatedAmount",
			name: "Donated Amount",
			mobileOptions: {
				render: (donations: FundraiserDonation) => <span>{donations.donatedAmount} {fundraiserToken}</span>,
				truncateText: false
			},
		},
		{
			field: "transactionHash",
			name: "Transaction Hash",
			mobileOptions: {
				render: (donations: FundraiserDonation) => <span>{donations.transactionHash}</span>,
				truncateText: false
			},
		},
		{
			field: "donationTimestamp",
			name: "Donation Timestamp",
			dataType: "date",
			mobileOptions: {
				render: (donations: FundraiserDonation) => <span>{donations.donationTimestamp}</span>,
				truncateText: false
			},
		},
	];

	return (
		<EuiPanel style={{minWidth: "90vw"}}>
			<EuiFlexGroup
				direction={"column"}
				gutterSize={"s"}
			>
				<EuiFlexItem>
					<EuiText>
						<h2>Recent Donations</h2>
					</EuiText>
				</EuiFlexItem>
				<EuiHorizontalRule margin={"xs"}/>
				<EuiFlexItem>
					<EuiBasicTable
						tableCaption={"Donations Table"}
						tableLayout={"auto"}
						items={fundraiserDonations}
						rowHeader="donorAddress"
						columns={columns}
					/>
				</EuiFlexItem>
			</EuiFlexGroup>
		</EuiPanel>
	)
}

export {
	FundraiserDonationTable
}