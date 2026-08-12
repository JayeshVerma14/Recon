"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-[background-color,color,border-color,opacity] duration-fast ease-out disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        brand: "btn-brand border-0",
        brandOutline: "btn-brand-outline",
        brandSoft: "btn-brand-soft border-0",
        default: "bg-foreground text-background hover:bg-foreground/90",
        outline: "border border-border bg-surface text-foreground hover:bg-surface-secondary",
        secondary: "bg-surface-secondary text-foreground hover:bg-foreground/[0.07]",
        ghost: "text-muted-foreground hover:bg-surface-secondary hover:text-foreground",
        destructive: "bg-critical text-white hover:opacity-90",
        destructiveSoft:
          "bg-[rgba(220,38,38,0.10)] text-[#B91C1C] hover:bg-[rgba(220,38,38,0.16)]",
        successSoft: "bg-[rgba(23,152,100,0.10)] text-[#0F7048] hover:bg-[rgba(23,152,100,0.16)]",
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        xs: "h-7 px-2 text-helper [&_svg]:size-3.5",
        sm: "h-8 px-2.5 text-body-sm",
        default: "h-9 px-3 text-body",
        lg: "h-10 px-4 text-body",
        icon: "h-9 w-9 px-0",
        iconSm: "h-8 w-8 px-0 [&_svg]:size-3.5",
        iconXs: "h-7 w-7 px-0 [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "outline", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : (type ?? "button")}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
