import React from "react";
import VideoCard from "./VideoCard.jsx";

export default function VideoSections({ videos, activeCategory = "All", isPremium, loading = false, onPlay }) {
  if (loading && !videos.length) {
    return (
      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="h-3 w-28 animate-pulse rounded-full bg-white/10" />
            <div className="mt-3 h-8 w-44 animate-pulse rounded-lg bg-white/10" />
          </div>
          <div className="h-4 w-16 animate-pulse rounded-full bg-white/10" />
        </div>
        <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <VideoCardSkeleton key={index} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="transition duration-300 ease-out">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <span className="text-xs font-black uppercase text-amethyst">Premium library</span>
          <h2 className="truncate text-2xl font-black text-white sm:text-3xl">
            {activeCategory === "All" ? "All Videos" : activeCategory}
          </h2>
        </div>
        <span className="w-fit shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-bold text-stone-300">
          {videos.length} {videos.length === 1 ? "video" : "videos"}
        </span>
      </div>

      {videos.length ? (
        <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {videos.map((video) => (
            <VideoCard
              key={video._id || video.id}
              video={video}
              isPremium={isPremium}
              onPlay={onPlay}
            />
          ))}
        </div>
      ) : (
        <div className="grid min-h-52 place-items-center rounded-lg border border-white/10 bg-white/[0.04] p-6 text-center">
          <div>
            <h3 className="text-xl font-black text-white">No videos found</h3>
            <p className="mt-2 text-sm text-stone-400">Try another category or search term.</p>
          </div>
        </div>
      )}
    </section>
  );
}

function VideoCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.06]">
      <div className="aspect-video animate-pulse bg-white/10" />
      <div className="grid gap-3 p-3 sm:p-4">
        <div className="h-5 w-11/12 animate-pulse rounded bg-white/10" />
        <div className="h-5 w-2/3 animate-pulse rounded bg-white/10" />
        <div className="flex items-center justify-between gap-3">
          <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
          <div className="h-4 w-14 animate-pulse rounded bg-white/10" />
        </div>
      </div>
    </article>
  );
}
