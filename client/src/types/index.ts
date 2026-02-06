export interface User {
  _id: string;
  username: string;
  img?: string;
}

export interface Series {
  _id: string;
  user: User;
  name: string;
  slug: string;
  desc?: string;
  img?: string;
  category: string;
  tags?: string[];
  posts: Array<{
    post: Post | string;
    order: number;
  }>;
  postCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Post {
  _id: string;
  user: User;
  img?: string;
  title: string;
  slug: string;
  desc?: string;
  category: string;
  tags?: string[];
  content: string;
  isFeatured: boolean;
  visit: number;
  claps?: string[]; // Array of user IDs who clapped
  clapCount?: number; // Total clap count
  hasClapped?: boolean; // Whether current user has clapped
  series?: Series | string; // Optional series reference
  createdAt: string;
  updatedAt?: string;
}

export type CommentReactionType =
  | "like"
  | "love"
  | "laugh"
  | "celebrate"
  | "care"
  | "insightful";

export interface Comment {
  _id: string;
  user: User;
  post: string;
  desc: string;
  parentComment?: string | null;
  reactionCounts?: Record<CommentReactionType, number>;
  myReaction?: CommentReactionType | null;
  createdAt: string;
  updatedAt?: string;
}

export interface PostsResponse {
  posts: Post[];
  hasMore: boolean;
  totalPosts: number;
  totalPages: number;
  currentPage: number;
}

export interface SeriesResponse {
  series: Series[];
  hasMore: boolean;
  totalSeries: number;
  totalPages: number;
  currentPage: number;
}
