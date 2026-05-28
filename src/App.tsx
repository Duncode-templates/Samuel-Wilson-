import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Home, Download, Clock, User } from 'lucide-react';
import { Comic, Chapter } from './types';
import { getDownloads } from './lib/storage';
import { useDownloadStatus } from './hooks/useDownloadStatus';
import ComicReader from './components/ComicReader';
import ExploreView from './views/ExploreView';
import SearchView from './views/SearchView';
import DownloadsView from './views/DownloadsView';
import ProfileView from './views/ProfileView';
import NovelDetailView from './views/NovelDetailView';

export default function App() {
  const [selectedComic, setSelectedComic] = useState<Comic | null>(null);
  const [showReader, setShowReader] = useState(false);
  const [initialChapterIndex, setInitialChapterIndex] = useState(0);
  const [initialChapters, setInitialChapters] = useState<Chapter[]>([]);
  const [activeTab, setActiveTab] = useState('Explore');

  const { downloadedIds } = useDownloadStatus();

  // Page switching logic
  const renderContent = () => {
    switch (activeTab) {
      case 'Search':
        return <SearchView onSelectComic={setSelectedComic} />;
      case 'Downloads':
        return <DownloadsView onSelectComic={setSelectedComic} />;
      case 'Profile':
        return <ProfileView />;
      case 'Explore':
      default:
        return <ExploreView onSelectComic={setSelectedComic} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0b] text-zinc-100 font-sans selection:bg-blue-600/30">
      {/* Sidebar/Navbar Hybrid */}
      <main className="flex-1 pb-24 md:pb-16 px-4 md:px-6 max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.3 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-2xl px-6 pt-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex items-center justify-between">
        {[
          { label: 'Home', icon: Home, id: 'Explore' },
          { label: 'Search', icon: Search, id: 'Search' },
          { label: 'Downloads', icon: Download, id: 'Downloads', badge: downloadedIds.size },
          { label: 'Profile', icon: User, id: 'Profile' }
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`relative flex flex-col items-center gap-1.5 transition-all min-w-[64px] ${
              activeTab === item.id ? 'text-blue-500' : 'text-zinc-500'
            }`}
          >
            <div className="relative">
              <item.icon size={20} strokeWidth={2} />
              {item.badge && (
                <div className="absolute -top-1 -right-1.5 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center border-2 border-black">
                  <span className="text-[8px] font-black text-white">{item.badge}</span>
                </div>
              )}
            </div>
            <span className="text-[9px] font-black tracking-widest uppercase">
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {/* Detail Overlay */}
      <AnimatePresence>
        {selectedComic && !showReader && (
          <NovelDetailView
            comic={selectedComic}
            onBack={() => setSelectedComic(null)}
            onRead={(index, chapters) => {
              setInitialChapterIndex(index || 0);
              setInitialChapters(chapters || []);
              setShowReader(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* Reader Overlay */}
      <AnimatePresence>
        {selectedComic && showReader && (
          <ComicReader
            comic={selectedComic}
            initialIndex={initialChapterIndex}
            initialChapters={initialChapters}
            onClose={() => setShowReader(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

