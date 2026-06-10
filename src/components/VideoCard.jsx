import { Eye, Lock, Play, UserRound } from "lucide-react";
import React, { memo, useState } from "react";
import { normalizeAssetUrl } from "../lib/api.js";

function VideoCard({ video, isPremium, onPlay }) {
  const isLocked = Boolean(video.locked || (!isPremium && video.premiumOnly !== false));
  const [imageFailed, setImageFailed] = useState(false);
  const thumbnailUrl = normalizeAssetUrl(video.thumbnailUrl || video.image || "");

  return (
    <article className="group overflow-hidden rounded-lg border border-white/10 bg-white/[0.06] transition hover:-translate-y-1 hover:border-champagne/40 hover:shadow-gold">
      <div className={`relative aspect-video overflow-hidden ${isLocked ? "locked-media" : "unlocked-media"}`}>
        {thumbnailUrl && !imageFailed ? (
          <img
            alt={video.title}
            className="h-full w-full object-cover transition duration-500"
            decoding="async"
            loading="lazy"
            src={thumbnailUrl}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-zinc-950 via-zinc-900 to-black" />
        )}
        {video.premiumOnly !== false ? <div className="absolute inset-0 bg-black/18" /> : null}
        <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-black text-champagne">
          Premium
        </div>
        {!isLocked && video.duration ? (
          <div className="absolute bottom-3 right-3 rounded-md bg-black/75 px-2 py-1 text-xs font-bold">
            {video.duration}
          </div>
        ) : null}
        {video.sourceMissing ? (
          <div className="absolute bottom-3 left-3 rounded-md bg-red-500/80 px-2 py-1 text-xs font-black text-white">
            Source missing
          </div>
        ) : null}

        {isLocked ? (
          <button
            className="absolute inset-0 grid place-items-center bg-black/28 text-left"
            onClick={() => onPlay(video)}
            type="button"
            aria-label={`Unlock ${video.title}`}
          >
            <div className="grid place-items-center gap-2 rounded-lg border border-champagne/30 bg-black/55 px-5 py-4 text-center shadow-gold backdrop-blur-xl transition group-hover:scale-[1.03]">
              <Lock className="text-champagne" size={30} />
              <span className="text-sm font-black uppercase text-white">Premium Locked</span>
            </div>
          </button>
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-black/10 opacity-0 transition group-hover:opacity-100">
            <button
              className="grid h-14 w-14 place-items-center rounded-full bg-white text-black"
              onClick={() => onPlay(video)}
              type="button"
              aria-label={`Play ${video.title}`}
            >
              <Play fill="currentColor" size={24} />
            </button>
          </div>
        )}
      </div>
      <div className="p-3 sm:p-4">
        <h3 className="min-h-[3.5rem] text-base font-black leading-7 text-white sm:text-lg">{video.title}</h3>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-400 sm:text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <UserRound size={15} />
            <span className="truncate">{video.creator || "TeamUSA"}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <Eye size={15} />
            {formatViews(video.views)}
          </span>
        </div>
      </div>
    </article>
  );
}

export default memo(VideoCard);

function formatViews(views = 0) {
  if (typeof views === "string") return views;
  if (views >= 1000) return `${Math.round(views / 1000)}K`;
  return String(views);
}
