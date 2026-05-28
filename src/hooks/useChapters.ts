import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, limit, startAfter, getDocs, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Chapter } from '../types';
import { getCache, setCache } from '../lib/storage';

export const useChapters = (novelId: string, batchSize: number = 10, initialChapters: Chapter[] = []) => {
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
  const [loading, setLoading] = useState(initialChapters.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);

  useEffect(() => {
    // Load from cache initially
    if (novelId && initialChapters.length === 0) {
      const loadCache = async () => {
        const cached = await getCache(`chapters-list-${novelId}`);
        if (cached) {
          setChapters(cached);
          setLoading(false);
        }
      };
      loadCache();
    }
  }, [novelId, initialChapters.length]);

  const loadMore = useCallback(async (isInitial = false) => {
    if (!novelId || (loadingMore && !isInitial) || (!hasMore && !isInitial)) return;
    
    if (isInitial && initialChapters.length > 0) {
      setLoading(false);
      return; 
    }

    if (isInitial) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const chaptersRef = collection(db, 'novels', novelId, 'chapters');
      let q = query(
        chaptersRef,
        orderBy('chapter_number', 'asc'),
        limit(batchSize)
      );

      if (!isInitial && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const newChapters: Chapter[] = [];
      
      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        const pages = data.pages || {};
        const pageUrls = Object.keys(pages)
          .sort((a, b) => parseInt(a) - parseInt(b))
          .map(key => pages[key]);
        
        // Pick random thumbnail excluding first and second images (if enough pages exist)
        let thumbnail = "";
        if (pageUrls.length > 2) {
          const eligiblePages = pageUrls.slice(2);
          thumbnail = eligiblePages[Math.floor(Math.random() * eligiblePages.length)];
        } else if (pageUrls.length > 0) {
          thumbnail = pageUrls[pageUrls.length - 1];
        }

        newChapters.push({ 
          id: docSnapshot.id, 
          ...data,
          title: "", 
          thumbnail: thumbnail
        } as Chapter);
      });

      let updatedChapters: Chapter[];
      if (isInitial) {
        updatedChapters = newChapters;
      } else {
        // Prevent duplicates
        const existingIds = new Set(chapters.map(c => c.id));
        const filteredNew = newChapters.filter(c => !existingIds.has(c.id));
        updatedChapters = [...chapters, ...filteredNew];
      }
      
      setChapters(updatedChapters);
      
      // Only cache the first few pages of chapters to keep IDB size reasonable 
      // but enough for initial view
      if (isInitial) {
        setCache(`chapters-list-${novelId}`, updatedChapters);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === batchSize);
    } catch (err) {
      console.error("Error fetching chapters:", err);
      if (chapters.length === 0) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [novelId, lastDoc, hasMore, loadingMore, batchSize, chapters]);

  useEffect(() => {
    if (novelId) {
      loadMore(true);
    }
  }, [novelId]);

  return { chapters, loading, loadingMore, hasMore, loadMore, error };
};
