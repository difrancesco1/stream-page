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
        hostname: "cdn.roziggz.com",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "media.roziggz.com",
      },
      // Kept so media not yet migrated to the CDN still renders.
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    // The optimizer cache on Railway is ephemeral, so a short TTL means
    // repeatedly re-fetching originals after every expiry or redeploy.
    minimumCacheTTL: 2678400,
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
