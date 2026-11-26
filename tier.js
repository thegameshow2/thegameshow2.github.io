// Mode: Tier ladder. Tiers (Easy, Hard...) each hold levels; a level has several clues revealed one at a time.
// The reward shrinks with every extra clue (hint decay) unless "all at once" is on. Each tier has its own reward and penalty.
import { esc, arr, parseKey, gridKeys } from "../ui.js";

const newLevel = (type = "text") => ({ answer: "", items: [{ type, v: "" }] });
const namesOn = b => b.levelNames ?? b.categories.some(c => c.clues.some(q => q.name));
const worth = (clue, b) => clue.all ? clue.value : Math.round(clue.value * Math.max(0.1, 1 - (b.decay ?? 10) / 100 * ((clue.shown || 1) - 1)));
const penalty = clue => clue.penalty ?? clue.value;
const levelItems = (b, key) => { const [i, r] = parseKey(key); return arr(b.categories[i]?.clues[r]?.items).filter(x => x.v?.trim()); };

export default {
  id: "tier", label: "Tier challenge", tag: " (tier)", catLabel: "tier", entryLabel: "level",
  types: ["text", "image", "audio"],
  options: [
    { key: "decay", type: "number", min: 0, max: 90, label: "Points lost per extra clue (%)", def: b => b.decay ?? 10 },
    { key: "allAtOnce", type: "checkbox", label: "Show all clues at once", def: b => !!b.allAtOnce },
    { key: "levelNames", type: "checkbox", label: "Show level names instead of numbers", def: namesOn },
  ],

  // ----- data -----
  blank: () => ({ type: "tier", name: "New tier challenge", decay: 10, categories: [{ name: "Easy", points: 100, clues: [newLevel()] }] }),
  normalize: b => ({ ...b, categories: arr(b.categories).map(c => ({ ...c, clues: arr(c.clues).map(q => ({ ...q, items: arr(q.items) })) })) }),
  publicBoard: b => ({
    decay: b.decay ?? 10, levelNames: b.levelNames ?? null,
    categories: b.categories.map(c => ({ name: c.name, points: c.points ?? 0, penalty: c.penalty ?? c.points ?? 0, clues: c.clues.map(q => ({ name: q.name ?? "" })) })),
  }),
  tileKeys: gridKeys,

  // ----- host: picking, revealing hints, scoring -----
  pick(b, key) {
    const [i] = parseKey(key), c = b.categories[i], it = levelItems(b, key), n = b.allAtOnce ? it.length : Math.min(1, it.length);
    return { key, mode: "tier", cat: c.name, value: c.points ?? 0, penalty: c.penalty ?? c.points ?? 0, all: !!b.allAtOnce, shown: n, total: it.length, items: it.slice(0, n) };
  },
  canReveal: clue => !clue.all,
  reveal(clue, b) {
    const all = levelItems(b, clue.key); if (clue.shown >= all.length) return null;
    return { ...clue, shown: clue.shown + 1, items: all.slice(0, clue.shown + 1) };
  },
  worth, penalty,
  hostText: (clue, b) => `${clue.cat} · worth ${worth(clue, b)} · clue ${clue.shown}/${clue.total}\n` + arr(clue.items).filter(i => i.type === "text").map(i => i.v).join("\n"),

  // ----- display + board -----
  header(clue, b, counting) {
    const [ci, li] = parseKey(clue.key), name = namesOn(b) && b.categories[ci]?.clues[li]?.name;
    return { h1: esc(clue.cat), h2: `${esc(name || "Level " + (li + 1))} · <span class="gp">+${worth(clue, b)}</span> / <span class="rp">−${penalty(clue)}</span>${counting ? "" : ` · clue ${clue.shown}/${clue.total}`}` };
  },
  renderBoard(b, used, { host, lock }) {
    const cols = Math.max(1, ...b.categories.map(c => c.clues.length)), cap = namesOn(b), tag = host ? "button" : "div";
    const html = `<div class="ladder${cap ? " caps" : ""}${cols > 12 ? " dense" : ""}">` + b.categories.map((c, i) => {
      const pts = c.points ?? 0;
      const nodes = c.clues.map((q, r) => {
        const k = i + "-" + r, u = used[k];
        return `<${tag} class="node${u ? " used" : ""}"${host ? ` data-k="${k}"${u || lock ? " disabled" : ""}` : ""}>${u && !cap ? "✓" : cap && q.name ? esc(q.name) : r + 1}</${tag}>`;
      }).join("");
      return `<div class="rung"><div class="rt"><b>${esc(c.name)}</b><span><i class="gp">+${pts}</i> / <i class="rp">−${c.penalty ?? pts}</i></span></div><div class="rn">${nodes}</div></div>`;
    }).join("") + `</div>`;
    return { html, className: "tiers" };
  },

  // ----- editor -----
  newCategory: (n, type) => ({ name: "Tier " + (n + 1), points: (n + 1) * 100, clues: [newLevel(type)] }),
  newEntry: (cat, type) => newLevel(type),
  head: (c, i, { D, esc }) => `<textarea class="grow" ${D("name", i)} rows="2" placeholder="Tier name (Enter = new line)">${esc(c.name)}</textarea>`
    + `<label class="small">+</label><input type="number" class="num" ${D("points", i)} value="${c.points ?? 100}" title="Points for a correct answer">`
    + `<label class="small">−</label><input type="number" class="num" ${D("penalty", i)} value="${c.penalty ?? c.points ?? 100}" title="Points lost for a wrong answer">`,
  entry(q, i, j, { D, radios, adder, X, DL, HD, TG, mediaInput, folded, esc }) {
    const K = `c${i}.${j}`;
    if (folded.has(q)) return `<div class="lvl" ${DL(i, j)}><div class="row sum">${HD}${TG(K)}<b>Level ${j + 1}</b><span class="n">${esc(q.answer || "(no answer yet)")} · ${q.items.length} clue(s)</span>${X(`q${i}-${j}`)}</div></div>`;
    const items = q.items.map((it, k) => `<div class="clue-row">${radios(D("type", i, j, k), `t${i}-${j}-${k}`, it.type)}`
      + (it.type === "text" ? `<textarea class="grow" ${D("v", i, j, k)} rows="2" placeholder="Clue text (Enter = new line)">${esc(it.v)}</textarea>` : mediaInput(D("v", i, j, k), it.v, i, j, k))
      + X(`i${i}-${j}-${k}`) + `</div>`).join("");
    return `<div class="lvl" ${DL(i, j)}><div class="row">${HD}${TG(K)}<b>Level ${j + 1}</b>`
      + `<textarea class="grow" ${D("name", i, j)} rows="2" placeholder="Level name (optional, Enter = new line)">${esc(q.name || "")}</textarea>`
      + `<input class="grow" ${D("answer", i, j)} value="${esc(q.answer)}" placeholder="Answer (host only)">${X(`q${i}-${j}`, "Remove level")}</div>`
      + items + adder(`n${i}-${j}`, "+ Add clue") + `</div>`;
  },
  // buttons this mode adds to the editor: n = "+ Add clue" inside a level (o = {count, type} from the adder), i = remove one clue
  action(b, letter, n, o = { count: 1, type: "text" }) {
    const level = b.categories[n[0]]?.clues[n[1]];
    if (letter === "n") { for (let k = 0; k < o.count; k++) level.items.push({ type: o.type, v: "" }); return true; }
    if (letter === "i") { level.items.splice(n[2], 1); return true; }
    return false;
  },
};
