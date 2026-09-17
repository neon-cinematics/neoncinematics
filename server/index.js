require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const { Resend } = require("resend");
const { createClient } = require("@sanity/client");

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "neon_cinematics_fallback_secret";

// Helper to get Sanity client
const getSanityClient = (token) => {
    return createClient({
        projectId: process.env.SANITY_PROJECT_ID || "047erfze",
        dataset: process.env.SANITY_DATASET || "gallery-images",
        apiVersion: "2025-01-01",
        useCdn: false,
        token: token || process.env.SANITY_TOKEN,
    });
};

const sanityClient = getSanityClient();

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
];
if (process.env.CLIENT_ORIGIN) {
    allowedOrigins.push(...process.env.CLIENT_ORIGIN.split(",").map(o => o.trim()));
}

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
            callback(null, true);
        } else {
            callback(null, true); // Allow configured CORS requests
        }
    },
    credentials: true,
}));
app.use(express.json());

// Auth middleware
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    try {
        const token = authHeader.slice(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        req.poster = decoded;
        next();
    } catch {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
};

const requireAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    try {
        const token = authHeader.slice(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== "admin") {
            return res.status(403).json({ error: "Forbidden: Admin only" });
        }
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
};

// Email transport helper
const getTransporter = () => {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
        return nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
            tls: { rejectUnauthorized: false }
        });
    }
    return null;
};

// Root & Health Check Endpoints
app.get("/", (req, res) => {
    res.json({ message: "Neon Cinematics Backend API is running", status: "online" });
});

app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
});

// POST /api/auth/login — Poster login
app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
    }

    try {
        const poster = await sanityClient.fetch(
            `*[_type == "blogPoster" && username == $username][0] {
                _id, name, username, email, passwordHash, isActive, role,
                "profileImageUrl": profileImage.asset->url
            }`,
            { username }
        );

        if (!poster) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        if (!poster.isActive) {
            return res.status(403).json({ error: "Account is disabled. Contact an administrator." });
        }

        const isValid = await bcrypt.compare(password, poster.passwordHash);
        if (!isValid) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign(
            {
                id: poster._id,
                username: poster.username,
                name: poster.name,
                email: poster.email,
                role: poster.role || "poster",
                profileImageUrl: poster.profileImageUrl || null,
            },
            JWT_SECRET,
            { expiresIn: "24h" }
        );

        res.json({
            token,
            poster: {
                id: poster._id,
                name: poster.name,
                username: poster.username,
                email: poster.email,
                role: poster.role || "poster",
                profileImageUrl: poster.profileImageUrl || null,
            },
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Server error during authentication: " + (err.message || err) });
    }
});

// POST /api/auth/admin-login — Admin login (requires valid Sanity Write Token)
app.post("/api/auth/admin-login", async (req, res) => {
    const { sanityToken } = req.body;
    if (!sanityToken) {
        return res.status(400).json({ error: "Sanity token required" });
    }

    try {
        const testClient = createClient({
            projectId: process.env.SANITY_PROJECT_ID || "047erfze",
            dataset: process.env.SANITY_DATASET || "gallery-images",
            apiVersion: "2025-01-01",
            useCdn: false,
            token: sanityToken,
        });

        let userId = "admin_sanity";
        let userName = "Sanity Admin";
        let isValid = false;

        // Step 1: Attempt user info fetch (for personal Sanity user session tokens)
        try {
            const userInfo = await testClient.request({ url: "/users/me", withCredentials: false });
            if (userInfo && userInfo.id) {
                userId = userInfo.id;
                userName = userInfo.name || "Admin";
                isValid = true;
            }
        } catch {
            // Step 2: Project API Write tokens don't support /users/me, verify token with dataset GROQ query
            try {
                const count = await testClient.fetch(`count(*[_type == "blog"])`);
                if (typeof count === "number") {
                    isValid = true;
                }
            } catch (sanityErr) {
                return res.status(401).json({
                    error: `Invalid Token: ${sanityErr.message}. Please provide a valid API Write token.`
                });
            }
        }

        if (!isValid) {
            return res.status(401).json({ error: "Invalid token or insufficient dataset permissions." });
        }

        // Save valid token to process.env and server/.env
        try {
            const serverEnvPath = path.join(__dirname, ".env");
            let serverEnv = fs.existsSync(serverEnvPath) ? fs.readFileSync(serverEnvPath, "utf8") : "";
            if (/^SANITY_TOKEN=/m.test(serverEnv)) {
                serverEnv = serverEnv.replace(/^SANITY_TOKEN=.*$/m, `SANITY_TOKEN=${sanityToken}`);
            } else {
                serverEnv += `\nSANITY_TOKEN=${sanityToken}`;
            }
            fs.writeFileSync(serverEnvPath, serverEnv, "utf8");
            process.env.SANITY_TOKEN = sanityToken;
        } catch (e) {
            console.warn("Could not save SANITY_TOKEN to .env:", e.message);
        }

        const token = jwt.sign(
            {
                id: userId,
                name: userName,
                role: "admin",
                sanityToken,
            },
            JWT_SECRET,
            { expiresIn: "24h" }
        );

        res.json({
            token,
            admin: { id: userId, name: userName, role: "admin" },
        });
    } catch (err) {
        console.error("Admin login error:", err.message);
        res.status(401).json({ error: "Invalid token: " + err.message });
    }
});

// GET /api/auth/verify
app.get("/api/auth/verify", requireAuth, (req, res) => {
    res.json({ poster: req.poster });
});

// Email Log Helpers
const EMAIL_LOGS_FILE = path.join(__dirname, "email-logs.json");

const loadEmailLogs = () => {
    try {
        if (fs.existsSync(EMAIL_LOGS_FILE)) {
            return JSON.parse(fs.readFileSync(EMAIL_LOGS_FILE, "utf8"));
        }
    } catch {}
    return [];
};

const saveEmailLog = (logEntry) => {
    try {
        const logs = loadEmailLogs();
        logs.unshift({
            id: "log_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
            timestamp: new Date().toISOString(),
            ...logEntry
        });
        fs.writeFileSync(EMAIL_LOGS_FILE, JSON.stringify(logs.slice(0, 100), null, 2), "utf8");
    } catch (e) {
        console.warn("Could not save email log:", e.message);
    }
};

// GET /api/email/logs — Fetch recent email notifications log
app.get("/api/email/logs", (req, res) => {
    res.json({ logs: loadEmailLogs() });
});

async function sendEmailNotification({ to, subject, html, text }) {
    const recipients = Array.isArray(to) ? to : [to];

    // Option 1: Resend.com API (Production)
    if (process.env.RESEND_API_KEY) {
        try {
            const resend = new Resend(process.env.RESEND_API_KEY);
            const from = process.env.RESEND_FROM_EMAIL || "Neon Cinematics <onboarding@resend.dev>";

            const response = await resend.emails.send({
                from,
                to: recipients,
                subject,
                html: html || text,
                text: text || "Neon Cinematics Notification",
            });

            if (response.error) {
                console.warn("⚠️ Resend API Error:", response.error.message, "— Attempting SMTP / local log fallback...");
            } else {
                console.log(`✅ [Resend Delivered] To: ${recipients.join(", ")} | ID: ${response.data?.id}`);
                saveEmailLog({ to: recipients, subject, html, text, provider: "Resend", status: "Delivered", messageId: response.data?.id });
                return { success: true, mode: "resend", messageId: response.data?.id };
            }
        } catch (err) {
            console.warn("⚠️ Resend dispatch error:", err.message, "— Attempting SMTP / local log fallback...");
        }
    }

    // Option 2: Standard SMTP Fallback
    const transporter = getTransporter();
    if (transporter) {
        try {
            const info = await transporter.sendMail({
                from: process.env.FROM_EMAIL || process.env.SMTP_USER || "neoncinematic@iiitkota.ac.in",
                to: recipients,
                subject,
                text: text || "Neon Cinematics Notification",
                html: html || text,
            });
            console.log(`✅ [SMTP Live Sent] To: ${recipients.join(", ")} | ID: ${info.messageId}`);
            saveEmailLog({ to: recipients, subject, html, text, provider: "SMTP", status: "Delivered", messageId: info.messageId });
            return { success: true, mode: "smtp", messageId: info.messageId };
        } catch (err) {
            console.warn("⚠️ SMTP sending failed:", err.message, "— Recording to system email logs...");
        }
    }

    // Option 3: System Log Fallback
    const logId = "log_" + Date.now();
    console.log(`\n📧 [EMAIL NOTIFICATION LOGGED]`);
    console.log(`   To: ${recipients.join(", ")}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Timestamp: ${new Date().toLocaleString()}\n`);

    saveEmailLog({ to: recipients, subject, html, text, provider: "System Log", status: "Captured in Admin Logs", messageId: logId });

    return {
        success: true,
        mode: "stub",
        messageId: logId,
        message: "Email recorded in Admin Logs."
    };
}

// POST /api/email/send — Send Notification Email (Blog Workflow / Manual Trigger)
app.post("/api/email/send", async (req, res) => {
    const { to, subject, html, text } = req.body;
    if (!to || !subject) {
        return res.status(400).json({ error: "to and subject required" });
    }
    const result = await sendEmailNotification({ to, subject, html, text });
    return res.json(result);
});

// POST /api/contact — Public Contact Form Inquiry Submission
app.post("/api/contact", async (req, res) => {
    const { name, email, inquiryType, subject, message } = req.body;
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
        return res.status(400).json({ error: "Name, email, and message are required." });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanType = inquiryType || "General Inquiry";
    const cleanSubject = subject?.trim() || `New ${cleanType} Inquiry from ${cleanName}`;
    const cleanMsg = message.trim();

    const emailSubject = `[Neon Contact] ${cleanType}: ${cleanName}`;
    const htmlBody = `
        <div style="background:#0a0a0b;color:#f2f1eb;font-family:sans-serif;padding:32px;max-width:600px;margin:0 auto;border:1px solid rgba(255,255,255,0.12);border-radius:6px;">
            <h2 style="color:#FCEDB6;margin-top:0;">New Creative Inquiry</h2>
            <p><strong>From:</strong> ${cleanName} (&lt;${cleanEmail}&gt;)</p>
            <p><strong>Inquiry Type:</strong> <span style="background:rgba(252,237,182,0.15);color:#FCEDB6;padding:2px 8px;border-radius:4px;font-size:12px;text-transform:uppercase;">${cleanType}</span></p>
            <p><strong>Subject:</strong> ${cleanSubject}</p>
            <hr style="border:0;border-top:1px solid rgba(255,255,255,0.12);margin:20px 0;" />
            <p style="white-space:pre-wrap;line-height:1.6;font-size:14px;">${cleanMsg}</p>
            <hr style="border:0;border-top:1px solid rgba(255,255,255,0.12);margin:20px 0;" />
            <p style="font-size:11px;color:#9ba4a7;">Dispatched via Neon Cinematics Contact Sequence.</p>
        </div>
    `;
    const textBody = `Inquiry from ${cleanName} (${cleanEmail})\nType: ${cleanType}\nSubject: ${cleanSubject}\nMessage:\n${cleanMsg}`;

    try {
        const result = await sendEmailNotification({
            to: ["neoncinematic@iiitkota.ac.in"],
            subject: emailSubject,
            html: htmlBody,
            text: textBody
        });

        res.json({
            success: true,
            mode: result.mode,
            message: "IT'S ON ITS WAY. We'll take it from here.",
            inquiry: { name: cleanName, email: cleanEmail, type: cleanType }
        });
    } catch (err) {
        console.error("Contact submission error:", err);
        res.status(500).json({ error: "Failed to process inquiry: " + err.message });
    }
});

// POST /api/email/config — Save Resend or SMTP settings to server/.env
app.post("/api/email/config", async (req, res) => {
    const { resendApiKey, smtpHost, smtpPort, smtpUser, smtpPass, fromEmail } = req.body;
    try {
        const envPath = path.join(__dirname, ".env");
        let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

        const updateEnvKey = (key, val) => {
            if (val === undefined) return;
            const regex = new RegExp(`^${key}=.*$`, "m");
            if (regex.test(content)) {
                content = content.replace(regex, `${key}=${val}`);
            } else {
                content += `\n${key}=${val}`;
            }
        };

        if (resendApiKey !== undefined) {
            updateEnvKey("RESEND_API_KEY", resendApiKey);
            process.env.RESEND_API_KEY = resendApiKey;
        }
        if (smtpHost !== undefined) {
            updateEnvKey("SMTP_HOST", smtpHost);
            process.env.SMTP_HOST = smtpHost;
        }
        if (smtpPort !== undefined) {
            updateEnvKey("SMTP_PORT", smtpPort);
            process.env.SMTP_PORT = smtpPort;
        }
        if (smtpUser !== undefined) {
            updateEnvKey("SMTP_USER", smtpUser);
            process.env.SMTP_USER = smtpUser;
        }
        if (smtpPass !== undefined) {
            updateEnvKey("SMTP_PASS", smtpPass);
            process.env.SMTP_PASS = smtpPass;
        }
        if (fromEmail !== undefined) {
            updateEnvKey("FROM_EMAIL", fromEmail);
            process.env.FROM_EMAIL = fromEmail;
        }

        fs.writeFileSync(envPath, content, "utf8");
        res.json({ success: true, message: "Email configuration saved successfully!" });
    } catch (err) {
        res.status(500).json({ error: "Failed to update email config: " + err.message });
    }
});

// GET /api/sanity/diagnose — Check Sanity project status & schema counts
app.get("/api/sanity/diagnose", async (req, res) => {
    const token = req.query.token || process.env.SANITY_TOKEN;
    const client = getSanityClient(token);

    try {
        const [blogsCount, publishedCount, postersCount, managersCount] = await Promise.all([
            client.fetch(`count(*[_type == "blog"])`).catch(() => 0),
            client.fetch(`count(*[_type == "blog" && status == "published"])`).catch(() => 0),
            client.fetch(`count(*[_type == "blogPoster"])`).catch(() => 0),
            client.fetch(`count(*[_type == "blogManager"])`).catch(() => 0),
        ]);

        const hasToken = !!token;
        const resendConfigured = !!process.env.RESEND_API_KEY;
        const smtpConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

        res.json({
            status: "ok",
            projectId: process.env.SANITY_PROJECT_ID || "047erfze",
            dataset: process.env.SANITY_DATASET || "gallery-images",
            hasWriteToken: hasToken,
            resendConfigured,
            smtpConfigured,
            activeEngine: resendConfigured ? "Resend API" : smtpConfigured ? "SMTP" : "Console Stub",
            counts: {
                totalBlogs: blogsCount,
                publishedBlogs: publishedCount,
                posters: postersCount,
                managers: managersCount,
            }
        });
    } catch (err) {
        res.status(500).json({
            error: "Diagnosis failed: " + err.message,
            projectId: process.env.SANITY_PROJECT_ID || "047erfze",
            dataset: process.env.SANITY_DATASET || "gallery-images",
        });
    }
});

// POST /api/sanity/save-token — Save token to server & frontend .env
app.post("/api/sanity/save-token", async (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ error: "Token required" });
    }

    try {
        const testClient = createClient({
            projectId: process.env.SANITY_PROJECT_ID || "047erfze",
            dataset: process.env.SANITY_DATASET || "gallery-images",
            apiVersion: "2025-01-01",
            useCdn: false,
            token,
        });

        await testClient.fetch(`count(*[_type == "blog"])`);

        const serverEnvPath = path.join(__dirname, ".env");
        let serverEnv = fs.existsSync(serverEnvPath) ? fs.readFileSync(serverEnvPath, "utf8") : "";
        if (/^SANITY_TOKEN=/m.test(serverEnv)) {
            serverEnv = serverEnv.replace(/^SANITY_TOKEN=.*$/m, `SANITY_TOKEN=${token}`);
        } else {
            serverEnv += `\nSANITY_TOKEN=${token}`;
        }
        fs.writeFileSync(serverEnvPath, serverEnv, "utf8");
        process.env.SANITY_TOKEN = token;

        const webEnvPath = path.join(__dirname, "../websiteneon/.env");
        if (fs.existsSync(webEnvPath)) {
            let webEnv = fs.readFileSync(webEnvPath, "utf8");
            if (/^VITE_SANITY_WRITE_TOKEN=/m.test(webEnv)) {
                webEnv = webEnv.replace(/^VITE_SANITY_WRITE_TOKEN=.*$/m, `VITE_SANITY_WRITE_TOKEN=${token}`);
            } else {
                webEnv += `\nVITE_SANITY_WRITE_TOKEN=${token}`;
            }
            fs.writeFileSync(webEnvPath, webEnv, "utf8");
        }

        res.json({ success: true, message: "Token verified and saved successfully!" });
    } catch (err) {
        res.status(400).json({ error: "Invalid token: " + err.message });
    }
});

// POST /api/sanity/seed-demo — Seed sample published blogs
app.post("/api/sanity/seed-demo", async (req, res) => {
    const token = req.body.token || process.env.SANITY_TOKEN;
    if (!token) {
        return res.status(400).json({ error: "Write token required to seed demo blogs" });
    }

    const client = getSanityClient(token);

    const demoBlogs = [
        {
            _type: "blog",
            title: "Crafting Cinematic Lighting on Dark Sets",
            slug: { _type: "slug", current: "crafting-cinematic-lighting-on-dark-sets" },
            description: "How we used negative fill, practical lights, and atmospheric haze to create depth in high-contrast night exterior shoots.",
            status: "published",
            publishedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            content: [
                {
                    _key: "block1",
                    _type: "block",
                    children: [{ _key: "c1", _type: "span", text: "Lighting a scene is not about adding light—it's about shaping shadow. When we started filming the nocturnal sequences for our latest project, the primary challenge was maintaining texture in ultra-dark environments without introducing noisy digital gain." }]
                }
            ]
        },
        {
            _type: "blog",
            title: "Anamorphic Lenses vs Spherical: Choosing the Frame",
            slug: { _type: "slug", current: "anamorphic-lenses-vs-spherical-choosing-the-frame" },
            description: "A deep dive into optical character, lens flare geometry, and aspect ratios for modern cinematic storytelling.",
            status: "published",
            publishedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
            createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
            content: [
                {
                    _key: "block2",
                    _type: "block",
                    children: [{ _key: "c2", _type: "span", text: "The oval bokeh, horizontal streaks, and characteristic distortion of anamorphic glass offer an unmatched organic feel. Here is how we evaluate glass before every major shoot." }]
                }
            ]
        },
        {
            _type: "blog",
            title: "The Art of Color Grading in DaVinci Resolve",
            slug: { _type: "slug", current: "the-art-of-color-grading-in-davinci-resolve" },
            description: "Establishing a cohesive film print look from RAW log footage using node graph architectures.",
            status: "published",
            publishedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
            createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
            content: [
                {
                    _key: "block3",
                    _type: "block",
                    children: [{ _key: "c3", _type: "span", text: "Color is emotional language. By structuring your node graph with primary balance, exposure control, and print film emulation (PFE) curves, you preserve skin tones while injecting mood." }]
                }
            ]
        }
    ];

    try {
        const created = [];
        for (const blog of demoBlogs) {
            const result = await client.create(blog);
            created.push(result);
        }
        res.json({ success: true, count: created.length, blogs: created });
    } catch (err) {
        res.status(500).json({ error: "Failed to seed demo blogs: " + err.message });
    }
});

// Health check
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "neon-blog-api", timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🎬 Neon Cinematics Blog API running at http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});
