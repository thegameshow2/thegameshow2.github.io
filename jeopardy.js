// Mode: Jeopardy board. Categories x point tiles; each clue is text, an image or an audio clip.
import { esc, arr, parseKey, gridKeys } from "../ui.js";

const newClue = (n, type = "text") => ({ value: n * 200, type, question: "", answer: "" });

export default {
  id: "jeopardy", label: "Jeopardy board", tag: "", catLabel: "category", entryLabel: "clue", options: [],
  types: ["text", "image", "audio"],   // the kinds of clue the editor offers (radio buttons)

  // ----- data -----
  blank: () => ({ type: "jeopardy", name: "New board", categories: [{ name: "Category 1", clues: [newClue(1)] }] }),
  normalize: b => ({ ...b, categories: arr(b.categories).map(c => ({ ...c, clues: arr(c.clues) })) }),
  publicBoard: b => ({ categories: b.categories.map(c => ({ name: c.name, clues: c.clues.map(q => ({ value: q.value ?? 0 })) })) }),
  tileKeys: gridKeys,

  // ----- host: picking and scoring -----
  pick(b, key) {
    const [i, r] = parseKey(key), c = b.categories[i], q = c.clues[r];
    const items = (q.type === "image" || q.type === "audio") && q.media?.trim() ? [{ type: q.type, v: q.media.trim() }] : [];
    return { key, mode: "jeopardy", cat: c.name, value: q.value ?? 0, question: q.question || "", items };
  },
  worth: clue => clue.value,
  penalty: clue => clue.penalty ?? clue.value,
  hostText: clue => `${clue.cat} · ${clue.value}\n${clue.question}`,

  // ----- display + board -----
  header: clue => ({ h1: esc(clue.cat), h2: `${clue.value}` }),
  renderBoard(b, used, { host, lock }) {
    const cats = b.categories, rows = Math.max(0, ...cats.map(c => c.clues.length)), tag = host ? "button" : "div";
    let html = cats.map(c => `<div class="cat">${esc(c.name)}</div>`).join("");
    for (let r = 0; r < rows; r++) cats.forEach((c, i) => {
      const q = c.clues[r], k = i + "-" + r, u = used[k];
      html += q ? `<${tag} class="tile${u ? " used" : ""}"${host ? ` data-k="${k}"${u || lock ? " disabled" : ""}` : ""}>${u ? "" : q.value}</${tag}>` : "<div></div>";
    });
    return { html, columns: `repeat(${cats.length || 1},1fr)` };
  },

  // ----- editor -----
  newCategory: (n, type) => ({ name: "Category " + (n + 1), clues: [newClue(1, type)] }),   // n = how many categories exist; type = type of its first clue
  newEntry: (cat, type) => newClue(cat.clues.length + 1, type),
  head: (c, i, { D, esc }) => `<input class="grow" ${D("name", i)} value="${esc(c.name)}" placeholder="Category name">`,
  entry(q, i, j, { D, radios, X, DL, HD, TG, mediaInput, folded, esc }) {
    const ty = q.type || "text";
    if (folded.has(q)) return `<div class="clue-row sum" ${DL(i, j)}>${HD}${TG(`c${i}.${j}`)}<b>${q.value}</b><span class="n">${esc((q.question || q.media || "(empty)").replace(/\n/g, " ").slice(0, 70))}${ty === "text" ? "" : " · " + ty}</span>${X(`q${i}-${j}`)}</div>`;
    return `<div class="clue-row" ${DL(i, j)}>${HD}${TG(`c${i}.${j}`)}<input type="number" class="num" ${D("value", i, j)} value="${q.value}">`
      + radios(D("type", i, j), `t${i}-${j}`, ty)
      + (ty === "text" ? "" : mediaInput(D("media", i, j), q.media, i, j))
      + `<textarea class="grow" ${D("question", i, j)} rows="2" placeholder="${ty === "text" ? "Clue shown to players (Enter = new line)" : "Optional text shown with it"}">${esc(q.question)}</textarea>`
      + `<input class="grow" ${D("answer", i, j)} value="${esc(q.answer)}" placeholder="Answer (host only)">${X(`q${i}-${j}`)}</div>`;
  },
};
