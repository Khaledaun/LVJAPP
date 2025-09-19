/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'standalone',
  reactStrictMode: true,
  // ESLint is not installed in this build; don't block builds if someone adds it back
  eslint: { ignoreDuringBuilds: true },
  // Keep TS checks (we pinned a safe TS version)
  typescript: { ignoreBuildErrors: false },
  experimental: { typedRoutes: false }
};
module.exports = nextConfig;
