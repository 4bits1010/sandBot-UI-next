/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // Fix the assetPrefix to include a leading slash
  assetPrefix: '/',
  // Add this for static export compatibility with fonts
  webpack: (config) => {
    return config;
  },
}

module.exports = nextConfig
