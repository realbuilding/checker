import { BaseRule } from './BaseRule';
import { DetectionError } from '../../types/error';
import { ParsedDocument } from '../../types/document';

/**
 * 标点符号检测规则
 * 检测中英文标点混用、标点使用错误等问题
 */
export class PunctuationRule extends BaseRule {
  id = 'punctuation-consistency';
  name = '标点符号规范检测';
  category = 'punctuation' as const;
  priority = 'high' as const;
  
  execute(document: ParsedDocument): DetectionError[] {
    const errors: DetectionError[] = [];
    const text = document.content.text;
    
    console.log('🔍 执行标点符号检测...');
    
    // 1. 检测中英文标点混用
    errors.push(...this.checkMixedPunctuation(text));
    
    // 2. 检测句末标点缺失
    errors.push(...this.checkMissingSentenceEndings(text));
    
    // 3. 检测标点重复
    errors.push(...this.checkDuplicatePunctuation(text));
    
    // 4. 检测标点位置错误
    errors.push(...this.checkPunctuationPosition(text));
    
    console.log(`📊 标点检测完成，发现 ${errors.length} 个问题`);
    
    return errors;
  }
  
  private checkMixedPunctuation(text: string): DetectionError[] {
    const errors: DetectionError[] = [];
    
    // 检测模式：同一句中混用中英文标点
    const patterns = [
      {
        pattern: /[。！？]["'][^。！？]*[,.;:!?]/g,
        message: '同一句中混用中英文标点符号',
        suggestion: '建议在同一句中统一使用中文或英文标点'
      },
      {
        pattern: /[,.;:!?]["'][^,.;:!?]*[。！？]/g,
        message: '同一句中混用英中文标点符号',
        suggestion: '建议在同一句中统一使用中文或英文标点'
      },
      {
        pattern: /，[^，]*,|,[^,]*，/g,
        message: '逗号使用不一致',
        suggestion: '建议统一使用中文逗号，或英文逗号'
      },
      {
        pattern: /。[^。]*\.|\..*。/g,
        message: '句号使用不一致',
        suggestion: '建议统一使用中文句号。或英文句号.'
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
          severity: 'warning',
          suggestion,
          context: this.getContext(text, start, end)
        }));
      });
    });
    
    return errors;
  }
  
  private checkMissingSentenceEndings(text: string): DetectionError[] {
    const errors: DetectionError[] = [];
    
    // 检测句子结尾缺少标点
    const sentencePattern = /[^。！？.!?]\s*[\n\r]|[^。！？.!?]\s*$/g;
    const matches = this.findAllMatches(text, sentencePattern);
    
    matches.forEach(({ start, end }) => {
      // 排除一些特殊情况：数字、缩写等
      const beforeText = text.substring(Math.max(0, start - 10), start + 1);
      
      if (!/\d$|[A-Z]$|[一二三四五六七八九十]$/.test(beforeText.trim())) {
        errors.push(this.createError({
          ruleId: this.id,
          message: '句子结尾缺少标点符号',
          start,
          end: start + 1,
          severity: 'warning',
          suggestion: '建议在句子结尾添加适当的标点符号（。！？）',
          context: this.getContext(text, start, end)
        }));
      }
    });
    
    return errors;
  }
  
  private checkDuplicatePunctuation(text: string): DetectionError[] {
    const errors: DetectionError[] = [];
    
    // 检测重复标点
    const patterns = [
      {
        pattern: /[。！？]{2,}/g,
        message: '重复的中文标点符号',
        suggestion: '建议删除多余的标点符号'
      },
      {
        pattern: /[.!?]{2,}/g,
        message: '重复的英文标点符号',
        suggestion: '建议删除多余的标点符号'
      },
      {
        pattern: /[，,]{2,}/g,
        message: '重复的逗号',
        suggestion: '建议删除多余的逗号'
      },
      {
        pattern: /[；;]{2,}/g,
        message: '重复的分号',
        suggestion: '建议删除多余的分号'
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
          severity: 'error',
          suggestion,
          context: this.getContext(text, start, end)
        }));
      });
    });
    
    return errors;
  }
  
  private checkPunctuationPosition(text: string): DetectionError[] {
    const errors: DetectionError[] = [];
    
    // 检测标点位置错误
    const patterns = [
      {
        pattern: /\s+[。！？，]/g,
        message: '标点符号前不应有空格',
        suggestion: '建议删除标点符号前的空格'
      },
      {
        pattern: /[。！？]\s{2,}/g,
        message: '句号后有多余空格',
        suggestion: '建议句号后只保留一个空格或直接换行'
      },
      {
        pattern: /[，；]\s{2,}/g,
        message: '逗号或分号后有多余空格',
        suggestion: '建议逗号或分号后只保留一个空格'
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
          severity: 'warning',
          suggestion,
          context: this.getContext(text, start, end)
        }));
      });
    });
    
    return errors;
  }
}
