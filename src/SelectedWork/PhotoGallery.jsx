import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const PhotoGallery = () => {
    const navigate = useNavigate();

    useEffect(() => {
        if ("scrollRestoration" in window.history) {
            window.history.scrollRestoration = "manual";
        }
        window.scrollTo(0, 0);
    }, [navigate]);

    return (
        <div className="photo_gallery">
            
        </div>
    );
};

export default PhotoGallery;