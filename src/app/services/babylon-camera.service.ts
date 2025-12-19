import { Injectable } from '@angular/core';
import { Scene, FreeCamera, Vector3 } from '@babylonjs/core';

@Injectable({
  providedIn: 'root'
})
export class BabylonCameraService {
  private camera?: FreeCamera;

  constructor() {}

  initialize(scene: Scene, canvas: HTMLCanvasElement): FreeCamera {
    // Get device pixel ratio to account for high-DPI displays
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // Base camera distance - this is the distance that works well with DPR=1
    const baseCameraDistance = 30;
    
    // For higher DPR, we need to move the camera CLOSER to maintain the same field of view
    // This is the opposite of what we tried before
    const adjustedCameraDistance = baseCameraDistance / devicePixelRatio;
    
    console.log(`[DPR] Camera distance adjustment: base=${baseCameraDistance}, adjusted=${adjustedCameraDistance} (DPR: ${devicePixelRatio})`);
    
    // Create camera for true 2D viewing - looking straight at XY plane from positive Z
    // Use the adjusted camera distance to account for DPR
    this.camera = new FreeCamera('camera', new Vector3(0, 0, adjustedCameraDistance), scene);
    this.camera.setTarget(Vector3.Zero());
    this.camera.attachControl(canvas, true);
    
    // Disable camera movement to keep it in 2D mode
    this.camera.inputs.clear();
    
    // Log DPR information when the camera is initialized
    console.log(`[DPR] Camera initialized with DPR: ${devicePixelRatio}`);
    console.log(`[DPR] Canvas size: ${canvas.width}x${canvas.height} device pixels`);
    console.log(`[DPR] CSS canvas size: ${(canvas.width / devicePixelRatio).toFixed(2)}x${(canvas.height / devicePixelRatio).toFixed(2)} CSS pixels`);
    
    // Log detailed DPR information
    setTimeout(() => {
      this.logDprInfo();
    }, 100); // Slight delay to ensure canvas is properly sized
    
    return this.camera;
  }

  getCamera(): FreeCamera | undefined {
    return this.camera;
  }

  /**
   * Calculate the dimensions of the viewport in world units
   * This method accounts for the device pixel ratio to ensure consistent sizing
   * across different screen densities
   */
  calculateViewportDimensions(): { width: number; height: number } {
    if (!this.camera) {
      throw new Error('Camera not initialized');
    }

    const cameraDistance = Math.abs(this.camera.position.z); // Use actual camera distance
    const fov = this.camera.fov || Math.PI / 3; // Default FOV is about 60 degrees
    
    // Calculate height based on FOV: height = 2 * distance * tan(fov/2)
    const visibleHeight = 2 * cameraDistance * Math.tan(fov / 2);
    
    // Calculate width based on canvas aspect ratio
    // IMPORTANT: Use CSS pixel dimensions for aspect ratio to account for DPR
    const scene = this.camera.getScene();
    const canvas = scene.getEngine().getRenderingCanvas();
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // Use the actual canvas dimensions for aspect ratio
    // This is important because the canvas is sized in device pixels
    const canvasWidth = canvas ? canvas.width : 1920;
    const canvasHeight = canvas ? canvas.height : 1080;
    const aspectRatio = canvasWidth / canvasHeight;
    
    const visibleWidth = visibleHeight * aspectRatio;
    
    console.log(`[DPR] Viewport dimensions calculation:
      - Camera distance: ${cameraDistance} world units
      - FOV: ${(fov * 180 / Math.PI).toFixed(1)} degrees
      - Canvas size: ${canvasWidth}x${canvasHeight} device pixels
      - CSS size: ${(canvasWidth / devicePixelRatio).toFixed(1)}x${(canvasHeight / devicePixelRatio).toFixed(1)} CSS pixels
      - Aspect ratio: ${aspectRatio.toFixed(4)}
      - Visible dimensions: ${visibleWidth.toFixed(2)}x${visibleHeight.toFixed(2)} world units
      - Device pixel ratio: ${devicePixelRatio}
    `);

    return { width: visibleWidth, height: visibleHeight };
  }

  /**
   * Calculate the correct scaling factor to convert CSS pixels to BabylonJS world units
   * based on the current camera setup and canvas size
   * 
   * This method accounts for device pixel ratio (DPR) to ensure consistent rendering
   * across different screen densities. The calculation divides by DPR to ensure that
   * elements appear at the same physical size regardless of the device's pixel density.
   * 
   * IMPORTANT: This method returns the scale factor for converting CSS pixels to world units.
   * CSS pixels are logical pixels that are independent of the device's physical pixel density.
   * When working with percentages, always calculate them based on CSS pixels, then convert
   * to world units using this scale factor.
   */
  /**
   * Calculate the correct scaling factor to convert CSS pixels to BabylonJS world units
   * based on the current camera setup and canvas size
   * 
   * This method accounts for device pixel ratio (DPR) to ensure consistent rendering
   * across different screen densities.
   */
  getPixelToWorldScale(): number {
    if (!this.camera) {
      throw new Error('Camera not initialized');
    }

    const scene = this.camera.getScene();
    const canvas = scene.getEngine().getRenderingCanvas();
    
    // Check if canvas is properly sized
    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      console.warn('⚠️ Canvas not properly sized yet, using fallback scale');
      return 0.025; // Reasonable fallback
    }
    
    // Get device pixel ratio to account for high-DPI displays
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // Get canvas height in device pixels
    const canvasHeight = canvas.height;
    
    // Convert to CSS canvas height (logical pixels)
    const cssCanvasHeight = canvasHeight / devicePixelRatio;
    
    // Calculate viewport dimensions in world units
    const { height: worldHeight } = this.calculateViewportDimensions();
    
    // Calculate how many world units per CSS pixel
    // For higher DPR, we need to DIVIDE by DPR to ensure consistent sizing
    // This is the key adjustment that ensures elements appear at the same size regardless of DPR
    const baseScale = worldHeight / cssCanvasHeight;
    const pixelToWorldScale = baseScale / devicePixelRatio;
    
    // Enhanced logging for DPR debugging
    console.log(`[DPR] pixelToWorldScale calculation:
      - worldHeight: ${worldHeight.toFixed(4)} world units
      - canvasHeight: ${canvasHeight}px (device pixels)
      - cssCanvasHeight: ${cssCanvasHeight.toFixed(2)}px (CSS pixels)
      - devicePixelRatio: ${devicePixelRatio}
      - baseScale: ${baseScale.toFixed(6)} world units per CSS pixel
      - adjustedScale: ${pixelToWorldScale.toFixed(6)} world units per CSS pixel (adjusted for DPR)
    `);

    // Log additional viewport information for debugging
    console.log(`[DPR] Viewport information:
      - window.innerWidth: ${window.innerWidth}px (CSS pixels)
      - window.innerHeight: ${window.innerHeight}px (CSS pixels)
      - window.devicePixelRatio: ${devicePixelRatio}
      - canvas.width: ${canvas.width}px (device pixels)
      - canvas.height: ${canvas.height}px (device pixels)
      - CSS canvas width: ${(canvas.width / devicePixelRatio).toFixed(2)}px
      - CSS canvas height: ${(canvas.height / devicePixelRatio).toFixed(2)}px
    `);

    return pixelToWorldScale;
  }
  
  /**
   * Converts a percentage value to world units based on a container size in CSS pixels
   * This ensures consistent percentage calculations across different DPR values
   * 
   * @param percentage The percentage value (0-100)
   * @param containerSizeInCssPixels The container size in CSS pixels
   * @returns The equivalent size in world units
   */
  percentageToWorldUnits(percentage: number, containerSizeInCssPixels: number): number {
    // Calculate the size in CSS pixels
    const sizeInCssPixels = (percentage / 100) * containerSizeInCssPixels;
    
    // Convert CSS pixels to world units
    const worldUnits = this.cssPixelsToWorldUnits(sizeInCssPixels);
    
    console.log(`[DPR] Percentage to world units: ${percentage}% of ${containerSizeInCssPixels}px = ${sizeInCssPixels}px = ${worldUnits.toFixed(6)} world units`);
    
    return worldUnits;
  }

  /**
   * Snap world coordinates to pixel boundaries for sharp rendering
   * This prevents sub-pixel positioning that causes anti-aliasing
   * 
   * This method converts world coordinates to CSS pixels, rounds to the nearest pixel,
   * and then converts back to world coordinates. This ensures that elements are positioned
   * on exact pixel boundaries for sharp rendering.
   */
  snapToPixelBoundary(worldPosition: { x: number; y: number; z?: number }): { x: number; y: number; z: number } {
    const scale = this.getPixelToWorldScale();
    
    // Convert to CSS pixels, round to integers, convert back to world units
    const pixelX = Math.round(worldPosition.x / scale);
    const pixelY = Math.round(worldPosition.y / scale);
    
    const snappedX = pixelX * scale;
    const snappedY = pixelY * scale;
    
    // Enhanced logging for DPR debugging
    console.log(`[DPR] Snapping to pixel boundary:
      - Original world position: (${worldPosition.x.toFixed(6)}, ${worldPosition.y.toFixed(6)})
      - CSS pixel position: (${pixelX}, ${pixelY})
      - Snapped world position: (${snappedX.toFixed(6)}, ${snappedY.toFixed(6)})
      - Difference: (${(snappedX - worldPosition.x).toFixed(6)}, ${(snappedY - worldPosition.y).toFixed(6)})
    `);
    
    return {
      x: snappedX,
      y: snappedY,
      z: worldPosition.z || 0
    };
  }

  /**
   * Snap border width to pixel boundaries for consistent rendering
   * This is the single source of truth for border width calculations
   * 
   * This method converts a border width in world units to CSS pixels, ensures it's at least 1 pixel,
   * and then converts back to world units. This ensures that borders are always at least 1 CSS pixel
   * wide and are aligned to pixel boundaries for sharp rendering.
   */
  snapBorderWidthToPixel(borderWidth: number): number {
    const scale = this.getPixelToWorldScale();
    
    // Convert to CSS pixels, ensure minimum 1 pixel, convert back to world units
    const cssPixelWidth = borderWidth / scale;
    const roundedCssPixelWidth = Math.max(1, Math.round(cssPixelWidth)); // Minimum 1 CSS pixel
    const snappedWidth = roundedCssPixelWidth * scale;
    
    // Enhanced logging for DPR debugging
    console.log(`[DPR] Snapping border width to pixel boundary:
      - Original border width: ${borderWidth.toFixed(6)} world units
      - CSS pixel width: ${cssPixelWidth.toFixed(2)} CSS pixels
      - Rounded CSS pixel width: ${roundedCssPixelWidth} CSS pixels
      - Snapped border width: ${snappedWidth.toFixed(6)} world units
      - Scale factor: ${scale.toFixed(6)} world units per CSS pixel
    `);
    
    return snappedWidth;
  }

  /**
   * Calculate all border dimensions and positions in one unified operation
   * This ensures complete consistency across all border calculations
   * 
   * This method handles the complex calculations needed for border positioning and sizing,
   * ensuring that all borders are properly aligned to pixel boundaries for sharp rendering.
   * It accounts for DPR by using the snapToPixelBoundary and snapBorderWidthToPixel methods.
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
    const scale = this.getPixelToWorldScale();
    
    // Log input values for debugging
    console.log(`[DPR] calculateUnifiedBorderLayout input:
      - centerX: ${centerX.toFixed(6)} world units (${this.worldUnitsToCssPixels(centerX).toFixed(2)} CSS pixels)
      - centerY: ${centerY.toFixed(6)} world units (${this.worldUnitsToCssPixels(centerY).toFixed(2)} CSS pixels)
      - elementWidth: ${elementWidth.toFixed(6)} world units (${this.worldUnitsToCssPixels(elementWidth).toFixed(2)} CSS pixels)
      - elementHeight: ${elementHeight.toFixed(6)} world units (${this.worldUnitsToCssPixels(elementHeight).toFixed(2)} CSS pixels)
      - borderWidth: ${borderWidth.toFixed(6)} world units (${this.worldUnitsToCssPixels(borderWidth).toFixed(2)} CSS pixels)
      - Scale: ${scale.toFixed(6)} world units per CSS pixel
    `);
    
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
    
    // Calculate border positions - borders "grow inward" with outer edge aligned to element edge
    const borderPositions = {
      // Top border: positioned so its bottom edge aligns with element's top edge
      top: this.snapToPixelBoundary({
        x: snappedCenter.x,
        y: elementBounds.top - (snappedBorderWidth / 2),
        z: borderZ
      }),
      
      // Bottom border: positioned so its top edge aligns with element's bottom edge
      bottom: this.snapToPixelBoundary({
        x: snappedCenter.x,
        y: elementBounds.bottom + (snappedBorderWidth / 2),
        z: borderZ
      }),
      
      // Left border: positioned so its right edge aligns with element's left edge
      left: this.snapToPixelBoundary({
        x: elementBounds.left + (snappedBorderWidth / 2),
        y: snappedCenter.y,
        z: borderZ
      }),
      
      // Right border: positioned so its left edge aligns with element's right edge
      right: this.snapToPixelBoundary({
        x: elementBounds.right - (snappedBorderWidth / 2),
        y: snappedCenter.y,
        z: borderZ
      })
    };
    
    // Calculate border mesh dimensions - borders grow inward and fit within element boundaries
    const borderDimensions = {
      // Horizontal borders (top & bottom) reduced by border width to fit perfectly between vertical borders
      horizontal: {
        width: elementWidth - snappedBorderWidth,
        height: snappedBorderWidth
      },
      // Vertical borders (left & right) span element height minus border thickness to avoid corner overlap
      vertical: {
        width: snappedBorderWidth,
        height: elementHeight - (snappedBorderWidth * 2)
      }
    };
    
    // Log output values for debugging
    console.log(`[DPR] calculateUnifiedBorderLayout output:
      - snappedBorderWidth: ${snappedBorderWidth.toFixed(6)} world units (${this.worldUnitsToCssPixels(snappedBorderWidth).toFixed(2)} CSS pixels)
      - snappedCenter: (${snappedCenter.x.toFixed(6)}, ${snappedCenter.y.toFixed(6)}) world units
      - elementBounds: left=${elementBounds.left.toFixed(6)}, right=${elementBounds.right.toFixed(6)}, top=${elementBounds.top.toFixed(6)}, bottom=${elementBounds.bottom.toFixed(6)} world units
      - borderPositions: 
          top=(${borderPositions.top.x.toFixed(6)}, ${borderPositions.top.y.toFixed(6)})
          bottom=(${borderPositions.bottom.x.toFixed(6)}, ${borderPositions.bottom.y.toFixed(6)})
          left=(${borderPositions.left.x.toFixed(6)}, ${borderPositions.left.y.toFixed(6)})
          right=(${borderPositions.right.x.toFixed(6)}, ${borderPositions.right.y.toFixed(6)})
      - borderDimensions:
          horizontal: width=${borderDimensions.horizontal.width.toFixed(6)}, height=${borderDimensions.horizontal.height.toFixed(6)} world units
          vertical: width=${borderDimensions.vertical.width.toFixed(6)}, height=${borderDimensions.vertical.height.toFixed(6)} world units
    `);
    
    return {
      snappedBorderWidth,
      elementBounds,
      borderPositions,
      borderDimensions
    };
  }

  // Device pixel conversion methods removed as they're not needed in our workflow
  // We only care about CSS pixels and world units

  /**
   * Converts CSS pixels to world units based on the current camera setup
   * This is the primary method for converting from CSS pixels to world units
   * 
   * @param cssPixels The number of CSS pixels to convert
   * @returns The equivalent number of world units
   */
  cssPixelsToWorldUnits(cssPixels: number): number {
    const pixelToWorldScale = this.getPixelToWorldScale();
    const worldUnits = cssPixels * pixelToWorldScale;
    
    console.log(`[DPR] Converting ${cssPixels.toFixed(2)} CSS pixels to ${worldUnits.toFixed(6)} world units (scale: ${pixelToWorldScale.toFixed(6)})`);
    
    return worldUnits;
  }
  
  /**
   * Converts a container size in CSS pixels to world units, accounting for DPR
   * This is useful for ensuring consistent container sizing across different DPR values
   * 
   * @param containerSizeInCssPixels The container size in CSS pixels
   * @returns The equivalent size in world units
   */
  containerSizeToWorldUnits(containerSizeInCssPixels: number): number {
    // For container sizes, we need to ensure they're consistent across different DPR values
    const worldUnits = this.cssPixelsToWorldUnits(containerSizeInCssPixels);
    
    console.log(`[DPR] Container size conversion: ${containerSizeInCssPixels.toFixed(2)} CSS pixels = ${worldUnits.toFixed(6)} world units`);
    
    return worldUnits;
  }

  /**
   * Converts world units to CSS pixels based on the current camera setup
   * This is useful for debugging and understanding the relationship between world units and CSS pixels
   * 
   * @param worldUnits The number of world units to convert
   * @returns The equivalent number of CSS pixels
   */
  worldUnitsToCssPixels(worldUnits: number): number {
    const pixelToWorldScale = this.getPixelToWorldScale();
    const cssPixels = worldUnits / pixelToWorldScale;
    
    console.log(`[DPR] Converting ${worldUnits.toFixed(6)} world units to ${cssPixels.toFixed(2)} CSS pixels (scale: ${pixelToWorldScale.toFixed(6)})`);
    
    return cssPixels;
  }

  /**
   * Logs detailed information about the current DPR setup
   * This is useful for debugging DPR-related issues
   */
  logDprInfo(): void {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const pixelToWorldScale = this.getPixelToWorldScale();
    
    console.log(`[DPR] Detailed DPR Information:
      - Device Pixel Ratio: ${devicePixelRatio}
      - Pixel to World Scale: ${pixelToWorldScale.toFixed(6)} world units per CSS pixel
      - 1 CSS pixel = ${pixelToWorldScale.toFixed(6)} world units
      - 1 world unit = ${(1 / pixelToWorldScale).toFixed(2)} CSS pixels
    `);
    
    // Example conversions for common values
    console.log(`[DPR] Example conversions:
      - 100 CSS pixels = ${this.cssPixelsToWorldUnits(100).toFixed(6)} world units
      - 1 world unit = ${this.worldUnitsToCssPixels(1).toFixed(2)} CSS pixels
    `);
    
    // Log viewport and canvas information
    if (this.camera) {
      const scene = this.camera.getScene();
      const canvas = scene.getEngine().getRenderingCanvas();
      
      if (canvas) {
        console.log(`[DPR] Canvas information:
          - canvas.width: ${canvas.width}px (device pixels)
          - canvas.height: ${canvas.height}px (device pixels)
          - CSS canvas width: ${(canvas.width / devicePixelRatio).toFixed(2)}px
          - CSS canvas height: ${(canvas.height / devicePixelRatio).toFixed(2)}px
          - canvas.style.width: ${canvas.style.width || 'not set'}
          - canvas.style.height: ${canvas.style.height || 'not set'}
        `);
      }
    }
  }

  cleanup(): void {
    this.camera?.dispose();
    this.camera = undefined;
  }
}
