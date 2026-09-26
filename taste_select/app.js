"use strict";

const prompts = window.PROMPTS;
const PICKS_KEY = "taste_select_picks_v2";
const N_SYSTEMS = prompts[0].systems.length;

const SECTION_COLORS = {
  A: "#7256b8", B: "#2b7bb9", C: "#2e8b6d", D: "#b8892b",
  E: "#b3453f", F: "#8a5aa8", G: "#3f7f96", H: "#7d7a34",
};
const TILE_TAGS = {ar: "AR", dit: "DiT", text2midi: "T2M", midi_llm: "MLLM"};
const PEDAL_INK = "#c2601f";
const PAD_RIGHT = 12;
const BAND_H = 16;
const ROLL_H = 210;
const PEDAL_H = 14;
const AXIS_H = 20;

const audio = new Audio();
audio.preload = "none";
const pieceCache = new Map();
const viewers = [];  // one per prompt
let current = null;  // {viewer, s, k} of the loaded audio
let frame = null;

let picks = JSON.parse(localStorage.getItem(PICKS_KEY) || "{}");

function formatTime(seconds) {
  const value = Math.max(0, Math.round(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

function loadPiece(url) {
  if (!pieceCache.has(url)) {
    pieceCache.set(url, fetch(url).then(response => {
      if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
      return response.json();
    }));
  }
  return pieceCache.get(url);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// --- pianoroll (adapted from demos/dit_shift_lyria_v1_cond/app.js) ---

function draw(viewer) {
  const {piece, canvas, cursor} = viewer;
  const width = Math.floor(canvas.parentElement.clientWidth);
  const padLeft = width < 600 ? 8 : 76;
  const bandTop = 0;
  const rollTop = BAND_H;
  const pedalTop = rollTop + ROLL_H + 2;
  const axisTop = pedalTop + PEDAL_H;
  const totalH = axisTop + AXIS_H;

  const ratio = window.devicePixelRatio || 1;
  for (const c of [canvas, cursor]) {
    c.width = Math.floor(width * ratio);
    c.height = Math.floor(totalH * ratio);
    c.style.height = `${totalH}px`;
  }
  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, totalH);

  const plotW = width - padLeft - PAD_RIGHT;
  const band = piece.band;
  const planEnd = band.ends_sec.length ? band.ends_sec[band.ends_sec.length - 1] : 0;
  const duration = Math.max(1, piece.duration_sec, planEnd);
  const timeX = t => padLeft + (Math.min(Math.max(t, 0), duration) / duration) * plotW;
  viewer.layout = {ratio, width, padLeft, plotW, duration, totalH, top: 0, bottom: axisTop};

  context.fillStyle = "#ffffff";
  context.fillRect(padLeft, rollTop, plotW, ROLL_H);
  context.fillStyle = "#f4f5f6";
  context.fillRect(padLeft, bandTop, plotW, BAND_H - 2);
  for (let i = 0; i < band.letters.length; i += 1) {
    const x0 = timeX(band.starts_sec[i]);
    const x1 = timeX(band.ends_sec[i]);
    const w = Math.max(1, x1 - x0);
    const color = SECTION_COLORS[band.letters[i]] || "#6d7582";
    context.fillStyle = color;
    context.globalAlpha = 0.85;
    context.fillRect(x0, bandTop, w, BAND_H - 2);
    context.globalAlpha = 0.08;
    context.fillRect(x0, rollTop, w, ROLL_H);
    context.globalAlpha = 1;
    if (w > 12) {
      context.fillStyle = "#ffffff";
      context.font = "700 10px system-ui, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(band.letters[i], (x0 + x1) / 2, bandTop + (BAND_H - 2) / 2 + 0.5);
    }
  }

  let low = 127;
  let high = 0;
  for (const note of piece.notes) {
    if (note[2] < low) low = note[2];
    if (note[2] > high) high = note[2];
  }
  low = Math.max(0, low - 2);
  high = Math.min(127, high + 2);
  const rowH = ROLL_H / (high - low + 1);
  const pitchY = p => rollTop + ROLL_H - (p - low + 1) * rowH;
  context.fillStyle = "#33506e";
  for (const [onset, dur, pitch, velocity] of piece.notes) {
    const x0 = timeX(onset);
    context.globalAlpha = 0.25 + 0.75 * Math.min(1, velocity / 110);
    context.fillRect(x0, pitchY(pitch), Math.max(1, timeX(onset + dur) - x0), Math.max(1.2, rowH - 0.4));
  }
  context.globalAlpha = 1;

  context.lineWidth = 1;
  context.strokeStyle = "#9ea3ac";
  for (const b of band.boundaries_sec) {
    const x = Math.round(timeX(b)) + 0.5;
    context.beginPath();
    context.moveTo(x, rollTop);
    context.lineTo(x, rollTop + ROLL_H);
    context.stroke();
  }
  context.strokeStyle = "#dcdde0";
  context.strokeRect(padLeft + 0.5, rollTop + 0.5, plotW - 1, ROLL_H - 1);

  context.fillStyle = "#f4f5f6";
  context.fillRect(padLeft, pedalTop, plotW, PEDAL_H);
  context.fillStyle = PEDAL_INK;
  context.globalAlpha = 0.55;
  for (const [down, up] of piece.pedal) {
    const x0 = timeX(down);
    context.fillRect(x0, pedalTop + 2, Math.max(1, timeX(up) - x0), PEDAL_H - 4);
  }
  context.globalAlpha = 1;

  context.font = "700 10px system-ui, sans-serif";
  context.textAlign = "right";
  context.textBaseline = "middle";
  if (padLeft > 20) {
    context.fillStyle = "#74777d";
    context.fillText("sections", padLeft - 6, bandTop + BAND_H / 2 - 1);
    context.fillText(`pitch ${low}-${high}`, padLeft - 6, rollTop + ROLL_H / 2);
    context.fillStyle = PEDAL_INK;
    context.fillText("sustain", padLeft - 6, pedalTop + PEDAL_H / 2);
  }

  context.font = "10px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillStyle = "#74777d";
  context.strokeStyle = "#c9cacd";
  const step = duration > 240 ? 60 : duration > 60 ? 30 : 10;
  for (let t = 0; t <= duration; t += step) {
    const x = Math.round(timeX(t)) + 0.5;
    context.beginPath();
    context.moveTo(x, axisTop);
    context.lineTo(x, axisTop + 4);
    context.stroke();
    context.fillText(formatTime(t), x, axisTop + 6);
  }
}

function drawCursor(viewer, time) {
  if (!viewer.layout) return;
  const {ratio, width, padLeft, plotW, duration, totalH, top, bottom} = viewer.layout;
  const context = viewer.cursor.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, totalH);
  if (!(time > 0)) return;
  const x = padLeft + (Math.min(time, duration) / duration) * plotW;
  context.strokeStyle = "#141619";
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(x, top);
  context.lineTo(x, bottom);
  context.stroke();
}

// --- selection and playback ---

function isCurrent(viewer) {
  return current && current.viewer === viewer
    && current.s === viewer.s && current.k === viewer.k;
}

function refreshTiles() {
  for (const viewer of viewers) {
    viewer.tiles.forEach((row, s) => row.forEach((tile, k) => {
      const loaded = current && current.viewer === viewer && current.s === s && current.k === k;
      tile.classList.toggle("selected", viewer.s === s && viewer.k === k);
      tile.classList.toggle("playing", Boolean(loaded) && !audio.paused);
      tile.querySelector(".play").textContent = loaded && !audio.paused ? "❚❚" : "▶";
    }));
  }
}

function updateStatus(viewer) {
  const system = viewer.prompt.systems[viewer.s];
  const seed = system.seeds[viewer.k];
  const time = isCurrent(viewer) ? audio.currentTime : 0;
  viewer.status.textContent = `${system.label} · k${viewer.k} — ${system.source}/`
    + `${seed.name} · ${formatTime(time)} / `
    + `${formatTime(seed.audio_sec)} · ${seed.n_notes} notes`;
}

async function open(viewer, s, k) {
  viewer.s = s;
  viewer.k = k;
  refreshTiles();
  updateStatus(viewer);
  viewer.stack.classList.remove("empty");
  const piece = await loadPiece(viewer.prompt.systems[s].seeds[k].piece);
  if (viewer.s !== s || viewer.k !== k) return;
  viewer.piece = piece;
  draw(viewer);
  drawCursor(viewer, isCurrent(viewer) ? audio.currentTime : 0);
}

function play(viewer, s, k, at) {
  const same = current && current.viewer === viewer && current.s === s && current.k === k;
  if (!same) {
    if (current) drawCursor(current.viewer, 0);
    current = {viewer, s, k};
    audio.src = viewer.prompt.systems[s].seeds[k].audio;
  }
  if (at !== undefined) audio.currentTime = at;
  audio.play();
  open(viewer, s, k);
}

function tick() {
  if (current) {
    drawCursor(current.viewer, audio.currentTime);
    updateStatus(current.viewer);
  }
  frame = audio.paused ? null : requestAnimationFrame(tick);
}

audio.addEventListener("play", () => {
  refreshTiles();
  if (frame === null) frame = requestAnimationFrame(tick);
});
audio.addEventListener("pause", refreshTiles);
audio.addEventListener("ended", refreshTiles);
audio.addEventListener("seeked", () => { if (current) drawCursor(current.viewer, audio.currentTime); });

// --- picks ---

function savePicks() {
  localStorage.setItem(PICKS_KEY, JSON.stringify(picks));
  const ordered = {};
  let count = 0;
  for (const prompt of prompts) {
    const row = picks[prompt.id] || {};
    const entry = {};
    for (const system of prompt.systems) {
      if (row[system.key] !== undefined) {
        entry[system.key] = row[system.key];
        count += 1;
      }
    }
    if (Object.keys(entry).length) ordered[prompt.id] = entry;
  }
  document.getElementById("pick-count").textContent =
    `${count}/${prompts.length * N_SYSTEMS} picked`;
  document.getElementById("picks-json").value = JSON.stringify(ordered, null, 1);
}

document.getElementById("copy-picks").addEventListener("click", () => {
  const text = document.getElementById("picks-json").value;
  const status = document.getElementById("copy-status");
  navigator.clipboard.writeText(text).then(
    () => { status.textContent = "copied"; },
    () => { status.textContent = "clipboard blocked: copy from the box"; },
  );
});

// --- page ---

function chip(label, value) {
  const node = el("span", "chip");
  node.append(el("b", "", label), document.createTextNode(value));
  return node;
}

function buildPrompt(prompt) {
  const section = el("section", "prompt");
  section.id = prompt.id;

  const head = el("header", "prompt-head");
  const title = el("h2");
  title.append(el("span", "index", prompt.id.slice(1)), prompt.title,
               el("small", "sample", `${prompt.id} · ${prompt.name}`));
  const imagery = el("blockquote", "imagery", prompt.imagery);
  const chips = el("div", "chips");
  chips.append(chip("key", prompt.key), chip("tempo", prompt.tempo),
               chip("emotion", prompt.emotion), chip("genre", prompt.genre),
               chip("accompaniment", prompt.accompaniment),
               chip("performance", prompt.performance));
  head.append(title, imagery, chips);

  const status = el("div", "viewer-status", "nothing open — click a tile");
  const stack = el("div", "roll-stack empty");
  const canvas = el("canvas");
  const cursor = el("canvas", "cursor");
  stack.append(canvas, cursor);

  const viewer = {prompt, s: -1, k: -1, piece: null, canvas, cursor, stack,
                  status, layout: null, tiles: []};
  viewers.push(viewer);

  stack.addEventListener("click", event => {
    if (!viewer.layout || viewer.s < 0) return;
    const rect = stack.getBoundingClientRect();
    const fraction = (event.clientX - rect.left - viewer.layout.padLeft) / viewer.layout.plotW;
    play(viewer, viewer.s, viewer.k, Math.min(Math.max(fraction, 0), 1) * viewer.layout.duration);
  });

  const grid = el("div", "grid");
  prompt.systems.forEach((system, s) => {
    const row = el("div", "grid-row");
    row.append(el("div", "row-label", system.label));
    const tiles = el("div", "tiles");
    if (system.pending) {
      tiles.append(el("div", "pending",
        `pending — ${system.present} MIDI files in ${system.source}`));
    }
    viewer.tiles.push(system.seeds.map(seed => {
      const k = seed.k;
      const tile = el("div", "tile");
      const button = el("button", "play", "▶");
      button.type = "button";
      button.title = "play / pause";
      button.addEventListener("click", event => {
        event.stopPropagation();
        if (current && current.viewer === viewer && current.s === s && current.k === k
            && !audio.paused) {
          audio.pause();
        } else {
          play(viewer, s, k);
        }
      });
      const label = el("span", "tile-label", `${TILE_TAGS[system.key]} · k${k}`);
      const duration = el("span", "tile-dur", formatTime(seed.audio_sec));
      const pick = el("label", "pick");
      const radio = el("input");
      radio.type = "radio";
      radio.name = `pick-${prompt.id}-${system.key}`;
      radio.checked = (picks[prompt.id] || {})[system.key] === k;
      radio.addEventListener("change", () => {
        picks[prompt.id] = picks[prompt.id] || {};
        picks[prompt.id][system.key] = k;
        savePicks();
      });
      pick.addEventListener("click", event => event.stopPropagation());
      pick.append(radio, "pick");
      tile.append(button, label, duration, pick);
      tile.addEventListener("click", () => open(viewer, s, k));
      tiles.append(tile);
      return tile;
    }));
    row.append(tiles);
    grid.append(row);
  });

  section.append(head, status, stack, grid);
  document.getElementById("prompts").append(section);
}

prompts.forEach(buildPrompt);
savePicks();

window.addEventListener("resize", () => {
  for (const viewer of viewers) {
    if (!viewer.piece) continue;
    draw(viewer);
    drawCursor(viewer, isCurrent(viewer) ? audio.currentTime : 0);
  }
});
