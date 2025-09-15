import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  sassOptions: {
    includePaths: ['./src']
  }
}

export default nextConfig
