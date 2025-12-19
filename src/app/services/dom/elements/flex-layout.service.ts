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
      console.log(`[FLEX-ALIGN] Skipping align-content: ${lines.length} lines, flexWrap=${container.flexWrap}`);
      return lines;
    }

    const totalLinesSize = lines.reduce((sum, line) => sum + line.crossSize, 0);
    const remainingSpace = Math.max(0, availableCrossSpace - totalLinesSize);
    
    console.log(`[FLEX-ALIGN] Applying align-content: ${container.alignContent}`);
    console.log(`[FLEX-ALIGN] Lines: ${lines.length}, totalLinesSize=${totalLinesSize}px, availableCrossSpace=${availableCrossSpace}px, remainingSpace=${remainingSpace}px`);
    
    let result: FlexLine[];
    
    switch (container.alignContent) {
      case 'flex-start':
        result = this.alignContentFlexStart(lines);
        break;
      
      case 'flex-end':
        result = this.alignContentFlexEnd(lines, remainingSpace);
        break;
      
      case 'center':
        result = this.alignContentCenter(lines, remainingSpace);
        break;
      
      case 'space-between':
        result = this.alignContentSpaceBetween(lines, remainingSpace);
        break;
      
      case 'space-around':
        result = this.alignContentSpaceAround(lines, remainingSpace);
        break;
      
      case 'space-evenly':
        result = this.alignContentSpaceEvenly(lines, remainingSpace);
        break;
      
      case 'stretch':
        result = this.alignContentStretch(lines, remainingSpace);
        break;
      
      default:
        result = lines;
    }
    
    console.log(`[FLEX-ALIGN] Result:`, 
      result.map((line, i) => ({
        index: i,
        crossOffset: line.crossOffset,
        crossSize: line.crossSize,
        itemCount: line.items.length
      }))
    );
    
    return result;
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
    const totalLinesSize = lines.reduce((sum, line) => sum + line.crossSize, 0);
    
    // Calculate the starting offset to center all lines
    // This should be half of the remaining space
    const startOffset = remainingSpace / 2;
    let currentOffset = startOffset;
    
    console.log(`[FLEX-ALIGN] Center: ${lines.length} lines, remainingSpace=${remainingSpace}px, totalLinesSize=${totalLinesSize}px, startOffset=${startOffset}px`);
    
    return lines.map((line, index) => {
      const result = {
        ...line,
        crossOffset: currentOffset,
        crossSize: line.crossSize
      };
      
      console.log(`[FLEX-ALIGN] Center line ${index}: crossOffset=${currentOffset}px, crossSize=${line.crossSize}px`);
      
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
    
    console.log(`[FLEX-ALIGN] Space-between: ${lines.length} lines, remainingSpace=${remainingSpace}px, spacing=${spacing}px`);
    
    return lines.map((line, index) => {
      const result = {
        ...line,
        crossOffset: currentOffset,
        crossSize: line.crossSize
      };
      
      console.log(`[FLEX-ALIGN] Space-between line ${index}: crossOffset=${currentOffset}px, crossSize=${line.crossSize}px`);
      
      // Add spacing after each line except the last one
      if (index < lines.length - 1) {
        currentOffset += line.crossSize + spacing;
      } else {
        currentOffset += line.crossSize;
      }
      
      return result;
    });
  }

  private alignContentSpaceAround(lines: FlexLine[], remainingSpace: number): FlexLine[] {
    // Lines are evenly distributed with equal space around each line
    const spacing = remainingSpace / lines.length;
    let currentOffset = spacing / 2;
    
    console.log(`[FLEX-ALIGN] Space-around: ${lines.length} lines, remainingSpace=${remainingSpace}px, spacing=${spacing}px, startOffset=${currentOffset}px`);
    
    return lines.map((line, index) => {
      const result = {
        ...line,
        crossOffset: currentOffset,
        crossSize: line.crossSize
      };
      
      console.log(`[FLEX-ALIGN] Space-around line ${index}: crossOffset=${currentOffset}px, crossSize=${line.crossSize}px`);
      
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
    
    console.log(`[FLEX-SIZE] Calculating flex item sizes: availableMainSpace=${availableMainSpace}px, isRow=${isRow}`);
    
    // Step 1: Calculate flex-basis for each item (in pixels)
    const itemsWithBasis = items.map(item => ({
      ...item,
      calculatedFlexBasis: this.calculateFlexBasis(item, container, isRow)
    }));
    
    console.log(`[FLEX-SIZE] Items with calculated flex-basis:`, itemsWithBasis.map(item => ({
      id: item.element.id,
      flexBasis: item.flexBasis,
      calculatedFlexBasis: item.calculatedFlexBasis,
      flexGrow: item.flexGrow,
      flexShrink: item.flexShrink
    })));

    // Step 2: Calculate total used space and remaining space (all in pixels)
    const totalBasisSize = itemsWithBasis.reduce((sum, item) => {
      const marginSize = isRow 
        ? item.margin.left + item.margin.right
        : item.margin.top + item.margin.bottom;
      return sum + item.calculatedFlexBasis + marginSize;
    }, 0);

    const remainingSpace = availableMainSpace - totalBasisSize;
    
    console.log(`[FLEX-SIZE] Total basis size: ${totalBasisSize}px, availableMainSpace: ${availableMainSpace}px, remainingSpace: ${remainingSpace}px`);

    // Step 3: Apply flex-grow or flex-shrink based on available space
    let result: FlexItem[];
    
    if (remainingSpace > 0) {
      console.log(`[FLEX-SIZE] Applying flex-grow (remainingSpace > 0)`);
      result = this.applyFlexGrow(itemsWithBasis, remainingSpace, isRow);
    } else if (remainingSpace < 0) {
      console.log(`[FLEX-SIZE] Applying flex-shrink (remainingSpace < 0)`);
      result = this.applyFlexShrink(itemsWithBasis, Math.abs(remainingSpace), isRow);
    } else {
      // No remaining space, use flex-basis sizes (in pixels)
      console.log(`[FLEX-SIZE] No remaining space, using flex-basis sizes`);
      result = itemsWithBasis.map(item => ({
        ...item,
        [isRow ? 'width' : 'height']: item.calculatedFlexBasis
      }));
    }
    
    console.log(`[FLEX-SIZE] Final item sizes:`, result.map(item => ({
      id: item.element.id,
      width: item.width,
      height: item.height
    })));
    
    return result;
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
        // Container size is already in CSS pixels
        const containerSize = isRow ? container.width : container.height;
        // Percentage calculations are based on CSS pixels, not affected by DPR
        const result = containerSize * (percentage / 100);
        console.log(`[DPR] Flex-basis percentage calculation for ${item.element.id}: ${percentage}% of ${containerSize}px = ${result}px`);
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
    console.log(`[FLEX-SHRINK] Applying flex-shrink: deficit=${deficit}px, isRow=${isRow}`);
    console.log(`[FLEX-SHRINK] Items before shrinking:`, items.map(item => ({
      id: item.element.id,
      flexShrink: item.flexShrink,
      flexBasis: item.calculatedFlexBasis,
      width: item.width,
      height: item.height
    })));
    
    // Calculate weighted flex-shrink factors
    const totalWeightedShrink = items.reduce((sum, item) => {
      // Skip items with flex-shrink: 0
      if (item.flexShrink === 0) {
        return sum;
      }
      const flexBasis = item.calculatedFlexBasis;
      return sum + (item.flexShrink * flexBasis);
    }, 0);
    
    console.log(`[FLEX-SHRINK] Total weighted shrink: ${totalWeightedShrink}`);

    if (totalWeightedShrink === 0) {
      // No flex-shrink, items keep their flex-basis size (in pixels)
      console.log(`[FLEX-SHRINK] No shrinking applied (totalWeightedShrink = 0)`);
      return items.map(item => ({
        ...item,
        [isRow ? 'width' : 'height']: item.calculatedFlexBasis
      }));
    }

    const result = items.map(item => {
      // Items with flex-shrink: 0 don't shrink at all
      if (item.flexShrink === 0) {
        console.log(`[FLEX-SHRINK] Item ${item.element.id} has flex-shrink: 0, not shrinking`);
        return {
          ...item,
          [isRow ? 'width' : 'height']: item.calculatedFlexBasis
        };
      }
      
      const weightedShrink = item.flexShrink * item.calculatedFlexBasis;
      const shrinkRatio = weightedShrink / totalWeightedShrink;
      const reductionSize = deficit * shrinkRatio;
      const newSize = Math.max(0, item.calculatedFlexBasis - reductionSize);
      
      console.log(`[FLEX-SHRINK] Item ${item.element.id}: flexShrink=${item.flexShrink}, weightedShrink=${weightedShrink}, shrinkRatio=${shrinkRatio}, reductionSize=${reductionSize}px, newSize=${newSize}px`);
      
      return {
        ...item,
        [isRow ? 'width' : 'height']: newSize
      };
    });
    
    console.log(`[FLEX-SHRINK] Items after shrinking:`, result.map(item => ({
      id: item.element.id,
      width: item.width,
      height: item.height
    })));
    
    return result;
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
    
    console.log(`[FLEX-ALIGN-SELF] Applying align-self for item ${item.element.id}: alignSelf=${item.alignSelf}, containerAlignItems=${container.alignItems}, effectiveValue=${alignValue}, lineHeight=${lineHeight}px, isRow=${isRow}`);

    let result: { crossOffset: number; crossSize: number };
    
    switch (alignValue) {
      case 'flex-start':
        result = this.alignSelfFlexStart(item, isRow);
        break;
      
      case 'flex-end':
        result = this.alignSelfFlexEnd(item, lineHeight, isRow);
        break;
      
      case 'center':
        result = this.alignSelfCenter(item, lineHeight, isRow);
        break;
      
      case 'baseline':
        try {
          result = this.alignSelfBaseline(item, lineHeight, isRow);
        } catch (error) {
          console.warn(`[FLEX-ALIGN-SELF] Baseline not implemented, falling back to flex-start:`, error);
          result = this.alignSelfFlexStart(item, isRow);
        }
        break;
      
      case 'stretch':
        result = this.alignSelfStretch(item, lineHeight, isRow);
        break;
      
      default:
        console.warn(`[FLEX-ALIGN-SELF] Unknown align-self value: ${alignValue}, falling back to flex-start`);
        result = this.alignSelfFlexStart(item, isRow);
    }
    
    console.log(`[FLEX-ALIGN-SELF] Result for item ${item.element.id}: crossOffset=${result.crossOffset}px, crossSize=${result.crossSize}px`);
    
    return result;
  }

  private alignSelfFlexStart(item: FlexItem, isRow: boolean): { crossOffset: number; crossSize: number } {
    const marginStart = isRow ? item.margin.top : item.margin.left;
    const itemCrossSize = isRow ? item.height : item.width;
    
    console.log(`[FLEX-ALIGN-SELF] flex-start for item ${item.element.id}: marginStart=${marginStart}px, itemCrossSize=${itemCrossSize}px`);
    
    return {
      crossOffset: marginStart,
      crossSize: itemCrossSize
    };
  }

  private alignSelfFlexEnd(item: FlexItem, lineHeight: number, isRow: boolean): { crossOffset: number; crossSize: number } {
    const itemCrossSize = isRow ? item.height : item.width;
    const marginEnd = isRow ? item.margin.bottom : item.margin.right;
    const crossOffset = lineHeight - itemCrossSize - marginEnd;
    
    console.log(`[FLEX-ALIGN-SELF] flex-end for item ${item.element.id}: lineHeight=${lineHeight}px, itemCrossSize=${itemCrossSize}px, marginEnd=${marginEnd}px, crossOffset=${crossOffset}px`);
    
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
    
    console.log(`[FLEX-ALIGN-SELF] center for item ${item.element.id}: lineHeight=${lineHeight}px, itemCrossSize=${itemCrossSize}px, marginStart=${marginStart}px, marginEnd=${marginEnd}px, availableSpace=${availableSpace}px, crossOffset=${crossOffset}px`);
    
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
    
    // Check if the item has an explicit height/width that should prevent stretching
    const hasExplicitSize = isRow 
      ? (item.style?.height && item.style.height !== 'auto')
      : (item.style?.width && item.style.width !== 'auto');
    
    // Only stretch if there's no explicit size
    const finalSize = hasExplicitSize 
      ? (isRow ? item.height : item.width)
      : Math.max(0, stretchedSize);
    
    console.log(`[FLEX-ALIGN-SELF] stretch for item ${item.element.id}: lineHeight=${lineHeight}px, marginStart=${marginStart}px, marginEnd=${marginEnd}px, stretchedSize=${stretchedSize}px, hasExplicitSize=${hasExplicitSize}, finalSize=${finalSize}px`);
    
    return {
      crossOffset: marginStart,
      crossSize: finalSize
    };
  }

  /**
   * Sort flex items by their order property
   * Implements stable sorting to maintain source order for items with same order value
   */
  public sortItemsByOrder(items: FlexItem[]): FlexItem[] {
    console.log(`[FLEX-ORDER] Sorting ${items.length} items by order:`, items.map(item => ({
      id: item.element.id,
      order: item.order
    })));
    
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
    
    const result = itemsWithIndex.map(({ item }) => item);
    
    console.log(`[FLEX-ORDER] After sorting:`, result.map(item => ({
      id: item.element.id,
      order: item.order
    })));

    return result;
  }

  /**
   * Apply order sorting with flex-direction consideration
   * Handles interaction between order and flex-direction reverse
   */
  public applySortedOrder(items: FlexItem[], container: FlexContainer): FlexItem[] {
    console.log(`[FLEX-ORDER] Applying sorted order with flexDirection: ${container.flexDirection}`);
    
    const sortedItems = this.sortItemsByOrder(items);
    
    // If flex-direction is reverse, we need to reverse the final order
    const isReverse = container.flexDirection.includes('reverse');
    
    let result: FlexItem[];
    
    if (isReverse) {
      result = [...sortedItems].reverse();
      console.log(`[FLEX-ORDER] Reversed due to flex-direction: ${container.flexDirection}`);
    } else {
      result = sortedItems;
    }
    
    console.log(`[FLEX-ORDER] Final order:`, result.map(item => ({
      id: item.element.id,
      order: item.order
    })));
    
    return result;
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