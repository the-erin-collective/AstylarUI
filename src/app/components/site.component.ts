import { Component, signal, inject, ElementRef, viewChild, afterNextRender, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Engine, Scene, HemisphericLight, Vector3, Color4, StandardMaterial, Color3, Mesh } from '@babylonjs/core';
import { BabylonDOMService } from '../services/dom/babylon-dom.service';
import { BabylonCameraService } from '../services/babylon-camera.service';
import { BabylonMeshService } from '../services/babylon-mesh.service';
import { SiteDataService } from '../services/site-data.service';
import { BabylonRender } from '../services/dom/interfaces/render.types';
import { TextureService } from '../services/texture.service';
import { StyleService } from '../services/dom/style.service';

@Component({
  selector: 'app-site',
  imports: [CommonModule],
  template: `
    <div class="fullscreen-container">
      <canvas #babylonCanvas class="babylon-canvas" 
              [style.display]="sceneLoaded() ? 'block' : 'none'"></canvas>
      @if (!sceneLoaded()) {
        <div class="loading-overlay">
          <div class="loading-content">
            <h2>🌐 Loading 3D Scene...</h2>
            <p>Initializing Babylon.js for site: <strong>{{ siteId() }}</strong></p>
            <div class="loading-spinner"></div>
          </div>
        </div>
      }
      @if (sceneLoaded()) {
        <div class="controls-overlay">
          <div class="controls-info">
            <span class="site-indicator">{{ siteId() }}</span>
            <span class="controls-text">🖱️ Click & drag to rotate • Scroll to zoom</span>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      margin: 0;
      padding: 0;
      overflow: hidden;
      z-index: 1000;
    }
    
    .fullscreen-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #000;
    }
    
    .babylon-canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100% !important;
      height: 100% !important;
      display: block;
      outline: none;
      border: none;
      margin: 0;
      padding: 0;
      cursor: grab;
      background: #000;
    }
    
    .babylon-canvas:active {
      cursor: grabbing;
    }
    
    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1001;
    }
    
    .loading-content {
      text-align: center;
      color: white;
      background: rgba(0, 0, 0, 0.3);
      padding: 40px;
      border-radius: 15px;
      backdrop-filter: blur(10px);
    }
    
    .loading-content h2 {
      margin: 0 0 15px 0;
      font-size: 28px;
      font-weight: 300;
    }
    
    .loading-content p {
      margin: 0 0 25px 0;
      font-size: 16px;
      opacity: 0.9;
    }
    
    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-top: 3px solid #fff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .controls-overlay {
      position: absolute;
      top: 20px;
      left: 20px;
      right: 20px;
      pointer-events: none;
      z-index: 1002;
    }
    
    .controls-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(0, 0, 0, 0.6);
      color: white;
      padding: 12px 20px;
      border-radius: 25px;
      backdrop-filter: blur(10px);
      font-size: 14px;
    }
    
    .site-indicator {
      font-weight: 600;
      text-transform: uppercase;
      color: #4CAF50;
      letter-spacing: 1px;
    }
    
    .controls-text {
      opacity: 0.8;
    }
    
    /* Hide scrollbars */
    .fullscreen-container::-webkit-scrollbar {
      display: none;
    }
    
    .fullscreen-container {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `]
})
export class SiteComponent {
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);
  private babylonDOMService: BabylonDOMService = inject(BabylonDOMService);
  private babylonCameraService = inject(BabylonCameraService);
  private babylonMeshService = inject(BabylonMeshService);
  private textureService = inject(TextureService);
  private styleService = inject(StyleService);
  private siteDataService = inject(SiteDataService);

  // ViewChild for canvas element
  private babylonCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('babylonCanvas');

  // Babylon.js properties
  private engine?: Engine;
  private babylonScene?: Scene;

  // Signal for site ID from route parameters
  protected siteId = signal<string>('');

  // Signal to track if scene is loaded
  protected sceneLoaded = signal<boolean>(false);

  constructor() {
    // Subscribe to route parameter changes
    this.route.paramMap.subscribe(params => {
      const id = params.get('site-id');
      this.siteId.set(id || 'unknown');
    });

    // Initialize Babylon.js after render, but only in browser
    afterNextRender(() => {
      if (isPlatformBrowser(this.platformId)) {
        this.initializeBabylon();
      }
    });
  }

  private initializeBabylon(): void {
    const canvas = this.babylonCanvas().nativeElement;

    // Create Babylon.js engine with optimized settings
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: false
    });

    // Create scene
    this.babylonScene = new Scene(this.engine);
    this.babylonScene.clearColor = new Color4(0.05, 0.05, 0.1, 1.0);

    // Create camera using camera service
    const camera = this.babylonCameraService.initialize(this.babylonScene, canvas);

    // Create improved lighting setup for better edge definition
    const hemisphericLight = new HemisphericLight('hemispheric', new Vector3(0, 1, 0), this.babylonScene);
    hemisphericLight.intensity = 1.0;
    hemisphericLight.diffuse = new Color3(1.0, 1.0, 1.0);

    // Initialize mesh service with camera service for pixel-perfect positioning
    this.babylonMeshService.initialize(this.babylonScene, this.babylonCameraService);

    // Initialize the DOM service with services and proper viewport dimensions
    const viewportWidth = canvas.clientWidth || 1920;
    const viewportHeight = canvas.clientHeight || 1080;

    const render: BabylonRender = {
      actions: {
        mesh: {
          createPolygon: this.babylonMeshService?.createPolygon.bind(this.babylonMeshService) || (() => new Mesh('default', this.babylonScene)),
          createPlane: this.babylonMeshService?.createPlane.bind(this.babylonMeshService) || (() => new Mesh('default', this.babylonScene)),
          createMaterial: this.babylonMeshService?.createMaterial.bind(this.babylonMeshService) || (() => new StandardMaterial('default', this.babylonScene)),
          createGradientMaterial: this.babylonMeshService?.createGradientMaterial.bind(this.babylonMeshService) || (() => new StandardMaterial('default', this.babylonScene)),
          createShadow: this.babylonMeshService?.createShadow.bind(this.babylonMeshService) || (() => new Mesh('default', this.babylonScene)),
          createPolygonBorder: this.babylonMeshService?.createPolygonBorder.bind(this.babylonMeshService) || (() => []),
          positionMesh: this.babylonMeshService?.positionMesh.bind(this.babylonMeshService) || (() => { }),
          parentMesh: this.babylonMeshService?.parentMesh.bind(this.babylonMeshService) || (() => { }),
          positionBorderFrames: this.babylonMeshService?.positionBorderFrames.bind(this.babylonMeshService) || (() => { }),
          updatePolygon: this.babylonMeshService?.updatePolygon.bind(this.babylonMeshService) || (() => { }),
          generatePolygonVertexData: this.babylonMeshService?.createPolygonVertexData.bind(this.babylonMeshService) || (() => { }),
          updateMeshBorderRadius: this.babylonMeshService?.updateMeshBorderRadius.bind(this.babylonMeshService) || (() => { }),
          createMeshWithBorderRadius: this.babylonMeshService?.createMeshWithBorderRadius.bind(this.babylonMeshService) || ((originalMesh: Mesh) => originalMesh),
        },
        style: {
          findStyleBySelector: this.styleService.findStyleBySelector.bind(this.styleService),
          findStyleForElement: this.styleService.findStyleForElement.bind(this.styleService),
          parseBackgroundColor: this.styleService.parseBackgroundColor.bind(this.styleService),
          parseOpacity: this.styleService.parseOpacity.bind(this.styleService),
          getElementTypeDefaults: this.styleService.getElementTypeDefaults.bind(this.styleService),
          parseAlignContent: this.styleService.parseAlignContent.bind(this.styleService),
          parseFlexGrow: this.styleService.parseFlexGrow.bind(this.styleService),
          parseFlexShrink: this.styleService.parseFlexShrink.bind(this.styleService),
          parseFlexBasis: this.styleService.parseFlexBasis.bind(this.styleService),
          parseFlexShorthand: this.styleService.parseFlexShorthand.bind(this.styleService),
          parseAlignSelf: this.styleService.parseAlignSelf.bind(this.styleService),
          parseOrder: this.styleService.parseOrder.bind(this.styleService),
        },
        camera: {
          calculateViewportDimensions: this.babylonCameraService?.calculateViewportDimensions.bind(this.babylonCameraService) || (() => ({ width: 0, height: 0 })),
          getPixelToWorldScale: this.babylonCameraService?.getPixelToWorldScale.bind(this.babylonCameraService) || (() => 0.03),
        },
        texture: {
          getTexture: this.textureService.getTexture.bind(this.textureService),
        },
      },
      scene: this.babylonScene!
    };

    this.babylonDOMService.initialize(render, canvas.clientWidth || 1920, canvas.clientHeight || 1080);

    // Start render loop
    this.engine.runRenderLoop(() => {
      this.babylonScene?.render();
    });

    // Set scene loaded signal
    this.sceneLoaded.set(true);

    this.babylonScene.onReadyObservable.addOnce(() => {
      this.engine?.resize(true);

      // Create site content after initialization
      this.createSiteSpecificContent();
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      this.engine?.resize();
    });
  }

  private createSiteSpecificContent(): void {
    if (!this.babylonScene) return;

    const siteId = this.siteId();
    // Calculate scale factor using camera service and scene
    const scaleFactor = this.babylonCameraService.getPixelToWorldScale();

    // Check if we have site data for this site ID
    if (this.siteDataService.hasSiteData(siteId)) {
      const siteData = this.siteDataService.getSiteData(siteId);
      if (siteData) {
        console.log(`Creating DOM structure for site: ${siteId}`, siteData);
        this.babylonDOMService.createSiteFromData(siteData);
      }
    } else {
      console.log(`No site data found for: ${siteId}, using fallback`);
      // Fallback: create a simple default layout
      this.createDefaultLayout();
    }
  }

  private createDefaultLayout(): void {
    // Create a simple fallback layout for unknown sites
    const defaultData = {
      styles: [
        {
          selector: '#default-container',
          top: '25%',
          left: '25%',
          height: '50%',
          width: '50%'
        }
      ],
      root: {
        children: [
          {
            type: 'div' as const,
            id: 'default-container'
          }
        ]
      }
    };

    this.babylonDOMService.createSiteFromData(defaultData);
  }

  ngOnDestroy(): void {
    // Clean up services
    this.babylonDOMService.cleanup();
    this.babylonCameraService.cleanup();
    this.babylonMeshService.cleanup();

    // Clean up Babylon.js resources
    this.babylonScene?.dispose();
    this.engine?.dispose();
  }
}
