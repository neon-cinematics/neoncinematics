import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import { isAdminLoggedIn, getAdminSanityToken } from "../lib/blogAuth";
import { blogReadClient, createBlogWriteClient, blogByIdQuery } from "../lib/blogSanity";
import { STATUS, STATUS_LABELS, STATUS_COLORS, formatDate, formatDateTime } from "../lib/blogHelpers";
import { PortableTextRenderer, AttachmentsSection } from "../PortableTextRenderer";
import "./AdminLayout.css";
import "../BlogDetail.css";

const StatusBadge = ({ status }) => {
    const style = STATUS_COLORS[status] || STATUS_COLORS.draft;
    return (
        <span className="status-badge" style={{
            background: style.bg, color: style.color, border: `1px solid ${style.border}`,
            padding: "3px 10px", fontSize: "9px", fontWeight: 700,
            letterSpacing: "2px", textTransform: "uppercase"
        }}>
            {STATUS_LABELS[status] || status}
        </span>
    );
};

const AdminBlogReview = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [blog, setBlog] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [reviewMessage, setReviewMessage] = useState("");
    const [reviewError, setReviewError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 5000);
    };

    useEffect(() => {
        if (!isAdminLoggedIn()) navigate("/admin/blogs", { replace: true });
    }, [navigate]);

    useEffect(() => {
        const fetchBlog = async () => {
            if (!blogReadClient) return;
            try {
                const data = await blogReadClient.fetch(blogByIdQuery, { id });
                setBlog(data);
                if (data?.reviewMessage) setReviewMessage(data.reviewMessage);
            } catch (err) {
                showToast("Failed to load blog: " + err.message, "error");
            } finally {
                setIsLoading(false);
            }
        };
        fetchBlog();
    }, [id]);

    const getWriteClient = () => {
        const token = getAdminSanityToken();
        if (!token) throw new Error("Admin token not found. Please re-login.");
        return createBlogWriteClient(token);
    };

    const handleApprove = async () => {
        if (window.confirm(`Approve "${blog.title}"?`)) {
            setIsSubmitting(true);
            try {
                const client = getWriteClient();
                await client.patch(blog._id).set({
                    status: STATUS.APPROVED,
                    approvedAt: new Date().toISOString(),
                    reviewMessage: "",
                }).commit();
                setBlog(b => ({ ...b, status: STATUS.APPROVED }));
                showToast("Blog approved! The poster has been notified.");

                // Email notification
                try {
                    const { notifyPosterApproved } = await import("../lib/emailService");
                    await notifyPosterApproved(blog.author?.email, blog);
                } catch (e) { console.warn("Email failed:", e); }
            } catch (err) {
                showToast("Approval failed: " + err.message, "error");
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleReject = async () => {
        if (!reviewMessage.trim()) {
            setReviewError("A rejection message is required. Please explain what needs to be fixed.");
            return;
        }
        setReviewError("");
        if (window.confirm("Reject this blog and notify the poster?")) {
            setIsSubmitting(true);
            try {
                const client = getWriteClient();
                await client.patch(blog._id).set({
                    status: STATUS.REJECTED,
                    reviewMessage: reviewMessage.trim(),
                }).commit();
                setBlog(b => ({ ...b, status: STATUS.REJECTED, reviewMessage: reviewMessage.trim() }));
                showToast("Blog rejected. The poster has been notified.");

                // Email notification
                try {
                    const { notifyPosterRejected } = await import("../lib/emailService");
                    await notifyPosterRejected(blog.author?.email, blog, reviewMessage.trim());
                } catch (e) { console.warn("Email failed:", e); }
            } catch (err) {
                showToast("Rejection failed: " + err.message, "error");
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handlePublish = async () => {
        if (window.confirm(`Publish "${blog.title}" to the public blog?`)) {
            setIsSubmitting(true);
            try {
                const client = getWriteClient();
                await client.patch(blog._id).set({
                    status: STATUS.PUBLISHED,
                    publishedAt: new Date().toISOString(),
                }).commit();
                setBlog(b => ({ ...b, status: STATUS.PUBLISHED }));
                showToast("Blog is now live! The poster has been notified.");

                try {
                    const { notifyPosterPublished } = await import("../lib/emailService");
                    await notifyPosterPublished(blog.author?.email, blog);
                } catch (e) { console.warn("Email failed:", e); }
            } catch (err) {
                showToast("Publish failed: " + err.message, "error");
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleUnpublish = async () => {
        if (window.confirm(`Unpublish "${blog.title}"? It will be removed from the public website and reverted to Approved status.`)) {
            setIsSubmitting(true);
            try {
                const client = getWriteClient();
                await client.patch(blog._id).set({
                    status: STATUS.APPROVED,
                }).unset(["publishedAt"]).commit();
                setBlog(b => ({ ...b, status: STATUS.APPROVED }));
                showToast("Blog has been unpublished.");
            } catch (err) {
                showToast("Unpublish failed: " + err.message, "error");
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleDelete = async () => {
        if (window.confirm(`Delete "${blog.title}" permanently? This action cannot be undone.`)) {
            setIsSubmitting(true);
            try {
                const client = getWriteClient();
                await client.delete(blog._id);
                showToast("Blog deleted permanently.");
                setTimeout(() => navigate("/admin/blogs/list"), 1200);
            } catch (err) {
                showToast("Delete failed: " + err.message, "error");
                setIsSubmitting(false);
            }
        }
    };

    return (
        <AdminLayout>
            {toast && <div className={`admin-toast admin-toast--${toast.type}`}>{toast.message}</div>}

            <div style={{ marginBottom: "1.5rem" }}>
                <Link to="/admin/blogs/list" className="admin-btn admin-btn--secondary" style={{ textDecoration: "none" }}>
                    ← Back to Blog List
                </Link>
            </div>

            {isLoading ? (
                <div style={{ padding: "4rem", textAlign: "center" }}><div className="admin-spinner" /></div>
            ) : !blog ? (
                <div className="admin-empty">Blog not found.</div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "2rem", alignItems: "start" }}>
                    {/* Blog Preview */}
                    <div>
                        <div className="blog-detail__header">
                            <div className="blog-detail__header-inner">
                                <span className="blog-detail__kicker">Review</span>
                                <h1 className="blog-detail__title">{blog.title}</h1>
                                {blog.description && (
                                    <p className="blog-detail__description">{blog.description}</p>
                                )}
                                <div className="blog-detail__byline">
                                    <div className="blog-detail__author-avatar blog-detail__author-avatar--initials">
                                        {blog.author?.name?.[0] || "?"}
                                    </div>
                                    <div>
                                        <span className="blog-detail__author-name">{blog.author?.name}</span>
                                        <time className="blog-detail__date">{formatDate(blog.submittedAt || blog.createdAt)}</time>
                                    </div>
                                </div>
                            </div>
                            <div className="blog-detail__header-line" />
                        </div>

                        {blog.coverImageUrl && (
                            <div className="blog-detail__cover">
                                <img src={blog.coverImageUrl} alt={blog.title} />
                            </div>
                        )}

                        <div className="blog-detail__body">
                            <div className="blog-detail__content-wrapper">
                                <PortableTextRenderer content={blog.content} />
                                <AttachmentsSection attachments={blog.attachments} />
                            </div>
                        </div>
                    </div>

                    {/* Review Panel */}
                    <aside style={{ position: "sticky", top: "2rem" }}>
                        <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", padding: "1.5rem" }}>
                            <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#a1a1aa", margin: "0 0 1.25rem" }}>
                                Review Panel
                            </h2>

                            {/* Blog Info */}
                            <div style={{ marginBottom: "1.25rem", paddingBottom: "1.25rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                                <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse", fontFamily: "'Inter', sans-serif" }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ color: "#a1a1aa", paddingBottom: "8px", width: "100px" }}>Status</td>
                                            <td><StatusBadge status={blog.status} /></td>
                                        </tr>
                                        <tr>
                                            <td style={{ color: "#a1a1aa", paddingBottom: "8px" }}>Author</td>
                                            <td style={{ color: "#ededed", fontWeight: 500 }}>{blog.author?.name}</td>
                                        </tr>
                                        {blog.submittedAt && (
                                            <tr>
                                                <td style={{ color: "#a1a1aa", paddingBottom: "8px" }}>Submitted</td>
                                                <td style={{ color: "#a1a1aa" }}>{formatDateTime(blog.submittedAt)}</td>
                                            </tr>
                                        )}
                                        {blog.approvedAt && (
                                            <tr>
                                                <td style={{ color: "#a1a1aa", paddingBottom: "8px" }}>Approved</td>
                                                <td style={{ color: "#a1a1aa" }}>{formatDateTime(blog.approvedAt)}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Rejection Message */}
                            {(blog.status === "submitted" || blog.status === "under_review" || blog.status === "approved" || blog.status === "rejected") && (
                                <div style={{ marginBottom: "1.25rem", paddingBottom: "1.25rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                                    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#a1a1aa", marginBottom: "8px", fontFamily: "'Inter', sans-serif" }}>
                                        {blog.status === "rejected" ? "Previous Rejection Reason" : "Rejection Reason (if rejecting)"}
                                    </label>
                                    <textarea
                                        style={{
                                            width: "100%", background: "#09090b",
                                            border: reviewError ? "1px solid #f87171" : "1px solid rgba(255,255,255,0.12)",
                                            color: "#ffffff", fontFamily: "'Inter', sans-serif", borderRadius: "6px",
                                            fontSize: "13px", padding: "10px 12px", outline: "none",
                                            resize: "vertical", minHeight: "80px", boxSizing: "border-box", lineHeight: 1.6
                                        }}
                                        placeholder="Required if rejecting. Explain clearly what needs to be improved…"
                                        value={reviewMessage}
                                        onChange={e => { setReviewMessage(e.target.value); setReviewError(""); }}
                                    />
                                    {reviewError && (
                                        <p style={{ color: "#f87171", fontSize: "12px", margin: "4px 0 0", fontFamily: "'Inter', sans-serif" }}>{reviewError}</p>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {(blog.status === STATUS.SUBMITTED || blog.status === STATUS.UNDER_REVIEW) && (
                                    <>
                                        <button
                                            className="admin-btn admin-btn--success"
                                            style={{ width: "100%", padding: "10px", justifyContent: "center" }}
                                            onClick={handleApprove}
                                            disabled={isSubmitting}
                                        >
                                            ✓ Approve Blog
                                        </button>
                                        <button
                                            className="admin-btn admin-btn--danger"
                                            style={{ width: "100%", padding: "10px", justifyContent: "center" }}
                                            onClick={handleReject}
                                            disabled={isSubmitting}
                                        >
                                            ✕ Reject Blog
                                        </button>
                                    </>
                                )}
                                {blog.status === STATUS.APPROVED && (
                                    <button
                                        className="admin-btn admin-btn--primary"
                                        style={{ width: "100%", padding: "10px", justifyContent: "center" }}
                                        onClick={handlePublish}
                                        disabled={isSubmitting}
                                    >
                                        → Publish Blog
                                    </button>
                                )}
                                {blog.status === STATUS.PUBLISHED && (
                                    <>
                                        <Link
                                            to={`/blog/${blog.slug?.current}`}
                                            className="admin-btn admin-btn--secondary"
                                            style={{ width: "100%", padding: "10px", justifyContent: "center", textDecoration: "none" }}
                                            target="_blank"
                                        >
                                            View Public Blog ↗
                                        </Link>
                                        <button
                                            className="admin-btn admin-btn--danger"
                                            style={{ width: "100%", padding: "10px", justifyContent: "center" }}
                                            onClick={handleUnpublish}
                                            disabled={isSubmitting}
                                        >
                                            ↩ Unpublish Blog
                                        </button>
                                    </>
                                )}

                                <button
                                    className="admin-btn admin-btn--danger"
                                    style={{ width: "100%", padding: "10px", justifyContent: "center", marginTop: "12px", borderStyle: "dashed" }}
                                    onClick={handleDelete}
                                    disabled={isSubmitting}
                                >
                                    🗑 Delete Article
                                </button>
                            </div>

                            {isSubmitting && (
                                <div style={{ textAlign: "center", marginTop: "1rem" }}>
                                    <div className="admin-spinner" />
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminBlogReview;
