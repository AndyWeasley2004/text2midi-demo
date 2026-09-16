# Latent DiT — weak stage, conditional samples, no CFG

Conditional cohort from the **latent DiT weak stage** (`dit_weak_v1`): the
397.2M-parameter DiT (`docs/DIT_PLAN.md`) trained for 120K steps on the weak
corpus in the window-VAE latent space (one 128-d latent per second, rectified
flow, 192 s canvas). Samples come from the `dit_weak_v1/final` **EMA** weights
with **classifier-free guidance disabled** (cfg 1.0) and 50 Euler steps, seeds
101/102/103, and are decoded back to MIDI through the grammar-constrained
decoder `inference/latent_decode.py`. Rendered with the canvas pianoroll
(synced playhead, click-to-seek, sustain pedal both drawn and audible).

This page holds the **same 15 prompt×seed rows** as `demos/dit_weak_v1_cond/`
— identical prompts, section plans, lengths, seeds and checkpoint — resampled
with guidance off, so the two pages form an A/B listening comparison of what
classifier-free guidance contributes at the weak stage. Each page links to the
other in its page note.

The prompts are **identical to the AR middle/Lyria demos** — the same five
attribute/key/tempo prompts and the same plainer, attribute-aligned sentiment
sentences (see `prompts.json`), so the three pages are directly comparable.

Unlike the AR model, the DiT takes the **section plan and the piece length as a
time-aligned input** rather than generating them, so each prompt borrows its
plan and length from a Lyria validation piece with the same emotion and genre:

| prompt | attributes | borrowed from | length | plan |
| --- | --- | --- | --- | --- |
| 1 | happy · pop | `sample_001071` | 105 s | A B C B |
| 2 | sad · classical | `sample_000018` | 160 s | A B C D E |
| 3 | calm · jazz | `sample_001082` | 150 s | A B C D C E |
| 4 | angry · classical | `sample_005379` | 150 s | A B C B D |
| 5 | anxious · pop | `sample_005294` | 130 s | A B C D |

One card per prompt; the three seeds are tabs on the card. The card header
shows the four controlled attributes (emotion, genre, accompaniment,
performance), the free-text sentiment, the prompted key and the tempo class.
The section plan is **deliberately not in the header text** — it is rendered
only inside the roll, as translucent colored spans with the section letter, one
span per plan run (each plan window is 5 s, starting at t=0).

## Generation

```bash
python -m inference.sample_dit \
  --model-dir /graft3/checkpoints/m5yao/text2music/dit_weak_v1/final \
  --prompts-json demos/dit_weak_v1_cond_cfg1/prompts.json \
  --n-seeds 3 \
  --cfg 1.0 \
  --output-dir demos/dit_weak_v1_cond_cfg1
```

The cohort was actually produced by a scratch driver equivalent to the command
above; the driver differed only in moving the Qwen sentiment encoder to CPU so
the run fit on a nearly full GPU. Attributes, key and tempo enter as
AdaLN-Zero conditioning, the section plan and the piece length as time-aligned
inputs, and each prompt's sentiment sentence is encoded at generation time with
frozen Qwen3-Embedding-4B (same recipe as
`preprocessing/precompute_qwen_sentiment.py`) and read by cross-attention.

## Layout

```
prompts.json                     five conditioning prompts (attributes, key,
                                 tempo, sentiment) plus the borrowed piece name
generated/<piece>_k<i>.mid       sample (pedal included), i = 0..2 for seeds 101..103
generated/<piece>_k<i>.json      sidecar: 4 attributes, key, tempo, sentiment,
                                 seed, plan, n_windows, complete, cfg, steps,
                                 n_generated_tokens, ended_naturally
build.py                         renders mp3, extracts notes + pedal spans,
                                 writes data.js
audio/<piece>_k<i>.mp3           rendered by build.py (gitignored)
```

## Rebuild

```bash
LD_PRELOAD=/lib/x86_64-linux-gnu/libffi.so.7 OMP_NUM_THREADS=8 \
  python demos/dit_weak_v1_cond_cfg1/build.py
```

`LD_PRELOAD` is required because the conda `libffi` shadows the system one the
FluidSynth ctypes binding needs.
