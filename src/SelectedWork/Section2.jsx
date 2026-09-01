import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Navbar from "../Navbar/Navbar";
import PhotoGallery from "./PhotoGallery";
import "./Section2.css";

const Section2 = () => {
    const navigate = useNavigate();
    const containerRef = useRef();
    const videoSectionRef = useRef();
    const gallerySectionRef = useRef();

    useGSAP(() => {
        if ("scrollRestoration" in window.history) {
            window.history.scrollRestoration = "manual";
        }
        gsap.set(containerRef.current, { opacity: 1, scale: 1, skewY: 0 });
        window.scrollTo(0, 0);

        let startY = 0;
        let activeSection = 0;
        let isSnapping = false;

        const snapTo = (section, leavingRoute = false) => {
            if (isSnapping) return;
            const target = leavingRoute ? 0 : section;
            const element = leavingRoute ? containerRef.current : [videoSectionRef.current, gallerySectionRef.current][target];
            if (!element) return;
            isSnapping = true;
            const start = window.scrollY;
            const destination = leavingRoute ? 0 : element.offsetTop;
            const scrollState = { y: start };
            gsap.to(scrollState, {
                y: destination,
                duration: 0.72,
                ease: "power3.inOut",
                onUpdate: () => window.scrollTo(0, scrollState.y),
                onComplete: () => { isSnapping = false; activeSection = target; if (leavingRoute) navigate("/"); }
            });
        };

        const goToAbout = () => {
            if (isSnapping) return;
            isSnapping = true;
            gsap.to(containerRef.current, { opacity: 0, duration: 0.35, ease: "power2.out", onComplete: () => navigate("/aboutUs") });
        };

        const handleScroll = (e) => {
            if (isSnapping || e.target.closest?.(".parallax-cards")) return;
            e.preventDefault();
            if (e.deltaY > 0 && activeSection === 0) snapTo(1);
            if (e.deltaY < 0 && activeSection === 0 && window.scrollY <= 4) snapTo(0, true);
            if (e.deltaY < 0 && activeSection === 1) snapTo(0);
            if (e.deltaY > 0 && activeSection === 1) goToAbout();

        };

        const handleTouchStart = (e) => {
            startY = e.touches[0].clientY;
        };

        const handleTouchMove = (e) => {
            if (isSnapping || e.target.closest?.(".parallax-cards")) return;
            const currentY = e.touches[0].clientY;
            const delta = currentY - startY;
            if (Math.abs(delta) < 60) return;
            e.preventDefault();
            if (delta < 0 && activeSection === 0) snapTo(1);
            if (delta > 0 && activeSection === 1) snapTo(0);
            if (delta > 0 && activeSection === 0 && window.scrollY <= 4) snapTo(0, true);
            if (delta < 0 && activeSection === 1) goToAbout();
        };

        containerRef.current.addEventListener("wheel", handleScroll, { passive: false, capture: true });
        window.addEventListener("touchstart", handleTouchStart, { passive: true });
        window.addEventListener("touchmove", handleTouchMove, { passive: true });

        return () => {
            containerRef.current?.removeEventListener("wheel", handleScroll, { capture: true });
            window.removeEventListener("touchstart", handleTouchStart);
            window.removeEventListener("touchmove", handleTouchMove);
        };
    }, { scope: containerRef });

    return (
        <div ref={containerRef} id="section2_main_div">
            <Navbar />
            <main className="selected-work-content">
                <section ref={videoSectionRef} className="video-showcase-placeholder" aria-label="Video showcase coming soon">
                    <div className="placeholder-line" aria-hidden="true" />
                </section>
                <section ref={gallerySectionRef} className="selected-work-gallery-section"><PhotoGallery /></section>
            </main>
        </div>
    );
};

export default Section2;