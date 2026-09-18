# dit_shift_pretrain_v1_uncond

Listening page for six samples from `dit_shift_pretrain_v1/final` (shifted noise
schedule pretrain stage; EMA weights, guidance 3.0, 50 Euler steps, seed 101;
key, tempo, section plan and length borrowed from pretrain validation pieces).
Sources: MIDI + sidecars copied into `generated/` from
`/home/mingyang/all_models/music_generation/dit_shift_pretrain_v1/samples_final/generated/`.
Rebuild (renders `audio/`, rewrites `data.js`):
`ionice -c3 nice -n 10 env OMP_NUM_THREADS=4 /home/mingyang/miniconda3/envs/music_gen/bin/python3.11 demos/dit_shift_pretrain_v1_uncond/build.py`
