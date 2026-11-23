// Firebase, the room code, host login and the few constants every page shares.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, get, ref, set, push, remove, onValue, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "./config.js";

export * from "./ui.js";
export * from "./modes/index.js";
export { get, ref, set, push, remove, onValue, runTransaction, signOut };

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);

export const $ = id => document.getElementById(id);

// ----- room: the code in the link, else the last one used, else "main" -----
export const cleanRoom = x => String(x || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 20);
export const room = cleanRoom(new URLSearchParams(location.search).get("room") || localStorage.getItem("room")) || "main";
localStorage.setItem("room", room);
export const R = path => ref(db, `rooms/${room}/${path}`);          // R("buzz") -> rooms/<room>/buzz
export const LIB = path => ref(db, `library/${path}`);              // LIB("boards") -> library/boards (host only)

// ----- timing shared by the big screen and the host -----
// The big screen counts 3-2-1 with COUNT_STEP between numbers; the host opens the buzzers when it ends.
export const COUNT_STEP = 1000;
export const BUZZ_DELAY = 3 * COUNT_STEP + 300;

// ----- host login (host.html and editor.html): fills #login, toggles #login / #app, calls onUser(user) once -----
export function hostLogin(onUser) {
  $("login").innerHTML = `<h2>Host login</h2><div class="row"><input id="em" type="email" placeholder="Email"></div><div class="row"><input id="pw" type="password" placeholder="Password"></div><button id="signin">Sign in</button><p id="lerr" class="small"></p>`;
  const go = () => signInWithEmailAndPassword(auth, $("em").value, $("pw").value).catch(e => $("lerr").textContent = "Sign-in failed: " + e.code);
  $("signin").onclick = go;
  $("pw").onkeydown = e => { if (e.key === "Enter") go(); };
  let started = false;
  onAuthStateChanged(auth, u => {
    if (!u && started) return location.reload();   // signed out: listeners lost their permission, start clean
    $("login").hidden = !!u; $("app").hidden = !u;
    if (u && !started) { started = true; onUser(u); }
  });
}
