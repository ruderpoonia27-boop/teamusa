import { Crown, LayoutDashboard, LogOut, ShieldCheck, UserRound } from "lucide-react";
import React from "react";

export default function Header({
  user,
  isPremium,
  isAdmin,
  onAuth,
  onHome,
  onDashboard,
  onAdmin,
  onLogout,
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-velvet/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <button className="flex items-center gap-3" onClick={onHome} type="button">
          <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-white/10 bg-black shadow-gold">
            <img className="h-full w-full object-cover" src="/teamusa-logo.svg" alt="TeamUSA logo" />
          </span>
          <span className="text-xl font-black tracking-normal">TeamUSA</span>
        </button>

        <nav className="hidden items-center gap-6 text-sm text-stone-300 md:flex">
          <a href="#featured">Featured</a>
          <a href="#trending">Trending</a>
          <a href="#categories">Categories</a>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <button
                className="hidden min-h-11 items-center gap-3 rounded-lg border border-white/10 bg-white/[0.07] px-3 py-2 text-left sm:flex"
                onClick={onDashboard}
                type="button"
              >
                <span className="grid h-8 w-8 place-items-center rounded-md bg-champagne text-xs font-black text-black">
                  {getInitials(user)}
                </span>
                <span className="min-w-0">
                  <span className="block max-w-[150px] truncate text-sm font-black text-white">
                    {user.name || "Member"}
                  </span>
                  <span
                    className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black ${
                      isPremium ? "bg-champagne/15 text-champagne" : "bg-white/10 text-stone-300"
                    }`}
                  >
                    {isPremium ? <Crown size={12} /> : <UserRound size={12} />}
                    {isPremium ? "Premium" : "Free"}
                  </span>
                </span>
              </button>
              {isAdmin ? (
                <button
                  className="grid h-10 w-10 place-items-center rounded-lg border border-champagne/20 bg-champagne/10 text-champagne"
                  onClick={onAdmin}
                  type="button"
                  aria-label="Content panel"
                >
                  <ShieldCheck size={18} />
                </button>
              ) : null}
              <button
                className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/10 sm:hidden"
                onClick={onDashboard}
                type="button"
                aria-label="Dashboard"
              >
                <LayoutDashboard size={18} />
              </button>
              <button
                className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/5 text-stone-200"
                onClick={onLogout}
                type="button"
                aria-label="Logout"
              >
                <LogOut size={17} />
              </button>
            </>
          ) : (
            <button
              className="rounded-lg bg-white px-4 py-2 text-sm font-black text-black"
              onClick={onAuth}
              type="button"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function getInitials(user) {
  const value = user?.name || user?.email || "M";
  return value
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
