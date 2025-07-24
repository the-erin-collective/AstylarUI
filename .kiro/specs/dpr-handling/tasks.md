# Implementation Plan

- [x] 1. Verify BabylonCameraService DPR handling























  - Confirm that getPixelToWorldScale method correctly accounts for DPR
  - Add additional logging to help debug DPR-related issues
  - _Requirements: 1.1, 1.3, 1.4_

- [ ] 2. Update FlexService to use consistent CSS pixel handling
  - [ ] 2.1 Refactor percentage calculations in FlexService
    - Update width and height calculations to ensure they work in CSS pixels
    - Ensure container dimensions used in percentage calculations are in CSS pixels
    - _Requirements: 1.2, 2.2_

  - [ ] 2.2 Update positioning calculations in FlexService
    - Ensure all position calculations use CSS pixels consistently
    - Only apply the pixelToWorldScale when converting to world units
    - _Requirements: 1.4, 2.2, 2.3_

- [ ] 3. Update ElementService to use consistent CSS pixel handling
  - [ ] 3.1 Refactor calculateDimensions method
    - Update to ensure all calculations are done in CSS pixels
    - Fix percentage calculations to work with CSS pixels
    - _Requirements: 1.2, 1.4, 2.2_

  - [ ] 3.2 Update createElement method
    - Ensure correct conversion from CSS pixels to world units using getPixelToWorldScale
    - Update border radius calculations to work in CSS pixels
    - _Requirements: 1.1, 1.4, 2.1_

- [ ] 4. Update FlexLayoutService to use consistent CSS pixel handling
  - [ ] 4.1 Refactor calculateFlexBasis method
    - Update percentage calculations to work with CSS pixels
    - _Requirements: 1.2, 2.2_

  - [ ] 4.2 Update other flex layout calculations
    - Ensure all calculations are done in CSS pixels
    - _Requirements: 1.4, 2.2, 2.3_

- [ ] 5. Update BabylonMeshService to apply DPR adjustment correctly
  - [ ] 5.1 Refactor mesh creation methods
    - Ensure they use the correct scale factor from getPixelToWorldScale()
    - _Requirements: 1.1, 1.3, 2.1_

  - [ ] 5.2 Update positioning methods
    - Ensure correct conversion from CSS pixels to world units
    - _Requirements: 1.4, 2.1_

- [ ] 6. Add helper functions for DPR handling
  - Add utility functions to convert between CSS pixels and device pixels
  - Add utility functions to convert between CSS pixels and world units
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 7. Add comprehensive unit tests
  - [ ] 7.1 Create tests for DPR handling
    - Test getPixelToWorldScale with various DPR values
    - Test percentage calculations in FlexService and ElementService
    - Test edge cases and error handling
    - _Requirements: 3.3_

  - [ ] 7.2 Update existing tests to account for DPR handling
    - Update FlexService tests
    - Update ElementService tests
    - Update BabylonCameraService tests
    - _Requirements: 3.3, 3.4_

- [ ] 8. Add DPR change detection
  - Implement a mechanism to detect changes in DPR (e.g., when moving between displays)
  - Update calculations when DPR changes
  - _Requirements: 3.4_