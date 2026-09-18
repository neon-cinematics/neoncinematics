import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import AdminLayout from "./AdminLayout";
import {
    isAdminLoggedIn, saveAdminSession, loginAdmin
} from "../lib/blogAuth";
import { blogReadClient, adminBlogStatsQuery } from "../lib/blogSanity";
import "./AdminLayout.css";
import "./AdminDashboard.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

const MasterAdminDashboard = () => {
    const navigate = useNavigate();
    const containerRef = useRef();
    const [stats, setStats] = useState(null);
    const [visitorStats, setVisitorStats] = useState(null);
    const [serverHealth, setServerHealth] = useState("checking");
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
        if (!isAuthenticated) return;
        setIsLoading(true);
        try {
            // Fetch stats from Sanity
            if (blogReadClient) {
                const statsData = await blogReadClient.fetch(adminBlogStatsQuery).catch(() => null);
                setStats(statsData);
            }
            // Fetch health from server API
            const healthRes = await fetch(`${API_BASE}/api/health`).catch(() => null);
            if (healthRes && healthRes.ok) {
                setServerHealth("healthy");
            } else {
                setServerHealth("offline");
            }

            // Fetch visitor analytics from server API
            const visitorRes = await fetch(`${API_BASE}/api/analytics/stats`).catch(() => null);
            if (visitorRes && visitorRes.ok) {
                const visitorData = await visitorRes.json().catch(() => null);
                setVisitorStats(visitorData);
            }
        } catch (err) {
            console.error("Master dashboard data fetch error:", err);
            setServerHealth("offline");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) fetchData();
    }, [isAuthenticated]);

    useGSAP(() => {
        gsap.fromTo(containerRef.current,
            { opacity: 0, y: 15 },
            { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
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
            showToast("Master Admin access granted.");
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
                        <span className="admin-login-sub">Master Admin Panel</span>
                    </div>
                    <h1>Master Control Center</h1>
                    <p>Enter your Sanity Write Token to oversee all admin systems.</p>

                    <form onSubmit={handleAdminLogin}>
                        <label>
                            Write Token / Admin Key
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
                            {isLoggingIn ? "Verifying…" : "Access Master Dashboard →"}
                        </button>
                    </form>
                    <p className="admin-login-help">
                        Grants access to Editorial, Media, Team, Gallery, and System settings.
                    </p>
                </div>
            </div>
        );
    }

    const ADMIN_MODULES = [
        {
            category: "Editorial & Blog Management",
            items: [
                {
                    title: "Blog Submissions & Review Queue",
                    desc: "Review author submissions, approve drafts, or publish live articles.",
                    path: "/neoncinematicsadminhere/blogs",
                    icon: "◈",
                    badge: stats ? `${stats.submitted + stats.under_review} Pending` : "Live",
                    badgeColor: stats && (stats.submitted + stats.under_review > 0) ? "#f59e0b" : "#10b981"
                },
                {
                    title: "All Published & Draft Blogs",
                    desc: "Complete database of published stories, drafts, and archived posts.",
                    path: "/neoncinematicsadminhere/blogs/list",
                    icon: "≡",
                    badge: stats ? `${stats.total} Total` : "Articles",
                    badgeColor: "#3b82f6"
                },
                {
                    title: "Blog Poster Accounts",
                    desc: "Manage author profiles, create credentials, and enable/disable posters.",
                    path: "/neoncinematicsadminhere/blog-posters",
                    icon: "◉",
                    badge: stats ? `${stats.activePosters} Active` : "Posters",
                    badgeColor: "#8b5cf6"
                },
                {
                    title: "Blog Managers & Permissions",
                    desc: "Configure admin roles, editor permissions, and email notification contacts.",
                    path: "/neoncinematicsadminhere/blog-managers",
                    icon: "✉",
                    badge: "Roles & Access",
                    badgeColor: "#ec4899"
                }
            ]
        },
        {
            category: "Media & Website Content Management",
            items: [
                {
                    title: "Page Background Video Admin",
                    desc: "Upload, replace, and delete background MP4 videos for About Us (/aboutUs) & Contact (/contact) pages.",
                    path: "/video-admin",
                    icon: "🎥",
                    badge: "Video Control",
                    badgeColor: "#f43f5e"
                },
                {
                    title: "Photo Gallery Admin",
                    desc: "Upload, crop 16:9 images, re-order, and manage Selected Work gallery items.",
                    path: "/gallery-admin",
                    icon: "🖼️",
                    badge: "Photo Grid",
                    badgeColor: "#06b6d4"
                },
                {
                    title: "Team Members & Hierarchy Admin",
                    desc: "Manage Coordinators, 3rd year leads, 2nd year core, and 1st year club members.",
                    path: "/team-admin",
                    icon: "👥",
                    badge: "Team Roster",
                    badgeColor: "#10b981"
                }
            ]
        },
        {
            category: "System & Integration Settings",
            items: [
                {
                    title: "System Setup & Email Logs",
                    desc: "Configure Resend/SMTP email keys, Sanity tokens, and view live email dispatch logs.",
                    path: "/neoncinematicsadminhere/setup",
                    icon: "⚙",
                    badge: serverHealth === "healthy" ? "API Live" : "Check Health",
                    badgeColor: serverHealth === "healthy" ? "#10b981" : "#ef4444"
                },
                {
                    title: "Member & Author Portal",
                    desc: "View author portal interface for writing and submitting new articles.",
                    path: "/blog/dashboard",
                    icon: "✍️",
                    badge: "Author Portal",
                    badgeColor: "#a855f7"
                }
            ]
        }
    ];

    return (
        <AdminLayout>
            <div ref={containerRef} className="master-admin-dashboard">
                {toast && (
                    <div className={`admin-toast admin-toast--${toast.type}`}>{toast.message}</div>
                )}

                <div className="master-admin-header">
                    <div>
                        <h1 className="admin-page-title">Master Control Center</h1>
                        <p className="admin-page-sub">Central administration overview for all Neon Cinematics systems.</p>
                    </div>
                    <div className="master-health-pill">
                        <span className={`health-dot health-dot--${serverHealth}`} />
                        <span>Backend API: {serverHealth === "healthy" ? "Online (Port 3001)" : "Offline / Check Server"}</span>
                    </div>
                </div>

                {/* Top Level Summary Stats */}
                {stats && (
                    <div className="admin-stats-grid" style={{ marginBottom: "2.5rem" }}>
                        <div className="admin-stat-card">
                            <span className="admin-stat-value" style={{ color: "var(--text-primary)" }}>{stats.total}</span>
                            <span className="admin-stat-label">Total Articles</span>
                        </div>
                        <div className="admin-stat-card">
                            <span className="admin-stat-value" style={{ color: "var(--warning)" }}>{stats.submitted + stats.under_review}</span>
                            <span className="admin-stat-label">Action Needed</span>
                        </div>
                        <div className="admin-stat-card">
                            <span className="admin-stat-value" style={{ color: "var(--success)" }}>{stats.published}</span>
                            <span className="admin-stat-label">Live Published</span>
                        </div>
                        <div className="admin-stat-card">
                            <span className="admin-stat-value" style={{ color: "var(--accent)" }}>{stats.activePosters}</span>
                            <span className="admin-stat-label">Registered Posters</span>
                        </div>
                    </div>
                )}

                {/* Website Visitor Counter & Traffic Analytics Section */}
                <div style={{
                    background: "linear-gradient(135deg, rgba(16, 24, 38, 0.95), rgba(12, 18, 28, 0.98))",
                    border: "1px solid rgba(125, 229, 210, 0.25)",
                    borderRadius: "12px",
                    padding: "1.75rem",
                    marginBottom: "2.5rem",
                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)"
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
                        <div>
                            <h2 style={{ fontSize: "16px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#7de5d2", margin: "0 0 0.25rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
                                <span>👁️</span> Website Visitor Counter & Traffic Analytics
                            </h2>
                            <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>
                                Real-time tracking of pageviews, unique sessions, and top visited routes across neoncinematics website.
                            </p>
                        </div>
                        <button
                            onClick={fetchData}
                            className="admin-btn admin-btn--secondary"
                            style={{ fontSize: "11px", padding: "6px 14px" }}
                        >
                            🔄 Refresh Metrics
                        </button>
                    </div>

                    {/* 4 Counter Cards Grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                        <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(125, 229, 210, 0.2)", borderRadius: "8px", padding: "1.1rem 1.25rem" }}>
                            <span style={{ fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase", color: "#9ba4a7", display: "block", marginBottom: "6px" }}>Total Pageviews</span>
                            <span style={{ fontSize: "2rem", fontWeight: 800, color: "#7de5d2", textShadow: "0 0 12px rgba(125, 229, 210, 0.3)" }}>
                                {visitorStats ? (visitorStats.totalVisits || 0).toLocaleString() : "—"}
                            </span>
                        </div>
                        <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "8px", padding: "1.1rem 1.25rem" }}>
                            <span style={{ fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase", color: "#9ba4a7", display: "block", marginBottom: "6px" }}>Unique Visitors</span>
                            <span style={{ fontSize: "2rem", fontWeight: 800, color: "#10b981", textShadow: "0 0 12px rgba(16, 185, 129, 0.3)" }}>
                                {visitorStats ? (visitorStats.uniqueVisitors || 0).toLocaleString() : "—"}
                            </span>
                        </div>
                        <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "8px", padding: "1.1rem 1.25rem" }}>
                            <span style={{ fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase", color: "#9ba4a7", display: "block", marginBottom: "6px" }}>Pageviews Today</span>
                            <span style={{ fontSize: "2rem", fontWeight: 800, color: "#f59e0b", textShadow: "0 0 12px rgba(245, 158, 11, 0.3)" }}>
                                {visitorStats ? (visitorStats.todayVisits || 0).toLocaleString() : "—"}
                            </span>
                        </div>
                        <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(139, 92, 246, 0.2)", borderRadius: "8px", padding: "1.1rem 1.25rem" }}>
                            <span style={{ fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase", color: "#9ba4a7", display: "block", marginBottom: "6px" }}>Today's Uniques</span>
                            <span style={{ fontSize: "2rem", fontWeight: 800, color: "#8b5cf6", textShadow: "0 0 12px rgba(139, 92, 246, 0.3)" }}>
                                {visitorStats ? (visitorStats.todayUniques || 0).toLocaleString() : "—"}
                            </span>
                        </div>
                    </div>

                    {/* Breakdown Grid: Weekly Trend & Popular Pages */}
                    {visitorStats && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem", marginTop: "1rem" }}>
                            {/* Weekly Trend Bar Chart */}
                            {visitorStats.weeklyTrend && visitorStats.weeklyTrend.length > 0 && (
                                <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "1rem" }}>
                                    <h3 style={{ fontSize: "12px", letterSpacing: "1px", textTransform: "uppercase", color: "#e2e8f0", margin: "0 0 1rem", fontWeight: 700 }}>
                                        📊 7-Day Traffic Trend
                                    </h3>
                                    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: "90px", padding: "0 8px" }}>
                                        {visitorStats.weeklyTrend.map((day) => {
                                            const maxVisits = Math.max(...visitorStats.weeklyTrend.map(d => d.visits), 1);
                                            const heightPercent = Math.max(15, Math.min(100, Math.round((day.visits / maxVisits) * 100)));
                                            return (
                                                <div key={day.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                                                    <span style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "4px" }}>{day.visits}</span>
                                                    <div style={{
                                                        width: "14px",
                                                        height: `${heightPercent}%`,
                                                        background: "linear-gradient(to top, #7de5d2, #3b82f6)",
                                                        borderRadius: "4px 4px 0 0",
                                                        transition: "height 0.4s ease"
                                                    }} title={`${day.date}: ${day.visits} visits, ${day.uniques} uniques`} />
                                                    <span style={{ fontSize: "10px", color: "#cbd5e1", marginTop: "6px", fontWeight: 600 }}>{day.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Popular Visited Pages */}
                            {visitorStats.pageVisits && Object.keys(visitorStats.pageVisits).length > 0 && (
                                <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "1rem" }}>
                                    <h3 style={{ fontSize: "12px", letterSpacing: "1px", textTransform: "uppercase", color: "#e2e8f0", margin: "0 0 1rem", fontWeight: 700 }}>
                                        🔥 Top Visited Page Routes
                                    </h3>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                        {Object.entries(visitorStats.pageVisits)
                                            .sort((a, b) => b[1] - a[1])
                                            .slice(0, 5)
                                            .map(([pagePath, count]) => {
                                                const maxCount = Math.max(...Object.values(visitorStats.pageVisits), 1);
                                                const barPercent = Math.round((count / maxCount) * 100);
                                                return (
                                                    <div key={pagePath}>
                                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "3px" }}>
                                                            <span style={{ color: "#7de5d2", fontFamily: "monospace", fontWeight: 600 }}>{pagePath}</span>
                                                            <span style={{ color: "#94a3b8" }}>{count} visits</span>
                                                        </div>
                                                        <div style={{ width: "100%", height: "5px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden" }}>
                                                            <div style={{ width: `${barPercent}%`, height: "100%", background: "#7de5d2", borderRadius: "3px" }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Module Categories Grid */}
                {ADMIN_MODULES.map(group => (
                    <div key={group.category} style={{ marginBottom: "2.5rem" }}>
                        <h2 style={{ fontSize: "14px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#9ba4a7", marginBottom: "1rem", fontWeight: 700 }}>
                            {group.category}
                        </h2>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
                            {group.items.map(item => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    style={{
                                        background: "var(--surface)",
                                        border: "1px solid rgba(255, 255, 255, 0.1)",
                                        borderRadius: "8px",
                                        padding: "1.5rem",
                                        textDecoration: "none",
                                        color: "inherit",
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "space-between",
                                        transition: "all 0.25s ease",
                                        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)"
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.borderColor = "var(--accent)";
                                        e.currentTarget.style.transform = "translateY(-3px)";
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                                        e.currentTarget.style.transform = "translateY(0)";
                                    }}
                                >
                                    <div>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                                            <span style={{ fontSize: "1.5rem" }}>{item.icon}</span>
                                            <span style={{
                                                background: `${item.badgeColor}22`,
                                                color: item.badgeColor,
                                                border: `1px solid ${item.badgeColor}44`,
                                                padding: "3px 10px",
                                                borderRadius: "12px",
                                                fontSize: "11px",
                                                fontWeight: 700,
                                                letterSpacing: "0.5px"
                                            }}>
                                                {item.badge}
                                            </span>
                                        </div>
                                        <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 0.5rem" }}>
                                            {item.title}
                                        </h3>
                                        <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                                            {item.desc}
                                        </p>
                                    </div>
                                    <div style={{ marginTop: "1.5rem", fontSize: "12px", fontWeight: 700, letterSpacing: "1px", color: "var(--accent)", textTransform: "uppercase" }}>
                                        Launch Module →
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Quick Main Site Navigation Bar */}
                <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", padding: "1.5rem", marginTop: "1rem" }}>
                    <h3 style={{ fontSize: "13px", letterSpacing: "1px", textTransform: "uppercase", color: "#0490e9", margin: "0 0 1rem" }}>
                        Preview Main Website Pages
                    </h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                        <Link to="/" target="_blank" className="admin-btn admin-btn--secondary">Home (/) ↗</Link>
                        <Link to="/work" target="_blank" className="admin-btn admin-btn--secondary">Selected Work (/work) ↗</Link>
                        <Link to="/aboutUs" target="_blank" className="admin-btn admin-btn--secondary">About Us (/aboutUs) ↗</Link>
                        <Link to="/contact" target="_blank" className="admin-btn admin-btn--secondary">Contact (/contact) ↗</Link>
                        <Link to="/blog" target="_blank" className="admin-btn admin-btn--secondary">Blog Journal (/blog) ↗</Link>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default MasterAdminDashboard;
