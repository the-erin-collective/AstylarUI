import { Injectable } from '@angular/core';
import { Vector3 } from '@babylonjs/core';
import { DOMElement } from '../../../../types/dom-element';
import { PositionOffsets, ViewportData } from '../../../../types/positioning';
import { IFixedPositioning } from '../interfaces/positioning.interfaces';
import { PositioningUtils } from '../utils/positioning.utils';

@Injectable({
  providedIn: 'root'
})
export class FixedPositioningService implements IFixedPositioning {

  /**
   * Calculates fixed position relative to viewport
   * Fixed positioned elements are positioned relative to the viewport and remain
   * in the same position even when the camera/viewport moves
   */
  calculateFixedPosition(element: DOMElement, viewport: ViewportData, offsets: PositionOffsets): Vector3 {
    if (!element) {
      throw new Error('Element is required for fixed position calculation');
    }
    if (!viewport) {
      throw new Error('Viewport data is required for fixed positioning');
    }
    if (!offsets) {
      throw new Error('Position offsets are required for fixed positioning');
    }
    // Resolve viewport-relative values (vw, vh, percentages)
    const resolvedOffsets = this.resolveViewportValues(offsets, viewport);
    
    // Resolve offset conflicts (top wins over bottom, left wins over right)
    const finalOffsets = PositioningUtils.resolvePositionConflicts(resolvedOffsets);
    
    // Get element dimensions for positioning calculations
    const elementDimensions = this.getElementDimensions(element);
    
    // Start with viewport position (accounting for camera transform)
    let x = viewport.position.x;
    let y = viewport.position.y;
    const z = viewport.position.z;
    
    // Handle horizontal positioning relative to viewport
    if (finalOffsets.left !== undefined) {
      // Position from left edge of viewport
      const leftValue = PositioningUtils.parseLengthValue(finalOffsets.left);
      x += leftValue * viewport.scale;
    } else if (finalOffsets.right !== undefined) {
      // Position from right edge of viewport
      const rightValue = PositioningUtils.parseLengthValue(finalOffsets.right);
      x += (viewport.width - elementDimensions.width - rightValue) * viewport.scale;
    } else {
      // No horizontal positioning specified - use auto positioning
      x += this.getAutoHorizontalPosition(element, viewport);
    }
    
    // Handle vertical positioning relative to viewport
    if (finalOffsets.top !== undefined) {
      // Position from top edge of viewport
      const topValue = PositioningUtils.parseLengthValue(finalOffsets.top);
      y += topValue * viewport.scale;
    } else if (finalOffsets.bottom !== undefined) {
      // Position from bottom edge of viewport
      const bottomValue = PositioningUtils.parseLengthValue(finalOffsets.bottom);
      y += (viewport.height - elementDimensions.height - bottomValue) * viewport.scale;
    } else {
      // No vertical positioning specified - use auto positioning
      y += this.getAutoVerticalPosition(element, viewport);
    }
    
    // Apply camera transform to maintain fixed position relative to screen
    const screenPosition = this.applyViewportTransform(new Vector3(x, y, z), viewport);
    
    return screenPosition;
  }

  /**
   * Resolves viewport-relative values for fixed positioning
   * Handles vw, vh, percentages relative to viewport dimensions
   */
  resolveViewportValues(offsets: PositionOffsets, viewport: ViewportData): PositionOffsets {
    const resolved: PositionOffsets = {};
    
    // Resolve top and bottom relative to viewport height
    if (offsets.top !== undefined) {
      resolved.top = this.resolveViewportValue(offsets.top, viewport.height, 'vh');
    }
    if (offsets.bottom !== undefined) {
      resolved.bottom = this.resolveViewportValue(offsets.bottom, viewport.height, 'vh');
    }
    
    // Resolve left and right relative to viewport width
    if (offsets.left !== undefined) {
      resolved.left = this.resolveViewportValue(offsets.left, viewport.width, 'vw');
    }
    if (offsets.right !== undefined) {
      resolved.right = this.resolveViewportValue(offsets.right, viewport.width, 'vw');
    }
    
    return resolved;
  }

  /**
   * Checks if element is removed from normal document flow
   * Fixed positioned elements are always removed from flow
   */
  removedFromFlow(element: DOMElement): boolean {
    return true; // Fixed positioning removes element from flow
  }

  /**
   * Establishes containing block for descendants
   * Fixed positioned elements establish containing blocks
   */
  establishesContainingBlock(element: DOMElement): boolean {
    return true; // Fixed positioning establishes containing block
  }

  /**
   * Updates position when viewport changes (resize, camera movement)
   */
  updateForViewportChange(element: DOMElement, newViewport: ViewportData, offsets: PositionOffsets): Vector3 {
    // Recalculate position with new viewport data
    return this.calculateFixedPosition(element, newViewport, offsets);
  }

  /**
   * Checks if element should remain fixed during camera movement
   */
  remainsFixedDuringCameraMovement(element: DOMElement): boolean {
    return true; // Fixed elements always remain fixed during camera movement
  }

  /**
   * Calculates the screen-space coordinates for a fixed element
   */
  getScreenSpaceCoordinates(element: DOMElement, viewport: ViewportData, offsets: PositionOffsets): { x: number; y: number } {
    const resolvedOffsets = this.resolveViewportValues(offsets, viewport);
    const finalOffsets = PositioningUtils.resolvePositionConflicts(resolvedOffsets);
    
    let screenX = 0;
    let screenY = 0;
    
    // Calculate screen coordinates (0,0 at top-left)
    if (finalOffsets.left !== undefined) {
      screenX = PositioningUtils.parseLengthValue(finalOffsets.left);
    } else if (finalOffsets.right !== undefined) {
      const elementDimensions = this.getElementDimensions(element);
      const rightValue = PositioningUtils.parseLengthValue(finalOffsets.right);
      screenX = viewport.width - elementDimensions.width - rightValue;
    }
    
    if (finalOffsets.top !== undefined) {
      screenY = PositioningUtils.parseLengthValue(finalOffsets.top);
    } else if (finalOffsets.bottom !== undefined) {
      const elementDimensions = this.getElementDimensions(element);
      const bottomValue = PositioningUtils.parseLengthValue(finalOffsets.bottom);
      screenY = viewport.height - elementDimensions.height - bottomValue;
    }
    
    return { x: screenX, y: screenY };
  }

  /**
   * Handles viewport resize events
   */
  handleViewportResize(element: DOMElement, oldViewport: ViewportData, newViewport: ViewportData, offsets: PositionOffsets): Vector3 {
    // Fixed elements need to maintain their screen position relative to the new viewport size
    const screenCoords = this.getScreenSpaceCoordinates(element, newViewport, offsets);
    
    // Convert screen coordinates back to world coordinates
    return this.screenToWorldCoordinates(screenCoords, newViewport);
  }

  /**
   * Resolves a single viewport value (handles vw, vh, percentages)
   */
  private resolveViewportValue(value: string | number, viewportSize: number, unit: 'vw' | 'vh'): string | number {
    if (typeof value === 'number') {
      return value;
    }
    
    const stringValue = value.toString().trim();
    
    // Handle viewport units (vw, vh)
    if (stringValue.includes(unit)) {
      const numericValue = parseFloat(stringValue.replace(unit, ''));
      if (!isNaN(numericValue)) {
        return `${(numericValue / 100) * viewportSize}px`;
      }
    }
    
    // Handle percentage values (relative to viewport)
    if (stringValue.includes('%')) {
      const numericValue = parseFloat(stringValue.replace('%', ''));
      if (!isNaN(numericValue)) {
        return `${(numericValue / 100) * viewportSize}px`;
      }
    }
    
    // Return as-is for other units
    return value;
  }

  /**
   * Applies viewport transform to maintain fixed position
   */
  private applyViewportTransform(position: Vector3, viewport: ViewportData): Vector3 {
    // Apply camera transform to convert world coordinates to screen-fixed coordinates
    const transformed = PositioningUtils.transformPosition(position, viewport.cameraTransform);
    
    // Account for viewport scale
    return new Vector3(
      transformed.x * viewport.scale,
      transformed.y * viewport.scale,
      transformed.z
    );
  }

  /**
   * Gets auto horizontal position when left/right are not specified
   */
  private getAutoHorizontalPosition(element: DOMElement, viewport: ViewportData): number {
    // When both left and right are auto, use the static position
    // For fixed elements, this typically means left edge of viewport
    return 0;
  }

  /**
   * Gets auto vertical position when top/bottom are not specified
   */
  private getAutoVerticalPosition(element: DOMElement, viewport: ViewportData): number {
    // When both top and bottom are auto, use the static position
    // For fixed elements, this typically means top edge of viewport
    return 0;
  }

  /**
   * Converts screen coordinates to world coordinates
   */
  private screenToWorldCoordinates(screenCoords: { x: number; y: number }, viewport: ViewportData): Vector3 {
    // Convert screen coordinates back to world coordinates accounting for camera transform
    const worldX = (screenCoords.x / viewport.scale) + viewport.position.x;
    const worldY = (screenCoords.y / viewport.scale) + viewport.position.y;
    
    return new Vector3(worldX, worldY, viewport.position.z);
  }

  /**
   * Gets element dimensions
   */
  private getElementDimensions(element: DOMElement): { width: number; height: number } {
    const style = element.style || {};
    
    const width = style.width ? PositioningUtils.parseLengthValue(style.width) : undefined;
    const height = style.height ? PositioningUtils.parseLengthValue(style.height) : undefined;
    
    if (width === undefined || height === undefined) {
      throw new Error(`Element dimensions are required for positioning calculations. Element ${element.id} missing width or height.`);
    }
    
    return { width, height };
  }
}