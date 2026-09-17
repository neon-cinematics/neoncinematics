import { useState, useRef, useEffect, useCallback } from "react";
import "./DrawingBlock.css";

const COLOR_PALETTE = [
  "#ffffff",
  "#FCEDB6",
  "#ff9f0a",
  "#00b4ff",
  "#10b981",
  "#f43f5e",
  "#a1a1aa",
  "#18181b"
];

const STROKE_SIZES = [
  { label: "Fine", value: 2 },
  { label: "Medium", value: 5 },
  { label: "Thick", value: 12 }
];

export const DrawingModal = ({ initialData, onSave, onClose }) => {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState("pen"); // pen | marker | eraser | rect | circle | arrow | line
  const [color, setColor] = useState("#FCEDB6");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [startPos, setStartPos] = useState(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    // Set actual display resolution
    canvas.width = 900;
    canvas.height = 550;

    // Fill initial dark canvas background
    ctx.fillStyle = "#0d0c11";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // If initial image exists, draw it
    if (initialData?.dataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        saveHistoryState();
      };
      img.src = initialData.dataUrl;
    } else {
      saveHistoryState();
    }
  }, []);

  const saveHistoryState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory(prev => [...prev.slice(0, historyStep + 1), data]);
    setHistoryStep(prev => prev + 1);
  };

  const handleUndo = () => {
    if (historyStep <= 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const prevStep = historyStep - 1;
    ctx.putImageData(history[prevStep], 0, 0);
    setHistoryStep(prevStep);
  };

  const handleRedo = () => {
    if (historyStep >= history.length - 1) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const nextStep = historyStep + 1;
    ctx.putImageData(history[nextStep], 0, 0);
    setHistoryStep(nextStep);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0d0c11";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveHistoryState();
  };

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const pos = getCoordinates(e);
    setIsDrawing(true);
    setStartPos(pos);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.lineWidth = strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (tool === "eraser") {
      ctx.strokeStyle = "#0d0c11";
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === "marker") {
      ctx.strokeStyle = color + "66"; // 40% opacity marker
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === "pen") {
      ctx.strokeStyle = color;
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (["rect", "circle", "line", "arrow"].includes(tool)) {
      // Live preview for shape tools: restore previous history state first
      if (history[historyStep]) {
        ctx.putImageData(history[historyStep], 0, 0);
      }
      ctx.strokeStyle = color;
      ctx.fillStyle = "transparent";

      if (tool === "rect") {
        ctx.strokeRect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
      } else if (tool === "circle") {
        const radius = Math.hypot(pos.x - startPos.x, pos.y - startPos.y);
        ctx.beginPath();
        ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (tool === "line") {
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      } else if (tool === "arrow") {
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        // Arrow head
        const angle = Math.atan2(pos.y - startPos.y, pos.x - startPos.x);
        const headLen = 14;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(pos.x - headLen * Math.cos(angle - Math.PI / 6), pos.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(pos.x - headLen * Math.cos(angle + Math.PI / 6), pos.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
    }
  };

  const endDraw = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveHistoryState();
    }
  };

  const handleSaveDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSave({ dataUrl });
    onClose();
  };

  return (
    <div className="drawing-modal-overlay">
      <div className="drawing-modal">
        <header className="drawing-modal__header">
          <div className="drawing-modal__title">
            <span className="drawing-modal__icon">🎨</span>
            <span>Embedded Canvas Studio</span>
          </div>

          <div className="drawing-modal__header-actions">
            <button type="button" onClick={handleUndo} disabled={historyStep <= 0} className="drawing-btn">
              ↩ Undo
            </button>
            <button type="button" onClick={handleRedo} disabled={historyStep >= history.length - 1} className="drawing-btn">
              ↪ Redo
            </button>
            <button type="button" onClick={handleClear} className="drawing-btn drawing-btn--danger">
              Clear
            </button>
            <button type="button" onClick={onClose} className="drawing-btn drawing-btn--ghost">
              Cancel
            </button>
            <button type="button" onClick={handleSaveDrawing} className="drawing-btn drawing-btn--primary">
              Done & Save
            </button>
          </div>
        </header>

        {/* Toolbar */}
        <div className="drawing-modal__toolbar">
          {/* Tool selector */}
          <div className="drawing-tool-group">
            <button
              type="button"
              className={`tool-btn ${tool === "pen" ? "active" : ""}`}
              onClick={() => setTool("pen")}
              title="Pen"
            >
              ✏️ Pen
            </button>
            <button
              type="button"
              className={`tool-btn ${tool === "marker" ? "active" : ""}`}
              onClick={() => setTool("marker")}
              title="Highlighter"
            >
              🖌️ Marker
            </button>
            <button
              type="button"
              className={`tool-btn ${tool === "eraser" ? "active" : ""}`}
              onClick={() => setTool("eraser")}
              title="Eraser"
            >
              🧹 Eraser
            </button>
            <button
              type="button"
              className={`tool-btn ${tool === "line" ? "active" : ""}`}
              onClick={() => setTool("line")}
              title="Line"
            >
              ╱ Line
            </button>
            <button
              type="button"
              className={`tool-btn ${tool === "arrow" ? "active" : ""}`}
              onClick={() => setTool("arrow")}
              title="Arrow"
            >
              ↘ Arrow
            </button>
            <button
              type="button"
              className={`tool-btn ${tool === "rect" ? "active" : ""}`}
              onClick={() => setTool("rect")}
              title="Rectangle"
            >
              ▭ Rect
            </button>
            <button
              type="button"
              className={`tool-btn ${tool === "circle" ? "active" : ""}`}
              onClick={() => setTool("circle")}
              title="Circle"
            >
              ◯ Circle
            </button>
          </div>

          <div className="drawing-toolbar__divider" />

          {/* Color palette */}
          <div className="drawing-color-palette">
            {COLOR_PALETTE.map(c => (
              <button
                key={c}
                type="button"
                className={`color-swatch ${color === c ? "active" : ""}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>

          <div className="drawing-toolbar__divider" />

          {/* Stroke sizes */}
          <div className="drawing-stroke-sizes">
            {STROKE_SIZES.map(s => (
              <button
                key={s.value}
                type="button"
                className={`stroke-btn ${strokeWidth === s.value ? "active" : ""}`}
                onClick={() => setStrokeWidth(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Canvas area */}
        <div className="drawing-modal__canvas-wrapper">
          <canvas
            ref={canvasRef}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
            className="drawing-modal__canvas"
          />
        </div>
      </div>
    </div>
  );
};

const DrawingBlock = ({
  dataUrl,
  caption = "",
  altText = "",
  onUpdate,
  onDelete,
  isEditable = true
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localCaption, setLocalCaption] = useState(caption);

  const handleSaveFromModal = ({ dataUrl: newUrl }) => {
    if (onUpdate) {
      onUpdate({ dataUrl: newUrl, caption: localCaption, altText });
    }
  };

  const handleCaptionBlur = () => {
    if (onUpdate) {
      onUpdate({ dataUrl, caption: localCaption, altText });
    }
  };

  return (
    <div className="drawing-block">
      {dataUrl ? (
        <div className="drawing-block__container">
          <div className="drawing-block__preview-wrapper">
            <img src={dataUrl} alt={altText || "Illustration"} className="drawing-block__img" />
            {isEditable && (
              <div className="drawing-block__overlay-actions">
                <button type="button" onClick={() => setIsModalOpen(true)} className="drawing-block__btn">
                  ✏️ Edit Drawing
                </button>
                {onDelete && (
                  <button type="button" onClick={onDelete} className="drawing-block__btn drawing-block__btn--danger">
                    🗑 Delete
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Caption input or text */}
          {isEditable ? (
            <input
              type="text"
              placeholder="Add caption to drawing..."
              value={localCaption}
              onChange={(e) => setLocalCaption(e.target.value)}
              onBlur={handleCaptionBlur}
              className="drawing-block__caption-input"
            />
          ) : (
            localCaption && <p className="drawing-block__caption">{localCaption}</p>
          )}
        </div>
      ) : (
        <div className="drawing-block__empty" onClick={() => setIsModalOpen(true)}>
          <span className="drawing-block__empty-icon">🎨</span>
          <span className="drawing-block__empty-text">Click to open drawing canvas studio</span>
        </div>
      )}

      {isModalOpen && (
        <DrawingModal
          initialData={{ dataUrl }}
          onSave={handleSaveFromModal}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default DrawingBlock;
