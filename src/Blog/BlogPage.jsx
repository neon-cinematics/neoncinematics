import { useRef, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Navbar from "../Navbar/Navbar";
import { blogReadClient, publishedBlogsQuery } from "./lib/blogSanity";
import { formatDate } from "./lib/blogHelpers";
import "./BlogPage.css";

const BlogCard = ({ blog, index }) => {
    const navigate = useNavigate();
    const cardRef = useRef();

    const handleCardClick = () => {
        const slug = blog.slug?.current || blog.slug;
        navigate(`/blog/${slug}`);
    };

    return (
        <article
            ref={cardRef}
            className={`blog-card blog-card--${index % 3 === 0 ? "featured" : "regular"}`}
            onClick={handleCardClick}
            role="link"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleCardClick()}
            aria-label={`Read blog: ${blog.title}`}
        >
            {blog.coverImageUrl && (
                <div className="blog-card__cover">
                    <img
                        src={blog.coverImageUrl}
                        alt={blog.title}
                        loading="lazy"
                    />
                    <div className="blog-card__cover-overlay" />
                </div>
            )}
            {!blog.coverImageUrl && (
                <div className="blog-card__cover blog-card__cover--placeholder">
                    <div className="blog-card__cover-abstract" />
                </div>
            )}

            <div className="blog-card__body">
                <header className="blog-card__header">
                    <span className="blog-card__kicker">Article</span>
                    <h2 className="blog-card__title">{blog.title}</h2>
                </header>

                {blog.description && (
                    <p className="blog-card__description">{blog.description}</p>
                )}

                <footer className="blog-card__footer">
                    <div className="blog-card__author">
                        {blog.author?.profileImageUrl ? (
                            <img
                                src={blog.author.profileImageUrl}
                                alt={blog.author.name}
                                className="blog-card__author-avatar"
                            />
                        ) : (
                            <div className="blog-card__author-avatar blog-card__author-avatar--initials">
                                {blog.author?.name?.[0] || "N"}
                            </div>
                        )}
                        <div>
                            <span className="blog-card__author-name">{blog.author?.name || "Neon Cinematics"}</span>
                            <time className="blog-card__date">{formatDate(blog.publishedAt || blog.createdAt)}</time>
                        </div>
                    </div>
                    <div className="blog-card__cta">
                        <span className="blog-card__cta-text">Read</span>
                        <span className="blog-card__cta-arrow">→</span>
                    </div>
                </footer>
            </div>
        </article>
    );
};

const BlogPage = () => {
    const navigate = useNavigate();
    const containerRef = useRef();
    const [blogs, setBlogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchBlogs = async () => {
            if (!blogReadClient) {
                setError("Blog service unavailable.");
                setIsLoading(false);
                return;
            }
            try {
                const data = await blogReadClient.fetch(publishedBlogsQuery);
                setBlogs(data || []);
            } catch (err) {
                console.error("Failed to fetch blogs:", err);
                setError("Failed to load blogs. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchBlogs();
    }, []);

    useGSAP(() => {
        if ("scrollRestoration" in window.history) {
            window.history.scrollRestoration = "manual";
        }
        window.scrollTo(0, 0);

        // Fade in — same pattern as Section3
        gsap.fromTo(containerRef.current,
            { opacity: 0 },
            { opacity: 1, duration: 1.5, ease: "power2.out" }
        );

        gsap.fromTo(".blog-page__hero h1",
            { y: 50, opacity: 0 },
            { y: 0, opacity: 1, duration: 1, delay: 0.4, ease: "power3.out" }
        );

        gsap.fromTo(".blog-page__hero p",
            { y: 30, opacity: 0 },
            { y: 0, opacity: 1, duration: 1, delay: 0.7, ease: "power3.out" }
        );

        // Scroll up → navigate back to About Us (consistent with existing pattern)
        let isSnapping = false;
        const handleScroll = (e) => {
            if (isSnapping) return;
            if (e.deltaY < 0 && window.scrollY <= 4) {
                e.preventDefault();
                isSnapping = true;
                gsap.to(containerRef.current, {
                    opacity: 0,
                    duration: 0.5,
                    ease: "power2.inOut",
                    onComplete: () => navigate("/aboutUs"),
                });
            }
        };
        let startY = 0;
        const handleTouchStart = (e) => { startY = e.touches[0].clientY; };
        const handleTouchMove = (e) => {
            if (isSnapping) return;
            const delta = e.touches[0].clientY - startY;
            if (delta > 60 && window.scrollY <= 4) {
                e.preventDefault();
                isSnapping = true;
                gsap.to(containerRef.current, {
                    opacity: 0, duration: 0.5, ease: "power2.inOut",
                    onComplete: () => navigate("/aboutUs"),
                });
            }
        };

        window.addEventListener("wheel", handleScroll, { passive: false });
        window.addEventListener("touchstart", handleTouchStart, { passive: true });
        window.addEventListener("touchmove", handleTouchMove, { passive: false });

        return () => {
            window.removeEventListener("wheel", handleScroll);
            window.removeEventListener("touchstart", handleTouchStart);
            window.removeEventListener("touchmove", handleTouchMove);
        };
    }, { scope: containerRef, dependencies: [] });

    // Staggered card animations after load
    useEffect(() => {
        if (!isLoading && blogs.length > 0) {
            gsap.fromTo(".blog-card",
                { y: 40, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.7,
                    stagger: 0.12,
                    ease: "power3.out",
                    delay: 0.3,
                }
            );
        }
    }, [isLoading, blogs]);

    return (
        <div ref={containerRef} className="blog-page">
            <Navbar />

            {/* Hero */}
            <section className="blog-page__hero">
                <div className="blog-page__hero-bg" aria-hidden="true" />
                <div className="blog-page__hero-content">
                    <h1>The Neon Journal</h1>
                    <p>Stories from behind the lens — filmmaking insights, project breakdowns, and creative perspectives from the Neon Cinematics collective.</p>
                </div>
                <div className="blog-page__hero-line" aria-hidden="true" />
            </section>

            {/* Blog Grid */}
            <main className="blog-page__main" id="blog-grid">
                {isLoading && (
                    <div className="blog-page__skeleton-grid">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="blog-skeleton">
                                <div className="blog-skeleton__cover" />
                                <div className="blog-skeleton__body">
                                    <div className="blog-skeleton__kicker" />
                                    <div className="blog-skeleton__title" />
                                    <div className="blog-skeleton__title blog-skeleton__title--short" />
                                    <div className="blog-skeleton__desc" />
                                    <div className="blog-skeleton__desc blog-skeleton__desc--short" />
                                    <div className="blog-skeleton__footer" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {error && !isLoading && (
                    <div className="blog-page__error">
                        <span className="blog-page__error-icon">⚠</span>
                        <p>{error}</p>
                        <button onClick={() => window.location.reload()}>Try again</button>
                    </div>
                )}

                {!isLoading && !error && blogs.length === 0 && (
                    <div className="blog-page__empty">
                        <div className="blog-page__empty-icon">✦</div>
                        <h2>No stories yet</h2>
                        <p>The first chapter is being written. Check back soon.</p>
                    </div>
                )}

                {!isLoading && !error && blogs.length > 0 && (
                    <div className="blog-page__grid">
                        {blogs.map((blog, index) => (
                            <BlogCard key={blog._id} blog={blog} index={index} />
                        ))}
                    </div>
                )}
            </main>

            {/* Footer line */}
            <footer className="blog-page__footer">
                <hr className="blog-page__footer-line" />
                <p className="blog-page__footer-text">
                    Neon Cinematics · <Link to="/contact" className="blog-page__footer-link">Contact Us</Link>
                </p>
            </footer>
        </div>
    );
};

export default BlogPage;
