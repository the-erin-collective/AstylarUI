import { Injectable } from '@angular/core';
import { Mesh } from '@babylonjs/core';
import { BabylonMeshService } from './babylon-mesh.service';
import { BabylonCameraService } from './babylon-camera.service';
import { StyleService } from './style.service';
import { ElementService } from './element.service';
import { StyleRule } from '../types/style-rule';
import { DOMElement } from '../types/dom-element';

@Injectable({
  providedIn: 'root'
})
export class FlexService {
  private meshService?: BabylonMeshService;
  private cameraService?: BabylonCameraService;
  private styleService?: StyleService;
  private elementService?: ElementService;
  private elementDimensions: Map<string, { width: number, height: number, padding: { top: number; right: number; bottom: number; left: number } }> = new Map();
  private storeElementCallback?: (element: DOMElement, mesh: Mesh, dimensions?: { width: number; height: number; padding: { top: number; right: number; bottom: number; left: number } }) => void;

  initialize(meshService: BabylonMeshService, cameraService: BabylonCameraService, styleService: StyleService, elementService: ElementService, storeElementCallback?: (element: DOMElement, mesh: Mesh, dimensions?: { width: number; height: number; padding: { top: number; right: number; bottom: number; left: number } }) => void): void {
    this.meshService = meshService;
    this.cameraService = cameraService;
    this.styleService = styleService;
    this.elementService = elementService;
    this.storeElementCallback = storeElementCallback;
  }

  isFlexContainer(parentElement: DOMElement, styles: StyleRule[]): boolean {
    const parentStyle = this.styleService?.findStyleForElement(parentElement, styles);
    const display = parentStyle?.display;
    return display === 'flex';
  }

  processFlexChildren(children: DOMElement[], parent: Mesh, styles: StyleRule[], parentElement: DOMElement): void {
    console.log(`🔀 Processing ${children.length} flex children for parent:`, parent.name);
    console.log('🔍 Children IDs:', children.map(c => c.id));
    
    const parentStyle = this.styleService?.findStyleForElement(parentElement, styles);
    const flexDirection = this.getFlexDirection(parentStyle);
    const justifyContent = this.getJustifyContent(parentStyle);
    const alignItems = this.getAlignItems(parentStyle);
    const flexWrap = this.getFlexWrap(parentStyle);
    
    console.log(`🔀 Flex properties - direction: ${flexDirection}, justify: ${justifyContent}, align: ${alignItems}, wrap: ${flexWrap}`);
    
    // Calculate flex layout
    const flexLayout = this.calculateFlexLayout(children, parent, styles, parentElement, parentStyle, {
      flexDirection,
      justifyContent,
      alignItems,
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
        const childMesh = this.elementService?.createElement(child, parent, styles, childLayout.position, childLayout.size);
        console.log(`✅ Created flex child mesh:`, childMesh?.name, `Position:`, childMesh?.position);
        console.log(`🎯 VERIFICATION: ${child.id} -> X position ${childMesh?.position.x.toFixed(2)} (expected ${childLayout.position.x.toFixed(2)})`);
        
        // Store element in main service if callback is provided
        if (this.storeElementCallback && child.id && childMesh) {
          const dimensions = this.elementService?.getCalculatedDimensions(child, parent, styles);
          this.storeElementCallback(child, childMesh, dimensions || undefined);
        }
        
        if (child.children && child.children.length > 0) {
          console.log(`🔄 Flex child ${child.id} has ${child.children.length} sub-children`);
          // Note: This would need to be handled by the main BabylonDOMService
          console.log(`🔄 Sub-children processing would be handled by main service`);
        }
      } catch (error) {
        console.error(`❌ Error processing flex child ${child.type}#${child.id}:`, error);
        throw error;
      }
    });
    
    console.log(`✅ Finished processing all flex children for parent:`, parent.name);
  }

  private getFlexDirection(style?: StyleRule): string {
    return style?.flexDirection || 'row';
  }

  private getJustifyContent(style?: StyleRule): string {
    return style?.justifyContent || 'flex-start';
  }

  private getAlignItems(style?: StyleRule): string {
    return style?.alignItems || 'stretch';
  }

  private getFlexWrap(style?: StyleRule): string {
    return style?.flexWrap || 'nowrap';
  }

  private calculateFlexLayout(children: DOMElement[], parent: Mesh, styles: StyleRule[], parentElement: DOMElement, parentStyle?: StyleRule, flexProps?: {
    flexDirection: string;
    justifyContent: string;
    alignItems: string;
    flexWrap: string;
  }): Array<{ position: { x: number; y: number; z: number }; size: { width: number; height: number } }> {
    
    if (!flexProps) return [];
    
    console.log(`🧮 Calculating flex layout for ${children.length} children`);
    console.log(`🧮 Flex props:`, flexProps);
    
    // Get parent dimensions from stored data - parent.name should match parentElement.id
    const parentId = parentElement?.id || parent.name.replace('-body', '');
    const parentDimensions = this.elementDimensions.get(parentId) || {
      width: 20, height: 10, padding: { top: 0, right: 0, bottom: 0, left: 0 }
    };
    
    console.log(`🧮 Parent ID: ${parentId}, stored dimensions:`, this.elementDimensions.get(parentId));
    console.log(`🧮 Available dimension keys:`, Array.from(this.elementDimensions.keys()));
    
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
      const childStyle = this.styleService?.findStyleForElement(child, styles);
      const flexGrow = parseFloat(childStyle?.flexGrow || '0');
      const flexShrink = parseFloat(childStyle?.flexShrink || '1');
      const flexBasis = childStyle?.flexBasis || 'auto';
      
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
        baseHeight
      };
    });

    // Now log childData, after it exists:
    console.log('🧮 FLEX DEBUG: childData', childData.map((c, i) => ({
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
      lines.push(childData);
    } else {
      // Wrapping enabled: distribute items across multiple lines
      console.log(`🧮 FLEX-WRAP: Organizing ${children.length} items into wrapped lines`);
      
      let currentLine: typeof childData = [];
      let currentLineSize = 0;
      const maxLineSize = isRow ? parentDimensions.width : parentDimensions.height;
      
      childData.forEach((child, index) => {
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
    
    // Calculate line spacing for cross-axis
    const crossAxisSize = isRow ? parentDimensions.height : parentDimensions.width;
    const totalCrossAxisGaps = lines.length > 1 ? (lines.length - 1) * crossAxisGap : 0;
    const availableCrossAxisSpace = crossAxisSize - totalCrossAxisGaps;
    const lineHeight = availableCrossAxisSpace / lines.length;
    
    console.log(`🧮 Cross-axis layout: totalSize=${crossAxisSize.toFixed(3)}, gaps=${totalCrossAxisGaps.toFixed(3)}, available=${availableCrossAxisSpace.toFixed(3)}, lineHeight=${lineHeight.toFixed(3)}`);
    
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
      // Calculate cross-axis position for this line
      const totalGapsBeforeLine = lineIndex * crossAxisGap;
      const linePosition = isRow 
        ? (parentDimensions.height / 2) - (lineIndex + 0.5) * lineHeight - totalGapsBeforeLine
        : -(parentDimensions.width / 2) + (lineIndex + 0.5) * lineHeight + totalGapsBeforeLine;
      line.forEach((child, indexInLine) => {
        let x, y;
        // Use itemSizes for main axis size
        const mainSize = itemSizes[indexInLine];
        if (isRow) {
          x = -(currentOffset - parentDimensions.width / 2 + mainSize / 2);
          // Cross-axis positioning for wrapped lines
          if (canWrap && lines.length > 1) {
            y = linePosition;
          } else {
            if (flexProps.alignItems === 'center') {
              y = 0;
            } else if (flexProps.alignItems === 'flex-end') {
              y = -(parentDimensions.height / 2 - child.baseHeight / 2);
            } else {
              y = parentDimensions.height / 2 - child.baseHeight / 2;
            }
          }
          const gapToAdd = indexInLine < line.length - 1 ? mainAxisGap : 0;
          currentOffset += mainSize + spacing + gapToAdd;
        } else {
          y = parentDimensions.height / 2 - currentOffset - mainSize / 2;
          if (canWrap && lines.length > 1) {
            x = linePosition;
          } else {
            if (flexProps.alignItems === 'center') {
              x = 0;
            } else if (flexProps.alignItems === 'flex-end') {
              x = parentDimensions.width / 2 - child.baseWidth / 2;
            } else {
              x = -parentDimensions.width / 2 + child.baseWidth / 2;
            }
          }
          const gapToAdd = indexInLine < line.length - 1 ? mainAxisGap : 0;
          currentOffset += mainSize + spacing + gapToAdd;
        }
        const zPosition = 0.01 + (layout.length * 0.01);
        layout.push({
          position: { x, y, z: zPosition },
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
    const rowGapValue = style?.rowGap;
    if (rowGapValue) {
      rowGap = this.parseGapValue(rowGapValue);
    }
    const columnGapValue = style?.columnGap;
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

  setElementDimensions(elementId: string, dimensions: { width: number, height: number, padding: { top: number; right: number; bottom: number; left: number } }): void {
    this.elementDimensions.set(elementId, dimensions);
  }

  getElementDimensions(elementId: string): { width: number, height: number, padding: { top: number; right: number; bottom: number; left: number } } | undefined {
    return this.elementDimensions.get(elementId);
  }
} 