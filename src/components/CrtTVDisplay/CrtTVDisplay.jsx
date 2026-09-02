import { useEffect, useState } from "react";
import "./CrtTVDisplay.css";

const CrtTVDisplay = () => {
    const [mapUrl, setMapUrl] = useState("");

    useEffect(() => {
        const SIZE = 1024;
        const HALF = SIZE / 2;
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const imgData = ctx.createImageData(SIZE, SIZE);
        const data = imgData.data;

        for (let y = 0; y < SIZE; y++) {
            const ny = (y - HALF) / HALF;
            for (let x = 0; x < SIZE; x++) {
                const nx = (x - HALF) / HALF;
                const r = Math.sqrt(nx * nx + ny * ny);

                const strength = 0.45;
                const factor = 1 + strength * (r * r);
                
                const dx = nx * (factor - 1) * 1.3;
                const dy = ny * (factor - 1) * 1.5;

                const rVal = Math.min(255, Math.max(0, Math.round(128 + dx * 128)));
                const gVal = Math.min(255, Math.max(0, Math.round(128 + dy * 128)));

                const idx = (y * SIZE + x) * 4;
                data[idx] = rVal;
                data[idx + 1] = gVal;
                data[idx + 2] = 128;
                data[idx + 3] = 255;
            }
        }
        ctx.putImageData(imgData, 0, 0);
        setMapUrl(canvas.toDataURL());
    }, []);

    return (
        <>
            <svg className="crt-svg-filter-container" aria-hidden="true">
                <defs>
                    <filter
                        id="crt-fisheye-warp"
                        x="-20%"
                        y="-20%"
                        width="150%"
                        height="150%"
                        colorInterpolationFilters="sRGB"
                    >
                        {mapUrl && (
                            <feImage
                                href={mapUrl}
                                result="rawMap"
                                preserveAspectRatio="none"
                            />
                        )}
                        <feGaussianBlur
                            in="rawMap"
                            stdDeviation="1.5"
                            result="smoothDisplacementMap"
                        />
                        <feDisplacementMap
                            in="SourceGraphic"
                            in2="smoothDisplacementMap"
                            scale="70"
                            xChannelSelector="R"
                            yChannelSelector="G"
                        />
                    </filter>
                </defs>
            </svg>

            <div className="crt-warp-backdrop-overlay" aria-hidden="true" />
        </>
    );
};

export default CrtTVDisplay;
