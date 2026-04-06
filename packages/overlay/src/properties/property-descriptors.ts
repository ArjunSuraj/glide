import type { PropertyDescriptor } from "@glide-editor/shared";

// --- Layout SVG Icons (14x14) ---
const S = 14; // icon size
const ico = (body: string) => `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" fill="currentColor" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

const LAYOUT_ICONS = {
  block:       ico(`<rect x="2" y="3" width="10" height="8" rx="1" opacity="0.7"/>`),
  flex:        ico(`<rect x="1" y="4" width="3" height="6" rx="0.5"/><rect x="5.5" y="4" width="3" height="6" rx="0.5"/><rect x="10" y="4" width="3" height="6" rx="0.5"/>`),
  grid:        ico(`<rect x="1" y="1" width="5" height="5" rx="0.5"/><rect x="8" y="1" width="5" height="5" rx="0.5"/><rect x="1" y="8" width="5" height="5" rx="0.5"/><rect x="8" y="8" width="5" height="5" rx="0.5"/>`),
  inlineFlex:  ico(`<rect x="1" y="5" width="3" height="4" rx="0.5"/><rect x="5" y="5" width="3" height="4" rx="0.5"/><rect x="9" y="5" width="3" height="4" rx="0.5"/>`),
  none:        ico(`<line x1="3" y1="3" x2="11" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="11" y1="3" x2="3" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`),
  // flex-direction
  row:         ico(`<rect x="1" y="4" width="3" height="6" rx="0.5" opacity="0.4"/><rect x="5" y="4" width="3" height="6" rx="0.5" opacity="0.7"/><rect x="9" y="4" width="3" height="6" rx="0.5"/><path d="M11 2l2 2-2 2" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>`),
  col:         ico(`<rect x="4" y="1" width="6" height="3" rx="0.5" opacity="0.4"/><rect x="4" y="5" width="6" height="3" rx="0.5" opacity="0.7"/><rect x="4" y="9.5" width="6" height="3" rx="0.5"/><path d="M12 11l-2 2-2-2" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>`),
  rowRev:      ico(`<rect x="1" y="4" width="3" height="6" rx="0.5"/><rect x="5" y="4" width="3" height="6" rx="0.5" opacity="0.7"/><rect x="9" y="4" width="3" height="6" rx="0.5" opacity="0.4"/><path d="M3 2l-2 2 2 2" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>`),
  colRev:      ico(`<rect x="4" y="1" width="6" height="3" rx="0.5"/><rect x="4" y="5" width="6" height="3" rx="0.5" opacity="0.7"/><rect x="4" y="9.5" width="6" height="3" rx="0.5" opacity="0.4"/><path d="M12 3l-2-2-2 2" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>`),
  // justify-content
  jStart:      ico(`<rect x="1" y="3" width="2" height="8" rx="0.5"/><rect x="4" y="3" width="2" height="8" rx="0.5"/><rect x="7" y="3" width="2" height="8" rx="0.5" opacity="0.3"/>`),
  jCenter:     ico(`<rect x="2.5" y="3" width="2" height="8" rx="0.5"/><rect x="6" y="3" width="2" height="8" rx="0.5"/><rect x="9.5" y="3" width="2" height="8" rx="0.5"/>`),
  jEnd:        ico(`<rect x="5" y="3" width="2" height="8" rx="0.5" opacity="0.3"/><rect x="8" y="3" width="2" height="8" rx="0.5"/><rect x="11" y="3" width="2" height="8" rx="0.5"/>`),
  jBetween:    ico(`<rect x="1" y="3" width="2" height="8" rx="0.5"/><rect x="6" y="3" width="2" height="8" rx="0.5"/><rect x="11" y="3" width="2" height="8" rx="0.5"/>`),
  jAround:     ico(`<rect x="1.5" y="3" width="2" height="8" rx="0.5"/><rect x="6" y="3" width="2" height="8" rx="0.5"/><rect x="10.5" y="3" width="2" height="8" rx="0.5"/>`),
  jEvenly:     ico(`<rect x="2" y="3" width="2" height="8" rx="0.5"/><rect x="6" y="3" width="2" height="8" rx="0.5"/><rect x="10" y="3" width="2" height="8" rx="0.5"/>`),
  // align-items
  aStart:      ico(`<rect x="1" y="1" width="3" height="5" rx="0.5"/><rect x="5.5" y="1" width="3" height="7" rx="0.5"/><rect x="10" y="1" width="3" height="4" rx="0.5"/>`),
  aCenter:     ico(`<rect x="1" y="4.5" width="3" height="5" rx="0.5"/><rect x="5.5" y="3" width="3" height="8" rx="0.5"/><rect x="10" y="5" width="3" height="4" rx="0.5"/>`),
  aEnd:        ico(`<rect x="1" y="8" width="3" height="5" rx="0.5"/><rect x="5.5" y="6" width="3" height="7" rx="0.5"/><rect x="10" y="9" width="3" height="4" rx="0.5"/>`),
  aStretch:    ico(`<rect x="1" y="1" width="3" height="12" rx="0.5"/><rect x="5.5" y="1" width="3" height="12" rx="0.5"/><rect x="10" y="1" width="3" height="12" rx="0.5"/>`),
  aBaseline:   ico(`<rect x="1" y="2" width="3" height="6" rx="0.5"/><rect x="5.5" y="4" width="3" height="6" rx="0.5"/><rect x="10" y="3" width="3" height="5" rx="0.5"/><line x1="0" y1="7" x2="14" y2="7" stroke="currentColor" stroke-width="0.7" stroke-dasharray="2 1"/>`),
};

// --- Layout ---
export const LAYOUT_DESCRIPTORS: PropertyDescriptor[] = [
  {
    key: "display",
    label: "Display",
    group: "layout",
    controlType: "segmented",
    cssProperty: "display",
    tailwindPrefix: "",
    tailwindScale: "display",
    defaultValue: "block",
    standalone: true,
    classPattern: "^(block|flex|grid|inline-flex|inline-block|inline|hidden|contents)$",
    enumValues: [
      { value: "block", tailwindValue: "block", label: "Block", icon: LAYOUT_ICONS.block },
      { value: "flex", tailwindValue: "flex", label: "Flex", icon: LAYOUT_ICONS.flex },
      { value: "grid", tailwindValue: "grid", label: "Grid", icon: LAYOUT_ICONS.grid },
      { value: "inline-flex", tailwindValue: "inline-flex", label: "Inline Flex", icon: LAYOUT_ICONS.inlineFlex },
      { value: "none", tailwindValue: "hidden", label: "None", icon: LAYOUT_ICONS.none },
    ],
  },
  {
    key: "flexDirection",
    label: "Direction",
    group: "layout",
    controlType: "segmented",
    cssProperty: "flex-direction",
    tailwindPrefix: "flex",
    tailwindScale: "flexDirection",
    defaultValue: "row",
    classPattern: "^flex-(row|col|row-reverse|col-reverse)$",
    enumValues: [
      { value: "row", tailwindValue: "row", label: "Row", icon: LAYOUT_ICONS.row },
      { value: "column", tailwindValue: "col", label: "Column", icon: LAYOUT_ICONS.col },
      { value: "row-reverse", tailwindValue: "row-reverse", label: "Row Reverse", icon: LAYOUT_ICONS.rowRev },
      { value: "column-reverse", tailwindValue: "col-reverse", label: "Column Reverse", icon: LAYOUT_ICONS.colRev },
    ],
  },
  {
    key: "justifyContent",
    label: "Justify",
    group: "layout",
    controlType: "segmented",
    cssProperty: "justify-content",
    tailwindPrefix: "justify",
    tailwindScale: "justifyContent",
    defaultValue: "flex-start",
    enumValues: [
      { value: "flex-start", tailwindValue: "start", label: "Start", icon: LAYOUT_ICONS.jStart },
      { value: "center", tailwindValue: "center", label: "Center", icon: LAYOUT_ICONS.jCenter },
      { value: "flex-end", tailwindValue: "end", label: "End", icon: LAYOUT_ICONS.jEnd },
      { value: "space-between", tailwindValue: "between", label: "Between", icon: LAYOUT_ICONS.jBetween },
      { value: "space-around", tailwindValue: "around", label: "Around", icon: LAYOUT_ICONS.jAround },
      { value: "space-evenly", tailwindValue: "evenly", label: "Evenly", icon: LAYOUT_ICONS.jEvenly },
    ],
  },
  {
    key: "alignItems",
    label: "Align",
    group: "layout",
    controlType: "segmented",
    cssProperty: "align-items",
    tailwindPrefix: "items",
    tailwindScale: "alignItems",
    defaultValue: "stretch",
    enumValues: [
      { value: "flex-start", tailwindValue: "start", label: "Start", icon: LAYOUT_ICONS.aStart },
      { value: "center", tailwindValue: "center", label: "Center", icon: LAYOUT_ICONS.aCenter },
      { value: "flex-end", tailwindValue: "end", label: "End", icon: LAYOUT_ICONS.aEnd },
      { value: "stretch", tailwindValue: "stretch", label: "Stretch", icon: LAYOUT_ICONS.aStretch },
      { value: "baseline", tailwindValue: "baseline", label: "Baseline", icon: LAYOUT_ICONS.aBaseline },
    ],
  },
  {
    key: "flexWrap",
    label: "Wrap",
    group: "layout",
    controlType: "segmented",
    cssProperty: "flex-wrap",
    tailwindPrefix: "flex",
    tailwindScale: "flexWrap",
    defaultValue: "nowrap",
    classPattern: "^flex-(nowrap|wrap|wrap-reverse)$",
    enumValues: [
      { value: "nowrap", tailwindValue: "nowrap", label: "No Wrap" },
      { value: "wrap", tailwindValue: "wrap", label: "Wrap" },
      { value: "wrap-reverse", tailwindValue: "wrap-reverse", label: "Wrap Rev" },
    ],
  },
  {
    key: "gap",
    label: "Gap",
    group: "layout",
    controlType: "number-scrub",
    cssProperty: "gap",
    tailwindPrefix: "gap",
    tailwindScale: "spacing",
    defaultValue: "0",
    min: 0,
  },
  // Grid-only controls
  {
    key: "gridTemplateCols",
    label: "Columns",
    group: "layout",
    controlType: "number-scrub",
    cssProperty: "grid-template-columns",
    tailwindPrefix: "grid-cols",
    tailwindScale: "gridTemplateColumns",
    defaultValue: "none",
    standalone: true,
    classPattern: "^grid-cols-(\\d+|none|subgrid)$",
    min: 1,
    max: 12,
  },
  {
    key: "gridTemplateRows",
    label: "Rows",
    group: "layout",
    controlType: "number-scrub",
    cssProperty: "grid-template-rows",
    tailwindPrefix: "grid-rows",
    tailwindScale: "gridTemplateRows",
    defaultValue: "none",
    standalone: true,
    classPattern: "^grid-rows-(\\d+|none|subgrid)$",
    min: 1,
    max: 12,
  },
  {
    key: "columnGap",
    label: "Col Gap",
    group: "layout",
    controlType: "number-scrub",
    cssProperty: "column-gap",
    tailwindPrefix: "gap-x",
    tailwindScale: "spacing",
    defaultValue: "0",
    min: 0,
  },
  {
    key: "rowGap",
    label: "Row Gap",
    group: "layout",
    controlType: "number-scrub",
    cssProperty: "row-gap",
    tailwindPrefix: "gap-y",
    tailwindScale: "spacing",
    defaultValue: "0",
    min: 0,
  },
  // Flex child controls (shown when parent is flex)
  {
    key: "flexGrow",
    label: "Grow",
    group: "layout",
    controlType: "number-scrub",
    cssProperty: "flex-grow",
    tailwindPrefix: "grow",
    tailwindScale: "flexGrow",
    defaultValue: "0",
    standalone: true,
    classPattern: "^grow(-0)?$",
    min: 0,
  },
  {
    key: "flexShrink",
    label: "Shrink",
    group: "layout",
    controlType: "number-scrub",
    cssProperty: "flex-shrink",
    tailwindPrefix: "shrink",
    tailwindScale: "flexShrink",
    defaultValue: "1",
    standalone: true,
    classPattern: "^shrink(-0)?$",
    min: 0,
  },
  {
    key: "alignSelf",
    label: "Self",
    group: "layout",
    controlType: "segmented",
    cssProperty: "align-self",
    tailwindPrefix: "self",
    tailwindScale: "alignSelf",
    defaultValue: "auto",
    enumValues: [
      { value: "auto", tailwindValue: "auto", label: "Auto" },
      { value: "flex-start", tailwindValue: "start", label: "Start" },
      { value: "center", tailwindValue: "center", label: "Center" },
      { value: "flex-end", tailwindValue: "end", label: "End" },
      { value: "stretch", tailwindValue: "stretch", label: "Stretch" },
    ],
  },
  {
    key: "order",
    label: "Order",
    group: "layout",
    controlType: "number-scrub",
    cssProperty: "order",
    tailwindPrefix: "order",
    tailwindScale: "order",
    defaultValue: "0",
    standalone: true,
    classPattern: "^-?order-(\\d+|first|last|none)$",
  },
];

// --- Spacing (compound: box-model) ---
export const SPACING_DESCRIPTORS: PropertyDescriptor[] = [
  // Padding
  { key: "paddingTop", label: "Top", group: "spacing", controlType: "box-model", cssProperty: "padding-top", tailwindPrefix: "pt", tailwindScale: "spacing", relatedPrefixes: ["p", "py"], defaultValue: "0", min: 0, compound: true, compoundGroup: "spacing" },
  { key: "paddingRight", label: "Right", group: "spacing", controlType: "box-model", cssProperty: "padding-right", tailwindPrefix: "pr", tailwindScale: "spacing", relatedPrefixes: ["p", "px"], defaultValue: "0", min: 0, compound: true, compoundGroup: "spacing" },
  { key: "paddingBottom", label: "Bottom", group: "spacing", controlType: "box-model", cssProperty: "padding-bottom", tailwindPrefix: "pb", tailwindScale: "spacing", relatedPrefixes: ["p", "py"], defaultValue: "0", min: 0, compound: true, compoundGroup: "spacing" },
  { key: "paddingLeft", label: "Left", group: "spacing", controlType: "box-model", cssProperty: "padding-left", tailwindPrefix: "pl", tailwindScale: "spacing", relatedPrefixes: ["p", "px"], defaultValue: "0", min: 0, compound: true, compoundGroup: "spacing" },
  // Margin
  { key: "marginTop", label: "Top", group: "spacing", controlType: "box-model", cssProperty: "margin-top", tailwindPrefix: "mt", tailwindScale: "spacing", relatedPrefixes: ["m", "my"], defaultValue: "0", compound: true, compoundGroup: "spacing" },
  { key: "marginRight", label: "Right", group: "spacing", controlType: "box-model", cssProperty: "margin-right", tailwindPrefix: "mr", tailwindScale: "spacing", relatedPrefixes: ["m", "mx"], defaultValue: "0", compound: true, compoundGroup: "spacing" },
  { key: "marginBottom", label: "Bottom", group: "spacing", controlType: "box-model", cssProperty: "margin-bottom", tailwindPrefix: "mb", tailwindScale: "spacing", relatedPrefixes: ["m", "my"], defaultValue: "0", compound: true, compoundGroup: "spacing" },
  { key: "marginLeft", label: "Left", group: "spacing", controlType: "box-model", cssProperty: "margin-left", tailwindPrefix: "ml", tailwindScale: "spacing", relatedPrefixes: ["m", "mx"], defaultValue: "0", compound: true, compoundGroup: "spacing" },
];

// --- Size ---
export const SIZE_DESCRIPTORS: PropertyDescriptor[] = [
  { key: "width", label: "W", group: "size", controlType: "number-scrub", cssProperty: "width", tailwindPrefix: "w", tailwindScale: "spacing", defaultValue: "auto", min: 0 },
  { key: "height", label: "H", group: "size", controlType: "number-scrub", cssProperty: "height", tailwindPrefix: "h", tailwindScale: "spacing", defaultValue: "auto", min: 0 },
  { key: "minWidth", label: "Min W", group: "size", controlType: "number-scrub", cssProperty: "min-width", tailwindPrefix: "min-w", tailwindScale: "spacing", defaultValue: "0", min: 0 },
  { key: "maxWidth", label: "Max W", group: "size", controlType: "number-scrub", cssProperty: "max-width", tailwindPrefix: "max-w", tailwindScale: "spacing", defaultValue: "none" },
  { key: "minHeight", label: "Min H", group: "size", controlType: "number-scrub", cssProperty: "min-height", tailwindPrefix: "min-h", tailwindScale: "spacing", defaultValue: "0", min: 0 },
  { key: "maxHeight", label: "Max H", group: "size", controlType: "number-scrub", cssProperty: "max-height", tailwindPrefix: "max-h", tailwindScale: "spacing", defaultValue: "none" },
];

// --- Typography ---
export const TYPOGRAPHY_DESCRIPTORS: PropertyDescriptor[] = [
  { key: "fontSize", label: "Size", group: "typography", controlType: "number-scrub", cssProperty: "font-size", tailwindPrefix: "text", tailwindScale: "fontSize", defaultValue: "16px", min: 0, classPattern: "^text-(xs|sm|base|lg|xl|\\d+xl|\\[.+\\])$" },
  {
    key: "fontWeight", label: "Weight", group: "typography", controlType: "segmented", cssProperty: "font-weight", tailwindPrefix: "font", tailwindScale: "fontWeight", defaultValue: "400",
    enumValues: [
      { value: "300", tailwindValue: "light", label: "300" },
      { value: "400", tailwindValue: "normal", label: "400" },
      { value: "500", tailwindValue: "medium", label: "500" },
      { value: "600", tailwindValue: "semibold", label: "600" },
      { value: "700", tailwindValue: "bold", label: "700" },
    ],
  },
  { key: "lineHeight", label: "Height", group: "typography", controlType: "number-scrub", cssProperty: "line-height", tailwindPrefix: "leading", tailwindScale: "lineHeight", defaultValue: "normal" },
  { key: "letterSpacing", label: "Spacing", group: "typography", controlType: "number-scrub", cssProperty: "letter-spacing", tailwindPrefix: "tracking", tailwindScale: "letterSpacing", defaultValue: "normal" },
  {
    key: "textAlign", label: "Align", group: "typography", controlType: "segmented", cssProperty: "text-align", tailwindPrefix: "text", tailwindScale: "textAlign", defaultValue: "left",
    classPattern: "^text-(left|center|right|justify|start|end)$",
    enumValues: [
      { value: "left", tailwindValue: "left", label: "Left" },
      { value: "center", tailwindValue: "center", label: "Center" },
      { value: "right", tailwindValue: "right", label: "Right" },
      { value: "justify", tailwindValue: "justify", label: "Justify" },
    ],
  },
  { key: "color", label: "Color", group: "typography", controlType: "color-swatch", cssProperty: "color", tailwindPrefix: "text", tailwindScale: "colors", defaultValue: "#000000", classPattern: "^text-(\\w+-\\d+|black|white|transparent|current|inherit|\\[.+\\])$" },
];

// --- Background ---
export const BACKGROUND_DESCRIPTORS: PropertyDescriptor[] = [
  { key: "backgroundColor", label: "Color", group: "background", controlType: "color-swatch", cssProperty: "background-color", tailwindPrefix: "bg", tailwindScale: "colors", defaultValue: "transparent" },
];

// All descriptors in group order
export const ALL_DESCRIPTORS: PropertyDescriptor[] = [
  ...LAYOUT_DESCRIPTORS,
  ...SPACING_DESCRIPTORS,
  ...SIZE_DESCRIPTORS,
  ...TYPOGRAPHY_DESCRIPTORS,
  ...BACKGROUND_DESCRIPTORS,
];
