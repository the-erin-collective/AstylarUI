import { Mesh } from "@babylonjs/core";
import * as BABYLON from "@babylonjs/core";
import { DOMElement } from "../../../types/dom-element";
import { StyleRule } from "../../../types/style-rule";
import { BabylonRender } from "./render.types";

export interface BabylonDOMActions {
    processChildren: (dom: BabylonDOM, render: BabylonRender, children: DOMElement[], parent: Mesh, styles: StyleRule[], parentElement?: DOMElement) => void;
    createElement(dom: BabylonDOM, render: BabylonRender, element: DOMElement, parent: Mesh, styles: StyleRule[], flexPosition?: { x: number; y: number; z: number }, flexSize?: { width: number; height: number }): Mesh;
    isFlexContainer(render: BabylonRender, parentElement: DOMElement, styles: StyleRule[]): boolean;
    processListChildren(dom: BabylonDOM, render: BabylonRender, children: DOMElement[], parent: Mesh, styles: StyleRule[], listType: 'ul' | 'ol'): void;
    processFlexChildren(dom: BabylonDOM, render: BabylonRender, children: DOMElement[], parent: Mesh, styles: StyleRule[], parentElement: DOMElement): void;
    requestElementRecreation: (
        dom: BabylonDOM,
        render: BabylonRender,
        elementId: string,
        styleType: 'normal' | 'hover'
    ) => void;
    processTable: (
        dom: BabylonDOM,
        render: BabylonRender,
        tableChildren: DOMElement[],
        parent: Mesh,
        styles: StyleRule[],
        parentElement: DOMElement
    ) => void;
    generateElementId: (parentId: string, type: string, index: number, className?: string) => string;
    // Positioning delegates
    calculateElementPosition: (element: DOMElement) => { x: number; y: number; z: number };
    applyPositioning: (element: DOMElement, mesh: Mesh, render: BabylonRender) => void;
    updateElementPosition: (elementId: string, newPosition: { x: number; y: number; z: number }) => void;
    // Text rendering delegates
    handleTextContent: (dom: BabylonDOM, render: BabylonRender, element: DOMElement, mesh: Mesh, styles: StyleRule[]) => void;
    updateTextContent: (dom: BabylonDOM, render: BabylonRender, elementId: string, newContent: string) => void;
    validateTextElement: (element: DOMElement) => { isValid: boolean; errors: string[] };
}

export interface BabylonDOMContext {
    elements: Map<string, Mesh>;
    hoverStates: Map<string, boolean>;
    elementStyles: Map<string, { normal: StyleRule, hover?: StyleRule }>;
    elementTypes: Map<string, string>;
    elementDimensions: Map<string, { width: number, height: number, padding: { top: number; right: number; bottom: number; left: number } }>;
    originalBorderRadius?: Map<string, number>;
    // Text rendering context
    textMeshes: Map<string, Mesh>;
    textTextures: Map<string, BABYLON.Texture>;
    textContent: Map<string, string>;
}

export interface BabylonDOM {
    actions: BabylonDOMActions;
    context: BabylonDOMContext;
} 