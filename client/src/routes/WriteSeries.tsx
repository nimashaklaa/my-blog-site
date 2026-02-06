import { useAuth, useUser } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import React, { useEffect, useState, useRef, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import Upload from "../components/Upload";
import Image from "../components/Image";
import { CATEGORIES } from "../constants/categories";
import {
  getSeriesBySlug,
  createSeries,
  updateSeries,
  getPosts,
} from "../services";
import { Post } from "../types";

interface UploadData {
  filePath?: string;
  url?: string;
}

const MAX_TAGS = 5;

const WriteSeries = () => {
  const { getToken } = useAuth();
  const { isLoaded, isSignedIn, user } = useUser();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { slug: editSlug } = useParams<{ slug?: string }>();
  const isEditMode = !!editSlug;

  const [name, setName] = useState("");
  const [category, setCategory] = useState("general");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [desc, setDesc] = useState("");
  const [cover, setCover] = useState<UploadData>({});
  const [progress, setProgress] = useState(0);
  const [coverPosition, setCoverPosition] = useState({ x: 50, y: 50 });
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const coverRef = useRef<HTMLDivElement>(null);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  // Post management
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPosts, setSelectedPosts] = useState<
    Array<{ post: Post; order: number }>
  >([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const isAdmin = (user?.publicMetadata?.role as string) === "admin" || false;

  const getTokenForRequest = async () => {
    const t = await getTokenRef.current();
    if (!t) throw new Error("Not authenticated");
    return t;
  };

  const { data: editSeries, isLoading: editSeriesLoading } = useQuery({
    queryKey: ["series", editSlug],
    queryFn: () => getSeriesBySlug(editSlug!, null),
    enabled: isEditMode,
  });

  const { data: postsData } = useQuery({
    queryKey: ["posts-search", searchQuery],
    queryFn: () =>
      getPosts({ search: searchQuery, limit: 20, sort: "newest" }, null),
    enabled: searchQuery.length > 0,
  });

  useEffect(() => {
    if (editSeries && editSeries.slug === editSlug) {
      setName(editSeries.name);
      setCategory(editSeries.category || "general");
      setTags(editSeries.tags ?? []);
      setDesc(editSeries.desc || "");
      setCover(editSeries.img ? { filePath: editSeries.img } : {});

      // Load posts
      const posts = editSeries.posts
        .map((item) => {
          if (typeof item.post === "string") return null;
          return { post: item.post as Post, order: item.order };
        })
        .filter((item): item is { post: Post; order: number } => item !== null)
        .sort((a, b) => a.order - b.order);

      setSelectedPosts(posts);
    }
  }, [editSeries, editSlug]);

  // Reset cover position when cover image changes
  useEffect(() => {
    setCoverPosition({ x: 50, y: 50 });
  }, [cover.url, cover.filePath]);

  const handleCoverPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    setIsDraggingCover(true);
  };

  useEffect(() => {
    if (!isDraggingCover) return;
    const onMove = (e: PointerEvent) => {
      if (!coverRef.current) return;
      const rect = coverRef.current.getBoundingClientRect();
      const deltaX = e.clientX - lastPointerRef.current.x;
      const deltaY = e.clientY - lastPointerRef.current.y;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      setCoverPosition((prev) => ({
        x: Math.min(100, Math.max(0, prev.x - (deltaX / rect.width) * 100)),
        y: Math.min(100, Math.max(0, prev.y - (deltaY / rect.height) * 100)),
      }));
    };
    const onUp = () => setIsDraggingCover(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isDraggingCover]);

  const addTag = () => {
    const t = tagInput.trim();
    if (!t || tags.length >= MAX_TAGS) return;
    if (tags.includes(t)) {
      setTagInput("");
      return;
    }
    setTags((prev) => [...prev, t].slice(0, MAX_TAGS));
    setTagInput("");
  };

  const removeTag = (index: number) => {
    setTags((prev) => prev.filter((_, i) => i !== index));
  };

  const addPostToSeries = (post: Post) => {
    if (selectedPosts.some((item) => item.post._id === post._id)) {
      toast.info("Post already in series");
      return;
    }
    const maxOrder =
      selectedPosts.length > 0
        ? Math.max(...selectedPosts.map((item) => item.order))
        : 0;
    setSelectedPosts((prev) => [...prev, { post, order: maxOrder + 1 }]);
    setSearchQuery("");
  };

  const removePostFromSeries = (postId: string) => {
    setSelectedPosts((prev) => prev.filter((item) => item.post._id !== postId));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newPosts = [...selectedPosts];
    const draggedPost = newPosts[draggedIndex];
    newPosts.splice(draggedIndex, 1);
    newPosts.splice(index, 0, draggedPost);

    // Update order numbers
    const reordered = newPosts.map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));

    setSelectedPosts(reordered);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const createSeriesMutation = useMutation({
    mutationFn: async (newSeries: {
      img: string;
      name: string;
      category: string;
      tags: string[];
      desc: string;
      posts: Array<{ post: string; order: number }>;
    }) => {
      const token = await getTokenForRequest();
      return createSeries(newSeries, token);
    },
    onSuccess: (created) => {
      toast.success("Series has been created");
      navigate(`/series/${created.slug}`);
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<
        | string
        | { error?: string; message?: string; details?: string | string[] }
      >;
      let errorMessage = "Failed to create series. Please try again.";
      if (axiosError.response?.data) {
        const d = axiosError.response.data;
        if (typeof d === "string") errorMessage = d;
        else if (d && typeof d === "object" && "error" in d)
          errorMessage = (d as { error?: string }).error ?? errorMessage;
        else if (d && typeof d === "object" && "message" in d)
          errorMessage = (d as { message?: string }).message ?? errorMessage;
      }
      toast.error(errorMessage);
    },
  });

  const updateSeriesMutation = useMutation({
    mutationFn: async (updatedSeries: {
      img: string;
      name: string;
      category: string;
      tags: string[];
      desc: string;
      posts: Array<{ post: string; order: number }>;
    }) => {
      const token = await getTokenForRequest();
      if (!editSeries?._id) throw new Error("No series to update");
      return updateSeries(editSeries._id, updatedSeries, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["series", editSlug] });
      toast.success("Series has been updated");
      navigate(`/series/${editSlug}`);
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<
        | string
        | { error?: string; message?: string; details?: string | string[] }
      >;
      let errorMessage = "Failed to update series. Please try again.";
      if (axiosError.response?.data) {
        const d = axiosError.response.data;
        if (typeof d === "string") errorMessage = d;
        else if (d && typeof d === "object" && "error" in d)
          errorMessage = (d as { error?: string }).error ?? errorMessage;
        else if (d && typeof d === "object" && "message" in d)
          errorMessage = (d as { message?: string }).message ?? errorMessage;
      }
      toast.error(errorMessage);
    },
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const payload = {
      img: cover.filePath || "",
      name: name.trim(),
      category,
      tags: tags.slice(0, MAX_TAGS),
      desc: desc.trim(),
      posts: selectedPosts.map((item) => ({
        post: item.post._id,
        order: item.order,
      })),
    };
    if (isEditMode) {
      updateSeriesMutation.mutate(payload);
    } else {
      createSeriesMutation.mutate(payload);
    }
  };

  useEffect(() => {
    if (isLoaded && (!isSignedIn || !isAdmin)) {
      toast.error("Only admins can create series!");
      navigate("/");
    }
  }, [isLoaded, isSignedIn, isAdmin, navigate]);

  if (!isLoaded) return <div className="">Loading...</div>;
  if (isLoaded && !isSignedIn) return <div className="">You should login!</div>;
  if (isLoaded && isSignedIn && !isAdmin)
    return <div className="">Only admins can create series!</div>;

  const isMutating = isEditMode
    ? updateSeriesMutation.isPending
    : createSeriesMutation.isPending;

  return (
    <div className="min-h-[calc(100vh-64px)] md:min-h-[calc(100vh-80px)] flex flex-col gap-6">
      <h1 className="text-cl font-light">
        {isEditMode ? "Edit Series" : "Create a New Series"}
      </h1>

      {isEditMode && editSeriesLoading && (
        <div className="text-sm text-gray-500">Loading series...</div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 flex-1 mb-6">
        <div className="flex flex-col gap-2">
          {cover.url || cover.filePath ? (
            <div
              ref={coverRef}
              className={`relative w-full h-64 min-h-48 rounded-xl overflow-hidden bg-gray-100 select-none ${
                isDraggingCover ? "cursor-grabbing" : "cursor-grab"
              }`}
              onPointerDown={handleCoverPointerDown}
              style={{ touchAction: "none" }}
            >
              <div className="absolute inset-0 pointer-events-none">
                <Image
                  src={cover.url || cover.filePath || ""}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                  style={{
                    objectPosition: `${coverPosition.x}% ${coverPosition.y}%`,
                  }}
                />
              </div>
              <Upload type="image" setProgress={setProgress} setData={setCover}>
                <button
                  type="button"
                  className="absolute bottom-2 right-2 z-10 p-2 shadow-md rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200"
                >
                  Change cover
                </button>
              </Upload>
              <span className="sr-only">
                Drag to adjust which part of the image is visible
              </span>
            </div>
          ) : (
            <Upload type="image" setProgress={setProgress} setData={setCover}>
              <button
                type="button"
                className="w-max p-2 shadow-md rounded-xl text-sm text-gray-500 bg-white"
              >
                Add a cover image
              </button>
            </Upload>
          )}
        </div>
        <input
          className="text-4xl font-semibold bg-transparent outline-none"
          type="text"
          placeholder="Series Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="category" className="text-sm shrink-0">
              Category
            </label>
            <select
              id="category"
              className="p-2 rounded-xl bg-white shadow-md"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <label htmlFor="tags" className="text-sm shrink-0">
              Tags (max {MAX_TAGS})
            </label>
            <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-white shadow-md border border-gray-200 min-h-[42px] flex-1 min-w-[140px]">
              {tags.map((t, i) => (
                <span
                  key={`${t}-${i}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-800 text-sm"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => removeTag(i)}
                    className="text-gray-500 hover:text-red-600 rounded-full p-0.5"
                    aria-label={`Remove ${t}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-3.5 h-3.5"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </span>
              ))}
              {tags.length < MAX_TAGS && (
                <input
                  id="tags"
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Type a tag and press Enter"
                  className="flex-1 min-w-[120px] bg-transparent outline-none text-sm"
                />
              )}
            </div>
          </div>
        </div>
        <textarea
          className="p-4 rounded-xl bg-white shadow-md"
          placeholder="A Short Description"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />

        {/* Post Management Section */}
        <div className="p-6 rounded-xl bg-white shadow-md">
          <h2 className="text-xl font-semibold mb-4">Posts in Series</h2>

          {/* Search Posts */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search posts to add..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && postsData && postsData.posts.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                {postsData.posts.map((post) => (
                  <button
                    key={post._id}
                    type="button"
                    onClick={() => addPostToSeries(post)}
                    className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-sm">{post.title}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {post.category}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Posts */}
          <div className="space-y-2">
            {selectedPosts.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">
                No posts added yet. Search and add posts above.
              </p>
            ) : (
              selectedPosts.map((item, index) => (
                <div
                  key={item.post._id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50 cursor-move hover:bg-gray-100 ${
                    draggedIndex === index ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {item.post.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.post.category}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePostFromSeries(item.post._id)}
                    className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-4 h-4"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isMutating || (progress > 0 && progress < 100)}
          className="bg-black text-white font-medium rounded-xl mt-4 p-2 w-[300px] disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          {isMutating
            ? isEditMode
              ? "Updating..."
              : "Creating..."
            : isEditMode
              ? "Update"
              : "Create"}
        </button>
      </form>
    </div>
  );
};

export default WriteSeries;
