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
                        image: sanityImageUrl(photo.image, 2400),
                        title: photo.title,
                        href: photo.href,
                        aspectRatio: photo.width && photo.height ? photo.width / photo.height : 1.5,
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
            <DriftWall
                images={displayPhotos.map((photo) => photo.image)}
                items={displayPhotos}
                cardWidth={360}
                perspective={2600}
                mouseSensitivity={6.5}
                animationDuration={0.8}
                enableDepthFog
                fogIntensity={0.3}
                enableMagneticAttraction
                magneticStrength={20}
            />
        </section>
    );
};

export default PhotoGallery;