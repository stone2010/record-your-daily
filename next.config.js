/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  basePath: '/record-your-daily',
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
