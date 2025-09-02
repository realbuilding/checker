import { BaseRule } from './BaseRule';
import { DetectionError } from '../../types/error';
import { ParsedDocument } from '../../types/document';

/**
 * 文档结构检测规则
 * 检测标题层级、序号规范等问题
 */
export class StructureRule extends BaseRule {
  id = 'structure-consistency';
  name = '文档结构规范检测';
  category = 'structure' as const;
  priority = 'medium' as const;
  
  execute(document: ParsedDocument): DetectionError[] {
    const errors: DetectionError[] = [];
    const text = document.content.text;
    
    console.log('🔍 执行文档结构检测...');
    
    // 1. 检测序号规范
    errors.push(...this.checkSerialNumberConsistency(text));
    
    // 2. 检测标题层级（待实现）
    // errors.push(...this.checkTitleHierarchy(text));
    
    console.log(`📊 结构检测完成，发现 ${errors.length} 个问题`);
    
    return errors;
  }
  
  private checkSerialNumberConsistency(text: string): DetectionError[] {
    const errors: DetectionError[] = [];
    
    // 将文本按行分割
    const lines = text.split(/\r?\n/);
    
    // 查找所有序号行
    const serialNumberLines: Array<{ lineIndex: number; number: number; line: string; position: number }> = [];
    
    lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim();
      if (trimmedLine.length === 0) return;
      
      // 匹配序号模式：数字+顿号、数字+点、数字+括号等
      const serialPatterns = [
        /^(\d+)、/,           // 1、
        /^(\d+)\./,           // 1.
        /^(\d+)\)/,           // 1)
        /^(\d+)\s/,           // 1 
        /^第(\d+)/,           // 第1
        /^\((\d+)\)/,         // (1)
      ];
      
      for (const pattern of serialPatterns) {
        const match = trimmedLine.match(pattern);
        if (match) {
          const number = parseInt(match[1]);
          const position = this.getLineStartPosition(text, lineIndex);
          serialNumberLines.push({
            lineIndex,
            number,
            line: trimmedLine,
            position
          });
          break;
        }
      }
    });
    
    // 检查序号连续性
    if (serialNumberLines.length > 1) {
      // 按序号排序
      serialNumberLines.sort((a, b) => a.number - b.number);
      
      // 检查是否有跳号
      for (let i = 0; i < serialNumberLines.length - 1; i++) {
        const current = serialNumberLines[i];
        const next = serialNumberLines[i + 1];
        
        if (next.number !== current.number + 1) {
          // 找到跳号
          const missingNumbers = [];
          for (let j = current.number + 1; j < next.number; j++) {
            missingNumbers.push(j);
          }
          
          const lineStartPos = this.getLineStartPosition(text, next.lineIndex);
          const lineEndPos = lineStartPos + next.line.length;
          
          errors.push(this.createError({
            ruleId: this.id,
            message: `序号跳跃：从${current.number}跳到了${next.number}，缺少${missingNumbers.join('、')}`,
            start: lineStartPos,
            end: lineEndPos,
            severity: 'warning',
            suggestion: `建议检查序号连续性，补充缺少的序号：${missingNumbers.join('、')}`,
            context: this.getContext(text, lineStartPos, lineEndPos)
          }));
        }
      }
      
      // 检查序号是否从1开始
      if (serialNumberLines.length > 0 && serialNumberLines[0].number !== 1) {
        const firstLine = serialNumberLines[0];
        const lineStartPos = this.getLineStartPosition(text, firstLine.lineIndex);
        const lineEndPos = lineStartPos + firstLine.line.length;
        
        errors.push(this.createError({
          ruleId: this.id,
          message: `序号应从1开始，当前从${firstLine.number}开始`,
          start: lineStartPos,
          end: lineEndPos,
          severity: 'info',
          suggestion: '建议序号从1开始编号',
          context: this.getContext(text, lineStartPos, lineEndPos)
        }));
      }
    }
    
    return errors;
  }
  
  private getLineStartPosition(fullText: string, lineIndex: number): number {
    const lines = fullText.split(/\r?\n/);
    let position = 0;
    
    for (let i = 0; i < lineIndex; i++) {
      position += lines[i].length + 1; // +1 for newline character
    }
    
    return position;
  }
}
