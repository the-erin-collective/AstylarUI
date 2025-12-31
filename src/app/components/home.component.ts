import { Component, signal, inject, ElementRef, viewChild, afterNextRender, PLATFORM_ID, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Scene } from '@babylonjs/core';
import { SiteDataService } from '../services/site-data.service';
import { Astylar } from '../../lib';

/**
 * HomeComponent - Reproduces the visual style of the original SiteComponent
 * while using the new AstylarService library API.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
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
            <div class="left-section">
              <a routerLink="/" class="back-link">🏡</a>
              <span class="site-indicator">{{ siteId() }}</span>
            </div>
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
      cursor: default;
      background: #000;
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
    
    .left-section {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .back-link {
      color: white;
      text-decoration: none;
      font-size: 18px;
      opacity: 0.7;
      transition: opacity 0.2s;
      pointer-events: auto;
    }

    .back-link:hover {
      opacity: 1;
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
export class HomeComponent implements OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private astylar = inject(Astylar);
  private siteDataService = inject(SiteDataService);
  private route = inject(ActivatedRoute);

  // ViewChild for canvas element
  private babylonCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('babylonCanvas');

  // Scene from library
  private scene: Scene | null = null;

  // Signal for site ID
  protected siteId = signal<string>('dashboard');

  // Signal to track if scene is loaded
  protected sceneLoaded = signal<boolean>(false);

  constructor() {
    // Watch route params for dynamic site loading
    const rawSiteId = this.route.snapshot.paramMap.get('siteId');
    if (rawSiteId) {
      this.siteId.set(rawSiteId);
    }

    // Initialize Babylon.js after render, but only in browser
    afterNextRender(() => {
      if (isPlatformBrowser(this.platformId)) {
        this.initializeWithLibrary();
      }
    });
  }

  private initializeWithLibrary(): void {
    const canvas = this.babylonCanvas().nativeElement;
    const siteId = this.siteId();

    const siteData = this.siteDataService.getSiteData(siteId);
    if (!siteData) {
      console.error(`No site data found for: ${siteId}`);
      return;
    }

    console.log(`🚀 Initializing with Astylar.render() for site: ${siteId}`);

    this.scene = this.astylar.render(canvas, siteData);
    this.sceneLoaded.set(true);
  }

  ngOnDestroy(): void {
    if (this.scene) {
      this.scene.dispose();
      this.scene = null;
    }
  }
}