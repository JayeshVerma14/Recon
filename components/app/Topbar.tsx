"use client";

import * as React from "react";
import { Bell, ChevronDown, Settings } from "lucide-react";

import { cn } from "@/lib/utils";
import { CURRENT_USER, NOW, USERS } from "@/lib/mock";
import { relativeTime } from "@/lib/derive";
import {
  Avatar,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  SearchInput,
  StatusDot,
} from "@/components/element";

const NOTIFICATIONS = [
  {
    title: "Priya Raman approved 6 items",
    detail: "Acme Corp FY2024 · Balance Sheet",
    at: "2026-08-11T07:41:00.000Z",
    tone: "success" as const,
  },
  {
    title: "3 items returned to Needs Review",
    detail: "Acme Corp FY2024 · Income Statement",
    at: "2026-08-11T06:58:00.000Z",
    tone: "warning" as const,
  },
  {
    title: "Northwind Q2 extraction finished",
    detail: "48 accounts mapped across 2 statements",
    at: "2026-08-10T16:30:00.000Z",
    tone: "fyi" as const,
  },
];

export function Topbar({
  left,
  right,
  className,
}: {
  left?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-topbar shrink-0 items-center gap-3 border-b border-border bg-surface/85 px-4 backdrop-blur-md lg:px-6",
        className
      )}
    >
      {left}
      <div className="ml-auto flex items-center gap-2">{right}</div>
    </header>
  );
}

export function GlobalActions({ showSearch = true }: { showSearch?: boolean }) {
  return (
    <>
      {showSearch && (
        <SearchInput
          placeholder="Search projects, accounts, documents"
          aria-label="Search"
          wrapperClassName="hidden md:block w-[260px]"
        />
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
            <Bell />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[320px] p-0">
          <div className="border-b border-border-subtle px-3 py-2">
            <p className="text-body-sm font-medium">Notifications</p>
          </div>
          <div className="flex flex-col p-1">
            {NOTIFICATIONS.map((n) => (
              <div key={n.title} className="flex gap-2 rounded-md p-2 hover:bg-surface-secondary">
                <StatusDot severity={n.tone} className="mt-1.5" />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="text-body-sm">{n.title}</p>
                  <p className="text-helper text-muted-foreground">{n.detail}</p>
                  <p className="text-meta text-muted-foreground/80">{relativeTime(n.at, NOW)}</p>
                </div>
              </div>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md p-1 transition-colors duration-fast hover:bg-surface-secondary"
          >
            <Avatar name={CURRENT_USER} size="sm" />
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[240px]">
          <div className="flex items-center gap-2 px-2 py-2">
            <Avatar name={CURRENT_USER} />
            <div className="flex flex-col">
              <span className="text-body-sm font-medium">{CURRENT_USER}</span>
              <span className="text-helper text-muted-foreground">Senior Analyst · Acme Corp</span>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Switch reviewer</DropdownMenuLabel>
          {USERS.filter((u) => u.name !== CURRENT_USER).map((user) => (
            <DropdownMenuItem key={user.name}>
              <Avatar name={user.name} size="xs" />
              {user.name}
              <span className="ml-auto text-meta text-muted-foreground">{user.role}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Settings />
            Workspace settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
