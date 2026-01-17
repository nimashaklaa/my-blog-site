import axios, { AxiosError } from "axios";
import Comment from "./Comment";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth, useUser } from "@clerk/clerk-react";
import { toast } from "react-toastify";
import { Comment as CommentType } from "../types";
import { FormEvent } from "react";

interface CommentsProps {
  postId: string;
}

const fetchComments = async (postId: string): Promise<CommentType[]> => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/comments/${postId}`
  );
  return res.data;
};

const Comments = ({ postId }: CommentsProps) => {
  const { user } = useUser();
  const { getToken } = useAuth();

  const { isPending, error, data } = useQuery({
    queryKey: ["comments", postId],
    queryFn: () => fetchComments(postId),
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (newComment: { desc: string }) => {
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

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const data = {
      desc: formData.get("desc") as string,
    };

    mutation.mutate(data);
    (e.target as HTMLFormElement).reset();
  };

  return (
    <div className="flex flex-col gap-8 lg:w-3/5 mb-12">
      <h1 className="text-xl text-gray-500 underline">Comments</h1>
      <form
        onSubmit={handleSubmit}
        className="flex items-center justify-between gap-8 w-full"
      >
        <textarea
          name="desc"
          placeholder="Write a comment..."
          className="w-full p-4 rounded-xl"
        />
        <button className="bg-blue-800 px-4 py-3 text-white font-medium rounded-xl">
          Send
        </button>
      </form>
      {isPending ? (
        <div>Loading...</div>
      ) : error ? (
        <div>Error loading comments!</div>
      ) : (
        <>
          {mutation.isPending && mutation.variables && user && (
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

          {data?.map((comment) => (
            <Comment key={comment._id} comment={comment} postId={postId} />
          ))}
        </>
      )}
    </div>
  );
};

export default Comments;
