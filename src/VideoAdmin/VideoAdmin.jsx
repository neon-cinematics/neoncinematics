import { useEffect, useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { createSanityWriteClient, videoThumbnailsQuery, sanityClient } from "../lib/sanity";
import { sanityImageUrl } from "../lib/sanityImage";
import getCroppedImg from "../lib/cropImage";
import "./VideoAdmin.css";

const VideoAdmin = () => {
    const [token, setToken] = useState(() => sessionStorage.getItem("gallery-admin-token") || "");
    const [items, setItems] = useState([]);
    const [status, setStatus] = useState("");
    const [isBusy, setIsBusy] = useState(false);

    // Upload & Edit state
    const [editingId, setEditingId] = useState(null);
    const [videoLink, setVideoLink] = useState("");
    const [caption, setCaption] = useState("");
    
    // File state
    const [imageSrc, setImageSrc] = useState(null);
    const [fileName, setFileName] = useState("");
    const [croppedFile, setCroppedFile] = useState(null);

    // Crop state
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    // Background video state
    const [bgVideoFile, setBgVideoFile] = useState(null);
    const [bgStatus, setBgStatus] = useState("");

    const handleBgFile = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setBgVideoFile(e.target.files[0]);
        }
    };

    const handleBgVideoUpload = async (e) => {
        e.preventDefault();
        if (!bgVideoFile) { setBgStatus("Choose an MP4 file first."); return; }
        setIsBusy(true);
        setBgStatus("Uploading background video to Sanity...");
        try {
            const client = getWriteClient();
            const asset = await client.assets.upload("file", bgVideoFile, { filename: bgVideoFile.name });
            
            setBgStatus("Saving background video record...");
            await client.create({
                _type: "aboutUsVideo",
                video: { _type: "file", asset: { _type: "reference", _ref: asset._id } }
            });
            
            setBgStatus("About Us Background Video updated successfully!");
            setBgVideoFile(null);
            document.getElementById("bg-video-upload").value = "";
        } catch (error) {
            setBgStatus(error.message || "Failed to upload video.");
        } finally {
            setIsBusy(false);
        }
    };

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
            reader.addEventListener("load", () => {
                setImageSrc(reader.result);
                setCrop({ x: 0, y: 0 });
                setZoom(1);
                setRotation(0);
                setCroppedFile(null); // clear previously cropped file
            });
            reader.readAsDataURL(file);
        }
    };

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSaveCrop = async (e) => {
        e.preventDefault();
        try {
            const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation, fileName || "thumbnail.jpg");
            setCroppedFile(blob);
            setImageSrc(null);
            setStatus("Image cropped and ready to save.");
        } catch (error) {
            setStatus("Failed to crop image.");
        }
    };

    const handleCancelCrop = (e) => {
        e.preventDefault();
        setImageSrc(null);
        setCroppedFile(null);
        const fileInput = document.getElementById("video-thumbnail-upload");
        if (fileInput) fileInput.value = "";
    };

    const handleEditClick = (item) => {
        setEditingId(item._id);
        setVideoLink(item.videoLink || "");
        setCaption(item.caption || "");
        setCroppedFile(null);
        setImageSrc(null);
        setStatus(`Editing video thumbnail. Upload a new image to change it, or leave blank to keep current.`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setVideoLink("");
        setCaption("");
        setCroppedFile(null);
        setImageSrc(null);
        const fileInput = document.getElementById("video-thumbnail-upload");
        if (fileInput) fileInput.value = "";
        setStatus("Edit cancelled.");
    };

    const handleUpload = async (event) => {
        event.preventDefault();
        if (!videoLink) { setStatus("Provide a video link."); return; }
        if (!editingId && !croppedFile) {
            setStatus("Please provide and crop an image for the new thumbnail."); 
            return; 
        }
        
        setIsBusy(true);
        setStatus(editingId ? "Saving changes..." : "Uploading image and saving thumbnail...");
        try {
            const client = getWriteClient();
            let newImageRef = null;

            if (croppedFile) {
                const asset = await client.assets.upload("image", croppedFile, { filename: croppedFile.name });
                newImageRef = { _type: "image", asset: { _type: "reference", _ref: asset._id } };
            }

            if (editingId) {
                const patch = client.patch(editingId).set({
                    videoLink,
                    caption
                });
                if (newImageRef) {
                    patch.set({ image: newImageRef });
                }
                await patch.commit();
                setStatus("Video thumbnail updated successfully!");
            } else {
                await client.create({
                    _type: "videoThumbnail",
                    videoLink,
                    caption,
                    image: newImageRef
                });
                setStatus("Video thumbnail added successfully!");
            }

            // Reset form
            setEditingId(null);
            setCroppedFile(null);
            setVideoLink("");
            setCaption("");
            setFileName("");
            const fileInput = document.getElementById("video-thumbnail-upload");
            if (fileInput) fileInput.value = "";
            
            await loadItems();
        } catch (error) { 
            setStatus(error.message || "Unable to save video thumbnail."); 
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
            
            if (editingId === id) cancelEdit();
            
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
                <section className="upload-section bg-video-section">
                    <h3>About Us Background Video</h3>
                    <form onSubmit={handleBgVideoUpload} className="upload-form">
                        <div className="form-group">
                            <label>Background Video (.mp4)</label>
                            <input id="bg-video-upload" type="file" accept="video/mp4" onChange={handleBgFile} disabled={isBusy} required />
                        </div>
                        <button type="submit" disabled={isBusy || !bgVideoFile} className="upload-btn">
                            {isBusy ? "Processing..." : "Upload Background Video"}
                        </button>
                        {bgStatus && <div className="status-message">{bgStatus}</div>}
                    </form>
                </section>
                {imageSrc && (
                    <div className="crop-modal-overlay">
                        <div className="crop-modal-content">
                            <h3>Adjust Image</h3>
                            <div className="crop-container">
                                <Cropper
                                    image={imageSrc}
                                    crop={crop}
                                    zoom={zoom}
                                    rotation={rotation}
                                    aspect={16 / 9}
                                    onCropChange={setCrop}
                                    onZoomChange={setZoom}
                                    onRotationChange={setRotation}
                                    onCropComplete={onCropComplete}
                                />
                            </div>
                            <p className="crop-hint">Images are cropped to a strict 16:9 landscape aspect ratio.</p>
                            <div className="crop-controls">
                                <div className="crop-control-group">
                                    <label>Zoom</label>
                                    <input
                                        type="range"
                                        value={zoom}
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        onChange={(e) => setZoom(e.target.value)}
                                        className="styled-range"
                                    />
                                </div>
                                <div className="crop-control-group">
                                    <label>Rotate</label>
                                    <input
                                        type="range"
                                        value={rotation}
                                        min={-180}
                                        max={180}
                                        step={1}
                                        onChange={(e) => setRotation(e.target.value)}
                                        className="styled-range"
                                    />
                                </div>
                            </div>
                            <div className="crop-modal-actions">
                                <button type="button" onClick={handleCancelCrop} className="cancel-btn">Cancel</button>
                                <button type="button" onClick={handleSaveCrop} className="save-btn">Save Crop</button>
                            </div>
                        </div>
                    </div>
                )}

                <section className="upload-section">
                    <h3>{editingId ? "Edit Video Thumbnail" : "Add New Video Thumbnail"}</h3>
                    <form onSubmit={handleUpload} className="upload-form">
                        <div className="form-group">
                            <label>Thumbnail Image {editingId && "(Optional - Leave blank to keep current)"}</label>
                            <input id="video-thumbnail-upload" type="file" accept="image/*" onChange={handleFile} disabled={isBusy} required={!editingId} />
                        </div>

                        <div className="form-group">
                            <label>Video Link (YouTube/Instagram)</label>
                            <input type="url" value={videoLink} onChange={(e) => setVideoLink(e.target.value)} disabled={isBusy} placeholder="https://..." required />
                        </div>
                        
                        <div className="form-group">
                            <label>Caption (Optional)</label>
                            <input type="text" value={caption} onChange={(e) => setCaption(e.target.value)} disabled={isBusy} placeholder="Caption text" />
                        </div>

                        <div className="form-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button type="submit" disabled={isBusy || (!editingId && !croppedFile)} className="upload-btn" style={{ flex: 1 }}>
                                {isBusy ? "Processing..." : editingId ? "Save Changes" : "Save Video"}
                            </button>
                            {editingId && (
                                <button type="button" disabled={isBusy} className="cancel-button" onClick={cancelEdit} style={{ flex: 1, padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', cursor: 'pointer' }}>
                                    Cancel Edit
                                </button>
                            )}
                        </div>
                        {status && <div className="status-message">{status}</div>}
                    </form>
                </section>

                <section className="manage-section">
                    <h3>Manage Existing Videos ({items.length})</h3>
                    <div className="video-grid">
                        {items.map(item => (
                            <div key={item._id} className="video-card">
                                <div className="video-card-image" style={{ backgroundImage: `url(${item.preview})` }} />
                                <div className="video-card-details">
                                    <p className="video-caption">{item.caption || "No caption"}</p>
                                    <a href={item.videoLink} target="_blank" rel="noreferrer" className="video-link">Test Link</a>
                                    <div style={{ display: 'flex', gap: '0.5rem', width: '100%', marginTop: '1rem' }}>
                                        <button type="button" className="edit-btn" onClick={() => handleEditClick(item)} disabled={isBusy} style={{ flex: 1, padding: '0.5rem', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', cursor: 'pointer' }}>Edit</button>
                                        <button type="button" className="delete-btn" onClick={() => handleDelete(item._id, item.assetId)} disabled={isBusy} style={{ flex: 1, margin: 0 }}>Delete</button>
                                    </div>
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
