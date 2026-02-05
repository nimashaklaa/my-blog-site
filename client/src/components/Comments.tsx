import axios, { AxiosError } from "axios";
import Comment from "./Comment";
import ChatInput from "./ChatInput";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth, useUser } from "@clerk/clerk-react";
import { toast } from "react-toastify";
import { Comment as CommentType } from "../types";
import { useMemo, useState } from "react";

interface CommentsProps {
  postId: string;
}

interface CommentNode {
  comment: CommentType;
  replies: CommentType[];
}

const fetchComments = async (postId: string): Promise<CommentType[]> => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/comments/${postId}`
  );
  return res.data;
};

function buildCommentTree(comments: CommentType[]): CommentNode[] {
  const topLevel: CommentType[] = [];
  const repliesByParent = new Map<string, CommentType[]>();

  for (const c of comments) {
    if (c.parentComment) {
      const existing = repliesByParent.get(c.parentComment) || [];
      existing.push(c);
      repliesByParent.set(c.parentComment, existing);
    } else {
      topLevel.push(c);
    }
  }

  // Top-level: newest first (already sorted by API)
  // Replies: oldest first
  for (const [key, replies] of repliesByParent) {
    repliesByParent.set(
      key,
      replies.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
    );
  }

  return topLevel.map((comment) => ({
    comment,
    replies: repliesByParent.get(comment._id) || [],
  }));
}

const Comments = ({ postId }: CommentsProps) => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const { isPending, error, data } = useQuery({
    queryKey: ["comments", postId],
    queryFn: () => fetchComments(postId),
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (newComment: {
      desc: string;
      parentComment?: string | null;
    }) => {
      const token = await getToken();
      return axios.post(
        `${import.meta.env.VITE_API_URL}/comments/${postId}`,
        newComment,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      setReplyingTo(null);
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{
        error?: string;
        message?: string;
      }>;
      toast.error(
        axiosError.response?.data?.error ||
          axiosError.response?.data?.message ||
          "Failed to add comment"
      );
    },
  });

  const tree = useMemo(() => (data ? buildCommentTree(data) : []), [data]);

  const handleTopLevelSubmit = (text: string) => {
    mutation.mutate({ desc: text });
  };

  const handleReplySubmit = (parentId: string, text: string) => {
    mutation.mutate({ desc: text, parentComment: parentId });
  };

  return (
    <div className="flex flex-col gap-6 mb-12">
      <h1 className="text-xl font-semibold text-gray-900">Comments</h1>

      <ChatInput
        onSubmit={handleTopLevelSubmit}
        placeholder="Write a comment..."
        disabled={mutation.isPending}
      />

      {isPending ? (
        <div>Loading...</div>
      ) : error ? (
        <div>Error loading comments!</div>
      ) : (
        <>
          {mutation.isPending &&
            mutation.variables &&
            !mutation.variables.parentComment &&
            user && (
              <Comment
                comment={{
                  _id: "temp",
                  desc: `${mutation.variables.desc} (Sending...)`,
                  createdAt: new Date().toISOString(),
                  user: {
                    _id: user.id,
                    username: user.username || "",
                    img: user.imageUrl,
                  },
                  post: postId,
                }}
                postId={postId}
              />
            )}

          {tree.map((node) => (
            <div key={node.comment._id}>
              <Comment
                comment={node.comment}
                postId={postId}
                onReply={() => setReplyingTo(node.comment._id)}
                isReplying={replyingTo === node.comment._id}
                onCancelReply={() => setReplyingTo(null)}
                onSubmitReply={(text) =>
                  handleReplySubmit(node.comment._id, text)
                }
                replyDisabled={mutation.isPending}
              />

              {node.replies.length > 0 && (
                <div className="ml-12 border-l-2 border-gray-200 pl-4">
                  {node.replies.map((reply) => {
                    const parentUsername = node.comment.user.username;
                    return (
                      <Comment
                        key={reply._id}
                        comment={reply}
                        postId={postId}
                        isReply
                        parentUsername={parentUsername}
                      />
                    );
                  })}
                </div>
              )}

              {/* Optimistic reply */}
              {mutation.isPending &&
                mutation.variables?.parentComment === node.comment._id &&
                user && (
                  <div className="ml-12 border-l-2 border-gray-200 pl-4">
                    <Comment
                      comment={{
                        _id: "temp-reply",
                        desc: `${mutation.variables.desc} (Sending...)`,
                        createdAt: new Date().toISOString(),
                        user: {
                          _id: user.id,
                          username: user.username || "",
                          img: user.imageUrl,
                        },
                        post: postId,
                        parentComment: node.comment._id,
                      }}
                      postId={postId}
                      isReply
                      parentUsername={node.comment.user.username}
                    />
                  </div>
                )}
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default Comments;
