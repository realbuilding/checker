import JSZip from 'jszip';
import { 
  ParsedDocument, 
  DocumentStructure, 
  ParagraphInfo, 
  RunInfo, 
  HeadingInfo,
  NumberingInfo,
  DocumentMetadata,
  StructureElement,
  WordStyle,
  NumberingDefinition,
  SectionInfo
} from '../../types/document';

/**
 * 高级Word文档结构解析器
 * 实现完整的Word文档结构解析，包括样式、编号、层级关系
 */
export class AdvancedDocumentParser {
  
  async parseDocument(file: File): Promise<ParsedDocument> {
    console.log('🔬 开始高级文档解析:', file.name);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      // 并行解析所有核心组件
      const [
        documentXml,
        stylesXml,
        numberingXml,
        relationshipsXml
      ] = await Promise.all([
        zip.file('word/document.xml')?.async('text'),
        zip.file('word/styles.xml')?.async('text'),
        zip.file('word/numbering.xml')?.async('text'),
        zip.file('word/_rels/document.xml.rels')?.async('text')
      ]);

      if (!documentXml) {
        throw new Error('无法找到document.xml文件');
      }

      // 解析文档结构
      const structure = await this.parseFullStructure({
        documentXml,
        stylesXml,
        numberingXml,
        relationshipsXml
      });

      // 构建完整的文档对象
      const document: ParsedDocument = {
        content: {
          text: structure.fullText,
          html: this.generateEnhancedHtml(structure),
          structure: structure
        },
        styles: {
          fonts: this.extractFontHierarchy(structure),
          colors: this.extractColorHierarchy(structure),
          mainStyle: this.analyzeDocumentStyle(structure)
        },
        metadata: {
          title: this.extractTitle(structure),
          created: new Date(file.lastModified),
          modified: new Date(file.lastModified),
          wordCount: structure.fullText.length,
          paragraphCount: structure.paragraphs.length,
          sectionCount: structure.sections?.length || 0
        },
        structure: {
          headings: structure.headings,
          numbering: structure.numbering,
          sections: structure.sections,
          styles: structure.styles
        }
      };

      console.log('✅ 高级文档解析完成');
      console.log(`📊 统计: ${structure.paragraphs.length}段落, ${structure.headings.length}标题, ${structure.numbering?.length || 0}编号规则`);

      return document;
      
    } catch (error) {
      console.error('❌ 高级文档解析失败:', error);
      throw new Error(`高级文档解析失败: ${error.message}`);
    }
  }

  /**
   * 解析完整的文档结构
   */
  private async parseFullStructure(xmlFiles: {
    documentXml: string;
    stylesXml?: string;
    numberingXml?: string;
    relationshipsXml?: string;
  }) {
    const { documentXml, stylesXml, numberingXml } = xmlFiles;

    // 解析样式和编号定义
    const styles = stylesXml ? this.parseStyles(stylesXml) : new Map();
    const numbering = numberingXml ? this.parseNumbering(numberingXml) : new Map();

    // 解析文档主体
    const documentStructure = this.parseDocumentStructure(documentXml, styles, numbering);

    return {
      ...documentStructure,
      styles,
      numbering: Array.from(numbering.values()),
      sections: this.extractSections(documentXml)
    };
  }

  /**
   * 解析Word样式定义
   */
  private parseStyles(stylesXml: string): Map<string, WordStyle> {
    const styles = new Map<string, WordStyle>();
    
    const styleRegex = /<w:style\s+w:type="([^"]+)"\s+w:styleId="([^"]+)"[^>]*>(.*?)<\/w:style>/gs;
    let styleMatch;

    while ((styleMatch = styleRegex.exec(stylesXml)) !== null) {
      const [, type, styleId, styleContent] = styleMatch;
      
      const style: WordStyle = {
        id: styleId,
        type: type as 'paragraph' | 'character' | 'table' | 'numbering',
        name: this.extractStyleName(styleContent),
        basedOn: this.extractBasedOn(styleContent),
        next: this.extractNextStyle(styleContent),
        font: this.extractFontInfo(styleContent),
        color: this.extractColor(styleContent),
        size: this.extractFontSize(styleContent),
        bold: this.extractBold(styleContent),
        italic: this.extractItalic(styleContent),
        underline: this.extractUnderline(styleContent),
        outlineLevel: this.extractOutlineLevel(styleContent),
        numberingId: this.extractNumberingId(styleContent),
        isHeading: this.isHeadingStyle(styleContent)
      };

      styles.set(styleId, style);
    }

    return styles;
  }

  /**
   * 解析编号定义
   */
  private parseNumbering(numberingXml: string): Map<string, NumberingDefinition> {
    const numbering = new Map<string, NumberingDefinition>();
    
    const abstractNumRegex = /<w:abstractNum\s+w:abstractNumId="([^"]+)"[^>]*>(.*?)<\/w:abstractNum>/gs;
    let abstractMatch;

    while ((abstractMatch = abstractNumRegex.exec(numberingXml)) !== null) {
      const [, abstractId, abstractContent] = abstractMatch;
      
      const levels = this.parseNumberingLevels(abstractContent);
      
      numbering.set(abstractId, {
        id: abstractId,
        levels,
        type: this.determineNumberingType(levels)
      });
    }

    return numbering;
  }

  /**
   * 解析文档结构（包含样式和编号）
   */
  private parseDocumentStructure(
    documentXml: string, 
    styles: Map<string, WordStyle>,
    numbering: Map<string, NumberingDefinition>
  ) {
    const paragraphs: ParagraphInfo[] = [];
    const headings: HeadingInfo[] = [];
    let fullText = '';
    let currentIndex = 0;

    // 解析段落
    const paragraphRegex = /<w:p\b[^>]*>(.*?)<\/w:p>/gs;
    let paragraphMatch;

    while ((paragraphMatch = paragraphRegex.exec(documentXml)) !== null) {
      const paragraphXml = paragraphMatch[1];
      const paragraph = this.parseParagraphWithStructure(
        paragraphXml, 
        currentIndex, 
        styles, 
        numbering
      );

      paragraphs.push(paragraph);
      
      // 如果是标题，添加到标题列表
      if (paragraph.heading) {
        headings.push(paragraph.heading);
      }

      fullText += paragraph.text;
      currentIndex += paragraph.text.length;
    }

    return {
      paragraphs,
      headings,
      fullText,
      totalLength: currentIndex
    };
  }

  /**
   * 解析段落（包含完整结构信息）
   */
  private parseParagraphWithStructure(
    paragraphXml: string,
    startIndex: number,
    styles: Map<string, WordStyle>,
    numbering: Map<string, NumberingDefinition>
  ): ParagraphInfo {
    const runs: RunInfo[] = [];
    let paragraphText = '';
    let currentIndex = startIndex;

    // 提取段落样式
    const styleId = this.extractParagraphStyle(paragraphXml);
    const style = styleId ? styles.get(styleId) : null;

    // 提取编号信息
    const numberingInfo = this.extractParagraphNumbering(paragraphXml, numbering);

    // 解析运行
    const runRegex = /<w:r\b[^>]*>(.*?)<\/w:r>/gs;
    let runMatch;

    while ((runMatch = runRegex.exec(paragraphXml)) !== null) {
      const runXml = runMatch[1];
      const run = this.parseRunWithStyle(runXml, currentIndex, styles);

      if (run.text) {
        runs.push(run);
        paragraphText += run.text;
        currentIndex += run.text.length;
      }
    }

    // 构建段落信息
    const paragraph: ParagraphInfo = {
      text: paragraphText || '\n',
      runs,
      startIndex,
      endIndex: startIndex + (paragraphText || '\n').length,
      styleId,
      style,
      numbering: numberingInfo,
      isHeading: style?.isHeading || false,
      outlineLevel: style?.outlineLevel,
      heading: this.buildHeadingInfo(paragraphText, style, numberingInfo, startIndex)
    };

    return paragraph;
  }

  /**
   * 构建标题信息
   */
  private buildHeadingInfo(
    text: string,
    style?: WordStyle,
    numbering?: NumberingInfo,
    startIndex?: number
  ): HeadingInfo | undefined {
    if (!style?.isHeading) return undefined;

    return {
      text: text.trim(),
      level: style.outlineLevel || 1,
      styleId: style.id,
      numbering,
      startIndex,
      numberingText: this.generateNumberingText(numbering),
      fullNumbering: this.buildFullNumbering(numbering)
    };
  }

  /**
   * 工具方法：提取各种样式属性
   */
  private extractStyleName(styleContent: string): string {
    const match = styleContent.match(/<w:name\s+w:val="([^"]+)"/);
    return match?.[1] || 'Normal';
  }

  private extractBasedOn(styleContent: string): string | undefined {
    const match = styleContent.match(/<w:basedOn\s+w:val="([^"]+)"/);
    return match?.[1];
  }

  private extractNextStyle(styleContent: string): string | undefined {
    const match = styleContent.match(/<w:next\s+w:val="([^"]+)"/);
    return match?.[1];
  }

  private extractFontInfo(styleContent: string) {
    const match = styleContent.match(/<w:rFonts\s+[^>]*w:ascii="([^"]+)"/);
    return match?.[1] || 'Times New Roman';
  }

  private extractColor(styleContent: string): string | undefined {
    const match = styleContent.match(/<w:color\s+w:val="([^"]+)"/);
    return match?.[1];
  }

  private extractFontSize(styleContent: string): number {
    const match = styleContent.match(/<w:sz\s+w:val="(\d+)"/);
    return match ? parseInt(match[1]) / 2 : 12;
  }

  private extractBold(styleContent: string): boolean {
    return styleContent.includes('<w:b/>') || styleContent.includes('<w:b ');
  }

  private extractItalic(styleContent: string): boolean {
    return styleContent.includes('<w:i/>') || styleContent.includes('<w:i ');
  }

  private extractUnderline(styleContent: string): boolean {
    return styleContent.includes('<w:u ') || styleContent.includes('<w:u/>');
  }

  private extractOutlineLevel(styleContent: string): number | undefined {
    const match = styleContent.match(/<w:outlineLvl\s+w:val="(\d+)"/);
    return match ? parseInt(match[1]) : undefined;
  }

  private extractNumberingId(styleContent: string): string | undefined {
    const match = styleContent.match(/<w:numId\s+w:val="(\d+)"/);
    return match?.[1];
  }

  private isHeadingStyle(styleContent: string): boolean {
    return styleContent.includes('<w:outlineLvl') || 
           styleContent.includes('<w:heading') ||
           styleContent.includes('<w:title');
  }

  /**
   * 段落样式提取
   */
  private extractParagraphStyle(paragraphXml: string): string | undefined {
    const match = paragraphXml.match(/<w:pStyle\s+w:val="([^"]+)"/);
    return match?.[1];
  }

  /**
   * 编号信息提取
   */
  private extractParagraphNumbering(
    paragraphXml: string, 
    numbering: Map<string, NumberingDefinition>
  ): NumberingInfo | undefined {
    const numMatch = paragraphXml.match(/<w:numPr[^>]*>.*?<w:numId\s+w:val="(\d+)".*?<\/w:numPr>/s);
    const ilvlMatch = paragraphXml.match(/<w:numPr[^>]*>.*?<w:ilvl\s+w:val="(\d+)".*?<\/w:numPr>/s);

    if (!numMatch) return undefined;

    return {
      numberingId: numMatch[1],
      level: ilvlMatch ? parseInt(ilvlMatch[1]) : 0,
      definition: numbering.get(numMatch[1])
    };
  }

  /**
   * 解析编号层级
   */
  private parseNumberingLevels(abstractContent: string) {
    const levels: any[] = [];
    const levelRegex = /<w:lvl\s+w:ilvl="(\d+)"[^>]*>(.*?)<\/w:lvl>/gs;
    let levelMatch;

    while ((levelMatch = levelRegex.exec(abstractContent)) !== null) {
      const [, levelNum, levelContent] = levelMatch;
      
      levels[parseInt(levelNum)] = {
        level: parseInt(levelNum),
        format: this.extractNumberFormat(levelContent),
        text: this.extractNumberText(levelContent),
        start: this.extractNumberStart(levelContent),
        suffix: this.extractNumberSuffix(levelContent)
      };
    }

    return levels;
  }

  private extractNumberFormat(content: string): string {
    const match = content.match(/<w:numFmt\s+w:val="([^"]+)"/);
    return match?.[1] || 'decimal';
  }

  private extractNumberText(content: string): string {
    const match = content.match(/<w:lvlText\s+w:val="([^"]+)"/);
    return match?.[1] || '%1.';
  }

  private extractNumberStart(content: string): number {
    const match = content.match(/<w:start\s+w:val="(\d+)"/);
    return match ? parseInt(match[1]) : 1;
  }

  private extractNumberSuffix(content: string): string {
    const match = content.match(/<w:suff\s+w:val="([^"]+)"/);
    return match?.[1] || 'tab';
  }

  private determineNumberingType(levels: any[]): string {
    const formats = levels.map(l => l?.format).filter(Boolean);
    if (formats.includes('chineseCounting')) return 'chinese';
    if (formats.includes('upperRoman')) return 'roman';
    if (formats.includes('lowerLetter')) return 'letter';
    return 'decimal';
  }

  /**
   * 生成编号文本
   */
  private generateNumberingText(numbering?: NumberingInfo): string {
    if (!numbering?.definition) return '';
    
    const level = numbering.definition.levels[numbering.level];
    if (!level) return '';

    return level.text.replace('%1', level.start.toString());
  }

  private buildFullNumbering(numbering?: NumberingInfo): string {
    if (!numbering) return '';
    return `${numbering.numberingId}-${numbering.level}`;
  }

  /**
   * 解析运行（带样式信息）
   */
  private parseRunWithStyle(
    runXml: string, 
    startIndex: number, 
    styles: Map<string, WordStyle>
  ): RunInfo {
    const text = this.extractRunText(runXml);
    
    return {
      text,
      color: this.extractRunColor(runXml),
      bold: this.extractRunBold(runXml),
      italic: this.extractRunItalic(runXml),
      underline: this.extractRunUnderline(runXml),
      font: this.extractRunFont(runXml),
      size: this.extractRunSize(runXml),
      startIndex,
      endIndex: startIndex + text.length
    };
  }

  private extractRunText(runXml: string): string {
    const textRegex = /<w:t[^>]*>(.*?)<\/w:t>/gs;
    let text = '';
    let textMatch;

    while ((textMatch = textRegex.exec(runXml)) !== null) {
      text += textMatch[1];
    }

    return text;
  }

  private extractRunColor(runXml: string): string | undefined {
    const match = runXml.match(/<w:color\s+w:val="([^"]+)"/);
    return match?.[1];
  }

  private extractRunBold(runXml: string): boolean {
    return runXml.includes('<w:b/>') || runXml.includes('<w:b ');
  }

  private extractRunItalic(runXml: string): boolean {
    return runXml.includes('<w:i/>') || runXml.includes('<w:i ');
  }

  private extractRunUnderline(runXml: string): boolean {
    return runXml.includes('<w:u ') || runXml.includes('<w:u/>');
  }

  private extractRunFont(runXml: string): string {
    const match = runXml.match(/<w:rFonts\s+[^>]*w:ascii="([^"]+)"/);
    return match?.[1] || 'Times New Roman';
  }

  private extractRunSize(runXml: string): number {
    const match = runXml.match(/<w:sz\s+w:val="(\d+)"/);
    return match ? parseInt(match[1]) / 2 : 12;
  }

  /**
   * 提取文档标题
   */
  private extractTitle(structure: any): string {
    const firstHeading = structure.headings[0];
    return firstHeading?.text || '未命名文档';
  }

  /**
   * 提取文档节信息
   */
  private extractSections(documentXml: string): SectionInfo[] {
    const sections: SectionInfo[] = [];
    
    const sectionRegex = /<w:sectPr[^>]*>(.*?)<\/w:sectPr>/gs;
    let sectionMatch;

    while ((sectionMatch = sectionRegex.exec(documentXml)) !== null) {
      const sectionContent = sectionMatch[1];
      
      sections.push({
        type: 'section',
        startIndex: sectionMatch.index,
        properties: this.extractSectionProperties(sectionContent)
      });
    }

    return sections;
  }

  private extractSectionProperties(sectionContent: string): any {
    // 简化的节属性提取
    return {
      pageSize: this.extractPageSize(sectionContent),
      margins: this.extractMargins(sectionContent)
    };
  }

  private extractPageSize(content: string): any {
    const match = content.match(/<w:pgSz\s+w:w="(\d+)"\s+w:h="(\d+)"/);
    return match ? {
      width: parseInt(match[1]) / 20,
      height: parseInt(match[2]) / 20
    } : { width: 210, height: 297 };
  }

  private extractMargins(content: string): any {
    const match = content.match(/<w:pgMar\s+[^>]*w:top="(\d+)"\s+w:right="(\d+)"\s+w:bottom="(\d+)"\s+w:left="(\d+)"/);
    return match ? {
      top: parseInt(match[1]) / 20,
      right: parseInt(match[2]) / 20,
      bottom: parseInt(match[3]) / 20,
      left: parseInt(match[4]) / 20
    } : { top: 25, right: 25, bottom: 25, left: 25 };
  }

  /**
   * 提取字体层级信息
   */
  private extractFontHierarchy(structure: any) {
    const fonts = new Map<string, { name: string; usage: number; styles: string[] }>();
    
    structure.paragraphs.forEach((para: ParagraphInfo) => {
      para.runs.forEach(run => {
        const font = run.font || 'Times New Roman';
        if (!fonts.has(font)) {
          fonts.set(font, { name: font, usage: 0, styles: [] });
        }
        
        const fontInfo = fonts.get(font)!;
        fontInfo.usage += run.text.length;
        
        if (para.styleId && !fontInfo.styles.includes(para.styleId)) {
          fontInfo.styles.push(para.styleId);
        }
      });
    });

    return Array.from(fonts.values()).sort((a, b) => b.usage - a.usage);
  }

  /**
   * 提取颜色层级信息
   */
  private extractColorHierarchy(structure: any) {
    const colors = new Map<string, { value: string; usage: number; contexts: string[] }>();
    
    structure.paragraphs.forEach((para: ParagraphInfo) => {
      para.runs.forEach(run => {
        const color = run.color || '000000';
        if (!colors.has(color)) {
          colors.set(color, { value: color, usage: 0, contexts: [] });
        }
        
        const colorInfo = colors.get(color)!;
        colorInfo.usage += run.text.length;
        
        if (para.styleId && !colorInfo.contexts.includes(para.styleId)) {
          colorInfo.contexts.push(para.styleId);
        }
      });
    });

    return Array.from(colors.values()).sort((a, b) => b.usage - a.usage);
  }

  /**
   * 分析文档整体样式
   */
  private analyzeDocumentStyle(structure: any) {
    const styles = structure.styles as Map<string, WordStyle>;
    
    // 找出最常用的样式
    const styleUsage = new Map<string, number>();
    
    structure.paragraphs.forEach((para: ParagraphInfo) => {
      if (para.styleId) {
        styleUsage.set(para.styleId, (styleUsage.get(para.styleId) || 0) + 1);
      }
    });

    const mainStyle = Array.from(styleUsage.entries())
      .sort(([,a], [,b]) => b - a)[0]?.[0];

    const style = styles.get(mainStyle || 'Normal');

    return {
      fontFamily: style?.font || 'Times New Roman',
      fontSize: style?.size || 12,
      color: style?.color || '000000',
      mainStyle: mainStyle || 'Normal'
    };
  }

  /**
   * 生成增强的HTML
   */
  private generateEnhancedHtml(structure: any): string {
    let html = '';
    
    structure.paragraphs.forEach((para: ParagraphInfo) => {
      const tag = this.determineHtmlTag(para);
      const classes = this.generateCssClasses(para);
      const style = this.generateInlineStyle(para);
      
      let paraHtml = `<${tag}`;
      if (classes) paraHtml += ` class="${classes}"`;
      if (style) paraHtml += ` style="${style}"`;
      
      paraHtml += '>';
      
      // 添加编号文本
      if (para.numbering) {
        const numberingText = this.generateNumberingText(para.numbering);
        if (numberingText) {
          paraHtml += `<span class="numbering">${numberingText}</span> `;
        }
      }
      
      // 添加运行文本
      para.runs.forEach(run => {
        let runHtml = run.text;
        
        if (run.bold || run.italic || run.color) {
          let runStyle = '';
          if (run.bold) runStyle += 'font-weight:bold;';
          if (run.italic) runStyle += 'font-style:italic;';
          if (run.color && run.color !== '000000') runStyle += `color:#${run.color};`;
          
          runHtml = `<span style="${runStyle}">${run.text}</span>`;
        }
        
        paraHtml += runHtml;
      });
      
      paraHtml += `</${tag}>`;
      html += paraHtml;
    });
    
    return html;
  }

  private determineHtmlTag(para: ParagraphInfo): string {
    if (para.isHeading) {
      return `h${para.outlineLevel || 1}`;
    }
    return 'p';
  }

  private generateCssClasses(para: ParagraphInfo): string {
    const classes = [];
    if (para.styleId) classes.push(`style-${para.styleId}`);
    if (para.numbering) classes.push('numbered');
    return classes.join(' ');
  }

  private generateInlineStyle(para: ParagraphInfo): string {
    const styles = [];
    if (para.style?.font) styles.push(`font-family:${para.style.font}`);
    if (para.style?.size) styles.push(`font-size:${para.style.size}pt`);
    if (para.style?.color) styles.push(`color:#${para.style.color}`);
    return styles.join(';');
  }

  validateFormat(file: File): boolean {
    return file.name.toLowerCase().endsWith('.docx');
  }
}