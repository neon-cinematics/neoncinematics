import { getAttachmentType, getFileIcon, formatFileSize } from "./lib/blogHelpers";
import "./BlogDetail.css";

/**
 * Renders a single Portable Text block from Sanity's content array.
 * Supports: text, headings, lists, blockquotes, code, images, embeds.
 */
const renderMark = (mark, text, key) => {
    switch (mark) {
        case "strong": return <strong key={key}>{text}</strong>;
        case "em": return <em key={key}>{text}</em>;
        case "underline": return <u key={key}>{text}</u>;
        case "code": return <code key={key} className="inline-code">{text}</code>;
        case "strike-through": return <s key={key}>{text}</s>;
        default: return text;
    }
};

const renderSpan = (span, markDefs, index) => {
    const { text, marks = [] } = span;
    if (!marks.length) return <span key={index}>{text}</span>;

    // Check for link marks
    const linkMark = marks.find(m => {
        const def = markDefs?.find(d => d._key === m);
        return def?._type === "link";
    });

    if (linkMark) {
        const def = markDefs?.find(d => d._key === linkMark);
        let content = text;
        const otherMarks = marks.filter(m => m !== linkMark);
        otherMarks.forEach((m, i) => { content = renderMark(m, content, i); });
        return (
            <a
                key={index}
                href={def.href}
                target="_blank"
                rel="noopener noreferrer"
                className="blog-content__link"
            >
                {content}
            </a>
        );
    }

    return marks.reduce((acc, mark, i) => renderMark(mark, acc, `${index}-${i}`), <span key={index}>{text}</span>);
};

const renderChildren = (children, markDefs) => {
    if (!children) return null;
    return children.map((child, i) => {
        if (child._type === "span") return renderSpan(child, markDefs, i);
        return null;
    });
};

export const PortableTextRenderer = ({ content }) => {
    if (!content || !Array.isArray(content)) {
        return null;
    }

    const listBuffer = [];
    const elements = [];
    let listType = null;

    const flushList = () => {
        if (listBuffer.length === 0) return;
        const Tag = listType === "number" ? "ol" : "ul";
        elements.push(
            <Tag key={`list-${elements.length}`} className="blog-content__list">
                {listBuffer.map((item, i) => (
                    <li key={i}>{renderChildren(item.children, item.markDefs)}</li>
                ))}
            </Tag>
        );
        listBuffer.length = 0;
        listType = null;
    };

    content.forEach((block, index) => {
        const key = block._key || index;

        // ─── Sanity image block ───────────────────────────────────────────────
        if (block._type === "image") {
            flushList();
            const url = block.asset?.url || block.url;
            if (url) {
                elements.push(
                    <figure key={key} className="blog-content__image-block">
                        <img src={url} alt={block.alt || "Blog image"} loading="lazy" />
                        {block.caption && <figcaption>{block.caption}</figcaption>}
                    </figure>
                );
            }
            return;
        }

        // ─── Code block ──────────────────────────────────────────────────────
        if (block._type === "code") {
            flushList();
            elements.push(
                <div key={key} className="blog-content__code-block">
                    {block.language && <span className="blog-content__code-lang">{block.language}</span>}
                    <pre><code>{block.code}</code></pre>
                </div>
            );
            return;
        }

        // ─── Normal text blocks ──────────────────────────────────────────────
        if (block._type === "block") {
            const { style = "normal", listItem, level = 1, children, markDefs } = block;

            // List items
            if (listItem) {
                if (listType && listType !== listItem) flushList();
                listType = listItem;
                listBuffer.push({ children, markDefs });
                return;
            }

            flushList();

            const rendered = renderChildren(children, markDefs);

            switch (style) {
                case "h1":
                    elements.push(<h1 key={key} className="blog-content__h1">{rendered}</h1>);
                    break;
                case "h2":
                    elements.push(<h2 key={key} className="blog-content__h2">{rendered}</h2>);
                    break;
                case "h3":
                    elements.push(<h3 key={key} className="blog-content__h3">{rendered}</h3>);
                    break;
                case "h4":
                    elements.push(<h4 key={key} className="blog-content__h4">{rendered}</h4>);
                    break;
                case "blockquote":
                    elements.push(<blockquote key={key} className="blog-content__blockquote">{rendered}</blockquote>);
                    break;
                default: // normal
                    // Skip empty paragraphs
                    const textContent = children?.map(c => c.text || "").join("").trim();
                    if (textContent) {
                        elements.push(<p key={key} className="blog-content__p">{rendered}</p>);
                    } else {
                        elements.push(<div key={key} className="blog-content__spacer" />);
                    }
            }
        }
    });

    flushList(); // flush any remaining list

    return <div className="blog-content">{elements}</div>;
};

// ─── Attachment Viewer ────────────────────────────────────────────────────────

const AttachmentCard = ({ attachment }) => {
    const type = getAttachmentType(attachment.mimeType);
    const icon = getFileIcon(attachment.mimeType);
    const size = formatFileSize(attachment.fileSize);

    return (
        <div className="attachment-card">
            {type === "image" && attachment.url && (
                <div className="attachment-card__preview attachment-card__preview--image">
                    <img src={attachment.url} alt={attachment.filename} loading="lazy" />
                </div>
            )}

            {type === "video" && attachment.url && (
                <div className="attachment-card__preview attachment-card__preview--video">
                    <video controls preload="metadata">
                        <source src={attachment.url} type={attachment.mimeType} />
                        Your browser does not support video playback.
                    </video>
                </div>
            )}

            {type === "pdf" && attachment.url && (
                <div className="attachment-card__preview attachment-card__preview--pdf">
                    <iframe
                        src={`${attachment.url}#toolbar=0`}
                        title={attachment.filename}
                        loading="lazy"
                    />
                </div>
            )}

            <div className="attachment-card__meta">
                <span className="attachment-card__icon">{icon}</span>
                <div className="attachment-card__info">
                    <span className="attachment-card__name">{attachment.filename}</span>
                    {size && <span className="attachment-card__size">{size}</span>}
                </div>
                {attachment.url && (
                    <a
                        href={attachment.url}
                        download={attachment.filename}
                        className="attachment-card__download"
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Download"
                        aria-label={`Download ${attachment.filename}`}
                    >
                        ↓
                    </a>
                )}
            </div>
        </div>
    );
};

export const AttachmentsSection = ({ attachments }) => {
    if (!attachments?.length) return null;

    return (
        <section className="blog-detail__attachments">
            <h2 className="blog-detail__attachments-title">
                <span>Resources & Attachments</span>
                <span className="blog-detail__attachments-count">{attachments.length}</span>
            </h2>
            <div className="attachments-grid">
                {attachments.map((att) => (
                    <AttachmentCard key={att._key || att.assetId} attachment={att} />
                ))}
            </div>
        </section>
    );
};

export default PortableTextRenderer;
