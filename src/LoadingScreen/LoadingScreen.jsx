import { useEffect, useState } from "react";
import "./LoadingScreen.css";

function LoadingScreen({ onComplete, assetsLoaded = true, preloadProgress = 0 }) {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Driven by real media preloader progress combined with minimum baseline
    const target = Math.min(100, Math.max(progress, preloadProgress));
    if (target > progress) {
      setProgress(target);
    }
  }, [preloadProgress, progress]);

  useEffect(() => {
    if (assetsLoaded || progress >= 100) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          onComplete();
        }, 900);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [assetsLoaded, progress, onComplete]);


  const totalBlocks = 32;

  const activeBlocks = Math.floor(
    (progress / 100) * totalBlocks
  );

  return (
    <>
      <svg
        className="crt-filter-definition"
        aria-hidden="true"
      >
        <defs>
          <filter
            id="crt-warp"
            x="-10%"
            y="-10%"
            width="120%"
            height="120%"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.008 0.025"
              numOctaves="1"
              seed="7"
              result="noise"
            />

            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="4"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <div
  className={`loading-screen ${
    isExiting ? "loading-screen-exit" : ""
  }`}
>

        <div className="loading-tv">

          <div className="tv-screen">

            <div className="tv-scanlines"></div>

            <div className="crt-glass"></div>

            <div className="loading-content">

              <div className="loading-brand">
                NEON CINEMATICS
              </div>

              <div className="loading-system">
                <br />
                Make something worth remembering. 
                <br />
                SYSTEM VERSION 1.0
              </div>

              <div className="loading-progress-wrapper">

                <div className="loading-blocks">

                  {Array.from({
                    length: totalBlocks
                  }).map((_, index) => (

                    <span
                      key={index}
                      className={
                        index < activeBlocks
                          ? "loading-block active"
                          : "loading-block"
                      }
                    />

                  ))}

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>
    </>
  );
}

export default LoadingScreen;