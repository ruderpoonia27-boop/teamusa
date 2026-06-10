import {
  AlertTriangle,
  CheckCircle2,
  Film,
  Loader2,
  Pencil,
  Plus,
  QrCode,
  Search,
  Settings,
  ShieldCheck,
  Tags,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { defaultCategories, premiumPlans } from "../data/catalog.js";
import { api, clearApiCache, uploadApi } from "../lib/api.js";

const supportedVideoExtensions = [".mp4", ".mov", ".m4v", ".webm"];
const maxVideoUploadSize = 1024 * 1024 * 1024 * 3;
const videoAccept = ".mp4,.mov,.m4v,.webm,video/mp4,video/quicktime,video/x-m4v,video/webm";

function createEmptyVideo(catalog = { categories: defaultCategories }) {
  return {
    title: "",
    creator: "",
    category: catalog.categories?.[0] || defaultCategories[0],
    thumbnail: null,
    generatedThumbnail: null,
    video: null,
    videoHd: null,
    videoSd: null,
    duration: "00:00",
    views: "0",
    status: "approved",
    premiumOnly: true,
  };
}

const emptyPaymentForm = {
  planName: "Premium Membership",
  priceAmount: "499",
  originalAmount: "999",
  offerLabel: "50% OFF",
  upiId: "",
  paymentLink: "",
  paymentMessage: "I want to take premium membership. Plan: {plan} ({price}). My account email is {email}.",
  upiQr: null,
  heroImage: null,
  qrImageUrl: "",
  heroImageUrl: "",
  clearQr: false,
  clearHero: false,
  plans: premiumPlans.map(toEditablePlan),
};

export default function AdminPage({ token, user, isAdmin, isPartner }) {
  const isContentManager = isAdmin || isPartner;
  const [videos, setVideos] = useState([]);
  const [brokenVideos, setBrokenVideos] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(() => createEmptyVideo());
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const [catalog, setCatalog] = useState({ categories: defaultCategories });
  const [catalogItems, setCatalogItems] = useState([]);
  const [catalogForm, setCatalogForm] = useState({ kind: "category", name: "" });
  const [userPlanSelections, setUserPlanSelections] = useState({});
  const [activeSection, setActiveSection] = useState("videos");
  const [userSearch, setUserSearch] = useState("");
  const [editingId, setEditingId] = useState("");
  const [formKey, setFormKey] = useState(0);
  const [paymentFormKey, setPaymentFormKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isContentManager || !token) return;
    loadVideos();
    loadBrokenVideos();
    loadCatalog();
    if (isAdmin) {
      loadPaymentSettings();
      loadUsers();
    }
  }, [isContentManager, isAdmin, token]);

  useEffect(() => {
    if (!isAdmin && !["videos", "broken"].includes(activeSection)) {
      setActiveSection("videos");
    }
  }, [activeSection, isAdmin]);

  const loadVideos = async () => {
    try {
      const data = await api("/api/admin/videos", { token });
      setVideos(data.videos || []);
    } catch (nextError) {
      setError(nextError.message || "Could not load admin videos.");
    }
  };

  const loadBrokenVideos = async () => {
    try {
      const data = await api("/api/admin/videos/broken", { token });
      setBrokenVideos(data.videos || []);
    } catch (nextError) {
      setError(nextError.message || "Could not load broken videos.");
    }
  };

  const loadUsers = async (search = userSearch) => {
    try {
      const data = await api(`/api/admin/users?search=${encodeURIComponent(search)}`, { token });
      setUsers(data.users || []);
    } catch (nextError) {
      setError(nextError.message || "Could not load users.");
    }
  };

  const loadCatalog = async () => {
    try {
      const data = await api(isAdmin ? "/api/admin/catalog" : "/api/catalog", isAdmin ? { token } : {});
      const nextCatalog = normalizeCatalog(data.catalog);
      setCatalog(nextCatalog);
      setCatalogItems(isAdmin ? data.items || [] : []);
      setForm((current) => ({
        ...current,
        category: nextCatalog.categories.includes(current.category)
          ? current.category
          : nextCatalog.categories[0],
      }));
    } catch (nextError) {
      setError(nextError.message || "Could not load categories.");
    }
  };

  const updateUserPremium = async (userId, isPremium) => {
    setNotice("");
    setError("");
    try {
      const plan = userPlanSelections[userId] || "days15";
      await api(`/api/admin/users/${userId}/premium`, {
        method: "PATCH",
        token,
        body: { isPremium, plan },
      });
      const planName = paymentForm.plans.find((item) => item.id === plan)?.name || "Premium";
      setNotice(isPremium ? `${planName} subscription enabled.` : "Premium access revoked.");
      await loadUsers();
    } catch (nextError) {
      setError(nextError.message || "Could not update user access.");
    }
  };

  const updateUserBlock = async (userId, isBlocked) => {
    setNotice("");
    setError("");
    try {
      await api(`/api/admin/users/${userId}/block`, {
        method: "PATCH",
        token,
        body: { isBlocked },
      });
      setNotice(isBlocked ? "User blocked." : "User unblocked.");
      await loadUsers();
    } catch (nextError) {
      setError(nextError.message || "Could not update user block status.");
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm("Delete this user permanently?")) return;
    setNotice("");
    setError("");
    try {
      await api(`/api/admin/users/${userId}`, {
        method: "DELETE",
        token,
      });
      setNotice("User deleted.");
      await loadUsers();
    } catch (nextError) {
      setError(nextError.message || "Could not delete user.");
    }
  };

  const saveCatalogItem = async (event) => {
    event.preventDefault();
    setLoading(true);
    setNotice("");
    setError("");

    try {
      const data = await api("/api/admin/catalog", {
        method: "POST",
        token,
        body: catalogForm,
      });
      const nextCatalog = normalizeCatalog(data.catalog);
      setCatalog(nextCatalog);
      setCatalogItems(data.items || []);
      clearApiCache("/api/catalog");
      setCatalogForm({ ...catalogForm, name: "" });
      setNotice("Category added.");
    } catch (nextError) {
      setError(nextError.message || "Could not save category.");
    } finally {
      setLoading(false);
    }
  };

  const removeCatalogItem = async (item) => {
    setNotice("");
    setError("");
    try {
      const data = await api(`/api/admin/catalog/${item.id}`, { method: "DELETE", token });
      const nextCatalog = normalizeCatalog(data.catalog);
      setCatalog(nextCatalog);
      setCatalogItems(data.items || []);
      clearApiCache("/api/catalog");
      clearApiCache("/api/videos");
      setForm((current) => ({
        ...current,
        category: nextCatalog.categories.includes(current.category)
          ? current.category
          : nextCatalog.categories[0],
      }));
      await loadVideos();
      setNotice("Category deleted.");
    } catch (nextError) {
      setError(nextError.message || "Could not delete item.");
    }
  };

  const loadPaymentSettings = async () => {
    try {
      const data = await api("/api/payment-settings");
      const settings = data.settings;
      const priceAmount = String((settings.priceAmount || 0) / 100);
      const originalAmount = String((settings.originalAmount || 0) / 100);
      setPaymentForm({
        planName: settings.planName || "Premium Membership",
        priceAmount,
        originalAmount,
        offerLabel: calculateOfferLabel(priceAmount, originalAmount),
        upiId: settings.upiId || "",
        paymentLink: settings.paymentLink || "",
        paymentMessage: settings.paymentMessage || emptyPaymentForm.paymentMessage,
        upiQr: null,
        heroImage: null,
        qrImageUrl: settings.qrImageUrl || "",
        heroImageUrl: settings.heroImageUrl || "",
        clearQr: false,
        clearHero: false,
        plans: normalizePremiumPlans(settings.plans),
      });
    } catch (nextError) {
      setError(nextError.message || "Could not load payment settings.");
    }
  };

  const savePaymentSettings = async (event) => {
    event.preventDefault();
    setLoading(true);
    setNotice("");
    setError("");

    try {
      const data = await api("/api/admin/payment-settings", {
        method: "PATCH",
        token,
        body: await buildPaymentSettingsFormData(paymentForm),
      });
      const settings = data.settings;
      const priceAmount = String((settings.priceAmount || 0) / 100);
      const originalAmount = String((settings.originalAmount || 0) / 100);
      setPaymentForm({
        planName: settings.planName || "Premium Membership",
        priceAmount,
        originalAmount,
        offerLabel: calculateOfferLabel(priceAmount, originalAmount),
        upiId: settings.upiId || "",
        paymentLink: settings.paymentLink || "",
        paymentMessage: settings.paymentMessage || emptyPaymentForm.paymentMessage,
        upiQr: null,
        heroImage: null,
        qrImageUrl: settings.qrImageUrl || "",
        heroImageUrl: settings.heroImageUrl || "",
        clearQr: false,
        clearHero: false,
        plans: normalizePremiumPlans(settings.plans),
      });
      setPaymentFormKey((value) => value + 1);
      clearApiCache("/api/payment-settings");
      setNotice("Payment package updated.");
    } catch (nextError) {
      setError(nextError.message || "Could not update payment package.");
    } finally {
      setLoading(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setUploadProgress(0);
    setNotice("");
    setError("");

    try {
      if (editingId) {
        const data = await uploadApi(`/api/admin/videos/${editingId}`, {
          method: "PATCH",
          token,
          body: await buildVideoFormData(form),
          onProgress: setUploadProgress,
        });
        setVideos((current) =>
          current.map((video) => ((video._id || video.id) === editingId ? data.video : video)),
        );
        clearApiCache("/api/videos");
        setNotice("Video updated.");
        await loadBrokenVideos();
      } else {
        const data = await uploadApi("/api/admin/videos", {
          method: "POST",
          token,
          body: await buildVideoFormData(form),
          onProgress: setUploadProgress,
        });
        setVideos((current) => [data.video, ...current]);
        clearApiCache("/api/videos");
        setNotice("Video added. Ready for the next upload.");
        await loadBrokenVideos();
      }
      setForm(createEmptyVideo(catalog));
      setEditingId("");
      setFormKey((value) => value + 1);
    } catch (nextError) {
      setError(nextError.message || "Could not add video.");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleVideoFile = (file, field) => {
    if (!file) {
      applyVideoFileWithDuration(null, setForm, field);
      return;
    }

    const validationError = validateVideoFile(file);
    if (validationError) {
      setError(validationError);
      setForm((current) => ({ ...current, [field]: null }));
      return;
    }

    setError("");
    applyVideoFileWithDuration(file, setForm, field);
  };

  const editVideo = (video) => {
    setEditingId(video._id || video.id);
    setForm({
      title: video.title || "",
      creator: video.creator || "",
      category: video.category || catalog.categories[0],
      thumbnail: null,
      generatedThumbnail: null,
      video: null,
      videoHd: null,
      videoSd: null,
      duration: video.duration || "00:00",
      views: String(video.views || 0),
      status: video.status || "approved",
      premiumOnly: video.premiumOnly !== false,
    });
    setNotice("");
    setError("");
  };

  const removeVideo = async (videoId) => {
    setNotice("");
    setError("");
    try {
      await api(`/api/admin/videos/${videoId}`, { method: "DELETE", token });
      clearApiCache("/api/videos");
      setNotice("Video removed.");
      await loadVideos();
      await loadBrokenVideos();
    } catch (nextError) {
      setError(nextError.message || "Could not remove video.");
    }
  };

  if (!isContentManager) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="glass rounded-lg p-8">
          <ShieldCheck className="text-champagne" size={42} />
          <h1 className="mt-4 text-3xl font-black">Manager access required</h1>
          <p className="mt-3 text-stone-300">
            Only authorized managers can upload and manage videos. Members can watch premium videos after payment.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 text-sm font-black uppercase text-champagne">
            <ShieldCheck size={18} />
            {isPartner ? "Partner panel" : "Content manager"}
          </span>
          <h1 className="mt-2 text-4xl font-black sm:text-6xl">
            {isPartner ? "Partner Dashboard" : "Content Library"}
          </h1>
          <p className="mt-3 text-stone-300">
            {isPartner ? "Upload and manage your own videos." : "Add and organize premium videos for members."}
          </p>
          {isPartner ? (
            <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-plasma/25 bg-plasma/10 px-4 py-2 text-sm font-black text-plasma">
              <ShieldCheck size={16} />
              Partner
            </span>
          ) : null}
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-stone-300">
          {isPartner ? `${videos.length} my videos` : `${videos.length} videos in catalog`}
        </div>
      </div>

      {(notice || error) ? (
        <p className={`mb-5 rounded-lg p-4 ${error ? "bg-red-500/10 text-red-200" : "bg-plasma/10 text-plasma"}`}>
          {error || notice}
        </p>
      ) : null}

      <div className="mb-5 flex flex-wrap gap-2">
        <SectionButton
          active={activeSection === "videos"}
          icon={<Film size={17} />}
          label="Videos"
          onClick={() => setActiveSection("videos")}
        />
        <SectionButton
          active={activeSection === "broken"}
          icon={<AlertTriangle size={17} />}
          label={`Broken (${brokenVideos.length})`}
          onClick={() => setActiveSection("broken")}
        />
        {isAdmin ? (
          <>
            <SectionButton
              active={activeSection === "users"}
              icon={<Users size={17} />}
              label="Users"
              onClick={() => setActiveSection("users")}
            />
            <SectionButton
              active={activeSection === "categories"}
              icon={<Tags size={17} />}
              label="Categories"
              onClick={() => setActiveSection("categories")}
            />
            <SectionButton
              active={activeSection === "settings"}
              icon={<Settings size={17} />}
              label="Settings"
              onClick={() => setActiveSection("settings")}
            />
          </>
        ) : null}
      </div>

      {isAdmin && activeSection === "categories" ? (
        <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
          <form className="glass grid gap-4 rounded-lg p-6" onSubmit={saveCatalogItem}>
            <h2 className="flex items-center gap-2 text-2xl font-black">
              <Tags size={22} />
              Categories
            </h2>
            <AdminInput
              label="New Category"
              value={catalogForm.name}
              onChange={(name) => setCatalogForm({ kind: "category", name })}
            />
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-champagne font-black text-black"
              disabled={loading}
              type="submit"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
              Create Category
            </button>
          </form>

          <section className="glass rounded-lg p-6">
            <CatalogList
              title="Video Categories"
              items={catalogItems.filter((item) => item.kind === "category")}
              lockedNames={defaultCategories}
              onDelete={removeCatalogItem}
            />
          </section>
        </div>
      ) : null}

      {isAdmin && activeSection === "settings" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <form className="grid gap-5" onSubmit={savePaymentSettings}>
            <section className="glass rounded-lg p-5 sm:p-6">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-2xl font-black">
                    <QrCode size={22} />
                    Payment Package
                  </h2>
                  <p className="mt-1 text-sm text-stone-400">Set the main offer shown on the payment screen.</p>
                </div>
                <span className="w-fit rounded-full border border-champagne/30 px-3 py-1 text-xs font-black uppercase text-champagne">
                  INR
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <AdminInput
                    label="Package Name"
                    value={paymentForm.planName}
                    onChange={(planName) => setPaymentForm({ ...paymentForm, planName })}
                  />
                </div>
                <AdminInput
                  label="Current Price INR"
                  value={paymentForm.priceAmount}
                  onChange={(priceAmount) => setPaymentForm(withAutoOffer({ ...paymentForm, priceAmount }))}
                />
                <AdminInput
                  label="Cross Price INR"
                  value={paymentForm.originalAmount}
                  onChange={(originalAmount) => setPaymentForm(withAutoOffer({ ...paymentForm, originalAmount }))}
                />
                <div className="md:col-span-2">
                  <AdminInput label="Auto Offer" value={paymentForm.offerLabel} onChange={() => {}} readOnly />
                </div>
              </div>
            </section>

            <section className="glass rounded-lg p-5 sm:p-6">
              <div className="mb-5">
                <h3 className="text-xl font-black text-white">Premium Plans</h3>
                <p className="mt-1 text-sm text-stone-400">Edit duration, price, and cut price for every plan.</p>
              </div>
              <div className="grid gap-3">
                {paymentForm.plans.map((plan, index) => (
                  <div
                    className="grid gap-3 rounded-lg border border-white/10 bg-black/25 p-3 md:grid-cols-[1.2fr_0.6fr_0.8fr_0.9fr]"
                    key={plan.id}
                  >
                    <AdminInput
                      label="Label"
                      value={plan.name}
                      onChange={(name) => updatePaymentPlan(paymentForm, setPaymentForm, index, { name })}
                    />
                    <AdminInput
                      label="Days"
                      value={plan.durationDays}
                      onChange={(durationDays) =>
                        updatePaymentPlan(paymentForm, setPaymentForm, index, {
                          durationDays,
                          name: formatEditablePlanName(plan.id, durationDays),
                        })
                      }
                    />
                    <AdminInput
                      label="Amount INR"
                      value={plan.amount}
                      onChange={(amount) => updatePaymentPlan(paymentForm, setPaymentForm, index, { amount })}
                    />
                    <AdminInput
                      label="Cross Price INR"
                      value={plan.originalAmount}
                      onChange={(originalAmount) =>
                        updatePaymentPlan(paymentForm, setPaymentForm, index, { originalAmount })
                      }
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="glass rounded-lg p-5 sm:p-6">
              <div className="mb-5">
                <h3 className="text-xl font-black text-white">Payment Destination</h3>
                <p className="mt-1 text-sm text-stone-400">UPI details and redirect message used by the Pay Now button.</p>
              </div>
              <div className="grid gap-4">
                <AdminInput
                  label="UPI ID"
                  value={paymentForm.upiId}
                  onChange={(upiId) => setPaymentForm({ ...paymentForm, upiId })}
                />
                <AdminInput
                  label="Pay Now Link"
                  value={paymentForm.paymentLink}
                  onChange={(paymentLink) => setPaymentForm({ ...paymentForm, paymentLink })}
                />
                <AdminInput
                  label="Auto Message"
                  value={paymentForm.paymentMessage}
                  onChange={(paymentMessage) => setPaymentForm({ ...paymentForm, paymentMessage })}
                />
              </div>
            </section>

            <section className="glass rounded-lg p-5 sm:p-6">
              <div className="mb-5">
                <h3 className="text-xl font-black text-white">Images</h3>
                <p className="mt-1 text-sm text-stone-400">Upload scanner and homepage hero image from gallery.</p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-black/25 p-4" key={paymentFormKey}>
                  <AdminFileInput
                    accept="image/*"
                    label="UPI Scanner Image"
                    value={paymentForm.upiQr}
                    onChange={(upiQr) => setPaymentForm({ ...paymentForm, upiQr })}
                  />
                  {paymentForm.qrImageUrl ? (
                    <button
                      className="mt-3 min-h-10 w-full rounded-lg border border-red-400/20 bg-red-500/10 px-4 text-sm font-bold text-red-200"
                      onClick={() => setPaymentForm({ ...paymentForm, qrImageUrl: "", upiQr: null, clearQr: true })}
                      type="button"
                    >
                      Clear Scanner
                    </button>
                  ) : null}
                </div>
                <div className="rounded-lg border border-white/10 bg-black/25 p-4" key={`hero-${paymentFormKey}`}>
                  <AdminFileInput
                    accept="image/*"
                    label="Hero Background Image"
                    value={paymentForm.heroImage}
                    onChange={(heroImage) => setPaymentForm({ ...paymentForm, heroImage })}
                  />
                  {paymentForm.heroImageUrl ? (
                    <button
                      className="mt-3 min-h-10 w-full rounded-lg border border-red-400/20 bg-red-500/10 px-4 text-sm font-bold text-red-200"
                      onClick={() =>
                        setPaymentForm({
                          ...paymentForm,
                          heroImageUrl: "",
                          heroImage: null,
                          clearHero: true,
                        })
                      }
                      type="button"
                    >
                      Clear Hero Image
                    </button>
                  ) : null}
                </div>
              </div>
            </section>

            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-champagne font-black text-black shadow-gold"
              disabled={loading}
              type="submit"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
              Save Settings
            </button>
          </form>

          <aside className="glass h-fit rounded-lg p-5 sm:p-6 xl:sticky xl:top-24">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-black">Payment Preview</h2>
              <span className="rounded-full bg-plasma/15 px-3 py-1 text-xs font-black text-plasma">
                Live
              </span>
            </div>
            <div className="mt-5 grid gap-5">
              <div className="grid min-h-64 place-items-center rounded-lg bg-white p-3">
                {paymentForm.qrImageUrl ? (
                  <img
                    className="max-h-60 w-full object-contain"
                    src={paymentForm.qrImageUrl}
                    alt="UPI scanner preview"
                  />
                ) : (
                  <QrCode className="text-black" size={82} />
                )}
              </div>
              <div>
                <p className="text-sm font-black uppercase text-champagne">{paymentForm.offerLabel || "Offer"}</p>
                <h3 className="mt-2 text-3xl font-black">{paymentForm.planName}</h3>
                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <span className="text-xl text-stone-500 line-through">INR {paymentForm.originalAmount}</span>
                  <span className="text-4xl font-black text-champagne">INR {paymentForm.priceAmount}</span>
                </div>
                <div className="mt-4 grid gap-2">
                  {paymentForm.plans.map((plan) => (
                    <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-stone-300" key={plan.id}>
                      {plan.name}:{" "}
                      {Number(plan.originalAmount) > Number(plan.amount) ? (
                        <span className="text-stone-500 line-through">INR {plan.originalAmount}</span>
                      ) : null}{" "}
                      <span className="font-black text-champagne">INR {plan.amount}</span>{" "}
                      {calculateOfferLabel(plan.amount, plan.originalAmount) ? (
                        <span className="text-xs font-black text-plasma">
                          {calculateOfferLabel(plan.amount, plan.originalAmount)}
                        </span>
                      ) : null}
                    </p>
                  ))}
                </div>
                <div className="mt-4 grid gap-2 text-sm text-stone-400">
                  {paymentForm.upiId ? <p className="truncate">UPI ID: {paymentForm.upiId}</p> : null}
                  {paymentForm.paymentLink ? <p className="truncate">Pay Now Link: {paymentForm.paymentLink}</p> : null}
                  {paymentForm.paymentMessage ? <p className="line-clamp-2">Auto Message: {paymentForm.paymentMessage}</p> : null}
                  {paymentForm.heroImageUrl ? <p className="truncate">Hero Image: {paymentForm.heroImageUrl}</p> : null}
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {isAdmin && activeSection === "users" ? (
        <section className="glass rounded-lg p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-black">
                <Users size={22} />
                Users
              </h2>
              <p className="mt-2 text-sm text-stone-400">Search by name or email and manually allow premium access.</p>
            </div>
            <form
              className="flex min-h-12 w-full gap-2 md:w-[420px]"
              onSubmit={(event) => {
                event.preventDefault();
                loadUsers(userSearch);
              }}
            >
              <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3">
                <Search size={17} />
                <input
                  className="min-w-0 flex-1 bg-transparent outline-none"
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder="Search name or email"
                />
              </label>
              <button className="rounded-lg bg-champagne px-4 font-black text-black" type="submit">
                Search
              </button>
            </form>
          </div>

          <div className="mt-5 grid gap-3">
            {users.map((item) => (
              <article
                className="grid gap-3 rounded-lg border border-white/10 bg-black/25 p-4 md:grid-cols-[1fr_auto]"
                key={item.id}
              >
                <div>
                  <h3 className="font-black">{item.name || "Member"}</h3>
                  <p className="mt-1 text-sm text-stone-400">{item.email}</p>
                  {item.isPremium && item.planName ? (
                    <p className="mt-1 text-xs text-champagne">
                      Plan: {item.planName}
                      {item.remainingDays ? ` • ${item.remainingDays} days left` : ""}
                    </p>
                  ) : null}
                  {item.premiumUntil ? (
                    <p className="mt-1 text-xs text-stone-500">Expires: {formatDate(item.premiumUntil)}</p>
                  ) : null}
                  {item.isBlocked ? (
                    <p className="mt-1 text-xs font-bold text-orange-200">Blocked account</p>
                  ) : null}
                  <p className="mt-1 text-xs text-stone-500">
                    {item.role} • {item.isPremium ? "Premium active" : "Free account"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {item.isPremium ? (
                    <button
                      className="rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-200"
                      onClick={() => updateUserPremium(item.id, false)}
                      type="button"
                    >
                      Revoke
                    </button>
                  ) : (
                    <>
                      <select
                        className="min-h-10 rounded-lg border border-white/10 bg-black/30 px-3 text-sm font-bold text-white outline-none"
                        value={userPlanSelections[item.id] || "days15"}
                        onChange={(event) =>
                          setUserPlanSelections({ ...userPlanSelections, [item.id]: event.target.value })
                        }
                      >
                        {paymentForm.plans.map((plan) => (
                          <option className="bg-graphite" key={plan.id} value={plan.id}>
                            {plan.name} - INR {plan.amount}
                          </option>
                        ))}
                      </select>
                      <button
                        className="rounded-lg bg-champagne px-4 py-2 text-sm font-black text-black"
                        onClick={() => updateUserPremium(item.id, true)}
                        type="button"
                      >
                        Allow Premium
                      </button>
                    </>
                  )}
                  {item.role !== "admin" ? (
                    <>
                      <button
                        className={`rounded-lg px-4 py-2 text-sm font-bold ${
                          item.isBlocked
                            ? "border border-plasma/20 bg-plasma/10 text-plasma"
                            : "border border-orange-400/20 bg-orange-500/10 text-orange-200"
                        }`}
                        onClick={() => updateUserBlock(item.id, !item.isBlocked)}
                        type="button"
                      >
                        {item.isBlocked ? "Unblock" : "Block"}
                      </button>
                      <button
                        className="rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-200"
                        onClick={() => deleteUser(item.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    </>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {activeSection === "broken" ? (
        <section className="glass rounded-lg p-4 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-black">
                <AlertTriangle size={22} />
                Broken Videos
              </h2>
              <p className="mt-1 text-sm text-stone-400">
                Failed processing jobs, missing sources, and videos that are not safe to publish.
              </p>
            </div>
            <button
              className="min-h-10 rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-black text-stone-200"
              onClick={loadBrokenVideos}
              type="button"
            >
              Refresh
            </button>
          </div>

          <div className="mt-5 grid gap-3">
            {brokenVideos.length ? (
              brokenVideos.map((video) => (
                <article
                  className="grid gap-3 rounded-lg border border-red-400/20 bg-red-500/5 p-3 sm:grid-cols-[120px_minmax(0,1fr)_auto]"
                  key={video._id || video.id}
                >
                  {video.thumbnailUrl ? (
                    <img
                      alt={video.title}
                      className="aspect-video w-full rounded-md object-cover sm:w-[120px]"
                      decoding="async"
                      loading="lazy"
                      src={video.thumbnailUrl}
                    />
                  ) : (
                    <div className="grid aspect-video w-full place-items-center rounded-md bg-white/10 text-xs font-black text-stone-500 sm:w-[120px]">
                      No image
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="break-words text-base font-black leading-6 text-white sm:text-lg">{video.title}</h3>
                    <p className="mt-1 text-sm text-stone-400">
                      {video.category} - {video.status || "unknown"}
                    </p>
                    <p className="mt-1 text-xs text-red-200">
                      {video.processingError || video.playbackError || (video.sourceMissing ? "Video source missing." : "Needs review.")}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      Processing: {video.processingStatus || "unknown"} - Playback: {video.playbackHealthStatus || "unknown"}
                    </p>
                  </div>
                  <div className="flex gap-2 sm:justify-end">
                    <button
                      className="grid h-11 w-11 place-items-center rounded-lg border border-champagne/20 bg-champagne/10 text-champagne"
                      onClick={() => {
                        editVideo(video);
                        setActiveSection("videos");
                      }}
                      type="button"
                      aria-label={`Edit ${video.title}`}
                    >
                      <Pencil size={17} />
                    </button>
                    <button
                      className="grid h-11 w-11 place-items-center rounded-lg border border-red-400/20 bg-red-500/10 text-red-200"
                      onClick={() => removeVideo(video._id || video.id)}
                      type="button"
                      aria-label={`Remove ${video.title}`}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-lg border border-white/10 bg-black/25 p-6 text-sm text-stone-400">
                No broken videos found.
              </div>
            )}
          </div>
        </section>
      ) : null}

      {activeSection === "videos" ? (
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(360px,520px)_minmax(0,1fr)]">
        <form className="glass grid auto-rows-max content-start gap-5 rounded-lg p-4 sm:p-6" onSubmit={submit}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-black">
                {editingId ? <Pencil size={22} /> : <Plus size={22} />}
                {editingId ? "Edit Video" : "Add Video"}
              </h2>
              <p className="mt-1 text-sm text-stone-400">
                {isPartner ? "Upload videos and manage only your own catalog." : "Upload video files and organize them for members."}
              </p>
            </div>
            {editingId ? (
              <button
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5"
                onClick={() => {
                  setEditingId("");
                  setForm(createEmptyVideo(catalog));
                  setFormKey((value) => value + 1);
                }}
                type="button"
                aria-label="Cancel edit"
              >
                <X size={17} />
              </button>
            ) : null}
          </div>
          <AdminInput label="Title" value={form.title} onChange={(title) => setForm({ ...form, title })} />
          <AdminInput label="Creator (Optional)" value={form.creator} onChange={(creator) => setForm({ ...form, creator })} />
          <AdminSelect
            label="Category"
            value={form.category}
            options={catalog.categories}
            onChange={(category) => setForm({ ...form, category })}
          />
          <div className="grid gap-3 rounded-lg border border-white/10 bg-black/20 p-3 sm:p-4" key={formKey}>
            <AdminFileInput
              accept="image/*"
              label={editingId ? "Replace Thumbnail (Optional)" : "Thumbnail Image (Optional)"}
              value={form.thumbnail}
              onChange={(thumbnail) => setForm({ ...form, thumbnail, generatedThumbnail: thumbnail ? null : form.generatedThumbnail })}
            />
            <AdminFileInput
              accept={videoAccept}
              label={editingId ? "Replace Default Video" : "Default Video File"}
              value={form.video}
              onChange={(video) => handleVideoFile(video, "video")}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <AdminFileInput
                accept={videoAccept}
                label="HD Video File (Optional)"
                value={form.videoHd}
                onChange={(videoHd) => handleVideoFile(videoHd, "videoHd")}
              />
              <AdminFileInput
                accept={videoAccept}
                label="SD Video File (Optional)"
                value={form.videoSd}
                onChange={(videoSd) => handleVideoFile(videoSd, "videoSd")}
              />
            </div>
          </div>
          {loading && uploadProgress > 0 ? (
            <div className="rounded-lg border border-champagne/20 bg-champagne/10 p-3">
              <div className="mb-2 flex items-center justify-between text-xs font-black uppercase text-champagne">
                <span>Uploading</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black/40">
                <div
                  className="h-full rounded-full bg-champagne transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-stone-400">Processing to mobile-ready MP4 after upload.</p>
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <AdminInput label="Duration" value={form.duration} onChange={(duration) => setForm({ ...form, duration })} />
            <AdminInput label="Views" value={form.views} onChange={(views) => setForm({ ...form, views })} />
            <AdminSelect
              label="Status"
              value={form.status}
              options={["approved", "pending", "rejected"]}
              onChange={(status) => setForm({ ...form, status })}
            />
          </div>
          <label className="flex min-h-12 items-center gap-3 rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-stone-300">
            <input
              checked={form.premiumOnly}
              onChange={(event) => setForm({ ...form, premiumOnly: event.target.checked })}
              type="checkbox"
              className="h-4 w-4 accent-champagne"
            />
            Premium locked until payment
          </label>
          <button
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-champagne px-5 font-black text-black shadow-gold sm:w-auto"
            disabled={loading}
            type="submit"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
            {editingId ? "Update Video" : "Save Video"}
          </button>
        </form>

        <section className="glass rounded-lg p-4 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-black">
                <Film size={22} />
                {isPartner ? "My Videos" : "Premium Videos"}
              </h2>
              <p className="mt-1 text-sm text-stone-400">
                {isPartner ? `${videos.length} uploaded by ${user?.name || "Partner"}` : `${videos.length} videos in catalog`}
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {videos.map((video) => (
              <article
                className="grid gap-3 rounded-lg border border-white/10 bg-black/25 p-3 transition hover:border-champagne/30 sm:grid-cols-[120px_minmax(0,1fr)_auto]"
                key={video._id || video.id}
              >
                {video.thumbnailUrl ? (
                  <img
                    alt={video.title}
                    className="aspect-video w-full rounded-md object-cover sm:w-[120px]"
                    decoding="async"
                    loading="lazy"
                    src={video.thumbnailUrl}
                  />
                ) : (
                  <div className="grid aspect-video w-full place-items-center rounded-md bg-white/10 text-xs font-black text-stone-500 sm:w-[120px]">
                    No image
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="break-words text-base font-black leading-6 text-white sm:text-lg">{video.title}</h3>
                  <p className="mt-1 text-sm text-stone-400">
                    {video.creator} • {video.category} • {video.status}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    {Number(video.views || 0).toLocaleString("en-IN")} views
                    {isAdmin && video.uploadedByName ? ` - ${video.uploadedByName}` : ""}
                  </p>
                  <p className="mt-1 truncate text-xs text-stone-500">{video.sourceType || "Protected source"}</p>
                  {video.sourceMissing ? (
                    <p className="mt-1 text-xs font-black text-red-200">Source missing - re-upload this video</p>
                  ) : null}
                </div>
                <div className="flex gap-2 sm:justify-end">
                  <button
                    className="grid h-11 w-11 place-items-center rounded-lg border border-champagne/20 bg-champagne/10 text-champagne"
                    onClick={() => editVideo(video)}
                    type="button"
                    aria-label={`Edit ${video.title}`}
                  >
                    <Pencil size={17} />
                  </button>
                  <button
                    className="grid h-11 w-11 place-items-center rounded-lg border border-red-400/20 bg-red-500/10 text-red-200"
                    onClick={() => removeVideo(video._id || video.id)}
                    type="button"
                    aria-label={`Remove ${video.title}`}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
      ) : null}
    </section>
  );
}

function SectionButton({ active, icon, label, onClick }) {
  return (
    <button
      className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-black ${
        active ? "bg-champagne text-black" : "border border-white/10 bg-white/5 text-stone-300"
      }`}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

function AdminInput({ label, value, onChange, readOnly = false }) {
  return (
    <label className="grid w-full min-w-0 gap-2 text-sm font-bold text-stone-300">
      {label}
      <input
        className={`min-h-12 w-full min-w-0 rounded-lg border border-white/10 px-4 text-white outline-none ${
          readOnly ? "bg-white/5 text-champagne" : "bg-black/30"
        }`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        readOnly={readOnly}
      />
    </label>
  );
}

function AdminFileInput({ label, accept, value, onChange }) {
  return (
    <label className="grid w-full min-w-0 gap-2 text-sm font-bold text-stone-300">
      {label}
      <span className="flex min-h-12 min-w-0 flex-col items-stretch gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-stone-400 sm:flex-row sm:items-center sm:px-4">
        <Upload className="hidden shrink-0 sm:block" size={17} />
        <input
          accept={accept}
          className="w-full min-w-0 flex-1 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-champagne file:px-3 file:py-2 file:font-black file:text-black"
          onChange={(event) => onChange(event.target.files?.[0] || null)}
          type="file"
        />
      </span>
      {value ? <span className="text-xs text-plasma">{value.name}</span> : null}
    </label>
  );
}

function AdminSelect({ label, value, options, onChange }) {
  return (
    <label className="grid w-full min-w-0 gap-2 text-sm font-bold text-stone-300">
      {label}
      <select
        className="min-h-12 w-full min-w-0 rounded-lg border border-white/10 bg-black/30 px-4 text-white outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => {
          const optionValue = typeof option === "string" ? option : option.value;
          const optionLabel = typeof option === "string" ? option : option.label;
          return (
          <option className="bg-graphite" key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
          );
        })}
      </select>
    </label>
  );
}

function CatalogList({ title, items, lockedNames = [], onDelete }) {
  const lockedSet = new Set(lockedNames.map((name) => name.toLowerCase()));

  return (
    <div className="rounded-lg border border-white/10 bg-black/25 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-black">{title}</h3>
        <span className="text-xs font-bold text-stone-500">{items.length} active</span>
      </div>
      <div className="grid gap-2">
        {items.map((item) => {
          const locked = lockedSet.has(String(item.name || "").toLowerCase());
          return (
            <div
              className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3"
              key={item.id}
            >
              <span className="min-w-0 truncate text-sm font-bold text-stone-200">{item.name}</span>
              <button
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${
                  locked
                    ? "cursor-not-allowed border-white/10 bg-white/5 text-stone-600"
                    : "border-red-400/20 bg-red-500/10 text-red-200"
                }`}
                disabled={locked}
                onClick={() => onDelete(item)}
                type="button"
                aria-label={`Delete ${item.name}`}
                title={locked ? "Default category" : "Delete category"}
              >
                <Trash2 size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function normalizeCatalog(catalog) {
  return {
    categories: catalog?.categories?.length ? catalog.categories : defaultCategories,
  };
}

function normalizePremiumPlans(plans) {
  const source = plans?.length ? plans : premiumPlans;
  return premiumPlans.map((fallback) => {
    const item = source.find((plan) => plan.id === fallback.id) || fallback;
    return toEditablePlan(item);
  });
}

function toEditablePlan(plan) {
  const amount = priceToInputValue(plan.amount, plan.priceText);
  const originalAmount = priceToInputValue(plan.originalAmount, plan.originalPriceText);
  return {
    id: plan.id,
    name: plan.name || formatEditablePlanName(plan.id, plan.durationDays),
    durationDays: String(plan.durationDays || ""),
    amount,
    originalAmount,
  };
}

function priceToInputValue(amountValue, priceText = "") {
  const amount = Number(amountValue || 0);
  if (amount) return String(amount >= 1000 ? amount / 100 : amount);
  return priceText ? priceText.replace(/\D/g, "") : "";
}

function updatePaymentPlan(paymentForm, setPaymentForm, index, updates) {
  const plans = paymentForm.plans.map((plan, itemIndex) =>
    itemIndex === index ? { ...plan, ...updates } : plan,
  );
  setPaymentForm({ ...paymentForm, plans });
}

function formatEditablePlanName(planId, durationDays) {
  const days = Number(durationDays);
  if (planId === "month1" && days === 30) return "1 Month";
  if (!Number.isFinite(days) || days <= 0) return "Plan";
  return `${days} Days`;
}

function withAutoOffer(form) {
  return {
    ...form,
    offerLabel: calculateOfferLabel(form.priceAmount, form.originalAmount),
  };
}

function calculateOfferLabel(priceAmount, originalAmount) {
  const price = Number(priceAmount);
  const original = Number(originalAmount);

  if (!Number.isFinite(price) || !Number.isFinite(original) || price <= 0 || original <= price) {
    return "";
  }

  const percentage = Math.round(((original - price) / original) * 100);
  return percentage > 0 ? `${percentage}% OFF` : "";
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

async function applyVideoFileWithDuration(file, setForm, field) {
  if (!file) {
    setForm((current) => ({ ...current, [field]: null }));
    return;
  }

  setForm((current) => ({ ...current, [field]: file }));

  try {
    const [durationResult, thumbnailResult] = await Promise.allSettled([
      readVideoDuration(file),
      generateVideoThumbnail(file),
    ]);
    const duration = durationResult.status === "fulfilled" ? durationResult.value : "";
    const generatedThumbnail = thumbnailResult.status === "fulfilled" ? thumbnailResult.value : null;
    setForm((current) => ({
      ...current,
      [field]: file,
      duration: duration || current.duration,
      generatedThumbnail: current.thumbnail ? current.generatedThumbnail : generatedThumbnail || current.generatedThumbnail,
    }));
  } catch {
    setForm((current) => ({ ...current, [field]: file }));
  }
}

function validateVideoFile(file) {
  const extension = `.${String(file.name || "").split(".").pop()}`.toLowerCase();
  const isSupportedExtension = supportedVideoExtensions.includes(extension);
  const isSupportedMime =
    file.type === "video/mp4" ||
    file.type === "video/quicktime" ||
    file.type === "video/x-m4v" ||
    file.type === "video/webm" ||
    !file.type;

  if (!isSupportedExtension || !isSupportedMime) {
    return "Unsupported video format. Please upload MP4, MOV, M4V, or WEBM from your gallery.";
  }

  if (file.size > maxVideoUploadSize) {
    return "Video is too large. Maximum upload size is 3 GB.";
  }

  return "";
}

function readVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(formatVideoDuration(video.duration));
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read video duration."));
    };
    video.src = objectUrl;
  });
}

function generateVideoThumbnail(file) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    let settled = false;
    const timer = window.setTimeout(() => finish(null), 8000);

    const finish = (thumbnail) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      URL.revokeObjectURL(objectUrl);
      resolve(thumbnail);
    };

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      const targetTime = Math.min(2, Math.max(0.1, (video.duration || 2) / 4));
      video.currentTime = targetTime;
    };
    video.onseeked = () => {
      const width = 640;
      const ratio = video.videoWidth ? width / video.videoWidth : 1;
      const height = Math.max(1, Math.round((video.videoHeight || 405) * ratio));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");

      if (!context) {
        finish(null);
        return;
      }

      context.drawImage(video, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            finish(null);
            return;
          }
          finish(new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "video"}-thumbnail.jpg`, { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.74,
      );
    };
    video.onerror = () => finish(null);
    video.src = objectUrl;
  });
}

function formatVideoDuration(value) {
  if (!Number.isFinite(value) || value <= 0) return "";
  const totalSeconds = Math.round(value);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

async function buildVideoFormData(form) {
  const payload = new FormData();

  for (const field of ["title", "creator", "category", "duration", "views", "status"]) {
    payload.append(field, form[field]);
  }
  payload.append("premiumOnly", String(form.premiumOnly));

  const fallbackThumbnail =
    form.thumbnail ||
    form.generatedThumbnail ||
    (form.video || form.videoHd || form.videoSd ? await generateVideoThumbnail(form.video || form.videoHd || form.videoSd) : null);
  if (fallbackThumbnail) payload.append("thumbnail", fallbackThumbnail);
  if (form.video) payload.append("video", form.video);
  if (form.videoHd) payload.append("videoHd", form.videoHd);
  if (form.videoSd) payload.append("videoSd", form.videoSd);

  return payload;
}

async function buildPaymentSettingsFormData(form) {
  const payload = new FormData();
  payload.append("planName", form.planName);
  payload.append("priceAmount", form.priceAmount);
  payload.append("originalAmount", form.originalAmount);
  payload.append("offerLabel", calculateOfferLabel(form.priceAmount, form.originalAmount));
  payload.append("upiId", form.upiId);
  payload.append("paymentLink", form.paymentLink);
  payload.append("paymentMessage", form.paymentMessage);
  payload.append("plans", JSON.stringify(form.plans));
  if (form.upiQr) payload.append("upiQr", await optimizeQrImage(form.upiQr));
  if (form.heroImage) payload.append("heroImage", await optimizeHeroImage(form.heroImage));
  if (form.clearQr) payload.append("clearQr", "true");
  if (form.clearHero) payload.append("clearHero", "true");
  return payload;
}

function optimizeHeroImage(file) {
  return optimizeImage(file, {
    maxWidth: 1600,
    outputName: "hero",
    outputType: "image/jpeg",
    quality: 0.76,
  });
}

function optimizeQrImage(file) {
  return optimizeImage(file, {
    maxWidth: 720,
    outputName: "upi-scanner",
    outputType: "image/png",
  });
}

function optimizeImage(file, options) {
  if (!file?.type?.startsWith("image/")) return file;

  return new Promise((resolve) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const maxWidth = options.maxWidth;
      const ratio = Math.min(1, maxWidth / image.width);
      const width = Math.max(1, Math.round(image.width * ratio));
      const height = Math.max(1, Math.round(image.height * ratio));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) {
        resolve(file);
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          const optimizedName = file.name.replace(/\.[^.]+$/, "") || options.outputName;
          const extension = options.outputType === "image/png" ? "png" : "jpg";
          resolve(new File([blob], `${optimizedName}.${extension}`, { type: options.outputType }));
        },
        options.outputType,
        options.quality,
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    image.src = objectUrl;
  });
}
