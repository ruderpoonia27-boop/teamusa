import React from "react";

export default function TrustRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/[0.06] p-4">
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-champagne/15 text-champagne">
        {React.cloneElement(icon, { size: 19 })}
      </span>
      <div>
        <p className="font-bold text-white">{label}</p>
        <p className="text-sm text-stone-400">{value}</p>
      </div>
    </div>
  );
}
