import { useRef, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Navbar from "../Navbar/Navbar";
import EchoText from "./components/EchoText";
import FlowingMenu from "./components/FlowingMenu";
import { blogReadClient, publishedBlogsQuery } from "./lib/blogSanity";
import "./BlogPage.css";

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

        // Fade in — consistent transition
        gsap.fromTo(containerRef.current,
            { opacity: 0 },
            { opacity: 1, duration: 1.2, ease: "power2.out" }
        );

        gsap.fromTo(".blog-page__hero-content",
            { y: 40, opacity: 0 },
            { y: 0, opacity: 1, duration: 1, delay: 0.3, ease: "power3.out" }
        );

        // Scroll up → navigate back to Contact
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
                    onComplete: () => navigate("/contact"),
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
                    onComplete: () => navigate("/contact"),
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

    // Format menu items for FlowingMenu
    const flowingItems = blogs.map((blog) => ({
        link: `/blog/${blog.slug?.current || blog.slug}`,
        text: blog.title,
        image: blog.coverImageUrl || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&fit=crop&sat=-100&auto=format"
    }));

    return (
        <div ref={containerRef} className="blog-page">
            <Navbar />

            {/* Hero Section with EchoText */}
            <section className="blog-page__hero">
                <div className="blog-page__hero-content">
                    <EchoText
                        text="Our Blogs"
                        echoes={12}
                        lag={0.24}
                        offset={36}
                        direction="right"
                        fade={0.62}
                        blur={3}
                        tint="#0490e9"
                        mode="pointer"
                        cursorRadius={320}
                        duration={900}
                        ease="ease-in-out"
                        fontSize="clamp(3rem, 9vw, 7rem)"
                        fontWeight={700}
                        color="#f8fafc"
                    />
                    <p className="blog-page__hero-sub">
                        Stories from behind the lens, filmmaking insights, project breakdowns, and creative perspectives.
                    </p>
                </div>
            </section>

            {/* Main Menu Area with FlowingMenu */}
            <main className="blog-page__main">
                {isLoading && (
                    <div className="blog-page__skeleton-menu">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="blog-skeleton-item">
                                <div className="blog-skeleton-line" />
                            </div>
                        ))}
                    </div>
                )}

                {error && !isLoading && (
                    <div className="blog-page__error">
                        <span className="blog-page__error-icon">✦</span>
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
                    <div className="blog-page__flowing-container">
                        <FlowingMenu
                            items={flowingItems}
                            speed={15}
                            textColor="#ffffff"
                            bgColor="transparent"
                            marqueeBgColor="#ee074c"
                            marqueeTextColor="#ffffff"
                            borderColor="rgba(255, 255, 255, 0.15)"
                        />
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="blog-page__footer">
                <p className="blog-page__footer-text">
                    Neon Cinematics · <Link to="/contact" className="blog-page__footer-link">Contact Us</Link>
                </p>
            </footer>
        </div>
    );
};

export default BlogPage;
