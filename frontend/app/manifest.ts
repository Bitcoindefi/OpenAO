import type { MetadataRoute } from "next";
import { siteDescription, siteName } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: siteName,
        short_name: siteName,
        description: siteDescription,
        start_url: "/",
        display: "standalone",
        orientation: "landscape",
        background_color: "#08111f",
        theme_color: "#08111f",
        lang: "es-AR",
        categories: ["games", "entertainment"],
        icons: [
            {
                src: "/favicon.ico",
                sizes: "any",
                type: "image/x-icon",
            },
            {
                src: "/static/imgs/logo-aoweb.png",
                sizes: "512x512",
                type: "image/png",
            },
        ],
    };
}
