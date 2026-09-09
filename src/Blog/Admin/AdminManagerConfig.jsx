import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import { isAdminLoggedIn, getAdminSanityToken } from "../lib/blogAuth";
import { blogReadClient, createBlogWriteClient, blogManagersQuery } from "../lib/blogSanity";
import { formatDate } from "../lib/blogHelpers";
import "./AdminLayout.css";

const AdminManagerConfig = () => {
    const navigate = useNavigate();
    const [managers, setManagers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newEmail, setNewEmail] = useState("");
    const [emailError, setEmailError] = useState("");
    const [toast, setToast] = useState(null);
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        if (!isAdminLoggedIn()) navigate("/admin/blogs", { replace: true });
    }, [navigate]);

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchManagers = async () => {
        if (!blogReadClient) return;
        setIsLoading(true);
        try {
            const data = await blogReadClient.fetch(blogManagersQuery);
            setManagers(data || []);
        } catch (err) {
            showToast("Failed to load managers: " + err.message, "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchManagers(); }, []);

    const getWriteClient = () => {
        const token = getAdminSanityToken();
        if (!token) throw new Error("Admin token not found.");
        return createBlogWriteClient(token);
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        const emailVal = newEmail.trim();
        if (!emailVal) { setEmailError("Email is required."); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) { setEmailError("Please enter a valid email address."); return; }
        if (managers.some(m => m.email === emailVal)) { setEmailError("This email is already a manager."); return; }

        setEmailError("");
        setIsAdding(true);
        try {
            const client = getWriteClient();
            await client.create({
                _type: "blogManager",
                email: emailVal,
                isActive: true,
            });
            setNewEmail("");
            showToast(`${emailVal} added as a blog manager.`);
            fetchManagers();
        } catch (err) {
            showToast("Failed to add manager: " + err.message, "error");
        } finally {
            setIsAdding(false);
        }
    };

    const handleToggle = async (manager) => {
        try {
            const client = getWriteClient();
            await client.patch(manager._id).set({ isActive: !manager.isActive }).commit();
            setManagers(prev => prev.map(m => m._id === manager._id ? { ...m, isActive: !m.isActive } : m));
            showToast(`${manager.email} ${!manager.isActive ? "enabled" : "disabled"}.`);
        } catch (err) {
            showToast("Failed to update: " + err.message, "error");
        }
    };

    const handleDelete = async (manager) => {
        if (!window.confirm(`Remove ${manager.email} as a blog manager?`)) return;
        try {
            const client = getWriteClient();
            await client.delete(manager._id);
            setManagers(prev => prev.filter(m => m._id !== manager._id));
            showToast("Manager removed.");
        } catch (err) {
            showToast("Delete failed: " + err.message, "error");
        }
    };

    return (
        <AdminLayout>
            {toast && <div className={`admin-toast admin-toast--${toast.type}`}>{toast.message}</div>}

            <h1 className="admin-page-title">Blog Managers</h1>
            <p className="admin-page-sub">
                Managers receive email notifications when new blogs are submitted for review.
            </p>

            {/* Info box */}
            <div style={{ background: "rgba(0, 180, 255, 0.05)", border: "1px solid rgba(0, 180, 255, 0.15)", padding: "1rem 1.25rem", marginBottom: "2rem", fontSize: "13px", color: "#9ba4a7", lineHeight: 1.6 }}>
                <strong style={{ color: "#00b4ff", display: "block", marginBottom: "4px", fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase" }}>📧 Email Notifications</strong>
                When a poster submits a blog, all <strong style={{ color: "#f2f1eb" }}>active</strong> managers below receive an email notification.
                Currently using the <strong style={{ color: "#f2f1eb" }}>stub email service</strong> (logs to console). Configure a real provider in <code style={{ color: "#7de5d2", fontSize: "12px" }}>emailService.js</code>.
            </div>

            {/* Add form */}
            <form onSubmit={handleAdd} style={{ display: "flex", gap: "0.75rem", marginBottom: "2rem", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: "260px" }}>
                    <input
                        type="email"
                        className="admin-input"
                        placeholder="manager@example.com"
                        value={newEmail}
                        onChange={e => { setNewEmail(e.target.value); setEmailError(""); }}
                        style={{ width: "100%", boxSizing: "border-box" }}
                    />
                    {emailError && <p style={{ color: "#e05c6a", fontSize: "12px", margin: "4px 0 0" }}>{emailError}</p>}
                </div>
                <button
                    type="submit"
                    className="admin-btn admin-btn--primary"
                    style={{ padding: "9px 20px" }}
                    disabled={isAdding}
                >
                    {isAdding ? "Adding…" : "+ Add Manager"}
                </button>
            </form>

            {/* Managers list */}
            {isLoading ? (
                <div style={{ padding: "3rem", textAlign: "center" }}><div className="admin-spinner" /></div>
            ) : managers.length === 0 ? (
                <div className="admin-empty">
                    <span className="admin-empty-icon">✉</span>
                    <p>No managers configured. Add an email above to start receiving notifications.</p>
                </div>
            ) : (
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Status</th>
                            <th>Added</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {managers.map(manager => (
                            <tr key={manager._id}>
                                <td style={{ color: "#f2f1eb", fontWeight: 500 }}>{manager.email}</td>
                                <td>
                                    <span style={{
                                        display: "inline-block", padding: "3px 10px",
                                        fontSize: "9px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase",
                                        background: manager.isActive ? "rgba(125,229,210,0.1)" : "rgba(82,97,104,0.15)",
                                        color: manager.isActive ? "#7de5d2" : "#9ba4a7",
                                        border: manager.isActive ? "1px solid rgba(125,229,210,0.3)" : "1px solid rgba(82,97,104,0.3)",
                                    }}>
                                        {manager.isActive ? "Receiving" : "Paused"}
                                    </span>
                                </td>
                                <td style={{ fontSize: "12px", color: "#526168" }}>{formatDate(manager._createdAt)}</td>
                                <td>
                                    <div style={{ display: "flex", gap: "5px" }}>
                                        <button
                                            className={`admin-btn ${manager.isActive ? "admin-btn--secondary" : "admin-btn--success"}`}
                                            onClick={() => handleToggle(manager)}
                                        >
                                            {manager.isActive ? "Pause" : "Resume"}
                                        </button>
                                        <button
                                            className="admin-btn admin-btn--danger"
                                            onClick={() => handleDelete(manager)}
                                        >
                                            Remove
                                        </button>
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

export default AdminManagerConfig;
