// 文档相关类型定义

export interface ParsedDocument {
  content: {
    text: string;
    html: string;
    structure: DocumentStructure;
  };
  styles: {
    fonts: FontInfo[];
    colors: ColorInfo[];
    mainStyle: MainStyle;
  };
  metadata: {
    title?: string;
    author?: string;
    created?: Date;
    modified?: Date;
    wordCount?: number;
    paragraphCount?: number;
    sectionCount?: number;
  };
  structure?: {
    headings?: HeadingInfo[];
    numbering?: NumberingDefinition[];
    sections?: SectionInfo[];
    styles?: WordStyle[];
  };
}

export interface DocumentStructure {
  paragraphs: ParagraphInfo[];
  headings: HeadingInfo[];
  totalLength: number;
  fullText: string;
  styles?: Map<string, WordStyle>;
  numbering?: NumberingDefinition[];
  sections?: SectionInfo[];
}

export interface ParagraphInfo {
  text: string;
  runs: RunInfo[];
  startIndex: number;
  endIndex: number;
  isHeading?: boolean;
  styleId?: string;
  style?: WordStyle;
  numbering?: NumberingInfo;
  outlineLevel?: number;
  heading?: HeadingInfo;
}

export interface RunInfo {
  text: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  font?: string;
  size?: number;
  startIndex: number;
  endIndex: number;
}

// 新增的类型定义
export interface HeadingInfo {
  text: string;
  level: number;
  styleId?: string;
  numbering?: NumberingInfo;
  startIndex?: number;
  numberingText?: string;
  fullNumbering?: string;
}

export interface NumberingInfo {
  numberingId: string;
  level: number;
  definition?: NumberingDefinition;
}

export interface NumberingDefinition {
  id: string;
  levels: NumberingLevel[];
  type: 'decimal' | 'roman' | 'chinese' | 'letter' | 'custom';
}

export interface NumberingLevel {
  level: number;
  format: string;
  text: string;
  start: number;
  suffix: string;
}

export interface WordStyle {
  id: string;
  type: 'paragraph' | 'character' | 'table' | 'numbering';
  name: string;
  basedOn?: string;
  next?: string;
  font?: string;
  color?: string;
  size?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  outlineLevel?: number;
  numberingId?: string;
  isHeading?: boolean;
}

export interface SectionInfo {
  type: 'section';
  startIndex: number;
  properties: SectionProperties;
}

export interface SectionProperties {
  pageSize?: {
    width: number;
    height: number;
  };
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface FontInfo {
  name: string;
  size: number;
  usage: number;
  styles?: string[];
}

export interface ColorInfo {
  value: string;
  usage: number;
  contexts?: string[];
}

export interface FontInfo {
  name: string;
  size: number;
  usage: number; // 使用频率
}

export interface ColorInfo {
  value: string;
  usage: number;
}

export interface MainStyle {
  fontFamily: string;
  fontSize: number;
  color: string;
}

export interface TextPosition {
  start: number;
  end: number;
  line?: number;
  column?: number;
}

export interface DOMPosition {
  paragraphIndex: number;
  paragraphHtml: string;
  localTextIndex: number;
  fullMatch: RegExpMatchArray;
  targetInParagraph: boolean;
}
