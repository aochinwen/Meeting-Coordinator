import type { Metadata } from "next";
import { Literata, Nunito_Sans } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

const literata = Literata({ 
  subsets: ["latin"],
  variable: '--font-literata',
});

const nunitoSans = Nunito_Sans({ 
  subsets: ["latin"],
  variable: '--font-nunito-sans',
});

export const metadata: Metadata = {
  title: "Meeting Coordination Platform",
  description: "A comprehensive tool to manage templates, recurring meetings, and task checklists",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${literata.variable} ${nunitoSans.variable} h-full antialiased`}>
      <body className="h-full flex flex-col bg-board text-text-primary font-nunito">
        <Header />
        <div className="flex flex-1 pt-16 overflow-hidden">
          <Sidebar />
          <main className="flex-1 ml-64 p-8 overflow-y-auto bg-board min-h-screen">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
