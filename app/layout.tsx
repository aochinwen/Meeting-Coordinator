import type { Metadata } from "next";
import { Literata, Nunito_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const literata = Literata({ 
  subsets: ["latin"],
  variable: '--font-literata-next',
  display: 'swap',
  preload: true,
});

const nunitoSans = Nunito_Sans({ 
  subsets: ["latin"],
  variable: '--font-nunito-sans',
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: "Meeting Coordination Platform",
  description: "A comprehensive tool to manage templates, recurring meetings, and task checklists",
};


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${literata.variable} ${nunitoSans.variable} h-full antialiased`}>
      <head>
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL || ''} />
      </head>
      <body className="h-full bg-board text-text-primary font-nunito flex flex-col">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
