import { BaseRule } from './BaseRule';
import { DetectionError, ErrorCategory } from '../../types/error';
import { ParsedDocument } from '../../types/document';

/**
 * 颜色使用规范检测规则
 * 检测文档中的颜色使用是否规范
 */
export class ColorRule extends BaseRule {
  id = 'color-usage';
  name = '颜色使用规范检测';
  category: ErrorCategory = 'style';
  priority: 'medium' = 'medium';

  execute(document: ParsedDocument): DetectionError[] {
    console.log('🎨 执行颜色使用检测...');
    
    const errors: DetectionError[] = [];
    const structure = document.content.structure;
    const fullText = document.content.text;
    
    // 统计颜色使用情况
    const colorUsage = new Map<string, Array<{start: number, end: number, text: string}>>();
    
    structure.paragraphs.forEach(paragraph => {
      paragraph.runs.forEach(run => {
        if (run.color && run.color !== '000000' && run.color !== 'auto') {
          const color = run.color.toUpperCase();
          if (!colorUsage.has(color)) {
            colorUsage.set(color, []);
          }
          colorUsage.get(color)!.push({
            start: run.startIndex,
            end: run.endIndex,
            text: run.text
          });
        }
      });
    });

    // 检测规则
    this.checkColorConsistency(colorUsage, fullText, errors);
    this.checkColorContrast(colorUsage, fullText, errors);
    this.checkColorOveruse(colorUsage, fullText, errors);

    console.log(`🎨 颜色检测完成，发现 ${errors.length} 个问题`);
    return errors;
  }

  /**
   * 检测颜色使用一致性
   */
  private checkColorConsistency(
    colorUsage: Map<string, Array<{start: number, end: number, text: string}>>,
    fullText: string,
    errors: DetectionError[]
  ) {
    // 如果使用了多种颜色，检查是否有明确的使用规范
    const colors = Array.from(colorUsage.keys());
    
    if (colors.length > 2) {
      // 找到第一个使用颜色的位置
      let firstColorPosition = { start: 0, end: 0 };
      let minStart = Infinity;
      
      for (const positions of colorUsage.values()) {
        for (const pos of positions) {
          if (pos.start < minStart) {
            minStart = pos.start;
            firstColorPosition = pos;
          }
        }
      }
      
      errors.push(this.createError({
        ruleId: this.id,
        message: '文档中使用了过多颜色，可能影响阅读体验',
        start: firstColorPosition.start,
        end: firstColorPosition.end,
        severity: 'warning',
        suggestion: `建议限制颜色使用种类，当前使用了 ${colors.length} 种颜色：#${colors.join(', #')}`,
        context: this.getContext(fullText, firstColorPosition.start, firstColorPosition.end)
      }));
    }
    
    // 检测同一段落内的颜色混用
    this.checkParagraphColorMixing(colorUsage, fullText, errors);
  }
  
  /**
   * 检测同一段落内的颜色混用
   */
  private checkParagraphColorMixing(
    colorUsage: Map<string, Array<{start: number, end: number, text: string}>>,
    fullText: string,
    errors: DetectionError[]
  ) {
    // 检查是否在相近位置（同一段落内）混用多种颜色
    const allColorPositions: Array<{color: string, start: number, end: number, text: string}> = [];
    
    for (const [color, positions] of colorUsage.entries()) {
      for (const pos of positions) {
        allColorPositions.push({ color, ...pos });
      }
    }
    
    // 按位置排序
    allColorPositions.sort((a, b) => a.start - b.start);
    
    // 检查相邻颜色文本
    for (let i = 0; i < allColorPositions.length - 1; i++) {
      const current = allColorPositions[i];
      const next = allColorPositions[i + 1];
      
      // 如果两个不同颜色的文本距离很近（小于50个字符），认为是混用
      if (current.color !== next.color && (next.start - current.end) < 50) {
        errors.push(this.createError({
          ruleId: this.id,
          message: '在相近位置混用了不同颜色',
          start: current.start,
          end: next.end,
          severity: 'warning',
          suggestion: `建议在同一段落中保持颜色一致性，避免混用 #${current.color} 和 #${next.color}`,
          context: this.getContext(fullText, current.start, next.end)
        }));
      }
    }
  }

  /**
   * 检测颜色对比度（简化版本）
   */
  private checkColorContrast(
    colorUsage: Map<string, Array<{start: number, end: number, text: string}>>,
    fullText: string,
    errors: DetectionError[]
  ) {
    // 检测是否使用了难以阅读的颜色
    const problematicColors = ['FFFF00', 'FFFFFF', 'C0C0C0']; // 黄色、白色、浅灰色
    
    for (const [color, positions] of colorUsage.entries()) {
      if (problematicColors.includes(color)) {
        for (const pos of positions) {
          errors.push(this.createError({
            ruleId: this.id,
            message: '使用了可能影响阅读的颜色',
            start: pos.start,
            end: pos.end,
            severity: 'warning',
            suggestion: `颜色 #${color} 可能在白色背景下难以阅读，建议使用深色文字`,
            context: this.getContext(fullText, pos.start, pos.end)
          }));
        }
      }
    }
  }

  /**
   * 检测颜色过度使用
   */
  private checkColorOveruse(
    colorUsage: Map<string, Array<{start: number, end: number, text: string}>>,
    fullText: string,
    errors: DetectionError[]
  ) {
    const totalLength = fullText.length;
    
    for (const [color, positions] of colorUsage.entries()) {
      const colorLength = positions.reduce((sum, pos) => sum + (pos.end - pos.start), 0);
      const percentage = (colorLength / totalLength) * 100;
      
      // 如果某种颜色使用超过30%，提示可能过度使用
      if (percentage > 30) {
        const firstPos = positions[0];
        errors.push(this.createError({
          ruleId: this.id,
          message: '某种颜色使用过度',
          start: firstPos.start,
          end: firstPos.end,
          severity: 'info',
          suggestion: `颜色 #${color} 使用了 ${percentage.toFixed(1)}% 的文本，建议适度使用颜色强调`,
          context: this.getContext(fullText, firstPos.start, firstPos.end)
        }));
      }
    }
  }
}
