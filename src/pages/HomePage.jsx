import { BadgeCheck, Crown, Flame, Lock, LockOpen, Play, ShieldCheck, Sparkles, X } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import FilterBar from "../components/FilterBar.jsx";
import TrustRow from "../components/TrustRow.jsx";
import VideoPlayerModal from "../components/VideoPlayerModal.jsx";
import VideoSections from "../components/VideoSections.jsx";
import { defaultCategories, defaultSections } from "../data/catalog.js";
import { api } from "../lib/api.js";

export default function HomePage({ token, isPremium, onUnlock }) {
  const [videos, setVideos] = useState([]);
  const [catalog, setCatalog] = useState({
    categories: defaultCategories,
    sections: defaultSections,
  });
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [showPremiumPrompt, setShowPremiumPrompt] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api("/api/videos", { token }), api("/api/catalog"), api("/api/payment-settings")])
      .then(([videoData, catalogData, settingsData]) => {
        setVideos(videoData.videos || []);
        setCatalog({
          categories: catalogData.catalog?.categories?.length
            ? catalogData.catalog.categories
            : defaultCategories,
          sections: catalogData.catalog?.sections?.length ? catalogData.catalog.sections : defaultSections,
        });
        setHeroImageUrl(settingsData.settings?.heroImageUrl || "");
      })
      .catch((nextError) => setError(nextError.message || "Could not load videos."));
  }, [token, isPremium]);

  useEffect(() => {
    if (activeCategory !== "All" && !catalog.categories.includes(activeCategory)) {
      setActiveCategory("All");
    }
  }, [activeCategory, catalog.categories]);

  useEffect(() => {
    if (isPremium) {
      setShowPremiumPrompt(false);
      return;
    }

    const timer = window.setTimeout(() => setShowPremiumPrompt(true), 700);
    return () => window.clearTimeout(timer);
  }, [isPremium]);

  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      const matchesCategory =
        activeCategory === "All" || video.category === activeCategory;
      const matchesQuery = `${video.title} ${video.creator} ${video.category}`
        .toLowerCase()
        .includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query, videos]);

  return (
    <>
      <section
        className="luxury-gradient relative min-h-[560px] sm:min-h-[620px] lg:min-h-[680px]"
        style={heroImageUrl ? { "--hero-photo": `url("${heroImageUrl}")` } : undefined}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-velvet via-transparent to-black/20" />
        <div className="relative mx-auto grid min-h-[560px] max-w-7xl items-end gap-8 px-4 pb-12 pt-24 sm:min-h-[620px] sm:px-6 lg:min-h-[680px] lg:grid-cols-[minmax(0,1fr)_360px] lg:pb-16">
          <div className="max-w-4xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-champagne/30 bg-black/30 px-4 py-2 text-xs font-black uppercase text-champagne">
              <Sparkles size={15} />
              Premium streaming
            </span>
            <h1 className="mt-5 max-w-[920px] text-4xl font-black leading-none tracking-normal sm:text-6xl lg:text-8xl">
              The Content Everyone Is Talking About
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-stone-200 sm:text-lg">
              Visitors can browse the catalog freely. Videos stay blurred and locked until membership payment activates access.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                className="glow-ring inline-flex min-h-14 items-center justify-center gap-3 rounded-lg bg-champagne px-6 text-base font-black text-black transition hover:scale-[1.02]"
                onClick={onUnlock}
                type="button"
              >
                {isPremium ? <LockOpen size={21} /> : <Lock size={21} />}
                {isPremium ? "All Videos Unlocked" : "Unlock All Videos"}
              </button>
              <button className="inline-flex min-h-14 items-center justify-center gap-3 rounded-lg border border-white/15 bg-white/10 px-6 font-bold text-white backdrop-blur-xl">
                <Play size={20} />
                Browse Previews
              </button>
            </div>
          </div>

          <div className="glass rounded-lg p-5 shadow-glow">
            <div className="grid gap-3">
              <TrustRow icon={<ShieldCheck />} label="Verified library" value="Premium members only" />
              <TrustRow icon={<BadgeCheck />} label="Premium access" value="Instant after payment" />
              <TrustRow icon={<Flame />} label="Streaming" value="HD-ready video links" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6">
        <FilterBar
          categories={["All", ...catalog.categories]}
          activeCategory={activeCategory}
          onCategory={setActiveCategory}
          query={query}
          onQuery={setQuery}
        />
        {error ? <p className="mb-6 rounded-lg bg-red-500/10 p-4 text-red-200">{error}</p> : null}
        <VideoSections
          videos={filteredVideos}
          sections={catalog.sections}
          isPremium={isPremium}
          onPlay={(video) => {
            if (!isPremium) {
              onUnlock();
              return;
            }
            setSelectedVideo(video);
          }}
        />
      </section>

      {!isPremium ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-black/80 p-3 backdrop-blur-xl sm:hidden">
          <button
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-champagne font-black text-black"
            onClick={onUnlock}
            type="button"
          >
            <LockOpen size={19} />
            Unlock All Videos
          </button>
        </div>
      ) : null}

      {selectedVideo ? (
        <VideoPlayerModal
          video={selectedVideo}
          token={token}
          onClose={() => setSelectedVideo(null)}
        />
      ) : null}

      {showPremiumPrompt ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-md">
          <section className="glass relative w-full max-w-md rounded-lg p-6 shadow-glow">
            <button
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-lg bg-white/10"
              onClick={() => setShowPremiumPrompt(false)}
              type="button"
              aria-label="Close premium prompt"
            >
              <X size={18} />
            </button>
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-champagne/15 text-champagne">
              <Crown size={24} />
            </span>
            <h2 className="mt-5 text-3xl font-black text-white">Take Premium To Watch Videos</h2>
            <p className="mt-3 text-sm leading-6 text-stone-300">
              Previews are available to browse. Full playback unlocks after premium access is approved.
            </p>
            <div className="mt-6 grid gap-3">
              <button
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-champagne font-black text-black"
                onClick={() => {
                  setShowPremiumPrompt(false);
                  onUnlock();
                }}
                type="button"
              >
                <LockOpen size={18} />
                Take Premium
              </button>
              <button
                className="min-h-12 rounded-lg border border-white/10 bg-white/5 font-bold text-white"
                onClick={() => setShowPremiumPrompt(false)}
                type="button"
              >
                Browse First
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
