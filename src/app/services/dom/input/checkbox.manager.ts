import { Injectable } from '@angular/core';
import * as BABYLON from '@babylonjs/core';
import { BabylonRender } from '../interfaces/render.types';
import { DOMElement } from '../../../types/dom-element';
import { StyleRule } from '../../../types/style-rule';
import { CheckboxInput, RadioInput, InputType, ValidationState } from '../../../types/input-types';

@Injectable({
    providedIn: 'root'
})
export class CheckboxManager {
    private readonly CHECKBOX_SIZE = 0.5;
    private readonly CHECK_MARK_SIZE = 0.3;
    private radioGroups: Map<string, RadioInput[]> = new Map();

    constructor() { }

    /**
     * Creates a checkbox input
     */
    createCheckbox(element: DOMElement, render: BabylonRender, style: StyleRule, worldDimensions: { width: number; height: number }): CheckboxInput {
        if (!render.scene) {
            throw new Error('Scene is required to create checkbox');
        }

        const mesh = this.createCheckboxMesh(element, render, style, worldDimensions);

        const checkbox: CheckboxInput = {
            type: InputType.Checkbox,
            element: element,
            mesh: mesh,
            value: element.value || false,
            focused: false,
            disabled: false,
            required: element.required || false,
            validationRules: [],
            validationState: {
                valid: true,
                errors: [],
                touched: false,
                dirty: false
            },
            checked: false,
            checkIndicatorMesh: undefined, // Will be created
            labelMesh: undefined // Will be created
        };

        checkbox.checkIndicatorMesh = this.createCheckIndicator(checkbox, render.scene);
        checkbox.labelMesh = this.createLabelMesh(checkbox, render.scene, style);

        return checkbox;
    }

    /**
     * Creates a radio button input
     */
    createRadioButton(element: DOMElement, render: BabylonRender, style: StyleRule, worldDimensions: { width: number; height: number }): RadioInput {
        if (!render.scene) {
            throw new Error('Scene is required to create radio button');
        }

        const mesh = this.createRadioMesh(element, render, style, worldDimensions);

        const radio: RadioInput = {
            type: InputType.Radio,
            element: element,
            mesh: mesh,
            value: element.value || false,
            focused: false,
            disabled: false,
            required: element.required || false,
            validationRules: [],
            validationState: {
                valid: true,
                errors: [],
                touched: false,
                dirty: false
            },
            checked: false,
            groupName: element.name || 'default',
            selectionIndicatorMesh: undefined, // Will be created
            labelMesh: undefined // Will be created
        };

        radio.selectionIndicatorMesh = this.createSelectionIndicator(radio, render.scene);
        radio.labelMesh = this.createLabelMesh(radio, render.scene, style);

        this.registerRadioButton(radio);

        return radio;
    }

    /**
     * Toggles checkbox state
     */
    toggleCheckbox(checkbox: CheckboxInput): void {
        if (checkbox.disabled) return;

        checkbox.checked = !checkbox.checked;
        this.updateCheckIndicator(checkbox);
    }

    /**
     * Selects a radio button
     */
    selectRadioButton(radio: RadioInput): void {
        if (radio.disabled || radio.checked) return;

        // Uncheck all others in group
        const group = this.radioGroups.get(radio.groupName);
        if (group) {
            group.forEach(r => {
                r.checked = false;
                this.updateSelectionIndicator(r);
            });
        }

        // Check this one
        radio.checked = true;
        this.updateSelectionIndicator(radio);
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
    private createCheckboxMesh(element: DOMElement, render: BabylonRender, style: StyleRule, worldDimensions: { width: number; height: number }): BABYLON.Mesh {
        const scale = render.actions.camera.getPixelToWorldScale();
        const size = worldDimensions.width > 0 ? worldDimensions.width : this.CHECKBOX_SIZE * scale * 100;

        const checkboxMesh = BABYLON.MeshBuilder.CreateBox(`checkbox_${element.id}`, {
            width: size,
            height: size,
            depth: 0.05 * scale * 100
        }, render.scene);

        // Create material
        const material = new BABYLON.StandardMaterial(`checkboxMaterial_${element.id}`, render.scene);
        material.diffuseColor = BABYLON.Color3.White();
        material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        checkboxMesh.material = material;

        checkboxMesh.isPickable = true;

        return checkboxMesh;
    }

    /**
     * Creates the radio button mesh (circular)
     */
    private createRadioMesh(element: DOMElement, render: BabylonRender, style: StyleRule, worldDimensions: { width: number; height: number }): BABYLON.Mesh {
        const scale = render.actions.camera.getPixelToWorldScale();
        const radius = (worldDimensions.width > 0 ? worldDimensions.width : this.CHECKBOX_SIZE * scale * 100) / 2;

        const radioMesh = BABYLON.MeshBuilder.CreateCylinder(`radio_${element.id}`, {
            diameter: radius * 2,
            height: 0.05 * scale * 100
        }, render.scene);

        radioMesh.rotation.x = Math.PI / 2; // Rotate to face forward

        // Create material
        const material = new BABYLON.StandardMaterial(`radioMaterial_${element.id}`, render.scene);
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
