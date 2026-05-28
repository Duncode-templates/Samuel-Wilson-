import React, { useState, useMemo, useEffect } from 'react';
import { ChevronRight, Download, CheckCircle2, Trash2, Loader2, Search, Pause, RotateCcw, XCircle } from 'lucide-react';
import { useComics } from '../hooks/useComics';
import { Comic, Chapter } from '../types';
import { useChapters } from '../hooks/useChapters';
import { getDownloads, removeDownload, DownloadedChapter, getReadingProgress } from '../lib/storage';
import { downloadManager, DownloadTask } from '../lib/downloadManager';
import { useDownloadStatus } from '../hooks/useDownloadStatus';
import Skeleton from '../components/Skeleton';
import OfflineReader from '../components/OfflineReader';

interface DownloadsViewProps {
  onSelectComic: (comic: Comic) => void;
}

const ComicChaptersList: React.FC<{ 
  comic: Comic; 
  onBack: () => void;
  onSelect: (comic: Comic) => void;
}> = ({ comic, onBack, onSelect }) => {
  const { chapters, loading, hasMore, loadMore, loadingMore } = useChapters(comic.id, 15);
  const [selectedDownload, setSelectedDownload] = useState<DownloadedChapter | null>(null);
  
  const { downloadedIds, activeTasks } = useDownloadStatus(comic.id);

  const readingProgress = getReadingProgress(comic.id);
  const readChapterIds = readingProgress?.readChapterIds || [];

  const handleDownload = (chapter: Chapter) => {
    if (downloadedIds.has(chapter.id)) return;
    downloadManager.addToQueue(comic.id, comic.title, [chapter]);
  };

  const handleDownloadAll = () => {
    const toDownload = chapters.filter(ch => !downloadedIds.has(ch.id));
    downloadManager.addToQueue(comic.id, comic.title, toDownload);
  };

  const handleChapterClick = async (chapter: Chapter) => {
    const downloads = await getDownloads(comic.id);
    const download = downloads.find(d => d.chapterId === chapter.id);
    
    if (download) {
      setSelectedDownload(download);
    } else {
      handleDownload(chapter);
    }
  };

  const handleDelete = async (chapterId: string) => {
    await removeDownload(comic.id, chapterId);
  };

  if (selectedDownload) {
    return (
      <OfflineReader 
        chapter={selectedDownload} 
        comicTitle={comic.title} 
        onClose={() => setSelectedDownload(null)} 
      />
    );
  }

  return (
    <div className="flex flex-col animate-in slide-in-from-right duration-300">
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center px-4 h-14 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-xl">
        <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white">
          <ChevronRight className="rotate-180" size={24} />
        </button>
        <h1 className="ml-2 text-sm font-bold text-zinc-100 truncate italic grow">{comic.title}</h1>
        <button 
          onClick={handleDownloadAll}
          className="px-3 py-1.5 bg-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest text-white shadow-lg active:scale-95 transition-all"
        >
          Download Chapters
        </button>
      </nav>

      <div className="mt-14 p-4">
        {activeTasks.length > 0 && (
          <div className="bg-zinc-900/40 rounded-xl p-4 border border-white/5 mb-6 space-y-3">
             <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Queue Status</span>
                <div className="flex gap-2">
                   <button onClick={() => downloadManager.pauseAll()}><Pause size={14} className="text-zinc-500" /></button>
                   <button onClick={() => downloadManager.resumeAll()}><RotateCcw size={14} className="text-zinc-500" /></button>
                </div>
             </div>
             {activeTasks.slice(0, 1).map(t => (
               <div key={t.chapter.id} className="space-y-1.5">
                  <div className="flex justify-between text-[9px] font-bold text-zinc-400">
                    <span>Downloading Ep {t.chapter.chapter_number}</span>
                    <span>{t.progress}%</span>
                  </div>
                  <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${t.progress}%` }} />
                  </div>
               </div>
             ))}
          </div>
        )}

        {loading && chapters.length === 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
            ))}
          </div>
        ) : chapters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Download className="text-zinc-800 mb-4" size={24} />
            <p className="text-zinc-500 font-black uppercase tracking-widest text-[10px]">No Chapters Available</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-x-3 gap-y-6">
            {chapters.map((ch) => {
              const downloaded = downloadedIds.has(ch.id);
              const task = activeTasks.find(t => t.chapter.id === ch.id);
              const isRead = readChapterIds.includes(ch.id);
              
              return (
                <div 
                  key={ch.id}
                  className="flex flex-col gap-2 group cursor-pointer"
                >
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900 border border-white/5 shadow-lg active:scale-95 transition-all">
                    <img 
                      src={ch.thumbnail || comic.cover_url} 
                      alt="" 
                      onClick={() => handleChapterClick(ch)}
                      className={`w-full h-full object-cover transition-all duration-500 ${
                        isRead ? 'grayscale opacity-30' : downloaded ? 'grayscale-0 opacity-100' : 'grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100'
                      }`}
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Status Overlay */}
                    <div className="absolute top-1.5 right-1.5 flex flex-col gap-1.5">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(ch);
                        }}
                        disabled={downloaded || !!task}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all backdrop-blur-md shadow-xl ${
                          downloaded 
                            ? 'text-emerald-500 bg-black/40' 
                            : task 
                              ? 'text-blue-500 bg-black/60 scale-110' 
                              : 'text-white bg-black/40 hover:bg-blue-500 transition-colors'
                        }`}
                      >
                        {task ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : downloaded ? (
                          <CheckCircle2 size={14} />
                        ) : (
                          <Download size={14} />
                        )}
                      </button>

                      {downloaded && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(ch.id);
                          }}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white bg-black/40 hover:bg-red-500/80 transition-colors backdrop-blur-md"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {isRead && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="px-1.5 py-0.5 bg-black/60 rounded text-[8px] font-black uppercase text-zinc-400 tracking-widest border border-white/10">
                          Read
                        </div>
                      </div>
                    )}
                  </div>

                  <div onClick={() => handleChapterClick(ch)} className="px-0.5 text-center">
                    <h4 className={`text-[10px] font-black tracking-tighter uppercase italic leading-tight transition-colors ${
                      isRead ? 'text-zinc-600' : downloaded ? 'text-zinc-400' : 'text-blue-500'
                    }`}>
                      {task ? `Loading...` : isRead ? `CH ${ch.chapter_number}` : downloaded ? `CH ${ch.chapter_number}` : 'Download'}
                    </h4>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasMore && !loading && (
          <div className="pt-4 pb-8 flex justify-center">
            <button 
              onClick={() => loadMore()}
              disabled={loadingMore}
              className="px-8 h-12 rounded-xl bg-zinc-900 border border-white/5 text-zinc-400 text-xs font-black uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2"
            >
              {loadingMore ? <Loader2 size={14} className="animate-spin" /> : null}
              {loadingMore ? 'Loading...' : 'Load More Episodes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const DownloadsView: React.FC<DownloadsViewProps> = ({ onSelectComic }) => {
  const { comics } = useComics();
  const [selectedComic, setSelectedComic] = useState<Comic | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalDownloadsCount, setTotalDownloadsCount] = useState(0);

  const { downloadedComicIds } = useDownloadStatus();

  // We need the actual downloads list for count metadata
  useEffect(() => {
    const getCount = async () => {
       const downloads = await getDownloads();
       setTotalDownloadsCount(downloads.length);
    };
    getCount();
  }, [downloadedComicIds]);

  const filteredComics = useMemo(() => {
    if (!searchQuery) {
      return comics.filter(c => downloadedComicIds.has(c.id));
    }
    return comics.filter(c => 
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [comics, searchQuery, downloadedComicIds]);

  if (selectedComic) {
    return <ComicChaptersList comic={selectedComic} onBack={() => setSelectedComic(null)} onSelect={onSelectComic} />;
  }

  return (
    <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center px-4 h-14 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-xl">
        <h1 className="text-lg font-bold text-zinc-100 uppercase tracking-tight italic">Downloads</h1>
      </nav>

      <div className="mt-14 px-4 py-4">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text" 
            placeholder="Search novels to download..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all font-medium"
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-500 px-1">
            {searchQuery ? 'Search Results' : 'Offline Content'}
          </h2>
          
          <div className="space-y-0">
            {filteredComics.map((comic) => {
              return (
                <div 
                  key={comic.id} 
                  onClick={() => setSelectedComic(comic)}
                  className="flex gap-5 py-6 border-b border-white/5 group cursor-pointer hover:bg-white/[0.01] transition-all px-1"
                >
                  <div className="w-24 h-32 flex-shrink-0 relative overflow-hidden rounded-md bg-zinc-900 border border-white/5 shadow-xl">
                    <img 
                      src={comic.cover_url} 
                      alt={comic.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-1 right-1 bg-emerald-500 rounded-full p-0.5 shadow-lg">
                      <CheckCircle2 size={10} className="text-white" />
                    </div>
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h3 className="text-[17px] font-black text-white group-hover:text-blue-500 transition-all line-clamp-2 uppercase italic tracking-tighter leading-[1.1]">
                        {comic.title}
                      </h3>
                      <ChevronRight className="text-zinc-800 mt-1 flex-shrink-0 group-hover:text-zinc-600 transition-colors" size={20} />
                    </div>

                    <div className="mt-auto space-y-3">
                      <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500">
                        <span>Save to Device</span>
                        <span className="font-mono italic text-[12px] tracking-tighter text-blue-500">
                          Ready
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-blue-600 rounded-full w-full" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredComics.length === 0 && (
              <div className="py-20 text-center space-y-3">
                <Download className="text-zinc-700 mx-auto" size={24} />
                <p className="text-zinc-500 font-black uppercase tracking-widest text-[10px]">No novels found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadsView;
