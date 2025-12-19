import { Injectable } from '@angular/core';
import * as BABYLON from '@babylonjs/core';
import { DOMElement } from '../../../types/dom-element';
import { SelectElement, SelectOption, InputType, ValidationState } from '../../../types/input-types';
import { StyleRule } from '../../../types/style-rule';

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

    /**
     * Creates a select dropdown element
     */
    createSelectElement(
        element: DOMElement,
        scene: BABYLON.Scene,
        style: StyleRule
    ): SelectElement {
        // Create select field mesh
        const selectMesh = this.createSelectMesh(element, scene, style);

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
        selectElement.displayMesh = this.createDisplayMesh(selectElement, scene, style);

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

        // Dispose option meshes
        selectElement.optionMeshes.forEach(mesh => mesh.dispose());
        selectElement.optionMeshes = [];
    }

    /**
     * Selects an option by index
     */
    selectOption(selectElement: SelectElement, index: number): void {
        if (selectElement.disabled) return;
        if (index < 0 || index >= selectElement.options.length) return;

        const option = selectElement.options[index];
        if (option.disabled) return;

        selectElement.selectedIndex = index;
        selectElement.value = option.value;

        // Update display
        this.updateDisplay(selectElement);

        // Close dropdown
        this.closeDropdown(selectElement);

        // Mark as touched and dirty
        selectElement.validationState.touched = true;
        selectElement.validationState.dirty = true;
    }

    /**
     * Navigates through options with keyboard
     */
    navigateOptions(selectElement: SelectElement, direction: 'up' | 'down'): void {
        if (selectElement.disabled) return;

        let newIndex = selectElement.selectedIndex;

        if (direction === 'up') {
            newIndex = Math.max(0, newIndex - 1);
        } else {
            newIndex = Math.min(selectElement.options.length - 1, newIndex + 1);
        }

        // Skip disabled options
        while (newIndex >= 0 && newIndex < selectElement.options.length &&
            selectElement.options[newIndex].disabled) {
            newIndex += (direction === 'up' ? -1 : 1);
        }

        if (newIndex >= 0 && newIndex < selectElement.options.length) {
            this.selectOption(selectElement, newIndex);
        }
    }

    /**
     * Creates the select field mesh
     */
    private createSelectMesh(element: DOMElement, scene: BABYLON.Scene, style: StyleRule): BABYLON.Mesh {
        const width = this.parseSize(style.width) || 2;
        const height = this.SELECT_HEIGHT;

        const selectMesh = BABYLON.MeshBuilder.CreateBox(`select_${element.id}`, {
            width,
            height,
            depth: 0.1
        }, scene);

        // Create material
        const material = new BABYLON.StandardMaterial(`selectMaterial_${element.id}`, scene);
        material.diffuseColor = BABYLON.Color3.White();
        material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        selectMesh.material = material;

        selectMesh.isPickable = true;

        return selectMesh;
    }

    /**
     * Creates the display mesh showing selected value
     */
    private createDisplayMesh(selectElement: SelectElement, scene: BABYLON.Scene, style: StyleRule): BABYLON.Mesh {
        const displayPlane = BABYLON.MeshBuilder.CreatePlane(`selectDisplay_${selectElement.element.id}`, {
            width: 1.8,
            height: 0.3
        }, scene);

        displayPlane.parent = selectElement.mesh;
        displayPlane.position.z = 0.06;
        displayPlane.isPickable = false;

        // Create material with selected option text
        const material = new BABYLON.StandardMaterial(`displayMaterial_${selectElement.element.id}`, scene);
        material.diffuseColor = BABYLON.Color3.Black();
        displayPlane.material = material;

        return displayPlane;
    }

    /**
     * Creates the dropdown menu mesh
     */
    private createDropdownMesh(selectElement: SelectElement, scene: BABYLON.Scene, style: StyleRule): BABYLON.Mesh {
        const width = this.parseSize(style.width) || 2;
        const optionCount = selectElement.options.length;
        const height = Math.min(optionCount * this.OPTION_HEIGHT, this.DROPDOWN_MAX_HEIGHT);

        const dropdownMesh = BABYLON.MeshBuilder.CreateBox(`dropdown_${selectElement.element.id}`, {
            width,
            height,
            depth: 0.15
        }, scene);

        // Create material
        const material = new BABYLON.StandardMaterial(`dropdownMaterial_${selectElement.element.id}`, scene);
        material.diffuseColor = BABYLON.Color3.White();
        material.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        dropdownMesh.material = material;

        dropdownMesh.parent = selectElement.mesh;
        dropdownMesh.isPickable = true;

        return dropdownMesh;
    }

    /**
     * Creates meshes for each option
     */
    private createOptionMeshes(selectElement: SelectElement, scene: BABYLON.Scene, style: StyleRule): BABYLON.Mesh[] {
        const optionMeshes: BABYLON.Mesh[] = [];
        const width = this.parseSize(style.width) || 2;

        selectElement.options.forEach((option, index) => {
            const optionMesh = BABYLON.MeshBuilder.CreatePlane(`option_${selectElement.element.id}_${index}`, {
                width: width - 0.1,
                height: this.OPTION_HEIGHT - 0.05
            }, scene);

            if (selectElement.dropdownMesh) {
                optionMesh.parent = selectElement.dropdownMesh;
            }

            // Position option in dropdown
            const startY = (selectElement.options.length - 1) * this.OPTION_HEIGHT / 2;
            optionMesh.position.y = startY - (index * this.OPTION_HEIGHT);
            optionMesh.position.z = 0.08;

            // Create material
            const material = new BABYLON.StandardMaterial(`optionMaterial_${selectElement.element.id}_${index}`, scene);

            if (index === selectElement.selectedIndex) {
                material.diffuseColor = new BABYLON.Color3(0.7, 0.8, 1.0); // Highlight selected
            } else if (option.disabled) {
                material.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.7); // Gray for disabled
            } else {
                material.diffuseColor = BABYLON.Color3.White();
            }

            optionMesh.material = material;
            optionMesh.isPickable = !option.disabled;

            // Store option index in metadata for click handling
            optionMesh.metadata = { optionIndex: index };

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
        const selectedValue = element.value;

        if (selectedValue !== undefined) {
            const index = options.findIndex(opt => opt.value === selectedValue);
            if (index >= 0) return index;
        }

        // Find first non-disabled option
        const firstEnabled = options.findIndex(opt => !opt.disabled);
        return firstEnabled >= 0 ? firstEnabled : 0;
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
     * Cleanup select element resources
     */
    disposeSelectElement(selectElement: SelectElement): void {
        this.closeDropdown(selectElement);

        if (selectElement.displayMesh) {
            selectElement.displayMesh.dispose();
        }

        if (selectElement.mesh) {
            selectElement.mesh.dispose();
        }
    }
}
