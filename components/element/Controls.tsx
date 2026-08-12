"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border border-border bg-surface transition-colors duration-fast hover:border-brand/60 data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=indeterminate]:border-brand data-[state=indeterminate]:bg-brand disabled:opacity-50",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="text-white">
      {props.checked === "indeterminate" ? (
        <Minus className="h-3 w-3" strokeWidth={3} />
      ) : (
        <Check className="h-3 w-3" strokeWidth={3} />
      )}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = "Checkbox";

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-4 w-7 shrink-0 items-center rounded-full border border-transparent bg-foreground/[0.14] transition-colors duration-fast data-[state=checked]:bg-brand",
      className
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block h-3 w-3 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform duration-fast data-[state=checked]:translate-x-3.5" />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";

/** Bordered option row used by the configure step. */
export function OptionRow({
  checked,
  onCheckedChange,
  title,
  description,
  right,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  title: string;
  description?: string;
  right?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors duration-fast",
        checked ? "border-brand/40 bg-[rgba(70,100,220,0.04)]" : "border-border hover:bg-surface-secondary",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(Boolean(v))}
        className="mt-0.5"
        disabled={disabled}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-body font-medium text-foreground">{title}</span>
        {description && <span className="text-helper text-muted-foreground">{description}</span>}
      </span>
      {right}
    </label>
  );
}

/** Radio-style segmented control for mutually exclusive choices. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "default",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  className?: string;
  size?: "default" | "sm";
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface-secondary p-0.5",
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md font-medium transition-colors duration-fast",
              size === "sm" ? "h-6 px-2 text-helper" : "h-7 px-2.5 text-body-sm",
              active
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
