import React, { useEffect, useRef, useCallback } from 'react';
import { useDocumentStore } from '../../stores/documentStore';

interface DocumentPreviewProps {
  onScroll?: (scrollTop: number, scrollHeight: number, clientHeight: number) => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({ onScroll }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { 
    highlightedHtml, 
    originalHtml, 
    selectedErrorId,
    detectionResult,
    setSelectedError
  } = useDocumentStore();

  // 处理滚动事件
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    onScroll?.(target.scrollTop, target.scrollHeight, target.clientHeight);
  }, [onScroll]);

  // 滚动到指定错误位置
  const scrollToError = useCallback((errorId: string) => {
    if (!containerRef.current || !detectionResult) return;

    const error = detectionResult.errors.find(e => e.id === errorId);
    if (!error) return;

    // 查找特定错误ID的高亮元素
    const targetElement = containerRef.current.querySelector(`[data-error-id="${errorId}"]`) as HTMLElement;
    
    if (targetElement) {
      targetElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }, [detectionResult]);

  // 基于序号滚动到错误位置（新的主要方法）
  const scrollToErrorByIndex = useCallback((errorIndex: number) => {
    if (!containerRef.current) return;

    // 优先使用序号定位
    const targetElement = containerRef.current.querySelector(`[data-error-index="${errorIndex}"]`) as HTMLElement;
    
    if (targetElement) {
      targetElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }, []);

  // 处理点击高亮元素
  const handleHighlightClick = useCallback((event: Event) => {
    const target = event.target as HTMLElement;
    const highlightElement = target.closest('[data-error-id]') as HTMLElement;
    
    if (highlightElement) {
      const errorId = highlightElement.getAttribute('data-error-id');
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

  // 绑定点击事件
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('click', handleHighlightClick);

    return () => {
      container.removeEventListener('click', handleHighlightClick);
    };
  }, [handleHighlightClick]);

  // 处理HTML内容并添加选中状态样式
  const displayHtml = React.useMemo(() => {
    let html = highlightedHtml || originalHtml;
    
    if (html) {
      // 移除所有之前的选中样式（包括类名前的空格）
      html = html.replace(/\s+selected-error\b/g, '');
      
      // 如果有选中的错误，为其添加特殊样式
      if (selectedErrorId) {
        // 转义错误ID以安全地用于正则表达式
        const escapedErrorId = selectedErrorId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // 基于实际HTML结构：<span class="..." data-error-id="..." ...>
        // 匹配class属性并在其中添加selected-error类
        const regex = new RegExp(`(<span[^>]*class="[^"]*)(")([^>]*data-error-id="${escapedErrorId}"[^>]*)`, 'g');
        html = html.replace(regex, '$1 selected-error$2$3');
      }
    }
    
    return html;
  }, [highlightedHtml, originalHtml, selectedErrorId]);

  if (!displayHtml) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-lg">选择文档开始检测</p>
          <p className="text-sm text-gray-400 mt-1">文档内容将在此处显示</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="flex-shrink-0 px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">
            文档预览
          </h3>
          <div className="flex items-center space-x-2">
            {detectionResult && (
              <span className="text-xs text-gray-500">
                {detectionResult.errors.length} 个问题已标记
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 文档内容 */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-6 bg-white"
        onScroll={handleScroll}
      >
        <div 
          className="max-w-none prose prose-sm"
          dangerouslySetInnerHTML={{ __html: displayHtml }}
          style={{
            lineHeight: '1.8',
            fontSize: '14px'
          }}
        />
      </div>
    </div>
  );
};


