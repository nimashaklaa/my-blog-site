import PostListItem from "./PostListItem";
import { useInfiniteQuery } from "@tanstack/react-query";
import axios from "axios";
import InfiniteScroll from "react-infinite-scroll-component";
import { useSearchParams } from "react-router-dom";
import { PostsResponse } from "../types";

const fetchPosts = async (pageParam: number, searchParams: URLSearchParams): Promise<PostsResponse> => {
  const searchParamsObj = Object.fromEntries([...searchParams]);

  console.log(searchParamsObj);

  const res = await axios.get(`${import.meta.env.VITE_API_URL}/posts`, {
    params: { page: pageParam, limit: 10, ...searchParamsObj },
  });
  return res.data;
};

const PostList = () => {
  const [searchParams] = useSearchParams();

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ["posts", searchParams.toString()],
    queryFn: ({ pageParam = 1 }) => fetchPosts(pageParam as number, searchParams),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) =>
      lastPage.hasMore ? pages.length + 1 : undefined,
  });

  if (isFetching) return <div>Loading...</div>;
  if (error) return <div>Something went wrong!</div>;

  const allPosts = data?.pages?.flatMap((page) => page.posts || []) || [];
  
  // Filter out any undefined/null posts
  const validPosts = allPosts.filter((post): post is NonNullable<typeof post> => 
    post != null && post._id != null
  );

  if (validPosts.length === 0 && !isFetching) {
    return <div className="text-center py-8">No posts found.</div>;
  }

  return (
    <InfiniteScroll
      dataLength={validPosts.length}
      next={fetchNextPage}
      hasMore={!!hasNextPage}
      loader={<h4>Loading more posts...</h4>}
      endMessage={
        <p>
          <b>All posts loaded!</b>
        </p>
      }
    >
      {validPosts.map((post) => (
        <PostListItem key={post._id} post={post} />
      ))}
    </InfiniteScroll>
  );
};

export default PostList;

