import { useEffect, useMemo, useRef, useState } from "react";
import "./DriftWall.css";
import Galaxy from "./Galaxy";

const CARD_POSITIONS = [
    [-28, -27, 130, -8], [0, -32, -40, 5], [29, -28, 80, 7],
    [-34, 4, -10, 4], [-10, 2, 105, -4], [23, 3, -80, 6],
    [-27, 35, 40, 3], [2, 32, -70, -5], [29, 35, 110, 5],
    [-38, 17, -100, -7], [13, 17, 60, 3], [39, 8, -30, 8],
];

const getCardPosition = (index) => {
    const layerIndex = Math.floor(index / 4);
    const layerOffset = (index % 4) * 47;
    if (CARD_POSITIONS[index]) {
        const [x, y, z, rotate] = CARD_POSITIONS[index];
        return [x * 1.3 + (layerIndex % 2 ? 3 : -3), y * 1.3 + layerOffset / 8, z + (layerIndex - 1) * 562.5 + (index % 4) * 142.5, rotate];
    }
    const angle = index * 2.39996;
    const radius = 22 + (index % 4) * 6;
    return [Math.sin(angle) * radius * 1.3, Math.cos(angle * 1.19) * 38 * 1.3 + layerOffset / 8, (layerIndex - 1) * 562.5 + (index % 4) * 142.5, ((index % 5) - 2) * 1.5];
};

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

const DriftWall = ({
    items = [], images = [], cardCount = items.length || images.length, perspective = 2500, mouseSensitivity = 3,
    cardWidth, cardHeight, animationDuration = 1.2, enableDepthFog = true,
    fogIntensity = 0.3, enableMagneticAttraction = true, magneticStrength = 20,
    onCardClick, className = "",
}) => {
    const wallRef = useRef(null);
    const pointerRef = useRef({ x: 0, y: 0 });
    const cardRefs = useRef([]);
    const currentRef = useRef({ x: 0, y: 0 });
    const cameraDepthRef = useRef(0);
    const initialDepthSetRef = useRef(false);
    const frameRef = useRef(null);
    const [visible, setVisible] = useState(false);
    const [selected, setSelected] = useState(-1);
    const [cameraDepth, setCameraDepth] = useState(0);
    const [parallaxEnabled, setParallaxEnabled] = useState(true);
    const sourceItems = items.length ? items : images.map((image) => ({ image }));
    const cards = sourceItems.slice(0, cardCount);
    const cardPositions = useMemo(() => cards.map((_, index) => getCardPosition(index)), [cards]);
    const depthBounds = useMemo(() => {
        if (!cardPositions.length) return { min: -500, max: 500 };
        const depths = cardPositions.map((position) => position[2]);
        const spread = Math.max(360, Math.max(...depths) - Math.min(...depths));
        return { min: Math.min(-360, Math.min(...depths) - spread * 0.35), max: Math.max(360, Math.max(...depths) + spread * 0.35) };
    }, [cardPositions]);

    useEffect(() => {
        if (initialDepthSetRef.current || !cards.length) return;
        const initialDepth = depthBounds.min;
        cameraDepthRef.current = initialDepth;
        setCameraDepth(initialDepth);
        wallRef.current?.style.setProperty("--camera-z", `${initialDepth}px`);
        initialDepthSetRef.current = true;
    }, [cards.length, depthBounds]);

    useEffect(() => {
        if (!wallRef.current) return undefined;
        const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.18 });
        observer.observe(wallRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!visible) return undefined;
        const animate = () => {
            const depthRange = Math.max(Math.abs(depthBounds.min), Math.abs(depthBounds.max));
            const depthProgress = Math.min(1, Math.abs(cameraDepthRef.current) / depthRange);
            const depthSensitivity = 1 + Math.pow(depthProgress, 0.82) * 2.2;
            const targetX = (parallaxEnabled ? pointerRef.current.x : 0) * depthSensitivity;
            const targetY = (parallaxEnabled ? pointerRef.current.y : 0) * depthSensitivity;
            currentRef.current.x += (targetX - currentRef.current.x) * 0.08;
            currentRef.current.y += (targetY - currentRef.current.y) * 0.08;
            wallRef.current?.style.setProperty("--mouse-x", `${currentRef.current.x}deg`);
            wallRef.current?.style.setProperty("--mouse-y", `${currentRef.current.y}deg`);
            wallRef.current?.style.setProperty("--view-x", `${parallaxEnabled ? (pointerRef.current.viewX || 0) * depthSensitivity : 0}px`);
            wallRef.current?.style.setProperty("--view-y", `${parallaxEnabled ? (pointerRef.current.viewY || 0) * depthSensitivity : 0}px`);
            wallRef.current?.style.setProperty("--cursor-z", `${parallaxEnabled ? (pointerRef.current.zoomZ || 0) * depthSensitivity : 0}px`);
            if (selected >= 0) {
                wallRef.current?.style.setProperty("--focus-z", `${Math.max(720, 480 - cameraDepthRef.current)}px`);
            }
            cardRefs.current.forEach((card, index) => {
                if (!card || selected === index) return;
                const relativeDepth = cardPositions[index][2] + cameraDepthRef.current + (pointerRef.current.zoomZ || 0);
                const depthMovement = Math.abs(cameraDepthRef.current) + Math.abs(pointerRef.current.zoomZ || 0);
                const nearFade = depthMovement > 10 ? clamp((relativeDepth - 720) / 620, 0, 1) : 0;
                card.style.setProperty("--viewer-opacity", `${1 - nearFade}`);
                card.style.setProperty("--overlap-opacity", "1");
                const wallBounds = wallRef.current?.getBoundingClientRect();
                const cardBounds = card.getBoundingClientRect();
                const inCanvas = wallBounds && cardBounds.right > wallBounds.left && cardBounds.left < wallBounds.right && cardBounds.bottom > wallBounds.top && cardBounds.top < wallBounds.bottom;
                const visibleToViewer = nearFade < 0.96 && inCanvas;
                card.style.pointerEvents = visibleToViewer ? "auto" : "none";
            });
            const selectedCard = selected >= 0 ? cardRefs.current[selected] : null;
            if (selectedCard) {
                const selectedRect = selectedCard.getBoundingClientRect();
                const wallBounds = wallRef.current?.getBoundingClientRect();
                cardRefs.current.forEach((card, index) => {
                    if (!card || index === selected) return;
                    const rect = card.getBoundingClientRect();
                    const overlaps = rect.left < selectedRect.right && rect.right > selectedRect.left && rect.top < selectedRect.bottom && rect.bottom > selectedRect.top;
                    const inCanvas = wallBounds && rect.right > wallBounds.left && rect.left < wallBounds.right && rect.bottom > wallBounds.top && rect.top < wallBounds.bottom;
                    card.style.setProperty("--overlap-opacity", overlaps ? "0" : "1");
                    card.style.pointerEvents = overlaps || !inCanvas ? "none" : "auto";
                });
            }
            frameRef.current = requestAnimationFrame(animate);
        };
        frameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameRef.current);
    }, [cardPositions, depthBounds, parallaxEnabled, selected, visible]);

    const handlePointerMove = (event) => {
        const bounds = wallRef.current?.getBoundingClientRect();
        if (!bounds) return;
        const x = event.clientX / bounds.width - (bounds.left / bounds.width) - 0.5;
        const y = event.clientY / bounds.height - (bounds.top / bounds.height) - 0.5;
        pointerRef.current = parallaxEnabled ? {
            x: y * -mouseSensitivity * 0.8,
            y: x * mouseSensitivity,
            viewX: x * 3.6,
            viewY: y * 2.8,
            zoomZ: Math.sqrt((x * x) + (y * y)) * 22,
        } : { x: 0, y: 0, zoomZ: 0 };
        cardRefs.current.forEach((card, index) => {
            if (!card) return;
            const [cardX, cardY] = getCardPosition(index);
            const distance = Math.min(1, Math.hypot(cardX / 65 - x, cardY / 65 - y));
            const layerDistance = Math.min(1, Math.abs(index - Math.round((x + 0.5) * Math.max(cards.length - 1, 1))) / 10);
            const focusDistance = Math.min(1, distance * 0.42 + layerDistance * 0.18);
            card.style.setProperty("--viewer-blur", `${focusDistance * 1.8}px`);
            card.style.setProperty("--viewer-opacity", "1");
        });
        if (enableMagneticAttraction && parallaxEnabled) {
            wallRef.current.style.setProperty("--magnetic-x", `${x * magneticStrength / 20}px`);
            wallRef.current.style.setProperty("--magnetic-y", `${y * magneticStrength / 20}px`);
        }
    };

    const handleCardClick = (event, index, item) => {
        event.preventDefault();
        const next = selected === index ? -1 : index;
        setSelected(next);
        if (next >= 0) {
            const ratio = item.aspectRatio || 1.5;
            const baseMaxWidth = Math.min(window.innerWidth * 0.4, 640);
            const maxWidth = ratio < 1 ? baseMaxWidth * 0.5 : baseMaxWidth;
            const maxHeight = window.innerHeight * 0.68;
            const focusWidth = Math.min(maxWidth, maxHeight * ratio);
            wallRef.current?.style.setProperty("--focus-width", `${focusWidth}px`);
            wallRef.current?.style.setProperty("--focus-height", `${focusWidth / ratio}px`);
            wallRef.current?.style.setProperty("--focus-z", `${Math.max(720, 480 - cameraDepthRef.current)}px`);
        }
        onCardClick?.(index, item.image);
    };

    const handleWheel = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (Math.abs(event.deltaY) < 8) return;
        const nextDepth = cameraDepthRef.current - event.deltaY * 1;
        const boundedDepth = Math.max(depthBounds.min, Math.min(depthBounds.max, nextDepth));
        cameraDepthRef.current = boundedDepth;
        setCameraDepth(boundedDepth);
        wallRef.current?.style.setProperty("--camera-z", `${cameraDepthRef.current}px`);
    };

    const handleDepthChange = (event) => {
        cameraDepthRef.current = Number(event.target.value);
        setCameraDepth(cameraDepthRef.current);
        wallRef.current?.style.setProperty("--camera-z", `${cameraDepthRef.current}px`);
    };

    const handleParallaxToggle = () => {
        setParallaxEnabled((enabled) => {
            const nextEnabled = !enabled;
            if (!nextEnabled) {
                pointerRef.current = { x: 0, y: 0, zoomZ: 0 };
                wallRef.current?.style.setProperty("--magnetic-x", "0px");
                wallRef.current?.style.setProperty("--magnetic-y", "0px");
            }
            return nextEnabled;
        });
    };

    return <div className="parallax-cards-shell"><div ref={wallRef} className={`parallax-cards${visible ? " is-visible" : ""}${selected >= 0 ? " has-selection" : ""} ${className}`} style={{ "--perspective": `${perspective}px`, "--camera-z": "0px", "--cursor-z": "0px", "--view-x": "0px", "--view-y": "0px", "--card-width": cardWidth ? `${cardWidth}px` : undefined, "--card-height": cardHeight ? `${cardHeight}px` : undefined, "--duration": `${animationDuration}s`, "--fog": enableDepthFog ? fogIntensity : 0 }} onPointerMove={handlePointerMove} onWheelCapture={handleWheel} onTouchMove={(event) => event.preventDefault()} onPointerLeave={() => { pointerRef.current = { x: 0, y: 0, zoomZ: 0 }; wallRef.current?.style.setProperty("--magnetic-x", "0px"); wallRef.current?.style.setProperty("--magnetic-y", "0px"); wallRef.current?.style.setProperty("--cursor-z", "0px"); }} role="group" aria-label="Selected work gallery">
        <Galaxy density={1.35} speed={0.12} glowIntensity={0.8} saturation={0.75} />
        <div className="parallax-cards__stage">
            {cards.map((item, index) => {
                const [x, y, z, rotate] = cardPositions[index];
                const isSelected = selected === index;
                const card = <span className="parallax-card__surface"><img src={item.image} alt={item.title || ""} loading="lazy" decoding="async" draggable="false" /><span className="parallax-card__highlight" aria-hidden="true" /></span>;
                    const props = { ref: (card) => { cardRefs.current[index] = card; }, className: `parallax-card${isSelected ? " is-selected" : ""}`, style: { "--x": `${x}%`, "--y": `${y}%`, "--z": `${z}px`, "--rotate": `${rotate}deg`, "--ratio": item.aspectRatio || 1.5, "--index": index }, onClick: (event) => handleCardClick(event, index, item) };
                return item.href ? <a {...props} href={item.href} target="_blank" rel="noreferrer noopener" key={`${item.image}-${index}`}>{card}</a> : <button {...props} type="button" aria-label={item.title || "Open gallery image"} key={`${item.image}-${index}`}>{card}</button>;
            })}
        </div>
    </div><div className="parallax-controls"><button className={`parallax-toggle${parallaxEnabled ? " is-on" : ""}`} type="button" onClick={handleParallaxToggle} aria-pressed={parallaxEnabled}>{parallaxEnabled ? "Parallax on" : "Parallax off"}</button><label className="parallax-depth-control"><span>Image depth</span><input type="range" min={depthBounds.min} max={depthBounds.max} value={cameraDepth} onChange={handleDepthChange} aria-label="Move through image depth" /></label></div></div>;
};

export default DriftWall;
