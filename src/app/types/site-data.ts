import { DOMElement } from "./dom-element";
import { StyleRule } from "./style-rule";

export interface SiteData {
  styles: StyleRule[];
  root: {
    children: DOMElement[];
  };
}