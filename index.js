// Game-mode registry. The core (players, teams, scores, buzzers, timer, results, rooms) never asks WHICH mode is running:
// it only calls the hooks below. To add a mode: write modes/<name>.js, import it here, add it to MODES. Nothing else changes.
//
// A mode is one object with these members (the board's `type` field picks the mode; no type = "jeopardy"):
//   id, label, tag            "tier", "Tier challenge", " (tier)"  (tag is appended to the name in the editor's board list)
//   -- data -------------------------------------------------------------------------------------------------------
//   blank()                   a new board for the editor's "New <label>" button
//   normalize(board)          Firebase turns arrays into objects; return the board with real arrays again
//   publicBoard(board)        the part of a board the room may see (display + phones): NO answers
//   tileKeys(publicBoard)     every tile key, e.g. ["0-0","0-1",...]; the winner screen uses it to know when all are used
//   -- host: picking and scoring ----------------------------------------------------------------------------------
//   pick(board, key)          the clue object to publish to rooms/<room>/clue ({key, cat, value, items:[{type,v}], ...})
//   reveal(clue, board)       OPTIONAL: the clue with one more hint revealed (or null). Enables the host's "Next clue" button
//   canReveal(clue)           OPTIONAL: whether "Next clue" is offered for this clue
//   worth(clue, board)        points for a correct answer right now        penalty(clue)   points lost for a wrong one
//   answer(board, clue)       OPTIONAL: answer text for the host (default: board.categories[i].clues[j].answer)
//   hostText(clue, board)     the text of the "Current clue" card on the host panel
//   -- display + board drawing --------------------------------------------------------------------------------------
//   renderBoard(pub, used, {host, lock})   -> {html, className?, columns?}   same markup on the host panel and the big screen
//   header(clue, pub, counting)            -> {h1, h2}  HTML for the two title lines of the big-screen clue panel
//   -- editor -------------------------------------------------------------------------------------------------------
//   options                   board-level settings: [{key, label, type:"number"|"checkbox", min?, max?, def(board)}]
//   types                     the clue kinds the editor offers as radio buttons, e.g. ["text","image","audio"]
//   catLabel, entryLabel      "category"/"clue" ... used in "+ Add <label>" buttons
//   newCategory(n, type)      a new category/tier (n = how many exist; type = kind of its first clue)      newEntry(category, type)   a new clue/level of that kind
//   head(category, i, kit)    the inputs in a category's header row        entry(item, i, j, kit)   one clue/level (handles collapsed state)
//   action(board, letter, n, {count,type})  OPTIONAL: extra buttons the mode renders with kit.X / kit.adder(letter+indexes); return true if handled
// `kit` (built by the editor) holds the editor's markup helpers: D, types, radios, adder, X, DL, HD, TG, mediaInput, folded, esc.
import { setHtml, arr } from "../ui.js";
import jeopardy from "./jeopardy.js";
import tier from "./tier.js";

export const MODES = { jeopardy, tier };
export const modeOf = b => MODES[b?.type] || jeopardy;

// a mode that forgets a hook fails loudly in the console instead of half-working in the middle of a game
const REQUIRED = ["id", "label", "tag", "blank", "normalize", "publicBoard", "tileKeys", "pick", "worth", "penalty", "hostText", "renderBoard", "header", "options", "types", "catLabel", "entryLabel", "newCategory", "newEntry", "head", "entry"];
for (const m of Object.values(MODES)) { const miss = REQUIRED.filter(k => !(k in m)); if (miss.length) console.error(`Game mode "${m.id}" is missing: ${miss.join(", ")}`); }

// ----- the calls the rest of the app uses (all delegate to the board's mode) -----
export const norm = b => modeOf(b).normalize({ ...b, name: b.name || "Untitled" });
export const publicBoard = b => ({ ...modeOf(b).publicBoard(b), name: b.name, type: modeOf(b).id });
export const tileKeys = b => modeOf(b).tileKeys(b);
export const worth = (clue, b) => modeOf(b).worth(clue, b);
export const penaltyOf = (clue, b) => modeOf(b).penalty(clue);
export const answerOf = (b, clue) => {
  const m = modeOf(b); if (m.answer) return m.answer(b, clue);
  const [i, j] = String(clue.key).split("-").map(Number); return arr(b.categories[i]?.clues)[j]?.answer;
};
// draws the board into `el`; returns true if the markup changed
export function paintBoard(el, b, used, host = false, lock = false) {
  const v = modeOf(b).renderBoard(b, used, { host, lock });
  el.className = ("board " + (v.className || "")).trim();
  el.style.gridTemplateColumns = v.columns || "";
  return setHtml(el, v.html);
}
