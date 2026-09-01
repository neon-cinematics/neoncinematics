import imageUrlBuilder from "@sanity/image-url";
import { sanityClient } from "./sanity";

const builder = sanityClient ? imageUrlBuilder(sanityClient) : null;

export const sanityImageUrl = (source, width = 700) => {
    if (!builder || !source) return null;
    return builder.image(source).width(width).auto("format").url();
};