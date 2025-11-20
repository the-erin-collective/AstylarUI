import { DestroyRef, effect, inject, Injectable } from '@angular/core';
import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial } from '@babylonjs/core';
import { TextSelectionState } from './text-selection-controller.service';
import { TextInteractionEntry } from './text-interaction-registry.service';
import { TextSelectionStore } from '../../../store/text-selection.store';

interface HighlightSegment {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

interface HighlightMeshes {
  meshes: Mesh[];
  material: StandardMaterial;
}

const MIN_SEGMENT_WIDTH = 0.002;
const MIN_SEGMENT_HEIGHT = 0.002;
const HIGHLIGHT_Z_OFFSET = 0.0005;

@Injectable({ providedIn: 'root' })
export class TextHighlightMeshFactory {
  private readonly selectionStore = inject(TextSelectionStore);
  private readonly destroyRef = inject(DestroyRef);

  private readonly highlightRecords = new Map<string, HighlightMeshes>();
  private currentElementId?: string;

  private readonly selectionEffect = effect(() => {
    const state = this.selectionStore.state();
    const entry = this.selectionStore.activeEntry();
    this.applySelection(state, entry);
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.selectionEffect.destroy();
      this.clearAllHighlights();
    });
  }

  clearAllHighlights(): void {
    for (const [elementId] of this.highlightRecords) {
      this.disposeHighlights(elementId);
    }
    this.highlightRecords.clear();
    this.currentElementId = undefined;
  }

  private applySelection(state: TextSelectionState, entry?: TextInteractionEntry): void {
    if (!state.range || state.range.start === state.range.end || !entry || !entry.metrics) {
      this.clearCurrentHighlights();
      return;
    }

    if (this.currentElementId && this.currentElementId !== entry.elementId) {
      this.disposeHighlights(this.currentElementId);
    }

    this.currentElementId = entry.elementId;

    const segments = this.computeSegments(state.range.start, state.range.end, entry);
    if (!segments.length) {
      this.disposeHighlights(entry.elementId);
      return;
    }

    this.syncHighlightMeshes(entry, segments);
  }

  private computeSegments(start: number, end: number, entry: TextInteractionEntry): HighlightSegment[] {
    const metrics = entry.metrics;
    if (!metrics) {
      return [];
    }

    const cssMetrics = metrics.css;
    const characters = cssMetrics.characters;

    if (!cssMetrics.lines.length || !characters.length) {
      return [];
    }

    const lineCharMap = new Map<number, typeof characters>();
    for (const character of characters) {
      if (character.isLineBreak) {
        continue;
      }
      const bucket = lineCharMap.get(character.lineIndex);
      if (bucket) {
        bucket.push(character);
      } else {
        lineCharMap.set(character.lineIndex, [character]);
      }
    }

    const textMesh = entry.mesh;
    textMesh.computeWorldMatrix(true);
    textMesh.refreshBoundingInfo();
    const boundingInfo = textMesh.getBoundingInfo().boundingBox;
    const textWidth = boundingInfo.maximum.x - boundingInfo.minimum.x;
    const textHeight = boundingInfo.maximum.y - boundingInfo.minimum.y;
    const halfWidth = textWidth / 2;
    const halfHeight = textHeight / 2;

    const minTop = cssMetrics.lines.reduce((acc, line) => Math.min(acc, line.top), Number.POSITIVE_INFINITY);

    const segments: HighlightSegment[] = [];
    const scale = metrics.scale;

    for (const line of cssMetrics.lines) {
      const lineChars = lineCharMap.get(line.index) ?? [];
      const overlapStart = Math.max(start, line.startIndex);
      const overlapEnd = Math.min(end, line.endIndex);

      if (overlapStart >= overlapEnd) {
        continue;
      }

      const lineStartCaret = this.resolveCaretPosition(overlapStart, line, lineChars);
      const lineEndCaret = this.resolveCaretPosition(overlapEnd, line, lineChars, true);
      const widthCss = Math.max(0, lineEndCaret - lineStartCaret);

      if (widthCss <= 0) {
        continue;
      }

      const widthWorld = Math.max(widthCss * scale, MIN_SEGMENT_WIDTH);
      const startXWorld = lineStartCaret * scale;
      const centerX = -halfWidth + startXWorld + (widthWorld / 2);

      const topOffsetCss = line.top - minTop;
      const heightCss = Math.max(line.bottom - line.top, line.height ?? 0);
      const heightWorld = Math.max(heightCss * scale, MIN_SEGMENT_HEIGHT);
      const topOffsetWorld = topOffsetCss * scale;
      const centerY = halfHeight - topOffsetWorld - (heightWorld / 2);

      segments.push({
        centerX,
        centerY,
        width: widthWorld,
        height: heightWorld
      });
    }

    return segments;
  }

  private resolveCaretPosition(
    targetIndex: number,
    line: { startIndex: number; endIndex: number },
    lineCharacters: Array<{ index: number; x: number; advance: number }>,
    clampToEnd = false
  ): number {
    if (!lineCharacters.length) {
      return 0;
    }

    if (targetIndex <= line.startIndex) {
      return 0;
    }

    if (targetIndex >= line.endIndex) {
      const last = lineCharacters[lineCharacters.length - 1];
      return clampToEnd ? last.x + last.advance : last.x + last.advance;
    }

    const exact = lineCharacters.find((char) => char.index === targetIndex);
    if (exact) {
      return exact.x;
    }

    const preceding = this.findPrecedingCharacter(targetIndex, lineCharacters);
    if (preceding) {
      return preceding.x + preceding.advance;
    }

    return 0;
  }

  private findPrecedingCharacter(
    targetIndex: number,
    characters: Array<{ index: number; x: number; advance: number }>
  ): { index: number; x: number; advance: number } | undefined {
    for (let i = characters.length - 1; i >= 0; i -= 1) {
      const candidate = characters[i];
      if (candidate.index < targetIndex) {
        return candidate;
      }
    }
    return undefined;
  }

  private syncHighlightMeshes(entry: TextInteractionEntry, segments: HighlightSegment[]): void {
    const existing = this.highlightRecords.get(entry.elementId) ?? this.createHighlightRecord(entry);
    const scene = entry.mesh.getScene();

    if (existing.meshes.length && existing.meshes[0].parent !== entry.mesh) {
      existing.meshes.forEach((mesh) => {
        mesh.parent = entry.mesh;
      });
    }

    // Dispose surplus meshes if selection shrank
    while (existing.meshes.length > segments.length) {
      const mesh = existing.meshes.pop();
      mesh?.dispose();
    }

    const isMultiLine = segments.length > 1;

    segments.forEach((segment, index) => {
      let mesh = existing.meshes[index];
      if (!mesh) {
        mesh = this.createHighlightMesh(entry, existing.material, index, scene);
        existing.meshes.push(mesh);
      }

      mesh.scaling.x = segment.width;
      mesh.scaling.y = segment.height;
      mesh.position.x = isMultiLine ? -segment.centerX : segment.centerX;
      mesh.position.y = segment.centerY;
      mesh.position.z = HIGHLIGHT_Z_OFFSET;
    });

    this.highlightRecords.set(entry.elementId, existing);
  }

  private createHighlightRecord(entry: TextInteractionEntry): HighlightMeshes {
    const scene = entry.mesh.getScene();
    const material = this.createHighlightMaterial(scene);
    const record: HighlightMeshes = { meshes: [], material };
    this.highlightRecords.set(entry.elementId, record);
    return record;
  }

  private createHighlightMesh(
    entry: TextInteractionEntry,
    material: StandardMaterial,
    index: number,
    scene: Scene
  ): Mesh {
    const mesh = MeshBuilder.CreatePlane(`${entry.elementId}-highlight-${index}`, { width: 1, height: 1, sideOrientation: entry.mesh.sideOrientation }, scene);
    mesh.parent = entry.mesh;
    mesh.material = material;
    mesh.isPickable = false;
    mesh.metadata = {
      ...(mesh.metadata || {}),
      highlight: {
        ownerElementId: entry.elementId
      }
    };
    mesh.renderingGroupId = entry.mesh.renderingGroupId;
    return mesh;
  }

  private createHighlightMaterial(scene: Scene): StandardMaterial {
    const material = new StandardMaterial('text-selection-highlight', scene);
    material.diffuseColor = new Color3(0.2, 0.45, 1.0);
    material.alpha = 0.35;
    material.specularColor = Color3.Black();
    material.emissiveColor = new Color3(0.05, 0.15, 0.35);
    material.backFaceCulling = false;
    material.disableLighting = true;
    material.disableDepthWrite = true;
    return material;
  }

  private clearCurrentHighlights(): void {
    if (!this.currentElementId) {
      return;
    }
    this.disposeHighlights(this.currentElementId);
    this.currentElementId = undefined;
  }

  private disposeHighlights(elementId: string): void {
    const record = this.highlightRecords.get(elementId);
    if (!record) {
      return;
    }

    for (const mesh of record.meshes) {
      mesh.dispose();
    }

    record.material.dispose();
    this.highlightRecords.delete(elementId);
  }
}
