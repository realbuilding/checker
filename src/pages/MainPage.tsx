import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { FileUploader } from '../components/FileUpload/FileUploader';
import { DocumentPreview } from '../components/DocumentPreview/DocumentPreview';
import { ErrorList } from '../components/ErrorList/ErrorList';
import { DocumentStructurePanel } from '../components/DocumentAnalysis/DocumentStructurePanel';
import { useSyncScroll } from '../hooks/useSyncScroll';

export const MainPage: React.FC = () => {
  const { currentDocument, detectionResult, selectedErrorId } = useDocumentStore();
  const [structureTree, setStructureTree] = useState<any[]>([]);
  const [documentSummary, setDocumentSummary] = useState<any>(null);
  
  // 双向滚动同步的引用
  const previewRef = useRef<HTMLDivElement>(null);
  const errorListRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  
  // 文档预览引用
  const documentPreviewRef = useRef<React.ElementRef<typeof DocumentPreview>>(null);

  // 监听结构分析完成事件
  React.useEffect(() => {
    const handleStructureAnalysis = (event: CustomEvent) => {
      const { structureTree, summary } = event.detail;
      setStructureTree(structureTree);
      setDocumentSummary(summary);
    };

    window.addEventListener('structureAnalysisComplete', handleStructureAnalysis as EventListener);
    
    return () => {
      window.removeEventListener('structureAnalysisComplete', handleStructureAnalysis as EventListener);
    };
  }, []);

  // 监听错误选择变化，滚动到对应位置
  useEffect(() => {
    if (selectedErrorId) {
      // 通过DOM事件触发滚动到错误位置
      const event = new CustomEvent('scrollToError', { detail: { errorId: selectedErrorId } });
      window.dispatchEvent(event);
    }
  }, [selectedErrorId]);

  // 双向滚动同步实现
  const syncScroll = useCallback((source: 'preview' | 'errorList') => {
    if (isScrollingRef.current) return;

    isScrollingRef.current = true;
    
    const sourceRef = source === 'preview' ? previewRef : errorListRef;
    const targetRef = source === 'preview' ? errorListRef : previewRef;
    
    if (sourceRef.current && targetRef.current) {
      const sourceElement = sourceRef.current;
      const targetElement = targetRef.current;
      
      const sourceRatio = sourceElement.scrollTop / (sourceElement.scrollHeight - sourceElement.clientHeight);
      const targetScrollTop = sourceRatio * (targetElement.scrollHeight - targetElement.clientHeight);
      
      targetElement.scrollTop = Math.max(0, targetScrollTop);
    }

    setTimeout(() => {
      isScrollingRef.current = false;
    }, 100);
  }, []);

  const handlePreviewScroll = useCallback(() => {
    syncScroll('preview');
  }, [syncScroll]);

  const handleErrorListScroll = useCallback(() => {
    syncScroll('errorList');
  }, [syncScroll]);

  // 如果没有文档，显示上传界面
  if (!currentDocument) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* 头部 */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <h1 className="text-xl font-semibold text-gray-900">
                    文档质量保障平台
                  </h1>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                智能检测文档质量问题
              </div>
            </div>
          </div>
        </header>

        {/* 主内容区 */}
        <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              开始检测您的文档
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              上传Word文档，我们将自动检测标点符号、空格使用、格式规范等问题，
              帮助您提升文档质量。
            </p>
          </div>
          
          <FileUploader />
        </main>
      </div>
    );
  }

  // 有文档时，显示分析界面
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 头部 */}
      <header className="flex-shrink-0 bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                文档质量保障平台
              </h1>
              {currentDocument && (
                <div className="ml-4 text-sm text-gray-600">
                  {currentDocument.metadata?.title || '未知文档'}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
          {detectionResult && (
            <div className="text-sm text-gray-600">
              检测到 {detectionResult.errors.length} 个问题
            </div>
          )}
          {documentSummary && (
            <div className="text-sm text-gray-600">
              {documentSummary.totalParagraphs} 段落 · {documentSummary.totalHeadings} 标题
            </div>
          )}
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            重新上传
          </button>
        </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 flex overflow-hidden">
        {/* 左侧：文档预览 */}
        <div 
          ref={previewRef}
          className="flex-1 bg-white border-r border-gray-200 overflow-y-auto"
          onScroll={handlePreviewScroll}
        >
          <DocumentPreview />
        </div>

        {/* 右侧：错误列表和结构分析 */}
        <div className="w-80 flex-shrink-0 bg-white flex flex-col space-y-4">
          <div 
            ref={errorListRef}
            className="flex-1 min-h-0 overflow-y-auto"
            onScroll={handleErrorListScroll}
          >
            <ErrorList />
          </div>
          <div className="flex-shrink-0 p-4 border-t border-gray-200">
            <DocumentStructurePanel 
              structureTree={structureTree}
              onNavigateToSection={(section) => {
                // TODO: 实现跳转到指定位置的功能
                console.log('跳转到:', section);
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
};
