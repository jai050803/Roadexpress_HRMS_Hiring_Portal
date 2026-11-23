import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Road Express Careers - Join Our Team",
  description: "Browse open roles and apply to Road Express logistics company.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-50 antialiased">
        <Navbar />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Road Express Logistics. All rights reserved.
        </footer>
      </body>
    </html>
  );
}
