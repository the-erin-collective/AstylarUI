import { Injectable } from '@angular/core';
import * as BABYLON from '@babylonjs/core';
import { DOMElement } from '../../../types/dom-element';
import { TextInput, InputType, CursorState, ValidationState, CursorDirection } from '../../../types/input-types';
import { TextCursorRenderer } from './text-cursor.renderer';
import { TextRenderingService } from '../../text/text-rendering.service';
import { StyleRule } from '../../../types/style-rule';
import { BabylonRender } from '../interfaces/render.types';

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
        // TODO: Re-enable cursor creation once text input is fully implemented
        // const cursorHeight = this.calculateCursorHeight(style, render);
        // if (render.scene) {
        //     textInput.cursorMesh = this.cursorRenderer.createCursor(render.scene, cursorHeight);
        //     textInput.cursorMesh.parent = inputMesh;
        // }

        // Create text mesh if there's initial content or placeholder
        if ((textInput.textContent || textInput.placeholder) && render.scene) {
            this.updateTextDisplay(textInput, render.scene, style);
        }

        return textInput;
    }

    /**
     * Updates the text display mesh
     */
    private updateTextDisplay(textInput: TextInput, scene: BABYLON.Scene, style: StyleRule): void {
        // Dispose existing text mesh
        if (textInput.textMesh) {
            textInput.textMesh.dispose();
            textInput.textMesh = undefined;
        }

        const textToRender = textInput.value || textInput.placeholder || '';
        if (!textToRender) return;

        // Determine style (placeholder vs normal)
        const textStyle = { ...style };
        if (!textInput.value && textInput.placeholder) {
            textStyle.color = '#888888'; // Placeholder color
            // Ensure font style is present
            if (!textStyle.fontSize) textStyle.fontSize = '16px';
            if (!textStyle.fontFamily) textStyle.fontFamily = 'Arial';
        }

        try {
            // Get texture from service
            // We use the mesh width as a rough guide for max width, but converted to pixels?
            // For now, let's pass undefined for maxWidth to avoid wrapping issues until we have precise pixel width
            const texture = this.textRenderingService.renderTextToTexture(
                textInput.element,
                textToRender,
                textStyle
            );

            // Create plane for text
            // Use the input mesh dimensions
            const width = textInput.mesh.getBoundingInfo().boundingBox.extendSize.x * 2;
            const height = textInput.mesh.getBoundingInfo().boundingBox.extendSize.y * 2;

            const textMesh = BABYLON.MeshBuilder.CreatePlane(`text_${textInput.element.id}`, {
                width: width,
                height: height
            }, scene);

            const material = new BABYLON.StandardMaterial(`textMaterial_${textInput.element.id}`, scene);
            material.diffuseTexture = texture;
            material.diffuseTexture.hasAlpha = true;
            material.useAlphaFromDiffuseTexture = true;
            material.emissiveColor = BABYLON.Color3.White();
            material.disableLighting = true;

            textMesh.material = material;

            // Parent to input mesh and offset slightly
            textMesh.parent = textInput.mesh;
            textMesh.position.z = -0.01; // Slightly in front

            textInput.textMesh = textMesh;

        } catch (error) {
            console.error('Error rendering text:', error);
        }
    }

    // ... (insertTextAtCursor, deleteCharacter, moveCursor, selectText, clearSelection, deleteSelection, renderSelection methods remain unchanged for now)

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

        // Create material
        const material = new BABYLON.StandardMaterial(`inputMaterial_${element.id}`, render.scene);
        material.diffuseColor = BABYLON.Color3.White();
        material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        material.backFaceCulling = false; // Ensure visibility
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
    private calculateCursorHeight(style: StyleRule, render: BabylonRender): number {
        const fontSizePx = this.parseSize(style.fontSize) || 16;
        const scale = render.actions.camera.getPixelToWorldScale();
        return fontSizePx * scale * 1.2; // Slightly taller than font
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
