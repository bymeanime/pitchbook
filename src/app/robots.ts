import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/api/seed", "/api/seed/enrich"],
      },
    ],
    sitemap: "https://pitchbook-eta.vercel.app/sitemap.xml",
  };
}
