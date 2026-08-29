import { useEffect, useRef, useState } from "react";
import "./CinematicReel.css";

const VIDEOS = [
  {
    url: "https://www.youtube.com/watch?v=YOUR_ID",
    title: "NEON SHOWREEL",
  },
  {
    url: "https://www.instagram.com/reel/YOUR_ID/",
    title: "CAMPUS CINEMATIC",
  },
  {
    url: "https://www.youtube.com/watch?v=YOUR_ID",
    title: "BEHIND THE FRAME",
  },
  {
    url: "https://www.instagram.com/reel/YOUR_ID/",
    title: "NEON FRAMES",
  },
  {
    url: "https://www.youtube.com/watch?v=YOUR_ID",
    title: "VISUAL STORY",
  },
  {
    url: "https://www.instagram.com/reel/YOUR_ID/",
    title: "CINEMATIC STUDIES",
  },
];

function getYouTubeId(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&?/]+)/);
  return match ? match[1] : null;
}

function getThumbnail(url) {
  const id = getYouTubeId(url);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
}

function getPlatform(url) {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "YOUTUBE";
  if (url.includes("instagram.com")) return "INSTAGRAM";
  return "VIDEO";
}

const reelItems = VIDEOS.map((video) => ({
  ...video,
  thumbnail: getThumbnail(video.url),
  platform: getPlatform(video.url),
}));

const FRAME_WIDTH = 380;
const FRAME_HEIGHT = 290;
const FRAME_GAP = 20;
const FRAME_STEP = FRAME_WIDTH + FRAME_GAP;
const repeatedVideos = Array.from({ length: reelItems.length * 3 }, (_, index) => reelItems[index % reelItems.length]);

export default function CinematicReel() {
  const viewportRef = useRef(null);
  const frameRefs = useRef([]);
  const animationRef = useRef(0);
  const offsetRef = useRef(0);
  const velocityRef = useRef(0);
  const activeRef = useRef(0);
  const dragRef = useRef({
    dragging: false,
    lastX: 0,
    moved: false,
  });

  const [activeIndex, setActiveIndex] = useState(0);

  const updateFrames = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const width = viewport.clientWidth;
    const centerX = width / 2;
    const totalTrack = repeatedVideos.length * FRAME_STEP;
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    frameRefs.current.forEach((frame, index) => {
      if (!frame) return;

      let x = index * FRAME_STEP + offsetRef.current;

      while (x + FRAME_WIDTH < -FRAME_STEP) x += totalTrack;
      while (x > width + FRAME_STEP) x -= totalTrack;

      const normalized = (x + FRAME_WIDTH / 2 - centerX) / (width / 2 || 1);
      const distance = Math.min(Math.abs(normalized), 1.35);
      const y = Math.pow(distance, 2) * 72;
      const rotation = normalized * -9;
      const scale = 1 - distance * 0.14;
      const opacity = 1 - distance * 0.6;
      const z = -Math.pow(distance, 2) * 120;

      frame.style.left = `${x}px`;
      frame.style.transform = `translate3d(0, ${y}px, ${z}px) rotateY(${rotation}deg) scale(${scale})`;
      frame.style.opacity = String(Math.max(0.2, opacity));
      frame.style.zIndex = String(Math.round(100 - distance * 100));

      const centerDistance = Math.abs(x + FRAME_WIDTH / 2 - centerX);
      if (centerDistance < nearestDistance) {
        nearestDistance = centerDistance;
        nearestIndex = index;
      }
    });

    const logicalIndex = nearestIndex % reelItems.length;
    if (logicalIndex !== activeRef.current) {
      activeRef.current = logicalIndex;
      setActiveIndex(logicalIndex);
    }
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const initialCenter = viewport.clientWidth / 2 - FRAME_WIDTH / 2;
    offsetRef.current = initialCenter - (reelItems.length * FRAME_STEP) / 2;
    updateFrames();

    let lastTime = performance.now();

    const tick = (now) => {
      const delta = now - lastTime;
      lastTime = now;

      if (!dragRef.current.dragging) {
        offsetRef.current += velocityRef.current * (delta * 0.06);
        velocityRef.current *= 0.92;

        if (Math.abs(velocityRef.current) < 0.02) {
          velocityRef.current = 0;
        }
      }

      updateFrames();
      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);

    const handleResize = () => {
      const nextCenter = viewport.clientWidth / 2 - FRAME_WIDTH / 2;
      offsetRef.current = nextCenter - (reelItems.length * FRAME_STEP) / 2;
      updateFrames();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const moveBy = (direction) => {
    velocityRef.current = direction * 8.5;
  };

  const handlePointerDown = (event) => {
    dragRef.current.dragging = true;
    dragRef.current.lastX = event.clientX;
    dragRef.current.moved = false;
    velocityRef.current = 0;
    event.preventDefault();
  };

  const handlePointerMove = (event) => {
    if (!dragRef.current.dragging) return;

    const delta = event.clientX - dragRef.current.lastX;
    if (Math.abs(delta) > 5) dragRef.current.moved = true;

    offsetRef.current += delta;
    velocityRef.current = delta * 0.16;
    dragRef.current.lastX = event.clientX;
    updateFrames();
  };

  const handlePointerUp = () => {
    dragRef.current.dragging = false;
    
    // Snap to center of nearest card
    const viewport = viewportRef.current;
    if (!viewport) return;

    const width = viewport.clientWidth;
    const centerX = width / 2;
    const totalTrack = repeatedVideos.length * FRAME_STEP;
    
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    frameRefs.current.forEach((frame, index) => {
      if (!frame) return;
      
      let x = index * FRAME_STEP + offsetRef.current;
      
      while (x + FRAME_WIDTH < -FRAME_STEP) x += totalTrack;
      while (x > width + FRAME_STEP) x -= totalTrack;
      
      const cardCenterX = x + FRAME_WIDTH / 2;
      const distance = Math.abs(cardCenterX - centerX);
      
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    // Calculate target offset to center this card
    const targetCenterX = centerX - FRAME_WIDTH / 2;
    const currentCardX = nearestIndex * FRAME_STEP + offsetRef.current;
    const snapDistance = targetCenterX - currentCardX;
    
    velocityRef.current = snapDistance * 0.08;
  };

  const handleCardClick = (event, url) => {
    if (dragRef.current.moved) {
      event.preventDefault();
      dragRef.current.moved = false;
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="cinematic-reel">
      <div className="reel-glow reel-glow-blue" />
      <div className="reel-glow reel-glow-cyan" />
      <div className="reel-glow reel-glow-pink" />

      <div className="reel-header">
        <div className="reel-kicker">Visual Archive</div>
        <h2>Selected Work</h2>
      </div>

      <div
        ref={viewportRef}
        className="film-viewport"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div className="film-strip-shell">
          <div className="film-strip-base" />

          {repeatedVideos.map((video, index) => {
            const isActive = index % reelItems.length === activeIndex;
            return (
              <a
                key={`${video.title}-${index}`}
                ref={(node) => {
                  frameRefs.current[index] = node;
                }}
                href={video.url}
                target="_blank"
                rel="noreferrer noopener"
                className={`film-card ${isActive ? "is-active" : ""}`}
                style={{ width: `${FRAME_WIDTH}px`, height: `${FRAME_HEIGHT}px` }}
                onClick={(event) => handleCardClick(event, video.url)}
              >
                <div className="film-card-inner">
                  <div className="film-sprocket film-sprocket-top">
                    {Array.from({ length: 12 }).map((_, holeIndex) => (
                      <span key={`${video.title}-top-${holeIndex}`} />
                    ))}
                  </div>

                  <div className="film-image-wrap">
                    {video.thumbnail ? (
                      <img src={video.thumbnail} alt={video.title} loading="lazy" />
                    ) : (
                      <div className="film-fallback" />
                    )}
                    <div className="film-vignette" />
                    <div className="film-glow" />
                  </div>

                  <div className="film-card-meta">
                    <span>{video.platform}</span>
                    <strong>{video.title}</strong>
                  </div>

                  <div className="film-sprocket film-sprocket-bottom">
                    {Array.from({ length: 12 }).map((_, holeIndex) => (
                      <span key={`${video.title}-bottom-${holeIndex}`} />
                    ))}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      <div className="reel-controls">
        <button type="button" className="reel-arrow" onClick={() => moveBy(-1)} aria-label="Previous frame">
          ←
        </button>

        <div className="reel-dots" aria-label="Select reel item">
          {reelItems.map((video, index) => (
            <button
              key={`${video.title}-dot-${index}`}
              type="button"
              className={index === activeIndex ? "reel-dot active" : "reel-dot"}
              onClick={() => {
                const targetIndex = index;
                const currentIndex = activeRef.current;
                const diff = targetIndex - currentIndex;
                offsetRef.current -= diff * FRAME_STEP;
                updateFrames();
              }}
              aria-label={`Go to ${video.title}`}
            />
          ))}
        </div>

        <button type="button" className="reel-arrow" onClick={() => moveBy(1)} aria-label="Next frame">
          →
        </button>
      </div>
    </section>
  );
}
