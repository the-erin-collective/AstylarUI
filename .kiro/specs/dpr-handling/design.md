# Design Document

## Overview

This document outlines the design for standardizing Device Pixel Ratio (DPR) handling throughout the ASTYLARUI application. The goal is to ensure consistent rendering of UI elements across different screen densities by implementing a clear approach to pixel unit conversions and calculations.

## Architecture

The DPR handling system will be implemented using a simplified approach that maintains all layout calculations in CSS pixels and only applies the DPR adjustment when converting to world units. This approach is more streamlined and reduces the need for multiple conversion steps.

## Components and Interfaces

### BabylonCameraService Updates

The `getPixelToWorldScale()` method in `BabylonCameraService` has already been updated to correctly account for DPR:

```typescript
getPixelToWorldScale(): number {
  if (!this.camera) {
    throw new Error('Camera not initialized');
  }

  const scene = this.camera.getScene();
  const canvas = scene.getEngine().getRenderingCanvas();
  const canvasHeight = canvas?.height || 1080;
  
  // Check if canvas is properly sized
  if (!canvas || canvas.width === 0 || canvas.height === 0) {
    console.warn('⚠️ Canvas not properly sized yet, using fallback scale');
    return 0.025; // Reasonable fallback
  }
  
  const { height: worldHeight } = this.calculateViewportDimensions();
  
  // Get device pixel ratio to account for high-DPI displays
  const devicePixelRatio = window.devicePixelRatio || 1;
  
  // Calculate how many world units per CSS pixel, accounting for device pixel ratio
  const pixelToWorldScale = worldHeight / (canvasHeight * devicePixelRatio);
  
  console.log(`pixelToWorldScale: ${pixelToWorldScale}, DPR: ${devicePixelRatio}, canvasHeight: ${canvasHeight}, worldHeight: ${worldHeight}`);

  return pixelToWorldScale;
}
```

This method now correctly divides by the DPR when calculating the scale factor, ensuring that fixed pixel dimensions appear at the same physical size regardless of the device's pixel density.

### Integration with Existing Services

The following services will be updated to ensure consistent handling of CSS pixels:

1. **FlexService**: Ensure all layout calculations are done in CSS pixels
   - Update the code to ensure that container dimensions used in percentage calculations are in CSS pixels
   - Ensure that the final dimensions passed to createElement are in CSS pixels

2. **ElementService**: Ensure all dimension calculations are done in CSS pixels
   - Update the calculateDimensions method to work consistently in CSS pixels
   - Ensure that percentage calculations are based on CSS pixel dimensions
   - Apply the pixelToWorldScale only when converting to world units for mesh creation

3. **FlexLayoutService**: Ensure all calculations are done in CSS pixels
   - Update the calculateFlexBasis method to ensure percentage calculations are based on CSS pixels
   - Ensure that all other flex layout calculations are done in CSS pixels

4. **BabylonMeshService**: Apply DPR adjustment only when converting to world units
   - Update mesh creation methods to ensure they use the correct scale factor from getPixelToWorldScale()

## Data Models

No new data models are required for this feature. The existing models will continue to be used, but with more consistent handling of pixel units.

## Error Handling

The DPR handling system will include fallbacks for edge cases:

1. If `window.devicePixelRatio` is undefined, a default value of 1 will be used
2. Logging will be added to help debug DPR-related issues
3. Validation will be added to ensure that input values are valid numbers

## Testing Strategy

1. **Unit Tests**:
   - Test the `getPixelToWorldScale()` method with various DPR values
   - Test percentage calculations in FlexService and ElementService
   - Test edge cases (e.g., DPR = 1, DPR = 2, DPR = 3)

2. **Integration Tests**:
   - Test that elements render at the correct size on different DPR settings
   - Test that percentage calculations work correctly
   - Test that nested elements with mixed fixed and percentage-based dimensions render correctly

3. **Visual Regression Tests**:
   - Compare screenshots of the application on different DPR settings to ensure visual consistency