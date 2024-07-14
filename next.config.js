/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: `${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_S3_REGION}.amazonaws.com`
			},
			{
				protocol: "https",
				hostname: "gravatar.com"
			}
		],
		dangerouslyAllowSVG: true
	}
}

module.exports = nextConfig
