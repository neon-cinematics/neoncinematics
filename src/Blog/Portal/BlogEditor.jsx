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
import { getPoster, isLoggedIn } from "../lib/blogAuth";
import {
    blogReadClient, createBlogWriteClient,
    blogByIdQuery, generateSlug, createBlogDoc
} from "../lib/blogSanity";
import {
    STATUS, STATUS_LABELS, STATUS_COLORS, canPosterEdit,
    MAX_FILE_SIZE, getFileIcon, formatFileSize
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

// ─── Main Editorial Editor Component ──────────────────────────────────────────

const BlogEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const containerRef = useRef();
    const poster = getPoster();
    const isEditing = !!id;

    // Core document states
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [coverImage, setCoverImage] = useState(null);
    const [coverImagePreview, setCoverImagePreview] = useState(null);
    const [attachments, setAttachments] = useState([]);
    const [drawings, setDrawings] = useState([]); // List of embedded drawings
    const [blogStatus, setBlogStatus] = useState(STATUS.DRAFT);
    const [blogId, setBlogId] = useState(id || null);

    // Sidebar & Modal states
    const [showOutline, setShowOutline] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [showDrawingStudio, setShowDrawingStudio] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);

    // Settings Panel Fields
    const [seoTitle, setSeoTitle] = useState("");
    const [metaDescription, setMetaDescription] = useState("");
    const [slugInput, setSlugInput] = useState("");
    const [category, setCategory] = useState("Filmmaking");
    const [tags, setTags] = useState("Cinematography, Production");

    // UI Feedback states
    const [saveState, setSaveState] = useState("idle");
    const [isLoading, setIsLoading] = useState(isEditing);
    const [isPreview, setIsPreview] = useState(false);
    const [toast, setToast] = useState(null);
    const [hasUnsaved, setHasUnsaved] = useState(false);

    // Slash menu trigger state
    const [slashPos, setSlashPos] = useState(null);

    const WRITE_TOKEN = import.meta.env.VITE_SANITY_WRITE_TOKEN;

    useEffect(() => {
        if (!isLoggedIn()) navigate("/blog/login", { replace: true });
    }, [navigate]);

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
                const doc = createBlogDoc({ title, description }, poster?.id);
                doc.content = portableContent;
                doc.slug = { _type: "slug", current: slugInput || generateSlug(title) };
                if (coverImage) doc.coverImage = { _type: "image", asset: { _type: "reference", _ref: coverImage } };
                if (submitAfter) {
                    doc.status = STATUS.SUBMITTED;
                    doc.submittedAt = new Date().toISOString();
                }

                const created = await client.create(doc);
                setBlogId(created._id);
                setHasUnsaved(false);
                setSaveState("saved");

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
                    "slug.current": slugInput || generateSlug(title),
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
            setTimeout(() => setSaveState("idle"), 3000);
        } catch (err) {
            console.error(err);
            showToast("Save failed: " + err.message, "error");
            setSaveState("error");
            setTimeout(() => setSaveState("idle"), 3000);
        }
    }, [title, description, coverImage, editor, blogId, poster, slugInput]);

    // Headings Outline Extraction
    const getHeadings = () => {
        if (!editor) return [];
        const headings = [];
        editor.state.doc.descendants((node, pos) => {
            if (node.type.name === "heading") {
                headings.push({
                    text: node.textContent,
                    level: node.attrs.level,
                    pos,
                });
            }
        });
        return headings;
    };

    const scrollToHeading = (pos) => {
        if (!editor) return;
        editor.commands.setTextSelection(pos);
        const dom = editor.view.domAtPos(pos);
        if (dom?.node) {
            const el = dom.node.nodeType === 1 ? dom.node : dom.node.parentElement;
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    };

    // Calculate word count & reading time
    const textContent = editor ? editor.getText() : "";
    const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    const handleSaveDrawingBlock = ({ dataUrl }) => {
        setDrawings(prev => [...prev, { id: Date.now(), dataUrl, caption: "" }]);
        setHasUnsaved(true);
        showToast("Drawing added to story.");
    };

    return (
        <div ref={containerRef} className="editorial-editor-page">
            {toast && <div className={`editor-toast editor-toast--${toast.type}`}>{toast.msg}</div>}

            {/* Top Navigation Bar */}
            <header className="editorial-navbar">
                <div className="editorial-navbar__left">
                    <button type="button" className="editorial-btn editorial-btn--ghost" onClick={() => navigate("/blog/dashboard")}>
                        ← Back to Blogs
                    </button>
                    <div className="editorial-status-pill" data-state={saveState}>
                        <span className="editorial-status-dot" />
                        <span>{saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved ✓" : hasUnsaved ? "Unsaved changes" : "Draft"}</span>
                    </div>
                </div>

                <div className="editorial-navbar__center">
                    <button
                        type="button"
                        className={`editorial-nav-tab ${showOutline ? "active" : ""}`}
                        onClick={() => setShowOutline(o => !o)}
                        title="Toggle Outline Panel"
                    >
                        ☰ Outline
                    </button>
                    <button
                        type="button"
                        className={`editorial-nav-tab ${showSettings ? "active" : ""}`}
                        onClick={() => setShowSettings(s => !s)}
                        title="Toggle Article Settings"
                    >
                        ⚙ Settings
                    </button>
                </div>

                <div className="editorial-navbar__right">
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
                        Save Draft
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

            {/* Main Editorial Layout */}
            <div className="editorial-workspace">
                {/* Left Headings Outline Drawer */}
                {showOutline && (
                    <aside className="editorial-outline-panel">
                        <div className="editorial-panel-header">
                            <h4>Article Outline</h4>
                            <span className="editorial-count-badge">{getHeadings().length} sections</span>
                        </div>

                        <div className="editorial-outline-list">
                            {getHeadings().length === 0 ? (
                                <p className="editorial-outline-empty">Add H1, H2, or H3 headings to populate table of contents.</p>
                            ) : (
                                getHeadings().map((h, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        className={`outline-item level-${h.level}`}
                                        onClick={() => scrollToHeading(h.pos)}
                                    >
                                        <span className="outline-item__tag">H{h.level}</span>
                                        <span className="outline-item__text">{h.text || "Untitled Section"}</span>
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
                                    <img src={coverImagePreview} alt="Cover" />
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
                                className="editorial-title-input"
                                placeholder="Title..."
                                value={title}
                                onChange={e => { setTitle(e.target.value); setHasUnsaved(true); }}
                                rows={1}
                            />

                            {/* Subtitle / Excerpt */}
                            <input
                                type="text"
                                className="editorial-subtitle-input"
                                placeholder="Add a subtitle or excerpt..."
                                value={description}
                                onChange={e => { setDescription(e.target.value); setHasUnsaved(true); }}
                            />

                            {/* Cover Image Zone */}
                            <div className="editorial-cover-zone">
                                {coverImagePreview ? (
                                    <div className="editorial-cover-preview">
                                        <img src={coverImagePreview} alt="Cover" />
                                        <button
                                            type="button"
                                            onClick={() => { setCoverImage(null); setCoverImagePreview(null); setHasUnsaved(true); }}
                                            className="editorial-cover-remove"
                                        >
                                            ✕ Remove Cover
                                        </button>
                                    </div>
                                ) : (
                                    <label className="editorial-cover-dropzone">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                setCoverImagePreview(URL.createObjectURL(file));
                                                try {
                                                    const client = getWriteClient();
                                                    const asset = await client.assets.upload("image", file, { filename: file.name });
                                                    setCoverImage(asset._id);
                                                    setHasUnsaved(true);
                                                } catch (err) {
                                                    showToast("Cover upload failed: " + err.message, "error");
                                                }
                                            }}
                                        />
                                        <span>📷 Add Cover Image</span>
                                    </label>
                                )}
                            </div>

                            {/* Canvas Toolbar Quick Access */}
                            <div className="editorial-quick-tools">
                                <button type="button" onClick={() => setShowDrawingStudio(true)} className="quick-tool-btn">
                                    🎨 Open Drawing Studio
                                </button>
                                <button type="button" onClick={() => editor?.chain().focus().toggleBlockquote().run()} className="quick-tool-btn">
                                    ❝ Quote
                                </button>
                                <button type="button" onClick={() => editor?.chain().focus().toggleCodeBlock().run()} className="quick-tool-btn">
                                    {"</> Code"}
                                </button>
                            </div>

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
                {showSettings && (
                    <aside className="editorial-settings-panel">
                        <div className="editorial-panel-header">
                            <h4>Article Settings & SEO</h4>
                            <button type="button" onClick={() => setShowSettings(false)} className="panel-close-btn">✕</button>
                        </div>

                        <div className="editorial-settings-form">
                            <div className="settings-field">
                                <label>SEO Title ({seoTitle.length}/60)</label>
                                <input
                                    type="text"
                                    value={seoTitle}
                                    onChange={e => setSeoTitle(e.target.value)}
                                    placeholder="Meta title..."
                                />
                            </div>

                            <div className="settings-field">
                                <label>Meta Description ({metaDescription.length}/160)</label>
                                <textarea
                                    rows={3}
                                    value={metaDescription}
                                    onChange={e => setMetaDescription(e.target.value)}
                                    placeholder="Search engine excerpt..."
                                />
                            </div>

                            <div className="settings-field">
                                <label>URL Slug</label>
                                <input
                                    type="text"
                                    value={slugInput}
                                    onChange={e => setSlugInput(e.target.value)}
                                    placeholder="url-slug..."
                                />
                                <span className="slug-preview-path">/blog/{slugInput || generateSlug(title)}</span>
                            </div>

                            <div className="settings-field">
                                <label>Category</label>
                                <select value={category} onChange={e => setCategory(e.target.value)}>
                                    <option value="Filmmaking">Filmmaking</option>
                                    <option value="Cinematography">Cinematography</option>
                                    <option value="Color Grading">Color Grading</option>
                                    <option value="Directing">Directing</option>
                                    <option value="Behind The Scenes">Behind The Scenes</option>
                                </select>
                            </div>

                            <div className="settings-field">
                                <label>Tags (comma separated)</label>
                                <input
                                    type="text"
                                    value={tags}
                                    onChange={e => setTags(e.target.value)}
                                    placeholder="Lighting, Lenses, RAW..."
                                />
                            </div>

                            <div className="settings-field">
                                <label>Author</label>
                                <div className="author-card">
                                    <div className="author-avatar">{poster?.name?.[0] || "?"}</div>
                                    <div>
                                        <strong>{poster?.name}</strong>
                                        <span>@{poster?.username}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>
                )}
            </div>

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
