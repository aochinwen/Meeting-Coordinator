'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Edit2, Trash2, Presentation } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { MarkdownContent } from '@/components/MarkdownContent';

interface InitiativeDetailSlide {
  id: string;
  title: string;
  description_md: string | null;
  media_type: string;
  storage_path: string | null;
  video_url: string | null;
  position: number;
}

interface InitiativeDetail {
  id: string;
  title: string;
  stage: string;
  narrative_md: string;
  demo_setup_md: string;
  target_groups: string[];
  updated_at: string;
  initiative_slides: InitiativeDetailSlide[];
}

interface InitiativeDetailClientProps {
  initiative: InitiativeDetail;
}

export function InitiativeDetailClient({ initiative }: InitiativeDetailClientProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const slides = useMemo(
    () => [...initiative.initiative_slides].sort((a, b) => a.position - b.position),
    [initiative.initiative_slides]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentSlide = slides[currentIndex];

  const currentMediaUrl = useMemo(() => {
    if (!currentSlide) return '';
    if (currentSlide.media_type === 'video_url') return currentSlide.video_url || '';
    if (!currentSlide.storage_path) return '';
    return supabase.storage.from('initiative-media').getPublicUrl(currentSlide.storage_path).data.publicUrl;
  }, [currentSlide, supabase]);

  const softDelete = async () => {
    const confirmed = window.confirm(`Soft delete initiative "${initiative.title}"?`);
    if (!confirmed) return;

    const now = new Date().toISOString();

    const { error } = await supabase
      .from('initiatives')
      .update({ deleted_at: now, updated_at: now })
      .eq('id', initiative.id)
      .is('deleted_at', null);

    if (error) {
      alert('Failed to delete initiative.');
      return;
    }

    await supabase
      .from('initiative_slides')
      .update({ deleted_at: now, updated_at: now })
      .eq('initiative_id', initiative.id)
      .is('deleted_at', null);

    router.push('/demo');
    router.refresh();
  };

  return (
    <div className="max-w-[1280px] mx-auto space-y-8 pb-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-text-primary font-literata">{initiative.title}</h1>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-surface border border-border text-sm">{initiative.stage}</span>
            <span className="text-sm text-text-tertiary">Updated {new Date(initiative.updated_at).toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/demo/${initiative.id}/present`} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-white hover:bg-surface">
            <Presentation className="h-4 w-4" />
            Present Mode
          </Link>
          <Link href={`/demo/${initiative.id}/edit`} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-white hover:bg-surface">
            <Edit2 className="h-4 w-4" />
            Edit
          </Link>
          <button onClick={softDelete} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-white text-coral-text hover:bg-coral-text/10">
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      <div className="bg-white border border-border rounded-3xl p-6">
        <h2 className="text-xl font-bold font-literata text-text-primary mb-3">Target User Groups</h2>
        <div className="flex flex-wrap gap-2">
          {initiative.target_groups.map((group) => (
            <span key={group} className="px-3 py-1 rounded-full border border-border bg-board text-sm text-text-secondary">
              {group}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white border border-border rounded-3xl p-6">
          <h2 className="text-xl font-bold font-literata text-text-primary mb-4">Narrative</h2>
          <MarkdownContent markdown={initiative.narrative_md} />
        </div>

        <div className="bg-white border border-border rounded-3xl p-6">
          <h2 className="text-xl font-bold font-literata text-text-primary mb-4">Demo Setup</h2>
          <MarkdownContent markdown={initiative.demo_setup_md} />
        </div>
      </div>

      <div className="bg-white border border-border rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold font-literata text-text-primary">Feature Slideshow</h2>
          <div className="text-sm text-text-tertiary">
            {slides.length > 0 ? `${currentIndex + 1} / ${slides.length}` : 'No slides'}
          </div>
        </div>

        {currentSlide ? (
          <>
            <div className="rounded-2xl border border-border bg-board p-2 min-h-[300px] flex items-center justify-center">
              {currentSlide.media_type === 'video_upload' || currentSlide.media_type === 'video_url' ? (
                <video src={currentMediaUrl} controls className="w-full max-h-[500px] rounded-xl" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentMediaUrl} alt={currentSlide.title} className="w-full max-h-[500px] object-contain rounded-xl" />
              )}
            </div>

            <div>
              <h3 className="text-lg font-bold text-text-primary">{currentSlide.title}</h3>
              <MarkdownContent markdown={currentSlide.description_md || ''} className="mt-2" />
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentIndex((idx) => Math.max(0, idx - 1))}
                disabled={currentIndex === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={() => setCurrentIndex((idx) => Math.min(slides.length - 1, idx + 1))}
                disabled={currentIndex === slides.length - 1}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          <p className="text-text-secondary">No slides available.</p>
        )}
      </div>
    </div>
  );
}
