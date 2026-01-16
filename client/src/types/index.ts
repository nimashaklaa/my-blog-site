export interface User {
  _id: string;
  username: string;
  img?: string;
}

export interface Post {
  _id: string;
  user: User;
  img?: string;
  title: string;
  slug: string;
  desc?: string;
  category: string;
  content: string;
  isFeatured: boolean;
  visit: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Comment {
  _id: string;
  user: User;
  post: string;
  desc: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PostsResponse {
  posts: Post[];
  hasMore: boolean;
}

