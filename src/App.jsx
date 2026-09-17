import { useState, useEffect, lazy, Suspense } from "react";
import LoadingScreen from "./LoadingScreen/LoadingScreen";
import RotateGate from "./RotateGate/RotateGate";
import Section1 from "./Home/Section1";
import Section2 from "./SelectedWork/Section2";
import GalleryAdmin from "./GalleryAdmin/GalleryAdmin";
import VideoAdmin from "./VideoAdmin/VideoAdmin";
import TeamAdmin from "./TeamAdmin/TeamAdmin";
import Section3 from "./Section3";
import { Routes, Route, useLocation } from "react-router-dom";

// ─── Blog System (lazy-loaded so it doesn't affect initial bundle) ─────────────
const BlogPage = lazy(() => import("./Blog/BlogPage"));
const BlogDetail = lazy(() => import("./Blog/BlogDetail"));
const BlogLogin = lazy(() => import("./Blog/Portal/BlogLogin"));
const BlogDashboard = lazy(() => import("./Blog/Portal/BlogDashboard"));
const BlogEditor = lazy(() => import("./Blog/Portal/BlogEditor"));

const ContactPage = lazy(() => import("./ContactPage"));

// Admin pages
const AdminDashboard = lazy(() => import("./Blog/Admin/AdminDashboard"));
const AdminBlogList = lazy(() => import("./Blog/Admin/AdminBlogList"));
const AdminBlogReview = lazy(() => import("./Blog/Admin/AdminBlogReview"));
const AdminPosterManagement = lazy(() => import("./Blog/Admin/AdminPosterManagement"));
const AdminManagerConfig = lazy(() => import("./Blog/Admin/AdminManagerConfig"));
const AdminSetupDashboard = lazy(() => import("./Blog/Admin/AdminSetupDashboard"));

// Minimal loading fallback (matches dark bg — no flash)
const PageFallback = () => (
  <div style={{ minHeight: "100vh", background: "#080a0d", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div style={{ width: 20, height: 20, border: "2px solid rgba(242,241,235,0.08)", borderTopColor: "rgba(125,229,210,0.5)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

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

    // Failsafe: max 10 seconds loading time
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
      <RotateGate />
      {isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} assetsLoaded={assetsLoaded} />}

      <ScrollToTop />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* ─── Existing Routes (unchanged) ─────────────────────────── */}
          <Route path="/" element={<Section1 />} />
          <Route path="/work" element={<Section2 />} />
          <Route path="/aboutUs" element={<Section3 />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/gallery-admin" element={<GalleryAdmin />} />
          <Route path="/video-admin" element={<VideoAdmin />} />
          <Route path="/team-admin" element={<TeamAdmin />} />

          {/* ─── Public Blog Routes ───────────────────────────────────── */}
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogDetail />} />

          {/* ─── Poster Portal Routes ─────────────────────────────────── */}
          <Route path="/blog/login" element={<BlogLogin />} />
          <Route path="/blog/dashboard" element={<BlogDashboard />} />
          <Route path="/blog/create" element={<BlogEditor />} />
          <Route path="/blog/edit/:id" element={<BlogEditor />} />
          <Route path="/blog/preview/:id" element={<BlogDetail />} />

          {/* ─── Admin Routes ─────────────────────────────────────────── */}
          <Route path="/admin/blogs" element={<AdminDashboard />} />
          <Route path="/admin/blogs/list" element={<AdminBlogList />} />
          <Route path="/admin/blogs/:id/review" element={<AdminBlogReview />} />
          <Route path="/admin/blog-posters" element={<AdminPosterManagement />} />
          <Route path="/admin/blog-managers" element={<AdminManagerConfig />} />
          <Route path="/admin/setup" element={<AdminSetupDashboard />} />
        </Routes>
      </Suspense>
    </>
  );
};

export default App;
