import React from 'react';
import './AuroraBackground.css';

const AuroraBackground = () => {
    return (
        <div className="aurora-container" aria-hidden="true">
            <div className="aurora-blob aurora-blob-1"></div>
            <div className="aurora-blob aurora-blob-2"></div>
            <div className="aurora-blob aurora-blob-3"></div>
            <div className="aurora-blob aurora-blob-4"></div>
            <div className="aurora-overlay"></div>
        </div>
    );
};

export default AuroraBackground;
