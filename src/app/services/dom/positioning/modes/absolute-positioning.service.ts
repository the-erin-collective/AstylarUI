import { Injectable } from '@angular/core';
import { Vector3 } from '@babylonjs/core';
import { DOMElement } from '../../../../types/dom-element';
import { ContainingBlock, PositionOffsets } from '../../../../types/positioning';
import { IAbsolutePositioning } from '../interfaces/positioning.interfaces';
import { PositioningUtils } from '../utils/positioning.utils';

@Injectable({
  providedIn: 'root'
})
export class AbsolutePositioningService implements IAbsolutePositioning {

  /**
   * Calculates absolute position relative to containing block
   * Absolutely positioned elements are removed from normal flow and positioned
   * relative to their nearest positioned ancestor (containing block)
   */
  calculateAbsolutePosition(element: DOMElement, containingBlock: ContainingBlock, offsets: PositionOffsets): Vector3 {
    if (!element) {
      throw new Error('Element is required for absolute position calculation');
    }
    if (!containingBlock) {
      throw new Error('Containing block is required for absolute positioning');
    }
    if (!offsets) {
      throw new Error('Position offsets are required for absolute positioning');
    }
    // Resolve percentage values relative to containing block dimensions
    const resolvedOffsets = this.resolvePercentageValues(offsets, containingBlock);
    
    // Resolve offset conflicts (top wins over bottom, left wins over right)
    const finalOffsets = PositioningUtils.resolvePositionConflicts(resolvedOffsets);
    
    // Get element dimensions for positioning calculations
    const elementDimensions = this.getElementDimensions(element);
    
    // Start with containing block's content area position
    let x = containingBlock.position.x;
    let y = containingBlock.position.y;
    const z = containingBlock.position.z;
    
    // Handle horizontal positioning
    if (finalOffsets.left !== undefined) {
      // Position from left edge of containing block
      const leftValue = PositioningUtils.parseLengthValue(finalOffsets.left);
      x += leftValue;
    } else if (finalOffsets.right !== undefined) {
      // Position from right edge of containing block
      const rightValue = PositioningUtils.parseLengthValue(finalOffsets.right);
      x += containingBlock.dimensions.contentWidth - elementDimensions.width - rightValue;
    } else {
      // No horizontal positioning specified - use static position or auto
      x += this.getAutoHorizontalPosition(element, containingBlock);
    }
    
    // Handle vertical positioning
    if (finalOffsets.top !== undefined) {
      // Position from top edge of containing block
      const topValue = PositioningUtils.parseLengthValue(finalOffsets.top);
      y += topValue;
    } else if (finalOffsets.bottom !== undefined) {
      // Position from bottom edge of containing block
      const bottomValue = PositioningUtils.parseLengthValue(finalOffsets.bottom);
      y += containingBlock.dimensions.contentHeight - elementDimensions.height - bottomValue;
    } else {
      // No vertical positioning specified - use static position or auto
      y += this.getAutoVerticalPosition(element, containingBlock);
    }
    
    return new Vector3(x, y, z);
  }

  /**
   * Resolves percentage values relative to containing block dimensions
   */
  resolvePercentageValues(offsets: PositionOffsets, containingBlock: ContainingBlock): PositionOffsets {
    const resolved: PositionOffsets = {};
    
    // Resolve top and bottom relative to containing block height
    if (offsets.top !== undefined) {
      resolved.top = this.resolvePercentageValue(offsets.top, containingBlock.dimensions.contentHeight);
    }
    if (offsets.bottom !== undefined) {
      resolved.bottom = this.resolvePercentageValue(offsets.bottom, containingBlock.dimensions.contentHeight);
    }
    
    // Resolve left and right relative to containing block width
    if (offsets.left !== undefined) {
      resolved.left = this.resolvePercentageValue(offsets.left, containingBlock.dimensions.contentWidth);
    }
    if (offsets.right !== undefined) {
      resolved.right = this.resolvePercentageValue(offsets.right, containingBlock.dimensions.contentWidth);
    }
    
    return resolved;
  }

  /**
   * Checks if element is removed from normal document flow
   * Absolutely positioned elements are always removed from flow
   */
  removedFromFlow(element: DOMElement): boolean {
    return true; // Absolute positioning removes element from flow
  }

  /**
   * Establishes containing block for descendants
   * Absolutely positioned elements establish containing blocks
   */
  establishesContainingBlock(element: DOMElement): boolean {
    return true; // Absolute positioning establishes containing block
  }

  /**
   * Calculates the shrink-to-fit width for absolutely positioned elements
   * When width is auto, absolutely positioned elements shrink to fit content
   */
  calculateShrinkToFitWidth(element: DOMElement, containingBlock: ContainingBlock): number {
    // This would calculate the minimum width needed to contain the element's content
    // For now, return a default width
    const style = element.style || {};
    
    if (style.width !== undefined && style.width !== 'auto') {
      return PositioningUtils.parseLengthValue(style.width);
    }
    
    // Calculate based on content (placeholder implementation)
    return this.getContentWidth(element);
  }

  /**
   * Handles over-constrained situations where both left/right and width are specified
   */
  resolveOverConstrainedHorizontal(
    element: DOMElement, 
    containingBlock: ContainingBlock, 
    offsets: PositionOffsets
  ): { left: number; width: number } {
    const elementDimensions = this.getElementDimensions(element);
    const leftValue = PositioningUtils.parseLengthValue(offsets.left);
    const rightValue = PositioningUtils.parseLengthValue(offsets.right);
    
    // If all three values (left, right, width) are specified, ignore right
    if (offsets.left !== undefined && offsets.right !== undefined) {
      return {
        left: leftValue,
        width: elementDimensions.width
      };
    }
    
    // Calculate width from left and right constraints
    if (offsets.left !== undefined && offsets.right !== undefined) {
      const availableWidth = containingBlock.dimensions.contentWidth - leftValue - rightValue;
      return {
        left: leftValue,
        width: Math.max(0, availableWidth)
      };
    }
    
    return {
      left: leftValue,
      width: elementDimensions.width
    };
  }

  /**
   * Handles over-constrained situations where both top/bottom and height are specified
   */
  resolveOverConstrainedVertical(
    element: DOMElement, 
    containingBlock: ContainingBlock, 
    offsets: PositionOffsets
  ): { top: number; height: number } {
    const elementDimensions = this.getElementDimensions(element);
    const topValue = PositioningUtils.parseLengthValue(offsets.top);
    const bottomValue = PositioningUtils.parseLengthValue(offsets.bottom);
    
    // If all three values (top, bottom, height) are specified, ignore bottom
    if (offsets.top !== undefined && offsets.bottom !== undefined) {
      return {
        top: topValue,
        height: elementDimensions.height
      };
    }
    
    // Calculate height from top and bottom constraints
    if (offsets.top !== undefined && offsets.bottom !== undefined) {
      const availableHeight = containingBlock.dimensions.contentHeight - topValue - bottomValue;
      return {
        top: topValue,
        height: Math.max(0, availableHeight)
      };
    }
    
    return {
      top: topValue,
      height: elementDimensions.height
    };
  }

  /**
   * Resolves a single percentage value
   */
  private resolvePercentageValue(value: string | number, referenceSize: number): string | number {
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
    
    // Return as-is for other units
    return value;
  }

  /**
   * Gets auto horizontal position when left/right are not specified
   */
  private getAutoHorizontalPosition(element: DOMElement, containingBlock: ContainingBlock): number {
    // When both left and right are auto, use the static position
    // For now, return 0 (would integrate with layout system)
    return 0;
  }

  /**
   * Gets auto vertical position when top/bottom are not specified
   */
  private getAutoVerticalPosition(element: DOMElement, containingBlock: ContainingBlock): number {
    // When both top and bottom are auto, use the static position
    // For now, return 0 (would integrate with layout system)
    return 0;
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

  /**
   * Gets content width for shrink-to-fit calculations
   */
  private getContentWidth(element: DOMElement): number {
    // This would calculate the minimum width needed for the element's content
    // For now, return a default value
    return 100;
  }
}