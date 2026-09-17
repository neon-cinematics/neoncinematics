import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import { isAdminLoggedIn, getAdminToken, getAdminSanityToken, createPosterViaApi, resetPosterPassword } from "../lib/blogAuth";
import { blogReadClient, createBlogWriteClient, blogPostersQuery } from "../lib/blogSanity";
import { formatDate } from "../lib/blogHelpers";
import "./AdminLayout.css";

const AdminPosterManagement = () => {
    const navigate = useNavigate();
    const [posters, setPosters] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [modal, setModal] = useState(null); // { type: 'create' | 'edit' | 'reset', poster? }
    const [formData, setFormData] = useState({ name: "", username: "", email: "", password: "", role: "poster", isActive: true });
    const [formError, setFormError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isAdminLoggedIn()) navigate("/neoncinematicsadminhere/blogs", { replace: true });
    }, [navigate]);

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchPosters = async () => {
        if (!blogReadClient) return;
        setIsLoading(true);
        try {
            const data = await blogReadClient.fetch(blogPostersQuery);
            setPosters(data || []);
        } catch (err) {
            showToast("Failed to load posters: " + err.message, "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchPosters(); }, []);

    const getWriteClient = () => {
        const token = getAdminSanityToken();
        if (!token) throw new Error("Admin token not found. Please re-login.");
        return createBlogWriteClient(token);
    };

    const openCreate = () => {
        setFormData({ name: "", username: "", email: "", password: "", role: "poster", isActive: true });
        setFormError("");
        setModal({ type: "create" });
    };

    const openEdit = (poster) => {
        setFormData({ name: poster.name, username: poster.username, email: poster.email, password: "", role: poster.role || "poster", isActive: poster.isActive });
        setFormError("");
        setModal({ type: "edit", poster });
    };

    const openReset = (poster) => {
        setFormData({ ...formData, password: "" });
        setFormError("");
        setModal({ type: "reset", poster });
    };

    const handleCreate = async () => {
        if (!formData.name.trim() || !formData.username.trim() || !formData.email.trim() || !formData.password) {
            setFormError("All fields are required.");
            return;
        }
        if (formData.password.length < 8) {
            setFormError("Password must be at least 8 characters.");
            return;
        }
        setIsSubmitting(true);
        setFormError("");
        try {
            const adminJwt = getAdminToken();
            await createPosterViaApi({
                name: formData.name.trim(),
                username: formData.username.trim(),
                email: formData.email.trim(),
                password: formData.password,
                role: formData.role,
            }, adminJwt);
            showToast(`Poster "${formData.name}" created.`);
            setModal(null);
            fetchPosters();
        } catch (err) {
            setFormError(err.message || "Failed to create poster.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = async () => {
        if (!formData.name.trim() || !formData.email.trim()) {
            setFormError("Name and email are required.");
            return;
        }
        setIsSubmitting(true);
        setFormError("");
        try {
            const client = getWriteClient();
            await client.patch(modal.poster._id).set({
                name: formData.name.trim(),
                email: formData.email.trim(),
                role: formData.role,
                isActive: formData.isActive,
            }).commit();
            showToast("Poster updated.");
            setModal(null);
            fetchPosters();
        } catch (err) {
            setFormError(err.message || "Failed to update poster.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = async () => {
        if (!formData.password || formData.password.length < 8) {
            setFormError("New password must be at least 8 characters.");
            return;
        }
        setIsSubmitting(true);
        setFormError("");
        try {
            const adminJwt = getAdminToken();
            await resetPosterPassword(modal.poster._id, formData.password, adminJwt);
            showToast("Password reset successfully.");
            setModal(null);
        } catch (err) {
            setFormError(err.message || "Password reset failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleActive = async (poster) => {
        try {
            const client = getWriteClient();
            await client.patch(poster._id).set({ isActive: !poster.isActive }).commit();
            setPosters(prev => prev.map(p => p._id === poster._id ? { ...p, isActive: !p.isActive } : p));
            showToast(`${poster.name} ${!poster.isActive ? "enabled" : "disabled"}.`);
        } catch (err) {
            showToast("Failed to update: " + err.message, "error");
        }
    };

    const handleDelete = async (poster) => {
        if (!window.confirm(`Delete poster "${poster.name}"? This cannot be undone.`)) return;
        try {
            const client = getWriteClient();
            await client.delete(poster._id);
            setPosters(prev => prev.filter(p => p._id !== poster._id));
            showToast("Poster deleted.");
        } catch (err) {
            showToast("Delete failed: " + err.message, "error");
        }
    };

    return (
        <AdminLayout>
            {toast && <div className={`admin-toast admin-toast--${toast.type}`}>{toast.message}</div>}

            {/* Modal */}
            {modal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
                    <div style={{ background: "var(--surface)", border: "1px solid var(--border-default)", padding: "2rem 2.25rem", borderRadius: "12px", maxWidth: "480px", width: "90%", maxHeight: "90vh", overflowY: "auto" }}>
                        <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)", margin: "0 0 1.25rem" }}>
                            {modal.type === "create" ? "Add Poster" : modal.type === "edit" ? "Edit Poster" : "Reset Password"}
                        </h2>

                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            {modal.type !== "reset" && (
                                <>
                                    <label style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-secondary)", fontFamily: "'Inter', sans-serif" }}>
                                        Full Name
                                        <input className="admin-input" style={{ width: "100%", marginTop: "6px" }} type="text" value={formData.name} onChange={e => setFormData(d => ({ ...d, name: e.target.value }))} placeholder="Jane Smith" />
                                    </label>
                                    {modal.type === "create" && (
                                        <label style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-secondary)", fontFamily: "'Inter', sans-serif" }}>
                                            Username
                                            <input className="admin-input" style={{ width: "100%", marginTop: "6px" }} type="text" value={formData.username} onChange={e => setFormData(d => ({ ...d, username: e.target.value.toLowerCase().replace(/\s+/g, "_") }))} placeholder="jane_smith" />
                                        </label>
                                    )}
                                    <label style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-secondary)", fontFamily: "'Inter', sans-serif" }}>
                                        Email
                                        <input className="admin-input" style={{ width: "100%", marginTop: "6px" }} type="email" value={formData.email} onChange={e => setFormData(d => ({ ...d, email: e.target.value }))} placeholder="jane@example.com" />
                                    </label>
                                    <label style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-secondary)", fontFamily: "'Inter', sans-serif" }}>
                                        Role
                                        <select className="admin-input" style={{ width: "100%", marginTop: "6px" }} value={formData.role} onChange={e => setFormData(d => ({ ...d, role: e.target.value }))}>
                                            <option value="poster">Poster</option>
                                        </select>
                                    </label>
                                    {modal.type === "edit" && (
                                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "13px", color: "var(--text-secondary)", fontFamily: "'Inter', sans-serif" }}>
                                            <input type="checkbox" checked={formData.isActive} onChange={e => setFormData(d => ({ ...d, isActive: e.target.checked }))} style={{ accentColor: "var(--accent)" }} />
                                            Account Active
                                        </label>
                                    )}
                                </>
                            )}
                            {(modal.type === "create" || modal.type === "reset") && (
                                <label style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-secondary)", fontFamily: "'Inter', sans-serif" }}>
                                    {modal.type === "reset" ? "New Password" : "Password"} (min 8 chars)
                                    <input className="admin-input" style={{ width: "100%", marginTop: "6px" }} type="password" value={formData.password} onChange={e => setFormData(d => ({ ...d, password: e.target.value }))} placeholder="••••••••" />
                                </label>
                            )}

                            {formError && (
                                <div style={{ padding: "10px 14px", background: "var(--error-subtle)", border: "1px solid var(--error)", color: "var(--error)", borderRadius: "8px", fontSize: "13px", fontFamily: "'Inter', sans-serif" }}>
                                    {formError}
                                </div>
                            )}
                        </div>

                        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem", justifyContent: "flex-end" }}>
                            <button className="admin-btn admin-btn--secondary" onClick={() => setModal(null)}>Cancel</button>
                            <button
                                className="admin-btn admin-btn--primary"
                                style={{ padding: "8px 18px" }}
                                onClick={modal.type === "create" ? handleCreate : modal.type === "edit" ? handleEdit : handleReset}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Saving…" : modal.type === "create" ? "Create Poster" : modal.type === "edit" ? "Save Changes" : "Reset Password"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem" }}>
                <div>
                    <h1 className="admin-page-title">Blog Posters</h1>
                    <p className="admin-page-sub">Manage accounts for blog content creators.</p>
                </div>
                <button className="admin-btn admin-btn--primary" style={{ padding: "10px 20px" }} onClick={openCreate}>
                    + Add Poster
                </button>
            </div>

            {isLoading ? (
                <div style={{ padding: "4rem", textAlign: "center" }}><div className="admin-spinner" /></div>
            ) : posters.length === 0 ? (
                <div className="admin-empty">
                    <span className="admin-empty-icon">◉</span>
                    <p>No posters yet. Add the first one.</p>
                </div>
            ) : (
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {posters.map(poster => (
                            <tr key={poster._id}>
                                <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>{poster.name}</td>
                                <td style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--text-secondary)" }}>@{poster.username}</td>
                                <td style={{ color: "var(--text-secondary)", fontSize: "13px" }}>{poster.email}</td>
                                <td>
                                    <span style={{
                                        display: "inline-block", padding: "3px 8px", fontSize: "10px",
                                        fontWeight: 600, letterSpacing: "0.05em", borderRadius: "6px",
                                        background: poster.isActive ? "var(--success-subtle)" : "var(--surface-raised)",
                                        color: poster.isActive ? "var(--success)" : "var(--text-secondary)",
                                        border: poster.isActive ? "1px solid rgba(134, 239, 172, 0.3)" : "1px solid var(--border-subtle)",
                                    }}>
                                        {poster.isActive ? "Active" : "Disabled"}
                                    </span>
                                </td>
                                <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>{formatDate(poster.createdAt)}</td>
                                <td>
                                    <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                                        <button className="admin-btn admin-btn--secondary" onClick={() => openEdit(poster)}>Edit</button>
                                        <button className="admin-btn admin-btn--secondary" onClick={() => openReset(poster)}>Reset PW</button>
                                        <button
                                            className={`admin-btn ${poster.isActive ? "admin-btn--danger" : "admin-btn--success"}`}
                                            onClick={() => handleToggleActive(poster)}
                                        >
                                            {poster.isActive ? "Disable" : "Enable"}
                                        </button>
                                        <button className="admin-btn admin-btn--danger" onClick={() => handleDelete(poster)}>Delete</button>
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

export default AdminPosterManagement;
