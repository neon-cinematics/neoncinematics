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

export const galleryPhotosQuery = `*[_type == "galleryPhoto"] | order(_createdAt desc) {
    _id,
    title,
    href,
    image
}`;