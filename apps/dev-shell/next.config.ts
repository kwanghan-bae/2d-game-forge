import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  typedRoutes: false,
  transpilePackages: ['@forge/core'],
};

export default config;
