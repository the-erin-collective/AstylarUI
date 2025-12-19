import { Injectable } from '@angular/core';
import { Scene, Color3, Vector3, Mesh, ActionManager, ExecuteCodeAction, Texture, StandardMaterial, Material, PointerEventTypes } from '@babylonjs/core';
import { StyleRule } from '../../types/style-rule';
import { SiteData } from '../../types/site-data';
import { FlexService } from './elements/flex.service';
import { BabylonDOM } from './interfaces/dom.types';
import { RootService } from './elements/root.service';
import { ListService } from './elements/list.service';
import { ElementService } from './elements/element.service';
import { StyleService } from './style.service';
import { BabylonRender } from './interfaces/render.types';

@Injectable({
  providedIn: 'root'
})
export class BabylonDOMService {
  private scene?: Scene;
  private sceneWidth: number = 1920; // Default viewport width
  private sceneHeight: number = 1080; // Default viewport height
  private elements: Map<string, Mesh> = new Map();
  private hoverStates: Map<string, boolean> = new Map();
  private elementStyles: Map<string, { normal: StyleRule, hover?: StyleRule }> = new Map();
  private elementTypes: Map<string, string> = new Map(); // Store element types for hover handling
  private elementDimensions: Map<string, { width: number, height: number, padding: { top: number; right: number; bottom: number; left: number } }> = new Map();

  constructor( private flexService: FlexService, private rootService: RootService, private listService: ListService, private elementService: ElementService, private styleService: StyleService) { }

  public render?: BabylonRender;

  public get dom(): BabylonDOM {
    return {
      actions: {
        processChildren: this.elementService.processChildren.bind(this.elementService),
        createElement: this.elementService.createElement.bind(this.elementService),
        isFlexContainer: this.flexService.isFlexContainer.bind(this.flexService),
        processListChildren: this.listService.processListChildren.bind(this.listService),
        processFlexChildren: this.flexService.processFlexChildren.bind(this.flexService),
        requestElementRecreation: this.elementService.requestElementRecreation.bind(this.elementService),
      },
      context: {
        elements: this.elements,
        hoverStates: this.hoverStates,
        elementStyles: this.elementStyles,
        elementTypes: this.elementTypes,
        elementDimensions: this.elementDimensions
      }
    };
  }

  initialize(render: BabylonRender, viewportWidth: number, viewportHeight: number): void {
    this.render = render;
    this.scene = render.scene;
    this.sceneWidth = viewportWidth;
    this.sceneHeight = viewportHeight;
    this.elements.clear();
  }

  createSiteFromData(siteData: SiteData): void {
    if (!this.scene) {
      console.error('BabylonDOMService: Scene not initialized');
      return;
    }

    console.log('🏗️ Creating site from data:', siteData);

    // Clear existing elements and state
    this.clearElements();
    this.hoverStates.clear();
    this.elementStyles.clear();

    // Parse and organize styles
    console.log('📝 Parsing styles...');
    this.styleService.parseStyles(this.dom, this.render!, siteData.styles);
    console.log('📝 Parsed styles. ElementStyles map:', this.elementStyles);

    // Create root body element that represents the full viewport/document
    const rootBodyMesh = this.rootService.createRootBodyElement(this.dom, this.render!, siteData.styles);

    // Process children recursively - these will be positioned relative to the body
    if (siteData.root.children) {
      console.log('👨‍👩‍👧‍👦 Processing root children:', siteData.root.children);
      console.log('👨‍👩‍👧‍👦 Root children count:', siteData.root.children.length);
      console.log('👨‍👩‍👧‍👦 Root children details:', siteData.root.children.map(c => `${c.type}#${c.id}`));
      this.elementService.processChildren(this.dom, this.render!, siteData.root.children, rootBodyMesh, siteData.styles, { type: 'div' as const });
    } else {
      console.log('⚠️ No root children found in siteData');
    }

    console.log('✅ Site creation complete. Elements:', this.elements.size);
    console.log('🗺️ All elements created:', Array.from(this.elements.keys()));
  }

  private clearElements(): void {
    this.elements.forEach(mesh => {
      mesh.dispose();
    });
    this.elements.clear();
    this.hoverStates.clear();
    this.elementStyles.clear();
    this.elementTypes.clear();
  }

  cleanup(): void {
    this.clearElements();
    this.scene = undefined;
  }
}