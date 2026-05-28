import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

export interface DownloadTask {
  comicId: string;
  chapterId: string;
  chapterNumber: number;
  urls: string[];
}

export const downloadChapter = async (task: DownloadTask, onProgress?: (p: number) => void) => {
  const { comicId, chapterId, urls } = task;
  const localPaths: string[] = [];

  // Create directory if on native
  if (Capacitor.isNativePlatform()) {
    try {
      await Filesystem.mkdir({
        path: `downloads/${comicId}/${chapterId}`,
        directory: Directory.Data,
        recursive: true
      });
    } catch (e) {
      // Directory might already exist
    }
  }

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const extension = url.split('.').pop()?.split('?')[0] || 'jpg';
    const fileName = `page_${i}.${extension}`;
    const filePath = `downloads/${comicId}/${chapterId}/${fileName}`;

    try {
      if (Capacitor.isNativePlatform()) {
        // Fetch the image and save to filesystem
        const response = await fetch(url);
        const blob = await response.blob();
        
        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });

        const result = await Filesystem.writeFile({
          path: filePath,
          data: base64Data,
          directory: Directory.Data
        });
        
        localPaths.push(result.uri);
      } else {
        // Web preview downloads as data URL for offline verification (limited by size)
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          localPaths.push(base64);
        } catch (webErr) {
          console.warn('Real download failed in web browser, falling back to URL', webErr);
          localPaths.push(url);
        }
      }
      
      if (onProgress) {
        onProgress(Math.round(((i + 1) / urls.length) * 100));
      }
    } catch (e) {
      console.error('Download failed for', url, e);
      // Fallback to URL if saving fails
      localPaths.push(url);
    }
  }

  return localPaths;
};
