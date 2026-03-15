/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ['theleadershipwell.online'] }
  }
}

module.exports = nextConfig
