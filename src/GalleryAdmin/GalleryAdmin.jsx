import { useEffect, useState } from "react";
import { createSanityWriteClient, galleryPhotosQuery, sanityClient } from "../lib/sanity";
import { sanityImageUrl } from "../lib/sanityImage";
import "./GalleryAdmin.css";

const GalleryAdmin = () => {
    const [token, setToken] = useState(() => sessionStorage.getItem("gallery-admin-token") || "");
    const [items, setItems] = useState([]);
    const [files, setFiles] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [status, setStatus] = useState("");
    const [isBusy, setIsBusy] = useState(false);

    const loadItems = async () => {
        if (!sanityClient) return;
        try {
            const result = await sanityClient.fetch(galleryPhotosQuery);
            setItems(result.map((item) => ({ ...item, preview: sanityImageUrl(item.image, 420) })));
        } catch (error) { setStatus(error.message || "Unable to load gallery images."); }
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

    const handleFiles = (event) => {
        setFiles(Array.from(event.target.files || []));
        setStatus("");
    };

    const handleUpload = async (event) => {
        event.preventDefault();
        if (!files.length) { setStatus("Choose one or more images first."); return; }
        setIsBusy(true);
        try {
            const client = getWriteClient();
            for (let index = 0; index < files.length; index += 1) {
                setStatus(`Uploading image ${index + 1} of ${files.length}...`);
                const asset = await client.assets.upload("image", files[index], { filename: files[index].name });
                await client.create({ _type: "galleryPhoto", image: { _type: "image", asset: { _type: "reference", _ref: asset._id } } });
            }
            setFiles([]);
            event.target.reset();
            setStatus(`${files.length} image${files.length === 1 ? "" : "s"} added to the gallery.`);
            await loadItems();
        } catch (error) { setStatus(error.message || "Unable to upload images."); }
        finally { setIsBusy(false); }
    };

    const toggleSelection = (id) => setSelectedIds((current) => current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]);
    const toggleAll = () => setSelectedIds(selectedIds.length === items.length ? [] : items.map((item) => item._id));

    const handleDelete = async () => {
        if (!selectedIds.length || !window.confirm(`Remove ${selectedIds.length} selected image${selectedIds.length === 1 ? "" : "s"}?`)) return;
        setIsBusy(true);
        try {
            const client = getWriteClient();
            const selectedItems = items.filter((item) => selectedIds.includes(item._id));
            for (const item of selectedItems) {
                await client.delete(item._id);
                if (item.assetId) {
                    try {
                        await client.delete(item.assetId);
                    } catch (e) {
                        console.warn("Could not delete asset, it may still be referenced:", e);
                    }
                }
            }
            setItems((current) => current.filter((item) => !selectedIds.includes(item._id)));
            setSelectedIds([]);
            setStatus("Selected images removed from the gallery.");
        } catch (error) { setStatus(error.message || "Unable to remove selected images."); }
        finally { setIsBusy(false); }
    };

    const handleSetCenter = async () => {
        if (selectedIds.length !== 1) return;
        setIsBusy(true);
        try {
            const client = getWriteClient();
            const centerItems = items.filter(item => item.isCenter && item._id !== selectedIds[0]);
            for (const item of centerItems) {
                await client.patch(item._id).unset(["isCenter"]).commit();
            }
            await client.patch(selectedIds[0]).set({ isCenter: true }).commit();
            setItems(current => current.map(item => ({
                ...item,
                isCenter: item._id === selectedIds[0]
            })));
            setStatus("Selected image set as center.");
        } catch (error) { setStatus(error.message || "Unable to set center image."); }
        finally { setIsBusy(false); }
    };

    return <main className="gallery-admin">
        <header className="gallery-admin__header"><div className="gallery-admin__intro"><span>Gallery manager</span><h1>Selected work.</h1><p>Add or remove images from the gallery in a few clicks.</p></div></header>
        <section className="gallery-admin__access"><form onSubmit={handleToken}><label>Sanity write token<input type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste token for this session" required /></label><button type="submit">Unlock editing</button></form><p className="gallery-admin__security">The token is stored in this browser session only.</p></section>
        <form className="gallery-admin__form" onSubmit={handleUpload}><h2>Add images</h2><label className="gallery-admin__dropzone">Choose multiple images<input type="file" accept="image/*" multiple onChange={handleFiles} required /><strong>{files.length ? `${files.length} image${files.length === 1 ? "" : "s"} selected` : "Select files"}</strong></label><button type="submit" disabled={isBusy}>{isBusy ? "Working..." : "Upload images"}</button></form>
        <section className="gallery-admin__items"><div className="gallery-admin__items-heading"><h2>Current images <small>{items.length}</small></h2><div><button type="button" onClick={toggleAll} disabled={!items.length}>{selectedIds.length === items.length && items.length ? "Clear all" : "Select all"}</button><button className="gallery-admin__center" type="button" onClick={handleSetCenter} disabled={selectedIds.length !== 1 || isBusy}>Set Center</button><button className="gallery-admin__delete" type="button" onClick={handleDelete} disabled={!selectedIds.length || isBusy}>Delete selected {selectedIds.length ? `(${selectedIds.length})` : ""}</button></div></div>{items.length === 0 ? <p className="gallery-admin__empty">No gallery images found.</p> : <div className="gallery-admin__grid">{items.map((item) => <label className={`gallery-admin__item${selectedIds.includes(item._id) ? " is-selected" : ""}${item.isCenter ? " is-center" : ""}`} key={item._id}><input type="checkbox" checked={selectedIds.includes(item._id)} onChange={() => toggleSelection(item._id)} /><img src={item.preview} alt="" />{item.isCenter && <span className="gallery-admin__badge">Center</span>}</label>)}</div>}</section>
        <p className="gallery-admin__status" aria-live="polite">{status}</p>
    </main>;
};

export default GalleryAdmin;
