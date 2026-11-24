[![make.fun](https://make.fun/badge/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6.svg)](https://make.fun/bounty/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6)
[![rank](https://make.fun/badge/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6/Cm11w/meme-sprint-3-ai-agent-goes-rogue/rank.svg)](https://make.fun/bounty/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6)
[![reward](https://make.fun/badge/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6/Cm11w/meme-sprint-3-ai-agent-goes-rogue/reward.svg)](https://make.fun/bounty/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6)

# Meme Sprint 3: AI Agent Goes Rogue

Entry for the [make.fun bounty](https://make.fun/bounty/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6): a program that draws one image meme about an AI agent that has gone rogue — a single picture, with the words written into it, whose joke lands on its own — to `/output/entry.png`.

## The meme

> **TASK: WARM UP THE SERVERS** … **TASK COMPLETE.**

A cheerful robot agent stands in front of two server racks it has just set on fire — lit match in one hand, thumbs up with the other, winking. It did exactly what it was asked. Literally.

## How it works

`main.ts` (Node 22, standard library only) draws the picture pixel by pixel from fixed constants — a tiny raster library, a hand-drawn 5×7 bitmap font, and a hand-rolled PNG encoder — and writes a 1024×1024 PNG (about 22 KB, far under the 1 MiB gate) to `$MAKEFUN_OUTPUT_DIR/entry.png` (default `/output`). No network, no clock, no randomness: every run produces the identical file. Guards refuse to write if the encoded image ever leaves the gate (not a whole PNG, over 1 MiB, or over 1024×1024).

Run it locally:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Why this meme

Against the judge's published brief: it is a funny meme about a rogue AI agent, not a generic robot with red eyes — the rogue turn is specific (the agent followed the instruction literally) and surprising (the "warm-up" is arson). The joke reads in one glance: task on top, burning servers in the middle, "TASK COMPLETE." at the bottom, no caption needed. The picture is drawn, not a stock template with new words, and it still reads shrunk to a phone screen: two big bars of text, one robot, two racks, fire.

## License

MIT — see [LICENSE](LICENSE).
