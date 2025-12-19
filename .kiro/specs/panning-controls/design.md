# Design Document

## Overview

The Panning Controls feature will implement comprehensive panning functionality in BJSUI's 3D environment, providing smooth, intuitive pan interactions with keyboard and mouse combinations. This design introduces pan state management, boundary constraints, and container-specific panning while maintaining integration with existing camera and interaction systems.

## Architecture

### Core Components

#### PanService
Service responsible for panning functionality and state management.

```typescript
interface PanService {
  handlePanInput(event: PanInputEvent): void;
  setPanPosition(position: Vector2, animated?: boolean): void;
  getPanPosition(): Vector2;
  resetPan(animated?: boolean): void;
  setPanConstraints(constraints: PanConstraints): void;
  getPanTarget(mousePosition: Vector2): PanTarget | null;
}
```

#### Pan Data Structures
```typescript
interface PanState {
  currentPosition: Vector2;
  targetPosition: Vector2;
  initialPosition: Vector2;
  animating: boolean;
  constraints: PanConstraints;
  enabled: boolean;
  dragging: boolean;
}

interface PanConstraints {
  boundaries?: PanBoundaries;
  container?: DomElement;
  enabled: boolean;
}

interface PanBoundaries {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface PanTarget {
  container: DomElement;
  localPosition: Vector2;
  worldPosition: Vector3;
}
```

### Integration Points

#### BabylonCameraService Extension
```typescript
interface CameraPanIntegration {
  applyPan(panPosition: Vector2): void;
  animatePan(fromPosition: Vector2, toPosition: Vector2, duration: number): void;
  getPanMatrix(): Matrix;
  updateCameraForPan(panState: PanState): void;
}
```

## Components and Interfaces

### Pan Input Handling
```typescript
interface PanInputHandler {
  onMouseDown(event: MouseEvent): void;
  onMouseMove(event: MouseEvent): void;
  onMouseUp(event: MouseEvent): void;
  onMiddleClick(event: MouseEvent): void;
  onKeyDown(event: KeyboardEvent): void;
  onKeyUp(event: KeyboardEvent): void;
  isPanKeyPressed(): boolean;
}

interface PanInputEvent {
  type: 'start' | 'move' | 'end' | 'reset' | 'programmatic';
  mousePosition?: Vector2;
  mouseDelta?: Vector2;
  targetContainer?: DomElement;
}
```

### Pan Animation System
```typescript
interface PanAnimator {
  startPanAnimation(from: Vector2, to: Vector2, duration: number): void;
  updatePanAnimation(deltaTime: number): boolean;
  stopPanAnimation(): void;
  getAnimationProgress(): number;
}

interface PanAnimationConfig {
  duration: number;
  easing: EasingFunction;
  onComplete?: () => void;
  onUpdate?: (progress: number) => void;
}
```

### Container-Specific Panning
```typescript
interface ContainerPanManager {
  registerPanContainer(container: DomElement, constraints: PanConstraints): void;
  unregisterPanContainer(container: DomElement): void;
  findPanTarget(mousePosition: Vector2): PanTarget | null;
  updateContainerPan(container: DomElement, panPosition: Vector2): void;
}
```

## Data Models

### PanStyleProperties
```typescript
interface PanStyleProperties extends StyleRule {
  panEnabled?: boolean;
  panBoundaries?: string; // "minX,minY,maxX,maxY"
  panAnimationDuration?: number;
  panConstrainToContainer?: boolean;
}
```

### Pan Algorithm
1. Detect pan input (Alt/Option + mouse drag or middle click)
2. Determine pan target based on mouse position
3. Calculate new pan position within boundaries
4. Start smooth animation for reset or apply immediate pan for drag
5. Update camera and element positioning during pan
6. Maintain interaction accuracy at new pan position

## Error Handling

- Invalid pan position clamping to boundaries
- Animation interruption handling
- Container constraint validation
- Input event processing failures

## Testing Strategy

### Visual Testing with Example Sites
- Basic pan drag functionality
- Pan reset demonstrations
- Container-constrained pan examples
- Pan boundary enforcement
- Integration with existing interactions
- Pan animation smoothness validation

## Performance Considerations

- Efficient pan animation rendering
- Optimized camera update calculations
- Minimal impact on interaction systems
- Smooth drag response performance

## Implementation Phases

1. Core pan service and input handling
2. Pan drag interaction implementation
3. Pan animation system for reset functionality
4. Container-specific pan constraints
5. Camera integration and positioning updates
6. Programmatic pan control and state management