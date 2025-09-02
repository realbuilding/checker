import { AdvancedDocumentParser } from './AdvancedDocumentParser';
import { DocumentParser } from './DocumentParser';
import { DocumentStructureMapper } from '../locator/DocumentStructureMapper';
import { ParsedDocument } from '../../types/document';

/**
 * 集成文档解析器
 * 结合高级解析器和传统解析器，提供完整的文档解析功能
 */
export class IntegratedDocumentParser {
  private advancedParser: AdvancedDocumentParser;
  private traditionalParser: DocumentParser;

  constructor() {
 this.advancedParser = new AdvancedDocumentParser();
    this.traditionalParser = new DocumentParser();
  }

  /**
   * 解析文档，选择最适合的解析器
   */
  async parseDocument(file: File, options: ParseOptions = {}): Promise<ParsedDocument> {
    const { useAdvanced = true, fallbackToTraditional = true } = options;

    try {
      if (useAdvanced) {
        console.log('🚀 使用高级解析器');
        const document = await this.advancedParser.parseDocument(file);
        
        // 创建结构映射器
        const mapper = new DocumentStructureMapper(document);
        
        // 增强文档对象
        const enhancedDocument = {
          ...document,
          mapper,
          getErrorLocation: (charIndex: number) => mapper.getErrorLocationInfo(charIndex),
          getStructureTree: () => mapper.getDocumentStructureTree()
        };

        return enhancedDocument;
      }

      throw new Error('高级解析器被禁用');

    } catch (error) {
      console.warn('高级解析失败，尝试回退到传统解析器:', error);
      
      if (fallbackToTraditional) {
        console.log('📄 使用传统解析器');
        return await this.traditionalParser.parseDocument(file);
      }

      throw error;
    }
  }

  /**
   * 验证文档格式
   */
  validateFormat(file: File): boolean {
    return this.advancedParser.validateFormat(file) || 
           this.traditionalParser.validateFormat(file);
  }

  /**
   * 获取文档结构摘要
   */
  getDocumentSummary(document: ParsedDocument): DocumentSummary {
    return {
      title: document.metadata.title || '未命名文档',
      wordCount: document.metadata.wordCount || document.content.text.length,
      paragraphCount: document.metadata.paragraphCount || document.content.structure.paragraphs.length,
      headingCount: document.structure?.headings?.length || 0,
      numberingCount: document.structure?.numbering?.length || 0,
      sections: document.structure?.sections?.length || 0,
      hasAdvancedFeatures: !!document.structure?.headings || !!document.structure?.numbering,
      structureTree: document.structure?.headings ? 
        new DocumentStructureMapper(document).getDocumentStructureTree() : []
    };
  }

  /**
   * 分析文档结构质量
   */
  analyzeStructureQuality(document: ParsedDocument): StructureQuality {
    const headings = document.structure?.headings || [];
    const paragraphs = document.content.structure.paragraphs;
    
    // 分析标题层级一致性
    const levelConsistency = this.analyzeLevelConsistency(headings);
    
    // 分析编号连续性
    const numberingConsistency = this.analyzeNumberingConsistency(document);
    
    // 分析样式一致性
    const styleConsistency = this.analyzeStyleConsistency(document);
    
    return {
      overallScore: (levelConsistency + numberingConsistency + styleConsistency) / 3,
      levelConsistency,
      numberingConsistency,
      styleConsistency,
      recommendations: this.generateRecommendations(document)
    };
  }

  /**
   * 分析标题层级一致性
   */
  private analyzeLevelConsistency(headings: any[]): number {
    if (headings.length === 0) return 1.0;
    
    let consistent = 0;
    let total = headings.length - 1;
    
    for (let i = 1; i < headings.length; i++) {
      const prev = headings[i - 1];
      const curr = headings[i];
      
      // 检查层级跳跃是否合理
      if (curr.level <= prev.level + 1) {
        consistent++;
      }
    }
    
    return total > 0 ? consistent / total : 1.0;
  }

  /**
   * 分析编号连续性
   */
  private analyzeNumberingConsistency(document: ParsedDocument): number {
    const numbering = document.structure?.numbering || [];
    if (numbering.length === 0) return 1.0;
    
    let consistent = 0;
    let total = 0;
    
    numbering.forEach(def => {
      def.levels.forEach(level => {
        // 检查编号是否从1开始
        if (level.start === 1) consistent++;
        total++;
      });
    });
    
    return total > 0 ? consistent / total : 1.0;
  }

  /**
   * 分析样式一致性
   */
  private analyzeStyleConsistency(document: ParsedDocument): number {
    const paragraphs = document.content.structure.paragraphs;
    if (paragraphs.length === 0) return 1.0;
    
    const styleCounts = new Map<string, number>();
    
    paragraphs.forEach(para => {
      const style = para.styleId || 'Normal';
      styleCounts.set(style, (styleCounts.get(style) || 0) + 1);
    });
    
    // 计算样式分布的均匀性
    const counts = Array.from(styleCounts.values());
    const total = counts.reduce((sum, count) => sum + count, 0);
    
    if (total === 0) return 1.0;
    
    const entropy = counts.reduce((sum, count) => {
      const probability = count / total;
      return sum - probability * Math.log2(probability);
    }, 0);
    
    // 归一化熵值
    const maxEntropy = Math.log2(counts.length || 1);
    return maxEntropy > 0 ? entropy / maxEntropy : 1.0;
  }

  /**
   * 生成结构优化建议
   */
  private generateRecommendations(document: ParsedDocument): string[] {
    const recommendations: string[] = [];
    const headings = document.structure?.headings || [];
    
    // 标题建议
    if (headings.length === 0) {
      recommendations.push('建议添加标题层级以提高文档结构清晰度');
    } else {
      const levels = new Set(headings.map(h => h.level));
      if (levels.size < 3) {
        recommendations.push('建议使用更多标题层级（如1-4级）来组织内容');
      }
    }
    
    // 编号建议
    const numbering = document.structure?.numbering || [];
    if (numbering.length > 0) {
      recommendations.push('已检测到自动编号，建议检查编号连续性');
    }
    
    // 样式建议
    const paragraphs = document.content.structure.paragraphs;
    const styledParagraphs = paragraphs.filter(p => p.styleId);
    const ratio = styledParagraphs.length / paragraphs.length;
    
    if (ratio < 0.5) {
      recommendations.push('建议更多使用样式而非手动格式化');
    }
    
    return recommendations;
  }

  /**
   * 搜索特定内容
   */
  searchContent(query: string, document: ParsedDocument): SearchResult[] {
    const results: SearchResult[] = [];
    const text = document.content.text.toLowerCase();
    const queryLower = query.toLowerCase();
    
    let index = 0;
    while ((index = text.indexOf(queryLower, index)) !== -1) {
      const para = new DocumentStructureMapper(document).getParagraphByCharPosition(index);
      const heading = new DocumentStructureMapper(document).findNearestHeading(index);
      
      results.push({
        position: index,
        paragraph: para,
        heading: heading,
        context: this.getContext(text, index, query.length)
      });
      
      index += queryLower.length;
    }
    
    return results;
  }

  /**
   * 获取搜索上下文
   */
  private getContext(text: string, position: number, length: number): string {
    const start = Math.max(0, position - 20);
    const end = Math.min(text.length, position + length + 20);
    
    let context = text.substring(start, end);
    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';
    
    return context;
  }
}

// 解析选项
export interface ParseOptions {
  useAdvanced?: boolean;
  fallbackToTraditional?: boolean;
  includeStructureTree?: boolean;
  analyzeQuality?: boolean;
}

// 文档摘要
export interface DocumentSummary {
  title: string;
  wordCount: number;
  paragraphCount: number;
  headingCount: number;
  numberingCount: number;
  sections: number;
  hasAdvancedFeatures: boolean;
  structureTree: any[];
}

// 结构质量分析
export interface StructureQuality {
  overallScore: number;
  levelConsistency: number;
  numberingConsistency: number;
  styleConsistency: number;
  recommendations: string[];
}

// 搜索结果
export interface SearchResult {
  position: number;
  paragraph?: any;
  heading?: any;
  context: string;
}