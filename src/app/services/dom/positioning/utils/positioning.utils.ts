import { Vector3 } from '@babylonjs/core';
import { DOMElement } from '../../../../types/dom-element';
import { PositionMode, PositionOffsets, TransformMatrix } from '../../../../types/positioning';

/**
 * Utility functions for positioning calculations
 */
export class PositioningUtils {
  
  /**
   * Determines the position mode from element style
   */
  static getPositionMode(element: DOMElement): PositionMode {
    const position = element.style?.position;
    
    switch (position) {
      case 'relative':
        return PositionMode.Relative;
      case 'absolute':
        return PositionMode.Absolute;
      case 'fixed':
        return PositionMode.Fixed;
      case 'static':
      default:
        return PositionMode.Static;
    }
  }

  /**
   * Extracts position offsets from element style
   */
  static getPositionOffsets(element: DOMElement): PositionOffsets {
    const style = element.style || {};
    
    return {
      top: style.top,
      right: style.right,
      bottom: style.bottom,
      left: style.left
    };
  }

  /**
   * Checks if an element establishes a containing block
   */
  static establishesContainingBlock(element: DOMElement): boolean {
    const style = element.style || {};
    const position = style.position;
    
    return position === 'relative' || 
           position === 'absolute' || 
           position === 'fixed' ||
           style.transform !== undefined ||
           style.perspective !== undefined;
  }

  /**
   * Parses a CSS length value and returns numeric value in pixels
   * Throws error for invalid values to surface bugs instead of masking them
   */
  static parseLengthValue(value: string | number | undefined, referenceSize?: number): number {
    if (value === undefined || value === null) {
      return 0; // CSS spec: undefined/null positioning values default to 0
    }

    if (typeof value === 'number') {
      return value;
    }

    const stringValue = value.toString().trim();
    
    // Handle CSS keywords that have defined behavior
    if (stringValue === 'auto' || stringValue === '') {
      return 0; // CSS spec: auto positioning resolves to 0 in most contexts
    }

    // Parse numeric value and unit
    const match = stringValue.match(/^(-?\d*\.?\d+)(px|%|em|rem|vw|vh)?$/);
    if (!match) {
      throw new Error(`Invalid CSS length value: "${stringValue}". Expected format: number + optional unit (px, %, em, rem, vw, vh)`);
    }

    const numericValue = parseFloat(match[1]);
    if (isNaN(numericValue)) {
      throw new Error(`Invalid numeric value in CSS length: "${stringValue}"`);
    }

    const unit = match[2] || 'px';

    switch (unit) {
      case 'px':
        return numericValue;
      case '%':
        if (referenceSize === undefined) {
          throw new Error(`Percentage value "${stringValue}" requires a reference size for calculation`);
        }
        return (numericValue / 100) * referenceSize;
      case 'em':
        // TODO: Should be based on element's font size - for now use CSS default
        return numericValue * 16;
      case 'rem':
        // TODO: Should be based on root font size - for now use CSS default
        return numericValue * 16;
      case 'vw':
        // TODO: Should inject ViewportService for actual viewport dimensions
        return numericValue * 19.2; // Temporary - needs ViewportService integration
      case 'vh':
        // TODO: Should inject ViewportService for actual viewport dimensions  
        return numericValue * 10.8; // Temporary - needs ViewportService integration
      default:
        throw new Error(`Unsupported CSS unit: "${unit}" in value "${stringValue}"`);
    }
  }

  /**
   * Resolves conflicting position values (e.g., both top and bottom specified)
   */
  static resolvePositionConflicts(offsets: PositionOffsets): PositionOffsets {
    const resolved: PositionOffsets = { ...offsets };

    // CSS spec: if both top and bottom are specified, top wins
    if (resolved.top !== undefined && resolved.bottom !== undefined) {
      delete resolved.bottom;
    }

    // CSS spec: if both left and right are specified, left wins (in LTR)
    if (resolved.left !== undefined && resolved.right !== undefined) {
      delete resolved.right;
    }

    return resolved;
  }

  /**
   * Creates an identity transform matrix
   */
  static createIdentityMatrix(): TransformMatrix {
    return {
      m: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
      ]
    };
  }

  /**
   * Multiplies two transform matrices
   */
  static multiplyMatrices(a: TransformMatrix, b: TransformMatrix): TransformMatrix {
    const result = new Array(16);
    
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        result[i * 4 + j] = 0;
        for (let k = 0; k < 4; k++) {
          result[i * 4 + j] += a.m[i * 4 + k] * b.m[k * 4 + j];
        }
      }
    }
    
    return { m: result };
  }

  /**
   * Transforms a Vector3 position using a transform matrix
   */
  static transformPosition(position: Vector3, matrix: TransformMatrix): Vector3 {
    const x = position.x * matrix.m[0] + position.y * matrix.m[4] + position.z * matrix.m[8] + matrix.m[12];
    const y = position.x * matrix.m[1] + position.y * matrix.m[5] + position.z * matrix.m[9] + matrix.m[13];
    const z = position.x * matrix.m[2] + position.y * matrix.m[6] + position.z * matrix.m[10] + matrix.m[14];
    
    return new Vector3(x, y, z);
  }

  /**
   * Gets the z-index value from element style
   */
  static getZIndex(element: DOMElement): number {
    const zIndex = element.style?.zIndex;
    
    if (zIndex === undefined || zIndex === 'auto') {
      return 0;
    }
    
    const parsed = parseInt(zIndex.toString(), 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Checks if an element creates a stacking context
   */
  static createsStackingContext(element: DOMElement): boolean {
    const style = element.style || {};
    
    // Position with z-index other than auto
    if ((style.position === 'relative' || style.position === 'absolute' || style.position === 'fixed') &&
        style.zIndex !== undefined && style.zIndex !== 'auto') {
      return true;
    }
    
    // Transform
    if (style.transform !== undefined) {
      return true;
    }
    
    // Opacity less than 1
    if (style.opacity !== undefined && parseFloat(style.opacity.toString()) < 1) {
      return true;
    }
    
    return false;
  }
}