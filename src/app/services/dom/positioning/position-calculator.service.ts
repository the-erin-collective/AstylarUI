import { Injectable } from '@angular/core';
import { Vector3 } from '@babylonjs/core';
import { DOMElement } from '../../../types/dom-element';
import { ContainingBlock, PositionOffsets, ViewportData } from '../../../types/positioning';
import { IPositionCalculator } from './interfaces/positioning.interfaces';
import { PositioningUtils } from './utils/positioning.utils';
import { RelativePositioningService } from './modes/relative-positioning.service';
import { AbsolutePositioningService } from './modes/absolute-positioning.service';
import { FixedPositioningService } from './modes/fixed-positioning.service';

@Injectable({
  providedIn: 'root'
})
export class PositionCalculator implements IPositionCalculator {

  constructor(
    private relativePositioning: RelativePositioningService,
    private absolutePositioning: AbsolutePositioningService,
    private fixedPositioning: FixedPositioningService
  ) {}

  /**
   * Calculates relative position with offsets from normal flow position
   */
  calculateRelativePosition(element: DOMElement, offsets: PositionOffsets): Vector3 {
    return this.relativePositioning.calculateRelativePosition(element, offsets);
  }

  /**
   * Calculates absolute position relative to containing block
   */
  calculateAbsolutePosition(element: DOMElement, containingBlock: ContainingBlock, offsets: PositionOffsets): Vector3 {
    return this.absolutePositioning.calculateAbsolutePosition(element, containingBlock, offsets);
  }

  /**
   * Calculates fixed position relative to viewport
   */
  calculateFixedPosition(element: DOMElement, viewport: ViewportData, offsets: PositionOffsets): Vector3 {
    return this.fixedPositioning.calculateFixedPosition(element, viewport, offsets);
  }

  /**
   * Resolves percentage values relative to containing block dimensions
   */
  resolvePercentageValues(values: PositionOffsets, containingBlock: ContainingBlock): PositionOffsets {
    return this.absolutePositioning.resolvePercentageValues(values, containingBlock);
  }
}