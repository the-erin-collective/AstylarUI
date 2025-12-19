import { Vector3 } from '@babylonjs/core';
import { DOMElement } from '../../../../types/dom-element';
import { 
  PositionMode, 
  PositionData, 
  ContainingBlock, 
  StackingContext, 
  PositionOffsets, 
  ViewportData, 
  TransformMatrix,
  ResolvedPosition
} from '../../../../types/positioning';

/**
 * Main service interface for positioning calculations and coordinate transformations
 */
export interface IPositioningService {
  calculatePosition(element: DOMElement, positionMode: PositionMode): PositionData;
  establishContainingBlock(element: DOMElement): ContainingBlock;
  resolvePositionValues(element: DOMElement, containingBlock: ContainingBlock): ResolvedPosition;
  updatePositionedElement(element: DOMElement, newPosition: PositionData): void;
  getStackingContext(element: DOMElement): StackingContext | undefined;
}

/**
 * Interface for managing containing block relationships and coordinate system transformations
 */
export interface IContainingBlockManager {
  findContainingBlock(element: DOMElement): ContainingBlock;
  createContainingBlock(element: DOMElement): ContainingBlock;
  updateContainingBlockDimensions(containingBlock: ContainingBlock): void;
  getCoordinateTransform(from: ContainingBlock, to: ContainingBlock): TransformMatrix;
}

/**
 * Interface for mathematical calculations for different positioning modes
 */
export interface IPositionCalculator {
  calculateRelativePosition(element: DOMElement, offsets: PositionOffsets): Vector3;
  calculateAbsolutePosition(element: DOMElement, containingBlock: ContainingBlock, offsets: PositionOffsets): Vector3;
  calculateFixedPosition(element: DOMElement, viewport: ViewportData, offsets: PositionOffsets): Vector3;
  resolvePercentageValues(values: PositionOffsets, containingBlock: ContainingBlock): PositionOffsets;
}

/**
 * Interface for stacking context management and z-index layering
 */
export interface IStackingContextManager {
  createStackingContext(element: DOMElement): StackingContext;
  insertIntoStackingOrder(context: StackingContext): void;
  determineStackingReason(element: DOMElement): 'position' | 'zIndex' | 'transform' | 'opacity';
  updateStackingOrder(context: StackingContext): void;
}

/**
 * Interface for containing block resolution algorithm
 */
export interface IContainingBlockResolver {
  findContainingBlock(element: DOMElement): ContainingBlock;
  establishesContainingBlock(element: DOMElement): boolean;
  createViewportContainingBlock(): ContainingBlock;
}

/**
 * Interface for relative positioning calculations
 */
export interface IRelativePositioning {
  calculateRelativePosition(element: DOMElement, offsets: PositionOffsets): Vector3;
  resolveOffsetValues(offsets: PositionOffsets, parent: DOMElement): PositionOffsets;
}

/**
 * Interface for absolute positioning calculations
 */
export interface IAbsolutePositioning {
  calculateAbsolutePosition(element: DOMElement, containingBlock: ContainingBlock, offsets: PositionOffsets): Vector3;
  resolvePercentageValues(offsets: PositionOffsets, containingBlock: ContainingBlock): PositionOffsets;
}

/**
 * Interface for fixed positioning calculations
 */
export interface IFixedPositioning {
  calculateFixedPosition(element: DOMElement, viewport: ViewportData, offsets: PositionOffsets): Vector3;
  resolveViewportValues(offsets: PositionOffsets, viewport: ViewportData): PositionOffsets;
}