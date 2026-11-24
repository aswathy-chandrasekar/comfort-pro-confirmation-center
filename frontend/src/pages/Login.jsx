import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Flame } from "lucide-react";

export default function Login() {
  const { signIn, meta } = useApp();
  const [email, setEmail] = useState(meta.currentUser.email);
  const [password, setPassword] = useState("demo");

  const handleSubmit = (e) => {
    e.preventDefault();
    signIn();
  };

  return (
    <div className="flex min-h-screen bg-slate-50/70">
      <div className="hidden w-[46%] flex-col justify-between bg-[#0B1220] p-10 text-slate-200 lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white shadow-[0_4px_12px_-2px_rgba(37,99,235,0.6)]">
            <Flame className="h-4 w-4" strokeWidth={2.4} />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-white" style={{ fontFamily: "Outfit, Inter, sans-serif" }}>
              Comfort Pro
            </div>
            <div className="text-[10px] text-slate-500">Heating, Air &amp; Plumbing</div>
          </div>
        </div>

        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-300">Product</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white" style={{ fontFamily: "Outfit, Inter, sans-serif" }}>
            Confirmation Center
          </h1>
          <p className="mt-3 max-w-md text-[13px] leading-relaxed text-slate-400">
            Appointment confirmations and customer follow-up.
          </p>
        </div>

        <div className="text-[11px] text-slate-500">v0.1</div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white p-8 shadow-[0_1px_0_rgba(15,23,42,0.02),0_10px_40px_-12px_rgba(15,23,42,0.15)]"
          data-testid="login-form"
        >
          <div className="lg:hidden mb-6 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white">
              <Flame className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-slate-900">Comfort Pro</div>
              <div className="text-[10px] text-slate-500">Confirmation Center</div>
            </div>
          </div>

          <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: "Outfit, Inter, sans-serif" }}>
            Sign in
          </h2>
          <p className="mt-1 text-[12px] text-slate-500">Appointment confirmations and customer follow-up.</p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                data-testid="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 text-sm text-slate-900 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                data-testid="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 text-sm text-slate-900 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <button
            type="submit"
            data-testid="login-submit"
            className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_4px_10px_-2px_rgba(37,99,235,0.35)] transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:ring-offset-2"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
