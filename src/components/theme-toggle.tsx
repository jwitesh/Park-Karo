"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const EVENT = "themechange";

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}
const isDark = () => document.documentElement.classList.contains("dark");

export default function ThemeToggle({ className }: { className?: string }) {
  // Reads the real <html> class on the client; renders "light" on the server (no hydration mismatch).
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  function toggle() {
    const next = !isDark();
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className={className ?? "rounded-md bg-white/15 p-2.5 hover:bg-white/25 sm:p-1.5"}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
