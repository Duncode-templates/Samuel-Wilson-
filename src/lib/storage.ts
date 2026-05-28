
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Comic, Chapter } from '../types';

const PROGRESS_KEY = 'novel_reader_progress';
const ANALYTICS_KEY = 'novel_reader_analytics';
const DB_NAME = 'novel_reader_db';
const DB_VERSION = 2;

interface ReaderDB extends DBSchema {
  downloads: {
    key: string; // comicId-chapterId
    value: DownloadedChapter;
    indexes: { 'by-comic': string };
  };
  metadata: {
    key: string;
    value: {
      key: string;
      data: any;
      updatedAt: number;
    };
  };
}

export interface DownloadedChapter {
  comicId: string;
  chapterNumber: number;
  chapterId: string;
  downloadedAt: number;
  pages: string[]; // Base64 or Blob URLs (actually for high speed we should store Blobs)
  chapter: Chapter; // Store the whole metadata
}

let dbPromise: Promise<IDBPDatabase<ReaderDB>> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<ReaderDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const dlStore = db.createObjectStore('downloads', { keyPath: 'id' });
          dlStore.createIndex('by-comic', 'comicId');
        }
        if (oldVersion < 2) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
};

// Metadata Caching
export const setCache = async (key: string, data: any) => {
  const db = await getDB();
  await db.put('metadata', {
    key,
    data,
    updatedAt: Date.now()
  });
};

export const getCache = async (key: string) => {
  const db = await getDB();
  const cached = await db.get('metadata', key);
  if (!cached) return null;
  return cached.data;
};

// We'll use a composite key internally but keep the public API clean
const getCid = (comicId: string, chapterId: string) => `${comicId}-${chapterId}`;

export const saveDownload = async (download: DownloadedChapter) => {
  const db = await getDB();
  const id = getCid(download.comicId, download.chapterId);
  await db.put('downloads', { ...download, id } as any);
};

export const removeDownload = async (comicId: string, chapterId: string) => {
  const db = await getDB();
  const id = getCid(comicId, chapterId);
  await db.delete('downloads', id);
};

export const clearAllDownloads = async () => {
  const db = await getDB();
  await db.clear('downloads');
};

export const getDownloads = async (comicId?: string): Promise<DownloadedChapter[]> => {
  const db = await getDB();
  if (comicId) {
    return db.getAllFromIndex('downloads', 'by-comic', comicId);
  }
  return db.getAll('downloads');
};

export const isDownloaded = async (comicId: string, chapterId: string): Promise<boolean> => {
  const db = await getDB();
  const id = getCid(comicId, chapterId);
  const exists = await db.get('downloads', id);
  return !!exists;
};

// ... existing sync functions for progress

export interface ReadingProgress {
  comicId: string;
  lastChapterIndex: number;
  totalChapters: number;
  lastReadAt: number;
  readChapterIds: string[];
}

export interface ActivityLog {
  comicId: string;
  type: 'click' | 'view';
  timestamp: number;
}

export const updateReadingProgress = (comicId: string, chapterIndex: number, totalChapters: number, chapterId?: string) => {
  try {
    const existing = localStorage.getItem(PROGRESS_KEY);
    let progress: Record<string, ReadingProgress> = existing ? JSON.parse(existing) : {};
    
    const currentProgress = progress[comicId] || {
      comicId,
      lastChapterIndex: 0,
      totalChapters: 0,
      lastReadAt: 0,
      readChapterIds: []
    };

    const newReadChapterIds = [...currentProgress.readChapterIds];
    if (chapterId && !newReadChapterIds.includes(chapterId)) {
      newReadChapterIds.push(chapterId);
    }

    progress[comicId] = {
      comicId,
      lastChapterIndex: chapterIndex,
      totalChapters,
      lastReadAt: Date.now(),
      readChapterIds: newReadChapterIds
    };
    
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Error updating progress:', e);
  }
};

export const getReadingProgress = (comicId: string): ReadingProgress | null => {
  try {
    const existing = localStorage.getItem(PROGRESS_KEY);
    if (!existing) return null;
    const progress: Record<string, ReadingProgress> = JSON.parse(existing);
    return progress[comicId] || null;
  } catch (e) {
    return null;
  }
};

export const getAllProgress = (): ReadingProgress[] => {
  try {
    const existing = localStorage.getItem(PROGRESS_KEY);
    if (!existing) return [];
    return Object.values(JSON.parse(existing));
  } catch (e) {
    return [];
  }
};

export const trackActivity = (comicId: string, type: 'click' | 'view') => {
  try {
    const existing = localStorage.getItem(ANALYTICS_KEY);
    let logs: ActivityLog[] = existing ? JSON.parse(existing) : [];
    
    logs.push({ comicId, type, timestamp: Date.now() });
    
    // Keep only last 30 days of logs (approx)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    logs = logs.filter(log => log.timestamp > thirtyDaysAgo);
    
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('Error tracking activity:', e);
  }
};

export const getActivityCounts = (daysBack: number = 7) => {
  try {
    const existing = localStorage.getItem(ANALYTICS_KEY);
    if (!existing) return { clicks: {}, views: {} };
    
    const logs: ActivityLog[] = JSON.parse(existing);
    const cutOff = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
    
    const clicks: Record<string, number> = {};
    const views: Record<string, number> = {};
    
    logs.forEach(log => {
      if (log.timestamp < cutOff) return;
      
      const counts = log.type === 'click' ? clicks : views;
      counts[log.comicId] = (counts[log.comicId] || 0) + 1;
    });
    
    return { clicks, views };
  } catch (e) {
    return { clicks: {}, views: {} };
  }
};
