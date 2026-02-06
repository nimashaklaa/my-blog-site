import { format } from "timeago.js";
import Image from "./Image";
import ChatInput from "./ChatInput";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { AxiosError } from "axios";
import { Comment as CommentType, CommentReactionType } from "../types";
import { deleteComment, reactToComment } from "../services";

const REACTIONS: { type: CommentReactionType; label: string; emoji: string }[] =
  [
    { type: "like", label: "Like", emoji: "👍" },
    { type: "celebrate", label: "Celebrate", emoji: "👏" },
    { type: "care", label: "Care", emoji: "🤗" },
    { type: "love", label: "Love", emoji: "❤️" },
    { type: "insightful", label: "Insightful", emoji: "💡" },
    { type: "laugh", label: "Funny", emoji: "😂" },
  ];

interface CommentProps {
  comment: CommentType;
  postId: string;
  onReply?: () => void;
  isReplying?: boolean;
  onCancelReply?: () => void;
  onSubmitReply?: (text: string) => void;
  replyDisabled?: boolean;
  isReply?: boolean;
  parentUsername?: string;
}

const Comment = ({
  comment,
  postId,
  onReply,
  isReplying,
  onCancelReply,
  onSubmitReply,
  replyDisabled,
  isReply,
  parentUsername,
}: CommentProps) => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const role = user?.publicMetadata?.role as string | undefined;

  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      return deleteComment(comment._id, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      toast.success("Comment deleted successfully");
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{
        error?: string;
        message?: string;
      }>;
      toast.error(
        axiosError.response?.data?.error ||
          axiosError.response?.data?.message ||
          "Failed to delete comment"
      );
    },
  });

  const reactMutation = useMutation({
    mutationFn: async (type: CommentReactionType) => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      return reactToComment(comment._id, type, token);
    },
    onSuccess: (data) => {
      queryClient.setQueryData<CommentType[]>(["comments", postId], (old) =>
        old?.map((c) =>
          c._id === comment._id
            ? {
                ...c,
                reactionCounts: data.reactionCounts,
                myReaction: data.myReaction,
              }
            : c
        )
      );
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{ error?: string }>;
      toast.error(axiosError.response?.data?.error ?? "Failed to add reaction");
    },
  });

  const handleReaction = (type: CommentReactionType) => {
    if (!user) {
      toast.error("Please sign in to react");
      return;
    }
    reactMutation.mutate(type);
  };

  const defaultCounts: Record<CommentReactionType, number> = {
    like: 0,
    love: 0,
    laugh: 0,
    celebrate: 0,
    care: 0,
    insightful: 0,
  };
  const reactionCounts = { ...defaultCounts, ...comment.reactionCounts };
  const myReaction = comment.myReaction ?? null;
  const totalReactions = Object.values(reactionCounts).reduce(
    (a, b) => a + b,
    0
  );
  const activeReactions = REACTIONS.filter(
    (r) => (reactionCounts[r.type] ?? 0) > 0
  );
  const myReactionConfig = myReaction
    ? REACTIONS.find((r) => r.type === myReaction)
    : null;

  return (
    <div
      className={`p-4 rounded-xl mb-2 ${
        isReply ? "bg-gray-50" : "bg-slate-50 mb-4"
      }`}
    >
      <div className="flex items-center gap-3">
        {comment.user.img && (
          <Image
            src={comment.user.img}
            className={`rounded-full object-cover ${
              isReply ? "w-8 h-8" : "w-10 h-10"
            }`}
            w={isReply ? 32 : 40}
          />
        )}
        <span className={`font-medium ${isReply ? "text-sm" : ""}`}>
          {comment.user.username}
        </span>
        <span className="text-sm text-gray-500">
          {format(comment.createdAt)}
        </span>
        {user &&
          (comment.user.username === user.username || role === "admin") && (
            <button
              type="button"
              className="text-red-300 hover:text-red-500 cursor-pointer disabled:opacity-50"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              title="Delete comment"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
      </div>

      <div className={`mt-2 ${isReply ? "text-sm" : ""}`}>
        {isReply && parentUsername && (
          <span className="text-blue-600 font-medium text-sm mr-1">
            @{parentUsername}
          </span>
        )}
        <p className="inline">{comment.desc}</p>
      </div>

      {/* Like button + hover reaction set (LinkedIn-style) + Reply */}
      <div className="mt-2 flex items-center gap-3 flex-wrap">
        {/* Like button: shows "Like" by default, or chosen reaction (e.g. "Insightful") after pick */}
        <div className="relative group/react pt-10 -mt-10">
          <button
            type="button"
            onClick={() => myReaction && handleReaction(myReaction)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              myReaction
                ? "text-blue-600 bg-blue-50 border border-blue-200"
                : "text-gray-600 hover:bg-gray-100 border border-transparent"
            }`}
            title={myReaction ? "Remove reaction" : "Like"}
          >
            {myReactionConfig ? (
              <>
                <span className="text-base leading-none">
                  {myReactionConfig.emoji}
                </span>
                <span>{myReactionConfig.label}</span>
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4 shrink-0"
                  aria-hidden
                >
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                </svg>
                <span>Like</span>
              </>
            )}
          </button>

          {/* Reaction set on hover — appears above; pt-10 extends hover zone so cursor can reach it */}
          <div className="absolute bottom-full left-0 pt-1 hidden group-hover/react:block z-10">
            <div className="flex items-center gap-0.5 bg-white rounded-full shadow-lg border border-gray-200 px-2 py-1.5">
              {REACTIONS.map(({ type, label, emoji }) => {
                const isActive = myReaction === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleReaction(type)}
                    disabled={reactMutation.isPending}
                    className={`text-lg leading-none hover:scale-110 transition-transform p-1 rounded-full ${
                      isActive ? "bg-blue-50 ring-1 ring-blue-300" : ""
                    } ${reactMutation.isPending ? "opacity-50" : ""}`}
                    title={isActive ? `Remove ${label}` : label}
                    aria-label={isActive ? `Remove ${label}` : label}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Reaction summary: icons + total count (e.g. 👍 👏 ❤️ 315) */}
        {totalReactions > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
            <span className="inline-flex -space-x-0.5">
              {activeReactions.slice(0, 3).map(({ emoji, type }) => (
                <span key={type} className="text-sm" title={type}>
                  {emoji}
                </span>
              ))}
            </span>
            <span>{totalReactions}</span>
          </span>
        )}

        {/* Reply button — only on top-level comments */}
        {!isReply && onReply && user && (
          <button
            onClick={onReply}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Reply
          </button>
        )}
      </div>

      {/* Inline reply input */}
      {isReplying && onSubmitReply && onCancelReply && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">
              Replying to @{comment.user.username}
            </span>
            <button
              onClick={onCancelReply}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
          <ChatInput
            onSubmit={onSubmitReply}
            placeholder={`Reply to ${comment.user.username}...`}
            disabled={replyDisabled}
            autoFocus
          />
        </div>
      )}
    </div>
  );
};

export default Comment;
