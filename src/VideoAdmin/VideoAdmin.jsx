import { useEffect, useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { createSanityWriteClient, videoThumbnailsQuery, sanityClient } from "../lib/sanity";
import { sanityImageUrl } from "../lib/sanityImage";
import "./VideoAdmin.css";

const getCroppedImg = (imageSrc, pixelCrop) => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.src = imageSrc;
        image.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = pixelCrop.width;
            canvas.height = pixelCrop.height;
            const ctx = canvas.getContext("2d");

            ctx.drawImage(
                image,
                pixelCrop.x,
                pixelCrop.y,
                pixelCrop.width,
                pixelCrop.height,
                0,
                0,
                pixelCrop.width,
                pixelCrop.height
            );

            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error("Canvas is empty"));
                    return;
                }
                resolve(blob);
            }, "image/jpeg");
        };
        image.onerror = () => reject(new Error("Failed to load image"));
    });
};

const VideoAdmin = () => {
    const [token, setToken] = useState(() => sessionStorage.getItem("gallery-admin-token") || "");
    const [items, setItems] = useState([]);
    const [status, setStatus] = useState("");
    const [isBusy, setIsBusy] = useState(false);

    // Upload state
    const [videoLink, setVideoLink] = useState("");
    const [caption, setCaption] = useState("");
    const [imageSrc, setImageSrc] = useState(null);
    const [fileName, setFileName] = useState("");

    // Crop state
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const loadItems = async () => {
        if (!sanityClient) return;
        try {
            const result = await sanityClient.fetch(videoThumbnailsQuery);
            setItems(result.map((item) => ({ ...item, preview: sanityImageUrl(item.image, 420) })));
        } catch (error) { setStatus(error.message || "Unable to load videos."); }
    };

    useEffect(() => {
        const loadTimer = setTimeout(loadItems, 0);
        return () => clearTimeout(loadTimer);
    }, []);

    const getWriteClient = () => {
        const client = createSanityWriteClient(token.trim());
        if (!client) throw new Error("Enter a valid Sanity write token.");
        return client;
    };

    const handleToken = (event) => {
        event.preventDefault();
        sessionStorage.setItem("gallery-admin-token", token.trim());
        setStatus("Editing access enabled for this browser session.");
    };

    const handleFile = (event) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            setFileName(file.name);
            const reader = new FileReader();
            reader.addEventListener("load", () => setImageSrc(reader.result));
            reader.readAsDataURL(file);
        }
    };

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleUpload = async (event) => {
        event.preventDefault();
        if (!imageSrc) { setStatus("Choose an image first."); return; }
        if (!videoLink) { setStatus("Provide a video link."); return; }
        
        setIsBusy(true);
        setStatus("Cropping image...");
        try {
            const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
            const croppedFile = new File([croppedBlob], fileName || "thumbnail.jpg", { type: "image/jpeg" });
            
            setStatus("Uploading image to Sanity...");
            const client = getWriteClient();
            const asset = await client.assets.upload("image", croppedFile, { filename: croppedFile.name });
            
            setStatus("Creating video record...");
            await client.create({
                _type: "videoThumbnail",
                videoLink,
                caption,
                image: { _type: "image", asset: { _type: "reference", _ref: asset._id } }
            });

            setImageSrc(null);
            setVideoLink("");
            setCaption("");
            setFileName("");
            setStatus("Video thumbnail added successfully.");
            await loadItems();
        } catch (error) { 
            setStatus(error.message || "Unable to upload video."); 
        } finally { 
            setIsBusy(false); 
        }
    };

    const handleDelete = async (id, assetId) => {
        if (!window.confirm("Remove this video thumbnail?")) return;
        setIsBusy(true);
        try {
            const client = getWriteClient();
            await client.delete(id);
            if (assetId) {
                try {
                    await client.delete(assetId);
                } catch (e) {
                    console.warn("Could not delete asset, it may still be referenced:", e);
                }
            }
            setStatus("Video thumbnail removed.");
            await loadItems();
        } catch (error) { setStatus(error.message || "Unable to remove video."); }
        finally { setIsBusy(false); }
    };

    return (
        <div className="video-admin-container">
            <header className="admin-header">
                <h2>Video Thumbnails Admin</h2>
                <form onSubmit={handleToken} className="token-form">
                    <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Sanity Write Token" />
                    <button type="submit">Save Token</button>
                </form>
            </header>

            <main className="admin-main">
                <section className="upload-section">
                    <h3>Add New Video Thumbnail</h3>
                    <form onSubmit={handleUpload} className="upload-form">
                        <div className="form-group">
                            <label>Thumbnail Image</label>
                            <input type="file" accept="image/*" onChange={handleFile} disabled={isBusy} />
                        </div>
                        
                        {imageSrc && (
                            <div className="crop-container">
                                <Cropper
                                    image={imageSrc}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={16 / 9}
                                    onCropChange={setCrop}
                                    onZoomChange={setZoom}
                                    onCropComplete={onCropComplete}
                                />
                            </div>
                        )}

                        <div className="form-group">
                            <label>Video Link (YouTube/Instagram)</label>
                            <input type="url" value={videoLink} onChange={(e) => setVideoLink(e.target.value)} disabled={isBusy} placeholder="https://..." required />
                        </div>
                        
                        <div className="form-group">
                            <label>Caption (Optional)</label>
                            <input type="text" value={caption} onChange={(e) => setCaption(e.target.value)} disabled={isBusy} placeholder="Caption text" />
                        </div>

                        <button type="submit" disabled={isBusy || !imageSrc} className="upload-btn">
                            {isBusy ? "Processing..." : "Crop & Upload"}
                        </button>
                        {status && <div className="status-message">{status}</div>}
                    </form>
                </section>

                <section className="manage-section">
                    <h3>Manage Existing Videos</h3>
                    <div className="video-grid">
                        {items.map(item => (
                            <div key={item._id} className="video-card">
                                <div className="video-card-image" style={{ backgroundImage: `url(${item.preview})` }} />
                                <div className="video-card-details">
                                    <p className="video-caption">{item.caption || "No caption"}</p>
                                    <a href={item.videoLink} target="_blank" rel="noreferrer" className="video-link">Test Link</a>
                                    <button className="delete-btn" onClick={() => handleDelete(item._id, item.assetId)} disabled={isBusy}>Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default VideoAdmin;
