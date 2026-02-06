import { api, createConfig } from "./api";
import type { Comment, CommentReactionType } from "../types";

export interface ReactResponse {
  reactionCounts: Record<CommentReactionType, number>;
  myReaction: CommentReactionType | null;
}

export async function getComments(
  postId: string,
  token: string | null = null
): Promise<Comment[]> {
  const { data } = await api.get<Comment[]>(
    `/comments/${postId}`,
    createConfig(token)
  );
  return data;
}

export async function addComment(
  postId: string,
  body: { desc: string; parentComment?: string | null },
  token: string
) {
  const { data } = await api.post<Comment>(
    `/comments/${postId}`,
    body,
    createConfig(token)
  );
  return data;
}

export async function deleteComment(commentId: string, token: string) {
  await api.delete(`/comments/${commentId}`, createConfig(token));
}

export async function reactToComment(
  commentId: string,
  type: CommentReactionType,
  token: string
): Promise<ReactResponse> {
  const { data } = await api.patch<ReactResponse>(
    `/comments/${commentId}/react`,
    { type },
    createConfig(token)
  );
  return data;
}
