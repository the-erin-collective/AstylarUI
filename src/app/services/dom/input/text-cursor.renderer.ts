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
    private readonly CURSOR_WIDTH = 0.02;
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
     * Positions the cursor at the specified character position
     * @param textInput The text input element
     * @param parentMesh The parent mesh containing the text
     * @param textMetrics Text layout metrics for positioning
     */
    positionCursor(
        textInput: TextInput,
        parentMesh: BABYLON.Mesh,
        textMetrics?: { width: number; height: number; lineHeight: number }
    ): void {
        if (!textInput.cursorMesh) return;

        const cursorPos = textInput.cursorPosition;
        const text = textInput.textContent || '';

        // Calculate cursor X position based on text before cursor
        const textBeforeCursor = text.substring(0, cursorPos);
        const cursorX = this.calculateTextWidth(textBeforeCursor, textMetrics);

        // Position cursor relative to parent mesh
        if (parentMesh) {
            const parentBounds = parentMesh.getBoundingInfo().boundingBox;
            const parentWidth = parentBounds.maximumWorld.x - parentBounds.minimumWorld.x;
            const parentHeight = parentBounds.maximumWorld.y - parentBounds.minimumWorld.y;

            // Position cursor at the calculated X position
            // Adjust for padding (assuming 10px padding)
            const padding = 0.1;
            textInput.cursorMesh.position.x = parentMesh.position.x - (parentWidth / 2) + padding + cursorX;
            textInput.cursorMesh.position.y = parentMesh.position.y;
            textInput.cursorMesh.position.z = parentMesh.position.z + 0.02; // Slightly in front
            
            // Ensure cursor is visible and properly parented
            textInput.cursorMesh.isVisible = textInput.focused && textInput.cursorState.visible;
            textInput.cursorMesh.parent = parentMesh;
        }

        // Reset blink cycle when cursor moves
        if (textInput.focused) {
            this.resetBlinkCycle(textInput);
        }
    }

    /**
     * Resets the blink cycle to make cursor visible
     */
    private resetBlinkCycle(textInput: TextInput): void {
        if (textInput.cursorMesh) {
            textInput.cursorMesh.isVisible = true;
            textInput.cursorState.visible = true;

            // Restart blinking
            this.stopBlinking(textInput);
            this.startBlinking(textInput);
        }
    }

    /**
     * Calculates the width of text (simplified - would use actual text metrics in production)
     */
    private calculateTextWidth(text: string, textMetrics?: { width: number; height: number; lineHeight: number }): number {
        // Simplified calculation - assumes monospace font
        // In production, this would use actual font metrics
        const avgCharWidth = 0.08; // Average character width in world units
        return text.length * avgCharWidth;
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
