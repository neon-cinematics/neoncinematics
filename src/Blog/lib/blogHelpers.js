// ─── Blog Status Workflow Helpers ────────────────────────────────────────────

export const STATUS = {
    DRAFT: "draft",
    SUBMITTED: "submitted",
    UNDER_REVIEW: "under_review",
    APPROVED: "approved",
    REJECTED: "rejected",
    PUBLISHED: "published",
};

export const STATUS_LABELS = {
    draft: "Draft",
    submitted: "Submitted",
    under_review: "Under Review",
    approved: "Approved",
    rejected: "Rejected",
    published: "Published",
};

export const STATUS_COLORS = {
    draft: { bg: "var(--surface-raised)", color: "var(--text-secondary)", border: "var(--border-default)" },
    submitted: { bg: "var(--accent-subtle)", color: "var(--accent)", border: "var(--border-strong)" },
    under_review: { bg: "var(--warning-subtle)", color: "var(--warning)", border: "var(--border-default)" },
    approved: { bg: "var(--success-subtle)", color: "var(--success)", border: "var(--border-default)" },
    rejected: { bg: "var(--error-subtle)", color: "var(--error)", border: "var(--border-default)" },
    published: { bg: "var(--success-subtle)", color: "var(--success)", border: "var(--border-default)" },
};

/** Get available poster actions for a blog's status */
export const getPosterActions = (status) => {
    switch (status) {
        case STATUS.DRAFT:
            return ["edit", "preview", "delete", "submit"];
        case STATUS.SUBMITTED:
        case STATUS.UNDER_REVIEW:
            return ["view", "preview"];
        case STATUS.REJECTED:
            return ["view", "preview", "edit", "resubmit"];
        case STATUS.APPROVED:
            return ["view", "preview"];
        case STATUS.PUBLISHED:
            return ["view_public", "preview"];
        default:
            return ["view"];
    }
};

/** Get available admin actions for a blog's status */
export const getAdminActions = (status) => {
    switch (status) {
        case STATUS.DRAFT:
            return ["view", "delete"];
        case STATUS.SUBMITTED:
        case STATUS.UNDER_REVIEW:
            return ["review", "approve", "reject"];
        case STATUS.APPROVED:
            return ["publish", "reject"];
        case STATUS.REJECTED:
            return ["view", "delete"];
        case STATUS.PUBLISHED:
            return ["unpublish", "view_public"];
        default:
            return ["view"];
    }
};

/** Can a poster edit this blog? */
export const canPosterEdit = (status) =>
    [STATUS.DRAFT, STATUS.REJECTED].includes(status);

/** Can a poster submit this blog? */
export const canPosterSubmit = (status) =>
    [STATUS.DRAFT, STATUS.REJECTED].includes(status);

// ─── Date Formatting ─────────────────────────────────────────────────────────

export const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

export const formatDateTime = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

export const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return formatDate(dateStr);
};

// ─── File Helpers ─────────────────────────────────────────────────────────────

/** Determine the category of an attachment based on MIME type */
export const getAttachmentType = (mimeType) => {
    if (!mimeType) return "file";
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType === "application/pdf") return "pdf";
    if (mimeType.includes("word") || mimeType.includes("document") || mimeType.includes("text")) return "document";
    return "file";
};

/** Format file size in human-readable form */
export const formatFileSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

/** File icon based on type */
export const getFileIcon = (mimeType) => {
    const type = getAttachmentType(mimeType);
    const icons = {
        image: "🖼",
        video: "🎬",
        pdf: "📄",
        document: "📝",
        file: "📦",
    };
    return icons[type] || icons.file;
};

/** NEVER allow executable file types */
export const BLOCKED_MIME_TYPES = [
    "application/x-msdownload",
    "application/x-executable",
    "application/x-sharedlib",
    "application/x-mach-binary",
    "application/x-dosexec",
    "application/x-sh",
    "application/x-csh",
    "text/x-script.python",
    "application/x-httpd-php",
    "application/javascript",
    "text/javascript",
];

export const isBlockedFile = (mimeType, filename) => {
    if (BLOCKED_MIME_TYPES.includes(mimeType)) return true;
    const blockedExtensions = [".exe", ".bat", ".cmd", ".sh", ".php", ".py", ".rb", ".pl", ".ps1", ".vbs", ".js", ".msi"];
    const ext = filename?.toLowerCase().slice(filename.lastIndexOf(".")) || "";
    return blockedExtensions.includes(ext);
};

/** Max file upload size: 100MB */
export const MAX_FILE_SIZE = 100 * 1024 * 1024;

// ─── Slug Utilities ───────────────────────────────────────────────────────────

export const slugify = (text) =>
    text.toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 96);
