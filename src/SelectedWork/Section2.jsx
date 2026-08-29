import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../Navbar/Navbar";
import "./Section2.css";

const Section2 = () => {
    const navigate = useNavigate();

    useEffect(() => {
        if ("scrollRestoration" in window.history) {
            window.history.scrollRestoration = "manual";
        }
        window.scrollTo(0, 0);

        let isTransitioning = false;

        const handleScroll = (e) => {
            if (e.deltaY < 0 && window.scrollY <= 5 && !isTransitioning) {
                isTransitioning = true;
                navigate("/");
            }
        };

        let startY = 0;
        const handleTouchStart = (e) => {
            startY = e.touches[0].clientY;
        };

        const handleTouchMove = (e) => {
            if (isTransitioning) return;
            const currentY = e.touches[0].clientY;

            if (currentY - startY > 50 && window.scrollY <= 5) {
                isTransitioning = true;
                navigate("/");
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
    }, [navigate]);

    return (
        <div id="section2_main_div">
            <Navbar />
            
        </div>
    );
};

export default Section2;