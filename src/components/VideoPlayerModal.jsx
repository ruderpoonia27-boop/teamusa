import React, { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pause, Play, X } from "lucide-react";
import { api } from "../lib/api.js";

export default function VideoPlayerModal({ video, token, onClose }) {
  const videoRef = useRef(null);
  const [playback, setPlayback] = useState(null);
  const [quality, setQuality] = useState("auto");
  const [speed, setSpeed] = useState("1");
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!video?.id) return;

    setPlayback(null);
    setError("");
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

  const sourceUrl = useMemo(() => {
    if (!playback?.streamUrl) return "";
    const url = new URL(playback.streamUrl);
    url.searchParams.set("quality", quality);
    return url.toString();
  }, [playback, quality]);

  const togglePlayback = async () => {
    const element = videoRef.current;
    if (!element) return;

    if (element.paused) {
      await element.play();
      setPlaying(true);
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

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4 backdrop-blur-md"
      onContextMenu={(event) => event.preventDefault()}
    >
      <section className="w-full max-w-5xl overflow-hidden rounded-lg border border-white/10 bg-velvet shadow-glow">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
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

        <div className="relative aspect-video bg-black">
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
              controls={false}
              controlsList="nodownload noplaybackrate noremoteplayback"
              disablePictureInPicture
              onContextMenu={(event) => event.preventDefault()}
              onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
              onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />
          ) : null}
        </div>

        <div className="grid gap-3 border-t border-white/10 bg-black/50 p-4">
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
          </div>
        </div>
      </section>
    </div>
  );
}

function formatTime(value) {
  if (!Number.isFinite(value)) return "0:00";

  const totalSeconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
