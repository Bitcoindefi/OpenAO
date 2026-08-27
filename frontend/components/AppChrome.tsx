"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Home,
    Swords,
    Trophy,
    UserRound,
    ScrollText,
    LogIn,
    LogOut,
    MessageCircle,
    Hammer,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { AuthErrorResponse, AuthSession } from "@/lib/auth";
import { useGameDataAdmin } from "@/lib/editor/useGameDataAdmin";

type AppChromeProps = {
    children: React.ReactNode;
};

const navItems = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/characters", label: "Personajes", icon: UserRound },
    { href: "/arenas", label: "Arenas", icon: Swords },
    { href: "/ranking", label: "Ranking", icon: Trophy },
    { href: "/wiki/equipment", label: "Wiki", icon: ScrollText },
    {
        href: "https://discord.gg/sf8rWAvgxs",
        label: "Discord",
        icon: MessageCircle,
        external: true,
    },
];

function isActivePath(pathname: string, href: string) {
    if (href === "/") {
        return pathname === "/";
    }

    if (href === "/wiki/equipment") {
        return pathname === "/wiki" || pathname.startsWith("/wiki/");
    }

    return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppChrome({ children }: AppChromeProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [session, setSession] = useState<AuthSession | null>(null);
    // El editor de mapas es solo para administradores, asi que el enlace no se
    // muestra a cualquier cuenta con sesion: entrar solo para encontrarse con
    // una pantalla sin permiso no le sirve a nadie.
    const isGameDataAdmin = useGameDataAdmin(session !== null) === "allowed";

    useEffect(() => {
        let cancelled = false;

        fetch("/api/auth/me", { cache: "no-store" })
            .then(async (response) => {
                if (!response.ok) {
                    return null;
                }

                const result = (await response.json()) as
                    | AuthSession
                    | AuthErrorResponse;
                if ("error" in result) {
                    return null;
                }

                return result;
            })
            .then((result) => {
                if (!cancelled) {
                    setSession(result);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setSession(null);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [pathname]);

    if (pathname === "/play") {
        return <>{children}</>;
    }

    return (
        <>
            <header className="sticky top-0 z-50 border-b border-white/8 bg-[#05080d]/92 backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-300 text-sm font-black text-stone-950">
                            AO
                        </div>
                        <span className="text-3xl font-semibold tracking-wide text-stone-100">
                            AOWeb
                        </span>
                    </Link>

                    <nav className="hidden items-center gap-2 rounded-2xl border border-white/6 bg-black/20 p-1 md:flex">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const active = item.external
                                ? false
                                : isActivePath(pathname, item.href);

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    target={
                                        item.external ? "_blank" : undefined
                                    }
                                    rel={
                                        item.external ? "noreferrer" : undefined
                                    }
                                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition ${
                                        active
                                            ? "bg-amber-300/12 text-amber-300"
                                            : "text-stone-400 hover:bg-white/5 hover:text-stone-100"
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.label}
                                </Link>
                            );
                        })}
                        {isGameDataAdmin ? (
                            <Link
                                href="/construccion"
                                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition ${
                                    isActivePath(pathname, "/construccion")
                                        ? "bg-amber-300/12 text-amber-300"
                                        : "text-stone-400 hover:bg-white/5 hover:text-stone-100"
                                }`}
                            >
                                <Hammer className="h-4 w-4" />
                                Construccion
                            </Link>
                        ) : null}
                    </nav>

                    <div className="flex items-center gap-3">
                        {session ? (
                            <>
                                <span className="hidden text-sm text-stone-200 sm:inline">
                                    {session.account.name}
                                </span>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        await fetch("/api/auth/signout", {
                                            method: "POST",
                                        });
                                        setSession(null);
                                        router.push("/login");
                                        router.refresh();
                                    }}
                                    className="inline-flex items-center justify-center rounded-full p-2 text-stone-400 transition hover:bg-white/5 hover:text-stone-100"
                                    aria-label="Cerrar sesion"
                                >
                                    <LogOut className="h-4 w-4" />
                                </button>
                            </>
                        ) : (
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 rounded-xl border border-white/8 px-4 py-2 text-sm text-stone-200 transition hover:bg-white/5"
                            >
                                <LogIn className="h-4 w-4" />
                                Ingresar
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            <div className="md:hidden border-b border-white/8 bg-[#05080d]/92 px-4 py-2 backdrop-blur-xl">
                <nav className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const active = item.external
                            ? false
                            : isActivePath(pathname, item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                target={item.external ? "_blank" : undefined}
                                rel={item.external ? "noreferrer" : undefined}
                                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                                    active
                                        ? "bg-amber-300/12 text-amber-300"
                                        : "text-stone-400 hover:bg-white/5 hover:text-stone-100"
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {children}
        </>
    );
}
