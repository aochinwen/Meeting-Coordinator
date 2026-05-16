'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function AssistantButton() {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    console.log("FloatingAIButton mounted");
    setMounted(true);
  }, []);

  // Don't render until mounted (to prevent hydration mismatch)
  // and don't render if we're already on the assistant page
  if (!mounted || pathname?.startsWith('/assistant')) return null;

  return (
    <Link
      href="/assistant"
      className="fixed bottom-24 right-8 z-[9999] group flex items-center justify-center transition-all duration-500 ease-in-out"
      aria-label="AI Assistant"
    >
      {/* Dynamic Glow Layer - Very bright to ensure visibility */}
      <div className="absolute inset-0 bg-primary/40 rounded-full blur-3xl group-hover:bg-primary/60 group-hover:scale-150 transition-all duration-700 animate-pulse" />
      
      {/* Main Orb */}
      <div className="relative h-16 w-16 bg-primary rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(var(--primary-rgb),0.4)] group-hover:scale-110 group-active:scale-95 transition-all duration-500 ease-out border-2 border-white/20">
        {/* Shine/Reflection */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-white/20 to-transparent pointer-events-none rounded-full" />
        
        {/* Animated Rings */}
        <div className="absolute inset-[-4px] border border-primary/20 rounded-full animate-ping [animation-duration:3s]" />
        
        {/* Icon */}
        <Sparkles className="w-7 h-7 text-white drop-shadow-md" />
        
        {/* Inner Glow */}
        <div className="absolute inset-0 rounded-full shadow-[inset_0_0_15px_rgba(255,255,255,0.3)]" />
      </div>
      
      {/* Tooltip Label */}
      <div className="absolute right-full mr-4 px-3 py-2 bg-text-primary text-white text-xs font-bold rounded-xl opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-2xl">
        AI Assistant
      </div>
    </Link>
  );
}
