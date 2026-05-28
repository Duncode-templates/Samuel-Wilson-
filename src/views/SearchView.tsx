import React from 'react';
import { Search as SearchIcon, TrendingUp, History, Flame } from 'lucide-react';
import { useComics } from '../hooks/useComics';
import ComicCard from '../components/ComicCard';
import { Comic } from '../types';
import Skeleton from '../components/Skeleton';

interface SearchViewProps {
  onSelectComic: (comic: Comic) => void;
}

const SearchView: React.FC<SearchViewProps> = ({ onSelectComic }) => {
  const { comics, loading } = useComics();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);

  const filteredComics = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return comics.filter(c => 
      c.title.toLowerCase().includes(query) || 
      (Array.isArray(c.genres) && c.genres.some(g => g.toLowerCase().includes(query))) ||
      (c.author && c.author.toLowerCase().includes(query))
    ).slice(0, 20);
  }, [comics, searchQuery]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 md:gap-8 animate-in fade-in duration-500">
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center px-4 h-12 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-xl gap-4">
          <Skeleton className="w-full h-8 rounded-xl" />
        </nav>
        <div className="mt-12" />
        <section>
          <Skeleton className="w-48 h-6 mb-4" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="w-20 h-8 rounded-full" />
            ))}
          </div>
        </section>
        <section>
          <Skeleton className="w-48 h-6 mb-4" />
          <div className="space-y-4">
             <Skeleton className="w-full h-6" />
             <Skeleton className="w-full h-6" />
          </div>
        </section>
        <section>
           <Skeleton className="w-48 h-6 mb-4" />
           <div className="grid grid-cols-3 gap-3">
             {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="w-full aspect-[2/3] rounded-xl" />
             ))}
           </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Custom Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center px-4 h-12 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-xl gap-4">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for comics..."
            className="w-full py-2 pl-10 pr-3 bg-zinc-900 border border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition-all text-sm font-medium"
            autoFocus
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              <History size={14} className="rotate-45" />
            </button>
          )}
        </div>
      </nav>

      <div className="mt-12" />

      {searchQuery.trim() ? (
        <section className="animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-6 px-1">
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-500">
              Results for <span className="text-white italic">"{searchQuery}"</span>
            </h2>
            <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2 py-1 rounded">
              {filteredComics.length} Found
            </span>
          </div>

          {filteredComics.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
              {filteredComics.map(comic => (
                <ComicCard key={comic.id} comic={comic} onClick={onSelectComic} />
              ))}
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-white/5">
                <SearchIcon size={32} className="text-zinc-700" />
              </div>
              <p className="text-sm font-bold text-zinc-500 uppercase tracking-tighter italic">No matches found for your search</p>
              <p className="text-[10px] text-zinc-600 mt-1 uppercase tracking-widest">Try different keywords or genres</p>
            </div>
          )}
        </section>
      ) : (
        <>
          <section>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 uppercase italic tracking-tighter text-zinc-300">
              <TrendingUp className="text-blue-500" size={20} />
              Popular Searches
            </h2>
            <div className="flex flex-wrap gap-2">
              {['Action', 'Fantasy', 'Adventure', 'Magic', 'Isekai', 'Regression', 'Revenge'].map(tag => (
                <button 
                  key={tag} 
                  onClick={() => setSearchQuery(tag)}
                  className="px-3 py-1.5 md:px-4 md:py-2 bg-zinc-900 border border-white/5 rounded-full text-xs font-bold uppercase tracking-tight hover:bg-zinc-800 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 uppercase italic tracking-tighter text-zinc-300">
              <History className="text-zinc-500" size={20} />
              Recent Searches
            </h2>
            <div className="space-y-1">
              {['Shadow Protocol', 'Dragon Slayer'].map(search => (
                <div 
                  key={search} 
                  onClick={() => setSearchQuery(search)}
                  className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 group cursor-pointer"
                >
                  <span className="text-sm font-semibold text-zinc-400 group-hover:text-white transition-colors">{search}</span>
                  <button className="text-zinc-700 hover:text-red-500 transition-colors p-1">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 uppercase italic tracking-tighter text-zinc-300">
              <Flame className="text-orange-500" size={20} />
              Recommended for you
            </h2>
            <div className="grid grid-cols-3 gap-3 md:grid-cols-5 md:gap-6">
              {comics.slice(0, 5).map(comic => (
                <ComicCard key={comic.id} comic={comic} onClick={onSelectComic} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default SearchView;
