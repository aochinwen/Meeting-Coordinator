'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { MarkdownContent } from '@/components/MarkdownContent';

interface InitiativeSlide {
  id: string;
  title: string;
  description_md: string | null;
  media_type: string;
  storage_path: string | null;
  video_url: string | null;
  position: number;
}

interface InitiativePresentClientProps {
  initiativeId: string;
  initiativeTitle: string;
  slides: InitiativeSlide[];
}

export function InitiativePresentClient({ initiativeId, initiativeTitle, slides }: InitiativePresentClientProps) {
  const supabase = useMemo(() => createClient(), []);
  const orderedSlides = useMemo(() => [...slides].sort((a, b) => a.position - b.position), [slides]);

  const [index, setIndex] = useState(0);
  const current = orderedSlides[index];

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        setIndex((prev) => Math.min(orderedSlides.length - 1, prev + 1));
      }
      if (event.key === 'ArrowLeft') {
        setIndex((prev) => Math.max(0, prev - 1));
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [orderedSlides.length]);

  const mediaUrl = useMemo(() => {
    if (!current) return '';
    if (current.media_type === 'video_url') return current.video_url || '';
    if (!current.storage_path) return '';
    return supabase.storage.from('initiative-media').getPublicUrl(current.storage_path).data.publicUrl;
  }, [current, supabase]);

  if (!current) {
    return (
      <div className="max-w-[960px] mx-auto py-16 text-center">
        <p className="text-text-secondary">No slides available.</p>
        <Link href={`/demo/${initiativeId}`} className="inline-flex mt-4 px-4 py-2 rounded-full border border-border">
          Back to Initiative
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-text-primary rounded-3xl p-6 md:p-8 text-text-primary relative overflow-hidden">
      <div className="absolute top-4 right-4">
        <Link href={`/demo/${initiativeId}`} className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-border hover:bg-surface/70">
          <X className="h-4 w-4" />
          Exit
        </Link>
      </div>

      <div className="max-w-[1100px] mx-auto h-full flex flex-col gap-6">
        <div className="pt-12">
          <p className="text-sm uppercase tracking-widest text-text-secondary">Present Mode</p>
          <h1 className="text-3xl md:text-4xl font-bold font-literata mt-2">{initiativeTitle}</h1>
        </div>

        <div className="flex-1 rounded-2xl border border-white/20 bg-black/30 p-3 flex items-center justify-center min-h-[420px]">
          {current.media_type === 'video_upload' || current.media_type === 'video_url' ? (
            <video src={mediaUrl} controls className="w-full max-h-[65vh] rounded-xl" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl} alt={current.title} className="w-full max-h-[65vh] object-contain rounded-xl" />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-end">
          <div>
            <h2 className="text-2xl font-bold">{current.title}</h2>
            <MarkdownContent markdown={current.description_md || ''} className="mt-2" />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIndex((prev) => Math.max(0, prev - 1))}
              disabled={index === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <button
              onClick={() => setIndex((prev) => Math.min(orderedSlides.length - 1, prev + 1))}
              disabled={index === orderedSlides.length - 1}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
