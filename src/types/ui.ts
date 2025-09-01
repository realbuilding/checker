// UI相关类型定义

export interface UploadState {
  isUploading: boolean;
  progress: number;
  error?: string;
}

export interface DocumentDisplayState {
  selectedErrorId?: string;
  showIgnored: boolean;
  filterByCategory?: string;
  scrollPosition: number;
}

export interface ErrorCardProps {
  error: DetectionError;
  onIgnore: (errorId: string) => void;
  onSelect: (errorId: string) => void;
  isSelected: boolean;
}

export interface FileUploadProps {
  onFileSelect: (file: File) => void;
  acceptedFormats: string[];
  maxSize?: number;
}

// 重新导入需要的类型
import { DetectionError } from './error';
