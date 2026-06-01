import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Reply, ChevronLeft, User, MessageCircle, ChevronDown, ChevronUp, Heart, ThumbsDown } from 'lucide-react';
import { Comment } from '../types';
import { postComment, subscribeToComments, likeComment, dislikeComment } from '../lib/comments';
import { getSetting } from '../lib/storage';
import { getAvatarColor } from '../utils';

interface CommentSectionProps {
  chapterId: string;
  novelId: string;
  onClose: () => void;
}

const CommentItem: React.FC<{ 
  comment: Comment; 
  onReply: (parentId: string, username: string, level: number, rootId: string) => void;
  allComments: Comment[];
  isLastLevel: boolean;
}> = ({ comment, onReply, allComments, isLastLevel }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const replies = useMemo(() => 
    allComments.filter(c => c.parentId === comment.id)
      .sort((a, b) => a.timestamp - b.timestamp), 
  [allComments, comment.id]);

  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border border-white/5 text-[10px] font-black text-white ${getAvatarColor(comment.username)}`}>
          {comment.username.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-tight text-white italic">{comment.username}</span>
            <span className="text-[9px] font-bold text-zinc-500">{timeAgo(comment.timestamp)}</span>
          </div>
          <p className="text-xs text-zinc-300 leading-tight bg-zinc-900/50 p-3 rounded-2xl rounded-tl-none border border-white/5">
            {comment.content}
          </p>
          <div className="flex items-center gap-4">
            {!isLastLevel && (
              <button 
                onClick={() => onReply(comment.id, comment.username, comment.level, comment.rootId || comment.id)}
                className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-blue-400 p-1"
              >
                <Reply size={10} />
                Reply
              </button>
            )}

            <div className="flex items-center gap-3">
              <button 
                onClick={() => likeComment(comment.id)}
                className="flex items-center gap-1 text-[9px] font-black tracking-widest text-zinc-500 hover:text-pink-500 p-1 transition-colors"
              >
                <Heart size={10} className={comment.likes && comment.likes > 0 ? "fill-pink-500 text-pink-500" : ""} />
                {comment.likes || 0}
              </button>

              <button 
                onClick={() => dislikeComment(comment.id)}
                className="flex items-center gap-1 text-[9px] font-black tracking-widest text-zinc-500 hover:text-red-500 p-1 transition-colors"
              >
                <ThumbsDown size={10} className={comment.dislikes && comment.dislikes > 0 ? "fill-red-500 text-red-500" : ""} />
                {comment.dislikes || 0}
              </button>
            </div>
            
            {replies.length > 0 && comment.level === 0 && (
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-400 p-1"
              >
                {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                {isExpanded ? 'Hide' : `Show ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {replies.length > 0 && isExpanded && (
        <div className="ml-6 pl-4 border-l border-zinc-800 space-y-4 pt-2">
          {replies.map(reply => (
            <CommentItem 
              key={reply.id} 
              comment={reply} 
              onReply={onReply} 
              allComments={allComments}
              isLastLevel={reply.level >= 2}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function CommentSection({ chapterId, novelId, onClose }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; username: string; level: number; rootId: string } | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToComments(chapterId, (fetchedComments) => {
      setComments(fetchedComments);
      setIsLoading(false);
    });
    return unsubscribe;
  }, [chapterId]);

  const topLevelComments = useMemo(() => 
    comments.filter(c => !c.parentId), 
  [comments]);

  const handleSend = async () => {
    if (!content.trim() || isPosting) return;
    
    setIsPosting(true);
    try {
      const username = await getSetting('username', 'Guest');
      await postComment({
        chapterId,
        novelId,
        content: content.trim(),
        parentId: replyTo?.id,
        rootId: replyTo?.rootId,
        level: replyTo ? replyTo.level + 1 : 0
      });
      setContent('');
      setReplyTo(null);
    } catch (e: any) {
      console.error('Failed to post comment', e);
      alert(e.message || 'Failed to post comment. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[200] bg-[#171717] flex flex-col"
    >
      {/* Header */}
      <nav className="flex items-center justify-between px-4 h-14 border-b border-white/5 bg-[#171717]/80 backdrop-blur-xl">
        <button onClick={onClose} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-2">
          <MessageCircle size={18} className="text-blue-500" />
          <h2 className="text-sm font-black italic uppercase tracking-tighter">Comments ({comments.length})</h2>
        </div>
        <div className="w-10" />
      </nav>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] italic text-zinc-500">Retrieving thoughts...</p>
          </div>
        ) : (
          <>
            {topLevelComments.map(comment => (
              <CommentItem 
                key={comment.id} 
                comment={comment} 
                allComments={comments}
                isLastLevel={false}
                onReply={(id, username, level, rootId) => setReplyTo({ id, username, level, rootId })} 
              />
            ))}

            {comments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 opacity-30">
                <MessageCircle size={48} className="mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] italic">No thoughts yet</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-[#171717] border-t border-white/5 space-y-3 shadow-[0_-20px_40px_rgba(0,0,0,0.4)]">
        <AnimatePresence>
          {replyTo && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex items-center justify-between bg-blue-500/10 px-3 py-2 rounded-xl border border-blue-500/20"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <Reply size={12} className="text-blue-400" />
                <span className="text-[10px] font-bold text-blue-400 truncate tracking-tight lowercase">
                  replying to <span className="uppercase italic font-black">{replyTo.username}</span>
                </span>
              </div>
              <button onClick={() => setReplyTo(null)} className="p-1 text-blue-400">
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input 
              type="text" 
              placeholder={replyTo ? "Write a reply..." : "Add your thoughts..."}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-blue-500/50 transition-all font-medium"
            />
          </div>
          <button 
            disabled={!content.trim() || isPosting}
            onClick={handleSend}
            className="w-12 h-12 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:grayscale rounded-2xl flex items-center justify-center text-white transition-all active:scale-95 shadow-[0_4px_15px_rgba(37,99,235,0.3)]"
          >
            {isPosting ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
