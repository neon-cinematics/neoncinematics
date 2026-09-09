import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { loginPoster, saveSession, isLoggedIn } from "../lib/blogAuth";
import "./BlogLogin.css";

const BlogLogin = () => {
    const navigate = useNavigate();
    const containerRef = useRef();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // If already logged in, go to dashboard
    useEffect(() => {
        if (isLoggedIn()) {
            navigate("/blog/dashboard", { replace: true });
        }
    }, [navigate]);

    useGSAP(() => {
        gsap.fromTo(containerRef.current,
            { opacity: 0 },
            { opacity: 1, duration: 1, ease: "power2.out" }
        );
        gsap.fromTo(".blog-login__card",
            { y: 30, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.9, delay: 0.2, ease: "power3.out" }
        );
    }, { scope: containerRef });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username.trim() || !password) {
            setError("Username and password are required.");
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const { token, poster } = await loginPoster(username.trim(), password);
            saveSession(token, poster);
            
            // Fade out and navigate
            gsap.to(containerRef.current, {
                opacity: 0,
                duration: 0.4,
                ease: "power2.out",
                onComplete: () => navigate("/blog/dashboard", { replace: true }),
            });
        } catch (err) {
            setError(err.message || "Login failed. Please check your credentials.");
            // Shake the card
            gsap.fromTo(".blog-login__card",
                { x: -8 },
                { x: 0, duration: 0.4, ease: "elastic.out(1, 0.3)" }
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div ref={containerRef} className="blog-login-page">
            {/* Background glow */}
            <div className="blog-login__bg" aria-hidden="true" />

            <div className="blog-login__card">
                {/* Brand */}
                <div className="blog-login__brand">
                    <div className="blog-login__brand-mark">NEON</div>
                    <div className="blog-login__brand-sub">Cinematics · Blog Portal</div>
                </div>

                <div className="blog-login__divider" />

                <h1 className="blog-login__title">Sign In</h1>
                <p className="blog-login__subtitle">
                    Access your blog poster account to create and manage content.
                </p>

                <form className="blog-login__form" onSubmit={handleSubmit} noValidate>
                    <div className="blog-login__field">
                        <label htmlFor="blog-username">Username</label>
                        <input
                            id="blog-username"
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="your_username"
                            autoComplete="username"
                            autoFocus
                            disabled={isLoading}
                        />
                    </div>

                    <div className="blog-login__field">
                        <label htmlFor="blog-password">Password</label>
                        <div className="blog-login__password-wrapper">
                            <input
                                id="blog-password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="current-password"
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                className="blog-login__toggle-pw"
                                onClick={() => setShowPassword(s => !s)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="blog-login__error" role="alert">
                            <span>⚠</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="blog-login__submit"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span className="blog-login__spinner" />
                        ) : (
                            "Sign In →"
                        )}
                    </button>
                </form>

                <p className="blog-login__help">
                    Don't have an account? Contact an administrator to get access.
                </p>
            </div>

            {/* Admin link */}
            <div className="blog-login__admin-link">
                <a href="/admin/blogs">Admin Panel →</a>
            </div>
        </div>
    );
};

export default BlogLogin;
