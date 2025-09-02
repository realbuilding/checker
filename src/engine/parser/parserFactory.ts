/**
 * 解析器工厂
 * 提供统一的解析器创建接口
 */

import { IntegratedDocumentParser } from './IntegratedDocumentParser';
import { DocumentParser } from './DocumentParser';
import { AdvancedDocumentParser } from './AdvancedDocumentParser';

export interface ParserOptions {
  type?: 'traditional' | 'advanced' | 'integrated';
  fallback?: boolean;
  debug?: boolean;
}

/**
 * 创建解析器实例
 */
export function createParser(options: ParserOptions = {}) {
  const { type = 'integrated', fallback = true, debug = false } = options;

  switch (type) {
    case 'traditional':
      return new DocumentParser();
    
    case 'advanced':
      return new AdvancedDocumentParser();
    
    case 'integrated':
    default:
      return new IntegratedDocumentParser({
        useAdvanced: true,
        fallbackToTraditional: fallback,
        debug
      });
  }
}

/**
 * 获取可用的解析器类型
 */
export function getAvailableParsers() {
  return [
    {
      type: 'integrated',
      name: '集成解析器',
      description: '结合传统和高级解析功能，提供最佳兼容性',
      features: ['传统解析', '高级解析', '结构映射', '编号识别']
    },
    {
      type: 'advanced',
      name: '高级解析器',
      description: '深度解析文档结构，支持编号和样式识别',
      features: ['结构解析', '编号识别', '样式提取', '质量分析']
    },
    {
      type: 'traditional',
      name: '传统解析器',
      description: '基础文档解析，保持向后兼容性',
      features: ['基础解析', '文本提取', '简单结构']
    }
  ];
}