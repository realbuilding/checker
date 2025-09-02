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
    
    // 将文本按行分割
    const lines = text.split(/\r?\n/);
    
    lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim();
      if (trimmedLine.length === 0) return; // 跳过空行
      
      // 判断是否为标题行（通常标题行较短，且不包含逗号等分隔符）
      const isTitle = this.isTitleLine(trimmedLine);
      
      if (!isTitle) {
        // 检查正文行是否以标点符号结尾
        const lastChar = trimmedLine[trimmedLine.length - 1];
        const hasEndingPunctuation = /[。！？.!?]/.test(lastChar);
        
        if (!hasEndingPunctuation) {
          // 计算在原文中的位置
          const lineStartPos = this.getLineStartPosition(text, lineIndex);
          const lineEndPos = lineStartPos + line.length;
          
          errors.push(this.createError({
            ruleId: this.id,
            message: '句子结尾缺少标点符号',
            start: lineEndPos - 1,
            end: lineEndPos,
            severity: 'warning',
            suggestion: '建议在句子结尾添加适当的标点符号（。！？）',
            context: this.getContext(text, lineEndPos - 1, lineEndPos)
          }));
        }
      }
    });
    
    return errors;
  }
  
  private isTitleLine(line: string): boolean {
    // 标题行特征：
    // 1. 长度通常较短（少于30个字符）
    // 2. 不包含逗号、分号等分隔符
    // 3. 可能以数字开头（如"1、标题"）
    // 4. 不包含句号、感叹号、问号等结尾标点
    
    if (line.length > 30) return false;
    
    // 检查是否包含分隔符
    if (/[，；：]/.test(line)) return false;
    
    // 检查是否以数字+顿号开头（如"1、"）
    if (/^\d+、/.test(line)) return true;
    
    // 检查是否以"第X"开头
    if (/^第[一二三四五六七八九十\d]+/.test(line)) return true;
    
    // 检查是否包含结尾标点（标题通常没有）
    if (/[。！？.!?]$/.test(line)) return false;
    
    // 如果行较短且没有明显的正文特征，认为是标题
    return line.length < 20;
  }
  
  private getLineStartPosition(fullText: string, lineIndex: number): number {
    const lines = fullText.split(/\r?\n/);
    let position = 0;
    
    for (let i = 0; i < lineIndex; i++) {
      position += lines[i].length + 1; // +1 for newline character
    }
    
    return position;
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
