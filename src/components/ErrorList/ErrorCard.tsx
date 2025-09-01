import React from 'react';
import { DetectionError } from '../../types/error';

interface ErrorCardProps {
  error: DetectionError;
  isSelected: boolean;
  onSelect: (errorId: string) => void;
  onIgnore: (errorId: string) => void;
}

export const ErrorCard: React.FC<ErrorCardProps> = ({
  error,
  isSelected,
  onSelect,
  onIgnore
}) => {
  const getCategoryInfo = (category: string) => {
    const categoryMap = {
      punctuation: { name: '标点符号', color: 'text-red-600 bg-red-50 border-red-200' },
      spacing: { name: '空格使用', color: 'text-purple-600 bg-purple-50 border-purple-200' },
      style: { name: '样式格式', color: 'text-blue-600 bg-blue-50 border-blue-200' },
      structure: { name: '结构层级', color: 'text-green-600 bg-green-50 border-green-200' }
    };
    return categoryMap[category] || { name: category, color: 'text-gray-600 bg-gray-50 border-gray-200' };
  };

  const getSeverityInfo = (severity: string) => {
    const severityMap = {
      error: { name: '错误', icon: '🚨', color: 'text-red-600' },
      warning: { name: '警告', icon: '⚠️', color: 'text-yellow-600' },
      info: { name: '建议', icon: '💡', color: 'text-blue-600' }
    };
    return severityMap[severity] || { name: severity, icon: '•', color: 'text-gray-600' };
  };

  const categoryInfo = getCategoryInfo(error.category);
  const severityInfo = getSeverityInfo(error.severity);

  const handleCardClick = () => {
    onSelect(error.id);
  };

  const handleIgnoreClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发卡片点击
    onIgnore(error.id);
  };

  return (
    <div
      className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-sm'
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={handleCardClick}
    >
      {/* 头部信息 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${categoryInfo.color}`}>
            {categoryInfo.name}
          </span>
          <span className={`text-sm font-medium ${severityInfo.color}`}>
            {severityInfo.icon} {severityInfo.name}
          </span>
        </div>
        <button
          onClick={handleIgnoreClick}
          className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
          title="忽略此问题"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 错误消息 */}
      <div className="mb-3">
        <p className="text-sm font-medium text-gray-800 mb-1">
          {error.message}
        </p>
        {error.suggestion && (
          <p className="text-sm text-gray-600">
            💡 {error.suggestion}
          </p>
        )}
      </div>

      {/* 位置信息 */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          位置: {error.position.start}-{error.position.end}
        </span>
        <span className="flex items-center">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          点击定位
        </span>
      </div>
    </div>
  );
};


