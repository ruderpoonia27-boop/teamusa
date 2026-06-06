import { ChevronRight, Crown, Loader2, X } from "lucide-react";
import React, { useState } from "react";
import { api } from "../lib/api.js";

export default function AuthModal({ mode, onMode, onClose, onSuccess }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint = mode === "signin" ? "/api/auth/login" : "/api/auth/register";
      const session = await api(endpoint, { method: "POST", body: form });
      onSuccess(session);
    } catch (nextError) {
      setError(nextError.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-md">
      <section className="glass relative w-full max-w-md rounded-lg p-6 shadow-glow">
        <button
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-lg bg-white/10"
          onClick={onClose}
          type="button"
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <span className="inline-flex items-center gap-2 text-sm font-black text-champagne">
          <Crown size={17} />
          Unlock Unlimited Access
        </span>
        <h2 className="mt-3 text-3xl font-black">Unlock Unlimited Access</h2>
        <p className="mt-2 text-sm leading-6 text-stone-300">
          Sign in or create an account. Payment is required before any premium video becomes visible.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg bg-black/30 p-1">
          {[
            ["signin", "Sign In"],
            ["create", "Create Account"],
          ].map(([key, label]) => (
            <button
              className={`rounded-md px-3 py-2 text-sm font-black ${
                mode === key ? "bg-champagne text-black" : "text-stone-300"
              }`}
              key={key}
              onClick={() => onMode(key)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        <form className="mt-5 grid gap-3" onSubmit={submit}>
          {mode === "create" ? (
            <input
              className="min-h-12 rounded-lg border border-white/10 bg-black/30 px-4 outline-none"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Name"
            />
          ) : null}
          <input
            className="min-h-12 rounded-lg border border-white/10 bg-black/30 px-4 outline-none"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            placeholder="Email"
            type="email"
          />
          <input
            className="min-h-12 rounded-lg border border-white/10 bg-black/30 px-4 outline-none"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            placeholder="Password"
            type="password"
          />
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <button
            className="mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-champagne font-black text-black"
            disabled={loading}
            type="submit"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <ChevronRight size={18} />}
            Continue
          </button>
        </form>
      </section>
    </div>
  );
}
