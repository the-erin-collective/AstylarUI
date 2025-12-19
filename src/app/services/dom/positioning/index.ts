// Core positioning services
export { PositioningService } from './positioning.service';
export { ContainingBlockManager } from './containing-block.manager';
export { PositionCalculator } from './position-calculator.service';
export { StackingContextManager } from './stacking-context.manager';
export { PositioningIntegrationService } from './positioning-integration.service';
export { ViewportService } from './viewport.service';

// Positioning mode services
export * from './modes';

// Interfaces
export * from './interfaces/positioning.interfaces';

// Utilities
export { PositioningUtils } from './utils/positioning.utils';

// Types (re-export from types directory)
export * from '../../../types/positioning';