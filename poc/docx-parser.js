import fs from 'fs';
import JSZip from 'jszip';

/**
 * 使用docx库和JSZip深度解析docx文件
 * 目标：识别出所有红色文字的精确位置信息
 */
class DocxAnalyzer {
  async analyzeDocument(filePath) {
    console.log('🔍 开始解析docx文档...');
    
    try {
      // 读取docx文件
      const buffer = fs.readFileSync(filePath);
      const zip = await JSZip.loadAsync(buffer);
      
      // 解析document.xml - 包含文档内容
      const documentXml = await zip.file('word/document.xml').async('text');
      
      // 解析styles.xml - 包含样式定义
      let stylesXml = '';
      if (zip.file('word/styles.xml')) {
        stylesXml = await zip.file('word/styles.xml').async('text');
      }
      
      // 分析文档结构
      const analysis = this.parseDocumentStructure(documentXml);
      
      console.log('📊 文档解析结果:');
      console.log(`总段落数: ${analysis.paragraphs.length}`);
      
      // 寻找红色文字
      const redTextSegments = this.findRedTextSegments(analysis);
      
      console.log(`🔴 发现红色文字段: ${redTextSegments.length}`);
      redTextSegments.forEach((segment, index) => {
        console.log(`  ${index + 1}. "${segment.text}" (字符位置: ${segment.startIndex}-${segment.endIndex})`);
      });
      
      return {
        analysis,
        redTextSegments,
        totalText: analysis.fullText
      };
      
    } catch (error) {
      console.error('❌ 解析docx文档时出错:', error);
      throw error;
    }
  }
  
  parseDocumentStructure(xml) {
    // 解析XML，提取段落和运行信息
    // 这是一个简化的解析器，主要关注文本内容和颜色属性
    
    const paragraphs = [];
    let fullText = '';
    let currentIndex = 0;
    
    // 使用正则表达式提取段落
    const paragraphRegex = /<w:p\b[^>]*>(.*?)<\/w:p>/gs;
    let paragraphMatch;
    
    while ((paragraphMatch = paragraphRegex.exec(xml)) !== null) {
      const paragraphXml = paragraphMatch[1];
      const paragraph = this.parseParagraph(paragraphXml, currentIndex);
      
      if (paragraph.text.trim()) {
        paragraphs.push(paragraph);
        fullText += paragraph.text;
        currentIndex += paragraph.text.length;
      }
    }
    
    return {
      paragraphs,
      fullText,
      totalLength: currentIndex
    };
  }
  
  parseParagraph(paragraphXml, startIndex) {
    const runs = [];
    let paragraphText = '';
    let currentIndex = startIndex;
    
    // 提取段落中的运行(run)
    const runRegex = /<w:r\b[^>]*>(.*?)<\/w:r>/gs;
    let runMatch;
    
    while ((runMatch = runRegex.exec(paragraphXml)) !== null) {
      const runXml = runMatch[1];
      const run = this.parseRun(runXml, currentIndex);
      
      if (run.text) {
        runs.push(run);
        paragraphText += run.text;
        currentIndex += run.text.length;
      }
    }
    
    return {
      text: paragraphText,
      runs,
      startIndex,
      endIndex: currentIndex
    };
  }
  
  parseRun(runXml, startIndex) {
    // 提取文本内容
    const textRegex = /<w:t[^>]*>(.*?)<\/w:t>/gs;
    let text = '';
    let textMatch;
    
    while ((textMatch = textRegex.exec(runXml)) !== null) {
      text += textMatch[1];
    }
    
    // 提取颜色信息
    let color = null;
    const colorRegex = /<w:color\s+w:val="([^"]+)"/;
    const colorMatch = colorRegex.exec(runXml);
    if (colorMatch) {
      color = colorMatch[1].toUpperCase();
    }
    
    // 检查是否为粗体
    const bold = runXml.includes('<w:b/>') || runXml.includes('<w:b ');
    
    return {
      text,
      color,
      bold,
      startIndex,
      endIndex: startIndex + text.length
    };
  }
  
  findRedTextSegments(analysis) {
    const redSegments = [];
    
    analysis.paragraphs.forEach(paragraph => {
      paragraph.runs.forEach(run => {
        // 检查是否为红色文字 (FF0000 或类似的红色值)
        if (run.color && (run.color === 'FF0000' || run.color === 'RED')) {
          redSegments.push({
            text: run.text,
            startIndex: run.startIndex,
            endIndex: run.endIndex,
            color: run.color,
            bold: run.bold
          });
        }
      });
    });
    
    return redSegments;
  }
}

// 测试解析器
async function testDocxParser() {
  const analyzer = new DocxAnalyzer();
  
  try {
    const result = await analyzer.analyzeDocument('test-document.docx');
    
    console.log('\n📝 完整文档内容:');
    console.log(`"${result.totalText}"`);
    
    console.log('\n🎯 PoC目标验证:');
    if (result.redTextSegments.length > 0) {
      console.log('✅ 成功识别红色文字段！');
      result.redTextSegments.forEach(segment => {
        console.log(`   "${segment.text}" 在位置 ${segment.startIndex}-${segment.endIndex}`);
      });
    } else {
      console.log('❌ 未找到红色文字段');
    }
    
    return result;
    
  } catch (error) {
    console.error('测试失败:', error);
    return null;
  }
}

// 导出供其他模块使用
export { DocxAnalyzer };

// 如果直接运行此文件，执行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  testDocxParser();
}
