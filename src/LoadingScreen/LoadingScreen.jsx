import { useEffect, useState } from "react";
import "./LoadingScreen.css";

function LoadingScreen({ onComplete, assetsLoaded = true, preloadProgress = 0 }) {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [phase, setPhase] = useState("init");

  // Step 1: Initial rapid climb to 30% baseline
  useEffect(() => {
    let frame;
    const startTime = performance.now();
    const duration = 250;

    const animateTo30 = (time) => {
      const elapsed = time - startTime;
      const val = Math.min(30, Math.floor((elapsed / duration) * 30));
      setProgress(val);
      if (val < 30) {
        frame = requestAnimationFrame(animateTo30);
      } else {
        setPhase("loading");
      }
    };
    frame = requestAnimationFrame(animateTo30);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Step 2: Scale asset loading progress from 30% to 70%
  useEffect(() => {
    if (phase === "loading") {
      const mapped = 30 + Math.floor((preloadProgress / 100) * 40);
      const currentTarget = assetsLoaded ? 70 : mapped;

      if (currentTarget > progress && progress < 70) {
        setProgress(currentTarget);
      }

      if ((assetsLoaded || preloadProgress >= 100) && currentTarget >= 70) {
        setProgress(70);
        setPhase("finaling");
      }
    }
  }, [phase, preloadProgress, assetsLoaded, progress]);

  // Step 3: Transition from 70% to 80% (and 100%) in 300ms, then load site
  useEffect(() => {
    if (phase === "finaling") {
      let frame;
      const startTime = performance.now();
      const duration = 300; // 300ms transition

      const animateFinal = (time) => {
        const elapsed = time - startTime;
        const p = Math.min(1, elapsed / duration);
        const val = Math.min(100, Math.floor(70 + p * 30));
        setProgress(val);

        if (p < 1) {
          frame = requestAnimationFrame(animateFinal);
        } else {
          setPhase("done");
          setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => {
              onComplete();
            }, 600);
          }, 150);
        }
      };
      frame = requestAnimationFrame(animateFinal);
      return () => cancelAnimationFrame(frame);
    }
  }, [phase, onComplete]);



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