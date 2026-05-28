import React, { useMemo } from 'react';
import { Star, Clock, Zap, RefreshCw, Users, Layers, CheckCircle2, TrendingUp, ChevronRight, Maximize2 } from 'lucide-react';
import { useComics } from '../hooks/useComics';
import { Comic } from '../types';
import ComicCard from '../components/ComicCard';
import { getActivityCounts, getAllProgress, trackActivity } from '../lib/storage';
import Skeleton from '../components/Skeleton';

interface ExploreViewProps {
  onSelectComic: (comic: Comic) => void;
}

const ExploreView: React.FC<ExploreViewProps> = ({ onSelectComic }) => {
  const { comics, loading } = useComics();
  const [selectedGenre, setSelectedGenre] = React.useState<string | null>(null);

  const analytics = useMemo(() => getActivityCounts(7), [loading]);
  const progress = useMemo(() => getAllProgress(), [loading]);

  const handleSelectComic = (comic: Comic) => {
    trackActivity(comic.id, 'click');
    onSelectComic(comic);
  };

  const GENRES = useMemo(() => {
    const allGenres = new Set<string>();
    allGenres.add('All');
    comics.forEach(comic => {
      if (Array.isArray(comic.genres)) {
        comic.genres.forEach(genre => allGenres.add(genre));
      }
    });
    return Array.from(allGenres);
  }, [comics]);

  // Section Logic
  const continueReading = useMemo(() => {
    if (!comics.length) return [];
    const inProgress = progress
      .filter(p => p.lastChapterIndex < p.totalChapters - 1)
      .sort((a, b) => b.lastReadAt - a.lastReadAt);
    
    return inProgress
      .map(p => comics.find(c => c.id === p.comicId))
      .filter(Boolean) as Comic[];
  }, [comics, progress]);

  const newlyReleased = useMemo(() => {
    return [...comics].sort((a, b) => (b.created_at || 0) - (a.created_at || 0)).slice(0, 14);
  }, [comics]);

  const lastUpdated = useMemo(() => {
    return [...comics].sort((a, b) => (b.last_updated || 0) - (a.last_updated || 0)).slice(0, 14);
  }, [comics]);

  const beingReadNow = useMemo(() => {
    const { views } = analytics;
    return [...comics]
      .sort((a, b) => (views[b.id] || 0) - (views[a.id] || 0))
      .slice(0, 14);
  }, [comics, analytics]);

  const bingeContent = useMemo(() => {
    // Determine most clicked genres
    const genreClicks: Record<string, number> = {};
    const { clicks } = analytics;
    
    comics.forEach(c => {
      const clickCount = clicks[c.id] || 0;
      if (clickCount > 0 && Array.isArray(c.genres)) {
        c.genres.forEach(g => {
          genreClicks[g] = (genreClicks[g] || 0) + clickCount;
        });
      }
    });

    const topGenres = Object.entries(genreClicks)
      .sort((a, b) => b[1] - a[1])
      .map(e => e[0]);

    if (!topGenres.length) return comics.slice(0, 20);

    // Filter comics that match top genres
    return comics.filter(c => 
      Array.isArray(c.genres) && c.genres.some(g => topGenres.includes(g))
    ).slice(0, 20);
  }, [comics, analytics]);

  const popular = useMemo(() => {
    const { clicks, views } = getActivityCounts(30); // 30 days for popular
    return [...comics]
      .sort((a, b) => {
        const scoreA = (clicks[a.id] || 0) + (views[a.id] || 0);
        const scoreB = (clicks[b.id] || 0) + (views[b.id] || 0);
        return scoreB - scoreA;
      })
      .slice(0, 14);
  }, [comics]);

  const recommendations = useMemo(() => {
    if (loading || !comics.length) return [];
    
    // Default fallback to popular picks when recents are disabled
    return popular.slice(0, 14);
  }, [comics, loading, popular]);

  if (loading) {
    return (
      <div className="animate-in fade-in duration-700">
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-12 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-xl">
          <Skeleton className="w-24 h-5" />
          <Skeleton className="w-8 h-8 rounded-full" />
        </nav>

        <div className="mt-16 px-4 space-y-12">
          {/* Section 1 Skeleton */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="w-48 h-8" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="w-full aspect-[2/3] rounded-xl" />
                  <Skeleton className="w-3/4 h-4" />
                  <Skeleton className="w-1/2 h-3" />
                </div>
              ))}
            </div>
          </section>

          {/* Section 2 Skeleton (Scroll) */}
          <section>
            <Skeleton className="w-40 h-8 mb-6" />
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="min-w-[140px] space-y-3">
                  <Skeleton className="w-full aspect-[2/3] rounded-xl" />
                  <Skeleton className="w-3/4 h-4" />
                </div>
              ))}
            </div>
          </section>

          {/* Section 3 Skeleton (List) */}
          <section>
            <Skeleton className="w-44 h-8 mb-6" />
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-zinc-900/20 border border-white/5 rounded-2xl">
                  <Skeleton className="w-12 h-12 rounded-xl" />
                  <Skeleton className="w-14 h-20 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="w-1/3 h-3" />
                    <Skeleton className="w-3/4 h-5" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  const RenderSection = ({ 
    title, 
    icon: Icon, 
    color, 
    comics: sectionComics, 
    genres = [],
    layout = 'scroll' 
  }: { 
    title: string; 
    icon: any; 
    color: string; 
    comics: Comic[];
    genres?: string[];
    layout?: 'scroll' | 'grid' | 'list';
  }) => {
    // Show "View All" ONLY for "Continue Reading" and "Completed"
    const showViewAll = title === 'Continue Reading' || title === 'Completed';
    const isBingeSection = title === 'Binge the series';

    let filteredComics = sectionComics;
    
    if (isBingeSection) {
      if (selectedGenre && selectedGenre !== 'All') {
        // Filter from ENTIRE database for Binge section when genre selected
        filteredComics = comics.filter(c => Array.isArray(c.genres) && c.genres.includes(selectedGenre));
      } else {
        // Default binge list (calculated bingeContent)
        filteredComics = bingeContent;
      }
    }
    
    if (filteredComics.length === 0 && title !== 'Binge the series') return null;

    return (
      <section className="mb-8 md:mb-12 last:mb-0">
        <div className="flex items-center justify-between mb-4 md:mb-6 px-1">
          <h2 className="text-xl md:text-2xl font-black flex items-center gap-3 uppercase italic tracking-tighter">
            <Icon className={color} size={24} />
            {title}
          </h2>
          {showViewAll && (
            <button className="text-zinc-600 hover:text-zinc-400 transition-colors">
              <ChevronRight size={24} />
            </button>
          )}
        </div>
        
        {isBingeSection && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                  (selectedGenre === genre || (genre === 'All' && !selectedGenre))
                    ? 'bg-pink-600 border-pink-500 text-white shadow-[0_0_15px_rgba(219,39,119,0.3)]'
                    : 'bg-zinc-900 border-white/5 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        )}

        {layout === 'scroll' && (
          <div className="flex gap-3 md:gap-6 overflow-x-auto pb-4 scrollbar-hide">
            {filteredComics.map((comic) => (
              <div key={comic.id} className="min-w-[110px] md:min-w-[200px] w-[110px] md:w-[200px]">
                <ComicCard
                  comic={comic}
                  onClick={handleSelectComic}
                />
              </div>
            ))}
          </div>
        )}

        {layout === 'grid' && (
          <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
            {filteredComics.map((comic) => (
              <ComicCard
                key={comic.id}
                comic={comic}
                onClick={handleSelectComic}
              />
            ))}
          </div>
        )}

        {layout === 'list' && (
          <div className="flex flex-col gap-3">
            {filteredComics.map((comic, idx) => {
              const isTop3 = idx < 3;
              return (
                <div 
                  key={comic.id} 
                  onClick={() => handleSelectComic(comic)}
                  className="flex items-center gap-4 p-3 bg-zinc-900/40 border border-white/5 rounded-2xl group cursor-pointer hover:bg-zinc-900 transition-all hover:scale-[1.01]"
                >
                  <div className={`
                    w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl font-black italic text-xl
                    ${idx === 0 ? 'bg-yellow-500 text-black shadow-[0_0_20px_rgba(234,179,8,0.4)]' : ''}
                    ${idx === 1 ? 'bg-zinc-300 text-black' : ''}
                    ${idx === 2 ? 'bg-orange-600 text-white' : ''}
                    ${!isTop3 ? 'bg-zinc-800 text-zinc-500' : ''}
                  `}>
                    {idx + 1}
                  </div>
                  <div className="w-14 h-20 flex-shrink-0 overflow-hidden rounded-lg">
                    <img 
                      src={comic.cover_url} 
                      alt={comic.title} 
                      className="w-full h-full object-cover transition-transform" 
                      referrerPolicy="no-referrer" 
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{Array.isArray(comic.genres) ? comic.genres[0] : 'Novel'}</span>
                    <h3 className="text-sm font-bold truncate group-hover:text-blue-400 transition-colors uppercase italic tracking-tighter">{comic.title}</h3>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star size={12} fill="currentColor" />
                      <span className="text-[10px] font-black tracking-widest">{(9.8 - idx * 0.1).toFixed(1)}</span>
                    </div>
                    <span className="text-[8px] font-bold text-zinc-600 uppercase">1.2M Reads</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="animate-in fade-in duration-700">
      {/* Custom Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-12 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] text-xs italic">C</div>
          <span className="text-base font-black italic tracking-tighter uppercase">Explore</span>
        </div>
        <button 
          onClick={() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(() => {});
            } else {
              document.exitFullscreen().catch(() => {});
            }
          }}
          className="p-2 text-zinc-500 hover:text-white transition-colors"
        >
          <Maximize2 size={18} />
        </button>
      </nav>

      <div className="mt-12">
        <RenderSection 
          title="Top picks for you" 
          icon={Star} 
          color="text-yellow-500" 
          comics={recommendations}
          layout="grid"
        />

      <RenderSection 
        title="Continue Reading" 
        icon={Clock} 
        color="text-blue-500" 
        comics={continueReading} 
      />

      <RenderSection 
        title="Newly Released" 
        icon={Zap} 
        color="text-orange-500" 
        comics={newlyReleased} 
      />

      <RenderSection 
        title="Last Updated" 
        icon={RefreshCw} 
        color="text-green-500" 
        comics={lastUpdated}
      />

      <RenderSection 
        title="Being read right now" 
        icon={Users} 
        color="text-purple-500" 
        comics={beingReadNow}
      />

      <RenderSection 
        title="Binge the series" 
        icon={Layers} 
        color="text-pink-500" 
        comics={bingeContent}
        genres={GENRES}
      />

      <RenderSection 
        title="Completed" 
        icon={CheckCircle2} 
        color="text-emerald-500" 
        comics={comics.slice(0, 14)} 
      />

        <RenderSection 
          title="Popular" 
          icon={TrendingUp} 
          color="text-red-500" 
          comics={popular} 
        />
      </div>
    </div>
  );
};

export default ExploreView;
