import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import AdminLayout from "./AdminLayout";
import {
    isAdminLoggedIn, saveAdminSession, loginAdmin, getAdminToken, getAdminSanityToken
} from "../lib/blogAuth";
import { blogReadClient, adminBlogStatsQuery, allBlogsAdminQuery } from "../lib/blogSanity";
import { STATUS_COLORS, STATUS_LABELS, formatDate } from "../lib/blogHelpers";
import "./AdminLayout.css";
import "./AdminDashboard.css";

const StatusBadge = ({ status }) => {
    const style = STATUS_COLORS[status] || STATUS_COLORS.draft;
    return (
        <span className="status-badge" style={{
            background: style.bg, color: style.color, border: `1px solid ${style.border}`,
            padding: "3px 8px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em",
            borderRadius: "6px", textTransform: "uppercase", display: "inline-block", whiteSpace: "nowrap"
        }}>
            {STATUS_LABELS[status] || status}
        </span>
    );
};

const AdminDashboard = () => {
    const navigate = useNavigate();
    const containerRef = useRef();
    const [stats, setStats] = useState(null);
    const [recentBlogs, setRecentBlogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sanityToken, setSanityToken] = useState("");
    const [loginError, setLoginError] = useState("");
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(isAdminLoggedIn());
    const [toast, setToast] = useState(null);

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchData = async () => {
        if (!blogReadClient || !isAuthenticated) return;
        setIsLoading(true);
        try {
            const [statsData, blogsData] = await Promise.all([
                blogReadClient.fetch(adminBlogStatsQuery),
                blogReadClient.fetch(allBlogsAdminQuery),
            ]);
            setStats(statsData);
            setRecentBlogs((blogsData || []).slice(0, 5));
        } catch (err) {
            console.error("Failed to fetch admin data:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) fetchData();
    }, [isAuthenticated]);

    useGSAP(() => {
        gsap.fromTo(containerRef.current,
            { opacity: 0 },
            { opacity: 1, duration: 0.8, ease: "power2.out" }
        );
    }, { scope: containerRef });

    const handleAdminLogin = async (e) => {
        e.preventDefault();
        if (!sanityToken.trim()) {
            setLoginError("Please enter your write token.");
            return;
        }
        setIsLoggingIn(true);
        setLoginError("");
        try {
            const { token, admin } = await loginAdmin(sanityToken.trim());
            saveAdminSession(token, admin, sanityToken.trim());
            setIsAuthenticated(true);
            showToast("Admin access granted.");
        } catch (err) {
            setLoginError(err.message || "Authentication failed.");
        } finally {
            setIsLoggingIn(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div ref={containerRef} className="admin-login-page">
                <div className="admin-login-card">
                    <div className="admin-login-brand">
                        <span>NEON</span>
                        <span className="admin-login-sub">Admin Panel</span>
                    </div>
                    <h1>Admin Access</h1>
                    <p>Enter your access token to access the admin panel.</p>

                    <form onSubmit={handleAdminLogin}>
                        <label>
                            Access Token
                            <input
                                type="password"
                                className="admin-input"
                                value={sanityToken}
                                onChange={e => setSanityToken(e.target.value)}
                                placeholder="sk_prod_..."
                                style={{ width: "100%", marginTop: "6px" }}
                            />
                        </label>
                        {loginError && (
                            <div className="admin-login-error">{loginError}</div>
                        )}
                        <button
                            type="submit"
                            className="admin-login-submit"
                            disabled={isLoggingIn}
                        >
                            {isLoggingIn ? "Verifying…" : "Access Admin →"}
                        </button>
                    </form>
                    <p className="admin-login-help">
                        Your token grants access and is stored only in this browser session.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <AdminLayout>
            <div ref={containerRef}>
                {toast && (
                    <div className={`admin-toast admin-toast--${toast.type}`}>{toast.message}</div>
                )}

                <h1 className="admin-page-title">Dashboard</h1>
                <p className="admin-page-sub">Overview of the Neon Cinematics blog system.</p>

                {isLoading ? (
                    <div style={{ padding: "4rem", textAlign: "center" }}>
                        <div className="admin-spinner" />
                    </div>
                ) : (
                    <>
                        {/* Stats Grid */}
                        {stats && (
                            <div className="admin-stats-grid">
                                {[
                                    { label: "Total Blogs", value: stats.total, color: "var(--text-primary)" },
                                    { label: "Drafts", value: stats.draft, color: "var(--text-secondary)" },
                                    { label: "Pending Review", value: stats.submitted + stats.under_review, color: "var(--warning)" },
                                    { label: "Published", value: stats.published, color: "var(--success)" },
                                    { label: "Rejected", value: stats.rejected, color: "var(--error)" },
                                    { label: "Active Posters", value: stats.activePosters, color: "var(--accent)" },
                                ].map(s => (
                                    <div key={s.label} className="admin-stat-card">
                                        <span className="admin-stat-value" style={{ color: s.color }}>{s.value}</span>
                                        <span className="admin-stat-label">{s.label}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Recent blogs needing attention */}
                        <div className="admin-section">
                            <div className="admin-section-header">
                                <h2 className="admin-section-title">Recent Blogs</h2>
                                <Link to="/admin/blogs/list" className="admin-btn admin-btn--secondary">
                                    View All →
                                </Link>
                            </div>

                            {recentBlogs.length === 0 ? (
                                <div className="admin-empty">
                                    <span className="admin-empty-icon">✦</span>
                                    <p>No blogs yet.</p>
                                </div>
                            ) : (
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Title</th>
                                            <th>Author</th>
                                            <th>Status</th>
                                            <th>Updated</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentBlogs.map(blog => (
                                            <tr key={blog._id}>
                                                <td style={{ maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-primary)", fontWeight: 500 }}>
                                                    {blog.title}
                                                </td>
                                                <td>{blog.author?.name || "—"}</td>
                                                <td><StatusBadge status={blog.status} /></td>
                                                <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>{formatDate(blog._updatedAt)}</td>
                                                <td>
                                                    <div style={{ display: "flex", gap: "6px" }}>
                                                        {(blog.status === "submitted" || blog.status === "under_review") && (
                                                            <Link
                                                                to={`/admin/blogs/${blog._id}/review`}
                                                                className="admin-btn admin-btn--primary"
                                                            >
                                                                Review
                                                            </Link>
                                                        )}
                                                        {blog.status === "approved" && (
                                                            <Link
                                                                to={`/admin/blogs/${blog._id}/review`}
                                                                className="admin-btn admin-btn--success"
                                                            >
                                                                Publish
                                                            </Link>
                                                        )}
                                                        {blog.status === "published" && (
                                                            <Link
                                                                to={`/blog/${blog.slug?.current}`}
                                                                className="admin-btn admin-btn--secondary"
                                                                target="_blank"
                                                            >
                                                                View ↗
                                                            </Link>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Quick links */}
                        <div className="admin-quick-links">
                            <Link to="/admin/blogs/list" className="admin-quick-link">
                                <span>≡</span>
                                <div>
                                    <strong>All Blogs</strong>
                                    <span>View, search, filter and manage every blog</span>
                                </div>
                            </Link>
                            <Link to="/admin/blog-posters" className="admin-quick-link">
                                <span>◉</span>
                                <div>
                                    <strong>Blog Posters</strong>
                                    <span>Create and manage poster accounts</span>
                                </div>
                            </Link>
                            <Link to="/admin/blog-managers" className="admin-quick-link">
                                <span>✉</span>
                                <div>
                                    <strong>Blog Managers</strong>
                                    <span>Configure email notification recipients</span>
                                </div>
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </AdminLayout>
    );
};

export default AdminDashboard;
