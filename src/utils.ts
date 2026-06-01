import { Comic } from './types';

export const getDisplayGenre = (comic: Comic) => {
  if (!comic.genres || !Array.isArray(comic.genres)) return 'Novel';
  
  // Check if any known genre is in description
  if (comic.description) {
    const desc = comic.description.toLowerCase();
    const detected = comic.genres.find(g => desc.includes(g.toLowerCase()));
    if (detected) return detected;
  }
  
  return comic.genres[0];
};

const AVATAR_COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
  'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
  'bg-orange-500', 'bg-cyan-500'
];

export const getAvatarColor = (username: string) => {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};
