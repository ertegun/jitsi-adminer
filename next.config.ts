import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Allow requests from proxy / reverse proxy / LAN in dev mode
  // Add all origins you access the dev server from
  allowedDevOrigins: [
    '192.168.20.2',
    '*.gruparge.tr',
    '*.gruparge.com',
    // add your NPM domain here, e.g. 'admin.gruparge.tr'
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
      // Trust reverse proxy origins for Server Actions
      allowedOrigins: [
        '192.168.20.2:8080',
        '*.gruparge.tr',
        '*.gruparge.com',
      ],
    },
  },
};

export default nextConfig;
