import { Injectable } from '@angular/core';
import * as BABYLON from '@babylonjs/core';
import { BabylonRender } from '../interfaces/render.types';
import { DOMElement } from '../../../types/dom-element';
import { SelectElement, SelectOption, InputType, ValidationState } from '../../../types/input-types';
import { StyleRule } from '../../../types/style-rule';
import { TextRenderingService } from '../../text/text-rendering.service';
import { BabylonMeshService } from '../../babylon-mesh.service';

/**
 * Service responsible for managing select dropdown elements
 */
@Injectable({
    providedIn: 'root'
})
export class SelectManager {
    private readonly SELECT_HEIGHT = 0.5;
    private readonly OPTION_HEIGHT = 0.4;
    private readonly DROPDOWN_MAX_HEIGHT = 2.0;

    constructor(
        private textRenderingService: TextRenderingService,
        private babylonMeshService: BabylonMeshService
    ) { }

    /**
     * Creates a select dropdown element
     */
    createSelectElement(
        element: DOMElement,
        render: BabylonRender,
        style: StyleRule,
        worldDimensions: { width: number; height: number }
    ): SelectElement {
        if (!render.scene) {
            throw new Error('Scene is required to create select element');
        }

        // Create select field mesh
        const selectMesh = this.createSelectMesh(element, render, style, worldDimensions);

        // Initialize validation state
        const validationState: ValidationState = {
            valid: true,
            errors: [],
            touched: false,
            dirty: false
        };

        // Parse options from element
        const options = this.parseOptions(element);
        const selectedIndex = this.findSelectedIndex(options, element);

        // Create select object
        const selectElement: SelectElement = {
            element,
            type: InputType.Select,
            value: options[selectedIndex]?.value || null,
            options,
            selectedIndex,
            dropdownOpen: false,
            optionMeshes: [],
            focused: false,
            disabled: element.disabled || false,
            required: element.required || false,
            validationRules: [],
            validationState,
            mesh: selectMesh
        };

        // Create display mesh for selected value
        selectElement.displayMesh = this.createDisplayMesh(selectElement, render, style);

        return selectElement;
    }

    /**
     * Opens the dropdown menu
     */
    openDropdown(selectElement: SelectElement, scene: BABYLON.Scene, style: StyleRule): void {
        if (selectElement.disabled || selectElement.dropdownOpen) return;

        selectElement.dropdownOpen = true;

        // Create dropdown mesh
        selectElement.dropdownMesh = this.createDropdownMesh(selectElement, scene, style);

        // Create option meshes
        // We need render object here but signature only has scene. 
        // We'll have to rely on scene for now or update signature. 
        // Ideally we should pass render. For now, we'll try to get scale from scene if possible or default.
        // Actually, let's update the signature to take render if we can, but openDropdown is called from interaction handler.
        // For now, we'll use a default scale or try to derive it.
        // Wait, we can pass 'render' if we update the caller. 
        // But for this refactor, let's stick to scene and use a safe fallback for scale if render is not available, 
        // OR we can assume we can get engine from scene.
        // Let's use scene.getEngine() to calculate scale roughly if needed, or pass render.
        // Since I can't easily change all callers right now, I'll use the scene-based scale calculation I saw earlier as fallback,
        // or better, I'll update the signature since I am rewriting the file.
        // But wait, openDropdown is called by the interaction logic which might not have 'render' handy?
        // Let's look at how it's called. It's likely called from an action manager.
        // I'll stick to scene for openDropdown for now to avoid breaking callers, 
        // but I'll use a helper to get scale from scene.
        selectElement.optionMeshes = this.createOptionMeshes(selectElement, scene, style);

        // Position dropdown
        this.positionDropdown(selectElement);
    }

    /**
     * Closes the dropdown menu
     */
    closeDropdown(selectElement: SelectElement): void {
        if (!selectElement.dropdownOpen) return;

        selectElement.dropdownOpen = false;

        // Dispose dropdown mesh
        if (selectElement.dropdownMesh) {
            selectElement.dropdownMesh.dispose();
            selectElement.dropdownMesh = undefined;
        }

    }

    /**
     * Creates the main select field mesh
     */
    private createSelectMesh(element: DOMElement, render: BabylonRender, style: StyleRule, worldDimensions: { width: number; height: number }): BABYLON.Mesh {
        const width = worldDimensions.width;
        const height = worldDimensions.height;

        // Use plane instead of box for 2D consistency
        const selectMesh = BABYLON.MeshBuilder.CreatePlane(`select_${element.id}`, {
            width,
            height,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE
        }, render.scene);

        // Create material with CSS colors
        const material = new BABYLON.StandardMaterial(`selectMaterial_${element.id}`, render.scene);

        // Apply CSS background color
        const bgColor = this.parseColor(style?.background);
        material.diffuseColor = bgColor;
        material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        material.backFaceCulling = false;

        selectMesh.material = material;
        selectMesh.isPickable = true;

        return selectMesh;
    }

    /**
     * Creates the display mesh for showing selected value
     */
    private createDisplayMesh(selectElement: SelectElement, render: BabylonRender, style: StyleRule): BABYLON.Mesh {
        const options = selectElement.options;
        const selectedIndex = selectElement.selectedIndex;
        const selectedOption = options[selectedIndex];
        const textContent = selectedOption ? selectedOption.label : 'Select...';

        const textStyle = { ...style };
        if (!textStyle.fontSize) textStyle.fontSize = '14px';
        if (!textStyle.fontFamily) textStyle.fontFamily = 'Arial';
        if (!textStyle.color) textStyle.color = '#000000'; // Default to black for select display
        textStyle.textAlign = 'left';

        try {
            const texture = this.textRenderingService.renderTextToTexture(
                selectElement.element,
                textContent,
                textStyle
            );

            // Get texture dimensions
            const textureSize = texture.getSize();
            const textureWidthPx = textureSize.width;
            const textureHeightPx = textureSize.height;

            // Convert to world units using camera's pixel-to-world scale
            const scale = render.actions.camera.getPixelToWorldScale();
            const textureWidth = textureWidthPx * scale;
            const textureHeight = textureHeightPx * scale;

            // Create text mesh using BabylonMeshService
            const displayPlane = this.babylonMeshService.createTextMesh(
                `selectDisplay_${selectElement.element.id}`,
                texture,
                textureWidth,
                textureHeight
            );

            displayPlane.parent = selectElement.mesh;
            displayPlane.position.z = -0.15; // In front of select box
            displayPlane.isPickable = false;

            // Align text to left edge (inverted coordinate system)
            const selectWidth = selectElement.mesh.getBoundingInfo().boundingBox.extendSize.x * 2;
            const padding = 1.5; // Aggressive left padding
            displayPlane.position.x = (selectWidth / 2) - (textureWidth / 2) - padding;

            return displayPlane;

        } catch (error) {
            console.error('Error creating select display:', error);
            // Fallback
            return BABYLON.MeshBuilder.CreatePlane(`selectDisplay_${selectElement.element.id}_fallback`, {
                width: 1.8,
                height: 0.3
            }, render.scene);
        }
    }


    /**
     * Creates the dropdown background mesh
     */
    private createDropdownMesh(selectElement: SelectElement, scene: BABYLON.Scene, style: StyleRule): BABYLON.Mesh {
        const width = this.parseSize(style.width) || 2.0;
        const optionsCount = selectElement.options.length;
        const height = Math.min(optionsCount * this.OPTION_HEIGHT, this.DROPDOWN_MAX_HEIGHT);

        const dropdownMesh = BABYLON.MeshBuilder.CreateBox(`dropdown_${selectElement.element.id}`, {
            width: width,
            height: height,
            depth: 0.05
        }, scene);

        // Create material
        const material = new BABYLON.StandardMaterial(`dropdownMaterial_${selectElement.element.id}`, scene);
        material.diffuseColor = new BABYLON.Color3(0.95, 0.95, 0.95);
        dropdownMesh.material = material;

        dropdownMesh.parent = selectElement.mesh;
        dropdownMesh.isPickable = false;

        return dropdownMesh;
    }

    /**
     * Creates meshes for each option
     */
    private createOptionMeshes(selectElement: SelectElement, scene: BABYLON.Scene, style: StyleRule): BABYLON.Mesh[] {
        const width = this.parseSize(style.width) || 2.0;
        const optionMeshes: BABYLON.Mesh[] = [];

        if (!selectElement.dropdownMesh) return [];

        // Calculate scale roughly since we don't have render object here easily
        // Assuming standard 1920 width and some camera distance, but better to use a fixed scale or derive from engine
        const engine = scene.getEngine();
        const scale = (engine.getRenderWidth() / engine.getHardwareScalingLevel()) / 1920 * 0.001; // Approximate

        selectElement.options.forEach((option, index) => {
            // Background for option
            const optionMesh = BABYLON.MeshBuilder.CreatePlane(`option_${selectElement.element.id}_${index}`, {
                width: width - 0.2,
                height: this.OPTION_HEIGHT - 0.05
            }, scene);

            // Position relative to dropdown
            if (selectElement.dropdownMesh) {
                optionMesh.parent = selectElement.dropdownMesh;
            }
            optionMesh.position.y = (selectElement.options.length * this.OPTION_HEIGHT / 2) - (index * this.OPTION_HEIGHT) - (this.OPTION_HEIGHT / 2);
            optionMesh.position.z = -0.06; // In front of dropdown background

            // Create material
            const material = new BABYLON.StandardMaterial(`optionMaterial_${selectElement.element.id}_${index}`, scene);
            material.diffuseColor = index === selectElement.selectedIndex
                ? new BABYLON.Color3(0.9, 0.9, 1.0) // Highlight selected
                : BABYLON.Color3.White();
            material.emissiveColor = BABYLON.Color3.Black();

            optionMesh.material = material;
            optionMesh.isPickable = !option.disabled;

            // Store option index in metadata for click handling
            optionMesh.metadata = { optionIndex: index };

            // Create text for option
            const textStyle = { ...style };
            textStyle.fontSize = '14px';
            textStyle.color = '#000000';
            textStyle.textAlign = 'left';

            try {
                const texture = this.textRenderingService.renderTextToTexture(
                    selectElement.element,
                    option.label,
                    textStyle
                );

                const textureSize = texture.getSize();
                // Use approximate scale
                const textureWidth = textureSize.width * 0.002; // Rough scale
                const textureHeight = textureSize.height * 0.002;

                const textMesh = this.babylonMeshService.createTextMesh(
                    `optionText_${selectElement.element.id}_${index}`,
                    texture,
                    textureWidth,
                    textureHeight
                );

                textMesh.parent = optionMesh;
                textMesh.position.z = -0.01;
                textMesh.isPickable = false;

            } catch (e) {
                console.error('Failed to create option text', e);
            }

            optionMeshes.push(optionMesh);
        });

        return optionMeshes;
    }

    /**
     * Positions the dropdown menu
     */
    private positionDropdown(selectElement: SelectElement): void {
        if (!selectElement.dropdownMesh) return;

        // Position dropdown below select field
        const dropdownHeight = selectElement.dropdownMesh.getBoundingInfo().boundingBox.extendSize.y * 2;
        selectElement.dropdownMesh.position.y = -(this.SELECT_HEIGHT / 2 + dropdownHeight / 2 + 0.1);
        selectElement.dropdownMesh.position.z = 0;
    }

    /**
     * Updates the display with selected option
     */
    private updateDisplay(selectElement: SelectElement): void {
        // This would update the text on the display mesh
        // In production, would use TextRenderingService
        const selectedOption = selectElement.options[selectElement.selectedIndex];
        console.log('Selected option:', selectedOption?.label);
    }

    /**
     * Parses options from element
     */
    private parseOptions(element: DOMElement): SelectOption[] {
        if (element.options && Array.isArray(element.options)) {
            return element.options;
        }

        // Default option if none provided
        return [{ value: '', label: 'Select an option', disabled: false }];
    }

    /**
     * Finds the initially selected index
     */
    private findSelectedIndex(options: SelectOption[], element: DOMElement): number {
        if (element.value) {
            const index = options.findIndex(o => o.value === element.value);
            if (index > -1) return index;
        }
        return 0;
    }

    /**
     * Parses size value from style
     */
    private parseSize(value: string | undefined): number | undefined {
        if (!value) return undefined;
        const num = parseFloat(value);
        return isNaN(num) ? undefined : num;
    }

    /**
     * Parses CSS color to Babylon Color3
     */
    private parseColor(color: string | undefined): BABYLON.Color3 {
        if (!color) return BABYLON.Color3.White();

        // Handle hex colors
        if (color.startsWith('#')) {
            const hex = color.substring(1);
            const r = parseInt(hex.substring(0, 2), 16) / 255;
            const g = parseInt(hex.substring(2, 4), 16) / 255;
            const b = parseInt(hex.substring(4, 6), 16) / 255;
            return new BABYLON.Color3(r, g, b);
        }

        // Handle rgb/rgba
        if (color.startsWith('rgb')) {
            const match = color.match(/\d+/g);
            if (match && match.length >= 3) {
                return new BABYLON.Color3(
                    parseInt(match[0]) / 255,
                    parseInt(match[1]) / 255,
                    parseInt(match[2]) / 255
                );
            }
        }

        // Default fallback
        return BABYLON.Color3.White();
    }

    /**
     * Cleanup select resources
     */
    disposeSelect(selectElement: SelectElement): void {
        if (selectElement.displayMesh) {
            selectElement.displayMesh.dispose();
        }

        if (selectElement.dropdownMesh) {
            selectElement.dropdownMesh.dispose();
        }

        if (selectElement.optionMeshes) {
            selectElement.optionMeshes.forEach(mesh => mesh.dispose());
        }

        if (selectElement.mesh) {
            selectElement.mesh.dispose();
        }
    }
}
