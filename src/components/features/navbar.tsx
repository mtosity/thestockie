"use client";

import {
  Home,
  BookOpen,
  Filter,
  CalendarDays,
  ArrowLeftRight,
  Globe,
  LogIn,
  LogOut,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "~/lib/utils";
import { MarketIndices } from "~/components/features/market-indices";
import { Search } from "~/components/features/search";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

const primaryLinks = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/macro", icon: Globe, label: "Macro" },
  { href: "/screener", icon: Filter, label: "Screener" },
] as const;

const secondaryLinks = [
  { href: "/earnings", icon: CalendarDays, label: "Earnings" },
  { href: "/compare", icon: ArrowLeftRight, label: "Compare" },
  { href: "/blogs", icon: BookOpen, label: "Blog" },
] as const;

const allLinks = [...primaryLinks, ...secondaryLinks];

const PAGE_TITLES: Record<string, string> = {
  "/blogs": "Blog",
  "/screener": "Screener",
  "/earnings": "Earnings Calendar",
  "/compare": "Stock Comparison",
  "/macro": "Macro Overview",
};

function getPageTitle(pathname: string): string | null {
  if (pathname === "/") return null;
  for (const [prefix, title] of Object.entries(PAGE_TITLES)) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return title;
  }
  return null;
}

function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function NavLink({
  href,
  icon: Icon,
  label,
  pathname,
  compact = false,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  pathname: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-2 text-sm font-medium transition-colors lg:px-3",
        isActive(href, pathname)
          ? "bg-white/10 text-white"
          : "text-gray-300 hover:bg-white/10 hover:text-white",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!compact && <span className="hidden lg:inline">{label}</span>}
    </Link>
  );
}

function MoreMenu({ pathname }: { pathname: string }) {
  const anySecondaryActive = secondaryLinks.some((l) =>
    isActive(l.href, pathname),
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-2 text-sm font-medium transition-colors lg:px-3",
            anySecondaryActive
              ? "bg-white/10 text-white"
              : "text-gray-300 hover:bg-white/10 hover:text-white",
          )}
        >
          <MoreHorizontal className="h-4 w-4 shrink-0" />
          <span className="hidden lg:inline">More</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-44 border-[#424975] bg-[#1e1f36]"
      >
        {secondaryLinks.map(({ href, icon: Icon, label }) => (
          <DropdownMenuItem key={href} asChild>
            <Link
              href={href}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm",
                isActive(href, pathname)
                  ? "bg-white/10 text-white"
                  : "text-gray-300 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileMoreMenu({ pathname }: { pathname: string }) {
  const anySecondaryActive = secondaryLinks.some((l) =>
    isActive(l.href, pathname),
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
            anySecondaryActive
              ? "bg-white/10 text-white"
              : "text-gray-300 hover:bg-white/10 hover:text-white",
          )}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
          More
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        side="top"
        sideOffset={8}
        className="w-44 border-[#424975] bg-[#1e1f36]"
      >
        {secondaryLinks.map(({ href, icon: Icon, label }) => (
          <DropdownMenuItem key={href} asChild>
            <Link
              href={href}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm",
                isActive(href, pathname)
                  ? "bg-white/10 text-white"
                  : "text-gray-300 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#15162c]/95 px-2 py-3 backdrop-blur-sm">
      {/* Row 1: Left (market indices) | Center (search, home only) | Right (nav links + auth) */}
      <div className="flex items-center">
        {/* Left: Market Indices - only on xl screens */}
        <div className="flex flex-1 items-center">
          <div className="hidden shrink-0 pl-2 xl:block">
            <MarketIndices />
          </div>
        </div>

        {/* Center: Search on home, page title elsewhere */}
        {pathname === "/" ? (
          <div className="w-full max-w-xs shrink-0 md:max-w-[240px] lg:max-w-xs">
            <Search />
          </div>
        ) : (
          <h1 className="shrink-0 text-base font-semibold text-white">
            {getPageTitle(pathname)}
          </h1>
        )}

        {/* Right: Primary nav links + More dropdown + Auth */}
        <div className="flex flex-1 items-center justify-end gap-2">
          {/* Desktop nav: primary links + More dropdown */}
          <div className="hidden shrink-0 items-center gap-0.5 md:flex">
            {primaryLinks.map((link) => (
              <NavLink key={link.href} {...link} pathname={pathname} />
            ))}
            <MoreMenu pathname={pathname} />
          </div>

          {/* Auth button */}
          <Link
            href={session ? "/api/auth/signout" : "/api/auth/signin"}
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-purple-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600"
          >
            {session ? (
              <LogOut className="h-4 w-4" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            <span className="hidden lg:inline">
              {session ? "Sign out" : "Sign in"}
            </span>
          </Link>
        </div>
      </div>

      {/* Row 2: Mobile nav — primary links + More dropdown */}
      <div className="mt-2 flex items-center justify-center gap-1 md:hidden">
        {primaryLinks.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
              isActive(href, pathname)
                ? "bg-white/10 text-white"
                : "text-gray-300 hover:bg-white/10 hover:text-white",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        ))}
        <MobileMoreMenu pathname={pathname} />
      </div>
    </nav>
  );
}
