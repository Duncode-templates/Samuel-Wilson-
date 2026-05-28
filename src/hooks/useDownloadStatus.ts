import { useState, useEffect } from 'react';
import { getDownloads, isDownloaded } from '../lib/storage';
import { downloadManager, DownloadTask } from '../lib/downloadManager';

export const useDownloadStatus = (comicId?: string) => {
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [downloadedComicIds, setDownloadedComicIds] = useState<Set<string>>(new Set());
  const [activeTasks, setActiveTasks] = useState<DownloadTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const refresh = async () => {
      const downloads = await getDownloads();
      
      const ids = new Set<string>();
      const cids = new Set<string>();
      
      downloads.forEach(d => {
        if (!comicId || d.comicId === comicId) {
          ids.add(d.chapterId);
        }
        cids.add(d.comicId);
      });
      
      setDownloadedIds(ids);
      setDownloadedComicIds(cids);
      setLoading(false);
    };

    refresh();
    
    // Subscribe to download manager updates
    const unsubscribe = downloadManager.subscribe((tasks) => {
      // If we're tracking a specific comic, filter tasks
      const relevantTasks = comicId 
        ? tasks.filter(t => t.comicId === comicId)
        : tasks;
      setActiveTasks(relevantTasks);
      
      // If any task completed, refresh our downloaded list
      if (tasks.some(t => t.status === 'completed')) {
        refresh();
      }
    });

    return unsubscribe;
  }, [comicId]);

  return { downloadedIds, downloadedComicIds, activeTasks, isLoading: loading };
};
