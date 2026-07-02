import { IBM_Plex_Sans, IBM_Plex_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const sourceSerif4 = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata = {
  metadataBase: new URL("https://trakit-seven.vercel.app"),
  title: "Trakit7 — Daily Expense Tracker",
  description: "Track every naira. Know your net worth. Get coached by Coach RBC.",
  openGraph: {
    title: "Trakit7 — Daily Expense Tracker",
    description: "Track every naira. Know your net worth. Get coached by Coach RBC.",
    url: "https://trakit-seven.vercel.app",
    siteName: "Trakit7",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Trakit7 — Daily Expense Tracker",
    description: "Track every naira. Know your net worth. Get coached by Coach RBC.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} ${sourceSerif4.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
