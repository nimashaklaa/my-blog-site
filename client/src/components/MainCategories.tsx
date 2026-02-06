import { Link, useSearchParams } from "react-router-dom";
import Search from "./Search";
import { CATEGORIES } from "../constants/categories";

const MainCategories = () => {
  const [searchParams] = useSearchParams();
  const currentCat = searchParams.get("cat");

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 w-full min-w-0 overflow-hidden">
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
          <Link
            to="/posts"
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
              !currentCat
                ? "bg-gray-900 text-white shadow-md"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
            }`}
          >
            All
          </Link>
          {CATEGORIES.map(({ value, label }) => {
            const isActive = currentCat === value;
            return (
              <Link
                key={value}
                to={`/posts?cat=${value}`}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-gray-900 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="shrink-0 w-full sm:w-auto sm:min-w-[200px]">
        <Search />
      </div>
    </div>
  );
};

export default MainCategories;
