import { cn } from '@/lib/utils';
import { Bot, User } from 'lucide-react';
import { MarkdownContent } from '@/components/MarkdownContent';

interface ChatMessageProps {
  role: 'user' | 'model';
  text: string;
}

export function ChatMessage({ role, text }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={cn("flex w-full gap-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-8 h-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm mt-1">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      )}
      
      <div className={cn(
        "max-w-[85%] sm:max-w-[80%] rounded-2xl px-5 py-3 shadow-sm relative overflow-hidden",
        isUser 
          ? "bg-primary text-white rounded-tr-sm" 
          : "bg-white border border-border backdrop-blur-xl bg-opacity-70 rounded-tl-sm"
      )}>
        {/* Subtle glass reflection effect for AI bubbles */}
        {!isUser && (
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
        )}
        
        {isUser ? (
          <p className="text-sm font-light leading-relaxed whitespace-pre-wrap relative z-10">{text}</p>
        ) : (
          <MarkdownContent 
            markdown={text} 
            className="text-sm font-light text-text-primary prose-p:leading-relaxed prose-li:leading-relaxed relative z-10" 
          />
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 shrink-0 rounded-full bg-board flex items-center justify-center border border-border shadow-sm mt-1">
          <User className="w-4 h-4 text-text-secondary" />
        </div>
      )}
    </div>
  );
}
