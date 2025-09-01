import { BaseRule } from './BaseRule';
import { DetectionError } from '../../types/error';
import { ParsedDocument } from '../../types/document';

/**
 * 空格使用检测规则
 * 检测中英文间空格、标点周围空格等问题
 */
export class SpacingRule extends BaseRule {
  id = 'spacing-consistency';
  name = '空格使用规范检测';
  category = 'spacing' as const;
  priority = 'high' as const;
  
  execute(document: ParsedDocument): DetectionError[] {
    const errors: DetectionError[] = [];
    const text = document.content.text;
    
    console.log('🔍 执行空格使用检测...');
    
    // 1. 检测中英文间缺少空格
    errors.push(...this.checkMissingSpacesBetweenLanguages(text));
    
    // 2. 检测多余空格
    errors.push(...this.checkExtraSpaces(text));
    
    // 3. 检测标点周围空格问题
    errors.push(...this.checkSpacesAroundPunctuation(text));
    
    // 4. 检测数字和单位间空格
    errors.push(...this.checkSpacesAroundNumbers(text));
    
    console.log(`📊 空格检测完成，发现 ${errors.length} 个问题`);
    
    return errors;
  }
  
  private checkMissingSpacesBetweenLanguages(text: string): DetectionError[] {
    const errors: DetectionError[] = [];
    
    // 检测中文和英文间缺少空格的情况
    const patterns = [
      {
        pattern: /[\u4e00-\u9fff][a-zA-Z]/g,
        message: '中文和英文之间缺少空格',
        suggestion: '建议在中文和英文之间添加空格'
      },
      {
        pattern: /[a-zA-Z][\u4e00-\u9fff]/g,
        message: '英文和中文之间缺少空格',
        suggestion: '建议在英文和中文之间添加空格'
      },
      {
        pattern: /[\u4e00-\u9fff]\d/g,
        message: '中文和数字之间缺少空格',
        suggestion: '建议在中文和数字之间添加空格'
      },
      {
        pattern: /\d[\u4e00-\u9fff]/g,
        message: '数字和中文之间缺少空格',
        suggestion: '建议在数字和中文之间添加空格'
      }
    ];
    
    patterns.forEach(({ pattern, message, suggestion }) => {
      const matches = this.findAllMatches(text, pattern);
      
      matches.forEach(({ start, end }) => {
        // 排除一些特殊情况，如连字符、引号等
        const matchText = text.substring(start, end);
        if (!this.isSpecialCase(matchText, text, start)) {
          errors.push(this.createError({
            ruleId: this.id,
            message,
            start,
            end,
            severity: 'warning',
            suggestion,
            context: this.getContext(text, start, end)
          }));
        }
      });
    });
    
    return errors;
  }
  
  private checkExtraSpaces(text: string): DetectionError[] {
    const errors: DetectionError[] = [];
    
    // 检测多余空格
    const patterns = [
      {
        pattern: /  +/g,
        message: '存在多余的连续空格',
        suggestion: '建议将多个空格替换为单个空格'
      },
      {
        pattern: /\t+/g,
        message: '使用了制表符，建议使用空格',
        suggestion: '建议将制表符替换为适当数量的空格'
      },
      {
        pattern: /[ \t]+$/gm,
        message: '行尾存在多余空格',
        suggestion: '建议删除行尾的空格'
      },
      {
        pattern: /^[ \t]+$/gm,
        message: '空行包含空格或制表符',
        suggestion: '建议删除空行中的空格'
      }
    ];
    
    patterns.forEach(({ pattern, message, suggestion }) => {
      const matches = this.findAllMatches(text, pattern);
      
      matches.forEach(({ start, end }) => {
        errors.push(this.createError({
          ruleId: this.id,
          message,
          start,
          end,
          severity: 'info',
          suggestion,
          context: this.getContext(text, start, end)
        }));
      });
    });
    
    return errors;
  }
  
  private checkSpacesAroundPunctuation(text: string): DetectionError[] {
    const errors: DetectionError[] = [];
    
    // 检测标点周围空格问题
    const patterns = [
      {
        pattern: /\s+[，。！？；：]/g,
        message: '中文标点前不应有空格',
        suggestion: '建议删除中文标点前的空格'
      },
      {
        pattern: /[，；：]\S/g,
        message: '中文标点后缺少空格',
        suggestion: '建议在中文标点后添加空格（如果不是句末）'
      },
      {
        pattern: /\s*,\s*/g,
        message: '英文逗号周围空格使用不规范',
        suggestion: '英文逗号前不加空格，后加一个空格'
      },
      {
        pattern: /\s*;\s*/g,
        message: '英文分号周围空格使用不规范',
        suggestion: '英文分号前不加空格，后加一个空格'
      }
    ];
    
    patterns.forEach(({ pattern, message, suggestion }) => {
      const matches = this.findAllMatches(text, pattern);
      
      matches.forEach(({ start, end }) => {
        // 对于逗号和分号，检查具体格式
        const matchText = text.substring(start, end);
        
        if (matchText.includes(',')) {
          if (!/^,\s$/.test(matchText)) {
            errors.push(this.createError({
              ruleId: this.id,
              message,
              start,
              end,
              severity: 'warning',
              suggestion,
              context: this.getContext(text, start, end)
            }));
          }
        } else if (matchText.includes(';')) {
          if (!/^;\s$/.test(matchText)) {
            errors.push(this.createError({
              ruleId: this.id,
              message,
              start,
              end,
              severity: 'warning',
              suggestion,
              context: this.getContext(text, start, end)
            }));
          }
        } else {
          errors.push(this.createError({
            ruleId: this.id,
            message,
            start,
            end,
            severity: 'warning',
            suggestion,
            context: this.getContext(text, start, end)
          }));
        }
      });
    });
    
    return errors;
  }
  
  private checkSpacesAroundNumbers(text: string): DetectionError[] {
    const errors: DetectionError[] = [];
    
    // 检测数字和单位间空格
    const patterns = [
      {
        pattern: /\d+[%℃℉]/g,
        message: '数字和百分号或温度单位之间不需要空格',
        suggestion: '建议删除数字和百分号或温度单位之间的空格',
        shouldHaveSpace: false
      },
      {
        pattern: /\d+\s*[kgmcm公斤米厘米千米]/g,
        message: '数字和重量或长度单位之间应该有空格',
        suggestion: '建议在数字和单位之间添加空格',
        shouldHaveSpace: true
      },
      {
        pattern: /\d+年\d+月\d+日/g,
        message: '日期格式建议统一',
        suggestion: '建议使用统一的日期格式',
        shouldHaveSpace: false
      }
    ];
    
    patterns.forEach(({ pattern, message, suggestion, shouldHaveSpace }) => {
      const matches = this.findAllMatches(text, pattern);
      
      matches.forEach(({ start, end }) => {
        const matchText = text.substring(start, end);
        const hasSpace = /\d\s+/.test(matchText);
        
        if (shouldHaveSpace && !hasSpace) {
          errors.push(this.createError({
            ruleId: this.id,
            message,
            start,
            end,
            severity: 'info',
            suggestion,
            context: this.getContext(text, start, end)
          }));
        } else if (!shouldHaveSpace && hasSpace) {
          errors.push(this.createError({
            ruleId: this.id,
            message,
            start,
            end,
            severity: 'info',
            suggestion,
            context: this.getContext(text, start, end)
          }));
        }
      });
    });
    
    return errors;
  }
  
  private isSpecialCase(matchText: string, fullText: string, position: number): boolean {
    // 检查是否为特殊情况，如：
    // 1. 在引号内
    // 2. 在代码块内
    // 3. 在特殊格式中（如URL、邮箱）
    
    const before = fullText.substring(Math.max(0, position - 10), position);
    const after = fullText.substring(position + matchText.length, Math.min(fullText.length, position + matchText.length + 10));
    
    // 检查是否在引号内
    const quotesBefore = (before.match(/["""'']/g) || []).length;
    const quotesAfter = (after.match(/["""'']/g) || []).length;
    if (quotesBefore % 2 === 1) {
      return true; // 在引号内
    }
    
    // 检查是否为URL或邮箱
    if (/^https?:\/\/|@.*\.|\.com|\.org|\.net/.test(before + matchText + after)) {
      return true;
    }
    
    // 检查是否为特殊标记（如代码、公式等）
    if (/`.*`|\$.*\$/.test(before + matchText + after)) {
      return true;
    }
    
    return false;
  }
}
