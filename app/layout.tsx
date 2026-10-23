import type { Metadata } from "next";
import { site } from "@/content/site";
import { Geist, Geist_Mono, Permanent_Marker } from "next/font/google";
import "./globals.css";
import "./styles/shell.css";
import "./styles/hero.css";
import "./styles/delivery.css";
import "./styles/footer.css";
import "./styles/grid.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const marker = Permanent_Marker({
  variable: "--font-marker",
  subsets: ["latin"],
  weight: ["400"],
});

const title = `${site.name} — ${site.role} Portfolio | Spot it. Shape it. Ship it.`;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title,
  description: site.description,
  applicationName: `${site.name} Portfolio`,
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "profile",
    url: "/",
    siteName: `${site.name} Portfolio`,
    title,
    description: site.description,
    firstName: site.name.split(" ")[0],
    lastName: site.name.split(" ").slice(1).join(" "),
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title, description: site.description },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${marker.variable}`} suppressHydrationWarning>
      <head>
        {/* Before first paint: skip the intro loader for the rest of the session, and always with reduced motion. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var h=document.documentElement;if(sessionStorage.getItem("dsh-loader")||matchMedia("(prefers-reduced-motion: reduce)").matches)h.setAttribute("data-noloader","");else sessionStorage.setItem("dsh-loader","1")}catch(e){document.documentElement.setAttribute("data-noloader","")}})()`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
