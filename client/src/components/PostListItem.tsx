import { Link } from "react-router-dom";
import Image from "./Image";
import { Post } from "../types";
import { getCategoryLabel } from "../constants/categories";

function getReadTimeMinutes(html: string | undefined): number {
  if (html == null || typeof html !== "string") return 1;
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

interface PostListItemProps {
  post: Post;
}

const PostListItem = ({ post }: PostListItemProps) => {
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
    <article className="group flex flex-col sm:flex-row gap-5 sm:gap-6 p-4 sm:p-5 rounded-2xl hover:bg-gray-50 transition-colors min-w-0 overflow-hidden">
      {/* Image */}
      {post.img && (
        <Link
          to={postUrl}
          className="shrink-0 w-full sm:w-40 md:w-48 aspect-video sm:aspect-[4/3] rounded-xl overflow-hidden bg-gray-100"
        >
          <Image
            src={post.img}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </Link>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm mb-2">
          {post.category && post.category !== "general" && (
            <Link
              to={`/posts?cat=${post.category}`}
              className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium hover:bg-blue-100 transition-colors"
            >
              {getCategoryLabel(post.category)}
            </Link>
          )}
          {dateStr && <span className="text-gray-400">{dateStr}</span>}
          {dateStr && <span className="text-gray-400">·</span>}
          <span className="text-gray-400">{readTime} min read</span>
        </div>

        <Link to={postUrl} className="block">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-blue-800 transition-colors line-clamp-2 leading-snug">
            {post.title}
          </h2>
        </Link>

        {post.desc && (
          <p className="mt-2 text-gray-600 text-sm line-clamp-2 leading-relaxed">
            {post.desc}
          </p>
        )}

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {post.tags.slice(0, 3).map((tag) => (
              <Link
                key={tag}
                to={`/posts?tag=${encodeURIComponent(tag)}`}
                className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 hover:text-gray-800 transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>
        )}

        <Link
          to={postUrl}
          className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors w-fit"
        >
          Read more
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path
              fillRule="evenodd"
              d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z"
              clipRule="evenodd"
            />
          </svg>
        </Link>
      </div>
    </article>
  );
};

export default PostListItem;
