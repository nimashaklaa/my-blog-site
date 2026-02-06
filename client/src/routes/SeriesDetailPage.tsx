import { useAuth, useUser } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getSeriesBySlug, deleteSeries } from "../services";
import Image from "../components/Image";
import { getCategoryLabel } from "../constants/categories";
import { Post } from "../types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

function getReadTimeMinutes(html: string | undefined): number {
  if (html == null || typeof html !== "string") return 1;
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

const SeriesDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { getToken } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();

  const isAdmin = (user?.publicMetadata?.role as string) === "admin" || false;

  const {
    data: series,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["series", slug],
    queryFn: () => getSeriesBySlug(slug!, null),
    enabled: !!slug,
  });

  const deleteSeriesMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      return deleteSeries(series!._id, token);
    },
    onSuccess: () => {
      toast.success("Series has been deleted");
      navigate("/series");
    },
    onError: () => {
      toast.error("Failed to delete series");
    },
  });

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this series?")) {
      deleteSeriesMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        <span className="text-gray-500 text-sm">Loading series...</span>
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-10 h-10 text-red-400"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
        <span className="text-gray-600 font-medium">Series not found</span>
        <Link
          to="/series"
          className="text-blue-600 hover:text-blue-800 text-sm mt-2"
        >
          Back to series
        </Link>
      </div>
    );
  }

  const sortedPosts = [...series.posts].sort((a, b) => a.order - b.order);
  const postCount = series.postCount || series.posts.length;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Series Header */}
      <div className="mb-8">
        {series.img && (
          <div className="w-full aspect-video rounded-2xl overflow-hidden bg-gray-100 mb-6">
            <Image
              src={series.img}
              alt={series.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 font-medium text-sm">
            Series
          </span>
          {series.category && series.category !== "general" && (
            <Link
              to={`/series?cat=${series.category}`}
              className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-medium text-sm hover:bg-blue-100 transition-colors"
            >
              {getCategoryLabel(series.category)}
            </Link>
          )}
          <span className="text-gray-500 text-sm">{postCount} posts</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          {series.name}
        </h1>

        {series.desc && (
          <p className="text-gray-600 text-lg leading-relaxed mb-4">
            {series.desc}
          </p>
        )}

        {series.tags && series.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {series.tags.map((tag) => (
              <Link
                key={tag}
                to={`/series?tag=${encodeURIComponent(tag)}`}
                className="px-3 py-1 rounded-md bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 hover:text-gray-800 transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>
        )}

        {isAdmin && (
          <div className="flex gap-2 mt-6">
            <Link
              to={`/write-series/${series.slug}`}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
            >
              Edit Series
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleteSeriesMutation.isPending}
              className="px-4 py-2 rounded-lg border border-red-200 text-red-600 font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {deleteSeriesMutation.isPending ? "Deleting..." : "Delete Series"}
            </button>
          </div>
        )}
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Posts in this series
        </h2>
        {sortedPosts.map((item, index) => {
          const post = item.post as Post;
          if (!post || typeof post === "string") return null;

          const postUrl = post.slug ? `/${post.slug}` : `/p/${post._id}`;
          const readTime = getReadTimeMinutes(post.content);
          const date = post.createdAt ? new Date(post.createdAt) : null;
          const dateStr =
            date && !isNaN(date.getTime())
              ? date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "";

          return (
            <article
              key={post._id}
              className="group flex gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100"
            >
              {/* Part Number */}
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center">
                {index + 1}
              </div>

              {/* Post Image */}
              {post.img && (
                <Link
                  to={postUrl}
                  className="flex-shrink-0 w-32 aspect-video rounded-lg overflow-hidden bg-gray-100"
                >
                  <Image
                    src={post.img}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </Link>
              )}

              {/* Post Info */}
              <div className="flex-1 min-w-0">
                <Link to={postUrl} className="block">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-800 transition-colors line-clamp-2 mb-1">
                    {post.title}
                  </h3>
                </Link>

                {post.desc && (
                  <p className="text-gray-600 text-sm line-clamp-2 mb-2">
                    {post.desc}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  {dateStr && <span>{dateStr}</span>}
                  {dateStr && <span>·</span>}
                  <span>{readTime} min read</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {sortedPosts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="w-12 h-12 text-gray-300"
          >
            <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V9a2 2 0 0 0-2-2h-2" />
            <line x1="9" y1="9" x2="10" y2="9" />
            <line x1="9" y1="13" x2="15" y2="13" />
            <line x1="9" y1="17" x2="13" y2="17" />
          </svg>
          <span className="text-gray-600 font-medium">
            No posts in this series yet
          </span>
        </div>
      )}
    </div>
  );
};

export default SeriesDetailPage;
