// 错误检测相关类型定义

export type ErrorCategory = 'punctuation' | 'spacing' | 'style' | 'structure';
export type ErrorSeverity = 'error' | 'warning' | 'info';

export interface DetectionError {
  id: string;
  ruleId: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  suggestion?: string;
  position: TextPosition;
  context: string;
  ignored?: boolean;
}

export interface DetectionResult {
  documentId: string;
  timestamp: Date;
  summary: {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    severity: 'high' | 'medium' | 'low';
  };
  errors: DetectionError[];
  ignoredErrors: DetectionError[];
}

export interface TextPosition {
  start: number;
  end: number;
  line?: number;
  column?: number;
}

// 检测规则接口
export interface DetectionRule {
  id: string;
  name: string;
  category: ErrorCategory;
  priority: 'high' | 'medium' | 'low';
  execute(document: any): DetectionError[];
}
