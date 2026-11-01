"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Theme provider wired to the @mtosity/design-system tokens, which key dark
 * mode off `[data-theme="dark"]` on <html>. Follows the OS appearance, as
 * the 1.0 (Apple HIG) design system expects; the toggle still overrides it.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
