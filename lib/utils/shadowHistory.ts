/**
 * Shadow reading analysis history – persisted for user review.
 * Uses app storage (IndexedDB via localforage); no audio blobs/URLs.
 */

import { storage } from '@/lib/utils/storage';
import type { ShadowHistoryEntry, ShadowAnalysisResult } from '@/lib/types';

const STORAGE_KEY = 'shadow_history';
const MAX_ENTRIES = 50;

export async function getShadowHistory(): Promise<ShadowHistoryEntry[]> {
  const list = await storage.getItem<ShadowHistoryEntry[]>(STORAGE_KEY, false);
  if (!Array.isArray(list)) return [];
  return list.sort((a, b) => b.timestamp - a.timestamp);
}

export async function addShadowHistoryEntry(
  challenge: { topic: string; text: string; sourceUrl?: string },
  analysis: ShadowAnalysisResult
): Promise<ShadowHistoryEntry> {
  const entry: ShadowHistoryEntry = {
    id: `shadow_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    timestamp: Date.now(),
    challenge,
    analysis: { ...analysis },
  };
  const list = await getShadowHistory();
  list.unshift(entry);
  const trimmed = list.slice(0, MAX_ENTRIES);
  await storage.setItem(STORAGE_KEY, trimmed);
  return entry;
}

export async function removeShadowHistoryEntry(id: string): Promise<void> {
  const list = await getShadowHistory();
  const filtered = list.filter((e) => e.id !== id);
  if (filtered.length === list.length) return;
  await storage.setItem(STORAGE_KEY, filtered);
}
