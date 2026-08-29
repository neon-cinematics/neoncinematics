import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Navlogo from "./Navlogo";
import Navlinks from "./Navlinks";

const Navbar = () => {

    useGSAP(() => {
        gsap.from('#nav', {
            opacity: 0,
            y: -100,
            duration: 1.5,
            delay: 1,
            ease: "power3.out",
        })
    })

    return (
        <>
            <div id="nav">
                <Navlogo />
                <Navlinks />
            </div>
            
        </>
    )
}
export default Navbar;