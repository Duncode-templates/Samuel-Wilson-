import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Share, Settings, BookOpen, Clock } from 'lucide-react';
import { DownloadedChapter, updateReadingProgress } from '../lib/storage';
import { Capacitor } from '@capacitor/core';
import Skeleton from './Skeleton';

interface OfflineReaderProps {
  chapter: DownloadedChapter;
  comicTitle: string;
  onClose: () => void;
}

export default function OfflineReader({ chapter, comicTitle, onClose }: OfflineReaderProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Basic index tracking is not perfect here but we mark as read when opened
    updateReadingProgress(chapter.comicId, -1, -1, chapter.chapterId);
  }, [chapter]);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
        setScrollProgress(progress);
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }
    return () => container?.removeEventListener('scroll', handleScroll);
  }, []);

  const convertLocalPath = (path: string) => {
    if (Capacitor.isNativePlatform()) {
      return Capacitor.convertFileSrc(path);
    }
    return path;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-300">
      {/* Navigation Header */}
      {!isFullScreen && (
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="px-4 h-16 flex items-center justify-between border-b border-white/5 bg-black/90 backdrop-blur-xl z-50"
        >
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 -ml-2 text-zinc-400 hover:text-white">
              <ChevronLeft size={24} />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-black text-white italic truncate uppercase tracking-tight">{comicTitle}</h1>
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Chapter {chapter.chapterNumber} (Offline)</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button className="p-2 text-zinc-400"><Clock size={18} /></button>
            <button className="p-2 text-zinc-400"><Settings size={18} /></button>
          </div>
        </motion.header>
      )}

      {/* Main Content */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto bg-black scrollbar-hide"
        onClick={() => setIsFullScreen(!isFullScreen)}
      >
        <div className="max-w-3xl mx-auto flex flex-col">
          {chapter.pages.map((page, index) => (
            <img
              key={index}
              src={convertLocalPath(page)}
              alt={`Page ${index + 1}`}
              className="w-full h-auto object-contain bg-zinc-900/10 block m-0 p-0"
              referrerPolicy="no-referrer"
            />
          ))}
          
          {/* End of Chapter */}
          <div className="py-20 text-center space-y-4 px-4 bg-zinc-950/20 border-t border-white/5">
             <div className="w-12 h-1 bg-blue-500 mx-auto rounded-full" />
             <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-400">Chapter Complete</h3>
             <p className="text-[10px] text-zinc-600 font-bold max-w-[200px] mx-auto leading-relaxed italic">
               You are currently in offline mode. 
               Downloads are managed in the downloads menu.
             </p>
             <button 
               onClick={onClose}
               className="px-8 h-10 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-100 hover:bg-white/5 transition-colors"
             >
               Exit Reader
             </button>
          </div>
        </div>
      </div>

      {/* Scroll Progress Indicator */}
      <div className="fixed bottom-0 left-0 right-0 h-1 bg-zinc-900 z-50">
        <div 
          className="h-full bg-blue-500 transition-all duration-300 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
          style={{ width: `${scrollProgress}%` }} 
        />
      </div>

      {/* Footer (if not full screen) */}
      {!isFullScreen && (
        <motion.footer
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="px-4 h-14 border-t border-white/5 bg-black/90 backdrop-blur-xl flex items-center justify-between z-50"
        >
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="text-zinc-500" />
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              Offline Cache
            </span>
          </div>
          <p className="text-[10px] font-mono text-zinc-700 italic">
            {Math.round(scrollProgress)}% read
          </p>
        </motion.footer>
      )}
    </div>
  );
}
