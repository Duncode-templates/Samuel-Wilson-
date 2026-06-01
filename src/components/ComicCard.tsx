import React from 'react';
import { motion } from 'motion/react';
import { Comic } from '../types';
import { getDisplayGenre } from '../utils';

interface ComicCardProps {
  comic: Comic;
  onClick: (comic: Comic) => void;
}

export const ComicCard: React.FC<ComicCardProps> = ({ comic, onClick }) => {
  return (
    <div
      onClick={() => onClick(comic)}
      className="group cursor-pointer select-none"
    >
      <div className="flex flex-col gap-2 transition-transform duration-300 active:scale-95">
        <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-zinc-900 border border-white/5">
          <img
            src={comic.cover_url}
            alt={comic.title}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>
        <div className="flex flex-col gap-1 px-0.5">
          <span className="text-[8px] md:text-[10px] font-bold tracking-wider text-blue-500 uppercase">
            {getDisplayGenre(comic)}
          </span>
          <h3 className="text-[11px] md:text-sm font-bold text-zinc-100 line-clamp-1 md:line-clamp-2 leading-tight group-hover:text-blue-400 transition-colors">
            {comic.title}
          </h3>
        </div>
      </div>
    </div>
  );
};

export default ComicCard;
