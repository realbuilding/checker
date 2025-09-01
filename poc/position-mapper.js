import { DocxAnalyzer } from './docx-parser.js';
import { MammothConverter } from './mammoth-parser.js';

/**
 * 位置映射器 - PoC的核心组件
 * 目标：将docx解析的位置精确映射到mammoth生成的HTML上
 */
class PositionMapper {
  
  async createMapping(filePath) {
    console.log('🎯 开始创建位置映射...');
    
    // 1. 用docx库解析，获取红色文字位置
    const docxAnalyzer = new DocxAnalyzer();
    const docxResult = await docxAnalyzer.analyzeDocument(filePath);
    
    // 2. 用mammoth.js转换为HTML
    const mammothConverter = new MammothConverter();
    const mammothResult = await mammothConverter.convertToHtml(filePath);
    
    console.log('\n📊 映射数据对比:');
    console.log('Docx文本:', `"${docxResult.totalText}"`);
    console.log('HTML文本:', `"${mammothResult.plainText}"`);
    console.log('文本匹配:', docxResult.totalText === mammothResult.plainText ? '✅' : '❌');
    
    // 3. 创建位置映射
    const mapping = this.buildPositionMapping(docxResult, mammothResult);
    
    return {
      docxResult,
      mammothResult,
      mapping
    };
  }
  
  buildPositionMapping(docxResult, mammothResult) {
    console.log('\n🔄 构建位置映射...');
    
    const mapping = {
      success: false,
      mappedSegments: [],
      errors: []
    };
    
    try {
      // 使用字符串匹配算法找到红色文字在HTML中的位置
      const docxText = docxResult.totalText;
      const htmlText = mammothResult.plainText;
      
      // 遍历每个红色文字段
      docxResult.redTextSegments.forEach((segment, index) => {
        console.log(`🔍 映射红色文字段 ${index + 1}: "${segment.text}"`);
        
        // 在HTML文本中查找匹配的文字
        const htmlStartIndex = htmlText.indexOf(segment.text);
        
        if (htmlStartIndex !== -1) {
          const htmlEndIndex = htmlStartIndex + segment.text.length;
          
          // 找到在HTML DOM中的对应位置
          const domPosition = this.findDOMPosition(
            mammothResult.html, 
            segment.text, 
            htmlStartIndex
          );
          
          const mappedSegment = {
            text: segment.text,
            docxPosition: {
              start: segment.startIndex,
              end: segment.endIndex
            },
            htmlTextPosition: {
              start: htmlStartIndex,
              end: htmlEndIndex
            },
            domPosition,
            success: domPosition !== null
          };
          
          mapping.mappedSegments.push(mappedSegment);
          
          console.log(`   Docx位置: ${segment.startIndex}-${segment.endIndex}`);
          console.log(`   HTML位置: ${htmlStartIndex}-${htmlEndIndex}`);
          console.log(`   DOM定位: ${domPosition ? '✅' : '❌'}`);
          
        } else {
          mapping.errors.push(`无法在HTML中找到文字: "${segment.text}"`);
          console.log(`   ❌ 在HTML中未找到匹配文字`);
        }
      });
      
      // 判断映射是否成功
      mapping.success = mapping.mappedSegments.length > 0 && 
                       mapping.mappedSegments.every(seg => seg.success);
      
      console.log(`\n📋 映射结果: ${mapping.success ? '✅ 成功' : '❌ 失败'}`);
      console.log(`成功映射: ${mapping.mappedSegments.filter(s => s.success).length}/${mapping.mappedSegments.length}`);
      
    } catch (error) {
      mapping.errors.push(`映射过程出错: ${error.message}`);
      console.error('❌ 映射过程出错:', error);
    }
    
    return mapping;
  }
  
  findDOMPosition(html, targetText, textPosition) {
    // 分析HTML结构，找到包含目标文字的元素
    try {
      // 简化版本：找到包含目标文字的段落
      const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gs;
      let match;
      let currentPosition = 0;
      
      while ((match = paragraphRegex.exec(html)) !== null) {
        const paragraphHtml = match[1];
        const paragraphText = this.extractTextFromHtml(paragraphHtml);
        
        // 检查目标文字是否在这个段落中
        if (paragraphText.includes(targetText)) {
          const localIndex = paragraphText.indexOf(targetText);
          
          return {
            paragraphIndex: currentPosition,
            paragraphHtml: match[0],
            localTextIndex: localIndex,
            fullMatch: match,
            targetInParagraph: true
          };
        }
        
        currentPosition++;
      }
      
      return null;
      
    } catch (error) {
      console.error('DOM位置查找失败:', error);
      return null;
    }
  }
  
  extractTextFromHtml(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }
  
  // PoC的最终验证：在HTML中添加高亮标记
  async highlightRedText(filePath) {
    console.log('\n🎨 开始为红色文字添加高亮标记...');
    
    const mappingResult = await this.createMapping(filePath);
    
    if (!mappingResult.mapping.success) {
      console.log('❌ 映射失败，无法添加高亮');
      return null;
    }
    
    let modifiedHtml = mappingResult.mammothResult.html;
    
    // 为每个成功映射的红色文字添加高亮
    mappingResult.mapping.mappedSegments.forEach((segment, index) => {
      if (segment.success && segment.domPosition) {
        const originalParagraph = segment.domPosition.paragraphHtml;
        const highlightedParagraph = originalParagraph.replace(
          segment.text,
          `<span class="highlight red-text">${segment.text}</span>`
        );
        
        modifiedHtml = modifiedHtml.replace(originalParagraph, highlightedParagraph);
        
        console.log(`✅ 已为文字 "${segment.text}" 添加高亮标记`);
      }
    });
    
    return {
      originalHtml: mappingResult.mammothResult.html,
      highlightedHtml: modifiedHtml,
      mappingResult
    };
  }
}

// 测试位置映射器
async function testPositionMapper() {
  console.log('🚀 开始PoC最终测试...');
  
  const mapper = new PositionMapper();
  
  try {
    const result = await mapper.highlightRedText('test-document.docx');
    
    if (result) {
      console.log('\n📄 原始HTML:');
      console.log(result.originalHtml);
      
      console.log('\n🎨 高亮后的HTML:');
      console.log(result.highlightedHtml);
      
      console.log('\n🎯 PoC验证结果:');
      if (result.highlightedHtml.includes('class="highlight red-text"')) {
        console.log('✅ 成功！位置映射PoC验证通过！');
        console.log('✅ 已成功将docx中的红色文字在HTML中精确标记！');
        return true;
      } else {
        console.log('❌ 失败：未能在HTML中添加高亮标记');
        return false;
      }
    } else {
      console.log('❌ PoC验证失败');
      return false;
    }
    
  } catch (error) {
    console.error('❌ 测试过程出错:', error);
    return false;
  }
}

// 导出供其他模块使用
export { PositionMapper };

// 如果直接运行此文件，执行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  testPositionMapper().then(success => {
    console.log(`\n🏁 PoC最终结果: ${success ? '✅ 成功' : '❌ 失败'}`);
    process.exit(success ? 0 : 1);
  });
}
