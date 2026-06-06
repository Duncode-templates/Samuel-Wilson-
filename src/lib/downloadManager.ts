import { LocalNotifications } from '@capacitor/local-notifications';
import { Network } from '@capacitor/network';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { Chapter } from '../types';
import { saveDownload, isDownloaded, getSetting } from './storage';

export interface DownloadTask {
  chapter: Chapter;
  comicId: string;
  comicTitle: string;
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'error';
  progress: number;
  error?: string;
}

class DownloadManager {
  private queue: DownloadTask[] = [];
  private isProcessing: boolean = false;
  private listeners: ((tasks: DownloadTask[]) => void)[] = [];

  constructor() {
    // Request permission for local notifications
    this.initNotifications();
  }

  private async initNotifications() {
    try {
      if (!(typeof window !== 'undefined' && 'Notification' in window)) {
        return;
      }
      
      const permission = await LocalNotifications.checkPermissions();
      if (permission.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }
    } catch (e) {
      // Quietly log or ignore if not supported in this environment
      console.warn('LocalNotifications plugin init failed or not supported:', e);
    }
  }

  private async sendLocalNotification(title: string, body: string) {
    try {
      // Try local notifications first (works on native)
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Math.floor(Math.random() * 10000),
            schedule: { at: new Date(Date.now() + 100) },
            sound: 'default',
            actionTypeId: '',
            extra: null
          }
        ]
      });
    } catch (e: any) {
      // If plugin fails or says unavailable, fallback to web browser notifications
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(title, { body });
        } catch (webErr) {
          console.error('Web Notification failed', webErr);
        }
      } else {
        console.log('Notifications not available in this context');
      }
    }
  }

  public subscribe(callback: (tasks: DownloadTask[]) => void) {
    this.listeners.push(callback);
    callback([...this.queue]);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach(l => l([...this.queue]));
  }

  public async addToQueue(comicId: string, comicTitle: string, chapters: Chapter[]) {
    for (const chapter of chapters) {
      if (await isDownloaded(comicId, chapter.id)) continue;
      if (this.queue.some(t => t.chapter.id === chapter.id)) continue;

      this.queue.push({
        chapter,
        comicId,
        comicTitle,
        status: 'queued',
        progress: 0
      });
    }
    this.notify();
    this.processQueue();
    
    if (chapters.length > 0) {
      this.sendLocalNotification('Download Started', `Downloading ${chapters.length} chapters of ${comicTitle}`);
    }
  }

  public pauseAll() {
    this.queue.forEach(t => {
      if (t.status === 'downloading' || t.status === 'queued') {
        t.status = 'paused';
      }
    });
    this.notify();
  }

  public resumeAll() {
    this.queue.forEach(t => {
      if (t.status === 'paused') {
        t.status = 'queued';
      }
    });
    this.notify();
    this.processQueue();
  }

  public removeAll() {
    this.queue = [];
    this.notify();
  }

  public removeTask(chapterId: string) {
    this.queue = this.queue.filter(t => t.chapter.id !== chapterId);
    this.notify();
  }

  public retryTask(chapterId: string) {
    const task = this.queue.find(t => t.chapter.id === chapterId);
    if (task && task.status === 'error') {
      task.status = 'queued';
      task.error = undefined;
      task.progress = 0;
      this.notify();
      this.processQueue();
    }
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (true) {
      const task = this.queue.find(t => t.status === 'queued');
      if (!task) break;

      await this.downloadChapter(task);
    }

    this.isProcessing = false;
  }

  private async downloadChapter(task: DownloadTask) {
    // Check WiFi Setting
    const wifiOnly = await getSetting('download_wifi_only', true);
    if (wifiOnly) {
      try {
        const { connectionType } = await Network.getStatus();
        if (connectionType !== 'wifi' && connectionType !== 'unknown') {
          // connectionType can be 'wifi', 'cellular', 'none', 'unknown'
          // unknown often means desktop/wired which we should allow
          task.status = 'paused';
          task.error = 'Waiting for WiFi';
          this.notify();
          return;
        }
      } catch (e) {
        console.error('Network plugin failed', e);
      }
    }

    task.status = 'downloading';
    this.notify();

    const pages = task.chapter.pages || {};
    // Extract values and sort by key to ensure correct order
    const pageUrls = Object.keys(pages)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map(key => pages[key]);

    const totalPages = pageUrls.length;

    if (totalPages === 0) {
      task.status = 'error';
      task.error = 'No pages found in chapter';
      this.notify();
      return;
    }
    let loadedPages = 0;

    try {
      const downloadedBlobs = await Promise.all(
        pageUrls.map(async (url) => {
          if (task.status === 'paused') throw new Error('Paused');
          
          let blob: Blob;
          try {
            // Standardize headers for "streaming" or CDN links (AsuraScans etc.)
            const headers = {
              'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
              'Referer': 'https://asuracomic.net/',
              'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
            };

            if (Capacitor.isNativePlatform()) {
              // Use CapacitorHttp on native to bypass CORS and set restricted headers
              const options = {
                url: url as string,
                headers,
                responseType: 'blob' as const
              };
              const response = await CapacitorHttp.get(options);
              if (response.status !== 200) {
                 throw new Error(`Server error (${response.status})`);
              }
              // CapacitorHttp returns the blob data in 'data' field when responseType is blob
              // but we need to convert it to a real Blob object
              const base64 = response.data;
              const response_blob = await fetch(`data:${response.headers['Content-Type'] || 'image/jpeg'};base64,${base64}`);
              blob = await response_blob.blob();
            } else {
              // Web fallback (subject to CORS)
              const response = await fetch(url as string, {
                headers,
                mode: 'cors',
                credentials: 'omit'
              });
              if (!response.ok) throw new Error(`Server error (${response.status})`);
              blob = await response.blob();
            }
          } catch (e) {
            console.error('Download failed for URL:', url, e);
            throw new Error(`Connection failed for page`);
          }
          
          // Convert to base64 for storage (or stick to Blob if using IDB properly, 
          // but base64 is safer for cross-browser storage serialization in some cases)
          // Actually let's use data URLs for simplicity in the reader
          const reader = new FileReader();
          return new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          }).then(dataUrl => {
            loadedPages++;
            task.progress = Math.round((loadedPages / totalPages) * 100);
            this.notify();
            return dataUrl;
          });
        })
      );

      await saveDownload({
        comicId: task.comicId,
        chapterId: task.chapter.id,
        chapterNumber: task.chapter.chapter_number,
        downloadedAt: Date.now(),
        pages: downloadedBlobs,
        chapter: task.chapter
      });

      task.status = 'completed';
      this.queue = this.queue.filter(t => t.chapter.id !== task.chapter.id);
      this.notify();

      if (this.queue.length === 0) {
        this.sendLocalNotification('Download Complete', `Successfully downloaded ${task.comicTitle}`);
      }
    } catch (error: any) {
      if (error.message === 'Paused') return;
      task.status = 'error';
      task.error = error.message;
      this.notify();
    }
  }

  public async sendNewChapterNotification(comicTitle: string, chapterNumber: number, comicId?: string) {
     const title = 'New Chapter!';
     const body = `Chapter ${chapterNumber} of ${comicTitle} is now available.`;
     
     await this.sendLocalNotification(title, body);
     
     // Persist to IDB for the app's notification center
     try {
       const { addNotification } = await import('./storage');
       await addNotification({
         id: `${comicId || 'novel'}-${chapterNumber}-${Date.now()}`,
         title,
         body,
         time: Date.now(),
         unread: true,
         type: 'new_chapter',
         comicId,
         chapterNumber
       });
     } catch (e) {
       console.error('Failed to persist notification', e);
     }
  }
}

export const downloadManager = new DownloadManager();
