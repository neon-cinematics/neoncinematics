import { useRef, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Navbar from "../Navbar/Navbar";
import { PortableTextRenderer, AttachmentsSection } from "./PortableTextRenderer";
import { blogReadClient, blogBySlugQuery } from "./lib/blogSanity";
import { formatDate } from "./lib/blogHelpers";
import "./BlogDetail.css";

const BlogDetail = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const containerRef = useRef();
    const [blog, setBlog] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchBlog = async () => {
            if (!blogReadClient) {
                setError("Blog service unavailable.");
                setIsLoading(false);
                return;
            }
            try {
                const data = await blogReadClient.fetch(blogBySlugQuery, { slug });
                if (!data) {
                    setError("This blog doesn't exist or is no longer published.");
                } else {
                    setBlog(data);
                }
            } catch (err) {
                console.error("Failed to fetch blog:", err);
                setError("Failed to load blog. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchBlog();
    }, [slug]);

    useGSAP(() => {
        if ("scrollRestoration" in window.history) {
            window.history.scrollRestoration = "manual";
        }
        window.scrollTo(0, 0);

        gsap.fromTo(containerRef.current,
            { opacity: 0 },
            { opacity: 1, duration: 1.2, ease: "power2.out" }
        );
    }, { scope: containerRef });

    useEffect(() => {
        if (blog) {
            // Animate in content after loaded
            gsap.fromTo(".blog-detail__header",
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.9, delay: 0.2, ease: "power3.out" }
            );
            gsap.fromTo(".blog-detail__body",
                { y: 20, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.9, delay: 0.4, ease: "power3.out" }
            );
        }
    }, [blog]);

    const goBack = () => {
        gsap.to(containerRef.current, {
            opacity: 0,
            duration: 0.4,
            ease: "power2.out",
            onComplete: () => navigate("/blog"),
        });
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
            metaDesc.content = blog.description || `Read "${blog.title}" on Neon Cinematics Blog`;
        }
        return () => { document.title = "Neon Cinematics"; };
    }, [blog]);

    return (
        <div ref={containerRef} className="blog-detail-page">
            <Navbar />

            {/* Back button */}
            <div className="blog-detail__nav">
                <button className="blog-detail__back" onClick={goBack}>
                    <span>←</span>
                    <span>All Articles</span>
                </button>
            </div>

            {isLoading && (
                <div className="blog-detail__skeleton">
                    <div className="blog-detail__skeleton-cover" />
                    <div className="blog-detail__skeleton-body">
                        <div className="blog-detail__skeleton-kicker" />
                        <div className="blog-detail__skeleton-title" />
                        <div className="blog-detail__skeleton-title blog-detail__skeleton-title--short" />
                        <div className="blog-detail__skeleton-meta" />
                        <div className="blog-detail__skeleton-line" />
                        <div className="blog-detail__skeleton-line" />
                        <div className="blog-detail__skeleton-line blog-detail__skeleton-line--short" />
                    </div>
                </div>
            )}

            {error && !isLoading && (
                <div className="blog-detail__error">
                    <span className="blog-detail__error-icon">⚠</span>
                    <h2>Blog Not Found</h2>
                    <p>{error}</p>
                    <button onClick={goBack}>← Back to Blog</button>
                </div>
            )}

            {!isLoading && !error && blog && (
                <article className="blog-detail__article">
                    {/* Header */}
                    <header className="blog-detail__header">
                        <div className="blog-detail__header-inner">
                            <span className="blog-detail__kicker">Article</span>
                            <h1 className="blog-detail__title">{blog.title}</h1>
                            {blog.description && (
                                <p className="blog-detail__description">{blog.description}</p>
                            )}

                            <div className="blog-detail__byline">
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
                                <div>
                                    <span className="blog-detail__author-name">{blog.author?.name || "Neon Cinematics"}</span>
                                    <time className="blog-detail__date">
                                        {formatDate(blog.publishedAt || blog.createdAt)}
                                    </time>
                                </div>
                            </div>
                        </div>

                        {/* Divider line */}
                        <div className="blog-detail__header-line" />
                    </header>

                    {/* Cover Image */}
                    {blog.coverImageUrl && (
                        <div className="blog-detail__cover">
                            <img
                                src={blog.coverImageUrl}
                                alt={blog.title}
                            />
                        </div>
                    )}

                    {/* Body */}
                    <div className="blog-detail__body">
                        <div className="blog-detail__content-wrapper">
                            <PortableTextRenderer content={blog.content} />

                            {/* Attachments */}
                            <AttachmentsSection attachments={blog.attachments} />
                        </div>
                    </div>

                    {/* Article footer */}
                    <footer className="blog-detail__footer">
                        <div className="blog-detail__footer-line" />
                        <div className="blog-detail__footer-actions">
                            <button className="blog-detail__back blog-detail__back--footer" onClick={goBack}>
                                ← All Articles
                            </button>
                        </div>
                    </footer>
                </article>
            )}
        </div>
    );
};

export default BlogDetail;
