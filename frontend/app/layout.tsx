import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Road Express - HR Admin Portal",
  description: "Internal Recruitment and Pipeline Management Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 antialiased">{children}</body>
    </html>
  );
}
