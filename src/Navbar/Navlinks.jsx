import { Link } from "react-router-dom";

const Navlinks = () => {
    return (
        <>
        <div id="nav_links">
            <ul>
                <li><Link to="/">Home</Link></li>
                <li><Link to="/work">Selected Work</Link></li>
                <li><Link to="/aboutUs">About Us</Link></li>
                <li><Link to="/contact">Contact</Link></li>
                <li><Link to="/blog">Blog</Link></li>
            </ul>
        </div>
        <hr id="line" />
        </>
    )
}
export default Navlinks;