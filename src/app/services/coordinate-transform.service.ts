import { Injectable } from '@angular/core';
import { Vector3 } from '@babylonjs/core';

/**
 * Service to handle coordinate transformations between logical coordinates
 * (used in layout calculations) and rendering coordinates (used by Babylon.js).
 * 
 * This abstraction allows the rest of the codebase to work with logical coordinates
 * while the rendering system uses the appropriate transformed coordinates.
 */
@Injectable({
  providedIn: 'root'
})
export class CoordinateTransformService {
  /**
   * Transform logical coordinates to rendering coordinates
   * 
   * @param x Logical X coordinate (positive right)
   * @param y Logical Y coordinate (positive up)
   * @param z Logical Z coordinate (positive out)
   * @returns Vector3 with transformed coordinates for rendering
   */
  public transformToRenderCoordinates(x: number, y: number, z: number): Vector3 {
    // The main issue is that X appears mirrored in the rendering system
    // So we negate the X coordinate to fix this
    return new Vector3(-x, y, z);
  }

  /**
   * Transform rendering coordinates back to logical coordinates
   * 
   * @param renderPosition Vector3 with rendering coordinates
   * @returns Object with logical x, y, z coordinates
   */
  public transformToLogicalCoordinates(renderPosition: Vector3): { x: number, y: number, z: number } {
    // Reverse the transformation
    return {
      x: -renderPosition.x,
      y: renderPosition.y,
      z: renderPosition.z
    };
  }
}