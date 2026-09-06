# Conditional samples — `midi_gen_lyria_dpo_r1/final`

Same page and prompts as `demos/lyria_sft_v2_cond/` (the five `prompts.json`
prompts x seeds 101/102/103, identical attributes, keys, tempo classes and
sentiment sentences), sampled from the DPO round-1 policy: Lyria SFT v2 final
trained one epoch on 1,000 CLaMP 3 preference pairs (per-prompt best vs worst
by the z-scored sentiment + tuple-prototype score, key/tempo soft penalty
λ = 0.5 on the chosen side, margin ≥ 1.5; β 0.1, lr 5e-7, 62 steps — see the
plan-doc entry of 2026-09-05). Compare card by card against the SFT page.

## Generation

```bash
CUDA_VISIBLE_DEVICES=0 python -m inference.weak_sft_cond.generate_demo \
  --model-dir /graft3/checkpoints/m5yao/text2music/midi_gen_lyria_dpo_r1/final \
  --output-dir demos/lyria_dpo_r1_cond \
  --prompts-json demos/lyria_dpo_r1_cond/prompts.json
LD_PRELOAD=/lib/x86_64-linux-gnu/libffi.so.7 OMP_NUM_THREADS=8 \
  python demos/lyria_dpo_r1_cond/build.py
```

Sampling settings and layout are those of the SFT page's README.
