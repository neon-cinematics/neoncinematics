import { createClient } from "@sanity/client";

const projectId = import.meta.env.VITE_SANITY_PROJECT_ID;
const dataset = import.meta.env.VITE_SANITY_DATASET;

// Read-only client (same as the global sanityClient)
export const blogReadClient = projectId && dataset
    ? createClient({ projectId, dataset, apiVersion: "2025-01-01", useCdn: false })
    : null;

// Write client (requires token — stored in localStorage for admin, or retrieved from server JWT for posters)
export const createBlogWriteClient = (token) =>
    projectId && dataset && token
        ? createClient({ projectId, dataset, apiVersion: "2025-01-01", useCdn: false, token })
        : null;

// ─── GROQ Queries ────────────────────────────────────────────────────────────

/** All published blogs for public listing */
export const publishedBlogsQuery = `
*[_type == "blog" && status == "published"] | order(publishedAt desc) {
    _id,
    title,
    slug,
    description,
    status,
    publishedAt,
    createdAt,
    "coverImageUrl": coverImage.asset->url,
    "author": author->{name, username, email, "profileImageUrl": profileImage.asset->url}
}`;

/** Single published blog by slug */
export const blogBySlugQuery = `
*[_type == "blog" && slug.current == $slug && status == "published"][0] {
    _id,
    title,
    slug,
    description,
    content,
    status,
    publishedAt,
    createdAt,
    "coverImageUrl": coverImage.asset->url,
    "author": author->{name, username, email, "profileImageUrl": profileImage.asset->url},
    "attachments": attachments[] {
        _key,
        filename,
        mimeType,
        fileSize,
        uploadedAt,
        "url": file.asset->url,
        "assetId": file.asset._ref
    }
}`;

/** All blogs for a specific poster (for dashboard) */
export const posterBlogsQuery = `
*[_type == "blog" && author._ref == $authorId] | order(_updatedAt desc) {
    _id,
    title,
    slug,
    description,
    status,
    createdAt,
    _updatedAt,
    submittedAt,
    approvedAt,
    publishedAt,
    reviewMessage,
    "coverImageUrl": coverImage.asset->url,
    "author": author->{name, username, email}
}`;

/** Single blog by ID (for editing / admin review — includes author email for notifications) */
export const blogByIdQuery = `
*[_type == "blog" && _id == $id][0] {
    _id,
    title,
    slug,
    description,
    content,
    status,
    createdAt,
    _updatedAt,
    submittedAt,
    approvedAt,
    publishedAt,
    reviewMessage,
    "coverImageUrl": coverImage.asset->url,
    "coverImageRef": coverImage.asset._ref,
    "author": author->{_id, name, username, email},
    "authorRef": author._ref,
    "attachments": attachments[] {
        _key,
        filename,
        mimeType,
        fileSize,
        uploadedAt,
        "url": file.asset->url,
        "assetId": file.asset._ref
    }
}`;

/** All blogs for admin — all statuses */
export const allBlogsAdminQuery = `
*[_type == "blog"] | order(_updatedAt desc) {
    _id,
    title,
    slug,
    description,
    status,
    createdAt,
    _updatedAt,
    submittedAt,
    approvedAt,
    publishedAt,
    reviewMessage,
    "coverImageUrl": coverImage.asset->url,
    "author": author->{_id, name, username, email}
}`;

/** Blog posters list (admin) */
export const blogPostersQuery = `
*[_type == "blogPoster"] | order(createdAt asc) {
    _id,
    name,
    username,
    email,
    isActive,
    role,
    createdAt,
    "profileImageUrl": profileImage.asset->url
}`;

/** Blog managers list */
export const blogManagersQuery = `
*[_type == "blogManager"] | order(_createdAt asc) {
    _id,
    email,
    isActive
}`;

/** Dashboard stats for admin */
export const adminBlogStatsQuery = `{
    "total": count(*[_type == "blog"]),
    "draft": count(*[_type == "blog" && status == "draft"]),
    "submitted": count(*[_type == "blog" && status == "submitted"]),
    "under_review": count(*[_type == "blog" && status == "under_review"]),
    "approved": count(*[_type == "blog" && status == "approved"]),
    "rejected": count(*[_type == "blog" && status == "rejected"]),
    "published": count(*[_type == "blog" && status == "published"]),
    "activePosters": count(*[_type == "blogPoster" && isActive == true])
}`;

/** Poster dashboard stats */
export const posterStatsQuery = `{
    "total": count(*[_type == "blog" && author._ref == $authorId]),
    "draft": count(*[_type == "blog" && author._ref == $authorId && status == "draft"]),
    "submitted": count(*[_type == "blog" && author._ref == $authorId && (status == "submitted" || status == "under_review")]),
    "approved": count(*[_type == "blog" && author._ref == $authorId && status == "approved"]),
    "rejected": count(*[_type == "blog" && author._ref == $authorId && status == "rejected"]),
    "published": count(*[_type == "blog" && author._ref == $authorId && status == "published"])
}`;

// ─── Document Creators ───────────────────────────────────────────────────────

/** Generate a URL-safe slug from a title */
export const generateSlug = (title) => {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 96);
};

/** Create a new blog draft */
export const createBlogDoc = (fields, authorId) => ({
    _type: "blog",
    title: fields.title,
    slug: { _type: "slug", current: generateSlug(fields.title) },
    description: fields.description || "",
    content: fields.content || [],
    status: "draft",
    author: { _type: "reference", _ref: authorId },
    createdAt: new Date().toISOString(),
    attachments: [],
});
