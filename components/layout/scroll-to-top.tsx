"use client";

import { useEffect, useState } from "react";

const SHOW_AFTER_PX = 480;

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setVisible(window.scrollY > SHOW_AFTER_PX);

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  return (
    <button
      type="button"
      aria-label="Върни се в началото на страницата"
      title="Към началото"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`fixed bottom-4 right-3 z-40 grid h-10 w-10 place-items-center rounded-full border border-boutique-line/80 bg-boutique-paper/90 text-base text-boutique-ink shadow-boutique-sm backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-boutique-accent sm:bottom-7 sm:right-7 sm:h-11 sm:w-11 sm:text-lg ${
        visible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <span aria-hidden>↑</span>
    </button>
  );
}
