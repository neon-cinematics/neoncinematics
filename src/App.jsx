import { useEffect } from "react";
import Section1 from "./Home/Section1";
import Section2 from "./SelectedWork/Section2";
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
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Section1 />} />
        <Route path="/work" element={<Section2 />} />
      </Routes>
    </>
  )
}

export default App;