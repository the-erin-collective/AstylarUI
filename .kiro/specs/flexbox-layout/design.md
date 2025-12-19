# Design Document for Advanced Flexbox Layout Features

## Overview

This document outlines the design approach for implementing the remaining advanced flexbox layout features in the BJSUI system. The implementation will build upon the existing flexbox functionality to provide a complete set of flexbox capabilities that match standard CSS behavior. The advanced features include align-content for multi-line flex containers, flex item growth and shrinking (flex-grow, flex-shrink, flex-basis), individual item alignment override (align-self), and visual ordering of flex items (order).

## Architecture

The advanced flexbox features will be implemented as extensions to the existing layout system. The implementation will follow these architectural principles:

1. **Separation of Concerns**: Keep style parsing, layout calculation, and rendering separate
2. **Progressive Enhancement**: Build on top of existing flexbox functionality
3. **Standard Compliance**: Match CSS flexbox behavior as closely as possible
4. **Performance Optimization**: Minimize recalculations and optimize for 3D rendering

### System Components

The implementation will involve updates to the following components:

1. **Style Service**: Enhanced to parse and normalize the new flexbox properties
2. **Layout Service**: Extended to handle the advanced layout calculations
3. **Element Service**: Updated to apply the calculated layout to DOM elements
4. **DOM Service**: Modified to coordinate the layout process with the new features

## Components and Interfaces

### Style Service Enhancements

The `StyleService` will be extended to parse and normalize the new flexbox properties:

```typescript
// Additions to StyleService
interface FlexItemProperties {
  flexGrow: number;
  flexShrink: number;
  flexBasis: string;
  alignSelf: string;
  order: number;
}

interface FlexContainerProperties extends ExistingFlexProperties {
  alignContent: string;
}

// New parsing methods
parseFlexGrow(value: string): number;
parseFlexShrink(value: string): number;
parseFlexBasis(value: string): string;
parseAlignSelf(value: string): string;
parseOrder(value: string): number;
parseAlignContent(value: string): string;
parseFlexShorthand(value: string): FlexItemProperties;
```

### Layout Service Enhancements

The layout service will be extended with new methods to handle the advanced flexbox calculations:

```typescript
// Additions to LayoutService
interface FlexLine {
  items: FlexItem[];
  crossSize: number;
  mainSize: number;
}

interface FlexLayoutContext {
  container: DOMElement;
  lines: FlexLine[];
  crossAxis: 'vertical' | 'horizontal';
  mainAxis: 'vertical' | 'horizontal';
  isReverse: boolean;
  isWrap: boolean;
  availableMainSize: number;
  availableCrossSize: number;
}

// New methods
calculateFlexItemSizes(items: FlexItem[], availableSpace: number): void;
applyFlexGrow(items: FlexItem[], remainingSpace: number): void;
applyFlexShrink(items: FlexItem[], overflow: number): void;
applyAlignContent(context: FlexLayoutContext): void;
applyAlignSelf(item: FlexItem, context: FlexLayoutContext): void;
sortItemsByOrder(items: FlexItem[]): FlexItem[];
```

### Element Service Updates

The element service will be updated to apply the calculated layout to DOM elements:

```typescript
// Updates to ElementService
interface ElementDimensions extends ExistingDimensions {
  flexGrow: number;
  flexShrink: number;
  flexBasis: number | string;
  alignSelf: string;
  order: number;
}

// Updated methods
calculateDimensions(element: DOMElement, parentDimensions: ParentDimensions): ElementDimensions;
applyFlexItemLayout(element: DOMElement, layout: FlexItemLayout): void;
```

## Data Models

### FlexContainer Model

```typescript
interface FlexContainer {
  element: DOMElement;
  style: {
    display: 'flex';
    flexDirection: 'row' | 'row-reverse' | 'column' | 'column-reverse';
    flexWrap: 'nowrap' | 'wrap' | 'wrap-reverse';
    justifyContent: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
    alignItems: 'flex-start' | 'flex-end' | 'center' | 'baseline' | 'stretch';
    alignContent: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly' | 'stretch';
    gap?: string;
    rowGap?: string;
    columnGap?: string;
  };
  children: FlexItem[];
  dimensions: {
    width: number;
    height: number;
    padding: Spacing;
    border: Spacing;
    margin: Spacing;
  };
}
```

### FlexItem Model

```typescript
interface FlexItem {
  element: DOMElement;
  style: {
    flexGrow: number;
    flexShrink: number;
    flexBasis: string | number;
    alignSelf: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'baseline' | 'stretch';
    order: number;
  };
  computedStyle: {
    width: number;
    height: number;
    mainSize: number;
    crossSize: number;
    margin: Spacing;
    padding: Spacing;
    border: Spacing;
  };
  flexLayout: {
    mainStart: number;
    mainEnd: number;
    crossStart: number;
    crossEnd: number;
    lineIndex: number;
  };
}
```

## Algorithm Design

### 1. Align Content Algorithm

The align-content property determines how lines are distributed within a multi-line flex container:

1. Calculate the total cross size of all flex lines
2. Determine the remaining cross space in the container
3. Based on the align-content value:
   - `flex-start`: Position lines at the start of the cross axis
   - `flex-end`: Position lines at the end of the cross axis
   - `center`: Position lines in the center of the cross axis
   - `space-between`: Distribute space evenly between lines
   - `space-around`: Distribute space evenly around lines
   - `space-evenly`: Distribute space evenly between and around lines
   - `stretch`: Increase the cross size of each line to fill the container

```typescript
function applyAlignContent(context: FlexLayoutContext): void {
  // Skip if not wrapping or only one line
  if (!context.isWrap || context.lines.length <= 1) {
    return;
  }
  
  const { container, lines, crossAxis, availableCrossSize } = context;
  const alignContent = container.style.alignContent || 'stretch';
  
  // Calculate total cross size and remaining space
  const totalCrossSize = lines.reduce((sum, line) => sum + line.crossSize, 0);
  const remainingSpace = Math.max(0, availableCrossSize - totalCrossSize);
  
  let crossPosition = 0;
  
  switch (alignContent) {
    case 'flex-start':
      // Lines packed at the start
      lines.forEach(line => {
        positionLine(line, crossPosition);
        crossPosition += line.crossSize;
      });
      break;
      
    case 'flex-end':
      // Lines packed at the end
      crossPosition = remainingSpace;
      lines.forEach(line => {
        positionLine(line, crossPosition);
        crossPosition += line.crossSize;
      });
      break;
      
    case 'center':
      // Lines centered
      crossPosition = remainingSpace / 2;
      lines.forEach(line => {
        positionLine(line, crossPosition);
        crossPosition += line.crossSize;
      });
      break;
      
    case 'space-between':
      // Space between lines
      const spaceBetween = lines.length > 1 ? remainingSpace / (lines.length - 1) : 0;
      lines.forEach((line, index) => {
        positionLine(line, crossPosition);
        crossPosition += line.crossSize + (index < lines.length - 1 ? spaceBetween : 0);
      });
      break;
      
    case 'space-around':
      // Space around lines
      const spaceAround = remainingSpace / (lines.length * 2);
      crossPosition = spaceAround;
      lines.forEach(line => {
        positionLine(line, crossPosition);
        crossPosition += line.crossSize + (spaceAround * 2);
      });
      break;
      
    case 'space-evenly':
      // Space evenly between and around lines
      const spaceEvenly = remainingSpace / (lines.length + 1);
      crossPosition = spaceEvenly;
      lines.forEach(line => {
        positionLine(line, crossPosition);
        crossPosition += line.crossSize + spaceEvenly;
      });
      break;
      
    case 'stretch':
    default:
      // Stretch lines to fill container
      const stretchFactor = lines.length > 0 ? availableCrossSize / totalCrossSize : 1;
      lines.forEach(line => {
        // Stretch the line's cross size
        const stretchedCrossSize = line.crossSize * stretchFactor;
        stretchLine(line, crossPosition, stretchedCrossSize);
        crossPosition += stretchedCrossSize;
      });
      break;
  }
}
```

### 2. Flex Item Growth and Shrinking Algorithm

The flex-grow, flex-shrink, and flex-basis properties determine how flex items are sized:

1. Calculate the initial main size of each item based on flex-basis
2. Determine if there is remaining space or overflow
3. If there is remaining space, distribute it according to flex-grow factors
4. If there is overflow, reduce sizes according to flex-shrink factors

```typescript
function calculateFlexItemSizes(items: FlexItem[], availableSpace: number): void {
  // Calculate initial sizes based on flex-basis
  let totalSize = 0;
  
  items.forEach(item => {
    const basis = parseBasis(item.style.flexBasis);
    item.computedStyle.mainSize = basis;
    totalSize += basis;
  });
  
  const remainingSpace = availableSpace - totalSize;
  
  if (remainingSpace > 0) {
    // Distribute remaining space according to flex-grow
    applyFlexGrow(items, remainingSpace);
  } else if (remainingSpace < 0) {
    // Reduce sizes according to flex-shrink
    applyFlexShrink(items, -remainingSpace);
  }
}

function applyFlexGrow(items: FlexItem[], remainingSpace: number): void {
  // Calculate total flex-grow factor
  const totalGrow = items.reduce((sum, item) => sum + (item.style.flexGrow || 0), 0);
  
  if (totalGrow === 0) return;
  
  // Distribute space proportionally
  items.forEach(item => {
    const flexGrow = item.style.flexGrow || 0;
    if (flexGrow > 0) {
      const addition = (flexGrow / totalGrow) * remainingSpace;
      item.computedStyle.mainSize += addition;
    }
  });
}

function applyFlexShrink(items: FlexItem[], overflow: number): void {
  // Calculate weighted flex-shrink factors
  let totalShrinkWeight = 0;
  
  items.forEach(item => {
    const flexShrink = item.style.flexShrink || 1;
    const basis = item.computedStyle.mainSize;
    totalShrinkWeight += flexShrink * basis;
  });
  
  if (totalShrinkWeight === 0) return;
  
  // Reduce sizes proportionally
  items.forEach(item => {
    const flexShrink = item.style.flexShrink || 1;
    const basis = item.computedStyle.mainSize;
    const weight = flexShrink * basis;
    
    if (weight > 0) {
      const reduction = (weight / totalShrinkWeight) * overflow;
      item.computedStyle.mainSize = Math.max(0, basis - reduction);
    }
  });
}
```

### 3. Align Self Algorithm

The align-self property overrides the container's align-items for individual items:

```typescript
function applyAlignSelf(item: FlexItem, context: FlexLayoutContext): void {
  const { container, crossAxis } = context;
  const containerAlignItems = container.style.alignItems || 'stretch';
  const alignSelf = item.style.alignSelf || 'auto';
  
  // If auto, use the container's align-items
  const effectiveAlign = alignSelf === 'auto' ? containerAlignItems : alignSelf;
  
  const lineCrossSize = context.lines[item.flexLayout.lineIndex].crossSize;
  const itemCrossSize = item.computedStyle.crossSize;
  
  switch (effectiveAlign) {
    case 'flex-start':
      item.flexLayout.crossStart = 0;
      break;
      
    case 'flex-end':
      item.flexLayout.crossStart = lineCrossSize - itemCrossSize;
      break;
      
    case 'center':
      item.flexLayout.crossStart = (lineCrossSize - itemCrossSize) / 2;
      break;
      
    case 'baseline':
      // Simplified baseline alignment (would need text metrics for proper implementation)
      item.flexLayout.crossStart = 0;
      break;
      
    case 'stretch':
    default:
      item.flexLayout.crossStart = 0;
      // Only stretch if no cross size is specified
      if (!item.element.style.height && crossAxis === 'vertical' ||
          !item.element.style.width && crossAxis === 'horizontal') {
        item.computedStyle.crossSize = lineCrossSize;
      }
      break;
  }
  
  item.flexLayout.crossEnd = item.flexLayout.crossStart + item.computedStyle.crossSize;
}
```

### 4. Order Algorithm

The order property determines the visual order of flex items:

```typescript
function sortItemsByOrder(items: FlexItem[]): FlexItem[] {
  return [...items].sort((a, b) => {
    const orderA = a.style.order || 0;
    const orderB = b.style.order || 0;
    
    // If orders are equal, maintain source order
    if (orderA === orderB) {
      return items.indexOf(a) - items.indexOf(b);
    }
    
    return orderA - orderB;
  });
}
```

## Error Handling

The implementation will include robust error handling for the following scenarios:

1. **Invalid Property Values**: Gracefully handle invalid values for flex properties
   - Invalid flex-grow/shrink: Default to 0 for flex-grow, 1 for flex-shrink
   - Invalid flex-basis: Default to 'auto'
   - Invalid align-self: Default to 'auto'
   - Invalid order: Default to 0
   - Invalid align-content: Default to 'stretch'

2. **Edge Cases**:
   - Zero-sized containers: Prevent division by zero in calculations
   - Negative flex values: Clamp flex-grow and flex-shrink to non-negative values
   - Extremely large order values: Handle potential integer overflow

3. **Performance Safeguards**:
   - Limit maximum number of flex items to prevent performance issues
   - Implement caching for layout calculations to avoid redundant work

## Testing Strategy

The implementation will be tested using the following approach:

1. **Unit Tests**:
   - Test parsing of new flexbox properties
   - Test flex layout algorithms with various input combinations
   - Test edge cases and error handling

2. **Visual Tests**:
   - Create test scenes with different flex layouts
   - Compare rendered output with expected results
   - Test responsive behavior by resizing containers

3. **Performance Tests**:
   - Measure layout calculation time with varying numbers of flex items
   - Identify and optimize performance bottlenecks

## Integration Plan

The implementation will be integrated with the existing system in the following phases:

1. **Phase 1: Style Parsing**
   - Add parsing for new flexbox properties
   - Update style normalization

2. **Phase 2: Layout Algorithms**
   - Implement align-content algorithm
   - Implement flex-grow/shrink/basis algorithms
   - Implement align-self algorithm
   - Implement order algorithm

3. **Phase 3: Integration**
   - Connect new algorithms to existing layout system
   - Update element positioning logic

4. **Phase 4: Testing and Optimization**
   - Run comprehensive tests
   - Optimize performance
   - Fix any issues discovered during testing