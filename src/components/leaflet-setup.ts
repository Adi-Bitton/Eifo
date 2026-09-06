import L from "leaflet";
import type { Venue } from "@/data/mockVenues";

// Fix default icon paths (not used directly, but avoids 404s).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function venueIcon(
  venue: Venue,
  selected = false,
  opts: { dark?: boolean; urgent?: boolean } = {},
) {
  const { dark = false, urgent = false } = opts;
  const size = selected ? 40 : 34;
  const hit = Math.max(44, size + 10);
  const fontSize = Math.round(size * 0.55);
  const ring = urgent
    ? "box-shadow:0 0 0 2px rgba(239,68,68,.9),0 4px 12px -4px rgba(239,68,68,.5);"
    : selected
      ? "box-shadow:0 0 0 2px rgba(236,72,153,.45),0 4px 10px -4px rgba(15,23,42,.25);"
      : "box-shadow:0 2px 6px -2px rgba(15,23,42,.18);";

  const bg = dark ? "#27272a" : "#ffffff";
  const fg = dark ? "#f4f4f5" : "#0f172a";
  const border = dark ? "1px solid #52525b" : "1px solid rgba(15,23,42,.08)";

  const html = `
    <div style="width:${hit}px;height:${hit}px;display:grid;place-items:center;">
      <div class="${urgent ? "eifo-pin-urgent" : ""}" style="
        width:${size}px;height:${size}px;
        display:grid;place-items:center;
        background:${bg};
        color:${fg};
        border-radius:9999px;
        ${ring}
        border:${border};
        font-size:${fontSize}px;line-height:1;
        transform:${selected ? "scale(1.04)" : "scale(1)"};
        transition:transform .15s ease;
      ">${escapeHtml(venue.emoji)}</div>
    </div>
  `;
  return L.divIcon({
    html,
    className: "eifo-pin",
    iconSize: [hit, hit],
    iconAnchor: [hit / 2, hit / 2],
  });
}


export function clusterIcon(cluster: { getChildCount: () => number }) {
  const count = cluster.getChildCount();
  const size = count < 10 ? 38 : count < 50 ? 46 : 54;
  const html = `
    <div style="
      width:${size}px;height:${size}px;
      display:grid;place-items:center;
      border-radius:9999px;
      background:linear-gradient(135deg,#ff4d8d 0%,#ff6b6b 55%,#ff8a3d 100%);
      color:#ffffff;font-weight:800;font-size:${Math.round(size * 0.42)}px;
      line-height:1;letter-spacing:-0.3px;
      box-shadow:0 6px 18px -6px rgba(255,107,107,.5),0 2px 4px -2px rgba(15,23,42,.2);
      border:1.5px solid #ffffff;
      font-family:'Rubik',system-ui,sans-serif;
    ">${count}</div>
  `;
  return L.divIcon({
    html,
    className: "eifo-cluster",
    iconSize: [size, size],
  });
}
