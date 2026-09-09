import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import { isAdminLoggedIn, getAdminSanityToken } from "../lib/blogAuth";
import { blogReadClient, createBlogWriteClient, allBlogsAdminQuery } from "../lib/blogSanity";
import { STATUS, STATUS_LABELS, STATUS_COLORS, formatDate, timeAgo } from "../lib/blogHelpers";
import "./AdminLayout.css";
import "../Portal/BlogDashboard.css";

const StatusBadge = ({ status }) => {
    const style = STATUS_COLORS[status] || STATUS_COLORS.draft;
    return (
        <span className="status-badge" style={{
            background: style.bg, color: style.color, border: `1px solid ${style.border}`,
            padding: "3px 10px", fontSize: "9px", fontWeight: 700,
            letterSpacing: "2px", textTransform: "uppercase", whiteSpace: "nowrap"
        }}>
            {STATUS_LABELS[status] || status}
        </span>
    );
};

const AdminBlogList = () => {
    const navigate = useNavigate();
    const [blogs, setBlogs] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("updated");
    const [toast, setToast] = useState(null);
    const [confirm, setConfirm] = useState(null);

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        if (!isAdminLoggedIn()) {
            navigate("/admin/blogs", { replace: true });
        }
    }, [navigate]);

    const fetchBlogs = async () => {
        if (!blogReadClient) return;
        setIsLoading(true);
        try {
            const data = await blogReadClient.fetch(allBlogsAdminQuery);
            setBlogs(data || []);
        } catch (err) {
            showToast("Failed to load blogs: " + err.message, "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchBlogs(); }, []);

    // Filter + sort
    useEffect(() => {
        let result = [...blogs];
        if (statusFilter !== "all") {
            result = result.filter(b => b.status === statusFilter);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(b =>
                b.title?.toLowerCase().includes(q) ||
                b.author?.name?.toLowerCase().includes(q) ||
                b.description?.toLowerCase().includes(q)
            );
        }
        result.sort((a, b) => {
            if (sortBy === "updated") return new Date(b._updatedAt) - new Date(a._updatedAt);
            if (sortBy === "created") return new Date(b.createdAt) - new Date(a.createdAt);
            if (sortBy === "published") return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
            if (sortBy === "title") return (a.title || "").localeCompare(b.title || "");
            return 0;
        });
        setFiltered(result);
    }, [blogs, statusFilter, searchQuery, sortBy]);

    const getWriteClient = () => {
        const token = getAdminSanityToken();
        if (!token) throw new Error("Admin token not found. Please log in again.");
        return createBlogWriteClient(token);
    };

    const handlePublish = async (blog) => {
        try {
            const client = getWriteClient();
            await client.patch(blog._id).set({
                status: STATUS.PUBLISHED,
                publishedAt: new Date().toISOString(),
            }).commit();
            setBlogs(prev => prev.map(b => b._id === blog._id ? { ...b, status: STATUS.PUBLISHED, publishedAt: new Date().toISOString() } : b));
            showToast(`"${blog.title}" is now published.`);

            // Email notification
            try {
                const { notifyPosterPublished } = await import("../lib/emailService");
                const posterEmail = blog.author?.email;
                if (posterEmail) await notifyPosterPublished(posterEmail, blog);
            } catch (e) { console.warn("Email failed:", e); }
        } catch (err) {
            showToast("Failed to publish: " + err.message, "error");
        }
    };

    const handleUnpublish = async (blog) => {
        try {
            const client = getWriteClient();
            await client.patch(blog._id).set({ status: STATUS.APPROVED }).unset(["publishedAt"]).commit();
            setBlogs(prev => prev.map(b => b._id === blog._id ? { ...b, status: STATUS.APPROVED } : b));
            showToast(`"${blog.title}" unpublished.`);
        } catch (err) {
            showToast("Failed to unpublish: " + err.message, "error");
        }
    };

    const handleDelete = (blog) => {
        setConfirm({
            message: `Delete "${blog.title}"? This is permanent.`,
            onConfirm: async () => {
                setConfirm(null);
                try {
                    const client = getWriteClient();
                    await client.delete(blog._id);
                    setBlogs(prev => prev.filter(b => b._id !== blog._id));
                    showToast("Blog deleted.");
                } catch (err) {
                    showToast("Delete failed: " + err.message, "error");
                }
            },
            onCancel: () => setConfirm(null),
        });
    };

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
        <AdminLayout>
            {toast && <div className={`admin-toast admin-toast--${toast.type}`}>{toast.message}</div>}

            {confirm && (
                <div className="confirm-overlay" style={{ position: "fixed", inset: 0, background: "rgba(8,10,13,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
                    <div className="confirm-dialog" style={{ background: "#0a0d12", border: "1px solid rgba(242,241,235,0.15)", padding: "2rem 2.5rem", maxWidth: "400px", width: "90%" }}>
                        <p style={{ margin: "0 0 1.5rem", color: "#f2f1eb", fontSize: "15px" }}>{confirm.message}</p>
                        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                            <button className="admin-btn admin-btn--secondary" onClick={confirm.onCancel}>Cancel</button>
                            <button className="admin-btn admin-btn--danger" onClick={confirm.onConfirm}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem" }}>
                <div>
                    <h1 className="admin-page-title">All Blogs</h1>
                    <p className="admin-page-sub">Search, filter, and manage every blog post.</p>
                </div>
                <span style={{ fontSize: "13px", color: "#526168" }}>{filtered.length} blogs</span>
            </div>

            {/* Search + Sort */}
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                <input
                    type="search"
                    className="admin-input"
                    placeholder="Search by title, author, description…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ flex: 1, minWidth: "200px" }}
                />
                <select
                    className="admin-input"
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    style={{ minWidth: "140px" }}
                >
                    <option value="updated">Sort: Updated</option>
                    <option value="created">Sort: Created</option>
                    <option value="published">Sort: Published</option>
                    <option value="title">Sort: Title A–Z</option>
                </select>
            </div>

            {/* Status Filters */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "1.5rem" }}>
                {STATUS_FILTERS.map(f => (
                    <button
                        key={f.value}
                        className={`dashboard__filter ${statusFilter === f.value ? "dashboard__filter--active" : ""}`}
                        onClick={() => setStatusFilter(f.value)}
                    >
                        {f.label}
                        {f.value !== "all" && (
                            <span className="dashboard__filter-count">
                                {blogs.filter(b => b.status === f.value).length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div style={{ padding: "4rem", textAlign: "center" }}><div className="admin-spinner" /></div>
            ) : filtered.length === 0 ? (
                <div className="admin-empty">
                    <span className="admin-empty-icon">✦</span>
                    <p>No blogs found{searchQuery ? ` matching "${searchQuery}"` : ""}.</p>
                </div>
            ) : (
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Author</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Updated</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(blog => (
                            <tr key={blog._id}>
                                <td style={{ maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    <span style={{ color: "#f2f1eb", fontWeight: 500 }}>{blog.title}</span>
                                </td>
                                <td>
                                    <span style={{ color: "#d4cfc9" }}>{blog.author?.name || "—"}</span>
                                    {blog.author?.email && (
                                        <span style={{ display: "block", fontSize: "11px", color: "#526168" }}>{blog.author.email}</span>
                                    )}
                                </td>
                                <td><StatusBadge status={blog.status} /></td>
                                <td style={{ fontSize: "12px", color: "#526168" }}>{formatDate(blog.createdAt)}</td>
                                <td style={{ fontSize: "12px", color: "#526168" }}>{timeAgo(blog._updatedAt)}</td>
                                <td>
                                    <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                                        {(blog.status === "submitted" || blog.status === "under_review" || blog.status === "approved") && (
                                            <Link to={`/admin/blogs/${blog._id}/review`} className="admin-btn admin-btn--primary">
                                                Review
                                            </Link>
                                        )}
                                        {blog.status === "approved" && (
                                            <button className="admin-btn admin-btn--success" onClick={() => handlePublish(blog)}>
                                                Publish
                                            </button>
                                        )}
                                        {blog.status === "published" && (
                                            <>
                                                <Link to={`/blog/${blog.slug?.current}`} className="admin-btn admin-btn--secondary" target="_blank">View ↗</Link>
                                                <button className="admin-btn admin-btn--secondary" onClick={() => handleUnpublish(blog)}>Unpublish</button>
                                            </>
                                        )}
                                        {(blog.status === "draft" || blog.status === "rejected") && (
                                            <button className="admin-btn admin-btn--danger" onClick={() => handleDelete(blog)}>Delete</button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </AdminLayout>
    );
};

export default AdminBlogList;
