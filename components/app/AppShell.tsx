"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Boxes,
  BriefcaseBusiness,
  ChevronDown,
  Database,
  FileText,
  LayoutGrid,
  MessageSquare,
  PanelLeft,
  Plus,
  Search,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { CURRENT_USER } from "@/lib/mock";

const WORKSPACE_NAV = [
  { href: "/new", label: "New Chat", icon: Plus },
  { href: "/", label: "Agents", icon: BriefcaseBusiness },
  { href: "/learniq", label: "LearnIQ", icon: FileText },
  { href: "/vault", label: "Vault", icon: Database },
  { href: "/my-work", label: "My Work", icon: LayoutGrid },
];

const RECENT = [
  { label: "Income Statement Variance …", icon: MessageSquare, href: "/" },
  { label: "Financial Spreading", icon: BriefcaseBusiness, href: "/" },
  { label: "Financial Spreading", icon: BriefcaseBusiness, href: "/" },
  { label: "Test Hitman Agent", icon: BriefcaseBusiness, href: "/" },
  { label: "Covenant Monitoring", icon: BriefcaseBusiness, href: "/" },
];

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg bg-brand-cta text-body-lg font-semibold text-white",
        className
      )}
      aria-label="elimentary"
    >
      <Boxes className="h-5 w-5" strokeWidth={2.2} />
    </span>
  );
}

export function AppShell({
  children,
  fill = false,
}: {
  children: React.ReactNode;
  /** Page manages its own scrolling and must not grow past the viewport. */
  fill?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);
  const [recentOpen, setRecentOpen] = React.useState(true);

  return (
    <div className={cn("flex bg-surface", fill ? "h-screen overflow-hidden" : "min-h-screen")}>
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-standard lg:flex",
          collapsed ? "w-[72px]" : "w-[276px]"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <Logo />
          {!collapsed && (
            <button
              type="button"
              aria-label="Collapse sidebar"
              onClick={() => setCollapsed(true)}
              className="rounded-md p-1.5 text-muted-foreground transition-colors duration-fast hover:bg-surface-secondary hover:text-foreground"
            >
              <PanelLeft className="h-4.5 w-4.5" />
            </button>
          )}
        </div>

        {collapsed ? (
          <button
            type="button"
            aria-label="Expand sidebar"
            onClick={() => setCollapsed(false)}
            className="mx-auto mb-3 rounded-md p-1.5 text-muted-foreground transition-colors duration-fast hover:bg-surface-secondary hover:text-foreground"
          >
            <PanelLeft className="h-4.5 w-4.5" />
          </button>
        ) : (
          <div className="px-4 pb-4">
            <button
              type="button"
              className="flex h-11 w-full items-center gap-2.5 rounded-xl border border-border bg-surface px-3 text-left transition-colors duration-fast hover:border-brand/40"
            >
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-body text-muted-foreground">Search</span>
              <kbd className="ml-auto rounded border border-border bg-surface-secondary px-1.5 py-0.5 font-mono text-meta text-muted-foreground">
                ⌘K
              </kbd>
            </button>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3">
          {!collapsed && <GroupLabel>Workspace</GroupLabel>}
          <div className="mb-6 flex flex-col gap-0.5">
            {WORKSPACE_NAV.map((item) => (
              <NavItem
                key={item.label}
                {...item}
                collapsed={collapsed}
                active={item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)}
              />
            ))}
          </div>

          {!collapsed && (
            <>
              <button
                type="button"
                onClick={() => setRecentOpen((o) => !o)}
                className="flex w-full items-center px-3 pb-1.5"
              >
                <GroupLabel asChild>Recent</GroupLabel>
                <ChevronDown
                  className={cn(
                    "ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform duration-fast",
                    !recentOpen && "-rotate-90"
                  )}
                />
              </button>
              {recentOpen && (
                <div className="flex flex-col gap-0.5">
                  {RECENT.map((item, i) => (
                    <NavItem key={`${item.label}-${i}`} {...item} collapsed={false} active={false} muted />
                  ))}
                </div>
              )}
            </>
          )}
        </nav>

        <button
          type="button"
          onClick={() => router.push("/")}
          className={cn(
            "m-3 flex items-center gap-2.5 rounded-xl p-2 text-left transition-colors duration-fast hover:bg-surface-secondary",
            collapsed && "justify-center"
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-helper font-semibold text-white">
            JP
          </span>
          {!collapsed && (
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-body font-semibold text-foreground">Jessica P</span>
              <span className="text-helper text-muted-foreground">User</span>
            </span>
          )}
        </button>
      </aside>

      <div className={cn("flex min-w-0 flex-1 flex-col", fill && "min-h-0 overflow-hidden")}>
        {children}
      </div>
    </div>
  );
}

function GroupLabel({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  const className = "text-meta font-semibold uppercase tracking-[0.12em] text-muted-foreground";
  if (asChild) return <span className={className}>{children}</span>;
  return <div className={cn(className, "px-3 pb-1.5")}>{children}</div>;
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  muted,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  collapsed: boolean;
  muted?: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-10 items-center gap-3 rounded-lg px-3 transition-colors duration-fast",
        collapsed && "justify-center px-0",
        active
          ? "bg-[rgba(70,100,220,0.10)] font-medium text-[#2F45A8]"
          : "text-foreground hover:bg-surface-secondary",
        muted && "text-muted-foreground"
      )}
    >
      <Icon className={cn("h-4.5 w-4.5 shrink-0", !active && "text-muted-foreground")} aria-hidden />
      {!collapsed && <span className="truncate text-body">{label}</span>}
    </Link>
  );
}

/** Breadcrumb + description band at the top of an agent surface. */
export function AgentHeader({
  parent,
  parentHref = "/",
  title,
  description,
}: {
  parent: string;
  parentHref?: string;
  title: string;
  description: string;
}) {
  return (
    <header className="shrink-0 border-b border-border bg-surface px-6 py-4 lg:px-8">
      <div className="flex items-center gap-2 text-body-lg">
        <Link
          href={parentHref}
          className="flex items-center gap-2 text-muted-foreground transition-colors duration-fast hover:text-foreground"
        >
          <span aria-hidden>←</span>
          {parent}
        </Link>
        <span className="text-muted-foreground/50">›</span>
        <h1 className="font-semibold tracking-tight text-foreground">{title}</h1>
      </div>
      <p className="mt-1.5 max-w-[110ch] text-body text-muted-foreground">{description}</p>
    </header>
  );
}
