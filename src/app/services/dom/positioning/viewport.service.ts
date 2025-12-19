import { Injectable } from '@angular/core';
import { Vector3 } from '@babylonjs/core';
import { ViewportData, TransformMatrix } from '../../../types/positioning';
import { PositioningUtils } from './utils/positioning.utils';

/**
 * Service for managing viewport data for positioning calculations
 * Integrates with camera and scene to provide accurate viewport information
 */
@Injectable({
  providedIn: 'root'
})
export class ViewportService {
  private currentViewport: ViewportData | null = null;

  /**
   * Gets current viewport data
   * TODO: Integrate with actual camera/scene service
   */
  getCurrentViewport(): ViewportData {
    if (!this.currentViewport) {
      // Initialize with default viewport - should be replaced with actual camera data
      this.currentViewport = {
        width: 1920, // TODO: Get from actual scene/camera
        height: 1080, // TODO: Get from actual scene/camera
        position: new Vector3(0, 0, 0), // TODO: Get from camera position
        cameraTransform: PositioningUtils.createIdentityMatrix(), // TODO: Get from camera transform
        scale: 1 // TODO: Get from camera scale/zoom
      };
    }
    
    return this.currentViewport;
  }

  /**
   * Updates viewport data (called when camera moves or viewport resizes)
   */
  updateViewport(viewport: Partial<ViewportData>): void {
    if (!this.currentViewport) {
      this.currentViewport = this.getCurrentViewport();
    }

    // Update only provided properties
    if (viewport.width !== undefined) {
      this.currentViewport.width = viewport.width;
    }
    if (viewport.height !== undefined) {
      this.currentViewport.height = viewport.height;
    }
    if (viewport.position !== undefined) {
      this.currentViewport.position = viewport.position;
    }
    if (viewport.cameraTransform !== undefined) {
      this.currentViewport.cameraTransform = viewport.cameraTransform;
    }
    if (viewport.scale !== undefined) {
      this.currentViewport.scale = viewport.scale;
    }
  }

  /**
   * Converts viewport units (vw, vh) to pixels
   */
  convertViewportUnit(value: number, unit: 'vw' | 'vh'): number {
    const viewport = this.getCurrentViewport();
    
    switch (unit) {
      case 'vw':
        return (value / 100) * viewport.width;
      case 'vh':
        return (value / 100) * viewport.height;
      default:
        throw new Error(`Invalid viewport unit: ${unit}`);
    }
  }

  /**
   * Gets viewport dimensions for percentage calculations
   */
  getViewportDimensions(): { width: number; height: number } {
    const viewport = this.getCurrentViewport();
    return {
      width: viewport.width,
      height: viewport.height
    };
  }

  /**
   * Checks if viewport data is available
   */
  isViewportAvailable(): boolean {
    return this.currentViewport !== null;
  }
}