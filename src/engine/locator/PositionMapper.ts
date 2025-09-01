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
  
  // 根据PoC验证的成功方法：为HTML添加高亮标记
  highlightTextRange(html: string, start: number, end: number, className: string = 'highlight', attributes: Record<string, string> = {}): string {
    const domPositions = this.textRangeToDOM(start, end);
    
    if (domPositions.length === 0) {
      console.warn(`⚠️ 无法找到文本位置对应的DOM位置: ${start}-${end}`);
      return html;
    }
    
    // 获取目标段落
    const targetParagraph = domPositions[0];
    if (!targetParagraph) {
      return html;
    }
    
    // 提取需要高亮的文本
    const fullText = this.extractTextFromHtml(targetParagraph.paragraphHtml);
    const startLocal = domPositions[0].localTextIndex;
    const endLocal = startLocal + (end - start);
    const targetText = fullText.substring(startLocal, endLocal);
    
    if (!targetText) {
      console.warn(`⚠️ 目标文本为空: 位置${start}-${end}, 本地位置${startLocal}-${endLocal}`);
      return html;
    }
    
    // 构建属性字符串
    const attributeString = Object.entries(attributes)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');
    const fullAttributes = attributeString ? ` ${attributeString}` : '';
    
    // 安全的基于段落的高亮方法
    const originalParagraph = targetParagraph.paragraphHtml;
    const plainText = this.extractTextFromHtml(originalParagraph);
    
    // 检查目标文本是否在段落中
    if (!plainText.includes(targetText)) {
      console.warn(`⚠️ 高亮失败: 位置${start}-${end}, 目标文本"${targetText}"不在段落中, ErrorID: ${attributes['data-error-id'] || 'unknown'}`);
      return html;
    }
    
    // 找到目标文本在纯文本中的位置
    const targetIndex = plainText.indexOf(targetText);
    if (targetIndex === -1) {
      console.warn(`⚠️ 高亮失败: 无法找到目标文本"${targetText}", ErrorID: ${attributes['data-error-id'] || 'unknown'}`);
      return html;
    }
    
    // 在纯文本中进行替换
    const beforeText = plainText.substring(0, targetIndex);
    const afterText = plainText.substring(targetIndex + targetText.length);
    const highlightSpan = `<span class="${className}"${fullAttributes}>${targetText}</span>`;
    const newParagraphText = beforeText + highlightSpan + afterText;
    
    // 用新的段落内容替换原段落的文本部分
    let newParagraphHtml = originalParagraph.replace(plainText, newParagraphText);
    
    // 在完整HTML中替换段落
    return html.replace(originalParagraph, newParagraphHtml);
  }
  
  // 批量高亮多个位置
  highlightMultipleRanges(html: string, ranges: Array<{
    start: number, 
    end: number, 
    className?: string,
    errorId?: string,
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
