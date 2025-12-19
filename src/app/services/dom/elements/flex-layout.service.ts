import { Injectable } from '@angular/core';
import { DOMElement } from '../../../types/dom-element';
import { StyleRule } from '../../../types/style-rule';

/**
 * FlexLayoutService - Advanced Flexbox Layout Algorithms
 * 
 * IMPORTANT: All calculations in this service are performed in SCREEN UNITS (pixels).
 * The service follows the same pattern as the existing FlexService:
 * - Input dimensions, positions, and sizes are in pixels
 * - All internal calculations are done in pixels
 * - Output values are in pixels
 * - Scale factor conversion to world units happens later in the rendering pipeline
 * 
 * This ensures consistency with the existing flex layout system and proper
 * integration with the BabylonJS 3D rendering context.
 */

export interface FlexItem {
  element: DOMElement;
  style: StyleRule | undefined;
  width: number;
  height: number;
  baseWidth: number;
  baseHeight: number;
  margin: { top: number; right: number; bottom: number; left: number };
  flexGrow: number;
  flexShrink: number;
  flexBasis: number | 'auto' | string;
  alignSelf: string;
  order: number;
}

export interface FlexLine {
  items: FlexItem[];
  crossSize: number;
  mainSize: number;
  crossOffset?: number;
}

export interface FlexContainer {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
  flexDirection: string;
  flexWrap: string;
  justifyContent: string;
  alignItems: string;
  alignContent: string;
}

@Injectable({
  providedIn: 'root'
})
export class FlexLayoutService {

  /**
   * Apply align-content algorithm for multi-line flex containers
   * Handles distribution of flex lines within the cross axis
   * All calculations are done in screen units (pixels)
   */
  public applyAlignContent(
    lines: FlexLine[],
    container: FlexContainer,
    availableCrossSpace: number
  ): FlexLine[] {
    // align-content only applies to multi-line containers
    if (lines.length <= 1 || container.flexWrap === 'nowrap') {
      return lines;
    }

    const totalLinesSize = lines.reduce((sum, line) => sum + line.crossSize, 0);
    const remainingSpace = Math.max(0, availableCrossSpace - totalLinesSize);
    
    switch (container.alignContent) {
      case 'flex-start':
        return this.alignContentFlexStart(lines);
      
      case 'flex-end':
        return this.alignContentFlexEnd(lines, remainingSpace);
      
      case 'center':
        return this.alignContentCenter(lines, remainingSpace);
      
      case 'space-between':
        return this.alignContentSpaceBetween(lines, remainingSpace);
      
      case 'space-around':
        return this.alignContentSpaceAround(lines, remainingSpace);
      
      case 'space-evenly':
        return this.alignContentSpaceEvenly(lines, remainingSpace);
      
      case 'stretch':
        return this.alignContentStretch(lines, remainingSpace);
      
      default:
        return lines;
    }
  }

  private alignContentFlexStart(lines: FlexLine[]): FlexLine[] {
    // Lines are packed at the start of the cross axis
    let currentOffset = 0;
    return lines.map(line => {
      const result = {
        ...line,
        crossOffset: currentOffset,
        crossSize: line.crossSize
      };
      currentOffset += line.crossSize;
      return result;
    });
  }

  private alignContentFlexEnd(lines: FlexLine[], remainingSpace: number): FlexLine[] {
    // Lines are packed at the end of the cross axis
    let currentOffset = remainingSpace;
    return lines.map(line => {
      const result = {
        ...line,
        crossOffset: currentOffset,
        crossSize: line.crossSize
      };
      currentOffset += line.crossSize;
      return result;
    });
  }

  private alignContentCenter(lines: FlexLine[], remainingSpace: number): FlexLine[] {
    // Lines are centered in the cross axis
    let currentOffset = remainingSpace / 2;
    return lines.map(line => {
      const result = {
        ...line,
        crossOffset: currentOffset,
        crossSize: line.crossSize
      };
      currentOffset += line.crossSize;
      return result;
    });
  }

  private alignContentSpaceBetween(lines: FlexLine[], remainingSpace: number): FlexLine[] {
    // Lines are evenly distributed with first line at start and last at end
    if (lines.length === 1) {
      return this.alignContentFlexStart(lines);
    }
    
    const spacing = remainingSpace / (lines.length - 1);
    let currentOffset = 0;
    
    return lines.map((line, index) => {
      const result = {
        ...line,
        crossOffset: currentOffset,
        crossSize: line.crossSize
      };
      currentOffset += line.crossSize + spacing;
      return result;
    });
  }

  private alignContentSpaceAround(lines: FlexLine[], remainingSpace: number): FlexLine[] {
    // Lines are evenly distributed with equal space around each line
    const spacing = remainingSpace / lines.length;
    let currentOffset = spacing / 2;
    
    return lines.map(line => {
      const result = {
        ...line,
        crossOffset: currentOffset,
        crossSize: line.crossSize
      };
      currentOffset += line.crossSize + spacing;
      return result;
    });
  }

  private alignContentSpaceEvenly(lines: FlexLine[], remainingSpace: number): FlexLine[] {
    // Lines are evenly distributed with equal space between and around them
    const spacing = remainingSpace / (lines.length + 1);
    let currentOffset = spacing;
    
    return lines.map(line => {
      const result = {
        ...line,
        crossOffset: currentOffset,
        crossSize: line.crossSize
      };
      currentOffset += line.crossSize + spacing;
      return result;
    });
  }

  private alignContentStretch(lines: FlexLine[], remainingSpace: number): FlexLine[] {
    // Lines stretch to fill the available cross space
    const extraSpace = remainingSpace / lines.length;
    let currentOffset = 0;
    
    return lines.map(line => {
      const newCrossSize = line.crossSize + extraSpace;
      const result = {
        ...line,
        crossOffset: currentOffset,
        crossSize: newCrossSize
      };
      currentOffset += newCrossSize;
      return result;
    });
  }

  /**
   * Calculate flex item sizes using flex-basis, flex-grow, and flex-shrink
   * Implements the complete flex sizing algorithm
   * All calculations are done in screen units (pixels)
   */
  public calculateFlexItemSizes(
    items: FlexItem[],
    container: FlexContainer,
    availableMainSpace: number
  ): FlexItem[] {
    const isRow = container.flexDirection === 'row' || container.flexDirection === 'row-reverse';
    
    // Step 1: Calculate flex-basis for each item (in pixels)
    const itemsWithBasis = items.map(item => ({
      ...item,
      calculatedFlexBasis: this.calculateFlexBasis(item, container, isRow)
    }));

    // Step 2: Calculate total used space and remaining space (all in pixels)
    const totalBasisSize = itemsWithBasis.reduce((sum, item) => {
      const marginSize = isRow 
        ? item.margin.left + item.margin.right
        : item.margin.top + item.margin.bottom;
      return sum + item.calculatedFlexBasis + marginSize;
    }, 0);

    const remainingSpace = availableMainSpace - totalBasisSize;

    // Step 3: Apply flex-grow or flex-shrink based on available space
    if (remainingSpace > 0) {
      return this.applyFlexGrow(itemsWithBasis, remainingSpace, isRow);
    } else if (remainingSpace < 0) {
      return this.applyFlexShrink(itemsWithBasis, Math.abs(remainingSpace), isRow);
    }

    // No remaining space, use flex-basis sizes (in pixels)
    return itemsWithBasis.map(item => ({
      ...item,
      [isRow ? 'width' : 'height']: item.calculatedFlexBasis
    }));
  }

  /**
   * Calculate flex-basis for a flex item
   * All calculations are done in screen units (pixels)
   */
  private calculateFlexBasis(item: FlexItem, container: FlexContainer, isRow: boolean): number {
    if (typeof item.flexBasis === 'number') {
      // Already in pixels
      return item.flexBasis;
    }

    if (item.flexBasis === 'auto') {
      // Use the item's main size (width for row, height for column) - already in pixels
      return isRow ? item.baseWidth : item.baseHeight;
    }

    // Parse percentage or other units - all converted to pixels
    if (typeof item.flexBasis === 'string') {
      if (item.flexBasis.endsWith('%')) {
        const percentage = parseFloat(item.flexBasis);
        if (isNaN(percentage)) {
          throw new Error(`Invalid percentage value for flex-basis: ${item.flexBasis}`);
        }
        // Container size is already in pixels
        const containerSize = isRow ? container.width : container.height;
        const result = containerSize * (percentage / 100);
        console.log(`[FLEX-BASIS] ${item.element.id}: ${percentage}% of ${containerSize}px = ${result}px`);
        return result;
      }
      
      if (item.flexBasis.endsWith('px')) {
        const pixelValue = parseFloat(item.flexBasis);
        if (isNaN(pixelValue)) {
          throw new Error(`Invalid pixel value for flex-basis: ${item.flexBasis}`);
        }
        return pixelValue;
      }
      
      throw new Error(`Unsupported flex-basis unit: ${item.flexBasis}`);
    }

    throw new Error(`Invalid flex-basis value: ${item.flexBasis}`);
  }

  /**
   * Apply flex-grow to distribute extra space
   * All calculations in screen units (pixels)
   */
  private applyFlexGrow(items: Array<FlexItem & { calculatedFlexBasis: number }>, extraSpace: number, isRow: boolean): FlexItem[] {
    const totalFlexGrow = items.reduce((sum, item) => sum + item.flexGrow, 0);
    
    if (totalFlexGrow === 0) {
      // No flex-grow, items keep their flex-basis size (in pixels)
      return items.map(item => ({
        ...item,
        [isRow ? 'width' : 'height']: item.calculatedFlexBasis
      }));
    }

    return items.map(item => {
      const growRatio = item.flexGrow / totalFlexGrow;
      const additionalSize = extraSpace * growRatio;
      const newSize = item.calculatedFlexBasis + additionalSize;
      
      return {
        ...item,
        [isRow ? 'width' : 'height']: newSize
      };
    });
  }

  /**
   * Apply flex-shrink to reduce item sizes when space is insufficient
   * All calculations in screen units (pixels)
   */
  private applyFlexShrink(items: Array<FlexItem & { calculatedFlexBasis: number }>, deficit: number, isRow: boolean): FlexItem[] {
    // Calculate weighted flex-shrink factors
    const totalWeightedShrink = items.reduce((sum, item) => {
      const flexBasis = item.calculatedFlexBasis;
      return sum + (item.flexShrink * flexBasis);
    }, 0);

    if (totalWeightedShrink === 0) {
      // No flex-shrink, items keep their flex-basis size (in pixels)
      return items.map(item => ({
        ...item,
        [isRow ? 'width' : 'height']: item.calculatedFlexBasis
      }));
    }

    return items.map(item => {
      const weightedShrink = item.flexShrink * item.calculatedFlexBasis;
      const shrinkRatio = weightedShrink / totalWeightedShrink;
      const reductionSize = deficit * shrinkRatio;
      const newSize = Math.max(0, item.calculatedFlexBasis - reductionSize);
      
      return {
        ...item,
        [isRow ? 'width' : 'height']: newSize
      };
    });
  }

  /**
   * Apply align-self algorithm for individual flex item cross-axis alignment
   * Overrides the container's align-items for specific items
   * All calculations are done in screen units (pixels)
   */
  public applyAlignSelf(
    item: FlexItem,
    container: FlexContainer,
    lineHeight: number,
    isRow: boolean
  ): { crossOffset: number; crossSize: number } {
    const alignValue = item.alignSelf === 'auto' ? container.alignItems : item.alignSelf;

    switch (alignValue) {
      case 'flex-start':
        return this.alignSelfFlexStart(item, isRow);
      
      case 'flex-end':
        return this.alignSelfFlexEnd(item, lineHeight, isRow);
      
      case 'center':
        return this.alignSelfCenter(item, lineHeight, isRow);
      
      case 'baseline':
        return this.alignSelfBaseline(item, lineHeight, isRow);
      
      case 'stretch':
        return this.alignSelfStretch(item, lineHeight, isRow);
      
      default:
        return this.alignSelfFlexStart(item, isRow);
    }
  }

  private alignSelfFlexStart(item: FlexItem, isRow: boolean): { crossOffset: number; crossSize: number } {
    const marginStart = isRow ? item.margin.top : item.margin.left;
    return {
      crossOffset: marginStart,
      crossSize: isRow ? item.height : item.width
    };
  }

  private alignSelfFlexEnd(item: FlexItem, lineHeight: number, isRow: boolean): { crossOffset: number; crossSize: number } {
    const itemCrossSize = isRow ? item.height : item.width;
    const marginEnd = isRow ? item.margin.bottom : item.margin.right;
    const crossOffset = lineHeight - itemCrossSize - marginEnd;
    
    return {
      crossOffset,
      crossSize: itemCrossSize
    };
  }

  private alignSelfCenter(item: FlexItem, lineHeight: number, isRow: boolean): { crossOffset: number; crossSize: number } {
    const itemCrossSize = isRow ? item.height : item.width;
    const marginStart = isRow ? item.margin.top : item.margin.left;
    const marginEnd = isRow ? item.margin.bottom : item.margin.right;
    const availableSpace = lineHeight - itemCrossSize - marginStart - marginEnd;
    const crossOffset = marginStart + (availableSpace / 2);
    
    return {
      crossOffset,
      crossSize: itemCrossSize
    };
  }

  private alignSelfBaseline(_item: FlexItem, _lineHeight: number, _isRow: boolean): { crossOffset: number; crossSize: number } {
    // Baseline alignment requires text metrics which are not available in this context
    // This should be implemented when text baseline information is available
    throw new Error('Baseline alignment is not yet implemented - requires text metrics');
  }

  private alignSelfStretch(item: FlexItem, lineHeight: number, isRow: boolean): { crossOffset: number; crossSize: number } {
    const marginStart = isRow ? item.margin.top : item.margin.left;
    const marginEnd = isRow ? item.margin.bottom : item.margin.right;
    const stretchedSize = lineHeight - marginStart - marginEnd;
    
    return {
      crossOffset: marginStart,
      crossSize: Math.max(0, stretchedSize)
    };
  }

  /**
   * Sort flex items by their order property
   * Implements stable sorting to maintain source order for items with same order value
   */
  public sortItemsByOrder(items: FlexItem[]): FlexItem[] {
    // Create array with original indices for stable sorting
    const itemsWithIndex = items.map((item, index) => ({
      item,
      originalIndex: index
    }));

    // Sort by order value, then by original index for stability
    itemsWithIndex.sort((a, b) => {
      if (a.item.order !== b.item.order) {
        return a.item.order - b.item.order;
      }
      // Same order value, maintain source order
      return a.originalIndex - b.originalIndex;
    });

    return itemsWithIndex.map(({ item }) => item);
  }

  /**
   * Apply order sorting with flex-direction consideration
   * Handles interaction between order and flex-direction reverse
   */
  public applySortedOrder(items: FlexItem[], container: FlexContainer): FlexItem[] {
    const sortedItems = this.sortItemsByOrder(items);
    
    // If flex-direction is reverse, we need to reverse the final order
    const isReverse = container.flexDirection.includes('reverse');
    
    if (isReverse) {
      return [...sortedItems].reverse();
    }
    
    return sortedItems;
  }

  /**
   * Get the effective order value for a flex item
   * Returns the item's order value, defaulting to 0 if not specified
   */
  public getEffectiveOrder(item: FlexItem): number {
    return typeof item.order === 'number' ? item.order : 0;
  }

  /**
   * Validate order values and handle edge cases
   */
  public validateOrderValues(items: FlexItem[]): FlexItem[] {
    return items.map(item => ({
      ...item,
      order: this.normalizeOrderValue(item.order)
    }));
  }

  private normalizeOrderValue(order: number): number {
    // Ensure order is a valid integer
    if (typeof order !== 'number' || isNaN(order)) {
      throw new Error(`Invalid order value: ${order}. Order must be a valid number.`);
    }
    
    // CSS order property accepts any integer, including negative values
    return Math.round(order);
  }
}