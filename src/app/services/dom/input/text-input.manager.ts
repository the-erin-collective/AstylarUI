import { Injectable } from '@angular/core';
import * as BABYLON from '@babylonjs/core';
import { DOMElement } from '../../../types/dom-element';
import { TextInput, InputType, CursorState, ValidationState, CursorDirection } from '../../../types/input-types';
import { TextCursorRenderer } from './text-cursor.renderer';
import { TextRenderingService } from '../../text/text-rendering.service';
import { TextSelectionService } from '../../text/text-selection.service';
import { TextCanvasRendererService } from '../../text/text-canvas-renderer.service';
import { StyleRule } from '../../../types/style-rule';
import { BabylonRender } from '../interfaces/render.types';
import { BabylonMeshService } from '../../babylon-mesh.service';
import { TextLayoutMetrics, TextStyleProperties } from '../../../types/text-rendering';

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
        private textSelectionService: TextSelectionService,
        private textCanvasRenderer: TextCanvasRendererService,
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

        // Always create layout metrics, even for empty inputs (needed for cursor positioning)
        if (render.scene) {
            // Use placeholder or a single space for layout calculation if no content
            const layoutText = textInput.textContent || textInput.placeholder || ' ';
            const textStyleProps = this.parseTextStyle(style);
            console.log('[TextInputManager] Creating initial layout metrics for:', layoutText);
            textInput.textLayoutMetrics = this.textCanvasRenderer.calculateLayoutMetrics(
                layoutText,
                textStyleProps
            );
            console.log('[TextInputManager] Initial layout metrics:', textInput.textLayoutMetrics);
        }

        // Create text mesh if there's initial content or placeholder
        if ((textInput.textContent || textInput.placeholder) && render.scene) {
            this.updateTextDisplay(textInput, render, style);
        }

        return textInput;
    }

    /**
     * Handles focus event - hides placeholder and creates cursor
     */
    handleFocus(textInput: TextInput, render: BabylonRender, style: StyleRule): void {
        console.log('[TextInputManager] handleFocus called for:', textInput.element.id);
        
        // If showing placeholder (no actual value), hide the text mesh
        if (!textInput.textContent && textInput.placeholder && textInput.textMesh) {
            textInput.textMesh.isVisible = false;
        }

        // If the input is empty and a placeholder was shown, recalculate layout
        // metrics for an empty string so the cursor starts at the left (0)
        if (!textInput.textContent && textInput.placeholder && render.scene) {
            const textStyleProps = this.parseTextStyle(style);
            textInput.textLayoutMetrics = this.textCanvasRenderer.calculateLayoutMetrics('', textStyleProps);
            console.log('[TextInputManager] Recalculated empty layout metrics for focus');
            // Also compute a texture width that matches the empty layout so cursor
            // positioning uses consistent units (avoid using the placeholder texture width)
            try {
                const emptyTexture = this.textRenderingService.renderTextToTexture(
                    textInput.element,
                    '',
                    style
                );
                const size = emptyTexture.getSize();
                const scale = render.actions.camera.getPixelToWorldScale();
                textInput.textureWidth = size.width * scale;
                // We intentionally do not create a visible text mesh for empty content
                console.log('[TextInputManager] Computed empty texture width for cursor positioning:', textInput.textureWidth);
            } catch (err) {
                console.warn('[TextInputManager] Failed to compute empty texture width:', err);
                // Fallback to 0 so left-edge calculations behave reasonably
                textInput.textureWidth = 0;
            }
        }

        // Create cursor mesh if it doesn't exist and we have layout metrics
        if (!textInput.cursorMesh && render.scene && textInput.textLayoutMetrics && textInput.textureWidth !== undefined) {
            console.log('[TextInputManager] Creating cursor mesh with scale:', render.actions.camera.getPixelToWorldScale());
            const textStyle = this.parseTextStyle(style);
            textInput.cursorMesh = this.textSelectionService.createTextCursor(
                textInput.cursorPosition,
                textInput.textLayoutMetrics,
                textInput.mesh,
                render.scene,
                render.actions.camera.getPixelToWorldScale(),
                textStyle,
                textInput.textureWidth || 0
            );
        }

        // Show cursor
        if (textInput.cursorMesh) {
            textInput.cursorMesh.isVisible = true;
            textInput.cursorState.visible = true;
            console.log('[TextInputManager] Cursor made visible');
        }
    }

    /**
     * Handles blur event - shows placeholder if empty and hides cursor
     */
    handleBlur(textInput: TextInput): void {
        // If no content, show placeholder again
        if (!textInput.textContent && textInput.placeholder && textInput.textMesh) {
            textInput.textMesh.isVisible = true;
        }

        // Hide cursor
        if (textInput.cursorMesh) {
            textInput.cursorMesh.isVisible = false;
            textInput.cursorState.visible = false;
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
            // Calculate layout metrics for cursor and selection positioning
            const textStyleProps = this.parseTextStyle(textStyle);
            console.log('[TextInputManager] Calculating layout metrics for text:', textToRender);
            console.log('[TextInputManager] Text style props:', textStyleProps);
            textInput.textLayoutMetrics = this.textCanvasRenderer.calculateLayoutMetrics(
                textToRender,
                textStyleProps
            );
            console.log('[TextInputManager] Layout metrics calculated:', textInput.textLayoutMetrics);

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

            // Rotate the text mesh 180 degrees around the Z axis to fix horizontal flipping without affecting vertical orientation
            // Only apply this rotation to text input meshes
            textMesh.rotation.z = Math.PI;

            // Align text to left edge
            // Calculate offset based on texture width and input width
            const inputWidth = textInput.mesh.getBoundingInfo().boundingBox.extendSize.x * 2;
            // For left alignment: position text with its left edge near input's left edge
            // Use world units for padding (scale-aware)
            const padding = 1.5 * scale; // Left padding in world units
            textMesh.position.x = (inputWidth / 2) - (textureWidth / 2) - padding;

            // Store world-space texture width for cursor positioning
            textInput.textureWidth = textureWidth;
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
     * Updates cursor position after movement (without render/style parameters)
     */
    updateCursorAfterMovement(textInput: TextInput, render: BabylonRender, style: StyleRule): void {
        if (!textInput.cursorMesh) return;

        // Use the provided render to compute correct pixel-to-world scale
        this.updateCursorPosition(textInput, render, style);
        this.updateSelectionHighlight(textInput, render, style);
    }

    /**
     * Updates or creates text selection highlighting
     */
    updateSelectionHighlight(textInput: TextInput, render: BabylonRender, style: StyleRule): void {
        // Remove existing selection meshes
        if (textInput.selectionMeshes) {
            this.textSelectionService.disposeSelectionMeshes(textInput.selectionMeshes);
            textInput.selectionMeshes = [];
        }

        // Only create selection if there's an active selection and we have layout metrics
        if (!textInput.cursorState.selectionActive || 
            textInput.selectionStart === textInput.selectionEnd ||
            !textInput.textLayoutMetrics) {
            return;
        }

        // Use text selection service for accurate selection highlighting
        textInput.selectionMeshes = this.textSelectionService.createSelectionHighlight(
            textInput.selectionStart,
            textInput.selectionEnd,
            textInput.textLayoutMetrics,
            textInput.mesh,
            render.scene!,
            render.actions.camera.getPixelToWorldScale()
        );
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
        
        // Update cursor position and selection
        this.updateCursorPosition(textInput, render, style);
        this.updateSelectionHighlight(textInput, render, style);
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
        
        // Update cursor position and selection
        this.updateCursorPosition(textInput, render, style);
        this.updateSelectionHighlight(textInput, render, style);
    }

    /**
     * Updates the cursor mesh position based on current cursor position
     */
    updateCursorPosition(textInput: TextInput, render: BabylonRender, style: StyleRule): void {
        if (!textInput.textLayoutMetrics) return;

        // Create cursor if it doesn't exist yet and textureWidth is available
        if (!textInput.cursorMesh && render.scene && textInput.textureWidth !== undefined) {
            const textStyle = this.parseTextStyle(style);
            textInput.cursorMesh = this.textSelectionService.createTextCursor(
                textInput.cursorPosition,
                textInput.textLayoutMetrics,
                textInput.mesh,
                render.scene,
                render.actions.camera.getPixelToWorldScale(),
                textStyle,
                textInput.textureWidth
            );
        }

        if (!textInput.cursorMesh) return;

        // Use text selection service for accurate cursor positioning
        this.textSelectionService.updateCursorPosition(
            textInput.cursorMesh,
            textInput.cursorPosition,
            textInput.textLayoutMetrics,
            render.actions.camera.getPixelToWorldScale(),
            textInput.textureWidth || 0
        );
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
     * Converts StyleRule to TextStyleProperties
     */
    private parseTextStyle(style: StyleRule): TextStyleProperties {
        // Helper function to safely cast font weight
        const parseFontWeight = (weight: string | undefined): TextStyleProperties['fontWeight'] => {
            if (!weight) return 'normal';
            const numWeight = parseInt(weight);
            if (!isNaN(numWeight)) return numWeight as any;
            return weight as TextStyleProperties['fontWeight'];
        };

        // Helper function to safely cast font style
        const parseFontStyle = (fontStyle: string | undefined): TextStyleProperties['fontStyle'] => {
            if (!fontStyle) return 'normal';
            if (['normal', 'italic', 'oblique'].includes(fontStyle)) {
                return fontStyle as TextStyleProperties['fontStyle'];
            }
            return 'normal';
        };

        // Helper function to safely cast text decoration
        const parseTextDecoration = (decoration: string | undefined): TextStyleProperties['textDecoration'] => {
            if (!decoration) return 'none';
            if (['none', 'underline', 'overline', 'line-through'].includes(decoration)) {
                return decoration as TextStyleProperties['textDecoration'];
            }
            return 'none';
        };

        return {
            fontFamily: style.fontFamily || 'Arial',
            fontSize: this.parseSize(style.fontSize) || 16,
            fontWeight: parseFontWeight(style.fontWeight),
            fontStyle: parseFontStyle(style.fontStyle),
            color: style.color || '#000000',
            textAlign: (style.textAlign as any) || 'left',
            verticalAlign: 'baseline',
            lineHeight: parseFloat(style.lineHeight as string) || 1.2,
            letterSpacing: this.parseSize(style.letterSpacing) || 0,
            wordSpacing: this.parseSize(style.wordSpacing) || 0,
            whiteSpace: 'normal',
            wordWrap: 'normal',
            textOverflow: 'clip',
            textDecoration: parseTextDecoration(style.textDecoration),
            textTransform: (style.textTransform as any) || 'none'
        };
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

        if (textInput.selectionMeshes) {
            this.textSelectionService.disposeSelectionMeshes(textInput.selectionMeshes);
        }

        if (textInput.cursorMesh) {
            textInput.cursorMesh.dispose();
        }

        if (textInput.mesh) {
            textInput.mesh.dispose();
        }
    }
}
