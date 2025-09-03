import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useDocumentStore } from '../../stores/documentStore';
import { renderAsync } from 'docx-preview';

interface DocumentPreviewProps {
  // 滚动事件现在由父组件处理
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const docxContainerRef = useRef<HTMLDivElement>(null);
  const [isDocxLoaded, setIsDocxLoaded] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  
  const { 
    currentFile,
    fileUrl,
    selectedErrorId,
    detectionResult,
    currentDocument,
    setSelectedError,
    highlightedHtml
  } = useDocumentStore();

  // 添加行号
  const addLineNumbers = useCallback(() => {
    if (!docxContainerRef.current) return;
    
    // 清除旧的行号
    const oldNumbers = docxContainerRef.current.querySelectorAll('.line-number-container');
    oldNumbers.forEach(el => el.remove());
    
    // 获取所有段落
    const paragraphs = Array.from(docxContainerRef.current.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li'))
      .filter(el => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               rect.height > 0 && 
               (el.textContent || '').trim().length > 0;
      });
    
    if (paragraphs.length === 0) {
      console.warn('⚠️ 未找到段落元素');
      return;
    }
    
    const container = docxContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    // 创建行号容器
    const lineNumberContainer = document.createElement('div');
    lineNumberContainer.className = 'line-number-container';
    lineNumberContainer.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      width: 50px;
      height: 100%;
      pointer-events: none;
      z-index: 10;
    `;
    
    // 添加行号
    paragraphs.forEach((p, index) => {
      const rect = p.getBoundingClientRect();
      const lineNumber = document.createElement('div');
      lineNumber.className = 'line-number';
      lineNumber.textContent = (index + 1).toString();
      lineNumber.style.cssText = `
        position: absolute;
        left: 10px;
        top: ${rect.top - containerRect.top}px;
        min-height: ${rect.height}px;
        display: flex;
        align-items: flex-start;
        justify-content: flex-end;
        padding-right: 10px;
        font-size: 12px;
        color: #666;
        font-family: 'Courier New', monospace;
      `;
      lineNumberContainer.appendChild(lineNumber);
    });
    
    container.style.position = 'relative';
    container.appendChild(lineNumberContainer);
    
    console.log(`✅ 添加了 ${paragraphs.length} 个行号`);
  }, []);

  // 增强编号显示 - 补充docx-preview可能丢失的Word自动编号
  const enhanceNumberingDisplay = useCallback(() => {
    if (!docxContainerRef.current || !currentDocument) return;
    
    console.log('🔧 开始增强编号显示...');
    
    try {
      const elements = docxContainerRef.current.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li');
      
      elements.forEach((element) => {
        const text = element.textContent || '';
        
        // 检查是否应该有编号但没有显示
        if (text.length > 0 && !text.match(/^[\s]*[一二三四五六七八九十\d]+[.、]/)) {
          // 基于位置和内容猜测可能的编号
          const elementRect = element.getBoundingClientRect();
          const containerRect = docxContainerRef.current!.getBoundingClientRect();
          const relativeTop = elementRect.top - containerRect.top;
          
          // 如果是标题类元素，可能需要编号
          if (element.tagName.match(/^H[1-6]$/)) {
            console.log(`🔍 发现可能需要编号的标题: "${text.substring(0, 50)}..."`);
          }
        }
      });
      
    } catch (error) {
      console.error('❌ 增强编号显示失败:', error);
    }
  }, [currentDocument]);

  // 渲染Word文档
  const renderDocx = useCallback(async () => {
    if (!currentFile || !containerRef.current) return;
    
    console.log('🎨 开始渲染Word文档...');
    setRenderError(null);
    
    try {
      const buffer = await currentFile.arrayBuffer();
      
      if (docxContainerRef.current) {
      docxContainerRef.current.innerHTML = '';
      }
      
      await renderAsync(buffer, docxContainerRef.current!);
      
      console.log('✅ Word文档渲染完成');
      setIsDocxLoaded(true);
      
      // 延迟执行后处理
      setTimeout(() => {
        addLineNumbers();
        enhanceNumberingDisplay();
        // 确保行号添加完成后再执行高亮
        if (detectionResult) {
          setTimeout(() => {
            // 直接调用高亮逻辑，避免循环依赖
            if (!docxContainerRef.current || !detectionResult) return;
            
            console.log('🎨 开始高亮错误行号...');
            
            // 获取所有段落元素
            const paragraphs = Array.from(docxContainerRef.current.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li'))
              .filter(el => {
                const style = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                return style.display !== 'none' && 
                       style.visibility !== 'hidden' && 
                       rect.height > 0 && 
                       (el.textContent || '').trim().length > 0;
              });
            
            let successCount = 0;
            
            // 为每个错误计算行号并高亮对应的行号
            detectionResult.errors.forEach((error, index) => {
              const lineNumber = calculateLineNumber(error, paragraphs);
              if (lineNumber > 0) {
                // 更新错误对象的行号
                error.lineNumber = lineNumber;
                
                // 高亮对应的行号元素 - 修复选择器
                const lineNumbers = docxContainerRef.current?.querySelectorAll('.line-number-container .line-number');
                const lineNumberEl = lineNumbers ? lineNumbers[lineNumber - 1] : null;
                
                if (lineNumberEl) {
                  lineNumberEl.classList.add('has-error');
                  lineNumberEl.setAttribute('data-error-id', error.id);
                  lineNumberEl.setAttribute('data-error-index', (index + 1).toString());
                  successCount++;
                  console.log(`✅ 已高亮第 ${lineNumber} 行: ${error.message}`);
                }
              }
            });
            
            console.log(`✅ 行号高亮处理完成: 成功${successCount}个, 失败${detectionResult.errors.length - successCount}个`);
          }, 100);
        }
      }, 500);
      
    } catch (error) {
      console.error('❌ Word文档渲染失败:', error);
      setRenderError(`渲染失败: ${error.message}`);
      setIsDocxLoaded(false);
    }
  }, [currentFile, addLineNumbers, enhanceNumberingDisplay]);

  // 监听文件变化，重新渲染文档
  useEffect(() => {
    if (currentFile) {
      renderDocx();
    } else {
      setIsDocxLoaded(false);
      setRenderError(null);
    }
  }, [currentFile, renderDocx]);

  // 简化的行号高亮算法
  const highlightErrorLines = useCallback(() => {
    if (!docxContainerRef.current || !detectionResult) return;
    
    console.log('🎨 开始高亮错误行号...');
    
    // 清除之前的行号高亮
    const lineNumbers = docxContainerRef.current.querySelectorAll('.line-number');
    lineNumbers.forEach(el => {
      el.classList.remove('has-error', 'selected-error');
      el.removeAttribute('data-error-id');
      el.removeAttribute('data-error-index');
    });
    
    // 获取所有段落元素
    const paragraphs = Array.from(docxContainerRef.current.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li'))
      .filter(el => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               rect.height > 0 && 
               (el.textContent || '').trim().length > 0;
    });
    
    let successCount = 0;
    
    // 为每个错误计算行号并高亮对应的行号
    detectionResult.errors.forEach((error, index) => {
      const lineNumber = calculateLineNumber(error, paragraphs);
      if (lineNumber > 0) {
        // 更新错误对象的行号
        error.lineNumber = lineNumber;
        
        // 高亮对应的行号元素 - 修复选择器
        const lineNumbers = docxContainerRef.current?.querySelectorAll('.line-number-container .line-number');
        const lineNumberEl = lineNumbers ? lineNumbers[lineNumber - 1] : null;
        
        if (lineNumberEl) {
          lineNumberEl.classList.add('has-error');
          lineNumberEl.setAttribute('data-error-id', error.id);
          lineNumberEl.setAttribute('data-error-index', (index + 1).toString());
        successCount++;
          console.log(`✅ 已高亮第 ${lineNumber} 行: ${error.message}`);
        }
      }
    });
    
    console.log(`✅ 行号高亮处理完成: 成功${successCount}个, 失败${detectionResult.errors.length - successCount}个`);
  }, [detectionResult]);

  // 计算错误所在的行号
  const calculateLineNumber = (error: any, paragraphs: Element[]): number => {
    if (!error.position || !paragraphs.length) return 0;
    
    // 获取文档的累积文本长度
    let cumulativeLength = 0;
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      const paragraphText = paragraph.textContent || '';
      const paragraphLength = paragraphText.length;
      
      // 检查错误位置是否在当前段落范围内
      if (error.position.start >= cumulativeLength && 
          error.position.start < cumulativeLength + paragraphLength) {
        return i + 1; // 行号从1开始
      }
      
      cumulativeLength += paragraphLength + 1; // +1 是为了段落间的换行符
    }
    
    // 如果没有找到精确匹配，尝试通过上下文匹配
    if (error.context) {
      for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i];
        const paragraphText = paragraph.textContent || '';
        
        // 如果错误的上下文能够在某个段落中找到
        if (paragraphText.includes(error.context.trim())) {
          console.log(`🔍 通过上下文匹配找到第 ${i + 1} 行: "${error.context}"`);
          return i + 1;
        }
      }
    }
    
    console.warn(`⚠️ 无法确定错误位置对应的行号: ${error.message}`);
    return 0;
  };

  // 滚动到指定错误位置
  const scrollToError = useCallback((errorId: string) => {
    if (!containerRef.current || !detectionResult) return;
    
    const error = detectionResult.errors.find(e => e.id === errorId);
    if (!error) {
      console.warn(`⚠️ 未找到错误ID: ${errorId}`);
      return;
    }
    
    console.log(`🎯 开始定位错误: ${error.message} (第${error.lineNumber}行)`);
    
    // 查找对应的行号元素
    const lineNumberEl = containerRef.current.querySelector(`.line-number[data-error-id="${errorId}"]`) as HTMLElement;
    
    if (lineNumberEl) {
      console.log(`✅ 找到行号元素，开始滚动定位`);
      
      // 立即添加闪烁效果
      lineNumberEl.classList.add('error-flash');
      
      // 找到对应的段落元素进行滚动
      const lineNumber = error.lineNumber;
      if (lineNumber) {
        const paragraphs = Array.from(containerRef.current.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li'))
          .filter(el => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return style.display !== 'none' && 
                   style.visibility !== 'hidden' && 
                   rect.height > 0 && 
                   (el.textContent || '').trim().length > 0;
          });
        
        const targetParagraph = paragraphs[lineNumber - 1]; // 行号从1开始，数组从0开始
        if (targetParagraph) {
          targetParagraph.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
        }
      }
      
      // 移除闪烁效果
      setTimeout(() => {
        lineNumberEl.classList.remove('error-flash');
      }, 2000);
      
      console.log(`✅ 已滚动到第 ${error.lineNumber} 行: ${error.message}`);
    } else {
      console.warn(`⚠️ 未找到行号元素，错误ID: ${errorId}`);
      // 尝试通过行号直接定位
      if (error.lineNumber) {
        const paragraphs = Array.from(containerRef.current.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li'))
          .filter(el => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return style.display !== 'none' && 
                   style.visibility !== 'hidden' && 
                   rect.height > 0 && 
                   (el.textContent || '').trim().length > 0;
          });
        
        const targetParagraph = paragraphs[error.lineNumber - 1];
        if (targetParagraph) {
          console.log(`✅ 通过行号找到段落，开始滚动`);
          targetParagraph.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
          targetParagraph.classList.add('error-flash');
          setTimeout(() => {
            targetParagraph.classList.remove('error-flash');
          }, 2000);
        }
      }
    }
  }, [detectionResult]);

  // 监听错误选择变化，滚动到对应位置
  useEffect(() => {
    if (selectedErrorId) {
      scrollToError(selectedErrorId);
    }
  }, [selectedErrorId, scrollToError]);

  // 监听外部滚动到错误的事件
  useEffect(() => {
    const handleScrollToError = (event: CustomEvent) => {
      const { errorId } = event.detail;
      scrollToError(errorId);
    };

    window.addEventListener('scrollToError', handleScrollToError as EventListener);
    
    return () => {
      window.removeEventListener('scrollToError', handleScrollToError as EventListener);
    };
  }, [scrollToError]);

  // 当检测结果变化时，高亮错误行号
  useEffect(() => {
    if (detectionResult && isDocxLoaded) {
      setTimeout(() => {
        highlightErrorLines();
      }, 100);
    }
  }, [detectionResult, isDocxLoaded, highlightErrorLines]);

  // 监听选中错误变化，更新行号的选中状态
  useEffect(() => {
    if (!docxContainerRef.current) return;
    
    // 清除所有行号的选中状态
    const allLineNumbers = docxContainerRef.current.querySelectorAll('.line-number[data-error-id]');
    allLineNumbers.forEach((el) => (el as HTMLElement).classList.remove('selected-error'));
    
    // 如果有选中的错误，高亮对应的行号
    if (selectedErrorId) {
      const selectedLineNumber = docxContainerRef.current.querySelector(`.line-number[data-error-id="${selectedErrorId}"]`) as HTMLElement;
      if (selectedLineNumber) {
        selectedLineNumber.classList.add('selected-error');
        console.log(`✅ 已高亮选中错误的行号: ${selectedErrorId}`);
      }
    }
  }, [selectedErrorId, isDocxLoaded]);

  // 预览侧 -> 选中右侧异常卡片：为行号元素绑定点击（事件委托）
  useEffect(() => {
    const container = docxContainerRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      
      // 检查是否点击了行号元素
      const lineNumberEl = target.closest('.line-number[data-error-id]') as HTMLElement | null;
      if (!lineNumberEl) return;

      const errorId = lineNumberEl.getAttribute('data-error-id');
      if (!errorId) return;

      // 更新右侧选中状态
      setSelectedError(errorId);

      // 左侧添加选中样式（同时移除其他元素的选中样式）
      const allLineNumbers = container.querySelectorAll('.line-number[data-error-id]');
      allLineNumbers.forEach((el) => (el as HTMLElement).classList.remove('selected-error'));
      lineNumberEl.classList.add('selected-error');
    };

    container.addEventListener('click', handleClick as EventListener);
    return () => {
      container.removeEventListener('click', handleClick as EventListener);
    };
  }, [setSelectedError, isDocxLoaded]);

  return (
    <div 
      ref={containerRef}
      className="h-full bg-gray-50 relative"
    >
      {/* 标题栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">
          文档预览
        </h2>
        {currentFile && (
          <div className="text-sm text-gray-500">
            {currentFile.name}
              </div>
            )}
      </div>

      {/* 文档内容区域 */}
      <div className="flex-1 overflow-auto p-6">
        {!currentFile ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg">请选择要检测的文档</p>
              <p className="text-sm text-gray-400 mt-1">支持 .docx 格式文件</p>
            </div>
          </div>
        ) : renderError ? (
          <div className="h-full flex items-center justify-center text-red-500">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg">文档渲染失败</p>
              <p className="text-sm text-gray-400 mt-1">{renderError}</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div 
              ref={docxContainerRef}
              className="docx-wrapper"
              style={{ 
                minHeight: '500px',
                fontFamily: '"Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif',
                lineHeight: 1.6
              }}
            />
            {!isDocxLoaded && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">正在渲染文档...</p>
          </div>
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};