/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        return [
            {
                source: '/api/:path*',  // Proxy endpoint in Next.js
                destination: 'https://3.128.192.121/:path*',  // Actual target URL
            },
        ];
    },
    // Add other configuration options here
};

export default nextConfig;
