import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { getPoster, isLoggedIn, getToken } from "../lib/blogAuth";
import {
    blogReadClient, createBlogWriteClient,
    blogByIdQuery, generateSlug, createBlogDoc
} from "../lib/blogSanity";
import {
    STATUS, STATUS_LABELS, STATUS_COLORS, canPosterEdit,
    isBlockedFile, MAX_FILE_SIZE, getAttachmentType, getFileIcon, formatFileSize
} from "../lib/blogHelpers";
import { PortableTextRenderer } from "../PortableTextRenderer";
import "./BlogEditor.css";

// ─── Toolbar ─────────────────────────────────────────────────────────────────

const EditorToolbar = ({ editor }) => {
    if (!editor) return null;

    const addImage = () => {
        const url = prompt("Enter image URL:");
        if (url) editor.chain().focus().setImage({ src: url }).run();
    };

    const setLink = () => {
        const url = prompt("Enter link URL:");
        if (url) editor.chain().focus().setLink({ href: url }).run();
        else editor.chain().focus().unsetLink().run();
    };

    const btn = (action, label, isActive = false, title = "") => (
        <button
            type="button"
            key={label}
            className={`editor-toolbar__btn ${isActive ? "editor-toolbar__btn--active" : ""}`}
            onClick={action}
            title={title || label}
        >
            {label}
        </button>
    );

    return (
        <div className="editor-toolbar">
            <div className="editor-toolbar__group">
                {btn(() => editor.chain().focus().toggleBold().run(), "B", editor.isActive("bold"), "Bold")}
                {btn(() => editor.chain().focus().toggleItalic().run(), "I", editor.isActive("italic"), "Italic")}
                {btn(() => editor.chain().focus().toggleUnderline().run(), "U", editor.isActive("underline"), "Underline")}
                {btn(() => editor.chain().focus().toggleStrike().run(), "S̶", editor.isActive("strike"), "Strikethrough")}
                {btn(() => editor.chain().focus().toggleCode().run(), "</>", editor.isActive("code"), "Inline Code")}
            </div>
            <div className="editor-toolbar__divider" />
            <div className="editor-toolbar__group">
                {btn(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), "H1", editor.isActive("heading", { level: 1 }))}
                {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), "H2", editor.isActive("heading", { level: 2 }))}
                {btn(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), "H3", editor.isActive("heading", { level: 3 }))}
            </div>
            <div className="editor-toolbar__divider" />
            <div className="editor-toolbar__group">
                {btn(() => editor.chain().focus().toggleBulletList().run(), "• List", editor.isActive("bulletList"))}
                {btn(() => editor.chain().focus().toggleOrderedList().run(), "1. List", editor.isActive("orderedList"))}
                {btn(() => editor.chain().focus().toggleBlockquote().run(), "❝", editor.isActive("blockquote"), "Quote")}
                {btn(() => editor.chain().focus().toggleCodeBlock().run(), "{ }", editor.isActive("codeBlock"), "Code Block")}
            </div>
            <div className="editor-toolbar__divider" />
            <div className="editor-toolbar__group">
                {btn(setLink, "🔗", editor.isActive("link"), "Add Link")}
                {btn(addImage, "🖼", false, "Add Image by URL")}
                {btn(() => editor.chain().focus().setHorizontalRule().run(), "─", false, "Horizontal Rule")}
            </div>
            <div className="editor-toolbar__divider" />
            <div className="editor-toolbar__group">
                {btn(() => editor.chain().focus().undo().run(), "↩", false, "Undo")}
                {btn(() => editor.chain().focus().redo().run(), "↪", false, "Redo")}
            </div>
        </div>
    );
};

// ─── Convert TipTap JSON to Sanity Portable Text ─────────────────────────────

const tiptapToPortableText = (doc) => {
    if (!doc?.content) return [];
    const blocks = [];
    let listBuffer = null;

    const processContent = (content) => {
        content.forEach((node) => {
            switch (node.type) {
                case "heading": {
                    if (listBuffer) { blocks.push(listBuffer); listBuffer = null; }
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
                    if (listBuffer) { blocks.push(listBuffer); listBuffer = null; }
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
                    if (listBuffer) { blocks.push(listBuffer); listBuffer = null; }
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
                    if (listBuffer) { blocks.push(listBuffer); listBuffer = null; }
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
                    if (listBuffer) { blocks.push(listBuffer); listBuffer = null; }
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
                    if (listBuffer) { blocks.push(listBuffer); listBuffer = null; }
                    blocks.push({
                        _type: "image",
                        _key: Math.random().toString(36).slice(2),
                        url: node.attrs?.src,
                        alt: node.attrs?.alt || "",
                    });
                    break;
                }
                case "horizontalRule": {
                    if (listBuffer) { blocks.push(listBuffer); listBuffer = null; }
                    break;
                }
                default: break;
            }
        });
        if (listBuffer) { blocks.push(listBuffer); listBuffer = null; }
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

// ─── Convert Sanity Portable Text to TipTap JSON ─────────────────────────────

const portableTextToTiptap = (blocks) => {
    if (!blocks?.length) return { type: "doc", content: [{ type: "paragraph" }] };
    const content = [];

    blocks.forEach(block => {
        if (block._type === "block") {
            const textContent = block.children?.map(s => s.text || "").join("");
            const tiptapMarks = block.children?.flatMap(span =>
                (span.marks || []).map(m => {
                    if (m.startsWith("link_")) return { type: "link", attrs: { href: m.slice(5) } };
                    if (m === "strong") return { type: "bold" };
                    if (m === "em") return { type: "italic" };
                    if (m === "underline") return { type: "underline" };
                    if (m === "strike-through") return { type: "strike" };
                    if (m === "code") return { type: "code" };
                    return null;
                }).filter(Boolean)
            ) || [];

            if (block.listItem) {
                content.push({
                    type: block.listItem === "number" ? "orderedList" : "bulletList",
                    content: [{
                        type: "listItem",
                        content: [{ type: "paragraph", content: [{ type: "text", text: textContent, marks: tiptapMarks }] }]
                    }]
                });
                return;
            }

            const styleMap = { blockquote: "blockquote", h1: "heading", h2: "heading", h3: "heading", h4: "heading" };
            const nodeType = styleMap[block.style] || "paragraph";

            if (nodeType === "blockquote") {
                content.push({ type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: textContent }] }] });
            } else if (nodeType === "heading") {
                const level = parseInt(block.style?.slice(1)) || 2;
                content.push({ type: "heading", attrs: { level }, content: [{ type: "text", text: textContent, marks: tiptapMarks }] });
            } else {
                content.push({ type: "paragraph", content: textContent ? [{ type: "text", text: textContent, marks: tiptapMarks }] : [] });
            }
        } else if (block._type === "code") {
            content.push({ type: "codeBlock", attrs: { language: block.language || "" }, content: [{ type: "text", text: block.code || "" }] });
        } else if (block._type === "image") {
            if (block.url) content.push({ type: "image", attrs: { src: block.url } });
        }
    });

    return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
};

// ─── Main Editor Component ────────────────────────────────────────────────────

const BlogEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const containerRef = useRef();
    const poster = getPoster();
    const isEditing = !!id;

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [coverImage, setCoverImage] = useState(null);
    const [coverImagePreview, setCoverImagePreview] = useState(null);
    const [coverImageFile, setCoverImageFile] = useState(null);
    const [attachments, setAttachments] = useState([]);
    const [pendingAttachments, setPendingAttachments] = useState([]);
    const [blogStatus, setBlogStatus] = useState(STATUS.DRAFT);
    const [blogId, setBlogId] = useState(id || null);
    const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
    const [isLoading, setIsLoading] = useState(isEditing);
    const [isPreview, setIsPreview] = useState(false);
    const [toast, setToast] = useState(null);
    const [hasUnsaved, setHasUnsaved] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);
    const [uploadingAttachment, setUploadingAttachment] = useState(false);

    const WRITE_TOKEN = import.meta.env.VITE_SANITY_WRITE_TOKEN;

    // Auth check
    useEffect(() => {
        if (!isLoggedIn()) {
            navigate("/blog/login", { replace: true });
        }
    }, [navigate]);

    // TipTap editor
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Image.configure({ inline: false, allowBase64: false }),
            Link.configure({ openOnClick: false, autolink: true }),
            TextAlign.configure({ types: ["heading", "paragraph"] }),
            Placeholder.configure({ placeholder: "Start writing your blog here…" }),
        ],
        content: { type: "doc", content: [{ type: "paragraph" }] },
        onUpdate: () => setHasUnsaved(true),
    });

    useGSAP(() => {
        gsap.fromTo(containerRef.current,
            { opacity: 0 },
            { opacity: 1, duration: 1, ease: "power2.out" }
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

                // Security: poster can only edit their own blog
                if (blog.authorRef !== poster?.id) {
                    setToast({ msg: "You don't have permission to edit this blog.", type: "error" });
                    setTimeout(() => navigate("/blog/dashboard"), 2000);
                    return;
                }

                if (!canPosterEdit(blog.status)) {
                    setToast({ msg: `Blogs with status "${STATUS_LABELS[blog.status]}" cannot be edited.`, type: "error" });
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

                // Load content into editor
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
        if (!WRITE_TOKEN) throw new Error("Write token not configured. Add VITE_SANITY_WRITE_TOKEN to .env");
        return createBlogWriteClient(WRITE_TOKEN);
    };

    const handleSave = useCallback(async (submitAfter = false) => {
        if (!title.trim()) { showToast("Please add a title before saving.", "error"); return; }

        setSaveState("saving");
        try {
            const client = getWriteClient();
            const portableContent = editor ? tiptapToPortableText(editor.getJSON()) : [];

            if (!blogId) {
                // Create new blog
                const doc = createBlogDoc({ title, description }, poster?.id);
                doc.content = portableContent;
                if (coverImage) doc.coverImage = { _type: "image", asset: { _type: "reference", _ref: coverImage } };

                const created = await client.create(doc);
                setBlogId(created._id);
                navigate(`/blog/edit/${created._id}`, { replace: true });
                showToast("Blog saved as draft.");
            } else {
                // Update existing
                const patch = {
                    title,
                    description,
                    content: portableContent,
                    "slug.current": generateSlug(title),
                };
                if (coverImage) patch.coverImage = { _type: "image", asset: { _type: "reference", _ref: coverImage } };

                if (submitAfter) {
                    patch.status = STATUS.SUBMITTED;
                    patch.submittedAt = new Date().toISOString();
                }

                await client.patch(blogId).set(patch).commit();

                if (submitAfter) {
                    showToast("Blog submitted for review!");
                    // Email notifications
                    try {
                        const { notifyManagers, notifyPosterSubmitted } = await import("../lib/emailService");
                        const managers = await blogReadClient.fetch(`*[_type == "blogManager" && isActive == true].email`);
                        const blog = { _id: blogId, title, description };
                        await notifyManagers(managers, blog, poster);
                        await notifyPosterSubmitted(poster?.email, blog);
                    } catch (emailErr) {
                        console.warn("Email notification failed:", emailErr);
                    }
                    setTimeout(() => navigate("/blog/dashboard"), 1500);
                } else {
                    showToast("Saved.");
                }
            }

            setHasUnsaved(false);
            setSaveState("saved");
            setTimeout(() => setSaveState("idle"), 3000);
        } catch (err) {
            console.error(err);
            showToast("Save failed: " + err.message, "error");
            setSaveState("error");
            setTimeout(() => setSaveState("idle"), 3000);
        }
    }, [title, description, coverImage, editor, blogId, poster]);

    // Auto-save every 30 seconds when there are unsaved changes
    useEffect(() => {
        if (!hasUnsaved || !blogId) return;
        const timer = setTimeout(() => {
            if (hasUnsaved && blogId) handleSave(false);
        }, 30000);
        return () => clearTimeout(timer);
    }, [hasUnsaved, blogId, handleSave]);

    // Unsaved changes warning
    useEffect(() => {
        const handler = (e) => {
            if (hasUnsaved) {
                e.preventDefault();
                e.returnValue = "You have unsaved changes. Leave?";
            }
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [hasUnsaved]);

    const handleCoverImageChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) { showToast("Please select an image file.", "error"); return; }
        if (file.size > MAX_FILE_SIZE) { showToast("Image too large (max 100MB).", "error"); return; }

        setCoverImageFile(file);
        setCoverImagePreview(URL.createObjectURL(file));

        // Upload to Sanity
        try {
            setUploadingCover(true);
            const client = getWriteClient();
            const asset = await client.assets.upload("image", file, { filename: file.name });
            setCoverImage(asset._id);
            setHasUnsaved(true);
            showToast("Cover image uploaded.");
        } catch (err) {
            showToast("Cover image upload failed: " + err.message, "error");
        } finally {
            setUploadingCover(false);
        }
    };

    const handleAttachmentUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        for (const file of files) {
            const { isBlockedFile: blocked } = await import("../lib/blogHelpers");
            if (isBlockedFile(file.type, file.name)) {
                showToast(`File type not allowed: ${file.name}`, "error");
                continue;
            }
            if (file.size > MAX_FILE_SIZE) {
                showToast(`File too large: ${file.name} (max 100MB)`, "error");
                continue;
            }

            setUploadingAttachment(true);
            try {
                const client = getWriteClient();
                const asset = await client.assets.upload("file", file, { filename: file.name });
                const newAtt = {
                    _key: Math.random().toString(36).slice(2),
                    filename: file.name,
                    mimeType: file.type || "application/octet-stream",
                    fileSize: file.size,
                    uploadedAt: new Date().toISOString(),
                    file: { _type: "file", asset: { _type: "reference", _ref: asset._id } },
                    url: asset.url,
                    assetId: asset._id,
                };
                setAttachments(prev => [...prev, newAtt]);
                setHasUnsaved(true);

                // Persist attachment to blog doc if it exists
                if (blogId) {
                    const c = getWriteClient();
                    await c.patch(blogId).setIfMissing({ attachments: [] }).append("attachments", [newAtt]).commit();
                }
                showToast(`Uploaded: ${file.name}`);
            } catch (err) {
                showToast(`Failed to upload ${file.name}: ` + err.message, "error");
            } finally {
                setUploadingAttachment(false);
            }
        }
    };

    const removeAttachment = async (key) => {
        const removed = attachments.find(a => a._key === key);
        setAttachments(prev => prev.filter(a => a._key !== key));
        if (blogId && removed) {
            try {
                const client = getWriteClient();
                await client.patch(blogId).unset([`attachments[_key=="${key}"]`]).commit();
            } catch (err) {
                console.warn("Failed to remove attachment from Sanity:", err);
            }
        }
    };

    const previewContent = editor ? tiptapToPortableText(editor.getJSON()) : [];

    const saveStateLabel = {
        idle: hasUnsaved ? "Unsaved changes" : "All saved",
        saving: "Saving…",
        saved: "Saved ✓",
        error: "Save failed",
    };

    return (
        <div ref={containerRef} className="editor-page">
            {/* Toast */}
            {toast && (
                <div className={`editor-toast editor-toast--${toast.type}`} role="status">
                    {toast.msg}
                </div>
            )}

            {/* Top bar */}
            <div className="editor-topbar">
                <div className="editor-topbar__left">
                    <button className="editor-topbar__back" onClick={() => navigate("/blog/dashboard")}>
                        ← Dashboard
                    </button>
                    <span className="editor-topbar__save-state" data-state={saveState}>
                        {saveStateLabel[saveState]}
                    </span>
                </div>

                <div className="editor-topbar__title">
                    {isEditing ? "Edit Blog" : "New Blog"}
                </div>

                <div className="editor-topbar__actions">
                    <button
                        className={`editor-topbar__preview-toggle ${isPreview ? "editor-topbar__preview-toggle--active" : ""}`}
                        onClick={() => setIsPreview(p => !p)}
                    >
                        {isPreview ? "← Edit" : "Preview →"}
                    </button>
                    <button
                        className="editor-topbar__save"
                        onClick={() => handleSave(false)}
                        disabled={saveState === "saving"}
                    >
                        {saveState === "saving" ? "Saving…" : "Save Draft"}
                    </button>
                    <button
                        className="editor-topbar__submit"
                        onClick={() => {
                            if (window.confirm("Submit this blog for review? You won't be able to edit it until it's reviewed.")) {
                                handleSave(true);
                            }
                        }}
                        disabled={!title.trim() || saveState === "saving" || (blogStatus !== STATUS.DRAFT && blogStatus !== STATUS.REJECTED)}
                    >
                        Submit →
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="editor-loading">
                    <div className="editor-spinner" />
                    <span>Loading blog…</span>
                </div>
            ) : (
                <div className="editor-layout">
                    {/* Main Editor Area */}
                    <div className="editor-main">
                        {isPreview ? (
                            <div className="editor-preview-pane blog-detail-page" style={{ background: "transparent" }}>
                                <div className="blog-detail__article" style={{ padding: "2rem 0" }}>
                                    <header className="blog-detail__header">
                                        <div className="blog-detail__header-inner">
                                            <span className="blog-detail__kicker">Preview</span>
                                            <h1 className="blog-detail__title">{title || "Untitled Blog"}</h1>
                                            {description && <p className="blog-detail__description">{description}</p>}
                                            <div className="blog-detail__byline">
                                                <div className="blog-detail__author-avatar blog-detail__author-avatar--initials">
                                                    {poster?.name?.[0] || "?"}
                                                </div>
                                                <div>
                                                    <span className="blog-detail__author-name">{poster?.name}</span>
                                                    <time className="blog-detail__date">Preview mode</time>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="blog-detail__header-line" />
                                    </header>
                                    {coverImagePreview && (
                                        <div className="blog-detail__cover">
                                            <img src={coverImagePreview} alt="Cover" />
                                        </div>
                                    )}
                                    <div className="blog-detail__body">
                                        <div className="blog-detail__content-wrapper">
                                            <PortableTextRenderer content={previewContent} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Title */}
                                <div className="editor-title-area">
                                    <input
                                        className="editor-title-input"
                                        type="text"
                                        placeholder="Blog title…"
                                        value={title}
                                        onChange={e => { setTitle(e.target.value); setHasUnsaved(true); }}
                                        maxLength={120}
                                    />
                                    {title && (
                                        <div className="editor-slug-preview">
                                            /blog/{generateSlug(title)}
                                        </div>
                                    )}
                                </div>

                                {/* Description */}
                                <div className="editor-desc-area">
                                    <textarea
                                        className="editor-desc-input"
                                        placeholder="Short description (shown in blog cards)…"
                                        value={description}
                                        onChange={e => { setDescription(e.target.value); setHasUnsaved(true); }}
                                        maxLength={300}
                                        rows={2}
                                    />
                                    <span className="editor-desc-count">{description.length}/300</span>
                                </div>

                                {/* Cover image */}
                                <div className="editor-cover-area">
                                    {coverImagePreview ? (
                                        <div className="editor-cover-preview">
                                            <img src={coverImagePreview} alt="Cover" />
                                            <button
                                                type="button"
                                                className="editor-cover-remove"
                                                onClick={() => { setCoverImage(null); setCoverImagePreview(null); setHasUnsaved(true); }}
                                            >
                                                ✕ Remove cover
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="editor-cover-upload">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleCoverImageChange}
                                                disabled={uploadingCover}
                                            />
                                            {uploadingCover ? (
                                                <><div className="editor-spinner" /> Uploading…</>
                                            ) : (
                                                <><span>+</span> Add cover image</>
                                            )}
                                        </label>
                                    )}
                                </div>

                                {/* Divider */}
                                <div className="editor-content-divider" />

                                {/* Toolbar + Content */}
                                <EditorToolbar editor={editor} />
                                <div className="editor-content-area">
                                    <EditorContent editor={editor} className="editor-tiptap" />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Sidebar */}
                    <aside className="editor-sidebar">
                        {/* Status */}
                        <div className="editor-panel">
                            <h3 className="editor-panel__title">Status</h3>
                            {(() => {
                                const style = STATUS_COLORS[blogStatus] || STATUS_COLORS.draft;
                                return (
                                    <span className="status-badge" style={{
                                        background: style.bg, color: style.color, border: `1px solid ${style.border}`
                                    }}>
                                        {STATUS_LABELS[blogStatus] || blogStatus}
                                    </span>
                                );
                            })()}
                            {(blogStatus === STATUS.DRAFT || blogStatus === STATUS.REJECTED) && (
                                <p className="editor-panel__hint">
                                    Save your draft, then submit for review when ready.
                                </p>
                            )}
                            {(blogStatus === STATUS.SUBMITTED || blogStatus === STATUS.UNDER_REVIEW) && (
                                <p className="editor-panel__hint">
                                    Your blog is under review. Editing is disabled until a decision is made.
                                </p>
                            )}
                        </div>

                        {/* Author */}
                        <div className="editor-panel">
                            <h3 className="editor-panel__title">Author</h3>
                            <div className="editor-panel__author">
                                <div className="editor-panel__author-avatar">
                                    {poster?.name?.[0] || "?"}
                                </div>
                                <div>
                                    <div className="editor-panel__author-name">{poster?.name}</div>
                                    <div className="editor-panel__author-username">@{poster?.username}</div>
                                </div>
                            </div>
                        </div>

                        {/* Attachments */}
                        <div className="editor-panel">
                            <h3 className="editor-panel__title">Attachments ({attachments.length})</h3>

                            {attachments.length > 0 && (
                                <div className="editor-attachments">
                                    {attachments.map(att => (
                                        <div key={att._key} className="editor-attachment-item">
                                            <span className="editor-attachment-icon">{getFileIcon(att.mimeType)}</span>
                                            <div className="editor-attachment-info">
                                                <span className="editor-attachment-name">{att.filename}</span>
                                                <span className="editor-attachment-size">{formatFileSize(att.fileSize)}</span>
                                            </div>
                                            <button
                                                type="button"
                                                className="editor-attachment-remove"
                                                onClick={() => removeAttachment(att._key)}
                                                title="Remove attachment"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <label className="editor-add-attachment">
                                <input
                                    type="file"
                                    multiple
                                    onChange={handleAttachmentUpload}
                                    disabled={uploadingAttachment}
                                    accept="image/*,video/*,application/pdf,.doc,.docx,.txt,.zip,.rar,.7z"
                                />
                                {uploadingAttachment ? (
                                    <><div className="editor-spinner editor-spinner--small" /> Uploading…</>
                                ) : (
                                    <><span>+</span> Add file</>
                                )}
                            </label>
                            <p className="editor-panel__hint">Images, videos, PDFs, docs. Max 100MB each. Executables (.exe, .bat, etc.) are blocked.</p>
                        </div>

                        {/* Actions */}
                        <div className="editor-panel">
                            <h3 className="editor-panel__title">Actions</h3>
                            <div className="editor-panel__actions">
                                <button
                                    className="editor-btn editor-btn--save"
                                    onClick={() => handleSave(false)}
                                    disabled={saveState === "saving"}
                                >
                                    {saveState === "saving" ? "Saving…" : "Save Draft"}
                                </button>
                                <button
                                    className="editor-btn editor-btn--preview"
                                    onClick={() => setIsPreview(p => !p)}
                                >
                                    {isPreview ? "← Edit" : "Preview"}
                                </button>
                                <button
                                    className="editor-btn editor-btn--submit"
                                    disabled={!title.trim() || saveState === "saving" || (blogStatus !== STATUS.DRAFT && blogStatus !== STATUS.REJECTED)}
                                    onClick={() => {
                                        if (window.confirm("Submit for review?")) handleSave(true);
                                    }}
                                >
                                    Submit for Review →
                                </button>
                            </div>
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
};

export default BlogEditor;
