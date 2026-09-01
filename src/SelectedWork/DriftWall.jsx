import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import "./DriftWall.css";
import Galaxy from "./Galaxy";

const getCardPosition = (index) => {
    if (index === 0) return [0, 0, 0, 0];
    const angle = index * 2.39996;
    const radius = Math.sqrt(index) * 15;
    const x = Math.sin(angle) * radius;
    const y = Math.cos(angle) * radius;
    const layerIndex = Math.floor(index / 4);
    const z = (layerIndex - 1) * 500 + (index % 4) * 100;
    const rotate = ((index % 5) - 2) * 2;
    return [x, y, z, rotate];
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
    const isDraggingRef = useRef(false);
    const lastPointerPosRef = useRef({ x: 0, y: 0 });
    const manualPanRef = useRef({ x: 0, y: 0 });
    const [visible, setVisible] = useState(false);
    const getCardPosition = (index) => {
        if (index === 0) return [0, 0, 0, 0];
        const angle = index * 2.39996;
        const radius = Math.sqrt(index) * 15;
        const x = Math.sin(angle) * radius;
        const y = Math.cos(angle) * radius;
        const layerIndex = Math.floor(index / 4);
        const z = (layerIndex * 500) + (index % 4) * 100 - 300;
        const rotate = ((index % 5) - 2) * 2;
        return [x, y, z, rotate];
    };
    const [selected, setSelected] = useState(-1);
    const [cameraDepth, setCameraDepth] = useState(0);
    const [parallaxEnabled, setParallaxEnabled] = useState(true);
    const sourceItems = items.length ? items : images.map((image) => ({ image }));
    const cards = sourceItems.slice(0, cardCount);
    const cardPositions = useMemo(() => cards.map((_, i) => getCardPosition(i)), [cards]);

    const depthBounds = useMemo(() => {
        if (!cardPositions.length) return { min: 0, max: 0, startDepth: 0 };
        const depths = cardPositions.map((position) => position[2]);
        const minZ = Math.min(...depths);
        const maxZ = Math.max(...depths);
        const padding = 1500;
        return {
            min: -maxZ - padding,
            max: -minZ + padding + 720,
            startDepth: -maxZ - 400
        };
    }, [cardPositions]);

    useEffect(() => {
        if (!initialDepthSetRef.current && depthBounds.startDepth !== undefined) {
            cameraDepthRef.current = depthBounds.startDepth;
            setCameraDepth(depthBounds.startDepth);
            wallRef.current?.style.setProperty("--camera-z", `${depthBounds.startDepth}px`);
            initialDepthSetRef.current = true;
        }
    }, [depthBounds]);

    useEffect(() => {
        if (!wallRef.current) return undefined;
        const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.18 });
        observer.observe(wallRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === "Escape" && selected >= 0) {
                setSelected(-1);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selected]);

    useEffect(() => {
        if (!visible) return undefined;
        const animate = () => {
            const depthRange = Math.max(Math.abs(depthBounds.min), Math.abs(depthBounds.max));
            const depthProgress = Math.min(1, Math.abs(cameraDepthRef.current) / depthRange);
            const depthSensitivity = 1 + Math.pow(depthProgress, 0.82) * 2.2;
            const isParallaxActive = parallaxEnabled && selected < 0;
            const targetX = (isParallaxActive ? pointerRef.current.x : 0) * depthSensitivity;
            const targetY = (isParallaxActive ? pointerRef.current.y : 0) * depthSensitivity;
            currentRef.current.x += (targetX - currentRef.current.x) * 0.08;
            currentRef.current.y += (targetY - currentRef.current.y) * 0.08;
            wallRef.current?.style.setProperty("--mouse-x", `${currentRef.current.x}deg`);
            wallRef.current?.style.setProperty("--mouse-y", `${currentRef.current.y}deg`);
            wallRef.current?.style.setProperty("--view-x", `${isParallaxActive ? (pointerRef.current.viewX || 0) * depthSensitivity : 0}px`);
            wallRef.current?.style.setProperty("--view-y", `${isParallaxActive ? (pointerRef.current.viewY || 0) * depthSensitivity : 0}px`);
            wallRef.current?.style.setProperty("--cursor-z", `${isParallaxActive ? (pointerRef.current.zoomZ || 0) * depthSensitivity : 0}px`);
            if (selected >= 0) {
                wallRef.current?.style.setProperty("--focus-z", `${Math.max(720, 480 - cameraDepthRef.current)}px`);
            }
            cardRefs.current.forEach((card, index) => {
                if (!card || selected === index) return;
                const relativeDepth = cardPositions[index][2] + cameraDepthRef.current + (pointerRef.current.zoomZ || 0);
                const depthMovement = Math.abs(cameraDepthRef.current) + Math.abs(pointerRef.current.zoomZ || 0);
                const nearFade = depthMovement > 10 ? clamp((relativeDepth - 720) / 620, 0, 1) : 0;
                const opacityValue = 1 - nearFade;
                card.style.setProperty("--viewer-opacity", `${opacityValue < 0.5 ? 0 : opacityValue}`);
                card.style.setProperty("--overlap-opacity", "1");
                const visibleToViewer = opacityValue >= 0.5;
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
                    card.style.setProperty("--overlap-opacity", overlaps ? "0" : "1");
                    const viewerOpacityStr = card.style.getPropertyValue("--viewer-opacity");
                    const isVisibleToViewer = viewerOpacityStr ? parseFloat(viewerOpacityStr) >= 0.5 : true;
                    card.style.pointerEvents = overlaps || !isVisibleToViewer ? "none" : "auto";
                });
            }
            frameRef.current = requestAnimationFrame(animate);
        };
        frameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameRef.current);
    }, [cardPositions, depthBounds, parallaxEnabled, selected, visible]);

    const handlePointerDown = (event) => {
        if (parallaxEnabled || selected >= 0) return;
        isDraggingRef.current = true;
        lastPointerPosRef.current = { x: event.clientX, y: event.clientY };
        wallRef.current?.style.setProperty("cursor", "grabbing");
    };

    const handlePointerUp = () => {
        isDraggingRef.current = false;
        if (!parallaxEnabled) wallRef.current?.style.setProperty("cursor", "grab");
    };

    const handlePointerMove = (event) => {
        const bounds = wallRef.current?.getBoundingClientRect();
        if (!bounds) return;

        if (!parallaxEnabled) {
            if (isDraggingRef.current) {
                const deltaX = event.clientX - lastPointerPosRef.current.x;
                const deltaY = event.clientY - lastPointerPosRef.current.y;
                manualPanRef.current.x = clamp(manualPanRef.current.x + deltaX * 1.5, -600, 600);
                manualPanRef.current.y = clamp(manualPanRef.current.y + deltaY * 1.5, -600, 600);
                lastPointerPosRef.current = { x: event.clientX, y: event.clientY };

                wallRef.current.style.setProperty("--magnetic-x", `${manualPanRef.current.x}px`);
                wallRef.current.style.setProperty("--magnetic-y", `${manualPanRef.current.y}px`);
            }
            return;
        }

        const x = event.clientX / bounds.width - (bounds.left / bounds.width) - 0.5;
        const y = event.clientY / bounds.height - (bounds.top / bounds.height) - 0.5;
        pointerRef.current = {
            x: y * -mouseSensitivity * 0.8,
            y: x * mouseSensitivity,
            viewX: x * 3.6,
            viewY: y * 2.8,
            zoomZ: Math.sqrt((x * x) + (y * y)) * 22,
        };
        cardRefs.current.forEach((card, index) => {
            if (!card) return;
            const [cardX, cardY] = getCardPosition(index);
            const distance = Math.min(1, Math.hypot(cardX / 65 - x, cardY / 65 - y));
            const layerDistance = Math.min(1, Math.abs(index - Math.round((x + 0.5) * Math.max(cards.length - 1, 1))) / 10);
            const focusDistance = Math.min(1, distance * 0.42 + layerDistance * 0.18);
            card.style.setProperty("--viewer-blur", `${focusDistance * 1.8}px`);
            card.style.setProperty("--viewer-opacity", "1");
        });
        if (enableMagneticAttraction && selected < 0) {
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

    const navigate = useNavigate();
    const [isTransitioning, setIsTransitioning] = useState(false);

    const handleWheel = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (Math.abs(event.deltaY) < 8 || isTransitioning) return;

        // If deltaY is positive, we zoom OUT (nextDepth decreases).
        // To zoom IN, user scrolls UP (deltaY is negative, nextDepth increases).
        // We want to trigger when zooming IN past max depth, OR zooming OUT past min depth.
        // Actually, let's reverse the wheel direction so scrolling DOWN zooms IN (more intuitive).
        const nextDepth = cameraDepthRef.current + event.deltaY * 1.5;

        if (cameraDepthRef.current >= depthBounds.max && event.deltaY > 0) {
            setIsTransitioning(true);
            gsap.to(wallRef.current, {
                opacity: 0,
                duration: 0.5,
                ease: "power2.out",
                onComplete: () => navigate("/aboutUs")
            });
            return;
        }

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
                manualPanRef.current = { x: 0, y: 0 };
                wallRef.current?.style.setProperty("--magnetic-x", "0px");
                wallRef.current?.style.setProperty("--magnetic-y", "0px");
                wallRef.current?.style.setProperty("cursor", "grab");
            } else {
                wallRef.current?.style.removeProperty("cursor");
            }
            return nextEnabled;
        });
    };

    return <div className="parallax-cards-shell"><div ref={wallRef} className={`parallax-cards${visible ? " is-visible" : ""}${selected >= 0 ? " has-selection" : ""} ${className}`} style={{ "--perspective": `${perspective}px`, "--camera-z": "0px", "--cursor-z": "0px", "--view-x": "0px", "--view-y": "0px", "--card-width": cardWidth ? `${cardWidth}px` : undefined, "--card-height": cardHeight ? `${cardHeight}px` : undefined, "--duration": `${animationDuration}s`, "--fog": enableDepthFog ? fogIntensity : 0 }} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerMove={handlePointerMove} onWheelCapture={handleWheel} onTouchMove={(event) => event.preventDefault()} onPointerLeave={() => { pointerRef.current = { x: 0, y: 0, zoomZ: 0 }; isDraggingRef.current = false; if (!parallaxEnabled) { wallRef.current?.style.setProperty("cursor", "grab"); } else { wallRef.current?.style.setProperty("--magnetic-x", "0px"); wallRef.current?.style.setProperty("--magnetic-y", "0px"); wallRef.current?.style.setProperty("--cursor-z", "0px"); } }} role="group" aria-label="Selected work gallery">
        <Galaxy density={1.35} speed={0.12} glowIntensity={0.8} saturation={0.75} />
        <div className="parallax-cards__stage">
            {cards.map((item, index) => {
                const [x, y, z, rotate] = cardPositions[index];
                const isSelected = selected === index;
                const isLandscape = (item.aspectRatio || 1.5) > 1;
                const widthMultiplier = isLandscape ? 1 : 0.6;
                const card = <span className="parallax-card__surface"><img src={item.image} alt={item.title || ""} loading="lazy" decoding="async" draggable="false" /><span className="parallax-card__highlight" aria-hidden="true" /></span>;
                const props = { ref: (card) => { cardRefs.current[index] = card; }, className: `parallax-card${isSelected ? " is-selected" : ""}`, style: { "--x": `${x}%`, "--y": `${y}%`, "--z": `${z}px`, "--rotate": `${rotate}deg`, "--ratio": item.aspectRatio || 1.5, "--index": index, "--width-multiplier": widthMultiplier }, onClick: (event) => handleCardClick(event, index, item) };
                return item.href ? <a {...props} href={item.href} target="_blank" rel="noreferrer noopener" key={`${item.image}-${index}`}>{card}</a> : <button {...props} type="button" aria-label={item.title || "Open gallery image"} key={`${item.image}-${index}`}>{card}</button>;
            })}
        </div>
    </div><button className="parallax-close-button" style={{ opacity: selected >= 0 ? 1 : 0, pointerEvents: selected >= 0 ? "auto" : "none", transition: "opacity 0.3s ease" }} type="button" onClick={() => setSelected(-1)} aria-label="Close image">Esc</button><div className="parallax-controls" style={{ opacity: selected >= 0 ? 0 : 1, pointerEvents: "none", transition: "opacity 0.3s ease" }}><button className={`parallax-toggle${parallaxEnabled ? " is-on" : ""}`} type="button" style={{ pointerEvents: selected >= 0 ? "none" : "auto" }} onClick={handleParallaxToggle} aria-pressed={parallaxEnabled}>{parallaxEnabled ? "Parallax on" : "Parallax off"}</button><label className="parallax-depth-control" style={{ pointerEvents: selected >= 0 ? "none" : "auto" }}><input type="range" min={depthBounds.min} max={depthBounds.max} value={cameraDepth} onChange={handleDepthChange} aria-label="Move through image depth" /></label></div></div>;
};

export default DriftWall;
