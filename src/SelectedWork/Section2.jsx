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

    useGSAP(() => {
        if ("scrollRestoration" in window.history) {
            window.history.scrollRestoration = "manual";
        }
        window.scrollTo(0, 0);

        let isTransitioning = false;
        let scrollAccumulator = 0;
        const SCROLL_THRESHOLD = 500;

        const handleScroll = (e) => {
            if (isTransitioning) return;

            scrollAccumulator += e.deltaY;

            // Only leave the work page when the user scrolls back from its top.
            if (scrollAccumulator < -SCROLL_THRESHOLD && window.scrollY <= 0) {
                isTransitioning = true;
                
                const container = containerRef.current;
                if (container) {
                    gsap.to(container, {
                        scale: 0.8,
                        opacity: 0,
                        duration: 0.6,
                        ease: "power2.out",
                        onComplete: () => {
                            navigate("/");
                        }
                    });
                } else {
                    navigate("/");
                }
                scrollAccumulator = 0;
            }

        };

        let startY = 0;
        const handleTouchStart = (e) => {
            startY = e.touches[0].clientY;
        };

        const handleTouchMove = (e) => {
            if (isTransitioning) return;
            const currentY = e.touches[0].clientY;
            const delta = currentY - startY;

            if (delta > 80 && window.scrollY <= 0) {
                isTransitioning = true;
                
                const container = containerRef.current;
                if (container) {
                    gsap.to(container, {
                        scale: 0.8,
                        opacity: 0,
                        duration: 0.6,
                        ease: "power2.out",
                        onComplete: () => {
                            navigate("/");
                        }
                    });
                } else {
                    navigate("/");
                }
            }

        };

        window.addEventListener("wheel", handleScroll, { passive: true });
        window.addEventListener("touchstart", handleTouchStart, { passive: true });
        window.addEventListener("touchmove", handleTouchMove, { passive: true });

        return () => {
            window.removeEventListener("wheel", handleScroll);
            window.removeEventListener("touchstart", handleTouchStart);
            window.removeEventListener("touchmove", handleTouchMove);
        };
    }, { scope: containerRef });

    return (
        <div ref={containerRef} id="section2_main_div">
            <Navbar />
            <main className="selected-work-content">
                <section className="video-showcase-placeholder" aria-label="Video showcase coming soon">
                    <div className="placeholder-line" aria-hidden="true" />
                </section>
                <PhotoGallery />
            </main>
        </div>
    );
};

export default Section2;