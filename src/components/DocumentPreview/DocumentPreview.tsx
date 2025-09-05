import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useDocumentStore } from '../../stores/documentStore';
import { renderAsync } from 'docx-preview';

interface DocumentPreviewProps {
  // 滚动事件现在由父组件处理
}

const DocumentPreview: React.FC<DocumentPreviewProps> = () => {
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

  // 添加行号到文档预览 - 基于实际Word文档行号
  const addLineNumbers = useCallback(() => {
    if (!docxContainerRef.current) return;
    
    // 清除旧的行号
    const oldNumbers = docxContainerRef.current.querySelectorAll('.line-number-container');
    oldNumbers.forEach(el => el.remove());
    
    // 获取文档全文内容
    const allElements = Array.from(docxContainerRef.current.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, div[style*="margin"], div[class*="paragraph"]'))
      .filter(el => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               rect.height > 0 && 
               (el.textContent || '').trim().length > 0;
      });
    
    if (allElements.length === 0) {
      console.warn('⚠️ 未找到任何段落元素，无法添加行号');
      return;
    }
    
    // 构建全文内容以计算实际行号
    const fullText = allElements.map(el => el.textContent || '').join('\n');
    const lines = fullText.split(/\r?\n/).filter(line => line.trim().length > 0);
    
    console.log(`📋 文档共有 ${lines.length} 行实际内容，准备添加行号...`);
    
    const container = docxContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    // 创建行号容器
    const lineNumberContainer = document.createElement('div');
    lineNumberContainer.className = 'line-number-container';
    lineNumberContainer.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      width: 60px;
      height: 100%;
      pointer-events: none;
      z-index: 10;
    `;
    
    // 为每个可见元素计算对应的实际行号范围
    let currentLineOffset = 1;
    allElements.forEach((element, elementIndex) => {
      const rect = element.getBoundingClientRect();
      const elementText = element.textContent || '';
      const elementLines = elementText.split(/\r?\n/).filter(line => line.trim().length > 0);
      
      // 计算该元素的起始行号
      const startLine = currentLineOffset;
      const endLine = currentLineOffset + elementLines.length - 1;
      
      // 为主要行号添加标记
      const lineNumber = document.createElement('div');
      lineNumber.className = 'line-number';
      lineNumber.textContent = startLine.toString();
      lineNumber.setAttribute('data-start-line', startLine.toString());
      lineNumber.setAttribute('data-end-line', endLine.toString());
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
        border-right: 1px solid #eee;
      `;
      lineNumberContainer.appendChild(lineNumber);
      
      currentLineOffset += elementLines.length;
    });
    
    container.style.position = 'relative';
    container.appendChild(lineNumberContainer);
    
    console.log(`✅ 添加了基于实际行号的行号显示，共 ${lines.length} 行`);
  }, [currentDocument]);

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

  // 增强的行号高亮算法 - 添加可视化对应
  const highlightErrorLines = useCallback(() => {
    if (!docxContainerRef.current || !detectionResult) return;
    
    console.log('🎨 开始高亮错误行号...');
    
    // 清除之前的行号高亮
    const lineNumbers = docxContainerRef.current.querySelectorAll('.line-number');
    lineNumbers.forEach(el => {
      el.classList.remove('has-error', 'selected-error', 'error-matched');
      el.removeAttribute('data-error-id');
      el.removeAttribute('data-error-index');
      el.removeAttribute('title');
    });
    
    // 获取所有段落元素
    const paragraphs = Array.from(docxContainerRef.current.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, div[style*="margin"], div[class*="paragraph"]'))
      .filter(el => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               rect.height > 0 && 
               (el.textContent || '').trim().length > 0;
    });
    
    let successCount = 0;
    let mappingLog = [];
    
    // 为每个错误计算行号并高亮对应的行号
    detectionResult.errors.forEach((error, index) => {
      const lineNumber = calculateLineNumber(error, paragraphs);
      if (lineNumber > 0) {
        // 更新错误对象的行号
        error.lineNumber = lineNumber;
        
        // 高亮对应的行号元素
        const lineNumbers = docxContainerRef.current?.querySelectorAll('.line-number-container .line-number');
        const lineNumberEl = lineNumbers ? lineNumbers[lineNumber - 1] : null;
        
        if (lineNumberEl) {
          lineNumberEl.classList.add('has-error', 'error-matched');
          lineNumberEl.setAttribute('data-error-id', error.id);
          lineNumberEl.setAttribute('data-error-index', (index + 1).toString());
          lineNumberEl.setAttribute('title', `问题 ${index + 1}: ${error.message}`);
          
          successCount++;
          mappingLog.push({
            errorIndex: index + 1,
            errorId: error.id,
            lineNumber: lineNumber,
            message: error.message.substring(0, 50) + '...'
          });
          
          console.log(`✅ 已映射: 问题${index + 1} -> 第${lineNumber}行: ${error.message}`);
        }
      } else {
        console.warn(`⚠️ 未映射: 问题${index + 1} "${error.message}" 无法找到对应行`);
      }
    });
    
    // 输出映射关系供调试
    console.table(mappingLog);
    console.log(`✅ 行号高亮处理完成: 成功${successCount}/${detectionResult.errors.length}个映射`);
  }, [detectionResult]);

  // 计算错误所在的行号 - 基于段落号的简单映射
  const calculateLineNumber = (error: any, paragraphs: Element[]): number => {
    if (!error.position || !paragraphs.length) return 0;
    
    // 统一使用段落号作为行号，保持两边一致
    // 基于错误位置找到对应的段落索引
    const errorPosition = error.position.start;
    
    // 计算累计字符位置，找到对应的段落
    let cumulativeLength = 0;
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraphText = paragraphs[i].textContent || '';
      cumulativeLength += paragraphText.length + 1; // +1 用于换行符
      
      if (cumulativeLength >= errorPosition) {
        const paragraphNumber = i + 1; // 段落号从1开始
        console.log(`📍 基于段落号计算行号: ${paragraphNumber} (段落 ${i}, 位置: ${errorPosition})`);
        return paragraphNumber;
      }
    }
    
    // 如果找不到对应段落，返回最后一个段落
    const paragraphNumber = paragraphs.length;
    console.log(`📍 使用最后一个段落号: ${paragraphNumber}`);
    return paragraphNumber;
  };

  // 滚动到指定错误位置 - 调试增强版
  const scrollToError = useCallback((errorId: string) => {
    console.group('🔍 滚动到错误调试信息');
    console.log('错误ID:', errorId);
    console.log('文档加载状态:', isDocxLoaded);
    console.log('检测结果:', detectionResult ? `${detectionResult.errors.length}个错误` : '无');
    
    if (!containerRef.current || !detectionResult) {
      console.warn('❌ 容器或检测结果不可用');
      console.groupEnd();
      return;
    }

    const error = detectionResult.errors.find(e => e.id === errorId);
    if (!error) {
      console.warn(`⚠️ 未找到错误ID: ${errorId}`);
      console.groupEnd();
      return;
    }

    console.log('目标错误:', {
      id: error.id,
      message: error.message,
      lineNumber: error.lineNumber,
      position: error.position
    });

    // 检查容器状态
    const container = containerRef.current;
    console.log('容器元素:', {
      exists: !!container,
      childrenCount: container.children.length,
      hasLineNumbers: container.querySelectorAll('.line-number').length,
      hasErrorLineNumbers: container.querySelectorAll('.line-number[data-error-id]').length
    });

    // 清除之前的高亮
    const prevHighlights = container.querySelectorAll('.paragraph-highlight');
    prevHighlights.forEach(el => el.classList.remove('paragraph-highlight'));

    // 重试机制：确保元素已加载
    const maxRetries = 5;
    let retryCount = 0;

    const attemptScroll = () => {
      // 查找对应的行号元素
      const lineNumberEl = container.querySelector(`.line-number[data-error-id="${errorId}"]`) as HTMLElement;
      
      console.log(`第${retryCount + 1}次尝试 - 行号元素:`, {
        found: !!lineNumberEl,
        allLineNumbers: container.querySelectorAll('.line-number').length,
        errorLineNumbers: container.querySelectorAll('.line-number[data-error-id]').length
      });

      if (lineNumberEl) {
        console.log('✅ 找到行号元素，开始滚动定位');
        
        // 立即添加闪烁效果
        lineNumberEl.classList.add('error-flash');
        
        // 找到对应的段落元素进行滚动
        const lineNumber = error.lineNumber;
        if (lineNumber) {
          const paragraphs = Array.from(container.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, div[style*="margin"], div[class*="paragraph"]'))
            .filter(el => {
              const style = window.getComputedStyle(el);
              const rect = el.getBoundingClientRect();
              return style.display !== 'none' && 
                     style.visibility !== 'hidden' && 
                     rect.height > 0 && 
                     (el.textContent || '').trim().length > 0;
            });
          
          console.log('段落统计:', {
            totalParagraphs: paragraphs.length,
            targetIndex: lineNumber - 1,
            targetExists: lineNumber - 1 < paragraphs.length
          });

          const targetParagraph = paragraphs[lineNumber - 1];
          if (targetParagraph) {
            console.log('✅ 找到目标段落，开始滚动');
            
            // 添加段落高亮
            targetParagraph.classList.add('paragraph-highlight');
            
            // 滚动到段落
            targetParagraph.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest'
            });
            
            console.log('✅ 滚动完成');
            
            // 3秒后移除高亮效果
            setTimeout(() => {
              targetParagraph.classList.remove('paragraph-highlight');
            }, 3000);
          } else {
            console.warn('⚠️ 未找到目标段落');
          }
        }
        
        // 移除行号闪烁效果
        setTimeout(() => {
          lineNumberEl.classList.remove('error-flash');
        }, 2000);
        
        console.groupEnd();
        return true;
      } else {
        console.warn(`⚠️ 未找到行号元素 (重试 ${retryCount + 1}/${maxRetries})`);
        return false;
      }
    };

    // 立即尝试一次
    if (attemptScroll()) {
      console.groupEnd();
      return;
    }

    // 如果失败，启动重试机制
    const retryInterval = setInterval(() => {
      retryCount++;
      
      console.log(`🔁 重试 ${retryCount}/${maxRetries}`);
      
      // 尝试重新高亮行号
      if (isDocxLoaded && detectionResult) {
        console.log('🔄 重新高亮行号...');
        highlightErrorLines();
      }

      if (attemptScroll()) {
        clearInterval(retryInterval);
        console.groupEnd();
        return;
      }

      if (retryCount >= maxRetries) {
        clearInterval(retryInterval);
        console.warn(`❌ 重试${maxRetries}次失败，尝试直接滚动到段落`);
        
        // 最终方案：直接通过行号滚动到段落
        if (error.lineNumber) {
          const paragraphs = Array.from(container.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, div[style*="margin"], div[class*="paragraph"]'))
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
            console.log('✅ 直接滚动到段落');
            
            // 添加段落高亮
            targetParagraph.classList.add('paragraph-highlight');
            
            targetParagraph.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest'
            });
            
            // 3秒后移除高亮效果
            setTimeout(() => {
              targetParagraph.classList.remove('paragraph-highlight');
            }, 3000);
          } else {
            console.warn('⚠️ 最终方案也失败');
          }
        }
        console.groupEnd();
      }
    }, 500);

  }, [detectionResult, isDocxLoaded, highlightErrorLines]);

  // 监听错误选择变化，滚动到对应位置
  useEffect(() => {
    if (selectedErrorId) {
      scrollToError(selectedErrorId);
    }
  }, [selectedErrorId]);

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
  }, []);

  // 当检测结果变化时，高亮错误行号 - 增强版
  useEffect(() => {
    if (detectionResult && isDocxLoaded) {
      // 立即执行，减少延迟
      setTimeout(() => {
        highlightErrorLines();
      }, 50);
      
      // 额外再延迟一次，确保DOM完全就绪
      setTimeout(() => {
        highlightErrorLines();
      }, 300);
    }
  }, [detectionResult, isDocxLoaded]);

  // 监听文档加载完成，立即高亮行号
  useEffect(() => {
    if (isDocxLoaded && detectionResult) {
      setTimeout(() => {
        highlightErrorLines();
      }, 100);
    }
  }, [isDocxLoaded, detectionResult, highlightErrorLines]);

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

export default DocumentPreview;