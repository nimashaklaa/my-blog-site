import { format } from "timeago.js";
import Image from "./Image";
import ChatInput from "./ChatInput";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import axios, { AxiosError } from "axios";
import { Comment as CommentType, CommentReactionType } from "../types";

const REACTIONS: { type: CommentReactionType; label: string; emoji: string }[] =
  [
    { type: "like", label: "Like", emoji: "👍" },
    { type: "love", label: "Love", emoji: "❤️" },
    { type: "laugh", label: "Laugh", emoji: "😂" },
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
      return axios.delete(
        `${import.meta.env.VITE_API_URL}/comments/${comment._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
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
      const res = await axios.patch<{
        reactionCounts: Record<CommentReactionType, number>;
        myReaction: CommentReactionType | null;
      }>(
        `${import.meta.env.VITE_API_URL}/comments/${comment._id}/react`,
        { type },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return res.data;
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

  const reactionCounts = comment.reactionCounts ?? {
    like: 0,
    love: 0,
    laugh: 0,
  };
  const myReaction = comment.myReaction ?? null;
  const totalReactions = Object.values(reactionCounts).reduce(
    (a, b) => a + b,
    0
  );
  const activeReactions = REACTIONS.filter(
    (r) => (reactionCounts[r.type] ?? 0) > 0
  );

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
            <span
              className="text-xs text-red-300 hover:text-red-500 cursor-pointer"
              onClick={() => deleteMutation.mutate()}
            >
              delete
              {deleteMutation.isPending && <span> (in progress)</span>}
            </span>
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

      {/* Reactions + Reply row */}
      <div className="mt-2 flex items-center gap-3">
        {/* Reaction picker trigger */}
        <div className="relative group/react">
          <button
            type="button"
            onClick={() => myReaction && handleReaction(myReaction)}
            className={`text-xs transition-colors ${
              myReaction
                ? "text-blue-600 font-medium"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {myReaction
              ? `${REACTIONS.find((r) => r.type === myReaction)?.emoji} ${REACTIONS.find((r) => r.type === myReaction)?.label}`
              : "React"}
          </button>

          {/* Hover picker — pb-2 bridges the gap so hover doesn't break */}
          <div className="absolute bottom-full left-0 pb-2 hidden group-hover/react:block z-10">
            <div className="flex items-center gap-1 bg-white rounded-full shadow-lg border border-gray-100 px-2 py-1.5">
              {REACTIONS.map(({ type, label, emoji }) => {
                const isActive = myReaction === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleReaction(type)}
                    disabled={reactMutation.isPending}
                    className={`text-lg hover:scale-125 transition-transform px-0.5 rounded-full ${
                      isActive ? "bg-blue-100 ring-2 ring-blue-300" : ""
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

        {/* Reaction summary pill */}
        {totalReactions > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <span className="inline-flex -space-x-0.5">
              {activeReactions.map(({ emoji, type }) => (
                <span key={type} className="text-sm">
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
