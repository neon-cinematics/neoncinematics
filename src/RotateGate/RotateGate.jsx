import { useState, useEffect } from 'react';
import GlitchText from '../components/ReactBits/GlitchText';
import './RotateGate.css';

export function isNonPCDevice() {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || window.opera || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(userAgent);
  
  const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const isSmallOrTabletScreen = Math.min(window.innerWidth, window.innerHeight) <= 1024;
  
  return isMobileUA || (hasTouch && isSmallOrTabletScreen);
}

export function isPortraitOrientation() {
  if (typeof window === 'undefined') return false;
  if (window.screen && window.screen.orientation && window.screen.orientation.type) {
    return window.screen.orientation.type.startsWith('portrait');
  }
  return window.innerHeight > window.innerWidth;
}

const RotateGate = ({ onOrientationChange }) => {
  const [needsRotation, setNeedsRotation] = useState(() => {
    return isNonPCDevice() && isPortraitOrientation();
  });

  useEffect(() => {
    const handleCheck = () => {
      const nonPC = isNonPCDevice();
      const portrait = isPortraitOrientation();
      const shouldBlock = nonPC && portrait;
      setNeedsRotation(shouldBlock);
      if (onOrientationChange) {
        onOrientationChange(shouldBlock);
      }
    };

    handleCheck();

    window.addEventListener('resize', handleCheck);
    window.addEventListener('orientationchange', handleCheck);
    
    let orientationObj = window.screen && window.screen.orientation;
    if (orientationObj && orientationObj.addEventListener) {
      orientationObj.addEventListener('change', handleCheck);
    }

    return () => {
      window.removeEventListener('resize', handleCheck);
      window.removeEventListener('orientationchange', handleCheck);
      if (orientationObj && orientationObj.removeEventListener) {
        orientationObj.removeEventListener('change', handleCheck);
      }
    };
  }, [onOrientationChange]);

  if (!needsRotation) {
    return null;
  }

  return (
    <div className="rotate-gate-overlay">
      <div className="rotate-gate-content">
        <GlitchText
          speed={1.5}
          enableShadows={true}
          enableOnHover={false}
          className="rotate-glitch-text"
        >
          Rotate your device
        </GlitchText>
      </div>
    </div>
  );
};

export default RotateGate;
