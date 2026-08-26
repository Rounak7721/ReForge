import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Keep next/font's own variable names here. globals.css maps them onto
// Tailwind's font-* utilities via `@theme inline`; naming both sides
// `--font-sans` makes that mapping circular and silently drops the font.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Display face. Bricolage carries an optical-size axis, so the same family
// covers a 12px eyebrow and a 60px headline without either looking stretched —
// `.display` drives opsz up to 72, `.display-sm` sits at 32. That keeps the
// page to three type roles: display (Bricolage), body (Geist), data (Geist Mono).
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://reforge-blond-two.vercel.app"),
  title: {
    default: "Reforge — take any product apart, build yours from the pieces",
    template: "%s · Reforge",
  },
  description:
    "Paste a URL. Reforge reads the site, names what the product does and who it serves, then drafts a complete concept for the product you want to build instead.",
  openGraph: {
    title: "Reforge — take any product apart, build yours from the pieces",
    description:
      "Paste a URL. Reforge reads the site, names what the product does and who it serves, then drafts a complete concept for the product you want to build instead.",
    type: "website",
    siteName: "Reforge",
  },
  twitter: {
    card: "summary_large_image",
    title: "Reforge — take any product apart, build yours from the pieces",
    description:
      "Analyze any product’s website with AI, then generate and refine your own product concept in plain English.",
  },
};

// Matches the resolved --background in each theme, so the browser chrome and
// the page agree instead of showing a white seam on scroll-past.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf8" },
    { media: "(prefers-color-scheme: dark)", color: "#191714" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The font variables must sit on <html>, not <body>: shadcn's preset applies
    // `font-sans` to <html>, and CSS custom properties only inherit downward.
    // suppressHydrationWarning is required — next-themes writes the theme class
    // on the client before React hydrates.
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable}`}
      suppressHydrationWarning
    >
      <body className="grain min-h-svh">
        {/* Scroll reveals start transparent and are un-hidden by an
            IntersectionObserver. With JS off that observer never runs, so
            force every revealed element visible rather than shipping a blank
            page. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important;filter:none!important}`}</style>
        </noscript>
        <ThemeProvider>
          <a href="#main" className="skip-link bezel px-4 py-2 text-sm font-medium">
            Skip to content
          </a>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
