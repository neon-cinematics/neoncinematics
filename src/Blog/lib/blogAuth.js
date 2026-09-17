import { createBlogWriteClient } from "./blogSanity";

const SESSION_KEY = "neon_blog_session";
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

// Poster session handling
export const saveSession = (token, poster) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, poster }));
};

export const getSession = () => {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const clearSession = () => {
    sessionStorage.removeItem(SESSION_KEY);
};

export const getToken = () => {
    const session = getSession();
    return session?.token || null;
};

export const getPoster = () => {
    const session = getSession();
    return session?.poster || null;
};

export const isLoggedIn = () => !!getToken();

// Admin session handling
const ADMIN_SESSION_KEY = "neon_blog_admin_session";

export const saveAdminSession = (token, admin, sanityToken) => {
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ token, admin, sanityToken }));
};

export const getAdminSession = () => {
    try {
        const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const clearAdminSession = () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
};

export const getAdminToken = () => getAdminSession()?.token || null;
export const getAdminSanityToken = () => getAdminSession()?.sanityToken || null;
export const isAdminLoggedIn = () => !!getAdminToken();

export const getSanityWriteToken = () => {
    return (
        sessionStorage.getItem("neon_blog_write_token") ||
        getAdminSanityToken() ||
        sessionStorage.getItem("gallery-admin-token") ||
        sessionStorage.getItem("team-admin-token") ||
        import.meta.env.VITE_SANITY_WRITE_TOKEN ||
        ""
    );
};

export const setCustomSanityWriteToken = (token) => {
    if (token && token.trim()) {
        sessionStorage.setItem("neon_blog_write_token", token.trim());
    } else {
        sessionStorage.removeItem("neon_blog_write_token");
    }
};

// Auth API calls
export const loginPoster = async (username, password) => {
    try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Login failed");
        return data; // { token, poster }
    } catch (err) {
        if (err.name === "TypeError" || err.message.includes("fetch") || err.message.includes("Failed to fetch")) {
            throw new Error("Unable to connect to backend server at " + API_BASE + ". Please ensure server is running.");
        }
        throw err;
    }
};

export const loginAdmin = async (sanityToken) => {
    try {
        const res = await fetch(`${API_BASE}/api/auth/admin-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sanityToken }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Admin login failed");
        return data; // { token, admin }
    } catch (err) {
        // If server is not reachable, fallback to direct client verification!
        if (err.name === "TypeError" || err.message.includes("fetch") || err.message.includes("NetworkError") || err.message.includes("Failed to fetch")) {
            console.warn("Backend server not reachable at " + API_BASE + ". Verifying token directly...");
            const client = createBlogWriteClient(sanityToken);
            if (!client) throw new Error("Invalid configuration.");
            try {
                await client.fetch(`count(*[_type == "blog"])`);
                return {
                    token: "admin_direct_session_" + Date.now(),
                    admin: { id: "admin", name: "Admin", role: "admin" }
                };
            } catch (sanityErr) {
                throw new Error("Invalid token: " + sanityErr.message);
            }
        }
        throw err;
    }
};

export const verifyToken = async () => {
    const token = getToken();
    if (!token) return null;
    try {
        const res = await fetch(`${API_BASE}/api/auth/verify`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) { clearSession(); return null; }
        const data = await res.json();
        return data.poster;
    } catch {
        return null;
    }
};

export const resetPosterPassword = async (posterId, newPassword, adminJwt) => {
    try {
        const res = await fetch(`${API_BASE}/api/posters/reset-password`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${adminJwt}`,
            },
            body: JSON.stringify({ posterId, newPassword }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to reset password");
        return data;
    } catch (err) {
        if (err.name === "TypeError" || err.message.includes("fetch") || err.message.includes("Failed to fetch")) {
            throw new Error("Backend server not reachable at " + API_BASE + ". Check server logs.");
        }
        throw err;
    }
};

export const createPosterViaApi = async (posterData, adminJwt) => {
    try {
        const res = await fetch(`${API_BASE}/api/posters/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${adminJwt}`,
            },
            body: JSON.stringify(posterData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create poster");
        return data;
    } catch (err) {
        if (err.name === "TypeError" || err.message.includes("fetch") || err.message.includes("Failed to fetch")) {
            throw new Error("Backend server not reachable at " + API_BASE + ". Check server logs.");
        }
        throw err;
    }
};
