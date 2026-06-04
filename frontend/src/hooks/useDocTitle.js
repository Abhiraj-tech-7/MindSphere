import { useEffect } from "react";

/**
 * Sets a descriptive document.title per route. Resets on unmount.
 * Usage: useDocTitle("Journal")  →  document.title = "Journal — MindSphere"
 */
export const useDocTitle = (title) => {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} — MindSphere` : "MindSphere — Mental Wellness, Reimagined";
    return () => { document.title = prev; };
  }, [title]);
};

export default useDocTitle;
