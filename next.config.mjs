/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverActions: {
            allowedOrigins: [
                'localhost:3000',
                '0p0488sb-3000.use.devtunnels.ms',
                'bcfl.dmellis.com',
            ]
        }
    }
};

export default nextConfig;
