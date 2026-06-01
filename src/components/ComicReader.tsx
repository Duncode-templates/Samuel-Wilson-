import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Maximize2, 
  Minimize2, 
  List, 
  MoreVertical, 
  SkipBack, 
  SkipForward, 
  Sun, 
  Moon, 
  MessageSquare, 
  Settings,
  LayoutList,
  WifiOff,
  Bell,
  CheckCircle2
} from 'lucide-react';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Comic, Chapter } from '../types';
import { useChapters } from '../hooks/useChapters';
import { trackActivity, updateReadingProgress, getDownloads } from '../lib/storage';
import { useDownloadStatus } from '../hooks/useDownloadStatus';
import { subscribeToComments } from '../lib/comments';
import Skeleton from './Skeleton';
import CommentSection from './CommentSection';

interface ComicReaderProps {
  comic: Comic;
  initialIndex?: number;
  initialChapters?: Chapter[];
  onClose: () => void;
}

const ReaderImage: React.FC<{ src: string; index: number; onRetry: () => void }> = ({ src, index, onRetry }) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  return (
    <div className="relative w-full min-h-[400px] bg-zinc-900/10 mb-[-1px]">
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 italic">
            Retrieving Page {index + 1}
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-900/50">
          <p className="text-xs font-black uppercase tracking-widest text-red-500 italic">
            Failed to Load Page
          </p>
          <button 
            onClick={() => {
              setStatus('loading');
              onRetry();
            }}
            className="px-4 py-2 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-full active:scale-95 transition-all"
          >
            Retry Download
          </button>
        </div>
      )}

      <img
        src={src}
        alt={`Page ${index + 1}`}
        className={`w-full h-auto object-contain block m-0 p-0 transition-opacity duration-500 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
        referrerPolicy="no-referrer"
        loading="lazy"
        decoding="async"
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />
    </div>
  );
};

export default function ComicReader({ comic, initialIndex = 0, initialChapters = [], onClose }: ComicReaderProps) {
  const { chapters, loading, hasMore, loadMore, loadingMore, error } = useChapters(comic.id, 50, initialChapters);
  const [retryKey, setRetryKey] = useState(0);
  const [selectedChapterIndex, setSelectedChapterIndex] = useState(initialIndex);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showChapters, setShowChapters] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [isNightMode, setIsNightMode] = useState(true);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(2); // 1-10 scale
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpNotification, setJumpNotification] = useState<string | null>(null);
  const [offlinePages, setOfflinePages] = useState<Record<string, string[]>>({});
  const [commentCount, setCommentCount] = useState(0);
  
  const scrollContainerRef = useRef<HTMLElement>(null);
  const autoScrollRef = useRef<number | null>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { downloadedIds } = useDownloadStatus(comic.id);

  // Load offline pages into memory if available
  useEffect(() => {
    const checkOffline = async () => {
      const downloads = await getDownloads(comic.id);
      const offlineMap: Record<string, string[]> = {};
      downloads.forEach(d => {
        offlineMap[d.chapterId] = d.pages;
      });
      setOfflinePages(offlineMap);
    };
    checkOffline();
  }, [comic.id, downloadedIds]);

  const toggleUI = () => setShowUI(prev => !prev);

  // Auto Scroll Engine
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !autoScrollEnabled) {
      if (autoScrollRef.current) cancelAnimationFrame(autoScrollRef.current);
      return;
    }

    const scroll = () => {
      if (!autoScrollEnabled) return;
      
      // Speed calculation: speed value 1-10 maps to roughly 0.5 to 5 pixels per frame
      const pixelsPerFrame = autoScrollSpeed * 0.5;
      container.scrollTop += pixelsPerFrame;

      // Check if reached bottom
      if (container.scrollHeight - container.scrollTop <= container.clientHeight + 1) {
        setAutoScrollEnabled(false);
        return;
      }

      autoScrollRef.current = requestAnimationFrame(scroll);
    };

    autoScrollRef.current = requestAnimationFrame(scroll);
    
    // Hide UI when auto-scroll starts for immersive reading
    setShowUI(false);

    return () => {
      if (autoScrollRef.current) cancelAnimationFrame(autoScrollRef.current);
    };
  }, [autoScrollEnabled, autoScrollSpeed]);

  useEffect(() => {
    if (initialIndex !== 0) {
      setSelectedChapterIndex(initialIndex);
    }
  }, [initialIndex]);

  useEffect(() => {
    trackActivity(comic.id, 'view');
  }, [comic]);

  useEffect(() => {
    if (chapters.length > 0) {
      const currentChapterId = chapters[selectedChapterIndex]?.id;
      updateReadingProgress(comic.id, selectedChapterIndex, chapters.length, currentChapterId);
    }
  }, [selectedChapterIndex, chapters, comic.id]);

  const currentChapter = chapters[selectedChapterIndex];
  
  const pages = useMemo(() => {
    if (!currentChapter) return [];
    
    // Check if we have offline pages for this chapter
    if (offlinePages[currentChapter.id]) {
      return offlinePages[currentChapter.id];
    }

    if (currentChapter.pages) {
      return Object.entries(currentChapter.pages)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .map(([_, url]) => url as string);
    }
    return [];
  }, [currentChapter, offlinePages]);

  useEffect(() => {
    if (currentChapter?.id) {
      // 1. Try to load from cache immediately
      const cached = localStorage.getItem(`comment_count_${currentChapter.id}`);
      if (cached) {
        setCommentCount(parseInt(cached));
      }

      // 2. Fetch fresh count from server quickly
      import('../lib/comments').then(m => {
        m.getCommentCount(currentChapter.id).then(count => {
          setCommentCount(count);
          localStorage.setItem(`comment_count_${currentChapter.id}`, count.toString());
        });
      });

      // 3. Subscribe for real-time updates
      return subscribeToComments(currentChapter.id, (comments) => {
        setCommentCount(comments.length);
        localStorage.setItem(`comment_count_${currentChapter.id}`, comments.length.toString());
      });
    }
  }, [currentChapter?.id]);

  // Scroll tracking to update current page
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollPos = container.scrollTop + container.clientHeight / 3;
      let newPage = 1;
      
      for (let i = 0; i < pageRefs.current.length; i++) {
        const el = pageRefs.current[i];
        if (el && el.offsetTop <= scrollPos) {
          newPage = i + 1;
        } else if (el && el.offsetTop > scrollPos) {
          break;
        }
      }
      setCurrentPage(newPage);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [pages]);

  const nextChapter = () => {
    if (selectedChapterIndex < chapters.length - 1) {
      const nextIdx = selectedChapterIndex + 1;
      const nextCh = chapters[nextIdx];
      
      // Smart Jump check: if next isn't downloaded but others are, should we jump?
      // Actually the user specifically asked for jump if reaching end of CHAPTER and click next.
      // "jump to the next downloaded chapter"
      
      const nextDownloadedIdx = chapters.findIndex((c, i) => i > selectedChapterIndex && downloadedIds.has(c.id));
      
      if (nextDownloadedIdx !== -1 && nextDownloadedIdx !== nextIdx) {
        // We are jumping ahead to a downloaded chapter
        setSelectedChapterIndex(nextDownloadedIdx);
        setJumpNotification(`Jumping to Next Downloaded: Chapter ${chapters[nextDownloadedIdx].chapter_number}`);
        setTimeout(() => setJumpNotification(null), 3000);
      } else {
        setSelectedChapterIndex(nextIdx);
      }
      
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
      setCurrentPage(1);
    }
  };

  const prevChapter = () => {
    if (selectedChapterIndex > 0) {
      setSelectedChapterIndex(prev => prev - 1);
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
      setCurrentPage(1);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pageIdx = parseInt(e.target.value) - 1;
    const targetEl = pageRefs.current[pageIdx];
    if (targetEl) {
      scrollContainerRef.current?.scrollTo({ top: targetEl.offsetTop, behavior: 'auto' });
      setCurrentPage(pageIdx + 1);
    }
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedChapterIndex, chapters.length, onClose]);

  if (error) {
    return (
      <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-8 text-center text-white">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <X size={32} className="text-red-500" />
        </div>
        <h3 className="text-sm font-black uppercase tracking-[0.2em] mb-2">Service Outage</h3>
        <p className="text-xs text-zinc-500 font-medium max-w-xs mb-8">We encountered an issue while retrieving chapter details.</p>
        
        <button 
          onClick={() => loadMore(true)}
          className="flex items-center gap-2 px-6 h-12 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-full active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (loading && initialChapters.length === 0) {
    return (
      <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-8 text-center">
        <div className="w-12 h-12 border-2 border-white/20 border-t-blue-500 rounded-full animate-spin mb-6" />
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-200 italic mb-2">Initiating Reader</h3>
        <p className="text-xs text-zinc-500 font-medium max-w-xs">Fetching chapter data from secure servers. Please wait.</p>
        
        <button 
          onClick={() => window.location.reload()}
          className="mt-8 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
        >
          Taking too long? <span className="text-blue-500 underline">Reload App</span>
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[100] flex flex-col ${isNightMode ? 'bg-[#171717]' : 'bg-zinc-100'} text-white transition-colors duration-300`}
    >
      {/* Header */}
      <motion.header 
        initial={false}
        animate={{ y: showUI ? 0 : -100 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
        className={`fixed top-0 left-0 right-0 flex items-center justify-between px-4 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 ${isNightMode ? 'bg-[#171717]/90' : 'bg-white/90'} backdrop-blur-md z-[110] border-b border-white/[0.05]`}
      >
        <button
          onClick={onClose}
          className={`p-1 transition-colors rounded-full ${isNightMode ? 'text-white hover:bg-white/10' : 'text-black hover:bg-black/5'}`}
        >
          <ChevronLeft size={18} />
        </button>
        
        <div className="flex-1 text-center">
          <h2 className={`text-[11px] font-black uppercase tracking-widest italic truncate max-w-[200px] mx-auto ${isNightMode ? 'text-white' : 'text-black'}`}>
            Chapter {currentChapter?.chapter_number || '-'}
          </h2>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowChapters(!showChapters);
          }}
          className={`p-1 transition-colors rounded-full ${isNightMode ? 'text-white hover:bg-white/10' : 'text-black hover:bg-black/5'}`}
        >
          <MoreVertical size={18} />
        </button>
      </motion.header>

      {/* Chapters Side Panel - Sliding from Left */}
      <AnimatePresence>
        {showChapters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowChapters(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[115]"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`absolute top-0 bottom-0 left-0 w-[85%] max-w-sm ${isNightMode ? 'bg-[#171717]' : 'bg-white'} border-r border-white/5 z-[120] flex flex-col shadow-2xl overflow-hidden`}
            >
              {/* Drawer Header */}
              <div className="pt-[calc(1.5rem+env(safe-area-inset-top))] pb-4 px-6 border-b border-white/10">
                <div className="flex flex-col items-center">
                  <h3 className="text-[17px] font-black tracking-tight text-white mb-2 uppercase">Contents</h3>
                  <div className="w-12 h-0.5 bg-white rounded-full opacity-80" />
                </div>
              </div>

              {/* Drawer List */}
              <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
                {chapters.map((ch, idx) => (
                  <button
                    key={ch.id}
                    onClick={() => {
                      setSelectedChapterIndex(idx);
                      setShowChapters(false);
                      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
                      setCurrentPage(1);
                    }}
                    className={`w-full flex items-center gap-4 px-6 py-3 transition-colors ${
                      selectedChapterIndex === idx 
                        ? 'bg-zinc-800/50' 
                        : 'hover:bg-zinc-800/30'
                    }`}
                  >
                    <div className={`w-8 text-[15px] font-black flex-shrink-0 italic ${
                      selectedChapterIndex === idx ? 'text-blue-500' : 'text-zinc-500'
                    }`}>
                      {idx + 1}
                    </div>
                    
                    <div className="w-20 h-12 rounded bg-zinc-800 overflow-hidden flex-shrink-0 border border-white/5">
                      <img 
                        src={ch.thumbnail || comic.cover_url} 
                        alt="" 
                        className={`w-full h-full object-cover ${selectedChapterIndex === idx ? 'opacity-100' : 'opacity-40'}`}
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="flex-1 text-left min-w-0">
                      <h4 className={`text-[14px] font-black tracking-tighter leading-tight italic truncate uppercase ${
                        selectedChapterIndex === idx ? 'text-blue-500' : 'text-zinc-200'
                      }`}>
                        Chapter {ch.chapter_number}
                      </h4>
                      {ch.title && (
                        <p className={`text-[11px] font-bold truncate tracking-tight ${
                          selectedChapterIndex === idx ? 'text-blue-400/80' : 'text-zinc-500'
                        }`}>
                          {ch.title}
                        </p>
                      )}
                    </div>
                  </button>
                ))}

                {hasMore && (
                  <div className="px-6 py-4">
                    <button
                      onClick={() => loadMore()}
                      className="w-full h-12 bg-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white border border-white/5"
                    >
                      {loadingMore ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Viewer - Scrollable */}
      <main 
        ref={scrollContainerRef}
        onClick={toggleUI}
        className="flex-1 overflow-y-auto bg-[#171717] scrollbar-hide relative"
      >
        <div className="max-w-3xl mx-auto flex flex-col relative">
          {isNightMode && (
            <div className="absolute inset-0 bg-black/30 pointer-events-none z-10 transition-opacity duration-300" />
          )}
          {pages.map((page, index) => (
            <div 
              key={`${selectedChapterIndex}-${index}-${retryKey}`}
              ref={el => pageRefs.current[index] = el}
              className="w-full"
            >
              <ReaderImage 
                src={page} 
                index={index} 
                onRetry={() => setRetryKey(k => k + 1)} 
              />
            </div>
          ))}

          {/* End of chapter controls */}
          <div className="p-12 w-full flex flex-col items-center gap-6 border-t border-white/5 mt-8 bg-zinc-900/20 mb-32">
            <div className="text-center">
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">You've reached the end of</p>
              <h4 className="text-white font-black italic uppercase tracking-tighter">Chapter {currentChapter?.chapter_number}</h4>
            </div>
            
            <div className="flex gap-4 w-full max-w-xs">
              {selectedChapterIndex < chapters.length - 1 && (
                <button
                  onClick={nextChapter}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white h-12 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all flex items-center justify-center gap-2"
                >
                  Next Chapter
                  {downloadedIds.has(chapters[selectedChapterIndex + 1]?.id || '') ? <CheckCircle2 size={12} /> : null}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Jump Notification */}
        <AnimatePresence>
          {jumpNotification && (
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: -100, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-2"
            >
              <Bell size={14} className="animate-bounce" />
              {jumpNotification}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Redesigned Bottom Navigation */}
      <motion.footer 
        initial={false}
        animate={{ y: showUI ? 0 : 250 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
        className="fixed bottom-0 left-0 right-0 z-[110] flex flex-col bg-[#171717]/95 backdrop-blur-xl border-t border-white/[0.05] pb-[env(safe-area-inset-bottom)]"
      >
        {/* Slider & Chapter Progress */}
        <div className="px-6 py-2.5 space-y-2">
          <div className="flex justify-center">
             <span className="text-[12px] font-black text-white tracking-widest">
               {currentPage}/{pages.length || 1}
             </span>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={prevChapter}
              disabled={selectedChapterIndex === 0}
              className="text-white hover:text-blue-500 disabled:opacity-30 transition-colors"
            >
              <SkipBack size={20} />
            </button>

            <div className="flex-1 relative group h-6 flex items-center">
              <input 
                type="range"
                min="1"
                max={pages.length || 1}
                value={currentPage}
                onChange={handleSliderChange}
                className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white"
                style={{
                  background: `linear-gradient(to right, #ffffff ${(currentPage / (pages.length || 1)) * 100}%, #3f3f46 ${(currentPage / (pages.length || 1)) * 100}%)`
                }}
              />
            </div>

            <button 
              onClick={nextChapter}
              disabled={selectedChapterIndex === chapters.length - 1}
              className="text-white hover:text-blue-500 disabled:opacity-30 transition-colors"
            >
              <SkipForward size={20} />
            </button>
          </div>
        </div>

        {/* Action Menu */}
        <div className="flex items-center justify-around py-1.5 px-2">
          <button 
            onClick={() => setShowChapters(true)}
            className="flex flex-col items-center gap-0.5 group"
          >
            <LayoutList size={18} className="text-white group-hover:text-blue-500 transition-colors" />
            <span className="text-[7px] font-black text-white group-hover:text-blue-500 uppercase tracking-tighter">Chapters</span>
          </button>

          <button 
            onClick={() => setIsNightMode(!isNightMode)}
            className="flex flex-col items-center gap-0.5 group"
          >
            {isNightMode ? (
              <Sun size={18} className="text-white group-hover:text-blue-500 transition-colors" />
            ) : (
              <Moon size={18} className="text-white group-hover:text-blue-500 transition-colors" />
            )}
            <span className="text-[7px] font-black text-white group-hover:text-blue-500 uppercase tracking-tighter">
              {isNightMode ? 'Day' : 'Night'}
            </span>
          </button>

          <button 
            onClick={() => setShowComments(true)}
            className="flex flex-col items-center gap-0.5 group relative"
          >
            <MessageSquare size={18} className="text-white group-hover:text-blue-500 transition-colors" />
            <span className="text-[7px] font-black text-white group-hover:text-blue-500 uppercase tracking-tighter">Comments</span>
            {commentCount > 0 && (
              <div className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[8px] font-black px-1 min-w-[14px] h-[14px] rounded-full flex items-center justify-center border border-[#171717] shadow-lg">
                {commentCount}
              </div>
            )}
          </button>

          <button 
            onClick={() => setShowSettings(true)}
            className="flex flex-col items-center gap-0.5 group"
          >
            <Settings size={18} className="text-white group-hover:text-blue-500 transition-colors" />
            <span className="text-[7px] font-black text-white group-hover:text-blue-500 uppercase tracking-tighter">Settings</span>
          </button>
        </div>
      </motion.footer>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 pb-40">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#171717] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest text-white">Reader Settings</h3>
                <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Connection & Data</p>
                  <button 
                    onClick={() => {
                      setRetryKey(k => k + 1);
                      setShowSettings(false);
                    }}
                    className="w-full flex items-center justify-between p-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl border border-white/5 transition-all group"
                  >
                    <div className="text-left">
                      <div className="text-xs font-bold text-white">Force Chapter Reload</div>
                      <div className="text-[10px] text-zinc-500">Bypass cache & pull from WiFi/Mobile</div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center group-active:scale-90 transition-transform">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    </div>
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Auto Scroll</p>
                  <div className="space-y-3 p-4 bg-zinc-800 rounded-2xl border border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-white">Enable Auto Scroll</div>
                      <button 
                        onClick={() => setAutoScrollEnabled(!autoScrollEnabled)}
                        className={`w-12 h-6 rounded-full relative transition-colors ${autoScrollEnabled ? 'bg-blue-600' : 'bg-zinc-700'}`}
                      >
                        <motion.div 
                          animate={{ x: autoScrollEnabled ? 26 : 2 }}
                          className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
                        />
                      </button>
                    </div>
                    
                    {autoScrollEnabled && (
                      <div className="pt-2 space-y-2">
                        <div className="flex justify-between text-[10px] font-bold text-zinc-400">
                          <span>Speed</span>
                          <span>{autoScrollSpeed}x</span>
                        </div>
                        <input 
                          type="range"
                          min="1"
                          max="10"
                          step="0.5"
                          value={autoScrollSpeed}
                          onChange={(e) => setAutoScrollSpeed(parseFloat(e.target.value))}
                          className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Display Options</p>
                  <div className="flex items-center justify-between p-4 bg-zinc-800 rounded-2xl border border-white/5">
                    <div className="text-xs font-bold text-white">Night Mode</div>
                    <button 
                      onClick={() => setIsNightMode(!isNightMode)}
                      className={`w-12 h-6 rounded-full relative transition-colors ${isNightMode ? 'bg-blue-600' : 'bg-zinc-700'}`}
                    >
                      <motion.div 
                        animate={{ x: isNightMode ? 26 : 2 }}
                        className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-zinc-950/50">
                <p className="text-[10px] leading-relaxed text-zinc-500 italic text-center">
                  Reader is optimized for high-speed delivery. Forcing a reload consumes more data on mobile connections.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showComments && currentChapter && (
          <CommentSection 
            chapterId={currentChapter.id} 
            novelId={comic.id} 
            onClose={() => setShowComments(false)} 
          />
        )}
      </AnimatePresence>

      {/* Styles for range input */}
      <style>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s;
        }
        input[type='range']:active::-webkit-slider-thumb {
          transform: scale(1.3);
        }
      `}</style>
    </motion.div>
  );
}
