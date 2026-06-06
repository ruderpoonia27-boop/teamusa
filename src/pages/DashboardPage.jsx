import { BadgeCheck, CreditCard, Crown, History, Settings } from "lucide-react";
import React from "react";
import { demoWatchHistory } from "../data/catalog.js";

export default function DashboardPage({ user, notice, onPayment }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <span className="text-sm font-black uppercase text-amethyst">Member dashboard</span>
        <h1 className="mt-2 text-4xl font-black sm:text-6xl">Welcome, {user?.name || "Member"}</h1>
      </div>

      {notice ? <p className="mb-5 rounded-lg bg-plasma/10 p-4 text-plasma">{notice}</p> : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <DashboardCard
          icon={<Crown />}
          title="Membership Status"
          value={user?.isPremium ? "Active Premium" : "Free Browsing"}
        />
        <DashboardCard icon={<CreditCard />} title="Active Plan" value={user?.planName || user?.plan || "None"} />
        <DashboardCard icon={<BadgeCheck />} title="Premium Badge" value={user?.isPremium ? "Enabled" : "Locked"} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="glass rounded-lg p-6">
          <h2 className="flex items-center gap-2 text-2xl font-black">
            <History size={22} />
            Continue Watching
          </h2>
          <div className="mt-5 grid gap-3">
            {demoWatchHistory.map((title) => (
              <div className="flex items-center justify-between rounded-lg bg-white/5 p-3" key={title}>
                <span className="font-bold">{title}</span>
                <span className="text-sm text-stone-400">Resume</span>
              </div>
            ))}
          </div>
        </section>

        <section className="glass rounded-lg p-6">
          <h2 className="flex items-center gap-2 text-2xl font-black">
            <Settings size={22} />
            Subscription Management
          </h2>
          <p className="mt-3 text-sm leading-6 text-stone-300">
            Manage account settings, payment method, and plan upgrades from here.
          </p>
          {user?.premiumUntil ? (
            <p className="mt-3 text-sm text-champagne">Expires: {formatDate(user.premiumUntil)}</p>
          ) : null}
          <button
            className="mt-5 rounded-lg bg-champagne px-5 py-3 font-black text-black"
            onClick={onPayment}
            type="button"
          >
            Manage Plan
          </button>
        </section>
      </div>
    </section>
  );
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function DashboardCard({ icon, title, value }) {
  return (
    <article className="glass rounded-lg p-6">
      <span className="grid h-12 w-12 place-items-center rounded-lg bg-champagne/15 text-champagne">
        {React.cloneElement(icon, { size: 22 })}
      </span>
      <p className="mt-5 text-sm text-stone-400">{title}</p>
      <h2 className="mt-1 text-2xl font-black">{value}</h2>
    </article>
  );
}
