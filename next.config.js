/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allows Canvas pixel reads on uploaded data URIs to work correctly
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
