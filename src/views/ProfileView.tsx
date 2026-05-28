import React from 'react';
import { User, Settings, Shield, CreditCard, HelpCircle, LogOut, ChevronRight, Bookmark, Heart, MessageSquare } from 'lucide-react';

const ProfileView: React.FC = () => {
  return (
    <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 -mx-4 md:mx-0">
      {/* Custom Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center px-4 h-14 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-xl">
        <h1 className="text-lg font-bold text-zinc-100 uppercase tracking-tight italic">Profile</h1>
      </nav>

      {/* Header Gradient Section */}
      <div className="relative h-64 md:h-80 min-h-[256px] w-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-8 rounded-b-[3rem] md:rounded-[3rem] mb-8 overflow-hidden mt-14">
        <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
        <div className="relative z-10 flex flex-col items-center text-center gap-6">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-bold text-white drop-shadow-md">Log into your account</h1>
            <p className="text-sm md:text-base text-white/80 font-medium">to enjoy more convenient features</p>
          </div>
          <button className="px-12 py-4 bg-white text-pink-600 font-bold rounded-xl shadow-2xl hover:bg-zinc-100 transition-all hover:scale-105 active:scale-95">
            Add an Account
          </button>
        </div>
      </div>

      <div className="flex flex-col divide-y divide-white/5 bg-zinc-900/10">
        <section className="py-2">
          <div className="flex items-center justify-between p-4 hover:bg-zinc-900/40 transition-colors group cursor-pointer">
            <span className="text-zinc-300 font-semibold group-hover:text-white">Notification Center</span>
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 bg-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">2</span>
              <ChevronRight className="text-zinc-700" size={20} />
            </div>
          </div>
          <div className="flex items-center justify-between p-4 flex-wrap">
            <span className="text-zinc-300 font-semibold">Download over Wifi Only</span>
            <div className="w-12 h-6 bg-pink-500 rounded-full relative flex items-center p-1 cursor-pointer">
              <div className="absolute right-1 w-4 h-4 bg-white rounded-full shadow-md" />
            </div>
          </div>
        </section>

        <section className="py-2">
          {['Reading Tips', 'Feedback'].map(item => (
            <div key={item} className="flex items-center justify-between p-4 hover:bg-zinc-900/40 transition-colors group cursor-pointer">
              <span className="text-zinc-300 font-semibold group-hover:text-white uppercase tracking-tight text-sm font-bold">{item}</span>
              <ChevronRight className="text-zinc-700" size={20} />
            </div>
          ))}
        </section>

        <section className="py-2">
          {['About Us', 'Disclaimer'].map(item => (
            <div key={item} className="flex items-center justify-between p-4 hover:bg-zinc-900/40 transition-colors group cursor-pointer">
              <span className="text-zinc-300 font-semibold group-hover:text-white uppercase tracking-tight text-sm font-bold">{item}</span>
              <ChevronRight className="text-zinc-700" size={20} />
            </div>
          ))}
          <div className="flex items-center justify-between p-4 hover:bg-zinc-900/40 transition-colors group cursor-pointer">
            <span className="text-zinc-300 font-semibold group-hover:text-white uppercase tracking-tight text-sm font-bold">Clear Cache</span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-zinc-500">50.44 MB</span>
              <ChevronRight className="text-zinc-700" size={20} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProfileView;
