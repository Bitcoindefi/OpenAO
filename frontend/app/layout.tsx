import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppChrome from "@/components/AppChrome";
import {
    buildPageMetadata,
    siteDescription,
    siteTitle,
    siteUrl,
} from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const viewport: import("next").Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
    themeColor: "#020617",
};

export const metadata: Metadata = {
    ...buildPageMetadata({
        title: siteTitle,
        description: siteDescription,
        path: "/",
        imagePath: "/opengraph-image",
        twitterImagePath: "/twitter-image",
    }),
    metadataBase: new URL(siteUrl),
    applicationName: "AOWeb",
    title: {
        default: siteTitle,
        template: "%s | AOWeb",
    },
    description: siteDescription,
    authors: [{ name: "Damian Catanzaro" }],
    creator: "Damian Catanzaro",
    publisher: "AOWeb",
    category: "games",
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    icons: {
        icon: "/favicon.ico",
        shortcut: "/favicon.ico",
        apple: "/static/imgs/logo-aoweb.png",
    },
    manifest: "/manifest.webmanifest",
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
        },
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es-AR">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <AppChrome>{children}</AppChrome>
            </body>
        </html>
    );
}
