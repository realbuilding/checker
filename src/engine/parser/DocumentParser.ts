import mammoth from 'mammoth';
import JSZip from 'jszip';
import { ParsedDocument, DocumentStructure, ParagraphInfo, RunInfo } from '../../types/document';

/**
 * 文档解析器 - 基于PoC验证成功的算法
 * 集成mammoth.js和docx深度解析能力
 */
export class DocumentParser {
  
  async parseDocument(file: File): Promise<ParsedDocument> {
    console.log('🔍 开始解析文档:', file.name);
    
    try {
      // 并行解析：mammoth转HTML + docx深度分析
      const [mammothResult, docxAnalysis] = await Promise.all([
        this.parseWithMammoth(file),
        this.parseWithDocx(file)
      ]);
      
      // 验证文本一致性（基于PoC经验）
      const textMatch = mammothResult.plainText === docxAnalysis.fullText;
      if (!textMatch) {
        console.warn('⚠️ 文本内容不完全匹配，使用mammoth结果为准');
      }
      
      // 增强HTML，添加颜色样式信息
      const enhancedHtml = this.enhanceHtmlWithColors(mammothResult.html, docxAnalysis);
      
      const document: ParsedDocument = {
        content: {
          text: mammothResult.plainText,
          html: enhancedHtml,
          structure: docxAnalysis
        },
        styles: {
          fonts: this.extractFontInfo(docxAnalysis),
          colors: this.extractColorInfo(docxAnalysis),
          mainStyle: this.analyzeMainStyle(docxAnalysis)
        },
        metadata: {
          title: file.name,
          created: new Date(file.lastModified),
          modified: new Date(file.lastModified)
        }
      };
      
      console.log('✅ 文档解析完成');
      console.log(`📊 统计: ${docxAnalysis.paragraphs.length}段落, ${docxAnalysis.totalLength}字符`);
      
      return document;
      
    } catch (error) {
      console.error('❌ 文档解析失败:', error);
      throw new Error(`文档解析失败: ${error.message}`);
    }
  }
  
  private async parseWithMammoth(file: File) {
    console.log('🐘 Mammoth.js 转换中...');
    
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        styleMap: [
          "p => p:fresh",
          "b => strong",
          "i => em"
        ],
        includeDefaultStyleMap: true,
        includeEmbeddedStyleMap: true,
        transformDocument: mammoth.transforms.paragraph(function(element) {
          // 保留段落的样式信息
          return element;
        }),
        // 自定义样式处理器，保留颜色信息
        styleMapBuilder: function(styleMap) {
          return styleMap;
        }
      }
    );
    
    const plainText = this.extractPlainText(result.value);
    
    return {
      html: result.value,
      plainText,
      messages: result.messages
    };
  }
  
  private async parseWithDocx(file: File): Promise<DocumentStructure> {
    console.log('📄 Docx 深度解析中...');
    
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    // 解析document.xml
    const documentXml = await zip.file('word/document.xml')?.async('text');
    if (!documentXml) {
      throw new Error('无法找到document.xml文件');
    }
    
    return this.parseDocumentStructure(documentXml);
  }
  
  private parseDocumentStructure(xml: string): DocumentStructure {
    const paragraphs: ParagraphInfo[] = [];
    let fullText = '';
    let currentIndex = 0;
    
    // 提取段落 - 基于PoC验证的正则表达式
    const paragraphRegex = /<w:p\b[^>]*>(.*?)<\/w:p>/gs;
    let paragraphMatch;
    
    while ((paragraphMatch = paragraphRegex.exec(xml)) !== null) {
      const paragraphXml = paragraphMatch[1];
      const paragraph = this.parseParagraph(paragraphXml, currentIndex);
      
      if (paragraph.text.trim()) {
        paragraphs.push(paragraph);
        fullText += paragraph.text;
        currentIndex += paragraph.text.length;
      }
    }
    
    return {
      paragraphs,
      fullText,
      totalLength: currentIndex
    };
  }
  
  private parseParagraph(paragraphXml: string, startIndex: number): ParagraphInfo {
    const runs: RunInfo[] = [];
    let paragraphText = '';
    let currentIndex = startIndex;
    
    // 提取运行(run) - 基于PoC验证的算法
    const runRegex = /<w:r\b[^>]*>(.*?)<\/w:r>/gs;
    let runMatch;
    
    while ((runMatch = runRegex.exec(paragraphXml)) !== null) {
      const runXml = runMatch[1];
      const run = this.parseRun(runXml, currentIndex);
      
      if (run.text) {
        runs.push(run);
        paragraphText += run.text;
        currentIndex += run.text.length;
      }
    }
    
    return {
      text: paragraphText,
      runs,
      startIndex,
      endIndex: currentIndex
    };
  }
  
  private parseRun(runXml: string, startIndex: number): RunInfo {
    // 提取文本内容
    const textRegex = /<w:t[^>]*>(.*?)<\/w:t>/gs;
    let text = '';
    let textMatch;
    
    while ((textMatch = textRegex.exec(runXml)) !== null) {
      text += textMatch[1];
    }
    
    // 提取样式属性 - 基于PoC验证的方法
    let color = null;
    const colorRegex = /<w:color\s+w:val="([^"]+)"/;
    const colorMatch = colorRegex.exec(runXml);
    if (colorMatch) {
      color = colorMatch[1].toUpperCase();
    }
    
    const bold = runXml.includes('<w:b/>') || runXml.includes('<w:b ');
    const italic = runXml.includes('<w:i/>') || runXml.includes('<w:i ');
    
    return {
      text,
      color: color || undefined,
      bold,
      italic,
      startIndex,
      endIndex: startIndex + text.length
    };
  }
  
  private extractPlainText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // 移除HTML标签
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }
  
  private extractFontInfo(structure: DocumentStructure) {
    // 统计字体使用情况
    const fontUsage = new Map<string, number>();
    
    structure.paragraphs.forEach(para => {
      para.runs.forEach(run => {
        // 这里简化处理，实际项目中需要从样式信息中提取
        const font = 'Default Font';
        fontUsage.set(font, (fontUsage.get(font) || 0) + run.text.length);
      });
    });
    
    return Array.from(fontUsage.entries()).map(([name, usage]) => ({
      name,
      size: 12, // 默认值，需要从样式中提取
      usage
    }));
  }
  
  private extractColorInfo(structure: DocumentStructure) {
    const colorUsage = new Map<string, number>();
    
    structure.paragraphs.forEach(para => {
      para.runs.forEach(run => {
        const color = run.color || '000000';
        colorUsage.set(color, (colorUsage.get(color) || 0) + run.text.length);
      });
    });
    
    return Array.from(colorUsage.entries()).map(([value, usage]) => ({
      value,
      usage
    }));
  }
  
  private analyzeMainStyle(structure: DocumentStructure) {
    // 分析主体样式 - 基于PoC验证的统计方法
    const colorUsage = new Map<string, number>();
    
    structure.paragraphs.forEach(para => {
      para.runs.forEach(run => {
        const color = run.color || '000000';
        colorUsage.set(color, (colorUsage.get(color) || 0) + run.text.length);
      });
    });
    
    // 选择使用最频繁的颜色作为主色
    const mainColor = Array.from(colorUsage.entries())
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '000000';
    
    return {
      fontFamily: 'Default Font',
      fontSize: 12,
      color: mainColor
    };
  }
  
  /**
   * 增强HTML，添加颜色样式信息
   */
  private enhanceHtmlWithColors(html: string, structure: DocumentStructure): string {
    let enhancedHtml = html;
    let htmlOffset = 0;
    
    // 遍历所有有颜色的文本段
    structure.paragraphs.forEach(paragraph => {
      paragraph.runs.forEach(run => {
        if (run.color && run.color !== '000000' && run.color !== 'auto' && run.text.trim()) {
          // 在HTML中查找对应的文本位置并添加颜色样式
          const textToFind = this.escapeHtml(run.text);
          const colorStyle = `color: #${run.color.toLowerCase()};`;
          
          // 查找文本在HTML中的位置
          const textIndex = enhancedHtml.indexOf(textToFind, htmlOffset);
          if (textIndex !== -1) {
            // 包装文本添加颜色样式
            const beforeText = enhancedHtml.substring(0, textIndex);
            const afterText = enhancedHtml.substring(textIndex + textToFind.length);
            const styledText = `<span style="${colorStyle}">${textToFind}</span>`;
            
            enhancedHtml = beforeText + styledText + afterText;
            htmlOffset = textIndex + styledText.length;
          }
        }
      });
    });
    
    return enhancedHtml;
  }
  
  /**
   * 转义HTML特殊字符
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  validateFormat(file: File): boolean {
    return file.name.toLowerCase().endsWith('.docx');
  }
}
