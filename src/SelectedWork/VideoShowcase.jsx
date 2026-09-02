import { useEffect, useState } from "react";
import MorphSlider from "./MorphSlider";
import { sanityClient, videoThumbnailsQuery } from "../lib/sanity";
import { sanityImageUrl } from "../lib/sanityImage";
import "./VideoShowcase.css";

const VideoShowcase = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVideos = async () => {
            if (!sanityClient) return;
            try {
                const result = await sanityClient.fetch(videoThumbnailsQuery);
                const formattedItems = result.map(item => ({
                    image: sanityImageUrl(item.image, 1600),
                    caption: item.caption,
                    videoLink: item.videoLink
                }));
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
        <div className="video-showcase-container">
            <div className="video-showcase-wrapper">
                <MorphSlider 
                    items={items} 
                    transition="melt"
                    intensity={0.4}
                    aberration={0.35}
                    drift={0.4}
                    autoplay={true}
                    scale={0.8}
                    autoplayDelay={3.5}
                />
            </div>
            
            <button 
                className="scroll-indicator" 
                onClick={() => window.dispatchEvent(new CustomEvent('scrollDownToGallery'))}
                aria-label="Scroll down to gallery"
            >
                <div className="scroll-arrow"></div>
                <div className="scroll-arrow"></div>
                <div className="scroll-arrow"></div>
            </button>
        </div>
    );
};

export default VideoShowcase;
