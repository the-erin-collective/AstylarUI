import { Injectable } from '@angular/core';
import { Vector3 } from '@babylonjs/core';
import { DOMElement } from '../../../types/dom-element';
import { 
  PositionMode, 
  PositionData, 
  ContainingBlock, 
  StackingContext, 
  ViewportData,
  ResolvedPosition
} from '../../../types/positioning';
import { IPositioningService } from './interfaces/positioning.interfaces';
import { ContainingBlockManager } from './containing-block.manager';
import { PositionCalculator } from './position-calculator.service';
import { StackingContextManager } from './stacking-context.manager';
import { ViewportService } from './viewport.service';
import { PositioningUtils } from './utils/positioning.utils';

@Injectable({
  providedIn: 'root'
})
export class PositioningService implements IPositioningService {
  private positionedElements: Map<string, PositionData> = new Map();

  constructor(
    private containingBlockManager: ContainingBlockManager,
    private positionCalculator: PositionCalculator,
    private stackingContextManager: StackingContextManager,
    private viewportService: ViewportService
  ) {}

  /**
   * Calculates position data for an element based on its positioning mode
   */
  calculatePosition(element: DOMElement, positionMode: PositionMode): PositionData {
    const elementId = element.id || '';
    
    // Get position offsets from element style
    const offsets = PositioningUtils.getPositionOffsets(element);
    
    // Find or create containing block
    const containingBlock = this.establishContainingBlock(element);
    
    // Calculate resolved position based on mode
    let resolvedPosition: Vector3;
    
    switch (positionMode) {
      case PositionMode.Relative:
        resolvedPosition = this.positionCalculator.calculateRelativePosition(element, offsets);
        break;
      case PositionMode.Absolute:
        resolvedPosition = this.positionCalculator.calculateAbsolutePosition(element, containingBlock, offsets);
        break;
      case PositionMode.Fixed:
        const viewport = this.getViewportData();
        resolvedPosition = this.positionCalculator.calculateFixedPosition(element, viewport, offsets);
        break;
      case PositionMode.Static:
      default:
        resolvedPosition = this.getNormalFlowPosition(element);
        break;
    }

    // Check if element establishes containing block
    const establishesContainingBlock = PositioningUtils.establishesContainingBlock(element);
    
    // Create or get stacking context
    const stackingContext = this.getStackingContext(element);

    const positionData: PositionData = {
      mode: positionMode,
      offsets,
      resolvedPosition,
      containingBlock,
      stackingContext,
      establishesContainingBlock
    };

    // Cache the position data
    if (elementId) {
      this.positionedElements.set(elementId, positionData);
    }

    return positionData;
  }

  /**
   * Establishes a containing block for an element
   */
  establishContainingBlock(element: DOMElement): ContainingBlock {
    const positionMode = PositioningUtils.getPositionMode(element);
    
    if (positionMode === PositionMode.Fixed) {
      // Fixed elements use viewport as containing block
      return this.containingBlockManager.findContainingBlock(element);
    } else if (positionMode === PositionMode.Absolute) {
      // Absolute elements use nearest positioned ancestor
      return this.containingBlockManager.findContainingBlock(element);
    } else {
      // Relative and static elements use their parent's containing block
      return this.containingBlockManager.findContainingBlock(element);
    }
  }

  /**
   * Resolves position values after unit conversion and calculation
   */
  resolvePositionValues(element: DOMElement, containingBlock: ContainingBlock): ResolvedPosition {
    const offsets = PositioningUtils.getPositionOffsets(element);
    const resolvedOffsets = this.positionCalculator.resolvePercentageValues(offsets, containingBlock);
    
    // Convert to pixel values
    const x = PositioningUtils.parseLengthValue(resolvedOffsets.left) - 
              PositioningUtils.parseLengthValue(resolvedOffsets.right);
    const y = PositioningUtils.parseLengthValue(resolvedOffsets.top) - 
              PositioningUtils.parseLengthValue(resolvedOffsets.bottom);
    
    return {
      x: x || 0,
      y: y || 0,
      z: 0
    };
  }

  /**
   * Updates a positioned element with new position data
   */
  updatePositionedElement(element: DOMElement, newPosition: PositionData): void {
    const elementId = element.id || '';
    
    if (elementId) {
      this.positionedElements.set(elementId, newPosition);
    }

    // Update containing block if element establishes one
    if (newPosition.establishesContainingBlock) {
      this.containingBlockManager.updateContainingBlockDimensions(newPosition.containingBlock);
    }

    // Update stacking context if needed
    if (newPosition.stackingContext) {
      this.stackingContextManager.updateStackingOrder(newPosition.stackingContext);
    }
  }

  /**
   * Gets or creates stacking context for an element
   */
  getStackingContext(element: DOMElement): StackingContext | undefined {
    // Check if element creates a stacking context
    if (!PositioningUtils.createsStackingContext(element)) {
      return undefined;
    }

    return this.stackingContextManager.createStackingContext(element);
  }

  /**
   * Gets cached position data for an element
   */
  getPositionData(elementId: string): PositionData | undefined {
    return this.positionedElements.get(elementId);
  }

  /**
   * Gets the calculated Z position for an element using stacking context
   */
  getElementZPosition(element: DOMElement): number {
    return this.stackingContextManager.calculateZPosition(element);
  }

  /**
   * Clears all cached positioning data
   */
  clearCache(): void {
    this.positionedElements.clear();
    this.stackingContextManager.clearAll();
    this.containingBlockManager.clearCache();
  }

  /**
   * Removes positioning data for a specific element
   */
  removeElement(elementId: string): void {
    this.positionedElements.delete(elementId);
    this.stackingContextManager.removeStackingContext(elementId);
    this.containingBlockManager.removeCachedContainingBlock(elementId);
  }



  /**
   * Gets viewport data for fixed positioning
   */
  private getViewportData(): ViewportData {
    return this.viewportService.getCurrentViewport();
  }

  /**
   * Gets normal flow position for an element
   * TODO: Integrate with actual layout system
   */
  private getNormalFlowPosition(element: DOMElement): Vector3 {
    // This would integrate with the existing layout system
    return new Vector3(0, 0, 0);
  }
}