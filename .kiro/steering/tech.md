# Technology Stack

## Framework & Core Technologies
- **Angular 20** - Latest version with zoneless architecture
- **TypeScript 5.8** - Strict mode enabled with comprehensive type checking
- **BabylonJS 8.15.1** - 3D rendering engine for DOM-like elements
- **NgRx Signals 20.0.0-beta.0** - Modern state management with signals
- **SCSS** - Styling preprocessor
- **Express.js** - SSR server

## Build System & Tools
- **Angular CLI 20** - Build tooling and development server
- **npm** - Package manager
- **Karma + Jasmine** - Testing framework
- **TypeScript Compiler** - ES2022 target with strict settings

## Key Dependencies
- **@angular/material** - UI components
- **@babylonjs/core & @babylonjs/loaders** - 3D rendering capabilities
- **round-polygon** - Polygon geometry calculations
- **RxJS** - Reactive programming

## Common Commands

### Development
```bash
npm start                    # Start development server (localhost:4200)
npm run watch               # Build with watch mode
npm test                    # Run unit tests
```

### Production
```bash
npm run build               # Production build
npm run serve:ssr:astylarui     # Run SSR server
```

## Architecture Patterns
- **Signals-First**: Use Angular signals for all reactive state
- **Zoneless**: No Zone.js dependency, explicit change detection
- **Service-Oriented**: Separate services for DOM, mesh, camera, styling
- **Pixel-First Layout**: All layout calculations in pixels, convert to world units only for rendering

## TypeScript Configuration
- Strict mode enabled with comprehensive type checking
- Experimental decorators enabled
- ES2022 target with module preservation
- Isolated modules for better performance