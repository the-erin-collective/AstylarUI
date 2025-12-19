import { Injectable } from '@angular/core';
import { Scene, FreeCamera, Vector3 } from '@babylonjs/core';

@Injectable({
  providedIn: 'root'
})
export class BabylonCameraService {
  private camera?: FreeCamera;

  constructor() {}

  initialize(scene: Scene, canvas: HTMLCanvasElement): FreeCamera {
    // Create camera for true 2D viewing - looking straight at XY plane from positive Z
    this.camera = new FreeCamera('camera', new Vector3(0, 0, 30), scene);
    this.camera.setTarget(Vector3.Zero());
    this.camera.attachControl(canvas, true);
    
    // Disable camera movement to keep it in 2D mode
    this.camera.inputs.clear();
    
    return this.camera;
  }

  getCamera(): FreeCamera | undefined {
    return this.camera;
  }

  calculateViewportDimensions(): { width: number; height: number } {
    if (!this.camera) {
      throw new Error('Camera not initialized');
    }

    const cameraDistance = 30; // Camera is at Z=+30
    const fov = this.camera.fov || Math.PI / 3; // Default FOV is about 60 degrees
    
    // Calculate height based on FOV: height = 2 * distance * tan(fov/2)
    const visibleHeight = 2 * cameraDistance * Math.tan(fov / 2);
    
    // Calculate width based on canvas aspect ratio
    const scene = this.camera.getScene();
    const canvas = scene.getEngine().getRenderingCanvas();
    const aspectRatio = canvas ? canvas.width / canvas.height : 16/9;
    const visibleWidth = visibleHeight * aspectRatio;

    return { width: visibleWidth, height: visibleHeight };
  }

  cleanup(): void {
    this.camera?.dispose();
    this.camera = undefined;
  }
}
