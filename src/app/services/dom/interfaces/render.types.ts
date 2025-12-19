import { Color3, Mesh, Scene, StandardMaterial, Texture } from "@babylonjs/core";
import { DOMElement } from "../../../types/dom-element";
import { StyleRule } from "../../../types/style-rule";

export interface MeshActions {
    createPolygon: (name: string, polygonType: string, width: number, height: number, borderRadius: number) => Mesh;
    createPlane: (name: string, width: number, height: number) => Mesh;
    createMaterial: (name: string, diffuseColor: Color3, emissiveColor?: Color3, opacity?: number) => StandardMaterial;
    createGradientMaterial: (name: string, gradientData: any, opacity: number, width: number, height: number) => StandardMaterial;
    createShadow: (...args: any[]) => Mesh;
    createPolygonBorder: (...args: any[]) => Mesh[];
    positionMesh: (mesh: Mesh, x: number, y: number, z: number) => void;
    parentMesh: (child: Mesh, parent: Mesh) => void;
    positionBorderFrames: (borders: Mesh[], centerX: number, centerY: number, centerZ: number, elementWidth: number, elementHeight: number, borderWidth: number) => void;
    generatePolygonVertexData: (polygonType: string, width: number, height: number, borderRadius: number) => any;
    updatePolygon: (mesh: Mesh, polygonType: string, width: number, height: number, borderRadius: number) => void;
}

export interface StyleActions {
    findStyleBySelector: (selector: string, styles: StyleRule[]) => StyleRule | undefined;
    findStyleForElement: (element: DOMElement, styles: StyleRule[]) => StyleRule | undefined;
    parseBackgroundColor: (background?: string) => Color3;
    parseOpacity: (opacityValue: string | undefined) => number;
    getElementTypeDefaults: (elementType: string) => Partial<StyleRule>;
}

export interface CameraActions {
    calculateViewportDimensions: () => { width: number; height: number };
    getPixelToWorldScale: () => number;
}

export interface TextureActions {
    getTexture: (url: string, scene: Scene) => Promise<Texture>;
}

export interface BabylonRenderActions {
    mesh: MeshActions;
    style: StyleActions;
    camera: CameraActions;
    texture: TextureActions;
}

export interface BabylonRender {
    actions: BabylonRenderActions;
    scene: Scene | undefined;
} 