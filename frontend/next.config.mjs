/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // If no variable is found (Local), it uses 127.0.0.1. 
    // On Railway, you will set BACKEND_INTERNAL_URL in the dashboard.
    const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8000';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    // Defaults to localhost for your computer
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  },
};

export default nextConfig;