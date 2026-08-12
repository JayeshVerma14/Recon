"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export function Separator({
  orientation = "horizontal",
  className,
}: {
  orientation?: "horizontal" | "vertical";
  className?: string;
}) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className
      )}
    />
  );
}

const AVATAR_TINTS = [
  { bg: "rgba(70,100,220,0.12)", fg: "#2F45A8" },
  { bg: "rgba(6,182,212,0.14)", fg: "#0E7490" },
  { bg: "rgba(139,92,246,0.12)", fg: "#6D28D9" },
  { bg: "rgba(245,158,11,0.14)", fg: "#B45309" },
  { bg: "rgba(23,152,100,0.12)", fg: "#0F7048" },
];

export function Avatar({
  name,
  size = "default",
  className,
}: {
  name: string;
  size?: "xs" | "sm" | "default";
  className?: string;
}) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const tint = AVATAR_TINTS[name.charCodeAt(0) % AVATAR_TINTS.length];

  return (
    <span
      title={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium",
        size === "xs" && "h-5 w-5 text-[9px]",
        size === "sm" && "h-6 w-6 text-meta",
        size === "default" && "h-8 w-8 text-helper",
        className
      )}
      style={{ background: tint.bg, color: tint.fg }}
    >
      {initials}
    </span>
  );
}

/** Stacked avatars for reviewer lists. */
export function AvatarStack({ names, max = 3 }: { names: string[]; max?: number }) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return (
    <span className="flex items-center">
      {shown.map((name, i) => (
        <Avatar
          key={name}
          name={name}
          size="sm"
          className={cn("ring-2 ring-surface", i > 0 && "-ml-1.5")}
        />
      ))}
      {rest > 0 && (
        <span className="-ml-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface-secondary text-meta text-muted-foreground ring-2 ring-surface">
          +{rest}
        </span>
      )}
    </span>
  );
}

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-body-sm">
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          {i > 0 && <span className="text-muted-foreground/60">/</span>}
          {item.href ? (
            <a
              href={item.href}
              className="text-muted-foreground transition-colors duration-fast hover:text-foreground"
            >
              {item.label}
            </a>
          ) : (
            <span className="font-medium text-foreground">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

/** Icon tile — h-9 w-9 rounded-lg, brand at 10%. */
export function IconTile({
  children,
  className,
  tint = "#4664DC",
  size = "default",
}: {
  children: React.ReactNode;
  className?: string;
  tint?: string;
  size?: "sm" | "default" | "lg";
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        size === "sm" && "h-7 w-7 rounded-md [&_svg]:size-3.5",
        size === "default" && "h-9 w-9 rounded-lg [&_svg]:size-4",
        size === "lg" && "h-14 w-14 rounded-xl [&_svg]:size-6",
        className
      )}
      style={{ background: `${tint}1A`, color: tint }}
    >
      {children}
    </span>
  );
}
