import type { Metadata } from "next";
import { Geist, Geist_Mono, Public_Sans, Roboto } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
// Only Prism's `.token.*` color rules apply — we render highlighted spans into
// the diff cells, not Prism's own code wrapper. App is always dark.
import "prismjs/themes/prism-tomorrow.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DEFAULT_THEME, THEME_COOKIE, THEME_IDS } from "@/lib/themes";
import { cn } from "@/lib/utils";

const robotoHeading = Roboto({
  subsets: ["latin"],
  variable: "--font-heading",
});

const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpenGit",
  description: "A Git client for the web",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const saved = (await cookies()).get(THEME_COOKIE)?.value;
  const theme = saved && THEME_IDS.includes(saved) ? saved : DEFAULT_THEME;
  return (
    <html
      lang="en"
      data-theme={theme}
      suppressHydrationWarning
      className={cn(
        "dark h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        publicSans.variable,
        robotoHeading.variable,
      )}
    >
      <body className="flex min-h-full flex-col overflow-hidden">
        <ThemeProvider initialTheme={theme}>
          <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
          <Toaster position="bottom-right" duration={2000} />
        </ThemeProvider>
      </body>
    </html>
  );
}
