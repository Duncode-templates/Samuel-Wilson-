import { LocalNotifications } from '@capacitor/local-notifications';
import { Chapter } from '../types';
import { saveDownload, isDownloaded } from './storage';

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
      const permission = await LocalNotifications.checkPermissions();
      if (permission.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }
    } catch (e) {
      console.error('LocalNotifications not available', e);
    }
  }

  private async sendLocalNotification(title: string, body: string) {
    try {
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
    } catch (e) {
      // Fallback to web notification if on web and granted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
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
    task.status = 'downloading';
    this.notify();

    const pages = task.chapter.pages || {};
    const pageUrls = Object.values(pages).sort();
    const totalPages = pageUrls.length;
    let loadedPages = 0;

    try {
      const downloadedBlobs = await Promise.all(
        pageUrls.map(async (url) => {
          if (task.status === 'paused') throw new Error('Paused');
          
          const response = await fetch(url as string);
          if (!response.ok) throw new Error('Failed to fetch');
          const blob = await response.blob();
          
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
}

export const downloadManager = new DownloadManager();
