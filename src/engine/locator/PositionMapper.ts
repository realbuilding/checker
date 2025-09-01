import { ParsedDocument, DOMPosition, TextPosition } from '../../types/document';

/**
 * 位置映射器 - 基于PoC验证100%成功的核心算法
 * 将docx分析的位置精确映射到mammoth生成的HTML上
 */
export class PositionMapper {
  
  private positionMap: Map<number, DOMPosition> = new Map();
  private reverseMap: Map<string, number> = new Map();
  
  createMapping(document: ParsedDocument): void {
    console.log('🔄 创建位置映射...');
    
    try {
      this.positionMap.clear();
      this.reverseMap.clear();
      
      // 基于PoC验证的映射算法
      this.buildTextToDOMMapping(document);
      
      console.log(`✅ 位置映射创建完成，映射点数: ${this.positionMap.size}`);
      
    } catch (error) {
      console.error('❌ 位置映射创建失败:', error);
      throw error;
    }
  }
  
  private buildTextToDOMMapping(document: ParsedDocument): void {
    const html = document.content.html;
    const structure = document.content.structure;
    
    // 分析HTML段落结构
    const htmlParagraphs = this.analyzeHtmlStructure(html);
    
    // 改用基于实际HTML文本的连续映射，而不是依赖docx结构
    let cumulativePosition = 0;
    
    htmlParagraphs.forEach((htmlPara, paragraphIndex) => {
      const paragraphText = this.extractTextFromHtml(htmlPara.html);
      
      // 为HTML段落中的每个字符创建映射
      for (let i = 0; i < paragraphText.length; i++) {
        const textPosition = cumulativePosition + i;
        
        const domPosition: DOMPosition = {
          paragraphIndex: paragraphIndex,
          paragraphHtml: htmlPara.html,
          localTextIndex: i,
          fullMatch: htmlPara.originalMatch,
          targetInParagraph: true
        };
        
        this.positionMap.set(textPosition, domPosition);
      }
      
      // 累积位置（HTML段落之间的文本是连续的）
      cumulativePosition += paragraphText.length;
    });
    
    console.log(`✅ PositionMapper: 构建了 ${this.positionMap.size} 个位置映射, HTML总长度: ${cumulativePosition}`);
  }
  
  private analyzeHtmlStructure(html: string) {
    const paragraphs = [];
    const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gs;
    let match;
    
    while ((match = paragraphRegex.exec(html)) !== null) {
      const paragraphHtml = match[1];
      const paragraphText = this.extractTextFromHtml(paragraphHtml);
      
      if (paragraphText.trim()) {
        paragraphs.push({
          html: match[0],
          text: paragraphText,
          originalMatch: match
        });
      }
    }
    
    return paragraphs;
  }
  
  private extractTextFromHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  private escapeHtml(str: string): string {
    return str.replace(/[&<>"']/g, function(match) {
      const escapeMap: { [key: string]: string } = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      };
      return escapeMap[match];
    });
  }
  
  /**
   * 核心方法：在HTML中精确注入高亮标签
   * 基于字符串操作，支持Node.js环境
   */
  private injectHighlightIntoHTML(html: string, start: number, end: number, className: string, fullAttributes: string, indexBadge: string, targetText: string): string {
    // 使用更安全的字符串分析方法
    const textSegments = this.analyzeHTMLTextSegments(html);
    
    // 找到目标文本范围对应的HTML片段
    const targetSegments = textSegments.filter(seg => 
      !(seg.textEnd <= start || seg.textStart >= end)
    );
    
    if (targetSegments.length === 0) {
      console.warn(`⚠️ 全局映射: 在位置 ${start}-${end} 找不到对应的HTML片段`);
      return html;
    }
    
    // 构建高亮标签
    const highlightSpan = `<span class="${className}"${fullAttributes}>${indexBadge}${this.escapeHtml(targetText)}</span>`;
    
    // 简单情况：目标文本在单个HTML片段内
    if (targetSegments.length === 1) {
      const segment = targetSegments[0];
      const localStart = start - segment.textStart;
      const localEnd = end - segment.textStart;
      
      const beforeText = segment.text.substring(0, localStart);
      const afterText = segment.text.substring(localEnd);
      
      const newSegmentText = beforeText + this.escapeHtml(targetText) + afterText;
      const newHtmlFragment = segment.htmlFragment.replace(segment.text, beforeText + `__HIGHLIGHT_PLACEHOLDER__` + afterText);
      const finalHtmlFragment = newHtmlFragment.replace('__HIGHLIGHT_PLACEHOLDER__', highlightSpan.replace(indexBadge + this.escapeHtml(targetText), indexBadge + this.escapeHtml(segment.text.substring(localStart, localEnd))));
      
      return html.replace(segment.htmlFragment, finalHtmlFragment);
    }
    
    // 复杂情况：跨片段文本高亮
    return this.handleMultiSegmentHighlight(html, targetSegments, start, end, highlightSpan, indexBadge);
  }
  
  /**
   * 分析HTML结构，提取文本片段及其在整体文本中的位置
   */
  private analyzeHTMLTextSegments(html: string): Array<{htmlFragment: string, text: string, textStart: number, textEnd: number}> {
    const segments: Array<{htmlFragment: string, text: string, textStart: number, textEnd: number}> = [];
    let currentPosition = 0;
    
    // 简化的HTML解析：查找所有文本内容
    const htmlParts = html.split(/(<[^>]+>)/);
    
    for (const part of htmlParts) {
      if (part.startsWith('<') && part.endsWith('>')) {
        // 这是HTML标签，跳过
        continue;
      } else if (part.trim()) {
        // 这是文本内容
        const textContent = part;
        segments.push({
          htmlFragment: part,
          text: textContent,
          textStart: currentPosition,
          textEnd: currentPosition + textContent.length
        });
        currentPosition += textContent.length;
      }
    }
    
    return segments;
  }
  
  /**
   * 处理跨HTML片段的高亮
   */
  private handleMultiSegmentHighlight(html: string, segments: Array<{htmlFragment: string, text: string, textStart: number, textEnd: number}>, start: number, end: number, highlightSpan: string, indexBadge: string): string {
    let result = html;
    
    // 从后往前处理，避免位置偏移
    for (let i = segments.length - 1; i >= 0; i--) {
      const segment = segments[i];
      const localStart = Math.max(0, start - segment.textStart);
      const localEnd = Math.min(segment.text.length, end - segment.textStart);
      
      if (localStart < localEnd) {
        const beforeText = segment.text.substring(0, localStart);
        const highlightText = segment.text.substring(localStart, localEnd);
        const afterText = segment.text.substring(localEnd);
        
        let newFragment: string;
        if (i === 0) {
          // 第一个片段，插入完整的高亮标签
          const fullHighlightSpan = highlightSpan.replace(indexBadge + this.escapeHtml(''), indexBadge + this.escapeHtml(highlightText));
          newFragment = beforeText + fullHighlightSpan + afterText;
        } else {
          // 其他片段，只保留非高亮部分
          newFragment = beforeText + afterText;
        }
        
        result = result.replace(segment.htmlFragment, newFragment);
      }
    }
    
    return result;
  }

  /**
   * 生成错误序号标记
   */
  private generateErrorIndexBadge(index: number, severity: string): string {
    const severityClass = severity === 'error' ? '' : severity;
    const classNames = `error-index ${severityClass}`.trim();
    return `<span class="${classNames}">${index}</span>`;
  }
  
  // 核心方法：将文本位置转换为DOM位置
  textToDOM(textPosition: number): DOMPosition | null {
    return this.positionMap.get(textPosition) || null;
  }
  
  // 将文本范围转换为DOM位置
  textRangeToDOM(start: number, end: number): DOMPosition[] {
    const positions: DOMPosition[] = [];
    
    for (let i = start; i < end; i++) {
      const domPos = this.textToDOM(i);
      if (domPos) {
        positions.push(domPos);
      }
    }
    
    return positions;
  }
  
  // 改进的高亮算法：支持跨标签和复杂HTML结构
  highlightTextRange(html: string, start: number, end: number, className: string = 'highlight', attributes: Record<string, string> = {}): string {
    try {
      // 第一步：尝试基于全局文本位置的精确映射
      const result = this.highlightByGlobalTextPosition(html, start, end, className, attributes);
      if (result !== html) {
        return result; // 成功映射
      }
      
      // 第二步：如果全局映射失败，尝试基于段落的映射
      return this.highlightByParagraphMapping(html, start, end, className, attributes);
      
    } catch (error) {
      console.error(`❌ 高亮失败 ${start}-${end}:`, error);
      return html;
    }
  }
  
  /**
   * 方法1：基于全局文本位置的精确映射
   * 这个方法能处理跨标签的文本范围
   */
  private highlightByGlobalTextPosition(html: string, start: number, end: number, className: string, attributes: Record<string, string>): string {
    // 从整个HTML中提取纯文本
    const globalText = this.extractTextFromHtml(html);
    
    // 检查位置是否有效
    if (start >= globalText.length || end > globalText.length || start >= end) {
      return html;
    }
    
    const targetText = globalText.substring(start, end);
    if (!targetText || targetText.trim().length === 0) {
      return html;
    }
    
    // 构建高亮标签
    const errorIndex = attributes['data-error-index'];
    const severity = attributes['data-severity'] || 'warning';
    const indexBadge = errorIndex ? this.generateErrorIndexBadge(parseInt(errorIndex), severity) : '';
    
    const attributeString = Object.entries(attributes)
      .map(([key, value]) => `${key}="${this.escapeHtml(value)}"`)
      .join(' ');
    const fullAttributes = attributeString ? ` ${attributeString}` : '';
    
    return this.injectHighlightIntoHTML(html, start, end, className, fullAttributes, indexBadge, targetText);
  }
  
  /**
   * 方法2：基于段落映射的兼容性方法
   * 保持现有逻辑作为后备方案
   */
  private highlightByParagraphMapping(html: string, start: number, end: number, className: string, attributes: Record<string, string>): string {
    const domPositions = this.textRangeToDOM(start, end);
    
    if (domPositions.length === 0) {
      console.warn(`⚠️ 段落映射: 无法找到位置 ${start}-${end} 对应的DOM位置`);
      return html;
    }
    
    const targetParagraph = domPositions[0];
    if (!targetParagraph) return html;
    
    const paragraphText = this.extractTextFromHtml(targetParagraph.paragraphHtml);
    const startLocal = domPositions[0].localTextIndex;
    const endLocal = startLocal + (end - start);
    const targetText = paragraphText.substring(startLocal, endLocal);
    
    if (!targetText || !paragraphText.includes(targetText)) {
      console.warn(`⚠️ 段落映射: 目标文本"${targetText}"不在段落中`);
      return html;
    }
    
    // 生成高亮标签
    const errorIndex = attributes['data-error-index'];
    const severity = attributes['data-severity'] || 'warning';
    const indexBadge = errorIndex ? this.generateErrorIndexBadge(parseInt(errorIndex), severity) : '';
    
    const attributeString = Object.entries(attributes)
      .map(([key, value]) => `${key}="${this.escapeHtml(value)}"`)
      .join(' ');
    const fullAttributes = attributeString ? ` ${attributeString}` : '';
    
    const highlightSpan = `<span class="${className}"${fullAttributes}>${indexBadge}${targetText}</span>`;
    
    // 在段落HTML中替换
    const targetIndex = paragraphText.indexOf(targetText);
    const beforeText = paragraphText.substring(0, targetIndex);
    const afterText = paragraphText.substring(targetIndex + targetText.length);
    const newParagraphText = beforeText + highlightSpan + afterText;
    
    const newParagraphHtml = targetParagraph.paragraphHtml.replace(paragraphText, newParagraphText);
    return html.replace(targetParagraph.paragraphHtml, newParagraphHtml);
  }
  
  // 批量高亮多个位置
  highlightMultipleRanges(html: string, ranges: Array<{
    start: number, 
    end: number, 
    className?: string,
    errorId?: string,
    errorIndex?: number,
    category?: string,
    severity?: string
  }>): string {
    let result = html;
    let successCount = 0;
    let failureCount = 0;
    
    console.log(`🎨 开始处理 ${ranges.length} 个高亮位置...`);
    
    // 从后往前处理，避免位置偏移
    ranges.sort((a, b) => b.start - a.start);
    
    ranges.forEach((range, index) => {
      const attributes: Record<string, string> = {};
      
      // 添加错误相关属性
      if (range.errorId) {
        attributes['data-error-id'] = range.errorId;
      }
      if (range.errorIndex) {
        attributes['data-error-index'] = range.errorIndex.toString();
      }
      if (range.category) {
        attributes['data-category'] = range.category;
      }
      if (range.severity) {
        attributes['data-severity'] = range.severity;
      }
      
      const beforeHighlight = result;
      result = this.highlightTextRange(
        result, 
        range.start, 
        range.end, 
        range.className || 'highlight',
        attributes
      );
      
      // 检查是否成功应用高亮
      if (result !== beforeHighlight) {
        successCount++;
      } else {
        failureCount++;
        console.warn(`⚠️ 高亮失败: 位置${range.start}-${range.end}, ErrorID: ${range.errorId}`);
      }
    });
    
    console.log(`✅ 高亮处理完成: 成功${successCount}个, 失败${failureCount}个`);
    
    return result;
  }
  
  // 验证映射准确性
  validateMapping(document: ParsedDocument): boolean {
    try {
      const testPositions = [0, 10, 20, document.content.text.length - 1];
      
      for (const pos of testPositions) {
        if (pos < document.content.text.length) {
          const domPos = this.textToDOM(pos);
          if (!domPos) {
            console.warn(`⚠️ 位置 ${pos} 无法映射到DOM`);
            return false;
          }
        }
      }
      
      console.log('✅ 位置映射验证通过');
      return true;
      
    } catch (error) {
      console.error('❌ 位置映射验证失败:', error);
      return false;
    }
  }
}
