# AstylarUI

AstylarUI is a signals-first Angular 20 application with zoneless change detection, SSR via Express, and BabylonJS-based 3D rendering helpers. It demonstrates modern Angular patterns (signals, computed, NgRx Signals store) and a pure-renderer approach.

## Quick Links
- Source: repository root
- App entry: [src/app/app.ts](src/app/app.ts#L1)
- SSR entry: [src/main.server.ts](src/main.server.ts#L1)
- Server: [src/server.ts](src/server.ts#L1)

## Key Features
- Angular 20 with signals-first components
- Zoneless change detection for explicit updates
- Server-Side Rendering (SSR) via Express
- NgRx Signals-based store patterns
- BabylonJS utilities for DPR-aware 3D rendering

## Requirements
- Node.js 18+ (recommended)
- npm 9+

## Getting Started

1. Install dependencies

```bash
npm install
```

2. Start development server

```bash
npm start
```

The dev server runs the Angular app (default `http://localhost:4200`).

3. Build for production

```bash
npm run build
```

4. Run the SSR server (after a server build)

```bash
npm run serve:ssr:astylarui
```

5. Run tests

```bash
npm test
```

## Project Structure (high level)

See the `src/` layout for main areas:

```
src/
├── app/                     # Application code (components, services, store)
│   ├── components/          # Signals-first components (home, site, todo)
│   ├── services/            # BabylonJS, coordinate transforms, DOM helpers
│   └── store/               # NgRx Signals stores and examples
├── main.ts                  # Browser bootstrap
├── main.server.ts           # SSR bootstrap
└── server.ts                # Express SSR server
```

Key files:
- [src/app/app.config.ts](src/app/app.config.ts#L1) — zoneless configuration
- [src/app/components/home.component.ts](src/app/components/home.component.ts#L1) — example component
- [src/app/services/babylon-camera.service.ts](src/app/services/babylon-camera.service.ts#L1) — DPR-aware camera math

## Conventions
- Components use `signal()` and `computed()` for local state.
- Prefer injection via Angular DI (`inject(...)`) over direct imports for services.
- Keep rendering logic explicit; avoid implicit defaults (see `src/app/services/dom/style-defaults.service.ts`).

## Development Notes
- Use the provided npm scripts for build/dev/test.
- SSR requires building the server bundle before running the Express server script.
- BabylonJS utilities live in `src/app/services/` — preserve DPR-aware math when modifying rendering logic.

## Contributing
- Open an issue or submit a PR. Keep changes focused and prefer signal-based patterns.

## License
See the repository `LICENSE` file.

---

If you want, I can also add a short badge header, or expand the Development Notes with exact CLI examples for building and serving SSR locally.
```bash
