import React from "react";
import VideoCard from "./VideoCard.jsx";
import { defaultSections } from "../data/catalog.js";

export default function VideoSections({ videos, sections = defaultSections, isPremium, onPlay }) {
  return (
    <div className="space-y-10 sm:space-y-12">
      {sections.map((section) => {
        const items = videos.filter((video) => video.section === section);
        if (!items.length) return null;

        return (
          <section id={section.toLowerCase().split(" ")[0]} key={section}>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-black uppercase text-amethyst">Premium picks</span>
                <h2 className="truncate text-2xl font-black text-white sm:text-3xl">{section}</h2>
              </div>
              <span className="shrink-0 text-sm text-stone-400">{items.length} videos</span>
            </div>
            <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {items.map((video) => (
                <VideoCard
                  key={video._id || video.id}
                  video={video}
                  isPremium={isPremium}
                  onPlay={onPlay}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
