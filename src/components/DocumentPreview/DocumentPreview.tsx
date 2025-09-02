import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useDocumentStore } from '../../stores/documentStore';
import { renderAsync } from 'docx-preview';

interface DocumentPreviewProps {
  // 滚动事件现在由父组件处理
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
               el.textContent.trim().length > 0;
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

  // 渲染 docx 文档
  const renderDocx = useCallback(async () => {
    if (!currentFile || !docxContainerRef.current) return;
    
    try {
      setRenderError(null);
      setIsDocxLoaded(false);
      
      console.log('🔄 开始渲染 docx 文档...');
      
      const arrayBuffer = await currentFile.arrayBuffer();
      
      // 清空容器
      docxContainerRef.current.innerHTML = '';
      
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
      
      // 调整页边距
      const wrapper = docxContainerRef.current.querySelector('.docx-wrapper');
      if (wrapper) {
        wrapper.style.padding = '60px 80px 60px 80px';
        wrapper.style.maxWidth = 'none';
        wrapper.style.margin = '0 auto';
        wrapper.style.backgroundColor = '#ffffff';
        wrapper.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.1)';
        wrapper.style.borderRadius = '8px';
      }
      
      setIsDocxLoaded(true);
      console.log('✅ docx 文档渲染完成');
      
      // 添加行号
      setTimeout(() => {
        addLineNumbers();
      }, 300);
      
    } catch (error) {
      console.error('❌ docx 渲染失败:', error);
      setRenderError(`文档渲染失败: ${error.message}`);
    }
  }, [currentFile, addLineNumbers]);

  // 当文件变化时重新渲染
  useEffect(() => {
    if (currentFile) {
      renderDocx();
    } else {
      setIsDocxLoaded(false);
      setRenderError(null);
    }
  }, [currentFile, renderDocx]);

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
        parent.normalize();
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
    if (!containerRef.current || !detectionResult) return;
    
    const error = detectionResult.errors.find(e => e.id === errorId);
    if (!error) return;
    
    // 查找错误高亮元素
    const targetElement = containerRef.current.querySelector(`[data-error-id="${errorId}"]`) as HTMLElement;
    
    if (targetElement) {
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const elementRect = targetElement.getBoundingClientRect();
      
      const scrollTop = container.scrollTop + elementRect.top - containerRect.top - (containerRect.height / 2) + (elementRect.height / 2);
      
      container.scrollTo({
        top: Math.max(0, scrollTop),
        behavior: 'smooth'
      });
      
      targetElement.classList.add('error-flash');
      setTimeout(() => {
        targetElement.classList.remove('error-flash');
      }, 2000);
      
      console.log(`🎯 已滚动到错误: ${error.message}`);
    }
  }, [detectionResult]);

  // 滚动事件现在由父组件处理，这里不再需要

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

  // 当检测结果变化时重新高亮错误
  useEffect(() => {
    if (detectionResult && isDocxLoaded) {
      setTimeout(() => {
        highlightErrors();
      }, 100);
    }
  }, [detectionResult, isDocxLoaded, highlightErrors]);

  return (
    <div 
      ref={containerRef}
      className="h-full bg-gray-50 relative"
    >
      <div className="min-h-full">
        {currentFile ? (
          <div className="relative">
            {renderError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg m-4">
                <div className="text-red-800 font-medium">渲染错误</div>
                <div className="text-red-600 text-sm mt-1">{renderError}</div>
              </div>
            )}
            
            <div 
              ref={docxContainerRef}
              className="docx-container"
            />
            
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <div className="text-6xl mb-4">📄</div>
              <div className="text-lg">请上传 Word 文档</div>
              <div className="text-sm mt-2">支持 .docx 格式</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


