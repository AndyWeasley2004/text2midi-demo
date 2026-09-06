# Conditional samples — `midi_gen_lyria_dpo_r2/final`

Same page and prompts as `demos/lyria_sft_v2_cond/` (the five `prompts.json`
prompts x seeds 101/102/103, identical attributes, keys, tempo classes and
sentiment sentences), sampled from the DPO round-2 policy: the round-1 recipe with one change,
the rejected piece of every pair must have lower Audiobox production quality
(PQ) than the chosen one (see the plan-doc entry of 2026-09-06). Compare card by card against the SFT page.

## Generation

```bash
CUDA_VISIBLE_DEVICES=0 python -m inference.weak_sft_cond.generate_demo \
  --model-dir /graft3/checkpoints/m5yao/text2music/midi_gen_lyria_dpo_r2/final \
  --output-dir demos/lyria_dpo_r2_cond \
  --prompts-json demos/lyria_dpo_r2_cond/prompts.json
LD_PRELOAD=/lib/x86_64-linux-gnu/libffi.so.7 OMP_NUM_THREADS=8 \
  python demos/lyria_dpo_r2_cond/build.py
```

Sampling settings and layout are those of the SFT page's README.
