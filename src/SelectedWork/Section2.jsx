import { useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Navbar from "../Navbar/Navbar";
import PhotoGallery from "./PhotoGallery";
import VideoShowcase from "./VideoShowcase";
import "./Section2.css";

const Section2 = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const containerRef = useRef();
    const videoSectionRef = useRef();
    const gallerySectionRef = useRef();

    useGSAP(() => {
        if ("scrollRestoration" in window.history) {
            window.history.scrollRestoration = "manual";
        }
        gsap.set(containerRef.current, { opacity: 1, scale: 1, skewY: 0 });
        
        let startY = 0;
        let activeSection = location.state?.scrollToGallery ? 1 : 0;
        let isSnapping = false;

        if (activeSection === 1) {
            // Jump instantly to gallery
            const targetElement = gallerySectionRef.current;
            if (targetElement) {
                // Small timeout ensures it happens after browser layout
                setTimeout(() => {
                    window.scrollTo(0, targetElement.offsetTop);
                    // Silently clear the state in the browser history 
                    // so a hard reload later brings us to the top, without causing a React re-render right now.
                    if (window.history.state && window.history.state.usr) {
                        const newState = { ...window.history.state, usr: null };
                        window.history.replaceState(newState, '');
                    }
                }, 50);
            }
        } else {
            setTimeout(() => window.scrollTo(0, 0), 50);
        }

        const onBeforeUnload = () => {
            window.scrollTo(0, 0);
        };
        window.addEventListener("beforeunload", onBeforeUnload);

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
                duration: 0.6, // video to gallery container scroll duration ;)
                ease: "power3.inOut",
                onUpdate: () => window.scrollTo(0, scrollState.y),
                onComplete: () => { isSnapping = false; activeSection = target; if (leavingRoute) navigate("/"); }
            });
        };

        const goToAbout = () => {
            if (isSnapping) return;
            isSnapping = true;
            const wall = document.querySelector('.parallax-cards');
            if (wall) {
                const currentZ = parseFloat(getComputedStyle(wall).getPropertyValue('--camera-z')) || 0;
                gsap.to(wall, {
                    '--camera-z': `${currentZ + 3500}px`,
                    opacity: 0,
                    duration: 0.5,
                    ease: "power2.in",
                    onComplete: () => navigate("/aboutUs")
                });
            } else {
                gsap.to(containerRef.current, { opacity: 0, duration: 0.35, ease: "power2.out", onComplete: () => navigate("/aboutUs") });
            }
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
        window.addEventListener("touchmove", handleTouchMove, { passive: false });
        
        const handleGalleryScrollUp = () => {
            if (activeSection === 1) snapTo(0);
        };
        const handleScrollDownToGallery = () => {
            if (activeSection === 0) snapTo(1);
        };
        window.addEventListener("galleryScrollUp", handleGalleryScrollUp);
        window.addEventListener("scrollDownToGallery", handleScrollDownToGallery);

        return () => {
            containerRef.current?.removeEventListener("wheel", handleScroll, { capture: true });
            window.removeEventListener("touchstart", handleTouchStart);
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("galleryScrollUp", handleGalleryScrollUp);
            window.removeEventListener("scrollDownToGallery", handleScrollDownToGallery);
            window.removeEventListener("beforeunload", onBeforeUnload);
        };
    }, { scope: containerRef });

    return (
        <div ref={containerRef} id="section2_main_div">
            <Navbar />
            <main className="selected-work-content">
                <section ref={videoSectionRef} className="video-showcase-placeholder" aria-label="Video showcase">
                    <VideoShowcase />
                </section>
                <section ref={gallerySectionRef} className="selected-work-gallery-section"><PhotoGallery /></section>
            </main>
        </div>
    );
};

export default Section2;