// 创建包含各种错误的测试文档
import { Document, Packer, Paragraph, TextRun } from 'docx';
import fs from 'fs';

async function createTestDocumentWithErrors() {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: "这是一个测试文档,包含各种格式问题。",
              color: "000000"
            })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "第一个问题:中英文hello混用没有空格",
              color: "000000"
            })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "第二个问题,标点符号使用错误,并且有",
              color: "FF0000"
            }),
            new TextRun({
              text: "多个颜色",
              color: "0000FF"
            }),
            new TextRun({
              text: "混合在一起.",
              color: "000000"
            })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "第三个问题   :   空格使用不当。",
              color: "000000"
            })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "第四个问题English和中文mixed没有proper spacing",
              color: "000000"
            })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "第五个问题：：重复标点符号！！",
              color: "00FF00"
            })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "最后一段包含多种错误Word文档format问题测试完毕",
              color: "000000"
            })
          ]
        })
      ]
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync('test-document-with-errors.docx', buffer);
  console.log('✅ 带错误的测试文档创建成功: test-document-with-errors.docx');
  
  console.log('📄 文档包含的错误类型:');
  console.log('• 标点符号问题：中英文标点混用，重复标点');
  console.log('• 空格问题：中英文间缺少空格，标点周围空格不当');
  console.log('• 样式问题：多种颜色混用');
  console.log('• 句末标点缺失');
}

createTestDocumentWithErrors().catch(console.error);




