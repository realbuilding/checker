/**
 * 文档结构分析器
 * 专门用于分析Word文档的标题结构和编号
 */

import { ParsedDocument } from '../types/document';

export interface StructureNode {
  id: string;
  title: string;
  level: number;
  numbering?: string;
  children: StructureNode[];
  position: {
    start: number;
    end: number;
  };
  element?: HTMLElement;
}

export interface DocumentStructure {
  tree: StructureNode[];
  totalHeadings: number;
  maxDepth: number;
  hasNumbering: boolean;
}

export class StructureAnalyzer {
  /**
   * 分析文档结构
   */
  analyzeStructure(document: ParsedDocument): DocumentStructure {
    const headings = this.extractHeadings(document);
    const tree = this.buildTree(headings);
    
    return {
      tree,
      totalHeadings: headings.length,
      maxDepth: this.calculateMaxDepth(tree),
      hasNumbering: headings.some(h => h.numbering)
    };
  }

  /**
   * 从文档中提取标题
   */
  private extractHeadings(document: ParsedDocument) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(document.content.html, 'text/html');
    const headings: Array<{
      element: HTMLElement;
      level: number;
      text: string;
      numbering?: string;
      position: { start: number; end: number };
    }> = [];

    // 查找所有标题元素
    const headingSelectors = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    
    headingSelectors.forEach((selector, index) => {
      const elements = doc.querySelectorAll(selector);
      elements.forEach((element, elementIndex) => {
        const text = element.textContent?.trim() || '';
        if (text) {
          const numbering = this.extractNumbering(text);
          const cleanText = this.cleanTitle(text, numbering);
          
          headings.push({
            element: element as HTMLElement,
            level: index + 1,
            text: cleanText,
            numbering,
            position: {
              start: 0, // 这里简化处理，实际应该基于字符位置
              end: 0
            }
          });
        }
      });
    });

    // 如果没有找到标题元素，尝试从段落中提取标题
    if (headings.length === 0) {
      const paragraphs = doc.querySelectorAll('p');
      paragraphs.forEach((p, index) => {
        const text = p.textContent?.trim() || '';
        if (text) {
          // 检查是否是标题格式（以编号开头或包含特定关键词）
          const numbering = this.extractNumbering(text);
          if (numbering || this.isLikelyHeading(text)) {
            // 根据编号格式推断层级
            const level = this.inferHeadingLevel(text, numbering);
            const cleanText = this.cleanTitle(text, numbering);
            
            headings.push({
              element: p as HTMLElement,
              level,
              text: cleanText,
              numbering,
              position: { start: 0, end: 0 }
            });
          }
        }
      });
    }

    return headings.sort((a, b) => {
      // 按在文档中的出现顺序排序
      const aIndex = Array.from(doc.querySelectorAll('*')).indexOf(a.element);
      const bIndex = Array.from(doc.querySelectorAll('*')).indexOf(b.element);
      return aIndex - bIndex;
    });
  }

  /**
   * 判断文本是否可能是标题
   */
  private isLikelyHeading(text: string): boolean {
    // 检查是否以"第"字开头，或包含"章"、"节"等关键词
    const headingKeywords = ['第', '章', '节', '篇', '部分', '项目'];
    return headingKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * 根据编号格式推断标题层级
   */
  private inferHeadingLevel(text: string, numbering?: string): number {
    if (!numbering) return 2; // 默认层级
    
    // 根据编号的复杂程度推断层级
    const levelCounts = (numbering.match(/\./g) || []).length;
    return Math.min(levelCounts + 1, 6); // 最多6级
  }

  /**
   * 提取标题编号
   */
  private extractNumbering(text: string): string | undefined {
    // 匹配常见的编号格式 - 按优先级排序
    const patterns = [
      /^\s*(\d+(?:\.\d+)*)/, // 1, 1.1, 1.1.1 等 - 最高优先级
      /^\s*(第[一二三四五六七八九十]+章)/, // 第一章
      /^\s*(\([一二三四五六七八九十]+\))/, // (一), (二) 等
      /^\s*([一二三四五六七八九十]+)/, // 中文数字
      /^\s*([a-zA-Z]\.?)/, // a, b, A. 等
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  /**
   * 清理标题文本，移除编号
   */
  private cleanTitle(text: string, numbering?: string): string {
    let cleanText = text;
    
    if (numbering) {
      // 移除编号部分
      cleanText = cleanText.replace(new RegExp(`^\\s*${this.escapeRegExp(numbering)}[\\s.、。]*`), '');
    }
    
    return cleanText.trim();
  }

  /**
   * 转义正则表达式特殊字符
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 构建标题树
   */
  private buildTree(headings: Array<{
    element: HTMLElement;
    level: number;
    text: string;
    numbering?: string;
    position: { start: number; end: number };
  }>): StructureNode[] {
    const tree: StructureNode[] = [];
    const stack: StructureNode[] = [];

    headings.forEach((heading, index) => {
      const node: StructureNode = {
        id: `heading-${index}`,
        title: heading.text,
        level: heading.level,
        numbering: heading.numbering,
        children: [],
        position: heading.position
      };

      // 找到正确的父节点
      while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
        stack.pop();
      }

      if (stack.length === 0) {
        tree.push(node);
      } else {
        stack[stack.length - 1].children.push(node);
      }

      stack.push(node);
    });

    return tree;
  }

  /**
   * 计算最大深度
   */
  private calculateMaxDepth(tree: StructureNode[]): number {
    let maxDepth = 0;

    const traverse = (nodes: StructureNode[], depth: number) => {
      maxDepth = Math.max(maxDepth, depth);
      nodes.forEach(node => {
        traverse(node.children, depth + 1);
      });
    };

    traverse(tree, 1);
    return maxDepth;
  }

  /**
   * 获取文档摘要
   */
  getDocumentSummary(document: ParsedDocument): {
    totalParagraphs: number;
    totalHeadings: number;
    maxHeadingLevel: number;
    hasNumbering: boolean;
    structureQuality: 'good' | 'medium' | 'poor';
  } {
    const structure = this.analyzeStructure(document);
    
    // 简单的质量评估
    let structureQuality: 'good' | 'medium' | 'poor' = 'medium';
    
    if (structure.totalHeadings >= 3 && structure.maxDepth >= 2) {
      structureQuality = 'good';
    } else if (structure.totalHeadings === 0) {
      structureQuality = 'poor';
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(document.content.html, 'text/html');
    const paragraphs = doc.querySelectorAll('p');

    return {
      totalParagraphs: paragraphs.length,
      totalHeadings: structure.totalHeadings,
      maxHeadingLevel: structure.maxDepth,
      hasNumbering: structure.hasNumbering,
      structureQuality
    };
  }
}