import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/sandbox-api/:path*',
        destination: 'https://merchant-sandbox-9qc2.onrender.com/api/:path*',
      },
    ];
  },
};
export default nextConfig;
