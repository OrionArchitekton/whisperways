# Operator submission checklist (Dan)

Everything is staged. The only step the agent could not do is the Devpost
Create-project click, which is invisible-reCAPTCHA gated and re-challenges every
automated click. In your normal logged-in browser it passes instantly. Target
submitting today or tomorrow, not deadline day (Jul 21, 2026 5:00pm PDT).

## Already done and verified

- Live app: https://whisperways.vercel.app (identity + live AI brief + rate limit all verified)
- Repo: https://github.com/OrionArchitekton/whisperways (public, MIT, frozen at the REVIEW_VERDICT commit)
- YouTube video PUBLISHED and public: https://youtu.be/pAYEz0GL6KQ (oembed title verified logged-out)
- Dual-engine adversarial review complete: SAFE TO SUBMIT (docs/submission/REVIEW_VERDICT.md)

## Your steps (about 5 minutes)

1. Go to https://devpost.com/submit-to/30539-htcj-aviation-futures-innovation-challenge/manage/submissions
   and click **Create project** (pass the reCAPTCHA when it appears).
2. Paste these fields (full copy in docs/submission/DEVPOST.md):
   - Name: **Whisperways**
   - Tagline: **Noise-aware eVTOL corridors: route flight by who hears it**
   - "What it does" / story: paste the "Project story" section of DEVPOST.md.
   - Built with: `nextjs, typescript, maplibre-gl, anthropic-claude, vercel, upstash, census-data`
   - "Try it out" links: https://whisperways.vercel.app and https://github.com/OrionArchitekton/whisperways
3. Video demo link: **https://youtu.be/pAYEz0GL6KQ**
4. Upload the 5 images from `docs/screenshots/` in numeric order; captions are in
   docs/submission/SCREENSHOT_CAPTIONS.md (each already under Devpost's 140-char limit).
5. Optional but recommended: attach the Judges' Technical Brief PDF
   (`docs/Whisperways - Judges Technical Brief.pdf`) and the thumbnail (`docs/thumbnail.png`).
6. Submit to the challenge (it is preselected since you started from its manage page).
7. After submit: open the submission URL in a private/logged-out window and confirm it 200s.

## Side deadlines

None. Single non-cash prize, no separate credit/perk forms. The only clock is the
Jul 21 5:00pm PDT submission deadline.

## Notes

- The video is 3:49, inside Devpost's 3-5 min requirement.
- Do not edit the repo after submitting (freeze is intentional for provenance).
- The demo mode's frozen result is disclosed in README and the video description.
