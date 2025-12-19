import { Vector3 } from '@babylonjs/core';
import { DOMElement } from './dom-element';

/**
 * CSS positioning modes supported by ASTYLARUI
 */
export enum PositionMode {
  Static = 'static',      // Default - normal flow
  Relative = 'relative',  // Offset from normal position
  Absolute = 'absolute',  // Positioned relative to containing block
  Fixed = 'fixed'         // Positioned relative to viewport
}

/**
 * Position offset values for top, right, bottom, left properties
 */
export interface PositionOffsets {
  top?: string | number;
  right?: string | number;
  bottom?: string | number;
  left?: string | number;
}

/**
 * Core data structure for element positioning information
 */
export interface PositionData {
  mode: PositionMode;
  offsets: PositionOffsets;
  resolvedPosition: Vector3;
  containingBlock: ContainingBlock;
  stackingContext?: StackingContext;
  establishesContainingBlock: boolean;
}

/**
 * Represents the coordinate system reference for positioned elements
 */
export interface ContainingBlock {
  element: DOMElement;
  dimensions: {
    width: number;
    height: number;
    contentWidth: number;
    contentHeight: number;
  };
  position: Vector3;
  transform?: TransformMatrix;
  isViewport: boolean;
}

/**
 * Manages z-index layering for positioned elements
 */
export interface StackingContext {
  element: DOMElement;
  zIndex: number;
  children: StackingContext[];
  parent?: StackingContext;
  establishedBy: 'position' | 'zIndex' | 'transform' | 'opacity';
}

/**
 * Extension of DOMElement for positioning-specific properties
 */
export interface PositionedElement extends DOMElement {
  positionMode: PositionMode;
  positionOffsets: PositionOffsets;
  positionData?: PositionData;
  containingBlock?: ContainingBlock;
  establishesContainingBlock: boolean;
  stackingContext?: StackingContext;
}

/**
 * Information about the current viewport for fixed positioning
 */
export interface ViewportData {
  width: number;
  height: number;
  position: Vector3;
  cameraTransform: TransformMatrix;
  scale: number;
}

/**
 * 4x4 transformation matrix for coordinate system transformations
 */
export interface TransformMatrix {
  m: number[]; // 16-element array representing 4x4 matrix
}

/**
 * Resolved position values after unit conversion and calculation
 */
export interface ResolvedPosition {
  x: number;
  y: number;
  z: number;
}

/**
 * Error handling interface for positioning calculations
 */
export interface PositioningErrorHandler {
  handleInvalidPositionValue(element: DOMElement, property: string, value: string): void;
  handleContainingBlockError(element: DOMElement, error: Error): ContainingBlock;
  handleStackingContextError(element: DOMElement, error: Error): StackingContext;
}