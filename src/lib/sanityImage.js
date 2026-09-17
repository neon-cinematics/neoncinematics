import imageUrlBuilder from "@sanity/image-url";
import { sanityClient } from "./sanity";

const builder = sanityClient ? imageUrlBuilder(sanityClient) : null;

export const sanityImageUrl = (source, width = 700, height = null) => {
    if (!builder || !source) return null;
    let img = builder.image(source).width(width).auto("format");
    if (height) {
        img = img.height(height).fit("crop");
    } else {
        img = img.fit("max");
    }
    return img.url();
};