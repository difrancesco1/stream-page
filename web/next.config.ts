import type { NextConfig } from "next";
import { vanityUrls } from "./lib/vanity-urls";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ddragon.leagueoflegends.com",
        pathname: "/cdn/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/uploads/**",
      },

      {
        protocol: "https",
        hostname: "xbxvotbjgwkwhwaqwdho.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "1000mb",
    },
  },
  async redirects() {
    return vanityUrls.map(({ source, destination, permanent }) => ({
      source,
      destination,
      permanent: permanent ?? false,
    }));
  },
};

export default nextConfig;
