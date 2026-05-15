# RouteFlow

**RouteFlow** is a cross-platform travel companion built with [Expo](https://expo.dev) and React Native. Plan trips, build itineraries, track expenses, capture memories, and explore places — with auth and cloud sync powered by [Supabase](https://supabase.com).

## Features

- **Trips & itinerary** — Create and manage trips with a dedicated itinerary flow  
- **Map & places** — Discover and open place details while planning  
- **Expenses** — Log and review trip spending  
- **Memories** — Attach photos and moments to your trips  
- **Community** — Browse and engage with shared travel content  
- **Import** — Bring existing trip data into the app  
- **Account & subscriptions** — Profile, auth, and monetization-ready flows (e.g. RevenueCat)  
- **Internationalization** — UI strings prepared for multiple locales  

## Tech stack

| Area | Choice |
|------|--------|
| Framework | Expo SDK 54 · React Native · TypeScript |
| Navigation | [Expo Router](https://docs.expo.dev/router/introduction/) |
| Backend | Supabase (Auth + data) |
| State & data | TanStack Query · Zustand |
| Styling | NativeWind (Tailwind for RN) |
| Observability | Sentry |
| Updates | EAS Update (optional, configured via `app.config.ts`) |

## Requirements

- **Node.js** (LTS recommended)  
- **npm** (or compatible package manager)  
- **[Expo CLI](https://docs.expo.dev/get-started/installation/)** via `npx` when developing  
- **iOS Simulator** (macOS + Xcode) and/or **Android Studio / device** for native runs  
- A **Supabase** project and keys for full backend functionality  

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/cesarfiorio/travel-planner-app.git
cd travel-planner-app
npm install
```

### 2. Environment variables

Copy the example file and fill in your project values:

```bash
cp .env.example .env
# Windows (PowerShell): Copy-Item .env.example .env
```

Never commit `.env`. It is listed in `.gitignore`. Use `.env.example` only for **placeholder** variable names and non-secret defaults.

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous (public) key |
| `EXPO_PUBLIC_*` (other) | See `.env.example` for optional keys |

### 3. Run the app

```bash
npm start
```

Then press `i` (iOS), `a` (Android), or open in Expo Go / dev client per the Metro prompt.

```bash
npm run ios       # iOS simulator (macOS)
npm run android   # Android emulator or device
npm run web       # Web (if you use web in your workflow)
```

### Tests

```bash
npm test
```

## Building & shipping (EAS)

Production builds and over-the-air updates use [Expo Application Services](https://docs.expo.dev/eas/). Project-specific notes and example `eas secret:create` commands live in **`store/EAS_SECRETS.txt`**.

Typical flow:

1. `npx eas login`  
2. Configure secrets for `EXPO_PUBLIC_*` (and other) variables on EAS  
3. `npx eas build` / `eas update` as needed  

## Project layout (high level)

```
app/           # Expo Router screens (tabs, stacks, trip routes)
components/    # Reusable UI
lib/           # Hooks, clients, utilities
constants/     # Theme and shared constants
assets/        # Images and icons
```

## Security

- Keep **service keys and tokens** in `.env` or **EAS secrets**, not in the repository.  
- The **anon** Supabase key is safe to embed in the client bundle; **service role** keys must never ship in the app.  

## Contributing

Issues and pull requests are welcome if this repository is open for contributions. For private forks, adapt this section to your team’s workflow.

---

Built with Expo · **RouteFlow**
