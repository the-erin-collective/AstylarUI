import { Injectable } from '@angular/core';

/**
 * Service responsible for parsing CSS style properties
 * This is a utility service with no dependencies
 */
@Injectable({
    providedIn: 'root'
})
export class ElementStyleParserService {
    constructor() { }

    /**
     * Parse polygon type from CSS polygonType property
     */
    parsePolygonType(polygonType: string | undefined): string {
        if (!polygonType) {
            return 'rectangle';
        }

        const validTypes = ['rectangle', 'circle', 'triangle', 'pentagon', 'hexagon', 'octagon'];
        return validTypes.includes(polygonType) ? polygonType : 'rectangle';
    }

    /**
     * Parse border radius from CSS borderRadius property
     */
    parseBorderRadius(borderRadius: string | undefined): number {
        if (!borderRadius) {
            return 0;
        }

        // Handle pixel values
        if (typeof borderRadius === 'string' && borderRadius.endsWith('px')) {
            return parseFloat(borderRadius);
        }

        // Handle percentage values (will need parent context for proper calculation)
        if (typeof borderRadius === 'string' && borderRadius.endsWith('%')) {
            // For now, return 0 - percentage border radius needs parent dimensions
            return 0;
        }

        // Handle numeric values
        return parseFloat(borderRadius) || 0;
    }
}
