import type { NextConfig } from "next";

// Endereços extras liberados no `next dev` (ex.: IP ou nome do servidor de casa, acessado de outro
// computador). Sem isso o dev server bloqueia os próprios scripts e a página fica sem JavaScript.
// Só o hostname, separado por vírgula: DEV_ORIGINS=192.168.0.10,homeserver
const devOrigins = (process.env.DEV_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins: devOrigins,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
