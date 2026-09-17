import { sanityClient, galleryPhotosQuery, videoThumbnailsQuery, teamMembersQuery } from "./sanity";
import { sanityImageUrl } from "./sanityImage";

const CACHE_NAME = "neon-media-cache-v1";
const VERSION_KEY = "neon_media_manifest_ver";

/**
 * Preloads approximately 30-40% of critical media (images/photos)
 * and caches them in Browser Cache / CacheStorage until content changes.
 * 
 * @param {Function} onProgress - Callback (percentage 0 to 100)
 * @returns {Promise<boolean>}
 */
export async function preloadMediaAssets(onProgress = () => { }) {
    const staticAssets = [
        "/neon_logo.png",
        "/page1animationv2.mp4"
    ];

    let sanityAssets = [];

    try {
        if (sanityClient) {
            const [photos, videos, team] = await Promise.all([
                sanityClient.fetch(galleryPhotosQuery).catch(() => []),
                sanityClient.fetch(videoThumbnailsQuery).catch(() => []),
                sanityClient.fetch(teamMembersQuery).catch(() => [])
            ]);

            const rawPhotos = (photos || []).map(p => p.image).filter(Boolean);
            const rawVideos = (videos || []).map(v => v.image).filter(Boolean);
            const rawTeam = (team || []).map(t => t.image).filter(Boolean);

            const allSanityRaw = [...rawPhotos, ...rawVideos, ...rawTeam];

            // Target roughly 35% of all media items (30-40% range)
            const targetCount = Math.max(2, Math.ceil(allSanityRaw.length * 0.35));
            const selectedRaw = allSanityRaw.slice(0, targetCount);

            sanityAssets = selectedRaw
                .map(img => sanityImageUrl(img, 800))
                .filter(Boolean);
        }
    } catch (err) {
        console.warn("[AssetPreloader] Sanity fetch error during preload:", err);
    }

    const allUrls = Array.from(new Set([...staticAssets, ...sanityAssets]));
    if (allUrls.length === 0) {
        onProgress(100);
        return true;
    }

    // Generate manifest hash from total URLs
    const currentManifestHash = `ver_${allUrls.length}_${allUrls.slice(0, 3).join("_").length}`;
    const cachedManifestHash = localStorage.getItem(VERSION_KEY);

    let hasCacheApi = false;
    let mediaCache = null;
    try {
        if ("caches" in window) {
            hasCacheApi = true;
            mediaCache = await caches.open(CACHE_NAME);
        }
    } catch (e) {
        console.warn("[AssetPreloader] CacheStorage not accessible:", e);
    }

    // If cache version matches and CacheStorage contains assets, quick verify
    if (hasCacheApi && mediaCache && cachedManifestHash === currentManifestHash) {
        let allCached = true;
        for (const url of allUrls) {
            const match = await mediaCache.match(url);
            if (!match) {
                allCached = false;
                break;
            }
        }
        if (allCached) {
            // Already cached, instant complete
            onProgress(100);
            return true;
        }
    }

    // Load assets and measure progress
    let loadedCount = 0;
    const total = allUrls.length;

    const loadSingleAsset = async (url) => {
        return new Promise((resolve) => {
            const isVideo = url.endsWith(".mp4") || url.endsWith(".webm");

            const finish = async (responseObj = null) => {
                loadedCount++;
                const percentage = Math.min(100, Math.floor((loadedCount / total) * 100));
                onProgress(percentage);

                if (hasCacheApi && mediaCache && responseObj) {
                    try {
                        await mediaCache.put(url, responseObj);
                    } catch (e) {
                        // ignore cache put errors
                    }
                }
                resolve();
            };

            // Attempt fetch for cacheable storage
            fetch(url, { mode: "cors", cache: "force-cache" })
                .then(res => {
                    if (res.ok) {
                        finish(res.clone());
                    } else {
                        fallbackLoad();
                    }
                })
                .catch(() => {
                    fallbackLoad();
                });

            function fallbackLoad() {
                if (isVideo) {
                    const video = document.createElement("video");
                    video.src = url;
                    video.onloadeddata = () => finish();
                    video.onerror = () => finish();
                } else {
                    const img = new Image();
                    img.src = url;
                    img.onload = () => finish();
                    img.onerror = () => finish();
                }
            }
        });
    };

    // Load assets concurrently
    await Promise.all(allUrls.map(url => loadSingleAsset(url)));

    // Save cache manifest version
    localStorage.setItem(VERSION_KEY, currentManifestHash);
    onProgress(100);
    return true;
}
