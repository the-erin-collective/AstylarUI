import { Injectable } from '@angular/core';
import { BabylonDOM } from '../interfaces/dom.types';
import { BabylonRender } from '../interfaces/render.types';
import { DOMElement } from '../../../types/dom-element';
import { StyleRule } from '../../../types/style-rule';
import { Mesh } from '@babylonjs/core';
import * as BABYLON from '@babylonjs/core';
import { StyleDefaultsService } from '../style-defaults.service';
import { StackingContextManager } from '../positioning/stacking-context.manager';
import { InputElementService } from '../input/input-element.service';
import { ElementMaterialService } from './element-material.service';
import { ElementDimensionService } from './element-dimension.service';
import { ElementBorderService } from './element-border.service';
import { ElementStyleParserService } from './element-style-parser.service';
import { ElementInteractionService } from './element-interaction.service';

/**
 * Service responsible for creating DOM elements as Babylon.js meshes
 * This is the main orchestrator that coordinates all element creation logic
 */
@Injectable({
    providedIn: 'root'
})
export class ElementCreationService {
    constructor(
        private styleDefaults: StyleDefaultsService,
        private stackingContextManager: StackingContextManager,
        private inputElementService: InputElementService,
        private materialService: ElementMaterialService,
        private dimensionService: ElementDimensionService,
        private borderService: ElementBorderService,
        private styleParser: ElementStyleParserService,
        private interactionService: ElementInteractionService
    ) { }

    /**
     * Create a DOM element as a Babylon.js mesh
     */
    createElement(
        dom: BabylonDOM,
        render: BabylonRender,
        element: DOMElement,
        parent: Mesh,
        styles: StyleRule[],
        flexPosition?: { x: number; y: number; z: number },
        flexSize?: { width: number; height: number }
    ): Mesh {
        console.log(`🔨 [ElementCreation] START creating element:`, element.type, element.id);

        // Ensure pointer observer is set up
        this.interactionService.ensurePointerObserver(render);

        // Get element styles
        const elementStyles = element.id ? dom.context.elementStyles.get(element.id) : undefined;

        // Check if element is in hover state
        const isHovered = element.id ? (dom.context.hoverStates.get(element.id) || false) : false;

        // Process styles - merge normal and hover styles if hovered
        const typeDefaults = this.styleDefaults.getElementTypeDefaults(element.type);
        let style: StyleRule = {
            selector: element.id ? `#${element.id}` : element.type,
            ...typeDefaults,
            ...(elementStyles?.normal || {})
        };

        // If element is hovered, merge in hover styles
        if (isHovered && elementStyles?.hover) {
            style = { ...style, ...elementStyles.hover };
            console.log(`[ElementCreation] Applying HOVER styles for ${element.id}`);
        }

        // Determine mesh ID
        const meshId = element.id || dom.actions.generateElementId(parent?.name || 'root', element.type, 0, element.class);

        // Calculate dimensions
        const dimensions = flexSize
            ? { ...this.dimensionService.calculateDimensions(dom, render, style, parent), width: flexSize.width, height: flexSize.height }
            : this.dimensionService.calculateDimensions(dom, render, style, parent);

        // Parse border radius and scale
        const borderRadiusPixels = this.borderService.parseBorderRadius(style?.borderRadius);
        const scaleFactor = render.actions.camera.getPixelToWorldScale();
        const borderRadius = borderRadiusPixels * scaleFactor;
        const worldWidth = dimensions.width * scaleFactor;
        const worldHeight = dimensions.height * scaleFactor;

        // DEBUG: Log dimensions for troubleshooting
        console.log(`[ElementCreation] Creating ${element.type} (${element.id}): raw dimensions=${dimensions.width}x${dimensions.height}, scale=${scaleFactor}, world=${worldWidth.toFixed(2)}x${worldHeight.toFixed(2)}`);

        let mesh: Mesh;

        // Check if it's an input element and delegate creation
        const inputElement = (render.scene && (element.type === 'input' || element.type === 'button' || element.type === 'select' || element.type === 'textarea'))
            ? this.inputElementService.createInputElement(
                element,
                render,
                style,
                { width: worldWidth, height: worldHeight }
            )
            : null;

        if (inputElement) {
            dom.context.inputElements.set(element.id || inputElement.mesh.name, inputElement);
            mesh = inputElement.mesh;
        } else if (element.type === 'img') {
            // Create image mesh
            mesh = render.actions.mesh.createPolygon(meshId, 'rectangle', worldWidth, worldHeight, borderRadius);

            // Apply image texture if src is present (either on element or in style)
            const imageSrc = element.src || style.src;
            if (imageSrc) {
                const material = new BABYLON.StandardMaterial(`${meshId}-material`, render.scene);
                const texture = new BABYLON.Texture(imageSrc, render.scene);
                material.diffuseTexture = texture;
                material.diffuseTexture.hasAlpha = true;
                material.useAlphaFromDiffuseTexture = true;

                // Handle opacity
                const opacity = render.actions.style.parseOpacity(style?.opacity);
                material.alpha = opacity;

                mesh.material = material;
            }
        } else {
            // Default element creation
            mesh = render.actions.mesh.createPolygon(meshId, 'rectangle', worldWidth, worldHeight, borderRadius);
        }

        // Set metadata
        mesh.metadata = {
            ...(mesh.metadata || {}),
            cursor: style.cursor,
            elementId: element.id,
            element: element // Store the element object for hover handling
        };

        // Calculate position
        const stackingZPosition = this.stackingContextManager.calculateZPosition(element);
        const zPosition = flexPosition ? flexPosition.z : stackingZPosition;

        let worldX: number, worldY: number;
        if (flexPosition) {
            worldX = flexPosition.x * scaleFactor;
            worldY = flexPosition.y * scaleFactor;
        } else {
            worldX = dimensions.x * scaleFactor;
            worldY = dimensions.y * scaleFactor;
        }

        // Position and parent the mesh
        render.actions.mesh.positionMesh(mesh, worldX, worldY, zPosition);
        render.actions.mesh.parentMesh(mesh, parent);
        console.log(`[ElementCreation] Positioned mesh ${meshId}`);

        // Create borders if border width is defined
        try {
            const borderProps = this.borderService.parseBorderProperties(render, style);
            console.log(`[ElementCreation] Border props for ${meshId}:`, borderProps);

            if (borderProps.width > 0) {
                // Use createPolygonBorder (not createBorderMesh) to match original implementation
                // All elements use 'rectangle' polygon type in current implementation
                const borderMeshes = render.actions.mesh.createPolygonBorder(
                    `${meshId}-border`,
                    'rectangle', // polygon type - all elements are rectangles
                    worldWidth,
                    worldHeight,
                    borderProps.width,
                    borderRadius
                );

                if (borderMeshes && borderMeshes.length > 0) {
                    // Create border material
                    const borderMaterial = render.actions.mesh.createMaterial(
                        `${meshId}-border-material`,
                        borderProps.color
                    );

                    // Parent all border frames to main mesh FIRST
                    borderMeshes.forEach((borderMesh: BABYLON.Mesh) => {
                        borderMesh.material = borderMaterial;
                        // Removed zOffset to rely on physical separation
                        render.actions.mesh.parentMesh(borderMesh, mesh);
                    });

                    // Position border frames at (0,0) relative to main mesh with POSITIVE Z offset
                    // Borders should be slightly in front for visibility
                    // Since parented, use local Z offset, not world Z
                    render.actions.mesh.positionBorderFrames(
                        borderMeshes,
                        0, // x relative to main mesh
                        0, // y relative to main mesh
                        0.05, // positive offset so borders appear in front
                        worldWidth,
                        worldHeight,
                        borderProps.width
                    );

                    // Store border meshes in context so they can be disposed/updated later (e.g. on hover)
                    borderMeshes.forEach(borderMesh => {
                        dom.context.elements.set(borderMesh.name, borderMesh);
                    });

                    console.log(`[ElementCreation] Created borders for ${meshId}`);
                }
            }
        } catch (e) {
            console.error(`[ElementCreation] Error creating borders for ${meshId}:`, e);
        }

        // Apply material (only if not an image with its own material)
        if (element.type !== 'img') {
            try {
                this.materialService.applyElementMaterial(dom, render, mesh, element, false, style);
                console.log(`[ElementCreation] Applied material for ${meshId}`);
            } catch (e) {
                console.error(`[ElementCreation] Error applying material for ${meshId}:`, e);
            }
        }

        // Apply transforms if present
        const transform = this.materialService.parseTransform(style?.transform);
        if (transform) {
            this.materialService.applyTransforms(mesh, transform);
        }
        console.log(`[ElementCreation] Finished transforms for ${meshId}`);

        console.log(`[Element ${element.id}] elementStyles:`, elementStyles);
        console.log(`[Element ${element.id}] hasHoverStyles:`, elementStyles?.hover !== undefined);

        // Setup hover events if needed
        const hasHoverStyles = elementStyles?.hover !== undefined;
        if (element.id && hasHoverStyles) {
            console.log(`[Element ${element.id}] Setting up mouse events`);
            this.interactionService.setupMouseEvents(dom, render, mesh, element.id);
        }

        // Store element reference
        if (element.id) {
            dom.context.elements.set(element.id, mesh);
            dom.context.hoverStates.set(element.id, false);
            dom.context.elementTypes.set(element.id, element.type);

            // Store dimensions
            const pixelPadding = dimensions.padding;
            dom.context.elementDimensions.set(element.id, {
                width: dimensions.width,
                height: dimensions.height,
                padding: pixelPadding
            });

            // Handle text content if present
            if (element.textContent && element.textContent.trim() !== '') {
                dom.actions.handleTextContent(dom, render, element, mesh, styles);
            }
        }

        // Attach input events if it's an input element
        const foundInputElement = dom.context.inputElements.get(element.id || mesh.name);
        if (foundInputElement && render.scene) {
            this.inputElementService.attachInputEvents(foundInputElement, render.scene);
        }

        return mesh;
    }

    /**
     * Process child elements
     */
    processChildren(
        dom: BabylonDOM,
        render: BabylonRender,
        children: DOMElement[],
        parent: Mesh,
        styles: StyleRule[],
        parentElement?: DOMElement
    ): void {
        console.log(`[ElementCreation] processChildren: processing ${children.length} children for ${parentElement?.id || 'unknown'}`);

        // Check if parent is a flex container
        const isFlex = parentElement && dom.actions.isFlexContainer(render, parentElement, styles);
        console.log(`[ElementCreation] isFlexContainer(${parentElement?.id}): ${isFlex}`);

        if (isFlex && parentElement) {
            console.log(`[ElementCreation] Processing flex children for ${parentElement.id}`);
            dom.actions.processFlexChildren(dom, render, children, parent, styles, parentElement);
        } else {
            console.log(`[ElementCreation] Processing standard children for ${parentElement?.id}`);
            console.log(`[ElementCreation] Children array check: isArray=${Array.isArray(children)}, length=${children.length}`);

            // Standard flow for non-flex containers
            try {
                console.log(`[ElementCreation] Starting standard for-loop. Length: ${children.length}`);
                for (let i = 0; i < children.length; i++) {
                    const child = children[i];
                    console.log(`[ElementCreation] Loop index ${i}: child=${child ? child.id : 'undefined'}`);

                    if (!child) {
                        console.warn(`[ElementCreation] Child at index ${i} is undefined/null`);
                        continue;
                    }

                    console.log(`[ElementCreation] Creating child ${child.type}#${child.id}`);
                    const childMesh = this.createElement(dom, render, child, parent, styles);

                    // Recursively process grandchildren
                    if (child.children && child.children.length > 0) {
                        this.processChildren(dom, render, child.children, childMesh, styles, child);
                    }
                }
                console.log(`[ElementCreation] Finished processing children for ${parentElement?.id}`);
            } catch (error) {
                console.error(`[ElementCreation] Error in children loop for ${parentElement?.id}:`, error);
            }
        }
    }
}
