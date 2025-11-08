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
  ) {}

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
    if (!this.textSelectionController.snapshot.isPointerDown) {
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
    const pickInfo = pointerInfo.pickInfo;
    if (!metrics || !pickInfo?.pickedPoint) {
      return undefined;
    }

    const inverse = new Matrix();
    entry.mesh.getWorldMatrix().invertToRef(inverse);
    const localPoint = Vector3.TransformCoordinates(pickInfo.pickedPoint, inverse);

    const bounding = entry.mesh.getBoundingInfo();
    const width = bounding.maximum.x - bounding.minimum.x;
    const height = bounding.maximum.y - bounding.minimum.y;
    if (width === 0 || height === 0) {
      return undefined;
    }

    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const normalizedX = clamp((localPoint.x + halfWidth) / width, 0, 1);
    const normalizedY = clamp((halfHeight - localPoint.y) / height, 0, 1);

    const cssWidth = metrics.css?.totalWidth ?? 0;
    const cssHeight = metrics.css?.totalHeight ?? 0;

    return {
      x: normalizedX * cssWidth,
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
