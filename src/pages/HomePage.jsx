import { BadgeCheck, Crown, Flame, Lock, LockOpen, Play, ShieldCheck, Sparkles, X } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import FilterBar from "../components/FilterBar.jsx";
import TrustRow from "../components/TrustRow.jsx";
import VideoSections from "../components/VideoSections.jsx";
import { defaultCategories, defaultSections } from "../data/catalog.js";
import { api, normalizeAssetUrl } from "../lib/api.js";

const VIDEO_PAGE_SIZE = 500;

export default function HomePage({ token, isPremium, onUnlock, onWatch }) {
  const [videos, setVideos] = useState([]);
  const [catalog, setCatalog] = useState({
    categories: defaultCategories,
    sections: defaultSections,
  });
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [heroImageUrl, setHeroImageUrl] = useState(getCachedHeroImage);
  const [showPremiumPrompt, setShowPremiumPrompt] = useState(false);
  const [error, setError] = useState("");
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [videoPage, setVideoPage] = useState(1);
  const [hasMoreVideos, setHasMoreVideos] = useState(false);

  useEffect(() => {
    let ignore = false;
    setLoadingVideos(true);
    setError("");

    Promise.all([
      api(`/api/videos?page=1&limit=${VIDEO_PAGE_SIZE}`, { token, cacheTtl: 30000 }),
      api("/api/catalog", { cacheTtl: 300000 }),
      api("/api/payment-settings", { cacheTtl: 300000 }),
    ])
      .then(([videoData, catalogData, settingsData]) => {
        if (ignore) return;
        setVideos(videoData.videos || []);
        setVideoPage(1);
        setHasMoreVideos(Boolean(videoData.hasMore));
        setCatalog({
          categories: catalogData.catalog?.categories?.length
            ? catalogData.catalog.categories
            : defaultCategories,
          sections: catalogData.catalog?.sections?.length ? catalogData.catalog.sections : defaultSections,
        });
        const nextHeroImageUrl = settingsData.settings?.heroImageUrl || "";
        const safeHeroImageUrl = normalizeAssetUrl(nextHeroImageUrl);
        setHeroImageUrl(safeHeroImageUrl);
        cacheHeroImage(safeHeroImageUrl);
      })
      .catch((nextError) => {
        if (!ignore) setError(nextError.message || "Could not load videos.");
      })
      .finally(() => {
        if (!ignore) setLoadingVideos(false);
      });

    return () => {
      ignore = true;
    };
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

  const handlePlay = useCallback(
    (video) => {
      if (!isPremium) {
        onUnlock();
        return;
      }
      if (video.sourceMissing || video.hasPlayback === false) {
        setError("This video source is missing. Please re-upload it from the admin panel.");
        return;
      }
      onWatch(video.id || video._id);
    },
    [isPremium, onUnlock, onWatch],
  );

  const loadMoreVideos = async () => {
    if (loadingMore || !hasMoreVideos) return;

    const nextPage = videoPage + 1;
    setLoadingMore(true);
    setError("");

    try {
      const videoData = await api(`/api/videos?page=${nextPage}&limit=${VIDEO_PAGE_SIZE}`, {
        token,
        cacheTtl: 30000,
      });
      setVideos((current) => mergeVideos(current, videoData.videos || []));
      setVideoPage(nextPage);
      setHasMoreVideos(Boolean(videoData.hasMore));
    } catch (nextError) {
      setError(nextError.message || "Could not load more videos.");
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <>
      <section
        className="luxury-gradient relative min-h-[560px] sm:min-h-[620px] lg:min-h-[680px]"
      >
        {heroImageUrl ? (
          <img
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
            decoding="async"
            fetchPriority="high"
            loading="eager"
            src={heroImageUrl}
          />
        ) : null}
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
          activeCategory={activeCategory}
          isPremium={isPremium}
          loading={loadingVideos}
          onPlay={handlePlay}
        />
        {hasMoreVideos ? (
          <div className="mt-10 grid place-items-center">
            <button
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-champagne/40 bg-champagne/10 px-6 font-black text-champagne transition hover:bg-champagne hover:text-black"
              disabled={loadingMore}
              onClick={loadMoreVideos}
              type="button"
            >
              {loadingMore ? "Loading..." : "Load More Videos"}
            </button>
          </div>
        ) : null}
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

function getCachedHeroImage() {
  try {
    return normalizeAssetUrl(window.localStorage.getItem("teamusa_hero_image") || "");
  } catch {
    return "";
  }
}

function cacheHeroImage(url) {
  try {
    if (url) {
      window.localStorage.setItem("teamusa_hero_image", url);
    } else {
      window.localStorage.removeItem("teamusa_hero_image");
    }
  } catch {
    // Local storage can be unavailable in private browsing; ignore cache failures.
  }
}

function mergeVideos(current, nextVideos) {
  const seen = new Set(current.map((video) => video.id || video._id));
  const merged = [...current];

  for (const video of nextVideos) {
    const id = video.id || video._id;
    if (seen.has(id)) continue;
    seen.add(id);
    merged.push(video);
  }

  return merged;
}
