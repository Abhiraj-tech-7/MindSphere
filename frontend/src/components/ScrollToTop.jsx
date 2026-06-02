import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.querySelectorAll("main, [data-scroll-container]").forEach((el) => {
      try { el.scrollTo({ top: 0, left: 0, behavior: "instant" }); } catch {}
    });
  }, [pathname]);
  return null;
};

export default ScrollToTop;
