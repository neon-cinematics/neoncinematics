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
import { preloadMediaAssets } from "./lib/assetPreloader";

// ─── Blog System (lazy-loaded so it doesn't affect initial bundle) ─────────────
const BlogPage = lazy(() => import("./Blog/BlogPage"));
const BlogDetail = lazy(() => import("./Blog/BlogDetail"));
const BlogLogin = lazy(() => import("./Blog/Portal/BlogLogin"));
const BlogDashboard = lazy(() => import("./Blog/Portal/BlogDashboard"));
const BlogEditor = lazy(() => import("./Blog/Portal/BlogEditor"));

const ContactPage = lazy(() => import("./ContactPage"));

// Admin pages
const MasterAdminDashboard = lazy(() => import("./Blog/Admin/MasterAdminDashboard"));
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
  const [preloadProgress, setPreloadProgress] = useState(0);

  useEffect(() => {
    let isMounted = true;

    preloadMediaAssets((percent) => {
      if (!isMounted) return;
      setPreloadProgress(percent);
      if (percent >= 100) {
        setAssetsLoaded(true);
      }
    }).catch(err => {
      console.warn("Asset preloader fallback:", err);
      if (isMounted) setAssetsLoaded(true);
    });

    // Failsafe 8 second timeout
    const timeoutId = setTimeout(() => {
      if (isMounted) setAssetsLoaded(true);
    }, 8000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);
  
  return (
    <>
      <RotateGate />
      {isLoading && (
        <LoadingScreen 
          onComplete={() => setIsLoading(false)} 
          assetsLoaded={assetsLoaded} 
          preloadProgress={preloadProgress} 
        />
      )}

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
          <Route path="/neoncinematicsadminhere" element={<MasterAdminDashboard />} />
          <Route path="/neoncinematicsadminhere/blogs" element={<AdminDashboard />} />
          <Route path="/neoncinematicsadminhere/blogs/list" element={<AdminBlogList />} />
          <Route path="/neoncinematicsadminhere/blogs/:id/review" element={<AdminBlogReview />} />
          <Route path="/neoncinematicsadminhere/blog-posters" element={<AdminPosterManagement />} />
          <Route path="/neoncinematicsadminhere/blog-managers" element={<AdminManagerConfig />} />
          <Route path="/neoncinematicsadminhere/setup" element={<AdminSetupDashboard />} />
        </Routes>
      </Suspense>
    </>
  );
};

export default App;
