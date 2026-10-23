import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Debashish — Spot it. Shape it. Ship it.",
  description: "Product Owner who turns everyday annoyances into products people want.",
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
