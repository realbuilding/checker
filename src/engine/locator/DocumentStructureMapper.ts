import { 
  ParsedDocument, 
  ParagraphInfo, 
  HeadingInfo, 
  NumberingInfo,
  WordStyle 
} from '../../types/document';

/**
 * 文档结构映射器
 * 建立Word自动序号、标题层级与内容的精确映射关系
 */
export class DocumentStructureMapper {
  private document: ParsedDocument;
  private paragraphMap: Map<number, ParagraphInfo>;
  private headingMap: Map<number, HeadingInfo>;
  private numberingMap: Map<string, ParagraphInfo[]>;
  private reverseMap: Map<string, number>;

  constructor(document: ParsedDocument) {
    this.document = document;
    this.paragraphMap = new Map();
    this.headingMap = new Map();
    this.numberingMap = new Map();
    this.reverseMap = new Map();
    
    this.buildMappings();
  }

  /**
   * 构建所有映射关系
   */
  private buildMappings() {
    const structure = this.document.content.structure;
    
    // 构建段落映射
    structure.paragraphs.forEach((para, index) => {
      this.paragraphMap.set(index, para);
      
      // 建立字符位置到段落的反向映射
      this.reverseMap.set(`${para.startIndex}-${para.endIndex}`, index);
    });

    // 构建标题映射
    structure.headings?.forEach((heading, index) => {
      this.headingMap.set(index, heading);
    });

    // 构建编号映射
    this.buildNumberingMappings();
  }

  /**
   * 构建编号映射
   */
  private buildNumberingMappings() {
    const structure = this.document.content.structure;
    
    structure.paragraphs.forEach(para => {
      if (para.numbering) {
        const key = this.generateNumberingKey(para.numbering);
        if (!this.numberingMap.has(key)) {
          this.numberingMap.set(key, []);
        }
        this.numberingMap.get(key)!.push(para);
      }
    });

    // 为每个编号序列生成实际的序号文本
    this.generateActualNumberingTexts();
  }

  /**
   * 生成实际的编号文本
   */
  private generateActualNumberingTexts() {
    const counters = new Map<string, number>();
    
    this.numberingMap.forEach((paragraphs, key) => {
      const [numberingId, level] = key.split('-');
      const levelNum = parseInt(level);
      
      // 重置低层级的计数器
      this.resetLowerLevelCounters(counters, numberingId, levelNum);
      
      // 设置当前层级的计数器
      const counterKey = `${numberingId}-${levelNum}`;
      const currentCount = (counters.get(counterKey) || 0) + 1;
      counters.set(counterKey, currentCount);
      
      // 更新段落的实际编号文本
      paragraphs.forEach(para => {
        if (para.numbering) {
          para.numbering.definition?.levels.forEach(levelDef => {
            if (levelDef.level === levelNum) {
              const actualText = this.formatNumberingText(levelDef, currentCount);
              para.numberingText = actualText;
              
              // 更新标题的完整编号
              if (para.heading) {
                para.heading.numberingText = actualText;
                para.heading.fullNumbering = this.buildFullNumberingPath(
                  counters, numberingId, levelNum
                );
              }
            }
          });
        }
      });
    });
  }

  /**
   * 重置低层级计数器
   */
  private resetLowerLevelCounters(counters: Map<string, number>, numberingId: string, level: number) {
    counters.forEach((value, key) => {
      if (key.startsWith(`${numberingId}-`) && parseInt(key.split('-')[1]) > level) {
        counters.set(key, 0);
      }
    });
  }

  /**
   * 格式化编号文本
   */
  private formatNumberingText(levelDef: any, count: number): string {
    const format = levelDef.format;
    let formatted = '';

    switch (format) {
      case 'decimal':
        formatted = count.toString();
        break;
      case 'upperRoman':
        formatted = this.toRoman(count).toUpperCase();
        break;
      case 'lowerRoman':
        formatted = this.toRoman(count).toLowerCase();
        break;
      case 'upperLetter':
        formatted = String.fromCharCode(64 + count);
        break;
      case 'lowerLetter':
        formatted = String.fromCharCode(96 + count);
        break;
      case 'chineseCounting':
        formatted = this.toChineseNumber(count);
        break;
      case 'ideographDigital':
        formatted = this.toChineseDigital(count);
        break;
      default:
        formatted = count.toString();
    }

    return levelDef.text.replace('%1', formatted);
  }

  /**
   * 构建完整编号路径
   */
  private buildFullNumberingPath(counters: Map<string, number>, numberingId: string, level: number): string {
    const path = [];
    
    for (let i = 0; i <= level; i++) {
      const counterKey = `${numberingId}-${i}`;
      const count = counters.get(counterKey) || 1;
      path.push(count.toString());
    }
    
    return path.join('.');
  }

  /**
   * 根据位置获取段落
   */
  getParagraphByIndex(index: number): ParagraphInfo | undefined {
    return this.paragraphMap.get(index);
  }

  /**
   * 根据字符位置获取段落
   */
  getParagraphByCharPosition(charIndex: number): ParagraphInfo | undefined {
    for (const [range, paraIndex] of this.reverseMap) {
      const [start, end] = range.split('-').map(Number);
      if (charIndex >= start && charIndex <= end) {
        return this.paragraphMap.get(paraIndex);
      }
    }
    return undefined;
  }

  /**
   * 根据编号获取段落
   */
  getParagraphsByNumbering(numberingId: string, level?: number): ParagraphInfo[] {
    if (level !== undefined) {
      const key = `${numberingId}-${level}`;
      return this.numberingMap.get(key) || [];
    }
    
    const paragraphs: ParagraphInfo[] = [];
    this.numberingMap.forEach((paras, key) => {
      if (key.startsWith(`${numberingId}-`)) {
        paragraphs.push(...paras);
      }
    });
    return paragraphs;
  }

  /**
   * 根据标题层级获取标题
   */
  getHeadingsByLevel(level: number): HeadingInfo[] {
    return this.document.content.structure.headings?.filter(h => h.level === level) || [];
  }

  /**
   * 根据标题文本获取标题
   */
  getHeadingByText(text: string): HeadingInfo | undefined {
    return this.document.content.structure.headings?.find(h => 
      h.text.trim().toLowerCase() === text.trim().toLowerCase()
    );
  }

  /**
   * 根据完整编号获取标题
   */
  getHeadingByFullNumbering(fullNumbering: string): HeadingInfo | undefined {
    return this.document.content.structure.headings?.find(h => 
      h.fullNumbering === fullNumbering
    );
  }

  /**
   * 获取标题的完整路径
   */
  getHeadingPath(heading: HeadingInfo): HeadingInfo[] {
    const path: HeadingInfo[] = [];
    const headings = this.document.content.structure.headings || [];
    
    // 找到当前标题的索引
    const currentIndex = headings.indexOf(heading);
    if (currentIndex === -1) return path;

    // 向上查找父级标题
    for (let i = currentIndex - 1; i >= 0; i--) {
      const parent = headings[i];
      if (parent.level < heading.level) {
        path.unshift(parent);
        // 继续查找更高层级的父级
        if (parent.level > 1) {
          path.unshift(...this.getHeadingPath(parent));
        }
        break;
      }
    }
    
    path.push(heading);
    return path;
  }

  /**
   * 获取段落的完整编号路径
   */
  getParagraphNumberingPath(para: ParagraphInfo): string {
    if (!para.numbering) return '';
    
    const numbering = para.numbering;
    const definition = numbering.definition;
    
    if (!definition) return '';
    
    const level = numbering.level;
    const path = [];
    
    // 构建从根到当前层级的完整路径
    for (let i = 0; i <= level; i++) {
      const levelDef = definition.levels[i];
      if (levelDef) {
        const counterKey = `${numbering.numberingId}-${i}`;
        const paragraphs = this.numberingMap.get(counterKey) || [];
        const index = paragraphs.indexOf(para) + 1;
        
        const formatted = this.formatNumberingText(levelDef, index);
        path.push(formatted);
      }
    }
    
    return path.join('.');
  }

  /**
   * 获取文档的层级结构树
   */
  getDocumentStructureTree(): StructureNode[] {
    const root: StructureNode = {
      type: 'document',
      title: this.document.metadata.title || '文档',
      children: []
    };

    const headings = this.document.content.structure.headings || [];
    const stack: StructureNode[] = [root];

    headings.forEach(heading => {
      const node: StructureNode = {
        type: 'heading',
        level: heading.level,
        text: heading.text,
        numbering: heading.numberingText,
        fullNumbering: heading.fullNumbering,
        startIndex: heading.startIndex,
        children: []
      };

      // 找到正确的父节点
      while (stack.length > 1 && stack[stack.length - 1].level! >= heading.level) {
        stack.pop();
      }

      stack[stack.length - 1].children!.push(node);
      stack.push(node);
    });

    return root.children || [];
  }

  /**
   * 获取错误位置的精确信息
   */
  getErrorLocationInfo(charIndex: number): ErrorLocationInfo {
    const para = this.getParagraphByCharPosition(charIndex);
    const heading = this.findNearestHeading(charIndex);
    
    return {
      paragraph: para,
      heading: heading,
      paragraphIndex: para ? this.document.content.structure.paragraphs.indexOf(para) : -1,
      charPositionInParagraph: para ? charIndex - para.startIndex : -1,
      fullNumberingPath: para ? this.getParagraphNumberingPath(para) : '',
      headingPath: heading ? this.getHeadingPath(heading) : []
    };
  }

  /**
   * 查找最近的标题
   */
  private findNearestHeading(charIndex: number): HeadingInfo | undefined {
    const headings = this.document.content.structure.headings || [];
    let nearest: HeadingInfo | undefined;
    let maxStartIndex = -1;

    headings.forEach(heading => {
      if (heading.startIndex !== undefined && 
          heading.startIndex <= charIndex && 
          heading.startIndex > maxStartIndex) {
        nearest = heading;
        maxStartIndex = heading.startIndex;
      }
    });

    return nearest;
  }

  /**
   * 工具方法：罗马数字转换
   */
  private toRoman(num: number): string {
    const roman: { [key: number]: string } = {
      1000: 'M', 900: 'CM', 500: 'D', 400: 'CD',
      100: 'C', 90: 'XC', 50: 'L', 40: 'XL',
      10: 'X', 9: 'IX', 5: 'V', 4: 'IV', 1: 'I'
    };
    
    let result = '';
    for (const value of Object.keys(roman).map(Number).sort((a, b) => b - a)) {
      while (num >= value) {
        result += roman[value];
        num -= value;
      }
    }
    return result;
  }

  /**
   * 工具方法：中文数字转换
   */
  private toChineseNumber(num: number): string {
    const chinese = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
    if (num <= 10) return chinese[num];
    
    if (num < 20) return '十' + chinese[num - 10];
    if (num < 100) {
      const tens = Math.floor(num / 10);
      const ones = num % 10;
      return chinese[tens] + '十' + (ones > 0 ? chinese[ones] : '');
    }
    
    return num.toString();
  }

  /**
   * 工具方法：中文数字格式转换
   */
  private toChineseDigital(num: number): string {
    return this.toChineseNumber(num);
  }

  /**
   * 生成编号键
   */
  private generateNumberingKey(numbering: NumberingInfo): string {
    return `${numbering.numberingId}-${numbering.level}`;
  }
}

// 辅助接口
export interface StructureNode {
  type: 'document' | 'heading' | 'paragraph';
  level?: number;
  text?: string;
  numbering?: string;
  fullNumbering?: string;
  startIndex?: number;
  children?: StructureNode[];
}

export interface ErrorLocationInfo {
  paragraph?: ParagraphInfo;
  heading?: HeadingInfo;
  paragraphIndex: number;
  charPositionInParagraph: number;
  fullNumberingPath: string;
  headingPath: HeadingInfo[];
}