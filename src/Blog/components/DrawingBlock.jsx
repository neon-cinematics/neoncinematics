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
  const [tool, setTool] = useState("pen"); // pen | marker | eraser | line | arrow | rect | circle
  const [color, setColor] = useState("#FCEDB6");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [historyStep, setHistoryStep] = useState(-1);
  const [historyLength, setHistoryLength] = useState(0);

  // Imperative state refs to eliminate asynchronous closure lag in high-frequency pointer listeners
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const strokeWidthRef = useRef(strokeWidth);
  const isDrawingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const lastPosRef = useRef({ x: 0, y: 0 });
  const snapshotRef = useRef(null);
  const historyRef = useRef([]);
  const historyStepRef = useRef(-1);

  // Sync refs with React state changes
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { strokeWidthRef.current = strokeWidth; }, [strokeWidth]);

  const saveHistoryState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const nextStep = historyStepRef.current + 1;
    const nextHistory = [...historyRef.current.slice(0, nextStep), data];
    historyRef.current = nextHistory;
    historyStepRef.current = nextHistory.length - 1;
    setHistoryStep(historyStepRef.current);
    setHistoryLength(nextHistory.length);
  }, []);

  // Initialize canvas resolution & initial state
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = 900;
    const displayHeight = 550;

    canvas.width = Math.round(displayWidth * dpr);
    canvas.height = Math.round(displayHeight * dpr);

    // Initial dark background fill
    ctx.fillStyle = "#0d0c11";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (initialData?.dataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        saveHistoryState();
      };
      img.src = initialData.dataUrl;
    } else {
      saveHistoryState();
    }
  }, [initialData, saveHistoryState]);

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, scale: 1 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      scale: scaleX,
    };
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (_) {}

    const coords = getCanvasCoords(e);
    isDrawingRef.current = true;
    startPosRef.current = coords;
    lastPosRef.current = coords;

    const ctx = canvas.getContext("2d");
    snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // For freehand tools (pen, marker, eraser), draw initial dot
    const currentTool = toolRef.current;
    if (["pen", "marker", "eraser"].includes(currentTool)) {
      const currentWidth = strokeWidthRef.current * coords.scale;
      ctx.save();
      ctx.fillStyle = currentTool === "eraser"
        ? "#0d0c11"
        : currentTool === "marker"
        ? colorRef.current + "55"
        : colorRef.current;
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, currentWidth / 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    }
  };

  const handlePointerMove = (e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const coords = getCanvasCoords(e);

    const currentTool = toolRef.current;
    const currentColor = colorRef.current;
    const currentWidth = strokeWidthRef.current * coords.scale;

    if (["pen", "marker", "eraser"].includes(currentTool)) {
      // Freehand segment stroke
      ctx.save();
      ctx.lineWidth = currentWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (currentTool === "eraser") {
        ctx.strokeStyle = "#0d0c11";
      } else if (currentTool === "marker") {
        ctx.strokeStyle = currentColor + "55"; // 33% alpha highlighter
      } else {
        ctx.strokeStyle = currentColor;
      }

      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      ctx.restore();

      lastPosRef.current = coords;
    } else if (["line", "arrow", "rect", "circle"].includes(currentTool)) {
      // Restore clean committed canvas snapshot before rendering new single preview shape
      if (snapshotRef.current) {
        ctx.putImageData(snapshotRef.current, 0, 0);
      }

      ctx.save();
      ctx.lineWidth = currentWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = currentColor;
      ctx.fillStyle = "transparent";

      const startX = startPosRef.current.x;
      const startY = startPosRef.current.y;
      const endX = coords.x;
      const endY = coords.y;

      if (currentTool === "line") {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      } else if (currentTool === "arrow") {
        // Shaft
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Arrowhead
        const angle = Math.atan2(endY - startY, endX - startX);
        const headLen = Math.max(14 * coords.scale, currentWidth * 2.5);
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - headLen * Math.cos(angle - Math.PI / 6), endY - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - headLen * Math.cos(angle + Math.PI / 6), endY - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      } else if (currentTool === "rect") {
        ctx.beginPath();
        ctx.strokeRect(startX, startY, endX - startX, endY - startY);
      } else if (currentTool === "circle") {
        const rx = Math.abs(endX - startX) / 2;
        const ry = Math.abs(endY - startY) / 2;
        const cx = Math.min(startX, endX) + rx;
        const cy = Math.min(startY, endY) + ry;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, 2 * Math.PI);
        ctx.stroke();
      }

      ctx.restore();
    }
  };

  const handlePointerUp = (e) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas && e.pointerId !== undefined) {
      try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    snapshotRef.current = null;
    saveHistoryState();
  };

  const handleUndo = () => {
    if (historyStepRef.current <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const prevStep = historyStepRef.current - 1;
    const data = historyRef.current[prevStep];
    if (data) {
      ctx.putImageData(data, 0, 0);
      historyStepRef.current = prevStep;
      setHistoryStep(prevStep);
    }
  };

  const handleRedo = () => {
    if (historyStepRef.current >= historyRef.current.length - 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const nextStep = historyStepRef.current + 1;
    const data = historyRef.current[nextStep];
    if (data) {
      ctx.putImageData(data, 0, 0);
      historyStepRef.current = nextStep;
      setHistoryStep(nextStep);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0d0c11";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveHistoryState();
  };

  const handleSaveDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSave({ dataUrl });
    onClose();
  };

  // Keyboard shortcut support (Ctrl+Z, Ctrl+Y, Esc)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="drawing-modal-overlay">
      <div className="drawing-modal">
        <header className="drawing-modal__header">
          <div className="drawing-modal__title">
            <span className="drawing-modal__icon">🎨</span>
            <span>Embedded Canvas Studio</span>
          </div>

          <div className="drawing-modal__header-actions">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyStep <= 0}
              className="drawing-btn"
              title="Undo (Ctrl+Z)"
            >
              ↩ Undo
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyStep >= historyLength - 1}
              className="drawing-btn"
              title="Redo (Ctrl+Y)"
            >
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
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
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
