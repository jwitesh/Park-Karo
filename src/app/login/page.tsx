"use client";

import { useActionState, useState } from "react";
import { Bike, Eye, EyeOff, Loader2, MapPin, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { login } from "./actions";
import ThemeToggle from "@/components/theme-toggle";

// Demo accounts are shown unless NEXT_PUBLIC_SHOW_DEMO_LOGINS="false" at build time (set that for a real deployment).
const SHOW_DEMO = process.env.NEXT_PUBLIC_SHOW_DEMO_LOGINS !== "false";

const DEMO = [
  { label: "Day scholar", id: "12300001" },
  { label: "Hostel", id: "12300002" },
  { label: "Faculty", id: "FAC001" },
  { label: "Guard", id: "GUARD001" },
  { label: "Admin", id: "ADMIN001" },
];

const FEATURES = [
  { icon: MapPin, text: "Live zone availability" },
  { icon: Zap, text: "Instant RFID check-in" },
  { icon: ShieldCheck, text: "Find your bike, always" },
];

export default function LoginPage() {
  const [error, action, pending] = useActionState(login, null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  const field =
    "w-full rounded-xl border border-border bg-background/70 px-4 py-3 text-[15px] outline-none focus:ring-4 focus:ring-brand/20";

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
      {/* animated backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <span className="absolute -left-24 -top-24 h-96 w-96 animate-blob rounded-full bg-brand/30 blur-3xl" />
        <span className="absolute -bottom-32 -right-20 h-[26rem] w-[26rem] animate-blob rounded-full bg-blue-600/30 blur-3xl [animation-delay:-7s]" />
        <span className="absolute left-1/2 top-1/3 h-72 w-72 animate-blob rounded-full bg-sky-400/20 blur-3xl [animation-delay:-12s]" />
      </div>

      <ThemeToggle className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-xl border border-border bg-card/80 backdrop-blur hover:bg-card" />

      <div className="w-full max-w-sm">
        <div className="mb-6 flex animate-fade-up flex-col items-center text-center">
          <span className="grid h-16 w-16 animate-float place-items-center rounded-2xl bg-gradient-to-br from-brand to-amber-400 shadow-xl shadow-brand/40">
            <Bike className="h-8 w-8 text-white" aria-hidden />
          </span>
          <p className="mt-4 text-sm font-medium text-muted">Lovely Professional University</p>
        </div>

        <form
          action={action}
          className="glass animate-fade-up space-y-4 rounded-3xl border border-border p-6 shadow-[var(--shadow-lift)] [animation-delay:80ms]"
        >
          <div>
            <h1 className="text-2xl font-bold">Where Did I Park?</h1>
            <p className="text-sm text-muted">Sign in to find and track your two-wheeler.</p>
          </div>

          <label className="block space-y-1.5 text-sm font-medium">
            Registration number or email
            <input
              name="identifier"
              required
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className={field}
            />
          </label>

          <label className="block space-y-1.5 text-sm font-medium">
            Password
            <span className="relative block">
              <input
                name="password"
                type={show ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${field} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-muted hover:text-foreground"
              >
                {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
              </button>
            </span>
          </label>

          {error && (
            <p role="alert" className="animate-slide-down rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
              {error}
            </p>
          )}

          <button
            disabled={pending}
            className="btn-grad flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold disabled:opacity-70"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Sign in
          </button>

          {SHOW_DEMO && (
            <div className="space-y-2 border-t border-border pt-4">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
                <Sparkles className="h-3.5 w-3.5 text-brand" aria-hidden /> Try a demo account (tap to fill)
              </p>
              <div className="flex flex-wrap gap-2">
                {DEMO.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setIdentifier(d.id);
                      setPassword("demo1234");
                    }}
                    className="rounded-full border border-border bg-background/70 px-3.5 py-2 text-xs font-medium hover:border-brand hover:text-brand"
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>

        <ul className="mt-6 flex animate-fade-up flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted [animation-delay:200ms]">
          {FEATURES.map((f) => (
            <li key={f.text} className="flex items-center gap-1.5">
              <f.icon className="h-3.5 w-3.5 text-brand" aria-hidden /> {f.text}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
