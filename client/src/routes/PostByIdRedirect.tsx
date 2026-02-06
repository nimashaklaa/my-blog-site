import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPostById } from "../services";

/** Fetches post by id and redirects to canonical URL by slug. */
const PostByIdRedirect = () => {
  const { id } = useParams<{ id: string }>();

  const { data, isPending, error } = useQuery({
    queryKey: ["postById", id],
    queryFn: () => getPostById(id!, null),
    enabled: !!id,
  });

  if (!id) return <Navigate to="/posts" replace />;
  if (isPending) return <div>Loading...</div>;
  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <p className="text-gray-600 mb-4">Post not found.</p>
        <Link to="/posts" className="text-blue-600 hover:underline">
          Back to posts
        </Link>
      </div>
    );
  }
  return <Navigate to={`/${data.slug}`} replace />;
};

export default PostByIdRedirect;
