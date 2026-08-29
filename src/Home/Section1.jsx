import { useRef } from "react";
import Navbar from "../Navbar/Navbar.jsx";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useNavigate, useLocation } from "react-router-dom";

gsap.registerPlugin(ScrollTrigger);

const Section1 = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const container = useRef();
    const videoRef = useRef();

    useGSAP(() => {
        const video = videoRef.current;
        if (!video) return;

        // Always reset scroll to the top of the page on mount and disable automatic browser scroll restoration
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }
        window.scrollTo(0, 0);

        const anchorX = 0.78;
        const anchorY = 0.28;
        const maxScale = 5;

        let isSnapping = false;
        let isTransitioning = false;
        let snapTween = null;
        let scrollTimeout = null;

        // Kill active auto-scrolling on user interaction
        const killSnap = () => {
            if (isTransitioning) return;
            if (snapTween) {
                snapTween.kill();
                snapTween = null;
                isSnapping = false;
            }
        };

        window.addEventListener("wheel", killSnap);
        window.addEventListener("touchmove", killSnap);
        window.addEventListener("pointerdown", killSnap);

        ScrollTrigger.create({
            trigger: "#section1_video_div",
            start: "top 12%",
            end: "bottom bottom",
            scrub: 3,
            onUpdate: self => {
                const progress = self.progress;
                const scale = 1 + (maxScale - 1) * (progress ** 3);

                const vw = window.innerWidth;
                const vh = window.innerHeight;

                const tx = (vw * anchorX - vw / 2) * (scale - 1);
                const ty = (vh * anchorY - vh / 2) * (scale - 1);

                gsap.set(video, {
                    scale,
                    x: -tx,
                    y: -ty,
                    force3D: true,
                });

                clearTimeout(scrollTimeout);

                // Auto-complete, fade out, and transition to /work (Threshold >= 60%)
                if (progress >= 0.46 && self.direction === 1 && !isSnapping && !isTransitioning) {
                    isSnapping = true;
                    isTransitioning = true;

                    // Fade out video swiftly
                    gsap.to(video, {
                        opacity: 0,
                        duration: 0.5,
                        ease: "power2.out",
                    });

                    const scrollObj = { y: window.scrollY };
                    snapTween = gsap.to(scrollObj, {
                        y: self.end,
                        duration: 0.5,
                        ease: "power2.out",
                        onUpdate: () => {
                            window.scrollTo(0, scrollObj.y);
                        },
                        onComplete: () => {
                            isSnapping = false;
                            snapTween = null;
                            navigate("/work");
                        }
                    });
                }

                // Auto-reset 
                if (progress <= 0.54 && self.direction === -1 && !isSnapping && window.scrollY > 0) {
                    isSnapping = true;
                    const scrollObj = { y: window.scrollY };
                    snapTween = gsap.to(scrollObj, {
                        y: self.start,
                        duration: 0.8,
                        ease: "power2.out",
                        onUpdate: () => {
                            window.scrollTo(0, scrollObj.y);
                        },
                        onComplete: () => {
                            isSnapping = false;
                            snapTween = null;
                        }
                    });
                }

                // Scroll-Stop Reset (If stopped in middle: 0 < progress < 65%)
                if (progress > 0 && progress < 0.46 && !isSnapping) {
                    scrollTimeout = setTimeout(() => {
                        if (self.progress > 0 && self.progress < 0.46 && !isSnapping) {
                            isSnapping = true;
                            const scrollObj = { y: window.scrollY };
                            snapTween = gsap.to(scrollObj, {
                                y: self.start,
                                duration: 0.8,

                                ease: "power2.out",
                                onUpdate: () => {
                                    window.scrollTo(0, scrollObj.y);
                                },
                                onComplete: () => {
                                    isSnapping = false;
                                    snapTween = null;
                                }
                            });
                        }
                    }, 150);
                }
            }
        });

        gsap.to('#div1', {
            scrollTrigger: {
                trigger: "#section1_video_div",
                start: "top 12%",
                end: "bottom bottom",
                scrub: 1.5,

            },
            opacity: 0,
            x: 300,
            y: 120,
            scale: 0,
            rotateX: 360,
            transformOrigin: "bottom",
            ease: "power1.inOut",
        });

        gsap.from('#div1', {
            opacity: 0,
            x: 300,
            y: 120,
            duration: 2,
            delay: 0,
            scale: 0,
            rotateX: 360,
            ease: "elastic.out(.8, 1)",
            transformOrigin: "bottom",
        });

        gsap.from('#div1', {
            rotationY: 6,
            skewY: 1,
            skewX: 1,
            duration: 3,
            delay: 1,
            ease: "back.inOut(1)",
            repeat: -1,
            yoyo: true,
        });

        gsap.from(video, {
            opacity: 0,
            duration: 2,
            ease: "power3.in"
        });

        gsap.from(video, {
            skewX: 1,
            repeat: -1,
            duration: 5,
            yoyo: true,
            ease: 'back.inOut',
        });

        return () => {
            window.removeEventListener("wheel", killSnap);
            window.removeEventListener("touchmove", killSnap);
            window.removeEventListener("pointerdown", killSnap);
        };

    }, { scope: container });

    return (
        <div ref={container} style={{ position: "relative" }}>
            <Navbar />
            <div id="div_section1_wrapper">
                <div id="div1">
                    <h1 id="section1_main_text">A Cinematography and Filmmaking Club,<br />Unleashing the Creativity</h1>
                    <p id="scroll_text">Scroll to Explore More</p>
                </div>

                <div id="section1_video_div" style={{ minHeight: "150vh" }}>
                    <video ref={videoRef} src="/page1animationv2.mp4" autoPlay loop muted></video>
                </div>
            </div>
        </div>
    );
};

export default Section1;
