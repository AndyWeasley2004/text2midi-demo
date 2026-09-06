# Judge check — accompaniment & performance

Listening page for comparing the four attribute-judge variants on the same
best-of-8 demo generations. Each card is one demo prompt, with the Rank 1/2/3
tabs, player, pianoroll, pedal strip and section band of
`demos/lyria_sft_v2_bestofk/`. Under each candidate's roll a table gives the
prompt's accompaniment and performance in the first row, then what each judge
variant reads back (`value (prob)`, green ✓ if it matches the prompt, red ✗ if
not). Emotion and genre are in `data.js` but not shown, to keep the table short.

Judge variants: CLaMP 3 (previous judge), CLaMP 3 + Aria (current judge),
symbolic descriptors, CLaMP 3 + Aria + descriptors.

Inputs:
- `predictions.json` — per-piece, per-judge predictions from `predict.py`.
- `demos/lyria_sft_v2_bestofk/data.js` plus its `audio/` and `generated/`
  assets, copied into this directory (relative paths `audio/<piece_id>.mp3`,
  `generated/<piece_id>.mid`).

Rebuild:

```bash
PYTHONPATH=/home/m5yao/controllable_generation python demos/judge_check/predict.py
python demos/judge_check/build.py
```
