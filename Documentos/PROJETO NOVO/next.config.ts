import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: '2gb',
  },
  turbopack: {
    root: '/home/jm/Documentos/PROJETO NOVO',
  },
};

export default nextConfig;
