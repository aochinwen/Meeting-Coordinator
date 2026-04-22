import { describe, expect, it } from 'vitest';
import {
  INITIATIVE_STAGES,
  MAX_IMAGE_GIF_BYTES,
  MAX_SLIDES,
  MAX_VIDEO_BYTES,
  isValidHttpUrl,
  normalizeTargetGroups,
} from '@/lib/demo';

describe('demo utilities', () => {
  it('exposes expected constants', () => {
    expect(INITIATIVE_STAGES).toEqual(['Concept', 'POC', 'POV', 'Production', 'Paused', 'Cancelled']);
    expect(MAX_SLIDES).toBe(15);
    expect(MAX_IMAGE_GIF_BYTES).toBe(10 * 1024 * 1024);
    expect(MAX_VIDEO_BYTES).toBe(100 * 1024 * 1024);
  });

  it('normalizes and deduplicates target groups', () => {
    const result = normalizeTargetGroups([' LTA P&C ', 'lta p&c', '', 'LTA MES group']);
    expect(result).toEqual(['LTA P&C', 'LTA MES group']);
  });

  it('validates http and https URLs only', () => {
    expect(isValidHttpUrl('https://example.com/demo')).toBe(true);
    expect(isValidHttpUrl('http://example.com')).toBe(true);
    expect(isValidHttpUrl('ftp://example.com')).toBe(false);
    expect(isValidHttpUrl('not-a-url')).toBe(false);
  });
});
