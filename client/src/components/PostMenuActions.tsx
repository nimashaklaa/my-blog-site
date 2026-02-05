import { useUser, useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Post } from "../types";

interface PostMenuActionsProps {
  post: Post;
  onAction?: () => void;
}

const PostMenuActions = ({ post, onAction }: PostMenuActionsProps) => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const {
    isPending,
    error,
    data: savedPosts,
  } = useQuery({
    queryKey: ["savedPosts"],
    queryFn: async () => {
      const token = await getToken();
      return axios.get<string[]>(
        `${import.meta.env.VITE_API_URL}/users/saved`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    },
    enabled: !!user,
  });

  const isAdmin = (user?.publicMetadata?.role as string) === "admin" || false;
  const isSaved = savedPosts?.data?.some((p) => p === post._id) || false;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return axios.delete(`${import.meta.env.VITE_API_URL}/posts/${post._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    },
    onSuccess: () => {
      toast.success("Post deleted successfully!");
      navigate("/");
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{
        error?: string;
        message?: string;
      }>;
      toast.error(
        axiosError.response?.data?.error ||
          axiosError.response?.data?.message ||
          "Failed to delete post"
      );
    },
  });

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return axios.patch(
        `${import.meta.env.VITE_API_URL}/users/save`,
        {
          postId: post._id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedPosts"] });
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{
        error?: string;
        message?: string;
      }>;
      toast.error(
        axiosError.response?.data?.error ||
          axiosError.response?.data?.message ||
          "Failed to save post"
      );
    },
  });

  const featureMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return axios.patch(
        `${import.meta.env.VITE_API_URL}/posts/feature`,
        {
          postId: post._id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post", post.slug] });
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{
        error?: string;
        message?: string;
      }>;
      toast.error(
        axiosError.response?.data?.error ||
          axiosError.response?.data?.message ||
          "Failed to feature post"
      );
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
    onAction?.();
  };

  const handleFeature = () => {
    featureMutation.mutate();
    onAction?.();
  };

  const handleSave = () => {
    if (!user) {
      return navigate("/login");
    }
    saveMutation.mutate();
    onAction?.();
  };

  return (
    <div className="py-1">
      {isPending ? (
        <div className="px-4 py-2 text-sm text-gray-400">Loading...</div>
      ) : error ? (
        <div className="px-4 py-2 text-sm text-red-400">Failed to load</div>
      ) : (
        <button
          type="button"
          className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          onClick={handleSave}
          disabled={saveMutation.isPending}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            width="16px"
            height="16px"
            className="shrink-0"
          >
            <path
              d="M12 4C10.3 4 9 5.3 9 7v34l15-9 15 9V7c0-1.7-1.3-3-3-3H12z"
              stroke="currentColor"
              strokeWidth="2"
              fill={
                saveMutation.isPending
                  ? isSaved
                    ? "none"
                    : "currentColor"
                  : isSaved
                    ? "currentColor"
                    : "none"
              }
            />
          </svg>
          <span>{isSaved ? "Unsave post" : "Save post"}</span>
        </button>
      )}
      {isAdmin && (
        <button
          type="button"
          className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          onClick={handleFeature}
          disabled={featureMutation.isPending}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            width="16px"
            height="16px"
            className="shrink-0"
          >
            <path
              d="M24 2L29.39 16.26L44 18.18L33 29.24L35.82 44L24 37L12.18 44L15 29.24L4 18.18L18.61 16.26L24 2Z"
              stroke="currentColor"
              strokeWidth="2"
              fill={
                featureMutation.isPending
                  ? post.isFeatured
                    ? "none"
                    : "currentColor"
                  : post.isFeatured
                    ? "currentColor"
                    : "none"
              }
            />
          </svg>
          <span>{post.isFeatured ? "Unfeature" : "Feature"}</span>
        </button>
      )}
      {user && (post.user.username === user.username || isAdmin) && (
        <button
          type="button"
          className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          onClick={() => {
            navigate(`/edit/${post.slug}`);
            onAction?.();
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            width="16px"
            height="16px"
            className="shrink-0"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <span>Edit post</span>
        </button>
      )}
      {user && (post.user.username === user.username || isAdmin) && (
        <button
          type="button"
          className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            width="16px"
            height="16px"
            className="shrink-0"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          <span>Delete post</span>
        </button>
      )}
    </div>
  );
};

export default PostMenuActions;
