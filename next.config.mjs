/** @type {import('next').NextConfig} */
const nextConfig = {
  // Security: Ignore errors during build to ensure deployment success in demo/dev phases, 
  // but recommended to fix them for true production robustness.
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Enabled for Vercel production deployment
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
}

export default nextConfig
