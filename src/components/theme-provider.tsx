"use client";

import { createContext, useContext, useState } from "react";
import { DEFAULT_THEME, THEME_COOKIE, THEME_IDS } from "@/lib/themes";

// Theme is persisted in a cookie so the server layout can read it and render the
// correct `data-theme` on first paint (no flash). `initialTheme` comes from that
// server read, so client state matches SSR with no hydration mismatch.

const ThemeContext = createContext<{
  theme: string;
  setTheme: (theme: string) => void;
}>({ theme: DEFAULT_THEME, setTheme: () => {} });

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({
  initialTheme = DEFAULT_THEME,
  children,
}: {
  initialTheme?: string;
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState(initialTheme);

  const setTheme = (next: string) => {
    if (!THEME_IDS.includes(next)) return;
    setThemeState(next);
    document.documentElement.dataset.theme = next; // instant, no reload
    // biome-ignore lint/suspicious/noDocumentCookie: standard, universally-supported cookie write
    document.cookie = `${THEME_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
