import { useEffect, useState } from "react";
import "./LoadingScreen.css";

function LoadingScreen({ onComplete, assetsLoaded = true }) {
const [progress, setProgress] = useState(0);
const [isExiting, setIsExiting] = useState(false);

  const [phase, setPhase] = useState(1);

  useEffect(() => {
    let animationFrame;
    const firstPhaseDuration = 200;
    const startTime = performance.now();

    const animateTo90 = (currentTime) => {
      const elapsed = currentTime - startTime;
      const percentage = Math.min(85, Math.floor((elapsed / firstPhaseDuration) * 90));
      setProgress(percentage);

      if (percentage < 85) {
        animationFrame = requestAnimationFrame(animateTo90);
      } else {
        setPhase(2);
      }
    };

    animationFrame = requestAnimationFrame(animateTo90);

    return () => cancelAnimationFrame(animationFrame);
  }, []);

  useEffect(() => {
    if (phase === 2 && assetsLoaded) {
      let animationFrame;
      const secondPhaseDuration = 600;
      const secondStart = performance.now();

      const animateTo100 = (time) => {
        const elapsed = time - secondStart;
        const percentage = Math.min(100, 85 + Math.floor((elapsed / secondPhaseDuration) * 15));
        setProgress(percentage);

        if (percentage < 100) {
          animationFrame = requestAnimationFrame(animateTo100);
        } else {
          setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => {
              onComplete();
            }, 900);
          }, 400);
        }
      };

      animationFrame = requestAnimationFrame(animateTo100);

      return () => cancelAnimationFrame(animationFrame);
    }
  }, [phase, assetsLoaded, onComplete]);

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