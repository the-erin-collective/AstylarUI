import { Injectable } from '@angular/core';
import { BabylonDOM } from '../interfaces/dom.types';
import { BabylonRender } from '../interfaces/render.types';
import { DOMElement } from '../../../types/dom-element';
import { StyleRule } from '../../../types/style-rule';
import { Mesh } from '@babylonjs/core';

/**
 * Service responsible for applying materials and visual properties to elements
 */
@Injectable({
    providedIn: 'root'
})
export class ElementMaterialService {
    constructor() { }

    /**
     * Apply material to an element mesh
     */
    applyElementMaterial(
        dom: BabylonDOM,
        render: BabylonRender,
        mesh: Mesh,
        element: DOMElement,
        isHovered: boolean,
        style: StyleRule
    ): void {
        // Get opacity
        const opacity = render.actions.style.parseOpacity(style?.opacity);

        // Get background color
        let backgroundColor;
        if (style?.background) {
            backgroundColor = render.actions.style.parseBackgroundColor(style.background);
        }

        // Create and apply material
        if (backgroundColor) {
            const material = render.actions.mesh.createMaterial(
                `${element.id || mesh.name}-material`,
                backgroundColor,
                undefined,
                opacity
            );
            mesh.material = material;
        }
    }

    /**
     * Parse transform CSS property
     */
    parseTransform(transform: string | undefined): any {
        if (!transform) {
            return null;
        }

        // Parse various transform functions
        // This is a simplified version - full CSS transform parsing is complex
        const result: any = {};

        // Parse translate
        const translateMatch = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (translateMatch) {
            result.translateX = parseFloat(translateMatch[1]);
            result.translateY = parseFloat(translateMatch[2]);
        }

        // Parse rotate
        const rotateMatch = transform.match(/rotate\(([^)]+)\)/);
        if (rotateMatch) {
            result.rotate = parseFloat(rotateMatch[1]);
        }

        // Parse scale
        const scaleMatch = transform.match(/scale\(([^)]+)\)/);
        if (scaleMatch) {
            result.scale = parseFloat(scaleMatch[1]);
        }

        return Object.keys(result).length > 0 ? result : null;
    }

    /**
     * Apply transforms to a mesh
     */
    applyTransforms(mesh: Mesh, transform: any): void {
        if (transform.translateX !== undefined || transform.translateY !== undefined) {
            mesh.position.x += transform.translateX || 0;
            mesh.position.y += transform.translateY || 0;
        }

        if (transform.rotate !== undefined) {
            mesh.rotation.z = transform.rotate * (Math.PI / 180); // Convert to radians
        }

        if (transform.scale !== undefined) {
            mesh.scaling.x = transform.scale;
            mesh.scaling.y = transform.scale;
        }
    }
}
