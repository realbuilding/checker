import { BaseRule } from './BaseRule';
import { DetectionError } from '../../types/error';
import { ParsedDocument } from '../../types/document';

/**
 * Word自动编号检测规则
 * 专门检测Word自动编号的一致性、格式和显示问题
 */
export class NumberingRule extends BaseRule {
  id = 'word-numbering';
  name = 'Word自动编号检测';
  category = 'numbering' as const;
  priority = 'high' as const;
  
  execute(document: ParsedDocument): DetectionError[] {
    const errors: DetectionError[] = [];
    
    console.log('🔢 执行Word自动编号检测...');
    
    // 1. 检测自动编号的显示问题
    errors.push(...this.checkAutoNumberingDisplay(document));
    
    // 2. 检测编号格式一致性
    errors.push(...this.checkNumberingConsistency(document));
    
    // 3. 检测编号层级问题
    errors.push(...this.checkNumberingHierarchy(document));
    
    console.log(`📊 自动编号检测完成，发现 ${errors.length} 个问题`);
    
    return errors;
  }
  
  /**
   * 检测自动编号的显示问题
   * 检查是否有应该显示但未显示的自动编号
   */
  private checkAutoNumberingDisplay(document: ParsedDocument): DetectionError[] {
    const errors: DetectionError[] = [];
    
    // 检查是否有自动编号信息
    const autoNumbering = document.structure.numbering?.autoNumbering;
    if (!autoNumbering || autoNumbering.length === 0) {
      console.log('📝 未检测到Word自动编号结构');
      return errors;
    }
    
    console.log(`🔍 发现 ${autoNumbering.length} 个自动编号项`);
    
    // 检查每个自动编号项是否在文档中正确显示
    autoNumbering.forEach((numbering, index) => {
      const expectedText = this.generateExpectedNumberText(numbering, index);
      const actualText = this.findNumberingInText(document.content.text, numbering);
      
      if (!actualText || actualText !== expectedText) {
        // 找到编号显示问题
        const position = this.findNumberingPosition(document.content.text, numbering, index);
        
        errors.push(this.createError({
          ruleId: this.id,
          message: `Word自动编号显示异常：期望显示"${expectedText}"，实际显示"${actualText || '无'}"`,
          start: position.start,
          end: position.end,
          severity: 'error',
          suggestion: `建议检查Word文档的自动编号设置，确保编号正确显示`,
          context: this.getContext(document.content.text, position.start, position.end),
          category: 'numbering',
          metadata: {
            expectedText,
            actualText,
            numberingLevel: numbering.level,
            numberingType: numbering.format
          }
        }));
      }
    });
    
    return errors;
  }
  
  /**
   * 检测编号格式一致性
   */
  private checkNumberingConsistency(document: ParsedDocument): DetectionError[] {
    const errors: DetectionError[] = [];
    
    const text = document.content.text;
    const lines = text.split(/\r?\n/);
    
    // 查找所有手动编号（可能与自动编号冲突）
    const manualNumberings: Array<{
      lineIndex: number;
      text: string;
      format: string;
      position: number;
    }> = [];
    
    lines.forEach((line, lineIndex) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      // 检测各种编号格式
      const patterns = [
        { regex: /^(\d+)\.(\s+)/, format: 'decimal-dot' },
        { regex: /^(\d+)、(\s*)/, format: 'decimal-chinese' },
        { regex: /^(\d+)\)(\s+)/, format: 'decimal-paren' },
        { regex: /^\((\d+)\)(\s+)/, format: 'decimal-both-paren' },
        { regex: /^([a-z])\.(\s+)/, format: 'alpha-dot' },
        { regex: /^([A-Z])\.(\s+)/, format: 'alpha-upper-dot' },
      ];
      
      for (const pattern of patterns) {
        const match = trimmed.match(pattern.regex);
        if (match) {
          manualNumberings.push({
            lineIndex,
            text: trimmed,
            format: pattern.format,
            position: this.getLineStartPosition(text, lineIndex)
          });
          break;
        }
      }
    });
    
    // 检查是否混用了多种编号格式
    if (manualNumberings.length > 0) {
      const formatGroups = new Map<string, typeof manualNumberings>();
      manualNumberings.forEach(numbering => {
        if (!formatGroups.has(numbering.format)) {
          formatGroups.set(numbering.format, []);
        }
        formatGroups.get(numbering.format)!.push(numbering);
      });
      
      if (formatGroups.size > 1) {
        // 发现混用格式
        manualNumberings.forEach(numbering => {
          errors.push(this.createError({
            ruleId: this.id,
            message: `编号格式不一致：检测到多种编号格式混用`,
            start: numbering.position,
            end: numbering.position + numbering.text.length,
            severity: 'warning',
            suggestion: `建议统一使用一种编号格式，或使用Word的自动编号功能`,
            context: this.getContext(text, numbering.position, numbering.position + numbering.text.length),
            category: 'numbering',
            metadata: {
              detectedFormat: numbering.format,
              allFormats: Array.from(formatGroups.keys())
            }
          }));
        });
      }
    }
    
    return errors;
  }
  
  /**
   * 检测编号层级问题
   */
  private checkNumberingHierarchy(document: ParsedDocument): DetectionError[] {
    const errors: DetectionError[] = [];
    
    const autoNumbering = document.structure.numbering?.autoNumbering;
    if (!autoNumbering || autoNumbering.length === 0) {
      return errors;
    }
    
    // 检查层级跳跃
    for (let i = 1; i < autoNumbering.length; i++) {
      const prev = autoNumbering[i - 1];
      const current = autoNumbering[i];
      
      if (current.level > prev.level + 1) {
        // 层级跳跃
        const position = this.findNumberingPosition(document.content.text, current, i);
        
        errors.push(this.createError({
          ruleId: this.id,
          message: `编号层级跳跃：从第${prev.level}级直接跳到第${current.level}级`,
          start: position.start,
          end: position.end,
          severity: 'warning',
          suggestion: `建议按顺序设置编号层级，避免跳级`,
          context: this.getContext(document.content.text, position.start, position.end),
          category: 'numbering',
          metadata: {
            previousLevel: prev.level,
            currentLevel: current.level,
            skippedLevels: current.level - prev.level - 1
          }
        }));
      }
    }
    
    return errors;
  }
  
  /**
   * 生成期望的编号文本
   */
  private generateExpectedNumberText(numbering: any, index: number): string {
    // 根据编号格式生成期望的文本
    switch (numbering.format) {
      case 'decimal':
        return `${numbering.value || index + 1}.`;
      case 'lowerLetter':
        return `${String.fromCharCode(97 + ((numbering.value || index) % 26))}.`;
      case 'upperLetter':
        return `${String.fromCharCode(65 + ((numbering.value || index) % 26))}.`;
      case 'lowerRoman':
        return `${this.toRoman(numbering.value || index + 1).toLowerCase()}.`;
      case 'upperRoman':
        return `${this.toRoman(numbering.value || index + 1)}.`;
      default:
        return `${numbering.value || index + 1}.`;
    }
  }
  
  /**
   * 在文本中查找编号
   */
  private findNumberingInText(text: string, numbering: any): string | null {
    // 这里需要根据编号的位置信息在文本中查找
    // 由于这是一个复杂的映射过程，先返回null表示未找到
    return null;
  }
  
  /**
   * 查找编号在文本中的位置
   */
  private findNumberingPosition(text: string, numbering: any, index: number): { start: number; end: number } {
    // 临时实现：基于索引估算位置
    const estimatedStart = Math.min(index * 50, text.length - 10);
    return {
      start: estimatedStart,
      end: estimatedStart + 10
    };
  }
  
  /**
   * 转换为罗马数字
   */
  private toRoman(num: number): string {
    const romanNumerals = [
      { value: 1000, symbol: 'M' },
      { value: 900, symbol: 'CM' },
      { value: 500, symbol: 'D' },
      { value: 400, symbol: 'CD' },
      { value: 100, symbol: 'C' },
      { value: 90, symbol: 'XC' },
      { value: 50, symbol: 'L' },
      { value: 40, symbol: 'XL' },
      { value: 10, symbol: 'X' },
      { value: 9, symbol: 'IX' },
      { value: 5, symbol: 'V' },
      { value: 4, symbol: 'IV' },
      { value: 1, symbol: 'I' }
    ];
    
    let result = '';
    for (const { value, symbol } of romanNumerals) {
      while (num >= value) {
        result += symbol;
        num -= value;
      }
    }
    return result;
  }
  
  /**
   * 获取行的起始位置
   */
  private getLineStartPosition(text: string, lineIndex: number): number {
    const lines = text.split(/\r?\n/);
    let position = 0;
    
    for (let i = 0; i < lineIndex; i++) {
      position += lines[i].length + 1; // +1 for newline
    }
    
    return position;
  }
}
