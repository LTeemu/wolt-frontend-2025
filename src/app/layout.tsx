import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";

const oswald = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Delivery Order Price Calculator - Teemu Leinonen",
  description: "Wolt Frontend Trainee 2025",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        style={{ fontFamily: "var(--font-rubik)" }}
        className={`${oswald.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
