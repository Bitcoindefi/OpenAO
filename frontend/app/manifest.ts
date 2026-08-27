import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OpenAO - Argentum Online Web",
    short_name: "OpenAO",
    description: "Argentum Online clásico en el navegador y móviles",
    start_url: "/play",
    display: "fullscreen",
    orientation: "landscape",
    background_color: "#020617",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon"
      }
    ]
  };
}
