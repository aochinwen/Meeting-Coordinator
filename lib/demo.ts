export const INITIATIVE_STAGES = [
  'Concept',
  'POC',
  'POV',
  'Production',
  'Paused',
  'Cancelled',
] as const;

export type InitiativeStage = (typeof INITIATIVE_STAGES)[number];

export const MAX_SLIDES = 15;
export const MAX_IMAGE_GIF_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export type SlideMediaType = 'image' | 'gif' | 'video_upload' | 'video_url';

export function normalizeTargetGroups(groups: string[]): string[] {
  const seen = new Set<string>();

  return groups
    .map((group) => group.trim())
    .filter(Boolean)
    .filter((group) => {
      const normalized = group.toLowerCase();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
}

export function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
