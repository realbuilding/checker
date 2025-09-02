import React, { useCallback, useState } from 'react';
import { useDocumentStore } from '../../stores/documentStore';
import { CheckerEngine } from '../../engine/CheckerEngine';
import { StructureAnalyzer } from '../../engine/StructureAnalyzer';

interface FileUploaderProps {
  onUploadComplete?: () => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onUploadComplete }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const {
    uploadProgress,
    uploadError,
    isProcessing,
    setDocument,
    setDetectionResult,
    setHighlightedHtml,
    setProcessing,
    setUploadProgress,
    setUploadError,
    clearDocument
  } = useDocumentStore();

  const [engine] = useState(() => new CheckerEngine());

  const validateFile = (file: File): string | null => {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      return '请选择.docx格式的Word文档';
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB限制
      return '文件大小不能超过10MB';
    }
    
    return null;
  };

  const processFile = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      setUploadError(error);
      return;
    }

    setProcessing(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      console.log('🔍 开始处理文件:', file.name);
      
      // 模拟上传进度
      setUploadProgress(10);
      
      // 使用检测引擎处理文档（带高级功能）
      setUploadProgress(30);
      const result = await engine.checkDocument(file, {
        useAdvancedParser: true,
        includeStructureAnalysis: true,
        analyzeQuality: true
      });
      
      setUploadProgress(60);
      
      // 更新状态，同时传递文件
      setDocument(result.document, file);
      setDetectionResult(result.result);
      setHighlightedHtml(result.highlightedHtml);
      
      // 记录结构分析结果（如果有）
      if (result.summary) {
        console.log('📊 文档结构摘要:', result.summary);
      }
      if (result.structureTree) {
        console.log('🌳 文档结构树:', result.structureTree);
        
        // 触发自定义事件通知主页面
        window.dispatchEvent(new CustomEvent('structureAnalysisComplete', {
          detail: { structureTree: result.structureTree, summary: result.summary }
        }));
      }
      setUploadProgress(100);
      
      console.log('✅ 文件处理完成');
      console.log(`📊 检测结果: ${result.result.errors.length}个错误`);
      
      onUploadComplete?.();
      
    } catch (error) {
      console.error('❌ 文件处理失败:', error);
      setUploadError(`处理失败: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleFileSelect = useCallback((file: File) => {
    clearDocument();
    processFile(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  if (isProcessing) {
    return (
      <div className="text-center p-8">
        <div className="max-w-md mx-auto">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto mb-4">
              <svg className="animate-spin w-full h-full text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              正在分析文档...
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              这可能需要几秒钟时间
            </p>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500">{uploadProgress}%</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          上传Word文档
        </h3>
        <p className="text-gray-600 mb-4">
          拖拽.docx文件到此处，或点击选择文件
        </p>
        
        <input
          type="file"
          accept=".docx"
          onChange={handleInputChange}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="inline-flex items-center px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          选择文件
        </label>
        
        <p className="text-sm text-gray-500 mt-3">
          支持格式：.docx，最大10MB
        </p>
      </div>
      
      {uploadError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-red-800 mb-1">
                上传失败
              </h4>
              <p className="text-sm text-red-700">{uploadError}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


