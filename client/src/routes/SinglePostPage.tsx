import { Link, useParams } from "react-router-dom";
import { useUser, useAuth } from "@clerk/clerk-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "../components/Image";
import PostMenuActions from "../components/PostMenuActions";
import Comments from "../components/Comments";
import PostContent from "../components/PostContent";
import { AxiosError } from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Post } from "../types";
import { toast } from "react-toastify";
import { getPost, toggleClap, getComments, getSeriesById } from "../services";

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

/** BlockNote block with optional props (level, url, caption). */
interface BlockForMd {
  type?: string;
  content?: { text?: string }[];
  children?: BlockForMd[];
  props?: { level?: number; url?: string; caption?: string };
}

/** Convert post content (BlockNote JSON or HTML) to Markdown. */
function contentToMarkdown(content: string): string {
  try {
    const parsed = JSON.parse(content) as BlockForMd[];
    if (!Array.isArray(parsed)) throw new Error("not array");

    const lines: string[] = [];

    function processBlock(block: BlockForMd, listPrefix?: string): void {
      const text = getInlineText(block.content).trim();

      switch (block.type) {
        case "heading": {
          const level = Math.min(6, Math.max(1, block.props?.level ?? 1));
          lines.push(`${"#".repeat(level)} ${text}`);
          break;
        }
        case "bulletListItem":
          lines.push(`${listPrefix ?? "-"} ${text}`);
          break;
        case "numberedListItem":
          lines.push(`${listPrefix ?? "1."} ${text}`);
          break;
        case "checkListItem":
          lines.push(`- [ ] ${text}`);
          break;
        case "codeBlock":
          lines.push("```");
          lines.push(text || "");
          lines.push("```");
          break;
        case "image": {
          const url = block.props?.url ?? "";
          const caption = block.props?.caption?.trim();
          if (caption) lines.push(`![${caption}](${url})`);
          else lines.push(`![](${url})`);
          break;
        }
        default:
          if (text) lines.push(text);
          break;
      }

      if (block.children?.length) {
        for (let i = 0; i < block.children.length; i++) {
          const child = block.children[i];
          const subPrefix =
            child.type === "numberedListItem" ? `${i + 1}.` : "  -";
          processBlock(child, subPrefix);
        }
      }
    }

    for (const block of parsed) {
      processBlock(block);
    }

    return lines
      .join("\n\n")
      .replace(/\n\n\n+/g, "\n\n")
      .trim();
  } catch {
    // Legacy HTML: strip tags to plain text, basic structure
    const div = document.createElement("div");
    div.innerHTML = content;
    const walk = (el: Element): string[] => {
      const out: string[] = [];
      for (const node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          const t = node.textContent?.trim();
          if (t) out.push(t);
          continue;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const e = node as Element;
        const tag = e.tagName.toLowerCase();
        const inner = walk(e).join(" ");
        if (tag === "h1") out.push(`# ${inner}`);
        else if (tag === "h2") out.push(`## ${inner}`);
        else if (tag === "h3") out.push(`### ${inner}`);
        else if (tag === "p" || tag === "div") out.push(inner);
        else if (tag === "li") out.push(`- ${inner}`);
        else if (tag === "pre" || tag === "code")
          out.push("```\n" + inner + "\n```");
        else if (inner) out.push(inner);
      }
      return out;
    };
    return walk(div).filter(Boolean).join("\n\n");
  }
}

function getPostMarkdown(post: Post): string {
  const mdContent = contentToMarkdown(post.content);
  const dateStr = formatPostDate(post.createdAt);
  const parts: string[] = [`# ${post.title}`, "", dateStr, ""];
  if (post.img) parts.push(`![Cover](${post.img})`, "");
  parts.push(mdContent);
  return parts.join("\n");
}

function downloadPostAsMarkdown(post: Post): void {
  const text = getPostMarkdown(post);
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${post.slug || post._id}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

const isValidSlug = (s: string | undefined): s is string =>
  !!s && s !== "undefined" && s.trim() !== "";

const SinglePostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useUser();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const { isPending, error, data } = useQuery({
    queryKey: ["post", slug],
    queryFn: () => getPost(slug!, null),
    enabled: isValidSlug(slug),
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", data?._id],
    queryFn: async () => {
      const token = await getToken();
      return getComments(data!._id, token ?? null);
    },
    enabled: !!data?._id,
  });

  // Fetch series if post belongs to one
  const { data: seriesData } = useQuery({
    queryKey: ["series", data?.series],
    queryFn: () => {
      if (typeof data?.series === "string") {
        return getSeriesById(data.series, null);
      }
      return null;
    },
    enabled: !!data?.series && typeof data.series === "string",
  });

  const [moreOpen, setMoreOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [coverPosition, setCoverPosition] = useState({ x: 50, y: 50 });
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const coverRef = useRef<HTMLDivElement>(null);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const hasClapped = data?.hasClapped || false;
  const readTime = data ? getReadTimeMinutes(data.content) : 0;
  const postUrl = useMemo(() => window.location.href, []);

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
      if (!token) throw new Error("Not authenticated");
      return toggleClap(data!._id, token);
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

  const handleCopyMarkdown = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(getPostMarkdown(data));
      toast.success("Markdown copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
    setExportOpen(false);
  };

  const handleDownloadMarkdown = () => {
    if (data) {
      downloadPostAsMarkdown(data);
      toast.success("Downloaded as Markdown");
    }
    setExportOpen(false);
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

  // Reset cover position when post changes
  useEffect(() => {
    setCoverPosition({ x: 50, y: 50 });
  }, [slug]);

  const handleCoverPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!data?.img) return;
      e.preventDefault();
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      setIsDraggingCover(true);
    },
    [data?.img]
  );

  // Global pointer move/up so dragging works when pointer leaves the cover
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

  if (!isValidSlug(slug)) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <p className="text-gray-600 mb-4">Post not found.</p>
        <Link to="/posts" className="text-blue-600 hover:underline">
          Back to posts
        </Link>
      </div>
    );
  }
  if (isPending) return <div>Loading...</div>;
  if (error) return <div>Something went wrong! {error.message}</div>;
  if (!data) return <div>Post not found!</div>;

  const series = typeof data?.series === "object" ? data.series : seriesData;
  const postsInSeries = series?.posts || [];
  const currentPostIndex = postsInSeries.findIndex(
    (item) =>
      (typeof item.post === "string" ? item.post : item.post._id) === data?._id
  );
  const prevPost =
    currentPostIndex > 0 ? postsInSeries[currentPostIndex - 1] : null;
  const nextPost =
    currentPostIndex >= 0 && currentPostIndex < postsInSeries.length - 1
      ? postsInSeries[currentPostIndex + 1]
      : null;

  return (
    <div className="flex flex-col gap-6 sm:gap-8 max-w-4xl mx-auto w-full min-w-0 px-1 sm:px-0 box-border">
      {/* Title */}
      <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-gray-900">
        {data.title}
      </h1>

      {/* Series Navigation */}
      {series && (
        <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
          <div className="flex items-center gap-2 mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-5 h-5 text-purple-600"
            >
              <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z" />
            </svg>
            <span className="text-sm font-medium text-purple-900">
              Part of series:
            </span>
          </div>
          <Link
            to={`/series/${series.slug}`}
            className="text-lg font-semibold text-purple-700 hover:text-purple-900 transition-colors block mb-3"
          >
            {series.name}
          </Link>
          {(prevPost || nextPost) && (
            <div className="flex gap-2 flex-wrap">
              {prevPost && (
                <Link
                  to={`/${typeof prevPost.post === "string" ? prevPost.post : prevPost.post.slug}`}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-purple-700 text-sm font-medium hover:bg-purple-100 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      fillRule="evenodd"
                      d="M14 8a.75.75 0 0 1-.75.75H4.56l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 0 1 1.06 1.06L4.56 7.25h8.69A.75.75 0 0 1 14 8Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Previous
                </Link>
              )}
              {nextPost && (
                <Link
                  to={`/${typeof nextPost.post === "string" ? nextPost.post : nextPost.post.slug}`}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-purple-700 text-sm font-medium hover:bg-purple-100 transition-colors"
                >
                  Next
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      fillRule="evenodd"
                      d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* Cover image — drag to reposition */}
      {data.img && (
        <div
          ref={coverRef}
          role="img"
          aria-label="Cover image"
          className={`relative w-full h-64 min-h-48 rounded-xl overflow-hidden bg-gray-100 select-none ${
            isDraggingCover ? "cursor-grabbing" : "cursor-grab"
          }`}
          onPointerDown={handleCoverPointerDown}
          style={{ touchAction: "none" }}
        >
          <div className="absolute inset-0 pointer-events-none">
            <Image
              src={data.img}
              alt=""
              className="w-full h-full object-cover"
              style={{
                objectPosition: `${coverPosition.x}% ${coverPosition.y}%`,
              }}
            />
          </div>
          <span className="sr-only">Drag to adjust cover position</span>
        </div>
      )}

      {/* Meta: date + read time + listen */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-gray-500 text-sm">
        <time dateTime={data.createdAt}>{formatPostDate(data.createdAt)}</time>
        <span aria-hidden>·</span>
        <span>{readTime} min read</span>
        <span aria-hidden>·</span>
        {data.tags && data.tags.length > 0 && (
          <>
            {data.tags.map((tag) => (
              <Link
                key={tag}
                to={`/posts?tag=${encodeURIComponent(tag)}`}
                className="text-blue-600 hover:underline"
              >
                #{tag}
              </Link>
            ))}
            <span aria-hidden>·</span>
          </>
        )}
        <button
          type="button"
          onClick={handleListen}
          className={`flex items-center gap-1.5 transition-colors touch-manipulation ${
            isSpeaking ? "text-blue-800" : "text-gray-500 hover:text-gray-700"
          } cursor-pointer min-h-[44px] min-w-[44px] -m-1 p-1 justify-center`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4 shrink-0"
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
          <span className="whitespace-nowrap">
            {isSpeaking ? "Stop" : "Listen"}
          </span>
        </button>
      </div>

      {/* Action bar */}
      <div className="border-t border-b border-gray-400 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-3 sm:gap-5 min-w-0">
          <button
            type="button"
            onClick={handleClap}
            disabled={clapMutation.isPending}
            className={`flex items-center gap-1.5 transition-colors touch-manipulation min-h-[44px] px-1 -mx-1 rounded ${
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
              className="w-5 h-5 shrink-0"
            >
              <path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-3.33 8A2 2 0 0 1 17.5 22H4.02a2 2 0 0 1-2-1.74l-1.38-9A2 2 0 0 1 2.64 10H7" />
            </svg>
            <span className="text-sm tabular-nums">{clapCount}</span>
          </button>
          <a
            href="#comments"
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors min-h-[44px] items-center px-1 -mx-1 rounded touch-manipulation"
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
              className="w-5 h-5 shrink-0"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-sm tabular-nums">{comments.length}</span>
          </a>
        </div>
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportOpen((o) => !o)}
              className="p-2.5 sm:p-2 text-gray-500 hover:text-gray-700 rounded-full transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Export as Markdown"
              title="Export as Markdown"
              aria-expanded={exportOpen}
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
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
            {exportOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  aria-hidden
                  onClick={() => setExportOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 py-1 min-w-[160px] max-w-[calc(100vw-2rem)] w-max bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                  <button
                    type="button"
                    onClick={handleCopyMarkdown}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-4 h-4"
                    >
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                    Copy Markdown
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadMarkdown}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-4 h-4"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download .md
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={handleShare}
            className="p-2.5 sm:p-2 text-gray-500 hover:text-gray-700 rounded-full transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
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
              className="p-2.5 sm:p-2 text-gray-500 hover:text-gray-700 rounded-full transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
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
                <div className="absolute right-0 top-full mt-1 py-1 min-w-[160px] max-w-[calc(100vw-2rem)] w-max bg-white border border-gray-200 rounded-lg shadow-lg z-20">
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
      <div className="lg:text-lg flex flex-col gap-6 text-justify min-w-0 overflow-x-auto">
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
