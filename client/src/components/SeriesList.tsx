import SeriesCard from "./SeriesCard";
import Pagination from "./Pagination";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { SeriesResponse } from "../types";
import { getSeries } from "../services";

const SERIES_PER_PAGE = 12;

const fetchSeries = async (
  page: number,
  searchParams: URLSearchParams
): Promise<SeriesResponse> => {
  const params = Object.fromEntries([...searchParams]);
  // Remove page param from searchParams since we pass it separately
  delete params.page;
  return getSeries({ page, limit: SERIES_PER_PAGE, ...params }, null);
};

const SeriesList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  const { data, error, isFetching } = useQuery({
    queryKey: ["series", currentPage, searchParams.toString()],
    queryFn: () => fetchSeries(currentPage, searchParams),
  });

  const handlePageChange = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    if (page === 1) {
      newParams.delete("page");
    } else {
      newParams.set("page", page.toString());
    }
    setSearchParams(newParams);
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (isFetching && !data)
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        <span className="text-gray-500 text-sm">Loading series...</span>
      </div>
    );

  if (error)
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
        <span className="text-gray-600 font-medium">Something went wrong</span>
        <span className="text-gray-400 text-sm">Please try again later</span>
      </div>
    );

  const series = data?.series || [];
  const hasMore = data?.hasMore ?? false;
  const totalSeries = data?.totalSeries ?? 0;
  const totalPages =
    data?.totalPages ?? (hasMore ? currentPage + 1 : Math.max(1, currentPage));

  const validSeries = series.filter(
    (s): s is NonNullable<typeof s> => s != null && s._id != null
  );

  const rangeStart =
    totalSeries === 0 ? 0 : (currentPage - 1) * SERIES_PER_PAGE + 1;
  const rangeEnd =
    totalSeries === 0
      ? 0
      : (currentPage - 1) * SERIES_PER_PAGE + validSeries.length;

  if (validSeries.length === 0 && !isFetching) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="w-12 h-12 text-gray-300"
        >
          <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z" />
        </svg>
        <span className="text-gray-600 font-medium">No series found</span>
        <span className="text-gray-400 text-sm">
          Try adjusting your filters
        </span>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Series count info */}
      {totalSeries > 0 && (
        <div className="text-sm text-gray-500 mb-4">
          {rangeEnd >= rangeStart ? (
            <>
              Showing {rangeStart}-{rangeEnd} of {totalSeries} series
            </>
          ) : (
            <>Showing 0 of {totalSeries} series</>
          )}
        </div>
      )}

      {/* Series grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
        {validSeries.map((s) => (
          <SeriesCard key={s._id} series={s} />
        ))}
      </div>

      {/* Loading overlay for page transitions */}
      {isFetching && data && (
        <div className="flex items-center justify-center py-4 gap-2">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-gray-500 text-sm">Loading...</span>
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default SeriesList;
