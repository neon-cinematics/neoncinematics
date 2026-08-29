import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Navbar from "../Navbar/Navbar";
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

            // Scroll up (negative) - go back to home with smooth transition
            if (scrollAccumulator < -SCROLL_THRESHOLD) {
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

            // Scroll down (positive) - go to next page
            if (scrollAccumulator > SCROLL_THRESHOLD) {
                isTransitioning = true;
                
                const container = containerRef.current;
                if (container) {
                    gsap.to(container, {
                        scale: 0.8,
                        opacity: 0,
                        duration: 0.6,
                        ease: "power2.out",
                        onComplete: () => {
                            navigate("/about");
                        }
                    });
                } else {
                    navigate("/about");
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

            // Swipe up (positive delta) - go back to home
            if (delta > 80) {
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

            // Swipe down (negative delta) - go to next page
            if (delta < -80) {
                isTransitioning = true;
                
                const container = containerRef.current;
                if (container) {
                    gsap.to(container, {
                        scale: 0.8,
                        opacity: 0,
                        duration: 0.6,
                        ease: "power2.out",
                        onComplete: () => {
                            navigate("/about");
                        }
                    });
                } else {
                    navigate("/about");
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
        </div>
    );
};

export default Section2;