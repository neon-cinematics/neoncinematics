import { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import {
    notifyPosterSubmitted,
    notifyPosterApproved,
    notifyPosterRejected,
    notifyPosterPublished
} from "../lib/emailService";
import "./AdminSetupDashboard.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

const AdminSetupDashboard = () => {
    const [diagnostics, setDiagnostics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tokenInput, setTokenInput] = useState("");
    const [tokenMessage, setTokenMessage] = useState(null);
    const [seedMessage, setSeedMessage] = useState(null);

    // Resend Form
    const [resendApiKey, setResendApiKey] = useState("");
    const [resendFromEmail, setResendFromEmail] = useState("");
    const [resendMessage, setResendMessage] = useState(null);

    // SMTP Form
    const [smtpHost, setSmtpHost] = useState("");
    const [smtpPort, setSmtpPort] = useState("587");
    const [smtpUser, setSmtpUser] = useState("");
    const [smtpPass, setSmtpPass] = useState("");
    const [fromEmail, setFromEmail] = useState("");
    const [smtpMessage, setSmtpMessage] = useState(null);

    // Test Email Dispatch
    const [testTo, setTestTo] = useState("");
    const [testType, setTestType] = useState("submitted");
    const [sendingTest, setSendingTest] = useState(false);
    const [testResult, setTestResult] = useState(null);

    const fetchDiagnostics = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/sanity/diagnose`);
            const data = await res.json();
            setDiagnostics(data);
        } catch (err) {
            console.error("Diagnosis error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDiagnostics();
    }, []);

    const handleSaveToken = async (e) => {
        e.preventDefault();
        if (!tokenInput.trim()) return;
        setTokenMessage({ type: "info", text: "Verifying token..." });
        try {
            const res = await fetch(`${API_BASE}/api/sanity/save-token`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: tokenInput.trim() }),
            });
            const data = await res.json();
            if (res.ok) {
                setTokenMessage({ type: "success", text: data.message });
                fetchDiagnostics();
            } else {
                setTokenMessage({ type: "error", text: data.error });
            }
        } catch (err) {
            setTokenMessage({ type: "error", text: err.message });
        }
    };

    const handleSeedDemo = async () => {
        setSeedMessage({ type: "info", text: "Seeding 3 demo blogs..." });
        try {
            const res = await fetch(`${API_BASE}/api/sanity/seed-demo`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: tokenInput.trim() || undefined }),
            });
            const data = await res.json();
            if (res.ok) {
                setSeedMessage({ type: "success", text: `Success! Created ${data.count} demo blog posts.` });
                fetchDiagnostics();
            } else {
                setSeedMessage({ type: "error", text: data.error });
            }
        } catch (err) {
            setSeedMessage({ type: "error", text: err.message });
        }
    };

    const handleSaveResend = async (e) => {
        e.preventDefault();
        setResendMessage({ type: "info", text: "Saving Resend API Key..." });
        try {
            const res = await fetch(`${API_BASE}/api/email/config`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    resendApiKey: resendApiKey.trim(),
                    fromEmail: resendFromEmail.trim() || undefined,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setResendMessage({ type: "success", text: "Resend.com API key saved! Emails are now live." });
                fetchDiagnostics();
            } else {
                setResendMessage({ type: "error", text: data.error });
            }
        } catch (err) {
            setResendMessage({ type: "error", text: err.message });
        }
    };

    const handleSaveSmtp = async (e) => {
        e.preventDefault();
        setSmtpMessage({ type: "info", text: "Saving SMTP credentials..." });
        try {
            const res = await fetch(`${API_BASE}/api/email/config`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    smtpHost,
                    smtpPort,
                    smtpUser,
                    smtpPass,
                    fromEmail,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setSmtpMessage({ type: "success", text: "SMTP configuration updated!" });
                fetchDiagnostics();
            } else {
                setSmtpMessage({ type: "error", text: data.error });
            }
        } catch (err) {
            setSmtpMessage({ type: "error", text: err.message });
        }
    };

    const handleSendTestEmail = async (e) => {
        e.preventDefault();
        if (!testTo.trim()) return;
        setSendingTest(true);
        setTestResult(null);

        const dummyBlog = {
            _id: "demo-blog-123",
            title: "Test Blog: The Aesthetics of Shadows",
            description: "A test notification dispatched from the Neon Cinematics diagnostic suite.",
            slug: { current: "test-blog-aesthetics-of-shadows" },
        };

        try {
            let res;
            if (testType === "submitted") {
                res = await notifyPosterSubmitted(testTo.trim(), dummyBlog);
            } else if (testType === "approved") {
                res = await notifyPosterApproved(testTo.trim(), dummyBlog);
            } else if (testType === "rejected") {
                res = await notifyPosterRejected(testTo.trim(), dummyBlog, "Please expand on the second section and re-upload cover image.");
            } else if (testType === "published") {
                res = await notifyPosterPublished(testTo.trim(), dummyBlog);
            }

            if (res?.mode === "resend" || res?.mode === "smtp" || res?.messageId) {
                setTestResult({ type: "success", text: `Live email dispatched via ${res.mode?.toUpperCase() || "Engine"} to ${testTo}! (Message ID: ${res.messageId || "sent"})` });
            } else if (res?.mode === "stub") {
                setTestResult({ type: "warning", text: `Email logged to console! Paste your Resend.com API Key below to deliver live emails to actual inboxes.` });
            } else {
                setTestResult({ type: "success", text: `Email trigger executed!` });
            }
        } catch (err) {
            setTestResult({ type: "error", text: "Failed: " + err.message });
        } finally {
            setSendingTest(false);
        }
    };

    return (
        <AdminLayout activeTab="setup" title="System Setup & Diagnostics">
            <div className="admin-setup">
                <header className="admin-setup__header">
                    <h2>Database & Email System Health</h2>
                    <p>Manage dataset access, seed sample blogs, and configure Resend.com / SMTP email delivery.</p>
                </header>

                {/* Status Cards */}
                <div className="admin-setup__cards">
                    <div className="setup-card">
                        <div className="setup-card__icon">✦</div>
                        <div className="setup-card__info">
                            <span className="setup-card__label">Dataset</span>
                            <strong className="setup-card__val">{diagnostics?.projectId || "047erfze"} / {diagnostics?.dataset || "gallery-images"}</strong>
                        </div>
                    </div>
                    <div className="setup-card">
                        <div className={`setup-card__badge ${diagnostics?.hasWriteToken ? "setup-card__badge--ok" : "setup-card__badge--warn"}`}>
                            {diagnostics?.hasWriteToken ? "TOKEN SAVED" : "TOKEN MISSING"}
                        </div>
                        <div className="setup-card__info">
                            <span className="setup-card__label">Write Token</span>
                            <strong className="setup-card__val">{diagnostics?.hasWriteToken ? "Verified & Ready" : "Required for Posters"}</strong>
                        </div>
                    </div>
                    <div className="setup-card">
                        <div className={`setup-card__badge ${diagnostics?.resendConfigured ? "setup-card__badge--resend" : diagnostics?.smtpConfigured ? "setup-card__badge--ok" : "setup-card__badge--stub"}`}>
                            {diagnostics?.resendConfigured ? "RESEND LIVE" : diagnostics?.smtpConfigured ? "SMTP LIVE" : "CONSOLE STUB"}
                        </div>
                        <div className="setup-card__info">
                            <span className="setup-card__label">Active Email Engine</span>
                            <strong className="setup-card__val">{diagnostics?.activeEngine || "Console Stub"}</strong>
                        </div>
                    </div>
                    <div className="setup-card">
                        <div className="setup-card__icon">📚</div>
                        <div className="setup-card__info">
                            <span className="setup-card__label">Documents</span>
                            <strong className="setup-card__val">{diagnostics?.counts?.totalBlogs || 0} Blogs ({diagnostics?.counts?.publishedBlogs || 0} Published)</strong>
                        </div>
                    </div>
                </div>

                {/* Section 1: Write Access & Seeding */}
                <div className="admin-setup__section">
                    <h3>1. Write Access & Demo Data</h3>
                    <div className="admin-setup__grid">
                        <form className="admin-setup__form" onSubmit={handleSaveToken}>
                            <h4>Set Write Token</h4>
                            <p className="admin-setup__help">
                                Paste your API Write Token (from project management console) to enable blog creation and poster accounts.
                            </p>
                            <input
                                type="password"
                                placeholder="sk..."
                                value={tokenInput}
                                onChange={(e) => setTokenInput(e.target.value)}
                                className="admin-setup__input"
                            />
                            <button type="submit" className="admin-setup__btn">Save Token to .env</button>
                            {tokenMessage && (
                                <div className={`admin-setup__msg admin-setup__msg--${tokenMessage.type}`}>
                                    {tokenMessage.text}
                                </div>
                            )}
                        </form>

                        <div className="admin-setup__box">
                            <h4>Seed Demo Blogs</h4>
                            <p className="admin-setup__help">
                                Don't have blogs in database yet? Click below to instantly publish 3 cinematic demo blogs into your dataset so the public blog page renders immediately.
                            </p>
                            <button onClick={handleSeedDemo} className="admin-setup__btn admin-setup__btn--gold">
                                ⚡ Seed 3 Demo Published Blogs
                            </button>
                            {seedMessage && (
                                <div className={`admin-setup__msg admin-setup__msg--${seedMessage.type}`}>
                                    {seedMessage.text}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section 2: Email Configuration & Testing */}
                <div className="admin-setup__section">
                    <h3>2. Email Delivery (Resend.com / SMTP)</h3>
                    <div className="admin-setup__grid">
                        {/* Resend.com Setup Box */}
                        <form className="admin-setup__form" onSubmit={handleSaveResend}>
                            <h4>⚡ Option A: Resend.com (Recommended)</h4>
                            <p className="admin-setup__help">
                                Get your free API key from <a href="https://resend.com" target="_blank" rel="noreferrer" style={{ color: '#ededed', textDecoration: 'underline' }}>resend.com</a> (takes 1 minute). Resend delivers instant emails with high inbox deliverability.
                            </p>

                            <div className="admin-setup__field">
                                <label>Resend API Key:</label>
                                <input
                                    type="password"
                                    placeholder="re_123456789..."
                                    value={resendApiKey}
                                    onChange={(e) => setResendApiKey(e.target.value)}
                                    required
                                    className="admin-setup__input"
                                />
                            </div>

                            <div className="admin-setup__field">
                                <label>Sender Email (Optional):</label>
                                <input
                                    type="text"
                                    placeholder="Neon Cinematics <onboarding@resend.dev>"
                                    value={resendFromEmail}
                                    onChange={(e) => setResendFromEmail(e.target.value)}
                                    className="admin-setup__input"
                                />
                            </div>

                            <button type="submit" className="admin-setup__btn admin-setup__btn--gold">
                                Save Resend API Key
                            </button>

                            {resendMessage && (
                                <div className={`admin-setup__msg admin-setup__msg--${resendMessage.type}`}>
                                    {resendMessage.text}
                                </div>
                            )}
                        </form>

                        {/* Live Email Test Box */}
                        <form className="admin-setup__form" onSubmit={handleSendTestEmail}>
                            <h4>Test Email Dispatch</h4>
                            <p className="admin-setup__help">
                                Send a test email to your real email inbox to verify Resend / SMTP live email delivery.
                            </p>

                            <div className="admin-setup__field">
                                <label>Recipient Email Address:</label>
                                <input
                                    type="email"
                                    placeholder="yourname@gmail.com"
                                    value={testTo}
                                    onChange={(e) => setTestTo(e.target.value)}
                                    required
                                    className="admin-setup__input"
                                />
                            </div>

                            <div className="admin-setup__field">
                                <label>Notification Template:</label>
                                <select
                                    value={testType}
                                    onChange={(e) => setTestType(e.target.value)}
                                    className="admin-setup__select"
                                >
                                    <option value="submitted">Blog Submitted (Confirmation to Poster)</option>
                                    <option value="approved">Blog Approved (Notification)</option>
                                    <option value="rejected">Blog Needs Revision (Rejection Feedback)</option>
                                    <option value="published">Blog Live (Published Notification)</option>
                                </select>
                            </div>

                            <button type="submit" disabled={sendingTest} className="admin-setup__btn">
                                {sendingTest ? "Dispatching Email..." : "📧 Send Test Email Now"}
                            </button>

                            {testResult && (
                                <div className={`admin-setup__msg admin-setup__msg--${testResult.type}`}>
                                    {testResult.text}
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminSetupDashboard;
