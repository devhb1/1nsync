"use client";

import { useTheme } from "@/modules/core/theme";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  // Simple loading state
  if (!mounted) {
    return (
      <div className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card">
        <div className="h-5 w-5 animate-pulse rounded bg-muted-foreground/20" />
      </div>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm transition-all hover:bg-accent"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
} 