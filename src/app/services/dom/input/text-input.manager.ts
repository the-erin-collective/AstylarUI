import { Injectable } from '@angular/core';
import * as BABYLON from '@babylonjs/core';
import { DOMElement } from '../../../types/dom-element';
import { TextInput, InputType, CursorState, ValidationState, CursorDirection } from '../../../types/input-types';
import { TextCursorRenderer } from './text-cursor.renderer';
import { TextRenderingService } from '../../text/text-rendering.service';
import { StyleRule } from '../../../types/style-rule';

/**
 * Service responsible for managing text input fields
 */
@Injectable({
    providedIn: 'root'
})
export class TextInputManager {
    constructor(
        private cursorRenderer: TextCursorRenderer,
        private textRenderingService: TextRenderingService
    ) { }

    /**
     * Creates a text input element
     */
    createTextInput(
        element: DOMElement,
        scene: BABYLON.Scene,
        parentMesh: BABYLON.Mesh,
        style: StyleRule
    ): TextInput {
        // Create input field background
        const inputMesh = this.createInputBackground(element, scene, style);

        // Initialize cursor state
        const cursorState: CursorState = {
            position: 0,
            visible: false,
            selectionActive: false,
            selectionStart: 0,
            selectionEnd: 0
        };

        // Initialize validation state
        const validationState: ValidationState = {
            valid: true,
            errors: [],
            touched: false,
            dirty: false
        };

        // Create text input object
        const textInput: TextInput = {
            element,
            type: this.determineInputType(element),
            value: element.value || '',
            textContent: element.value || '',
            cursorPosition: 0,
            selectionStart: 0,
            selectionEnd: 0,
            focused: false,
            disabled: element.disabled || false,
            required: element.required || false,
            validationRules: [],
            validationState,
            mesh: inputMesh,
            placeholder: element.placeholder,
            maxLength: element.maxLength,
            cursorState
        };

        // Create cursor mesh
        const cursorHeight = this.calculateCursorHeight(style);
        textInput.cursorMesh = this.cursorRenderer.createCursor(scene, cursorHeight);
        textInput.cursorMesh.parent = inputMesh;

        // Create text mesh if there's initial content
        if (textInput.textContent) {
            this.updateTextDisplay(textInput, scene, style);
        }

        return textInput;
    }

    /**
     * Inserts text at the current cursor position
     */
    insertTextAtCursor(textInput: TextInput, text: string, scene: BABYLON.Scene, style: StyleRule): void {
        if (textInput.disabled) return;

        // Check max length
        if (textInput.maxLength && textInput.textContent.length >= textInput.maxLength) {
            return;
        }

        // Handle selection - replace selected text
        if (textInput.selectionStart !== textInput.selectionEnd) {
            this.deleteSelection(textInput);
        }

        // Insert text at cursor position
        const before = textInput.textContent.substring(0, textInput.cursorPosition);
        const after = textInput.textContent.substring(textInput.cursorPosition);
        textInput.textContent = before + text + after;
        textInput.value = textInput.textContent;

        // Move cursor forward
        textInput.cursorPosition += text.length;

        // Update display
        this.updateTextDisplay(textInput, scene, style);
        this.cursorRenderer.positionCursor(textInput, textInput.mesh);

        // Mark as dirty
        textInput.validationState.dirty = true;
    }

    /**
     * Deletes character(s) based on direction
     * @param direction -1 for backspace, 1 for delete
     */
    deleteCharacter(textInput: TextInput, direction: number, scene: BABYLON.Scene, style: StyleRule): void {
        if (textInput.disabled) return;

        // Handle selection - delete selected text
        if (textInput.selectionStart !== textInput.selectionEnd) {
            this.deleteSelection(textInput);
            this.updateTextDisplay(textInput, scene, style);
            this.cursorRenderer.positionCursor(textInput, textInput.mesh);
            return;
        }

        // Delete single character
        if (direction === -1 && textInput.cursorPosition > 0) {
            // Backspace
            const before = textInput.textContent.substring(0, textInput.cursorPosition - 1);
            const after = textInput.textContent.substring(textInput.cursorPosition);
            textInput.textContent = before + after;
            textInput.value = textInput.textContent;
            textInput.cursorPosition--;
        } else if (direction === 1 && textInput.cursorPosition < textInput.textContent.length) {
            // Delete
            const before = textInput.textContent.substring(0, textInput.cursorPosition);
            const after = textInput.textContent.substring(textInput.cursorPosition + 1);
            textInput.textContent = before + after;
            textInput.value = textInput.textContent;
        }

        // Update display
        this.updateTextDisplay(textInput, scene, style);
        this.cursorRenderer.positionCursor(textInput, textInput.mesh);

        // Mark as dirty
        textInput.validationState.dirty = true;
    }

    /**
     * Moves the cursor in the specified direction
     */
    moveCursor(textInput: TextInput, direction: CursorDirection, extend: boolean = false): void {
        const oldPosition = textInput.cursorPosition;

        switch (direction) {
            case CursorDirection.Left:
                if (textInput.cursorPosition > 0) {
                    textInput.cursorPosition--;
                }
                break;
            case CursorDirection.Right:
                if (textInput.cursorPosition < textInput.textContent.length) {
                    textInput.cursorPosition++;
                }
                break;
            case CursorDirection.Home:
                textInput.cursorPosition = 0;
                break;
            case CursorDirection.End:
                textInput.cursorPosition = textInput.textContent.length;
                break;
        }

        // Handle text selection with Shift key
        if (extend) {
            if (!textInput.cursorState.selectionActive) {
                textInput.cursorState.selectionActive = true;
                textInput.selectionStart = oldPosition;
            }
            textInput.selectionEnd = textInput.cursorPosition;
        } else {
            // Clear selection
            this.clearSelection(textInput);
        }

        // Update cursor position
        this.cursorRenderer.positionCursor(textInput, textInput.mesh);
    }

    /**
     * Selects text between start and end positions
     */
    selectText(textInput: TextInput, start: number, end: number, scene: BABYLON.Scene): void {
        textInput.selectionStart = Math.max(0, Math.min(start, textInput.textContent.length));
        textInput.selectionEnd = Math.max(0, Math.min(end, textInput.textContent.length));
        textInput.cursorState.selectionActive = textInput.selectionStart !== textInput.selectionEnd;

        // Update selection highlight
        this.renderSelection(textInput, scene);
    }

    /**
     * Clears text selection
     */
    clearSelection(textInput: TextInput): void {
        textInput.selectionStart = textInput.cursorPosition;
        textInput.selectionEnd = textInput.cursorPosition;
        textInput.cursorState.selectionActive = false;

        // Remove selection mesh
        if (textInput.selectionMesh) {
            textInput.selectionMesh.dispose();
            textInput.selectionMesh = undefined;
        }
    }

    /**
     * Deletes selected text
     */
    private deleteSelection(textInput: TextInput): void {
        const start = Math.min(textInput.selectionStart, textInput.selectionEnd);
        const end = Math.max(textInput.selectionStart, textInput.selectionEnd);

        const before = textInput.textContent.substring(0, start);
        const after = textInput.textContent.substring(end);
        textInput.textContent = before + after;
        textInput.value = textInput.textContent;
        textInput.cursorPosition = start;

        this.clearSelection(textInput);
    }

    /**
     * Updates the text display mesh
     */
    private updateTextDisplay(textInput: TextInput, scene: BABYLON.Scene, style: StyleRule): void {
        // Dispose old text mesh
        if (textInput.textMesh) {
            textInput.textMesh.dispose();
            textInput.textMesh = undefined;
        }

        // Create new text mesh if there's content
        if (textInput.textContent) {
            // This would integrate with TextRenderingService
            // For now, create a simple text plane
            const textPlane = BABYLON.MeshBuilder.CreatePlane(`textContent_${textInput.element.id}`, {
                width: 2,
                height: 0.5
            }, scene);

            textPlane.parent = textInput.mesh;
            textPlane.position.x = 0;
            textPlane.position.y = 0;
            textPlane.position.z = 0.01;

            textInput.textMesh = textPlane;
        }
    }

    /**
     * Renders text selection highlight
     */
    private renderSelection(textInput: TextInput, scene: BABYLON.Scene): void {
        // Remove existing selection mesh
        if (textInput.selectionMesh) {
            textInput.selectionMesh.dispose();
        }

        if (!textInput.cursorState.selectionActive) return;

        // Create selection highlight mesh
        const start = Math.min(textInput.selectionStart, textInput.selectionEnd);
        const end = Math.max(textInput.selectionStart, textInput.selectionEnd);
        const selectionWidth = (end - start) * 0.08; // Simplified width calculation

        const selectionMesh = BABYLON.MeshBuilder.CreatePlane(`selection_${textInput.element.id}`, {
            width: selectionWidth,
            height: 0.6
        }, scene);

        const material = new BABYLON.StandardMaterial(`selectionMaterial_${textInput.element.id}`, scene);
        material.diffuseColor = new BABYLON.Color3(0.4, 0.6, 1.0); // Light blue
        material.alpha = 0.3;
        selectionMesh.material = material;

        selectionMesh.parent = textInput.mesh;
        selectionMesh.position.z = 0.005; // Behind text, in front of background

        textInput.selectionMesh = selectionMesh;
    }

    /**
     * Creates the input field background mesh
     */
    private createInputBackground(element: DOMElement, scene: BABYLON.Scene, style: StyleRule): BABYLON.Mesh {
        const width = this.parseSize(style.width) || 2;
        const height = this.parseSize(style.height) || 0.5;

        const inputMesh = BABYLON.MeshBuilder.CreatePlane(`input_${element.id}`, {
            width,
            height
        }, scene);

        // Create material
        const material = new BABYLON.StandardMaterial(`inputMaterial_${element.id}`, scene);
        material.diffuseColor = BABYLON.Color3.White();
        material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        inputMesh.material = material;

        return inputMesh;
    }

    /**
     * Determines the input type from element
     */
    private determineInputType(element: DOMElement): InputType {
        const inputType = element.inputType?.toLowerCase();

        switch (inputType) {
            case 'password': return InputType.Password;
            case 'email': return InputType.Email;
            case 'number': return InputType.Number;
            case 'textarea': return InputType.Textarea;
            default: return InputType.Text;
        }
    }

    /**
     * Calculates cursor height based on font size
     */
    private calculateCursorHeight(style: StyleRule): number {
        const fontSize = this.parseSize(style.fontSize) || 0.3;
        return fontSize * 1.2; // Slightly taller than font
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
     * Cleanup text input resources
     */
    disposeTextInput(textInput: TextInput): void {
        this.cursorRenderer.disposeCursor(textInput);

        if (textInput.textMesh) {
            textInput.textMesh.dispose();
        }

        if (textInput.selectionMesh) {
            textInput.selectionMesh.dispose();
        }

        if (textInput.mesh) {
            textInput.mesh.dispose();
        }
    }
}
