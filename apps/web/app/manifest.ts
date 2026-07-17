import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NovaOps Operations",
    short_name: "NovaOps",
    description: "Multi-outlet task, checklist, and compliance execution platform.",
    start_url: "/dashboard/tasks",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#047857",
    orientation: "portrait",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/window.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
