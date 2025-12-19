import { Injectable } from '@angular/core';
import { Vector3 } from '@babylonjs/core';
import { DOMElement } from '../../../../types/dom-element';
import { PositionOffsets } from '../../../../types/positioning';
import { IRelativePositioning } from '../interfaces/positioning.interfaces';
import { PositioningUtils } from '../utils/positioning.utils';

@Injectable({
  providedIn: 'root'
})
export class RelativePositioningService implements IRelativePositioning {

  /**
   * Calculates relative position with offsets from normal flow position
   * Relative positioning moves an element from its normal position but preserves
   * the space it would have occupied in the document flow
   */
  calculateRelativePosition(element: DOMElement, offsets: PositionOffsets): Vector3 {
    if (!element) {
      throw new Error('Element is required for relative position calculation');
    }
    if (!offsets) {
      throw new Error('Position offsets are required for relative positioning');
    }
    // Get the element's normal flow position (where it would be without positioning)
    const normalPosition = this.getNormalFlowPosition(element);
    
    // Resolve offset conflicts according to CSS spec
    // If both top and bottom are specified, top wins
    // If both left and right are specified, left wins (in LTR)
    const resolvedOffsets = PositioningUtils.resolvePositionConflicts(offsets);
    
    // Resolve offset values relative to parent element
    const parentElement = this.getParentElement(element);
    const finalOffsets = this.resolveOffsetValues(resolvedOffsets, parentElement);
    
    // Calculate pixel values for each offset
    const topOffset = PositioningUtils.parseLengthValue(finalOffsets.top);
    const rightOffset = PositioningUtils.parseLengthValue(finalOffsets.right);
    const bottomOffset = PositioningUtils.parseLengthValue(finalOffsets.bottom);
    const leftOffset = PositioningUtils.parseLengthValue(finalOffsets.left);
    
    // Apply offsets to normal position
    // Positive top moves down, positive left moves right
    const x = normalPosition.x + leftOffset - rightOffset;
    const y = normalPosition.y + topOffset - bottomOffset;
    const z = normalPosition.z; // Z-position typically unchanged for relative positioning
    
    return new Vector3(x, y, z);
  }

  /**
   * Resolves offset values relative to parent element
   * Handles percentage values and unit conversions
   */
  resolveOffsetValues(offsets: PositionOffsets, parent: DOMElement | null): PositionOffsets {
    // For relative positioning, if no parent is available, we can still process
    // the offsets as pixel values (this is valid CSS behavior)
    if (!parent) {
      return offsets;
    }

    const parentDimensions = this.getElementDimensions(parent);
    const resolved: PositionOffsets = {};

    // Resolve top and bottom relative to parent height
    if (offsets.top !== undefined) {
      resolved.top = this.resolveOffsetValue(offsets.top, parentDimensions.height);
    }
    if (offsets.bottom !== undefined) {
      resolved.bottom = this.resolveOffsetValue(offsets.bottom, parentDimensions.height);
    }

    // Resolve left and right relative to parent width
    if (offsets.left !== undefined) {
      resolved.left = this.resolveOffsetValue(offsets.left, parentDimensions.width);
    }
    if (offsets.right !== undefined) {
      resolved.right = this.resolveOffsetValue(offsets.right, parentDimensions.width);
    }

    return resolved;
  }

  /**
   * Checks if an element preserves space in normal flow
   * Relatively positioned elements always preserve their space
   */
  preservesSpaceInFlow(element: DOMElement): boolean {
    return true; // Relative positioning always preserves space
  }

  /**
   * Establishes containing block for absolutely positioned descendants
   * Relatively positioned elements establish containing blocks
   */
  establishesContainingBlock(element: DOMElement): boolean {
    return true; // Relative positioning establishes containing block
  }

  /**
   * Gets the offset bounds for an element (used for collision detection)
   */
  getOffsetBounds(element: DOMElement, offsets: PositionOffsets): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } {
    const resolvedOffsets = PositioningUtils.resolvePositionConflicts(offsets);
    const parentElement = this.getParentElement(element);
    const finalOffsets = this.resolveOffsetValues(resolvedOffsets, parentElement);
    
    const topOffset = PositioningUtils.parseLengthValue(finalOffsets.top);
    const rightOffset = PositioningUtils.parseLengthValue(finalOffsets.right);
    const bottomOffset = PositioningUtils.parseLengthValue(finalOffsets.bottom);
    const leftOffset = PositioningUtils.parseLengthValue(finalOffsets.left);
    
    const elementDimensions = this.getElementDimensions(element);
    
    return {
      minX: leftOffset - rightOffset,
      maxX: leftOffset - rightOffset + elementDimensions.width,
      minY: topOffset - bottomOffset,
      maxY: topOffset - bottomOffset + elementDimensions.height
    };
  }

  /**
   * Resolves a single offset value with percentage support
   */
  private resolveOffsetValue(value: string | number, referenceSize: number): string | number {
    if (typeof value === 'number') {
      return value;
    }

    const stringValue = value.toString().trim();
    
    // Handle percentage values
    if (stringValue.includes('%')) {
      const numericValue = parseFloat(stringValue.replace('%', ''));
      if (!isNaN(numericValue)) {
        return `${(numericValue / 100) * referenceSize}px`;
      }
    }

    // Return as-is for other units (px, em, rem, etc.)
    return value;
  }

  /**
   * Gets the normal flow position for an element
   * TODO: Integrate with actual layout system
   */
  private getNormalFlowPosition(element: DOMElement): Vector3 {
    // This would integrate with the existing layout system to get
    // the position where the element would be in normal document flow
    // For now, return a placeholder position
    return new Vector3(0, 0, 0);
  }

  /**
   * Gets the parent element for offset calculations
   * TODO: Integrate with actual DOM tree traversal
   */
  private getParentElement(element: DOMElement): DOMElement | null {
    // This would traverse the actual DOM tree to find the parent
    // For now, return null (will use default calculations)
    return null;
  }

  /**
   * Gets element dimensions for calculations
   * TODO: Integrate with actual layout system
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