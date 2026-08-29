import { NavLink } from "react-router-dom";

const Navlinks = () => {
    return (
        <>
        <div id="nav_links">
            <ul>
                <li><NavLink to="/" end className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Home</NavLink></li>
                <li><NavLink to="/work" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Selected Work</NavLink></li>
                <li><NavLink to="/aboutUs" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>About Us</NavLink></li>
                <li><NavLink to="/contact" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Contact</NavLink></li>
                <li><NavLink to="/blog" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Blog</NavLink></li>
            </ul>
        </div>
        <hr id="line" />
        </>
    )
}
export default Navlinks;