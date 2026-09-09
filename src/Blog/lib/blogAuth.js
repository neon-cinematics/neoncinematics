// ─── Blog Auth Utilities ─────────────────────────────────────────────────────
// Manages poster JWT session stored in sessionStorage

const SESSION_KEY = "neon_blog_session";
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

// ─── Session Management ───────────────────────────────────────────────────────

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

// ─── Admin Session ────────────────────────────────────────────────────────────
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

// ─── API Calls ────────────────────────────────────────────────────────────────

export const loginPoster = async (username, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    return data; // { token, poster }
};

export const loginAdmin = async (sanityToken) => {
    const res = await fetch(`${API_BASE}/api/auth/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sanityToken }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Admin login failed");
    return data; // { token, admin }
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
};

export const createPosterViaApi = async (posterData, adminJwt) => {
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
};
