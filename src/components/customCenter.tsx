import React, {Children} from "react";
import {EuiFlexGroup, EuiFlexItem} from "@elastic/eui";

interface EuiCenterProps {
	children?: React.ReactNode
	height?: string,
	width?: string
	growChildren?: boolean
}

function EuiCenter({children, height, width, growChildren}: EuiCenterProps): JSX.Element {
	const resolvedHeight = height || 'inherit';
	const resolvedWidth = width || 'inherit';

	return (
		<EuiFlexGroup
			justifyContent={"center"}
			alignItems={"center"}
			style={{
				height: resolvedHeight,
				width: resolvedWidth
			}}
		>
			{Children.map(children, (passedChild, childIndex) => {
				return (
					<EuiFlexItem
						grow={Boolean(growChildren)}
						style={{
							alignItems: "center"
						}}
					>
						{passedChild}
					</EuiFlexItem>
				)
			})}
		</EuiFlexGroup>
	)
}

export default EuiCenter;