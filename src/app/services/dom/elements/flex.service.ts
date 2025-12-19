import { Injectable } from '@angular/core';
import { DOMElement } from '../../../types/dom-element';
import { StyleRule } from '../../../types/style-rule';
import { BabylonDOM } from '../interfaces/dom.types';
import { BabylonRender } from '../interfaces/render.types';
import { Mesh } from '@babylonjs/core';
import { FlexLayoutService, FlexItem, FlexContainer } from './flex-layout.service';

@Injectable({
  providedIn: 'root'
})
export class FlexService {
  
  constructor(private flexLayoutService: FlexLayoutService) {}
  public isFlexContainer(render: BabylonRender, parentElement: DOMElement, styles: StyleRule[]): boolean {
    const style = render.actions.style.findStyleForElement(parentElement, styles);
    return style?.display === 'flex';
  }
  
  public processFlexChildren(
    dom: BabylonDOM,
    render: BabylonRender,
    children: DOMElement[],
    parent: Mesh,
    styles: StyleRule[],
    parentElement: DOMElement
  ): void {
    
    // Get scale factor for debugging
    const scaleFactor = render.actions.camera.getPixelToWorldScale();
    
    // Get parent style and dimensions
    const parentStyle = render.actions.style.findStyleForElement(parentElement, styles);
    if (!parentStyle) throw new Error('FlexService: parent style not found');
    if (!parentElement.id) throw new Error('FlexService: parentElement.id is undefined');
    
    const parentDimensions = dom.context.elementDimensions.get(parentElement.id);
    if (!parentDimensions) throw new Error('FlexService: parent dimensions not found');
    // Get container dimensions (in pixels)
    const containerWidth = parentDimensions.width;
    const containerHeight = parentDimensions.height;
    
    console.log(`[FLEX] Container ${parentElement.id} dimensions: ${containerWidth}px × ${containerHeight}px`);
    // Parse container padding (in pixels)
    const padding = this.parsePadding(parentStyle?.padding);
    console.log('[FLEX] Container padding (pixels):', padding);
    // Get flex properties
    const flexDirection = parentStyle.flexDirection || 'row';
    const justifyContent = parentStyle.justifyContent || 'flex-start';
    const alignItems = parentStyle.alignItems || 'stretch';
    const flexWrap = parentStyle.flexWrap || 'nowrap';
    
    console.log('[FLEX] Container:', {
      width: containerWidth,
      height: containerHeight,
      padding,
      flexDirection,
      justifyContent,
      alignItems,
      flexWrap
    });
    
    // Create flex container configuration
    const flexContainer: FlexContainer = {
      width: containerWidth,
      height: containerHeight,
      padding,
      flexDirection,
      justifyContent,
      alignItems,
      flexWrap,
      alignContent: parentStyle.alignContent || 'stretch'
    };

    // Get child items with their styles and dimensions - using FlexLayoutService
    const childItems: FlexItem[] = children.map(child => {
      const style = styles.find(s => s.selector === `#${child.id}`);
      const margin = this.parseMargin(style?.margin);
      console.log(`[FLEX] Child ${child.id} style found:`, style);
      console.log(`[FLEX] Child ${child.id} margin (pixels):`, margin);
      
      // Get explicit width and height from style - proper sizing logic
      let width = 0;
      let height = 0;
      
      if (style?.width) {
        if (style.width.endsWith('px')) {
          width = parseFloat(style.width);
        } else if (style.width.endsWith('%')) {
          width = (parseFloat(style.width) / 100) * containerWidth;
        } else {
          width = parseFloat(style.width);
        }
      } else {
        // Default width if not specified
        width = containerWidth / children.length;
      }
      
      if (style?.height) {
        if (style.height.endsWith('px')) {
          height = parseFloat(style.height);
        } else if (style.height.endsWith('%')) {
          height = (parseFloat(style.height) / 100) * containerHeight;
        } else {
          height = parseFloat(style.height);
        }
      } else {
        // Default height if not specified - use a reasonable default
        height = 50; // Default height in pixels
      }
      
      console.log(`[FLEX] Child ${child.id} calculated dimensions: width=${width}px, height=${height}px from style:`, style?.width, style?.height);
      
      const flexGrow = parseFloat(style?.flexGrow || '0') || 0;
      const flexShrink = parseFloat(style?.flexShrink || '1') || 1;
      const flexBasis = style?.flexBasis || 'auto';
      const alignSelf = style?.alignSelf || 'auto';
      const order = parseFloat(style?.order || '0') || 0;
      
      console.log(`[FLEX] Child ${child.id} flex properties:`, {
        flexBasis,
        flexGrow,
        flexShrink,
        order,
        alignSelf
      });
      
      return {
        element: child,
        style,
        width,
        height,
        baseWidth: width,
        baseHeight: height,
        margin,
        flexGrow,
        flexShrink,
        flexBasis,
        alignSelf,
        order
      };
    });
    
    console.log('[FLEX] Child items:', childItems);
    
    // Use FlexLayoutService for advanced calculations
    const isRow = flexDirection === 'row' || flexDirection === 'row-reverse';
    const availableMainSpace = isRow 
      ? containerWidth - padding.left - padding.right
      : containerHeight - padding.top - padding.bottom;
    
    // Apply order sorting first
    const orderedItems = this.flexLayoutService.applySortedOrder(childItems, flexContainer);
    
    // Calculate flex layout with proper wrapping (FlexLayoutService will be applied per line)
    const layout = this.calculateFlexLayout(
      orderedItems,
      containerWidth,
      containerHeight,
      padding,
      {
        flexDirection,
        justifyContent,
        alignItems,
        flexWrap,
        alignContent: parentStyle.alignContent || 'stretch'
      },
      render
    );
    
    console.log('[FLEX] Layout with FlexLayoutService:', layout);
    
    // Create and position child elements according to flex layout
    layout.forEach((item, index) => {
      const child = childItems[index];
      console.log(`[FLEX] Creating flex child ${index + 1}/${childItems.length}: ${child.element.type}#${child.element.id}`);
      console.log(`[FLEX] Child ${child.element.id} layout (pixels):`, item);
      
      try {
        // The flex layout positions are in pixels, but createElement expects them to be in pixels
        // and will apply the scale factor internally, so we pass them as-is
        const childMesh = dom.actions.createElement(
          dom,
          render,
          child.element,
          parent,
          styles,
          item.position, // positions in pixels
          item.size      // sizes in pixels
        );
        
        console.log(`[FLEX] Created flex child mesh:`, childMesh.name, `Position:`, childMesh.position);
        
        // Process nested children if any
        if (child.element.children && child.element.children.length > 0) {
          console.log(`[FLEX] Child ${child.element.id} has ${child.element.children.length} sub-children`);
          dom.actions.processChildren(dom, render, child.element.children, childMesh, styles, child.element);
        }
      } catch (error) {
        console.error(`[FLEX] Error processing flex child ${child.element.type}#${child.element.id}:`, error);
        throw error;
      }
    });
    
    console.log(`[FLEX] Finished processing all flex children for parent:`, parent.name);
  }
  
  /**
   * Calculate flex layout for child items with proper wrapping support
   */
  private calculateFlexLayout(
    childItems: FlexItem[],
    containerWidth: number,
    containerHeight: number,
    padding: { top: number; right: number; bottom: number; left: number },
    flexProps: {
      flexDirection: string;
      justifyContent: string;
      alignItems: string;
      flexWrap: string;
      alignContent: string;
    },
    render: BabylonRender
  ): Array<{
    position: { x: number; y: number; z: number };
    size: { width: number; height: number };
  }> {
    const isRow = flexProps.flexDirection === 'row' || flexProps.flexDirection === 'row-reverse';
    const isReverse = flexProps.flexDirection.includes('reverse');
    
    // Calculate available space for items
    const availableMainSpace = isRow
      ? containerWidth - padding.left - padding.right
      : containerHeight - padding.top - padding.bottom;
    
    const availableCrossSpace = isRow
      ? containerHeight - padding.top - padding.bottom
      : containerWidth - padding.left - padding.right;
    
    console.log(`[FLEX] Available space: main=${availableMainSpace}px, cross=${availableCrossSpace}px`);
    
    // Create flex lines based on wrapping
    const lines = this.createFlexLines(childItems, availableMainSpace, flexProps.flexWrap, isRow);
    console.log(`[FLEX] Created ${lines.length} flex lines:`, lines);
    
    // Apply align-content if we have multiple lines
    const alignedLines = lines.length > 1 && flexProps.flexWrap !== 'nowrap'
      ? this.flexLayoutService.applyAlignContent(lines, {
          width: containerWidth,
          height: containerHeight,
          padding,
          flexDirection: flexProps.flexDirection,
          flexWrap: flexProps.flexWrap,
          justifyContent: flexProps.justifyContent,
          alignItems: flexProps.alignItems,
          alignContent: flexProps.alignContent || 'stretch'
        }, availableCrossSpace)
      : lines;
    
    // Position items within each line
    const layout: Array<{
      position: { x: number; y: number; z: number };
      size: { width: number; height: number };
    }> = [];
    
    let currentCrossOffset = 0;
    
    alignedLines.forEach((line, lineIndex) => {
      const lineLayout = this.positionItemsInLine(
        line.items,
        availableMainSpace,
        line.crossSize,
        currentCrossOffset,
        containerWidth,
        containerHeight,
        padding,
        flexProps,
        isRow,
        isReverse
      );
      
      layout.push(...lineLayout);
      currentCrossOffset += line.crossSize;
    });
    
    return layout;
  }
  
  /**
   * Parse padding value from style
   */
  private parsePadding(padding?: string): { top: number; right: number; bottom: number; left: number } {
    if (!padding) {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }
    
    const parts = padding.split(/\s+/);
    
    if (parts.length === 1) {
      // padding: 10px (all sides)
      const value = parseFloat(parts[0]) || 0;
      return { top: value, right: value, bottom: value, left: value };
    } else if (parts.length === 2) {
      // padding: 10px 20px (vertical horizontal)
      const vValue = parseFloat(parts[0]) || 0;
      const hValue = parseFloat(parts[1]) || 0;
      return { top: vValue, right: hValue, bottom: vValue, left: hValue };
    } else if (parts.length === 4) {
      // padding: 10px 20px 30px 40px (top right bottom left)
      return {
        top: parseFloat(parts[0]) || 0,
        right: parseFloat(parts[1]) || 0,
        bottom: parseFloat(parts[2]) || 0,
        left: parseFloat(parts[3]) || 0
      };
    }
    
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  
  /**
   * Parse margin value from style
   */
  private parseMargin(margin?: string): { top: number; right: number; bottom: number; left: number } {
    if (!margin) {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }
    
    const parts = margin.split(/\s+/);
    
    if (parts.length === 1) {
      // margin: 10px (all sides)
      const value = parseFloat(parts[0]) || 0;
      return { top: value, right: value, bottom: value, left: value };
    } else if (parts.length === 2) {
      // margin: 10px 20px (vertical horizontal)
      const vValue = parseFloat(parts[0]) || 0;
      const hValue = parseFloat(parts[1]) || 0;
      return { top: vValue, right: hValue, bottom: vValue, left: hValue };
    } else if (parts.length === 4) {
      // margin: 10px 20px 30px 40px (top right bottom left)
      return {
        top: parseFloat(parts[0]) || 0,
        right: parseFloat(parts[1]) || 0,
        bottom: parseFloat(parts[2]) || 0,
        left: parseFloat(parts[3]) || 0
      };
    }
    
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  /**
   * Create flex lines based on wrapping behavior
   */
  private createFlexLines(
    items: FlexItem[],
    availableMainSpace: number,
    flexWrap: string,
    isRow: boolean
  ): Array<{ items: FlexItem[]; crossSize: number; mainSize: number }> {
    if (flexWrap === 'nowrap') {
      // Single line - all items go in one line
      const crossSize = Math.max(...items.map(item => 
        isRow ? item.height : item.width
      ));
      return [{
        items,
        crossSize,
        mainSize: availableMainSpace
      }];
    }
    
    // Multi-line wrapping
    const lines: Array<{ items: FlexItem[]; crossSize: number; mainSize: number }> = [];
    let currentLine: FlexItem[] = [];
    let currentLineSize = 0;
    
    for (const item of items) {
      // Use flex-basis for wrapping decisions, not current width/height
      let itemMainSize: number;
      if (typeof item.flexBasis === 'number') {
        itemMainSize = item.flexBasis;
      } else if (item.flexBasis === 'auto') {
        itemMainSize = isRow ? item.baseWidth : item.baseHeight;
      } else if (typeof item.flexBasis === 'string' && item.flexBasis.endsWith('%')) {
        const percentage = parseFloat(item.flexBasis);
        const containerMainSize = isRow ? 
          (availableMainSpace) : // Use available space, not total container size
          (availableMainSpace);
        itemMainSize = containerMainSize * (percentage / 100);
        console.log(`[FLEX] Wrapping calculation for ${item.element.id}: ${percentage}% of ${containerMainSize}px = ${itemMainSize}px`);
      } else {
        itemMainSize = isRow ? item.baseWidth : item.baseHeight;
      }
      
      const itemMarginMain = isRow 
        ? item.margin.left + item.margin.right
        : item.margin.top + item.margin.bottom;
      const totalItemSize = itemMainSize + itemMarginMain;
      
      // Check if item fits in current line
      console.log(`[FLEX] Wrapping check for ${item.element.id}: currentLineSize=${currentLineSize}px + totalItemSize=${totalItemSize}px = ${currentLineSize + totalItemSize}px vs availableMainSpace=${availableMainSpace}px`);
      
      if (currentLine.length === 0 || currentLineSize + totalItemSize <= availableMainSpace) {
        console.log(`[FLEX] Item ${item.element.id} fits in current line`);
        currentLine.push(item);
        currentLineSize += totalItemSize;
      } else {
        console.log(`[FLEX] Item ${item.element.id} does NOT fit, starting new line`);
        // Start new line
        if (currentLine.length > 0) {
          const crossSize = Math.max(...currentLine.map(lineItem => 
            isRow ? lineItem.height : lineItem.width
          ));
          lines.push({
            items: currentLine,
            crossSize,
            mainSize: currentLineSize
          });
        }
        
        currentLine = [item];
        currentLineSize = totalItemSize;
      }
    }
    
    // Add the last line
    if (currentLine.length > 0) {
      const crossSize = Math.max(...currentLine.map(lineItem => 
        isRow ? lineItem.height : lineItem.width
      ));
      lines.push({
        items: currentLine,
        crossSize,
        mainSize: currentLineSize
      });
    }
    
    return lines;
  }

  /**
   * Position items within a single flex line
   * Applies FlexLayoutService to each line for proper sizing
   */
  private positionItemsInLine(
    items: FlexItem[],
    availableMainSpace: number,
    lineCrossSize: number,
    crossOffset: number,
    containerWidth: number,
    containerHeight: number,
    padding: { top: number; right: number; bottom: number; left: number },
    flexProps: {
      flexDirection: string;
      justifyContent: string;
      alignItems: string;
      flexWrap: string;
      alignContent: string;
    },
    isRow: boolean,
    isReverse: boolean
  ): Array<{
    position: { x: number; y: number; z: number };
    size: { width: number; height: number };
  }> {
    // Apply FlexLayoutService to this line for proper flex-grow/shrink
    const flexContainer: FlexContainer = {
      width: containerWidth,
      height: containerHeight,
      padding,
      flexDirection: flexProps.flexDirection,
      justifyContent: flexProps.justifyContent,
      alignItems: flexProps.alignItems,
      flexWrap: flexProps.flexWrap,
      alignContent: 'stretch' // Default for individual lines
    };
    
    const sizedItems = this.flexLayoutService.calculateFlexItemSizes(
      items,
      flexContainer,
      availableMainSpace
    );
    
    console.log(`[FLEX] Line items after FlexLayoutService:`, sizedItems.map(item => ({
      id: item.element.id,
      width: item.width,
      height: item.height
    })));
    // Calculate total size of items in this line (using sized items)
    const totalSize = sizedItems.reduce((total, item) => {
      if (isRow) {
        return total + item.width + item.margin.left + item.margin.right;
      } else {
        return total + item.height + item.margin.top + item.margin.bottom;
      }
    }, 0);
    
    const remainingSpace = Math.max(0, availableMainSpace - totalSize);
    
    // Calculate spacing for justify-content
    let spacing = 0;
    let startOffset = 0;
    
    switch (flexProps.justifyContent) {
      case 'flex-start':
        startOffset = 0;
        break;
      case 'flex-end':
        startOffset = remainingSpace;
        break;
      case 'center':
        startOffset = remainingSpace / 2;
        break;
      case 'space-between':
        if (items.length > 1) {
          spacing = remainingSpace / (items.length - 1);
        }
        startOffset = 0;
        break;
      case 'space-around':
        spacing = remainingSpace / items.length;
        startOffset = spacing / 2;
        break;
      case 'space-evenly':
        spacing = remainingSpace / (items.length + 1);
        startOffset = spacing;
        break;
    }
    
    // Position each item
    let currentOffset = startOffset;
    const layout: Array<{
      position: { x: number; y: number; z: number };
      size: { width: number; height: number };
    }> = [];
    
    const itemsToProcess = isReverse ? [...sizedItems].reverse() : sizedItems;
    
    itemsToProcess.forEach((item, index) => {
      let x: number, y: number;
      
      if (isRow) {
        // Calculate X position (main axis)
        const itemLeft = padding.left + currentOffset + item.margin.left;
        x = -(containerWidth / 2) + itemLeft + (item.width / 2);
        
        // Calculate Y position (cross axis) - handle single line vs multi-line differently
        if (crossOffset === 0) {
          // Single line - center within entire container
          switch (flexProps.alignItems) {
            case 'flex-start':
              y = (containerHeight / 2) - padding.top - item.margin.top - (item.height / 2);
              break;
            case 'flex-end':
              y = -(containerHeight / 2) + padding.bottom + item.margin.bottom + (item.height / 2);
              break;
            case 'center':
              // Center within the available container space
              const availableHeight = containerHeight - padding.top - padding.bottom;
              const itemCenterOffset = (availableHeight - item.height) / 2;
              y = (containerHeight / 2) - padding.top - itemCenterOffset - (item.height / 2);
              break;
            case 'stretch':
              y = 0; // Center of container
              break;
            default:
              y = (containerHeight / 2) - padding.top - item.margin.top - (item.height / 2);
          }
        } else {
          // Multi-line - position within the specific line
          const baseCrossPos = padding.top + crossOffset;
          switch (flexProps.alignItems) {
            case 'flex-start':
              y = (containerHeight / 2) - baseCrossPos - item.margin.top - (item.height / 2);
              break;
            case 'flex-end':
              y = (containerHeight / 2) - baseCrossPos - lineCrossSize + item.margin.bottom + (item.height / 2);
              break;
            case 'center':
              const centerOffset = (lineCrossSize - item.height) / 2;
              y = (containerHeight / 2) - baseCrossPos - centerOffset - (item.height / 2);
              break;
            case 'stretch':
              y = (containerHeight / 2) - baseCrossPos - (lineCrossSize / 2);
              break;
            default:
              y = (containerHeight / 2) - baseCrossPos - item.margin.top - (item.height / 2);
          }
        }
        
        currentOffset += item.width + item.margin.left + item.margin.right + spacing;
      } else {
        // Calculate Y position (main axis)
        const itemTop = padding.top + currentOffset + item.margin.top;
        y = (containerHeight / 2) - itemTop - (item.height / 2);
        
        // Calculate X position (cross axis) - handle single line vs multi-line differently
        if (crossOffset === 0) {
          // Single line - center within entire container
          switch (flexProps.alignItems) {
            case 'flex-start':
              x = -(containerWidth / 2) + padding.left + item.margin.left + (item.width / 2);
              break;
            case 'flex-end':
              x = (containerWidth / 2) - padding.right - item.margin.right - (item.width / 2);
              break;
            case 'center':
              // Center within the available container space
              const availableWidth = containerWidth - padding.left - padding.right;
              const itemCenterOffset = (availableWidth - item.width) / 2;
              x = -(containerWidth / 2) + padding.left + itemCenterOffset + (item.width / 2);
              break;
            case 'stretch':
              x = 0; // Center of container
              break;
            default:
              x = -(containerWidth / 2) + padding.left + item.margin.left + (item.width / 2);
          }
        } else {
          // Multi-line - position within the specific line
          const baseCrossPos = padding.left + crossOffset;
          switch (flexProps.alignItems) {
            case 'flex-start':
              x = -(containerWidth / 2) + baseCrossPos + item.margin.left + (item.width / 2);
              break;
            case 'flex-end':
              x = -(containerWidth / 2) + baseCrossPos + lineCrossSize - item.margin.right - (item.width / 2);
              break;
            case 'center':
              const centerOffset = (lineCrossSize - item.width) / 2;
              x = -(containerWidth / 2) + baseCrossPos + centerOffset + (item.width / 2);
              break;
            case 'stretch':
              x = -(containerWidth / 2) + baseCrossPos + (lineCrossSize / 2);
              break;
            default:
              x = -(containerWidth / 2) + baseCrossPos + item.margin.left + (item.width / 2);
          }
        }
        
        currentOffset += item.height + item.margin.top + item.margin.bottom + spacing;
      }
      
      layout.push({
        position: { x, y, z: 0.01 + (index * 0.01) },
        size: { width: item.width, height: item.height }
      });
    });
    
    return layout;
  }
}