import { DetectionRule, DetectionError, ErrorCategory } from '../../types/error';
import { ParsedDocument } from '../../types/document';

/**
 * 检测规则基类
 * 提供通用的检测方法和错误生成功能
 */
export abstract class BaseRule implements DetectionRule {
  abstract id: string;
  abstract name: string;
  abstract category: ErrorCategory;
  abstract priority: 'high' | 'medium' | 'low';
  
  abstract execute(document: ParsedDocument): DetectionError[];
  
  protected createError(params: {
    ruleId: string;
    message: string;
    start: number;
    end: number;
    severity?: 'error' | 'warning' | 'info';
    suggestion?: string;
    context: string;
  }): DetectionError {
    return {
      id: this.generateErrorId(params.ruleId, params.start, params.end, params.message),
      ruleId: params.ruleId,
      category: this.category,
      severity: params.severity || 'warning',
      message: params.message,
      suggestion: params.suggestion,
      position: {
        start: params.start,
        end: params.end
      },
      context: params.context,
      ignored: false
    };
  }
  
  protected generateErrorId(ruleId: string, start: number, end: number, message: string): string {
    // 生成基于内容的稳定ID，确保相同错误始终有相同ID
    const content = `${ruleId}-${start}-${end}-${message}`;
    const hash = this.simpleHash(content);
    return `${this.id}-${hash}`;
  }
  
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
  
  protected getContext(text: string, start: number, end: number, contextLength: number = 20): string {
    const contextStart = Math.max(0, start - contextLength);
    const contextEnd = Math.min(text.length, end + contextLength);
    
    let context = text.substring(contextStart, contextEnd);
    
    // 在错误位置添加标记
    const errorStart = start - contextStart;
    const errorEnd = end - contextStart;
    
    context = context.substring(0, errorStart) + 
              '【' + context.substring(errorStart, errorEnd) + '】' + 
              context.substring(errorEnd);
    
    return context;
  }
  
  protected findAllMatches(text: string, pattern: RegExp): Array<{match: RegExpMatchArray, start: number, end: number}> {
    const matches = [];
    let match;
    
    // 确保正则表达式有全局标志
    const globalPattern = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
    
    while ((match = globalPattern.exec(text)) !== null) {
      matches.push({
        match,
        start: match.index!,
        end: match.index! + match[0].length
      });
    }
    
    return matches;
  }
}
