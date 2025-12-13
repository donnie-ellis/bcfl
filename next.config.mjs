/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'yahoofantasysports-res.cloudinary.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'l.yimg.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 's.yimg.com',
                pathname: '/**',
            },

        ],
    },
};

export default nextConfig;
