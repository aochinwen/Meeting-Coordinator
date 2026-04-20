import { cn } from '@/lib/utils';

interface MarkdownContentProps {
  markdown: string;
  className?: string;
}

function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function simpleMarkdownToHtml(markdown: string): string {
  let html = escapeHtml(markdown);

  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  const lines = html.split('\n');
  const transformed: string[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      transformed.push(`<ul>${listItems.join('')}</ul>`);
      listItems = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^[-*]\s+(.+)$/);

    if (match) {
      listItems.push(`<li>${match[1]}</li>`);
      continue;
    }

    flushList();

    if (!trimmed) {
      transformed.push('');
    } else if (trimmed.startsWith('<h1>') || trimmed.startsWith('<h2>') || trimmed.startsWith('<h3>')) {
      transformed.push(trimmed);
    } else {
      transformed.push(`<p>${trimmed}</p>`);
    }
  }

  flushList();

  return transformed.join('');
}

export function MarkdownContent({ markdown, className }: MarkdownContentProps) {
  return (
    <div
      className={cn(
        'prose prose-sm max-w-none text-text-secondary prose-headings:font-literata prose-headings:text-text-primary prose-a:text-primary prose-code:text-text-primary prose-code:bg-surface prose-code:px-1 prose-code:py-0.5 prose-code:rounded',
        className
      )}
      dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(markdown || '') }}
    />
  );
}
