"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * App-wide theme provider. Wraps `next-themes` with the project defaults:
 * follows the OS preference out of the box (`system`), persists an explicit
 * choice, toggles the `.dark` class on <html>, and disables transitions during
 * the switch to avoid a flash. Pair with `suppressHydrationWarning` on <html>.
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
