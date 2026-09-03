# Conditional samples — `midi_gen_weak_sft_v2/final` (T 0.98)

Second sampling cohort: the **same** five hand-written conditioning prompts x
the same three seeds (101/102/103) as `demos/weak_sft_v2_cond/`, resampled at
temperature 0.98 instead of 0.95 (everything else identical). From the
finished weak-SFT v2 checkpoint (0.89B, 25 ms time resolution, 4,096-token
context), with the canvas pianoroll (synced playhead, click-to-seek, sustain
pedal both drawn and audible).

One card per prompt; the three seeds are tabs on the card. The card header
shows the four controlled attributes (emotion, genre, accompaniment,
performance), the free-text sentiment, the prompted key and the tempo class.
The model's **section plan is deliberately not in the header text** — it is
rendered only inside the roll, as translucent colored spans with the section
letter, one span per plan run (each planned window is 5 s, starting at t=0).

## Generation

```bash
CUDA_VISIBLE_DEVICES=4 python -m inference.weak_sft_cond.generate_demo \
  --model-dir /graft3/checkpoints/m5yao/text2music/midi_gen_weak_sft_v2/final \
  --temperature 0.98 --output-dir demos/weak_sft_v2_cond_t98
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
  python demos/weak_sft_v2_cond_t98/build.py
```

`LD_PRELOAD` is required because the conda `libffi` shadows the system one the
FluidSynth ctypes binding needs.
