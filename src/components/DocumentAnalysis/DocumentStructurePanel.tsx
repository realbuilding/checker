import React, { useState } from 'react';

interface DocumentStructurePanelProps {
  structureTree: any[];
  onNavigateToSection?: (section: any) => void;
}

interface StructureNode {
  id: string;
  title: string;
  level: number;
  numbering?: string;
  children?: StructureNode[];
  position?: {
    start: number;
    end: number;
  };
}

export const DocumentStructurePanel: React.FC<DocumentStructurePanelProps> = ({
  structureTree,
  onNavigateToSection
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const renderStructureNode = (node: StructureNode, depth: number = 0) => {
    const isExpanded = expandedSections.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center py-2 px-3 hover:bg-gray-50 cursor-pointer rounded transition-colors ${
            depth > 0 ? 'ml-4' : ''
          }`}
          onClick={() => {
            if (hasChildren) {
              toggleSection(node.id);
            }
            if (onNavigateToSection) {
              onNavigateToSection(node);
            }
          }}
        >
          <div className="flex items-center flex-1 min-w-0">
            {hasChildren ? (
              isExpanded ? (
                <svg className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )
            ) : (
              <div className="w-4 h-4 mr-2" />
            )}
            
            <div className="flex items-center min-w-0">
              {node.numbering && (
                <span className="text-sm text-gray-500 mr-2 flex-shrink-0">
                  {node.numbering}
                </span>
              )}
              <span 
                className="text-sm text-gray-700 truncate"
                title={node.title}
              >
                {node.title}
              </span>
            </div>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="border-l-2 border-gray-200 ml-2">
            {node.children?.map(child => renderStructureNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!structureTree || structureTree.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <svg
          className="w-12 h-12 mx-auto mb-3 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-sm">暂无文档结构信息</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">文档结构</h3>
        <p className="text-xs text-gray-500 mt-1">
          点击标题可跳转到对应位置
        </p>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {structureTree.map(node => renderStructureNode(node))}
      </div>
      
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500">
          共 {structureTree.length} 个主要章节
        </p>
      </div>
    </div>
  );
};