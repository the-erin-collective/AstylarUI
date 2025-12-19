import { Injectable } from '@angular/core';
import * as BABYLON from '@babylonjs/core';
import { DOMElement } from '../../../types/dom-element';
import { Button, ButtonState, InputType, ValidationState, ButtonInteraction } from '../../../types/input-types';
import { StyleRule } from '../../../types/style-rule';

/**
 * Service responsible for managing button elements
 */
@Injectable({
    providedIn: 'root'
})
export class ButtonManager {
    private readonly PRESS_OFFSET = 0.05; // Visual press down effect
    private readonly STATE_TRANSITION_MS = 100;

    /**
     * Creates a button element
     */
    createButton(
        element: DOMElement,
        scene: BABYLON.Scene,
        style: StyleRule
    ): Button {
        // Create button mesh
        const buttonMesh = this.createButtonMesh(element, scene, style);

        // Initialize validation state
        const validationState: ValidationState = {
            valid: true,
            errors: [],
            touched: false,
            dirty: false
        };

        // Determine button type
        const buttonType = this.determineButtonType(element);

        // Create button object
        const button: Button = {
            element,
            type: InputType.Button,
            value: element.value || element.textContent || '',
            label: element.textContent || element.value || 'Button',
            state: ButtonState.Normal,
            buttonType,
            focused: false,
            disabled: element.disabled || false,
            required: false,
            validationRules: [],
            validationState,
            mesh: buttonMesh
        };

        // Create label mesh
        if (button.label) {
            button.labelMesh = this.createLabelMesh(button, scene, style);
        }

        // Apply initial state styling
        this.updateButtonState(button, ButtonState.Normal);

        return button;
    }

    /**
     * Handles button click interaction
     */
    handleButtonClick(button: Button): void {
        if (button.disabled) return;

        // Visual feedback - press state
        this.updateButtonState(button, ButtonState.Pressed);

        // Execute action after brief delay for visual feedback
        setTimeout(() => {
            this.updateButtonState(button, button.focused ? ButtonState.Focused : ButtonState.Normal);
            this.executeButtonAction(button);
        }, this.STATE_TRANSITION_MS);
    }

    /**
     * Handles button hover interaction
     */
    handleButtonHover(button: Button, isHovering: boolean): void {
        if (button.disabled) return;

        if (isHovering) {
            if (button.state !== ButtonState.Pressed) {
                this.updateButtonState(button, ButtonState.Hover);
            }
        } else {
            if (button.state === ButtonState.Hover) {
                this.updateButtonState(button, button.focused ? ButtonState.Focused : ButtonState.Normal);
            }
        }
    }

    /**
     * Handles button interaction
     */
    handleButtonInteraction(button: Button, interaction: ButtonInteraction): void {
        if (button.disabled) return;

        switch (interaction) {
            case ButtonInteraction.Click:
                this.handleButtonClick(button);
                break;
            case ButtonInteraction.Hover:
                this.handleButtonHover(button, true);
                break;
            case ButtonInteraction.Press:
                this.updateButtonState(button, ButtonState.Pressed);
                break;
            case ButtonInteraction.Release:
                this.updateButtonState(button, ButtonState.Normal);
                break;
        }
    }

    /**
     * Updates button visual state
     */
    updateButtonState(button: Button, state: ButtonState): void {
        const previousState = button.state;
        button.state = state;

        const material = button.mesh.material as BABYLON.StandardMaterial;
        if (!material) return;

        // Reset position if coming from pressed state
        if (previousState === ButtonState.Pressed && state !== ButtonState.Pressed) {
            button.mesh.position.y += this.PRESS_OFFSET;
            if (button.labelMesh) {
                button.labelMesh.position.y += this.PRESS_OFFSET;
            }
        }

        switch (state) {
            case ButtonState.Normal:
                material.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8);
                material.emissiveColor = BABYLON.Color3.Black();
                break;

            case ButtonState.Hover:
                material.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.9);
                material.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
                break;

            case ButtonState.Pressed:
                material.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.6);
                material.emissiveColor = BABYLON.Color3.Black();
                // Press down effect
                button.mesh.position.y -= this.PRESS_OFFSET;
                if (button.labelMesh) {
                    button.labelMesh.position.y -= this.PRESS_OFFSET;
                }
                break;

            case ButtonState.Disabled:
                material.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
                material.emissiveColor = BABYLON.Color3.Black();
                material.alpha = 0.5;
                break;

            case ButtonState.Focused:
                material.diffuseColor = new BABYLON.Color3(0.85, 0.85, 0.85);
                material.emissiveColor = new BABYLON.Color3(0.2, 0.4, 0.8);
                break;
        }
    }

    /**
     * Executes the button's associated action
     */
    executeButtonAction(button: Button): void {
        // Execute custom action if provided
        if (button.action) {
            button.action();
        }

        // Handle form submission for submit buttons
        if (button.buttonType === 'submit') {
            // This would trigger form submission
            // Will be handled by FormManager
            console.log('Submit button clicked:', button.element.id);
        }

        // Handle reset for reset buttons
        if (button.buttonType === 'reset') {
            console.log('Reset button clicked:', button.element.id);
        }

        // Execute onclick handler if defined
        if (button.element.onclick) {
            try {
                // Evaluate onclick handler (simplified - in production would use safer evaluation)
                console.log('Executing onclick:', button.element.onclick);
            } catch (error) {
                console.error('Error executing button onclick:', error);
            }
        }
    }

    /**
     * Creates the button mesh
     */
    private createButtonMesh(element: DOMElement, scene: BABYLON.Scene, style: StyleRule): BABYLON.Mesh {
        const width = this.parseSize(style.width) || 1.5;
        const height = this.parseSize(style.height) || 0.5;
        const depth = 0.1;

        const buttonMesh = BABYLON.MeshBuilder.CreateBox(`button_${element.id}`, {
            width,
            height,
            depth
        }, scene);

        // Create material
        const material = new BABYLON.StandardMaterial(`buttonMaterial_${element.id}`, scene);
        material.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8);
        material.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        buttonMesh.material = material;

        // Make button pickable for interactions
        buttonMesh.isPickable = true;

        return buttonMesh;
    }

    /**
     * Creates the button label mesh
     */
    private createLabelMesh(button: Button, scene: BABYLON.Scene, style: StyleRule): BABYLON.Mesh {
        // Create a simple plane for the label
        // In production, this would use TextRenderingService
        const labelPlane = BABYLON.MeshBuilder.CreatePlane(`buttonLabel_${button.element.id}`, {
            width: 1.2,
            height: 0.3
        }, scene);

        labelPlane.parent = button.mesh;
        labelPlane.position.z = 0.06; // In front of button
        labelPlane.isPickable = false;

        // Create label material
        const material = new BABYLON.StandardMaterial(`labelMaterial_${button.element.id}`, scene);
        material.diffuseColor = BABYLON.Color3.Black();
        material.emissiveColor = BABYLON.Color3.Black();
        labelPlane.material = material;

        return labelPlane;
    }

    /**
     * Determines button type from element
     */
    private determineButtonType(element: DOMElement): 'button' | 'submit' | 'reset' {
        const type = element.inputType?.toLowerCase();

        if (type === 'submit') return 'submit';
        if (type === 'reset') return 'reset';
        return 'button';
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
     * Sets button action callback
     */
    setButtonAction(button: Button, action: () => void): void {
        button.action = action;
    }

    /**
     * Enables or disables button
     */
    setButtonDisabled(button: Button, disabled: boolean): void {
        button.disabled = disabled;
        this.updateButtonState(button, disabled ? ButtonState.Disabled : ButtonState.Normal);
    }

    /**
     * Cleanup button resources
     */
    disposeButton(button: Button): void {
        if (button.labelMesh) {
            button.labelMesh.dispose();
        }

        if (button.mesh) {
            button.mesh.dispose();
        }
    }
}
