import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronLeft, Play, Download, CheckCircle2, Loader2, ArrowRight, 
  Pause, RotateCcw, Trash2, XCircle, CheckSquare, Square
} from 'lucide-react';
import { Comic, Chapter } from '../types';
import { useChapters } from '../hooks/useChapters';
import { getDownloads, DownloadedChapter, getReadingProgress, removeDownload, clearAllDownloads } from '../lib/storage';
import { downloadManager, DownloadTask } from '../lib/downloadManager';
import { useDownloadStatus } from '../hooks/useDownloadStatus';
import Skeleton from '../components/Skeleton';
import OfflineReader from '../components/OfflineReader';

interface NovelDetailViewProps {
  comic: Comic;
  onBack: () => void;
  onRead: (initialIndex?: number, chapters?: Chapter[]) => void;
}

const NovelDetailView: React.FC<NovelDetailViewProps> = ({ comic, onBack, onRead }) => {
  const { chapters, loading, hasMore, loadMore, loadingMore } = useChapters(comic.id, 15);
  const [activeTab, setActiveTab] = useState<'preview' | 'episodes' | 'download'>('episodes');
  const [selectedDownload, setSelectedDownload] = useState<DownloadedChapter | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<string>>(new Set());
  
  const { downloadedIds, activeTasks } = useDownloadStatus(comic.id);

  const readingProgress = getReadingProgress(comic.id);
  const readChapterIds = readingProgress?.readChapterIds || [];
  const lastIndex = readingProgress?.lastChapterIndex || 0;

  const handleDownload = (chapter: Chapter) => {
    if (downloadedIds.has(chapter.id)) return;
    downloadManager.addToQueue(comic.id, comic.title, [chapter]);
  };

  const toggleSelection = (chapterId: string) => {
    setSelectedChapterIds(prev => {
      const next = new Set(prev);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
  };

  const handleBulkDownload = () => {
    const chaptersToDownload = chapters.filter(c => selectedChapterIds.has(c.id) && !downloadedIds.has(c.id));
    downloadManager.addToQueue(comic.id, comic.title, chaptersToDownload);
    setSelectionMode(false);
    setSelectedChapterIds(new Set());
  };

  const handleBulkDelete = async () => {
    for (const id of selectedChapterIds) {
      await removeDownload(comic.id, id);
    }
    setSelectionMode(false);
    setSelectedChapterIds(new Set());
  };

  const handleChapterClick = async (chapter: Chapter) => {
    if (selectionMode) {
      toggleSelection(chapter.id);
      return;
    }
    const downloads = await getDownloads(comic.id);
    const download = downloads.find(d => d.chapterId === chapter.id);
    
    if (download) {
      setSelectedDownload(download);
    } else {
      const idx = chapters.findIndex(c => c.id === chapter.id);
      onRead(idx !== -1 ? idx : 0, chapters); 
    }
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

  const previewPages = chapters[0]?.pages ? Object.entries(chapters[0].pages)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([_, url]) => url as string) : [];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#0a0a0b] overflow-y-auto"
    >
      {/* Navigation Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-12 bg-[#0a0a0b] border-b border-white/[0.05]">
        <button 
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center text-white"
        >
          <ChevronLeft size={28} />
        </button>
      </nav>

      {/* Main Content Container */}
      <div className="max-w-xl mx-auto pt-4 px-5 pb-32">
        {/* Centered Cover Image */}
        <div className="flex justify-center mb-8 relative">
          <div className="mt-12 w-[260px] aspect-[2/3] rounded-xl overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] border border-white/[0.08]">
            <img 
              src={comic.cover_url} 
              alt={comic.title} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              loading="eager"
            />
          </div>
        </div>

        {/* Left Aligned Metadata */}
        <div className="space-y-4 mb-10">
          <div>
            <h1 className="text-3xl font-black text-white mb-1 leading-tight tracking-tight">
              {comic.title}
            </h1>
            <p className="text-zinc-400 text-sm font-bold tracking-tight">
              Webtoon Studio, Authors Unknown
            </p>
          </div>

          <p className="text-zinc-200 text-[15px] leading-relaxed line-clamp-4 font-medium">
            {comic.description}
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {Array.isArray(comic.genres) && comic.genres.map(genre => (
              <span key={genre} className="px-3 py-1.5 bg-zinc-900 text-zinc-400 text-[12px] font-bold rounded-lg border border-white/[0.03]">
                {genre}
              </span>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-12 bg-[#0a0a0b] z-40 border-b border-white/[0.05] mb-6">
          <div className="flex items-center">
            <button 
              onClick={() => setActiveTab('preview')}
              className={`flex-1 pb-3 text-sm font-black tracking-tight transition-all relative ${
                activeTab === 'preview' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Preview
              {activeTab === 'preview' && (
                <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white rounded-full" />
              )}
            </button>
            <button 
              onClick={() => setActiveTab('episodes')}
              className={`flex-1 pb-3 text-sm font-black tracking-tight transition-all relative ${
                activeTab === 'episodes' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Contents
              {activeTab === 'episodes' && (
                <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white rounded-full" />
              )}
            </button>
            <button 
              onClick={() => setActiveTab('download')}
              className={`flex-1 pb-3 text-sm font-black tracking-tight transition-all relative ${
                activeTab === 'download' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Download
              {activeTab === 'download' && (
                <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'episodes' && (
          <div className="space-y-6">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-2">
                  <Skeleton className="w-8 h-5 italic" />
                  <Skeleton className="w-20 h-14 rounded-md" />
                  <Skeleton className="flex-1 h-5" />
                </div>
              ))
            ) : (
              chapters.map((ch, idx) => {
                const isRead = readChapterIds.includes(ch.id);
                return (
                  <div
                    key={ch.id}
                    onClick={() => handleChapterClick(ch)}
                    className="flex items-center gap-4 group cursor-pointer active:opacity-60 transition-opacity"
                  >
                    <div className={`w-8 text-[15px] font-black italic flex-shrink-0 ${idx === 0 ? 'text-blue-500' : isRead ? 'text-zinc-600' : 'text-zinc-200'}`}>
                      {idx + 1}
                    </div>
                    <div className="w-20 h-14 rounded-md bg-zinc-900 overflow-hidden border border-white/5 flex-shrink-0 relative">
                      <img 
                        src={ch.thumbnail || comic.cover_url} 
                        alt="" 
                        className={`w-full h-full object-cover transition-all ${
                          isRead ? 'grayscale opacity-30' : 'grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100'
                        }`}
                        referrerPolicy="no-referrer"
                      />
                      {isRead && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="px-1.5 py-0.5 bg-black/60 rounded text-[8px] font-black uppercase text-zinc-400 tracking-widest border border-white/10">
                            Read
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-[15px] font-black tracking-tight line-clamp-1 italic ${idx === 0 ? 'text-blue-500' : isRead ? 'text-zinc-500' : 'text-zinc-200'}`}>
                        Chapter {ch.chapter_number}
                      </h4>
                    </div>
                  </div>
                );
              })
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
        )}

        {activeTab === 'preview' && (
          <div className="space-y-4">
            {loading ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-0.5 rounded-2xl overflow-hidden border border-white/5">
                  <div className="p-4 bg-zinc-900/50 flex items-center justify-between">
                    <Skeleton className="w-32 h-4" />
                    <Skeleton className="w-16 h-4" />
                  </div>
                  <Skeleton className="w-full aspect-[3/4]" />
                </div>
              </div>
            ) : previewPages.length > 0 ? (
              <div className="flex flex-col rounded-2xl overflow-hidden border border-white/5">
                <div className="p-4 bg-zinc-900/50 flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Chapter 1 Preview</h3>
                  <button onClick={() => onRead(0, chapters)} className="text-[10px] font-bold text-blue-500 uppercase flex items-center gap-1">
                    Read Full <ArrowRight size={12} />
                  </button>
                </div>
                {previewPages.slice(0, 5).map((page, i) => (
                  <img 
                    key={i}
                    src={page} 
                    alt={`Preview Page ${i + 1}`}
                    className="w-full h-auto object-contain bg-zinc-900/10 block m-0 p-0"
                    referrerPolicy="no-referrer"
                  />
                ))}
                <div className="p-8 text-center bg-zinc-900/50 border-t border-white/5">
                  <button onClick={() => onRead(0, chapters)} className="text-sm font-black text-white hover:text-blue-400 transition-colors">
                    Continue reading to see more
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center">
                <p className="text-zinc-600 text-xs font-black uppercase tracking-[0.2em]">No Preview Available</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'download' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-500 mb-1">Download Management</h3>
                <p className="text-[10px] text-zinc-700 font-medium">Manage your offline chapters.</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setSelectionMode(!selectionMode)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter border transition-all ${
                    selectionMode ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-400 border-white/5'
                  }`}
                >
                  {selectionMode ? 'Cancel' : 'Select'}
                </button>
              </div>
            </div>

            {/* Manager Controls */}
            {!selectionMode && activeTasks.length > 0 && (
              <div className="bg-zinc-900/60 rounded-2xl border border-white/5 p-4 mb-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500">Current Queue ({activeTasks.length})</h4>
                  <div className="flex gap-2">
                    <button onClick={() => downloadManager.pauseAll()} className="p-1.5 bg-zinc-800 rounded-full text-zinc-400 hover:text-white"><Pause size={14} /></button>
                    <button onClick={() => downloadManager.resumeAll()} className="p-1.5 bg-zinc-800 rounded-full text-zinc-400 hover:text-white"><RotateCcw size={14} /></button>
                    <button onClick={() => downloadManager.removeAll()} className="p-1.5 bg-zinc-800 rounded-full text-zinc-400 hover:text-red-500"><XCircle size={14} /></button>
                  </div>
                </div>

                {activeTasks.slice(0, 3).map(task => (
                  <div key={task.chapter.id} className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-white">Chapter {task.chapter.chapter_number}</span>
                      <span className="text-zinc-500">{task.status === 'downloading' ? `${task.progress}%` : task.status}</span>
                    </div>
                    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${task.progress}%` }}
                        className={`h-full ${task.status === 'downloading' ? 'bg-blue-500' : 'bg-zinc-600'}`}
                      />
                    </div>
                  </div>
                ))}
                {activeTasks.length > 3 && (
                  <p className="text-[9px] text-zinc-600 font-bold uppercase text-center">+ {activeTasks.length - 3} more in queue</p>
                )}
              </div>
            )}

            {/* Bulk Action Bar */}
            {selectionMode && (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex gap-2 mb-6"
              >
                <button 
                  onClick={handleBulkDownload}
                  disabled={selectedChapterIds.size === 0}
                  className="flex-1 h-10 bg-blue-600 disabled:opacity-30 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <Download size={14} /> Download ({selectedChapterIds.size})
                </button>
                <button 
                  onClick={handleBulkDelete}
                  disabled={selectedChapterIds.size === 0}
                  className="flex-1 h-10 bg-zinc-800 disabled:opacity-30 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </motion.div>
            )}

            <div className="space-y-2">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 bg-zinc-900/20 rounded-xl border border-white/[0.03]">
                    <Skeleton className="w-10 h-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                       <Skeleton className="w-24 h-4" />
                       <Skeleton className="w-16 h-2" />
                    </div>
                  </div>
                ))
              ) : (
                chapters.map((ch) => {
                  const downloaded = downloadedIds.has(ch.id);
                  const task = activeTasks.find(t => t.chapter.id === ch.id);
                  const isSelected = selectedChapterIds.has(ch.id);
                  
                  return (
                    <div 
                      key={ch.id}
                      onClick={() => selectionMode && toggleSelection(ch.id)}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        selectionMode ? isSelected ? 'bg-blue-500/10 border-blue-500/30' : 'bg-zinc-900/20 border-white/5' : 'bg-zinc-900/40 border-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {selectionMode ? (
                          <div className={isSelected ? 'text-blue-500' : 'text-zinc-700'}>
                            {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                          </div>
                        ) : (
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black italic text-xs ${
                            downloaded ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-500'
                          }`}>
                            #{ch.chapter_number}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-white leading-none mb-1">Episode {ch.chapter_number}</p>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">
                            {task ? `Downloading... ${task.progress}%` : downloaded ? 'Downloaded' : `${ch.total_pages} Pages`}
                          </p>
                        </div>
                      </div>
                      
                      {!selectionMode && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(ch);
                          }}
                          disabled={downloaded || !!task}
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                            downloaded 
                              ? 'text-emerald-500 bg-emerald-500/5' 
                              : task 
                                ? 'text-blue-500 bg-blue-500/5' 
                                : 'text-zinc-600 bg-zinc-800 hover:text-white hover:bg-zinc-700'
                          }`}
                        >
                          {task ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : downloaded ? (
                            <CheckCircle2 size={18} />
                          ) : (
                            <Download size={18} />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {hasMore && !loading && (
              <div className="pt-4 pb-8 flex justify-center">
                <button 
                  onClick={() => loadMore()}
                  disabled={loadingMore}
                  className="px-8 h-12 rounded-xl bg-zinc-900 border border-white/5 text-zinc-400 text-xs font-black uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2"
                >
                  {loadingMore ? <Loader2 size={14} className="animate-spin" /> : null}
                  {loadingMore ? 'Loading...' : 'View More' }
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Bottom Action */}
      {activeTab === 'preview' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent z-50">
          <div className="max-w-xl mx-auto">
            <button 
              onClick={() => onRead(lastIndex, chapters)}
              className="w-full bg-white hover:bg-zinc-200 text-black h-14 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-2xl"
            >
              <Play size={18} fill="black" />
              Continue Reading
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default NovelDetailView;
