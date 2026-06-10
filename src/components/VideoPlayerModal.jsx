import React, { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Maximize2, Minimize2, Pause, Play, X } from "lucide-react";
import { api, normalizeAssetUrl } from "../lib/api.js";

export default function VideoPlayerModal({ video, token, onClose }) {
  const playerShellRef = useRef(null);
  const videoRef = useRef(null);
  const [playback, setPlayback] = useState(null);
  const [quality, setQuality] = useState("auto");
  const [speed, setSpeed] = useState("1");
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenNotice, setFullscreenNotice] = useState(false);

  useEffect(() => {
    if (!video?.id) return;

    setPlayback(null);
    setError("");
    setRetryCount(0);
    api(`/api/videos/${video.id}/playback-token`, {
      method: "POST",
      token,
    })
      .then((data) => {
        setPlayback(data);
        setQuality(data.qualities?.[0]?.id || "auto");
      })
      .catch((nextError) => setError(nextError.message || "Could not start playback."));
  }, [video, token]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = Number(speed);
    }
  }, [speed]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement;
      setIsFullscreen(fullscreenElement === playerShellRef.current);
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

  useEffect(() => {
    return () => {
      if (document.fullscreenElement === playerShellRef.current && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
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
    if (sourceUrl) setError("");
  }, [sourceUrl]);

  useEffect(() => {
    setRetryCount(0);
  }, [quality, video?.id]);

  const togglePlayback = async () => {
    const element = videoRef.current;
    if (!element) return;

    if (element.paused) {
      try {
        await element.play();
        setPlaying(true);
      } catch {
        handlePlaybackError("Browser blocked playback. Tap play again or try another quality.");
      }
      return;
    }

    element.pause();
    setPlaying(false);
  };

  const seek = (value) => {
    const element = videoRef.current;
    if (!element) return;

    element.currentTime = Number(value);
    setCurrentTime(element.currentTime);
  };

  const toggleFullscreen = async () => {
    const shell = playerShellRef.current;
    const videoElement = videoRef.current;
    if (!shell) return;

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

      await enterBrowserFullscreen(shell, videoElement);
      setIsFullscreen(true);
      showFullscreenIndicator();
    } catch {
      if (videoElement?.webkitEnterFullscreen) {
        videoElement.webkitEnterFullscreen();
        showFullscreenIndicator();
        return;
      }
      setError("Fullscreen is not available in this browser.");
    }
  };

  const showFullscreenIndicator = () => {
    setFullscreenNotice(true);
    window.setTimeout(() => setFullscreenNotice(false), 900);
  };

  const handlePlaybackError = (message = "This video source could not be played.") => {
    reportPlaybackFailure(video?.id, token, message);

    if (retryCount < 1) {
      setRetryCount((value) => value + 1);
      setError("Playback had a problem. Retrying video...");
      return;
    }

    setError(`${message} Please try another quality or ask support to re-process this video.`);
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4 backdrop-blur-md"
      onContextMenu={(event) => event.preventDefault()}
    >
      <section
        ref={playerShellRef}
        className={`w-full overflow-hidden border border-white/10 bg-velvet shadow-glow transition-all duration-300 ${
          isFullscreen ? "flex h-screen max-w-none flex-col rounded-none" : "max-w-5xl rounded-lg"
        }`}
      >
        <div className={`items-center justify-between border-b border-white/10 px-4 py-3 ${isFullscreen ? "hidden" : "flex"}`}>
          <div>
            <p className="text-xs font-black uppercase text-champagne">Protected playback</p>
            <h2 className="text-lg font-black text-white">{video?.title}</h2>
          </div>
          <button
            className="grid h-10 w-10 place-items-center rounded-lg bg-white/10"
            onClick={onClose}
            type="button"
            aria-label="Close player"
          >
            <X size={18} />
          </button>
        </div>

        <div
          className={`relative bg-black ${isFullscreen ? "min-h-0 flex-1" : "aspect-video"}`}
          onDoubleClick={toggleFullscreen}
        >
          {!sourceUrl && !error ? (
            <div className="absolute inset-0 grid place-items-center text-stone-300">
              <Loader2 className="animate-spin" size={34} />
            </div>
          ) : null}

          {error ? (
            <div className="absolute inset-0 grid place-items-center p-6 text-center text-red-200">
              {error}
            </div>
          ) : null}

          {sourceUrl ? (
            <video
              ref={videoRef}
              className="h-full w-full"
              src={sourceUrl}
              playsInline
              preload="metadata"
              controls={false}
              controlsList="nodownload noplaybackrate noremoteplayback"
              disablePictureInPicture
              onContextMenu={(event) => event.preventDefault()}
              onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
              onError={() => handlePlaybackError("This video source could not be played.")}
              onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />
          ) : null}

          {fullscreenNotice ? (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="rounded-full border border-white/15 bg-black/65 px-5 py-3 text-sm font-black text-white shadow-glow backdrop-blur-xl">
                Fullscreen
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 border-t border-white/10 bg-black/70 p-3 backdrop-blur-xl sm:p-4">
          <div className="flex items-center gap-3">
            <button
              className="grid h-11 w-11 place-items-center rounded-lg bg-champagne text-black"
              onClick={togglePlayback}
              type="button"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause size={20} /> : <Play fill="currentColor" size={20} />}
            </button>

            <span className="w-24 text-sm text-stone-300">
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

          <div className="flex flex-wrap items-center gap-3 text-sm text-stone-300">
            <label className="flex items-center gap-2">
              Quality
              <select
                className="rounded-lg border border-white/10 bg-black px-3 py-2 text-white"
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
                className="rounded-lg border border-white/10 bg-black px-3 py-2 text-white"
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
              className="group relative grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/5 text-white transition hover:scale-105 hover:border-champagne/40 hover:bg-champagne/15 hover:text-champagne"
              onClick={toggleFullscreen}
              title="Fullscreen"
              type="button"
              aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              <span className="pointer-events-none absolute bottom-full mb-2 hidden rounded-md bg-black/85 px-2 py-1 text-xs font-bold text-white group-hover:block">
                Fullscreen
              </span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function enterBrowserFullscreen(element, videoElement) {
  if (element.requestFullscreen) return element.requestFullscreen();
  if (element.webkitRequestFullscreen) return element.webkitRequestFullscreen();
  if (element.mozRequestFullScreen) return element.mozRequestFullScreen();
  if (element.msRequestFullscreen) return element.msRequestFullscreen();
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
