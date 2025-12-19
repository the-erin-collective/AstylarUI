import { Injectable } from '@angular/core';
import * as BABYLON from '@babylonjs/core';
import { InputElement, TextInput, InputType } from '../../../types/input-types';
import { TextCursorRenderer } from './text-cursor.renderer';

/**
 * Service responsible for managing focus state and tab navigation
 */
@Injectable({
    providedIn: 'root'
})
export class FocusManager {
    private focusedElement: InputElement | null = null;
    private tabOrder: InputElement[] = [];
    private focusIndicators: Map<string, BABYLON.Mesh> = new Map();

    constructor(private cursorRenderer: TextCursorRenderer) { }

    /**
     * Focuses an input element
     */
    focusElement(inputElement: InputElement): void {
        // Blur previously focused element
        if (this.focusedElement && this.focusedElement !== inputElement) {
            this.blurElement(this.focusedElement);
        }

        this.focusedElement = inputElement;
        inputElement.focused = true;

        // Show focus indicator
        this.showFocusIndicator(inputElement);

        // Start cursor blinking for text inputs
        if (this.isTextInput(inputElement)) {
            this.cursorRenderer.startBlinking(inputElement as TextInput);
        }

        // Mark as touched
        inputElement.validationState.touched = true;
    }

    /**
     * Removes focus from an input element
     */
    blurElement(inputElement: InputElement): void {
        inputElement.focused = false;

        // Hide focus indicator
        this.hideFocusIndicator(inputElement);

        // Stop cursor blinking for text inputs
        if (this.isTextInput(inputElement)) {
            this.cursorRenderer.stopBlinking(inputElement as TextInput);
        }

        if (this.focusedElement === inputElement) {
            this.focusedElement = null;
        }
    }

    /**
     * Handles tab navigation
     */
    handleTabNavigation(forward: boolean = true): void {
        if (this.tabOrder.length === 0) return;

        const currentIndex = this.focusedElement
            ? this.tabOrder.indexOf(this.focusedElement)
            : -1;

        let nextIndex: number;
        if (forward) {
            nextIndex = (currentIndex + 1) % this.tabOrder.length;
        } else {
            nextIndex = currentIndex <= 0 ? this.tabOrder.length - 1 : currentIndex - 1;
        }

        // Skip disabled elements
        let attempts = 0;
        while (this.tabOrder[nextIndex].disabled && attempts < this.tabOrder.length) {
            if (forward) {
                nextIndex = (nextIndex + 1) % this.tabOrder.length;
            } else {
                nextIndex = nextIndex <= 0 ? this.tabOrder.length - 1 : nextIndex - 1;
            }
            attempts++;
        }

        if (!this.tabOrder[nextIndex].disabled) {
            this.focusElement(this.tabOrder[nextIndex]);
        }
    }

    /**
     * Builds the tab order from input elements
     */
    buildTabOrder(inputElements: InputElement[]): void {
        // Sort by tabindex if specified, otherwise by DOM order
        this.tabOrder = inputElements.sort((a, b) => {
            const aTabIndex = a.element.tabindex ?? 0;
            const bTabIndex = b.element.tabindex ?? 0;

            if (aTabIndex !== bTabIndex) {
                return aTabIndex - bTabIndex;
            }

            // Maintain DOM order for same tabindex
            return 0;
        });
    }

    /**
     * Adds an input element to the tab order
     */
    addToTabOrder(inputElement: InputElement): void {
        if (!this.tabOrder.includes(inputElement)) {
            this.tabOrder.push(inputElement);
            this.buildTabOrder(this.tabOrder);
        }
    }

    /**
     * Removes an input element from the tab order
     */
    removeFromTabOrder(inputElement: InputElement): void {
        const index = this.tabOrder.indexOf(inputElement);
        if (index > -1) {
            this.tabOrder.splice(index, 1);
        }

        // Remove focus indicator
        this.disposeFocusIndicator(inputElement);
    }

    /**
     * Shows visual focus indicator
     */
    private showFocusIndicator(inputElement: InputElement): void {
        const elementId = inputElement.element.id || '';
        let indicator = this.focusIndicators.get(elementId);

        if (!indicator) {
            indicator = this.createFocusIndicator(inputElement);
            this.focusIndicators.set(elementId, indicator);
        }

        indicator.isVisible = true;
    }

    /**
     * Hides visual focus indicator
     */
    private hideFocusIndicator(inputElement: InputElement): void {
        const elementId = inputElement.element.id || '';
        const indicator = this.focusIndicators.get(elementId);

        if (indicator) {
            indicator.isVisible = false;
        }
    }

    /**
     * Creates a focus indicator mesh
     */
    private createFocusIndicator(inputElement: InputElement): BABYLON.Mesh {
        const scene = inputElement.mesh.getScene();
        const bounds = inputElement.mesh.getBoundingInfo().boundingBox;
        const width = bounds.maximumWorld.x - bounds.minimumWorld.x;
        const height = bounds.maximumWorld.y - bounds.minimumWorld.y;

        // Create outline indicator
        const indicator = BABYLON.MeshBuilder.CreatePlane(`focusIndicator_${inputElement.element.id}`, {
            width: width + 0.1,
            height: height + 0.1
        }, scene);

        indicator.parent = inputElement.mesh;
        indicator.position.z = -0.02; // Behind the input element

        // Create material with blue outline effect
        const material = new BABYLON.StandardMaterial(`focusIndicatorMaterial_${inputElement.element.id}`, scene);
        material.diffuseColor = new BABYLON.Color3(0.2, 0.4, 1.0);
        material.emissiveColor = new BABYLON.Color3(0.1, 0.2, 0.5);
        material.alpha = 0.3;
        indicator.material = material;

        indicator.isPickable = false;
        indicator.isVisible = false;

        return indicator;
    }

    /**
     * Disposes focus indicator
     */
    private disposeFocusIndicator(inputElement: InputElement): void {
        const elementId = inputElement.element.id || '';
        const indicator = this.focusIndicators.get(elementId);

        if (indicator) {
            indicator.dispose();
            this.focusIndicators.delete(elementId);
        }
    }

    /**
     * Gets the currently focused element
     */
    getFocusedElement(): InputElement | null {
        return this.focusedElement;
    }

    /**
     * Checks if an element is focused
     */
    isFocused(inputElement: InputElement): boolean {
        return this.focusedElement === inputElement;
    }

    /**
     * Helper to check if input is a text input
     */
    private isTextInput(inputElement: InputElement): boolean {
        return inputElement.type === InputType.Text ||
            inputElement.type === InputType.Password ||
            inputElement.type === InputType.Email ||
            inputElement.type === InputType.Number ||
            inputElement.type === InputType.Textarea;
    }

    /**
     * Cleanup all focus resources
     */
    cleanup(): void {
        this.focusIndicators.forEach(indicator => indicator.dispose());
        this.focusIndicators.clear();
        this.tabOrder = [];
        this.focusedElement = null;
    }
}
