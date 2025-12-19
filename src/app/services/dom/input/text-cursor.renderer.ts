import { Injectable } from '@angular/core';
import * as BABYLON from '@babylonjs/core';
import { TextInput, CursorState } from '../../../types/input-types';

/**
 * Service responsible for rendering and animating text cursors in input fields
 */
@Injectable({
    providedIn: 'root'
})
export class TextCursorRenderer {
    private blinkIntervals: Map<string, number> = new Map();
    private readonly BLINK_INTERVAL_MS = 530; // Standard cursor blink rate
    private readonly CURSOR_WIDTH = 0.01;
    private readonly CURSOR_COLOR = BABYLON.Color3.Black();

    /**
     * Creates a cursor mesh for a text input
     */
    createCursor(scene: BABYLON.Scene, height: number = 0.8): BABYLON.Mesh {
        const cursor = BABYLON.MeshBuilder.CreateBox(`textCursor_${Date.now()}`, {
            width: this.CURSOR_WIDTH,
            height: height,
            depth: 0.01
        }, scene);

        const material = new BABYLON.StandardMaterial(`cursorMaterial_${Date.now()}`, scene);
        material.diffuseColor = this.CURSOR_COLOR;
        material.emissiveColor = this.CURSOR_COLOR;
        material.disableLighting = true;
        material.freeze(); // Freeze material for better performance
        cursor.material = material;

        cursor.isVisible = true;
        cursor.isPickable = false; // Cursor should not interfere with picking
        cursor.renderingGroupId = 2; // Ensure cursor renders in front of text

        return cursor;
    }

    /**
     * Starts the cursor blinking animation
     */
    startBlinking(textInput: TextInput): void {
        if (!textInput.cursorMesh) return;

        // Stop any existing blink animation
        this.stopBlinking(textInput);

        // Ensure cursor is visible initially
        textInput.cursorMesh.isVisible = true;
        textInput.cursorState.visible = true;

        // Create blink interval
        const intervalId = window.setInterval(() => {
            if (textInput.cursorMesh) {
                textInput.cursorState.visible = !textInput.cursorState.visible;
                textInput.cursorMesh.isVisible = textInput.cursorState.visible;
            }
        }, this.BLINK_INTERVAL_MS);

        this.blinkIntervals.set(textInput.element.id || '', intervalId);
    }

    /**
     * Stops the cursor blinking animation
     */
    stopBlinking(textInput: TextInput): void {
        const elementId = textInput.element.id || '';
        const intervalId = this.blinkIntervals.get(elementId);

        if (intervalId !== undefined) {
            window.clearInterval(intervalId);
            this.blinkIntervals.delete(elementId);
        }

        // Hide cursor when not blinking
        if (textInput.cursorMesh) {
            textInput.cursorMesh.isVisible = false;
            textInput.cursorState.visible = false;
        }
    }

    /**
     * Updates cursor visibility
     */
    updateCursorVisibility(textInput: TextInput, visible: boolean): void {
        if (textInput.cursorMesh) {
            textInput.cursorMesh.isVisible = visible && textInput.focused;
            textInput.cursorState.visible = visible;
        }
    }

    /**
     * Cleanup cursor resources
     */
    disposeCursor(textInput: TextInput): void {
        this.stopBlinking(textInput);

        if (textInput.cursorMesh) {
            textInput.cursorMesh.dispose();
            textInput.cursorMesh = undefined;
        }
    }
}
