# AstylarUI

AstylarUI is an Angular 20 library for rendering HTML-like structures in BabylonJS-based 3D scenes. It uses signals-first patterns, zoneless change detection, and a pure-renderer approach.

## Key Features
- **Angular 20 Core**: Leverages modern Angular signals and zoneless change detection.
- **3D UI Rendering**: Render complex UI layouts described by JSON-like `SiteData` into BabylonJS.
- **Highly Extensible**: Framework-agnostic rendering services wrapped in a clean Angular service.
- **SSR Ready**: Built-in support for Server-Side Rendering via Express.

## Installation

```bash
npm install astylarui
```

> [!NOTE]
> `@angular/core` and `@babylonjs/core` are peer dependencies and must be installed in your project.

## Usage

The primary way to use the library is via the `AstylarService`.

### 1. Simple Rendering

In your Angular component:

```typescript
import { Component, ElementRef, viewChild, inject, afterNextRender } from '@angular/core';
import { AstylarService } from 'astylarui';

@Component({
  selector: 'app-3d-ui',
  template: `<canvas #myCanvas></canvas>`,
  styles: [`canvas { width: 100%; height: 100%; }`]
})
export class My3DUIComponent {
  private astylar = inject(AstylarService);
  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('myCanvas');
  private renderResult?: any;

  constructor() {
    afterNextRender(() => {
      this.render();
    });
  }

  render() {
    const siteData = {
      root: {
        type: 'div',
        styles: { backgroundColor: '#1e3c72', width: '100%', height: '100%' },
        children: [
          { type: 'h1', text: 'Hello 3D World!', styles: { color: 'white', marginTop: '50px' } }
        ]
      },
      styles: []
    };

    this.renderResult = this.astylar.render(this.canvas().nativeElement, siteData);
  }

  ngOnDestroy() {
    this.renderResult?.dispose();
  }
}
```

### 2. Updating content

You can update the scene without re-initializing the engine:

```typescript
this.renderResult.update(newSiteData);
```

## Developing AstylarUI

### Setup
```bash
npm install
npm start
```

### Build the library
```bash
npm run build:lib
```

### Build the demo app
```bash
npm run build
```

---

## License
License: GPL-3.0
Copyright (c) 2025 The Erin Collective
