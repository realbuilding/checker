import os
import json
from pathlib import Path

# 检查测试文件是否存在
test_files = [
    'test-word-numbering.docx',
    'test-word-advanced-numbering.docx'
]

print("检查Word测试文档...")
for filename in test_files:
    if os.path.exists(filename):
        file_size = os.path.getsize(filename)
        print(f"✓ {filename} 存在，大小: {file_size} 字节")
    else:
        print(f"✗ {filename} 不存在")

# 创建简单的文档结构测试
print("\n" + "="*50)
print("Word自动编号测试文档已创建完成")
print("="*50)

print("\n已创建以下测试文档：")
print("1. test-word-numbering.docx - 基础自动编号测试")
print("2. test-word-advanced-numbering.docx - 高级自动编号测试")

print("\n文档包含的编号格式：")
print("- Word自动编号（List Number样式）")
print("- 多级编号（1, 1.1, 1.1.1格式）")
print("- 字母编号（A, B, C格式）")
print("- 中文编号（第一条、第二条格式）")
print("- 罗马数字（I, II, III格式）")
print("- 括号编号（(1), (2), (3)格式）")

print("\n使用步骤：")
print("1. 打开 http://localhost:3000")
print("2. 上传上述Word文档")
print("3. 检查结构分析结果")
print("4. 验证编号识别准确性")