import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { AssistantButton } from "@/components/AssistantButton";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      <div className="flex flex-1 pt-16 min-h-0">
        <Sidebar />
        <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-board min-h-0">
          {children}
        </main>
      </div>
      <AssistantButton />
    </>
  );
}
