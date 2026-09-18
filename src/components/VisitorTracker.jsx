import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export default function VisitorTracker() {
    const location = useLocation();

    useEffect(() => {
        const path = location.pathname;
        const hasSession = sessionStorage.getItem("neon_visited_session");
        const isNewSession = !hasSession;

        if (isNewSession) {
            sessionStorage.setItem("neon_visited_session", "true");
        }

        // Send visit payload silently
        fetch(`${API_BASE}/api/analytics/visit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                path,
                isNewSession,
                referrer: document.referrer || null,
                userAgent: navigator.userAgent
            })
        }).catch(() => {
            // Silently ignore tracking errors in offline/dev
        });
    }, [location.pathname]);

    return null;
}
