import type { NextConfig } from "next";

const isCapacitor = process.env.CAPACITOR === '1';

const nextConfig: NextConfig = {
  // Static export for Capacitor builds — the app bundles static HTML/JS/CSS
  // and calls the live Vercel API for dynamic data.
  ...(isCapacitor && { output: 'export' }),

  // Allow the dev server to be used from phones on the local network
  // (e.g. for testing at http://192.168.x.x:PORT from a phone's
  // browser). Next.js 16+ blocks HMR requests from non-localhost
  // origins by default as a safety measure, which leaves the page
  // stuck on the JS bundle's initial spinner. This list is only
  // respected in `next dev`; production builds are unaffected.
  allowedDevOrigins: [
    '192.168.0.21',
    '192.168.1.21',
    '192.168.0.*',
    '192.168.1.*',
    '10.0.0.*',
    '10.0.1.*',
  ],

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
