import { Injectable } from '@angular/core';
import * as BABYLON from '@babylonjs/core';
import { TextLayoutMetrics, TextCharacterMetrics, TextStyleProperties } from '../../types/text-rendering';
import { BabylonMeshService } from '../babylon-mesh.service';

/**
 * Service for creating and managing text selection highlighting
 * Works with existing text layout metrics to provide accurate selection rendering
 */
@Injectable({
  providedIn: 'root'
})
export class TextSelectionService {
  
  constructor(private babylonMeshService: BabylonMeshService) {}

  /**
   * Creates selection highlight meshes for a text range
   * @param selectionStart - Start character index
   * @param selectionEnd - End character index
   * @param layoutMetrics - Text layout metrics from text rendering service
   * @param parentMesh - Parent mesh to attach selection to
   * @param scene - BabylonJS scene
   * @param scale - Pixel to world scale factor
   * @returns Array of selection highlight meshes
   */
  createSelectionHighlight(
    selectionStart: number,
    selectionEnd: number,
    layoutMetrics: TextLayoutMetrics,
    parentMesh: BABYLON.Mesh,
    scene: BABYLON.Scene,
    scale: number
  ): BABYLON.Mesh[] {
    if (selectionStart === selectionEnd || selectionStart < 0 || selectionEnd < 0) {
      return [];
    }

    const start = Math.min(selectionStart, selectionEnd);
    const end = Math.max(selectionStart, selectionEnd);
    
    // Group characters by line for multi-line selections
    const selectionRanges = this.calculateSelectionRanges(start, end, layoutMetrics);
    
    const selectionMeshes: BABYLON.Mesh[] = [];
    
    selectionRanges.forEach((range, index) => {
      const mesh = this.createSelectionMeshForRange(
        range,
        parentMesh,
        scene,
        scale,
        `selection_${parentMesh.name}_${index}`
      );
      if (mesh) {
        selectionMeshes.push(mesh);
      }
    });
    
    return selectionMeshes;
  }

  /**
   * Updates existing selection highlight meshes
   * @param existingMeshes - Current selection meshes to update
   * @param selectionStart - New start character index
   * @param selectionEnd - New end character index
   * @param layoutMetrics - Text layout metrics
   * @param parentMesh - Parent mesh
   * @param scene - BabylonJS scene
   * @param scale - Pixel to world scale factor
   * @returns Updated array of selection meshes
   */
  updateSelectionHighlight(
    existingMeshes: BABYLON.Mesh[],
    selectionStart: number,
    selectionEnd: number,
    layoutMetrics: TextLayoutMetrics,
    parentMesh: BABYLON.Mesh,
    scene: BABYLON.Scene,
    scale: number
  ): BABYLON.Mesh[] {
    // Dispose existing meshes
    this.disposeSelectionMeshes(existingMeshes);
    
    // Create new selection
    return this.createSelectionHighlight(
      selectionStart,
      selectionEnd,
      layoutMetrics,
      parentMesh,
      scene,
      scale
    );
  }

  /**
   * Creates a text cursor mesh at the specified character position
   * @param cursorPosition - Character index for cursor position
   * @param layoutMetrics - Text layout metrics
   * @param parentMesh - Parent mesh to attach cursor to
   * @param scene - BabylonJS scene
   * @param scale - Pixel to world scale factor
   * @param style - Text style properties for cursor sizing
   * @returns Cursor mesh
   */
  createTextCursor(
    cursorPosition: number,
    layoutMetrics: TextLayoutMetrics,
    parentMesh: BABYLON.Mesh,
    scene: BABYLON.Scene,
    scale: number,
    style: TextStyleProperties,
    textureWidth: number = 0
  ): BABYLON.Mesh {
    console.log('[TextSelectionService] Creating cursor at position:', cursorPosition);
    console.log('[TextSelectionService] Layout metrics:', layoutMetrics);
    console.log('[TextSelectionService] Scale:', scale);
    
    const cursorX = this.calculateCursorPosition(cursorPosition, layoutMetrics);
    const cursorLine = this.findLineForPosition(cursorPosition, layoutMetrics);
    
    console.log('[TextSelectionService] Calculated cursor X:', cursorX);
    console.log('[TextSelectionService] Found cursor line:', cursorLine);
    
    const cursorHeight = style.fontSize * scale * 1.2; // Slightly taller than font
    const cursorWidth = 2 * scale; // 2px cursor width
    
    console.log('[TextSelectionService] Final cursor dimensions:', { 
      width: cursorWidth, 
      height: cursorHeight,
      fontSize: style.fontSize,
      scale: scale 
    });
    
    console.log('[TextSelectionService] Cursor dimensions:', { width: cursorWidth, height: cursorHeight });
    
    const cursor = BABYLON.MeshBuilder.CreateBox(`cursor_${parentMesh.name}`, {
      width: cursorWidth,
      height: cursorHeight,
      depth: 0.01 * scale
    }, scene);

    // Create cursor material
    const material = new BABYLON.StandardMaterial(`cursorMaterial_${parentMesh.name}`, scene);
    material.diffuseColor = BABYLON.Color3.Black();
    material.emissiveColor = BABYLON.Color3.Black();
    material.disableLighting = true;
    cursor.material = material;

    // Position cursor relative to parent mesh (input field)
    cursor.parent = parentMesh;
    
    // Calculate input field dimensions for proper positioning
    const inputBounds = parentMesh.getBoundingInfo().boundingBox;
    const inputWidth = (inputBounds.maximumWorld.x - inputBounds.minimumWorld.x);
    const inputHeight = (inputBounds.maximumWorld.y - inputBounds.minimumWorld.y);
    
    // Apply same positioning logic as text in input fields
    // Text mesh is positioned at: (inputWidth / 2) - (textureWidth / 2) - padding
    // So the text's left edge is at: (inputWidth / 2) - (textureWidth / 2) - padding
    // Cursor position is measured from the left edge of text in CSS pixels, so convert to world
    const padding = 1.5 * scale; // Match text padding from text-input.manager.ts
    const textLeftEdgeX = (inputWidth / 2) - (textureWidth / 2) - padding;
    
    // Position cursor at the correct location
    // The cursorX is in CSS pixels, so we need to convert it to world units using the scale
    // With the text mesh rotated 180 degrees around Z axis, we need to invert the positioning
    cursor.position.x = textLeftEdgeX - (cursorX * scale);
    cursor.position.y = 0; // Center vertically in input field
    cursor.position.z = 0.1 * scale; // In front of text
    
    console.log('[TextSelectionService] Final cursor position:', cursor.position);
    
    cursor.isPickable = false;
    cursor.renderingGroupId = 3; // Highest priority for UI elements
    
    console.log('[TextSelectionService] Cursor created successfully');
    return cursor;
  }

  /**
   * Updates cursor position
   * @param cursor - Existing cursor mesh
   * @param cursorPosition - New character index
   * @param layoutMetrics - Text layout metrics
   * @param scale - Pixel to world scale factor
   */
  updateCursorPosition(
    cursor: BABYLON.Mesh,
    cursorPosition: number,
    layoutMetrics: TextLayoutMetrics,
    scale: number,
    textureWidth: number = 0
  ): void {
    const cursorX = this.calculateCursorPosition(cursorPosition, layoutMetrics);
    
    // Apply same positioning logic as in createTextCursor
    if (cursor.parent && cursor.parent instanceof BABYLON.Mesh) {
      const parentMesh = cursor.parent as BABYLON.Mesh;
      const inputBounds = parentMesh.getBoundingInfo().boundingBox;
      const inputWidth = (inputBounds.maximumWorld.x - inputBounds.minimumWorld.x);
      
      const padding = 1.5 * scale; // Match text padding
      const textLeftEdgeX = (inputWidth / 2) - (textureWidth / 2) - padding;

      // Position cursor at the correct location
      // The cursorX is in CSS pixels, so we need to convert it to world units using the scale
      // With the text mesh rotated 180 degrees around Z axis, we need to invert the positioning
      cursor.position.x = textLeftEdgeX - (cursorX * scale);
    } else {
      cursor.position.x = cursorX * scale;
    }
    
    console.log('[TextSelectionService] Updated cursor position:', cursor.position);
  }

  /**
   * Disposes selection meshes
   * @param selectionMeshes - Array of selection meshes to dispose
   */
  disposeSelectionMeshes(selectionMeshes: BABYLON.Mesh[]): void {
    selectionMeshes.forEach(mesh => {
      if (mesh.material) {
        mesh.material.dispose();
      }
      mesh.dispose();
    });
  }

  /**
   * Calculates selection ranges for multi-line text
   * @param start - Start character index
   * @param end - End character index
   * @param layoutMetrics - Text layout metrics
   * @returns Array of selection ranges per line
   */
  private calculateSelectionRanges(
    start: number,
    end: number,
    layoutMetrics: TextLayoutMetrics
  ): Array<{ startX: number; endX: number; line: number; y: number; height: number }> {
    const ranges: Array<{ startX: number; endX: number; line: number; y: number; height: number }> = [];
    
    // Group characters by line
    const lineGroups = new Map<number, TextCharacterMetrics[]>();
    layoutMetrics.characters.forEach(char => {
      if (char.index >= start && char.index < end) {
        if (!lineGroups.has(char.lineIndex)) {
          lineGroups.set(char.lineIndex, []);
        }
        lineGroups.get(char.lineIndex)!.push(char);
      }
    });
    
    // Create selection range for each line
    lineGroups.forEach((chars, lineIndex) => {
      if (chars.length === 0) return;
      
      const line = layoutMetrics.lines[lineIndex];
      if (!line) return;
      
      const firstChar = chars[0];
      const lastChar = chars[chars.length - 1];
      
      const startX = firstChar.x;
      const endX = lastChar.x + lastChar.width;
      
      ranges.push({
        startX,
        endX,
        line: lineIndex,
        y: line.top,
        height: line.height
      });
    });
    
    return ranges;
  }

  /**
   * Creates a selection mesh for a specific range
   * @param range - Selection range data
   * @param parentMesh - Parent mesh
   * @param scene - BabylonJS scene
   * @param scale - Pixel to world scale factor
   * @param meshName - Name for the mesh
   * @returns Selection mesh
   */
  private createSelectionMeshForRange(
    range: { startX: number; endX: number; line: number; y: number; height: number },
    parentMesh: BABYLON.Mesh,
    scene: BABYLON.Scene,
    scale: number,
    meshName: string
  ): BABYLON.Mesh | null {
    const width = range.endX - range.startX;
    if (width <= 0) return null;
    
    const selectionMesh = BABYLON.MeshBuilder.CreatePlane(meshName, {
      width: width * scale,
      height: range.height * scale,
      sideOrientation: BABYLON.Mesh.DOUBLESIDE
    }, scene);

    // Create selection material (semi-transparent blue)
    const material = new BABYLON.StandardMaterial(`${meshName}_material`, scene);
    material.diffuseColor = new BABYLON.Color3(0.3, 0.6, 1.0);
    material.emissiveColor = new BABYLON.Color3(0.1, 0.3, 0.5);
    material.alpha = 0.3;
    material.disableLighting = true;
    selectionMesh.material = material;

    // Position selection mesh
    selectionMesh.parent = parentMesh;
    selectionMesh.position.x = (range.startX + width / 2) * scale;
    selectionMesh.position.y = (range.y + range.height / 2) * scale;
    selectionMesh.position.z = 0.05 * scale; // Behind cursor but in front of text

    selectionMesh.isPickable = false;
    selectionMesh.renderingGroupId = 2;
    
    return selectionMesh;
  }

  /**
   * Calculates cursor X position for a character index
   * @param position - Character index
   * @param layoutMetrics - Text layout metrics
   * @returns X position in CSS pixels
   */
  private calculateCursorPosition(position: number, layoutMetrics: TextLayoutMetrics): number {
    console.log('[TextSelectionService] Calculating cursor position for index:', position);
    console.log('[TextSelectionService] Available characters:', layoutMetrics.characters.length);
    
    if (position <= 0) {
      console.log('[TextSelectionService] Position 0, returning 0');
      return 0;
    }
    
    if (position >= layoutMetrics.characters.length) {
      // Position at end of text
      const lastChar = layoutMetrics.characters[layoutMetrics.characters.length - 1];
      const endPos = lastChar ? lastChar.x + lastChar.width : 0;
      console.log('[TextSelectionService] End position:', endPos);
      return endPos;
    }
    
    // Position before the character at the given index
    const char = layoutMetrics.characters[position];
    const charPos = char ? char.x : 0;
    console.log('[TextSelectionService] Character position:', charPos);
    return charPos;
  }

  /**
   * Finds the line containing a character position
   * @param position - Character index
   * @param layoutMetrics - Text layout metrics
   * @returns Line metrics or null if not found
   */
  private findLineForPosition(position: number, layoutMetrics: TextLayoutMetrics) {
    const char = layoutMetrics.characters[position] || layoutMetrics.characters[layoutMetrics.characters.length - 1];
    if (!char) return layoutMetrics.lines[0] || null;
    
    return layoutMetrics.lines[char.lineIndex] || null;
  }
}