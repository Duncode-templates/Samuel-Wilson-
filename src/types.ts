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
