import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static optimization for pages without dynamic data
  output: 'standalone',

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

  // Turbopack configuration (replaces webpack)
  turbopack: {},

  // Experimental features for performance
  experimental: {
    // Optimize package imports for faster builds and smaller bundles
    optimizePackageImports: [
      'lucide-react',
      '@supabase/supabase-js',
    ],
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
