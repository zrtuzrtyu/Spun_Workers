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
      "bg-muted border border-border group-hover:border-primary/50 transition-all duration-300",
      className
    )}>
      <Icon className={cn(
        "text-muted-foreground group-hover:text-primary transition-colors duration-300",
        iconSizes[size]
      )} />
    </div>
  );
}
