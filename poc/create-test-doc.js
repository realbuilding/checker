import { Document, Packer, Paragraph, TextRun } from 'docx';
import fs from 'fs';

// 创建测试文档，包含不同样式的文本
async function createTestDocument() {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: "这是正常的黑色文字。",
              color: "000000"
            })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "这是红色的重要文字！",
              color: "FF0000",
              bold: true
            })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "这里有",
              color: "000000"
            }),
            new TextRun({
              text: "蓝色",
              color: "0000FF"
            }),
            new TextRun({
              text: "和",
              color: "000000"
            }),
            new TextRun({
              text: "绿色",
              color: "00FF00"
            }),
            new TextRun({
              text: "的混合文字。",
              color: "000000"
            })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "最后一段包含",
              color: "000000"
            }),
            new TextRun({
              text: "另一个红色文字",
              color: "FF0000"
            }),
            new TextRun({
              text: "用于测试。",
              color: "000000"
            })
          ]
        })
      ]
    }]
  });

  // 生成文档
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync('test-document.docx', buffer);
  console.log('✅ 测试文档创建成功: test-document.docx');
  
  // 输出文档结构信息
  console.log('📄 文档内容结构:');
  console.log('段落1: 正常黑色文字');
  console.log('段落2: 红色粗体文字');
  console.log('段落3: 混合颜色文字（蓝色+绿色）');
  console.log('段落4: 包含红色文字的混合段落');
}

createTestDocument().catch(console.error);
