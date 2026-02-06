import PostListItem from "./PostListItem";
import Pagination from "./Pagination";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { PostsResponse } from "../types";
import { getPosts } from "../services";

const POSTS_PER_PAGE = 10;

const fetchPosts = async (
  page: number,
  searchParams: URLSearchParams
): Promise<PostsResponse> => {
  const params = Object.fromEntries([...searchParams]);
  // Remove page param from searchParams since we pass it separately
  delete params.page;
  return getPosts({ page, limit: POSTS_PER_PAGE, ...params }, null);
};

const PostList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  const { data, error, isFetching } = useQuery({
    queryKey: ["posts", currentPage, searchParams.toString()],
    queryFn: () => fetchPosts(currentPage, searchParams),
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
        <span className="text-gray-500 text-sm">Loading posts...</span>
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

  const posts = data?.posts || [];
  const hasMore = data?.hasMore ?? false;
  const totalPosts = data?.totalPosts ?? 0;
  const totalPages =
    data?.totalPages ?? (hasMore ? currentPage + 1 : Math.max(1, currentPage));

  const validPosts = posts.filter(
    (post): post is NonNullable<typeof post> => post != null && post._id != null
  );

  const rangeStart =
    totalPosts === 0 ? 0 : (currentPage - 1) * POSTS_PER_PAGE + 1;
  const rangeEnd =
    totalPosts === 0
      ? 0
      : (currentPage - 1) * POSTS_PER_PAGE + validPosts.length;

  if (validPosts.length === 0 && !isFetching) {
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
          <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V9a2 2 0 0 0-2-2h-2" />
          <line x1="9" y1="9" x2="10" y2="9" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="13" y2="17" />
        </svg>
        <span className="text-gray-600 font-medium">No posts found</span>
        <span className="text-gray-400 text-sm">
          Try adjusting your filters
        </span>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Posts count info — use API total and actual range on this page */}
      {totalPosts > 0 && (
        <div className="text-sm text-gray-500 mb-4">
          {rangeEnd >= rangeStart ? (
            <>
              Showing {rangeStart}-{rangeEnd} of {totalPosts} posts
            </>
          ) : (
            <>Showing 0 of {totalPosts} posts</>
          )}
        </div>
      )}

      {/* Posts list */}
      <div className="flex flex-col gap-2 overflow-hidden w-full max-w-full">
        {validPosts.map((post) => (
          <PostListItem key={post._id} post={post} />
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

export default PostList;
