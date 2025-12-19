import { Injectable } from '@angular/core';
import * as BABYLON from '@babylonjs/core';
import { DOMElement } from '../../../types/dom-element';
import { TextInput, InputType, CursorState, ValidationState, CursorDirection } from '../../../types/input-types';
import { TextCursorRenderer } from './text-cursor.renderer';
import { TextRenderingService } from '../../text/text-rendering.service';
import { StyleRule } from '../../../types/style-rule';
import { BabylonRender } from '../interfaces/render.types';
import { BabylonMeshService } from '../../babylon-mesh.service';

/**
 * Service responsible for managing text input fields
 */
@Injectable({
    providedIn: 'root'
})
export class TextInputManager {
    constructor(
        private cursorRenderer: TextCursorRenderer,
        private textRenderingService: TextRenderingService,
        private babylonMeshService: BabylonMeshService
    ) { }

    /**
     * Creates a text input element
     */
    createTextInput(
        element: DOMElement,
        render: BabylonRender,
        parentMesh: BABYLON.Mesh,
        style: StyleRule,
        worldDimensions: { width: number; height: number }
    ): TextInput {
        // Create input field background
        const inputMesh = this.createInputBackground(element, render, style, worldDimensions);

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
            style, // Store style for text rendering

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

        // Create text mesh if there's initial content or placeholder
        if ((textInput.textContent || textInput.placeholder) && render.scene) {
            this.updateTextDisplay(textInput, render, style);
        }

        return textInput;
    }

    /**
     * Handles focus event - hides placeholder
     */
    handleFocus(textInput: TextInput): void {
        // If showing placeholder (no actual value), hide the text mesh
        if (!textInput.textContent && textInput.placeholder && textInput.textMesh) {
            textInput.textMesh.isVisible = false;
        }
    }

    /**
     * Handles blur event - shows placeholder if empty
     */
    handleBlur(textInput: TextInput): void {
        // If no content, show placeholder again
        if (!textInput.textContent && textInput.placeholder && textInput.textMesh) {
            textInput.textMesh.isVisible = true;
        }
    }

    /**
     * Updates the text display mesh
     */
    private updateTextDisplay(textInput: TextInput, render: BabylonRender, style: StyleRule): void {
        // Dispose existing text mesh
        if (textInput.textMesh) {
            textInput.textMesh.dispose();
            textInput.textMesh = undefined;
        }

        const textToRender = textInput.value || textInput.placeholder || '';
        if (!textToRender) return;

        // Determine style (placeholder vs normal)
        const textStyle = { ...style };
        if (!textStyle.color) textStyle.color = '#000000'; // Default to black

        if (!textInput.value && textInput.placeholder) {
            textStyle.color = '#888888'; // Placeholder color
            // Ensure font style is present
            if (!textStyle.fontSize) textStyle.fontSize = '16px';
            if (!textStyle.fontFamily) textStyle.fontFamily = 'Arial';
        }

        try {
            // Get texture from service
            const texture = this.textRenderingService.renderTextToTexture(
                textInput.element,
                textToRender,
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
            const textMesh = this.babylonMeshService.createTextMesh(
                `text_${textInput.element.id}`,
                texture,
                textureWidth,
                textureHeight
            );

            textMesh.parent = textInput.mesh;
            textMesh.position.z = -0.15; // Slightly in front
            textMesh.isPickable = false;
            textMesh.renderingGroupId = 2; // Ensure it renders on top

            // Align text to left edge
            // Calculate offset based on texture width and input width
            const inputWidth = textInput.mesh.getBoundingInfo().boundingBox.extendSize.x * 2;
            // For left alignment: position text with its left edge near input's left edge
            // Inverting the sign because the coordinate system is opposite of expected
            const padding = 1.5; // Aggressive left padding
            textMesh.position.x = (inputWidth / 2) - (textureWidth / 2) - padding;

            textInput.textMesh = textMesh;

        } catch (error) {
            console.error('Error creating text input mesh:', error);
        }
    }

    /**
     * Creates the input field background mesh
     */
    private createInputBackground(
        element: DOMElement,
        render: BabylonRender,
        style: StyleRule,
        worldDimensions: { width: number; height: number }
    ): BABYLON.Mesh {
        // Use calculated world dimensions directly
        const width = worldDimensions.width;
        const height = worldDimensions.height;

        const inputMesh = BABYLON.MeshBuilder.CreatePlane(`input_${element.id}`, {
            width,
            height,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE // Ensure visibility from both sides
        }, render.scene);

        // Create material with CSS background color
        const material = new BABYLON.StandardMaterial(`inputMaterial_${element.id}`, render.scene);

        // Apply CSS background color instead of hard-coded white
        const bgColor = this.parseColor(style?.background);
        material.diffuseColor = bgColor;
        material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        material.backFaceCulling = false; // Ensure visibility

        inputMesh.material = material;
        inputMesh.isPickable = true; // Enable clicking

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
    private calculateCursorHeight(style: StyleRule, render: BabylonRender): number {
        const fontSizePx = this.parseSize(style.fontSize) || 16;
        const scale = render.actions.camera.getPixelToWorldScale();
        return fontSizePx * scale * 1.2; // Slightly taller than font
    }

    /**
     * Moves the cursor in the specified direction
     */
    moveCursor(textInput: TextInput, direction: CursorDirection, isShiftKey: boolean = false): void {
        const textLength = textInput.textContent.length;
        let newPosition = textInput.cursorPosition;

        switch (direction) {
            case CursorDirection.Left:
                newPosition = Math.max(0, textInput.cursorPosition - 1);
                break;
            case CursorDirection.Right:
                newPosition = Math.min(textLength, textInput.cursorPosition + 1);
                break;
            case CursorDirection.Home:
                newPosition = 0;
                break;
            case CursorDirection.End:
                newPosition = textLength;
                break;
        }

        // Handle selection with shift key
        if (isShiftKey) {
            if (!textInput.cursorState.selectionActive) {
                textInput.cursorState.selectionActive = true;
                textInput.selectionStart = textInput.cursorPosition;
            }
            textInput.selectionEnd = newPosition;
        } else {
            // Clear selection when moving without shift
            textInput.cursorState.selectionActive = false;
            textInput.selectionStart = newPosition;
            textInput.selectionEnd = newPosition;
        }

        textInput.cursorPosition = newPosition;
        textInput.cursorState.position = newPosition;
    }

    /**
     * Inserts text at the current cursor position
     */
    insertTextAtCursor(textInput: TextInput, text: string, render: BabylonRender, style: StyleRule): void {
        // Check max length
        if (textInput.maxLength && textInput.textContent.length + text.length > textInput.maxLength) {
            const allowedLength = textInput.maxLength - textInput.textContent.length;
            if (allowedLength <= 0) return;
            text = text.substring(0, allowedLength);
        }

        // Handle selection replacement
        let start = textInput.cursorPosition;
        let end = textInput.cursorPosition;

        if (textInput.cursorState.selectionActive) {
            start = Math.min(textInput.selectionStart, textInput.selectionEnd);
            end = Math.max(textInput.selectionStart, textInput.selectionEnd);
        }

        // Insert text
        const before = textInput.textContent.substring(0, start);
        const after = textInput.textContent.substring(end);
        textInput.textContent = before + text + after;
        textInput.value = textInput.textContent;

        // Move cursor after inserted text
        textInput.cursorPosition = start + text.length;
        textInput.cursorState.position = textInput.cursorPosition;

        // Clear selection
        textInput.cursorState.selectionActive = false;
        textInput.selectionStart = textInput.cursorPosition;
        textInput.selectionEnd = textInput.cursorPosition;

        // Mark as dirty
        textInput.validationState.dirty = true;

        // Update display
        this.updateTextDisplay(textInput, render, style);
    }

    /**
     * Deletes character(s) at or around cursor
     * @param direction -1 for backspace (delete before), 1 for delete (delete after)
     */
    deleteCharacter(textInput: TextInput, direction: number, render: BabylonRender, style: StyleRule): void {
        // Handle selection deletion
        if (textInput.cursorState.selectionActive) {
            const start = Math.min(textInput.selectionStart, textInput.selectionEnd);
            const end = Math.max(textInput.selectionStart, textInput.selectionEnd);

            const before = textInput.textContent.substring(0, start);
            const after = textInput.textContent.substring(end);
            textInput.textContent = before + after;
            textInput.value = textInput.textContent;

            textInput.cursorPosition = start;
            textInput.cursorState.position = start;
            textInput.cursorState.selectionActive = false;
            textInput.selectionStart = start;
            textInput.selectionEnd = start;
        } else {
            // Single character deletion
            if (direction < 0 && textInput.cursorPosition > 0) {
                // Backspace
                const before = textInput.textContent.substring(0, textInput.cursorPosition - 1);
                const after = textInput.textContent.substring(textInput.cursorPosition);
                textInput.textContent = before + after;
                textInput.value = textInput.textContent;
                textInput.cursorPosition--;
                textInput.cursorState.position = textInput.cursorPosition;
            } else if (direction > 0 && textInput.cursorPosition < textInput.textContent.length) {
                // Delete
                const before = textInput.textContent.substring(0, textInput.cursorPosition);
                const after = textInput.textContent.substring(textInput.cursorPosition + 1);
                textInput.textContent = before + after;
                textInput.value = textInput.textContent;
            }
        }

        // Mark as dirty
        textInput.validationState.dirty = true;

        // Update display
        this.updateTextDisplay(textInput, render, style);
    }

    /**
     * Updates the cursor mesh position based on current cursor position
     */
    updateCursorPosition(textInput: TextInput, render: BabylonRender, style: StyleRule): void {
        if (!textInput.cursorMesh) return;

        // Calculate cursor X position based on text width up to cursor
        const textBeforeCursor = textInput.textContent.substring(0, textInput.cursorPosition);

        // Get font metrics to calculate text width
        const fontSizePx = this.parseSize(style.fontSize) || 16;
        const fontFamily = style.fontFamily || 'Arial';

        // Estimate character width (this is approximate, canvas measurement would be more accurate)
        const avgCharWidth = fontSizePx * 0.6; // Approximate for most fonts
        const textWidthPx = textBeforeCursor.length * avgCharWidth;

        const scale = render.actions.camera.getPixelToWorldScale();
        const textWidth = textWidthPx * scale;

        // Position cursor relative to input mesh
        const inputWidth = textInput.mesh.getBoundingInfo().boundingBox.extendSize.x * 2;
        const padding = 1.5; // Match text padding

        // Cursor X position: start from left edge + text width
        textInput.cursorMesh.position.x = (inputWidth / 2) - padding - textWidth;
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
