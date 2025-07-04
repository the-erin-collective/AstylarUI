import { Component, signal, inject, ElementRef, viewChild, afterNextRender, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Engine, Scene, ArcRotateCamera, HemisphericLight, MeshBuilder, Vector3, StandardMaterial, Color3, Color4 } from '@babylonjs/core';

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
    
    // Create Babylon.js engine
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: true
    });
    
    // Create scene
    this.babylonScene = new Scene(this.engine);
    this.babylonScene.clearColor = new Color4(0.2, 0.2, 0.3, 1.0);
    
    // Create camera
    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2,
      Math.PI / 2.5,
      10,
      Vector3.Zero(),
      this.babylonScene
    );
    camera.attachControl(canvas, true);
    
    // Create light
    const light = new HemisphericLight('light', new Vector3(0, 1, 0), this.babylonScene);
    light.intensity = 0.7;
    
    // Create scene content based on site ID
    this.createSiteSpecificContent();
    
    // Start render loop
    this.engine.runRenderLoop(() => {
      this.babylonScene?.render();
    });
    
    // Set scene loaded signal
    this.sceneLoaded.set(true);
    
    // Handle window resize
    window.addEventListener('resize', () => {
      this.engine?.resize();
    });
  }
  
  private createSiteSpecificContent(): void {
    if (!this.babylonScene) return;
    
    const siteId = this.siteId();
    
    // Create different content based on site ID
    switch (siteId) {
      case 'dashboard':
        this.createDashboardScene();
        break;
      case 'analytics':
        this.createAnalyticsScene();
        break;
      case 'settings':
        this.createSettingsScene();
        break;
      case 'profile':
        this.createProfileScene();
        break;
      default:
        this.createDefaultScene();
    }
  }
  
  private createDashboardScene(): void {
    if (!this.babylonScene) return;
    
    // Create multiple boxes for dashboard visualization
    for (let i = 0; i < 5; i++) {
      const box = MeshBuilder.CreateBox(`box${i}`, { size: 1 }, this.babylonScene);
      box.position.x = (i - 2) * 2;
      box.position.y = Math.sin(i) * 2;
      
      const material = new StandardMaterial(`boxMat${i}`, this.babylonScene);
      material.diffuseColor = new Color3(0.2, 0.6, 1.0);
      material.specularColor = new Color3(0.1, 0.1, 0.1);
      box.material = material;
    }
  }
  
  private createAnalyticsScene(): void {
    if (!this.babylonScene) return;
    
    // Create spheres for analytics data points
    for (let i = 0; i < 8; i++) {
      const sphere = MeshBuilder.CreateSphere(`sphere${i}`, { diameter: 0.5 + Math.random() }, this.babylonScene);
      sphere.position = new Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      );
      
      const material = new StandardMaterial(`sphereMat${i}`, this.babylonScene);
      material.diffuseColor = new Color3(1.0, 0.4, 0.2);
      sphere.material = material;
    }
  }
  
  private createSettingsScene(): void {
    if (!this.babylonScene) return;
    
    // Create torus for settings
    const torus = MeshBuilder.CreateTorus('torus', { diameter: 4, thickness: 0.5 }, this.babylonScene);
    const material = new StandardMaterial('torusMat', this.babylonScene);
    material.diffuseColor = new Color3(0.8, 0.2, 0.8);
    torus.material = material;
    
    // Rotate the torus
    this.babylonScene.registerBeforeRender(() => {
      torus.rotation.y += 0.01;
      torus.rotation.x += 0.005;
    });
  }
  
  private createProfileScene(): void {
    if (!this.babylonScene) return;
    
    // Create cylinder for profile
    const cylinder = MeshBuilder.CreateCylinder('cylinder', { height: 3, diameter: 2 }, this.babylonScene);
    const material = new StandardMaterial('cylinderMat', this.babylonScene);
    material.diffuseColor = new Color3(0.2, 0.8, 0.2);
    cylinder.material = material;
  }
  
  private createDefaultScene(): void {
    if (!this.babylonScene) return;
    
    // Create a simple box for unknown sites
    const box = MeshBuilder.CreateBox('box', { size: 2 }, this.babylonScene);
    const material = new StandardMaterial('boxMat', this.babylonScene);
    material.diffuseColor = new Color3(0.5, 0.5, 0.5);
    box.material = material;
    
    // Add rotation animation
    this.babylonScene.registerBeforeRender(() => {
      box.rotation.y += 0.02;
    });
  }
  
  ngOnDestroy(): void {
    // Clean up Babylon.js resources
    this.babylonScene?.dispose();
    this.engine?.dispose();
  }
}
