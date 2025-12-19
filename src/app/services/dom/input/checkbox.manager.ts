import { Injectable } from '@angular/core';
import * as BABYLON from '@babylonjs/core';
import { DOMElement } from '../../../types/dom-element';
import { CheckboxInput, RadioInput, InputType, ValidationState } from '../../../types/input-types';
import { StyleRule } from '../../../types/style-rule';

/**
 * Service responsible for managing checkbox and radio button elements
 */
@Injectable({
    providedIn: 'root'
})
export class CheckboxManager {
    private radioGroups: Map<string, RadioInput[]> = new Map();
    private readonly CHECKBOX_SIZE = 0.3;
    private readonly CHECK_MARK_SIZE = 0.2;

    /**
     * Creates a checkbox element
     */
    createCheckbox(
        element: DOMElement,
        scene: BABYLON.Scene,
        style: StyleRule
    ): CheckboxInput {
        // Create checkbox mesh
        const checkboxMesh = this.createCheckboxMesh(element, scene, style);

        // Initialize validation state
        const validationState: ValidationState = {
            valid: true,
            errors: [],
            touched: false,
            dirty: false
        };

        // Create checkbox object
        const checkbox: CheckboxInput = {
            element,
            type: InputType.Checkbox,
            value: element.checked || false,
            checked: element.checked || false,
            label: element.textContent,
            focused: false,
            disabled: element.disabled || false,
            required: element.required || false,
            validationRules: [],
            validationState,
            mesh: checkboxMesh
        };

        // Create check indicator
        checkbox.checkIndicatorMesh = this.createCheckIndicator(checkbox, scene);
        this.updateCheckIndicator(checkbox);

        // Create label if provided
        if (checkbox.label) {
            checkbox.labelMesh = this.createLabelMesh(checkbox, scene, style);
        }

        return checkbox;
    }

    /**
     * Creates a radio button element
     */
    createRadioButton(
        element: DOMElement,
        scene: BABYLON.Scene,
        style: StyleRule
    ): RadioInput {
        // Create radio button mesh
        const radioMesh = this.createRadioMesh(element, scene, style);

        // Initialize validation state
        const validationState: ValidationState = {
            valid: true,
            errors: [],
            touched: false,
            dirty: false
        };

        // Create radio button object
        const radio: RadioInput = {
            element,
            type: InputType.Radio,
            value: element.value || element.textContent || '',
            checked: element.checked || false,
            groupName: element.name || 'default',
            label: element.textContent,
            focused: false,
            disabled: element.disabled || false,
            required: element.required || false,
            validationRules: [],
            validationState,
            mesh: radioMesh
        };

        // Create selection indicator
        radio.selectionIndicatorMesh = this.createSelectionIndicator(radio, scene);
        this.updateSelectionIndicator(radio);

        // Create label if provided
        if (radio.label) {
            radio.labelMesh = this.createLabelMesh(radio, scene, style);
        }

        // Register in radio group
        this.registerRadioButton(radio);

        return radio;
    }

    /**
     * Toggles checkbox checked state
     */
    toggleCheckbox(checkbox: CheckboxInput): void {
        if (checkbox.disabled) return;

        checkbox.checked = !checkbox.checked;
        checkbox.value = checkbox.checked;
        this.updateCheckIndicator(checkbox);

        // Mark as touched and dirty
        checkbox.validationState.touched = true;
        checkbox.validationState.dirty = true;
    }

    /**
     * Selects a radio button and deselects others in the group
     */
    selectRadioButton(radio: RadioInput): void {
        if (radio.disabled) return;

        // Deselect all other radio buttons in the group
        const group = this.radioGroups.get(radio.groupName);
        if (group) {
            group.forEach(r => {
                if (r !== radio && r.checked) {
                    r.checked = false;
                    r.value = false;
                    this.updateSelectionIndicator(r);
                }
            });
        }

        // Select this radio button
        radio.checked = true;
        radio.value = radio.element.value || radio.label || true;
        this.updateSelectionIndicator(radio);

        // Mark as touched and dirty
        radio.validationState.touched = true;
        radio.validationState.dirty = true;
    }

    /**
     * Handles label click for checkbox or radio button
     */
    handleLabelClick(input: CheckboxInput | RadioInput): void {
        if (input.type === InputType.Checkbox) {
            this.toggleCheckbox(input as CheckboxInput);
        } else if (input.type === InputType.Radio) {
            this.selectRadioButton(input as RadioInput);
        }
    }

    /**
     * Updates the check indicator visibility
     */
    private updateCheckIndicator(checkbox: CheckboxInput): void {
        if (checkbox.checkIndicatorMesh) {
            checkbox.checkIndicatorMesh.isVisible = checkbox.checked;
        }
    }

    /**
     * Updates the selection indicator visibility
     */
    private updateSelectionIndicator(radio: RadioInput): void {
        if (radio.selectionIndicatorMesh) {
            radio.selectionIndicatorMesh.isVisible = radio.checked;
        }
    }

    /**
     * Creates the checkbox mesh (square box)
     */
    private createCheckboxMesh(element: DOMElement, scene: BABYLON.Scene, style: StyleRule): BABYLON.Mesh {
        const size = this.CHECKBOX_SIZE;

        const checkboxMesh = BABYLON.MeshBuilder.CreateBox(`checkbox_${element.id}`, {
            width: size,
            height: size,
            depth: 0.05
        }, scene);

        // Create material
        const material = new BABYLON.StandardMaterial(`checkboxMaterial_${element.id}`, scene);
        material.diffuseColor = BABYLON.Color3.White();
        material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        checkboxMesh.material = material;

        checkboxMesh.isPickable = true;

        return checkboxMesh;
    }

    /**
     * Creates the radio button mesh (circular)
     */
    private createRadioMesh(element: DOMElement, scene: BABYLON.Scene, style: StyleRule): BABYLON.Mesh {
        const radius = this.CHECKBOX_SIZE / 2;

        const radioMesh = BABYLON.MeshBuilder.CreateCylinder(`radio_${element.id}`, {
            diameter: radius * 2,
            height: 0.05
        }, scene);

        radioMesh.rotation.x = Math.PI / 2; // Rotate to face forward

        // Create material
        const material = new BABYLON.StandardMaterial(`radioMaterial_${element.id}`, scene);
        material.diffuseColor = BABYLON.Color3.White();
        material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        radioMesh.material = material;

        radioMesh.isPickable = true;

        return radioMesh;
    }

    /**
     * Creates the check mark indicator for checkbox
     */
    private createCheckIndicator(checkbox: CheckboxInput, scene: BABYLON.Scene): BABYLON.Mesh {
        // Create a simple checkmark using a box (simplified)
        // In production, this would be a proper checkmark shape
        const checkMark = BABYLON.MeshBuilder.CreateBox(`checkMark_${checkbox.element.id}`, {
            width: this.CHECK_MARK_SIZE,
            height: this.CHECK_MARK_SIZE,
            depth: 0.03
        }, scene);

        checkMark.parent = checkbox.mesh;
        checkMark.position.z = 0.04; // In front of checkbox

        // Create material
        const material = new BABYLON.StandardMaterial(`checkMarkMaterial_${checkbox.element.id}`, scene);
        material.diffuseColor = new BABYLON.Color3(0.2, 0.6, 0.2); // Green
        material.emissiveColor = new BABYLON.Color3(0.1, 0.3, 0.1);
        checkMark.material = material;

        checkMark.isPickable = false;
        checkMark.isVisible = false;

        return checkMark;
    }

    /**
     * Creates the selection indicator for radio button
     */
    private createSelectionIndicator(radio: RadioInput, scene: BABYLON.Scene): BABYLON.Mesh {
        const radius = this.CHECK_MARK_SIZE / 2;

        const indicator = BABYLON.MeshBuilder.CreateCylinder(`radioIndicator_${radio.element.id}`, {
            diameter: radius * 2,
            height: 0.03
        }, scene);

        indicator.rotation.x = Math.PI / 2; // Rotate to face forward
        indicator.parent = radio.mesh;
        indicator.position.z = 0.04; // In front of radio button

        // Create material
        const material = new BABYLON.StandardMaterial(`radioIndicatorMaterial_${radio.element.id}`, scene);
        material.diffuseColor = new BABYLON.Color3(0.2, 0.4, 0.8); // Blue
        material.emissiveColor = new BABYLON.Color3(0.1, 0.2, 0.4);
        indicator.material = material;

        indicator.isPickable = false;
        indicator.isVisible = false;

        return indicator;
    }

    /**
     * Creates label mesh for checkbox or radio button
     */
    private createLabelMesh(input: CheckboxInput | RadioInput, scene: BABYLON.Scene, style: StyleRule): BABYLON.Mesh {
        // Create a simple plane for the label
        // In production, this would use TextRenderingService
        const labelPlane = BABYLON.MeshBuilder.CreatePlane(`label_${input.element.id}`, {
            width: 1.5,
            height: 0.3
        }, scene);

        labelPlane.parent = input.mesh;
        labelPlane.position.x = 1.0; // To the right of checkbox/radio
        labelPlane.position.z = 0.01;
        labelPlane.isPickable = true; // Allow clicking label

        // Create label material
        const material = new BABYLON.StandardMaterial(`labelMaterial_${input.element.id}`, scene);
        material.diffuseColor = BABYLON.Color3.Black();
        labelPlane.material = material;

        return labelPlane;
    }

    /**
     * Registers a radio button in its group
     */
    private registerRadioButton(radio: RadioInput): void {
        if (!this.radioGroups.has(radio.groupName)) {
            this.radioGroups.set(radio.groupName, []);
        }

        const group = this.radioGroups.get(radio.groupName)!;
        group.push(radio);
    }

    /**
     * Gets all radio buttons in a group
     */
    getRadioGroup(groupName: string): RadioInput[] {
        return this.radioGroups.get(groupName) || [];
    }

    /**
     * Gets the selected radio button in a group
     */
    getSelectedRadio(groupName: string): RadioInput | undefined {
        const group = this.radioGroups.get(groupName);
        return group?.find(r => r.checked);
    }

    /**
     * Cleanup checkbox resources
     */
    disposeCheckbox(checkbox: CheckboxInput): void {
        if (checkbox.checkIndicatorMesh) {
            checkbox.checkIndicatorMesh.dispose();
        }

        if (checkbox.labelMesh) {
            checkbox.labelMesh.dispose();
        }

        if (checkbox.mesh) {
            checkbox.mesh.dispose();
        }
    }

    /**
     * Cleanup radio button resources
     */
    disposeRadioButton(radio: RadioInput): void {
        // Remove from group
        const group = this.radioGroups.get(radio.groupName);
        if (group) {
            const index = group.indexOf(radio);
            if (index > -1) {
                group.splice(index, 1);
            }
        }

        if (radio.selectionIndicatorMesh) {
            radio.selectionIndicatorMesh.dispose();
        }

        if (radio.labelMesh) {
            radio.labelMesh.dispose();
        }

        if (radio.mesh) {
            radio.mesh.dispose();
        }
    }
}
