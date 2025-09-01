import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useDocumentStore } from '../../stores/documentStore';
import { renderAsync } from 'docx-preview';

interface DocumentPreviewProps {
  onScroll?: (scrollTop: number, scrollHeight: number, clientHeight: number) => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({ onScroll }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const docxContainerRef = useRef<HTMLDivElement>(null);
  const [isDocxLoaded, setIsDocxLoaded] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  
  const { 
    currentFile,
    fileUrl,
    selectedErrorId,
    detectionResult,
    setSelectedError
  } = useDocumentStore();

  // 渲染 docx 文档
  const renderDocx = useCallback(async () => {
    if (!currentFile || !docxContainerRef.current) return;
    
    try {
      setRenderError(null);
      setIsDocxLoaded(false);
      
      console.log('🔄 开始渲染 docx 文档...');
      
      const arrayBuffer = await currentFile.arrayBuffer();
      
      await renderAsync(arrayBuffer, docxContainerRef.current, undefined, {
        className: 'docx-wrapper',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        ignoreLastRenderedPageBreak: false,
        experimental: false,
        trimXmlDeclaration: true,
        useBase64URL: false,
        debug: false
      });
      

      
      setIsDocxLoaded(true);
      console.log('✅ docx 文档渲染完成');
      
    } catch (error) {
      console.error('❌ docx 渲染失败:', error);
      setRenderError(`文档渲染失败: ${error.message}`);
    }
  }, [currentFile]);

  // 当文件变化时重新渲染
  useEffect(() => {
    if (currentFile) {
      renderDocx();
    } else {
      setIsDocxLoaded(false);
      setRenderError(null);
    }
  }, [currentFile, renderDocx]);



  // 处理滚动事件
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    onScroll?.(target.scrollTop, target.scrollHeight, target.clientHeight);
  }, [onScroll]);

  // 错误高亮和定位功能
  const highlightErrors = useCallback(() => {
    if (!docxContainerRef.current || !detectionResult) return;
    
    console.log('🎨 开始添加错误高亮...');
    
    // 清除之前的高亮
    const existingHighlights = docxContainerRef.current.querySelectorAll('.error-highlight');
    existingHighlights.forEach(el => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ''), el);
        parent.normalize(); // 合并相邻的文本节点
      }
    });
    
    // 获取所有文本元素
    const allTextElements = docxContainerRef.current.querySelectorAll('.docx-wrapper p, .docx-wrapper h1, .docx-wrapper h2, .docx-wrapper h3, .docx-wrapper h4, .docx-wrapper h5, .docx-wrapper h6, .docx-wrapper li');
    
    // 为每个错误添加高亮
    detectionResult.errors.forEach((error, index) => {
      let errorElement: Element | null = null;
      
      // 方法1: 通过错误上下文文本查找
      if (error.context) {
        allTextElements.forEach(el => {
          if (el.textContent?.includes(error.context)) {
            errorElement = el;
          }
        });
      }
      
      // 方法2: 通过错误消息关键词查找
      if (!errorElement && error.message) {
        const keywords = error.message.split(/[，。！？\s]+/).filter(k => k.length > 2);
        allTextElements.forEach(el => {
          if (keywords.some(keyword => el.textContent?.includes(keyword))) {
            errorElement = el;
          }
        });
      }
      
      // 方法3: 通过位置范围查找（如果位置信息可用）
      if (!errorElement && error.position?.start !== undefined && error.position?.end !== undefined) {
        // 计算相对位置，找到对应的段落
        const totalTextLength = Array.from(allTextElements).reduce((sum, el) => sum + (el.textContent?.length || 0), 0);
        const relativePosition = error.position.start / totalTextLength;
        const targetIndex = Math.floor(relativePosition * allTextElements.length);
        if (targetIndex < allTextElements.length) {
          errorElement = allTextElements[targetIndex];
        }
      }
      
      if (errorElement) {
        // 创建高亮包装器
        const highlightWrapper = document.createElement('span');
        highlightWrapper.className = `error-highlight error-${error.category} error-${error.severity}`;
        highlightWrapper.setAttribute('data-error-id', error.id);
        highlightWrapper.setAttribute('data-error-index', (index + 1).toString());
        highlightWrapper.setAttribute('title', `${error.message} (${error.suggestion || '无修复建议'})`);
        
        // 包装文本内容
        const textContent = errorElement.textContent || '';
        highlightWrapper.textContent = textContent;
        
        // 替换原文本
        errorElement.textContent = '';
        errorElement.appendChild(highlightWrapper);
        
        console.log(`✅ 高亮错误 ${index + 1}: ${error.message}`);
      } else {
        console.warn(`⚠️ 无法找到错误 ${index + 1} 的位置: ${error.message}`);
      }
    });
    
    console.log(`✅ 已高亮 ${detectionResult.errors.length} 个错误`);
  }, [detectionResult]);

  // 滚动到指定错误位置
  const scrollToError = useCallback((errorId: string) => {
    if (!docxContainerRef.current || !detectionResult) return;
    
    const error = detectionResult.errors.find(e => e.id === errorId);
    if (!error) return;
    
    // 查找错误高亮元素
    const targetElement = docxContainerRef.current.querySelector(`[data-error-id="${errorId}"]`) as HTMLElement;
    
    if (targetElement) {
      // 计算滚动位置，确保错误在视窗中央
      const container = docxContainerRef.current;
      const containerRect = container.getBoundingClientRect();
      const elementRect = targetElement.getBoundingClientRect();
      
      const scrollTop = container.scrollTop + elementRect.top - containerRect.top - (containerRect.height / 2) + (elementRect.height / 2);
      
      // 平滑滚动到目标位置
      container.scrollTo({
        top: Math.max(0, scrollTop),
        behavior: 'smooth'
      });
      
      // 添加闪烁效果
      targetElement.classList.add('error-flash');
      setTimeout(() => {
        targetElement.classList.remove('error-flash');
      }, 2000);
      
      console.log(`🎯 已滚动到错误: ${error.message}`);
    }
  }, [detectionResult]);

  // 滚动同步功能
  const handleDocumentScroll = useCallback((event: Event) => {
    if (!onScroll) return;
    
    const target = event.target as HTMLElement;
    if (target === docxContainerRef.current) {
      const scrollTop = target.scrollTop;
      const scrollHeight = target.scrollHeight;
      const clientHeight = target.clientHeight;
      
      // 通知父组件滚动位置变化
      onScroll(scrollTop, scrollHeight, clientHeight);
      
      // 更新当前可见的错误
      updateVisibleErrors();
    }
  }, [onScroll]);

  // 更新当前可见的错误
  const updateVisibleErrors = useCallback(() => {
    if (!docxContainerRef.current) return;
    
    const container = docxContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const visibleErrors: string[] = [];
    
    // 查找所有可见的错误高亮元素
    const errorElements = container.querySelectorAll('.error-highlight');
    errorElements.forEach((element) => {
      const elementRect = element.getBoundingClientRect();
      
      // 检查元素是否在视窗中可见
      if (elementRect.top < containerRect.bottom && elementRect.bottom > containerRect.top) {
        const errorId = element.getAttribute('data-error-id');
        if (errorId) {
          visibleErrors.push(errorId);
        }
      }
    });
    
    // 更新当前可见错误状态
    if (visibleErrors.length > 0) {
      console.log(`👁️ 当前可见错误: ${visibleErrors.length} 个`);
    }
  }, []);

  // 错误定位和跳转优化
  const navigateToNextError = useCallback(() => {
    if (!detectionResult || !docxContainerRef.current) return;
    
    const currentIndex = selectedErrorId 
      ? detectionResult.errors.findIndex(e => e.id === selectedErrorId)
      : -1;
    
    const nextIndex = (currentIndex + 1) % detectionResult.errors.length;
    const nextError = detectionResult.errors[nextIndex];
    
    setSelectedError(nextError.id);
    console.log(`➡️ 跳转到下一个错误: ${nextError.message}`);
  }, [detectionResult, selectedErrorId, setSelectedError]);

  const navigateToPreviousError = useCallback(() => {
    if (!detectionResult || !docxContainerRef.current) return;
    
    const currentIndex = selectedErrorId 
      ? detectionResult.errors.findIndex(e => e.id === selectedErrorId)
      : -1;
    
    const prevIndex = currentIndex <= 0 
      ? detectionResult.errors.length - 1 
      : currentIndex - 1;
    const prevError = detectionResult.errors[prevIndex];
    
    setSelectedError(prevError.id);
    console.log(`⬅️ 跳转到上一个错误: ${prevError.message}`);
  }, [detectionResult, selectedErrorId, setSelectedError]);

  // 键盘快捷键支持
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!detectionResult) return;
    
    switch (event.key) {
      case 'ArrowRight':
      case 'n':
        event.preventDefault();
        navigateToNextError();
        break;
      case 'ArrowLeft':
      case 'p':
        event.preventDefault();
        navigateToPreviousError();
        break;
      case 'Escape':
        event.preventDefault();
        setSelectedError(null);
        break;
    }
  }, [detectionResult, navigateToNextError, navigateToPreviousError, setSelectedError]);

  // 处理错误高亮点击
  const handleErrorClick = useCallback((event: Event) => {
    const target = event.target as HTMLElement;
    const errorElement = target.closest('[data-error-id]') as HTMLElement;
    
    if (errorElement) {
      const errorId = errorElement.getAttribute('data-error-id');
      if (errorId) {
        setSelectedError(errorId === selectedErrorId ? null : errorId);
      }
    }
  }, [selectedErrorId, setSelectedError]);

  // 监听选中错误变化
  useEffect(() => {
    if (selectedErrorId) {
      scrollToError(selectedErrorId);
    }
  }, [selectedErrorId, scrollToError]);

  // 监听检测结果变化，自动高亮错误
  useEffect(() => {
    if (detectionResult && isDocxLoaded) {
      // 延迟执行，确保 DOM 完全加载
      setTimeout(() => {
        highlightErrors();
      }, 200);
    }
  }, [detectionResult, isDocxLoaded, highlightErrors]);

  // 绑定滚动、点击和键盘事件
  useEffect(() => {
    const container = docxContainerRef.current;
    if (!container) return;

    container.addEventListener('click', handleErrorClick);
    container.addEventListener('scroll', handleDocumentScroll);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('click', handleErrorClick);
      container.removeEventListener('scroll', handleDocumentScroll);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleErrorClick, handleDocumentScroll, handleKeyDown]);

  // 如果没有文件，显示上传提示
  if (!currentFile) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">暂无文档内容</div>
          <div className="text-sm">请上传Word文档开始检测</div>
        </div>
      </div>
    );
  }

  // 错误处理边界情况
  if (renderError) {
    return (
      <div className="error-boundary">
        <h3>文档渲染失败</h3>
        <p>{renderError}</p>
        <button onClick={renderDocx}>重试渲染</button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="flex-shrink-0 px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">文档预览</h3>
          <div className="flex items-center space-x-2">
            {renderError ? (
              <span className="text-xs text-red-500">渲染失败</span>
            ) : isDocxLoaded ? (
              <span className="text-xs text-green-500">✓ 渲染完成</span>
            ) : (
              <span className="text-xs text-blue-500">正在渲染...</span>
            )}
            {detectionResult && (
              <>
                <span className="text-xs text-gray-500">
                  • {detectionResult.errors.length} 个问题
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={highlightErrors}
                    className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    title="刷新错误高亮"
                  >
                    🔍 高亮
                  </button>
                  <button
                    onClick={navigateToPreviousError}
                    className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                    title="上一个错误 (← 或 p)"
                  >
                    ⬅️
                  </button>
                  <button
                    onClick={navigateToNextError}
                    className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                    title="下一个错误 (→ 或 n)"
                  >
                    ➡️
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 加载状态 */}
      {!isDocxLoaded && !renderError && (
        <div className="docx-loading">
          正在渲染文档...
        </div>
      )}

      {/* 文档内容 */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto bg-white"
        onScroll={handleScroll}
      >
        {renderError ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-red-500">
              <div className="text-lg font-medium mb-2">文档渲染失败</div>
              <div className="text-sm">{renderError}</div>
            </div>
          </div>
        ) : (
          <div 
            ref={docxContainerRef}
            className="docx-preview-container p-6"
            style={{
              minHeight: '100%',
              backgroundColor: '#fff'
            }}
          />
        )}
      </div>
    </div>
  );
};


