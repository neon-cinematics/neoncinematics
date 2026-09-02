import { useEffect, useState, useCallback } from "react";
import Cropper from 'react-easy-crop';
import { createSanityWriteClient, teamMembersQuery, sanityClient } from "../lib/sanity";
import { sanityImageUrl } from "../lib/sanityImage";
import getCroppedImg from "../lib/cropImage";
import "./TeamAdmin.css";

const CATEGORIES = ["Coordinators", "3rd Year", "2nd Year", "1st Year"];

const TeamAdmin = () => {
    const [token, setToken] = useState(() => sessionStorage.getItem("team-admin-token") || "");
    const [items, setItems] = useState([]);
    
    const [editingId, setEditingId] = useState(null);
    const [name, setName] = useState("");
    const [position, setPosition] = useState("");
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [file, setFile] = useState(null);
    
    // Cropping states
    const [imageSrc, setImageSrc] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    
    const [status, setStatus] = useState("");
    const [isBusy, setIsBusy] = useState(false);

    const loadItems = async () => {
        if (!sanityClient) return;
        try {
            const result = await sanityClient.fetch(teamMembersQuery);
            setItems(result.map((item) => ({ ...item, preview: sanityImageUrl(item.image, 200) })));
        } catch (error) { setStatus(error.message || "Unable to load team members."); }
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
        sessionStorage.setItem("team-admin-token", token.trim());
        setStatus("Editing access enabled for this browser session.");
    };

    const handleFile = (event) => {
        const selected = event.target.files?.[0];
        if (selected) {
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImageSrc(reader.result);
                // reset crop defaults
                setCrop({ x: 0, y: 0 });
                setZoom(1);
            });
            reader.readAsDataURL(selected);
        }
    };

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSaveCrop = async (e) => {
        e.preventDefault();
        try {
            const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels, "cropped-team-member.jpg");
            setFile(croppedFile);
            setImageSrc(null);
            setStatus("Image cropped and ready to save.");
        } catch (error) {
            setStatus("Failed to crop image.");
        }
    };

    const handleCancelCrop = (e) => {
        e.preventDefault();
        setImageSrc(null);
        const fileInput = document.getElementById("team-image-upload");
        if (fileInput) fileInput.value = "";
    };

    const handleEditClick = (item) => {
        setEditingId(item._id);
        setName(item.name);
        setPosition(item.position);
        setCategory(item.category);
        setFile(null); // Clear file so they don't have to re-upload if they don't want to change it
        setStatus(`Editing ${item.name}. Upload a new photo to change it, or leave blank to keep current.`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setName("");
        setPosition("");
        setCategory(CATEGORIES[0]);
        setFile(null);
        setImageSrc(null);
        const fileInput = document.getElementById("team-image-upload");
        if (fileInput) fileInput.value = "";
        setStatus("Edit cancelled.");
    };

    const handleUpload = async (event) => {
        event.preventDefault();
        if (!name.trim() || !position.trim()) { 
            setStatus("Please provide name and position."); 
            return; 
        }
        if (!editingId && !file) {
            setStatus("Please provide an image for the new member."); 
            return; 
        }
        
        setIsBusy(true);
        setStatus(editingId ? "Saving changes..." : "Uploading image and saving member...");
        try {
            const client = getWriteClient();
            let newImageRef = null;

            if (file) {
                const asset = await client.assets.upload("image", file, { filename: file.name });
                newImageRef = { _type: "image", asset: { _type: "reference", _ref: asset._id } };
            }

            if (editingId) {
                const patch = client.patch(editingId).set({
                    name: name.trim(),
                    position: position.trim(),
                    category: category
                });
                if (newImageRef) {
                    patch.set({ image: newImageRef });
                }
                await patch.commit();
                setStatus(`${name.trim()} updated successfully!`);
            } else {
                await client.create({
                    _type: "teamMember",
                    name: name.trim(),
                    position: position.trim(),
                    category: category,
                    image: newImageRef
                });
                setStatus(`${name.trim()} added successfully!`);
            }
            
            // Reset form
            setEditingId(null);
            setFile(null);
            setName("");
            setPosition("");
            setCategory(CATEGORIES[0]);
            const fileInput = document.getElementById("team-image-upload");
            if (fileInput) fileInput.value = "";
            
            await loadItems();
        } catch (error) { 
            setStatus(error.message || "Unable to save team member."); 
        } finally { 
            setIsBusy(false); 
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this team member?")) return;
        setIsBusy(true);
        setStatus("Deleting team member...");
        try {
            const client = getWriteClient();
            await client.delete(id);
            setStatus("Team member deleted successfully.");
            
            if (editingId === id) cancelEdit();
            
            await loadItems();
        } catch (error) {
            setStatus(error.message || "Unable to delete member.");
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <div className="team-admin">
            <header className="team-admin__header">
                <h1>Team Management</h1>
                <form className="team-admin__auth" onSubmit={handleToken}>
                    <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Enter Sanity write token" />
                    <button type="submit">Unlock Access</button>
                </form>
            </header>
            
            <div className="team-admin-content">
                {imageSrc && (
                    <div className="crop-modal-overlay">
                        <div className="crop-modal-content">
                            <h3>Adjust Image</h3>
                            <div className="crop-container">
                                <Cropper
                                    image={imageSrc}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1 / 1.25}
                                    onCropChange={setCrop}
                                    onCropComplete={onCropComplete}
                                    onZoomChange={setZoom}
                                />
                            </div>
                            <div className="crop-controls">
                                <label>Zoom</label>
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    onChange={(e) => setZoom(e.target.value)}
                                    className="zoom-range"
                                />
                            </div>
                            <div className="crop-modal-actions">
                                <button type="button" onClick={handleCancelCrop} className="cancel-btn">Cancel</button>
                                <button type="button" onClick={handleSaveCrop} className="save-btn">Save Crop</button>
                            </div>
                        </div>
                    </div>
                )}
                
                <section className="team-admin__upload-section">
                    <h2>{editingId ? "Edit Team Member" : "Add Team Member"}</h2>
                    <form className="team-admin__upload-form" onSubmit={handleUpload}>
                        <div className="form-group">
                            <label>Name</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. John Doe" disabled={isBusy} required />
                        </div>
                        <div className="form-group">
                            <label>Position</label>
                            <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Lead Cinematographer" disabled={isBusy} required />
                        </div>
                        <div className="form-group">
                            <label>Category / Hierarchy</label>
                            <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={isBusy}>
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Photo {editingId && "(Optional - Leave blank to keep current)"}</label>
                            <input id="team-image-upload" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} disabled={isBusy} required={!editingId} />
                        </div>
                        
                        <div className="form-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button type="submit" disabled={isBusy} className="upload-button" style={{ flex: 1 }}>
                                {isBusy ? "Processing..." : editingId ? "Save Changes" : "Add Member"}
                            </button>
                            {editingId && (
                                <button type="button" disabled={isBusy} className="cancel-button" onClick={cancelEdit} style={{ flex: 1, padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', cursor: 'pointer' }}>
                                    Cancel Edit
                                </button>
                            )}
                        </div>
                        {status && <div className="team-admin__status" role="status">{status}</div>}
                    </form>
                </section>

                <section className="team-admin__preview-section">
                    <h2>Current Team Members ({items.length})</h2>
                    <div className="team-admin__grid">
                        {CATEGORIES.map(cat => {
                            const catMembers = items.filter(item => item.category === cat);
                            if (catMembers.length === 0) return null;
                            return (
                                <div key={cat} className="team-admin__category-group">
                                    <h3>{cat}</h3>
                                    <div className="team-admin__items">
                                        {catMembers.map((item) => (
                                            <div key={item._id} className="team-admin__item">
                                                <img src={item.preview} alt={item.name} loading="lazy" />
                                                <div className="team-admin__item-info">
                                                    <strong>{item.name}</strong>
                                                    <span>{item.position}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem', width: '100%', marginTop: '1rem' }}>
                                                    <button type="button" className="edit-button" onClick={() => handleEditClick(item)} disabled={isBusy} style={{ flex: 1, padding: '0.5rem', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', cursor: 'pointer' }}>Edit</button>
                                                    <button type="button" className="delete-button" onClick={() => handleDelete(item._id)} disabled={isBusy} style={{ flex: 1, margin: 0 }}>Delete</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default TeamAdmin;
