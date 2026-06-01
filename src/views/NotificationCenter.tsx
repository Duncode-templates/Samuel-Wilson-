
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Bell, Star, Zap, Info } from 'lucide-react';
import { getNotifications, markNotificationAsRead, AppNotification } from '../lib/storage';

interface NotificationCenterProps {
  onBack: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ onBack }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNotifs = async () => {
      const data = await getNotifications();
      setNotifications(data);
      setLoading(false);
    };
    loadNotifs();
  }, []);

  const handleMarkRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
  };

  const getTimeAgo = (time: number) => {
    const seconds = Math.floor((Date.now() - time) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'new_chapter': return Zap;
      default: return Bell;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'new_chapter': return 'text-orange-500';
      default: return 'text-blue-500';
    }
  };

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
        <h1 className="text-lg font-bold text-zinc-100 uppercase tracking-tight italic">Notifications</h1>
      </nav>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {!loading && notifications.map((notif) => {
          const Icon = getIcon(notif.type);
          return (
            <div 
              key={notif.id}
              onClick={() => handleMarkRead(notif.id)}
              className={`p-4 rounded-2xl border transition-all ${
                notif.unread ? 'bg-zinc-900 border-white/10' : 'bg-transparent border-white/5'
              }`}
            >
              <div className="flex gap-4">
                <div className={`p-2 rounded-xl bg-black/40 ${getColor(notif.type)}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-zinc-100">{notif.title}</h3>
                    <span className="text-[10px] text-zinc-500 font-medium">{getTimeAgo(notif.time)}</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{notif.body}</p>
                </div>
                {notif.unread && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                )}
              </div>
            </div>
          );
        })}

        {!loading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
            <Bell size={48} className="mb-4" />
            <p className="text-sm font-bold uppercase tracking-widest">No notifications yet</p>
          </div>
        )}
        
        {loading && (
          <div className="space-y-3">
             {[1,2,3].map(i => (
               <div key={i} className="h-20 bg-zinc-900/50 rounded-2xl animate-pulse" />
             ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default NotificationCenter;
