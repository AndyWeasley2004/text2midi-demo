"use strict";

const prompts = window.PROMPTS || [];
const contents = document.getElementById("contents");
const cards = document.getElementById("cards");

const SECTION_COLORS = {
  A: "#7256b8", B: "#2b7bb9", C: "#2e8b6d", D: "#b8892b",
  E: "#b3453f", F: "#8a5aa8", G: "#3f7f96", H: "#7d7a34",
};
const PEDAL_INK = "#c2601f";
const PAD_LEFT = 124;
const PAD_RIGHT = 12;
const ROLL_H = 230;
const PEDAL_H = 16;
const AXIS_H = 20;

// one live view per card; the seed tab swaps the view's piece in place
const views = [];

function formatTime(seconds) {
  const value = Math.max(0, Math.round(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

function sectionColor(letter) {
  return SECTION_COLORS[String(letter).trim().charAt(0).toUpperCase()] || "#6d7582";
}

function caption(context, text, y, color) {
  const lines = Array.isArray(text) ? text : [text];
  context.font = "700 10px system-ui, sans-serif";
  context.fillStyle = color;
  context.textAlign = "right";
  context.textBaseline = "middle";
  lines.forEach((line, i) => {
    context.fillText(line, PAD_LEFT - 8, y + (i - (lines.length - 1) / 2) * 12);
  });
  context.textAlign = "left";
}

function draw(view) {
  const {piece, canvas, cursor} = view;

  const rollTop = 0;
  const pedalTop = rollTop + ROLL_H + 2;
  const axisTop = pedalTop + PEDAL_H;
  const totalH = axisTop + AXIS_H;

  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(320, Math.floor(canvas.parentElement.clientWidth));
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(totalH * ratio);
  canvas.style.height = `${totalH}px`;
  cursor.width = canvas.width;
  cursor.height = canvas.height;
  cursor.style.height = `${totalH}px`;

  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, totalH);

  const plotW = width - PAD_LEFT - PAD_RIGHT;
  // the plan covers whole 5 s windows, which can outlast the last note
  const planEnd = piece.band.ends_sec.length
    ? piece.band.ends_sec[piece.band.ends_sec.length - 1] : 0;
  const duration = Math.max(1, piece.duration_sec, planEnd);
  const timeX = t => PAD_LEFT + (Math.min(Math.max(t, 0), duration) / duration) * plotW;
  view.layout = {ratio, width, plotW, duration, totalH, top: rollTop, bottom: axisTop};

  // --- pianoroll ground, with the section plan as background spans ---
  context.fillStyle = "#ffffff";
  context.fillRect(PAD_LEFT, rollTop, plotW, ROLL_H);
  for (let i = 0; i < piece.band.letters.length; i += 1) {
    const x0 = timeX(piece.band.starts_sec[i]);
    const x1 = timeX(piece.band.ends_sec[i]);
    const w = Math.max(1, x1 - x0);
    context.globalAlpha = 0.13;
    context.fillStyle = sectionColor(piece.band.letters[i]);
    context.fillRect(x0, rollTop, w, ROLL_H);
    context.globalAlpha = 1;
    if (w > 14) {
      context.fillStyle = sectionColor(piece.band.letters[i]);
      context.font = "700 12px system-ui, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "top";
      context.fillText(piece.band.letters[i].charAt(0), (x0 + x1) / 2, rollTop + 5);
      context.textAlign = "left";
    }
  }

  let low = 127;
  let high = 0;
  for (const note of piece.notes) {
    if (note[2] < low) low = note[2];
    if (note[2] > high) high = note[2];
  }
  if (low > high) { low = 21; high = 108; }
  low = Math.max(0, low - 2);
  high = Math.min(127, high + 2);
  const span = Math.max(1, high - low + 1);
  const rowH = ROLL_H / span;
  const pitchY = p => rollTop + ROLL_H - (p - low + 1) * rowH;

  for (const [onset, dur, pitch, velocity] of piece.notes) {
    const x0 = timeX(onset);
    const x1 = timeX(onset + dur);
    context.globalAlpha = 0.25 + 0.75 * Math.min(1, velocity / 110);
    context.fillStyle = "#33506e";
    context.fillRect(x0, pitchY(pitch), Math.max(1, x1 - x0), Math.max(1.2, rowH - 0.4));
  }
  context.globalAlpha = 1;

  // --- section boundaries drawn over the roll ---
  context.lineWidth = 1.2;
  for (const b of piece.band.boundaries_sec) {
    const x = Math.round(timeX(b)) + 0.5;
    context.strokeStyle = "#9ea3ac";
    context.beginPath();
    context.moveTo(x, rollTop);
    context.lineTo(x, rollTop + ROLL_H);
    context.stroke();
  }

  context.lineWidth = 1;
  context.strokeStyle = "#dcdde0";
  context.strokeRect(PAD_LEFT + 0.5, rollTop + 0.5, plotW - 1, ROLL_H - 1);
  caption(context, `pitch ${low}-${high}`, rollTop + ROLL_H / 2, "#74777d");

  // --- sustain pedal lane ---
  context.fillStyle = "#f4f5f6";
  context.fillRect(PAD_LEFT, pedalTop, plotW, PEDAL_H);
  context.fillStyle = PEDAL_INK;
  for (const [down, up] of piece.pedal) {
    const x0 = timeX(down);
    const x1 = timeX(up);
    context.globalAlpha = 0.55;
    context.fillRect(x0, pedalTop + 2, Math.max(1, x1 - x0), PEDAL_H - 4);
    context.globalAlpha = 1;
  }
  context.strokeStyle = "#dcdde0";
  context.strokeRect(PAD_LEFT + 0.5, pedalTop + 0.5, plotW - 1, PEDAL_H - 1);
  caption(context, "sustain", pedalTop + PEDAL_H / 2, PEDAL_INK);

  // --- time axis ---
  context.font = "10px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "top";
  context.strokeStyle = "#c9cacd";
  const step = duration > 240 ? 60 : 30;
  for (let t = 0; t <= duration; t += step) {
    const x = Math.round(timeX(t)) + 0.5;
    context.beginPath();
    context.moveTo(x, axisTop);
    context.lineTo(x, axisTop + 4);
    context.stroke();
    context.fillText(formatTime(t), x, axisTop + 6);
  }
  context.textAlign = "left";
}

function drawCursor(view, time) {
  if (!view.layout) return;
  const context = view.cursor.getContext("2d");
  const {ratio, width, plotW, duration, totalH} = view.layout;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, totalH);
  if (!(time > 0)) return;
  const x = PAD_LEFT + (Math.min(time, duration) / duration) * plotW;
  context.strokeStyle = "#141619";
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(x, view.layout.top);
  context.lineTo(x, view.layout.bottom);
  context.stroke();
}

function tick(view) {
  drawCursor(view, view.audio.currentTime);
  view.frame = view.audio.paused ? null : requestAnimationFrame(() => tick(view));
}

function field(label, text, wide) {
  const cell = document.createElement("div");
  cell.className = wide ? "field wide" : "field";
  const name = document.createElement("span");
  name.className = "field-name";
  name.textContent = label;
  const value = document.createElement("code");
  value.textContent = text;
  cell.append(name, value);
  return cell;
}

function renderTabs(view) {
  view.tabs.replaceChildren(...view.prompt.seeds.map((entry, index) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "variant-tab" + (index === view.index ? " active" : "");
    tab.textContent = entry.label;
    tab.setAttribute("aria-pressed", String(index === view.index));
    tab.addEventListener("click", () => {
      if (index === view.index) return;
      view.audio.pause();
      view.index = index;
      selectSeed(view);
    });
    return tab;
  }));
}

function selectSeed(view) {
  view.piece = view.prompt.seeds[view.index];
  renderTabs(view);
  view.subtitle.textContent =
    `${formatTime(view.piece.duration_sec)} · ${view.piece.notes.length} notes · `
    + `${view.piece.n_tokens} decoded tokens · plan ${view.piece.plan_windows}`
    + ` windows (${formatTime(view.piece.plan_sec)})`;
  view.audio.src = view.piece.audio;
  view.midiLink.href = view.piece.midi;
  view.midiLink.textContent = view.piece.midi;
  draw(view);
  drawCursor(view, 0);
}

function buildCard(prompt, position) {
  const card = document.createElement("article");
  card.className = "card";
  card.id = `prompt${prompt.index}`;

  const header = document.createElement("header");
  const headRow = document.createElement("div");
  headRow.className = "head-row";
  const tag = document.createElement("span");
  tag.className = "kind-tag";
  tag.textContent = `dit_shift_weak_v1 / final (EMA) · cfg ${prompt.cfg} · ${prompt.steps} steps`;
  const pos = document.createElement("span");
  pos.className = "position";
  pos.textContent = `${position} / ${prompts.length}`;
  headRow.append(tag, pos);

  const title = document.createElement("h1");
  title.textContent = `prompt ${prompt.index} — ${prompt.emotion} · ${prompt.genre}`;
  const plan = document.createElement("div");
  plan.className = "plan-note";
  plan.textContent = `plan and length borrowed from Lyria validation piece ${prompt.source}`;
  const subtitle = document.createElement("div");
  subtitle.className = "subtitle";

  const tabs = document.createElement("div");
  tabs.className = "variant-tabs";
  tabs.setAttribute("role", "group");
  tabs.setAttribute("aria-label", "Seed");

  const panel = document.createElement("div");
  panel.className = "header-panel";
  panel.append(
    field("emotion", prompt.emotion),
    field("genre", prompt.genre),
    field("accompaniment", prompt.accompaniment),
    field("performance", prompt.performance),
    field("key", prompt.key),
    field("tempo class", prompt.tempo),
  );

  const sentiment = document.createElement("div");
  sentiment.className = "sentiment";
  const sentimentName = document.createElement("span");
  sentimentName.className = "field-name";
  sentimentName.textContent = "sentiment (frozen Qwen3-Embedding-4B states, cross-attention)";
  const sentimentText = document.createElement("p");
  sentimentText.textContent = prompt.sentiment;
  sentiment.append(sentimentName, sentimentText);

  header.append(headRow, title, plan, subtitle, tabs, panel, sentiment);

  const body = document.createElement("div");
  body.className = "piece";
  const audio = document.createElement("audio");
  audio.controls = true;
  audio.preload = "none";
  const stack = document.createElement("div");
  stack.className = "roll-stack";
  const canvas = document.createElement("canvas");
  const cursor = document.createElement("canvas");
  cursor.className = "cursor";
  stack.append(canvas, cursor);
  const foot = document.createElement("div");
  foot.className = "card-foot";
  const midiLink = document.createElement("a");
  midiLink.className = "midi-link";
  foot.append(midiLink);
  body.append(audio, stack, foot);

  card.append(header, body);
  cards.appendChild(card);

  const view = {prompt, index: 0, piece: null, canvas, cursor, audio, tabs,
                subtitle, midiLink, layout: null, frame: null};
  views.push(view);

  stack.addEventListener("click", event => {
    if (!view.layout) return;
    const rect = stack.getBoundingClientRect();
    const fraction = (event.clientX - rect.left - PAD_LEFT) / view.layout.plotW;
    const target = Math.min(Math.max(fraction, 0), 1) * view.layout.duration;
    audio.currentTime = target;
    drawCursor(view, target);
  });
  const start = () => {
    // only one card plays at a time
    views.forEach(other => { if (other !== view) other.audio.pause(); });
    if (view.frame === null) view.frame = requestAnimationFrame(() => tick(view));
  };
  audio.addEventListener("play", start);
  audio.addEventListener("playing", start);
  audio.addEventListener("timeupdate", () => { if (audio.paused) drawCursor(view, audio.currentTime); });
  audio.addEventListener("seeked", () => drawCursor(view, audio.currentTime));
  audio.addEventListener("ended", () => drawCursor(view, audio.currentTime));

  selectSeed(view);
}

prompts.forEach((prompt, index) => {
  const link = document.createElement("button");
  link.className = "piece-link";
  const name = document.createElement("strong");
  name.textContent = `prompt ${prompt.index} · ${prompt.emotion}`;
  const info = document.createElement("small");
  info.textContent = `${prompt.genre} · ${prompt.accompaniment} · ${prompt.key}`;
  link.append(name, info);
  link.addEventListener("click", () => {
    document.getElementById(`prompt${prompt.index}`)
      .scrollIntoView({behavior: "smooth", block: "start"});
  });
  contents.appendChild(link);
  buildCard(prompt, index + 1);
});

window.addEventListener("resize", () => {
  views.forEach(view => {
    draw(view);
    drawCursor(view, view.audio.currentTime);
  });
});
