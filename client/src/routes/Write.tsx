import { useAuth, useUser } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { useCallback, useEffect, useState, useRef, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import Upload from "../components/Upload";
import Image from "../components/Image";
import Editor from "../components/Editor";
import { Post } from "../types";
import { CATEGORIES } from "../constants/categories";

const API_URL = import.meta.env.VITE_API_URL;

interface UploadData {
  filePath?: string;
  url?: string;
}

interface DraftRecord {
  _id: string;
  title: string;
  category: string;
  tags?: string[];
  desc: string;
  content: string;
  img?: string;
  updatedAt: string;
}

const MAX_TAGS = 5;

const Write = () => {
  const { getToken } = useAuth();
  const { isLoaded, isSignedIn, user } = useUser();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { slug: editSlug } = useParams<{ slug?: string }>();
  const isEditMode = !!editSlug;

  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("general");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [desc, setDesc] = useState("");
  const [value, setValue] = useState("");
  const [cover, setCover] = useState<UploadData>({});
  const [progress, setProgress] = useState(0);
  const [editorKey, setEditorKey] = useState(0);
  const [initialEditorContent, setInitialEditorContent] = useState("");
  const [coverPosition, setCoverPosition] = useState({ x: 50, y: 50 });
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const coverRef = useRef<HTMLDivElement>(null);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const lastSyncedDraftIdRef = useRef<string | null>(null);
  const editPostLoadedRef = useRef<string | null>(null);

  const isAdmin = (user?.publicMetadata?.role as string) === "admin" || false;

  const authHeaders = async () => ({
    Authorization: `Bearer ${await getTokenRef.current()}`,
  });

  const { data: editPost, isLoading: editPostLoading } = useQuery({
    queryKey: ["post", editSlug],
    queryFn: async () => {
      const res = await axios.get<Post>(`${API_URL}/posts/${editSlug}`);
      return res.data;
    },
    enabled: isEditMode,
  });

  useEffect(() => {
    if (
      editPost &&
      editPost.slug === editSlug &&
      editPostLoadedRef.current !== editSlug
    ) {
      editPostLoadedRef.current = editSlug!;
      setTitle(editPost.title);
      setCategory(editPost.category || "general");
      setTags(editPost.tags ?? []);
      setDesc(editPost.desc || "");
      setValue(editPost.content || "");
      setInitialEditorContent(editPost.content || "");
      setCover(editPost.img ? { filePath: editPost.img } : {});
      setEditorKey((k) => k + 1);
    }
  }, [editPost, editSlug]);

  const { data: drafts = [], isLoading: draftsLoading } = useQuery({
    queryKey: ["drafts"],
    queryFn: async () => {
      const res = await axios.get<DraftRecord[]>(`${API_URL}/drafts`, {
        headers: await authHeaders(),
      });
      return res.data;
    },
    enabled: isLoaded && isSignedIn && isAdmin,
  });

  const { data: currentDraft, isLoading: draftLoading } = useQuery({
    queryKey: ["draft", selectedDraftId],
    queryFn: async () => {
      if (!selectedDraftId) return null;
      const res = await axios.get<DraftRecord>(
        `${API_URL}/drafts/${selectedDraftId}`,
        {
          headers: await authHeaders(),
        }
      );
      return res.data;
    },
    enabled: isLoaded && isSignedIn && isAdmin && !!selectedDraftId,
  });

  useEffect(() => {
    if (!selectedDraftId) {
      lastSyncedDraftIdRef.current = null;
      return;
    }
    if (
      currentDraft &&
      currentDraft._id === selectedDraftId &&
      currentDraft._id !== lastSyncedDraftIdRef.current
    ) {
      lastSyncedDraftIdRef.current = currentDraft._id;
      setTitle(currentDraft.title);
      setCategory(currentDraft.category || "general");
      setTags(currentDraft.tags ?? []);
      setDesc(currentDraft.desc || "");
      setValue(currentDraft.content || "");
      setInitialEditorContent(currentDraft.content || "");
      setCover(currentDraft.img ? { filePath: currentDraft.img } : {});
      setEditorKey((k) => k + 1);
    }
  }, [currentDraft, selectedDraftId]);

  // Reset cover position when cover image changes
  useEffect(() => {
    setCoverPosition({ x: 50, y: 50 });
  }, [cover.url, cover.filePath]);

  const handleCoverPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    setIsDraggingCover(true);
  }, []);

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

  const hasContentToSave = !!(
    title.trim() ||
    value.trim() ||
    desc.trim() ||
    cover.filePath
  );

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !isAdmin || isEditMode) return;
    const timer = setTimeout(async () => {
      const payload = {
        title,
        category,
        tags: tags.slice(0, MAX_TAGS),
        desc,
        content: value,
        img: cover.filePath || "",
      };
      try {
        if (selectedDraftId) {
          await axios.put(`${API_URL}/drafts/${selectedDraftId}`, payload, {
            headers: await authHeaders(),
          });
        } else if (hasContentToSave) {
          const res = await axios.post<DraftRecord>(
            `${API_URL}/drafts`,
            payload,
            {
              headers: await authHeaders(),
            }
          );
          setSelectedDraftId(res.data._id);
        }
        if (selectedDraftId || hasContentToSave) {
          queryClient.invalidateQueries({ queryKey: ["drafts"] });
        }
      } catch {
        // silent fail for auto-save
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [
    isLoaded,
    isSignedIn,
    isAdmin,
    title,
    category,
    tags,
    desc,
    value,
    cover.filePath,
    selectedDraftId,
    hasContentToSave,
    queryClient,
  ]);

  const createPostMutation = useMutation({
    mutationFn: async (newPost: {
      img: string;
      title: string;
      category: string;
      tags: string[];
      desc: string;
      content: string;
    }) => {
      const token = await getTokenRef.current();
      return axios.post(`${API_URL}/posts`, newPost, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: async (res) => {
      if (selectedDraftId) {
        try {
          await axios.delete(`${API_URL}/drafts/${selectedDraftId}`, {
            headers: await authHeaders(),
          });
          queryClient.invalidateQueries({ queryKey: ["drafts"] });
        } catch {
          // ignore
        }
      }
      toast.success("Post has been created");
      navigate(`/${res.data.slug}`);
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<
        | string
        | { error?: string; message?: string; details?: string | string[] }
      >;
      let errorMessage = "Failed to create post. Please try again.";
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

  const updatePostMutation = useMutation({
    mutationFn: async (updatedPost: {
      img: string;
      title: string;
      category: string;
      tags: string[];
      desc: string;
      content: string;
    }) => {
      const token = await getTokenRef.current();
      return axios.put(`${API_URL}/posts/${editPost?._id}`, updatedPost, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post", editSlug] });
      toast.success("Post has been updated");
      navigate(`/${editSlug}`);
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<
        | string
        | { error?: string; message?: string; details?: string | string[] }
      >;
      let errorMessage = "Failed to update post. Please try again.";
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

  const deleteDraftMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`${API_URL}/drafts/${id}`, {
        headers: await authHeaders(),
      });
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
      if (selectedDraftId === id) {
        setSelectedDraftId(null);
        setTitle("");
        setCategory("general");
        setTags([]);
        setDesc("");
        setValue("");
        setInitialEditorContent("");
        setCover({});
        setEditorKey((k) => k + 1);
      }
      toast.success("Draft deleted");
    },
    onError: () => toast.error("Failed to delete draft"),
  });

  useEffect(() => {
    if (isLoaded && (!isSignedIn || !isAdmin)) {
      toast.error("Only admins can create posts!");
      navigate("/");
    }
  }, [isLoaded, isSignedIn, isAdmin, navigate]);

  if (!isLoaded) return <div className="">Loading...</div>;
  if (isLoaded && !isSignedIn) return <div className="">You should login!</div>;
  if (isLoaded && isSignedIn && !isAdmin)
    return <div className="">Only admins can create posts!</div>;

  const handleNewDraft = () => {
    setSelectedDraftId(null);
    setTitle("");
    setCategory("general");
    setTags([]);
    setDesc("");
    setValue("");
    setInitialEditorContent("");
    setCover({});
    setEditorKey((k) => k + 1);
  };

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

  const handleSelectDraft = (id: string) => {
    setSelectedDraftId(id);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const payload = {
      img: cover.filePath || "",
      title: title.trim(),
      category,
      tags: tags.slice(0, MAX_TAGS),
      desc: desc.trim(),
      content: value,
    };
    if (isEditMode) {
      updatePostMutation.mutate(payload);
    } else {
      createPostMutation.mutate(payload);
    }
  };

  const isLoadingDraft = !!selectedDraftId && draftLoading;
  const isMutating = isEditMode
    ? updatePostMutation.isPending
    : createPostMutation.isPending;

  return (
    <div className="min-h-[calc(100vh-64px)] md:min-h-[calc(100vh-80px)] flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-cl font-light">
          {isEditMode ? "Edit Post" : "Create a New Post"}
        </h1>
        {!isEditMode && (
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-sm text-gray-600">Drafts:</label>
            <select
              className="p-2 rounded-xl bg-white shadow-md text-sm min-w-[180px]"
              value={selectedDraftId ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") handleNewDraft();
                else handleSelectDraft(v);
              }}
              disabled={draftsLoading}
            >
              <option value="">New draft</option>
              {drafts.map((d, i) => (
                <option key={d._id} value={d._id}>
                  {d.title?.trim() || `Draft ${i + 1}`} (
                  {new Date(d.updatedAt).toLocaleDateString()})
                </option>
              ))}
            </select>
            {selectedDraftId && (
              <button
                type="button"
                onClick={() => deleteDraftMutation.mutate(selectedDraftId)}
                disabled={deleteDraftMutation.isPending}
                className="p-2 rounded-xl text-sm border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Delete draft
              </button>
            )}
          </div>
        )}
      </div>

      {isEditMode && editPostLoading && (
        <div className="text-sm text-gray-500">Loading post...</div>
      )}
      {!isEditMode && isLoadingDraft && (
        <div className="text-sm text-gray-500">Loading draft...</div>
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
          placeholder="My Awesome Story"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
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
        <div className="min-h-[500px] rounded-xl bg-white shadow-md">
          <Editor
            key={editorKey}
            initialContent={initialEditorContent || undefined}
            onChange={setValue}
            editable={progress === 0 || progress >= 100}
          />
        </div>
        <button
          type="submit"
          disabled={isMutating || (progress > 0 && progress < 100)}
          className="bg-blue-800 text-white font-medium rounded-xl mt-4 p-2 w-36 disabled:bg-blue-400 disabled:cursor-not-allowed"
        >
          {isMutating
            ? isEditMode
              ? "Updating..."
              : "Publishing..."
            : isEditMode
              ? "Update"
              : "Publish"}
        </button>
      </form>
    </div>
  );
};

export default Write;
