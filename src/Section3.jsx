import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar/Navbar";

const Section3 = () => {
    const navigate = useNavigate();
    const container = useRef();
    let isSnapping = false;

    useGSAP(() => {
        if ("scrollRestoration" in window.history) {
            window.history.scrollRestoration = "manual";
        }
        window.scrollTo(0, 0);

        gsap.from(container.current, {
            opacity: 0,
            duration: 1.5,
            ease: "power2.out"
        });

        const goToWork = () => {
            if (isSnapping) return;
            isSnapping = true;
            gsap.to(container.current, {
                opacity: 0,
                duration: 0.5,
                ease: "power2.inOut",
                onComplete: () => navigate("/work")
            });
        };

        const handleScroll = (e) => {
            if (isSnapping) return;
            if (e.deltaY < 0 && window.scrollY <= 4) {
                e.preventDefault();
                goToWork();
            }
        };

        let startY = 0;
        const handleTouchStart = (e) => { startY = e.touches[0].clientY; };
        const handleTouchMove = (e) => {
            if (isSnapping) return;
            const currentY = e.touches[0].clientY;
            const delta = currentY - startY;
            if (delta > 60 && window.scrollY <= 4) {
                e.preventDefault();
                goToWork();
            }
        };

        window.addEventListener("wheel", handleScroll, { passive: false });
        window.addEventListener("touchstart", handleTouchStart, { passive: true });
        window.addEventListener("touchmove", handleTouchMove, { passive: false });

        return () => {
            window.removeEventListener("wheel", handleScroll);
            window.removeEventListener("touchstart", handleTouchStart);
            window.removeEventListener("touchmove", handleTouchMove);
        };
    }, { scope: container });

    return (
        <div ref={container} id="section3_main_div" style={{ minHeight: "100vh", background: "#080a0d", color: "white" }}>
            <Navbar />
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
                <h1>About Us</h1>
            </div>
        </div>
    );
};

export default Section3;