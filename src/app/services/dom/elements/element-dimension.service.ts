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

        // Parse padding and margin
        const padding = this.parsePadding(render, style, undefined);
        const margin = this.parseMargin(style);

        // Default dimensions
        let width = parentWidth;
        let height = parentHeight;
        let x = 0;
        let y = 0;

        if (style) {
            // Calculate width
            if (style.width) {
                if (typeof style.width === 'string' && style.width.endsWith('px')) {
                    width = parseFloat(style.width);
                } else if (typeof style.width === 'string' && style.width.endsWith('%')) {
                    const widthPercent = parseFloat(style.width);
                    width = (parentWidth * widthPercent) / 100;
                } else {
                    width = parseFloat(style.width);
                }
            }

            // Calculate height
            if (style.height) {
                if (typeof style.height === 'string' && style.height.endsWith('px')) {
                    height = parseFloat(style.height);
                } else if (typeof style.height === 'string' && style.height.endsWith('%')) {
                    const heightPercent = parseFloat(style.height);
                    height = (parentHeight * heightPercent) / 100;
                } else {
                    height = parseFloat(style.height);
                }
            }

            // Calculate position - CSS uses top-left origin, BabylonJS uses center origin
            if (style.left !== undefined) {
                if (typeof style.left === 'string' && style.left.endsWith('px')) {
                    x = -((parentWidth / 2) - parseFloat(style.left) - (width / 2))
                } else if (typeof style.left === 'string' && style.left.endsWith('%')) {
                    const leftPercent = parseFloat(style.left);
                    const leftPixels = (parentWidth * leftPercent) / 100;
                    x = -((parentWidth / 2) - leftPixels - (width / 2));
                } else {
                    x = -((parentWidth / 2) - parseFloat(style.left) - (width / 2));
                }
            }

            if (style.top !== undefined) {
                if (typeof style.top === 'string' && style.top.endsWith('px')) {
                    y = (parentHeight / 2) - parseFloat(style.top) - (height / 2);
                } else if (typeof style.top === 'string' && style.top.endsWith('%')) {
                    const topPercent = parseFloat(style.top);
                    const topPixels = (parentHeight * topPercent) / 100;
                    y = (parentHeight / 2) - topPixels - (height / 2);
                } else {
                    y = (parentHeight / 2) - parseFloat(style.top) - (height / 2);
                }
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
