// Teatime for Android. All data lives on the phone (Capacitor Preferences).
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { App } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Share } from "@capacitor/share";
import { Camera } from "@capacitor/camera";
import STARTER from "./recipes.json";

const AISLES = ["Fruit & veg","Meat & fish","Dairy & eggs","Bakery","Chilled","Frozen","Tins & jars","Pasta, rice & grains","World foods","Herbs & spices","Store cupboard","Household","Other"];
const APPLIANCES = ["Hob","Oven","Air fryer","Slow cooker","Microwave"];
const TAGS = ["vegetarian","vegan","gluten-free","dairy-free","fish","pork","high-protein"];
const STYLES = ["Quick","Comfort","Fakeaway","Light"];
const MEALS = ["breakfast","lunch","dinner","snack"];
const MEAL_LABEL = {breakfast:"Breakfast",lunch:"Lunch",dinner:"Dinner",snack:"Snack"};
const MEAL_REPEAT = {breakfast:3,lunch:2,dinner:1,snack:3};
const UNITS = ["g","ml","whole","tbsp","tsp","clove","tin","bunch","slice"];
const DIETS = [["vegetarian","Vegetarian"],["vegan","Vegan"],["pescatarian","Pescatarian"],["gluten-free","Gluten-free"],["dairy-free","Dairy-free"],["no-pork","No pork"]];
const DAYN = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const DAYLONG = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const DEFAULT_PANTRY = ["olive-oil","soy-sauce","honey","dried-oregano","ground-cumin","chilli-powder","smoked-paprika","curry-powder","fajita-seasoning","sesame-seeds","vegetable-stock-cube","beef-stock-cube","chicken-stock-cube","worcestershire-sauce"];
const DEFAULT_SETTINGS = {budget:80,serves:2,diet:[],appliances:["Hob","Oven","Air fryer","Microwave"],styles:[],avoidRepeat:true,
  kcal:1800,protein:120,meals:["breakfast","lunch","dinner","snack"],clubcard:true,freshDays:3,pantry:DEFAULT_PANTRY,priceSource:"auto"};
const MODEL_SMART = "claude-sonnet-5-5";
const MODEL_FAST = "claude-haiku-4-5-20251001";
const TESCO_SEARCH = "https://www.tesco.com/groceries/en-GB/search?query=";
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36";
const NATIVE = Capacitor.isNativePlatform();

const $ = s => document.querySelector(s);
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); for (const [k,v] of Object.entries(props)) { if (k === "class") e.className = v; else if (k === "text") e.textContent = v; else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? "" : v); } for (const k of kids.flat()) if (k != null && k !== false) e.append(k); return e; };
const gbp = n => "£" + (Math.round(n * 100) / 100).toFixed(2);
const fmtN = n => Math.round(n).toLocaleString("en-GB");
const slug = s => String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60) || "x";
const ingKey = (name, unit) => slug(name) + "--" + (unit||"whole");
const mealOf = r => MEALS.includes(r.meal) ? r.meal : "dinner";
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- storage (on the phone) ----------
const KV = {
  async get(key){ try { const { value } = await Preferences.get({ key }); return value ? JSON.parse(value) : null; } catch { return null; } },
  async set(key, val){ await Preferences.set({ key, value: JSON.stringify(val) }); },
  async remove(key){ await Preferences.remove({ key }); },
  async keys(){ try { return (await Preferences.keys()).keys; } catch { return []; } }
};
const timers = new Map();
function save(key, getVal){
  clearTimeout(timers.get(key));
  timers.set(key, setTimeout(async () => { timers.delete(key); try { await KV.set(key, getVal()); } catch { toast("Couldn't save. Your phone may be low on storage."); } }, 300));
}
async function flushAll(){ /* write anything pending straight away, e.g. when the app is backgrounded */
  const pending = [...timers.keys()]; for (const k of pending){ clearTimeout(timers.get(k)); timers.delete(k); }
  await Promise.all(pending.map(k => KV.set(k, SAVERS[k]?.())).filter(Boolean));
}
const SAVERS = {};
function persist(key, getVal){ SAVERS[key] = getVal; save(key, getVal); }

// ---------- state ----------
const S = {
  settings:{...DEFAULT_SETTINGS}, keys:{anthropic:"", firecrawl:""},
  recipes:new Map(), prices:new Map(), logs:{},
  week:null, plan:emptyPlan(), list:{checked:{},extras:[]},
  day:0, tab:"plan", filter:"all", mealFilter:"all", query:"",
  loaded:false, job:null, priceError:null, directBlocked:false
};
function emptyDay(){ return {breakfast:null,lunch:null,dinner:null,snack:null}; }
function emptyPlan(){ return {days:[0,1,2,3,4,5,6].map(emptyDay)}; }

const planKey = () => "plan:" + S.week, listKey = () => "list:" + S.week;
const savePlan = () => { const k = planKey(), p = S.plan; persist(k, () => p); renderAll(); };
const saveList = () => { const k = listKey(), l = S.list; persist(k, () => l); renderShop(); renderSummary(); renderBadge(); };
const saveSettings = () => { persist("settings", () => S.settings); renderAll(); };
const saveRecipes = () => persist("recipes", () => [...S.recipes.values()]);
const savePrices = () => persist("prices", () => Object.fromEntries(S.prices));

// ---------- dates ----------
function mondayOf(d){ const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate()-((x.getDay()+6)%7)); return x; }
function iso(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function fromIso(s){ const [y,m,d] = s.split("-").map(Number); return new Date(y,m-1,d); }
function addDays(d,n){ const x = new Date(d); x.setDate(x.getDate()+n); return x; }
(function initWeek(){ const now = new Date(); let m = mondayOf(now); if (now.getDay() === 0 && now.getHours() >= 12) m = addDays(m,7); S.week = iso(m); S.day = Math.max(0, Math.min(6, Math.round((new Date(now.getFullYear(),now.getMonth(),now.getDate()) - m)/864e5))); })();

// ---------- prices & costs ----------
const isPantry = name => (S.settings.pantry||[]).includes(slug(name));
const liveP = (name, unit) => { const p = S.prices.get(ingKey(name, unit)); return p && p.found && p.unitsPerPack > 0 && p.price > 0 ? p : null; };
const packPrice = p => (S.settings.clubcard && p.clubcardPrice > 0) ? p.clubcardPrice : p.price;
function unitCost(ig){ const p = liveP(ig.name, ig.unit); if (p) return packPrice(p) / p.unitsPerPack; const q = +ig.qty || 0; return q ? (+ig.cost || 0) / q : 0; }
const scale = r => (S.settings.serves || 2) / (r.serves || 2);
function recipeCost(r, covers = 1, skipPantry = false){ let t = 0; for (const ig of r.ingredients||[]) { if (skipPantry && isPantry(ig.name)) continue; t += unitCost(ig) * (+ig.qty||0); } return t * scale(r) * covers; }
const perServing = r => recipeCost(r,1) / (S.settings.serves||2);
const recipeLive = r => (r.ingredients||[]).every(ig => isPantry(ig.name) || liveP(ig.name, ig.unit));
const fresh = p => p && p.checkedAt && (Date.now() - Date.parse(p.checkedAt)) < (S.settings.freshDays||3) * 864e5;

function fits(r){
  const st = S.settings, t = new Set(r.tags||[]);
  for (const d of st.diet){
    if (d === "vegetarian" && !t.has("vegetarian")) return false;
    if (d === "vegan" && !t.has("vegan")) return false;
    if (d === "pescatarian" && !(t.has("vegetarian") || t.has("fish"))) return false;
    if (d === "gluten-free" && !t.has("gluten-free")) return false;
    if (d === "dairy-free" && !t.has("dairy-free")) return false;
    if (d === "no-pork" && t.has("pork")) return false;
  }
  for (const a of r.appliances||[]) if (!st.appliances.includes(a)) return false;
  if (mealOf(r) === "dinner" && st.styles.length && !st.styles.includes(r.style)) return false;
  return true;
}
function fmtQty(q, unit){
  const n = Math.round(q*100)/100;
  if (unit === "g" && n >= 1000) return (Math.round(n/100)/10)+" kg";
  if (unit === "ml" && n >= 1000) return (Math.round(n/100)/10)+" l";
  if (unit === "g" || unit === "ml") return Math.round(n)+" "+unit;
  const nice = Number.isInteger(n) ? n : (Math.abs(n*2-Math.round(n*2))<0.05 ? Math.round(n*2)/2 : Math.round(n*10)/10);
  const shown = String(nice).replace(/\.5$/,"½").replace(/^0½$/,"½");
  if (unit === "whole" || !unit) return shown;
  const plural = nice > 1 && ["tin","clove","bunch","slice"].includes(unit) ? (unit==="bunch"?"bunches":unit+"s") : unit;
  return shown+" "+plural;
}
const roundUp = (q, unit) => ["whole","tin","bunch","clove","slice"].includes(unit) ? Math.ceil(q - 0.01) : q;

// ---------- plan ops ----------
const slot = (i,m) => S.plan.days[i][m];
const setS = (i,m,v) => { S.plan.days[i][m] = v; };
function ownerIndex(m, i){ for (let j=i; j>=0; j--){ const s = slot(j,m); if (s && s.recipeId) return (j + (s.covers||1) - 1 >= i) ? j : -1; if (!s || !s.leftover) return -1; } return -1; }
function normalise(){
  for (const m of MEALS){
    for (let i=0;i<7;i++){ const s = slot(i,m); if (s && s.leftover && ownerIndex(m,i) < 0) setS(i,m,null); }
    for (let i=0;i<7;i++){ const s = slot(i,m); if (s && s.recipeId){ const c = Math.min(s.covers||1, 7-i); s.covers = c; for (let k=1;k<c;k++) setS(i+k,m,{leftover:true}); } }
  }
}
function setSlot(i, m, recipeId){ const prev = slot(i,m); setS(i,m,{recipeId, covers:(prev&&prev.covers)||1, locked:!!(prev&&prev.locked)}); normalise(); savePlan(); }
function setCovers(i, m, c){
  const s = slot(i,m); if (!s) return;
  for (let k=1;k<(s.covers||1) && i+k<7;k++) if (slot(i+k,m) && slot(i+k,m).leftover) setS(i+k,m,null);
  s.covers = c; for (let k=1;k<c && i+k<7;k++) setS(i+k,m,{leftover:true});
  normalise(); savePlan();
}
function dropSlot(i, m){ const s = slot(i,m); if (s && s.recipeId) for (let k=1;k<(s.covers||1) && i+k<7;k++) if (slot(i+k,m) && slot(i+k,m).leftover) setS(i+k,m,null); setS(i,m,null); }
function clearSlot(i, m){ dropSlot(i,m); savePlan(); }
function recipeAt(i, m){ const s = slot(i,m); if (!s) return null; if (s.recipeId) return S.recipes.get(s.recipeId) || null; if (s.leftover){ const o = ownerIndex(m,i); return o>=0 ? S.recipes.get(slot(o,m).recipeId) || null : null; } return null; }
function dayTotals(i){ let kcal=0, protein=0, n=0; for (const m of MEALS){ const r = recipeAt(i,m); if (r){ kcal += r.macros?.kcal||0; protein += r.macros?.protein||0; n++; } } return {kcal, protein, n}; }
function planCost(skipPantry = true){ let t = 0; for (let i=0;i<7;i++) for (const m of MEALS){ const s = slot(i,m); if (s && s.recipeId){ const r = S.recipes.get(s.recipeId); if (r) t += recipeCost(r, s.covers||1, skipPantry); } } return t; }
function dayScore(k, p, cost, cw){
  const T = S.settings.kcal || 1800, P = S.settings.protein || 100;
  const kErr = Math.abs(k - T) / T, pShort = Math.max(0, P - p) / P;
  return 4*Math.max(0, kErr - 0.03) + 5*pShort + cw * cost / Math.max(1, (S.settings.budget||80)/7);
}
const pick = a => a[Math.floor(Math.random()*a.length)];
function pools(){ const p = {}; for (const m of MEALS) p[m] = [...S.recipes.values()].filter(r => mealOf(r)===m && fits(r)); return p; }
async function lastWeekDinners(){
  const ids = new Set(); if (!S.settings.avoidRepeat) return ids;
  const d = migrate(await KV.get("plan:" + iso(addDays(fromIso(S.week), -7))));
  for (const day of d.days) if (day.dinner && day.dinner.recipeId) ids.add(day.dinner.recipeId);
  return ids;
}

async function autoFill(replan, cheaper = false){
  const enabled = MEALS.filter(m => S.settings.meals.includes(m));
  const P = pools();
  const missing = enabled.filter(m => !P[m].length);
  if (enabled.every(m => !P[m].length)){ toast("No recipes match your settings. Loosen a filter or add a recipe."); return; }
  const lastWeek = await lastWeekDinners();
  if (replan) for (let i=0;i<7;i++) for (const m of enabled){ const s = slot(i,m); if (s && ((s.recipeId && !s.locked) || (s.off && s.auto))) dropSlot(i,m); }
  normalise();
  const open = []; for (let i=0;i<7;i++) for (const m of enabled) if (slot(i,m) === null && P[m].length) open.push([i,m]);
  if (!open.length){ toast("Every meal is already planned."); return; }
  const snapshot = JSON.stringify(S.plan);
  const weights = cheaper ? [1.5, 4, 10] : [0.15, 0.6, 2, 6];
  let best = null;
  for (const cw of weights){
    S.plan = JSON.parse(snapshot);
    const used = {}; for (const m of MEALS) used[m] = {};
    for (let i=0;i<7;i++) for (const m of MEALS){ const s = slot(i,m); if (s && s.recipeId) used[m][s.recipeId] = (used[m][s.recipeId]||0)+1; }
    for (let i=0;i<7;i++){
      const openM = enabled.filter(m => slot(i,m) === null && P[m].length);
      if (!openM.length) continue;
      const base = dayTotals(i);
      let bestCombo = null, bestScore = Infinity;
      for (let t=0;t<160;t++){
        const combo = {}; let k = base.kcal, p = base.protein, cost = 0, pen = 0;
        for (const m of openM){
          if (m === "snack" && Math.random() < 0.2){ combo[m] = null; continue; }
          const cand = P[m].filter(r => (used[m][r.id]||0) < MEAL_REPEAT[m]);
          const pool = cand.length ? cand : P[m];
          const favs = pool.filter(x => x.fav);
          const r = favs.length && Math.random() < 0.25 ? pick(favs) : pick(pool);
          combo[m] = r; k += r.macros?.kcal||0; p += r.macros?.protein||0; cost += recipeCost(r,1,true);
          if (m === "dinner" && lastWeek.has(r.id)) pen += 0.4;
          if (!cand.length) pen += 1;
        }
        const sc = dayScore(k, p, cost, cw) + pen;
        if (sc < bestScore){ bestScore = sc; bestCombo = combo; }
      }
      for (const m of openM){ const r = bestCombo[m]; if (r){ setS(i,m,{recipeId:r.id, covers:1, locked:false}); used[m][r.id] = (used[m][r.id]||0)+1; } else setS(i,m,{off:true, auto:true}); }
    }
    best = S.plan;
    if (planCost() <= S.settings.budget) break;
  }
  S.plan = best; normalise(); savePlan();
  const total = planCost();
  const note = missing.length ? ` No ${missing.map(m=>MEAL_LABEL[m].toLowerCase()).join(" or ")} recipes match your settings yet.` : "";
  toast((total > S.settings.budget ? `Planned, about ${gbp(total - S.settings.budget)} over budget.` : `Planned ${open.length} meals.`) + note);
  if (S.keys.anthropic) checkPrices(false, true);
}
function swap(i, m){
  const s = slot(i,m); if (!s || !s.recipeId) return;
  const usedIds = new Set(); for (let j=0;j<7;j++){ const x = slot(j,m); if (x && x.recipeId) usedIds.add(x.recipeId); }
  const pool = [...S.recipes.values()].filter(r => mealOf(r)===m && fits(r) && r.id !== s.recipeId && (m !== "dinner" || !usedIds.has(r.id)));
  if (!pool.length){ toast("No other matching recipes to swap in."); return; }
  const cur = S.recipes.get(s.recipeId), base = dayTotals(i);
  const bk = base.kcal - (cur?.macros?.kcal||0), bp = base.protein - (cur?.macros?.protein||0);
  const ranked = pool.map(r => ({r, sc: dayScore(bk + (r.macros?.kcal||0), bp + (r.macros?.protein||0), recipeCost(r,1,true), 0.4) + Math.random()*0.15})).sort((a,b)=>a.sc-b.sc);
  s.recipeId = pick(ranked.slice(0, Math.min(4, ranked.length))).r.id; savePlan();
}

// ---------- shopping ----------
function shoppingItems(){
  const map = new Map();
  for (let i=0;i<7;i++) for (const m of MEALS){
    const s = slot(i,m); if (!s || !s.recipeId) continue; const r = S.recipes.get(s.recipeId); if (!r) continue;
    const f = scale(r) * (s.covers||1);
    for (const ig of r.ingredients||[]){
      const unit = UNITS.includes(ig.unit) ? ig.unit : "whole";
      const key = ingKey(ig.name, unit);
      const it = map.get(key) || {key, name:ig.name, unit, aisle: AISLES.includes(ig.aisle) ? ig.aisle : "Other", need:0, est:0, for:new Set()};
      it.need += (+ig.qty||0) * f; it.est += (+ig.cost||0) * f; it.for.add(r.name); map.set(key, it);
    }
  }
  const out = [];
  for (const it of map.values()){
    it.pantry = isPantry(it.name);
    const p = liveP(it.name, it.unit);
    if (p){ it.live = p; it.packs = Math.max(1, Math.ceil(it.need / p.unitsPerPack - 0.02)); it.till = it.packs * packPrice(p); }
    else it.till = it.est;
    out.push(it);
  }
  for (const x of S.list.extras||[]) out.push({key:"x:"+x.id, name:x.name, unit:"", aisle:"Other", need:0, till:0, for:new Set(), extra:x.id});
  return out;
}
function shopTotals(){
  const items = shoppingItems().filter(i => !i.pantry && !i.extra);
  const total = items.reduce((a,i)=>a+i.till,0), live = items.filter(i=>i.live).length;
  const checked = items.filter(i=>i.live).map(i=>Date.parse(i.live.checkedAt)).filter(Boolean);
  return {total, live, count: items.length, oldest: checked.length ? new Date(Math.min(...checked)) : null};
}
function renderBadge(){ const checked = S.list.checked||{}; const left = shoppingItems().filter(i => !i.pantry && !checked[i.key]).length; const c = $("#shopCount"); c.hidden = !left; c.textContent = left; }
function renderShop(){
  const items = shoppingItems(), box = $("#aisles"); box.textContent = "";
  const checked = S.list.checked || {};
  const t = shopTotals();
  const buy = items.filter(i => !i.pantry);
  const left = buy.filter(i => !checked[i.key]).length;
  $("#shopTotal").textContent = gbp(t.total);
  $("#shopNote").textContent = !t.count ? "Plan some meals to build your list." : t.live === t.count ? `Tesco prices${S.settings.clubcard?" with Clubcard":""}, whole packs.` : t.live ? `${t.live} of ${t.count} at live Tesco prices.` : "Estimated.";
  $("#shopLeft").textContent = left;
  renderBadge();
  if (!items.length){ box.append(el("div",{class:"empty-state"}, el("b",{text:"No shopping yet"}), el("span",{text:"Plan some meals and everything you need appears here, grouped by aisle."}))); return; }
  for (const a of AISLES){
    const group = buy.filter(i => i.aisle === a).sort((x,y)=> (!!checked[x.key]-!!checked[y.key]) || x.name.localeCompare(y.name));
    if (!group.length) continue;
    const sec = el("div",{class:"aisle"}, el("h3",{}, el("span",{text:a}), el("span",{class:"mono muted",style:"letter-spacing:0;text-transform:none;font-weight:500",text:gbp(group.reduce((s,i)=>s+i.till,0))})));
    for (const it of group){
      const id = "chk-"+it.key.replace(/[^a-z0-9]/gi,"_");
      const q = it.extra ? "" : fmtQty(roundUp(it.need,it.unit), it.unit);
      const right = it.extra
        ? el("div",{class:"right"}, el("button",{class:"btn sm ghost",text:"Remove","aria-label":"Remove "+it.name,onclick:()=>{ S.list.extras = S.list.extras.filter(x=>x.id!==it.extra); saveList(); }}))
        : el("div",{class:"right"}, el("span",{class:it.live?"price":"price est"}, gbp(it.till)), el("button",{class:"btn sm ghost",text:"Have it",onclick:()=>togglePantry(it.name,true)}));
      const pack = it.live
        ? el("span",{class:"pack"}, el("span",{class:"src live",text:"Tesco"}), " ", `${it.packs} × ${it.live.product}`, it.live.packLabel && !String(it.live.product).toLowerCase().includes(String(it.live.packLabel).toLowerCase()) ? ` (${it.live.packLabel})` : "", S.settings.clubcard && it.live.clubcardPrice > 0 && it.live.clubcardPrice < it.live.price ? el("span",{class:"muted",text:` · Clubcard, was ${gbp(it.live.price)}`}) : null)
        : (it.extra ? null : el("span",{class:"pack muted"}, el("span",{class:"src est",text:"Estimate"}), " ", el("a",{href:TESCO_SEARCH + encodeURIComponent(searchTerm(it.name)),target:"_blank",rel:"noopener",text:"Find on Tesco"})));
      sec.append(el("div",{class:"item"+(checked[it.key]?" done":"")},
        el("input",{type:"checkbox",id,checked:!!checked[it.key],onchange:e=>{ S.list.checked = {...(S.list.checked||{})}; if (e.target.checked) S.list.checked[it.key]=true; else delete S.list.checked[it.key]; saveList(); }}),
        el("label",{for:id}, el("span",{}, q ? el("span",{class:"qty",text:q}) : null, it.name), pack, it.for.size ? el("span",{class:"for",text:"For "+[...it.for].join(", ")}) : null),
        right));
    }
    box.append(sec);
  }
  const pantryItems = items.filter(i => i.pantry);
  if (pantryItems.length){
    box.append(el("details",{class:"pantry"}, el("summary",{text:`Already in your cupboard (${pantryItems.length}), not counted`}),
      el("p",{class:"muted small",style:"margin:8px 0 0",text:"Tap one if you've run out and need to buy it this week."}),
      el("div",{class:"pantry-list"}, pantryItems.map(i => el("button",{text:i.name,onclick:()=>togglePantry(i.name,false)})))));
  }
}
function togglePantry(name, add){ const s = new Set(S.settings.pantry||[]); add ? s.add(slug(name)) : s.delete(slug(name)); S.settings = {...S.settings, pantry:[...s]}; saveSettings(); toast(add ? name+" moved to your cupboard." : name+" added back to your list."); }
function listText(){
  const items = shoppingItems().filter(i=>!i.pantry), checked = S.list.checked||{}, out = ["Teatime shopping, week of " + fromIso(S.week).toLocaleDateString("en-GB",{day:"numeric",month:"short"})];
  for (const a of AISLES){ const g = items.filter(i=>i.aisle===a && !checked[i.key]); if (!g.length) continue; out.push("", a.toUpperCase()); g.forEach(i => out.push("- " + (i.extra ? i.name : i.live ? `${i.packs} × ${i.live.product} (${gbp(i.till)})` : fmtQty(roundUp(i.need,i.unit), i.unit) + " " + i.name))); }
  out.push("", "Total: " + gbp(shopTotals().total));
  return out.join("\n");
}

// ---------- Claude (Anthropic API, called from the phone) ----------
class AppError extends Error { constructor(code, message){ super(message || code); this.code = code; } }
async function claude(prompt, { model = MODEL_SMART, images = [], maxTokens = 4000 } = {}){
  const key = (S.keys.anthropic||"").trim();
  if (!key) throw new AppError("no_key", "Add your Anthropic API key in Settings to use Claude.");
  const content = [...images.map(img => ({type:"image", source:{type:"base64", media_type:img.type, data:img.b64}})), {type:"text", text:prompt}];
  let res, j;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", { method:"POST",
      headers:{"content-type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
      body: JSON.stringify({ model, max_tokens:maxTokens, messages:[{role:"user", content}] }) });
    j = await res.json().catch(() => null);
  } catch { throw new AppError("offline", "Couldn't reach Claude. Check your internet connection."); }
  if (!res.ok){
    const msg = j?.error?.message || ("HTTP " + res.status);
    if (res.status === 401) throw new AppError("bad_key", "Claude didn't accept that API key. Check it in Settings.");
    if (res.status === 402 || /credit balance/i.test(msg)) throw new AppError("no_credit", "Your Anthropic account is out of credit. Top up at console.anthropic.com.");
    if (res.status === 429) throw new AppError("rate_limited", "Claude is rate-limiting this key. Wait a minute and try again.");
    if (res.status === 404 && /model/i.test(msg)) throw new AppError("model", "Your API key can't use " + model + ".");
    if (res.status >= 500) throw new AppError("overloaded", "Claude is busy right now. Try again in a minute.");
    throw new AppError("api_error", "Claude returned an error: " + msg.slice(0,160));
  }
  return (j.content||[]).filter(b => b.type === "text").map(b => b.text).join("");
}
function parseJSON(text){
  try { return JSON.parse(text); } catch {}
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/); if (fence) { try { return JSON.parse(fence[1]); } catch {} }
  const starts = ["{","["].map(c => text.indexOf(c)).filter(i => i >= 0);
  const s = starts.length ? Math.min(...starts) : -1, e = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (s >= 0 && e > s) { try { return JSON.parse(text.slice(s, e+1)); } catch {} }
  throw new AppError("invalid_json", "Claude's answer wasn't in the expected format. Try again.");
}

// ---------- Tesco prices ----------
function searchTerm(name){ const m = String(name).match(/^(.*?)\s*\((.*?)\)\s*$/); return (m ? m[2] + " " + m[1] : name).replace(/[%&]/g," ").trim(); }
function htmlToText(html){
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,noscript,svg,iframe,template").forEach(n => n.remove());
  doc.querySelectorAll("div,p,li,h1,h2,h3,h4,h5,section,article,tr,br,a").forEach(n => n.append("\n"));
  return (doc.body ? doc.body.textContent : "").replace(/[ \t ]+/g," ").replace(/\n\s*\n+/g,"\n").trim();
}
function excerpt(text){
  const t = text.replace(/!\[[^\]]*\]\([^)]*\)/g,"").replace(/\]\((https?:\/\/[^)]+)\)/g,"]").replace(/\n{3,}/g,"\n\n");
  const i = t.search(/£\s?\d/); const start = Math.max(0, i - 1200);
  return t.slice(start, start + 6500);
}
async function tescoDirect(term){
  if (!NATIVE) throw new AppError("web_only", "Direct Tesco reading only works in the installed app.");
  let res;
  try { res = await fetch(TESCO_SEARCH + encodeURIComponent(term), { headers:{"User-Agent":UA,"Accept":"text/html,application/xhtml+xml","Accept-Language":"en-GB,en;q=0.9"} }); }
  catch { throw new AppError("offline", "Couldn't reach Tesco."); }
  if (!res.ok) throw new AppError("blocked", "Tesco refused the request (" + res.status + ").");
  const html = await res.text();
  const text = htmlToText(html);
  if (/£\s?\d/.test(text) && text.length > 400) return excerpt(text);
  const i = html.search(/"price"\s*:/); // product data embedded as JSON
  if (i >= 0) return html.slice(Math.max(0, i - 3000), i + 5000).replace(/\s+/g," ");
  throw new AppError("blocked", "Tesco didn't return any prices.");
}
async function tescoFirecrawl(term){
  const key = (S.keys.firecrawl||"").trim();
  if (!key) throw new AppError("no_fc_key", "Add a Firecrawl API key in Settings.");
  let res, j;
  try {
    res = await fetch("https://api.firecrawl.dev/v2/scrape", { method:"POST", headers:{"content-type":"application/json","Authorization":"Bearer " + key},
      body: JSON.stringify({ url: TESCO_SEARCH + encodeURIComponent(term), formats:["markdown"], onlyMainContent:true }) });
    j = await res.json().catch(() => null);
  } catch { throw new AppError("offline", "Couldn't reach Firecrawl."); }
  if (res.status === 401) throw new AppError("fc_bad_key", "Firecrawl didn't accept that API key.");
  if (res.status === 402) throw new AppError("fc_credits", "Your Firecrawl credits have run out for this month.");
  if (!res.ok || !j?.success || !j?.data?.markdown) throw new AppError("fc_error", "Firecrawl couldn't read Tesco: " + (j?.error || res.status));
  return excerpt(j.data.markdown);
}
async function tescoText(term){
  const src = S.settings.priceSource || "auto";
  if (src === "firecrawl") return tescoFirecrawl(term);
  if (src === "direct") return tescoDirect(term);
  if (!S.directBlocked){
    try { return await tescoDirect(term); }
    catch(e){ if (e.code === "offline") throw e; S.directBlocked = true; }
  }
  if (S.keys.firecrawl) return tescoFirecrawl(term);
  throw new AppError("blocked_no_fc", "Tesco blocked the price check from your phone. Add a Firecrawl API key in Settings to read prices another way.");
}
async function matchProducts(batch){
  const lines = batch.map((b,n) => `### ${n+1}. key: ${b.key}\nIngredient: "${b.name}" (recipe unit: ${b.unit}; needed this week: ${fmtQty(b.need, b.unit)})\nTesco search results:\n<<<\n${b.text}\n>>>`).join("\n\n");
  const prompt = `You match recipe ingredients to real Tesco products, using Tesco search results fetched today.
For each ingredient pick ONE product from its search results: the sensible everyday choice (prefer Tesco own-brand; fresh or plain over cooked, flavoured or premium unless the ingredient says so) whose pack(s) cover the amount needed for the lowest total spend.
Reply with only a JSON array, one object per ingredient, same order:
{"key": copy the key, "found": true/false, "product": full product name as shown, "packLabel": pack size as shown (e.g. "650g", "6 pack"), "price": shelf price in GBP (number), "clubcardPrice": Clubcard price in GBP or null, "unitsPerPack": how many of the ingredient's RECIPE UNIT one pack provides (number)}
unitsPerPack rules: g or ml -> the pack's grams or ml. tbsp = 15 ml or 15 g; tsp = 5 ml or 5 g. whole -> number of items (6 eggs = 6; a 3-pack of peppers = 3; a 1kg bag of onions = about 7; one loose item = 1). tin -> tins in the pack. clove -> about 10 per bulb of garlic. slice -> slices per loaf (an 800g loaf = about 20). bunch -> bunches.
If nothing in the results is a reasonable match, set found to false.

${lines}`;
  const out = parseJSON(await claude(prompt, { model: MODEL_FAST, maxTokens: 2000 }));
  return Array.isArray(out) ? out : [];
}
function renderPriceStatus(){
  for (const box of [$("#priceStatus"), $("#priceStatus2")]){
    box.textContent = "";
    const j = S.job;
    if (j){
      const pct = j.total ? Math.round((j.phase === "read" ? j.done : j.total + j.parsed) / (j.total*2) * 100) : 0;
      box.append(el("div",{class:"status live"}, el("i",{class:"dot"}),
        el("span",{class:"grow",text: j.phase === "read" ? `Reading Tesco prices: ${j.done} of ${j.total}` : `Matching products: ${j.parsed} of ${j.total}`}),
        el("button",{class:"btn sm",text:"Stop",onclick:()=>{ j.stopped = true; }}),
        el("div",{class:"progress"}, el("i",{style:`width:${pct}%`}))));
      continue;
    }
    const t = shopTotals();
    if (!t.count) continue;
    if (t.total > S.settings.budget){
      box.append(el("div",{class:"status warn"}, el("span",{class:"grow",text:`This week's shop is ${gbp(t.total - S.settings.budget)} over your ${gbp(S.settings.budget).replace(".00","")} budget.`}), el("button",{class:"btn sm",text:"Re-plan cheaper",onclick:()=>autoFill(true, true)})));
    }
    if (S.priceError){ box.append(el("div",{class:"status warn"}, el("span",{class:"grow",text:S.priceError}), el("button",{class:"btn sm ghost",text:"Settings",onclick:()=>showTab("settings")}))); continue; }
    if (!S.keys.anthropic){
      box.append(el("div",{class:"status"}, el("span",{class:"src est",text:"Estimates"}), el("span",{class:"grow",text:"Add an Anthropic API key to use live Tesco prices."}), el("button",{class:"btn sm",text:"Set up",onclick:()=>showTab("settings")})));
    } else if (t.live < t.count){
      box.append(el("div",{class:"status"}, el("span",{class:"src est",text:`${t.count - t.live} estimated`}), el("span",{class:"grow",text:`${t.live} of ${t.count} items have live prices.`}), el("button",{class:"btn sm",text:"Check prices",onclick:()=>checkPrices(false)})));
    } else {
      box.append(el("div",{class:"status live"}, el("span",{class:"src live",text:"Tesco"}), el("span",{class:"grow",text:`Live prices${S.settings.clubcard?" with Clubcard":""}, checked ${t.oldest ? t.oldest.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"}) : ""}.`}), el("button",{class:"btn sm ghost",text:"Re-check",onclick:()=>checkPrices(true)})));
    }
  }
}
async function checkPrices(force, quiet = false){
  if (S.job) return;
  S.priceError = null;
  if (!S.keys.anthropic){ if (!quiet) { S.priceError = "Live prices need your Anthropic API key so Claude can match products."; renderPriceStatus(); } return; }
  const items = shoppingItems().filter(i => !i.pantry && !i.extra);
  const todo = items.filter(i => force || !fresh(S.prices.get(i.key)));
  if (!todo.length){ if (!quiet) toast("Prices are already up to date."); renderAll(); return; }
  const job = S.job = {phase:"read", done:0, parsed:0, total:todo.length, stopped:false}; renderPriceStatus();
  const scraped = []; let fatal = null, failed = 0, idx = 0;
  const worker = async () => {
    while (idx < todo.length && !fatal && !job.stopped){
      const it = todo[idx++];
      try { const text = await tescoText(searchTerm(it.name)); scraped.push({key:it.key, name:it.name, unit:it.unit, need:it.need, text}); }
      catch(e){ if (["blocked_no_fc","no_fc_key","fc_bad_key","fc_credits","web_only","offline"].includes(e.code)) fatal = e.message; else failed++; }
      job.done++; renderPriceStatus();
    }
  };
  await Promise.all([worker(), worker()]);
  if (!fatal && !job.stopped && scraped.length){
    job.phase = "parse"; renderPriceStatus();
    const batches = []; for (let i=0;i<scraped.length;i+=6) batches.push(scraped.slice(i,i+6));
    let bi = 0;
    const pworker = async () => {
      while (bi < batches.length && !fatal && !job.stopped){
        const b = batches[bi++];
        try {
          const res = await matchProducts(b);
          for (const r of res){
            const src = b.find(x => x.key === r.key); if (!src) continue;
            S.prices.set(src.key, {name:src.name, unit:src.unit, found:!!r.found && +r.price > 0 && +r.unitsPerPack > 0,
              product:String(r.product||"").slice(0,120), packLabel:String(r.packLabel||"").slice(0,30),
              price:Math.round((+r.price||0)*100)/100, clubcardPrice: r.clubcardPrice > 0 ? Math.round(+r.clubcardPrice*100)/100 : null,
              unitsPerPack:+r.unitsPerPack||0, checkedAt:new Date().toISOString()});
          }
          savePrices();
          failed += b.length - res.filter(r => r && r.found).length;
        } catch(e){
          if (["no_key","bad_key","no_credit","model","rate_limited","offline"].includes(e.code)) fatal = e.message; else failed += b.length;
        }
        job.parsed += b.length; renderPriceStatus(); renderAll();
      }
    };
    await Promise.all([pworker(), pworker()]);
  }
  S.job = null;
  if (fatal) S.priceError = fatal;
  renderAll();
  if (job.stopped) toast("Stopped. Prices found so far are saved.");
  else if (!fatal){
    const t = shopTotals();
    if (t.total > S.settings.budget) toast(`Tesco total is ${gbp(t.total)}, ${gbp(t.total - S.settings.budget)} over budget.`);
    else toast(failed ? `Prices updated. ${failed} item${failed>1?"s":""} couldn't be matched and use estimates.` : "Tesco prices updated.");
  }
}

// ---------- rendering: plan ----------
function renderSummary(){
  const t = shopTotals(), b = S.settings.budget;
  const spend = t.count ? t.total : planCost();
  $("#spend").textContent = ""; $("#spend").append(gbp(spend)+" ", el("small",{text:"of "+gbp(b).replace(".00","")}));
  $("#meter").classList.toggle("over", spend > b);
  $("#meter i").style.width = (b ? Math.min(100, spend/b*100) : 0) + "%";
  $("#spendNote").textContent = spend > b ? `${gbp(spend-b)} over budget` : `${gbp(Math.max(0,b-spend))} left · ${t.count && t.live === t.count ? "live Tesco prices" : t.live ? `${t.live}/${t.count} live prices` : "estimated"}`;
  let days = 0, k = 0, p = 0;
  for (let i=0;i<7;i++){ const d = dayTotals(i); if (d.n){ days++; k += d.kcal; p += d.protein; } }
  const T = S.settings.kcal, P = S.settings.protein;
  if (days){
    $("#avgKcal").textContent = ""; $("#avgKcal").append(fmtN(k/days)+" ", el("small",{text:"/ "+fmtN(T)}));
    $("#avgProt").textContent = ""; $("#avgProt").append(Math.round(p/days)+"g ", el("small",{text:"/ "+P+"g"}));
    const kd = k/days - T; $("#avgKcalNote").textContent = Math.abs(kd) <= T*0.1 ? "On target" : (kd > 0 ? fmtN(kd)+" over" : fmtN(-kd)+" under");
    const pd = p/days - P; $("#avgProtNote").textContent = pd >= -P*0.05 ? "On target" : Math.round(-pd)+"g short";
  } else { $("#avgKcal").textContent = "–"; $("#avgProt").textContent = "–"; $("#avgKcalNote").textContent = "Target "+fmtN(T); $("#avgProtNote").textContent = "Target "+P+"g"; }
}
function dayState(i){ const d = dayTotals(i), T = S.settings.kcal, P = S.settings.protein; if (!d.n) return {cls:"", pct:0}; const ok = Math.abs(d.kcal - T) <= T*0.1 && d.protein >= P*0.95; return {cls: ok ? "ok" : "off", pct: Math.min(100, d.kcal/T*100)}; }
function targetBar(label, val, target, unit){
  const pct = target ? val/target*100 : 0, ok = label === "Protein" ? pct >= 95 : Math.abs(pct-100) <= 10;
  return el("div",{class:"target"}, el("div",{class:"lab"}, el("span",{text:label}), el("b",{text:`${fmtN(val)}${unit} / ${fmtN(target)}${unit}`})), el("div",{class:"meter " + (!val || ok ? "" : (pct > 100 ? "over" : "under"))}, el("i",{style:`width:${Math.min(100,pct)}%`})));
}
function renderPlan(){
  const mon = fromIso(S.week), todayIso = iso(new Date());
  const strip = $("#strip"); strip.textContent = "";
  for (let i=0;i<7;i++){
    const d = addDays(mon,i), st = dayState(i);
    strip.append(el("button",{class:"dchip "+st.cls+(iso(d)===todayIso?" today":""),"aria-pressed":String(S.day===i),"aria-label":DAYLONG[i]+" "+d.getDate(),onclick:()=>{S.day=i;renderPlan();}},
      el("b",{text:DAYN[i]}), el("span",{class:"n",text:d.getDate()}), el("span",{class:"mini"}, el("i",{style:`width:${st.pct}%`}))));
  }
  const card = $("#dayCard"); card.textContent = "";
  if (S.loaded && !S.recipes.size){ card.append(el("div",{class:"empty-state"}, el("b",{text:"Your recipe book is empty"}), el("span",{text:"Add a recipe in the Recipes tab, then come back here to plan your week."}))); return; }
  const i = S.day, d = addDays(mon,i), tot = dayTotals(i), dIso = iso(d), eaten = logTotals(dIso), entries = S.logs[dIso] || [];
  const wrap = el("div",{class:"daycard"},
    el("div",{class:"dayhead"}, el("h2",{text:d.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}),
      el("span",{class:"eyebrow",text:"Planned"}),
      targetBar("Calories", tot.kcal, S.settings.kcal, ""), targetBar("Protein", tot.protein, S.settings.protein, "g"),
      entries.length ? el("span",{class:"eyebrow",style:"margin-top:4px",text:"Eaten (from your photos)"}) : null,
      entries.length ? targetBar("Calories", eaten.kcal, S.settings.kcal, "") : null,
      entries.length ? targetBar("Protein", eaten.protein, S.settings.protein, "g") : null));
  for (const m of MEALS){ const s = slot(i,m); if (!S.settings.meals.includes(m) && !s) continue; wrap.append(mealRow(i, m, s)); }
  const ate = el("div",{class:"ate"},
    el("div",{class:"ate-head"}, el("div",{}, el("h3",{text:"What you ate"}), el("span",{class:"muted small",text: entries.length ? `${fmtN(eaten.kcal)} kcal · ${Math.round(eaten.protein)}g protein so far` : "Snap a photo of a meal and Claude estimates the calories."})),
      el("button",{class:"btn primary",onclick:()=>openSnap(dIso)}, cameraIcon(), "Snap a meal")));
  for (const e of entries.slice().sort((a,b)=>a.at.localeCompare(b.at))){
    const t = entryTotals(e);
    ate.append(el("button",{class:"ate-row",onclick:()=>openSnap(dIso, e)},
      e.thumb ? el("img",{src:e.thumb,alt:"",class:"thumb"}) : el("span",{class:"thumb ph"}),
      el("span",{class:"grow",style:"min-width:0"}, el("span",{class:"eyebrow",text:MEAL_LABEL[e.meal]+" · "+new Date(e.at).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}), el("b",{class:"ate-name",text:e.name})),
      el("span",{class:"ate-num"}, el("b",{text:fmtN(t.kcal)}), el("span",{class:"muted small",text:" kcal"}), el("br"), el("span",{class:"muted small",text:Math.round(t.protein)+"g protein"}))));
  }
  card.append(ate, wrap);
  card.append(el("p",{class:"muted small",style:"margin:8px 2px 0",text:`Calories and protein are per person. Costs are for ${S.settings.serves} ${S.settings.serves>1?"people":"person"}.`}));
}
function mealRow(i, m, s){
  const label = el("span",{class:"ml",text:MEAL_LABEL[m]});
  if (s && s.recipeId){
    const r = S.recipes.get(s.recipeId);
    if (!r) return el("div",{class:"meal"}, label, el("span",{class:"muted",text:"This recipe was deleted."}), el("div",{class:"tools"}, el("button",{class:"btn sm",text:"Pick another",onclick:()=>openPicker(i,m)}), el("button",{class:"btn sm ghost",text:"Remove",onclick:()=>clearSlot(i,m)})));
    const c = s.covers||1, live = recipeLive(r);
    const tools = el("div",{class:"tools"});
    if (m === "lunch" || m === "dinner") tools.append(el("div",{class:"covers",role:"group","aria-label":"Days this covers"}, [1,2,3].map(k => el("button",{text:k===1?"1 day":k+" days","aria-pressed":String(c===k),disabled:i+k>7,onclick:()=>setCovers(i,m,k)}))));
    tools.append(el("span",{class:"spacer"}),
      el("button",{class:"btn sm",text:"Swap",onclick:()=>swap(i,m),disabled:s.locked}),
      el("button",{class:"btn sm lock","aria-pressed":String(!!s.locked),text:s.locked?"Locked":"Lock",onclick:()=>{s.locked=!s.locked;savePlan();}}),
      el("button",{class:"btn sm ghost",text:"Remove",onclick:()=>clearSlot(i,m)}));
    return el("div",{class:"meal"}, label,
      el("div",{class:"mhead"}, el("button",{class:"mname",text:r.name,onclick:()=>openRecipe(r.id)}), el("span",{class:live?"price":"price est"}, gbp(recipeCost(r,c)))),
      el("div",{class:"meta"}, el("span",{class:"pr",text:(r.macros?.kcal||"?")+" kcal"}), el("span",{class:"pr",text:(r.macros?.protein||"?")+"g protein"}), el("span",{text:r.time+" min"}), c>1 ? el("span",{text:`Makes ${c} days`}) : null),
      tools);
  }
  if (s && s.leftover){
    const o = ownerIndex(m,i), r = recipeAt(i,m);
    return el("div",{class:"meal leftover"}, el("span",{class:"ml",text:MEAL_LABEL[m]+" · cooked "+DAYLONG[o]}), el("button",{class:"mname",text:"Leftovers: "+(r?r.name:"?"),onclick:()=>r&&openRecipe(r.id)}), r ? el("div",{class:"meta"}, el("span",{class:"pr",text:(r.macros?.kcal||"?")+" kcal"}), el("span",{class:"pr",text:(r.macros?.protein||"?")+"g protein"})) : null);
  }
  if (s && s.off){
    return el("div",{class:"meal empty"}, label, el("div",{class:"line"}, el("span",{class:"muted grow",text: m==="snack" ? "No snack needed" : "Skipped. Eating out or sorted elsewhere."}), el("button",{class:"btn sm ghost",text:"Plan it",onclick:()=>{setS(i,m,null);savePlan();}})));
  }
  return el("div",{class:"meal empty"}, label, el("div",{class:"line"}, el("span",{class:"muted grow",text:"Nothing planned"}),
    el("button",{class:"btn sm",text:"Pick",onclick:()=>openPicker(i,m)}),
    el("button",{class:"btn sm ghost",text:"Skip",onclick:()=>{setS(i,m,{off:true});savePlan();}})));
}

// ---------- recipes ----------
const FILTERS = [["all","All"],["fits","Fits my settings"],["fav","Favourites"],["mine","Mine"],["protein","25g+ protein"],["quick","Under 20 min"],["budget","Under £2 a serving"]];
function renderFilters(){
  const mf = $("#mealFilters"); mf.textContent = "";
  [["all","All meals"],...MEALS.map(m=>[m,MEAL_LABEL[m]])].forEach(([k,l]) => mf.append(el("button",{class:"chip","aria-pressed":String(S.mealFilter===k),text:l,onclick:()=>{S.mealFilter=k;renderFilters();renderRecipes();}})));
  const f = $("#filters"); f.textContent = "";
  FILTERS.forEach(([k,l]) => f.append(el("button",{class:"chip","aria-pressed":String(S.filter===k),text:l,onclick:()=>{S.filter=k;renderFilters();renderRecipes();}})));
}
function filteredRecipes(){
  const q = S.query.trim().toLowerCase();
  return [...S.recipes.values()].filter(r => {
    if (S.mealFilter !== "all" && mealOf(r) !== S.mealFilter) return false;
    if (S.filter==="fits" && !fits(r)) return false;
    if (S.filter==="fav" && !r.fav) return false;
    if (S.filter==="mine" && r.source==="starter") return false;
    if (S.filter==="protein" && !((r.macros?.protein||0) >= 25)) return false;
    if (S.filter==="quick" && !(r.time<=20)) return false;
    if (S.filter==="budget" && perServing(r) >= 2) return false;
    if (q && !(r.name.toLowerCase().includes(q) || (r.ingredients||[]).some(i => (i.name||"").toLowerCase().includes(q)))) return false;
    return true;
  }).sort((a,b) => MEALS.indexOf(mealOf(a)) - MEALS.indexOf(mealOf(b)) || (b.fav-a.fav) || a.name.localeCompare(b.name));
}
function renderRecipes(){
  const g = $("#recipeGrid"); g.textContent = "";
  const list = filteredRecipes();
  if (!list.length){ g.append(el("div",{class:"empty-state",style:"grid-column:1/-1"}, el("b",{text: S.recipes.size ? "Nothing matches" : "No recipes yet"}), el("span",{text: S.recipes.size ? "Try another filter or search." : "Paste a recipe above and Claude will add it, or type one in yourself."}))); return; }
  for (const r of list){
    g.append(el("button",{class:"card",onclick:()=>openRecipe(r.id)},
      el("div",{class:"row",style:"justify-content:space-between"}, el("span",{class:"eyebrow",text:MEAL_LABEL[mealOf(r)]+" · "+r.time+" min"}), r.fav ? el("span",{class:"fav","aria-label":"Favourite",text:"♥"}) : null),
      el("h3",{text:r.name}),
      el("div",{class:"chips"}, (r.tags||[]).filter(t=>t!=="pork"&&t!=="fish").slice(0,3).map(t => el("span",{class:"tag",text:t.replace("-"," ")}))),
      el("div",{class:"foot"}, el("span",{class:"muted small",text:(r.macros?.kcal||"?")+" kcal · "+(r.macros?.protein||"?")+"g protein"}), el("span",{class:recipeLive(r)?"price":"price est"}, gbp(perServing(r)), el("small",{text:"/serving"})))));
  }
}

// ---------- sheets ----------
const dlg = $("#dlg"), dlgBody = $("#dlgBody");
function openDialog(...kids){ dlgBody.textContent = ""; dlgBody.append(...kids); if (!dlg.open) dlg.showModal(); dlgBody.scrollTop = 0; }
dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
const closeBtn = () => el("button",{class:"iconbtn","aria-label":"Close",text:"×",onclick:()=>dlg.close()});
function recipeSheet(r, opts = {}){
  const sv = S.settings.serves, f = scale(r), m = mealOf(r);
  const daySel = el("select",{id:"addDay","aria-label":"Day to add this to"}, DAYN.map((d,i) => el("option",{value:i,text:d+" "+addDays(fromIso(S.week),i).getDate()})));
  const firstFree = [0,1,2,3,4,5,6].find(i => slot(i,m) === null); daySel.value = firstFree ?? S.day;
  const delRow = el("div",{class:"confirm",hidden:true}, el("span",{text:"Delete this recipe for good?"}), el("div",{class:"row"}, el("button",{class:"btn sm danger",text:"Delete",onclick:()=>{ dlg.close(); S.recipes.delete(r.id); saveRecipes(); renderAll(); toast("Recipe deleted."); }}), el("button",{class:"btn sm ghost",text:"Keep it",onclick:()=>{delRow.hidden=true;}})));
  return [
    el("div",{class:"row",style:"justify-content:space-between;align-items:flex-start;flex-wrap:nowrap"}, el("div",{style:"display:flex;flex-direction:column;gap:4px;min-width:0"}, el("span",{class:"eyebrow",text:[MEAL_LABEL[m], r.time+" min", (r.appliances||[]).join(" + ") || "No cooking"].join(" · ")}), el("h2",{text:r.name})), closeBtn()),
    el("div",{class:"row"}, el("span",{class:recipeLive(r)?"price":"price est"}, gbp(recipeCost(r)), el("small",{text:"for "+sv})), el("span",{class:"muted small",text:gbp(perServing(r))+" a serving · "+(recipeLive(r)?"Tesco prices":"estimated")}), !fits(r) ? el("span",{class:"tag",style:"color:var(--warn);background:var(--warn-soft)",text:"Outside your settings"}) : null),
    r.tags?.length ? el("div",{class:"chips"}, r.tags.map(t => el("span",{class:"tag",text:t.replace("-"," ")}))) : null,
    el("div",{class:"macros"}, [["kcal","kcal"],["protein","protein"],["carbs","carbs"],["fat","fat"]].map(([k,l]) => el("div",{}, el("b",{text:(r.macros?.[k]??"?")+(k==="kcal"?"":"g")}), el("span",{text:l})))),
    el("p",{class:"muted",style:"margin:-6px 0 0;font-size:12px",text:"Per serving, estimated."}),
    el("h3",{text:"Ingredients for "+sv}),
    el("ul",{class:"ings"}, (r.ingredients||[]).map(i => { const p = liveP(i.name, i.unit), pan = isPantry(i.name); return el("li",{}, el("span",{}, el("span",{class:"qty",text:fmtQty((+i.qty||0)*f, i.unit)}), i.name, pan ? el("span",{class:"muted small",text:" · in cupboard"}) : null), el("span",{class:"mono small",style:p?"":"color:var(--muted)",text:gbp(unitCost(i)*(+i.qty||0)*f) + (p?"":" est.")})); })),
    el("h3",{text:"Method"}),
    el("ol",{class:"steps"}, (r.steps||[]).map(s => el("li",{text:s}))),
    opts.preview ? opts.preview : el("div",{class:"sheet-actions"},
      daySel, el("button",{class:"btn primary",text:"Add as "+MEAL_LABEL[m].toLowerCase(),onclick:()=>{ const d = +daySel.value; setSlot(d, m, r.id); S.day = d; dlg.close(); showTab("plan"); toast("Added to "+DAYN[d]+"."); }}),
      el("button",{class:"btn sm",text:r.fav?"♥ Favourite":"♡ Favourite",onclick:e=>{ r.fav = !r.fav; e.target.textContent = r.fav?"♥ Favourite":"♡ Favourite"; saveRecipes(); renderRecipes(); }}),
      r.source !== "starter" ? el("button",{class:"btn sm ghost danger",text:"Delete",onclick:()=>{delRow.hidden=false;}}) : null),
    delRow
  ];
}
function openRecipe(id){ const r = S.recipes.get(id); if (r) openDialog(...recipeSheet(r)); }
function openPicker(i, m){
  const search = el("input",{type:"search",placeholder:"Search",id:"pickSearch","aria-label":"Search recipes"});
  const list = el("div",{class:"picker"});
  const base = dayTotals(i);
  const draw = () => {
    list.textContent = ""; const q = search.value.toLowerCase();
    const rs = [...S.recipes.values()].filter(r => mealOf(r)===m && (!q || r.name.toLowerCase().includes(q)))
      .map(r => ({r, sc: dayScore(base.kcal + (r.macros?.kcal||0), base.protein + (r.macros?.protein||0), 0, 0) + (fits(r)?0:5)})).sort((a,b)=>a.sc-b.sc).map(x=>x.r);
    if (!rs.length) list.append(el("div",{class:"muted",text:"No "+MEAL_LABEL[m].toLowerCase()+" recipes found."}));
    rs.forEach(r => list.append(el("button",{onclick:()=>{ setSlot(i, m, r.id); dlg.close(); }}, el("span",{}, el("b",{text:r.name}), el("span",{class:"muted",style:"display:block;font-size:12px",text:`${r.macros?.kcal||"?"} kcal · ${r.macros?.protein||"?"}g protein · ${r.time} min${fits(r)?"":" · outside your settings"}`})), el("span",{class:recipeLive(r)?"price":"price est"}, gbp(recipeCost(r))))));
  };
  search.addEventListener("input", draw); draw();
  const d = addDays(fromIso(S.week), i);
  openDialog(el("div",{class:"row",style:"justify-content:space-between;flex-wrap:nowrap"}, el("h2",{text:MEAL_LABEL[m]+", "+d.toLocaleDateString("en-GB",{weekday:"long",day:"numeric"})}), closeBtn()),
    el("p",{class:"muted small",style:"margin:0",text:`Best fit for today's ${fmtN(S.settings.kcal)} kcal and ${S.settings.protein}g protein first.`}), search, list);
}

// ---------- meal photos: calorie estimates ----------
const PORTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const portionLabel = p => ({0.5:"½",0.75:"¾",1:"All",1.25:"1¼",1.5:"1½",2:"2×"})[p] || p+"×";
function entryTotals(e){ const t = {kcal:0, protein:0, carbs:0, fat:0}; for (const it of e.items||[]) for (const k in t) t[k] += (+it[k]||0); for (const k in t) t[k] *= (e.portion||1); return t; }
function logTotals(dIso){ const t = {kcal:0, protein:0, carbs:0, fat:0}; for (const e of S.logs[dIso]||[]){ const x = entryTotals(e); for (const k in t) t[k] += x[k]; } return t; }
function saveLog(dIso){ const arr = S.logs[dIso] || []; if (arr.length) persist("log:"+dIso, () => S.logs[dIso] || []); else { clearTimeout(timers.get("log:"+dIso)); timers.delete("log:"+dIso); KV.remove("log:"+dIso); } }
function mealForTime(d = new Date()){ const h = d.getHours() + d.getMinutes()/60; return h < 11 ? "breakfast" : h < 15 ? "lunch" : h < 17.5 ? "snack" : "dinner"; }
function cameraIcon(){ const s = document.createElementNS("http://www.w3.org/2000/svg","svg"); s.setAttribute("viewBox","0 0 24 24"); s.setAttribute("class","ico"); s.setAttribute("aria-hidden","true"); s.innerHTML = '<path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.4-2h5l1.4 2h1.6A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z"/><circle cx="12" cy="12.5" r="3.5"/>'; return s; }
function loadImage(src, max, quality){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth*k); c.height = Math.round(img.naturalHeight*k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new AppError("image", "That photo couldn't be opened. Try another one."));
    img.src = src;
  });
}
async function getPhoto(fromGallery){
  try {
    if (fromGallery){ const r = await Camera.chooseFromGallery({ limit: 1 }); return r?.results?.[0]?.webPath || null; }
    const r = await Camera.takePhoto({ quality: 85, targetWidth: 1600, targetHeight: 1600, correctOrientation: true, webUseInput: true });
    return r?.webPath || null;
  } catch(e){
    if (/cancel/i.test(String(e?.message||e))) return null;
    throw new AppError("camera", "The camera couldn't be opened. Check Teatime's camera permission in your phone's settings.");
  }
}
async function estimateMeal(photoDataUrl, note){
  const prompt = `You estimate the nutrition of a meal from a photo, for a UK calorie and protein tracking app.
Identify each distinct food and drink item. Estimate each portion in grams, using the plate, bowl, cutlery, hands or packaging for scale (a standard UK dinner plate is about 27 cm across). Estimate kcal, protein, carbs and fat for that portion, including visible oil, butter, dressings and sauces. Be realistic rather than optimistic. If the photo shows packaging with nutrition information, use it.
${note ? "The person adds: " + note.slice(0, 500) + "\n" : ""}
Reply with only a JSON object:
{"isFood": true or false, "name": short name for the whole meal, "items": [{"name": string, "grams": number, "kcal": number, "protein": number, "carbs": number, "fat": number}], "confidence": "low" | "medium" | "high", "notes": one short sentence on what would most change the estimate}
If the photo doesn't show food or drink, set isFood to false and items to [].`;
  const r = parseJSON(await claude(prompt, { images:[{type:"image/jpeg", b64: photoDataUrl.split(",")[1]}], maxTokens: 1500 }));
  if (!r || r.isFood === false || !Array.isArray(r.items) || !r.items.length) throw new AppError("not_food", "Claude couldn't see a meal in that photo. Try again closer up, with the whole plate in view.");
  const num = v => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.round(n*10)/10 : 0; };
  return { name: String(r.name || "Meal").slice(0,80), confidence: ["low","medium","high"].includes(r.confidence) ? r.confidence : "medium", notes: String(r.notes||"").slice(0,200),
    items: r.items.slice(0,15).map(it => ({ name:String(it.name||"Item").slice(0,60), grams:num(it.grams), kcal:num(it.kcal), protein:num(it.protein), carbs:num(it.carbs), fat:num(it.fat) })) };
}
function openSnap(dIso, existing = null){
  const draft = existing ? JSON.parse(JSON.stringify(existing)) : null;
  let photo = null, note = "";
  const body = el("div",{class:"snap"});
  const dayLabel = fromIso(dIso).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"short"});
  const header = el("div",{class:"row",style:"justify-content:space-between;flex-wrap:nowrap"}, el("div",{}, el("span",{class:"eyebrow",text:dayLabel}), el("h2",{text: existing ? "Edit meal" : "Snap a meal"})), closeBtn());
  openDialog(header, body);

  const start = () => {
    body.textContent = "";
    if (!S.keys.anthropic){ body.append(el("p",{class:"banner",text:"Photo estimates use Claude. Add your Anthropic API key in Settings first."}), el("button",{class:"btn",text:"Go to Settings",onclick:()=>{ dlg.close(); showTab("settings"); }})); return; }
    const noteIn = el("input",{type:"text",id:"snapNote",placeholder:"Optional: anything the photo won't show",value:note,oninput:e=>{ note = e.target.value; }});
    body.append(
      el("p",{class:"muted small",style:"margin:0",text:"Get the whole plate in the photo, from a little above. Claude identifies each food, estimates the portion and works out calories and protein."}),
      el("div",{class:"row"}, el("button",{class:"btn primary grow",onclick:()=>capture(false)}, cameraIcon(), "Take photo"), el("button",{class:"btn grow",text:"Choose from gallery",onclick:()=>capture(true)})),
      el("label",{class:"field"}, el("span",{text:"Notes for Claude"}), noteIn),
      el("p",{class:"muted small",style:"margin:0",text:"For example: cooked in butter, large portion, diet cola, half the rice left."}));
  };
  const capture = async (gallery) => {
    let src;
    try { src = await getPhoto(gallery); } catch(e){ toast(e.message); return; }
    if (!src) return;
    body.textContent = ""; body.append(el("div",{class:"thinking"}, el("i",{class:"dot"}), "Preparing photo…"));
    try { photo = { full: await loadImage(src, 1568, 0.85), thumb: await loadImage(src, 200, 0.6) }; }
    catch(e){ body.textContent = ""; body.append(el("p",{class:"banner",text:e.message})); setTimeout(start, 2500); return; }
    body.textContent = "";
    body.append(el("img",{src:photo.full,alt:"Your meal",class:"snap-photo"}), el("div",{class:"thinking"}, el("i",{class:"dot"}), "Claude is looking at your meal. This takes about 10–30 seconds."));
    try {
      const est = await estimateMeal(photo.full, note);
      editor({ id: "l-" + Date.now().toString(36), at: new Date().toISOString(), meal: mealForTime(), portion: 1, thumb: photo.thumb, note, ...est }, false);
    } catch(e){
      body.textContent = "";
      body.append(el("img",{src:photo.full,alt:"Your meal",class:"snap-photo"}), el("p",{class:"banner",text:e.message}), el("div",{class:"row"}, el("button",{class:"btn primary",text:"Try again",onclick:()=>{ body.textContent=""; body.append(el("img",{src:photo.full,alt:"",class:"snap-photo"}), el("div",{class:"thinking"}, el("i",{class:"dot"}), "Claude is looking at your meal…")); estimateMeal(photo.full, note).then(est => editor({ id:"l-"+Date.now().toString(36), at:new Date().toISOString(), meal:mealForTime(), portion:1, thumb:photo.thumb, note, ...est }, false)).catch(err => { body.textContent=""; body.append(el("p",{class:"banner",text:err.message}), el("button",{class:"btn",text:"Start again",onclick:start})); }); }}), el("button",{class:"btn ghost",text:"Use another photo",onclick:start})));
    }
  };
  const editor = (e, saved) => {
    body.textContent = "";
    const orig = e.items.map(it => ({...it}));
    const totalsBox = el("div",{class:"macros"});
    const drawTotals = () => { const t = entryTotals(e); totalsBox.textContent = ""; [["kcal","kcal",""],["protein","protein","g"],["carbs","carbs","g"],["fat","fat","g"]].forEach(([k,l,u]) => totalsBox.append(el("div",{}, el("b",{text:fmtN(t[k])+u}), el("span",{text:l})))); };
    const rows = el("div",{class:"est-items"});
    const drawRows = () => {
      rows.textContent = "";
      e.items.forEach((it, n) => {
        const base = orig[n] && orig[n].grams > 0 ? orig[n] : null;
        const g = el("input",{type:"number",inputmode:"numeric",min:"0",value:String(Math.round(it.grams)),"aria-label":"Grams of "+it.name,onchange:ev=>{
          const v = Math.max(0, +ev.target.value || 0);
          if (base){ const k = v / base.grams; for (const f of ["kcal","protein","carbs","fat"]) it[f] = Math.round(base[f]*k*10)/10; }
          it.grams = v; drawRows(); drawTotals(); }});
        rows.append(el("div",{class:"est-row"},
          el("span",{class:"grow",style:"min-width:0"}, el("b",{text:it.name}), el("span",{class:"muted small",style:"display:block",text:`${fmtN(it.kcal)} kcal · ${Math.round(it.protein)}g protein`})),
          el("label",{class:"grams"}, g, el("span",{class:"muted small",text:"g"})),
          el("button",{class:"iconbtn sm","aria-label":"Remove "+it.name,text:"×",onclick:()=>{ e.items.splice(n,1); orig.splice(n,1); drawRows(); drawTotals(); }})));
      });
      if (!e.items.length) rows.append(el("p",{class:"muted small",style:"margin:0",text:"No items left. Discard this entry or take another photo."}));
    };
    const nameIn = el("input",{type:"text",id:"snapName",value:e.name,oninput:ev=>{ e.name = ev.target.value.slice(0,80); }});
    const mealSel = el("select",{id:"snapMeal",onchange:ev=>{ e.meal = ev.target.value; }}, MEALS.map(m => el("option",{value:m,text:MEAL_LABEL[m]})));
    mealSel.value = e.meal;
    const chips = el("div",{class:"chips"}, PORTIONS.map(p => el("button",{class:"chip","aria-pressed":String((e.portion||1)===p),text:portionLabel(p),onclick:ev=>{ e.portion = p; chips.querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", String(c === ev.currentTarget))); drawTotals(); }})));
    const delRow = el("div",{class:"confirm",hidden:true}, el("span",{text:"Delete this meal from your log?"}), el("div",{class:"row"}, el("button",{class:"btn sm danger",text:"Delete",onclick:()=>{ S.logs[dIso] = (S.logs[dIso]||[]).filter(x => x.id !== e.id); if (!S.logs[dIso].length) delete S.logs[dIso]; saveLog(dIso); dlg.close(); renderAll(); toast("Meal deleted."); }}), el("button",{class:"btn sm ghost",text:"Keep it",onclick:()=>{ delRow.hidden = true; }})));
    body.append(
      e.thumb ? el("img",{src: photo?.full || e.thumb, alt:"Your meal", class:"snap-photo"+(photo?"":" small")}) : null,
      el("div",{class:"row"}, el("span",{class:"src "+(e.confidence==="high"?"live":"est"),text:`${e.confidence} confidence`}), e.notes ? el("span",{class:"muted small grow",text:e.notes}) : null),
      totalsBox,
      el("div",{class:"two"}, el("label",{class:"field"}, el("span",{text:"Meal name"}), nameIn), el("label",{class:"field"}, el("span",{text:"Counts as"}), mealSel)),
      el("div",{class:"field"}, el("span",{text:"How much did you eat?"}), chips),
      el("div",{class:"field"}, el("span",{text:"What Claude saw (change grams to adjust)"}), rows),
      el("p",{class:"muted small",style:"margin:0",text:"Photo estimates are rough. Oils, sauces and hidden ingredients can make them 20–30% out either way."}),
      el("div",{class:"sheet-actions"},
        el("button",{class:"btn primary",text: saved ? "Save changes" : "Add to "+fromIso(dIso).toLocaleDateString("en-GB",{weekday:"short"}),onclick:()=>{
          if (!e.items.length){ toast("Add at least one item, or discard this entry."); return; }
          e.name = (e.name||"").trim() || "Meal";
          const list = (S.logs[dIso] || []).filter(x => x.id !== e.id); list.push(e); S.logs[dIso] = list; saveLog(dIso);
          dlg.close(); renderAll(); const t = entryTotals(e); toast(`Logged ${fmtN(t.kcal)} kcal and ${Math.round(t.protein)}g protein.`); }}),
        saved ? el("button",{class:"btn ghost danger",text:"Delete",onclick:()=>{ delRow.hidden = false; }}) : el("button",{class:"btn ghost",text:"Discard",onclick:()=>dlg.close()})),
      delRow);
    drawRows(); drawTotals();
  };
  if (draft) editor(draft, true); else start();
}
async function pruneOldThumbs(){
  const cutoff = iso(addDays(new Date(), -21));
  for (const k of await KV.keys()){
    if (!k.startsWith("log:") || k.slice(4) >= cutoff) continue;
    const arr = await KV.get(k); if (!Array.isArray(arr) || !arr.some(e => e.thumb)) continue;
    await KV.set(k, arr.map(({thumb, ...rest}) => rest));
  }
}

// ---------- import with Claude ----------
let importImg = null, importing = false;
function cleanRecipe(x){
  if (!x || typeof x !== "object" || !x.name) throw new AppError("invalid_json", "Claude's answer wasn't a usable recipe. Try again.");
  const num = (v,d) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : d; };
  return {
    name:String(x.name).slice(0,90), meal: MEALS.includes(x.meal) ? x.meal : "dinner",
    time:Math.round(num(x.time,30)) || 30, serves:Math.max(1, Math.round(num(x.serves,2))) || 2,
    appliances:(Array.isArray(x.appliances)?x.appliances:[]).filter(a=>APPLIANCES.includes(a)),
    tags:(Array.isArray(x.tags)?x.tags:[]).filter(t=>TAGS.includes(t)),
    style:STYLES.includes(x.style) ? x.style : "Comfort",
    macros:{kcal:Math.round(num(x.macros?.kcal,0)), protein:Math.round(num(x.macros?.protein,0)), carbs:Math.round(num(x.macros?.carbs,0)), fat:Math.round(num(x.macros?.fat,0))},
    ingredients:(Array.isArray(x.ingredients)?x.ingredients:[]).slice(0,30).map(i => ({name:String(i.name||"").slice(0,60), qty:num(i.qty,1), unit:UNITS.includes(i.unit)?i.unit:"whole", aisle:AISLES.includes(i.aisle)?i.aisle:"Other", cost:Math.round(num(i.cost,0)*100)/100})).filter(i=>i.name),
    steps:(Array.isArray(x.steps)?x.steps:[]).slice(0,15).map(s=>String(s).slice(0,400)),
    source:"mine", fav:false
  };
}
function shrinkImage(file){
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const max = 1568, k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = Math.round(img.width*k); c.height = Math.round(img.height*k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      resolve({type:"image/jpeg", b64:c.toDataURL("image/jpeg", 0.85).split(",")[1]});
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new AppError("image", "That image couldn't be read. Try a JPEG or PNG screenshot.")); };
    img.src = url;
  });
}
async function runImport(){
  const text = $("#importText").value.trim();
  if (!text && !importImg){ toast("Paste a recipe or describe what you fancy first."); return; }
  if (importing) return;
  const out = $("#importOut"); out.textContent = "";
  if (!S.keys.anthropic){ out.append(el("p",{class:"banner",text:"Add your Anthropic API key in Settings to use Claude. You can still type recipes in yourself."})); return; }
  out.append(el("div",{class:"thinking"}, el("i",{class:"dot"}), "Claude is writing your recipe. This can take up to a minute."));
  importing = true; $("#importGo").disabled = true;
  const prompt = `You are the recipe engine for a UK home meal planner. Turn the user's input into ONE recipe. If the input is a recipe (caption, web page, screenshot), faithfully structure it. If it is a wish or a list of ingredients, invent a good, realistic recipe that fits it. Use British ingredient names and metric units.

Reply with only a JSON object with exactly these fields:
{"name": string, "meal": one of ["breakfast","lunch","dinner","snack"], "time": total minutes (number), "serves": number (default 2),
 "appliances": array from ${JSON.stringify(APPLIANCES)} (only what is really needed; [] if no cooking),
 "tags": array from ${JSON.stringify(TAGS)} (only those that are true; "pork" if it contains pork, bacon, chorizo or ham; "fish" if it contains fish or seafood; "high-protein" if 25g+ protein per serving),
 "style": one of ${JSON.stringify(STYLES)},
 "macros": {"kcal": n, "protein": n, "carbs": n, "fat": n} per serving, careful best estimate,
 "ingredients": [{"name": plain supermarket name, "qty": number, "unit": one of ${JSON.stringify(UNITS)}, "aisle": one of ${JSON.stringify(AISLES)}, "cost": estimated GBP at Tesco for just this quantity (pro rata, not whole pack)}],
 "steps": [short imperative steps, 3 to 8]}
Example ingredient: {"name":"Chicken breast","qty":300,"unit":"g","aisle":"Meat & fish","cost":2.4}
Skip salt, pepper and water.

User input:
${text.slice(0, 12000) || "(see the attached screenshot)"}`;
  try {
    const images = importImg ? [await shrinkImage(importImg)] : [];
    const r = cleanRecipe(parseJSON(await claude(prompt, { images })));
    out.textContent = "";
    const saveRow = el("div",{class:"sheet-actions"},
      el("button",{class:"btn primary",text:"Save to my recipes",onclick:()=>{ addRecipe(r); dlg.close(); $("#importText").value=""; importImg=null; $("#importImg").value=""; $("#imgName").textContent=""; }}),
      el("button",{class:"btn ghost",text:"Discard",onclick:()=>dlg.close()}));
    openDialog(...recipeSheet(r, {preview:saveRow}));
  } catch(e){
    out.textContent = ""; out.append(el("p",{class:"banner",text:e.message || "That didn't work. Try again."}));
  } finally { importing = false; $("#importGo").disabled = false; }
}
function addRecipe(r){ const id = "m-" + Date.now().toString(36) + Math.random().toString(36).slice(2,6); r.id = id; S.recipes.set(id, r); saveRecipes(); renderAll(); toast("Saved "+r.name+"."); }
function parseIngredient(line){
  const costM = line.match(/[,@]\s*£?\s*(\d+(?:\.\d+)?)\s*$/); let cost = 0;
  if (costM){ cost = +costM[1]; line = line.slice(0, costM.index); }
  const m = line.trim().match(/^(\d+(?:\.\d+)?|½)\s*(kg|g|ml|l|tbsp|tsp|cloves?|tins?|bunch(?:es)?|slices?)?\.?\s+(.+)$/i);
  if (!m) return {name:line.trim(), qty:1, unit:"whole", aisle:guessAisle(line), cost};
  let qty = m[1]==="½" ? 0.5 : +m[1], unit = (m[2]||"whole").toLowerCase();
  if (unit==="kg"){ qty*=1000; unit="g"; } if (unit==="l"){ qty*=1000; unit="ml"; }
  unit = unit.replace(/^bunches$/,"bunch").replace(/^(clove|tin|slice)s$/,"$1");
  if (!UNITS.includes(unit)) unit = "whole";
  return {name:m[3].trim(), qty, unit, aisle:guessAisle(m[3]), cost};
}
function guessAisle(n){
  n = n.toLowerCase();
  const rules = [[/chicken|beef|pork|lamb|mince|sausage|bacon|salmon|cod|fish|steak|chorizo|turkey|ham/,"Meat & fish"],[/milk|cheese|yog|skyr|butter|cream|egg|feta|halloumi|mozzarella/,"Dairy & eggs"],[/bread|wrap|tortilla|naan|bun|bagel|baguette|muffin/,"Bakery"],[/frozen|peas|prawn|edamame/,"Frozen"],[/tin|passata|beans|chickpea|tomatoes|mayo|pesto|sauce/,"Tins & jars"],[/rice|pasta|spaghetti|penne|noodle|lentil|couscous|oats/,"Pasta, rice & grains"],[/curry|soy|coconut|sriracha|teriyaki|harissa|paste|tofu/,"World foods"],[/cumin|paprika|chilli powder|oregano|spice|seasoning|cinnamon/,"Herbs & spices"],[/oil|stock|honey|flour|sugar|vinegar|peanut butter|granola/,"Store cupboard"],[/onion|garlic|pepper|carrot|potato|leek|spinach|lettuce|tomato|mushroom|lime|lemon|apple|banana|berr|herb|coriander|basil|ginger|broccoli|courgette|avocado|cucumber/,"Fruit & veg"]];
  for (const [re,a] of rules) if (re.test(n)) return a;
  return "Other";
}

// ---------- settings ----------
function renderSettings(){
  const st = S.settings;
  const setIfIdle = (sel, v) => { const e = $(sel); if (document.activeElement !== e) e.value = v; };
  setIfIdle("#sKcal", st.kcal); setIfIdle("#sProt", st.protein); setIfIdle("#sBudget", st.budget); setIfIdle("#sServes", st.serves);
  $("#sRepeat").value = st.avoidRepeat ? "1" : "0"; $("#sClub").value = st.clubcard ? "1" : "0"; $("#sFresh").value = String(st.freshDays||3); $("#sSource").value = st.priceSource || "auto";
  const checks = (box, items, key) => { box.textContent = ""; items.forEach(it => { const [v,l] = Array.isArray(it) ? it : [it,it]; const id = key+"-"+v.replace(/\W/g,""); box.append(el("label",{for:id}, el("input",{type:"checkbox",id,checked:(S.settings[key]||[]).includes(v),onchange:e=>{ const s = new Set(S.settings[key]); e.target.checked ? s.add(v) : s.delete(v); S.settings = {...S.settings, [key]:[...s]}; saveSettings(); }}), l)); }); };
  checks($("#sMeals"), MEALS.map(m=>[m,MEAL_LABEL[m]]), "meals");
  checks($("#sDiet"), DIETS, "diet");
  checks($("#sApps"), APPLIANCES, "appliances");
  checks($("#sStyles"), STYLES, "styles");
}
const numSetting = (sel, key, min, max, def) => $(sel).addEventListener("change", e => { const v = Math.min(max, Math.max(min, Math.round(+e.target.value||def))); S.settings = {...S.settings, [key]:v}; saveSettings(); });
numSetting("#sKcal","kcal",800,5000,1800); numSetting("#sProt","protein",20,400,120); numSetting("#sBudget","budget",5,2000,80); numSetting("#sServes","serves",1,12,2);
$("#sRepeat").addEventListener("change", e => { S.settings = {...S.settings, avoidRepeat:e.target.value==="1"}; saveSettings(); });
$("#sClub").addEventListener("change", e => { S.settings = {...S.settings, clubcard:e.target.value==="1"}; saveSettings(); });
$("#sFresh").addEventListener("change", e => { S.settings = {...S.settings, freshDays:+e.target.value}; saveSettings(); });
$("#sSource").addEventListener("change", e => { S.settings = {...S.settings, priceSource:e.target.value}; S.directBlocked = false; saveSettings(); });
["#settingsForm","#settingsForm2"].forEach(f => $(f).addEventListener("submit", e => e.preventDefault()));
$("#claudeForm").addEventListener("submit", async e => {
  e.preventDefault();
  S.keys = {...S.keys, anthropic:$("#kAnthropic").value.trim()}; await KV.set("keys", S.keys);
  const out = $("#claudeOut");
  if (!S.keys.anthropic){ out.textContent = "Key removed. Claude features are off."; renderPriceStatus(); return; }
  out.textContent = "Testing…";
  try { await claude("Reply with the single word: ready", { model: MODEL_FAST, maxTokens: 10 }); out.textContent = "Working. Claude features are on."; S.priceError = null; }
  catch(err){ out.textContent = err.message; }
  renderPriceStatus();
});
$("#priceForm").addEventListener("submit", async e => {
  e.preventDefault();
  S.keys = {...S.keys, firecrawl:$("#kFirecrawl").value.trim()}; await KV.set("keys", S.keys);
  S.directBlocked = false; S.priceError = null;
  const out = $("#priceOut"); out.textContent = "Reading one Tesco page…";
  try { const t = await tescoText("semi skimmed milk"); const m = t.match(/£\s?\d+\.\d{2}/); out.textContent = (S.directBlocked ? "Working through Firecrawl." : "Working.") + (m ? ` First price found: ${m[0].replace(/\s/g,"")}.` : ""); }
  catch(err){ out.textContent = err.message; }
});

// ---------- backup ----------
let pendingRestore = null;
async function backupData(){
  await flushAll();
  const data = {app:"teatime", version:1, exportedAt:new Date().toISOString(), entries:{}};
  for (const k of await KV.keys()) if (k !== "keys") data.entries[k] = await KV.get(k);
  return data;
}
$("#exportBtn").onclick = async () => {
  const data = await backupData(), text = JSON.stringify(data);
  const name = "teatime-backup-" + iso(new Date()) + ".json";
  try {
    if (NATIVE){ await Share.share({ title: name, text, dialogTitle: "Save your Teatime backup" }); }
    else { const a = el("a",{href:URL.createObjectURL(new Blob([text],{type:"application/json"})), download:name}); a.click(); }
  } catch(e){ if (!/cancel/i.test(String(e?.message||e))) toast("Couldn't share the backup."); }
};
$("#importFile").addEventListener("change", async e => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (data?.app !== "teatime" || !data.entries) throw new Error();
    pendingRestore = data;
    const n = (data.entries.recipes||[]).length;
    $("#restoreMsg").textContent = `Replace everything on this phone with the backup from ${new Date(data.exportedAt).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})} (${n} recipes)?`;
    $("#restoreConfirm").hidden = false;
  } catch { toast("That file isn't a Teatime backup."); }
});
$("#restoreNo").onclick = () => { pendingRestore = null; $("#restoreConfirm").hidden = true; };
$("#restoreYes").onclick = async () => {
  if (!pendingRestore) return;
  for (const k of await KV.keys()) if (k !== "keys") await KV.remove(k);
  for (const [k,v] of Object.entries(pendingRestore.entries)) await KV.set(k, v);
  pendingRestore = null; $("#restoreConfirm").hidden = true;
  await loadAll(); toast("Backup restored.");
};

// ---------- shell ----------
let toastT;
function toast(msg){ const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(()=>{ t.hidden = true; }, 3800); }
function renderRange(){ const m = fromIso(S.week), e = addDays(m,6), f = d => d.toLocaleDateString("en-GB",{day:"numeric",month:"short"}); $("#range").textContent = f(m) + " – " + f(e); }
function renderAll(){ renderRange(); renderSettings(); renderSummary(); renderPlan(); renderShop(); renderRecipes(); renderPriceStatus(); }
function showTab(t){
  S.tab = t;
  document.querySelectorAll(".tabbar button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab===t)));
  document.querySelectorAll(".tabview").forEach(v => { v.hidden = v.id !== "v-"+t; });
  window.scrollTo(0, 0);
}
document.querySelectorAll(".tabbar button").forEach(b => b.addEventListener("click", () => showTab(b.dataset.tab)));
$("#prevWk").onclick = () => changeWeek(-7); $("#nextWk").onclick = () => changeWeek(7);
$("#autoPlan").onclick = () => autoFill(false);
$("#reroll").onclick = () => autoFill(true);
$("#clearWk").onclick = () => { $("#clearConfirm").hidden = false; };
$("#clearNo").onclick = () => { $("#clearConfirm").hidden = true; };
$("#clearYes").onclick = () => { S.plan = emptyPlan(); S.list = {checked:{}, extras:S.list.extras||[]}; saveList(); $("#clearConfirm").hidden = true; savePlan(); toast("Week cleared."); };
$("#refreshPrices").onclick = () => checkPrices(false);
$("#search").addEventListener("input", e => { S.query = e.target.value; renderRecipes(); });
$("#extraForm").addEventListener("submit", e => { e.preventDefault(); const v = $("#extraInput").value.trim(); if (!v) return; S.list.extras = [...(S.list.extras||[]), {id:Date.now().toString(36), name:v.slice(0,80)}]; $("#extraInput").value = ""; saveList(); });
$("#untick").onclick = () => { S.list.checked = {}; saveList(); };
$("#shareList").onclick = async () => {
  const txt = listText();
  try { if (NATIVE) await Share.share({ title:"Teatime shopping list", text:txt, dialogTitle:"Share shopping list" }); else { await navigator.clipboard.writeText(txt); toast("Shopping list copied."); } }
  catch(e){ if (!/cancel/i.test(String(e?.message||e))) toast("Couldn't share the list."); }
};
$("#importGo").onclick = runImport;
$("#importStop").onclick = () => {};
$("#importImg").addEventListener("change", e => { importImg = e.target.files[0] || null; $("#imgName").textContent = importImg ? importImg.name : ""; });
$("#manualToggle").onclick = () => { $("#manualPanel").hidden = false; $("#mName").focus(); };
$("#manualCancel").onclick = () => { $("#manualPanel").hidden = true; };
(function buildManualChecks(){
  const mk = (box, items, pre, def) => items.forEach(v => { const id = pre+v.replace(/\W/g,""); box.append(el("label",{for:id}, el("input",{type:"checkbox",id,value:v,checked:def.includes(v)}), v)); });
  mk($("#mApps"), APPLIANCES, "mA-", ["Hob"]); mk($("#mTags"), TAGS, "mT-", []);
})();
$("#manualPanel").addEventListener("submit", e => {
  e.preventDefault();
  const name = $("#mName").value.trim(); if (!name) return;
  const time = Math.max(1, +$("#mTime").value||30);
  addRecipe({name, meal:$("#mMeal").value, time, serves:Math.max(1, +$("#mServes").value||2),
    appliances:[...document.querySelectorAll("#mApps input:checked")].map(i=>i.value), tags:[...document.querySelectorAll("#mTags input:checked")].map(i=>i.value),
    style: time <= 25 ? "Quick" : "Comfort", macros:{kcal:Math.max(0,+$("#mKcal").value||0), protein:Math.max(0,+$("#mProt").value||0), carbs:0, fat:0},
    ingredients:$("#mIngs").value.split("\n").map(l=>l.trim()).filter(Boolean).map(parseIngredient),
    steps:$("#mSteps").value.split("\n").map(s=>s.trim()).filter(Boolean), source:"mine", fav:false});
  e.target.reset(); $("#manualPanel").hidden = true;
});

// ---------- loading ----------
function migrate(d){
  if (d && Array.isArray(d.days) && d.days.length === 7) return {days: d.days.map(x => ({...emptyDay(), ...(x||{})}))};
  const p = emptyPlan();
  if (d && Array.isArray(d.slots)) d.slots.forEach((s,i) => { if (i < 7) p.days[i].dinner = s || null; });
  return p;
}
async function loadWeek(){
  S.plan = migrate(await KV.get(planKey()));
  S.logs = {};
  for (let i=0;i<7;i++){ const d = iso(addDays(fromIso(S.week), i)); const l = await KV.get("log:" + d); if (Array.isArray(l) && l.length) S.logs[d] = l; }
  const l = await KV.get(listKey()); S.list = l ? {checked:{...(l.checked||{})}, extras:[...(l.extras||[])]} : {checked:{}, extras:[]};
}
async function changeWeek(n){ await flushAll(); S.week = iso(addDays(fromIso(S.week), n)); S.day = 0; await loadWeek(); renderAll(); }
async function loadAll(){
  S.settings = {...DEFAULT_SETTINGS, ...((await KV.get("settings")) || {})};
  S.keys = {anthropic:"", firecrawl:"", ...((await KV.get("keys")) || {})};
  $("#kAnthropic").value = S.keys.anthropic; $("#kFirecrawl").value = S.keys.firecrawl;
  let recipes = await KV.get("recipes");
  if (!Array.isArray(recipes)) { recipes = STARTER.map(r => ({...r})); await KV.set("recipes", recipes); }
  S.recipes = new Map(recipes.map(r => [r.id, r]));
  S.prices = new Map(Object.entries((await KV.get("prices")) || {}));
  await loadWeek();
  S.loaded = true;
  renderFilters(); renderAll();
}

(async function boot(){
  renderFilters(); renderAll();
  await loadAll();
  pruneOldThumbs().catch(() => {});
  if (NATIVE){
    App.addListener("backButton", () => {
      if (dlg.open) dlg.close();
      else if (S.tab !== "plan") showTab("plan");
      else App.minimizeApp();
    });
    App.addListener("pause", () => { flushAll(); });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const applyBar = () => StatusBar.setStyle({ style: mq.matches ? Style.Dark : Style.Light }).catch(() => {});
    applyBar(); mq.addEventListener("change", applyBar);
  }
})();
