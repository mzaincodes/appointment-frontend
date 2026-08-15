/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The API lives in a separate Express process; the browser calls it directly
  // using NEXT_PUBLIC_API_URL. No rewrites needed, and keeping them separate
  // makes the two-service architecture explicit.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
