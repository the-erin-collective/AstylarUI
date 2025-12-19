import { Injectable } from '@angular/core';
import { Vector3 } from '@babylonjs/core';
import { DOMElement } from '../../../types/dom-element';
import { ContainingBlock, TransformMatrix } from '../../../types/positioning';
import { IContainingBlockManager, IContainingBlockResolver } from './interfaces/positioning.interfaces';
import { PositioningUtils } from './utils/positioning.utils';

@Injectable({
  providedIn: 'root'
})
export class ContainingBlockManager implements IContainingBlockManager {
  private containingBlocks: Map<string, ContainingBlock> = new Map();
  private containingBlockResolver: ContainingBlockResolver;

  constructor() {
    this.containingBlockResolver = new ContainingBlockResolver();
  }

  /**
   * Finds the containing block for a given element
   */
  findContainingBlock(element: DOMElement): ContainingBlock {
    if (!element) {
      throw new Error('Element is required for containing block resolution');
    }

    // Check if we have a cached containing block
    const elementId = element.id || '';
    const cached = this.containingBlocks.get(elementId);
    
    if (cached) {
      return cached;
    }

    // Use resolver to find containing block
    const containingBlock = this.containingBlockResolver.findContainingBlock(element);
    
    // Cache the result
    if (elementId) {
      this.containingBlocks.set(elementId, containingBlock);
    }
    
    return containingBlock;
  }

  /**
   * Creates a new containing block for an element
   */
  createContainingBlock(element: DOMElement): ContainingBlock {
    if (!element) {
      throw new Error('Element is required for containing block creation');
    }

    const elementId = element.id || '';
    
    // Get element dimensions (this would come from layout calculations)
    const dimensions = this.getElementDimensions(element);
    
    // Get element position (this would come from layout calculations)
    const position = this.getElementPosition(element);
    
    // Create transform matrix if element has transforms
    const transform = this.getElementTransform(element);
    
    const containingBlock: ContainingBlock = {
      element,
      dimensions,
      position,
      transform,
      isViewport: false
    };

    // Cache the containing block
    if (elementId) {
      this.containingBlocks.set(elementId, containingBlock);
    }

    return containingBlock;
  }

  /**
   * Updates the dimensions of a containing block
   */
  updateContainingBlockDimensions(containingBlock: ContainingBlock): void {
    const newDimensions = this.getElementDimensions(containingBlock.element);
    containingBlock.dimensions = newDimensions;

    // Update cached version
    const elementId = containingBlock.element.id;
    if (elementId) {
      this.containingBlocks.set(elementId, containingBlock);
    }
  }

  /**
   * Gets coordinate transformation matrix between two containing blocks
   */
  getCoordinateTransform(from: ContainingBlock, to: ContainingBlock): TransformMatrix {
    // If same containing block, return identity
    if (from === to) {
      return PositioningUtils.createIdentityMatrix();
    }

    // Calculate transformation from 'from' to 'to' coordinate system
    const fromTransform = from.transform || PositioningUtils.createIdentityMatrix();
    const toTransform = to.transform || PositioningUtils.createIdentityMatrix();
    
    // For now, return a simple translation matrix
    // In a full implementation, this would handle complex transformations
    const translation = to.position.subtract(from.position);
    
    return {
      m: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        translation.x, translation.y, translation.z, 1
      ]
    };
  }

  /**
   * Clears cached containing blocks (useful for cleanup)
   */
  clearCache(): void {
    this.containingBlocks.clear();
  }

  /**
   * Removes a specific containing block from cache
   */
  removeCachedContainingBlock(elementId: string): void {
    this.containingBlocks.delete(elementId);
  }

  /**
   * Gets element dimensions from layout system
   * TODO: Integrate with actual layout service
   */
  private getElementDimensions(element: DOMElement) {
    // This would integrate with the existing layout system
    // For now, return default dimensions
    const style = element.style || {};
    
    const width = PositioningUtils.parseLengthValue(style.width) || 100;
    const height = PositioningUtils.parseLengthValue(style.height) || 100;
    
    // Parse padding
    const paddingTop = PositioningUtils.parseLengthValue(style.paddingTop || style.padding);
    const paddingRight = PositioningUtils.parseLengthValue(style.paddingRight || style.padding);
    const paddingBottom = PositioningUtils.parseLengthValue(style.paddingBottom || style.padding);
    const paddingLeft = PositioningUtils.parseLengthValue(style.paddingLeft || style.padding);
    
    return {
      width,
      height,
      contentWidth: width - paddingLeft - paddingRight,
      contentHeight: height - paddingTop - paddingBottom
    };
  }

  /**
   * Gets element position from layout system
   * TODO: Integrate with actual layout service
   */
  private getElementPosition(element: DOMElement): Vector3 {
    // This would integrate with the existing layout system
    // For now, return a default position
    return new Vector3(0, 0, 0);
  }

  /**
   * Gets element transform matrix
   */
  private getElementTransform(element: DOMElement): TransformMatrix | undefined {
    const style = element.style || {};
    
    if (style.transform) {
      // Parse transform string and create matrix
      // For now, return identity matrix
      return PositioningUtils.createIdentityMatrix();
    }
    
    return undefined;
  }
}

/**
 * Resolver class for containing block algorithm
 */
class ContainingBlockResolver implements IContainingBlockResolver {
  
  /**
   * Finds the containing block for an element according to CSS spec
   */
  findContainingBlock(element: DOMElement): ContainingBlock {
    let ancestor = this.getParentElement(element);
    
    while (ancestor) {
      // Check if ancestor establishes a containing block
      if (this.establishesContainingBlock(ancestor)) {
        return this.createContainingBlockFromElement(ancestor);
      }
      ancestor = this.getParentElement(ancestor);
    }
    
    // If no positioned ancestor found, use initial containing block (viewport)
    return this.createViewportContainingBlock();
  }

  /**
   * Checks if an element establishes a containing block
   */
  establishesContainingBlock(element: DOMElement): boolean {
    return PositioningUtils.establishesContainingBlock(element);
  }

  /**
   * Creates the initial containing block (viewport)
   */
  createViewportContainingBlock(): ContainingBlock {
    return {
      element: {
        id: 'viewport',
        type: 'div',
        style: {}
      } as DOMElement,
      dimensions: {
        width: 1920, // Default viewport width
        height: 1080, // Default viewport height
        contentWidth: 1920,
        contentHeight: 1080
      },
      position: new Vector3(0, 0, 0),
      isViewport: true
    };
  }

  /**
   * Creates a containing block from an element
   */
  private createContainingBlockFromElement(element: DOMElement): ContainingBlock {
    // This would integrate with the layout system to get actual dimensions and position
    const style = element.style || {};
    
    const width = PositioningUtils.parseLengthValue(style.width) || 100;
    const height = PositioningUtils.parseLengthValue(style.height) || 100;
    
    return {
      element,
      dimensions: {
        width,
        height,
        contentWidth: width,
        contentHeight: height
      },
      position: new Vector3(0, 0, 0), // Would come from layout system
      isViewport: false
    };
  }

  /**
   * Gets the parent element (placeholder for DOM traversal)
   */
  private getParentElement(element: DOMElement): DOMElement | null {
    // In a real implementation, this would traverse the DOM tree
    // For now, return null to simulate reaching the root
    return null;
  }
}