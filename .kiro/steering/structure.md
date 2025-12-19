# Project Structure

## Root Structure
```
src/
├── app/                    # Main application code
├── assets/                 # Static assets
├── index.html             # Main HTML template
├── main.ts                # Client bootstrap
├── main.server.ts         # SSR bootstrap
├── server.ts              # Express server
└── styles.scss            # Global styles

docs/                      # Project documentation
public/                    # Public assets (served statically)
.kiro/                     # Kiro IDE configuration
```

## Application Architecture (`src/app/`)
```
app/
├── components/            # UI components
│   ├── home.component.ts
│   ├── site.component.ts
│   └── todo.component.ts
├── services/              # Business logic services
│   ├── dom/              # DOM-related services
│   ├── elements/         # Element-specific services
│   ├── babylon-camera.service.ts
│   ├── babylon-mesh.service.ts
│   ├── site-data.service.ts
│   └── texture.service.ts
├── store/                # NgRx Signals stores
│   └── counter.store.ts
├── types/                # TypeScript type definitions
│   ├── dom-element.ts
│   ├── dom-root.ts
│   ├── site-data.ts
│   ├── style-rule.ts
│   └── transform-data.ts
├── app.config.ts         # App configuration
├── app.routes.ts         # Routing configuration
├── app.ts                # Root component
├── app.html              # Root template
└── app.scss              # Root styles
```

## Service Organization Principles
- **babylon-dom.service.ts**: Main orchestration service
- **babylon-camera.service.ts**: Viewport and camera management
- **babylon-mesh.service.ts**: 3D object creation and manipulation
- **Specialized services**: Texture, site data, element-specific logic

## Component Patterns
- **Signals-first**: All components use Angular signals for state
- **Standalone components**: No NgModules, use standalone pattern
- **SCSS styling**: Component-specific styles with SCSS

## Type Definitions
- **Centralized types**: All interfaces in `types/` directory
- **Domain-specific**: Separate files for DOM, styling, transforms
- **Strict typing**: Comprehensive TypeScript coverage

## Naming Conventions
- **Services**: `kebab-case.service.ts`
- **Components**: `kebab-case.component.ts`
- **Types**: `kebab-case.ts`
- **Stores**: `kebab-case.store.ts`

## File Organization Rules
- Group related functionality in subdirectories
- Keep services focused on single responsibilities
- Separate types from implementation
- Use barrel exports for clean imports