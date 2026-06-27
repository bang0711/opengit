// Theme palettes are defined as `[data-theme="<id>"]` CSS var blocks in
// globals.css. The ThemeProvider swaps the data-theme attribute; the `dark`
// class stays on <html> so Tailwind's `dark:` utilities keep working. "default"
// has no CSS block — it falls back to the base `.dark` (zinc) palette.

export type Theme = { id: string; label: string };

export const THEMES: Theme[] = [
  { id: "default", label: "Zinc" },
  { id: "gitkraken", label: "GitKraken" },
  { id: "dracula", label: "Dracula" },
  { id: "catppuccin", label: "Catppuccin Mocha" },
  { id: "nord", label: "Nord" },
  { id: "tokyo-night", label: "Tokyo Night" },
  { id: "github-dark", label: "GitHub Dark" },
];

export const THEME_IDS = THEMES.map((t) => t.id);
export const DEFAULT_THEME = "gitkraken";
// Persisted in a cookie (not localStorage) so the server layout can read it and
// render the correct data-theme on first paint — no flash of the default theme.
export const THEME_COOKIE = "theme";
