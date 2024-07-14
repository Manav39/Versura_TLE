import {Head, Html, Main, NextScript} from 'next/document'

export default function Document() {
	return (
		<Html lang="en">
			<Head/>
			<body style={{
				minWidth: "100vw",
				minHeight: "100vh"
			}}>
			<Main/>
			<NextScript/>
			</body>
		</Html>
	)
}
