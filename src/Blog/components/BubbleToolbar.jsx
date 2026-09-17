import { useState, useEffect } from "react";
import "./BubbleToolbar.css";

const BubbleToolbar = ({ editor }) => {
  const [position, setPosition] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!editor) return;

    const updatePosition = () => {
      const { selection } = editor.state;
      if (selection.empty) {
        setVisible(false);
        return;
      }

      const domSelection = window.getSelection();
      if (!domSelection || domSelection.rangeCount === 0 || domSelection.isCollapsed) {
        setVisible(false);
        return;
      }

      const range = domSelection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      if (rect.width === 0 || rect.height === 0) {
        setVisible(false);
        return;
      }

      setPosition({
        top: rect.top - 48 + window.scrollY,
        left: rect.left + rect.width / 2 + window.scrollX,
      });
      setVisible(true);
    };

    editor.on("selectionUpdate", updatePosition);
    editor.on("transaction", updatePosition);

    return () => {
      editor.off("selectionUpdate", updatePosition);
      editor.off("transaction", updatePosition);
    };
  }, [editor]);

  if (!visible || !position || !editor) return null;

  const setLink = () => {
    const url = prompt("Enter link URL:");
    if (url) editor.chain().focus().setLink({ href: url }).run();
    else editor.chain().focus().unsetLink().run();
  };

  return (
    <div
      className="bubble-toolbar"
      style={{ top: position.top, left: position.left }}
    >
      <button
        type="button"
        className={`bubble-toolbar__btn ${editor.isActive("bold") ? "active" : ""}`}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        B
      </button>
      <button
        type="button"
        className={`bubble-toolbar__btn ${editor.isActive("italic") ? "active" : ""}`}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        I
      </button>
      <button
        type="button"
        className={`bubble-toolbar__btn ${editor.isActive("underline") ? "active" : ""}`}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Underline"
      >
        U
      </button>
      <button
        type="button"
        className={`bubble-toolbar__btn ${editor.isActive("strike") ? "active" : ""}`}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
      >
        S̶
      </button>
      <button
        type="button"
        className={`bubble-toolbar__btn ${editor.isActive("code") ? "active" : ""}`}
        onClick={() => editor.chain().focus().toggleCode().run()}
        title="Code"
      >
        {"</>"}
      </button>
      <div className="bubble-toolbar__divider" />
      <button
        type="button"
        className={`bubble-toolbar__btn ${editor.isActive("heading", { level: 2 }) ? "active" : ""}`}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Heading 2"
      >
        H2
      </button>
      <button
        type="button"
        className={`bubble-toolbar__btn ${editor.isActive("heading", { level: 3 }) ? "active" : ""}`}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Heading 3"
      >
        H3
      </button>
      <button
        type="button"
        className={`bubble-toolbar__btn ${editor.isActive("link") ? "active" : ""}`}
        onClick={setLink}
        title="Link"
      >
        🔗
      </button>
    </div>
  );
};

export default BubbleToolbar;
