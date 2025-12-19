# Design Document

## Overview

The hover style inheritance system needs to be redesigned to properly implement CSS-like inheritance where hover styles only override explicitly defined properties while inheriting all others from the normal style. The current implementation has two major issues: it includes metadata properties in style merging and has unreliable fallback logic that should be eliminated.

## Architecture

### Current System Analysis

The current system has these components:
- `StyleRule` interface that includes both CSS properties and metadata (like `selector`)
- `applyElementMaterial()` method with two code paths: primary (with mergedStyle) and fallback
- Style storage in `dom.context.elementStyles` with separate `normal` and `hover` objects
- Style parsing in `style.service.ts` that stores complete StyleRule objects

### Proposed Architecture

1. **Single Code Path**: Remove all fallback logic and ensure `mergedStyle` is always provided
2. **Proper Inheritance**: Merge hover properties on top of normal properties, not replace them
3. **Error Handling**: Throw errors when required parameters are missing instead of falling back

## Components and Interfaces

### StyleRule Interface
The existing `StyleRule` interface will remain unchanged as it serves multiple purposes, but we'll handle the separation of CSS properties from metadata during merging.

### Element Service Changes

#### applyElementMaterial Method
```typescript
private applyElementMaterial(
  dom: BabylonDOM, 
  render: BabylonRender, 
  mesh: Mesh, 
  element: DOMElement, 
  isHovered: boolean, 
  mergedStyle: StyleRule  // Remove optional - always required
): void
```

Key changes:
- Remove optional parameter - `mergedStyle` must always be provided
- Remove fallback logic entirely
- Implement proper hover style inheritance with metadata exclusion

#### Style Merging Logic
```typescript
// Apply hover styles on top of merged style
if (isHovered) {
  const elementStyles = dom.context.elementStyles.get(element.id);
  if (elementStyles?.hover) {
    // Merge hover style properties on top of merged style
    // The selector property will be overwritten but that's fine since we're not using it for rendering
    activeStyle = { ...mergedStyle, ...elementStyles.hover };
  }
}
```

### Caller Responsibility

All callers of `applyElementMaterial` must ensure they provide a valid `mergedStyle`. The main callers are:
1. Initial element creation (line ~201)
2. Hover enter event handler (line ~1527)  
3. Hover exit event handler (line ~1642)

## Data Models

### Style Storage
The current storage model in `dom.context.elementStyles` will remain:
```typescript
Map<string, { normal: StyleRule, hover?: StyleRule }>
```

### Style Processing
Hover styles will be processed by:
1. Taking the complete `mergedStyle` (normal style + type defaults)
2. Merging hover style properties directly on top of the merged style
3. Using the result for material application (selector property will be overwritten but not used for rendering)

## Error Handling

### Missing mergedStyle Parameter
When `mergedStyle` is undefined:
```typescript
if (!mergedStyle) {
  throw new Error(`mergedStyle is required for element ${element.id || 'unknown'}`);
}
```

### Missing Element ID
Current behavior will be maintained:
```typescript
if (!element.id) return;
```

### Missing Element Styles
When hover styles are missing, simply use the merged style as-is (no error needed).

## Testing Strategy

### Unit Tests
1. **Style Inheritance Tests**
   - Test that hover styles inherit unspecified properties from normal styles
   - Test that hover styles override only specified properties
   - Test that selector property overwrite doesn't affect rendering

2. **Error Handling Tests**
   - Test that missing `mergedStyle` throws appropriate error
   - Test that system handles missing hover styles gracefully

3. **Integration Tests**
   - Test complete hover interaction flow
   - Test that borders persist during hover when not overridden
   - Test that multiple properties work correctly together

### Manual Testing
1. **Links Test Site**: Verify that borders appear correctly during hover states
2. **Complex Hover Scenarios**: Test elements with multiple style properties
3. **Edge Cases**: Test elements with only normal styles, only hover styles, etc.

## Implementation Plan

### Phase 1: Remove Fallback Logic
1. Remove the fallback `else` block in `applyElementMaterial`
2. Make `mergedStyle` parameter required (remove optional typing)
3. Add error throwing for missing `mergedStyle`

### Phase 2: Fix Style Inheritance
1. Update hover style merging to properly inherit from merged style
2. Ensure proper inheritance behavior

### Phase 3: Validation and Testing
1. Test with links site to verify border hover behavior
2. Run comprehensive tests on various hover scenarios
3. Verify no regressions in normal (non-hover) styling

## Design Decisions and Rationales

### Why Remove Fallback Logic?
- Fallbacks indicate system design flaws rather than robust error handling
- As a "rendering engine" it's more of a "visual calculator" than a website, and a calculator wouldn't have a fallback answer to a calculation
- Single code path is easier to maintain and debug
- Explicit errors help identify and fix root causes
- Consistent behavior across all scenarios

### Why Allow Selector Property Overwrite?
- The `selector` property is intrinsic to the style definition, not metadata
- It serves as the identifier/key for the style and is necessary for the current architecture
- During rendering, only the actual CSS properties are used, so selector overwrite is harmless
- Avoiding this would require a much larger architectural change to use selectors as keys

### Why Require mergedStyle?
- Ensures consistent style processing across all code paths
- Forces callers to properly prepare styles before application
- Eliminates uncertainty about which style data is being used
- Makes the system more predictable and testable