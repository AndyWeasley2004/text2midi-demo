# Conditional samples — `midi_gen_lyria_sft_v2/final`

Conditional cohort from the **Lyria-stage** SFT checkpoint: initialized from
the middle-stage SFT v2 final weights and trained a further 607 steps on the
9,949-piece Lyria corpus. The conditioning prompts are exactly those of
`demos/middle_sft_v2_cond/` — the same `prompts.json`, five prompts x three
seeds (101/102/103), identical attributes, keys, tempo classes and sentiment
sentences — so the two pages are directly comparable. Rendered with the canvas
pianoroll (synced playhead, click-to-seek, sustain pedal both drawn and
audible).

One card per prompt; the three seeds are tabs on the card. The card header
shows the four controlled attributes (emotion, genre, accompaniment,
performance), the free-text sentiment, the prompted key and the tempo class.
The model's **section plan is deliberately not in the header text** — it is
rendered only inside the roll, as translucent colored spans with the section
letter, one span per plan run (each planned window is 5 s, starting at t=0).

## Generation

```bash
CUDA_VISIBLE_DEVICES=4 python -m inference.weak_sft_cond.generate_demo \
  --model-dir /graft3/checkpoints/m5yao/text2music/midi_gen_lyria_sft_v2/final \
  --output-dir demos/lyria_sft_v2_cond \
  --prompts-json demos/lyria_sft_v2_cond/prompts.json
```

Prompt is the two-token `<KEY_*> <TEMPO_*>` header only; the model samples its
own section plan and the music. Attributes enter through `attribute_ids`, and
each prompt's own sentiment sentence is encoded at generation time with frozen
Qwen3-Embedding-4B under the same recipe as
`preprocessing/precompute_qwen_sentiment.py` (same revision, `max_len 64`,
bf16, per-token `last_hidden_state`, pad states dropped). Sampling:
temperature 0.98, top_p 0.98, top_k 0, `max_new_tokens 4094`, `MidiGrammar`
logits processor, EOS = Aria `<E>`.

## Layout

```
prompts.json                       five conditioning prompts (attributes, key,
                                   tempo, sentiment)
generated/prompt<i>_seed<s>.mid    sample (pedal included)
generated/prompt<i>_seed<s>.json   sidecar: 4 attributes, key, tempo, sentiment,
                                   seed, n_generated_tokens, ended_naturally, plan
build.py                           renders mp3, extracts notes + pedal spans,
                                   writes data.js
audio/prompt<i>_seed<s>.mp3        rendered by build.py (gitignored)
```

## Rebuild

```bash
LD_PRELOAD=/lib/x86_64-linux-gnu/libffi.so.7 OMP_NUM_THREADS=8 \
  python demos/lyria_sft_v2_cond/build.py
```

`LD_PRELOAD` is required because the conda `libffi` shadows the system one the
FluidSynth ctypes binding needs.
