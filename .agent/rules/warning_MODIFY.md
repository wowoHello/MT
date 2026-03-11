# 首頁代辦事項連結功能實作計畫

將首頁「今日提醒看板」內的急件警示連結至對應的頁面與頁籤，提升導覽效率。

## Proposed Changes

### 首頁模組

#### [MODIFY] [firstpage.js](file:///d:/jay_liu/Desktop/MT/js/firstpage.js)
- 更新 `remindersDb` 中的 `link` 欄位：
  - 命題階段提醒 -> `cwt-list.html?tab=compose`
  - 互審修題提醒 -> `cwt-list.html?tab=revision`

---

### 命題任務模組

#### [MODIFY] [cwt-list.js](file:///d:/jay_liu/Desktop/MT/js/cwt-list.js)
- 在 `DOMContentLoaded` 事件中加入 URL 參數解析邏輯。
- 若偵測到 `tab` 參數，自動呼叫 [switchTab(tab)](file:///d:/jay_liu/Desktop/MT/js/cwt-list.js#855-869)。

---

### 審題任務模組

#### [MODIFY] [cwt-review.js](file:///d:/jay_liu/Desktop/MT/js/cwt-review.js)
- 比照命題任務，在 `DOMContentLoaded` 事件中加入 URL 參數解析邏輯。
- 若偵測到 `tab` 參數，自動呼叫 [switchTab(tab)](file:///d:/jay_liu/Desktop/MT/js/cwt-list.js#855-869)。

## Verification Plan

### Automated Tests (Manual Steps)
1. 開啟首頁 [firstpage.html](file:///d:/jay_liu/Desktop/MT/firstpage.html)。
2. 點擊「命題階段」急件提醒，確認跳轉至 `cwt-list.html` 且預設選中「命題作業區」。
3. 點擊「互審修題」急件提醒，確認跳轉至 `cwt-list.html` 且預設選中「審修作業區」。
4. 點擊「審題」相關提醒（若有），確認跳轉至 [reviews.html](file:///d:/jay_liu/Desktop/MT/reviews.html)。
