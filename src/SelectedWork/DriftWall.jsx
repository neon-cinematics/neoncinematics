import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "./DriftWall.css";

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const columnFactor = (index, variance) => 1 + variance * ((((index * 0.6180339887 + 0.35) % 1) * 2) - 1);

const DriftWall = ({
    items = [], columns = 4, tileWidth = 230, tileHeight = 150, gap = 18, radius = 10,
    tilt = 14, turn = -10, roll = 0, perspective = 1400, depth = 160, speed = 38,
    direction = "up", variance = 0.45, parallax = 0.6, pauseOnHover = true, lift = 70,
    fade = 0.58, dim = 0.7, grayscale = false, overlayColor = "#07090d", className = "", style,
}) => {
    const containerRef = useRef(null);
    const planeRef = useRef(null);
    const trackRefs = useRef([]);
    const offsetsRef = useRef([]);
    const velocitiesRef = useRef([]);
    const animationFrameRef = useRef(null);
    const pointerRef = useRef({ x: 0, y: 0 });
    const dampedPointerRef = useRef({ x: 0, y: 0 });
    const hoveredColumnRef = useRef(-1);
    const wallHoveredRef = useRef(false);
    const lastTimestampRef = useRef(null);
    const [containerHeight, setContainerHeight] = useState(600);
    const [activeId, setActiveId] = useState(null);
    const [reduced, setReduced] = useState(prefersReducedMotion);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        const onChange = (event) => setReduced(event.matches);
        mediaQuery.addEventListener("change", onChange);
        return () => mediaQuery.removeEventListener("change", onChange);
    }, []);

    const columnItems = useMemo(() => {
        const result = Array.from({ length: columns }, () => []);
        items.forEach((item, index) => result[index % columns].push(item));
        return result;
    }, [columns, items]);

    const columnMeta = useMemo(() => columnItems.map((column) => {
        const copyHeight = Math.max(tileHeight + gap, column.length * (tileHeight + gap));
        return { copyHeight, copies: Math.max(2, Math.ceil((containerHeight * 1.6) / copyHeight) + 1) };
    }), [columnItems, containerHeight, gap, tileHeight]);

    useLayoutEffect(() => {
        if (!containerRef.current) return undefined;
        const observer = new ResizeObserver(([entry]) => setContainerHeight(entry.contentRect.height || 600));
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const baseVelocities = useMemo(() => columnItems.map((_, index) => {
        const sign = direction === "up" ? 1 : -1;
        return speed * columnFactor(index, variance) * sign * (index % 2 === 0 ? 1 : -1);
    }), [columnItems, direction, speed, variance]);

    useEffect(() => {
        offsetsRef.current = columnMeta.map((meta, index) => meta.copyHeight * ((index * 0.37) % 1));
        velocitiesRef.current = columnItems.map(() => 0);
    }, [columnItems, columnMeta]);

    const applyPlaneTransform = useCallback((pointerX, pointerY) => {
        if (!planeRef.current) return;
        planeRef.current.style.transform = `translate(-50%, -50%) scale(1.16) rotateX(${tilt + pointerY}deg) rotateY(${turn + pointerX}deg) rotateZ(${roll}deg) translateZ(${-depth}px)`;
    }, [depth, roll, tilt, turn]);

    useEffect(() => {
        const animate = (timestamp) => {
            if (lastTimestampRef.current === null) lastTimestampRef.current = timestamp;
            const delta = Math.min(0.05, Math.max(0, timestamp - lastTimestampRef.current) / 1000);
            lastTimestampRef.current = timestamp;
            const maxTilt = parallax * 8;
            const targetX = pointerRef.current.x * maxTilt;
            const targetY = -pointerRef.current.y * maxTilt;
            const damping = 1 - Math.exp(-delta / 0.12);
            dampedPointerRef.current.x += (targetX - dampedPointerRef.current.x) * damping;
            dampedPointerRef.current.y += (targetY - dampedPointerRef.current.y) * damping;
            applyPlaneTransform(dampedPointerRef.current.x, dampedPointerRef.current.y);

            columnMeta.forEach((meta, index) => {
                const track = trackRefs.current[index];
                if (!track) return;
                const paused = reduced || (wallHoveredRef.current && pauseOnHover) || hoveredColumnRef.current === index;
                const target = paused ? 0 : baseVelocities[index];
                const ease = 1 - Math.exp(-delta / (target === 0 ? 0.16 : 0.28));
                velocitiesRef.current[index] += (target - velocitiesRef.current[index]) * ease;
                const next = (((offsetsRef.current[index] || 0) + velocitiesRef.current[index] * delta) % meta.copyHeight + meta.copyHeight) % meta.copyHeight;
                offsetsRef.current[index] = next;
                track.style.transform = `translate3d(0, ${-next}px, 0)`;
            });
            animationFrameRef.current = requestAnimationFrame(animate);
        };
        animationFrameRef.current = requestAnimationFrame(animate);
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
            lastTimestampRef.current = null;
        };
    }, [applyPlaneTransform, baseVelocities, columnMeta, parallax, pauseOnHover, reduced]);

    const onPointerMove = (event) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect && parallax > 0 && !reduced) pointerRef.current = { x: (event.clientX - rect.left) / rect.width - 0.5, y: (event.clientY - rect.top) / rect.height - 0.5 };
        const tile = event.target.closest?.("[data-tile-id]");
        if (tile) { setActiveId(tile.dataset.tileId); hoveredColumnRef.current = Number(tile.dataset.col); }
    };

    const renderTile = (item, id, column) => {
        const content = <span className="drift-wall__inner"><img src={item.image} alt={item.title || ""} loading="lazy" decoding="async" draggable="false" /><span className="drift-wall__overlay" aria-hidden="true" /></span>;
        const props = { className: `drift-wall__tile${activeId === id ? " is-active" : ""}`, "data-tile-id": id, "data-col": column, onFocus: () => setActiveId(id), onBlur: () => setActiveId(null) };
        return item.href ? <a key={id} href={item.href} target="_blank" rel="noreferrer noopener" {...props}>{content}</a> : <div key={id} tabIndex="0" role="button" aria-label={item.title || "Gallery image"} {...props}>{content}</div>;
    };

    const cssVars = { "--dw-tile-w": `${tileWidth}px`, "--dw-tile-h": `${tileHeight}px`, "--dw-gap": `${gap}px`, "--dw-radius": `${radius}px`, "--dw-perspective": `${perspective}px`, "--dw-lift": `${lift}px`, "--dw-dim": dim, "--dw-gray": grayscale ? 1 : 0, "--dw-overlay": overlayColor, "--dw-edge": `${Math.max(0, (1 - fade) * 100)}%`, ...style };
    return <div ref={containerRef} className={`drift-wall${reduced ? " drift-wall--reduced" : ""} ${className}`} style={cssVars} onPointerMove={onPointerMove} onPointerEnter={() => { wallHoveredRef.current = true; }} onPointerLeave={() => { wallHoveredRef.current = false; pointerRef.current = { x: 0, y: 0 }; hoveredColumnRef.current = -1; setActiveId(null); }} role="group" aria-label="Selected work gallery"><div ref={planeRef} className="drift-wall__plane">{columnItems.map((column, columnIndex) => <div className="drift-wall__col" key={columnIndex}><div className="drift-wall__track" ref={(element) => { trackRefs.current[columnIndex] = element; }}>{Array.from({ length: columnMeta[columnIndex].copies }).flatMap((_, copyIndex) => column.map((item, itemIndex) => renderTile(item, `${columnIndex}-${copyIndex}-${itemIndex}`, columnIndex)))}</div></div>)}</div></div>;
};

export default DriftWall;