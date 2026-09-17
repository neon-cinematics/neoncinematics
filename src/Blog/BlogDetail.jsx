import { useRef, useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Navbar from "../Navbar/Navbar";
import { PortableTextRenderer, AttachmentsSection } from "./PortableTextRenderer";
import { blogReadClient, blogBySlugQuery } from "./lib/blogSanity";
import { formatDate } from "./lib/blogHelpers";
import "./BlogDetail.css";

const BlogDetail = () => {
    const { slug, id } = useParams();
    const navigate = useNavigate();
    const containerRef = useRef();

    // Blog data states
    const [blog, setBlog] = useState(null);
    const [moreBlogs, setMoreBlogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Reading & UI states
    const [readingProgress, setReadingProgress] = useState(0);
    const [activeHeadingId, setActiveHeadingId] = useState("");
    const [copiedToast, setCopiedToast] = useState(false);

    const isPreviewMode = !!id;

    // Fetch primary blog + related blogs
    useEffect(() => {
        const fetchBlog = async () => {
            if (!blogReadClient) {
                setError("Blog service unavailable.");
                setIsLoading(false);
                return;
            }
            try {
                setIsLoading(true);
                setError(null);
                let data = null;
                if (id) {
                    // Preview mode — fetch by ID (supports drafts & pending posts)
                    data = await blogReadClient.fetch(blogByIdQuery, { id });
                } else if (slug) {
                    // Public mode — fetch by slug
                    data = await blogReadClient.fetch(blogBySlugQuery, { slug });
                }

                if (!data) {
                    setError("This blog doesn't exist or is no longer available.");
                } else {
                    setBlog(data);
                    const currentSlug = data.slug?.current || slug || "";
                    // Fetch up to 2 other published blogs for Next/Prev cards
                    const related = await blogReadClient.fetch(
                        `*[_type == "blog" && status == "published" && slug.current != $currentSlug] | order(publishedAt desc)[0..1] {
                            _id, title, slug, description, publishedAt,
                            "coverImageUrl": coverImage.asset->url
                        }`,
                        { currentSlug }
                    );
                    setMoreBlogs(related || []);
                }
            } catch (err) {
                console.error("Failed to fetch blog:", err);
                setError("Failed to load blog. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchBlog();
    }, [slug, id]);

    // Initial page enter animation
    useGSAP(() => {
        if ("scrollRestoration" in window.history) {
            window.history.scrollRestoration = "manual";
        }
        window.scrollTo(0, 0);

        gsap.fromTo(containerRef.current,
            { opacity: 0 },
            { opacity: 1, duration: 1.0, ease: "power2.out" }
        );
    }, { scope: containerRef, dependencies: [slug] });

    useEffect(() => {
        if (blog) {
            gsap.fromTo(".blog-detail__header",
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.9, delay: 0.1, ease: "power3.out" }
            );
            gsap.fromTo(".blog-detail__cover",
                { scale: 0.98, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.9, delay: 0.25, ease: "power3.out" }
            );
            gsap.fromTo(".blog-detail__layout",
                { y: 20, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.9, delay: 0.35, ease: "power3.out" }
            );
        }
    }, [blog]);

    // Scroll reading progress listener
    useEffect(() => {
        const handleScroll = () => {
            const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
            if (totalScroll > 0) {
                const currentScroll = window.scrollY;
                const progress = (currentScroll / totalScroll) * 100;
                setReadingProgress(Math.min(100, Math.max(0, progress)));
            }
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Extract headings for Table of Contents
    const headings = useMemo(() => {
        if (!blog?.content || !Array.isArray(blog.content)) return [];
        return blog.content
            .filter(b => b._type === "block" && ["h1", "h2", "h3"].includes(b.style))
            .map(b => {
                const text = b.children?.map(c => c.text || "").join("") || "";
                const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
                return { level: b.style, text, id };
            })
            .filter(h => h.text.trim().length > 0);
    }, [blog]);

    // Calculate reading time
    const readingTime = useMemo(() => {
        if (!blog) return 1;
        let wordCount = (blog.title || "").split(/\s+/).filter(Boolean).length;
        wordCount += (blog.description || "").split(/\s+/).filter(Boolean).length;

        if (Array.isArray(blog.content)) {
            blog.content.forEach(b => {
                if (b._type === "block" && b.children) {
                    const text = b.children.map(c => c.text || "").join(" ");
                    wordCount += text.split(/\s+/).filter(Boolean).length;
                }
            });
        }
        return Math.max(1, Math.ceil(wordCount / 200));
    }, [blog]);

    // Active heading observer
    useEffect(() => {
        if (!headings.length) return;
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        setActiveHeadingId(entry.target.id);
                    }
                });
            },
            { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
        );

        headings.forEach(h => {
            const el = document.getElementById(h.id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [headings]);

    const scrollToHeading = (id) => {
        const el = document.getElementById(id);
        if (el) {
            const yOffset = -100;
            const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: "smooth" });
        }
    };

    const goBack = () => {
        gsap.to(containerRef.current, {
            opacity: 0,
            duration: 0.35,
            ease: "power2.out",
            onComplete: () => navigate("/blog"),
        });
    };

    // Social sharing handlers
    const copyArticleLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 2500);
    };

    const shareTwitter = () => {
        const text = encodeURIComponent(`Read "${blog?.title}" on Neon Cinematics`);
        const url = encodeURIComponent(window.location.href);
        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
    };

    const shareLinkedIn = () => {
        const url = encodeURIComponent(window.location.href);
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, "_blank");
    };

    // Update document title + meta for SEO
    useEffect(() => {
        if (blog) {
            document.title = `${blog.title} — Neon Cinematics`;
            let metaDesc = document.querySelector('meta[name="description"]');
            if (!metaDesc) {
                metaDesc = document.createElement("meta");
                metaDesc.name = "description";
                document.head.appendChild(metaDesc);
            }
            metaDesc.content = blog.description || `Read "${blog.title}" on Neon Cinematics`;
        }
        return () => { document.title = "Neon Cinematics"; };
    }, [blog]);

    return (
        <div ref={containerRef} className="blog-detail-page">
            {/* Top Reading Progress Bar */}
            <div
                className="blog-detail__progress-bar"
                style={{ width: `${readingProgress}%` }}
                aria-hidden="true"
            />

            <Navbar />

            {/* Preview Mode Banner */}
            {isPreviewMode && (
                <div className="blog-detail__preview-banner">
                    <span>👁 <strong>Preview Mode</strong> — Article Status: <span className="blog-detail__preview-status">{blog?.status ? (STATUS_LABELS[blog.status] || blog.status) : "DRAFT"}</span></span>
                    {blog && (
                        <button className="blog-detail__preview-close" onClick={() => navigate(-1)}>
                            Exit Preview ✕
                        </button>
                    )}
                </div>
            )}

            {/* Top Navigation Bar */}
            <div className="blog-detail__nav">
                <button className="blog-detail__back" onClick={goBack}>
                    <span className="blog-detail__back-arrow">←</span>
                    <span>All Articles</span>
                </button>
                {blog && (
                    <div className="blog-detail__nav-meta">
                        <span className="blog-detail__read-badge">⏱ {readingTime} min read</span>
                    </div>
                )}
            </div>

            {/* Skeleton Loading State */}
            {isLoading && (
                <div className="blog-detail__skeleton">
                    <div className="blog-detail__skeleton-header">
                        <div className="blog-detail__skeleton-kicker" />
                        <div className="blog-detail__skeleton-title" />
                        <div className="blog-detail__skeleton-title short" />
                        <div className="blog-detail__skeleton-meta" />
                    </div>
                    <div className="blog-detail__skeleton-cover" />
                    <div className="blog-detail__skeleton-body">
                        <div className="blog-detail__skeleton-line" />
                        <div className="blog-detail__skeleton-line" />
                        <div className="blog-detail__skeleton-line short" />
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
                <div className="blog-detail__error">
                    <div className="blog-detail__error-badge">⚠️</div>
                    <h2>Article Not Found</h2>
                    <p>{error}</p>
                    <button className="blog-detail__error-btn" onClick={goBack}>
                        ← Back to Articles
                    </button>
                </div>
            )}

            {/* Article Content */}
            {!isLoading && !error && blog && (
                <article className="blog-detail__article">
                    {/* Header */}
                    <header className="blog-detail__header">
                        <div className="blog-detail__header-inner">
                            <span className="blog-detail__kicker">Editorial</span>
                            <h1 className="blog-detail__title">{blog.title}</h1>
                            {blog.description && (
                                <p className="blog-detail__description">{blog.description}</p>
                            )}

                            {/* Author Byline */}
                            <div className="blog-detail__byline">
                                <div className="blog-detail__author-avatar-wrap">
                                    {blog.author?.profileImageUrl ? (
                                        <img
                                            src={blog.author.profileImageUrl}
                                            alt={blog.author.name}
                                            className="blog-detail__author-avatar"
                                        />
                                    ) : (
                                        <div className="blog-detail__author-avatar blog-detail__author-avatar--initials">
                                            {blog.author?.name?.[0] || "N"}
                                        </div>
                                    )}
                                </div>
                                <div className="blog-detail__author-info">
                                    <span className="blog-detail__author-name">{blog.author?.name || "Neon Cinematics"}</span>
                                    <div className="blog-detail__meta-sub">
                                        <time dateTime={blog.publishedAt || blog.createdAt}>
                                            {formatDate(blog.publishedAt || blog.createdAt)}
                                        </time>
                                        <span className="blog-detail__meta-dot">•</span>
                                        <span>{readingTime} min read</span>
                                    </div>
                                </div>

                                {/* Floating Share Actions */}
                                <div className="blog-detail__share-inline">
                                    <button onClick={shareTwitter} title="Share on X / Twitter" aria-label="Share on X">
                                        𝕏
                                    </button>
                                    <button onClick={shareLinkedIn} title="Share on LinkedIn" aria-label="Share on LinkedIn">
                                        in
                                    </button>
                                    <button onClick={copyArticleLink} title="Copy Article Link" aria-label="Copy link">
                                        🔗
                                    </button>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Cover Image */}
                    {blog.coverImageUrl && (
                        <div className="blog-detail__cover">
                            <img src={blog.coverImageUrl} alt={blog.title} />
                        </div>
                    )}

                    {/* Article Main Layout (Table of Contents + Canvas Content) */}
                    <div className="blog-detail__layout">
                        {/* Table of Contents Sidebar */}
                        {headings.length > 0 && (
                            <aside className="blog-detail__toc-sidebar">
                                <div className="blog-detail__toc-inner">
                                    <span className="blog-detail__toc-title">ON THIS PAGE</span>
                                    <nav className="blog-detail__toc-list">
                                        {headings.map((h, i) => (
                                            <button
                                                key={i}
                                                onClick={() => scrollToHeading(h.id)}
                                                className={`blog-detail__toc-item blog-detail__toc-item--${h.level} ${activeHeadingId === h.id ? "is-active" : ""}`}
                                            >
                                                {h.text}
                                            </button>
                                        ))}
                                    </nav>
                                </div>
                            </aside>
                        )}

                        {/* Article Canvas Body */}
                        <div className="blog-detail__body">
                            <div className="blog-detail__content-wrapper">
                                <PortableTextRenderer content={blog.content} />
                                <AttachmentsSection attachments={blog.attachments} />
                            </div>

                            {/* Social Share Bar Footer */}
                            <div className="blog-detail__share-bar">
                                <span className="blog-detail__share-label">Share this article:</span>
                                <div className="blog-detail__share-btns">
                                    <button onClick={shareTwitter} className="blog-detail__share-btn">
                                        <span>𝕏</span> Twitter
                                    </button>
                                    <button onClick={shareLinkedIn} className="blog-detail__share-btn">
                                        <span>in</span> LinkedIn
                                    </button>
                                    <button onClick={copyArticleLink} className="blog-detail__share-btn">
                                        <span>🔗</span> Copy Link
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Related / Next Articles Section */}
                    {moreBlogs.length > 0 && (
                        <section className="blog-detail__more">
                            <div className="blog-detail__more-header">
                                <h3>Continue Reading</h3>
                                <div className="blog-detail__more-divider" />
                            </div>
                            <div className="blog-detail__more-grid">
                                {moreBlogs.map((b) => (
                                    <Link key={b._id} to={`/blog/${b.slug.current}`} className="blog-detail__more-card">
                                        {b.coverImageUrl && (
                                            <div className="blog-detail__more-cover">
                                                <img src={b.coverImageUrl} alt={b.title} />
                                            </div>
                                        )}
                                        <div className="blog-detail__more-info">
                                            <time>{formatDate(b.publishedAt)}</time>
                                            <h4>{b.title}</h4>
                                            {b.description && <p>{b.description}</p>}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Footer */}
                    <footer className="blog-detail__footer">
                        <button className="blog-detail__back-footer" onClick={goBack}>
                            ← Return to All Articles
                        </button>
                    </footer>
                </article>
            )}

            {/* Copy Link Toast Notification */}
            {copiedToast && (
                <div className="blog-detail__toast">
                    <span>✓ Article link copied to clipboard</span>
                </div>
            )}
        </div>
    );
};

export default BlogDetail;
