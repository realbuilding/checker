import { IntegratedDocumentParser } from './parser/IntegratedDocumentParser';
import { DocumentParser } from './parser/DocumentParser';
import { PositionMapper } from './locator/PositionMapper';
import { DocumentStructureMapper } from './locator/DocumentStructureMapper';
import { ResultAggregator } from './aggregator/ResultAggregator';
import { PunctuationRule } from './rules/PunctuationRule';
import { SpacingRule } from './rules/SpacingRule';
import { ColorRule } from './rules/ColorRule';
import { StructureRule } from './rules/StructureRule';
import { NumberingRule } from './rules/NumberingRule';
import { DetectionResult, DetectionRule, DetectionError } from '../types/error';
import { ParsedDocument } from '../types/document';
import { StructureAnalyzer } from './StructureAnalyzer';

/**
 * 检测引擎主类
 * 整合所有组件，提供完整的文档检测功能
 */
export class CheckerEngine {
  private integratedParser: IntegratedDocumentParser;
  private parser: DocumentParser;
  private positionMapper: PositionMapper;
  private aggregator: ResultAggregator;
  private rules: DetectionRule[];
  private structureAnalyzer: StructureAnalyzer;
  private currentDocument?: ParsedDocument;
  
  constructor() {
    console.log('🚀 初始化检测引擎...');
    
    this.integratedParser = new IntegratedDocumentParser();
    this.parser = new DocumentParser();
    this.positionMapper = new PositionMapper();
    this.aggregator = new ResultAggregator();
    this.structureAnalyzer = new StructureAnalyzer();
    
    // 注册检测规则
    this.rules = [
      new PunctuationRule(),
      new SpacingRule(),
      new ColorRule(),
      new StructureRule(),
      new NumberingRule()  // 新增：Word自动编号检测规则
    ];
    
    console.log(`✅ 检测引擎初始化完成，已加载 ${this.rules.length} 个检测规则`);
  }
  
  /**
   * 检测文档的主要方法
   * 基于PoC验证成功的完整流程
   */
  async checkDocument(file: File, options: CheckOptions = {}): Promise<{
    result: DetectionResult;
    document: ParsedDocument;
    highlightedHtml: string;
    summary?: any;
    structureTree?: any[];
  }> {
    console.log('🔍 开始文档检测流程...');
    
    try {
      // 1. 双重解析文档 - 同时使用两个解析器
      console.log('📄 第1步: 双重解析文档');
      console.log('  🔹 基础解析 (用于视觉渲染)');
      const basicDocument = await this.parser.parseDocument(file);
      
      console.log('  🔹 高级解析 (用于结构分析和编号识别)');
      const advancedDocument = await this.integratedParser.parseDocument(file);
      
      // 合并两个解析结果：使用基础解析的HTML内容，高级解析的结构信息
      console.log('  🔗 合并解析结果');
      const document = this.mergeParseResults(basicDocument, advancedDocument);
      
      // 设置当前文档以供行号计算使用
      this.currentDocument = document;
      
      // 2. 分析文档结构
      console.log('🗺️ 第2步: 分析文档结构');
      const structureSummary = this.structureAnalyzer.getDocumentSummary(document);
      const structureTree = this.buildStructureTree(document);
      console.log('📊 结构摘要:', structureSummary);
      
      // 3. 创建位置映射
      console.log('📍 第3步: 创建位置映射');
      this.positionMapper.createMapping(document);
      
      // 验证位置映射
      const mappingValid = this.positionMapper.validateMapping(document);
      if (!mappingValid) {
        console.warn('⚠️ 位置映射验证失败，可能影响高亮定位功能');
      }
      
      // 4. 执行检测规则
      console.log('🔍 第4步: 执行检测规则');
      const allErrors = this.executeAllRules(document);
      
      // 5. 为错误分配序号（用于双向映射）
      console.log('🔢 第5步: 为错误分配序号');
      const errorsWithIndex = this.assignErrorIndexes(allErrors);
      
      // 6. 聚合结果
      console.log('📊 第6步: 聚合检测结果');
      const result = this.aggregator.aggregateResults(document, errorsWithIndex);
      
      // 7. 生成高亮HTML
      console.log('🎨 第7步: 生成高亮HTML');
      const highlightedHtml = this.generateHighlightedHtml(document, result);
      
      // 8. 生成结构分析
      console.log('📈 第8步: 生成结构分析');
      const summary = this.structureAnalyzer.getDocumentSummary(document);
      const finalStructureTree = this.buildStructureTree(document);
      
      console.log('✅ 文档检测完成');
      console.log(`📋 结果: ${result.errors.length}个错误, ${result.ignoredErrors.length}个已忽略`);
      
      return {
        result,
        document,
        highlightedHtml,
        summary,
        structureTree: finalStructureTree
      };
      
    } catch (error) {
      console.error('❌ 文档检测失败:', error);
      throw new Error(`文档检测失败: ${error.message}`);
    }
  }
  
  private executeAllRules(document: ParsedDocument) {
    const allErrors = [];
    
    for (const rule of this.rules) {
      try {
        console.log(`  🔧 执行规则: ${rule.name}`);
        const errors = rule.execute(document);
        allErrors.push(...errors);
        console.log(`    ✅ 发现 ${errors.length} 个问题`);
      } catch (error) {
        console.error(`❌ 规则执行失败: ${rule.name}`, error);
      }
    }
    
    return allErrors;
  }
  
  /**
   * 为错误分配序号和行号，用于双向映射
   */
  private assignErrorIndexes(errors: DetectionError[]): DetectionError[] {
    return errors.map((error, index) => ({
      ...error,
      index: index + 1, // 从1开始编号，更用户友好
      lineNumber: this.calculateErrorLineNumber(error), // 计算行号
      contextPreview: this.generateContextPreview(error) // 生成上下文预览
    }));
  }

  /**
   * 计算错误所在的段落号 - 基于Word文档段落结构
   */
  private calculateErrorLineNumber(error: DetectionError): number {
    try {
      if (!this.currentDocument?.structure?.paragraphs || !this.currentDocument?.content?.text) {
        console.warn('⚠️ 无法获取文档段落结构');
        return 0;
      }

      const paragraphs = this.currentDocument.structure.paragraphs;
      const { start } = error.position;
      
      // 基于段落结构计算段落号
      let paragraphNumber = 0;
      
      // 遍历段落，找到错误所在的段落
      for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i];
        if (start >= paragraph.startIndex && start <= paragraph.endIndex) {
          paragraphNumber = i + 1; // 段落号从1开始
          break;
        }
      }
      
      console.log(`📍 计算段落号: ${paragraphNumber} (字符位置: ${start})`);
      return paragraphNumber;
      
    } catch (err) {
      console.error('❌ 计算段落号失败:', err);
      return 0;
    }
  }

  /**
   * 生成错误的上下文预览（确保段落号与预览文本一致）
   */
  private generateContextPreview(error: DetectionError): { before: string; error: string; after: string } | undefined {
    try {
      if (!this.currentDocument?.content?.text || !this.currentDocument?.structure?.paragraphs) {
        return undefined;
      }

      const fullText = this.currentDocument.content.text;
      const { start, end } = error.position;
      const lineNumber = error.lineNumber || 0;

      // 确保位置有效
      if (start < 0 || end > fullText.length || start >= end || lineNumber <= 0) {
        return undefined;
      }

      // 直接使用段落号对应的段落，确保一致性
      const paragraphs = this.currentDocument.structure.paragraphs;
      const targetParagraph = paragraphs[lineNumber - 1]; // 数组索引从0开始

      if (!targetParagraph) {
        console.warn(`⚠️ 未找到第${lineNumber}段对应的段落信息`);
        return undefined;
      }

      // 提取错误文本（确保使用正确的段落文本）
      const paragraphText = targetParagraph.text;
      
      // 重新计算在段落内的相对位置
      // 使用段落边界重新映射位置
      const paragraphStart = targetParagraph.startIndex;
      const paragraphEnd = targetParagraph.endIndex;
      
      // 确保错误位置在段落范围内
      if (start < paragraphStart || start > paragraphEnd) {
        console.warn(`⚠️ 错误位置${start}不在第${lineNumber}段范围内[${paragraphStart}-${paragraphEnd}]`);
        return this.generateFallbackContext(error);
      }

      const relativeStart = start - paragraphStart;
      const relativeEnd = Math.min(end - paragraphStart, paragraphText.length);
      
      // 提取实际错误文本
      const errorText = paragraphText.substring(relativeStart, relativeEnd);

      // 提取段落内的上下文（确保不超过段落边界）
      const contextStart = Math.max(0, relativeStart - 15);
      const contextEnd = Math.min(paragraphText.length, relativeEnd + 15);

      let beforeText = paragraphText.substring(contextStart, relativeStart);
      let afterText = paragraphText.substring(relativeEnd, contextEnd);

      // 清理换行符和多余空格，但保留基本格式
      beforeText = beforeText.replace(/\s+/g, ' ').trim();
      afterText = afterText.replace(/\s+/g, ' ').trim();

      // 限制长度并添加省略号
      if (beforeText.length > 20) {
        beforeText = '...' + beforeText.substring(beforeText.length - 20);
      }
      if (afterText.length > 20) {
        afterText = afterText.substring(0, 20) + '...';
      }

      console.log(`✅ 第${lineNumber}段上下文预览: "${beforeText}【${errorText}】${afterText}"`);

      return {
        before: beforeText || '',
        error: errorText || '',
        after: afterText || ''
      };

    } catch (err) {
      console.error('❌ 生成上下文预览失败:', err);
      return this.generateFallbackContext(error);
    }
  }

  /**
   * 生成回退的上下文预览（当主方法失败时使用）
   */
  private generateFallbackContext(error: DetectionError): { before: string; error: string; after: string } | undefined {
    try {
      if (!this.currentDocument?.content?.text) {
        return undefined;
      }

      const fullText = this.currentDocument.content.text;
      const { start, end } = error.position;

      const errorText = fullText.substring(start, end);
      const contextLength = 15;
      
      const beforeStart = Math.max(0, start - contextLength);
      const afterEnd = Math.min(fullText.length, end + contextLength);

      let beforeText = fullText.substring(beforeStart, start);
      let afterText = fullText.substring(end, afterEnd);

      // 清理和限制长度
      beforeText = beforeText.replace(/\s+/g, ' ').trim();
      afterText = afterText.replace(/\s+/g, ' ').trim();

      if (beforeText.length > 20) beforeText = '...' + beforeText.substring(beforeText.length - 20);
      if (afterText.length > 20) afterText = afterText.substring(0, 20) + '...';

      return {
        before: beforeText || '',
        error: errorText || '',
        after: afterText || ''
      };
    } catch (err) {
      console.error('❌ 回退上下文预览失败:', err);
      return undefined;
    }
  }
  
  private generateHighlightedHtml(document: ParsedDocument, result: DetectionResult): string {
    console.log('🎨 生成高亮HTML...');
    
    try {
      let html = document.content.html;
      
      // 准备高亮范围，包含错误ID和序号
      const highlightRanges = result.errors.map(error => ({
        start: error.position.start,
        end: error.position.end,
        className: this.getErrorClassName(error.category, error.severity),
        errorId: error.id,
        errorIndex: error.index, // 新增：错误序号
        category: error.category,
        severity: error.severity
      }));
      
      // 应用高亮 - 基于PoC验证成功的方法
      if (highlightRanges.length > 0) {
        html = this.positionMapper.highlightMultipleRanges(html, highlightRanges);
        console.log(`✅ 已为 ${highlightRanges.length} 个错误添加高亮`);
      }
      
      return html;
      
    } catch (error) {
      console.error('❌ 生成高亮HTML失败:', error);
      return document.content.html; // 返回原始HTML
    }
  }
  
  private getErrorClassName(category: string, severity: string): string {
    return `highlight error-${category} severity-${severity}`;
  }
  
  /**
   * 获取支持的文件格式
   */
  getSupportedFormats(): string[] {
    return ['.docx'];
  }
  
  /**
   * 验证文件格式
   */
  validateFile(file: File): boolean {
    return this.parser.validateFormat(file);
  }
  
  /**
   * 获取引擎状态信息
   */
  getEngineInfo() {
    return {
      version: '2.0.0',
      rulesCount: this.rules.length,
      supportedFormats: this.getSupportedFormats(),
      features: ['structure-analysis', 'numbering-recognition', 'title-detection'],
      rules: this.rules.map(rule => ({
        id: rule.id,
        name: rule.name,
        category: rule.category,
        priority: rule.priority
      }))
    };
  }

  /**
   * 合并两个解析结果
   * 使用基础解析的HTML内容，高级解析的结构信息和编号信息
   */
  private mergeParseResults(basicDocument: ParsedDocument, advancedDocument: ParsedDocument): ParsedDocument {
    console.log('🔗 合并解析结果...');
    
    // 安全地获取结构信息
    const basicStructure = basicDocument.structure || {};
    const advancedStructure = advancedDocument.structure || {};
    
    // 合并编号信息：优先使用高级解析识别的编号
    const mergedNumbering = [
      ...(basicStructure.numbering || []),
      ...(advancedStructure.numbering || [])
    ];
    
    // 合并章节结构：使用更详细的结构
    const mergedSections = (advancedStructure.sections?.length > 0) 
      ? advancedStructure.sections 
      : basicStructure.sections;
    
    // 合并列表结构：优先使用高级解析的列表信息
    const mergedLists = (advancedStructure.lists?.length > 0)
      ? advancedStructure.lists
      : basicStructure.lists;
    
    const mergedDocument: ParsedDocument = {
      ...basicDocument, // 保持基础解析的HTML内容
      structure: {
        ...basicStructure,
        numbering: mergedNumbering,
        sections: mergedSections,
        lists: mergedLists,
        // 合并标题信息
        titles: [
          ...(basicStructure.titles || []),
          ...(advancedStructure.titles || [])
        ].filter((title, index, array) => 
          // 去重：基于位置和文本内容
          array.findIndex(t => t.position?.start === title.position?.start && t.text === title.text) === index
        )
      },
      // 保留基础解析的内容（用于docx-preview渲染）
      content: basicDocument.content,
      // 合并元数据
      metadata: {
        ...basicDocument.metadata,
        ...advancedDocument.metadata,
        // 标记使用了双重解析
        parsingStrategy: 'dual-parser',
        basicParserVersion: basicDocument.metadata?.parserVersion,
        advancedParserVersion: advancedDocument.metadata?.parserVersion
      }
    };
    
    console.log('✅ 解析结果合并完成');
    console.log(`  - 编号信息: ${mergedNumbering.length} 项`);
    console.log(`  - 章节结构: ${mergedSections?.length || 0} 个`);
    console.log(`  - 列表结构: ${mergedLists?.length || 0} 个`);
    console.log(`  - 标题信息: ${mergedDocument.structure?.titles?.length || 0} 个`);
    
    return mergedDocument;
  }

  /**
   * 构建文档结构树
   */
  private buildStructureTree(document: ParsedDocument): any[] {
    const analyzer = new StructureAnalyzer();
    const structure = analyzer.analyzeStructure(document);
    return structure.tree;
  }
}

// 检测选项
export interface CheckOptions {
  useAdvancedParser?: boolean;
  includeStructureAnalysis?: boolean;
  analyzeQuality?: boolean;
}
