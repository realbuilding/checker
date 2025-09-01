import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useDocumentStore } from '../../stores/documentStore';
import { ErrorCard } from './ErrorCard';
import { DetectionError, ErrorCategory } from '../../types/error';

interface ErrorListProps {
  onScroll?: (scrollTop: number, scrollHeight: number, clientHeight: number) => void;
}

export const ErrorList: React.FC<ErrorListProps> = ({ onScroll }) => {
  const listRef = useRef<HTMLDivElement>(null);
  const {
    detectionResult,
    selectedErrorId,
    showIgnored,
    setSelectedError,
    setShowIgnored
  } = useDocumentStore();

  const [selectedCategory, setSelectedCategory] = useState<ErrorCategory | 'all'>('all');
  const [ignoredErrors, setIgnoredErrors] = useState<Set<string>>(new Set());

  // 过滤和排序错误
  const filteredErrors = useMemo(() => {
    if (!detectionResult) return [];

    let errors = showIgnored 
      ? detectionResult.errors.filter(e => ignoredErrors.has(e.id))
      : detectionResult.errors.filter(e => !ignoredErrors.has(e.id));

    // 按类别过滤
    if (selectedCategory !== 'all') {
      errors = errors.filter(e => e.category === selectedCategory);
    }

    // 按严重性和位置排序
    return errors.sort((a, b) => {
      const severityOrder = { error: 3, warning: 2, info: 1 };
      const severityDiff = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
      if (severityDiff !== 0) return severityDiff;
      return a.position.start - b.position.start;
    });
  }, [detectionResult, showIgnored, selectedCategory, ignoredErrors]);

  // 统计信息
  const stats = useMemo(() => {
    if (!detectionResult) return null;

    const activeErrors = detectionResult.errors.filter(e => !ignoredErrors.has(e.id));
    const byCategory = {
      punctuation: 0,
      spacing: 0,
      style: 0,
      structure: 0
    };

    activeErrors.forEach(error => {
      byCategory[error.category]++;
    });

    return {
      total: activeErrors.length,
      ignored: ignoredErrors.size,
      byCategory
    };
  }, [detectionResult, ignoredErrors]);

  const handleErrorSelect = (errorId: string) => {
    setSelectedError(errorId === selectedErrorId ? null : errorId);
  };

  const handleErrorIgnore = (errorId: string) => {
    setIgnoredErrors(prev => new Set([...prev, errorId]));
    if (selectedErrorId === errorId) {
      setSelectedError(null);
    }
  };

  const handleToggleIgnored = () => {
    setShowIgnored(!showIgnored);
  };

  const handleCategoryFilter = (category: ErrorCategory | 'all') => {
    setSelectedCategory(category);
  };

  // 滚动到选中的错误卡片
  const scrollToSelectedError = () => {
    if (!selectedErrorId || !listRef.current) return;

    const selectedCard = listRef.current.querySelector(`[data-error-id="${selectedErrorId}"]`) as HTMLElement;
    if (selectedCard) {
      selectedCard.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  };

  // 监听选中错误变化，自动滚动到对应卡片
  useEffect(() => {
    if (selectedErrorId) {
      // 使用 setTimeout 确保 DOM 更新完成
      setTimeout(scrollToSelectedError, 100);
    }
  }, [selectedErrorId]);

  if (!detectionResult) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg">等待检测结果</p>
          <p className="text-sm text-gray-400 mt-1">检测问题将在此处显示</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 头部工具栏 */}
      <div className="flex-shrink-0 px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">
            检测结果
          </h3>
          <button
            onClick={handleToggleIgnored}
            className={`text-xs px-2 py-1 rounded ${
              showIgnored
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {showIgnored ? '查看活跃问题' : `已忽略 (${stats?.ignored || 0})`}
          </button>
        </div>

        {/* 统计信息 */}
        {stats && (
          <div className="mb-3">
            <div className="text-sm text-gray-600 mb-2">
              {showIgnored ? '已忽略的问题' : `共发现 ${stats.total} 个问题`}
            </div>
            
            {!showIgnored && (
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => handleCategoryFilter('all')}
                  className={`text-xs px-2 py-1 rounded ${
                    selectedCategory === 'all'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  全部 ({stats.total})
                </button>
                
                {Object.entries(stats.byCategory).map(([category, count]) => {
                  if (count === 0) return null;
                  
                  const categoryNames = {
                    punctuation: '标点',
                    spacing: '空格',
                    style: '样式',
                    structure: '结构'
                  };
                  
                  return (
                    <button
                      key={category}
                      onClick={() => handleCategoryFilter(category as ErrorCategory)}
                      className={`text-xs px-2 py-1 rounded ${
                        selectedCategory === category
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {categoryNames[category]} ({count})
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 错误列表 */}
      <div ref={listRef} className="flex-1 overflow-auto p-4 space-y-3">
        {filteredErrors.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">
              {showIgnored ? '没有被忽略的问题' : '没有找到相关问题'}
            </p>
          </div>
        ) : (
          filteredErrors.map((error) => (
            <div key={error.id} data-error-id={error.id}>
              <ErrorCard
                error={error}
                isSelected={error.id === selectedErrorId}
                onSelect={handleErrorSelect}
                onIgnore={handleErrorIgnore}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};


