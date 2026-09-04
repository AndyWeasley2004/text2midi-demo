# Best-of-8 by CLaMP3 selection — `midi_gen_lyria_sft_v2/final`

One card per prompt, showing the top-3 of that prompt's 8 samples ranked by
`selection_score`. The selection score is the mean of the within-prompt
z-scores of the CLaMP 3 text cosine and the CLaMP 3 attribute-prototype
(tuple) cosine, so candidates are only ever ranked against the other samples
of their own prompt.

The card header shows the four controlled attributes, the free-text sentiment,
the prompted key and the tempo class; the tabs are `Rank 1 / Rank 2 / Rank 3`.
Under the roll all three candidates get a score line (the selected one is
highlighted), with `✓`/`✗` for the key, tempo, and each judged attribute
against the prompt. The model's section plan is drawn inside the roll only, as
translucent colored spans, one per plan run (each planned window is 5 s from
t=0). Player, pedal strip and styling are those of `demos/lyria_sft_v2_cond/`.

## Inputs

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
  python demos/lyria_sft_v2_bestofk/build.py \
    --cohort /graft3/datasets/m5yao/text2music/evaluation/demo_bestofk --top 3
```

`LD_PRELOAD` is required because the conda `libffi` shadows the system one the
FluidSynth ctypes binding needs. The builder prints the per-prompt ranking as
it goes, copies each kept `.mid` into `generated/`, renders it to
`audio/<piece_id>.mp3`, and writes `data.js`.

## Layout

```
build.py                    ranks candidates, renders mp3, writes data.js
data.js                     one entry per prompt, each with its kept candidates
generated/<piece_id>.mid    copied from the cohort so the page is self-contained
audio/<piece_id>.mp3        rendered by build.py (gitignored)
index.html, app.js, styles.css
```
