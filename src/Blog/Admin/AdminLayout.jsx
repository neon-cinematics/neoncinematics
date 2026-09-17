import { Link, useLocation, useNavigate } from "react-router-dom";
import { isAdminLoggedIn, clearAdminSession } from "../lib/blogAuth";
import "./AdminLayout.css";

const AdminLayout = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        clearAdminSession();
        navigate("/neoncinematicsadminhere/blogs");
    };

    const navLinks = [
        { to: "/neoncinematicsadminhere", label: "Master Dashboard", icon: "❖", exact: true },
        { to: "/neoncinematicsadminhere/blogs", label: "Blog Queue", icon: "◈" },
        { to: "/neoncinematicsadminhere/blogs/list", label: "All Articles", icon: "≡" },
        { to: "/neoncinematicsadminhere/blog-posters", label: "Blog Posters", icon: "◉" },
        { to: "/neoncinematicsadminhere/blog-managers", label: "Blog Managers", icon: "✉" },
        { to: "/video-admin", label: "Background Videos", icon: "🎥" },
        { to: "/gallery-admin", label: "Photo Gallery", icon: "🖼️" },
        { to: "/team-admin", label: "Team Roster", icon: "👥" },
        { to: "/neoncinematicsadminhere/setup", label: "System & Health", icon: "⚙" },
    ];

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="admin-sidebar__brand">
                    <Link to="/neoncinematicsadminhere" className="admin-sidebar__logo">NEON</Link>
                    <span className="admin-sidebar__sub">Master Control</span>
                </div>

                <nav className="admin-sidebar__nav">
                    {navLinks.map(link => {
                        const isActive = link.exact
                            ? location.pathname === link.to
                            : location.pathname.startsWith(link.to);
                        return (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`admin-sidebar__link ${isActive ? "admin-sidebar__link--active" : ""}`}
                            >
                                <span className="admin-sidebar__icon">{link.icon}</span>
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="admin-sidebar__bottom">
                    <Link to="/" className="admin-sidebar__site-link">← Main Site</Link>
                    {isAdminLoggedIn() && (
                        <button className="admin-sidebar__logout" onClick={handleLogout}>
                            Sign Out
                        </button>
                    )}
                </div>
            </aside>

            <main className="admin-content">
                <div className="admin-topbar">
                    <div className="admin-topbar__badge">
                        <span className="admin-topbar__dot" />
                        Admin Session Active
                    </div>
                    {isAdminLoggedIn() && (
                        <button className="admin-topbar__signout" onClick={handleLogout}>
                            Sign Out ➔
                        </button>
                    )}
                </div>
                {children}
            </main>
        </div>
    );
};

export default AdminLayout;
