import { api, createConfig } from "./api";
import type { Post, PostsResponse } from "../types";

export interface GetPostsParams {
  page?: number;
  limit?: number;
  cat?: string;
  tag?: string;
  search?: string;
  sort?: string;
  featured?: boolean;
  [key: string]: unknown;
}

export async function getPosts(
  params: GetPostsParams = {},
  token: string | null = null
): Promise<PostsResponse> {
  const { data } = await api.get<PostsResponse>("/posts", {
    ...createConfig(token),
    params: { page: 1, limit: 10, ...params },
  });
  return data;
}

export async function getPost(
  slug: string,
  token: string | null = null
): Promise<Post> {
  const { data } = await api.get<Post>(`/posts/${slug}`, createConfig(token));
  return data;
}

export async function getPostById(
  id: string,
  token: string | null = null
): Promise<Post> {
  const { data } = await api.get<Post>(`/posts/id/${id}`, createConfig(token));
  return data;
}

export async function createPost(
  body: {
    img?: string;
    title: string;
    category: string;
    tags: string[];
    desc?: string;
    content: string;
  },
  token: string
) {
  const { data } = await api.post<Post>("/posts", body, createConfig(token));
  return data;
}

export async function updatePost(
  postId: string,
  body: {
    img?: string;
    title: string;
    category: string;
    tags: string[];
    desc?: string;
    content: string;
  },
  token: string
) {
  const { data } = await api.put<Post>(
    `/posts/${postId}`,
    body,
    createConfig(token)
  );
  return data;
}

export async function deletePost(postId: string, token: string) {
  await api.delete(`/posts/${postId}`, createConfig(token));
}

export async function featurePost(postId: string, token: string) {
  const { data } = await api.patch<Post>(
    "/posts/feature",
    { postId },
    createConfig(token)
  );
  return data;
}

export async function toggleClap(
  postId: string,
  token: string
): Promise<{ claps: string[]; clapCount: number }> {
  const { data } = await api.patch<{ claps: string[]; clapCount: number }>(
    `/posts/clap/${postId}`,
    {},
    createConfig(token)
  );
  return data;
}

export interface UploadAuthResponse {
  signature: string;
  expire: number;
  token: string;
}

export async function getUploadAuth(): Promise<UploadAuthResponse> {
  const { data } = await api.get<UploadAuthResponse>("/posts/upload-auth");
  return data;
}
