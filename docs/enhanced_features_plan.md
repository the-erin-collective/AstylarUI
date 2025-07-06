# Enhanced Features Plan for BJSUI

## Overview
This plan outlines the strategic development of DOM elements and styling capabilities, building from simple to complex features. The goal is to create a comprehensive HTML/CSS-like system in 3D space using BabylonJS, avoiding the standard BabylonJS GUI package due to its limitations for our use case.

## Current State
- ✅ Basic `div` elements with positioning (top, left, width, height)
- ✅ Background color styling
- ✅ Hover states with material switching
- ✅ Parent-child element relationships
- ✅ Clean service architecture (Camera, Mesh, DOM services)

## Development Phases

### Phase 1: Core Styling Enhancements (Simple)
**Estimated Complexity: Low**

1. **Border Support**
   - `border-width`, `border-color`, `border-style` (solid initially)
   - Implementation: Create outline meshes around existing element meshes
   - Refactor: Abstract border creation into reusable service method

2. **Padding & Margin**
   - `padding` (all sides, individual sides)
   - `margin` (spacing between elements)
   - Implementation: Adjust positioning calculations in `calculateDimensions`

3. **Opacity/Transparency**
   - `opacity` property (0.0 to 1.0)
   - Implementation: Modify material alpha channel in mesh service

4. **Z-Index/Layering**
   - `z-index` for element stacking order
   - Implementation: Adjust Z positioning in `positionMesh`

### Phase 2: Advanced Styling (Medium)

5. **Border Radius**
   - `border-radius` for rounded corners
   - Implementation: Custom mesh generation with curved edges
   - Challenge: Non-rectangular collision detection for hover events

6. **Box Shadow**
   - `box-shadow` with offset, blur, color
   - Implementation: Additional shadow mesh behind main element
   - Performance consideration: Optional feature toggle

7. **Gradient Backgrounds**
   - `background: linear-gradient()`, `background: radial-gradient()`
   - Implementation: Custom shader materials or texture generation
   - Fallback: Multi-segment meshes with color interpolation

8. **Transform Properties**
   - `transform: rotate()`, `transform: scale()`, `transform: translate()`
   - Implementation: Modify mesh transformation matrices
   - Coordinate system: Maintain parent-relative positioning

### Phase 3: Element Type Expansion (Medium)

9. **Generic Container Elements**
   - Refactor current `div` logic into generic container system
   - Support: `section`, `article`, `header`, `footer`, `nav`, `main`
   - Implementation: Single container class with different default styles

10. **List Elements**
    - `ul`, `ol`, `li` with automatic positioning
    - Implementation: Automatic vertical stacking logic for list items
    - Visual: We can use blank rectangles as placeholders until text rendering is available
    - Styling: `list-style-type` for bullet points/numbers (simple shapes)

11. **Image Elements**
    - `img` elements as textured planes
    - Implementation: Texture loading and application to mesh
    - Fallback: Colored rectangle with "IMG" indicator
    - Properties: `src`, `width`, `height`

12. **Link Elements**
    - `a` (anchor) elements as clickable containers (button-like for now)
    - Implementation: Styled containers with click events for navigation/callbacks
    - Visual: Similar to button styling until text rendering is available
    - Properties: `href` (stored as data), `target`, link states (visited, active)
    - Interaction: Click events, hover states for visual feedback
    - Note: Text content will be added in Phase 5 with text rendering system

### Phase 4: Layout Systems (High)

13. **Flexbox Layout**
    - `display: flex`, `flex-direction`, `justify-content`, `align-items`
    - Implementation: Custom layout calculation engine
    - Priority: Start with simple row/column layouts

14. **CSS Grid (Subset)**
    - `display: grid`, `grid-template-columns`, `grid-template-rows`
    - Implementation: Grid-based positioning system
    - Scope: Basic grid layouts only, not full CSS Grid spec

15. **Positioning Modes**
    - `position: absolute`, `position: relative`, `position: fixed`
    - Implementation: Different coordinate calculation strategies
    - Current: All elements are effectively `position: relative`

### Phase 5: Text Rendering System (Very High)

16. **Custom Text Rendering Engine**
    - **Option A: 3D Font Data Approach**
      - Use existing JSON font shape data
      - Create 3D meshes for each character
      - Benefits: True 3D text, consistent with world rendering
      - Limitations: Single font family, larger memory footprint
    
    - **Option B: Custom GUI Manager (Recommended)**
      - Create texture-based text rendering system
      - Generate text as textures, apply to planes
      - Support for browser fonts via HTML5 Canvas
      - Custom event handling to match BabylonJS mesh events
      - Benefits: All browser fonts available, better performance
      - Implementation: Canvas → Texture → Material → Mesh pipeline

17. **Text Properties**
    - `font-family`, `font-size`, `font-weight`, `color`
    - `text-align`, `line-height`, `text-decoration`
    - Implementation depends on chosen text rendering approach

18. **Advanced Text Features**
    - `text-shadow`, `text-overflow: ellipsis`
    - Multi-line text with word wrapping
    - Rich text support (bold, italic within text)

### Phase 6: Interactive Elements (Very High)

19. **Functional Input Elements**
    - Actual text input with cursor positioning
    - Button click events with custom callbacks
    - Form submission simulation

20. **Scroll Areas**
    - `overflow: scroll` with scrollbar representation
    - Mouse wheel and drag scrolling
    - Virtual scrolling for performance

## Implementation Strategy

### Refactoring Priorities
1. **Abstract Element Creation**: Make `createElement` generic for all element types
2. **Style Parser Enhancement**: Extend style parsing to handle new CSS properties
3. **Material System**: Create material factory for different visual effects
4. **Event System**: Standardize mouse/interaction events across all elements
5. **Code Quality**: Clean / readable code over "whatever works"

### Service Organization
```
services/
├── babylon-dom.service.ts (orchestration)
├── babylon-camera.service.ts (viewport management)
├── babylon-mesh.service.ts (3D object creation)
├── babylon-style.service.ts (new: CSS parsing & application)
├── babylon-layout.service.ts (new: positioning & layout algorithms)
├── babylon-text.service.ts (new: text rendering engine)
└── babylon-events.service.ts (new: unified event handling)
```

### Testing Strategy
- Unit tests for style parsing and calculation logic
- Visual regression tests for element rendering
- Performance benchmarks for complex layouts
- Cross-browser compatibility testing

### Performance Considerations
- Mesh pooling for frequently created/destroyed elements
- LOD (Level of Detail) for off-screen or distant elements
- Selective rendering based on viewport visibility
- Material sharing for identical styles

## Success Metrics
- Support for 80% of common HTML elements (visual representation)
- Support for 60% of common CSS properties
- Smooth 60fps rendering with 100+ elements
- Mouse interaction response time < 16ms
- Text rendering quality comparable to browser text
- Memory usage growth < O(n²) with element count

## Risk Mitigation
- **Text Rendering Complexity**: Start with 3D font approach as fallback
- **Performance Issues**: Implement feature toggles for expensive effects
- **Browser Compatibility**: Progressive enhancement approach
- **Maintenance Overhead**: Comprehensive documentation and examples

This plan prioritizes building a solid foundation with simple features before tackling complex challenges like text rendering and advanced layouts.
