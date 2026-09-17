import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import Youtube from "@tiptap/extension-youtube";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { getPoster, isLoggedIn, getSanityWriteToken, setCustomSanityWriteToken } from "../lib/blogAuth";
import {
    blogReadClient, createBlogWriteClient,
    blogByIdQuery, generateSlug, createBlogDoc
} from "../lib/blogSanity";
import {
    STATUS, STATUS_LABELS, canPosterEdit
} from "../lib/blogHelpers";
import { PortableTextRenderer } from "../PortableTextRenderer";
import SlashMenu from "../components/SlashMenu";
import BubbleToolbar from "../components/BubbleToolbar";
import DrawingBlock, { DrawingModal } from "../components/DrawingBlock";
import "./BlogEditor.css";

// ─── Convert TipTap JSON to Sanity Portable Text ─────────────────────────────

const tiptapToPortableText = (doc) => {
    if (!doc?.content) return [];
    const blocks = [];

    const processContent = (content) => {
        content.forEach((node) => {
            switch (node.type) {
                case "heading": {
                    blocks.push({
                        _type: "block",
                        _key: Math.random().toString(36).slice(2),
                        style: `h${node.attrs?.level || 2}`,
                        children: nodeToSpans(node.content || []),
                        markDefs: [],
                    });
                    break;
                }
                case "paragraph": {
                    blocks.push({
                        _type: "block",
                        _key: Math.random().toString(36).slice(2),
                        style: "normal",
                        children: nodeToSpans(node.content || [{ type: "text", text: "" }]),
                        markDefs: [],
                    });
                    break;
                }
                case "blockquote": {
                    const children = node.content?.flatMap(p => nodeToSpans(p.content || [])) || [];
                    blocks.push({
                        _type: "block",
                        _key: Math.random().toString(36).slice(2),
                        style: "blockquote",
                        children,
                        markDefs: [],
                    });
                    break;
                }
                case "codeBlock": {
                    const code = node.content?.map(t => t.text || "").join("\n") || "";
                    blocks.push({
                        _type: "code",
                        _key: Math.random().toString(36).slice(2),
                        language: node.attrs?.language || "plaintext",
                        code,
                    });
                    break;
                }
                case "bulletList":
                case "orderedList": {
                    const listItem = node.type === "bulletList" ? "bullet" : "number";
                    node.content?.forEach((item) => {
                        const children = item.content?.flatMap(p => nodeToSpans(p.content || [])) || [];
                        blocks.push({
                            _type: "block",
                            _key: Math.random().toString(36).slice(2),
                            style: "normal",
                            listItem,
                            level: 1,
                            children,
                            markDefs: [],
                        });
                    });
                    break;
                }
                case "image": {
                    blocks.push({
                        _type: "image",
                        _key: Math.random().toString(36).slice(2),
                        url: node.attrs?.src,
                        alt: node.attrs?.alt || "",
                    });
                    break;
                }
                default: break;
            }
        });
    };

    processContent(doc.content);
    return blocks;
};

const nodeToSpans = (content) => {
    if (!content?.length) return [{ _type: "span", _key: Math.random().toString(36).slice(2), text: "", marks: [] }];
    return content.map((node) => {
        if (node.type === "text") {
            const marks = (node.marks || []).map(m => {
                if (m.type === "link") return `link_${m.attrs?.href}`;
                return m.type;
            });
            return {
                _type: "span",
                _key: Math.random().toString(36).slice(2),
                text: node.text || "",
                marks,
            };
        }
        return { _type: "span", _key: Math.random().toString(36).slice(2), text: "", marks: [] };
    });
};

const portableTextToTiptap = (blocks) => {
    if (!blocks?.length) return { type: "doc", content: [{ type: "paragraph" }] };
    const content = [];

    blocks.forEach(block => {
        if (block._type === "block") {
            const textContent = block.children?.map(s => s.text || "").join("");
            const styleMap = { blockquote: "blockquote", h1: "heading", h2: "heading", h3: "heading" };
            const nodeType = styleMap[block.style] || "paragraph";

            if (nodeType === "blockquote") {
                content.push({ type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: textContent }] }] });
            } else if (nodeType === "heading") {
                const level = parseInt(block.style?.slice(1)) || 2;
                content.push({ type: "heading", attrs: { level }, content: [{ type: "text", text: textContent }] });
            } else {
                content.push({ type: "paragraph", content: textContent ? [{ type: "text", text: textContent }] : [] });
            }
        } else if (block._type === "code") {
            content.push({ type: "codeBlock", attrs: { language: block.language || "" }, content: [{ type: "text", text: block.code || "" }] });
        } else if (block._type === "image") {
            if (block.url) content.push({ type: "image", attrs: { src: block.url } });
        }
    });

    return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
};

// ─── Main Editorial CMS Editor Component ──────────────────────────────────────

const BlogEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const containerRef = useRef();
    const titleRef = useRef(null);
    const poster = getPoster();
    const isEditing = !!id;

    // Core document states
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [coverImage, setCoverImage] = useState(null);
    const [coverImagePreview, setCoverImagePreview] = useState(null);
    const [coverAltText, setCoverAltText] = useState("");
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const [attachments, setAttachments] = useState([]);
    const [drawings, setDrawings] = useState([]);
    const [blogStatus, setBlogStatus] = useState(STATUS.DRAFT);
    const [blogId, setBlogId] = useState(id || null);

    // Sidebar & Modal states
    const [showOutline, setShowOutline] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [showDrawingStudio, setShowDrawingStudio] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [showAddBlockMenu, setShowAddBlockMenu] = useState(false);

    // Settings Accordion states
    const [openPublishing, setOpenPublishing] = useState(true);
    const [openSeo, setOpenSeo] = useState(true);
    const [openAdvanced, setOpenAdvanced] = useState(false);

    // Settings Panel Fields
    const [seoTitle, setSeoTitle] = useState("");
    const [metaDescription, setMetaDescription] = useState("");
    const [slugInput, setSlugInput] = useState("");
    const [slugIsCustomized, setSlugIsCustomized] = useState(false);
    const [category, setCategory] = useState("Filmmaking");
    const [tagList, setTagList] = useState(["Cinematography", "Production"]);
    const [newTagInput, setNewTagInput] = useState("");

    // UI Feedback & Save states
    const [saveState, setSaveState] = useState("idle"); // idle, saving, saved, error
    const [lastSavedAt, setLastSavedAt] = useState(null);
    const [timeAgoStr, setTimeAgoStr] = useState("");
    const [isLoading, setIsLoading] = useState(isEditing);
    const [isPreview, setIsPreview] = useState(false);
    const [toast, setToast] = useState(null);
    const [hasUnsaved, setHasUnsaved] = useState(false);

    // Slash menu trigger state
    const [slashPos, setSlashPos] = useState(null);
    const [activeHeadingPos, setActiveHeadingPos] = useState(null);

    const [writeTokenInput, setWriteTokenInput] = useState(() => getSanityWriteToken());
    const [showTokenText, setShowTokenText] = useState(false);

    useEffect(() => {
        if (!isLoggedIn()) navigate("/blog/login", { replace: true });
    }, [navigate]);

    // Auto-resize title textarea to prevent scrollbars
    useEffect(() => {
        if (titleRef.current) {
            titleRef.current.style.height = "auto";
            titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
        }
    }, [title]);

    // Live counter for "Saved X ago"
    useEffect(() => {
        if (!lastSavedAt) return;
        const updateTimeStr = () => {
            const diffSec = Math.floor((Date.now() - lastSavedAt) / 1000);
            if (diffSec < 10) setTimeAgoStr("Saved just now");
            else if (diffSec < 60) setTimeAgoStr(`Saved ${diffSec}s ago`);
            else {
                const min = Math.floor(diffSec / 60);
                setTimeAgoStr(`Saved ${min}m ago`);
            }
        };
        updateTimeStr();
        const interval = setInterval(updateTimeStr, 5000);
        return () => clearInterval(interval);
    }, [lastSavedAt]);

    // TipTap Editor Configuration
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Image.configure({ inline: false, allowBase64: false }),
            Link.configure({ openOnClick: false, autolink: true }),
            TextAlign.configure({ types: ["heading", "paragraph"] }),
            Placeholder.configure({ placeholder: "Write your story... (Type '/' for commands)" }),
            Youtube.configure({ inline: false }),
        ],
        content: { type: "doc", content: [{ type: "paragraph" }] },
        onUpdate: ({ editor }) => {
            setHasUnsaved(true);
            const { selection } = editor.state;
            const { $from } = selection;
            const textBefore = $from.parent.textBetween(0, $from.parentOffset, null, " ");

            // Track active heading
            let currentHeadingPos = null;
            editor.state.doc.descendants((node, pos) => {
                if (node.type.name === "heading" && pos <= $from.pos) {
                    currentHeadingPos = pos;
                }
            });
            setActiveHeadingPos(currentHeadingPos);

            if (textBefore === "/") {
                const domSelection = window.getSelection();
                if (domSelection?.rangeCount > 0) {
                    const rect = domSelection.getRangeAt(0).getBoundingClientRect();
                    setSlashPos({
                        top: rect.top + window.scrollY,
                        left: rect.left + window.scrollX,
                        from: $from.pos,
                        to: $from.pos,
                    });
                }
            } else {
                setSlashPos(null);
            }
        },
    });

    useGSAP(() => {
        gsap.fromTo(containerRef.current,
            { opacity: 0 },
            { opacity: 1, duration: 0.8, ease: "power2.out" }
        );
    }, { scope: containerRef });

    // Load existing blog for editing
    useEffect(() => {
        if (!isEditing || !blogReadClient) {
            setIsLoading(false);
            return;
        }
        const load = async () => {
            try {
                const blog = await blogReadClient.fetch(blogByIdQuery, { id });
                if (!blog) { setToast({ msg: "Blog not found.", type: "error" }); setIsLoading(false); return; }

                if (blog.authorRef !== poster?.id) {
                    setToast({ msg: "You don't have permission to edit this blog.", type: "error" });
                    setTimeout(() => navigate("/blog/dashboard"), 2000);
                    return;
                }

                if (!canPosterEdit(blog.status)) {
                    setToast({ msg: `This blog is currently '${STATUS_LABELS[blog.status] || blog.status}' and cannot be edited.`, type: "error" });
                    setTimeout(() => navigate("/blog/dashboard"), 2000);
                    return;
                }

                setTitle(blog.title || "");
                setDescription(blog.description || "");
                setCoverImagePreview(blog.coverImageUrl || null);
                setCoverImage(blog.coverImageRef || null);
                setAttachments(blog.attachments || []);
                setBlogStatus(blog.status);
                setBlogId(blog._id);
                setSlugInput(blog.slug?.current || generateSlug(blog.title || ""));
                if (blog.slug?.current) setSlugIsCustomized(true);
                setSeoTitle(blog.title || "");
                setMetaDescription(blog.description || "");

                if (editor && blog.content?.length) {
                    const tiptapDoc = portableTextToTiptap(blog.content);
                    editor.commands.setContent(tiptapDoc);
                }
            } catch (err) {
                setToast({ msg: "Failed to load blog: " + err.message, type: "error" });
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [id, isEditing, editor]);

    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const getWriteClient = () => {
        const token = getSanityWriteToken();
        if (!token) {
            throw new Error("Sanity write token not configured. Please enter a valid write token under Settings -> Advanced.");
        }
        return createBlogWriteClient(token);
    };

    const handleTitleChange = (e) => {
        const val = e.target.value;
        setTitle(val);
        setHasUnsaved(true);
        if (!slugIsCustomized) {
            setSlugInput(generateSlug(val));
        }
        if (!seoTitle || seoTitle === title) setSeoTitle(val);
    };

    const handleSlugChange = (e) => {
        setSlugInput(e.target.value);
        setSlugIsCustomized(true);
        setHasUnsaved(true);
    };

    const handleAddTag = (e) => {
        if (e) e.preventDefault();
        const val = newTagInput.trim();
        if (val && !tagList.includes(val)) {
            setTagList(prev => [...prev, val]);
            setNewTagInput("");
            setHasUnsaved(true);
        }
    };

    const handleRemoveTag = (tagToRemove) => {
        setTagList(prev => prev.filter(t => t !== tagToRemove));
        setHasUnsaved(true);
    };

    const handleSave = useCallback(async (submitAfter = false) => {
        if (!title.trim()) { showToast("Please add a title before saving.", "error"); return; }

        setSaveState("saving");
        try {
            const client = getWriteClient();
            const portableContent = editor ? tiptapToPortableText(editor.getJSON()) : [];
            const finalSlug = slugInput || generateSlug(title);

            if (!blogId) {
                const doc = createBlogDoc({ title, description }, poster?.id);
                doc.content = portableContent;
                doc.slug = { _type: "slug", current: finalSlug };
                if (coverImage) doc.coverImage = { _type: "image", asset: { _type: "reference", _ref: coverImage } };
                if (submitAfter) {
                    doc.status = STATUS.SUBMITTED;
                    doc.submittedAt = new Date().toISOString();
                }

                const created = await client.create(doc);
                setBlogId(created._id);
                setHasUnsaved(false);
                setSaveState("saved");
                setLastSavedAt(Date.now());

                if (submitAfter) {
                    showToast("Blog submitted for review! An admin will review and publish your story.");
                    try {
                        const { notifyManagers, notifyPosterSubmitted } = await import("../lib/emailService");
                        const managerDocs = await blogReadClient.fetch(`*[_type == "blogManager" && isActive == true].email`);
                        const managerRecipients = Array.from(new Set(["neoncinematic@iiitkota.ac.in", ...(managerDocs || [])]));
                        const blog = { _id: created._id, title, description };
                        await notifyManagers(managerRecipients, blog, poster);
                        await notifyPosterSubmitted(poster?.email, blog);
                    } catch (emailErr) {
                        console.warn("Email dispatch note:", emailErr);
                    }
                    setTimeout(() => navigate("/blog/dashboard"), 1500);
                } else {
                    showToast("Draft saved.");
                    navigate(`/blog/edit/${created._id}`, { replace: true });
                }
            } else {
                const patch = {
                    title,
                    description,
                    content: portableContent,
                    "slug.current": finalSlug,
                };
                if (coverImage) patch.coverImage = { _type: "image", asset: { _type: "reference", _ref: coverImage } };

                if (submitAfter) {
                    patch.status = STATUS.SUBMITTED;
                    patch.submittedAt = new Date().toISOString();
                }

                await client.patch(blogId).set(patch).commit();

                if (submitAfter) {
                    showToast("Blog submitted for review! An admin will review and publish your story.");
                    try {
                        const { notifyManagers, notifyPosterSubmitted } = await import("../lib/emailService");
                        const managerDocs = await blogReadClient.fetch(`*[_type == "blogManager" && isActive == true].email`);
                        const managerRecipients = Array.from(new Set(["neoncinematic@iiitkota.ac.in", ...(managerDocs || [])]));
                        const blog = { _id: blogId, title, description };
                        await notifyManagers(managerRecipients, blog, poster);
                        await notifyPosterSubmitted(poster?.email, blog);
                    } catch (emailErr) {
                        console.warn("Email dispatch note:", emailErr);
                    }
                    setTimeout(() => navigate("/blog/dashboard"), 1500);
                } else {
                    showToast("Saved.");
                }
            }

            setHasUnsaved(false);
            setSaveState("saved");
            setLastSavedAt(Date.now());
            setTimeout(() => setSaveState(prev => prev === "saved" ? "idle" : prev), 3000);
        } catch (err) {
            console.error("Save error:", err);
            const msg = err.message || "Unknown error";
            if (msg.includes("Unauthorized") || msg.includes("Session not found") || msg.includes("401") || msg.includes("token")) {
                showToast("Save failed: Unauthorized session/token. Enter a valid Sanity Write Token in Settings -> Advanced.", "error");
                setShowSettings(true);
                setOpenAdvanced(true);
            } else {
                showToast("Save failed: " + msg, "error");
            }
            setSaveState("error");
        }
    }, [title, description, coverImage, editor, blogId, poster, slugInput]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
                e.preventDefault();
                handleSave(false);
            } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                handleSave(true);
            } else if (e.key === "Escape") {
                if (isFocusMode) setIsFocusMode(false);
                if (showDrawingStudio) setShowDrawingStudio(false);
                if (showAddBlockMenu) setShowAddBlockMenu(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleSave, isFocusMode, showDrawingStudio, showAddBlockMenu]);

    // Headings Outline Extraction
    const getHeadings = useCallback(() => {
        if (!editor) return [];
        const headings = [];
        editor.state.doc.descendants((node, pos) => {
            if (node.type.name === "heading") {
                headings.push({
                    text: node.textContent || "Untitled Section",
                    level: node.attrs.level || 2,
                    pos,
                });
            }
        });
        return headings;
    }, [editor]);

    const scrollToHeading = (pos) => {
        if (!editor) return;
        editor.commands.setTextSelection(pos);
        const dom = editor.view.domAtPos(pos);
        if (dom?.node) {
            const el = dom.node.nodeType === 1 ? dom.node : dom.node.parentElement;
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    };

    // Word count & reading time
    const textContent = editor ? editor.getText() : "";
    const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    // Cover Image Upload Handler
    const handleCoverFileUpload = async (file) => {
        if (!file) return;
        setCoverImagePreview(URL.createObjectURL(file));
        setIsUploadingCover(true);
        try {
            const client = getWriteClient();
            const asset = await client.assets.upload("image", file, { filename: file.name });
            setCoverImage(asset._id);
            setHasUnsaved(true);
            showToast("Cover image uploaded.");
        } catch (err) {
            console.error("Cover upload error:", err);
            const msg = err.message || "Unknown error";
            if (msg.includes("Unauthorized") || msg.includes("Session not found") || msg.includes("401") || msg.includes("token")) {
                showToast("Cover upload failed: Unauthorized. Please check your Sanity token in Settings -> Advanced.", "error");
                setShowSettings(true);
                setOpenAdvanced(true);
            } else {
                showToast("Cover upload failed: " + msg, "error");
            }
        } finally {
            setIsUploadingCover(false);
        }
    };

    const handleSaveDrawingBlock = ({ dataUrl }) => {
        setDrawings(prev => [...prev, { id: Date.now(), dataUrl, caption: "" }]);
        setHasUnsaved(true);
        showToast("Drawing added to story.");
    };

    // Insert Block options for + Add Block button
    const insertBlock = (type) => {
        if (!editor) return;
        setShowAddBlockMenu(false);

        switch (type) {
            case "h1": editor.chain().focus().toggleHeading({ level: 1 }).run(); break;
            case "h2": editor.chain().focus().toggleHeading({ level: 2 }).run(); break;
            case "h3": editor.chain().focus().toggleHeading({ level: 3 }).run(); break;
            case "quote": editor.chain().focus().toggleBlockquote().run(); break;
            case "code": editor.chain().focus().toggleCodeBlock().run(); break;
            case "bullet": editor.chain().focus().toggleBulletList().run(); break;
            case "ordered": editor.chain().focus().toggleOrderedList().run(); break;
            case "hr": editor.chain().focus().setHorizontalRule().run(); break;
            case "drawing": setShowDrawingStudio(true); break;
            case "image": {
                const url = prompt("Enter image URL:");
                if (url) editor.chain().focus().setImage({ src: url }).run();
                break;
            }
            case "youtube": {
                const url = prompt("Enter YouTube video URL:");
                if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run();
                break;
            }
            default: break;
        }
    };

    return (
        <div ref={containerRef} className={`editorial-editor-page ${isFocusMode ? "is-focus-mode" : ""}`}>
            {toast && <div className={`editor-toast editor-toast--${toast.type}`}>{toast.msg}</div>}

            {/* Top Navigation Bar */}
            <header className="editorial-navbar">
                <div className="editorial-navbar__left">
                    <button type="button" className="editorial-btn editorial-btn--ghost" onClick={() => navigate("/blog/dashboard")}>
                        ← Blogs
                    </button>
                    <div className="editorial-status-pill" data-state={saveState}>
                        <span className="editorial-status-dot" />
                        <span>
                            {saveState === "saving"
                                ? "Saving..."
                                : saveState === "error"
                                ? "Save failed"
                                : hasUnsaved
                                ? "Unsaved changes"
                                : timeAgoStr || "Draft"}
                        </span>
                    </div>
                </div>

                <div className="editorial-navbar__center">
                    <button
                        type="button"
                        className={`editorial-nav-tab ${isFocusMode ? "active" : ""}`}
                        onClick={() => setIsFocusMode(f => !f)}
                        title="Toggle Focus Mode (Esc to exit)"
                    >
                        {isFocusMode ? "👁 Exit Focus Mode" : "👁 Focus Mode"}
                    </button>
                </div>

                <div className="editorial-navbar__right">
                    {!isFocusMode && (
                        <>
                            <button
                                type="button"
                                className={`editorial-nav-tab ${showOutline ? "active" : ""}`}
                                onClick={() => setShowOutline(o => !o)}
                                title="Toggle Article Outline"
                            >
                                ☰ Outline
                            </button>
                            <button
                                type="button"
                                className={`editorial-nav-tab ${showSettings ? "active" : ""}`}
                                onClick={() => setShowSettings(s => !s)}
                                title="Toggle Settings Drawer"
                            >
                                ⚙ Settings
                            </button>
                        </>
                    )}

                    <button
                        type="button"
                        className={`editorial-btn ${isPreview ? "editorial-btn--active" : "editorial-btn--ghost"}`}
                        onClick={() => setIsPreview(p => !p)}
                    >
                        {isPreview ? "Edit Mode" : "Preview"}
                    </button>
                    <button
                        type="button"
                        className="editorial-btn editorial-btn--secondary"
                        onClick={() => handleSave(false)}
                        disabled={saveState === "saving"}
                    >
                        {saveState === "saving" ? "Saving..." : "Save"}
                    </button>
                    <button
                        type="button"
                        className="editorial-btn editorial-btn--primary"
                        onClick={() => {
                            if (window.confirm("Submit this story for admin review? An administrator will review and approve your article before it is published live.")) handleSave(true);
                        }}
                        disabled={!title.trim() || saveState === "saving"}
                    >
                        Submit for Review →
                    </button>
                </div>
            </header>

            {/* Main Editorial Workspace */}
            <div className="editorial-workspace">
                {/* Left Headings Outline Drawer */}
                {!isFocusMode && showOutline && (
                    <aside className="editorial-outline-panel">
                        <div className="editorial-panel-header">
                            <div>
                                <h4>ARTICLE OUTLINE</h4>
                                <span className="editorial-count-badge">{getHeadings().length} {getHeadings().length === 1 ? "SECTION" : "SECTIONS"}</span>
                            </div>
                            <button type="button" onClick={() => setShowOutline(false)} className="panel-close-btn">✕</button>
                        </div>

                        <div className="editorial-outline-list">
                            {getHeadings().length === 0 ? (
                                <div className="editorial-outline-empty">
                                    <p>Your outline will appear here as you structure the article.</p>
                                    <button
                                        type="button"
                                        className="outline-add-heading-btn"
                                        onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                                    >
                                        + Add heading
                                    </button>
                                </div>
                            ) : (
                                getHeadings().map((h, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        className={`outline-item level-${h.level} ${activeHeadingPos === h.pos ? "is-active" : ""}`}
                                        onClick={() => scrollToHeading(h.pos)}
                                    >
                                        <span className="outline-item__tag">H{h.level}</span>
                                        <span className="outline-item__text">{String(i + 1).padStart(2, "0")} {h.text}</span>
                                    </button>
                                ))
                            )}
                        </div>

                        <div className="editorial-stats-footer">
                            <div className="stat-pill"><strong>{wordCount}</strong> words</div>
                            <div className="stat-pill"><strong>{readingTime}</strong> min read</div>
                        </div>
                    </aside>
                )}

                {/* Center Writing Canvas */}
                <main className="editorial-canvas-wrapper">
                    {isPreview ? (
                        <div className="editorial-preview-pane">
                            <span className="editorial-kicker">PREVIEW MODE</span>
                            <h1 className="editorial-preview-title">{title || "Untitled Story"}</h1>
                            {description && <p className="editorial-preview-subtitle">{description}</p>}

                            {coverImagePreview && (
                                <div className="editorial-preview-cover">
                                    <img src={coverImagePreview} alt={coverAltText || "Cover"} />
                                </div>
                            )}

                            <div className="editorial-reading-body">
                                <PortableTextRenderer content={editor ? tiptapToPortableText(editor.getJSON()) : []} />
                                {drawings.map(d => (
                                    <DrawingBlock key={d.id} dataUrl={d.dataUrl} caption={d.caption} isEditable={false} />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="editorial-canvas">
                            {/* Title Field */}
                            <textarea
                                ref={titleRef}
                                className="editorial-title-input"
                                placeholder="Give your article a title..."
                                value={title}
                                onChange={handleTitleChange}
                                rows={1}
                            />

                            {/* Subtitle / Excerpt */}
                            <input
                                type="text"
                                className="editorial-subtitle-input"
                                placeholder="Add a short subtitle or excerpt..."
                                value={description}
                                onChange={e => { setDescription(e.target.value); setHasUnsaved(true); }}
                            />

                            {/* Cover Image Zone */}
                            <div className="editorial-cover-zone">
                                {coverImagePreview ? (
                                    <div className="editorial-cover-preview">
                                        <img src={coverImagePreview} alt={coverAltText || "Cover"} />
                                        <div className="editorial-cover-actions">
                                            <input
                                                type="text"
                                                className="cover-alt-input"
                                                placeholder="Alt text for screen readers..."
                                                value={coverAltText}
                                                onChange={e => setCoverAltText(e.target.value)}
                                            />
                                            <label className="cover-action-btn">
                                                Replace
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    style={{ display: "none" }}
                                                    onChange={e => handleCoverFileUpload(e.target.files?.[0])}
                                                />
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => { setCoverImage(null); setCoverImagePreview(null); setHasUnsaved(true); }}
                                                className="cover-action-btn cover-action-btn--danger"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <label
                                        className="editorial-cover-dropzone"
                                        onDragOver={e => e.preventDefault()}
                                        onDrop={e => {
                                            e.preventDefault();
                                            handleCoverFileUpload(e.dataTransfer.files?.[0]);
                                        }}
                                    >
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={e => handleCoverFileUpload(e.target.files?.[0])}
                                        />
                                        <span className="dropzone-icon">+</span>
                                        <strong>Add cover image</strong>
                                        <span className="dropzone-sub">{isUploadingCover ? "Uploading image..." : "Drag & drop or choose from device"}</span>
                                    </label>
                                )}
                            </div>

                            <hr className="editorial-divider" />

                            {/* Contextual Floating Selection Toolbar */}
                            <BubbleToolbar editor={editor} />

                            {/* Slash Command Popup Menu */}
                            {slashPos && (
                                <SlashMenu
                                    editor={editor}
                                    position={slashPos}
                                    onClose={() => setSlashPos(null)}
                                    onOpenDrawingModal={() => setShowDrawingStudio(true)}
                                />
                            )}

                            {/* TipTap Editor Body */}
                            <div className="editorial-editor-body">
                                <EditorContent editor={editor} className="editorial-tiptap-content" />
                            </div>

                            {/* Add Block Inserter Menu Trigger */}
                            <div className="add-block-container">
                                <button
                                    type="button"
                                    className="add-block-trigger"
                                    onClick={() => setShowAddBlockMenu(b => !b)}
                                >
                                    + Add block
                                </button>
                                {showAddBlockMenu && (
                                    <div className="add-block-menu">
                                        <button type="button" onClick={() => insertBlock("h1")}>H1 Heading 1</button>
                                        <button type="button" onClick={() => insertBlock("h2")}>H2 Heading 2</button>
                                        <button type="button" onClick={() => insertBlock("h3")}>H3 Heading 3</button>
                                        <button type="button" onClick={() => insertBlock("quote")}>❝ Quote</button>
                                        <button type="button" onClick={() => insertBlock("code")}>{"</> Code Block"}</button>
                                        <button type="button" onClick={() => insertBlock("bullet")}>• Bullet List</button>
                                        <button type="button" onClick={() => insertBlock("ordered")}>1. Numbered List</button>
                                        <button type="button" onClick={() => insertBlock("drawing")}>🎨 Drawing Studio</button>
                                        <button type="button" onClick={() => insertBlock("image")}>🖼️ Image</button>
                                        <button type="button" onClick={() => insertBlock("youtube")}>🎥 YouTube Video</button>
                                        <button type="button" onClick={() => insertBlock("hr")}>─ Divider</button>
                                    </div>
                                )}
                            </div>

                            {/* Inline Drawing Blocks Rendered inside Story Canvas */}
                            {drawings.map(d => (
                                <DrawingBlock
                                    key={d.id}
                                    dataUrl={d.dataUrl}
                                    caption={d.caption}
                                    onUpdate={({ caption }) => {
                                        setDrawings(prev => prev.map(item => item.id === d.id ? { ...item, caption } : item));
                                    }}
                                    onDelete={() => {
                                        setDrawings(prev => prev.filter(item => item.id !== d.id));
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </main>

                {/* Right Settings & Metadata Drawer */}
                {!isFocusMode && showSettings && (
                    <aside className="editorial-settings-panel">
                        <div className="editorial-panel-header">
                            <h4>ARTICLE SETTINGS</h4>
                            <button type="button" onClick={() => setShowSettings(false)} className="panel-close-btn">✕</button>
                        </div>

                        <div className="editorial-settings-form">
                            {/* Publishing Accordion */}
                            <div className="settings-accordion">
                                <button
                                    type="button"
                                    className="accordion-header"
                                    onClick={() => setOpenPublishing(p => !p)}
                                >
                                    <span>{openPublishing ? "▾" : "▸"} Publishing</span>
                                </button>
                                {openPublishing && (
                                    <div className="accordion-content">
                                        <div className="settings-field">
                                            <label>Category</label>
                                            <select value={category} onChange={e => { setCategory(e.target.value); setHasUnsaved(true); }}>
                                                <option value="Filmmaking">Filmmaking</option>
                                                <option value="Cinematography">Cinematography</option>
                                                <option value="Color Grading">Color Grading</option>
                                                <option value="Directing">Directing</option>
                                                <option value="Behind The Scenes">Behind The Scenes</option>
                                            </select>
                                        </div>

                                        <div className="settings-field">
                                            <label>Tags</label>
                                            <div className="tag-chips-wrapper">
                                                {tagList.map(tag => (
                                                    <span key={tag} className="tag-chip">
                                                        {tag}
                                                        <button type="button" onClick={() => handleRemoveTag(tag)} className="tag-chip__remove">×</button>
                                                    </span>
                                                ))}
                                            </div>
                                            <form onSubmit={handleAddTag} className="add-tag-row">
                                                <input
                                                    type="text"
                                                    value={newTagInput}
                                                    onChange={e => setNewTagInput(e.target.value)}
                                                    placeholder="Add a tag..."
                                                />
                                                <button type="submit" className="add-tag-btn">+ Add</button>
                                            </form>
                                        </div>

                                        <div className="settings-field">
                                            <label>Author</label>
                                            <div className="author-card">
                                                <div className="author-avatar">{poster?.name?.[0] || "?"}</div>
                                                <div className="author-details">
                                                    <strong>{poster?.name}</strong>
                                                    <span>@{poster?.username}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* SEO Accordion */}
                            <div className="settings-accordion">
                                <button
                                    type="button"
                                    className="accordion-header"
                                    onClick={() => setOpenSeo(s => !s)}
                                >
                                    <span>{openSeo ? "▾" : "▸"} SEO</span>
                                </button>
                                {openSeo && (
                                    <div className="accordion-content">
                                        <div className="settings-field">
                                            <div className="field-label-row">
                                                <label>SEO Title</label>
                                                <span className={`char-counter ${seoTitle.length > 60 ? "counter-over" : ""}`}>
                                                    {seoTitle.length} / 60
                                                </span>
                                            </div>
                                            <input
                                                type="text"
                                                value={seoTitle}
                                                onChange={e => { setSeoTitle(e.target.value); setHasUnsaved(true); }}
                                                placeholder="Meta title..."
                                            />
                                            {seoTitle.length > 0 && (
                                                <span className={`feedback-hint ${seoTitle.length > 60 ? "hint-error" : "hint-good"}`}>
                                                    {seoTitle.length <= 60 ? "Good length" : "Too long"}
                                                </span>
                                            )}
                                        </div>

                                        <div className="settings-field">
                                            <div className="field-label-row">
                                                <label>Meta Description</label>
                                                <span className={`char-counter ${metaDescription.length > 160 ? "counter-over" : ""}`}>
                                                    {metaDescription.length} / 160
                                                </span>
                                            </div>
                                            <textarea
                                                rows={3}
                                                value={metaDescription}
                                                onChange={e => { setMetaDescription(e.target.value); setHasUnsaved(true); }}
                                                placeholder="Search engine excerpt..."
                                            />
                                            {metaDescription.length > 0 && (
                                                <span className={`feedback-hint ${metaDescription.length > 160 ? "hint-error" : "hint-good"}`}>
                                                    {metaDescription.length <= 160 ? "Good length" : "Too long"}
                                                </span>
                                            )}
                                        </div>

                                        <div className="settings-field">
                                            <label>URL Slug</label>
                                            <div className="slug-input-wrapper">
                                                <span className="slug-prefix">/blog/</span>
                                                <input
                                                    type="text"
                                                    value={slugInput}
                                                    onChange={handleSlugChange}
                                                    placeholder="your-slug"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Advanced Accordion */}
                            <div className="settings-accordion">
                                <button
                                    type="button"
                                    className="accordion-header"
                                    onClick={() => setOpenAdvanced(a => !a)}
                                >
                                    <span>{openAdvanced ? "▾" : "▸"} Advanced & API Security</span>
                                </button>
                                {openAdvanced && (
                                    <div className="accordion-content">
                                        <div className="settings-field">
                                            <label>Sanity Write API Token</label>
                                            <div style={{ display: "flex", gap: "6px" }}>
                                                <input
                                                    type={showTokenText ? "text" : "password"}
                                                    value={writeTokenInput}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setWriteTokenInput(val);
                                                        setCustomSanityWriteToken(val);
                                                    }}
                                                    placeholder="Paste Sanity token (sk...)"
                                                    style={{
                                                        fontFamily: "monospace",
                                                        fontSize: "12px",
                                                        flex: 1,
                                                        background: "var(--surface-raised, #18181B)",
                                                        color: "var(--text-primary, #F4F4F5)",
                                                        border: "1px solid var(--border-default, rgba(255,255,255,0.14))",
                                                        borderRadius: "6px",
                                                        padding: "6px 10px",
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowTokenText(p => !p)}
                                                    title="Toggle visibility"
                                                    style={{
                                                        background: "var(--surface-hover, #222225)",
                                                        border: "1px solid var(--border-default, rgba(255,255,255,0.14))",
                                                        color: "#A1A1AA",
                                                        borderRadius: "6px",
                                                        padding: "4px 8px",
                                                        fontSize: "12px",
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    {showTokenText ? "🔒" : "👁️"}
                                                </button>
                                            </div>
                                            <span className="feedback-hint" style={{ color: "rgba(255,255,255,0.45)", fontSize: "11px", display: "block", marginTop: "4px", lineHeight: "1.3" }}>
                                                Required to save drafts & submit stories. Saved securely in your local session.
                                            </span>
                                        </div>

                                        <div className="settings-field" style={{ marginTop: "14px" }}>
                                            <label>Embedded Drawing Studio</label>
                                            <button
                                                type="button"
                                                className="editorial-btn editorial-btn--secondary"
                                                onClick={() => setShowDrawingStudio(true)}
                                                style={{ width: "100%" }}
                                            >
                                                🎨 Launch Studio
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>
                )}
            </div>

            {/* Bottom Article Status & Metrics Bar */}
            <footer className="editorial-status-bar">
                <div className="status-bar__metrics">
                    <span><strong>{wordCount}</strong> words</span>
                    <span className="status-bar__dot">•</span>
                    <span><strong>{readingTime}</strong> min read</span>
                </div>
                <div className="status-bar__save">
                    <span>
                        {saveState === "saving"
                            ? "Saving..."
                            : saveState === "error"
                            ? "Save failed"
                            : hasUnsaved
                            ? "Unsaved changes"
                            : timeAgoStr || "Saved"}
                    </span>
                </div>
            </footer>

            {/* Embedded Canvas Drawing Modal */}
            {showDrawingStudio && (
                <DrawingModal
                    onSave={handleSaveDrawingBlock}
                    onClose={() => setShowDrawingStudio(false)}
                />
            )}
        </div>
    );
};

export default BlogEditor;
