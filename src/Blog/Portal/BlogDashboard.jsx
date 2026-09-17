import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
    getPoster, clearSession, isLoggedIn, getToken
} from "../lib/blogAuth";
import {
    blogReadClient, createBlogWriteClient, posterBlogsQuery, posterStatsQuery
} from "../lib/blogSanity";
import {
    STATUS, STATUS_LABELS, STATUS_COLORS, getPosterActions,
    formatDate, formatDateTime, timeAgo
} from "../lib/blogHelpers";
import "./BlogDashboard.css";

const StatusBadge = ({ status }) => {
    const style = STATUS_COLORS[status] || STATUS_COLORS.draft;
    return (
        <span className="status-badge" style={{
            background: style.bg,
            color: style.color,
            border: `1px solid ${style.border}`,
        }}>
            {STATUS_LABELS[status] || status}
        </span>
    );
};

const StatCard = ({ label, value, color }) => (
    <div className="stat-card" style={{ "--stat-color": color }}>
        <span className="stat-card__value">{value}</span>
        <span className="stat-card__label">{label}</span>
    </div>
);

const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
    <div className="confirm-overlay" role="dialog" aria-modal="true">
        <div className="confirm-dialog">
            <p>{message}</p>
            <div className="confirm-dialog__actions">
                <button className="confirm-dialog__cancel" onClick={onCancel}>Cancel</button>
                <button className="confirm-dialog__confirm" onClick={onConfirm}>Confirm</button>
            </div>
        </div>
    </div>
);

const BlogDashboard = () => {
    const navigate = useNavigate();
    const containerRef = useRef();
    const poster = getPoster();
    const [blogs, setBlogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("all");
    const [toast, setToast] = useState(null);
    const [confirm, setConfirm] = useState(null);

    // Redirect if not logged in
    useEffect(() => {
        if (!isLoggedIn()) {
            navigate("/blog/login", { replace: true });
        }
    }, [navigate]);

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchData = async () => {
        if (!blogReadClient || !poster?.id) return;
        setIsLoading(true);
        try {
            const [blogsData, statsData] = await Promise.all([
                blogReadClient.fetch(posterBlogsQuery, { authorId: poster.id }),
                blogReadClient.fetch(posterStatsQuery, { authorId: poster.id }),
            ]);
            setBlogs(blogsData || []);
            setStats(statsData);
        } catch (err) {
            console.error("Failed to fetch dashboard data:", err);
            showToast("Failed to load dashboard data.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [poster?.id]);

    useGSAP(() => {
        gsap.fromTo(containerRef.current,
            { opacity: 0 },
            { opacity: 1, duration: 1, ease: "power2.out" }
        );
        gsap.fromTo(".dashboard__header",
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, delay: 0.2, ease: "power3.out" }
        );
    }, { scope: containerRef });

    const handleLogout = () => {
        clearSession();
        gsap.to(containerRef.current, {
            opacity: 0, duration: 0.4, ease: "power2.out",
            onComplete: () => navigate("/blog/login"),
        });
    };

    const handleDelete = (blog) => {
        setConfirm({
            message: `Delete "${blog.title}"? This action cannot be undone.`,
            onConfirm: async () => {
                setConfirm(null);
                try {
                    const token = getToken();
                    const client = createBlogWriteClient(import.meta.env.VITE_SANITY_WRITE_TOKEN);
                    // Poster can only delete DRAFTS — the server/Sanity schema enforces this
                    if (blog.status !== STATUS.DRAFT && blog.status !== STATUS.REJECTED) {
                        showToast("Only draft or rejected blogs can be deleted.", "error");
                        return;
                    }
                    await blogReadClient.delete(blog._id);
                    setBlogs(prev => prev.filter(b => b._id !== blog._id));
                    showToast("Blog deleted.");
                    fetchData();
                } catch (err) {
                    showToast("Failed to delete blog: " + err.message, "error");
                }
            },
            onCancel: () => setConfirm(null),
        });
    };

    const handleSubmit = async (blog) => {
        try {
            // We need a write client — for poster submissions, use a limited Sanity token
            // stored in env. In production, this would be handled server-side.
            const writeToken = import.meta.env.VITE_SANITY_WRITE_TOKEN;
            if (!writeToken) {
                showToast("Write access not configured. Contact admin.", "error");
                return;
            }
            const client = createBlogWriteClient(writeToken);
            await client.patch(blog._id).set({
                status: STATUS.SUBMITTED,
                submittedAt: new Date().toISOString(),
            }).commit();

            setBlogs(prev => prev.map(b =>
                b._id === blog._id ? { ...b, status: STATUS.SUBMITTED } : b
            ));
            showToast("Blog submitted for review! Managers have been notified.");

            // Email notification (stub)
            const { notifyManagers, notifyPosterSubmitted } = await import("../lib/emailService");
            if (blogReadClient) {
                const managers = await blogReadClient.fetch(`*[_type == "blogManager" && isActive == true].email`);
                await notifyManagers(managers, blog, poster);
            }
            await notifyPosterSubmitted(poster.email, blog);
        } catch (err) {
            showToast("Failed to submit blog: " + err.message, "error");
        }
    };

    const filteredBlogs = statusFilter === "all"
        ? blogs
        : blogs.filter(b => b.status === statusFilter);

    const STATUS_FILTERS = [
        { value: "all", label: "All" },
        { value: "draft", label: "Draft" },
        { value: "submitted", label: "Submitted" },
        { value: "under_review", label: "Under Review" },
        { value: "approved", label: "Approved" },
        { value: "rejected", label: "Rejected" },
        { value: "published", label: "Published" },
    ];

    return (
        <div ref={containerRef} className="dashboard-page">
            {confirm && <ConfirmDialog {...confirm} />}

            {/* Toast */}
            {toast && (
                <div className={`dashboard__toast dashboard__toast--${toast.type}`} role="status">
                    {toast.message}
                </div>
            )}

            {/* Sidebar */}
            <aside className="dashboard__sidebar">
                <div className="dashboard__brand">
                    <Link to="/" className="dashboard__brand-logo">NEON</Link>
                    <span className="dashboard__brand-sub">Blog Portal</span>
                </div>

                <nav className="dashboard__nav">
                    <Link to="/blog/dashboard" className="dashboard__nav-link dashboard__nav-link--active">
                        <span className="dashboard__nav-icon">◈</span>
                        Dashboard
                    </Link>
                    <Link to="/blog/create" className="dashboard__nav-link">
                        <span className="dashboard__nav-icon">+</span>
                        New Blog
                    </Link>
                    <Link to="/blog" className="dashboard__nav-link">
                        <span className="dashboard__nav-icon">→</span>
                        Public Blog
                    </Link>
                </nav>

                <div className="dashboard__poster">
                    <div className="dashboard__poster-avatar">
                        {poster?.name?.[0] || "?"}
                    </div>
                    <div>
                        <div className="dashboard__poster-name">{poster?.name}</div>
                        <div className="dashboard__poster-role">Blog Poster</div>
                    </div>
                </div>

                <button className="dashboard__logout" onClick={handleLogout}>
                    Sign Out
                </button>
            </aside>

            {/* Main content */}
            <main className="dashboard__main">
                {/* Header */}
                <div className="dashboard__header">
                    <div>
                        <h1 className="dashboard__title">Your Blogs</h1>
                        <p className="dashboard__subtitle">Manage your content and track review status.</p>
                    </div>
                    <Link to="/blog/create" className="dashboard__new-btn">
                        + New Blog
                    </Link>
                </div>

                {/* Stats */}
                {stats && (
                    <div className="dashboard__stats">
                        <StatCard label="Total" value={stats.total} color="#f2f1eb" />
                        <StatCard label="Draft" value={stats.draft} color="#9ba4a7" />
                        <StatCard label="Pending" value={stats.submitted} color="#00b4ff" />
                        <StatCard label="Approved" value={stats.approved} color="#7de5d2" />
                        <StatCard label="Rejected" value={stats.rejected} color="#e05c6a" />
                        <StatCard label="Published" value={stats.published} color="#ff7800" />
                    </div>
                )}

                {/* Filters */}
                <div className="dashboard__filters">
                    {STATUS_FILTERS.map(f => (
                        <button
                            key={f.value}
                            className={`dashboard__filter ${statusFilter === f.value ? "dashboard__filter--active" : ""}`}
                            onClick={() => setStatusFilter(f.value)}
                        >
                            {f.label}
                            {f.value !== "all" && stats && (
                                <span className="dashboard__filter-count">
                                    {f.value === "submitted" ? (stats.submitted || 0) :
                                     f.value === "draft" ? (stats.draft || 0) :
                                     stats[f.value] || 0}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Blog List */}
                {isLoading ? (
                    <div className="dashboard__loading">
                        <div className="dashboard__spinner" />
                        <span>Loading your blogs...</span>
                    </div>
                ) : filteredBlogs.length === 0 ? (
                    <div className="dashboard__empty">
                        <div className="dashboard__empty-icon">✦</div>
                        <h2>
                            {statusFilter === "all"
                                ? "No blogs yet"
                                : `No ${STATUS_LABELS[statusFilter] || statusFilter} blogs`}
                        </h2>
                        <p>
                            {statusFilter === "all"
                                ? "Create your first blog post and start sharing your story."
                                : "Try a different filter to see your other blogs."}
                        </p>
                        {statusFilter === "all" && (
                            <Link to="/blog/create" className="dashboard__empty-cta">
                                Create Blog →
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="dashboard__blog-list">
                        {filteredBlogs.map(blog => {
                            const actions = getPosterActions(blog.status);
                            return (
                                <div key={blog._id} className="dashboard__blog-row">
                                    <div className="dashboard__blog-cover">
                                        {blog.coverImageUrl ? (
                                            <img src={blog.coverImageUrl} alt={blog.title} />
                                        ) : (
                                            <div className="dashboard__blog-cover--placeholder">✦</div>
                                        )}
                                    </div>

                                    <div className="dashboard__blog-info">
                                        <div className="dashboard__blog-title-row">
                                            <h3 className="dashboard__blog-title">{blog.title}</h3>
                                            <StatusBadge status={blog.status} />
                                        </div>
                                        <p className="dashboard__blog-desc">
                                            {blog.description || <em>No description</em>}
                                        </p>

                                        {/* Rejection message */}
                                        {blog.status === STATUS.REJECTED && blog.reviewMessage && (
                                            <div className="dashboard__rejection">
                                                <span className="dashboard__rejection-label">Rejection feedback:</span>
                                                <span className="dashboard__rejection-text">{blog.reviewMessage}</span>
                                            </div>
                                        )}

                                        <div className="dashboard__blog-meta">
                                            <span>Created {timeAgo(blog.createdAt)}</span>
                                            <span>·</span>
                                            <span>Updated {timeAgo(blog._updatedAt)}</span>
                                            {blog.publishedAt && (
                                                <>
                                                    <span>·</span>
                                                    <span>Published {formatDate(blog.publishedAt)}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="dashboard__blog-actions">
                                        {actions.includes("edit") && (
                                            <Link
                                                to={`/blog/edit/${blog._id}`}
                                                className="dashboard__action dashboard__action--primary"
                                            >
                                                Edit
                                            </Link>
                                        )}
                                        {actions.includes("preview") && (
                                            <Link
                                                to={`/blog/preview/${blog._id}`}
                                                className="dashboard__action"
                                            >
                                                Preview
                                            </Link>
                                        )}
                                        {actions.includes("view_public") && (
                                            <Link
                                                to={`/blog/${blog.slug?.current}`}
                                                className="dashboard__action dashboard__action--public"
                                                target="_blank"
                                            >
                                                View Live ↗
                                            </Link>
                                        )}
                                        {actions.includes("submit") && (
                                            <button
                                                className="dashboard__action dashboard__action--submit"
                                                onClick={() => handleSubmit(blog)}
                                            >
                                                Submit for Review →
                                            </button>
                                        )}
                                        {actions.includes("resubmit") && (
                                            <button
                                                className="dashboard__action dashboard__action--submit"
                                                onClick={() => handleSubmit(blog)}
                                            >
                                                Resubmit →
                                            </button>
                                        )}
                                        {actions.includes("delete") && (
                                            <button
                                                className="dashboard__action dashboard__action--delete"
                                                onClick={() => handleDelete(blog)}
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};

export default BlogDashboard;
