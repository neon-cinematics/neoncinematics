import { createClient } from "@sanity/client";

const projectId = import.meta.env.VITE_SANITY_PROJECT_ID;
const dataset = import.meta.env.VITE_SANITY_DATASET;
export const sanityClient = projectId && dataset
    ? createClient({
        projectId,
        dataset,
        apiVersion: "2025-01-01",
        useCdn: true,
    })
    : null;

export const createSanityWriteClient = (token) => projectId && dataset && token
    ? createClient({ projectId, dataset, apiVersion: "2025-01-01", useCdn: false, token })
    : null;

export const galleryPhotosQuery = `*[_type == "galleryPhoto"] | order(_createdAt desc) {
    _id,
    title,
    href,
    isCenter,
    image,
    "width": image.asset->metadata.dimensions.width,
    "height": image.asset->metadata.dimensions.height,
    "assetId": image.asset._ref
}`;

export const videoThumbnailsQuery = `*[_type == "videoThumbnail"] | order(_createdAt desc) {
    _id,
    videoLink,
    caption,
    image,
    "assetId": image.asset._ref
}`;