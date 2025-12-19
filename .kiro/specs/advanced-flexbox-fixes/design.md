# Design Document for Advanced Flexbox Fixes

## Overview

This design document outlines the approach for fixing the identified issues in the advanced flexbox implementation of the ASTYLARUI system. Based on testing results, several key flexbox features are not working as expected, including align-content, flex-shrink, align-self, and order. The fixes will focus on correcting the implementation of these features to ensure they match standard CSS flexbox behavior.

## Architecture

The current flexbox implementation is split across several services:

1. **FlexService**: Handles the main flexbox container and item layout logic
2. **FlexLayoutService**: Implements advanced flexbox algorithms like align-content, flex-grow/shrink, align-self, and order
3. **StyleService**: Parses and normalizes flexbox-related CSS properties
4. **ElementService**: Applies the calculated layout to the 3D meshes

The fixes will primarily target the FlexLayoutService and FlexService, as these are responsible for the core layout algorithms that are showing issues.

## Components and Interfaces

### FlexLayoutService

This service contains the core algorithms for advanced flexbox features. The following methods need fixes:

1. **applyAlignContent**: Fix the implementation to ensure proper spacing between wrapped lines
   - alignContentSpaceBetween: Ensure first line is at the start and last line at the end with space between
   - alignContentCenter: Ensure lines are centered vertically in the container

2. **applyFlexShrink**: Fix the implementation to ensure items shrink proportionally
   - Ensure flex-shrink: 0 items don't shrink
   - Ensure items with higher flex-shrink values shrink more than those with lower values

3. **applyAlignSelf**: Fix the implementation to ensure individual item alignment works
   - alignSelfFlexStart: Ensure items align to the start of the cross axis
   - alignSelfFlexEnd: Ensure items align to the end of the cross axis
   - alignSelfCenter: Ensure items align to the center of the cross axis
   - alignSelfStretch: Ensure items stretch to fill the container height

4. **sortItemsByOrder**: Fix the implementation to ensure items are ordered correctly
   - Ensure stable sorting to maintain source order for items with the same order value
   - Ensure items are sorted in ascending order of their order values

### FlexService

This service orchestrates the flexbox layout process. The following methods need fixes:

1. **positionItemsInLine**: Fix the implementation to ensure align-self is applied correctly
   - Update to properly handle align-self overrides for individual items

2. **createFlexLines**: Fix the implementation to ensure proper wrapping
   - Ensure items wrap correctly based on their size and the container width
   - Ensure wrapped lines have proper spacing based on align-content

## Data Models

No changes to the data models are required. The existing interfaces are sufficient:

```typescript
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
```

## Error Handling

The fixes will include improved error handling and logging:

1. Add detailed logging for align-content calculations to help debug spacing issues
2. Add logging for flex-shrink calculations to verify proportional shrinking
3. Add logging for align-self calculations to verify individual item alignment
4. Add logging for order calculations to verify item ordering

## Testing Strategy

The testing strategy will focus on the flexbox-advanced test page, which already includes test cases for all the features that need fixing:

1. **Align-Content Tests**:
   - Test align-content: space-between with multiple wrapped lines
   - Test align-content: center with multiple wrapped lines

2. **Flex-Shrink Tests**:
   - Modify the test to ensure the container is too small for all items
   - Test with items having different flex-shrink values (1, 2, 0)

3. **Align-Self Tests**:
   - Test align-self: flex-start, center, flex-end, and stretch
   - Verify each item has the correct alignment

4. **Order Tests**:
   - Test with items having different order values (3, 1, 4, 2)
   - Verify items appear in the correct order

5. **Complex Combination Tests**:
   - Test with multiple flexbox features combined
   - Verify all features work correctly together

## Implementation Approach

The implementation will follow these steps:

1. **Analyze Current Implementation**:
   - Review the current code in FlexLayoutService and FlexService
   - Identify specific issues in each algorithm

2. **Fix Align-Content Implementation**:
   - Update alignContentSpaceBetween and alignContentCenter methods
   - Add detailed logging to verify calculations

3. **Fix Flex-Shrink Implementation**:
   - Update applyFlexShrink method to ensure proportional shrinking
   - Modify the test case to ensure shrinking is triggered

4. **Fix Align-Self Implementation**:
   - Update applyAlignSelf method and its helper methods
   - Ensure proper integration with FlexService

5. **Fix Order Implementation**:
   - Update sortItemsByOrder method to ensure correct ordering
   - Verify integration with FlexService

6. **Test and Verify**:
   - Test all fixes with the flexbox-advanced test page
   - Verify each feature works as expected

## Diagrams

### Align-Content Space-Between

```
┌────────────────────────────┐
│ ┌───┐ ┌───┐ ┌───┐         │
│ │   │ │   │ │   │         │
│ └───┘ └───┘ └───┘         │
│                            │
│                            │
│ ┌───┐ ┌───┐               │
│ │   │ │   │               │
│ └───┘ └───┘               │
└────────────────────────────┘
```

### Align-Content Center

```
┌────────────────────────────┐
│                            │
│                            │
│ ┌───┐ ┌───┐ ┌───┐         │
│ │   │ │   │ │   │         │
│ └───┘ └───┘ └───┘         │
│                            │
│                            │
└────────────────────────────┘
```

### Flex-Shrink

```
┌────────────────────────────┐
│ ┌────────┐┌─────┐┌────────┐│
│ │        ││     ││        ││
│ │ shrink:1││shrink:2││shrink:0││
│ │        ││     ││        ││
│ └────────┘└─────┘└────────┘│
└────────────────────────────┘
```

### Align-Self

```
┌────────────────────────────┐
│ ┌───┐                 ┌───┐│
│ │   │     ┌───┐       │   ││
│ │   │     │   │       │   ││
│ │   │     │   │ ┌───┐ │   ││
│ │   │     └───┘ │   │ │   ││
│ │flex-start│  │center│  │flex-end│  │stretch││
│ └───┘           └───┘ └───┘│
└────────────────────────────┘
```

### Order

```
┌────────────────────────────┐
│ ┌───┐ ┌───┐ ┌───┐ ┌───┐   │
│ │   │ │   │ │   │ │   │   │
│ │ 2 │ │ 4 │ │ 1 │ │ 3 │   │
│ │   │ │   │ │   │ │   │   │
│ └───┘ └───┘ └───┘ └───┘   │
└────────────────────────────┘
```