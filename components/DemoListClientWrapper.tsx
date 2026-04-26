'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Plus } from 'lucide-react';
import { MarkdownContent } from '@/components/MarkdownContent';
import type { InitiativeCard } from '@/components/DemoListServer';

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

interface DemoListClientWrapperProps {
  initialInitiatives: InitiativeCard[];
}

export function DemoListClientWrapper({ initialInitiatives }: DemoListClientWrapperProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return initialInitiatives;

    const q = normalize(query);
    return initialInitiatives.filter((initiative) => {
      const base = `${initiative.title} ${initiative.narrative_md} ${initiative.target_groups.join(' ')}`.toLowerCase();
      const slideText = initiative.initiative_slides
        .map((slide) => `${slide.title} ${slide.description_md || ''}`)
        .join(' ')
        .toLowerCase();
      return base.includes(q) || slideText.includes(q);
    });
  }, [initialInitiatives, query]);

  return (
    <>
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

      {filtered.length === 0 ? (
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
    </>
  );
}
