/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // 恢复构建阶段 ESLint 检查，避免问题在发布时被忽略
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
