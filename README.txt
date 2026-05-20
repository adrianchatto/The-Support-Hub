The Hub suite promotional video assets

Company name used in final hub: Your Company

Generated files:
- service-desk.png
- human-hub.png
- project-hub.png
- customer-hub.png
- insight-hub.png
- the-hub-suite-promo-quicktime.mp4
- the-hub-suite-promo.mp4
- the-hub-suite-promo.webm

Use the QuickTime version if sending to someone on macOS. The MP4 files include a generated background music bed after the Swift encode step.

To update wording or the company name, edit promo/build_promo_video.cjs and rerun:
NODE_PATH=/Users/adrianchatto/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/adrianchatto/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node promo/build_promo_video.cjs

To rebuild the QuickTime-compatible version with music:
NODE_PATH=/Users/adrianchatto/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/adrianchatto/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node promo/build_promo_video.cjs --frames
swift promo/encode_quicktime.swift promo/output/frames promo/output/the-hub-suite-promo-quicktime.mp4 30 780