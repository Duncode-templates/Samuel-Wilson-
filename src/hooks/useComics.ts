import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Comic } from '../types';
import { getCache, setCache } from '../lib/storage';

export const useComics = () => {
  const [comics, setComics] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Try loading from cache first for instant UI
    const loadCache = async () => {
      const cached = await getCache('comics-list');
      if (cached) {
        setComics(cached);
        setLoading(false);
      }
    };
    loadCache();

    const q = query(
      collection(db, 'novels'), 
      orderBy('last_updated', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const comicData: Comic[] = [];
      snapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() } as Comic;
        comicData.push(data);
      });
      
      setComics(comicData);
      setCache('comics-list', comicData);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching novels:", err);
      // If we have cached data, don't show error to user
      if (comics.length === 0) {
        setError(err as Error);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { comics, loading, error };
};
