'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ArrowUp, ArrowDown, Upload } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import {
  INITIATIVE_STAGES,
  MAX_IMAGE_GIF_BYTES,
  MAX_SLIDES,
  MAX_VIDEO_BYTES,
  SlideMediaType,
  isValidHttpUrl,
  normalizeTargetGroups,
} from '@/lib/demo';

type FormMode = 'create' | 'edit';

type SlideDraft = {
  id?: string;
  localId: string;
  title: string;
  descriptionMd: string;
  mediaType: SlideMediaType;
  storagePath: string | null;
  videoUrl: string;
  file: File | null;
  previewUrl: string;
};

interface InitiativeFormClientProps {
  mode: FormMode;
  initiativeId?: string;
}

const BUCKET = 'initiative-media';

function emptySlide(mediaType: SlideMediaType = 'image'): SlideDraft {
  return {
    localId: crypto.randomUUID(),
    title: '',
    descriptionMd: '',
    mediaType,
    storagePath: null,
    videoUrl: '',
    file: null,
    previewUrl: '',
  };
}

export function InitiativeFormClient({ mode, initiativeId }: InitiativeFormClientProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [stage, setStage] = useState<(typeof INITIATIVE_STAGES)[number]>('Concept');
  const [narrativeMd, setNarrativeMd] = useState('');
  const [demoSetupMd, setDemoSetupMd] = useState('');
  const [targetGroups, setTargetGroups] = useState<string[]>([]);
  const [targetGroupInput, setTargetGroupInput] = useState('');

  const [slides, setSlides] = useState<SlideDraft[]>([emptySlide()]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (mode !== 'edit' || !initiativeId) return;

    const loadInitiative = async () => {
      setLoading(true);
      setErrorMessage('');

      const { data, error } = await supabase
        .from('initiatives')
        .select('id, title, stage, narrative_md, demo_setup_md, target_groups')
        .eq('id', initiativeId)
        .is('deleted_at', null)
        .maybeSingle();

      if (error || !data) {
        setErrorMessage('Unable to load initiative.');
        setLoading(false);
        return;
      }

      setTitle(data.title);
      setStage(data.stage as (typeof INITIATIVE_STAGES)[number]);
      setNarrativeMd(data.narrative_md);
      setDemoSetupMd(data.demo_setup_md);
      setTargetGroups(data.target_groups || []);

      const { data: slideData, error: slideError } = await supabase
        .from('initiative_slides')
        .select('id, title, description_md, media_type, storage_path, video_url, position')
        .eq('initiative_id', initiativeId)
        .is('deleted_at', null)
        .order('position', { ascending: true });

      if (slideError) {
        setErrorMessage('Unable to load initiative slides.');
        setLoading(false);
        return;
      }

      const hydratedSlides: SlideDraft[] = (slideData || []).map((slide) => {
        const previewUrl = slide.storage_path
          ? supabase.storage.from(BUCKET).getPublicUrl(slide.storage_path).data.publicUrl
          : slide.video_url || '';

        return {
          id: slide.id,
          localId: crypto.randomUUID(),
          title: slide.title,
          descriptionMd: slide.description_md || '',
          mediaType: slide.media_type as SlideMediaType,
          storagePath: slide.storage_path,
          videoUrl: slide.video_url || '',
          file: null,
          previewUrl,
        };
      });

      setSlides(hydratedSlides.length > 0 ? hydratedSlides : [emptySlide()]);
      setLoading(false);
    };

    loadInitiative();
  }, [initiativeId, mode, supabase]);

  const addTargetGroup = () => {
    const trimmed = targetGroupInput.trim();
    if (!trimmed) return;
    setTargetGroups((prev) => normalizeTargetGroups([...prev, trimmed]));
    setTargetGroupInput('');
  };

  const removeTargetGroup = (group: string) => {
    setTargetGroups((prev) => prev.filter((item) => item !== group));
  };

  const updateSlide = (localId: string, updates: Partial<SlideDraft>) => {
    setSlides((prev) => prev.map((slide) => (slide.localId === localId ? { ...slide, ...updates } : slide)));
  };

  const moveSlide = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= slides.length) return;

    const reordered = [...slides];
    const [target] = reordered.splice(index, 1);
    reordered.splice(next, 0, target);
    setSlides(reordered);
  };

  const addSlide = () => {
    if (slides.length >= MAX_SLIDES) return;
    setSlides((prev) => [...prev, emptySlide()]);
  };

  const removeSlide = (localId: string) => {
    setSlides((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((slide) => slide.localId !== localId);
    });
  };

  const handleSlideFileChange = (localId: string, file: File | null) => {
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isGif = file.type === 'image/gif';
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      setErrorMessage('Only image, gif, and video files are allowed.');
      return;
    }

    if (isVideo && file.size > MAX_VIDEO_BYTES) {
      setErrorMessage('Video exceeds 100MB limit.');
      return;
    }

    if (isImage && file.size > MAX_IMAGE_GIF_BYTES) {
      setErrorMessage('Image/GIF exceeds 10MB limit.');
      return;
    }

    const mediaType: SlideMediaType = isVideo ? 'video_upload' : isGif ? 'gif' : 'image';
    const previewUrl = URL.createObjectURL(file);

    updateSlide(localId, {
      file,
      mediaType,
      videoUrl: '',
      storagePath: null,
      previewUrl,
    });
  };

  const validate = (): string | null => {
    if (!title.trim()) return 'Title is required.';
    if (!narrativeMd.trim()) return 'Narrative is required.';
    if (!demoSetupMd.trim()) return 'Demo setup is required.';
    if (normalizeTargetGroups(targetGroups).length === 0) return 'At least one target group is required.';
    if (slides.length === 0) return 'At least one slide is required.';
    if (slides.length > MAX_SLIDES) return `Maximum of ${MAX_SLIDES} slides allowed.`;

    for (const slide of slides) {
      if (!slide.title.trim()) return 'Every slide must have a title.';

      if (slide.mediaType === 'video_url') {
        if (!slide.videoUrl.trim() || !isValidHttpUrl(slide.videoUrl.trim())) {
          return 'Slides using video URL must have a valid URL.';
        }
      } else if (!slide.file && !slide.storagePath) {
        return 'Every slide must have uploaded media or a video URL.';
      }
    }

    return null;
  };

  const uploadSlideIfNeeded = async (initiativeIdValue: string, slide: SlideDraft) => {
    if (!slide.file) {
      return {
        storagePath: slide.storagePath,
        videoUrl: slide.mediaType === 'video_url' ? slide.videoUrl.trim() : null,
        mediaType: slide.mediaType,
      };
    }

    const extension = slide.file.name.includes('.') ? slide.file.name.split('.').pop() : 'bin';
    const fileName = `${crypto.randomUUID()}.${extension}`;
    const path = `initiatives/${initiativeIdValue}/${fileName}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, slide.file, {
      upsert: false,
      cacheControl: '3600',
    });

    if (error) {
      throw error;
    }

    return {
      storagePath: path,
      videoUrl: null,
      mediaType: slide.mediaType === 'video_url' ? 'video_upload' : slide.mediaType,
    };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');

    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSaving(true);

    try {
      let targetInitiativeId = initiativeId;

      const initiativePayload = {
        title: title.trim(),
        stage,
        narrative_md: narrativeMd.trim(),
        demo_setup_md: demoSetupMd.trim(),
        target_groups: normalizeTargetGroups(targetGroups),
        updated_at: new Date().toISOString(),
      };

      if (mode === 'create') {
        const { data, error } = await supabase
          .from('initiatives')
          .insert(initiativePayload)
          .select('id')
          .single();

        if (error || !data) throw error || new Error('Failed to create initiative');
        targetInitiativeId = data.id;
      } else {
        const { error } = await supabase
          .from('initiatives')
          .update(initiativePayload)
          .eq('id', initiativeId!);

        if (error) throw error;

        const softDeleteAt = new Date().toISOString();
        const { error: slideDeleteError } = await supabase
          .from('initiative_slides')
          .update({ deleted_at: softDeleteAt, updated_at: softDeleteAt })
          .eq('initiative_id', initiativeId!)
          .is('deleted_at', null);

        if (slideDeleteError) throw slideDeleteError;
      }

      if (!targetInitiativeId) throw new Error('Missing initiative id');

      const slideRecords = [];
      for (let index = 0; index < slides.length; index += 1) {
        const slide = slides[index];
        const mediaData = await uploadSlideIfNeeded(targetInitiativeId, slide);

        slideRecords.push({
          initiative_id: targetInitiativeId,
          position: index,
          title: slide.title.trim(),
          description_md: slide.descriptionMd.trim() || null,
          media_type: mediaData.mediaType,
          storage_path: mediaData.storagePath,
          video_url: mediaData.videoUrl,
          updated_at: new Date().toISOString(),
        });
      }

      if (slideRecords.length > 0) {
        const { error: slideInsertError } = await supabase.from('initiative_slides').insert(slideRecords);
        if (slideInsertError) throw slideInsertError;
      }

      router.push(`/demo/${targetInitiativeId}`);
      router.refresh();
    } catch (error: unknown) {
      console.error('Failed to save initiative', error);
      const message = error instanceof Error ? error.message : 'Failed to save initiative.';
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-text-secondary">Loading initiative...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-[1080px] mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-4xl font-bold text-text-primary font-literata">
          {mode === 'create' ? 'Create Initiative' : 'Edit Initiative'}
        </h1>
        <p className="text-text-secondary mt-2">Capture initiative context, showcase slides, and configure demo setup.</p>
      </div>

      <div className="bg-white rounded-3xl border border-border shadow-sm p-8 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="AI-Award Paper"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2">Stage</label>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value as (typeof INITIATIVE_STAGES)[number])}
            className="w-full px-4 py-3 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {INITIATIVE_STAGES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2">Target User Groups</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {targetGroups.map((group) => (
              <span key={group} className="px-3 py-1 rounded-full bg-surface border border-border text-sm text-text-primary flex items-center gap-2">
                {group}
                <button type="button" onClick={() => removeTargetGroup(group)} className="text-text-tertiary hover:text-coral-text">
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={targetGroupInput}
              onChange={(e) => setTargetGroupInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTargetGroup();
                }
              }}
              className="flex-1 px-4 py-3 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Type group and press Enter"
            />
            <button type="button" onClick={addTargetGroup} className="px-4 py-2 rounded-2xl border border-border hover:bg-surface">
              Add
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2">Narrative (Markdown)</label>
          <textarea
            value={narrativeMd}
            onChange={(e) => setNarrativeMd(e.target.value)}
            rows={8}
            className="w-full px-4 py-3 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Describe the problem statement and solution hypothesis..."
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2">Demo Setup (Markdown)</label>
          <textarea
            value={demoSetupMd}
            onChange={(e) => setDemoSetupMd(e.target.value)}
            rows={6}
            className="w-full px-4 py-3 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Setup instructions, links, and notes..."
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-border shadow-sm p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-text-primary font-literata">Slides</h2>
            <p className="text-text-secondary">Up to {MAX_SLIDES} slides. Images/GIF ≤ 10MB, videos ≤ 100MB.</p>
          </div>
          <button
            type="button"
            onClick={addSlide}
            disabled={slides.length >= MAX_SLIDES}
            className="px-4 py-2 rounded-2xl bg-primary text-white disabled:opacity-50 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Slide
          </button>
        </div>

        <div className="space-y-4">
          {slides.map((slide, index) => (
            <div key={slide.localId} className="border border-border rounded-2xl p-4 space-y-4 bg-board">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-text-primary">Slide {index + 1}</h3>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => moveSlide(index, -1)} className="p-2 rounded-lg border border-border" disabled={index === 0}>
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSlide(index, 1)}
                    className="p-2 rounded-lg border border-border"
                    disabled={index === slides.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => removeSlide(slide.localId)} className="p-2 rounded-lg border border-border text-coral-text">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Slide Title</label>
                <input
                  value={slide.title}
                  onChange={(e) => updateSlide(slide.localId, { title: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-border"
                  placeholder="Feature title"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Slide Description (Markdown)</label>
                <textarea
                  value={slide.descriptionMd}
                  onChange={(e) => updateSlide(slide.localId, { descriptionMd: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 rounded-xl border border-border"
                  placeholder="What this feature demonstrates..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Media Type</label>
                <select
                  value={slide.mediaType}
                  onChange={(e) =>
                    updateSlide(slide.localId, {
                      mediaType: e.target.value as SlideMediaType,
                      videoUrl: e.target.value === 'video_url' ? slide.videoUrl : '',
                    })
                  }
                  className="w-full px-4 py-2 rounded-xl border border-border"
                >
                  <option value="image">Image</option>
                  <option value="gif">GIF</option>
                  <option value="video_upload">Video Upload (MP4)</option>
                  <option value="video_url">Video URL</option>
                </select>
              </div>

              {slide.mediaType === 'video_url' ? (
                <div>
                  <label className="block text-sm font-semibold mb-1">Video URL</label>
                  <input
                    value={slide.videoUrl}
                    onChange={(e) => updateSlide(slide.localId, { videoUrl: e.target.value, storagePath: null, file: null })}
                    placeholder="https://..."
                    className="w-full px-4 py-2 rounded-xl border border-border"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold mb-1">Upload Media</label>
                  <label className="flex items-center gap-2 px-4 py-3 border border-dashed border-border rounded-xl cursor-pointer hover:bg-surface">
                    <Upload className="h-4 w-4" />
                    <span className="text-sm text-text-secondary">Choose image/gif/video file</span>
                    <input
                      type="file"
                      className="hidden"
                      accept={slide.mediaType === 'video_upload' ? 'video/mp4' : 'image/*,image/gif,video/mp4'}
                      onChange={(e) => handleSlideFileChange(slide.localId, e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              )}

              {slide.previewUrl && (
                <div className="rounded-xl border border-border bg-white p-2">
                  {slide.mediaType === 'video_upload' || slide.mediaType === 'video_url' ? (
                    <video src={slide.previewUrl} controls className="w-full max-h-64 rounded-lg" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={slide.previewUrl} alt={slide.title || 'Slide preview'} className="w-full max-h-64 object-contain rounded-lg" />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {errorMessage && <div className="text-sm text-coral-text">{errorMessage}</div>}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 rounded-full border border-border bg-white hover:bg-surface"
        >
          Cancel
        </button>
        <button type="submit" disabled={saving} className="px-6 py-3 rounded-full bg-primary text-white disabled:opacity-50">
          {saving ? 'Saving...' : mode === 'create' ? 'Create Initiative' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
