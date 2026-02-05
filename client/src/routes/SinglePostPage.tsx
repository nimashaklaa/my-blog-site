import { useParams } from "react-router-dom";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "../components/Image";
import PostMenuActions from "../components/PostMenuActions";
import Comments from "../components/Comments";
import PostContent from "../components/PostContent";
import axios, { AxiosError } from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Post, Comment } from "../types";
import { toast } from "react-toastify";

const API_URL = import.meta.env.VITE_API_URL;

const fetchPost = async (slug: string): Promise<Post> => {
  const res = await axios.get(`${API_URL}/posts/${slug}`);
  return res.data;
};

const fetchComments = async (postId: string): Promise<Comment[]> => {
  const res = await axios.get(`${API_URL}/comments/${postId}`);
  return res.data;
};

interface BlockContent {
  type?: string;
  text?: string;
  content?: BlockContent[];
}

interface Block {
  type?: string;
  content?: BlockContent[];
  children?: Block[];
  props?: { level?: number };
}

function getInlineText(content?: BlockContent[]): string {
  if (!content || !Array.isArray(content)) return "";
  return content.map((c) => c.text || "").join("");
}

/** Extract speech-friendly text from BlockNote JSON or legacy HTML. */
function extractSpeechText(content: string): string {
  try {
    const parsed: Block[] = JSON.parse(content);
    if (!Array.isArray(parsed)) throw new Error("not array");

    let bulletCounter = 0;
    const lines: string[] = [];

    for (const block of parsed) {
      const text = getInlineText(block.content).trim();
      if (!text && block.type !== "image" && block.type !== "video") continue;

      switch (block.type) {
        case "heading":
          // Long pause before headings, announce clearly
          lines.push(`... ${text}.`);
          break;
        case "bulletListItem":
          bulletCounter++;
          lines.push(`Point ${bulletCounter}: ${text}.`);
          break;
        case "numberedListItem":
          bulletCounter++;
          lines.push(`${bulletCounter}. ${text}.`);
          break;
        case "checkListItem":
          lines.push(`Item: ${text}.`);
          break;
        case "codeBlock":
          lines.push(`... Code block: ${text}. ...`);
          break;
        case "image":
        case "video":
          // skip media
          break;
        default:
          // Reset counter when we leave a list
          bulletCounter = 0;
          // Ensure paragraph ends with punctuation for a natural pause
          if (text && !/[.!?;:]$/.test(text)) {
            lines.push(`${text}.`);
          } else {
            lines.push(text);
          }
          break;
      }

      // Process nested children (e.g. indented blocks)
      if (block.children && Array.isArray(block.children)) {
        for (const child of block.children) {
          const childText = getInlineText(child.content).trim();
          if (childText) lines.push(`  ${childText}.`);
        }
      }
    }

    return lines.join("\n");
  } catch {
    // Legacy HTML
    return content
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<\/li>/gi, ". ")
      .replace(/<br\s*\/?>/gi, ". ")
      .replace(/<\/p>/gi, ". ")
      .replace(/<\/h[1-6]>/gi, "... ")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
}

function getReadTimeMinutes(content: string): number {
  const text = extractSpeechText(content);
  const words = text
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function formatPostDate(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const SinglePostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useUser();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const { isPending, error, data } = useQuery({
    queryKey: ["post", slug],
    queryFn: () => fetchPost(slug!),
    enabled: !!slug,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", data?._id],
    queryFn: () => fetchComments(data!._id),
    enabled: !!data?._id,
  });

  const [moreOpen, setMoreOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const hasClapped = data?.hasClapped || false;
  const readTime = data ? getReadTimeMinutes(data.content) : 0;
  const postUrl = useMemo(() => window.location.href, [slug]);

  const handleListen = useCallback(() => {
    const synth = window.speechSynthesis;
    if (isSpeaking) {
      synth.cancel();
      setIsSpeaking(false);
      return;
    }
    if (!data) return;
    const fullText = extractSpeechText(data.content);
    if (!fullText.trim()) return;

    // Pick a natural-sounding English voice
    const voices = synth.getVoices();
    const preferred = voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        (v.name.includes("Google") ||
          v.name.includes("Samantha") ||
          v.name.includes("Daniel") ||
          v.name.includes("Karen") ||
          v.name.includes("Natural"))
    );
    const fallback = voices.find((v) => v.lang.startsWith("en"));

    // Split into sentences so the browser can breathe between them.
    // SpeechSynthesis handles short chunks much better than one giant string.
    const sentences = fullText
      .split(/(?<=[.!?…])\s+|(?<=\.{3})\s+|\n+/)
      .map((s) => s.trim())
      .filter(Boolean);

    let idx = 0;
    const speakNext = () => {
      if (idx >= sentences.length) {
        setIsSpeaking(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(sentences[idx]);
      utterance.rate = 0.95;
      utterance.pitch = 1;
      if (preferred) utterance.voice = preferred;
      else if (fallback) utterance.voice = fallback;
      utterance.onend = () => {
        idx++;
        speakNext();
      };
      utterance.onerror = () => setIsSpeaking(false);
      utteranceRef.current = utterance;
      synth.speak(utterance);
    };

    synth.cancel();
    speakNext();
    setIsSpeaking(true);
  }, [isSpeaking, data]);

  // Load voices (some browsers load them async)
  useEffect(() => {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const clapMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        toast.error("Please login to clap!");
        return;
      }
      const token = await getToken();
      return axios.patch(
        `${import.meta.env.VITE_API_URL}/posts/clap/${data!._id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post", slug] });
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{
        error?: string;
        message?: string;
      }>;
      toast.error(
        axiosError.response?.data?.error ||
          axiosError.response?.data?.message ||
          "Failed to clap"
      );
    },
  });

  const handleClap = () => {
    if (!user) {
      toast.error("Please login to clap!");
      return;
    }
    clapMutation.mutate();
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: data!.title,
          text: data!.desc || undefined,
          url: postUrl,
        });
        toast.success("Link copied to share");
      } else {
        await navigator.clipboard.writeText(postUrl);
        toast.success("Link copied to clipboard");
      }
    } catch {
      await navigator.clipboard.writeText(postUrl);
      toast.success("Link copied to clipboard");
    }
  };

  const clapCount = data?.clapCount ?? data?.claps?.length ?? 0;

  if (isPending) return <div>Loading...</div>;
  if (error) return <div>Something went wrong! {error.message}</div>;
  if (!data) return <div>Post not found!</div>;

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      {/* Cover image */}
      {data.img && (
        <div className="w-full rounded-xl overflow-hidden bg-gray-100 max-h-64">
          <Image
            src={data.img}
            alt=""
            className="w-full h-full object-cover max-h-64"
          />
        </div>
      )}

      {/* Title */}
      <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-gray-900">
        {data.title}
      </h1>

      {/* Meta: date + read time + listen */}
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <time dateTime={data.createdAt}>{formatPostDate(data.createdAt)}</time>
        <span aria-hidden>·</span>
        <span>{readTime} min read</span>
        <span aria-hidden>·</span>
        <button
          type="button"
          onClick={handleListen}
          className={`flex items-center gap-1 transition-colors ${
            isSpeaking ? "text-blue-800" : "text-gray-500 hover:text-gray-700"
          } cursor-pointer`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            {isSpeaking ? (
              <>
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </>
            ) : (
              <>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </>
            )}
          </svg>
          <span>{isSpeaking ? "Stop" : "Listen"}</span>
        </button>
      </div>

      {/* Action bar */}
      <div className="border-t border-b border-gray-400 py-2 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={handleClap}
            disabled={clapMutation.isPending}
            className={`flex items-center gap-1.5 transition-colors ${
              hasClapped ? "text-blue-800" : "text-gray-500 hover:text-gray-700"
            } ${clapMutation.isPending ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            aria-label="Clap"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill={hasClapped ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-3.33 8A2 2 0 0 1 17.5 22H4.02a2 2 0 0 1-2-1.74l-1.38-9A2 2 0 0 1 2.64 10H7" />
            </svg>
            <span className="text-sm">{clapCount}</span>
          </button>
          <a
            href="#comments"
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Comments"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-sm">{comments.length}</span>
          </a>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleShare}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-full transition-colors"
            aria-label="Share"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-full transition-colors"
              aria-label="More actions"
              aria-expanded={moreOpen}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-5 h-5"
              >
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
            </button>
            {moreOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  aria-hidden
                  onClick={() => setMoreOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 py-1 min-w-[180px] bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                  <PostMenuActions
                    post={data}
                    onAction={() => setMoreOpen(false)}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="lg:text-lg flex flex-col gap-6 text-justify">
        <PostContent content={data.content} />
      </div>

      {/* Comments */}
      <div id="comments">
        <Comments postId={data._id} />
      </div>
    </div>
  );
};

export default SinglePostPage;
