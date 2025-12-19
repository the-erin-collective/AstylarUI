<!-- Copilot / AI agent instructions for astylarui -->
# astylarui — Copilot instructions

This file gives concise, actionable guidance for AI coding agents working in this repository.

- **Project type:** Angular 20 application (Signals-first, zoneless), SSR via Express, BabylonJS for 3D.
- **Key goals for agents:** Make small, focused code edits; preserve signals-first patterns; prefer minimal, well-scoped changes.

## How to run (dev / build / test)

- **Install deps:** `npm install` (project root).
- **Dev server:** `npm start` → runs `ng serve` (see package.json scripts).
- **Build:** `npm run build` → `ng build`.
- **SSR server:** `npm run serve:ssr:astylarui` → runs `node dist/astylarui/server/server.mjs` after a server build.
- **Tests:** `npm test` → `ng test` (Karma + Jasmine).

## Big-picture architecture (short)

- **UI framework:** Angular 20 with signals (signal(), computed()). See [src/app/app.ts](src/app/app.ts#L1-L20) and [src/app/components/home.component.ts](src/app/components/home.component.ts#L1-L40).
- **Zoneless change detection:** Enabled via `provideZonelessChangeDetection()` in [src/app/app.config.ts](src/app/app.config.ts#L1-L20).
- **Routing:** Standard Angular Router with dynamic route `/site/:siteId` defined in [src/app/app.routes.ts](src/app/app.routes.ts#L1-L20).
- **State:** NgRx Signals (signals-first store patterns) under [src/app/store](src/app/store). Example: `counter.store.ts`.
- **Rendering / 3D:** BabylonJS services live under [src/app/services](src/app/services). Example: DPR-aware camera and layout logic in [src/app/services/babylon-camera.service.ts](src/app/services/babylon-camera.service.ts#L1-L40).

## Project-specific conventions and patterns

- **Signals-first components:** Components use `signal()` and `computed()` for local state; avoid adding classic RxJS Subjects unless necessary. Example: many components initialize local signals in the class body (see `HomeComponent`).
- **Zoneless APIs:** Code assumes zoneless setup — do not reintroduce Zone.js patterns. Use explicit signals/effects for change propagation.
- **Server vs client code:** `main.server.ts` and `server.ts` are entry points for SSR — avoid referencing browser-only globals in server code without guards.
- **Babylon / DPR handling:** Canvas and DPR-aware conversions are centralized in Babylon services (see `babylon-camera.service.ts`). When modifying visual math, preserve DPR-aware conversions (`cssPixelsToWorldUnits`, `snapToPixelBoundary`).
- **Styles:** SCSS files live alongside components (e.g., `app.scss`). Prefer existing variables and mixins.

- **Pure renderer policy:** This project is intended to be a *pure renderer*. Do not introduce fallback logic or hard-coded default values for component properties, variables, or rendering behavior — these hide the true rendering logic and can mask bugs. The only allowed "defaults" are visual/style defaults managed centrally (see `src/app/services/dom/style-defaults.service.ts`). Prefer exposing values, using explicit `signal()` state, or centralizing any necessary defaults in `style-defaults.service.ts` so rendering logic remains explicit and debuggable.

## Integration points and external deps

- Angular 20, @angular/ssr, @babylonjs/core, NgRx Signals (beta). See `package.json` for exact versions.
- SSR uses Express; server entry: [src/server.ts](src/server.ts).
- State and services are injected via Angular DI (look for `inject(SomeService)` calls in components).

## Typical small tasks and gotchas for agents

- When editing components, keep signal initialization and `computed()` usage patterns intact.
- For new DI services, add `providedIn: 'root'` unless a narrower provider scope is required.
- When changing layout math or Babylon code, add unit-like logs (existing code uses console logs for DPR debugging) and preserve helper methods used elsewhere (e.g., `getPixelToWorldScale()`).
- Avoid changing global build configuration (angular.json, tsconfig) unless requested — these are sensitive.

## Useful file references (examples)

- App shell: [src/app/app.ts](src/app/app.ts#L1-L80)
- App config (zoneless + hydration): [src/app/app.config.ts](src/app/app.config.ts#L1-L20)
- Routes: [src/app/app.routes.ts](src/app/app.routes.ts#L1-L20)
- Babylon camera / DPR math: [src/app/services/babylon-camera.service.ts](src/app/services/babylon-camera.service.ts#L1-L40)
- Home UI patterns: [src/app/components/home.component.ts](src/app/components/home.component.ts#L1-L80)
- Store example: [src/app/store/counter.store.ts](src/app/store/counter.store.ts)

## How to propose changes

- Keep changes minimal and focused; include small tests or local manual steps to reproduce if the change affects rendering or SSR.
- For visual/math changes, include before/after screenshots (if possible) and link to the component/service changed.

---
If any section is unclear or you want more examples (e.g., more file links or command variants), tell me which area to expand. 
