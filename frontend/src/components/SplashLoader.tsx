import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";

const FLAG = "bl_splash"; // once per browser tab session: reloads and in-app navigation skip it
const MIN_MS = 1900; // long enough to read as a brand moment, short enough not to be a wait
const WORD = "brightloop".split("");

const seen = () => {
  try { return sessionStorage.getItem(FLAG) === "1"; } catch { return true; } // storage blocked: don't trap people behind a splash
};

// Wrap the app: children render (and fetch) underneath while the splash covers them, then it eases away.
export function SplashGate({ children }: { children: ReactNode }) {
  const { loading } = useAuth();
  const [show, setShow] = useState(() => !seen());
  const [minDone, setMinDone] = useState(false);
  const ready = minDone && !loading;

  useEffect(() => {
    if (!show) return void document.documentElement.classList.remove("boot");
    const t = setTimeout(() => setMinDone(true), MIN_MS);
    return () => clearTimeout(t);
  }, [show]);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => { // let the bar reach 100% before leaving
      try { sessionStorage.setItem(FLAG, "1"); } catch { /* ignore */ }
      document.documentElement.classList.remove("boot");
      setShow(false);
    }, 420);
    return () => clearTimeout(t);
  }, [ready]);

  return (
    <>
      {children}
      <AnimatePresence>{show && <Splash key="splash" done={ready} />}</AnimatePresence>
    </>
  );
}

function Splash({ done }: { done: boolean }) {
  const calm = useReducedMotion();
  return (
    <motion.div
      role="status" aria-live="polite" aria-label="Loading Brightloop"
      className="fixed inset-0 z-[9999] grid place-items-center overflow-hidden bg-[#08080b] text-white"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: calm ? 1 : 1.03, filter: calm ? "none" : "blur(6px)" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* ambient glow + faint grid, so the screen has depth before anything animates */}
      <motion.div
        aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[70vmin] w-[70vmin] rounded-full"
        style={{ x: "-50%", y: "-50%", background: "radial-gradient(closest-side, rgba(10,132,255,0.28), rgba(10,132,255,0.07) 55%, transparent 72%)" }}
        animate={calm ? undefined : { scale: [1, 1.12, 1], opacity: [0.75, 1, 0.75] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(closest-side, #000, transparent 85%)",
          WebkitMaskImage: "radial-gradient(closest-side, #000, transparent 85%)",
        }}
      />

      <div className="relative flex flex-col items-center">
        {/* orbiting ring around the brand dot */}
        <div className="relative grid h-28 w-28 place-items-center">
          <motion.span
            aria-hidden className="absolute inset-0 rounded-full"
            style={{
              background: "conic-gradient(from 0deg, rgba(10,132,255,0) 0deg, rgba(100,210,255,0.95) 300deg, rgba(10,132,255,0) 360deg)",
              WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1.5px))",
              mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1.5px))",
            }}
            animate={calm ? undefined : { rotate: 360 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
          />
          <span aria-hidden className="absolute inset-[7px] rounded-full border border-white/10" />
          <motion.span
            aria-hidden className="h-5 w-5 rounded-full"
            style={{ background: "radial-gradient(circle at 35% 30%, #ffffff, #bfe3ff 45%, #0a84ff)", boxShadow: "0 0 28px 4px rgba(10,132,255,0.65)" }}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: calm ? 1 : [1, 1.18, 1], opacity: 1 }}
            transition={{ scale: { duration: 1.8, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.5 } }}
          />
        </div>

        {/* wordmark rises in letter by letter */}
        <h1 className="mt-9 flex text-[34px] font-semibold tracking-tight sm:text-[40px]" aria-hidden>
          {WORD.map((ch, i) => (
            <motion.span
              key={i} className="inline-block"
              initial={{ opacity: 0, y: calm ? 0 : 16, filter: calm ? "none" : "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.25 + i * 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              {ch}
            </motion.span>
          ))}
        </h1>

        <motion.p
          className="mt-3 text-[13px] tracking-[0.18em] text-white/45"
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0, duration: 0.7 }}
        >
          SUBSCRIPTION BILLING, ON AUTOPILOT
        </motion.p>

        {/* progress hairline: eases to 88% then waits for the app, snaps to 100% when ready */}
        <div className="mt-10 h-[2px] w-52 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="relative h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #0a84ff, #64d2ff)" }}
            initial={{ width: "0%" }}
            animate={{ width: done ? "100%" : "88%" }}
            transition={{ duration: done ? 0.35 : 1.7, ease: "easeInOut" }}
          >
            {!calm && (
              <motion.span
                aria-hidden className="absolute inset-y-0 w-16"
                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)" }}
                animate={{ x: ["-100%", "400%"] }} transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
