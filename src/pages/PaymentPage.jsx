import { Check, Copy, CreditCard, History, LockOpen, QrCode, Send, ShieldCheck, Star } from "lucide-react";
import React, { useEffect, useState } from "react";
import TrustRow from "../components/TrustRow.jsx";
import { benefits, premiumPlans as fallbackPremiumPlans } from "../data/catalog.js";
import { api } from "../lib/api.js";

export default function PaymentPage({ user, notice, onAuth }) {
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("days15");

  useEffect(() => {
    api("/api/payment-settings")
      .then((data) => setSettings(data.settings))
      .catch((nextError) => setError(nextError.message || "Could not load payment settings."));
  }, []);

  const paymentSettings = settings || {
    planId: "premium",
    planName: "Premium Membership",
    priceText: "INR 499",
    originalPriceText: "INR 999",
    offerLabel: "50% OFF",
    qrImageUrl: "",
    upiId: "",
    paymentLink: "",
    paymentMessage: "I want to take premium membership. My account email is {email}.",
  };
  const plans = paymentSettings.plans?.length ? paymentSettings.plans : fallbackPremiumPlans;
  const selectedPlan = plans.find((item) => item.id === selectedPlanId) || plans[0];

  const openPaymentLink = async () => {
    setActionNotice("");
    if (!user) {
      onAuth();
      return;
    }
    if (!paymentSettings.paymentLink) {
      setActionNotice("Payment link is not configured yet.");
      return;
    }
    const paymentMessage = buildPaymentMessage(paymentSettings.paymentMessage, user, paymentSettings, selectedPlan);
    try {
      await navigator.clipboard.writeText(paymentMessage);
    } catch {
      // Some browsers block clipboard during redirects; the link still carries the message.
    }
    window.location.href = buildPaymentLink(paymentSettings.paymentLink, paymentMessage);
  };

  const copyUpiId = async () => {
    if (!paymentSettings.upiId) return;
    try {
      await navigator.clipboard.writeText(paymentSettings.upiId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setActionNotice("Could not copy UPI ID. Please select and copy it manually.");
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-8 max-w-3xl">
        <span className="inline-flex items-center gap-2 text-sm font-black text-champagne">
          <CreditCard size={18} />
          Secure INR payment
        </span>
        <h1 className="mt-3 text-4xl font-black sm:text-6xl">Premium Membership</h1>
        <p className="mt-4 text-stone-300">
          Login alone does not unlock content. Premium access activates only after INR payment confirmation.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <article className="glass rounded-lg p-6 shadow-glow">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black">{paymentSettings.planName}</h2>
            <Star className="text-champagne" size={22} />
          </div>
          <div className="mt-5 flex flex-wrap items-end gap-3">
            <span className="text-5xl font-black text-champagne">{selectedPlan.priceText}</span>
            <span className="rounded-full bg-plasma px-3 py-1 text-xs font-black text-black">
              {selectedPlan.name}
            </span>
          </div>
          <p className="mt-3 text-sm text-stone-400">Select a plan. Features stay the same for every duration.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {plans.map((item) => (
              <button
                className={`min-h-24 rounded-lg border p-4 text-left transition ${
                  selectedPlan.id === item.id
                    ? "border-champagne bg-champagne/12 shadow-gold"
                    : "border-white/10 bg-black/25 hover:border-champagne/40"
                }`}
                key={item.id}
                onClick={() => setSelectedPlanId(item.id)}
                type="button"
              >
                <span className="flex items-center gap-2 text-sm font-black text-white">
                  <span
                    className={`grid h-4 w-4 place-items-center rounded-full border ${
                      selectedPlan.id === item.id ? "border-champagne" : "border-stone-500"
                    }`}
                  >
                    {selectedPlan.id === item.id ? <span className="h-2 w-2 rounded-full bg-champagne" /> : null}
                  </span>
                  {item.name}
                </span>
                <span className="mt-3 block text-2xl font-black text-champagne">{item.priceText}</span>
              </button>
            ))}
          </div>
          <ul className="mt-6 grid gap-3 text-sm text-stone-200">
            {benefits.map((benefit) => (
              <li className="flex items-center gap-3" key={benefit}>
                <Check className="text-plasma" size={17} />
                {benefit}
              </li>
            ))}
          </ul>

          <div className="mt-7 grid gap-4 rounded-lg border border-white/10 bg-black/30 p-4 md:grid-cols-[220px_1fr]">
            <div className="grid min-h-56 place-items-center rounded-lg bg-white p-3">
              {paymentSettings.qrImageUrl ? (
                <img className="max-h-52 w-full object-contain" src={paymentSettings.qrImageUrl} alt="UPI scanner" />
              ) : (
                <QrCode className="text-black" size={80} />
              )}
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-sm font-black uppercase text-champagne">UPI Scanner</p>
              <h3 className="mt-2 text-2xl font-black text-white">Scan and pay</h3>
              {paymentSettings.upiId ? (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span className="min-h-11 min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-stone-200">
                    UPI ID: <span className="font-black text-white">{paymentSettings.upiId}</span>
                  </span>
                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-champagne/20 bg-champagne/10 px-4 text-sm font-black text-champagne"
                    onClick={copyUpiId}
                    type="button"
                  >
                    <Copy size={16} />
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              ) : null}
              <p className="mt-3 text-sm leading-6 text-stone-400">
                Tap Pay Now to open the payment chat. After verification, premium access will be enabled on your account. Refresh once after approval.
              </p>
            </div>
          </div>

          {error ? <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}

          <button
            className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-champagne font-black text-black"
            onClick={openPaymentLink}
            type="button"
          >
            <Send size={18} />
            Pay Now
          </button>
          <button
            className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 font-bold"
            onClick={openPaymentLink}
            type="button"
          >
            <ShieldCheck size={18} />
            Open Payment Chat
          </button>
          {actionNotice ? (
            <p className="mt-4 rounded-lg bg-plasma/10 p-3 text-sm text-plasma">{actionNotice}</p>
          ) : null}
        </article>

        <aside className="glass rounded-lg p-6">
          <h2 className="text-2xl font-black">Manual Verification</h2>
          <p className="mt-3 text-sm leading-6 text-stone-300">
            Complete payment in chat. Once verified, your account will be marked premium. Refresh the page once after approval to unlock videos.
          </p>
          <div className="mt-6 grid gap-3">
            <TrustRow icon={<LockOpen />} label="Manual unlock" value="Verified by support" />
            <TrustRow icon={<ShieldCheck />} label="Secure badge" value="UPI and Telegram support" />
            <TrustRow icon={<History />} label="History" value="Continue watching" />
          </div>
          {notice ? <p className="mt-5 rounded-lg bg-plasma/10 p-4 text-sm text-plasma">{notice}</p> : null}
        </aside>
      </div>
    </section>
  );
}

function buildPaymentLink(link, message) {
  const encodedMessage = encodeURIComponent(message);
  const trimmedLink = String(link || "").trim();

  if (!trimmedLink) return "";

  try {
    const url = new URL(trimmedLink);
    const host = url.hostname.toLowerCase();

    if (host === "wa.me" || host.endsWith("whatsapp.com")) {
      url.searchParams.set("text", message);
      return url.toString();
    }

    if (host === "t.me" || host === "telegram.me") {
      url.searchParams.set("text", message);
      return url.toString();
    }

    url.searchParams.set("message", message);
    return url.toString();
  } catch {
    return `${trimmedLink}${trimmedLink.includes("?") ? "&" : "?"}text=${encodedMessage}`;
  }
}

function buildPaymentMessage(template, user, paymentSettings, selectedPlan) {
  const fallback = "I want to take premium membership. Plan: {plan} ({price}). My account email is {email}.";
  const message = String(template || fallback)
    .replaceAll("{name}", user?.name || "Member")
    .replaceAll("{email}", user?.email || "not provided")
    .replaceAll("{plan}", selectedPlan?.name || paymentSettings.planName || "Premium Membership")
    .replaceAll("{price}", selectedPlan?.priceText || "INR payment");

  if (message.toLowerCase().includes("plan:")) return message;
  return `${message} Plan: ${selectedPlan?.name || "Premium"} (${selectedPlan?.priceText || "INR payment"}).`;
}
