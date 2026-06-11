import { ArrowLeft, CalendarDays, Eye, Loader2, Maximize2, Minimize2, Pause, Play } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import VideoCard from "../components/VideoCard.jsx";
import { api, normalizeAssetUrl } from "../lib/api.js";

const VIDEO_PAGE_SIZE = 500;

export default function WatchPage({ videoId, token, isPremium, onUnlock, onBack, onWatch }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError("");

    api(`/api/videos?page=1&limit=${VIDEO_PAGE_SIZE}`, { token, cacheTtl: 30000 })
      .then((data) => {
        if (!ignore) setVideos(data.videos || []);
      })
      .catch((nextError) => {
        if (!ignore) setError(nextError.message || "Could not load video.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [token, videoId]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [videoId]);

  const video = useMemo(() => {
    return videos.find((item) => String(item.id || item._id) === String(videoId)) || null;
  }, [videoId, videos]);

  const relatedVideos = useMemo(() => {
    if (!video) return videos.filter((item) => String(item.id || item._id) !== String(videoId)).slice(0, 8);
    const sameCategory = videos.filter(
      (item) => String(item.id || item._id) !== String(videoId) && item.category === video.category,
    );
    const otherVideos = videos.filter(
      (item) => String(item.id || item._id) !== String(videoId) && item.category !== video.category,
    );
    return [...sameCategory, ...otherVideos].slice(0, 8);
  }, [video, videoId, videos]);

  const handleRelatedPlay = (nextVideo) => {
    if (!isPremium) {
      onUnlock();
      return;
    }
    if (nextVideo.sourceMissing || nextVideo.hasPlayback === false) return;
    onWatch(nextVideo.id || nextVideo._id);
  };

  if (!isPremium) {
    return (
      <main className="min-h-screen bg-black px-4 py-6 sm:px-6">
        <WatchTopBar onBack={onBack} />
        <section className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center text-center">
          <div className="glass rounded-lg p-6 sm:p-8">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-champagne/15 text-champagne">
              <Play size={26} fill="currentColor" />
            </span>
            <h1 className="mt-5 text-3xl font-black text-white sm:text-5xl">Premium Required</h1>
            <p className="mt-3 text-sm leading-6 text-stone-300">
              Full videos open on the dedicated watch page after premium access is active.
            </p>
            <button
              className="mt-6 min-h-12 rounded-lg bg-champagne px-6 font-black text-black"
              onClick={onUnlock}
              type="button"
            >
              Take Premium
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-6 lg:px-8">
        <WatchTopBar onBack={onBack} />

        {loading ? (
          <div className="grid min-h-[70vh] place-items-center text-stone-300">
            <Loader2 className="animate-spin" size={34} />
          </div>
        ) : null}

        {error ? <p className="rounded-lg bg-red-500/10 p-4 text-red-200">{error}</p> : null}

        {!loading && !video ? (
          <section className="grid min-h-[70vh] place-items-center text-center">
            <div>
              <h1 className="text-3xl font-black">Video not found</h1>
              <p className="mt-2 text-stone-400">This video is unavailable or not ready for playback.</p>
            </div>
          </section>
        ) : null}

        {video ? (
          <>
            <WatchPlayer video={video} token={token} />

            <section className="mx-auto mt-5 max-w-7xl">
              <h1 className="text-2xl font-black leading-tight sm:text-4xl">{video.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-stone-400">
                <span className="inline-flex items-center gap-2">
                  <Eye size={16} />
                  {formatViews(video.views)} views
                </span>
                <span className="inline-flex items-center gap-2">
                  <CalendarDays size={16} />
                  {formatDate(video.createdAt || video.uploadDate)}
                </span>
              </div>
            </section>

            <section className="mx-auto mt-10 max-w-7xl pb-16">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <span className="text-xs font-black uppercase text-amethyst">Keep watching</span>
                  <h2 className="text-2xl font-black">Related Videos</h2>
                </div>
              </div>
              {relatedVideos.length ? (
                <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {relatedVideos.map((item) => (
                    <VideoCard
                      key={item._id || item.id}
                      video={item}
                      isPremium={isPremium}
                      onPlay={handleRelatedPlay}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-6 text-sm text-stone-400">
                  No related videos yet.
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

function WatchTopBar({ onBack }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <button
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-black text-white transition hover:border-champagne/40 hover:text-champagne"
        onClick={onBack}
        type="button"
      >
        <ArrowLeft size={18} />
        Back
      </button>
      <span className="hidden text-sm font-black uppercase text-champagne sm:block">TeamUSA Watch</span>
    </div>
  );
}

function WatchPlayer({ video, token }) {
  const shellRef = useRef(null);
  const videoRef = useRef(null);
  const [playback, setPlayback] = useState(null);
  const [quality, setQuality] = useState("auto");
  const [speed, setSpeed] = useState("1");
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isVertical, setIsVertical] = useState(false);
  const [videoAspectRatio, setVideoAspectRatio] = useState(16 / 9);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState("");
  const [loadingState, setLoadingState] = useState("preparing");

  const thumbnailUrl = normalizeAssetUrl(video.thumbnailUrl || "");

  useEffect(() => {
    if (!video?.id) return;
    setPlayback(null);
    setError("");
    setRetryCount(0);
    setCurrentTime(0);
    setDuration(0);
    setIsVertical(false);
    setVideoAspectRatio(16 / 9);
    setLoadingState("preparing");

    api(`/api/videos/${video.id}/playback-token`, {
      method: "POST",
      token,
    })
      .then((data) => {
        setPlayback(data);
        setQuality(data.qualities?.[0]?.id || "auto");
        setLoadingState("loading");
      })
      .catch((nextError) => {
        setLoadingState("");
        setError(nextError.message || "Could not start playback.");
      });
  }, [token, video?.id]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = Number(speed);
  }, [speed]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const element =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement;
      setIsFullscreen(element === shellRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  const sourceUrl = useMemo(() => {
    if (!playback?.streamUrl) return "";
    try {
      const url = new URL(normalizeAssetUrl(playback.streamUrl));
      url.searchParams.set("quality", quality);
      if (retryCount) url.searchParams.set("retry", String(retryCount));
      return url.toString();
    } catch {
      return "";
    }
  }, [playback, quality, retryCount]);

  useEffect(() => {
    if (sourceUrl) {
      setError("");
      setLoadingState("loading");
    }
  }, [sourceUrl]);

  const togglePlayback = async () => {
    const element = videoRef.current;
    if (!element) return;

    if (element.paused) {
      try {
        setLoadingState("loading");
        await element.play();
        setPlaying(true);
      } catch {
        handlePlaybackError("Browser blocked playback. Tap play again.");
      }
      return;
    }

    element.pause();
    setPlaying(false);
  };

  const toggleFullscreen = async () => {
    try {
      const fullscreenElement =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement;

      if (fullscreenElement) {
        await exitBrowserFullscreen();
        setIsFullscreen(false);
        return;
      }

      await enterBrowserFullscreen(shellRef.current, videoRef.current);
      setIsFullscreen(true);
    } catch {
      setError("Fullscreen is not available in this browser.");
    }
  };

  const seek = (value) => {
    const element = videoRef.current;
    if (!element) return;
    element.currentTime = Number(value);
    setCurrentTime(element.currentTime);
  };

  const handlePlaybackError = (message = "This video source could not be played.") => {
    reportPlaybackFailure(video?.id, token, message);
    if (retryCount < 1) {
      setRetryCount((value) => value + 1);
      setLoadingState("buffering");
      setError("");
      return;
    }
    setLoadingState("");
    setError(`${message} Please try another quality or ask support to re-process this video.`);
  };

  const retryPlayback = () => {
    setError("");
    setLoadingState("loading");
    setRetryCount((value) => value + 1);
  };

  const handleMetadata = (event) => {
    const element = event.currentTarget;
    setDuration(element.duration || 0);
    const width = element.videoWidth || 16;
    const height = element.videoHeight || 9;
    setIsVertical(Boolean(height > width));
    setVideoAspectRatio(width / height);
  };

  const playerFrameStyle = isFullscreen
    ? undefined
    : isVertical
      ? { height: "min(78vh, 860px)", minHeight: "min(72vh, 520px)" }
      : { aspectRatio: videoAspectRatio || 16 / 9 };

  const videoStyle = {
    aspectRatio: videoAspectRatio || 16 / 9,
  };

  return (
    <section
      ref={shellRef}
      className={`mx-auto overflow-hidden rounded-lg border border-white/10 bg-zinc-950 shadow-glow transition-all duration-300 ${
        isFullscreen ? "flex h-screen max-w-none flex-col rounded-none" : "max-w-[1500px]"
      }`}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div
        className={`relative grid place-items-center overflow-hidden bg-black ${
          isFullscreen
            ? "min-h-0 flex-1"
            : isVertical
              ? "min-h-[420px]"
              : ""
        }`}
        style={playerFrameStyle}
        onDoubleClick={toggleFullscreen}
      >
        {isVertical && thumbnailUrl ? (
          <img
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-2xl"
            src={thumbnailUrl}
          />
        ) : null}
        <div className="absolute inset-0 bg-black/35" />

        {error ? (
          <div className="absolute inset-0 z-30 grid place-items-center bg-black/80 p-6 text-center backdrop-blur-sm">
            <div className="max-w-md rounded-lg border border-red-400/25 bg-red-500/10 p-5 text-red-100">
              <p className="font-black">Video could not load</p>
              <p className="mt-2 text-sm leading-6 text-red-100/80">{error}</p>
              <button
                className="mt-4 min-h-11 rounded-lg bg-champagne px-5 text-sm font-black text-black"
                onClick={retryPlayback}
                type="button"
              >
                Retry
              </button>
            </div>
          </div>
        ) : null}

        {sourceUrl ? (
          <video
            ref={videoRef}
            className={`relative z-10 object-contain ${
              isVertical
                ? "h-full max-h-full w-auto max-w-full"
                : "h-full w-full"
            }`}
            style={isVertical ? videoStyle : undefined}
            src={sourceUrl}
            playsInline
            preload="metadata"
            controls={false}
            controlsList="nodownload noplaybackrate noremoteplayback"
            disablePictureInPicture
            onLoadStart={() => setLoadingState("loading")}
            onCanPlay={() => setLoadingState("")}
            onLoadedMetadata={handleMetadata}
            onError={() => handlePlaybackError("This video source could not be played.")}
            onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
            onWaiting={() => setLoadingState("buffering")}
            onPlaying={() => {
              setLoadingState("");
              setPlaying(true);
            }}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
        ) : null}

        {loadingState && !error ? (
          <VideoLoadingOverlay
            compact={loadingState === "buffering" && playing}
            label={loadingState === "buffering" ? "Loading Video..." : "Preparing Your Premium Experience..."}
          />
        ) : null}
      </div>

      <div className="grid gap-3 border-t border-white/10 bg-black/75 p-3 backdrop-blur-xl sm:p-4">
        <div className="flex items-center gap-3">
          <button
            className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-champagne text-black"
            onClick={togglePlayback}
            type="button"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause size={20} /> : <Play fill="currentColor" size={20} />}
          </button>
          <span className="w-24 shrink-0 text-xs text-stone-300 sm:text-sm">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <input
            className="h-2 min-w-0 flex-1 accent-champagne"
            min="0"
            max={duration || 0}
            step="0.1"
            value={Math.min(currentTime, duration || 0)}
            onChange={(event) => seek(event.target.value)}
            type="range"
            aria-label="Timeline"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 text-sm text-stone-300">
          <label className="flex items-center gap-2">
            Quality
            <select
              className="min-h-10 rounded-lg border border-white/10 bg-black px-3 text-white"
              value={quality}
              onChange={(event) => setQuality(event.target.value)}
            >
              {(playback?.qualities || [{ id: "auto", label: "Auto" }]).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            Speed
            <select
              className="min-h-10 rounded-lg border border-white/10 bg-black px-3 text-white"
              value={speed}
              onChange={(event) => setSpeed(event.target.value)}
            >
              {["0.5", "0.75", "1", "1.25", "1.5", "2"].map((item) => (
                <option key={item} value={item}>
                  {item}x
                </option>
              ))}
            </select>
          </label>
          <button
            className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/5 text-white transition hover:border-champagne/40 hover:bg-champagne/15 hover:text-champagne"
            onClick={toggleFullscreen}
            title="Fullscreen"
            type="button"
            aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>
    </section>
  );
}

function VideoLoadingOverlay({ label, compact = false }) {
  return (
    <div
      className={`absolute inset-0 z-20 grid place-items-center bg-black/55 backdrop-blur-sm transition ${
        compact ? "pointer-events-none" : ""
      }`}
    >
      <div
        className={`grid place-items-center rounded-lg border border-champagne/25 bg-black/70 text-center shadow-gold ${
          compact ? "gap-2 px-4 py-3" : "gap-4 px-6 py-5 sm:px-8 sm:py-6"
        }`}
      >
        <div className="relative grid h-14 w-14 place-items-center">
          <span className="absolute inset-0 rounded-full border-2 border-champagne/20" />
          <span className="absolute inset-1 animate-spin rounded-full border-2 border-transparent border-t-champagne border-r-champagne" />
          <span className="h-4 w-4 animate-pulse rounded-full bg-champagne shadow-gold" />
        </div>
        <p className={`font-black text-champagne ${compact ? "text-xs" : "text-sm sm:text-base"}`}>
          {label}
        </p>
      </div>
    </div>
  );
}

function enterBrowserFullscreen(element, videoElement) {
  if (element?.requestFullscreen) return element.requestFullscreen();
  if (element?.webkitRequestFullscreen) return element.webkitRequestFullscreen();
  if (element?.mozRequestFullScreen) return element.mozRequestFullScreen();
  if (element?.msRequestFullscreen) return element.msRequestFullscreen();
  if (videoElement?.webkitEnterFullscreen) {
    videoElement.webkitEnterFullscreen();
    return Promise.resolve();
  }
  return Promise.reject(new Error("Fullscreen is not available."));
}

function exitBrowserFullscreen() {
  if (document.exitFullscreen) return document.exitFullscreen();
  if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
  if (document.mozCancelFullScreen) return document.mozCancelFullScreen();
  if (document.msExitFullscreen) return document.msExitFullscreen();
  return Promise.resolve();
}

function reportPlaybackFailure(videoId, token, message) {
  if (!videoId) return;
  api("/api/playback-errors", {
    method: "POST",
    token,
    body: { videoId, message },
  }).catch(() => {});
}

function formatTime(value) {
  if (!Number.isFinite(value)) return "0:00";
  const totalSeconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatViews(views = 0) {
  const value = Number(views || 0);
  if (!Number.isFinite(value)) return String(views || 0);
  return value.toLocaleString("en-IN");
}

function formatDate(value) {
  if (!value) return "Recently uploaded";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
