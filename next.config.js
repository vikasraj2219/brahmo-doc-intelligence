/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow large file uploads
  api: {
    bodyParser: false,
  },
  experimental: {
    serverComponentsExternalPackages: ["mammoth", "pdf-parse"],
  },
};

module.exports = nextConfig;
