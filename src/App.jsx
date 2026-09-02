import { useState } from "react";
import LoadingScreen from "./LoadingScreen/LoadingScreen";
import { useEffect } from "react";
import Section1 from "./Home/Section1";
import Section2 from "./SelectedWork/Section2";
import GalleryAdmin from "./GalleryAdmin/GalleryAdmin";
import VideoAdmin from "./VideoAdmin/VideoAdmin";
import TeamAdmin from "./TeamAdmin/TeamAdmin";
import Section3 from "./Section3";
import CrtTVDisplay from "./components/CrtTVDisplay/CrtTVDisplay";
import { Routes, Route, useLocation } from "react-router-dom";


const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    if (!location.state?.scrollToGallery) {
        window.scrollTo(0, 0);
    }
  }, [location.pathname, location.state]);

  return null;
};

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  useEffect(() => {
    const criticalAssets = [
      { type: 'image', url: '/neon_logo.png' },
      { type: 'video', url: '/page1animationv2.mp4' }
    ];

    let loadedCount = 0;
    let timeoutId;

    const checkComplete = () => {
      loadedCount++;
      if (loadedCount === criticalAssets.length) {
        setAssetsLoaded(true);
        clearTimeout(timeoutId);
      }
    };

    timeoutId = setTimeout(() => {
      setAssetsLoaded(true);
    }, 10000);

    criticalAssets.forEach(asset => {
      if (asset.type === 'image') {
        const img = new Image();
        img.src = asset.url;
        img.onload = checkComplete;
        img.onerror = checkComplete; 
      } else if (asset.type === 'video') {
        const video = document.createElement('video');
        video.src = asset.url;
        video.onloadeddata = checkComplete;
        video.onerror = checkComplete;
      }
    });

    return () => clearTimeout(timeoutId);
  }, []);
  
  return (
    <>
      {isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} assetsLoaded={assetsLoaded} />}

      <CrtTVDisplay />
      <ScrollToTop />
      <div className="crt-screen-wrapper">
        <Routes>
          <Route path="/" element={<Section1 />} />
          <Route path="/work" element={<Section2 />} />
          <Route path="/aboutUs" element={<Section3 />} />
          <Route path="/gallery-admin" element={<GalleryAdmin />} />
          <Route path="/video-admin" element={<VideoAdmin />} />
          <Route path="/team-admin" element={<TeamAdmin />} />
        </Routes>
      </div>
    </>
  );
};

export default App;
