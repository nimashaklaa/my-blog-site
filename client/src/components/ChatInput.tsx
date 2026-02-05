import { useState, useRef, useCallback, KeyboardEvent } from "react";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";

interface ChatInputProps {
  onSubmit: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

const ChatInput = ({
  onSubmit,
  placeholder = "Write a comment...",
  disabled = false,
  autoFocus = false,
}: ChatInputProps) => {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }
  }, []);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setText((prev) => prev + emojiData.emoji);
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="relative flex items-end gap-2 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2">
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowEmoji((prev) => !prev)}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none pb-0.5"
          aria-label="Toggle emoji picker"
        >
          😊
        </button>
        {showEmoji && (
          <div className="absolute bottom-10 left-0 z-50">
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          </div>
        )}
      </div>

      <textarea
        ref={textareaRef}
        rows={1}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          adjustHeight();
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className="flex-1 resize-none bg-transparent outline-none text-sm leading-5 max-h-[120px] py-1"
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!text.trim() || disabled}
        className={`text-xl leading-none pb-0.5 transition-colors ${
          text.trim() && !disabled
            ? "text-blue-600 hover:text-blue-800 cursor-pointer"
            : "text-gray-300 cursor-default"
        }`}
        aria-label="Send comment"
      >
        ➤
      </button>
    </div>
  );
};

export default ChatInput;
