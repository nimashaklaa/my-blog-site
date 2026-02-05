import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { PartialBlock } from "@blocknote/core";
import { useMemo } from "react";

interface PostContentProps {
  content: string;
}

const BlockNoteContent = ({ blocks }: { blocks: PartialBlock[] }) => {
  const editor = useCreateBlockNote({
    initialContent: blocks,
  });

  return <BlockNoteView editor={editor} editable={false} theme="light" />;
};

const PostContent = ({ content }: PostContentProps) => {
  const parsed = useMemo(() => {
    try {
      const result = JSON.parse(content);
      if (Array.isArray(result) && result.length > 0) {
        return result as PartialBlock[];
      }
    } catch {
      // Not valid JSON — treat as legacy HTML
    }
    return null;
  }, [content]);

  if (parsed) {
    return <BlockNoteContent blocks={parsed} />;
  }

  // Legacy HTML content
  return <div dangerouslySetInnerHTML={{ __html: content }} />;
};

export default PostContent;
