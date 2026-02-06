import { Link } from "react-router-dom";
import Image from "./Image";
import { useQuery } from "@tanstack/react-query";
import { PostsResponse } from "../types";
import { getCategoryLabel } from "../constants/categories";
import { getPosts } from "../services";

const fetchFeatured = async (): Promise<PostsResponse> => {
  return getPosts({ featured: true, limit: 4, sort: "newest" }, null);
};

function getReadTimeMinutes(html: string): number {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function formatDate(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const FeaturedPosts = () => {
  const { isPending, error, data } = useQuery({
    queryKey: ["featuredPosts"],
    queryFn: fetchFeatured,
  });

  if (isPending) return <div className="text-gray-500 text-sm">Loading...</div>;
  if (error)
    return <div className="text-red-600 text-sm">Something went wrong.</div>;

  const posts = data?.posts;
  if (!posts || posts.length === 0) return null;

  const [featured, ...rest] = posts;

  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Featured</h2>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main featured — overlay card */}
        <Link
          to={`/${featured.slug}`}
          className="group relative w-full lg:w-3/5 rounded-2xl overflow-hidden bg-gray-900 aspect-[4/3] lg:aspect-[16/10]"
        >
          {featured.img && (
            <Image
              src={featured.img}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
            <div className="flex flex-wrap items-center gap-2 text-white/70 text-xs sm:text-sm mb-2">
              {featured.category && featured.category !== "general" && (
                <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-white text-xs font-medium backdrop-blur-sm">
                  {getCategoryLabel(featured.category)}
                </span>
              )}
              <span>{formatDate(featured.createdAt)}</span>
              <span aria-hidden>·</span>
              <span>{getReadTimeMinutes(featured.content)} min read</span>
            </div>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight line-clamp-2">
              {featured.title}
            </h3>
            {featured.desc && (
              <p className="text-white/70 text-sm mt-2 line-clamp-2 max-w-lg">
                {featured.desc}
              </p>
            )}
            {featured.tags && featured.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {featured.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-md bg-white/15 text-white/90 text-xs backdrop-blur-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Link>

        {/* Side cards */}
        <div className="w-full lg:w-2/5 flex flex-col gap-4">
          {rest.slice(0, 3).map((post) => (
            <Link
              key={post._id}
              to={`/${post.slug}`}
              className="group flex gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              {post.img && (
                <div className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-gray-100">
                  <Image
                    src={post.img}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-gray-400 text-xs">
                  {post.category && post.category !== "general" && (
                    <>
                      <span className="text-blue-600 font-medium">
                        {getCategoryLabel(post.category)}
                      </span>
                      <span aria-hidden>·</span>
                    </>
                  )}
                  <time dateTime={post.createdAt}>
                    {formatDate(post.createdAt)}
                  </time>
                  <span aria-hidden>·</span>
                  <span>{getReadTimeMinutes(post.content)} min</span>
                </div>
                <h4 className="font-semibold text-gray-900 group-hover:text-blue-800 transition-colors line-clamp-2 mt-1 leading-snug">
                  {post.title}
                </h4>
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {post.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedPosts;
