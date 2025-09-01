import { DetectionError, DetectionResult, ErrorCategory } from '../../types/error';
import { ParsedDocument } from '../../types/document';

/**
 * 结果聚合器
 * 收集、分类和汇总所有检测结果
 */
export class ResultAggregator {
  
  aggregateResults(
    document: ParsedDocument, 
    allErrors: DetectionError[]
  ): DetectionResult {
    console.log('📊 聚合检测结果...');
    
    // 过滤和分类错误
    const validErrors = this.filterValidErrors(allErrors);
    const { errors, ignoredErrors } = this.separateIgnoredErrors(validErrors);
    
    // 生成摘要
    const summary = this.generateSummary(errors);
    
    const result: DetectionResult = {
      documentId: this.generateDocumentId(document),
      timestamp: new Date(),
      summary,
      errors,
      ignoredErrors
    };
    
    console.log(`✅ 结果聚合完成: ${errors.length}个错误, ${ignoredErrors.length}个已忽略`);
    console.log(`📋 错误分类:`, summary.errorsByCategory);
    
    return result;
  }
  
  private filterValidErrors(errors: DetectionError[]): DetectionError[] {
    return errors.filter(error => {
      // 基本有效性检查
      if (!error.id || !error.message || !error.position) {
        console.warn('⚠️ 发现无效错误:', error);
        return false;
      }
      
      // 位置有效性检查
      if (error.position.start < 0 || error.position.end <= error.position.start) {
        console.warn('⚠️ 错误位置无效:', error);
        return false;
      }
      
      return true;
    });
  }
  
  private separateIgnoredErrors(errors: DetectionError[]): {
    errors: DetectionError[];
    ignoredErrors: DetectionError[];
  } {
    const errors_active = errors.filter(error => !error.ignored);
    const ignoredErrors = errors.filter(error => error.ignored);
    
    return {
      errors: errors_active,
      ignoredErrors
    };
  }
  
  private generateSummary(errors: DetectionError[]) {
    const errorsByCategory: Record<ErrorCategory, number> = {
      punctuation: 0,
      spacing: 0,
      style: 0,
      structure: 0
    };
    
    // 统计各类错误数量
    errors.forEach(error => {
      errorsByCategory[error.category]++;
    });
    
    // 计算整体严重性
    const errorCount = errors.filter(e => e.severity === 'error').length;
    const warningCount = errors.filter(e => e.severity === 'warning').length;
    
    let severity: 'high' | 'medium' | 'low';
    if (errorCount > 5) {
      severity = 'high';
    } else if (errorCount > 0 || warningCount > 10) {
      severity = 'medium';
    } else {
      severity = 'low';
    }
    
    return {
      totalErrors: errors.length,
      errorsByCategory,
      severity
    };
  }
  
  private generateDocumentId(document: ParsedDocument): string {
    const title = document.metadata.title || 'unknown';
    const timestamp = Date.now();
    return `doc-${title.replace(/[^a-zA-Z0-9]/g, '_')}-${timestamp}`;
  }
  
  // 合并多个检测结果
  mergeResults(results: DetectionResult[]): DetectionResult {
    if (results.length === 0) {
      throw new Error('无法合并空的结果数组');
    }
    
    if (results.length === 1) {
      return results[0];
    }
    
    const baseResult = results[0];
    const allErrors: DetectionError[] = [];
    const allIgnoredErrors: DetectionError[] = [];
    
    // 合并所有错误
    results.forEach(result => {
      allErrors.push(...result.errors);
      allIgnoredErrors.push(...result.ignoredErrors);
    });
    
    // 去重（基于位置和规则ID）
    const uniqueErrors = this.deduplicateErrors(allErrors);
    const uniqueIgnoredErrors = this.deduplicateErrors(allIgnoredErrors);
    
    // 重新生成摘要
    const summary = this.generateSummary(uniqueErrors);
    
    return {
      documentId: baseResult.documentId,
      timestamp: new Date(),
      summary,
      errors: uniqueErrors,
      ignoredErrors: uniqueIgnoredErrors
    };
  }
  
  private deduplicateErrors(errors: DetectionError[]): DetectionError[] {
    const seen = new Set<string>();
    return errors.filter(error => {
      const key = `${error.ruleId}-${error.position.start}-${error.position.end}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
  
  // 按类别分组错误
  groupErrorsByCategory(errors: DetectionError[]): Record<ErrorCategory, DetectionError[]> {
    const groups: Record<ErrorCategory, DetectionError[]> = {
      punctuation: [],
      spacing: [],
      style: [],
      structure: []
    };
    
    errors.forEach(error => {
      groups[error.category].push(error);
    });
    
    return groups;
  }
  
  // 按严重性排序错误
  sortErrorsBySeverity(errors: DetectionError[]): DetectionError[] {
    const severityOrder = { error: 3, warning: 2, info: 1 };
    
    return [...errors].sort((a, b) => {
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) {
        return severityDiff;
      }
      
      // 同级别按位置排序
      return a.position.start - b.position.start;
    });
  }
  
  // 生成检测报告摘要文本
  generateReportSummary(result: DetectionResult): string {
    const { summary, errors } = result;
    
    if (errors.length === 0) {
      return '🎉 太棒了！未发现任何格式问题。';
    }
    
    const lines = [
      `📋 检测完成，共发现 ${summary.totalErrors} 个问题`,
      ''
    ];
    
    // 按类别统计
    Object.entries(summary.errorsByCategory).forEach(([category, count]) => {
      if (count > 0) {
        const categoryNames = {
          punctuation: '标点符号',
          spacing: '空格使用',
          style: '样式格式',
          structure: '结构层级'
        };
        lines.push(`• ${categoryNames[category as ErrorCategory]}: ${count} 个问题`);
      }
    });
    
    lines.push('');
    
    // 严重性提示
    if (summary.severity === 'high') {
      lines.push('⚠️ 发现较多严重问题，建议优先处理');
    } else if (summary.severity === 'medium') {
      lines.push('💡 发现一些格式问题，建议改进');
    } else {
      lines.push('✨ 文档整体质量良好，有少量细节可以优化');
    }
    
    return lines.join('\n');
  }
}
