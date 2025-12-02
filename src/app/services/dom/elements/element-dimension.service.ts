import { Injectable } from '@angular/core';
import { BabylonDOM } from '../interfaces/dom.types';
import { BabylonRender } from '../interfaces/render.types';
import { StyleRule } from '../../../types/style-rule';
import { Mesh } from '@babylonjs/core';

/**
 * Service responsible for calculating element dimensions and positioning
 */
@Injectable({
    providedIn: 'root'
})
export class ElementDimensionService {
    constructor() { }

    /**
     * Calculate dimensions for an element based on its style and parent
     */
    calculateDimensions(
        dom: BabylonDOM,
        render: BabylonRender,
        style: StyleRule | undefined,
        parent: Mesh
    ): {
        width: number;
        height: number;
        x: number;
        y: number;
        padding: { top: number; right: number; bottom: number; left: number };
        margin: { top: number; right: number; bottom: number; left: number };
    } {
        // Get parent dimensions from elementDimensions (in pixels)
        const parentDims = dom.context.elementDimensions.get(parent.name);
        if (!parentDims) {
            throw new Error(`Parent dimensions not found for ${parent.name}`);
        }

        const parentWidth = parentDims.width;
        const parentHeight = parentDims.height;
        const parentPadding = parentDims.padding;

        // Calculate the parent's content area (excluding padding)
        const contentWidth = parentWidth - parentPadding.left - parentPadding.right;
        const contentHeight = parentHeight - parentPadding.top - parentPadding.bottom;

        // Parse padding and margin
        const padding = this.parsePadding(render, style, undefined);
        const margin = this.parseMargin(style);

        // Default dimensions - use content area, not full parent dimensions
        let width = contentWidth;
        let height = contentHeight;
        let x = 0;
        let y = 0;

        if (style) {
            // Calculate width - percentages are relative to parent's content width
            if (style.width) {
                if (typeof style.width === 'string' && style.width.endsWith('px')) {
                    width = parseFloat(style.width);
                } else if (typeof style.width === 'string' && style.width.endsWith('%')) {
                    const widthPercent = parseFloat(style.width);
                    width = (contentWidth * widthPercent) / 100;
                } else {
                    width = parseFloat(style.width);
                }
            }

            // Calculate height - percentages are relative to parent's content height
            if (style.height) {
                if (typeof style.height === 'string' && style.height.endsWith('px')) {
                    height = parseFloat(style.height);
                } else if (typeof style.height === 'string' && style.height.endsWith('%')) {
                    const heightPercent = parseFloat(style.height);
                    height = (contentHeight * heightPercent) / 100;
                } else {
                    height = parseFloat(style.height);
                }
            }

            // Calculate position - CSS uses top-left origin, BabylonJS uses center origin
            // Position is calculated relative to the content area, then offset by padding
            if (style.left !== undefined) {
                if (typeof style.left === 'string' && style.left.endsWith('px')) {
                    // Position within content area, then offset by left padding
                    x = -(parentWidth / 2) + parentPadding.left + parseFloat(style.left) + (width / 2);
                    console.log(`[ElementDimension] Calculated X (px): ${x} (parentW=${parentWidth}, contentW=${contentWidth}, paddingLeft=${parentPadding.left}, left=${style.left}, width=${width})`);
                } else if (typeof style.left === 'string' && style.left.endsWith('%')) {
                    const leftPercent = parseFloat(style.left);
                    const leftPixels = (contentWidth * leftPercent) / 100;
                    x = -(parentWidth / 2) + parentPadding.left + leftPixels + (width / 2);
                    console.log(`[ElementDimension] Calculated X (%): ${x} (parentW=${parentWidth}, contentW=${contentWidth}, paddingLeft=${parentPadding.left}, left=${style.left}, leftPx=${leftPixels}, width=${width})`);
                } else {
                    x = -(parentWidth / 2) + parentPadding.left + parseFloat(style.left) + (width / 2);
                    console.log(`[ElementDimension] Calculated X (val): ${x} (parentW=${parentWidth}, contentW=${contentWidth}, paddingLeft=${parentPadding.left}, left=${style.left}, width=${width})`);
                }
            } else {
                // No left specified, center horizontally within content area
                x = -(parentWidth / 2) + parentPadding.left + (contentWidth / 2);
                console.log(`[ElementDimension] No left style for ${style.selector}, x centered in content area: ${x}`);
            }

            if (style.top !== undefined) {
                if (typeof style.top === 'string' && style.top.endsWith('px')) {
                    // Position within content area, then offset by top padding
                    y = (parentHeight / 2) - parentPadding.top - parseFloat(style.top) - (height / 2);
                } else if (typeof style.top === 'string' && style.top.endsWith('%')) {
                    const topPercent = parseFloat(style.top);
                    const topPixels = (contentHeight * topPercent) / 100;
                    y = (parentHeight / 2) - parentPadding.top - topPixels - (height / 2);
                } else {
                    y = (parentHeight / 2) - parentPadding.top - parseFloat(style.top) - (height / 2);
                }
            } else {
                // No top specified, center vertically within content area
                y = (parentHeight / 2) - parentPadding.top - (contentHeight / 2);
            }
        }

        return { width, height, x, y, padding, margin };
    }

    /**
     * Parse padding values from style
     */
    parsePadding(
        render: BabylonRender,
        style: StyleRule | undefined,
        parentDimensions: { width: number; height: number } | undefined
    ): { top: number; right: number; bottom: number; left: number } {
        if (!style?.padding) {
            return { top: 0, right: 0, bottom: 0, left: 0 };
        }

        // Parse padding shorthand (supports: "10px", "10px 20px", "10px 20px 30px", "10px 20px 30px 40px")
        const parts = style.padding.split(' ');
        let top = 0, right = 0, bottom = 0, left = 0;

        if (parts.length === 1) {
            top = right = bottom = left = this.parseLength(parts[0], parentDimensions?.height);
        } else if (parts.length === 2) {
            top = bottom = this.parseLength(parts[0], parentDimensions?.height);
            right = left = this.parseLength(parts[1], parentDimensions?.width);
        } else if (parts.length === 3) {
            top = this.parseLength(parts[0], parentDimensions?.height);
            right = left = this.parseLength(parts[1], parentDimensions?.width);
            bottom = this.parseLength(parts[2], parentDimensions?.height);
        } else if (parts.length === 4) {
            top = this.parseLength(parts[0], parentDimensions?.height);
            right = this.parseLength(parts[1], parentDimensions?.width);
            bottom = this.parseLength(parts[2], parentDimensions?.height);
            left = this.parseLength(parts[3], parentDimensions?.width);
        }

        return { top, right, bottom, left };
    }

    /**
     * Parse margin values from style
     */
    parseMargin(style: StyleRule | undefined): { top: number; right: number; bottom: number; left: number } {
        if (!style?.margin) {
            return { top: 0, right: 0, bottom: 0, left: 0 };
        }

        // Similar logic to parsePadding
        const parts = style.margin.split(' ');
        let top = 0, right = 0, bottom = 0, left = 0;

        if (parts.length === 1) {
            top = right = bottom = left = this.parseLength(parts[0]);
        } else if (parts.length === 2) {
            top = bottom = this.parseLength(parts[0]);
            right = left = this.parseLength(parts[1]);
        } else if (parts.length === 3) {
            top = this.parseLength(parts[0]);
            right = left = this.parseLength(parts[1]);
            bottom = this.parseLength(parts[2]);
        } else if (parts.length === 4) {
            top = this.parseLength(parts[0]);
            right = this.parseLength(parts[1]);
            bottom = this.parseLength(parts[2]);
            left = this.parseLength(parts[3]);
        }

        return { top, right, bottom, left };
    }

    /**
     * Parse a CSS length value (px, %, etc.)
     */
    private parseLength(value: string, referenceValue?: number): number {
        if (value.endsWith('px')) {
            return parseFloat(value);
        }
        if (value.endsWith('%') && referenceValue !== undefined) {
            return (parseFloat(value) * referenceValue) / 100;
        }
        return parseFloat(value) || 0;
    }
}
