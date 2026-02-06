import { Link } from "react-router-dom";
import Image from "./Image";
import { Series } from "../types";
import { getCategoryLabel } from "../constants/categories";

interface SeriesCardProps {
  series: Series;
}

const SeriesCard = ({ series }: SeriesCardProps) => {
  const seriesUrl = `/series/${series.slug}`;
  const postCount = series.postCount || series.posts?.length || 0;

  return (
    <article className="group flex flex-col gap-4 p-4 sm:p-5 rounded-2xl hover:bg-gray-50 transition-colors border border-gray-100 hover:border-gray-200">
      {/* Image */}
      {series.img && (
        <Link
          to={seriesUrl}
          className="w-full aspect-video rounded-xl overflow-hidden bg-gray-100"
        >
          <Image
            src={series.img}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </Link>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col">
        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm mb-2">
          <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium">
            Series
          </span>
          {series.category && series.category !== "general" && (
            <Link
              to={`/series?cat=${series.category}`}
              className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium hover:bg-blue-100 transition-colors"
            >
              {getCategoryLabel(series.category)}
            </Link>
          )}
          <span className="text-gray-500">{postCount} posts</span>
        </div>

        <Link to={seriesUrl} className="block">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-blue-800 transition-colors line-clamp-2 leading-snug">
            {series.name}
          </h2>
        </Link>

        {series.desc && (
          <p className="mt-2 text-gray-600 text-sm line-clamp-3 leading-relaxed">
            {series.desc}
          </p>
        )}

        {series.tags && series.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {series.tags.slice(0, 3).map((tag) => (
              <Link
                key={tag}
                to={`/series?tag=${encodeURIComponent(tag)}`}
                className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 hover:text-gray-800 transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>
        )}

        <Link
          to={seriesUrl}
          className="inline-flex items-center gap-1 mt-auto pt-3 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors w-fit"
        >
          View series
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

export default SeriesCard;
