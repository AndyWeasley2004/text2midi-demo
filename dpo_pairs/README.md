# DPO pair candidates — chosen vs rejected by CLaMP3 selection

Inspection page for the preference pairs a CLaMP-DPO round would use. Pairs
follow the NotaGen CLaMP-DPO rule: within one prompt's K samples, the highest
`selection_score` is the chosen sample and the lowest is the rejected one.
Nothing here has been trained on — the page exists to look at the pairs first.

Cards are the `--n` prompts with the largest margin (best minus worst selection
score), largest first. Each card carries the prompt (four controlled
attributes, key, tempo class, sentiment) and the margin in its header, then two
rolls side by side — `Chosen (rank 1 of K)` on the left, `Rejected (rank K of
K)` on the right — each with its own audio element and score line. Below 1080px
the two rolls stack. Player, pedal strip, section-plan spans and styling are
those of `demos/lyria_sft_v2_cond/`; only one roll plays at a time across the
whole page.

## Inputs

One or more scored cohort directories, concatenated (the Lyria val cohort is
split across `cohort/lyria_a` and `cohort/lyria_b`):

```
<cohort>/generated/<piece_id>.mid    sample (pedal included)
<cohort>/generated/<piece_id>.json   sidecar: 4 attributes, key, tempo,
                                     sentiment, seed, n_generated_tokens,
                                     ended_naturally, plan, emitted_sections
<cohort>/scores.parquet              written by `evaluation.score_cohort`;
                                     used columns: piece_id, prompt_name, seed,
                                     n_tokens, ended_naturally, selection_score,
                                     clamp3_text_cos, clamp3_tuple_cos,
                                     clap_score, key_match, tempo_match,
                                     judge_<field>, judge_<field>_match
```

## Build

```bash
LD_PRELOAD=/usr/lib/x86_64-linux-gnu/libffi.so.7 OMP_NUM_THREADS=8 \
  python demos/dpo_pairs/build.py \
    --cohort /graft3/datasets/m5yao/text2music/evaluation/cohort/lyria_a \
             /graft3/datasets/m5yao/text2music/evaluation/cohort/lyria_b \
    --n 10
```

`LD_PRELOAD` is required because the conda `libffi` shadows the system one the
FluidSynth ctypes binding needs. The builder prints the selected prompts with
their margins and both endpoints, copies each kept `.mid` into `generated/`,
renders it to `audio/<piece_id>.mp3`, and writes `data.js`.

## Layout

```
build.py                    picks the largest-margin prompts, renders mp3,
                            writes data.js
data.js                     one entry per pair, each with `chosen` and `rejected`
generated/<piece_id>.mid    copied from the cohort so the page is self-contained
audio/<piece_id>.mp3        rendered by build.py (gitignored)
index.html, app.js, styles.css
```
