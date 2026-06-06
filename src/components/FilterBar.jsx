import { Search } from "lucide-react";
import React from "react";

export default function FilterBar({ categories, activeCategory, onCategory, query, onQuery }) {
  return (
    <section className="-mt-8 mb-8 grid gap-4 rounded-lg border border-white/10 bg-graphite/80 p-4 backdrop-blur-xl lg:grid-cols-[1fr_auto]">
      <label className="flex min-h-12 items-center gap-3 rounded-lg border border-white/10 bg-black/30 px-4 text-stone-400">
        <Search size={18} />
        <input
          className="w-full bg-transparent text-white outline-none placeholder:text-stone-500"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search videos, creators, categories"
          type="search"
        />
      </label>
      <div className="flex gap-2 overflow-x-auto">
        {categories.map((category) => (
          <button
            className={`min-h-12 flex-none rounded-lg px-4 text-sm font-bold transition ${
              activeCategory === category
                ? "bg-champagne text-black"
                : "border border-white/10 bg-white/5 text-stone-300"
            }`}
            key={category}
            onClick={() => onCategory(category)}
            type="button"
          >
            {category}
          </button>
        ))}
      </div>
    </section>
  );
}
