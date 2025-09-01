import mammoth from 'mammoth';
import fs from 'fs';

/**
 * 使用mammoth.js将docx转换为HTML
 * 目标：获得干净的HTML输出，保持文本内容的完整性
 */
class MammothConverter {
  async convertToHtml(filePath) {
    console.log('🐘 开始用mammoth.js转换文档...');
    
    try {
      // 读取docx文件
      const buffer = fs.readFileSync(filePath);
      
      // 使用mammoth转换，包含详细选项
      const result = await mammoth.convertToHtml(
        { buffer },
        {
          // 自定义样式映射，保持结构清晰
          styleMap: [
            "p => p:fresh",
            "b => strong",
            "i => em"
          ],
          // 转换选项
          includeDefaultStyleMap: true,
          includeEmbeddedStyleMap: true
        }
      );
      
      console.log('✅ Mammoth转换完成');
      console.log(`📄 HTML长度: ${result.value.length} 字符`);
      
      if (result.messages.length > 0) {
        console.log('⚠️  转换消息:');
        result.messages.forEach(msg => {
          console.log(`   ${msg.type}: ${msg.message}`);
        });
      }
      
      // 提取纯文本用于对比
      const plainText = this.extractPlainText(result.value);
      
      console.log('📝 提取的纯文本:');
      console.log(`"${plainText}"`);
      
      return {
        html: result.value,
        plainText,
        messages: result.messages,
        htmlLength: result.value.length,
        textLength: plainText.length
      };
      
    } catch (error) {
      console.error('❌ Mammoth转换失败:', error);
      throw error;
    }
  }
  
  extractPlainText(html) {
    // 简单的HTML标签移除，提取纯文本
    return html
      .replace(/<[^>]*>/g, '') // 移除所有HTML标签
      .replace(/&nbsp;/g, ' ') // 替换非断空格
      .replace(/&amp;/g, '&')  // 替换HTML实体
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, '') // 移除多余空格，便于位置比较
      .trim();
  }
  
  analyzeHtmlStructure(html) {
    // 分析HTML结构，为位置映射做准备
    const structure = {
      paragraphs: [],
      totalElements: 0
    };
    
    // 查找所有段落
    const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gs;
    let match;
    let textIndex = 0;
    
    while ((match = paragraphRegex.exec(html)) !== null) {
      const paragraphHtml = match[1];
      const paragraphText = this.extractPlainText(paragraphHtml);
      
      if (paragraphText.trim()) {
        structure.paragraphs.push({
          html: match[0],
          text: paragraphText,
          startIndex: textIndex,
          endIndex: textIndex + paragraphText.length,
          originalMatch: match
        });
        
        textIndex += paragraphText.length;
        structure.totalElements++;
      }
    }
    
    return structure;
  }
}

// 测试转换器
async function testMammothConverter() {
  const converter = new MammothConverter();
  
  try {
    const result = await converter.convertToHtml('test-document.docx');
    
    console.log('\n🎯 HTML输出预览:');
    console.log(result.html);
    
    console.log('\n📊 HTML结构分析:');
    const structure = converter.analyzeHtmlStructure(result.html);
    console.log(`段落数量: ${structure.paragraphs.length}`);
    
    structure.paragraphs.forEach((para, index) => {
      console.log(`  段落${index + 1}: "${para.text}" (位置: ${para.startIndex}-${para.endIndex})`);
    });
    
    return {
      ...result,
      structure
    };
    
  } catch (error) {
    console.error('测试失败:', error);
    return null;
  }
}

// 导出供其他模块使用
export { MammothConverter };

// 如果直接运行此文件，执行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  testMammothConverter();
}
