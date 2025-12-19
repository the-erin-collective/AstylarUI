// Table and anchor element types (clarified for type safety)
export type DOMElementType =
  | 'div' | 'section' | 'article' | 'header' | 'footer' | 'nav' | 'main'
  | 'ul' | 'ol' | 'li'
  | 'table' | 'thead' | 'tbody' | 'tfoot' | 'tr' | 'td' | 'th' | 'caption' | 'col' | 'colgroup'
  | 'a' | 'area' // anchor types
  | 'img' | 'span' | 'input' | 'button' | 'form';

export interface DOMElement {
  id?: string;
  type: DOMElementType;
  style?: any;
  children?: DOMElement[];
  textContent?: string;
  class?: string;
  src?: string;
  alt?: string;
  href?: string;
  target?: string;
  value?: string;
  placeholder?: string;
  checked?: boolean;
  disabled?: boolean;
  required?: boolean;
  readonly?: boolean;
  multiple?: boolean;
  selected?: boolean;
  name?: string;
  min?: string;
  max?: string;
  step?: string;
  pattern?: string;
  accept?: string;
  autocomplete?: string;
  autofocus?: boolean;
  cols?: number;
  rows?: number;
  wrap?: string;
  for?: string;
  headers?: string;
  colspan?: number;
  rowspan?: number;
  scope?: string;
  abbr?: string;
  accesskey?: string;
  contenteditable?: boolean;
  dir?: string;
  draggable?: boolean;
  hidden?: boolean;
  lang?: string;
  spellcheck?: boolean;
  tabindex?: number;
  title?: string;
  translate?: boolean;
  // Table-specific
  tableProperties?: {
    colspan?: number;
    rowspan?: number;
    borderCollapse?: 'collapse' | 'separate';
    borderSpacing?: number;
    tableLayout?: 'auto' | 'fixed';
    span?: number; // For col and colgroup elements
    width?: string; // For col elements
  };
}