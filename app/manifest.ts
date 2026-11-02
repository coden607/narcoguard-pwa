import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NarcoGuard - NG Overdose Prevention System",
    short_name: "NarcoGuard",
    description: "Overdose-response wearable concept demo with naloxone guidance and everyday needs planning. Not a medical device.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0f1e",
    theme_color: "#00d9ff",
    categories: ["health", "medical", "utilities"],
    icons: [
      {
        src: "/icon-192.png?v=9",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png?v=9",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png?v=9",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // Long-press shortcuts on the installed icon (issue #267). Emergency opens the step-by-step
    // overdose guide, which has Call 911 on every screen and works offline once opened.
    shortcuts: [
      { name: "Emergency: overdose steps and Call 911", short_name: "Emergency", url: "/ar", icons: [{ src: "/icon-192.png?v=9", sizes: "192x192", type: "image/png" }] },
      { name: "Find naloxone and help nearby", short_name: "Find naloxone", url: "/help", icons: [{ src: "/icon-192.png?v=9", sizes: "192x192", type: "image/png" }] },
      { name: "Calm: breathing and sounds", short_name: "Calm", url: "/calm", icons: [{ src: "/icon-192.png?v=9", sizes: "192x192", type: "image/png" }] },
    ],
  };
}
