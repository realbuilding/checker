import { IntegratedDocumentParser } from './parser/IntegratedDocumentParser';
import { DocumentParser } from './parser/DocumentParser';
import { PositionMapper } from './locator/PositionMapper';
import { DocumentStructureMapper } from './locator/DocumentStructureMapper';
import { ResultAggregator } from './aggregator/ResultAggregator';
import { PunctuationRule } from './rules/PunctuationRule';
import { SpacingRule } from './rules/SpacingRule';
import { ColorRule } from './rules/ColorRule';
import { StructureRule } from './rules/StructureRule';
import { DetectionResult, DetectionRule } from '../types/error';
import { ParsedDocument } from '../types/document';
import { StructureAnalyzer } from './StructureAnalyzer';

interface DetectionError {
  id: string;
  index?: number;
  [key: string]: any;
}

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
      new StructureRule()
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
      // 1. 解析文档
      console.log('📄 第1步: 解析文档');
      const document = await this.parser.parseDocument(file);
      
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
   * 为错误分配序号，用于双向映射
   */
  private assignErrorIndexes(errors: DetectionError[]): DetectionError[] {
    return errors.map((error, index) => ({
      ...error,
      index: index + 1 // 从1开始编号，更用户友好
    }));
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
