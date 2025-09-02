import os
import sys
from pathlib import Path

# 添加项目根目录到Python路径
sys.path.append(str(Path(__file__).parent))

from src.backend.services.DocumentParser import DocumentParser
from src.backend.services.StructureAnalyzer import StructureAnalyzer

def test_word_numbering():
    """测试Word自动编号识别功能"""
    
    # 创建解析器和分析器实例
    parser = DocumentParser()
    analyzer = StructureAnalyzer()
    
    # 测试文件列表
    test_files = [
        'test-word-numbering.docx',
        'test-word-advanced-numbering.docx'
    ]
    
    for filename in test_files:
        if not os.path.exists(filename):
            print(f"文件 {filename} 不存在")
            continue
            
        print(f"\n{'='*50}")
        print(f"测试文件: {filename}")
        print(f"{'='*50}")
        
        try:
            # 解析文档
            print("正在解析文档...")
            parsed_content = parser.parse_document(filename)
            
            if not parsed_content or 'content' not in parsed_content:
                print("文档解析失败或内容为空")
                continue
            
            # 分析结构
            print("正在分析文档结构...")
            structure = analyzer.analyze_structure(parsed_content)
            
            if not structure or 'headings' not in structure:
                print("结构分析失败")
                continue
            
            # 显示分析结果
            headings = structure['headings']
            print(f"\n识别到的标题数量: {len(headings)}")
            
            print("\n详细结构:")
            for i, heading in enumerate(headings, 1):
                level = heading.get('level', 0)
                title = heading.get('title', '')
                numbering = heading.get('numbering', '')
                indent = '  ' * (level - 1) if level > 0 else ''
                
                print(f"{i}. {indent}级别 {level}: {title}")
                if numbering:
                    print(f"   {indent}编号: {numbering}")
                
            # 统计信息
            levels = [h.get('level', 0) for h in headings]
            max_level = max(levels) if levels else 0
            level_counts = {}
            for level in levels:
                level_counts[level] = level_counts.get(level, 0) + 1
            
            print(f"\n层级统计:")
            for level in sorted(level_counts.keys()):
                count = level_counts[level]
                print(f"  级别 {level}: {count} 个标题")
            
            # 检查编号连续性
            print("\n编号检查:")
            has_numbering = [h for h in headings if h.get('numbering')]
            print(f"  带编号的标题: {len(has_numbering)} 个")
            
            # 显示原始内容片段
            print(f"\n原始内容片段:")
            content = parsed_content.get('content', '')
            lines = content.split('\n')[:20]  # 显示前20行
            for i, line in enumerate(lines, 1):
                if line.strip():
                    print(f"  {i:2d}: {line.strip()}")
            
        except Exception as e:
            print(f"测试过程中出错: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_word_numbering()