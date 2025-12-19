import { Injectable } from '@angular/core';
import { StyleRule } from '../../../types/style-rule';
import { Color3, Mesh } from '@babylonjs/core';
import { BabylonDOM } from '../interfaces/dom.types';
import { BabylonRender } from '../interfaces/render.types';

@Injectable({
  providedIn: 'root'
})
export class RootService {
  public createRootBodyElement(dom: BabylonDOM, render: BabylonRender, styles: StyleRule[]): Mesh {
    // Store root-body dimensions in elementDimensions in PIXELS (not world units)
    const scene = render.scene;
    const canvas = scene?.getEngine().getRenderingCanvas();
    if (!canvas) {
      throw new Error('Canvas not found when setting root-body elementDimensions');
    }

    const devicePixelRatio = window.devicePixelRatio || 1;
    const cssWidth = canvas.width * devicePixelRatio;
    const cssHeight = canvas.height * devicePixelRatio;

    // Get viewport dimensions from camera service
    const { width: visibleWidth, height: visibleHeight } = render.actions.camera.calculateViewportDimensions();
    
    const dprWidth = visibleWidth * devicePixelRatio;
    const dprHeight = visibleHeight * devicePixelRatio;

    const rootBody = render.actions.mesh.createPlane('root-body', dprWidth, dprHeight);

    // Position at origin in the XY plane
    render.actions.mesh.positionMesh(rootBody, 0, 0, 0);

    // No rotation needed since camera is now at positive Z looking toward origin

    // Create material - this should be fully visible as it represents the document body
    let material;

    // Find root style and apply background color
    const rootStyle = render.actions.style.findStyleBySelector('root', styles);
    if (rootStyle?.background) {
      const backgroundColor = render.actions.style.parseBackgroundColor(rootStyle.background);
      const opacity = render.actions.style.parseOpacity(rootStyle.opacity);
      material = render.actions.mesh.createMaterial('root-body-material', backgroundColor, undefined, opacity);
      console.log('Applied root background color:', rootStyle.background, '-> parsed:', backgroundColor, 'opacity:', opacity);
    } else {
      material = render.actions.mesh.createMaterial('root-body-material', new Color3(0.8, 0.1, 0.1));
      console.log('No root background style found, using test red color');
    }

    rootBody.material = material;

    console.log('Created root body element (calculated full screen):', {
      position: rootBody.position,
      width: visibleWidth,
      height: visibleHeight
    });

    dom.context.elements.set('root-body', rootBody);


    dom.context.elementDimensions.set('root-body', {
      width: cssWidth, // pixels
      height: cssHeight, // pixels
      padding: { top: 0, right: 0, bottom: 0, left: 0 }
    });
    console.log('[ELEMENT DIM DEBUG] Stored elementDimensions for root-body:', { width: canvas.width, height: canvas.height });

    return rootBody;
  }
} 