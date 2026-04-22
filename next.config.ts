import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },

  // Compression for smaller transfer sizes
  compress: true,

  // Allow browser preview proxy for development testing
  allowedDevOrigins: ['127.0.0.1', 'localhost'],

  // Turbopack configuration (replaces webpack)
  turbopack: {},

  // Experimental features for performance
  experimental: {
    // Optimize package imports for faster builds and smaller bundles
    optimizePackageImports: [
      'lucide-react',
      '@supabase/supabase-js',
    ],
    // Allow browser preview proxy for Server Actions
    // Note: Browser preview uses dynamic ports, so we need to allow the exact origin
    serverActions: {
      allowedOrigins: ['localhost:3000', '127.0.0.1:51841', '127.0.0.1:*', '*'],
    },
  },

  // Headers for caching and security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
      {
        // Cache static assets with revalidation support
        source: '/:path*.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, must-revalidate',
          },
        ],
      },
      {
        source: '/:path*.css',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, must-revalidate',
          },
        ],
      },
    ];
  },

};

export default nextConfig;
