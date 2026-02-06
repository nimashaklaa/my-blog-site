import PostListItem from "./PostListItem";
import { useInfiniteQuery } from "@tanstack/react-query";
import InfiniteScroll from "react-infinite-scroll-component";
import { useSearchParams } from "react-router-dom";
import { PostsResponse } from "../types";
import { getPosts } from "../services";

const fetchPosts = async (
  pageParam: number,
  searchParams: URLSearchParams
): Promise<PostsResponse> => {
  const params = Object.fromEntries([...searchParams]);
  return getPosts({ page: pageParam, limit: 10, ...params }, null);
};

const PostList = () => {
  const [searchParams] = useSearchParams();

  const { data, error, fetchNextPage, hasNextPage, isFetching } =
    useInfiniteQuery({
      queryKey: ["posts", searchParams.toString()],
      queryFn: ({ pageParam = 1 }) =>
        fetchPosts(pageParam as number, searchParams),
      initialPageParam: 1,
      getNextPageParam: (lastPage, pages) =>
        lastPage.hasMore ? pages.length + 1 : undefined,
    });

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

  const allPosts = data?.pages?.flatMap((page) => page.posts || []) || [];

  const validPosts = allPosts.filter(
    (post): post is NonNullable<typeof post> => post != null && post._id != null
  );

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
    <InfiniteScroll
      dataLength={validPosts.length}
      next={fetchNextPage}
      hasMore={!!hasNextPage}
      loader={
        <div className="flex items-center justify-center py-8 gap-3">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-gray-500 text-sm">Loading more...</span>
        </div>
      }
      endMessage={
        validPosts.length > 3 ? (
          <div className="text-center py-8">
            <span className="text-gray-400 text-sm">
              You've reached the end
            </span>
          </div>
        ) : null
      }
      className="flex flex-col gap-2 overflow-hidden w-full max-w-full"
    >
      {validPosts.map((post) => (
        <PostListItem key={post._id} post={post} />
      ))}
    </InfiniteScroll>
  );
};

export default PostList;
