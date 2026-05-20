"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function SelectNative({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={cn(
          "w-full appearance-none pl-3 pr-8 py-2 rounded-xl border border-border/50 bg-background",
          "text-sm text-foreground focus:outline-none focus:border-primary transition-colors cursor-pointer",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className,
        )}
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
      />
    </div>
  );
}
