import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: '2gb',
  },
  serverExternalPackages: ['fluent-ffmpeg', '@ffmpeg-installer/ffmpeg', 'pdfkit', 'docx'],
  turbopack: {
    root: '/home/jm/Documentos/PROJETO NOVO',
  },
};

export default nextConfig;
