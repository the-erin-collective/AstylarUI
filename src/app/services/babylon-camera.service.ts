import { Injectable } from '@angular/core';
import { Scene, FreeCamera, Vector3 } from '@babylonjs/core';

@Injectable({
  providedIn: 'root'
})
export class BabylonCameraService {
  private camera?: FreeCamera;

  constructor() {}

  initialize(scene: Scene, canvas: HTMLCanvasElement): FreeCamera {
    // Create camera for true 2D viewing - looking straight at XY plane from positive Z
    this.camera = new FreeCamera('camera', new Vector3(0, 0, 30), scene);
    this.camera.setTarget(Vector3.Zero());
    this.camera.attachControl(canvas, true);
    
    // Disable camera movement to keep it in 2D mode
    this.camera.inputs.clear();
    
    return this.camera;
  }

  getCamera(): FreeCamera | undefined {
    return this.camera;
  }

  calculateViewportDimensions(): { width: number; height: number } {
    if (!this.camera) {
      throw new Error('Camera not initialized');
    }

    const cameraDistance = 30; // Camera is at Z=+30
    const fov = this.camera.fov || Math.PI / 3; // Default FOV is about 60 degrees
    
    // Calculate height based on FOV: height = 2 * distance * tan(fov/2)
    const visibleHeight = 2 * cameraDistance * Math.tan(fov / 2);
    
    // Calculate width based on canvas aspect ratio
    const scene = this.camera.getScene();
    const canvas = scene.getEngine().getRenderingCanvas();
    const aspectRatio = canvas ? canvas.width / canvas.height : 16/9;
    const visibleWidth = visibleHeight * aspectRatio;



    return { width: visibleWidth, height: visibleHeight };
  }

  /**
   * Calculate the correct scaling factor to convert CSS pixels to BabylonJS world units
   * based on the current camera setup and canvas size
   */
  getPixelToWorldScale(): number {
    if (!this.camera) {
      throw new Error('Camera not initialized');
    }

    const scene = this.camera.getScene();
    const canvas = scene.getEngine().getRenderingCanvas();
    const canvasHeight = canvas?.height || 1080;
    
    // Check if canvas is properly sized
    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      console.warn('⚠️ Canvas not properly sized yet, using fallback scale');
      return 0.025; // Reasonable fallback
    }
    
    const { height: worldHeight } = this.calculateViewportDimensions();
    
    // Calculate how many world units per CSS pixel
    const pixelToWorldScale = worldHeight / canvasHeight;
    
    console.log('pixelToWorldScale', pixelToWorldScale);

    return pixelToWorldScale;
  }

  /**
   * Snap world coordinates to pixel boundaries for sharp rendering
   * This prevents sub-pixel positioning that causes anti-aliasing
   */
  snapToPixelBoundary(worldPosition: { x: number; y: number; z?: number }): { x: number; y: number; z: number } {
    const scale = this.getPixelToWorldScale();
    
    // Convert to pixels, round to integers, convert back to world units
    const pixelX = Math.round(worldPosition.x / scale);
    const pixelY = Math.round(worldPosition.y / scale);
    
    return {
      x: pixelX * scale,
      y: pixelY * scale,
      z: worldPosition.z || 0
    };
  }

  /**
   * Snap border width to pixel boundaries for consistent rendering
   * This is the single source of truth for border width calculations
   */
  snapBorderWidthToPixel(borderWidth: number): number {
    const scale = this.getPixelToWorldScale();
    const pixelWidth = Math.max(1, Math.round(borderWidth / scale)); // Minimum 1 pixel
    const snappedWidth = pixelWidth * scale;
    
    console.log('🎯 Unified border width calculation:', {
      originalWidth: borderWidth.toFixed(6),
      scale: scale.toFixed(6),
      pixelWidth: pixelWidth,
      snappedWidth: snappedWidth.toFixed(6),
      canvasInfo: {
        width: this.camera?.getScene().getEngine().getRenderingCanvas()?.width || 'unknown',
        height: this.camera?.getScene().getEngine().getRenderingCanvas()?.height || 'unknown'
      }
    });
    
    return snappedWidth;
  }

  /**
   * Calculate all border dimensions and positions in one unified operation
   * This ensures complete consistency across all border calculations
   */
  calculateUnifiedBorderLayout(
    centerX: number, 
    centerY: number, 
    centerZ: number, 
    elementWidth: number, 
    elementHeight: number, 
    borderWidth: number
  ): {
    snappedBorderWidth: number;
    elementBounds: { left: number; right: number; top: number; bottom: number };
    borderPositions: {
      top: { x: number; y: number; z: number };
      bottom: { x: number; y: number; z: number };
      left: { x: number; y: number; z: number };
      right: { x: number; y: number; z: number };
    };
    borderDimensions: {
      horizontal: { width: number; height: number }; // top & bottom borders
      vertical: { width: number; height: number };   // left & right borders
    };
  } {
    // Single calculation of snapped border width - used everywhere
    const snappedBorderWidth = this.snapBorderWidthToPixel(borderWidth);
    
    // Snap the element center to pixel boundaries
    const snappedCenter = this.snapToPixelBoundary({ x: centerX, y: centerY, z: centerZ });
    
    // Calculate element boundaries using snapped coordinates
    const elementBounds = {
      left: snappedCenter.x - (elementWidth / 2),
      right: snappedCenter.x + (elementWidth / 2),
      top: snappedCenter.y + (elementHeight / 2),
      bottom: snappedCenter.y - (elementHeight / 2)
    };
    
    // Border Z position - significantly in front of the main element
    const borderZ = centerZ + 0.01; // Much larger offset to ensure visibility and avoid Z-fighting
    
    // Calculate border positions using consistent edge coordinates
    const borderPositions = {
      // Top border: centered horizontally, positioned above element
      top: this.snapToPixelBoundary({
        x: snappedCenter.x,
        y: elementBounds.top - (snappedBorderWidth / 3),
        z: borderZ
      }),
      
      // Bottom border: centered horizontally, positioned below element  
      bottom: this.snapToPixelBoundary({
        x: snappedCenter.x,
        y: elementBounds.bottom + (snappedBorderWidth / 3),
        z: borderZ
      }),
      
      // Left border: positioned at the left edge of the horizontal borders
      left: this.snapToPixelBoundary({
        x: elementBounds.left - (snappedBorderWidth  ),
        y: snappedCenter.y,
        z: borderZ
      }),
      
      // Right border: positioned at the right edge of the horizontal borders
      right: this.snapToPixelBoundary({
        x: elementBounds.right + (snappedBorderWidth ),
        y: snappedCenter.y,
        z: borderZ
      })
    };
    
    // Calculate border mesh dimensions - ensuring clean corner joints with slight overlap
    const borderDimensions = {
      // Horizontal borders (top & bottom) span element width + one border width for better corner coverage
      horizontal: {
        width: elementWidth + snappedBorderWidth,
        height: snappedBorderWidth
      },
      // Vertical borders (left & right) span element height only (no overlap with horizontal)
      vertical: {
        width: snappedBorderWidth,
        height: elementHeight
      }
    };
    
    return {
      snappedBorderWidth,
      elementBounds,
      borderPositions,
      borderDimensions
    };
  }

  cleanup(): void {
    this.camera?.dispose();
    this.camera = undefined;
  }
}
