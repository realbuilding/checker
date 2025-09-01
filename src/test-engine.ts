import { CheckerEngine } from './engine/CheckerEngine';
import fs from 'fs';

/**
 * 测试检测引擎的完整功能
 * 使用PoC中创建的测试文档
 */
async function testCheckerEngine() {
  console.log('🧪 开始测试检测引擎...');
  
  try {
    // 创建引擎实例
    const engine = new CheckerEngine();
    
    // 显示引擎信息
    const engineInfo = engine.getEngineInfo();
    console.log('🔧 引擎信息:', engineInfo);
    
    // 读取PoC测试文档
    const testDocPath = '../poc/test-document.docx';
    
    if (!fs.existsSync(testDocPath)) {
      console.error('❌ 测试文档不存在:', testDocPath);
      return;
    }
    
    // 创建File对象
    const buffer = fs.readFileSync(testDocPath);
    const file = new File([buffer], 'test-document.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
    
    // 验证文件格式
    if (!engine.validateFile(file)) {
      console.error('❌ 文件格式验证失败');
      return;
    }
    
    console.log('✅ 文件格式验证通过');
    
    // 执行检测
    console.log('\n🔍 开始检测...');
    const checkResult = await engine.checkDocument(file);
    
    // 展示结果
    console.log('\n📋 检测结果:');
    console.log('文档ID:', checkResult.result.documentId);
    console.log('检测时间:', checkResult.result.timestamp);
    console.log('总错误数:', checkResult.result.summary.totalErrors);
    console.log('错误分类:', checkResult.result.summary.errorsByCategory);
    console.log('严重性:', checkResult.result.summary.severity);
    
    console.log('\n📄 文档信息:');
    console.log('文本长度:', checkResult.document.content.text.length);
    console.log('段落数:', checkResult.document.content.structure.paragraphs.length);
    console.log('主体样式:', checkResult.document.styles.mainStyle);
    
    // 显示前几个错误详情
    if (checkResult.result.errors.length > 0) {
      console.log('\n🔍 错误详情 (前5个):');
      checkResult.result.errors.slice(0, 5).forEach((error, index) => {
        console.log(`${index + 1}. [${error.category}] ${error.message}`);
        console.log(`   位置: ${error.position.start}-${error.position.end}`);
        console.log(`   严重性: ${error.severity}`);
        console.log(`   上下文: ${error.context}`);
        if (error.suggestion) {
          console.log(`   建议: ${error.suggestion}`);
        }
        console.log('');
      });
    }
    
    // 保存高亮HTML用于查看
    const highlightedHtmlPath = 'test-highlighted.html';
    const fullHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>检测结果预览</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .highlight { background-color: #fef3c7; padding: 2px 4px; border-radius: 3px; }
        .error-punctuation { background-color: #fecaca; border: 1px solid #f87171; }
        .error-spacing { background-color: #ddd6fe; border: 1px solid #c4b5fd; }
        .severity-error { font-weight: bold; }
        .severity-warning { }
        .severity-info { opacity: 0.8; }
        p { margin: 10px 0; }
    </style>
</head>
<body>
    <h1>文档检测结果</h1>
    <h2>检测统计</h2>
    <p>总错误数: ${checkResult.result.summary.totalErrors}</p>
    <p>严重性: ${checkResult.result.summary.severity}</p>
    
    <h2>文档内容（带高亮）</h2>
    <div style="border: 1px solid #ddd; padding: 20px; background: #f9f9f9;">
        ${checkResult.highlightedHtml}
    </div>
</body>
</html>`;
    
    fs.writeFileSync(highlightedHtmlPath, fullHtml);
    console.log(`✅ 高亮HTML已保存到: ${highlightedHtmlPath}`);
    
    console.log('\n🎉 测试完成！');
    
    return checkResult;
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    throw error;
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  testCheckerEngine().then(() => {
    console.log('✅ 所有测试通过');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  });
}

export { testCheckerEngine };
