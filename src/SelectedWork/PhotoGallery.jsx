import { useEffect, useState } from "react";
import DriftWall from "./DriftWall";
import { galleryPhotosQuery, sanityClient } from "../lib/sanity";
import { sanityImageUrl } from "../lib/sanityImage";
import fallbackImage from "../assets/hero.png";

const PhotoGallery = () => {
    const [photos, setPhotos] = useState([]);

    useEffect(() => {
        let isMounted = true;
        const loadPhotos = async () => {
            if (!sanityClient) {
                return;
            }
            try {
                const result = await sanityClient.fetch(galleryPhotosQuery);
                if (isMounted) {
                    setPhotos(result.map((photo) => ({
                        image: sanityImageUrl(photo.image),
                        title: photo.title,
                        href: photo.href,
                    })).filter((photo) => photo.image));
                }
            } catch (error) {
                console.error("Unable to load gallery photos from Sanity", error);
            }
        };
        loadPhotos();
        return () => { isMounted = false; };
    }, []);

    const displayPhotos = photos.length ? photos : Array.from({ length: 10 }, (_, index) => ({
        image: fallbackImage,
        key: index,
    }));

    return (
        <section className="photo_gallery" aria-label="Selected work gallery">
            <DriftWall items={displayPhotos} />
        </section>
    );
};

export default PhotoGallery;