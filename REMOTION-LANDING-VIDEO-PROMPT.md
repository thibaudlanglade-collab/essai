# Prompt Remotion — Vidéo Landing Synthèse

> À coller directement dans Claude / Cursor / l'outil qui génère le projet Remotion.
> Le logo sera fourni à part (placeholder `./public/logo-synthese.svg` à remplacer).

---

## Brief global

Create a Remotion video (**1920x1080, 60fps, ~50s / 3000 frames**) for **Synthèse** — a French "sur-mesure" AI assistant that plugs into people's existing tools (Gmail, Outlook, Drive, Excel, Teams, Slack, WhatsApp, CRM, compta…) and turns repetitive office work into automations, features and AI agents.

The video is the first thing visitors see on the landing page. Its only job is to make the **concept click in under a minute**, because Synthèse is conceptually hard to grasp ("ce n'est ni un SaaS standard, ni une agence, c'est un outil sur-mesure assemblé autour de vous").

**Tone**: warm, premium, reassuring, slightly magical — NOT a cold dev-tool demo. Think Linear × Arc × Notion × Apple keynote, filtered through French softness. Pastel gradients, soft shadows, breathing motion, real craft.

**Soundtrack**: soft uplifting cinematic electronic (suggestions: Tundra Beats "Ember", Tom Bro "Ascend", or any upbeat-but-calm lo-fi track). 1s fade-in, 2s fade-out, 35% volume.

### Color palette (light theme — NOT dark)

- `#FAFAFA` — background base (almost white, 2% warm tint)
- `#FFFFFF` — card surfaces
- `#F5F3FF` — violet tint wash
- `#FDF2F8` — pink tint wash
- `#7C3AED` — primary violet (CTA, accents)
- `#8B5CF6` — violet-500 (mid-tone)
- `#EC4899` — fuchsia accent
- `#F472B6` — pink accent
- `#3B82F6` — blue accent (trust, data)
- `#6366F1` — indigo accent
- `#10B981` — emerald (validation, success)
- `#F59E0B` — amber (scenarios, warmth)
- `#111827` — primary text
- `#6B7280` — muted text
- `#E5E7EB` — borders

### Signature gradients (reuse across scenes)

- **Brand gradient**: `linear-gradient(135deg, #7C3AED 0%, #EC4899 50%, #F59E0B 100%)` (violet → pink → amber)
- **Warm card gradient**: `linear-gradient(135deg, #F5F3FF, #FDF2F8, #FFF7ED)`
- **Trust gradient**: `linear-gradient(135deg, #7C3AED, #6366F1, #3B82F6)`
- **Success gradient**: `linear-gradient(135deg, #10B981, #14B8A6, #06B6D4)`

### Typography

- **Display / brand**: `"Instrument Serif"`, italic, for the word **Synthèse** exclusively (the rest of the video stays in Inter — "Synthèse" is the only italic serif, that's part of the brand)
- **UI + body**: `"Inter"` (400, 500, 600, 700)
- **Code / data**: `"JetBrains Mono"` or `"SF Mono"`
- Always `letter-spacing: -0.02em` on headlines ≥ 32px, `-0.01em` on mid titles. Line-height 1.1 on display, 1.5 on body.

### Global motion principles

- All transitions: **spring animations** (`damping: 18, stiffness: 140, mass: 1`) + fade (opacity 0→1) + gentle scale (0.97→1 in, 1→1.02 out).
- Between scenes: 15-frame overlap with cross-fade + 2% scale drift forward.
- Cards, icons, elements: staggered reveal (3 frames between children).
- Subtle floating motion on idle elements (sine wave, ±4px over 180 frames).
- **No harsh cuts**, no fast zooms, no glitches. The video must feel "held", elegant, confident.
- Background: on every scene, a very slow-moving conic gradient (`violet → pink → amber`) at 8% opacity, rotating 0.1deg per frame. Plus animated grain/noise at 3% opacity.

---

## Structure — 12 scenes

Total: ~3420 frames @ 60fps = 57 seconds.

### Scene 1 — Brand open (180 frames / 3s)

Pure white background. Center of the screen.

- Frames 0–30: the Synthèse **logo** fades in + scales up (0.7 → 1) with a gentle spring.
- Frames 30–90: under the logo, the word **Synthèse** types in character by character (1 frame per char) in `Instrument Serif italic`, size 96px, color `#111827`, with a violet-to-pink gradient mask that sweeps left→right across the letters (like sunlight on water).
- Frames 60–120: subtitle fades in below — *"L'IA qui travaille dans vos outils du quotidien."* — 22px Inter 400, `#6B7280`, letter-spacing -0.01em.
- Frames 120–180: three pill badges appear staggered (stagger 6f), centered below the subtitle:
  - `✨ 100% personnalisable` (violet pill)
  - `🛡 RGPD conforme` (green pill)
  - `🇫🇷 Hébergé en France` (blue pill)
- Ambient: 6 floating violet/pink particles drift slowly across the screen (blur 1px, opacity 20%). Very slight radial glow behind the logo that pulses (120f cycle).

Transition out: everything scales to 1.02 + fades to 0 over 20 frames.

### Scene 2 — The problem: isolated boxes (300 frames / 5s)

Title at top (appears frames 0–30, typewriter 1f/char):
> **Aujourd'hui, vos outils ne se parlent pas.**
> (36px Inter 600, `#111827`, centered)

Subtitle below (fades in frames 20–40):
> *Un CRM pour vos clients. Une boîte mail pour vos échanges. Un Drive pour vos documents. Un Excel pour vos chiffres. Chacun dans son coin.*
> (16px Inter 400, `#6B7280`, max-width 640px, centered)

Main visual (frames 30–180): **6 isolated cards** arranged in a loose grid in the center, each representing one siloed tool. Each card is 180×140px, rounded 20px, **2px dashed border**, pastel background, icon + label. Cards appear staggered (every 8 frames).

| Tool | Icon | Border color | Background |
|---|---|---|---|
| Emails | ✉ `Mail` | `#FCA5A5` | `#FEF2F2` |
| Drive | 📂 `FolderOpen` | `#93C5FD` | `#EFF6FF` |
| Excel | 📊 `Sheet` | `#86EFAC` | `#F0FDF4` |
| CRM | 🏢 `Building2` | `#C4B5FD` | `#F5F3FF` |
| Compta | 🧮 `Calculator` | `#FCD34D` | `#FFFBEB` |
| Planning | 📅 `Calendar` | `#A5B4FC` | `#EEF2FF` |

**Key motion (frames 180–270)**: each box **tries to talk** to another. A dotted line tries to reach from one box to another, then **snaps and retracts** with a red "X" briefly flashing in the middle (3 attempts, staggered). This visualizes "les boîtes ne se parlent pas".

Caption at bottom (frames 200–300):
> *Des boîtes fermées, posées les unes à côté des autres, sans connexion.*
> (italic, 14px, `#9CA3AF`)

Transition out: the 6 boxes slide slightly apart (compress toward corners), then fade.

### Scene 3 — The shift: Brain + Arms (300 frames / 5s)

Split screen, left and right panels appearing from opposite sides (spring in).

**Left panel (frames 0–60)** — violet card `#F5F3FF` border `#C4B5FD`, rounded 24px:
- Icon header: `Brain` icon in violet gradient circle
- Title: **"Le cerveau"** (20px semibold)
- Subtitle: *L'intelligence artificielle* (13px violet 500)
- Body (fades in line-by-line, frames 60–120):
  > Un cerveau capable de lire un document de 50 pages en 3 secondes, de comprendre un email en 14 langues, de rédiger une réponse dans votre ton.
- Italic footer (fade in frames 120–150):
  > *Mais un cerveau seul, sans bras, il ne peut rien toucher.*

**Right panel (frames 30–90)** — blue card `#EFF6FF` border `#93C5FD`:
- Icon header: `Cable` icon in blue gradient circle
- Title: **"Les bras"** (20px semibold)
- Subtitle: *Les API et connecteurs* (13px blue 500)
- Body (frames 90–150):
  > Des connecteurs qui permettent au cerveau d'aller chercher dans vos boîtes — votre CRM, votre mail, votre Drive — de prendre l'info, de la traiter, et de la remettre au bon endroit.

**Frames 200–260**: The two panels **slide toward each other** and meet at center. When they touch, a burst of light (radial violet→pink flash, 30f decay) appears. A plus sign morphs into an equals sign.

**Frames 260–300**: big centered text fades in:
> **Cerveau + Bras = un assistant qui peut tout faire.**
> (40px Inter 700, `#111827`, with the last 5 words in the brand gradient)

### Scene 4 — Synthèse: the orbital reveal (360 frames / 6s)

The hero moment. This is where the user understands what Synthèse IS.

**Frames 0–60**: camera-style push-in to a center point on a soft white canvas. A single violet dot pulses (3 pulses) in the exact center. It expands into a **sphere / orb**: 140px, brand gradient (violet→pink→amber), inner glow, soft outer bloom. In the center of the orb, the Synthèse logo (small, 48px, white).

Label below the orb (fade in frames 40–80): **"Synthèse"** in Instrument Serif italic, 56px, with a shimmer gradient sweep.

**Frames 80–200**: **6 tool cards orbit** around the central Synthèse sphere in a radial layout (like a planet system). Each tool card is 90×90px, rounded 20px, white background, colored icon, label below.

Tool positions (polar coordinates, radius 280px):
- 0° (top): **Gmail** `#EA4335`
- 60°: **Drive** `#4285F4`
- 120°: **Excel** `#22C55E`
- 180° (bottom): **Teams** `#818CF8`
- 240°: **Compta** `#F59E0B`
- 300°: **CRM** `#A78BFA`

Cards appear staggered (every 15f) with a spring scale-up from 0.3 to 1, starting from the center sphere position and flying out to their orbit.

**Frames 200–280**: **connection lines** draw from the central sphere to each tool, one by one (each line 20f, stagger 8f). Lines are 1.5px, gradient from violet at the sphere to the tool's color at the endpoint. Along each line, 2 small luminous dots travel from Synthèse → tool → Synthèse (data flowing both ways), looping infinitely.

**Frames 280–360**: the whole system **rotates slowly** (1 full revolution over 4s, never completes in scene) while the camera gently orbits +5° on Y axis (3D perspective tilt). A caption appears at the bottom:
> *Le cerveau au centre, connecté à tous vos outils. Vous lui parlez, il va chercher pour vous.*
> (15px italic, `#6B7280`)

### Scene 5 — 3 pillars: Features / Automations / Agents (360 frames / 6s)

Title at top (frames 0–30):
> **Ce qu'on construit pour vous, en 3 familles.**
> (32px Inter 600, `#111827`)

**Three cards appear side by side (frames 30–120, stagger 20f each)**, equal width, 400×340px, rounded 28px, with deep soft shadow `0 20px 60px -20px rgba(124, 58, 237, 0.15)`.

**Card 1 — Features** (left)
- Gradient bg: `linear-gradient(135deg, #DBEAFE, #CFFAFE, #DBEAFE)`
- Border: 2px `#BFDBFE`
- Icon: `Wrench` in blue circle
- Title: **"Les fonctionnalités"**
- Text: *Des outils que vous connaissez — emails, planning, documents — mais connectés à l'IA et à vos outils via des API.*
- Example (italic, frames 80–140): *« Un planificateur qui lit votre agenda et compose le planning pour vous. »*

**Card 2 — Automations** (center, slightly taller, prominence)
- Gradient bg: `linear-gradient(135deg, #FEF3C7, #FFEDD5, #FEF3C7)`
- Border: 2px `#FDE68A`
- Icon: `Zap` in amber circle (with pulsing glow every 120f)
- Title: **"Les automatisations"**
- Text: *Des règles intelligentes qui tournent 24h/24, sans que vous ayez à intervenir.*
- Example: *« Une facture arrive → extrait les montants, range le PDF, met à jour l'Excel. »*

**Card 3 — AI Agents** (right)
- Gradient bg: `linear-gradient(135deg, #F3E8FF, #FCE7F3, #F3E8FF)`
- Border: 2px `#D8B4FE`
- Icon: `Bot` in violet circle
- Title: **"Les agents IA"**
- Text: *Le niveau supérieur. Une mission, il réfléchit, va chercher, et vous rend un résultat complet.*
- Example: *« Prépare-moi un résumé de l'activité de ce client. » → rapport en 30s.*

**Frames 250–360**: all 3 cards gently levitate (sine wave Y, ±6px, offset phase), and a subtle particle drift moves upward behind them. At frame 280, a thin violet line underlines the card titles in sync (draws left→right, 30f).

### Scene 6 — Boosted features showcase (420 frames / 7s)

**Goal of this scene**: show that the tools Synthèse builds aren't gimmicks — they're the **classic productivity tools you already know** (chat, OCR, transcription, planning, emails, extraction) but **supercharged by AI + connected to your data**. This is where we demonstrate the craft.

Background: soft white with a very subtle violet radial glow that slowly breathes (180f cycle). The previous orbital system has dissolved into this scene.

**Mini-hero header (frames 0–80)**

Frame 0–40: a thin violet underline draws itself left-to-right above the title (120px wide, 2px tall, `#7C3AED`), like a pen stroke.

Then title fades in (spring, slight scale 0.98→1):
> **Des outils que vous connaissez.**
> **Mais dopés à l'IA.**
> (2 lines, 38px Inter 700, `#111827`, leading-tight. Second line has a subtle animated gradient sweep — violet → pink — that passes over the word "dopés" once around frame 60.)

Subtitle below (fade in frames 60–100):
> *Chat, OCR, transcription, planning, extraction — vous connaissez. Sauf qu'ici, chaque outil est branché à vos données et à un vrai cerveau.*
> (16px Inter 400, `#6B7280`, max-width 720px, centered)

**Feature showcase grid (frames 80–380)** — 6 feature cards in a 3×2 grid, each 360×180px, rounded 24px, appearing with spring + staggered delay (every 30f). Each card has:
- A pastel gradient background matching its category
- A colored icon in a rounded square (48px)
- The feature name (18px semibold)
- A **before → after** micro-line that's the "boost" punch
- A tiny micro-animation inside that plays on loop (8–15 frames) to show the magic

**Card 1 — Assistant Synthèse** *(violet)*
- Gradient: `linear-gradient(135deg, #F5F3FF, #EDE9FE)`
- Icon: `MessageSquare` in violet gradient square
- Title: **Assistant Synthèse**
- Boost line: *Un chat → qui parle à tous vos outils en même temps.*
- Micro-anim: a chat bubble types "Quel est mon CA ce mois ?", then 3 answer lines stream in with a spreadsheet icon + a mail icon lighting up in sequence (showing it's cross-sourcing).

**Card 2 — Smart Extract** *(amber)*
- Gradient: `linear-gradient(135deg, #FFFBEB, #FEF3C7)`
- Icon: `Zap` in amber gradient square
- Title: **Smart Extract**
- Boost line: *Un PDF → un tableau structuré, prêt à exploiter.*
- Micro-anim: a stack of PDF pages slides in from the left, a zap bolt flashes, and rows of data pop out to the right as a clean table (3 rows appear staggered).

**Card 3 — Photo → PDF / Excel** *(blue)*
- Gradient: `linear-gradient(135deg, #EFF6FF, #DBEAFE)`
- Icon: `Camera` in blue gradient square
- Title: **Photo → PDF / Excel**
- Boost line: *Une photo prise à la volée → un document propre, jamais retapé.*
- Micro-anim: a phone snapping a crumpled handwritten note (flash effect), then the note morphs through a grid scan into a pristine PDF and a pristine Excel side by side.

**Card 4 — Transcripteur** *(pink)*
- Gradient: `linear-gradient(135deg, #FDF2F8, #FCE7F3)`
- Icon: `Mic` in pink gradient square
- Title: **Transcripteur**
- Boost line: *Une réunion d'1h → résumé + actions + décisions en 30s.*
- Micro-anim: an audio waveform scrolls through, then collapses into 3 bullet points that check themselves off one by one (✔ Décision, ✔ Action, ✔ Résumé).

**Card 5 — Planificateur** *(indigo)*
- Gradient: `linear-gradient(135deg, #EEF2FF, #E0E7FF)`
- Icon: `Calendar` in indigo gradient square
- Title: **Planificateur**
- Boost line: *Des contraintes floues → un planning équipe optimisé, en 1 clic.*
- Micro-anim: 4 employee avatars float, then get magnetically pulled into a clean weekly grid (5 columns × 4 rows), cells filling with colored blocks staggered.

**Card 6 — Emails & Briefing** *(emerald)*
- Gradient: `linear-gradient(135deg, #ECFDF5, #D1FAE5)`
- Icon: `Mail` in emerald gradient square
- Title: **Emails & briefing**
- Boost line: *150 emails reçus → un briefing de 5 lignes, chaque matin.*
- Micro-anim: a chaotic inbox of unread emails stacks up (red badges), then all fly into a funnel, and out comes a clean morning briefing card with a coffee cup ☕ and 3 priority bullets.

**Grid layout** — on screen the 6 cards fill a 1280px-wide container, centered. Row gap 20px, column gap 20px. Each card has a soft shadow `0 10px 30px -12px rgba(124, 58, 237, 0.12)`.

**Frames 380–420 — closing punch**:
A single line fades in below the grid:
> *Chaque outil est branché à vos emails, vos documents, votre agenda, vos tableaux. C'est là que la magie opère.*
> (15px italic, `#7C3AED`, centered)

Transition out: the 6 cards slightly compress toward center (scale 0.96), then crossfade to Scene 7.

### Scene 7 — Concrete scenarios (360 frames / 6s)

Title (frames 0–30):
> **Concrètement, on fait quoi ?**
> (28px Inter 600)

Subtitle (frames 30–50, fade):
> *Quatre situations typiques — entre beaucoup d'autres.*

**4 scenario cards in a 2×2 grid (frames 50–200, stagger 25f each)**, 360×180px, rounded 20px, each with a distinct pastel gradient background.

**Card A — WhatsApp → Bon de commande** (violet/fuchsia)
- Icon: `Smartphone` 📱
- Title: *Vos commandes arrivent par WhatsApp ?*
- Sub: *On les capte et on les transforme en bons de commande.*
- Micro-animation: a tiny WhatsApp-green chat bubble slides in from the right, then morphs into a spreadsheet row (frames 120–180).

**Card B — Weather → Planning** (pink/rose)
- Icon: `CloudSun` ⛅
- Title: *Votre planning dépend de la météo ?*
- Sub: *Synthèse décale les tâches extérieures quand la pluie arrive.*
- Micro-animation: a cloud icon floats, a calendar block shifts right by one day with an arrow.

**Card C — Excel connect** (emerald/teal)
- Icon: `FileSpreadsheet` 📊
- Title: *Un Excel que vous remplissez depuis 10 ans ?*
- Sub: *On le connecte. Il se met à jour tout seul, répond à vos questions.*
- Micro-animation: a single Excel cell gets typed into automatically (typing cursor effect).

**Card D — Site photos → Reports** (indigo/violet)
- Icon: `Camera` 📷
- Title: *Vos techniciens prennent des photos sur le terrain ?*
- Sub: *Elles deviennent des rapports d'intervention classés par client.*
- Micro-animation: a phone snaps a photo (flash), photo slides into a folder labeled with a client name.

**Frames 260–360**: the 4 cards slightly tilt on hover-like stagger, and a caption below fades in:
> *Et bien plus encore — si vous pouvez le décrire, on peut le construire.*
> (16px italic, `#7C3AED`)

### Scene 8 — Workflow chain: prospect → sale (360 frames / 6s)

This scene demonstrates an **end-to-end agent workflow** to show the depth.

Top title (frames 0–30):
> **Un exemple concret : un prospect vous écrit.**
> (26px Inter 600)

Subtitle:
> *Synthèse déroule toute la chaîne, sans que vous leviez le petit doigt.*

**Main visual (frames 30–300)**: a **horizontal chain of 10 steps**, each a pill with an emoji + label, connected by animated arrows. The chain scrolls gently left→right, OR animates one step at a time (staggered 24f each).

Steps (animate one after the other, the active one pulses with a violet ring):

1. 📧 `Email prospect reçu`
2. 🔍 `Enrichissement auto (LinkedIn, Pappers, site web)`
3. 🧠 `Scoring chaud / tiède / froid`
4. ✍️ `Réponse personnalisée dans votre ton`
5. 📝 `Fiche CRM créée et enrichie`
6. 📅 `RDV proposé selon votre agenda`
7. ⏰ `Relance programmée si pas de réponse`
8. 📄 `Devis pré-rempli selon le secteur`
9. ✉️ `Envoi + accusé de lecture`
10. 🔔 `Alerte quand il clique sur le devis`

Each pill: rounded 12px, `#EFF6FF` bg, `#BFDBFE` border, blue text. When active (one at a time), it lifts up 4px, glows violet, and the arrow connecting to the next step draws.

**Frames 300–360**: the chain condenses into two comparison cards appearing at the bottom:
- **Avant** (red/rose card): *Du travail éparpillé, des étapes oubliées, des prospects perdus.*
- **Avec Synthèse** (emerald card): *Tout tourne en arrière-plan. Vous validez, vous signez.*

### Scene 9 — Integrations (240 frames / 4s)

Title (frames 0–30):
> **Synthèse se branche sur vos outils existants.**
> (28px Inter 600)

Subtitle:
> *Pas besoin de migrer. Pas de nouveau logiciel à apprendre.*

**Main visual (frames 30–200)**: a **horizontal infinite scroll** (ticker style, scrolls right-to-left at 1.5px/frame) with **integration logos** in real brand colors, each in a soft white card 120×120px, rounded 20px, with a subtle colored glow matching the brand.

Logos (actual brand SVGs, looped 2×):
- **Gmail** `#EA4335`
- **Outlook** `#0078D4`
- **Microsoft Teams** `#5059C9`
- **Slack** `#611F69`
- **Google Drive** `#0066DA`
- **Microsoft Excel** `#185C37`
- **WhatsApp** `#25D366`
- **Notion** `#000000`
- **HubSpot** `#FF7A59`
- **Pennylane** `#22C55E`
- **Zapier** `#FF4A00`

Fade gradients on left and right edges (48px each, white fade) so cards smoothly enter/exit.

**Frames 200–240**: the ticker slows to a stop, and a caption centers below:
> *Plus de 50 intégrations. Et si la vôtre n'existe pas, on la construit.*
> (15px italic, `#6B7280`)

### Scene 10 — Trust & RGPD (240 frames / 4s)

Split in two halves.

**Left half (frames 0–120)** — **The stack**:
Title (top): **"Les mêmes briques que les meilleurs."** (22px semibold)
Then 4 rows fade in (stagger 18f each):
- `OpenAI` → badges: Notion, Shopify, Duolingo, Stripe
- `Anthropic Claude` → Slack, Salesforce, DoorDash, GitLab
- `Supabase` → Mozilla, PwC, 1Password, Pika
- `Railway` → Stripe, Twilio, Datadog, GitHub
Each row: left 1.5px colored bar + tool name, then "Le même moteur que" in gray italic, then pills for each company in their brand color.

**Right half (frames 60–200)** — **RGPD card**:
Large emerald card `#ECFDF5` with `Shield` icon in a green gradient circle.
- Title: **"RGPD & sécurité, non-négociables."** (22px)
- Bullets (fade staggered):
  - 🇫🇷 Données hébergées en France
  - 🔒 Chiffrées, jamais revendues
  - 🏢 Certifications ISO 27001
  - 📜 Conformité RGPD native
- Bottom pills: `Éco-responsable`, `ISO 27001`, `Souveraineté FR`

**Frames 180–240**: subtle animated checkmark that draws itself next to the RGPD card title, emerald green, confident stroke.

### Scene 11 — The human side (240 frames / 4s)

This scene is critical — Synthèse's differentiator is the **human relationship**. It must feel warm.

Background: soft warm gradient (cream → peach → pale violet).

Title (frames 0–30, fade + slide from bottom):
> **On ne livre pas un logiciel. On construit avec vous.**
> (28px Inter 600, `#111827`)

**Main visual (frames 30–180)**: a **horizontal timeline with 5 steps**, each a colored circle with an emoji + label below. Connected by a thin gradient line (violet → blue → emerald).

Steps (each fades in with spring, stagger 22f):

| # | Emoji | Label | Sub |
|---|---|---|---|
| 1 | 🎙️ | **On écoute** | *On comprend votre activité.* |
| 2 | 🔍 | **On décortique** | *On identifie ce qui vous coûte du temps.* |
| 3 | 🏗️ | **On construit** | *Une V1 en quelques semaines, utilisable.* |
| 4 | 🧪 | **Vous testez** | *Vos retours, notés.* |
| 5 | 🔄 | **On améliore** | *Chaque semaine, indéfiniment.* |

Circles are 72px, gradient-filled matching the step color. Emoji is 32px.

**Frames 180–240**: a caption fades in below:
> *Comme un collègue technique — mais qui fait évoluer votre outil chaque semaine.*
> (16px italic, `#7C3AED`)

### Scene 12 — CTA close (180 frames / 3s)

Background: full **brand gradient** (`violet → fuchsia → amber`), animated (slow rotation).

Frames 0–40: big centered headline fades in + slides up slightly:
> **Prêt à découvrir Synthèse en action ?**
> (48px Inter 700, white, tight tracking)

Frames 30–80: subtitle below:
> *Parlons de votre activité. Configuration sur-mesure, offerte.*
> (20px Inter 400, white 85%)

Frames 60–120: two buttons side by side, staggered:
- **Primary**: white background, violet text, `Sparkles` icon + *"Réserver une démo"*. 52px tall, 24px border-radius, `0 10px 40px rgba(0,0,0,0.15)` shadow. Subtle pulsing scale (1 → 1.02 → 1, 120f cycle).
- **Secondary**: transparent with 2px white border, white text, *"Explorer la plateforme"*.

Frames 100–160: URL fades in below the buttons:
> **synthese.fr** (or your actual domain)
> (18px monospace, white 70%)

Frames 140–180: the Synthèse logo appears bottom-right at 40px, with a subtle shimmer across it. Final fade to a soft white vignette.

Particles continue floating throughout. The brand gradient background keeps moving for the whole 3s so the frame never feels static.

---

## Technical notes for the Remotion composition

- **Composition ID**: `SyntheseLanding`
- **Width × Height**: 1920 × 1080
- **FPS**: 60
- **Duration in frames**: 3420 (57s) — adjust to fit music
- **Output**: `mp4` (H.264), also export `webm` for web
- **Music**: add `<Audio>` with 60f fade-in, 120f fade-out, 35% volume
- **Shared components to build**:
  - `<SceneContainer>` (handles cross-fade + scale transitions between scenes)
  - `<BrandGradient />` (reusable animated brand gradient background)
  - `<Particles count={...} />` (floating particles ambient layer)
  - `<Pill label color icon />` (the recurring pill component)
  - `<ToolCard />` (for orbital scene + scenario scenes)
  - `<SyntheseOrb size />` (the signature central orb with the logo)
- **Assets needed**:
  - `./public/logo-synthese.svg` (placeholder — user will provide)
  - Brand logos (Gmail, Outlook, Teams, Slack, Drive, Excel, WhatsApp, Notion, HubSpot, Pennylane, Zapier) — use `simple-icons` or direct SVGs
  - Fonts: load Inter (400, 500, 600, 700), Instrument Serif (400 italic), JetBrains Mono (400)
  - Music track (mp3, stereo, ≥ 50s)
- **Easing**: standard Remotion spring for in/out transitions. For value tweens, use cubic-bezier `[0.16, 1, 0.3, 1]` (same as the site's hero).
- **Accessibility**: include captions as `.vtt` file generated from the text shown on screen.

## Key rules (non-negotiable)

1. The word **Synthèse** is ALWAYS in `Instrument Serif` italic. Nothing else uses that font.
2. Light theme only. No dark backgrounds except Scene 11's brand gradient.
3. Every animation uses spring physics, never linear. Every card enters with a slight scale (0.95 → 1) + fade.
4. The video tells a **story**: problem → shift → solution → proof → trust → human → invitation. Don't reorder scenes.
5. The video should feel **calm and confident**, never busy. If in doubt, simplify the scene.
6. Leave the logo slot empty (`<img src="./public/logo-synthese.svg" />`) — the user provides it after.
