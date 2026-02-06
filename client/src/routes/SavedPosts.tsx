import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import PostListItem from "../components/PostListItem";
import { getSavedPosts } from "../services";

const SavedPosts = () => {
  const { getToken, isSignedIn } = useAuth();

  const { data, isPending, error } = useQuery({
    queryKey: ["savedPosts"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      return getSavedPosts(token);
    },
    enabled: isSignedIn,
  });

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="w-16 h-16 text-gray-300"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        <h1 className="text-2xl font-bold text-gray-900">Saved Posts</h1>
        <p className="text-gray-500">
          Please sign in to view your saved posts.
        </p>
        <Link
          to="/login"
          className="mt-2 px-6 py-2.5 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-colors"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        <span className="text-gray-500 text-sm">Loading saved posts...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
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
  }

  return (
    <div className="py-8">
      <div className="flex items-center gap-3 mb-8">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-7 h-7 text-blue-600"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        <h1 className="text-2xl font-bold text-gray-900">Saved Posts</h1>
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-gray-400 text-sm">
          {data?.length || 0} {data?.length === 1 ? "post" : "posts"}
        </span>
      </div>

      {data && data.length > 0 ? (
        <div className="flex flex-col gap-2">
          {data.map((post, index) => (
            <PostListItem key={post._id ?? `saved-${index}`} post={post} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="w-16 h-16 text-gray-300"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <span className="text-gray-600 font-medium">No saved posts yet</span>
          <span className="text-gray-400 text-sm">
            Posts you save will appear here
          </span>
          <Link
            to="/posts"
            className="mt-2 px-5 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Browse posts
          </Link>
        </div>
      )}
    </div>
  );
};

export default SavedPosts;
