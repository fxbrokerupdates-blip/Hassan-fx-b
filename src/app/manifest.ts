import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FX Broker Updates",
    short_name: "FX Updates",
    description: "Global broker news, trading updates and free daily content tools.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#031222",
    theme_color: "#06182D",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
