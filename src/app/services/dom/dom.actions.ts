import { Mesh } from "@babylonjs/core";
import { DOMElement } from "../../types/dom-element";
import { StyleRule } from "../../types/style-rule";

export interface BabylonDOMActions {
    findStyleBySelector: (selector: string, styles: StyleRule[]) => StyleRule | undefined;
    findStyleForElement(element: DOMElement, styles: StyleRule[]): StyleRule | undefined;
    processChildren(children: DOMElement[], parent: Mesh, styles: StyleRule[], parentElement?: DOMElement): void;
    createElement(element: DOMElement, parent: Mesh, styles: StyleRule[], flexPosition?: { x: number; y: number; z: number }, flexSize?: { width: number; height: number }): Mesh;
  }
  