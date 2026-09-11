import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@electric-sql/pglite', 'postgres'],
  transpilePackages: ['three'],
};

export default nextConfig;
