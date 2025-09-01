import fs from 'fs';
import JSZip from 'jszip';

/**
 * 创建一个真实的业务文档，包含多页内容和分散的错误
 */
async function createRealisticTestDocument() {
  const zip = new JSZip();

  // 文档内容：一个产品需求文档，包含多个章节
  const documentContent = `
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        <!-- 第一页：标题页 -->
        <w:p>
          <w:pPr><w:jc w:val="center"/></w:pPr>
          <w:r>
            <w:rPr><w:sz w:val="36"/><w:b/></w:rPr>
            <w:t>智能文档质量检测系统</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:pPr><w:jc w:val="center"/></w:pPr>
          <w:r>
            <w:rPr><w:sz w:val="24"/></w:rPr>
            <w:t>产品需求规格说明书</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:pPr><w:jc w:val="center"/></w:pPr>
          <w:r>
            <w:rPr><w:sz w:val="16"/></w:rPr>
            <w:t>版本：V1.0</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="16"/></w:rPr>
            <w:t>创建日期:2024年8月30日</w:t>
          </w:r>
        </w:p>

        <!-- 分页符 -->
        <w:p><w:r><w:br w:type="page"/></w:r></w:p>

        <!-- 第二页：项目概述 -->
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="28"/><w:b/></w:rPr>
            <w:t>1. 项目概述</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="16"/></w:rPr>
            <w:t>本项目旨在开发一套智能文档质量检测系统,能够自动识别Word文档中的格式问题、标点符号错误以及样式不一致等质量问题。</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="16"/></w:rPr>
            <w:t>系统主要服务于企业内部的文档</w:t>
          </w:r>
          <w:r>
            <w:rPr><w:sz w:val="16"/><w:color w:val="FF0000"/></w:rPr>
            <w:t>review</w:t>
          </w:r>
          <w:r>
            <w:rPr><w:sz w:val="16"/></w:rPr>
            <w:t>流程,提高文档质量和工作效率。</w:t>
          </w:r>
        </w:p>

        <!-- 分页符 -->
        <w:p><w:r><w:br w:type="page"/></w:r></w:p>

        <!-- 第三页：核心功能 -->
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="28"/><w:b/></w:rPr>
            <w:t>2. 核心功能</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="20"/><w:b/></w:rPr>
            <w:t>2.1 文档上传与解析</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="16"/></w:rPr>
            <w:t>用户可以通过web界面上传.docx格式的文档，系统将自动解析文档结构和内容。支持的功能包括：</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="16"/></w:rPr>
            <w:t>• 拖拽上传文档</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="16"/></w:rPr>
            <w:t>• 实时解析progress显示</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="16"/></w:rPr>
            <w:t>• 文档格式verification</w:t>
          </w:r>
        </w:p>

        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="20"/><w:b/></w:rPr>
            <w:t>2.2 智能检测引擎</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="16"/></w:rPr>
            <w:t>检测引擎采用多规则parallel处理架构，能够同时检测多种质量问题：</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="16"/></w:rPr>
            <w:t>1) 标点符号使用规范检测</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="16"/></w:rPr>
            <w:t>2）中英文间距检测</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="16"/></w:rPr>
            <w:t>3) </w:t>
          </w:r>
          <w:r>
            <w:rPr><w:sz w:val="16"/><w:color w:val="0000FF"/></w:rPr>
            <w:t>颜色一致性</w:t>
          </w:r>
          <w:r>
            <w:rPr><w:sz w:val="16"/><w:color w:val="00FF00"/></w:rPr>
            <w:t>分析</w:t>
          </w:r>
        </w:p>

        <!-- 分页符 -->
        <w:p><w:r><w:br w:type="page"/></w:r></w:p>

        <!-- 第四页：技术架构 -->
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="28"/><w:b/></w:rPr>
            <w:t>3. 技术架构</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="16"/></w:rPr>
            <w:t>系统采用前后端分离架构，前端使用React+TypeScript技术栈，后端采用Node.js+Express框架。</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="20"/><w:b/></w:rPr>
            <w:t>3.1 前端技术选型</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="16"/></w:rPr>
            <w:t>前端采用现代化的开发技术栈:</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="16"/></w:rPr>
            <w:t>• React 18.x - 用户界面框架</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="16"/></w:rPr>
            <w:t>• TypeScript - 类型安全</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="16"/></w:rPr>
            <w:t>• TailwindCSS-样式处理</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="16"/></w:rPr>
            <w:t>• Zustand   - 状态管理</w:t>
          </w:r>
        </w:p>

        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="20"/><w:b/></w:rPr>
            <w:t>3.2 核心算法</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="16"/></w:rPr>
            <w:t>位置映射算法是系统的核心技术,负责将docx文档中的字符位置精确映射到HTML渲染位置。</w:t>
          </w:r>
        </w:p>

        <!-- 分页符 -->
        <w:p><w:r><w:br w:type="page"/></w:r></w:p>

        <!-- 第五页：项目计划 -->
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="28"/><w:b/></w:rPr>
            <w:t>4. 项目实施计划</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="16"/></w:rPr>
            <w:t>项目分为三个阶段implementation:</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="18"/><w:b/></w:rPr>
            <w:t>阶段一: 基础功能开发(4周)</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="16"/></w:rPr>
            <w:t>- 文档上传解析功能</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="16"/></w:rPr>
            <w:t>-基础检测规则engine</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="16"/></w:rPr>
            <w:t>- 用户界面prototype</w:t>
          </w:r>
        </w:p>

        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="18"/><w:b/></w:rPr>
            <w:t>阶段二:高级功能实现(3周）</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="16"/></w:rPr>
            <w:t>- 智能检测算法优化</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="16"/></w:rPr>
            <w:t>- 双向交互功能</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="16"/></w:rPr>
            <w:t>- 错误修复建议generation</w:t>
          </w:r>
        </w:p>

        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="18"/><w:b/></w:rPr>
            <w:t>阶段三：测试与优化(2周)</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="16"/></w:rPr>
            <w:t>- 系统性能优化</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="16"/></w:rPr>
            <w:t>- 用户acceptance测试</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="16"/></w:rPr>
            <w:t>- 文档完善与交付</w:t>
          </w:r>
        </w:p>

        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="16"/></w:rPr>
            <w:t>预计项目总耗时9周,团队规模3-4人。</w:t>
          </w:r>
        </w:p>
      </w:body>
    </w:document>
  `.trim();

  // 创建文档结构
  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
    </Relationships>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    </Types>`;

  const appProps = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
      <Application>文档质量检测系统测试</Application>
      <DocSecurity>0</DocSecurity>
      <ScaleCrop>false</ScaleCrop>
      <SharedDoc>false</SharedDoc>
      <HyperlinksChanged>false</HyperlinksChanged>
      <AppVersion>1.0</AppVersion>
    </Properties>`;

  const coreProps = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
      <dc:title>产品需求规格说明书</dc:title>
      <dc:creator>文档质量检测系统</dc:creator>
      <cp:lastModifiedBy>测试用户</cp:lastModifiedBy>
      <cp:revision>1</cp:revision>
      <dcterms:created xsi:type="dcterms:W3CDTF">2024-08-30T10:00:00Z</dcterms:created>
      <dcterms:modified xsi:type="dcterms:W3CDTF">2024-08-30T12:00:00Z</dcterms:modified>
    </cp:coreProperties>`;

  const wordRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    </Relationships>`;

  // 添加所有文件到zip
  zip.file('_rels/.rels', docRels);
  zip.file('[Content_Types].xml', contentTypes);
  zip.file('docProps/app.xml', appProps);
  zip.file('docProps/core.xml', coreProps);
  zip.file('word/_rels/document.xml.rels', wordRels);
  zip.file('word/document.xml', documentContent);

  // 生成zip文件
  const content = await zip.generateAsync({ type: 'nodebuffer' });
  
  // 写入文件
  fs.writeFileSync('/Users/sto/checker/realistic-test-document.docx', content);
  
  console.log('✅ 已创建真实测试文档: realistic-test-document.docx');
  console.log('📄 文档特点:');
  console.log('   - 5页内容，总共约15-20个错误');
  console.log('   - 每页2-5个不同类型的错误');
  console.log('   - 真实的业务文档内容');
  console.log('   - 分散的错误分布，更贴近实际使用场景');
  console.log('');
  console.log('🔍 错误类型分布:');
  console.log('   📝 标点符号错误: 中英文符号混用、括号不匹配');
  console.log('   🔤 空格使用问题: 中英文间距、标点符号间距');
  console.log('   🎨 颜色使用问题: 相近位置颜色混用');
  console.log('   📋 格式一致性: 连字符使用、编号格式');
}

// 执行创建
createRealisticTestDocument().catch(console.error);
