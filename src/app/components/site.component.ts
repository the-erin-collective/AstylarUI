import { Component, signal, computed, inject, ElementRef, viewChild, afterNextRender, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Engine, Scene, ArcRotateCamera, HemisphericLight, MeshBuilder, Vector3, StandardMaterial, Color3, Color4 } from '@babylonjs/core';

@Component({
  selector: 'app-site',
  imports: [CommonModule],
  template: `
    <div class="site-container">
      <div class="site-header">
        <h1>3D Site: {{ siteId() }}</h1>
        <div class="site-info">
          <span class="site-badge">{{ currentUrl() }}</span>
          <span class="timestamp">{{ timestamp() }}</span>
        </div>
      </div>
      
      <div class="babylon-container">
        <canvas #babylonCanvas class="babylon-canvas" 
                [style.display]="sceneLoaded() ? 'block' : 'none'"></canvas>
        @if (!sceneLoaded()) {
          <div class="loading-placeholder">
            <div class="loading-content">
              <h2>🌐 Loading 3D Scene...</h2>
              <p>Initializing Babylon.js for site: <strong>{{ siteId() }}</strong></p>
              <div class="loading-spinner"></div>
            </div>
          </div>
        }
        @if (sceneLoaded()) {
          <div class="canvas-overlay">
            <div class="controls-info">
              <p>🖱️ Click and drag to rotate • 🖱️ Scroll to zoom</p>
              <p>3D Scene for: <strong>{{ siteId() }}</strong></p>
            </div>
          </div>
        }
      </div>
      
      <div class="scene-info">
        <h3>Scene Details</h3>
        <p>This 3D scene is dynamically generated for site: <code>{{ siteId() }}</code></p>
        <p>Each site can have its own unique 3D content and materials.</p>
      </div>
    </div>
  `,
  styles: [`
    .site-container {
      width: 100vw;
      height: 100vh;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    
    .site-header {
      padding: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    }
    
    .site-header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    
    .site-info {
      display: flex;
      gap: 15px;
      align-items: center;
    }
    
    .site-badge {
      background: #007bff;
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
    }
    
    .timestamp {
      font-size: 12px;
      opacity: 0.8;
    }
    
    .babylon-container {
      flex: 1;
      position: relative;
      overflow: hidden;
    }
    
    .babylon-canvas {
      width: 100%;
      height: 100%;
      display: block;
      outline: none;
      cursor: grab;
    }
    
    .babylon-canvas:active {
      cursor: grabbing;
    }
    
    .loading-placeholder {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    
    .loading-content {
      text-align: center;
      color: white;
      padding: 40px;
    }
    
    .loading-content h2 {
      margin: 0 0 15px 0;
      font-size: 28px;
      font-weight: 300;
    }
    
    .loading-content p {
      margin: 0 0 20px 0;
      font-size: 16px;
      opacity: 0.9;
    }
    
    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-top: 3px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .canvas-overlay {
      position: absolute;
      top: 20px;
      left: 20px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 15px;
      border-radius: 8px;
      pointer-events: none;
    }
    
    .controls-info p {
      margin: 0 0 5px 0;
      font-size: 14px;
    }
    
    .scene-info {
      padding: 20px;
      background: rgba(255, 255, 255, 0.95);
      border-top: 3px solid #007bff;
    }
    
    .scene-info h3 {
      margin: 0 0 10px 0;
      color: #333;
    }
    
    .scene-info p {
      margin: 5px 0;
      color: #666;
    }
    
    code {
      background: #f8f9fa;
      padding: 2px 6px;
      border-radius: 4px;
      color: #d63384;
      font-weight: 500;
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
  
  // Computed signals
  protected currentUrl = computed(() => `/site/${this.siteId()}`);
  protected timestamp = computed(() => new Date().toLocaleString());
  
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
