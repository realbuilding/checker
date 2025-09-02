// 测试编号提取逻辑
const testCases = [
  "1. 第一章",
  "1.1 第一节", 
  "1.2 第二节",
  "2. 第二章",
  "2.1 第一节",
  "2.2 第二节",
  "第一章 绪论",
  "1.1 研究背景",
  "（一）基本概念",
  "a. 定义"
];

function extractNumbering(text) {
  const patterns = [
    /^\s*(\d+(?:\.\d+)*)/, // 1, 1.1, 1.1.1 等
    /^\s*([一二三四五六七八九十]+)/, // 中文数字
    /^\s*([a-zA-Z]\.?)/, // a, b, A. 等
    /^\s*(第[一二三四五六七八九十]+章)/, // 第一章
    /^\s*(\([一二三四五六七八九十]+\))/, // (一), (二) 等
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return undefined;
}

function cleanTitle(text, numbering) {
  let cleanText = text;
  
  if (numbering) {
    // 转义正则表达式特殊字符
    const escaped = numbering.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleanText = cleanText.replace(new RegExp(`^\\s*${escaped}[\\s.、。]*`), '');
  }
  
  return cleanText.trim();
}

console.log("=== 编号提取测试 ===");
testCases.forEach(testCase => {
  const numbering = extractNumbering(testCase);
  const cleanText = cleanTitle(testCase, numbering);
  console.log(`原始: "${testCase}"`);
  console.log(`编号: "${numbering}"`);
  console.log(`清理: "${cleanText}"`);
  console.log("---");
});