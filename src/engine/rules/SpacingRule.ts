import { BaseRule } from './BaseRule';
import { DetectionError } from '../../types/error';
import { ParsedDocument } from '../../types/document';

/**
 * 空格使用检测规则
 * 检测多余空格问题
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
    
    // 检测多余空格
    errors.push(...this.checkExtraSpaces(text));
    
    console.log(`📊 空格检测完成，发现 ${errors.length} 个问题`);
    
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
}
