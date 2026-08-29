import { useEffect, useState } from "react";
import "./CinematicReel.css";

const videos = [
  {
    id: 1,
    title: "NEON Frames",
    platform: "INSTAGRAM",
    image: "/reels/reel-01.jpg",
    url: "https://www.instagram.com/reel/YOUR_ID/",
  },
  {
    id: 2,
    title: "NEON Showreel",
    platform: "YOUTUBE",
    image: "/reels/reel-02.jpg",
    url: "https://www.youtube.com/watch?v=YOUR_ID",
  },
  {
    id: 3,
    title: "Campus Cinematic",
    platform: "INSTAGRAM",
    image: "/reels/reel-03.jpg",
    url: "https://www.instagram.com/reel/YOUR_ID/",
  },
  {
    id: 4,
    title: "Behind The Frame",
    platform: "YOUTUBE",
    image: "/reels/reel-04.jpg",
    url: "https://www.youtube.com/watch?v=YOUR_ID",
  },
  {
    id: 5,
    title: "Visual Story",
    platform: "INSTAGRAM",
    image: "/reels/reel-05.jpg",
    url: "https://www.instagram.com/reel/YOUR_ID/",
  },
  {
    id: 6,
    title: "NEON Cinematic",
    platform: "YOUTUBE",
    image: "/reels/reel-06.jpg",
    url: "https://www.youtube.com/watch?v=YOUR_ID",
  },
];


function CinematicReel() {

  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);


  const next = () => {
    setDirection(1);

    setCurrent((prev) =>
      (prev + 1) % videos.length
    );
  };


  const previous = () => {
    setDirection(-1);

    setCurrent((prev) =>
      (prev - 1 + videos.length) % videos.length
    );
  };


  const goTo = (index) => {

    setDirection(
      index > current ? 1 : -1
    );

    setCurrent(index);
  };


  /*
   * Returns position relative to active frame.
   *
   * -2 = far left
   * -1 = left
   *  0 = center
   * +1 = right
   * +2 = far right
   */

  const getPosition = (index) => {

    let position = index - current;

    const half =
      Math.floor(videos.length / 2);

    if (position > half) {
      position -= videos.length;
    }

    if (position < -half) {
      position += videos.length;
    }

    return position;
  };


  useEffect(() => {

    const handleKeyDown = (event) => {

      if (event.key === "ArrowRight") {
        next();
      }

      if (event.key === "ArrowLeft") {
        previous();
      }

    };


    window.addEventListener(
      "keydown",
      handleKeyDown
    );


    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };

  }, []);


  return (

    <section className="cinematic-reel">

 

      <div className="reel-bg-glow glow-one" />
      <div className="reel-bg-glow glow-two" />
      <div className="reel-bg-glow glow-three" />


      <div className="reel-heading">


        <h2>
          Selected Work
        </h2>

      </div>



      <div className="reel-stage">

        {/* One continuous film body */}

        <div className="film-body">

          <div className="film-edge film-edge-top">

            {Array.from({
              length: 90
            }).map((_, index) => (
              <span key={index} />
            ))}

          </div>


          <div className="film-edge film-edge-bottom">

            {Array.from({
              length: 90
            }).map((_, index) => (
              <span key={index} />
            ))}

          </div>


          {/* Film frames */}

          <div className="film-frames">

            {videos.map((video, index) => {

              const position =
                getPosition(index);

              const distance =
                Math.abs(position);


              /*
               * Curved film geometry.
               */

              const x =
                position * 370;


              const z =
                -(distance * distance) * 75;


              const y = 0;


              const rotate =
                position * -13;


              const scale =
                Math.max(
                  0.76,
                  1 - distance * 0.085
                );


              return (

                <a

                  key={video.id}

                  href={video.url}

                  target="_blank"

                  rel="noopener noreferrer"

                  className={`film-frame ${
                    position === 0
                      ? "active"
                      : ""
                  }`}

                  style={{
                    transform: `
                      translate(-50%, -50%)
                      translateX(${x}px)
                      translateY(${y}px)
                      translateZ(${z}px)
                      rotateY(${rotate}deg)
                      scale(${scale})
                    `,
                    "--distance": distance,
                  }}

                >

                  <div className="frame-content">

                    {/* Image */}

                    <div className="frame-image">

                      <img
                        src={video.image}
                        alt={video.title}
                      />

                      <div className="frame-vignette" />

                      <div className="frame-glow" />

                      <div className="frame-rgb red" />

                      <div className="frame-rgb cyan" />

                    </div>


                    {/* Frame metadata */}

                    <div className="frame-info">

                      <span className="frame-platform">
                        {video.platform}
                      </span>

                      <span className="frame-title">
                        {video.title}
                      </span>

                    </div>


                    {/* Film holes */}

                    <div className="frame-holes top">

                      {Array.from({
                        length: 14
                      }).map((_, i) => (
                        <span key={i} />
                      ))}

                    </div>


                    <div className="frame-holes bottom">

                      {Array.from({
                        length: 14
                      }).map((_, i) => (
                        <span key={i} />
                      ))}

                    </div>

                  </div>

                </a>

              );

            })}

          </div>

        </div>

      </div>



      <div className="reel-controls">

        <button
          type="button"
          className="reel-arrow"
          onClick={previous}
          aria-label="Previous"
        >
          <span>←</span>
        </button>


        <div className="reel-dots">

          {videos.map((video, index) => (

            <button
              type="button"
              key={video.id}
              onClick={() => goTo(index)}
              className={
                index === current
                  ? "reel-dot active"
                  : "reel-dot"
              }
              aria-label={`Go to ${video.title}`}
            />

          ))}

        </div>


        <button
          type="button"
          className="reel-arrow"
          onClick={next}
          aria-label="Next"
        >
          <span>→</span>
        </button>

      </div>

    </section>

  );
}


export default CinematicReel;