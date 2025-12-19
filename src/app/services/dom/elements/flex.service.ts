import { Injectable } from '@angular/core';
import { DOMElement } from '../../../types/dom-element';
import { StyleRule } from '../../../types/style-rule';
import { BabylonDOM } from '../interfaces/dom.types';
import { Mesh } from '@babylonjs/core';
import { BabylonRender } from '../interfaces/render.types';

@Injectable({ providedIn: 'root' })
export class FlexService {
    public isFlexContainer(render: BabylonRender, parentElement: DOMElement, styles: StyleRule[]): boolean {
        const parentStyle = render.actions.style.findStyleForElement(parentElement, styles);
        const display = parentStyle?.display;
        return display === 'flex';
      }
   
  public processFlexChildren(dom: BabylonDOM, render: BabylonRender, children: DOMElement[], parent: Mesh, styles: StyleRule[], parentElement: DOMElement): void {
    console.log(`🔀 Processing ${children.length} flex children for parent:`, parent.name);
    console.log('🔍 Children IDs:', children.map(c => c.id));
    
    const parentStyle = render.actions.style.findStyleForElement(parentElement, styles);
    const flexDirection = this.getFlexDirection(parentStyle);
    const justifyContent = this.getJustifyContent(parentStyle);
    const alignItems = this.getAlignItems(parentStyle);
    const alignContent = this.getAlignContent(render, parentStyle);
    const flexWrap = this.getFlexWrap(parentStyle);
    
    console.log(`🔀 Flex properties - direction: ${flexDirection}, justify: ${justifyContent}, align: ${alignItems}, alignContent: ${alignContent}, wrap: ${flexWrap}`);
    
    // Calculate flex layout
    const flexLayout = this.calculateFlexLayout(dom, render,children, parent, styles, parentElement, parentStyle, {
      flexDirection,
      justifyContent,
      alignItems,
      alignContent,
      flexWrap
    });
    console.log('🧩 Flex layout result:', flexLayout.map((l, i) => ({
      index: i,
      position: l.position,
      size: l.size,
      childId: children[i]?.id
    })));
    
    // Create and position child elements according to flex layout
    flexLayout.forEach((childLayout, index) => {
      const child = children[index];
      console.log(`🔀 Creating flex child ${index + 1}/${children.length}: ${child.type}#${child.id}`);
      console.log(`🔀 Child ${child.id} layout position: (${childLayout.position.x.toFixed(2)}, ${childLayout.position.y.toFixed(2)}, ${childLayout.position.z.toFixed(6)}) size: (${childLayout.size.width.toFixed(2)}x${childLayout.size.height.toFixed(2)})`);
      
      try {
        const childMesh = dom.actions.createElement(dom, render,child, parent, styles, childLayout.position, childLayout.size);
        console.log(`✅ Created flex child mesh:`, childMesh.name, `Position:`, childMesh.position);
        console.log(`🎯 VERIFICATION: ${child.id} -> X position ${childMesh.position.x.toFixed(2)} (expected ${childLayout.position.x.toFixed(2)})`);
        
        if (child.children && child.children.length > 0) {
          console.log(`🔄 Flex child ${child.id} has ${child.children.length} sub-children`);
          dom.actions.processChildren(dom, render,child.children, childMesh, styles, child);
          console.log(`✅ Completed sub-children processing for flex child ${child.id}`);
        }
      } catch (error) {
        console.error(`❌ Error processing flex child ${child.type}#${child.id}:`, error);
        throw error;
      }
    });
    
    console.log(`✅ Finished processing all flex children for parent:`, parent.name);
  }

  private calculateFlexLayout(dom: BabylonDOM, render: BabylonRender, children: DOMElement[], parent: Mesh, styles: StyleRule[], parentElement: DOMElement, parentStyle?: StyleRule, flexProps?: {
    flexDirection: string;
    justifyContent: string;
    alignItems: string;
    alignContent?: string;
    flexWrap: string;
  }): Array<{ position: { x: number; y: number; z: number }; size: { width: number; height: number } }> {
    
    if (!flexProps) return [];
    
    console.log(`🧮 Calculating flex layout for ${children.length} children`);
    console.log(`🧮 Flex props:`, flexProps);
    
    // Get parent dimensions from stored data - parent.name should match parentElement.id
    const parentId = parentElement?.id || parent.name.replace('-body', '');
    const parentDimensions = dom.context.elementDimensions.get(parentId) || {
      width: 20, height: 10, padding: { top: 0, right: 0, bottom: 0, left: 0 }
    };
    
    console.log(`🧮 Parent ID: ${parentId}, stored dimensions:`, dom.context.elementDimensions.get(parentId));
    console.log(`🧮 Available dimension keys:`, Array.from(dom.context.elementDimensions.keys()));
    
    const isRow = flexProps.flexDirection === 'row' || flexProps.flexDirection === 'row-reverse';
    const isReverse = flexProps.flexDirection.includes('reverse');
    const canWrap = flexProps.flexWrap === 'wrap' || flexProps.flexWrap === 'wrap-reverse';
    const isWrapReverse = flexProps.flexWrap === 'wrap-reverse';
    
    console.log(`🧮 Parent dimensions: ${parentDimensions.width}x${parentDimensions.height}, isRow: ${isRow}, isReverse: ${isReverse}, canWrap: ${canWrap}, isWrapReverse: ${isWrapReverse}`);
    
    // Parse gap properties from parent style
    const { rowGap, columnGap } = parentStyle ? this.parseGapProperties(parentStyle) : { rowGap: 0, columnGap: 0 };
    const mainAxisGap = isRow ? columnGap : rowGap; // Gap between items on main axis
    const crossAxisGap = isRow ? rowGap : columnGap; // Gap between lines on cross axis
    
    console.log(`🧮 Gap properties: rowGap=${rowGap.toFixed(3)}, columnGap=${columnGap.toFixed(3)}, mainAxisGap=${mainAxisGap.toFixed(3)}, crossAxisGap=${crossAxisGap.toFixed(3)}`);
    
    // Calculate child dimensions and flex properties
    const childData = children.map(child => {
      const childStyle = render.actions.style.findStyleForElement(child, styles);
      const flexGrow = parseFloat(childStyle?.flexGrow || childStyle?.flexGrow || '0');
      const flexShrink = parseFloat(childStyle?.flexShrink || childStyle?.flexShrink || '1');
      const flexBasis = childStyle?.flexBasis || childStyle?.flexBasis || 'auto';
      const order = render.actions.style.parseOrder(childStyle?.order);
      
      // Calculate base size
      let baseWidth, baseHeight;
      if (isRow) {
        baseWidth = flexBasis === 'auto' ? parentDimensions.width / children.length : this.parseFlexBasis(flexBasis, parentDimensions.width);
        // For wrapped row layouts, don't make items fill the full height
        if (canWrap) {
          baseHeight = parentDimensions.height / 3; // Allow space for multiple lines
        } else {
          baseHeight = parentDimensions.height;
        }
      } else {
        // For wrapped column layouts, don't make items fill the full width  
        if (canWrap) {
          baseWidth = parentDimensions.width / 3; // Allow space for multiple columns
        } else {
          baseWidth = parentDimensions.width;
        }
        baseHeight = flexBasis === 'auto' ? parentDimensions.height / children.length : this.parseFlexBasis(flexBasis, parentDimensions.height);
      }
      
      return {
        element: child,
        style: childStyle,
        flexGrow,
        flexShrink,
        flexBasis,
        baseWidth,
        baseHeight,
        order,
        originalIndex: children.indexOf(child) // Store original index for stable sorting
      };
    });
    
    // Sort children by order property
    const sortedChildData = this.sortItemsByOrder(childData);
    console.log('🧮 FLEX DEBUG: Sorted children by order:', sortedChildData.map(c => ({
      id: c.element.id,
      order: c.order,
      originalIndex: c.originalIndex
    })));

    // Now log childData, after it exists:
    console.log('🧮 FLEX DEBUG: childData', sortedChildData.map((c, i) => ({
      index: i,
      id: c.element.id,
      flexGrow: c.flexGrow,
      flexShrink: c.flexShrink,
      flexBasis: c.flexBasis,
      baseWidth: c.baseWidth,
      baseHeight: c.baseHeight
    })));

    // Handle flex-wrap: organize children into lines
    const lines: Array<typeof childData> = [];
    
    if (!canWrap) {
      // No wrapping: all items on one line
      lines.push(sortedChildData);
    } else {
      // Wrapping enabled: distribute items across multiple lines
      console.log(`🧮 FLEX-WRAP: Organizing ${children.length} items into wrapped lines`);
      
      let currentLine: typeof childData = [];
      let currentLineSize = 0;
      const maxLineSize = isRow ? parentDimensions.width : parentDimensions.height;
      
      sortedChildData.forEach((child, index) => {
        const itemSize = isRow ? child.baseWidth : child.baseHeight;
        
        // Calculate the size this item would add to the current line
        // Include gap if this isn't the first item in the line
        const gapSize = currentLine.length > 0 ? mainAxisGap : 0;
        const totalItemSize = itemSize + gapSize;
        
        // Check if adding this item would exceed the line size
        // Allow a small tolerance to prevent unnecessary wrapping due to floating point precision
        const tolerance = 0.01;
        if (currentLine.length > 0 && (currentLineSize + totalItemSize) > (maxLineSize + tolerance)) {
          // Start new line
          console.log(`🧮 WRAP: Line ${lines.length + 1} complete with ${currentLine.length} items (size: ${currentLineSize.toFixed(2)})`);
          lines.push(currentLine);
          currentLine = [child];
          currentLineSize = itemSize;
        } else {
          // Add to current line
          currentLine.push(child);
          currentLineSize += totalItemSize;
        }
        
        console.log(`🧮 WRAP: Item ${index + 1} (${child.element.id}) added to line ${lines.length + 1}, line size now: ${currentLineSize.toFixed(2)}/${maxLineSize.toFixed(2)} (gap: ${gapSize.toFixed(3)})`);
      });
      
      // Add the last line
      if (currentLine.length > 0) {
        lines.push(currentLine);
        console.log(`🧮 WRAP: Final line ${lines.length} with ${currentLine.length} items`);
      }
      
      console.log(`🧮 WRAP: Created ${lines.length} lines:`, lines.map((line, idx) => `Line ${idx + 1}: ${line.length} items`));
    }

    // Apply wrap-reverse if needed
    if (isWrapReverse) {
      lines.reverse();
      console.log(`🧮 WRAP-REVERSE: Reversed line order`);
    }

    // Calculate positions for each line
    const layout: Array<{ position: { x: number; y: number; z: number }; size: { width: number; height: number } }> = [];
    
    // Calculate cross-axis layout based on align-content
    const crossAxisSize = isRow ? parentDimensions.height : parentDimensions.width;
    
    // Calculate line heights/widths (cross-axis sizes)
    const lineCrossSizes = lines.map(line => {
      // For multi-line flex containers, use a fixed height/width for each line
      // This ensures consistent spacing for align-content
      return isRow ? 
        (canWrap ? parentDimensions.height / Math.max(3, lines.length) : parentDimensions.height) : 
        (canWrap ? parentDimensions.width / Math.max(3, lines.length) : parentDimensions.width);
    });
    
    // Apply align-content algorithm to determine line positions
    const linePositions = this.applyAlignContent(
      flexProps.alignContent || 'stretch',
      lines,
      lineCrossSizes,
      crossAxisSize,
      crossAxisGap,
      canWrap
    );
    
    console.log(`🧮 Cross-axis layout: totalSize=${crossAxisSize.toFixed(3)}, linePositions=`, linePositions);
    
    lines.forEach((line, lineIndex) => {
      // --- FLEX GROW/SHRINK LOGIC START ---
      // Calculate total base size and total flex factors
      const containerSize = isRow ? parentDimensions.width : parentDimensions.height;
      const totalBaseSize = line.reduce((sum, child) => sum + (isRow ? child.baseWidth : child.baseHeight), 0);
      const totalMainAxisGaps = line.length > 1 ? (line.length - 1) * mainAxisGap : 0;
      const totalContentSize = totalBaseSize + totalMainAxisGaps;
      const availableSpace = containerSize - totalContentSize;
      // Calculate total grow/shrink factors
      const totalGrow = line.reduce((sum, child) => sum + (child.flexGrow || 0), 0);
      const totalShrink = line.reduce((sum, child) => sum + (child.flexShrink || 0), 0);
      // Determine if we need to grow or shrink
      let itemSizes: number[] = [];
      if (availableSpace > 0 && totalGrow > 0) {
        // Distribute extra space by flexGrow
        itemSizes = line.map(child => {
          const base = isRow ? child.baseWidth : child.baseHeight;
          return base + (availableSpace * (child.flexGrow || 0) / totalGrow);
        });
      } else if (availableSpace < 0 && totalShrink > 0) {
        // Remove overflow space by flexShrink (CSS spec: shrink is proportional to flexShrink * baseSize)
        const shrinkableTotal = line.reduce((sum, child) => sum + ((child.flexShrink > 0 ? child.flexShrink * (isRow ? child.baseWidth : child.baseHeight) : 0)), 0);
        itemSizes = line.map(child => {
          const base = isRow ? child.baseWidth : child.baseHeight;
          if (child.flexShrink > 0 && shrinkableTotal > 0) {
            const shrinkFactor = child.flexShrink * base;
            return base + (availableSpace * (shrinkFactor / shrinkableTotal));
          } else {
            // No shrink
            return base;
          }
        });
      } else {
        // No grow/shrink, use base sizes
        itemSizes = line.map(child => isRow ? child.baseWidth : child.baseHeight);
      }

      console.log('🧮 FLEX DEBUG: line', line.map((c, i) => ({
        index: i,
        id: c.element.id,
        base: isRow ? c.baseWidth : c.baseHeight,
        flexGrow: c.flexGrow,
        flexShrink: c.flexShrink
      })));
      console.log('🧮 FLEX DEBUG: containerSize', containerSize, 'totalBaseSize', totalBaseSize, 'totalMainAxisGaps', totalMainAxisGaps, 'totalContentSize', totalContentSize, 'availableSpace', availableSpace, 'totalGrow', totalGrow, 'totalShrink', totalShrink);
      console.log('🧮 FLEX DEBUG: itemSizes', itemSizes);

      // --- FLEX GROW/SHRINK LOGIC END ---
      // Calculate spacing for justify-content (main axis)
      let spacing = 0;
      let startOffset = 0;
      const totalItemSize = itemSizes.reduce((sum, s) => sum + s, 0);
      const totalContentWithGaps = totalItemSize + totalMainAxisGaps;
      const mainAxisAvailable = containerSize - totalContentWithGaps;
      if (flexProps.justifyContent === 'center') {
        startOffset = mainAxisAvailable / 2;
      } else if (flexProps.justifyContent === 'flex-end') {
        startOffset = mainAxisAvailable;
      } else if (flexProps.justifyContent === 'space-between' && line.length > 1) {
        spacing = mainAxisAvailable / (line.length - 1);
        startOffset = 0;
      } else if (flexProps.justifyContent === 'space-around') {
        spacing = mainAxisAvailable / line.length;
        startOffset = spacing / 2;
      } else if (flexProps.justifyContent === 'space-evenly') {
        spacing = mainAxisAvailable / (line.length + 1);
        startOffset = spacing;
      }
      let currentOffset = startOffset;
      // Calculate cross-axis position for this line using the positions from applyAlignContent
      // In BabylonJS, positive Y is up, but in CSS flex layout, positive Y is down
      // We need to convert from CSS coordinate system to BabylonJS coordinate system
      const linePosition = isRow 
        ? -(parentDimensions.height / 2) + linePositions[lineIndex]
        : -(parentDimensions.width / 2) + linePositions[lineIndex];
      line.forEach((child, indexInLine) => {
        let x, y;
        // Use itemSizes for main axis size
        const mainSize = itemSizes[indexInLine];
        
        // Calculate main axis position
        if (isRow) {
          x = -(currentOffset - parentDimensions.width / 2 + mainSize / 2);
          const gapToAdd = indexInLine < line.length - 1 ? mainAxisGap : 0;
          currentOffset += mainSize + spacing + gapToAdd;
        } else {
          y = parentDimensions.height / 2 - currentOffset - mainSize / 2;
          const gapToAdd = indexInLine < line.length - 1 ? mainAxisGap : 0;
          currentOffset += mainSize + spacing + gapToAdd;
        }
        
        // Calculate cross axis position using align-self or align-items
        const alignSelf = this.getAlignSelf(render, child.style, flexProps.alignItems);
        const crossAxisPosition = this.applyAlignSelf(
          alignSelf,
          isRow ? child.baseHeight : child.baseWidth,
          isRow ? lineCrossSizes[lineIndex] : lineCrossSizes[lineIndex],
          canWrap && lines.length > 1
        );
        
        // Apply cross axis position
        if (isRow) {
          // For row direction, cross axis is Y
          if (canWrap && lines.length > 1) {
            // For wrapped rows, position based on line position and align-self within the line
            y = linePosition + crossAxisPosition;
          } else {
            // For single line, just use align-self position
            y = crossAxisPosition;
          }
        } else {
          // For column direction, cross axis is X
          if (canWrap && lines.length > 1) {
            // For wrapped columns, position based on line position and align-self within the line
            x = linePosition + crossAxisPosition;
          } else {
            // For single line, just use align-self position
            x = crossAxisPosition;
          }
        }
        
        const zPosition = 0.01 + (layout.length * 0.01);
        layout.push({
          position: { x: x || 0, y: y || 0, z: zPosition },
          size: isRow ? { width: mainSize, height: child.baseHeight } : { width: child.baseWidth, height: mainSize }
        });
      });
    });

    console.log('🧮 FLEX DEBUG: final layout', layout.map((l, i) => ({
      index: i,
      position: l.position,
      size: l.size
    })));
    
    return layout;
  }

  private parseFlexBasis(flexBasis: string, containerSize: number): number {
    if (flexBasis.endsWith('%')) {
      return (parseFloat(flexBasis) / 100) * containerSize;
    } else if (flexBasis.endsWith('px')) {
      // Convert pixels to world units
      return parseFloat(flexBasis) * 0.01; // Approximate pixel to world conversion
    } else {
      return parseFloat(flexBasis) || containerSize / 3; // Fallback
    }
  }
  
  private parseGapProperties(style: StyleRule): { rowGap: number; columnGap: number } {
    let rowGap = 0;
    let columnGap = 0;
    const rowGapValue = style?.rowGap || style?.rowGap;
    if (rowGapValue) {
      rowGap = this.parseGapValue(rowGapValue);
    }
    const columnGapValue = style?.columnGap || style?.columnGap;
    if (columnGapValue) {
      columnGap = this.parseGapValue(columnGapValue);
    }
    const gapValue = style?.gap;
    if (gapValue) {
      const gaps = gapValue.trim().split(/\s+/);
      if (gaps.length === 1) {
        const parsedGap = this.parseGapValue(gaps[0]);
        rowGap = parsedGap;
        columnGap = parsedGap;
      } else if (gaps.length === 2) {
        rowGap = this.parseGapValue(gaps[0]);
        columnGap = this.parseGapValue(gaps[1]);
      }
    }
    return { rowGap, columnGap };
  }

  private parseGapValue(gapValue: string): number {
    if (!gapValue || gapValue === '0' || gapValue === 'normal') {
      return 0;
    }
    if (gapValue.endsWith('px')) {
      // Convert pixels to world units using the same scale as other measurements
      return parseFloat(gapValue) * 0.01;
    } else if (gapValue.endsWith('em') || gapValue.endsWith('rem')) {
      // Assume 1em = 16px for now (this could be made configurable)
      const emValue = parseFloat(gapValue);
      return emValue * 16 * 0.01; // 16px per em, converted to world units
    } else if (gapValue.endsWith('%')) {
      // Percentage gaps would need context of container size, return a reasonable default
      console.warn(`Percentage gaps not fully supported yet: ${gapValue}`);
      return parseFloat(gapValue) * 0.001; // Small fallback
    } else {
      // Unitless value, treat as pixels
      return parseFloat(gapValue) * 0.01;
    }
  }


  private getFlexDirection(style?: StyleRule): string {
    return style?.flexDirection || style?.flexDirection || 'row';
  }

  private getJustifyContent(style?: StyleRule): string {
    return style?.justifyContent || style?.justifyContent || 'flex-start';
  }

  private getAlignItems(style?: StyleRule): string {
    return style?.alignItems || style?.alignItems || 'stretch';
  }

  private getFlexWrap(style?: StyleRule): string {
    return style?.flexWrap || style?.flexWrap || 'nowrap';
  }

  private getAlignContent(render: BabylonRender, style?: StyleRule): string {
    // Use the StyleService's parseAlignContent method to normalize and validate the value
    return render.actions.style.parseAlignContent(style?.alignContent);
  }
  
  /**
   * Sorts flex items by their order property, maintaining source order for equal values
   * @param items The flex items to sort
   * @returns A new array with the sorted items
   */
  private sortItemsByOrder(items: any[]): any[] {
    return [...items].sort((a, b) => {
      const orderA = a.order || 0;
      const orderB = b.order || 0;
      
      // If orders are equal, maintain source order
      if (orderA === orderB) {
        return a.originalIndex - b.originalIndex;
      }
      
      return orderA - orderB;
    });
  }
  
  /**
   * Gets the effective align-self value for a flex item, considering the container's align-items
   * @param render The BabylonRender instance
   * @param style The style rule for the flex item
   * @param containerAlignItems The align-items value of the container
   * @returns The effective align-self value
   */
  private getAlignSelf(render: BabylonRender, style?: StyleRule, containerAlignItems?: string): string {
    // Get the align-self value from the style
    const alignSelf = style?.alignSelf;
    
    // If align-self is not specified or is 'auto', use the container's align-items
    if (!alignSelf || alignSelf === 'auto') {
      return containerAlignItems || 'stretch';
    }
    
    // Use the StyleService's parseAlignSelf method to normalize and validate the value
    return render.actions.style.parseAlignSelf(alignSelf);
  }
  
  /**
   * Applies the align-self algorithm to determine the cross-axis position of a flex item
   * @param alignSelf The align-self value to apply
   * @param itemCrossSize The cross-axis size of the item
   * @param lineCrossSize The cross-axis size of the line
   * @param isWrapped Whether the flex container has wrapped lines
   * @returns The cross-axis position of the item
   */
  private applyAlignSelf(
    alignSelf: string,
    itemCrossSize: number,
    lineCrossSize: number,
    isWrapped: boolean
  ): number {
    console.log(`🧮 Applying align-self: ${alignSelf}, itemSize=${itemCrossSize.toFixed(3)}, lineSize=${lineCrossSize.toFixed(3)}, isWrapped=${isWrapped}`);
    
    // Calculate the position based on the align-self value
    switch (alignSelf) {
      case 'flex-start':
        // Align to the start of the cross axis
        return 0;
        
      case 'flex-end':
        // Align to the end of the cross axis
        return lineCrossSize - itemCrossSize;
        
      case 'center':
        // Center in the cross axis
        return (lineCrossSize - itemCrossSize) / 2;
        
      case 'baseline':
        // Simplified baseline alignment (would need text metrics for proper implementation)
        // For now, treat it the same as flex-start
        return 0;
        
      case 'stretch':
      default:
        // Stretch to fill the line's cross size
        // Note: In a real implementation, we would modify the item's cross size here
        // For now, just center it
        return (lineCrossSize - itemCrossSize) / 2;
    }
  }

  /**
   * Applies the align-content algorithm to determine line positions along the cross axis
   * @param alignContent The align-content value to apply
   * @param lines The flex lines to position
   * @param lineCrossSizes The cross-axis size of each line
   * @param availableCrossSize The total available cross-axis size
   * @param crossAxisGap The gap between lines on the cross axis
   * @param canWrap Whether flex-wrap is enabled
   * @returns An array of positions for each line along the cross axis
   */
  private applyAlignContent(
    alignContent: string,
    lines: Array<any[]>,
    lineCrossSizes: number[],
    availableCrossSize: number,
    crossAxisGap: number,
    canWrap: boolean
  ): number[] {
    console.log(`🧮 Applying align-content: ${alignContent}`);
    
    // Skip if not wrapping or only one line (align-content has no effect)
    if (!canWrap || lines.length <= 1) {
      console.log(`🧮 Skipping align-content: ${!canWrap ? 'wrapping disabled' : 'only one line'}`);
      return lines.map(() => 0); // Default position for single line
    }
    
    // Calculate total cross size and remaining space
    const totalCrossSize = lineCrossSizes.reduce((sum, size) => sum + size, 0);
    const totalGaps = (lines.length - 1) * crossAxisGap;
    const totalSize = totalCrossSize + totalGaps;
    const remainingSpace = Math.max(0, availableCrossSize - totalSize);
    
    console.log(`🧮 Cross-axis calculations: totalCrossSize=${totalCrossSize.toFixed(3)}, totalGaps=${totalGaps.toFixed(3)}, totalSize=${totalSize.toFixed(3)}, remainingSpace=${remainingSpace.toFixed(3)}`);
    
    // Calculate line positions based on align-content value
    const linePositions: number[] = [];
    let currentPosition = 0;
    
    switch (alignContent) {
      case 'flex-start':
        // Lines packed at the start of the cross axis
        lines.forEach((_, index) => {
          linePositions.push(currentPosition);
          currentPosition += lineCrossSizes[index] + (index < lines.length - 1 ? crossAxisGap : 0);
        });
        console.log(`🧮 align-content: flex-start - lines packed at start`);
        break;
        
      case 'flex-end':
        // Lines packed at the end of the cross axis
        currentPosition = remainingSpace;
        lines.forEach((_, index) => {
          linePositions.push(currentPosition);
          currentPosition += lineCrossSizes[index] + (index < lines.length - 1 ? crossAxisGap : 0);
        });
        console.log(`🧮 align-content: flex-end - lines packed at end with ${remainingSpace.toFixed(3)} space at start`);
        break;
        
      case 'center':
        // Lines centered on the cross axis
        currentPosition = remainingSpace / 2;
        lines.forEach((_, index) => {
          linePositions.push(currentPosition);
          currentPosition += lineCrossSizes[index] + (index < lines.length - 1 ? crossAxisGap : 0);
        });
        console.log(`🧮 align-content: center - lines centered with ${(remainingSpace / 2).toFixed(3)} space on each side`);
        break;
        
      case 'space-between':
        // Space distributed evenly between lines
        if (lines.length > 1) {
          const spaceBetween = remainingSpace / (lines.length - 1);
          lines.forEach((_, index) => {
            linePositions.push(currentPosition);
            currentPosition += lineCrossSizes[index] + crossAxisGap + (index < lines.length - 1 ? spaceBetween : 0);
          });
          console.log(`🧮 align-content: space-between - ${spaceBetween.toFixed(3)} extra space between each line`);
        } else {
          // Only one line, center it
          linePositions.push(remainingSpace / 2);
          console.log(`🧮 align-content: space-between - only one line, centered`);
        }
        break;
        
      case 'space-around':
        // Space distributed evenly around lines
        // Each line gets equal space on both sides
        // The space between adjacent lines is twice the space at the edges
        const spaceAround = remainingSpace / (lines.length * 2); // Half-space per line (top and bottom)
        let positionAround = spaceAround; // Start with half-space
        
        lines.forEach((_, index) => {
          linePositions.push(positionAround);
          positionAround += lineCrossSizes[index] + crossAxisGap;
          
          // Add full space after each line (which combines with the half-space before the next line)
          if (index < lines.length - 1) {
            positionAround += spaceAround * 2;
          }
        });
        console.log(`🧮 align-content: space-around - ${spaceAround.toFixed(3)} half-space around each line, ${(spaceAround * 2).toFixed(3)} between lines`);
        break;
        
      case 'space-evenly':
        // Space distributed evenly between and around lines
        // All spaces are equal (between lines and at edges)
        const spaceEvenly = remainingSpace / (lines.length + 1); // Equal space everywhere
        let positionEvenly = spaceEvenly; // Start with one full space
        
        lines.forEach((_, index) => {
          linePositions.push(positionEvenly);
          positionEvenly += lineCrossSizes[index] + crossAxisGap;
          
          // Add one full space after each line
          if (index < lines.length - 1) {
            positionEvenly += spaceEvenly;
          }
        });
        console.log(`🧮 align-content: space-evenly - ${spaceEvenly.toFixed(3)} space evenly distributed`);
        break;
        
      case 'stretch':
      default:
        // Stretch lines to fill container
        if (lines.length > 0 && totalCrossSize > 0) {
          // For stretch, we need to adjust the line cross sizes proportionally
          // Calculate the stretch factor
          const stretchFactor = availableCrossSize / totalSize;
          
          // Distribute lines evenly across the available space
          let accumulatedPosition = 0;
          lines.forEach((_, index) => {
            linePositions.push(accumulatedPosition);
            // Calculate stretched size for this line
            const stretchedSize = lineCrossSizes[index] * stretchFactor;
            accumulatedPosition += stretchedSize + (index < lines.length - 1 ? crossAxisGap * stretchFactor : 0);
          });
          console.log(`🧮 align-content: stretch - lines stretched by factor ${stretchFactor.toFixed(3)}`);
        } else {
          // Fallback for edge case
          lines.forEach(() => linePositions.push(0));
          console.log(`🧮 align-content: stretch - fallback to default positions`);
        }
        break;
    }
    
    console.log(`🧮 Final line positions:`, linePositions.map(p => p.toFixed(3)));
    return linePositions;
  }
}