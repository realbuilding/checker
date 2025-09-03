import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useDocumentStore } from '../../stores/documentStore';
import { renderAsync } from 'docx-preview';

interface DocumentPreviewProps {
  // 滚动事件现在由父组件处理
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const docxContainerRef = useRef<HTMLDivElement>(null);
  const [isDocxLoaded, setIsDocxLoaded] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  
  const { 
    currentFile,
    fileUrl,
    selectedErrorId,
    detectionResult,
    currentDocument,
    setSelectedError,
    highlightedHtml
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
               (el.textContent || '').trim().length > 0;
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

  // 增强编号显示 - 补充docx-preview可能丢失的Word自动编号
  const enhanceNumberingDisplay = useCallback(() => {
    if (!docxContainerRef.current || !currentDocument) return;
    
    console.log('🔢 开始增强Word自动编号显示...');
    
    try {
      // 查找文档中的编号信息
      const numberingDefinitions = currentDocument?.structure?.numbering;
      if (!numberingDefinitions || numberingDefinitions.length === 0) {
        console.log('📝 未发现Word编号定义');
        return;
      }
      
      console.log(`🔍 发现 ${numberingDefinitions.length} 个编号定义`);
      
      // 查找可能缺失编号的列表项
      const listItems = docxContainerRef.current.querySelectorAll('li, p[style*="margin-left"], p[style*="text-indent"]');
      
      let enhancedCount = 0;
      
      listItems.forEach((item, index) => {
        const element = item as HTMLElement;
        const text = element.textContent?.trim() || '';
        
        // 检查是否缺少编号（没有数字开头但有缩进）
        const hasIndent = element.style.marginLeft || element.style.textIndent || element.tagName === 'LI';
        const hasNumbering = /^\d+[.)、]/.test(text) || /^[a-zA-Z][.)、]/.test(text);
        
        if (hasIndent && !hasNumbering && text.length > 0) {
          // 可能缺失的编号项 - 使用第一个编号定义
          const numberingDef = numberingDefinitions[0];
          if (numberingDef && numberingDef.levels.length > 0) {
            const level = numberingDef.levels[0];
            const numberText = generateNumberText(level, index);
            
            // 在元素前添加编号
            const numberSpan = document.createElement('span');
            numberSpan.className = 'auto-numbering-enhanced';
            numberSpan.textContent = numberText + ' ';
            numberSpan.style.cssText = `
              color: #2563eb;
              font-weight: 600;
              margin-right: 8px;
              border: 1px solid #dbeafe;
              background: #eff6ff;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 0.9em;
            `;
            
            element.insertBefore(numberSpan, element.firstChild);
            enhancedCount++;
            
            // 添加提示标记
            const tipSpan = document.createElement('span');
            tipSpan.className = 'numbering-tip';
            tipSpan.title = 'Word自动编号 - 由系统检测并补充显示';
            tipSpan.textContent = '📝';
            tipSpan.style.cssText = `
              font-size: 12px;
              margin-left: 4px;
              opacity: 0.6;
              cursor: help;
            `;
            
            numberSpan.appendChild(tipSpan);
          }
        }
      });
      
      console.log(`✅ 编号显示增强完成，补充了 ${enhancedCount} 个编号`);
      
    } catch (error) {
      console.error('❌ 编号显示增强失败:', error);
    }
  }, [currentDocument]);

  // 生成编号文本的辅助函数
  const generateNumberText = (level: any, index: number): string => {
    const format = level.format || 'decimal';
    const value = (level.start || 1) + index;
    
    switch (format) {
      case 'decimal':
        return `${value}.`;
      case 'lowerLetter':
        return `${String.fromCharCode(97 + (value - 1) % 26)}.`;
      case 'upperLetter':
        return `${String.fromCharCode(65 + (value - 1) % 26)}.`;
      case 'lowerRoman':
        return `${toRomanNumeral(value).toLowerCase()}.`;
      case 'upperRoman':
        return `${toRomanNumeral(value)}.`;
      case 'chineseNumbers':
        return `${value}、`;
      default:
        return `${value}.`;
    }
  };

  // 转换为罗马数字的辅助函数
  const toRomanNumeral = (num: number): string => {
    const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    const symbols = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
    
    let result = '';
    for (let i = 0; i < values.length; i++) {
      while (num >= values[i]) {
        result += symbols[i];
        num -= values[i];
      }
    }
    return result;
  };

  // 渲染 docx 文档，优先保持Word原始样式
  const renderDocx = useCallback(async () => {
    if (!docxContainerRef.current) return;
    
    try {
      setRenderError(null);
      setIsDocxLoaded(false);
      
      // 优先使用 docx-preview 保持原始样式
      if (!currentFile) return;
      
      console.log('🔄 开始渲染 docx 文档，保持原始样式...');
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
        experimental: true,        // 启用实验性功能，改善编号支持
        trimXmlDeclaration: false, // 保留XML元数据，有助于编号处理
        useBase64URL: false,
        debug: true               // 启用调试模式
      });
      
      // 调整页边距
      const wrapper = docxContainerRef.current.querySelector('.docx-wrapper');
      if (wrapper) {
        (wrapper as HTMLElement).style.padding = '60px 80px 60px 80px';
        (wrapper as HTMLElement).style.maxWidth = 'none';
        (wrapper as HTMLElement).style.margin = '0 auto';
        (wrapper as HTMLElement).style.backgroundColor = '#ffffff';
        (wrapper as HTMLElement).style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.1)';
        (wrapper as HTMLElement).style.borderRadius = '8px';
      }
      
      setIsDocxLoaded(true);
      console.log('✅ docx 文档渲染完成，保持了原始Word样式');
      
      // 添加编号修复和行号
      setTimeout(() => {
        addLineNumbers();
        enhanceNumberingDisplay();  // 新增：增强编号显示
      }, 300);
      
    } catch (error) {
      console.error('❌ docx 渲染失败:', error);
      setRenderError(`文档渲染失败: ${error.message}`);
    }
  }, [currentFile, addLineNumbers, enhanceNumberingDisplay]);

  // 当文件变化时重新渲染
  useEffect(() => {
    if (currentFile) {
      renderDocx();
    } else {
      setIsDocxLoaded(false);
      setRenderError(null);
    }
  }, [currentFile, renderDocx]);

  // 增强的DOM后处理高亮算法
  const highlightErrors = useCallback(() => {
    if (!docxContainerRef.current || !detectionResult) return;
    
    console.log('🎨 开始在Word文档上添加错误高亮...');
    
    // 清除之前的高亮
    const existingHighlights = docxContainerRef.current.querySelectorAll('.error-highlight');
    existingHighlights.forEach(el => {
      const parent = el.parentNode;
      if (parent) {
        // 恢复原始文本内容
        const textContent = el.textContent || '';
        parent.insertBefore(document.createTextNode(textContent), el);
        parent.removeChild(el);
        parent.normalize();
      }
    });
    
    let successCount = 0;
    let failureCount = 0;
    
    // 为每个错误添加高亮
    detectionResult.errors.forEach((error, index) => {
      const highlighted = highlightSingleError(error, index + 1);
      if (highlighted) {
        successCount++;
      } else {
        failureCount++;
      }
    });
    
    console.log(`✅ 高亮处理完成: 成功${successCount}个, 失败${failureCount}个`);
  }, [detectionResult]);

  // 高亮单个错误的核心算法
  const highlightSingleError = (error: any, errorIndex: number): boolean => {
    if (!docxContainerRef.current) return false;
    
    // 策略1: 基于上下文精确匹配
    if (error.context && error.context.trim().length > 0) {
      const result = highlightByContext(error, errorIndex);
      if (result) {
        console.log(`✅ 通过上下文高亮错误 ${errorIndex}: ${error.message}`);
        return true;
      }
    }
    
    // 策略2: 基于位置信息的文本范围高亮  
    if (error.position && error.position.start !== undefined && error.position.end !== undefined) {
      const result = highlightByPosition(error, errorIndex);
      if (result) {
        console.log(`✅ 通过位置信息高亮错误 ${errorIndex}: ${error.message}`);
        return true;
      }
    }
    
    // 策略3: 基于错误类型的启发式匹配
    const result = highlightByHeuristics(error, errorIndex);
    if (result) {
      console.log(`✅ 通过启发式匹配高亮错误 ${errorIndex}: ${error.message}`);
      return true;
    }
    
    console.warn(`⚠️ 无法高亮错误 ${errorIndex}: ${error.message}`);
    return false;
  };

  // 策略1: 基于上下文精确匹配
  const highlightByContext = (error: any, errorIndex: number): boolean => {
    if (!docxContainerRef.current || !error.context) return false;
    
    const container = docxContainerRef.current;
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    const textNodes: Text[] = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node as Text);
    }
    
    // 查找包含上下文的文本节点
    for (const textNode of textNodes) {
      const text = textNode.textContent || '';
      const contextIndex = text.indexOf(error.context);
      
      if (contextIndex >= 0) {
        // 创建范围选择需要高亮的文本
        const range = document.createRange();
        range.setStart(textNode, contextIndex);
        range.setEnd(textNode, contextIndex + error.context.length);
        
        return wrapRangeWithHighlight(range, error, errorIndex);
      }
    }
    
    return false;
  };

  // 策略2: 基于位置信息的文本范围高亮
  const highlightByPosition = (error: any, errorIndex: number): boolean => {
    if (!docxContainerRef.current) return false;
    
    // 获取文档的所有文本内容
    const container = docxContainerRef.current;
    const allText = container.textContent || '';
    
    // 验证位置是否有效
    if (error.position.start >= allText.length || error.position.end > allText.length) {
      console.warn(`⚠️ 位置超出范围: ${error.position.start}-${error.position.end}, 文档长度: ${allText.length}`);
      return false;
    }
    
    // 提取目标文本
    const targetText = allText.substring(error.position.start, error.position.end);
    if (!targetText || targetText.trim().length === 0) {
      console.warn(`⚠️ 目标文本为空: 位置${error.position.start}-${error.position.end}`);
      return false;
    }
    
    console.log(`🔍 尝试高亮位置文本: "${targetText}" 位置: ${error.position.start}-${error.position.end}`);
    
    // 使用文本搜索定位
    const result = findAndHighlightText(targetText, error, errorIndex);
    if (!result) {
      // 如果精确匹配失败，尝试模糊匹配
      return findAndHighlightTextFuzzy(targetText, error, errorIndex);
    }
    return result;
  };

  // 模糊匹配高亮（用于处理特殊字符或格式差异）
  const findAndHighlightTextFuzzy = (searchText: string, error: any, errorIndex: number): boolean => {
    if (!docxContainerRef.current) return false;
    
    // 清理搜索文本（移除特殊字符和多余空格）
    const cleanedSearchText = searchText.replace(/\s+/g, ' ').trim();
    const searchVariants = [
      searchText,
      cleanedSearchText,
      searchText.replace(/\s+/g, ''), // 无空格版本
      searchText.substring(0, Math.min(10, searchText.length)) // 前缀匹配
    ];
    
    console.log(`🔍 模糊匹配尝试变体:`, searchVariants);
    
    for (const variant of searchVariants) {
      if (variant.length < 2) continue; // 跳过过短的文本
      
      if (findAndHighlightText(variant, error, errorIndex)) {
        console.log(`✅ 模糊匹配成功: "${variant}"`);
        return true;
      }
    }
    
    return false;
  };

  // 策略3: 基于错误类型的启发式匹配
  const highlightByHeuristics = (error: any, errorIndex: number): boolean => {
    if (!error.message) return false;
    
    console.log(`🔍 启发式匹配: ${error.category} - ${error.message}`);
    
    // 根据错误类型提取关键模式
    let searchPatterns: string[] = [];
    
    switch (error.category) {
      case 'punctuation':
        // 标点符号错误 - 查找重复标点或错误标点
        if (error.message.includes('重复')) {
          searchPatterns = ['！！', '？？', '。。', '：：', ';;', ',,'];
        } else if (error.message.includes('句号')) {
          searchPatterns = ['.', '。'];
        } else if (error.message.includes('缺少标点')) {
          // 对于缺少标点的错误，查找句子末尾没有标点的文本
          return highlightMissingPunctuation(error, errorIndex);
        }
        break;
        
      case 'spacing':
        // 空格错误 - 查找多余空格或缺少空格
        searchPatterns = ['  ', '   ', '    ']; // 多个连续空格
        // 也尝试找中英文混合没有空格的地方
        if (error.message.includes('中英文') || error.message.includes('mixed')) {
          return highlightMixedLanguageSpacing(error, errorIndex);
        }
        break;
        
      case 'style':
        // 样式错误 - 通过颜色查找
        if (error.message.includes('颜色')) {
          return highlightColorElements(error, errorIndex);
        }
        break;
    }
    
    // 尝试搜索模式
    for (const pattern of searchPatterns) {
      if (findAndHighlightText(pattern, error, errorIndex)) {
        console.log(`✅ 启发式匹配成功: "${pattern}"`);
        return true;
      }
    }
    
    console.log(`❌ 启发式匹配失败`);
    return false;
  };

  // 高亮缺少标点符号的文本
  const highlightMissingPunctuation = (error: any, errorIndex: number): boolean => {
    if (!docxContainerRef.current) return false;
    
    const container = docxContainerRef.current;
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let node;
    while (node = walker.nextNode()) {
      const textNode = node as Text;
      const text = textNode.textContent || '';
      
      // 查找句子末尾没有标点的文本（简单正则匹配）
      const match = text.match(/[^。！？.!?]\s*$/);
      if (match && match.index !== undefined) {
        const range = document.createRange();
        range.setStart(textNode, match.index);
        range.setEnd(textNode, text.length);
        
        return wrapRangeWithHighlight(range, error, errorIndex);
      }
    }
    
    return false;
  };

  // 高亮中英文混合没有空格的文本
  const highlightMixedLanguageSpacing = (error: any, errorIndex: number): boolean => {
    if (!docxContainerRef.current) return false;
    
    const container = docxContainerRef.current;
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let node;
    while (node = walker.nextNode()) {
      const textNode = node as Text;
      const text = textNode.textContent || '';
      
      // 查找中英文直接相连没有空格的地方
      const mixedPattern = /[\u4e00-\u9fff][a-zA-Z]|[a-zA-Z][\u4e00-\u9fff]/g;
      const match = mixedPattern.exec(text);
      
      if (match && match.index !== undefined) {
        const range = document.createRange();
        range.setStart(textNode, match.index);
        range.setEnd(textNode, match.index + match[0].length);
        
        return wrapRangeWithHighlight(range, error, errorIndex);
      }
    }
    
    return false;
  };

  // 查找并高亮文本
  const findAndHighlightText = (searchText: string, error: any, errorIndex: number): boolean => {
    if (!docxContainerRef.current) return false;
    
    const container = docxContainerRef.current;
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let node;
    while (node = walker.nextNode()) {
      const textNode = node as Text;
      const text = textNode.textContent || '';
      const index = text.indexOf(searchText);
      
      if (index >= 0) {
        const range = document.createRange();
        range.setStart(textNode, index);
        range.setEnd(textNode, index + searchText.length);
        
        return wrapRangeWithHighlight(range, error, errorIndex);
      }
    }
    
    return false;
  };

  // 高亮有颜色的元素（针对颜色错误）
  const highlightColorElements = (error: any, errorIndex: number): boolean => {
    if (!docxContainerRef.current) return false;
    
    const colorElements = docxContainerRef.current.querySelectorAll('[style*="color"]');
    
    if (colorElements.length > 0) {
      // 找到第一个有颜色的元素进行高亮
      const element = colorElements[0] as HTMLElement;
      const wrapper = createHighlightWrapper(error, errorIndex);
      
      // 包装整个元素
      element.parentNode?.insertBefore(wrapper, element);
      wrapper.appendChild(element);
      
      // 添加序号标记
      addErrorIndexBadge(wrapper, error, errorIndex);
      
      return true;
    }
    
    return false;
  };

  // 用高亮包装器包装范围
  const wrapRangeWithHighlight = (range: Range, error: any, errorIndex: number): boolean => {
    try {
      const wrapper = createHighlightWrapper(error, errorIndex);
      
      // 提取范围内容
      const contents = range.extractContents();
      wrapper.appendChild(contents);
      
      // 添加序号标记
      addErrorIndexBadge(wrapper, error, errorIndex);
      
      // 插入高亮包装器
      range.insertNode(wrapper);
      
      return true;
    } catch (e) {
      console.error('包装高亮失败:', e);
      return false;
    }
  };

  // 创建高亮包装器
  const createHighlightWrapper = (error: any, errorIndex: number): HTMLSpanElement => {
    const wrapper = document.createElement('span');
    wrapper.className = `error-highlight highlight error-${error.category} severity-${error.severity}`;
    wrapper.setAttribute('data-error-id', error.id);
    wrapper.setAttribute('data-error-index', errorIndex.toString());
    wrapper.setAttribute('title', `${error.message}${error.suggestion ? ' - ' + error.suggestion : ''}`);
    
    return wrapper;
  };

  // 在高亮包装器中添加序号标记
  const addErrorIndexBadge = (wrapper: HTMLSpanElement, error: any, errorIndex: number): void => {
    const indexBadge = document.createElement('span');
    indexBadge.className = `error-index ${error.severity}`;
    indexBadge.textContent = errorIndex.toString();
    wrapper.appendChild(indexBadge);
  };

  // 滚动到指定错误位置
  const scrollToError = useCallback((errorId: string) => {
    if (!containerRef.current || !detectionResult) return;
    
    const error = detectionResult.errors.find(e => e.id === errorId);
    if (!error) {
      console.warn(`⚠️ 未找到错误ID: ${errorId}`);
      return;
    }
    
    console.log(`🎯 开始定位错误: ${error.message}`);
    
    // 查找错误高亮元素
    const targetElement = containerRef.current.querySelector(`[data-error-id="${errorId}"]`) as HTMLElement;
    
    if (targetElement) {
      console.log(`✅ 找到高亮元素，开始滚动定位`);
      
      // 立即添加闪烁效果
      targetElement.classList.add('error-flash');
      
      // 滚动到元素位置
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
      
      // 移除闪烁效果
      setTimeout(() => {
        targetElement.classList.remove('error-flash');
      }, 2000);
      
      console.log(`✅ 已滚动到错误: ${error.message}`);
    } else {
      console.warn(`⚠️ 未找到高亮元素，错误ID: ${errorId}`);
      // 如果找不到高亮元素，尝试根据错误序号查找
      const errorIndex = error.index;
      if (errorIndex) {
        const indexElement = containerRef.current.querySelector(`[data-error-index="${errorIndex}"]`) as HTMLElement;
        if (indexElement) {
          console.log(`✅ 通过序号找到元素，开始滚动`);
          indexElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
          indexElement.classList.add('error-flash');
          setTimeout(() => {
            indexElement.classList.remove('error-flash');
          }, 2000);
        }
      }
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

  // 当检测结果变化时，在已渲染的Word文档上添加错误高亮
  useEffect(() => {
    if (detectionResult && isDocxLoaded) {
      setTimeout(() => {
        highlightErrors();
      }, 100);
    }
  }, [detectionResult, isDocxLoaded, highlightErrors]);

  // 预览侧 -> 选中右侧异常卡片：为高亮元素绑定点击（事件委托）
  useEffect(() => {
    const container = docxContainerRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const highlightEl = target.closest('[data-error-id]') as HTMLElement | null;
      if (!highlightEl) return;

      const errorId = highlightEl.getAttribute('data-error-id');
      if (!errorId) return;

      // 更新右侧选中状态
      setSelectedError(errorId);

      // 左侧添加选中样式（同时移除其他元素的选中样式）
      const all = container.querySelectorAll('[data-error-id]');
      all.forEach((el) => (el as HTMLElement).classList.remove('selected-error'));
      highlightEl.classList.add('selected-error');
    };

    container.addEventListener('click', handleClick as EventListener);
    return () => {
      container.removeEventListener('click', handleClick as EventListener);
    };
  }, [setSelectedError, isDocxLoaded]);

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


