import { fileURLToPath } from 'url';
import { dirname } from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  agentRules: false,
  devIndicators: false,
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
};

export default nextConfig;
