import { create } from 'zustand';
import { ParsedDocument } from '../types/document';
import { DetectionResult } from '../types/error';

interface DocumentState {
  // 文档相关状态
  currentDocument: ParsedDocument | null;
  originalHtml: string;
  highlightedHtml: string;
  
  // 文件相关状态
  currentFile: File | null;
  fileUrl: string | null;
  
  // 检测结果
  detectionResult: DetectionResult | null;
  
  // UI状态
  isProcessing: boolean;
  selectedErrorId: string | null;
  showIgnored: boolean;
  
  // 文件上传状态
  uploadProgress: number;
  uploadError: string | null;
  
  // Actions
  setDocument: (document: ParsedDocument, file?: File) => void;
  setDetectionResult: (result: DetectionResult) => void;
  setHighlightedHtml: (html: string) => void;
  setSelectedError: (errorId: string | null) => void;
  setShowIgnored: (show: boolean) => void;
  setProcessing: (processing: boolean) => void;
  setUploadProgress: (progress: number) => void;
  setUploadError: (error: string | null) => void;
  clearDocument: () => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  // 初始状态
  currentDocument: null,
  originalHtml: '',
  highlightedHtml: '',
  currentFile: null,
  fileUrl: null,
  detectionResult: null,
  isProcessing: false,
  selectedErrorId: null,
  showIgnored: false,
  uploadProgress: 0,
  uploadError: null,
  
  // Actions
  setDocument: (document, file) => {
    // 清理之前的文件URL
    const state = get();
    if (state.fileUrl) {
      URL.revokeObjectURL(state.fileUrl);
    }
    
    // 创建新的文件URL
    let newFileUrl = null;
    if (file) {
      newFileUrl = URL.createObjectURL(file);
    }
    
    set({ 
      currentDocument: document,
      originalHtml: document.content.html,
      currentFile: file || null,
      fileUrl: newFileUrl,
      uploadProgress: 100,
      uploadError: null 
    });
  },
  
  setDetectionResult: (result) => {
    set({ detectionResult: result });
  },
  
  setHighlightedHtml: (html) => {
    set({ highlightedHtml: html });
  },
  
  setSelectedError: (errorId) => {
    set({ selectedErrorId: errorId });
  },
  
  setShowIgnored: (show) => {
    set({ showIgnored: show });
  },
  
  setProcessing: (processing) => {
    set({ isProcessing: processing });
  },
  
  setUploadProgress: (progress) => {
    set({ uploadProgress: Math.max(0, Math.min(100, progress)) });
  },
  
  setUploadError: (error) => {
    set({ uploadError: error, uploadProgress: 0 });
  },
  
  clearDocument: () => {
    // 清理文件URL
    const state = get();
    if (state.fileUrl) {
      URL.revokeObjectURL(state.fileUrl);
    }
    
    set({
      currentDocument: null,
      originalHtml: '',
      highlightedHtml: '',
      currentFile: null,
      fileUrl: null,
      detectionResult: null,
      selectedErrorId: null,
      uploadProgress: 0,
      uploadError: null,
      isProcessing: false
    });
  }
}));


