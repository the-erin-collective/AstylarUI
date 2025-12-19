export interface StyleRule {
  selector: string;
  // Positioning
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  width?: string;
  height?: string;
  minWidth?: string;
  maxWidth?: string;
  minHeight?: string;
  maxHeight?: string;
  
  // Background and border
  background?: string;
  borderWidth?: string;
  borderColor?: string;
  borderStyle?: string;
  borderRadius?: string;
  boxShadow?: string;
  polygonType?: string;

  // Padding (all variations)
  padding?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;

  // Margin (all variations)
  margin?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;

  // Z-index
  zIndex?: string;

  // Opacity
  opacity?: string;

  // Transform
  transform?: string;

  // List
  listStyleType?: string;
  listItemSpacing?: string;

  // Image
  src?: string;
  objectFit?: string;

  // Anchor/Link
  href?: string;
  target?: string;
  onclick?: string;

  // Flexbox
  display?: string;
  flexDirection?: string;
  justifyContent?: string;
  alignItems?: string;
  alignContent?: string;
  flexWrap?: string;
  gap?: string;
  rowGap?: string;
  columnGap?: string;
  flexGrow?: string;
  flexShrink?: string;
  flexBasis?: string;
  flex?: string;
  alignSelf?: string;
  order?: string;
}
