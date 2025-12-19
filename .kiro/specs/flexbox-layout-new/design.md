# Design Document for Flexbox Layout Implementation

## Overview

This document outlines the design approach for implementing a robust flexbox layout system in the BJSUI framework. The implementation will focus on addressing the coordinate system conversion issues, properly integrating the scale factor used throughout the application, and ensuring consistent behavior across different flex layout configurations.

## Architecture

The flexbox layout implementation will follow these architectural principles:

1. **Separation of Concerns**: Keep style parsing, layout calculation, and rendering separate
2. **Coordinate System Consistency**: Maintain clear transformations between CSS and BabylonJS coordinate systems
3. **Scale Factor Integration**: Use a consistent scale factor throughout the layout process
4. **Comprehensive Logging**: Provide detailed logging for debugging and troubleshooting

### System Components

The implementation will involve the following components:

1. **FlexService**: Core service responsible for flex layout calculations
2. **StyleService**: Service for parsing and normalizing style properties
3. **ElementService**: Service for creating and positioning DOM elements
4. **BabylonMeshService**: Service for creating and manipulating 3D meshes

## Components and Interfaces

### FlexService

The `FlexService` will be responsible for calculating flex layouts and positioning flex items:

```typescript
@Injectable({ providedIn: 'root' })
export class FlexService {
  // Check if an element is a flex container
  public isFlexContainer(render: BabylonRender, parentElement: DOMElement, styles: StyleRule[]): boolean;
  
  // Process flex children
  public processFlexChildren(dom: BabylonDOM, render: BabylonRender, children: DOMElement[], parent: Mesh, styles: StyleRule[], parentElement: DOMElement): void;
  
  // Calculate flex layout
  private calculateFlexLayout(dom: BabylonDOM, render: BabylonRender, children: DOMElement[], parent: Mesh, styles: StyleRule[], parentElement: DOMElement, parentStyle?: StyleRule, flexProps?: FlexProperties): FlexLayoutResult[];
  
  // Helper methods
  private getFlexDirection(style?: StyleRule): string;
  private getJustifyContent(style?: StyleRule): string;
  private getAlignItems(style?: StyleRule): string;
  private getAlignContent(render: BabylonRender, style?: StyleRule): string;
  private getFlexWrap(style?: StyleRule): string;
  private getAlignSelf(render: BabylonRender, style?: StyleRule, defaultAlign?: string): string;
  
  // Coordinate transformation helpers
  private cssToWorldCoordinates(x: number, y: number, parentWidth: number, parentHeight: number): { x: number, y: number };
  private worldToCssCoordinates(x: number, y: number, parentWidth: number, parentHeight: number): { x: number, y: number };
  
  // Layout algorithm methods
  private calculateFlexItemSizes(items: FlexItem[], availableSpace: number, isMainAxis: boolean): void;
  private applyFlexGrow(items: FlexItem[], remainingSpace: number): void;
  private applyFlexShrink(items: FlexItem[], overflow: number): void;
  private applyJustifyContent(items: FlexItem[], remainingSpace: number, justifyContent: string): void;
  private applyAlignItems(items: FlexItem[], lineCrossSize: number, alignItems: string): void;
  private applyAlignSelf(item: FlexItem, lineCrossSize: number, alignSelf: string): void;
  private applyAlignContent(lines: FlexLine[], containerCrossSize: number, alignContent: string, crossAxisGap: number): void;
  private sortItemsByOrder(items: FlexItem[]): FlexItem[];
  
  // Margin and gap methods
  private parseGapProperties(render: BabylonRender, style?: StyleRule): { rowGap: number; columnGap: number };
  private parseGapValue(render: BabylonRender, gapValue?: string): number;
  private parseMargins(render: BabylonRender, style?: StyleRule): { top: number; right: number; bottom: number; left: number };
  private parseMarginValue(render: BabylonRender, value?: string): number;
}
```

### Data Models

#### FlexProperties Interface

```typescript
interface FlexProperties {
  flexDirection: string;
  justifyContent: string;
  alignItems: string;
  alignContent: string;
  flexWrap: string;
}
```

#### FlexItem Interface

```typescript
interface FlexItem {
  element: DOMElement;
  style?: StyleRule;
  flexGrow: number;
  flexShrink: number;
  flexBasis: string | number;
  order: number;
  alignSelf: string;
  baseSize: number;
  flexedSize: number;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  position: {
    mainStart: number;
    mainEnd: number;
    crossStart: number;
    crossEnd: number;
  };
  lineIndex: number;
  originalIndex: number;
}
```

#### FlexLine Interface

```typescript
interface FlexLine {
  items: FlexItem[];
  mainSize: number;
  crossSize: number;
  position: number;
}
```

#### FlexLayoutResult Interface

```typescript
interface FlexLayoutResult {
  position: {
    x: number;
    y: number;
    z: number;
  };
  size: {
    width: number;
    height: number;
  };
}
```

## Algorithm Design

### 1. Coordinate System Transformation

The core of the implementation will be proper coordinate system transformation between CSS (origin at top-left) and BabylonJS (origin at center):

```typescript
private cssToWorldCoordinates(x: number, y: number, parentWidth: number, parentHeight: number): { x: number, y: number } {
  // CSS coordinates: (0,0) is top-left
  // BabylonJS coordinates: (0,0) is center, +X is right, +Y is up
  
  // Convert X: CSS left (0) -> BabylonJS left (-parentWidth/2)
  const worldX = x - (parentWidth / 2);
  
  // Convert Y: CSS top (0) -> BabylonJS top (parentHeight/2)
  // Also invert Y axis since CSS Y grows downward, BabylonJS Y grows upward
  const worldY = (parentHeight / 2) - y;
  
  // Use camera service's snapToPixelBoundary for pixel-perfect rendering
  return { x: worldX, y: worldY };
}

private worldToCssCoordinates(x: number, y: number, parentWidth: number, parentHeight: number): { x: number, y: number } {
  // BabylonJS coordinates: (0,0) is center, +X is right, +Y is up
  // CSS coordinates: (0,0) is top-left
  
  // Convert X: BabylonJS left (-parentWidth/2) -> CSS left (0)
  const cssX = x + (parentWidth / 2);
  
  // Convert Y: BabylonJS top (parentHeight/2) -> CSS top (0)
  // Also invert Y axis since BabylonJS Y grows upward, CSS Y grows downward
  const cssY = (parentHeight / 2) - y;
  
  return { x: cssX, y: cssY };
}
```

### 2. Scale Factor Integration

All dimension calculations will use the scale factor from the camera service:

```typescript
private parsePixelValue(render: BabylonRender, value: string): number {
  if (!value) return 0;
  
  // Extract numeric value
  const numericValue = parseFloat(value.replace('px', ''));
  if (isNaN(numericValue)) return 0;
  
  // Apply scale factor
  const scaleFactor = render.actions.camera.getPixelToWorldScale();
  return numericValue * scaleFactor;
}
```

### 3. Flex Layout Algorithm

The flex layout algorithm will follow these steps:

1. Parse flex container properties
2. Sort items by order property
3. Calculate flex item sizes based on flex-basis, flex-grow, and flex-shrink
4. Organize items into lines based on flex-wrap
5. Calculate line positions based on align-content
6. Calculate item positions within each line based on justify-content and align-items/align-self
7. Transform positions to BabylonJS coordinate system

```typescript
private calculateFlexLayout(dom: BabylonDOM, render: BabylonRender, children: DOMElement[], parent: Mesh, styles: StyleRule[], parentElement: DOMElement, parentStyle?: StyleRule, flexProps?: FlexProperties): FlexLayoutResult[] {
  // 1. Get parent dimensions
  const parentId = parentElement?.id || parent.name.replace('-body', '');
  const parentDimensions = dom.context.elementDimensions.get(parentId) || {
    width: 20, height: 10, padding: { top: 0, right: 0, bottom: 0, left: 0 }
  };
  
  // 2. Parse flex properties
  const isRow = flexProps.flexDirection === 'row' || flexProps.flexDirection === 'row-reverse';
  const isReverse = flexProps.flexDirection.includes('reverse');
  const canWrap = flexProps.flexWrap === 'wrap' || flexProps.flexWrap === 'wrap-reverse';
  const isWrapReverse = flexProps.flexWrap === 'wrap-reverse';
  
  // 3. Parse gap properties
  const { rowGap, columnGap } = this.parseGapProperties(render, parentStyle);
  const mainAxisGap = isRow ? columnGap : rowGap;
  const crossAxisGap = isRow ? rowGap : columnGap;
  
  // 4. Create flex items with properties
  const flexItems = children.map((child, index) => this.createFlexItem(dom, render, child, index, styles, parentDimensions, isRow));
  
  // 5. Sort items by order property
  const sortedItems = this.sortItemsByOrder(flexItems);
  
  // 6. Organize items into lines
  const lines = this.organizeItemsIntoLines(sortedItems, parentDimensions, isRow, canWrap, mainAxisGap);
  
  // 7. Apply flex-grow and flex-shrink to items in each line
  lines.forEach(line => {
    const availableMainSpace = isRow ? parentDimensions.width : parentDimensions.height;
    this.calculateFlexItemSizes(line.items, availableMainSpace, true);
  });
  
  // 8. Calculate line positions based on align-content
  const containerCrossSize = isRow ? parentDimensions.height : parentDimensions.width;
  this.applyAlignContent(lines, containerCrossSize, flexProps.alignContent, crossAxisGap);
  
  // 9. Calculate item positions within each line
  lines.forEach(line => {
    // Apply justify-content for main axis positioning
    this.applyJustifyContent(line.items, line.mainSize, flexProps.justifyContent);
    
    // Apply align-items/align-self for cross axis positioning
    line.items.forEach(item => {
      const alignSelf = this.getAlignSelf(render, item.style, flexProps.alignItems);
      this.applyAlignSelf(item, line.crossSize, alignSelf);
    });
  });
  
  // 10. Transform positions to BabylonJS coordinate system and create layout results
  const layout: FlexLayoutResult[] = [];
  
  // Flatten items from all lines
  const allItems = lines.flatMap(line => line.items);
  
  // Sort back to original order for consistent result ordering
  const orderedItems = [...allItems].sort((a, b) => a.originalIndex - b.originalIndex);
  
  // Create layout results
  orderedItems.forEach(item => {
    const line = lines[item.lineIndex];
    
    // Calculate final position in CSS coordinates
    let cssX, cssY;
    
    if (isRow) {
      cssX = item.position.mainStart;
      cssY = line.position + item.position.crossStart;
    } else {
      cssX = line.position + item.position.crossStart;
      cssY = item.position.mainStart;
    }
    
    // Apply flex-direction-reverse if needed
    if (isReverse) {
      if (isRow) {
        cssX = parentDimensions.width - cssX - (item.flexedSize);
      } else {
        cssY = parentDimensions.height - cssY - (item.flexedSize);
      }
    }
    
    // Apply flex-wrap-reverse if needed
    if (isWrapReverse) {
      if (isRow) {
        cssY = parentDimensions.height - cssY - (line.crossSize);
      } else {
        cssX = parentDimensions.width - cssX - (line.crossSize);
      }
    }
    
    // Transform to BabylonJS coordinates
    const worldCoords = this.cssToWorldCoordinates(cssX, cssY, parentDimensions.width, parentDimensions.height);
    
    // Use camera service's snapToPixelBoundary for pixel-perfect rendering
    const snappedCoords = render.actions.camera.snapToPixelBoundary({ 
      x: worldCoords.x, 
      y: worldCoords.y 
    });
    
    // Create layout result
    layout.push({
      position: {
        x: worldCoords.x,
        y: worldCoords.y,
        z: 0.01 + (layout.length * 0.01) // Z-stacking
      },
      size: {
        width: isRow ? item.flexedSize : line.crossSize,
        height: isRow ? line.crossSize : item.flexedSize
      }
    });
  });
  
  return layout;
}
```

### 4. Margin and Gap Handling

Margins and gaps will be properly scaled and applied:

```typescript
private parseGapProperties(render: BabylonRender, style?: StyleRule): { rowGap: number; columnGap: number } {
  let rowGap = 0;
  let columnGap = 0;
  
  if (!style) return { rowGap, columnGap };
  
  // Parse row-gap
  if (style.rowGap) {
    rowGap = this.parseGapValue(render, style.rowGap);
  }
  
  // Parse column-gap
  if (style.columnGap) {
    columnGap = this.parseGapValue(render, style.columnGap);
  }
  
  // Parse shorthand gap property
  if (style.gap) {
    const gaps = style.gap.trim().split(/\s+/);
    
    if (gaps.length === 1) {
      // Single value applies to both
      const gap = this.parseGapValue(render, gaps[0]);
      rowGap = gap;
      columnGap = gap;
    } else if (gaps.length === 2) {
      // Two values: row-gap column-gap
      rowGap = this.parseGapValue(render, gaps[0]);
      columnGap = this.parseGapValue(render, gaps[1]);
    }
  }
  
  return { rowGap, columnGap };
}

private parseGapValue(render: BabylonRender, gapValue?: string): number {
  if (!gapValue) return 0;
  
  // Extract numeric value
  const numericValue = parseFloat(gapValue.replace('px', ''));
  if (isNaN(numericValue)) return 0;
  
  // Apply scale factor
  const scaleFactor = render.actions.camera.getPixelToWorldScale();
  return numericValue * scaleFactor;
}
```

### 5. Align Content Algorithm

The align-content algorithm will properly position lines in the cross axis:

```typescript
private applyAlignContent(lines: FlexLine[], containerCrossSize: number, alignContent: string, crossAxisGap: number): void {
  if (lines.length <= 1) {
    // Single line - center it
    lines[0].position = (containerCrossSize - lines[0].crossSize) / 2;
    return;
  }
  
  // Calculate total cross size of all lines
  const totalCrossSize = lines.reduce((sum, line) => sum + line.crossSize, 0);
  
  // Calculate total gap size
  const totalGapSize = (lines.length - 1) * crossAxisGap;
  
  // Calculate remaining space
  const remainingSpace = containerCrossSize - totalCrossSize - totalGapSize;
  
  // Apply align-content
  let position = 0;
  
  switch (alignContent) {
    case 'flex-start':
      // Lines packed at the start
      lines.forEach(line => {
        line.position = position;
        position += line.crossSize + crossAxisGap;
      });
      break;
      
    case 'flex-end':
      // Lines packed at the end
      position = remainingSpace;
      lines.forEach(line => {
        line.position = position;
        position += line.crossSize + crossAxisGap;
      });
      break;
      
    case 'center':
      // Lines centered
      position = remainingSpace / 2;
      lines.forEach(line => {
        line.position = position;
        position += line.crossSize + crossAxisGap;
      });
      break;
      
    case 'space-between':
      // Space between lines
      if (lines.length > 1) {
        const spaceBetween = remainingSpace / (lines.length - 1);
        lines.forEach((line, index) => {
          line.position = position;
          position += line.crossSize + crossAxisGap + (index < lines.length - 1 ? spaceBetween : 0);
        });
      } else {
        lines[0].position = remainingSpace / 2;
      }
      break;
      
    case 'space-around':
      // Space around lines
      const spaceAround = remainingSpace / (lines.length * 2);
      position = spaceAround;
      lines.forEach(line => {
        line.position = position;
        position += line.crossSize + crossAxisGap + (spaceAround * 2);
      });
      break;
      
    case 'space-evenly':
      // Space evenly between and around lines
      const spaceEvenly = remainingSpace / (lines.length + 1);
      position = spaceEvenly;
      lines.forEach(line => {
        line.position = position;
        position += line.crossSize + crossAxisGap + spaceEvenly;
      });
      break;
      
    case 'stretch':
    default:
      // Stretch lines to fill container
      if (lines.length > 0 && remainingSpace > 0) {
        const stretchPerLine = remainingSpace / lines.length;
        lines.forEach((line, index) => {
          // Increase line cross size
          line.crossSize += stretchPerLine;
          // Position line
          line.position = position;
          position += line.crossSize + crossAxisGap;
        });
      } else {
        // No space to stretch, just position normally
        lines.forEach(line => {
          line.position = position;
          position += line.crossSize + crossAxisGap;
        });
      }
      break;
  }
}
```

## Error Handling

The implementation will include robust error handling:

1. **Input Validation**: Validate all input parameters and provide meaningful error messages
2. **Default Values**: Use sensible defaults for missing or invalid properties
3. **Boundary Checks**: Ensure calculations don't result in invalid positions or sizes
4. **Exception Handling**: Catch and log exceptions with context information
5. **Fallback Behavior**: Provide fallback layouts when calculations fail

## Testing Strategy

The implementation will be tested using the following approach:

1. **Unit Tests**:
   - Test coordinate transformation functions
   - Test flex layout algorithms with various input combinations
   - Test edge cases and error handling

2. **Visual Tests**:
   - Create test scenes with different flex layouts
   - Test all flex-direction and flex-wrap combinations
   - Test align-content with multiple lines
   - Test justify-content with different space distributions
   - Test align-items and align-self with different alignments

3. **Performance Tests**:
   - Measure layout calculation time with varying numbers of flex items
   - Identify and optimize performance bottlenecks

## Integration Plan

The implementation will be integrated with the existing system in the following phases:

1. **Phase 1: Core Implementation**
   - Implement coordinate transformation functions
   - Implement scale factor integration
   - Implement flex layout algorithm

2. **Phase 2: Testing and Validation**
   - Create test scenes for all flex properties
   - Validate layout calculations
   - Fix any issues discovered during testing

3. **Phase 3: Integration with Existing System**
   - Replace the existing flex layout implementation
   - Ensure backward compatibility
   - Update documentation