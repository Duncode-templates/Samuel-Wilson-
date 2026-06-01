
import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';

interface StaticPageViewProps {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}

const StaticPageView: React.FC<StaticPageViewProps> = ({ title, onBack, children }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="fixed inset-0 z-[60] bg-[#171717] flex flex-col"
    >
      <nav className="flex items-center gap-4 px-4 h-14 border-b border-white/5 bg-[#171717]/80 backdrop-blur-xl">
        <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-zinc-100 uppercase tracking-tight italic">{title}</h1>
      </nav>

      <div className="flex-1 overflow-y-auto p-6 text-zinc-400 space-y-4 leading-relaxed pb-24">
        {children}
      </div>
    </motion.div>
  );
};

export default StaticPageView;
