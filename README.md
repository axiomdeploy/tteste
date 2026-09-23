# Meskat Alam — Vibe Coder · Portfolio

> **Code is the vehicle. Imagination is the mission.**

A cinematic, browser-native portfolio engineered by **Meskat Alam** — a Vibe Coder focused on turning code into interactive experiences that feel alive.

This portfolio is more than a collection of static pages. It is a living digital environment built around a scroll-driven **3D rocket flight**, interactive telemetry, experimental browser projects, and **ORION AI** — a custom AI interface designed and integrated by Meskat himself.

**No game engine. No pre-rendered launch footage. No fake 3D video.**

**Every frame is rendered in the browser by code.**

---

## 🚀 The Experience

Scrolling the portfolio becomes the flight sequence:

**Launch → Atmosphere → MAX-Q → Orbit → Deep Space → Planetary Transit → Parking Orbit**

The mission begins at a detailed launch complex featuring:

- Launch pad
- Assembly building
- Hangars
- Tank farm
- Crawler
- Landing pads
- Rocket garden

As the flight progresses, the vehicle clears the tower, passes through a steam/deluge sequence, produces a persistent exhaust pillar, and climbs through the real atmospheric layers:

**Troposphere → Stratosphere → Mesosphere → Thermosphere → Exosphere**

The flight includes a **MAX-Q throttle dip**, orbital rendezvous with **two space stations and named satellites**, and planetary flybys of:

**VERMILION · AURELIA · GLACIUS**

The mission ends in a slow parking orbit around **GLACIUS**, accompanied by its ice moonlet.

Everything is rendered in real time using **raw Three.js**.

---

## 🛰️ Mission Control

Click the rocket insignia in the navigation to open **MISSION CONTROL**.

Mission Control exposes live flight information including:

- Mission elapsed time
- Altitude
- Velocity
- G-load
- Flight plan
- Atmosphere stack
- Vehicle data sheet

The telemetry is tied to the flight simulation rather than being presented as a static animation.

Press and hold the navigation insignia to unlock the classified personnel interface.

---

# 🤖 ORION AI

## Built by Meskat Alam

**ORION is Meskat Alam's custom AI interface, built specifically for this portfolio.**

Rather than embedding a generic chatbot, Meskat designed ORION as the portfolio's **resident intelligence** — a conversational layer that understands the site's identity, introduces visitors to his work, answers questions about the portfolio, and guides potential clients toward the correct contact channel.

ORION's personality, tone, system instructions, knowledge boundaries, fallback behavior, and portfolio-specific dossier were intentionally designed and integrated by **Meskat Alam**.

The objective was simple:

> **Not just to put AI inside the portfolio — but to make the portfolio itself feel intelligent.**

### ORION Architecture

ORION uses a server-side API route with a primary Groq-powered inference layer and a protected fallback engine.

Current primary configuration:

- **Model:** `openai/gpt-oss-120b`
- **Reasoning:** medium effort
- **Reasoning output:** hidden from visitors
- **Web search:** browser search capability when current information is required
- **API key:** stored server-side through environment variables
- **Fallback:** secondary AI engine for resilience

The browser never receives the secret API key.

ORION is intentionally instructed not to reveal its underlying provider, model, API credentials, or internal implementation details to visitors.

### What ORION Can Do

ORION can:

- Introduce visitors to Meskat and his work
- Explain the portfolio's projects
- Answer questions about the site
- Guide potential clients toward Meskat's contact channel
- Provide current information when web search is available
- Maintain a consistent mission-control personality
- Fall back to a secondary engine if the primary engine is unavailable

---

# 🧪 Interactive Projects

## SYS·SCAN

A live browser telemetry deck that reads the visitor's own device capabilities where the browser permits it.

It can surface information such as:

**CPU · RAM · Storage · Battery · GPU**

The information is presented through a spacecraft-style instrumentation interface.

---

## ROCKET·TV

A retro-futuristic green-phosphor mission console inspired by 1960s computing.

It continuously types interplanetary guidance code for missions including:

**Earth → Moon · Mars · Uranus · Neptune**

The console presents mission-style information such as transfer times and delta-v budgets as part of the experience.

---

## Nano Bleam

A browser-native PDF annotation layer designed for interactive document markup.

**Private project. Access by contacting Meskat.**

---

## Annotation Bookmarklet

A bookmarklet that injects physics-inspired annotation capabilities directly into webpages.

**Private project. Access by contacting Meskat.**

---

## Pomodoro Flow

An adaptive focus timer designed around distraction reduction and flexible focus sessions.

**Private project. Access by contacting Meskat.**

---

# 🌌 Interaction Design

The portfolio is intentionally built around movement, depth, and interaction.

- The rocket flight is driven by scroll position.
- The portrait transitions between pinned and fullscreen states.
- The skill section behaves like a solar system and expands as the visitor approaches it.
- The navigation insignia opens Mission Control.
- The orange orb activates ORION AI.
- Telemetry and spatial transitions create a spacecraft-like interface.
- The page is designed as an interactive environment rather than a conventional landing page.

The goal is to make the website itself feel like a small digital world.

---

# 🛠️ Technology

## Core

**Next.js 16 · React 19 · TypeScript**

## Interface

**Tailwind CSS 4 · Framer Motion · Lucide**

## 3D / Graphics

**Three.js · WebGL · Canvas API**

## AI

**Groq API · OpenAI GPT-OSS 120B · Server-side API route · Browser Search · Fallback AI Engine**

## Developer Tooling

**Git · GitHub · Vercel · Prisma**

### Rendering

No game engine is used for the 3D flight.

No launch footage is used for the background.

Every frame is generated and rendered in the browser.

---

# ⚙️ Run Locally

Install dependencies:

```bash
npm install
````

Start the development server:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

---

# 🔐 Environment Variables

Create a local environment file from the example:

```bash
cp .env.example .env
```

### Available Variables

| Variable       | Required                   | Purpose                                                    |
| -------------- | -------------------------- | ---------------------------------------------------------- |
| `GROQ_API_KEY` | Yes for Groq-powered ORION | Authenticates the server-side Groq request                 |
| `GROQ_MODEL`   | No                         | Optional model override; defaults to `openai/gpt-oss-120b` |

### Security

**Never commit `.env` or an actual API key to GitHub.**

The repository is intended to contain the source code and configuration templates, while production secrets remain in the deployment environment.

For Vercel, store the Groq key under:

**Vercel → Project → Settings → Environment Variables**

Example:

```text
GROQ_API_KEY=your_groq_api_key
```

Optional model override:

```text
GROQ_MODEL=openai/gpt-oss-120b
```

---

# ☁️ Deploy with GitHub + Vercel

## 1. Push to GitHub

```bash
git init
git add .
git commit -m "portfolio: live rocket launch"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo>.git
git push -u origin main
```

The repository `.gitignore` excludes environment files and generated build artifacts.

---

## 2. Import into Vercel

Open:

[vercel.com/new](https://vercel.com/new)

Import the GitHub repository.

Vercel should automatically detect the project as **Next.js**.

Typical configuration:

```text
Framework: Next.js
Build Command: next build
```

---

## 3. Add Environment Variables

In:

**Vercel → Project → Settings → Environment Variables**

Add:

```text
GROQ_API_KEY = your_groq_api_key
```

Optional:

```text
GROQ_MODEL = openai/gpt-oss-120b
```

Then deploy.

Every new commit pushed to the connected branch can automatically trigger a new deployment.

---

# 🔒 Security

This project is designed so that sensitive AI credentials remain server-side.

Do not:

* Hard-code API keys into client-side JavaScript
* Commit `.env` files
* Expose secret variables through `NEXT_PUBLIC_*`
* Paste live API keys into README files
* Publish API keys in screenshots, issues, or source code

The public repository contains the application source, not the secret credentials required to operate the AI service.

---

# 📱 Mobile Experience

The portfolio is designed for responsive, viewport-safe interaction.

Mobile behavior includes:

* Responsive layouts
* Touch-friendly interactions
* Fullscreen transitions adapted for smaller screens
* Hidden scrollbar styling
* Altitude-based progress indication
* Device-aware visual scaling

---

# 📡 Contact

## Meskat Alam

**Vibe Coder · Interactive Web Builder**

📧 **Email:** [contractmeskat@gmail.com](mailto:contractmeskat@gmail.com)

🐙 **GitHub:** [github.com/axiomdeploy](https://github.com/axiomdeploy)

𝕏 **X:** [@axiomdeploy](https://x.com/axiomdeploy)

💬 **Discord:** [1496966372524167441](https://discord.com/users/1496966372524167441)

---

# ✦ About Meskat

Meskat Alam describes himself as a **Vibe Coder**.

His work focuses on browser-native experiences where engineering, visual design, physics, animation, and interaction meet.

His approach is simple:

**Build everything in the browser. Make it feel alive.**

From physics-driven interfaces and Canvas experiments to Three.js environments and custom AI systems, the work focuses on turning ordinary web technologies into unusual experiences.

---

# 🌠 Philosophy

> *"I was going to show you the stars, but you kinda outshine them."*

Built from scratch by **Meskat Alam** — one frame, one interaction, and one experiment at a time.

---

## © License

This project and its original creative work belong to **Meskat Alam**.

The repository may be viewed for educational and reference purposes. The portfolio's original design, identity, content, visuals, and interactive implementations should not be redistributed as another person's personal portfolio.

---

<p align="center">
  <strong>MESKAT ALAM · ORION · MISSION CONTROL</strong>
</p>

<p align="center">
  <sub>Built for the browser. Designed like a mission.</sub>
</p>
```
