import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useLocation } from "react-router-dom";
import Navlogo from "./Navlogo";
import Navlinks from "./Navlinks";

const Navbar = () => {
    const location = useLocation();
    const isHomePage = location.pathname === "/";

    useGSAP(() => {
        if (!isHomePage) return;

        gsap.from('#nav', {
            opacity: 0,
            y: -100,
            duration: 1.5,
            delay: 1,
            ease: "power3.out",
        });
    }, { dependencies: [isHomePage] });

    return (
        <>
            <div id="nav">
                <Navlogo />
                <Navlinks />
            </div>
        </>
    );
};

export default Navbar;