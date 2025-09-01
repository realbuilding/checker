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
  };
}

export interface DocumentStructure {
  paragraphs: ParagraphInfo[];
  totalLength: number;
  fullText: string;
}

export interface ParagraphInfo {
  text: string;
  runs: RunInfo[];
  startIndex: number;
  endIndex: number;
}

export interface RunInfo {
  text: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  startIndex: number;
  endIndex: number;
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
