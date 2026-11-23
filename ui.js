// Pure helpers shared by every page: no Firebase, no page state. Safe to import anywhere.

export const TEAM_COLORS = ["#22d3ee", "#f472b6", "#fbbf24", "#4ade80", "#a78bfa", "#fb923c", "#f87171", "#60a5fa"];

// ----- data helpers -----
export const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export const arr = x => Object.values(x || {});                       // Firebase turns arrays into objects; this undoes it
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const parseKey = k => String(k).split("-").map(Number);        // "2-3" -> [2, 3]  (category/tier index, clue/level index)
export const byNum = (a, b) => a[1].num - b[1].num;                   // sort helper for Object.entries(players)
export const byScore = (a, b) => b[1].score - a[1].score || a[1].num - b[1].num;
export const nextNum = players => Math.max(0, ...Object.values(players).map(p => p.num)) + 1;

// all tile keys of a board made of categories x clues, e.g. ["0-0","0-1","1-0"]
export const gridKeys = b => b.categories.flatMap((c, i) => arr(c.clues).map((_, r) => i + "-" + r));

// ----- DOM helpers -----
// innerHTML only when the markup actually changed: no flicker, no lost audio/scroll state, cheap re-renders.
// Returns true when it changed.
export function setHtml(el, html) {
  if (el._html === html) return false;
  el._html = html; el.innerHTML = html; return true;
}
export const dot = (teams, p) => { const t = teams?.[p?.team]; return t ? `<i class="dot" style="background:${esc(t.color)}"></i>` : ""; };

// ----- audio player (custom round play button) -----
export const audioHtml = (src, sm) => `<div class="aud${sm ? " sm" : ""}"><button class="pl" aria-label="Play"><svg viewBox="0 0 24 24"><path class="ip" d="M8 5v14l11-7z"/><path class="ia" d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg></button><audio src="${esc(src)}" preload="auto"></audio></div>`;
export function bindAudio(root) {
  root.addEventListener("click", e => {
    const b = e.target.closest(".pl"); if (!b) return;
    const a = b.parentElement.querySelector("audio");
    if (a.paused) { root.querySelectorAll("audio").forEach(x => x !== a && x.pause()); a.play().catch(() => {}); } else a.pause();
  });
  const mark = (e, on) => e.target.closest?.(".aud")?.classList.toggle("playing", on);
  for (const ev of ["play", "pause", "ended"]) root.addEventListener(ev, e => mark(e, ev === "play"), true);
}
