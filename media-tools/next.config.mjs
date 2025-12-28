/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['fluent-ffmpeg'],
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
