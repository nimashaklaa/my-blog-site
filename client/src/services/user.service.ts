import { api, createConfig } from "./api";
import type { Post } from "../types";

export async function getSavedPosts(token: string): Promise<Post[]> {
  const { data } = await api.get<Post[]>("/users/saved", createConfig(token));
  return data;
}

export async function toggleSavePost(
  postId: string,
  token: string
): Promise<"Post saved" | "Post unsaved"> {
  const { data } = await api.patch<"Post saved" | "Post unsaved">(
    "/users/save",
    { postId },
    createConfig(token)
  );
  return data;
}
