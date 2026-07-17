# Whisperways demo script

### SHOT hook
- target: dashboard
- url: /?demo=1
- narration: In 1927, the Spirit of St. Louis proved a flying machine could cross an ocean. This challenge asks what the next hundred years of flight look like. Here is our answer. The second century of flight will not be won over oceans. It will be won over neighborhoods.
- action: goto url="/?demo=1"
- action: wait ms=4500

### SHOT problem
- target: dashboard
- narration: Electric air taxis are real, and they are coming to Los Angeles. But the thing that decides whether they fly is not range or battery. It is noise. Vertiport approvals, certification, and community opposition all hinge on one question. Who hears these aircraft, and how loudly?
- action: goto url="/?demo=1"
- action: wait ms=3500

### SHOT product
- target: dashboard
- narration: This is Whisperways. It plans eVTOL corridors by the people underneath them. Give it two vertiports, and it returns the direct route and the quiet route, with the human cost of each.
- action: goto url="/?demo=1"
- action: wait ms=2500
- action: highlight selector="aside header"

### SHOT corridors
- target: dashboard
- narration: LAX to Hollywood Burbank, night operations. The amber line is the direct route. Eight and a half minutes of flying, audible to about two hundred twenty one thousand people. The teal line is the quiet corridor the engine found.
- action: goto url="/?demo=1"
- action: wait ms=4000

### SHOT metrics
- target: dashboard
- narration: Here is the trade. Four extra minutes of flight time. One hundred seventy thousand fewer people under audible noise. An eighty nine percent cut in population noise exposure.
- action: goto url="/?demo=1"
- action: wait ms=2800
- action: highlight selector="[data-focus='metrics']"

### SHOT how
- target: dashboard
- narration: Under the hood there is no magic. Real United States Census population, rasterized over the city. Published eVTOL acoustics from NASA and Joby flight tests. And a router that trades meters of detour against person-decibels of exposure.
- action: goto url="/?demo=1"
- action: wait ms=3200

### SHOT day-night
- target: dashboard
- narration: Ambient matters. By day the city is louder, and the audible footprint shrinks. By night the same corridor reaches ten times more people. Whisperways plans for both, because approvals are won and lost at night.
- action: goto url="/?from=lax&to=bur&scenario=day"
- action: wait ms=2500
- action: click selector="[data-focus='controls'] button"
- action: wait ms=4000

### SHOT live-plan
- target: dashboard
- narration: It plans any pair live. Union Station to Santa Monica. One click, about a second of compute, and the quiet corridor cuts exposure by eighty three percent.
- action: goto url="/?from=dtla&to=smo"
- action: wait ms=3000
- action: click selector="[data-focus='controls'] button"
- action: wait ms=4500

### SHOT brief-intro
- target: dashboard
- narration: Numbers alone do not win a neighborhood council. So Whisperways drafts the document operators actually need.
- action: goto url="/?demo=1"
- action: wait ms=2500
- action: highlight selector="[data-focus='brief']"

### SHOT brief
- target: dashboard
- narration: Claude writes a community impact brief grounded only in the engine's output. Fairfax District, West Hollywood, Toluca Lake. What each place hears under each route, stated plainly, with the tradeoff made honest. The AI is forbidden from inventing a single number.
- action: goto url="/?demo=1"
- action: wait ms=2000
- action: highlight selector="[data-focus='brief']"

### SHOT engineering
- target: dashboard
- narration: The engine is pure, tested TypeScript. Twenty eight tests cover the acoustics, the routing, and real-city acceptance. The model is first-order and labeled as such, because honesty is a feature.
- action: goto url="/?demo=1"
- action: wait ms=2200
- action: highlight selector="aside footer"

### SHOT vision
- target: dashboard
- narration: Scale this beyond Los Angeles and quiet corridors become infrastructure. A noise budget for every city block, planned before the first vertiport is approved. Regulators get evidence. Operators get approvals. Neighborhoods get their sleep.
- action: goto url="/?demo=1"
- action: wait ms=2800

### SHOT sixty-seconds
- target: dashboard
- narration: And you can try this yourself in sixty seconds. Open whisperways dot vercel dot app, press plan corridors, and generate a brief. Everything you just watched is live, open source, and computed on the spot.
- action: goto url="/"
- action: wait ms=2500
- action: highlight selector="[data-focus='controls']"

### SHOT close
- target: dashboard
- narration: The Spirit of St. Louis carried one pilot who could barely see forward. The next century carries all of us, over homes that never asked for the noise. Whisperways plans flight that neighborhoods can live under. Built with Claude, for the HTCJ Aviation Futures Challenge.
- action: goto url="/?demo=1"
- action: wait ms=3500
