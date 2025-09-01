// Chrome扩展后台脚本
// 处理扩展图标点击事件，打开新标签页

chrome.action.onClicked.addListener((tab) => {
  // 点击扩展图标时打开新标签页
  chrome.tabs.create({
    url: chrome.runtime.getURL('index.html')
  });
});
