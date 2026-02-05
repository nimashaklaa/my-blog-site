import { useParams } from "react-router-dom";
import { useUser, useAuth } from "@clerk/clerk-react";
import Image from "../components/Image";
import PostMenuActions from "../components/PostMenuActions";
import Comments from "../components/Comments";
import PostContent from "../components/PostContent";
import axios, { AxiosError } from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "timeago.js";
import { Post } from "../types";
import { toast } from "react-toastify";

const fetchPost = async (slug: string): Promise<Post> => {
  const res = await axios.get(`${import.meta.env.VITE_API_URL}/posts/${slug}`);
  return res.data;
};

const SinglePostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useUser();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const { isPending, error, data } = useQuery({
    queryKey: ["post", slug],
    queryFn: () => fetchPost(slug!),
    enabled: !!slug,
  });

  // Check if current user has clapped
  const hasClapped = data?.hasClapped || false;

  const clapMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        toast.error("Please login to clap!");
        return;
      }
      const token = await getToken();
      return axios.patch(
        `${import.meta.env.VITE_API_URL}/posts/clap/${data!._id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post", slug] });
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{
        error?: string;
        message?: string;
      }>;
      toast.error(
        axiosError.response?.data?.error ||
          axiosError.response?.data?.message ||
          "Failed to clap"
      );
    },
  });

  const handleClap = () => {
    if (!user) {
      toast.error("Please login to clap!");
      return;
    }
    clapMutation.mutate();
  };

  if (isPending) return <div>loading...</div>;
  if (error) return <div>Something went wrong! {error.message}</div>;
  if (!data) return <div>Post not found!</div>;

  return (
    <div className="flex flex-col gap-8">
      {/* cover image - full width like Write preview */}
      {data.img && (
        <div className="w-full rounded-xl overflow-hidden bg-gray-100 max-h-64">
          <Image
            src={data.img}
            alt=""
            className="w-full h-full object-cover max-h-64"
          />
        </div>
      )}
      {/* detail */}
      <div className="flex gap-8">
        <div className="lg:w-3/5 flex flex-col gap-8">
          <h1 className="text-xl md:text-3xl xl:text-4xl 2xl:text-5xl font-semibold">
            {data.title}
          </h1>
          <div className="text-gray-400 text-sm">{format(data.createdAt)}</div>
          <p className="text-gray-500 font-medium">{data.desc}</p>
          {/* Clap Button */}
          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={handleClap}
              disabled={clapMutation.isPending}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all ${
                hasClapped
                  ? "bg-blue-800 text-white border-blue-800"
                  : "bg-white text-blue-800 border-blue-800 hover:bg-blue-50"
              } ${clapMutation.isPending ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5"
              >
                <path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-3.33 8A2 2 0 0 1 17.5 22H4.02a2 2 0 0 1-2-1.74l-1.38-9A2 2 0 0 1 2.64 10H7" />
              </svg>
              <span className="font-medium">
                {data.clapCount || data.claps?.length || 0}{" "}
                {data.clapCount === 1 || (data.claps?.length || 0) === 1
                  ? "Clap"
                  : "Claps"}
              </span>
            </button>
          </div>
        </div>
      </div>
      {/* content */}
      <div className="flex flex-col md:flex-row gap-12 justify-between">
        {/* text */}
        <div className="lg:text-lg flex flex-col gap-6 text-justify">
          <PostContent content={data.content} />
        </div>
        {/* menu */}
        <div className="px-4 h-max sticky top-8">
          <PostMenuActions post={data} />
        </div>
      </div>
      <Comments postId={data._id} />
    </div>
  );
};

export default SinglePostPage;
