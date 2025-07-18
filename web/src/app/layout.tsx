import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/navbar";

const mahiro = {
  name: "Mahiro",
  url: "https://discord.com/users/829806976702873621",
};

export const viewport: Viewport = {
  themeColor: "#6775ff",
};
export const metadata: Metadata = {
  title: "Mihari",
  description: "The Ultimate Media Downloader, Supports 1000+ Websites",
  icons: {
    icon: "/favicon.ico",
  },
  authors: [mahiro],
  openGraph: {
    title: "Mihari",
    description: "The Ultimate Media Downloader, Supports 1000+ Websites",
    url: "https://mihari.mahirou.online",
    siteName: "Mihari",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex flex-col h-screen">
        <Navbar />
        <div className="h-screen bg-gradient-to-tr from-cyan-100 via-blue-200 to-indigo-200">
          {children}
        </div>
      </body>
    </html>
  );
}
