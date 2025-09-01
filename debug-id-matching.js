// 调试ID匹配问题的脚本
console.log('🔍 开始调试ID匹配问题...');

// 用于在浏览器控制台运行的代码
const debugScript = `
function debugIdMatching() {
  console.log('🔍 调试错误ID匹配问题:');
  
  // 获取右侧错误列表中的所有错误ID
  const errorListContainer = document.querySelector('main > div:last-child > div:last-child');
  const errorCards = errorListContainer ? errorListContainer.querySelectorAll('[data-error-id]') : [];
  console.log('右侧错误卡片数量:', errorCards.length);
  
  const rightSideIds = Array.from(errorCards).map(card => card.getAttribute('data-error-id'));
  console.log('右侧所有错误ID:', rightSideIds);
  
  // 获取左侧文档预览中的所有错误ID
  const documentPreview = document.querySelector('main > div:first-child');
  const highlightElements = documentPreview ? documentPreview.querySelectorAll('[data-error-id]') : [];
  console.log('左侧高亮元素数量:', highlightElements.length);
  
  const leftSideIds = Array.from(highlightElements).map(elem => elem.getAttribute('data-error-id'));
  console.log('左侧所有错误ID:', leftSideIds);
  
  // 详细比较ID
  console.log('\\n=== 详细ID对比 ===');
  rightSideIds.forEach((rightId, index) => {
    const hasMatchInLeft = leftSideIds.includes(rightId);
    console.log(\`右侧[\${index}]: \${rightId} -> 左侧匹配: \${hasMatchInLeft ? '✅' : '❌'}\`);
  });
  
  console.log('\\n=== 左侧独有ID ===');
  leftSideIds.forEach((leftId, index) => {
    const hasMatchInRight = rightSideIds.includes(leftId);
    if (!hasMatchInRight) {
      console.log(\`左侧[\${index}]: \${leftId} -> 右侧没有匹配\`);
    }
  });
  
  // 检查ID生成模式差异
  if (rightSideIds.length > 0 && leftSideIds.length > 0) {
    console.log('\\n=== ID模式分析 ===');
    console.log('右侧第一个ID:', rightSideIds[0]);
    console.log('左侧第一个ID:', leftSideIds[0]);
    
    // 分析ID结构
    const rightParts = rightSideIds[0].split('-');
    const leftParts = leftSideIds[0].split('-');
    console.log('右侧ID结构:', rightParts);
    console.log('左侧ID结构:', leftParts);
  }
  
  return {
    rightCount: errorCards.length,
    leftCount: highlightElements.length,
    rightIds: rightSideIds,
    leftIds: leftSideIds,
    matchCount: rightSideIds.filter(id => leftSideIds.includes(id)).length
  };
}

// 运行调试
debugIdMatching();
`;

console.log('请在浏览器控制台中运行以下代码：');
console.log('================================');
console.log(debugScript);
console.log('================================');
