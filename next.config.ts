import type { NextConfig } from "next";

const isCapacitor = process.env.CAPACITOR === '1';

const nextConfig: NextConfig = {
  // Static export for Capacitor builds — the app bundles static HTML/JS/CSS
  // and calls the live Vercel API for dynamic data.
  ...(isCapacitor && { output: 'export' }),

  // Allow cross-origin requests from the Capacitor app's WebView.
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

export default nextConfig;
