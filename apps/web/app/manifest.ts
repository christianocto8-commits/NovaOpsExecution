import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/dashboard/tasks",
    name: "NovaOps Operations",
    short_name: "NovaOps",
    description: "Multi-outlet task, checklist, and compliance execution platform.",
    start_url: "/dashboard/tasks",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#ffffff",
    theme_color: "#047857",
    orientation: "portrait",
    categories: ["business", "productivity"],
    shortcuts: [
      {
        name: "Tasks",
        short_name: "Tasks",
        url: "/dashboard/tasks",
        description: "View and complete outlet tasks",
      },
      {
        name: "Forms",
        short_name: "Forms",
        url: "/dashboard/forms",
        description: "Browse form templates",
      },
      {
        name: "CAPA",
        short_name: "CAPA",
        url: "/dashboard/corrective-actions",
        description: "Corrective actions queue",
      },
      {
        name: "Evidence",
        short_name: "Evidence",
        url: "/dashboard/evidence",
        description: "Review submitted photo evidence",
      },
    ],
    icons: [
      {
        src: "/novaops-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/novaops-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/novaops-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/novaops-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
