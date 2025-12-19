import { Injectable } from '@angular/core';
import { Scene, Color3, Mesh } from '@babylonjs/core';
import { BabylonMeshService } from './babylon-mesh.service';
import { BabylonCameraService } from './babylon-camera.service';
import { StyleService } from './style.service';
import { StyleRule } from '../types/style-rule';

@Injectable({
  providedIn: 'root'
})
export class RootService {
  private scene?: Scene;
  private meshService?: BabylonMeshService;
  private cameraService?: BabylonCameraService;
  private styleService?: StyleService;

  initialize(scene: Scene, meshService: BabylonMeshService, cameraService: BabylonCameraService, styleService: StyleService): void {
    this.scene = scene;
    this.meshService = meshService;
    this.cameraService = cameraService;
    this.styleService = styleService;
  }

  createRootBodyElement(styles: StyleRule[]): Mesh {
    if (!this.scene || !this.meshService || !this.cameraService) throw new Error('Services not initialized');

    // Get viewport dimensions from camera service
    const { width: visibleWidth, height: visibleHeight } = this.cameraService.calculateViewportDimensions();
    
    const rootBody = this.meshService.createPlane('root-body', visibleWidth, visibleHeight);

    // Position at origin in the XY plane
    this.meshService.positionMesh(rootBody, 0, 0, 0);
    
    // No rotation needed since camera is now at positive Z looking toward origin
    
    // Create material - this should be fully visible as it represents the document body
    let material;
    
    // Find root style and apply background color
    const rootStyle = this.styleService?.findStyleBySelector('root', styles);
    if (rootStyle?.background) {
      const backgroundColor = this.styleService?.parseBackgroundColor(rootStyle.background);
      const opacity = this.styleService?.parseOpacity(rootStyle.opacity);
      if (backgroundColor) {
        material = this.meshService.createMaterial('root-body-material', backgroundColor, undefined, opacity);
        console.log('Applied root background color:', rootStyle.background, '-> parsed:', backgroundColor, 'opacity:', opacity);
      }
    }
    if (!material) {
      material = this.meshService.createMaterial('root-body-material', new Color3(0.8, 0.1, 0.1));
      console.log('No root background style found, using test red color');
    }
    
    rootBody.material = material;

    console.log('Created root body element (calculated full screen):', { 
      position: rootBody.position, 
      width: visibleWidth, 
      height: visibleHeight 
    });
    
    return rootBody;
  }
} 