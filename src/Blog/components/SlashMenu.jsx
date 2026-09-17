import { useState, useEffect, useRef } from "react";
import "./SlashMenu.css";

const MENU_ITEMS = [
  { id: "p", category: "Basic", title: "Text Paragraph", icon: "¶", description: "Just start typing plain text" },
  { id: "h1", category: "Basic", title: "Heading 1", icon: "H1", description: "Large section heading" },
  { id: "h2", category: "Basic", title: "Heading 2", icon: "H2", description: "Medium subsection heading" },
  { id: "h3", category: "Basic", title: "Heading 3", icon: "H3", description: "Small section title" },
  { id: "bulletList", category: "Lists & Quotes", title: "Bullet List", icon: "•", description: "Create a simple bulleted list" },
  { id: "orderedList", category: "Lists & Quotes", title: "Numbered List", icon: "1.", description: "Create a numbered list" },
  { id: "blockquote", category: "Lists & Quotes", title: "Quote Block", icon: "❝", description: "Capture a pull quote or reference" },
  { id: "callout", category: "Lists & Quotes", title: "Callout Box", icon: "💡", description: "Highlight a key note or tip" },
  { id: "codeBlock", category: "Media & Embeds", title: "Code Block", icon: "</>", description: "Display code with syntax highlighting" },
  { id: "image", category: "Media & Embeds", title: "Image", icon: "🖼️", description: "Insert image via URL or upload" },
  { id: "drawing", category: "Media & Embeds", title: "Drawing Canvas", icon: "🎨", description: "Open embedded canvas drawing studio" },
  { id: "youtube", category: "Media & Embeds", title: "YouTube Video", icon: "🎥", description: "Embed a video player" },
  { id: "hr", category: "Media & Embeds", title: "Divider", icon: "─", description: "Insert horizontal rule" },
];

const SlashMenu = ({ editor, position, onClose, onOpenDrawingModal }) => {
  const menuRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleSelect = (item) => {
    if (!editor) return;

    // Delete the slash trigger character
    editor.chain().focus().deleteRange({ from: position.from - 1, to: position.to }).run();

    switch (item.id) {
      case "p":
        editor.chain().focus().setParagraph().run();
        break;
      case "h1":
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case "h2":
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case "h3":
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case "bulletList":
        editor.chain().focus().toggleBulletList().run();
        break;
      case "orderedList":
        editor.chain().focus().toggleOrderedList().run();
        break;
      case "blockquote":
        editor.chain().focus().toggleBlockquote().run();
        break;
      case "callout": {
        const text = prompt("Enter callout note:");
        if (text) {
          editor.chain().focus().insertContent({
            type: "blockquote",
            content: [{ type: "paragraph", content: [{ type: "text", text: "💡 Tip: " + text }] }]
          }).run();
        }
        break;
      }
      case "codeBlock":
        editor.chain().focus().toggleCodeBlock().run();
        break;
      case "image": {
        const url = prompt("Enter image URL:");
        if (url) editor.chain().focus().setImage({ src: url }).run();
        break;
      }
      case "drawing":
        if (onOpenDrawingModal) onOpenDrawingModal();
        break;
      case "youtube": {
        const url = prompt("Enter YouTube video URL:");
        if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run();
        break;
      }
      case "hr":
        editor.chain().focus().setHorizontalRule().run();
        break;
      default:
        break;
    }

    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % MENU_ITEMS.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + MENU_ITEMS.length) % MENU_ITEMS.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleSelect(MENU_ITEMS[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex]);

  return (
    <div
      ref={menuRef}
      className="slash-menu"
      style={{ top: position.top + 28, left: Math.min(position.left, window.innerWidth - 320) }}
    >
      <div className="slash-menu__header">
        <span>Insert block</span>
        <span className="slash-menu__hint">↑↓ navigate · enter select</span>
      </div>

      <div className="slash-menu__list">
        {MENU_ITEMS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={`slash-menu__item ${index === selectedIndex ? "active" : ""}`}
            onClick={() => handleSelect(item)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div className="slash-menu__icon">{item.icon}</div>
            <div className="slash-menu__info">
              <span className="slash-menu__title">{item.title}</span>
              <span className="slash-menu__desc">{item.description}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SlashMenu;
