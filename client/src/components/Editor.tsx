import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { Block, PartialBlock } from "@blocknote/core";
import { useEffect, useRef } from "react";

interface EditorProps {
  onChange: (jsonString: string) => void;
  initialContent?: string;
  editable?: boolean;
}

async function uploadFile(file: File): Promise<string> {
  const publicKey = import.meta.env.VITE_IK_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error(
      "VITE_IK_PUBLIC_KEY is not configured. Add it to your .env file."
    );
  }

  const { getUploadAuth } = await import("../services");
  const { signature, expire, token } = await getUploadAuth();

  // 2. Upload file to ImageKit
  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", file.name);
  formData.append("publicKey", publicKey);
  formData.append("signature", signature);
  formData.append("expire", expire);
  formData.append("token", token);

  const uploadRes = await fetch(
    "https://upload.imagekit.io/api/v1/files/upload",
    { method: "POST", body: formData }
  );
  if (!uploadRes.ok) {
    throw new Error("Failed to upload file to ImageKit");
  }
  const uploadData = await uploadRes.json();
  return uploadData.url;
}

function parseInitialContent(content?: string): PartialBlock[] | undefined {
  if (!content) return undefined;
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as PartialBlock[];
    }
  } catch {
    // Not valid JSON — ignore (could be legacy HTML)
  }
  return undefined;
}

const Editor = ({ onChange, initialContent, editable = true }: EditorProps) => {
  const editor = useCreateBlockNote({
    initialContent: parseInitialContent(initialContent),
    uploadFile,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Prevent mouse-wheel scroll inside floating menus (slash menu, etc.) from
  // propagating to the editor/page, which causes the menu to reposition and close.
  useEffect(() => {
    function handleWheel(e: WheelEvent) {
      const menu = (e.target as Element)?.closest?.(
        ".bn-suggestion-menu, .bn-grid-suggestion-menu"
      );
      if (menu) {
        e.stopPropagation();
      }
    }
    document.addEventListener("wheel", handleWheel, { capture: true });
    return () => {
      document.removeEventListener("wheel", handleWheel, { capture: true });
    };
  }, []);

  const handleChange = () => {
    const blocks: Block[] = editor.document;
    onChange(JSON.stringify(blocks));
  };

  return (
    <div ref={containerRef}>
      <BlockNoteView
        editor={editor}
        editable={editable}
        onChange={handleChange}
        theme="light"
      />
    </div>
  );
};

export default Editor;
