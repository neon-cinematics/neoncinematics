import { useState } from "react";
import LoadingScreen from "./LoadingScreen/LoadingScreen";
import { useEffect } from "react";
import Section1 from "./Home/Section1";
import Section2 from "./SelectedWork/Section2";
import GalleryAdmin from "./GalleryAdmin/GalleryAdmin";
import VideoAdmin from "./VideoAdmin/VideoAdmin";
import Section3 from "./Section3";
import { Routes, Route, useLocation } from "react-router-dom";


const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return null;
};

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  
  return (
    <>
      {isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} />}

      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Section1 />} />
        <Route path="/work" element={<Section2 />} />
        <Route path="/aboutUs" element={<Section3 />} />
        <Route path="/gallery-admin" element={<GalleryAdmin />} />
        <Route path="/video-admin" element={<VideoAdmin />} />
      </Routes>
    </>
  );
};

export default App;
