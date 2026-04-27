import type { Metadata } from "next";
import { Literata, Nunito_Sans } from "next/font/google";
import { headers } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";

const literata = Literata({ 
  subsets: ["latin"],
  variable: '--font-literata',
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

/** Routes that should render without the app chrome (Sidebar + Header). */
function isAuthOnlyRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth/')
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') ?? headersList.get('x-invoke-path') ?? '';
  const hideChrome = isAuthOnlyRoute(pathname);

  return (
    <html lang="en" className={`${literata.variable} ${nunitoSans.variable} h-full antialiased`}>
      <head>
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL || ''} />
      </head>
      {hideChrome ? (
        <body className="h-full bg-board text-text-primary font-nunito">
          {children}
          <Analytics />
          <SpeedInsights />
        </body>
      ) : (
        <body className="h-full flex flex-col bg-board text-text-primary font-nunito">
          <Header />
          <div className="flex flex-1 pt-16 min-h-0">
            <Sidebar />
            <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-board min-h-0">
              {children}
            </main>
          </div>
          <Analytics />
          <SpeedInsights />
        </body>
      )}
    </html>
  );
}
