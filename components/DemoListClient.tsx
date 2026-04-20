'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { MarkdownContent } from '@/components/MarkdownContent';

interface InitiativeSlidePreview {
  id: string;
  title: string;
  description_md: string | null;
  media_type: string;
  storage_path: string | null;
  video_url: string | null;
  position: number;
}

interface InitiativeCard {
  id: string;
  title: string;
  stage: string;
  narrative_md: string;
  target_groups: string[];
  updated_at: string;
  initiative_slides: InitiativeSlidePreview[];
}

interface RawInitiativeSlide extends InitiativeSlidePreview {
  deleted_at: string | null;
}

interface RawInitiative extends Omit<InitiativeCard, 'initiative_slides'> {
  initiative_slides: RawInitiativeSlide[];
}

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

export function DemoListClient() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [initiatives, setInitiatives] = useState<InitiativeCard[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('initiatives')
        .select(
          'id, title, stage, narrative_md, target_groups, updated_at, initiative_slides(id, title, description_md, media_type, storage_path, video_url, position, deleted_at)'
        )
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Failed to load initiatives', error);
        setInitiatives([]);
        setLoading(false);
        return;
      }

      const hydrated = ((data || []) as RawInitiative[]).map((item) => ({
        ...item,
        initiative_slides: (item.initiative_slides || [])
          .filter((slide) => slide.deleted_at === null)
          .sort((a: InitiativeSlidePreview, b: InitiativeSlidePreview) => a.position - b.position),
      }));

      setInitiatives(hydrated);
      setLoading(false);
    };

    load();
  }, [supabase]);

  const filtered = useMemo(() => {
    if (!query.trim()) return initiatives;

    const q = normalize(query);
    return initiatives.filter((initiative) => {
      const base = `${initiative.title} ${initiative.narrative_md} ${initiative.target_groups.join(' ')}`.toLowerCase();
      const slideText = initiative.initiative_slides
        .map((slide) => `${slide.title} ${slide.description_md || ''}`)
        .join(' ')
        .toLowerCase();
      return base.includes(q) || slideText.includes(q);
    });
  }, [initiatives, query]);

  return (
    <div className="max-w-[1280px] mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-text-primary font-literata">Demo Initiatives</h1>
          <p className="text-base font-light text-text-secondary mt-2">Explore ongoing initiatives and open detailed showcase pages.</p>
        </div>
        <Link href="/demo/new" className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-white hover:bg-primary-hover transition-colors">
          <Plus className="h-4 w-4" />
          Add Initiative
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, narrative, setup, slide title, or slide description"
          className="w-full pl-11 pr-4 py-3 rounded-2xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {loading ? (
        <div className="text-text-secondary">Loading initiatives...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-border rounded-3xl p-10 text-center text-text-secondary">
          No initiatives found.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map((initiative) => (
            <Link
              key={initiative.id}
              href={`/demo/${initiative.id}`}
              className="bg-white border border-border rounded-3xl p-6 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between gap-4 mb-3">
                <h2 className="text-xl font-bold text-text-primary font-literata">{initiative.title}</h2>
                <span className="px-3 py-1 rounded-full bg-surface border border-border text-xs text-text-secondary">{initiative.stage}</span>
              </div>

              <MarkdownContent markdown={initiative.narrative_md} className="line-clamp-4 mb-4" />

              <div className="flex flex-wrap gap-2 mb-4">
                {initiative.target_groups.map((group) => (
                  <span key={`${initiative.id}-${group}`} className="px-2.5 py-1 rounded-full border border-border bg-board text-xs text-text-secondary">
                    {group}
                  </span>
                ))}
              </div>

              <div className="text-xs text-text-tertiary">
                {initiative.initiative_slides.length} slide{initiative.initiative_slides.length !== 1 ? 's' : ''} • Updated{' '}
                {new Date(initiative.updated_at).toLocaleString()}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
