import React from "react";
import { cn } from "@/lib/utils";

interface DesignerIconProps {
  icon: any;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function DesignerIcon({ icon: Icon, className, size = "md" }: DesignerIconProps) {
  const sizeClasses = {
    sm: "w-10 h-10 rounded-xl",
    md: "w-12 h-12 rounded-2xl",
    lg: "w-16 h-16 rounded-[2rem]"
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-7 h-7"
  };

  return (
    <div className={cn(
      "relative flex items-center justify-center shrink-0",
      sizeClasses[size],
      "bg-gradient-to-br from-foreground/5 to-transparent border border-border",
      "shadow-[0_8px_16px_-6px_rgba(0,0,0,0.5)] overflow-hidden group-hover:border-primary/30 transition-all duration-500",
      className
    )}>
      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <Icon className={cn(
        "text-muted-foreground group-hover:text-primary transition-colors duration-500 relative z-10",
        iconSizes[size]
      )} />
    </div>
  );
}
