import { useEffect, useRef } from "react";
import "./Galaxy.css";

const Galaxy = ({ density = 1.35, speed = 0.12, glowIntensity = 0.8, saturation = 0.75, mouseInteraction = true }) => {
    const canvasRef = useRef(null);
    const pointerRef = useRef({ x: 0.5, y: 0.5 });

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = canvas?.parentElement;
        if (!canvas || !container) return undefined;
        const context = canvas.getContext("2d");
        let width = 0;
        let height = 0;
        let animationFrame;
        let startTime = performance.now();
        let stars = [];

        const resize = () => {
            const ratio = Math.min(window.devicePixelRatio || 1, 2);
            width = container.clientWidth;
            height = container.clientHeight;
            canvas.width = width * ratio;
            canvas.height = height * ratio;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            const count = Math.max(90, Math.floor(width * height / 8500 * density));
            stars = Array.from({ length: count }, (_, index) => ({
                angle: (index * 2.39996) % (Math.PI * 2),
                radius: Math.pow((index + 1) / count, 0.72) * Math.max(width, height) * 0.72,
                depth: 0.25 + ((index * 0.618) % 1) * 0.75,
                size: 0.45 + ((index * 0.173) % 1) * 1.45,
                hue: 165 + ((index * 47) % 100),
                phase: (index * 1.73) % (Math.PI * 2),
            }));
        };

        const draw = (timestamp) => {
            const elapsed = (timestamp - startTime) / 1000;
            context.clearRect(0, 0, width, height);
            const centerX = width * (0.5 + (pointerRef.current.x - 0.5) * 0.08);
            const centerY = height * (0.5 + (pointerRef.current.y - 0.5) * 0.08);
            stars.forEach((star) => {
                const angle = star.angle + elapsed * speed * (0.25 + star.depth * 0.5);
                const x = centerX + Math.cos(angle) * star.radius;
                const y = centerY + Math.sin(angle) * star.radius * 0.46;
                if (x < -8 || x > width + 8 || y < -8 || y > height + 8) return;
                const twinkle = 0.7 + Math.sin(elapsed * 1.8 + star.phase) * 0.3;
                const alpha = (0.18 + star.depth * 0.7) * twinkle;
                const color = `hsla(${star.hue}, ${saturation * 100}%, 78%, ${alpha})`;
                context.shadowBlur = star.size * 8 * glowIntensity;
                context.shadowColor = color;
                context.fillStyle = color;
                context.beginPath();
                context.arc(x, y, star.size * (0.7 + star.depth * 0.55), 0, Math.PI * 2);
                context.fill();
            });
            context.shadowBlur = 0;
            animationFrame = requestAnimationFrame(draw);
        };

        const handlePointerMove = (event) => {
            const bounds = container.getBoundingClientRect();
            pointerRef.current = { x: (event.clientX - bounds.left) / bounds.width, y: (event.clientY - bounds.top) / bounds.height };
        };
        resize();
        window.addEventListener("resize", resize);
        if (mouseInteraction) container.addEventListener("pointermove", handlePointerMove);
        animationFrame = requestAnimationFrame(draw);
        return () => {
            cancelAnimationFrame(animationFrame);
            window.removeEventListener("resize", resize);
            if (mouseInteraction) container.removeEventListener("pointermove", handlePointerMove);
        };
    }, [density, glowIntensity, mouseInteraction, saturation, speed]);

    return <canvas ref={canvasRef} className="galaxy-canvas" aria-hidden="true" />;
};

export default Galaxy;
