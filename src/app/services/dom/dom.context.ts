import { Mesh } from "@babylonjs/core";
import { StyleRule } from "../../types/style-rule";

export interface BabylonDOMContext {
    elements: Map<string, Mesh>;
    hoverStates: Map<string, boolean>;
    elementStyles: Map<string, { normal: StyleRule, hover?: StyleRule }>;
    elementTypes: Map<string, string>;
    elementDimensions: Map<string, { width: number, height: number, padding: { top: number; right: number; bottom: number; left: number } }>;
  }