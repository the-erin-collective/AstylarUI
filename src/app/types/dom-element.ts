export interface DOMElement {
  type: 'div' | 'section' | 'article' | 'header' | 'footer' | 'nav' | 'main' | 'ul' | 'ol' | 'li' | 'img' | 'a';
  id?: string;
  children?: DOMElement[];
}