/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // 在构建过程中忽略ESLint错误，只关注TypeScript和构建本身
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
