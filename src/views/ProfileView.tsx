import React, { useState, useEffect } from 'react';
import { User as UserIcon, Settings, Shield, CreditCard, HelpCircle, LogOut, ChevronRight, Bookmark, Heart, MessageSquare, Bell, Info, Zap, MessageSquare as FeedbackIcon, RefreshCw } from 'lucide-react';
import { getSetting, setSetting, clearAppCache, getCache, getUnreadNotificationCount } from '../lib/storage';
import StaticPageView from './StaticPageView';
import NotificationCenter from './NotificationCenter';
import { AnimatePresence, motion } from 'motion/react';
import { auth } from '../firebase';
import { getAvatarColor } from '../utils';

const ProfileView: React.FC = () => {
  const [username, setUsername] = useState('Guest');
  const [isEditingName, setIsEditingName] = useState(false);
  const [wifiOnly, setWifiOnly] = useState(true);
  const [currentSubView, setCurrentSubView] = useState<string | null>(null);
  const [cacheSize, setCacheSize] = useState('0.44 MB');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadGuestSettings();
  }, []);

  const loadGuestSettings = async () => {
    const savedName = await getSetting('username', 'Guest');
    setUsername(savedName);
  };

  useEffect(() => {
    const loadSettings = async () => {
      const savedWifi = await getSetting('download_wifi_only', true);
      const count = await getUnreadNotificationCount();
      setWifiOnly(savedWifi);
      setUnreadCount(count);
      
      // Calculate more realistic cache size
      try {
        const metadata = await getCache('comics-list');
        const lsSize = JSON.stringify(localStorage).length;
        const countMetadata = metadata ? metadata.length : 10;
        const totalEstimate = (countMetadata * 5000 + lsSize) / (1024 * 1024);
        setCacheSize(`${totalEstimate.toFixed(2)} MB`);
      } catch (e) {
        setCacheSize('1.24 MB');
      }
    };
    loadSettings();
  }, [currentSubView]);

  const handleUpdateName = async (newName: string) => {
    setUsername(newName);
    await setSetting('username', newName);
    setIsEditingName(false);
  };

  const handleToggleWifi = async () => {
    const newValue = !wifiOnly;
    setWifiOnly(newValue);
    await setSetting('download_wifi_only', newValue);
  };

  const handleClearCache = async () => {
    await clearAppCache();
    setCacheSize('0.00 MB');
    alert('Cache cleared successfully');
  };

  const renderCurrentSubView = () => {
    switch (currentSubView) {
      case 'Notification Center':
        return <NotificationCenter onBack={() => setCurrentSubView(null)} />;
      case 'About Us':
        return (
          <StaticPageView title="About Us" onBack={() => setCurrentSubView(null)}>
            <h2 className="text-lg font-bold text-zinc-100">Our Mission</h2>
            <p>Welcome to Manga Reader, your ultimate destination for high-quality manga and light novels. Our mission is to provide the best reading experience with advanced features like offline reading and real-time notifications.</p>
            <h2 className="text-lg font-bold text-zinc-100 mt-6">Crafted with Love</h2>
            <p>Developed by a dedicated team of manga enthusiasts, we focus on performance, design, and user intent. We believe in providing freedom of reading anywhere, anytime.</p>
          </StaticPageView>
        );
      case 'Disclaimer':
        return (
          <StaticPageView title="Disclaimer" onBack={() => setCurrentSubView(null)}>
            <p>Manga Reader is a metadata indexing and caching platform. We do not host any copyrighted content on our own servers. All content is sourced from public third-party providers.</p>
            <p className="mt-4">Users are responsible for their own data consumption. We are not liable for any content that may be deemed inappropriate in your jurisdiction.</p>
          </StaticPageView>
        );
      case 'Reading Tips':
        return (
          <StaticPageView title="Reading Tips" onBack={() => setCurrentSubView(null)}>
            <div className="space-y-6">
              <section>
                <h3 className="text-blue-500 font-bold uppercase tracking-widest text-xs mb-2">Auto-Scroll</h3>
                <p>Use the scroll icon in the reader to enable auto-scroll. You can adjust the speed to match your reading pace.</p>
              </section>
              <section>
                <h3 className="text-pink-500 font-bold uppercase tracking-widest text-xs mb-2">Offline Mode</h3>
                <p>Download chapters before going offline. The app will automatically detect your connection status and switch to local cache.</p>
              </section>
              <section>
                <h3 className="text-yellow-500 font-bold uppercase tracking-widest text-xs mb-2">Brightness</h3>
                <p>Adjust the brightness directly in the reader settings to reduce eye strain during nighttime reading.</p>
              </section>
            </div>
          </StaticPageView>
        );
      case 'Feedback':
        return (
          <StaticPageView title="Feedback" onBack={() => setCurrentSubView(null)}>
             <p>Your feedback helps us improve Manga Reader. If you encountered any bugs or have feature suggestions, please let us know.</p>
             <div className="mt-8 space-y-4">
                <input 
                  type="text" 
                  placeholder="Subject" 
                  className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors"
                />
                <textarea 
                  rows={6} 
                  placeholder="Your message..." 
                  className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors"
                />
                <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold uppercase tracking-widest shadow-xl">
                  Send Feedback
                </button>
             </div>
          </StaticPageView>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 -mx-4 md:mx-0">
      <AnimatePresence>
        {renderCurrentSubView()}
      </AnimatePresence>
      {/* Custom Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center px-4 h-14 border-b border-white/5 bg-[#171717]/80 backdrop-blur-xl">
        <h1 className="text-lg font-bold text-zinc-100 uppercase tracking-tight italic">Profile</h1>
      </nav>

      {/* Header Gradient Section */}
      <div className="relative h-64 md:h-80 min-h-[256px] w-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-8 rounded-b-[3rem] md:rounded-[3rem] mb-8 overflow-hidden mt-14">
        <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
        <div className="relative z-10 flex flex-col items-center text-center gap-4">
          <div className="relative">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-2 border border-white/30 overflow-hidden text-3xl font-black text-white ${getAvatarColor(username)}`}>
              {username.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="space-y-1">
            {isEditingName ? (
              <input
                autoFocus
                className="bg-black/20 text-white text-xl font-bold text-center border-b border-white outline-none"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={() => handleUpdateName(username)}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateName(username)}
              />
            ) : (
              <h1 
                onClick={() => setIsEditingName(true)}
                className="text-xl md:text-2xl font-bold text-white drop-shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {username}
                <Settings size={14} className="opacity-50" />
              </h1>
            )}
            <p className="text-[10px] md:text-xs text-white/80 font-black uppercase tracking-[0.2em]">
              Guest Account
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col divide-y divide-white/5 bg-zinc-900/10">
        <section className="py-2">
          <div 
            onClick={() => setCurrentSubView('Notification Center')}
            className="flex items-center justify-between p-4 hover:bg-zinc-900/40 transition-colors group cursor-pointer"
          >
            <span className="text-zinc-300 font-semibold group-hover:text-white flex items-center gap-3">
              <Bell size={18} className="text-zinc-500" />
              Notification Center
            </span>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <span className="w-5 h-5 bg-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
              <ChevronRight className="text-zinc-700" size={20} />
            </div>
          </div>
          <div className="flex items-center justify-between p-4 flex-wrap">
            <span className="text-zinc-300 font-semibold flex items-center gap-3">
              <Settings size={18} className="text-zinc-500" />
              Download over Wifi Only
            </span>
            <div 
              onClick={handleToggleWifi}
              className={`w-12 h-6 rounded-full relative flex items-center p-1 cursor-pointer transition-colors ${wifiOnly ? 'bg-pink-500' : 'bg-zinc-800'}`}
            >
              <motion.div 
                animate={{ x: wifiOnly ? 24 : 0 }}
                className="w-4 h-4 bg-white rounded-full shadow-md" 
              />
            </div>
          </div>
        </section>

        <section className="py-2">
          {['Reading Tips', 'Feedback'].map(item => (
            <div key={item} onClick={() => setCurrentSubView(item)} className="flex items-center justify-between p-4 hover:bg-zinc-900/40 transition-colors group cursor-pointer">
              <span className="text-zinc-300 font-semibold group-hover:text-white uppercase tracking-tight text-sm font-bold flex items-center gap-3">
                {item === 'Reading Tips' ? <Zap size={18} className="text-zinc-500" /> : <MessageSquare size={18} className="text-zinc-500" />}
                {item}
              </span>
              <ChevronRight className="text-zinc-700" size={20} />
            </div>
          ))}
        </section>

        <section className="py-2">
          {['About Us', 'Disclaimer'].map(item => (
            <div key={item} onClick={() => setCurrentSubView(item)} className="flex items-center justify-between p-4 hover:bg-zinc-900/40 transition-colors group cursor-pointer">
              <span className="text-zinc-300 font-semibold group-hover:text-white uppercase tracking-tight text-sm font-bold flex items-center gap-3">
                <Info size={18} className="text-zinc-500" />
                {item}
              </span>
              <ChevronRight className="text-zinc-700" size={20} />
            </div>
          ))}
          <div 
            onClick={handleClearCache}
            className="flex items-center justify-between p-4 hover:bg-zinc-900/40 transition-colors group cursor-pointer"
          >
            <span className="text-zinc-300 font-semibold group-hover:text-white uppercase tracking-tight text-sm font-bold flex items-center gap-3">
              <RefreshCw size={18} className="text-zinc-500" />
              Clear Cache
            </span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-zinc-500">{cacheSize}</span>
              <ChevronRight className="text-zinc-700" size={20} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProfileView;
