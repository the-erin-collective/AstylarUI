# Requirements Document for Flexbox Layout Implementation

## Introduction

This document outlines the requirements for implementing a robust flexbox layout system in the BJSUI framework. The current implementation has several issues with coordinate system conversion, margin handling, and proper alignment of flex items. This new implementation will address these issues by properly accounting for the scale factor used in the system and ensuring consistent behavior across different flex layout configurations.

## Requirements

### Requirement 1: Coordinate System Consistency

**User Story:** As a developer, I want the flexbox layout system to consistently handle coordinate transformations between CSS and BabylonJS coordinate systems, so that layouts render correctly regardless of flex direction or wrapping mode.

#### Acceptance Criteria

1. WHEN calculating flex item positions THEN the system SHALL properly convert between CSS coordinate system (origin at top-left) and BabylonJS coordinate system (origin at center) using the existing camera service methods.
2. WHEN using flex-direction: row-reverse or column-reverse THEN the system SHALL correctly invert the main axis direction.
3. WHEN using flex-wrap: wrap-reverse THEN the system SHALL correctly invert the cross axis direction.
4. WHEN calculating positions for nested flex containers THEN the system SHALL maintain coordinate system consistency across all nesting levels.
5. WHEN applying transformations to flex items THEN the system SHALL ensure the transformations work correctly in the BabylonJS coordinate system.
6. WHEN debugging coordinate transformations THEN the system SHALL log the conversion steps for easier troubleshooting.

### Requirement 2: Scale Factor Integration

**User Story:** As a developer, I want the flexbox layout system to properly account for the pixel-to-world scale factor used throughout the application, so that dimensions and positions are consistent with other elements.

#### Acceptance Criteria

1. WHEN converting CSS pixel values to world units THEN the system SHALL use the consistent scale factor from the camera service.
2. WHEN calculating margins and padding THEN the system SHALL apply the scale factor to convert from pixels to world units.
3. WHEN calculating gap values THEN the system SHALL apply the scale factor to convert from pixels to world units.
4. WHEN calculating border widths THEN the system SHALL apply the scale factor to convert from pixels to world units.
5. WHEN calculating flex-basis values THEN the system SHALL apply the scale factor for pixel-based values.
6. WHEN calculating minimum and maximum sizes THEN the system SHALL apply the scale factor for pixel-based constraints.
7. WHEN debugging dimension calculations THEN the system SHALL log both pixel values and converted world units.

### Requirement 3: Flex Container Layout Algorithm

**User Story:** As a developer, I want the flexbox layout algorithm to correctly calculate and position items according to the CSS flexbox specification, so that layouts behave as expected.

#### Acceptance Criteria

1. WHEN calculating flex item sizes THEN the system SHALL properly distribute available space according to flex-grow factors.
2. WHEN calculating flex item sizes with insufficient space THEN the system SHALL reduce sizes according to flex-shrink factors.
3. WHEN calculating flex item positions THEN the system SHALL properly align items according to justify-content and align-items properties.
4. WHEN wrapping items to multiple lines THEN the system SHALL create distinct visual lines with proper spacing.
5. WHEN applying align-content to wrapped lines THEN the system SHALL position the lines according to the specified alignment.
6. WHEN calculating flex layout THEN the system SHALL account for margins, padding, and gaps in the calculations.
7. WHEN calculating nested flex layouts THEN the system SHALL properly handle the parent-child relationship and coordinate transformations.
8. WHEN debugging flex layout calculations THEN the system SHALL log the step-by-step calculations for easier troubleshooting.

### Requirement 4: Margin and Gap Handling

**User Story:** As a developer, I want margins and gaps to be properly applied to flex items, so that spacing between items is visually correct.

#### Acceptance Criteria

1. WHEN a flex item has margins THEN the system SHALL create the appropriate space around the item.
2. WHEN a flex container has gap properties THEN the system SHALL create the appropriate space between items.
3. WHEN calculating item positions THEN the system SHALL account for both margins and gaps without double-counting.
4. WHEN converting margin and gap values to world units THEN the system SHALL use the consistent scale factor.
5. WHEN margins collapse according to CSS rules THEN the system SHALL implement the correct collapsing behavior.
6. WHEN debugging margin and gap calculations THEN the system SHALL log the original values and their effect on positioning.

### Requirement 5: Flex Item Alignment

**User Story:** As a developer, I want flex items to be properly aligned according to align-items, align-self, and align-content properties, so that layouts match CSS flexbox behavior.

#### Acceptance Criteria

1. WHEN align-items is specified on a container THEN the system SHALL align all items accordingly on the cross axis.
2. WHEN align-self is specified on an item THEN the system SHALL override the container's align-items for that specific item.
3. WHEN align-content is specified on a multi-line container THEN the system SHALL position the lines according to the specified alignment.
4. WHEN calculating cross-axis positions THEN the system SHALL account for the coordinate system differences between CSS and BabylonJS.
5. WHEN calculating alignment for different flex directions THEN the system SHALL adjust the alignment logic accordingly.
6. WHEN debugging alignment calculations THEN the system SHALL log the alignment values and their effect on positioning.

### Requirement 6: Visual Debugging Support

**User Story:** As a developer, I want comprehensive visual debugging for the flexbox layout system, so that I can easily identify and fix layout issues.

#### Acceptance Criteria

1. WHEN processing flex containers THEN the system SHALL log container properties, dimensions, and styling.
2. WHEN processing flex items THEN the system SHALL log item properties, calculated sizes, and positions.
3. WHEN calculating flex layout THEN the system SHALL log the step-by-step layout calculations.
4. WHEN applying coordinate transformations THEN the system SHALL log the original and transformed coordinates.
5. WHEN errors occur in flex processing THEN the system SHALL log detailed error information with context.
6. WHEN debugging is enabled THEN the system SHALL provide visual indicators for container bounds, item bounds, and alignment lines.