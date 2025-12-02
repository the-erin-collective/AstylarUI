import { Injectable } from '@angular/core';
import { Matrix, Mesh, PointerInfo, Vector3 } from '@babylonjs/core';
import { BabylonRender } from '../interfaces/render.types';
import { TextInteractionEntry, TextInteractionRegistryService } from './text-interaction-registry.service';
import { CssPoint, TextSelectionControllerService } from './text-selection-controller.service';

@Injectable({ providedIn: 'root' })
export class PointerInteractionService {
  constructor(
    private textInteractionRegistry: TextInteractionRegistryService,
    private textSelectionController: TextSelectionControllerService
  ) { }

  handlePointerDown(pointerInfo: PointerInfo, render: BabylonRender): void {
    if (!this.isPrimaryButton(pointerInfo)) {
      return;
    }

    const entry = this.resolveTextEntry(pointerInfo, render);
    if (!entry) {
      this.textSelectionController.clearSelection();
      return;
    }

    const cssPoint = this.toCssPoint(pointerInfo, entry) ?? { x: 0, y: 0 };
    this.textSelectionController.beginSelection(entry, cssPoint);
  }

  handlePointerMove(pointerInfo: PointerInfo, render: BabylonRender): void {
    this.updateCursor(pointerInfo, render);

    const isPointerDown = this.textSelectionController.snapshot.isPointerDown;

    if (!isPointerDown) {
      return;
    }

    const entry = this.resolveTextEntry(pointerInfo, render);
    if (!entry) {
      return;
    }

    const cssPoint = this.toCssPoint(pointerInfo, entry);
    if (!cssPoint) {
      return;
    }

    this.textSelectionController.updateSelection(entry, cssPoint);
  }

  private updateCursor(pointerInfo: PointerInfo, render: BabylonRender): void {
    const canvas = render.scene?.getEngine().getRenderingCanvas();
    if (!canvas) return;

    const mesh = this.resolvePreferredMesh(pointerInfo, render);

    if (mesh) {
      if (mesh.metadata?.isTextMesh) {
        canvas.style.cursor = 'text';
      } else if (mesh.metadata?.cursor) {
        canvas.style.cursor = mesh.metadata.cursor;
      } else {
        canvas.style.cursor = 'default';
      }
    } else {
      canvas.style.cursor = 'default';
    }
  }

  handlePointerUp(pointerInfo: PointerInfo, render: BabylonRender): void {
    if (!this.textSelectionController.snapshot.isPointerDown) {
      return;
    }

    const entry = this.resolveTextEntry(pointerInfo, render);
    if (entry) {
      const cssPoint = this.toCssPoint(pointerInfo, entry);
      if (cssPoint) {
        this.textSelectionController.updateSelection(entry, cssPoint);
      }
    }

    this.textSelectionController.finalizeSelection();
  }

  handlePointerOut(): void {
    if (!this.textSelectionController.snapshot.isPointerDown) {
      return;
    }

    this.textSelectionController.cancelSelection();
  }

  resolvePreferredMesh(pointerInfo: PointerInfo, render: BabylonRender): Mesh | undefined {
    const directMesh = pointerInfo.pickInfo?.pickedMesh as Mesh | undefined;
    if (directMesh) {
      const directTextEntry = this.textInteractionRegistry.getByMesh(directMesh);
      if (directTextEntry) {
        return directTextEntry.mesh;
      }
    }

    const scene = render.scene;
    const nativeEvent = pointerInfo.event as PointerEvent | MouseEvent | undefined;
    if (!scene || !nativeEvent || typeof nativeEvent.clientX !== 'number' || typeof nativeEvent.clientY !== 'number') {
      return directMesh;
    }

    const picks = scene.multiPick(nativeEvent.clientX, nativeEvent.clientY, (mesh) => !!mesh && mesh.isPickable);
    if (!picks?.length) {
      return directMesh;
    }

    for (const pick of picks) {
      const pickedMesh = pick.pickedMesh as Mesh | undefined;
      if (!pickedMesh) {
        continue;
      }

      const entry = this.textInteractionRegistry.getByMesh(pickedMesh);
      if (entry) {
        return entry.mesh;
      }

      if (pickedMesh === directMesh) {
        break;
      }
    }

    return directMesh;
  }

  resolveTextEntry(pointerInfo: PointerInfo, render: BabylonRender): TextInteractionEntry | undefined {
    const mesh = this.resolvePreferredMesh(pointerInfo, render);
    if (!mesh) {
      return undefined;
    }
    return this.textInteractionRegistry.getByMesh(mesh);
  }

  private toCssPoint(pointerInfo: PointerInfo, entry: TextInteractionEntry): CssPoint | undefined {
    const metrics = entry.metrics;
    if (!metrics) {
      return undefined;
    }

    const pickInfo = pointerInfo.pickInfo;
    let pickedPoint = pickInfo?.pickedPoint;

    // If we don't have a picked point (common during drag), perform a manual ray cast
    if (!pickedPoint) {
      const scene = entry.mesh.getScene();
      const nativeEvent = pointerInfo.event as PointerEvent | MouseEvent | undefined;

      if (scene && nativeEvent && typeof nativeEvent.clientX === 'number' && typeof nativeEvent.clientY === 'number') {
        const ray = scene.createPickingRay(nativeEvent.clientX, nativeEvent.clientY, Matrix.Identity(), scene.activeCamera);
        const hit = ray.intersectsMesh(entry.mesh);

        if (hit.hit && hit.pickedPoint) {
          pickedPoint = hit.pickedPoint;
          console.log('[toCssPoint] Manual ray cast successful:', pickedPoint);
        } else {
          console.log('[toCssPoint] Manual ray cast failed');
          return undefined;
        }
      } else {
        console.log('[toCssPoint] Cannot perform manual ray cast - missing scene or event data');
        return undefined;
      }
    }

    const inverse = new Matrix();
    entry.mesh.getWorldMatrix().invertToRef(inverse);
    const localPoint = Vector3.TransformCoordinates(pickedPoint, inverse);

    const bounding = entry.mesh.getBoundingInfo();
    const width = bounding.maximum.x - bounding.minimum.x;
    const height = bounding.maximum.y - bounding.minimum.y;
    if (width === 0 || height === 0) {
      return undefined;
    }

    const halfWidth = width / 2;
    const halfHeight = height / 2;

    // Fixed coordinate transformation to match text rendering coordinate system
    // The mesh local coordinates appear to be flipped relative to the text texture (Left click = +X)
    // So we need to invert the normalized X coordinate
    const normalizedX = 1 - clamp((localPoint.x + halfWidth) / width, 0, 1);
    const normalizedY = clamp((halfHeight - localPoint.y) / height, 0, 1);

    const cssMetrics = entry.metrics?.css;
    const cssWidth = cssMetrics?.totalWidth ?? 0;
    const cssHeight = cssMetrics?.totalHeight ?? 0;

    // The text mesh represents the actual rendered text content.
    // We need to find the ACTUAL content width by looking at character positions,
    // NOT line.width which represents the container width.
    let actualContentWidth = 0;
    if (cssMetrics?.characters && cssMetrics.characters.length > 0) {
      // Find the rightmost character position
      for (const char of cssMetrics.characters) {
        const charEnd = char.x + char.advance;
        if (charEnd > actualContentWidth) {
          actualContentWidth = charEnd;
        }
      }
    } else {
      // Fallback to totalWidth if no characters
      actualContentWidth = cssWidth;
    }

    // Map normalized coordinates (0-1 across mesh) to actual content width in CSS space
    let x = normalizedX * actualContentWidth;

    return {
      x,
      y: normalizedY * cssHeight
    };
  }

  private isPrimaryButton(pointerInfo: PointerInfo): boolean {
    const nativeEvent = pointerInfo.event as PointerEvent | MouseEvent | undefined;
    if (!nativeEvent || typeof nativeEvent.button !== 'number') {
      return true;
    }
    return nativeEvent.button === 0;
  }
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}
