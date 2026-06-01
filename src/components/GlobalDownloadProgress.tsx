import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Pause, Play, CheckCircle2, AlertCircle, Loader2, RotateCcw } from 'lucide-react';
import { downloadManager, DownloadTask } from '../lib/downloadManager';
import { useDownloadStatus } from '../hooks/useDownloadStatus';

const GlobalDownloadProgress: React.FC = () => {
  const { activeTasks } = useDownloadStatus();
  const [isVisible, setIsVisible] = useState(false);
  const [lastCompletedTask, setLastCompletedTask] = useState<DownloadTask | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (activeTasks.length > 0) {
      setIsVisible(true);
    } else {
      // Keep visible for a moment after finishing
      const timer = setTimeout(() => setIsVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [activeTasks.length]);

  // Track completions for toast notifications
  useEffect(() => {
    const completed = activeTasks.find(t => t.status === 'completed');
    if (completed) {
      setLastCompletedTask(completed);
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [activeTasks]);

  if (!isVisible && !showToast) return null;

  const downloadingTasks = activeTasks.filter(t => t.status === 'downloading' || t.status === 'queued' || t.status === 'paused');
  const errorTasks = activeTasks.filter(t => t.status === 'error');

  if (downloadingTasks.length === 0 && errorTasks.length === 0 && !showToast) return null;

  const currentTask = downloadingTasks[0] || errorTasks[0];
  const totalProgress = downloadingTasks.reduce((acc, curr) => acc + curr.progress, 0) / (downloadingTasks.length || 1);

  return (
    <>
      {/* Toast Notification for completions */}
      <AnimatePresence>
        {showToast && lastCompletedTask && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="fixed bottom-24 left-4 right-4 z-[100] md:left-auto md:right-6 md:w-80"
          >
            <div className="bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500/50 backdrop-blur-lg">
              <div className="bg-white/20 p-1.5 rounded-full">
                <CheckCircle2 size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Download Ready</p>
                <p className="text-xs font-bold truncate">Chapter {lastCompletedTask.chapter.chapter_number} of {lastCompletedTask.comicTitle}</p>
              </div>
              <button onClick={() => setShowToast(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Progress Bar */}
      <AnimatePresence>
        {isVisible && currentTask && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-4 right-4 z-[90] md:left-auto md:right-6 md:bottom-20 md:w-80"
          >
            <div className="bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${currentTask.status === 'error' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'}`}>
                      {currentTask.status === 'downloading' ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : currentTask.status === 'error' ? (
                        <AlertCircle size={18} />
                      ) : (
                        <Download size={18} />
                      )}
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        {currentTask.status === 'paused' ? 'Paused' : currentTask.status === 'error' ? 'Failed' : 'Downloading'}
                        {downloadingTasks.length > 1 && ` • ${downloadingTasks.length} left`}
                      </h4>
                      <p className="text-xs font-bold text-white truncate max-w-[150px]">
                        {currentTask.comicTitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {currentTask.status === 'paused' ? (
                      <button
                        onClick={() => downloadManager.resumeAll()}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                      >
                        <Play size={16} fill="currentColor" />
                      </button>
                    ) : (
                      <button
                        onClick={() => downloadManager.pauseAll()}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                      >
                        <Pause size={16} fill="currentColor" />
                      </button>
                    )}
                    {currentTask.status === 'error' && (
                      <button
                        onClick={() => downloadManager.retryTask(currentTask.chapter.id)}
                        className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                      >
                        <RotateCcw size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => downloadManager.removeAll()}
                      className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[9px] font-black uppercase tracking-tighter text-zinc-500">
                    <span>{currentTask.status === 'error' ? currentTask.error : `Chapter ${currentTask.chapter.chapter_number}`}</span>
                    <span>{Math.round(totalProgress)}%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${totalProgress}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        currentTask.status === 'error' ? 'bg-red-500' :
                        currentTask.status === 'paused' ? 'bg-zinc-600' : 'bg-blue-600'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GlobalDownloadProgress;
