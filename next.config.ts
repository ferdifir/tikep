import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["fluent-ffmpeg", "@ffprobe-installer/ffprobe", "@ffprobe-installer/linux-x64"],
  allowedDevOrigins: ['b032-157-15-45-107.ngrok-free.app'],
  experimental: {
    proxyClientMaxBodySize: '100mb',
  },
};

export default nextConfig;
