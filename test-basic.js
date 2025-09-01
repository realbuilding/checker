// 基础功能测试（使用原生JS）
import { readFileSync } from 'fs';

async function testBasicFunctionality() {
  console.log('🧪 开始基础功能测试...');
  
  try {
    // 1. 测试PoC文档是否存在
    const testDocPath = './poc/test-document.docx';
    const buffer = readFileSync(testDocPath);
    console.log('✅ 测试文档读取成功，大小:', buffer.length, 'bytes');
    
    // 2. 测试mammoth库
    const mammoth = await import('mammoth');
    const result = await mammoth.convertToHtml({ buffer });
    console.log('✅ Mammoth转换成功，HTML长度:', result.value.length);
    
    // 3. 测试docx解析
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file('word/document.xml')?.async('text');
    console.log('✅ Docx解析成功，XML长度:', documentXml.length);
    
    // 4. 测试正则检测
    const text = result.value.replace(/<[^>]*>/g, '');
    console.log('📝 提取文本:', text);
    
    // 简单的标点检测
    const punctuationIssues = (text.match(/[，。！？]["'][^，。！？]*[,.;:!?]/g) || []).length;
    console.log('🔍 发现标点问题:', punctuationIssues, '个');
    
    // 简单的空格检测
    const spacingIssues = (text.match(/[\u4e00-\u9fff][a-zA-Z]|[a-zA-Z][\u4e00-\u9fff]/g) || []).length;
    console.log('🔍 发现空格问题:', spacingIssues, '个');
    
    console.log('🎉 基础功能测试通过！');
    
    return {
      success: true,
      documentSize: buffer.length,
      htmlLength: result.value.length,
      textLength: text.length,
      punctuationIssues,
      spacingIssues
    };
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    return { success: false, error: error.message };
  }
}

testBasicFunctionality().then(result => {
  if (result.success) {
    console.log('\n📊 测试结果摘要:');
    console.log(`• 文档大小: ${result.documentSize} bytes`);
    console.log(`• HTML长度: ${result.htmlLength} 字符`);  
    console.log(`• 文本长度: ${result.textLength} 字符`);
    console.log(`• 标点问题: ${result.punctuationIssues} 个`);
    console.log(`• 空格问题: ${result.spacingIssues} 个`);
    console.log('\n✅ 第二周核心功能验证通过！');
  } else {
    console.log(`\n❌ 测试失败: ${result.error}`);
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ 测试执行失败:', error);
  process.exit(1);
});
