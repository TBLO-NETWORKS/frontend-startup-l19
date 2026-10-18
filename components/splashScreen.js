"use client";

import { useEffect, useState } from "react";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "600"],
  display: "swap",
});

const MIN_DURATION = 1800;

export default function SplashScreen({ children }) {
  const [show, setShow] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("splash-shown")) {
      setShow(false);
      return;
    }

    const start = Date.now();

    const finish = () => {
      const remaining = Math.max(0, MIN_DURATION - (Date.now() - start));
      setTimeout(() => {
        setFadeOut(true);
        setTimeout(() => {
          setShow(false);
          sessionStorage.setItem("splash-shown", "true");
        }, 500);
      }, remaining);
    };

    if (document.readyState === "complete") {
      document.fonts.ready.then(finish);
    } else {
      window.addEventListener("load", () => document.fonts.ready.then(finish), {
        once: true,
      });
    }
  }, []);

  return (
    <>
      {show && (
        <div
          className={`${inter.className} fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-black text-white antialiased transition-opacity duration-500 ${
            fadeOut ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <div className="relative flex flex-col items-center px-6 text-center">
            <h1 className="animate-fade-up text-2xl font-semibold tracking-wide sm:text-3xl">
              TBLONETWORKS
            </h1>
            <p className="mt-2 animate-fade-up text-sm font-light tracking-[-0.01em] text-white/60 [animation-delay:300ms] sm:text-base">
              Social media without handing over your{" "}
              <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">
                identity
              </span>
            </p>
          </div>
        </div>
      )}
      {children}
    </>
  );
}