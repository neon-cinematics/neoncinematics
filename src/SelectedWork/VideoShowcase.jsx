import { useEffect, useState, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import MorphSlider from "./MorphSlider";
import { sanityClient, videoThumbnailsQuery } from "../lib/sanity";
import { sanityImageUrl } from "../lib/sanityImage";
import "./VideoShowcase.css";

const extractYoutubeId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
};

const VideoShowcase = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const containerRef = useRef();

    useGSAP(() => {
        gsap.registerPlugin(ScrollTrigger);
        
        if (items.length > 0) {
            const timeoutId = setTimeout(() => {
                gsap.to(".video-showcase-wrapper", {
                    yPercent: 40,
                    ease: "none",
                    scrollTrigger: {
                        trigger: containerRef.current,
                        start: "top top",
                        end: "bottom top",
                        scrub: true,
                        invalidateOnRefresh: true
                    }
                });
                ScrollTrigger.refresh();
            }, 100);
            return () => clearTimeout(timeoutId);
        }
    }, { scope: containerRef, dependencies: [items] });

    useEffect(() => {
        const fetchVideos = async () => {
            if (!sanityClient) return;
            try {
                const result = await sanityClient.fetch(videoThumbnailsQuery);
                const formattedItems = result.map(item => {
                    const ytId = extractYoutubeId(item.videoLink);
                    const mainImage = sanityImageUrl(item.image, 1600) || (ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : "");
                    return {
                        image: mainImage,
                        caption: item.caption,
                        videoLink: item.videoLink,
                        youtubeId: ytId
                    };
                });
                setItems(formattedItems);
            } catch (error) {
                console.error("Failed to load video thumbnails:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchVideos();
    }, []);

    if (loading) {
        return <div className="video-showcase-container"></div>;
    }

    if (items.length === 0) {
        return null;
    }

    return (
        <div className="video-showcase-container" ref={containerRef}>
            <div className="video-showcase-wrapper">
                <MorphSlider 
                    items={items} 
                    transition="melt"
                    intensity={0.4}
                    aberration={0.35}
                    drift={0.4}
                    autoplay={true}
                    scale={0.8}
                    autoplayDelay={2}
                />
            </div>
        </div>
    );
};

export default VideoShowcase;
