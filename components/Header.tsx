import Link from "next/link";
import { User, Bell } from "lucide-react";

export function Header() {
  return (
    <div className="fixed top-0 left-0 right-0 h-16 bg-board border-b border-border/50 flex items-center justify-between px-6 z-50">
      <div className="flex items-center">
        <Link href="/" className="font-['Literata',serif] font-bold text-xl text-primary">
          The Organizer
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 rounded-full hover:bg-surface transition-colors relative">
          <Bell className="w-5 h-5 text-text-secondary" />
        </button>
        <div className="h-8 w-8 rounded-full border border-border bg-primary flex items-center justify-center overflow-hidden">
          <span className="text-white text-xs text-center font-light">JS</span>
        </div>
      </div>
    </div>
  );
}
