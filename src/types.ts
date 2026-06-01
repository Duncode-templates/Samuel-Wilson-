export interface Page {
  id: string;
  imageUrl: string;
  pageNumber: number;
}

export interface Comic {
  id: string;
  title: string;
  description: string;
  cover_url: string;
  genres: string[];
  status: string;
  last_updated: number;
  created_at: number;
}

export interface Chapter {
  id: string;
  chapter_number: number;
  title?: string;
  thumbnail?: string;
  pages: { [key: string]: string };
  total_pages: number;
  status: string;
  updated_at: number;
  created_at: number;
  url: string;
}

export interface Comment {
  id: string;
  chapterId: string;
  novelId: string;
  userId: string;
  username: string;
  userAvatar?: string;
  content: string;
  timestamp: number;
  parentId?: string; // ID of the comment being replied to
  rootId?: string; // ID of the top-level comment (for easier threading)
  level: number; // 0 for main, 1 for reply, 2 for reply-to-reply
  likes?: number;
  dislikes?: number;
}
