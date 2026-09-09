import { Link, useLocation, useNavigate } from "react-router-dom";
import { isAdminLoggedIn, clearAdminSession } from "../lib/blogAuth";
import "./AdminLayout.css";

const AdminLayout = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        clearAdminSession();
        navigate("/admin/blogs");
    };

    const navLinks = [
        { to: "/admin/blogs", label: "Dashboard", icon: "◈" },
        { to: "/admin/blogs/list", label: "All Blogs", icon: "≡" },
        { to: "/admin/blog-posters", label: "Blog Posters", icon: "◉" },
        { to: "/admin/blog-managers", label: "Blog Managers", icon: "✉" },
        { to: "/admin/setup", label: "Setup & Health", icon: "⚙" },
    ];

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="admin-sidebar__brand">
                    <Link to="/" className="admin-sidebar__logo">NEON</Link>
                    <span className="admin-sidebar__sub">Admin Panel</span>
                </div>

                <nav className="admin-sidebar__nav">
                    {navLinks.map(link => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className={`admin-sidebar__link ${location.pathname === link.to ? "admin-sidebar__link--active" : ""}`}
                        >
                            <span className="admin-sidebar__icon">{link.icon}</span>
                            {link.label}
                        </Link>
                    ))}
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
                {children}
            </main>
        </div>
    );
};

export default AdminLayout;
