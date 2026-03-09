/**
 * Overview Module
 * 負責命題總覽的狀態過濾、統計卡片、三審進度燈號呈現與試題詳情。
 * Version: 1.0 (DEMO)
 */

// 試題狀態機對應文字 (協助渲染標籤顏色)
const statusMap = {
    'draft': { label: '草稿', color: 'bg-gray-100 text-gray-600', border: 'border-gray-200' },
    'completed': { label: '命題完成', color: 'bg-blue-100 text-blue-700', border: 'border-blue-200' },
    'pending': { label: '待審', color: 'bg-yellow-100 text-yellow-700', border: 'border-yellow-200' },
    'peer_reviewing': { label: '互審中', color: 'bg-blue-100 text-[var(--color-morandi)]', border: 'border-[var(--color-morandi)]/30' },
    'peer_reviewed': { label: '互審完成', color: 'bg-green-100 text-green-700', border: 'border-green-200' },
    'peer_editing': { label: '互審修題', color: 'bg-red-100 text-[var(--color-terracotta)]', border: 'border-[var(--color-terracotta)]/30' },
    'expert_reviewing': { label: '專審中', color: 'bg-blue-100 text-[var(--color-morandi)]', border: 'border-[var(--color-morandi)]/30' },
    'expert_reviewed': { label: '專審完成', color: 'bg-green-100 text-green-700', border: 'border-green-200' },
    'expert_editing': { label: '專審修題', color: 'bg-red-100 text-[var(--color-terracotta)]', border: 'border-[var(--color-terracotta)]/30' },
    'final_reviewing': { label: '總審中', color: 'bg-blue-100 text-[var(--color-morandi)]', border: 'border-[var(--color-morandi)]/30' },
    'final_reviewed': { label: '總審完成', color: 'bg-red-100 text-red-700', border: 'border-red-200' },
    'final_editing': { label: '總審修題', color: 'bg-red-100 text-[var(--color-terracotta)]', border: 'border-[var(--color-terracotta)]/30' },
    'adopted': { label: '採用', color: 'bg-[var(--color-sage)]/20 text-[var(--color-sage)]', border: 'border-[var(--color-sage)]/50' },
    'rejected': { label: '不採用', color: 'bg-gray-200 text-gray-500', border: 'border-gray-300' }
};

const qTypeMap = {
    'single': '一般單選題', 'select': '精選單選題', 'readGroup': '閱讀題組',
    'longText': '長文題目', 'shortGroup': '短文題組', 'listen': '聽力測驗', 'listenGroup': '聽力題組'
};

const diffMap = { 'easy': '易', 'medium': '中', 'hard': '難' };

// 模擬人才庫名稱比對用 (整合自 projects.js)
const teacherMap = {
    'T1001': '劉雅婷', 'T1002': '王健明', 'T1003': '張心怡', 'T1004': '吳家豪',
    'C2001': '李教授', 'C2002': '陳副教授', 'S3001': '林總召', 'S3002': '許編輯'
};

// 產生假資料庫 (針對當前 P2026-01 梯次)
const mockQuestionsDb = [
    // 1. 一般單選題 (single)
    {
        id: 'Q-2602-001', project_id: 'P2026-01', type: 'single', level: '中級', difficulty: 'medium', author_id: 'T1001',
        stage: 6, status: 'adopted', returnCount: 0,
        content: '<p>下列何者是正確的選項？</p><ul class="mt-4 space-y-2 ml-2"><li>(A) 蘋果</li><li>(B) 香蕉</li><li>(C) 橘子</li><li>(D) 西瓜</li></ul><div class="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-100 text-sm"><p class="text-yellow-700 font-bold mb-1"><i class="fa-regular fa-lightbulb mr-1"></i> 解析</p>蘋果含有豐富的維生素C。<strong>標準答案：</strong> (A)</div>',
        history: [
            { time: '2026-08-11 10:00', user: 'T1001', action: '命題完成', comment: '初稿建立完畢' },
            { time: '2026-08-15 14:20', user: 'T1002', action: '互審意見', comment: '無明顯錯誤，誘答選項設計良好。' },
            { time: '2026-08-20 09:15', user: 'C2001', action: '專審意見 (採用)', comment: '題目符合課綱，予以採用進入總審。' },
            { time: '2026-08-25 11:30', user: 'S3001', action: '總召決策 (採用)', comment: '難易適中，本次測驗直接採用。' }
        ]
    },
    {
        id: 'Q-2602-002', project_id: 'P2026-01', type: 'single', level: '初級', difficulty: 'easy', author_id: 'T1002',
        stage: 6, status: 'rejected', returnCount: 0,
        content: '<p>此題已被總召廢棄，因為與歷屆試題重複。</p>',
        history: [
            { time: '2026-08-10 09:00', user: 'T1002', action: '命題完成', comment: '' },
            { time: '2026-08-15 10:00', user: 'T1001', action: '互審意見', comment: '好像跟 113年歷屆考題有重複' },
            { time: '2026-08-20 11:00', user: 'C2001', action: '專審意見 (採用)', comment: '先送總裁定' },
            { time: '2026-08-25 14:00', user: 'S3001', action: '總召決策 (不採用)', comment: '經查重比對發現與 113 年度秋季考題雷同，直接不採用報廢。' }
        ]
    },
    // 2. 精選單選題 (select)
    {
        id: 'Q-2602-003', project_id: 'P2026-01', type: 'select', level: '高級', difficulty: 'hard', author_id: 'T1004',
        stage: 1, status: 'draft', returnCount: 0,
        content: '<p class="text-gray-400 italic">草稿編輯中... (尚未完成命題)</p>',
        history: []
    },
    {
        id: 'Q-2602-004', project_id: 'P2026-01', type: 'select', level: '中高級', difficulty: 'medium', author_id: 'T1003',
        stage: 6, status: 'final_reviewing', returnCount: 0,
        content: '<p>下列成語中，何者用字完全正確？</p><ul class="mt-4 space-y-2 ml-2"><li>(A) 走投無路</li><li>(B) 按步就班</li><li>(C) 破斧沉舟</li><li>(D) 鋌而走險</li></ul>',
        history: [
            { time: '2026-08-05 10:00', user: 'T1003', action: '命題完成', comment: '成語改錯字型' },
            { time: '2026-08-08 11:20', user: 'T1002', action: '互審意見', comment: '選項很有鑑別度，非常棒。' },
            { time: '2026-08-12 14:00', user: 'C2001', action: '專審意見 (採用)', comment: '同意採用。' }
        ]
    },
    // 3. 閱讀題組 (readGroup)
    {
        id: 'Q-2602-005', project_id: 'P2026-01', type: 'readGroup', level: '高級', difficulty: 'hard', author_id: 'T1002',
        stage: 4, status: 'expert_reviewing', returnCount: 0,
        content: `
            <div class="mb-6">
                <span class="inline-block px-2 py-1 bg-orange-50 border border-orange-200 text-orange-600 rounded text-xs font-bold mb-3">閱讀題組</span>
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-5">
                    <p class="text-gray-600 mb-4 whitespace-pre-wrap leading-relaxed">閱讀以下古文節選，回答第1～2題。

「庖丁為文惠君解牛，手之所觸，肩之所倚，足之所履，膝之所踦，砉然響然，奏刀騞然，莫不中音。合於桑林之舞，乃中經首之會。」（《莊子・養生主》）</p>
                </div>
            </div>
            
            <div class="space-y-6">
                <!-- 子題 1 -->
                <div class="border-t border-gray-100 pt-6">
                    <div class="flex items-start gap-4">
                        <div class="bg-blue-500 text-white px-3 py-1 rounded text-sm font-bold flex-shrink-0">第1題</div>
                        <div class="flex-grow">
                            <p class="mb-4 text-gray-800 font-medium">文中「手之所觸，肩之所倚，足之所履，膝之所踦」使用了何種修辭手法？</p>
                            <div class="space-y-3 mb-4">
                                <div class="flex gap-2 text-gray-600"><span>(A)</span> 譬喻</div>
                                <div class="flex gap-2 bg-green-50 border border-green-200 text-green-700 p-2 rounded items-center justify-between font-bold">
                                    <div><span>(B)</span> 排比</div>
                                    <i class="fa-solid fa-circle-check"></i>
                                </div>
                                <div class="flex gap-2 text-gray-600"><span>(C)</span> 轉化</div>
                                <div class="flex gap-2 text-gray-600"><span>(D)</span> 誇飾</div>
                            </div>
                            <div class="p-3 bg-yellow-50 rounded-lg border border-yellow-100 text-sm">
                                <p class="text-yellow-700 font-bold inline-block mr-2"><i class="fa-regular fa-lightbulb"></i> 解析</p>
                                <span class="text-gray-700">「手之所觸，肩之所倚，足之所履，膝之所踦」四個句式結構相同，屬排比修辭。</span>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- 子題 2 -->
                <div class="border-t border-gray-100 pt-6">
                    <div class="flex items-start gap-4">
                        <div class="bg-blue-500 text-white px-3 py-1 rounded text-sm font-bold flex-shrink-0">第2題</div>
                        <div class="flex-grow">
                            <p class="mb-4 text-gray-800 font-medium">「合於桑林之舞，乃中經首之會」意在說明什麼？</p>
                            <div class="space-y-3 mb-4">
                                <div class="flex gap-2 text-gray-600"><span>(A)</span> 庖丁解牛時動作配合音樂節拍</div>
                                <div class="flex gap-2 bg-green-50 border border-green-200 text-green-700 p-2 rounded items-center justify-between font-bold">
                                    <div><span>(B)</span> 庖丁技藝精湛，動作如舞蹈般優美</div>
                                    <i class="fa-solid fa-circle-check"></i>
                                </div>
                                <div class="flex gap-2 text-gray-600"><span>(C)</span> 文惠君觀看庖丁表演舞蹈</div>
                                <div class="flex gap-2 text-gray-600"><span>(D)</span> 庖丁喜歡邊跳舞邊工作</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `,
        history: [
            { time: '2026-08-12 11:00', user: 'T1002', action: '命題完成', comment: '長文閱讀題組初稿' },
            { time: '2026-08-16 16:00', user: 'T1001', action: '互審意見', comment: '第二段語氣不夠通順，建議微調。' },
            { time: '2026-08-18 10:00', user: 'T1002', action: '互審修改完成', comment: '已修飾段落語氣並重新送審。' }
        ]
    },
    {
        id: 'Q-2602-006', project_id: 'P2026-01', type: 'readGroup', level: '中級', difficulty: 'medium', author_id: 'T1001',
        stage: 6, status: 'adopted', returnCount: 0,
        content: `
            <div class="mb-6">
                <span class="inline-block px-2 py-1 bg-orange-50 border border-orange-200 text-orange-600 rounded text-xs font-bold mb-3">閱讀題組</span>
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-5">
                    <p class="text-gray-600 whitespace-pre-wrap leading-relaxed">孟子曰：「魚，我所欲也；熊掌，亦我所欲也。二者不可得兼，舍魚而取熊掌者也...」</p>
                </div>
            </div>
            <div class="space-y-6">
                <div class="border-t border-gray-100 pt-6">
                    <div class="flex items-start gap-4">
                        <div class="bg-blue-500 text-white px-3 py-1 rounded text-sm font-bold flex-shrink-0">第1題</div>
                        <div class="flex-grow">
                            <p class="mb-4 text-gray-800 font-medium">「二者不可得兼」的意思為何？</p>
                            <div class="space-y-3 mb-4">
                                <div class="flex gap-2 bg-green-50 border border-green-200 text-green-700 p-2 rounded items-center justify-between font-bold">
                                    <div><span>(A)</span> 兩樣東西無法同時擁有</div>
                                    <i class="fa-solid fa-circle-check"></i>
                                </div>
                                <div class="flex gap-2 text-gray-600"><span>(B)</span> 兩個人不能在一起</div>
                                <div class="flex gap-2 text-gray-600"><span>(C)</span> 兩種價格都不便宜</div>
                                <div class="flex gap-2 text-gray-600"><span>(D)</span> 兩件事都不能做</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `,
        history: [
            { time: '2026-08-01 09:00', user: 'T1001', action: '命題完成', comment: '古文閱讀' },
            { time: '2026-08-05 14:00', user: 'T1002', action: '互審意見', comment: '經典文章，子題設計精準。' },
            { time: '2026-08-10 10:00', user: 'C2002', action: '專審意見 (採用)', comment: '沒問題，入總審。' },
            { time: '2026-08-15 11:30', user: 'S3001', action: '總召決策 (採用)', comment: '採用。' }
        ]
    },
    // 4. 長文題目 (longText)
    {
        id: 'Q-2602-007', project_id: 'P2026-01', type: 'longText', level: '優級', difficulty: 'hard', author_id: 'T1003',
        stage: 7, status: 'final_editing', returnCount: 3,
        content: `
            <div class="mb-4 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2 font-bold animate-pulse">
                <i class="fa-solid fa-triangle-exclamation"></i> 【總召強制收回編輯處理中】
            </div>
            <p class="font-medium text-lg mb-2">請以「如果時間可以倒流」為題，撰寫一篇至少 600 字的抒情散文。</p>
            <p class="text-gray-600 bg-gray-50 p-4 border border-gray-200 rounded-lg mt-4"><strong>寫作要求：</strong><br>內容必須包含對過去某件具體事件的遺憾，以及在虛擬的時光倒流中，你將如何做出不同的選擇，並反思這樣的選擇對現在或未來的期許。請注重情感的描寫與文字的流暢度。</p>
        `,
        history: [
            { time: '2026-08-01 09:00', user: 'T1003', action: '命題完成', comment: '' },
            { time: '2026-08-05 10:00', user: 'T1004', action: '互審意見', comment: '引導語寫得很棒。' },
            { time: '2026-08-10 14:00', user: 'C2002', action: '專審意見 (採用)', comment: '進入總審' },
            { time: '2026-08-15 09:00', user: 'S3001', action: '總召決策 (改後再審)', comment: '退回第一次：寫作指引不夠明確，請補充評分重點。' },
            { time: '2026-08-18 11:00', user: 'T1003', action: '總審修改完成', comment: '已補充評分標準' },
            { time: '2026-08-20 16:00', user: 'S3001', action: '總召決策 (改後再審)', comment: '退回第二次：字數要求不合理，請調整為 500-600 字之間。' },
            { time: '2026-08-23 10:00', user: 'T1003', action: '總審修改完成', comment: '已上調字數' },
            { time: '2026-08-26 15:00', user: 'S3001', action: '總召決策 (改後再審)', comment: '【觸發三次退回底線】方向依然不對，由總召強制收回權限自行修改！' }
        ]
    },
    {
        id: 'Q-2602-008', project_id: 'P2026-01', type: 'longText', level: '中高級', difficulty: 'medium', author_id: 'T1004',
        stage: 3, status: 'peer_editing', returnCount: 0,
        content: '<p class="font-medium text-lg">請撰寫一篇關於「校園欺凌」的論說文，字數不少於 500 字。</p>',
        history: [
            { time: '2026-08-28 09:00', user: 'T1004', action: '命題完成', comment: '論說文題目' },
            { time: '2026-08-30 14:00', user: 'T1001', action: '互審意見', comment: '題目略顯生硬，建議提供一則新聞情境來引導學生。' }
        ]
    },
    // 5. 短文題組 (shortGroup)
    {
        id: 'Q-2602-009', project_id: 'P2026-01', type: 'shortGroup', level: '初級', difficulty: 'easy', author_id: 'T1001',
        stage: 1, status: 'completed', returnCount: 0,
        content: `
            <div class="mb-6">
                <span class="inline-block px-2 py-1 bg-green-50 border border-green-200 text-green-600 rounded text-xs font-bold mb-3">短文題組</span>
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-5">
                    <p class="text-gray-600 mb-4 whitespace-pre-wrap leading-relaxed">閱讀下面短文，回答第 1~2 題。

「一個人的價值不在於他擁有什麼，而在於他貢獻了什麼。真正有意義的人生，是不斷為他人創造價值的過程。」</p>
                </div>
            </div>
            <div class="space-y-6">
                <div class="border-t border-gray-100 pt-6">
                    <div class="flex items-start gap-4">
                        <div class="bg-blue-500 text-white px-3 py-1 rounded text-sm font-bold flex-shrink-0">第1題</div>
                        <div class="flex-grow">
                            <p class="mb-4 text-gray-800 font-medium">作者認為衡量一個人價值的標準是什麼？請根據短文內容加以說明。</p>
                            <div class="mb-4 px-3 py-2 bg-gray-50 border border-gray-200 border-dashed rounded text-gray-500 text-sm flex items-center gap-2 w-max">
                                <i class="fa-solid fa-pen-to-square"></i> 論述題 (自由作答)
                            </div>
                            <div class="p-3 bg-yellow-50 rounded-lg border border-yellow-100 text-sm">
                                <p class="text-yellow-700 font-bold inline-block mr-2"><i class="fa-regular fa-lightbulb"></i> 解析</p>
                                <span class="text-gray-700">作者認為一個人的價值取決於「貢獻了什麼」，而非「擁有什麼」，強調付出與創造價值的重要性。</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="border-t border-gray-100 pt-6">
                    <div class="flex items-start gap-4">
                        <div class="bg-blue-500 text-white px-3 py-1 rounded text-sm font-bold flex-shrink-0">第2題</div>
                        <div class="flex-grow">
                            <p class="mb-4 text-gray-800 font-medium">你同意作者的觀點嗎？請舉出一個生活實例，說明你的看法。</p>
                            <div class="mb-4 px-3 py-2 bg-gray-50 border border-gray-200 border-dashed rounded text-gray-500 text-sm flex items-center gap-2 w-max">
                                <i class="fa-solid fa-pen-to-square"></i> 論述題 (自由作答)
                            </div>
                            <div class="p-3 bg-yellow-50 rounded-lg border border-yellow-100 text-sm">
                                <p class="text-yellow-700 font-bold inline-block mr-2"><i class="fa-regular fa-lightbulb"></i> 解析</p>
                                <span class="text-gray-700">此為開放式題目，重點考核學生能否結合自身經驗闡述對「價值」的理解與反思能力。</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `,
        history: [
            { time: '2026-09-01 10:00', user: 'T1001', action: '命題完成', comment: '基礎生活情境題' }
        ]
    },
    {
        id: 'Q-2602-010', project_id: 'P2026-01', type: 'shortGroup', level: '中級', difficulty: 'medium', author_id: 'T1002',
        stage: 5, status: 'expert_reviewed', returnCount: 0,
        content: '<p>閱讀這首現代詩：</p><p>白雲飄過山頭，像是一抹散不去的哀愁...</p>',
        history: [
            { time: '2026-08-20 09:00', user: 'T1002', action: '命題完成', comment: '新詩賞析' },
            { time: '2026-08-25 10:00', user: 'T1003', action: '互審意見', comment: '意境很美，子題選項合理。' },
            { time: '2026-09-02 11:00', user: 'C2001', action: '專審意見 (採用)', comment: '同意採用。' }
        ]
    },
    // 6. 聽力測驗 (listen)
    {
        id: 'Q-2602-011', project_id: 'P2026-01', type: 'listen', level: '難度三', difficulty: 'medium', author_id: 'T1003',
        stage: 5, status: 'expert_editing', returnCount: 0,
        content: `
            <div class="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100 flex items-center gap-4">
                <div class="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xl shadow-sm">
                    <i class="fa-solid fa-volume-high"></i>
                </div>
                <div class="flex-grow">
                    <div class="text-sm font-bold text-blue-800 mb-2">請聆聽音檔</div>
                    <audio controls class="w-full h-10 outline-none">
                        <!-- 這是展示用的空 source，實際開發會放置正確音檔連結 -->
                        <source src="#" type="audio/mpeg">
                        您的瀏覽器不支援 audio 元素。
                    </audio>
                </div>
            </div>
            <p class="font-medium text-gray-800 mb-4">請問講者在對話中主要想表達什麼？</p>
            <ul class="space-y-2 ml-2">
                <li>(A) 工作進度落後</li>
                <li>(B) 需要增加預算</li>
                <li class="bg-green-50 border border-green-200 text-green-700 p-2 rounded font-bold flex justify-between items-center">(C) 團隊溝通出問題 <i class="fa-solid fa-circle-check"></i></li>
                <li>(D) 客戶反應不佳</li>
            </ul>
        `,
        history: [
            { time: '2026-08-10 09:00', user: 'T1003', action: '命題完成', comment: '' },
            { time: '2026-08-14 13:00', user: 'T1004', action: '互審意見', comment: '音檔還算清晰，題目可接受。' },
            { time: '2026-08-22 15:00', user: 'C2002', action: '專審意見 (改後再審)', comment: '錄音有背景雜音，選項 C 與 D 過於相似，請微調。' }
        ]
    },
    {
        id: 'Q-2602-012', project_id: 'P2026-01', type: 'listen', level: '難度一', difficulty: 'easy', author_id: 'T1004',
        stage: 6, status: 'adopted', returnCount: 0,
        content: `
            <div class="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100 flex items-center gap-4">
                <div class="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xl shadow-sm">
                    <i class="fa-solid fa-volume-high"></i>
                </div>
                <div class="flex-grow">
                    <div class="text-sm font-bold text-blue-800 mb-2">對話音檔</div>
                    <audio controls class="w-full h-10 outline-none">
                        <source src="#" type="audio/mpeg">
                    </audio>
                </div>
            </div>
            <p class="font-medium text-gray-800 mb-4">對話中的男生即將去哪裡？</p>
            <ul class="space-y-2 ml-2">
                <li class="bg-green-50 border border-green-200 text-green-700 p-2 rounded font-bold flex justify-between items-center">(A) 圖書館 <i class="fa-solid fa-circle-check"></i></li>
                <li>(B) 游泳池</li>
                <li>(C) 超市</li>
                <li>(D) 學校</li>
            </ul>
        `,
        history: [
            { time: '2026-08-01 09:00', user: 'T1004', action: '命題完成', comment: '簡易情境聽力' },
            { time: '2026-08-05 14:00', user: 'T1003', action: '互審意見', comment: '沒問題，音檔很清楚。' },
            { time: '2026-08-10 10:00', user: 'C2001', action: '專審意見 (採用)', comment: '入總審' },
            { time: '2026-08-15 11:30', user: 'S3001', action: '總召決策 (採用)', comment: '採用' }
        ]
    },
    // 7. 聽力題組 (listenGroup)
    {
        id: 'Q-2602-013', project_id: 'P2026-01', type: 'listenGroup', level: '難度四', difficulty: 'hard', author_id: 'T1001',
        stage: 2, status: 'peer_reviewing', returnCount: 0,
        content: `
            <div class="mb-6">
                <span class="inline-block px-2 py-1 bg-pink-50 border border-pink-200 text-pink-600 rounded text-xs font-bold mb-3">聽力題組</span>
                <div class="bg-blue-500 rounded-lg p-4 flex items-center gap-4 text-white shadow-sm mb-4">
                    <i class="fa-solid fa-volume-high text-2xl"></i>
                    <div class="flex-grow">
                        <div class="text-sm font-bold mb-2">請聆聽音檔</div>
                        <audio controls class="w-full h-10 outline-none custom-audio-player">
                            <source src="#" type="audio/mpeg">
                        </audio>
                    </div>
                </div>
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-5">
                    <p class="text-gray-700 font-medium">【聽力題組】請先聽一段對話後，回答以下兩道子題。</p>
                </div>
            </div>
            <div class="space-y-6">
                <div class="border-t border-gray-100 pt-6">
                    <div class="flex items-start gap-4">
                        <div class="bg-blue-500 text-white px-3 py-1 rounded text-sm font-bold flex-shrink-0">第1題</div>
                        <div class="flex-grow">
                            <p class="mb-4 text-gray-800 font-medium">根據對話內容，說話者最可能在什麼場合？</p>
                            <div class="space-y-3 mb-4">
                                <div class="flex gap-2 text-gray-600"><span>(A)</span> 學校教室</div>
                                <div class="flex gap-2 text-gray-600"><span>(B)</span> 醫院診間</div>
                                <div class="flex gap-2 bg-green-50 border border-green-200 text-green-700 p-2 rounded items-center justify-between font-bold">
                                    <div><span>(C)</span> 辦公室會議室</div>
                                    <i class="fa-solid fa-circle-check"></i>
                                </div>
                                <div class="flex gap-2 text-gray-600"><span>(D)</span> 百貨公司櫃台</div>
                            </div>
                            <div class="p-3 bg-yellow-50 rounded-lg border border-yellow-100 text-sm">
                                <p class="text-yellow-700 font-bold inline-block mr-2"><i class="fa-regular fa-lightbulb"></i> 解析</p>
                                <span class="text-gray-700">對話中提及「報告」、「進度」、「下週一前」等關鍵詞，可推斷為職場情境。</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="border-t border-gray-100 pt-6">
                    <div class="flex items-start gap-4">
                        <div class="bg-blue-500 text-white px-3 py-1 rounded text-sm font-bold flex-shrink-0">第2題</div>
                        <div class="flex-grow">
                            <p class="mb-4 text-gray-800 font-medium">對話中的女性最後表達了什麼態度？</p>
                            <div class="space-y-3 mb-4">
                                <div class="flex gap-2 text-gray-600"><span>(A)</span> 強烈不滿</div>
                                <div class="flex gap-2 text-gray-600"><span>(B)</span> 欣然接受</div>
                                <div class="flex gap-2 text-gray-600"><span>(C)</span> 委婉拒絕</div>
                                <div class="flex gap-2 bg-green-50 border border-green-200 text-green-700 p-2 rounded items-center justify-between font-bold">
                                    <div><span>(D)</span> 勉強同意</div>
                                    <i class="fa-solid fa-circle-check"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>
            /* 針對在深色背景上的原生 audio 進行簡易顏色覆蓋體驗優化 */
            .custom-audio-player::-webkit-media-controls-enclosure {
                background-color: rgba(255,255,255,0.9);
            }
            </style>
        `,
        history: [
            { time: '2026-09-08 17:00', user: 'T1001', action: '命題完成', comment: '包含三個子題的廣播聽力' }
        ]
    },
    {
        id: 'Q-2602-014', project_id: 'P2026-01', type: 'listenGroup', level: '難度二', difficulty: 'medium', author_id: 'T1002',
        stage: 6, status: 'adopted', returnCount: 0,
        content: `
            <div class="mb-6">
                <span class="inline-block px-2 py-1 bg-pink-50 border border-pink-200 text-pink-600 rounded text-xs font-bold mb-3">聽力題組</span>
                <div class="bg-blue-500 rounded-lg p-4 flex items-center gap-4 text-white shadow-sm mb-4">
                    <i class="fa-solid fa-volume-high text-2xl"></i>
                    <div class="flex-grow">
                        <div class="text-sm font-bold mb-2">請聆聽這段電話留言：</div>
                        <audio controls class="w-full h-10 outline-none custom-audio-player">
                            <source src="#" type="audio/mpeg">
                        </audio>
                    </div>
                </div>
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-5">
                    <p class="text-gray-700 font-medium">【聽力題組】請聆聽這段兩位朋友的電話留言，判斷並回答子題 1~2。</p>
                </div>
            </div>
            <div class="space-y-6">
                <div class="border-t border-gray-100 pt-6">
                    <div class="flex items-start gap-4">
                        <div class="bg-blue-500 text-white px-3 py-1 rounded text-sm font-bold flex-shrink-0">第1題</div>
                        <div class="flex-grow">
                            <p class="mb-4 text-gray-800 font-medium">留言的人希望何時見面？</p>
                            <div class="space-y-3 mb-4">
                                <div class="flex gap-2 text-gray-600"><span>(A)</span> 今天晚上</div>
                                <div class="flex gap-2 bg-green-50 border border-green-200 text-green-700 p-2 rounded items-center justify-between font-bold">
                                    <div><span>(B)</span> 明天中午</div>
                                    <i class="fa-solid fa-circle-check"></i>
                                </div>
                                <div class="flex gap-2 text-gray-600"><span>(C)</span> 週末下午</div>
                                <div class="flex gap-2 text-gray-600"><span>(D)</span> 下週三</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="border-t border-gray-100 pt-6">
                    <div class="flex items-start gap-4">
                        <div class="bg-blue-500 text-white px-3 py-1 rounded text-sm font-bold flex-shrink-0">第2題</div>
                        <div class="flex-grow">
                            <p class="mb-4 text-gray-800 font-medium">他們最後決定去哪間餐廳？</p>
                            <div class="space-y-3 mb-4">
                                <div class="flex gap-2 text-gray-600"><span>(A)</span> 新開的義大利麵館</div>
                                <div class="flex gap-2 text-gray-600"><span>(B)</span> 公司樓下的便當店</div>
                                <div class="flex gap-2 text-gray-600"><span>(C)</span> 轉角的咖啡廳</div>
                                <div class="flex gap-2 bg-green-50 border border-green-200 text-green-700 p-2 rounded items-center justify-between font-bold">
                                    <div><span>(D)</span> 站前的日式料理</div>
                                    <i class="fa-solid fa-circle-check"></i>
                                </div>
                            </div>
                            <div class="p-3 bg-yellow-50 rounded-lg border border-yellow-100 text-sm">
                                <p class="text-yellow-700 font-bold inline-block mr-2"><i class="fa-regular fa-lightbulb"></i> 解析</p>
                                <span class="text-gray-700">留言末段提及「想吃生魚片，我們就去車站前面那家吧」，故選日式料理。</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>
            /* 針對在深色背景上的原生 audio 進行簡易顏色覆蓋體驗優化 */
            .custom-audio-player::-webkit-media-controls-enclosure {
                background-color: rgba(255,255,255,0.9);
            }
            </style>
        `,
        history: [
            { time: '2026-08-05 09:00', user: 'T1002', action: '命題完成', comment: '生活情話' },
            { time: '2026-08-09 14:00', user: 'T1004', action: '互審意見', comment: '留言內容很真實' },
            { time: '2026-08-12 10:00', user: 'C2002', action: '專審意見 (採用)', comment: '入總審' },
            { time: '2026-08-16 11:30', user: 'S3001', action: '總召決策 (採用)', comment: '直接採用' }
        ]
    }
];

let currentProjId = 'P2026-01'; // default fallback

document.addEventListener('DOMContentLoaded', () => {
    // Determine current project
    const pId = localStorage.getItem('cwt_current_project');
    if (pId) currentProjId = pId;

    // Export Button
    const btnExport = document.getElementById('exportCsvBtn');
    if (btnExport) btnExport.addEventListener('click', exportToCsv);

    // Listen to Project Switcher
    document.addEventListener('projectChanged', (e) => {
        currentProjId = e.detail.id;
        renderOverviewList();
    });

    // Bind filters
    document.getElementById('filterKeyword').addEventListener('input', renderOverviewList);
    document.getElementById('filterType').addEventListener('change', handleTypeChange);
    document.getElementById('filterLevel').addEventListener('change', renderOverviewList);
    document.getElementById('filterStatus').addEventListener('change', renderOverviewList);

    // Initial Render
    renderOverviewList();

    // Setup slide over closing via backdrop
    document.getElementById('slideOverBackdrop').addEventListener('click', closePanel);
});

// 當題型改變時，連動切換適用的等級選項
function handleTypeChange() {
    const fType = document.getElementById('filterType').value;
    const fLevelSel = document.getElementById('filterLevel');
    const optNormal = fLevelSel.querySelectorAll('.opt-normal');
    const optListen = fLevelSel.querySelectorAll('.opt-listen');

    const isListenType = fType === 'listen' || fType === 'listenGroup';

    if (fType === 'all') {
        // 若為所有題型，全開
        optNormal.forEach(el => el.classList.remove('hidden'));
        optListen.forEach(el => el.classList.remove('hidden'));
    } else if (isListenType) {
        // 聽力題型：隱藏一般，顯示難度
        optNormal.forEach(el => el.classList.add('hidden'));
        optListen.forEach(el => el.classList.remove('hidden'));

        // 防呆：若目前選中一般等級，重置為 all
        if (fLevelSel.options[fLevelSel.selectedIndex].classList.contains('opt-normal')) {
            fLevelSel.value = 'all';
        }
    } else {
        // 非聽力題型：顯示一般，隱藏難度
        optNormal.forEach(el => el.classList.remove('hidden'));
        optListen.forEach(el => el.classList.add('hidden'));

        // 防呆：若目前選中聽力等級，重置為 all
        if (fLevelSel.options[fLevelSel.selectedIndex].classList.contains('opt-listen')) {
            fLevelSel.value = 'all';
        }
    }

    // 觸發重新渲染
    renderOverviewList();
}

function renderOverviewList() {
    const listContainer = document.getElementById('overviewListContainer');
    const kw = document.getElementById('filterKeyword').value.toLowerCase();
    const fType = document.getElementById('filterType').value;
    const fLevel = document.getElementById('filterLevel').value;
    const fStatus = document.getElementById('filterStatus').value;

    let filtered = mockQuestionsDb.filter(q => q.project_id === currentProjId);

    // Stats variables
    let stTotal = filtered.length;
    let stDraft = 0, stAdopted = 0, stEditing = 0, stPending = 0, stPeer = 0, stExpert = 0;

    // Filter Logic & Stats Acc
    const finalList = [];
    filtered.forEach(q => {
        const authorName = teacherMap[q.author_id] || q.author_id;
        let matchKw = q.id.toLowerCase().includes(kw) || authorName.toLowerCase().includes(kw);
        let matchType = fType === 'all' || q.type === fType;

        // Detailed Stats
        if (q.status === 'draft' || q.status === 'completed') stDraft++;
        if (q.status === 'adopted') stAdopted++;
        if (['peer_editing', 'expert_editing', 'final_editing'].includes(q.status)) stEditing++;
        if (['pending'].includes(q.status) && q.stage !== 6) stPending++; // avoid double counting if adopted mapped wrong
        if (q.status === 'peer_reviewing') stPeer++;
        if (q.status === 'expert_reviewing') stExpert++;

        let matchStatus = true;
        if (fStatus === 'working') {
            matchStatus = ['draft', 'completed', 'peer_reviewing', 'expert_reviewing', 'final_reviewing'].includes(q.status);
        } else if (fStatus === 'editing') {
            matchStatus = ['peer_editing', 'expert_editing', 'final_editing'].includes(q.status);
        } else if (fStatus === 'adopted') {
            matchStatus = q.status === 'adopted';
        } else if (fStatus === 'rejected') {
            matchStatus = q.status === 'rejected';
        }

        if (matchKw && matchType && matchStatus) {
            // Level Filtering
            let matchLevel = fLevel === 'all' || q.level === fLevel;

            if (matchLevel) {
                finalList.push(q);
            }
        }
    });

    // Update Stats DOM
    document.getElementById('statTotal').innerText = stTotal;
    document.getElementById('statDraft').innerText = stDraft;
    document.getElementById('statAdopted').innerText = stAdopted;
    document.getElementById('statEditing').innerText = stEditing;
    document.getElementById('statPending').innerText = stPending;
    document.getElementById('statPeerReviewing').innerText = stPeer;
    document.getElementById('statExpertReviewing').innerText = stExpert;
    document.getElementById('listCount').innerText = finalList.length;

    if (finalList.length === 0) {
        listContainer.innerHTML = '<div class="p-10 text-center text-gray-400 font-medium">該梯次目前無相符的試題。</div>';
        return;
    }

    let html = '';
    finalList.forEach(q => {
        const author = teacherMap[q.author_id] || q.author_id;
        const sMeta = statusMap[q.status] || { label: q.status, color: 'bg-gray-100 text-gray-500' };

        // 渲染 7 階段燈號
        const stepperHtml = renderProgressStepper(q);

        // 特殊處理第3次退回警告
        let warningBadge = '';
        if (q.returnCount >= 3) {
            warningBadge = `<span class="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded font-bold ml-2 animate-pulse" title="觸發退回底線，總召強制收回"><i class="fa-solid fa-triangle-exclamation"></i> 強制</span`;
        }

        html += `
            <div class="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-100 hover:bg-blue-50/50 hover:shadow-[inset_4px_0_0_var(--color-morandi)] transition-all items-center cursor-pointer group" onclick="openPanel('${q.id}')">
                <div class="col-span-12 lg:col-span-2 flex flex-col">
                    <span class="font-bold text-[var(--color-slate-main)] text-sm group-hover:text-[var(--color-morandi)] transition-colors">${q.id}</span>
                    <span class="text-xs text-gray-500 mt-0.5"><i class="fa-solid fa-user text-[var(--color-sage)] mr-1"></i>${author} ${warningBadge}</span>
                </div>
                <div class="col-span-12 lg:col-span-1">
                    <span class="inline-block px-2 py-1 bg-gray-100 text-gray-600 rounded text-[11px] font-bold border border-gray-200">${qTypeMap[q.type]}</span>
                </div>
                <div class="col-span-12 lg:col-span-1 flex flex-col items-start gap-1">
                    <span class="inline-block px-1.5 py-0.5 bg-blue-50 text-[var(--color-morandi)] rounded text-[10px] font-bold border border-blue-100">${q.level}</span>
                    <span class="inline-block px-1.5 py-0.5 bg-orange-50 text-[var(--color-terracotta)] rounded text-[10px] font-bold border border-orange-100">${diffMap[q.difficulty]}</span>
                </div>
                <div class="col-span-12 lg:col-span-7 overflow-hidden">
                    ${stepperHtml}
                </div>
                <div class="col-span-12 lg:col-span-1 text-center">
                    <span class="${sMeta.color} ${sMeta.border} border px-2 py-1 text-[11px] font-bold rounded shadow-sm whitespace-nowrap">${sMeta.label}</span>
                </div>
            </div>
        `;
    });

    listContainer.innerHTML = html;
}

/**
 * 渲染 7 階段燈號 SVG
 * 階段: 1命題 2互審 3互修 4專審 5專修 6總審 7總修
 */
function renderProgressStepper(q) {
    const steps = ['命題', '互審', '互修', '專審', '專修', '總審', '總修'];

    // 計算每盞燈的狀態 (green=通過, blue=進行中, red=卡關/退回修題, gray=未到)
    const getLightStatus = (stepIdx, qStage, qStatus) => {
        // 特別處理：如果已被採用入庫，全部轉綠
        if (qStatus === 'adopted') return 'green';
        // 如果被不採用，停留在那關變紅，後面全灰
        if (qStatus === 'rejected') {
            return stepIdx < qStage ? 'green' : (stepIdx === qStage ? 'red' : 'gray');
        }

        if (stepIdx < qStage) return 'green';
        if (stepIdx > qStage) return 'gray';

        // 當前階段 stepIdx === qStage
        if (['draft', 'completed', 'peer_reviewing', 'expert_reviewing', 'final_reviewing'].includes(qStatus)) {
            return 'blue'; // 一般執行中
        }
        if (['peer_editing', 'expert_editing', 'final_editing'].includes(qStatus)) {
            return 'red'; // 修題中 (注意)
        }
        if (['pending', 'peer_reviewed', 'expert_reviewed', 'final_reviewed'].includes(qStatus)) {
            return 'green'; // 剛完成，等待下一個 stage 接手 (過渡狀態)
        }
        return 'gray';
    };

    let sHtml = '<div class="flex items-center justify-between relative w-full px-2 max-w-[400px] mx-auto">';

    // 繪製連線底層
    sHtml += '<div class="absolute top-1/2 left-4 right-4 h-0.5 bg-gray-200 -translate-y-1/2 z-0"></div>';

    // 繪製 7 顆燈泡
    steps.forEach((lbl, idx) => {
        let st = getLightStatus(idx + 1, q.stage, q.status);

        // Style variables
        let bg = 'bg-gray-100', border = 'border-gray-300', icon = '', text = 'text-gray-400', anim = '';

        if (st === 'green') {
            bg = 'bg-[var(--color-sage)]'; border = 'border-[var(--color-sage)]'; text = 'text-white';
            icon = '<i class="fa-solid fa-check text-[10px]"></i>';
        } else if (st === 'blue') {
            bg = 'bg-[var(--color-morandi)]'; border = 'border-[var(--color-morandi)]'; text = 'text-white';
            anim = 'animate-pulse-blue rounded-full shadow-lg';
            icon = '<i class="fa-solid fa-spinner fa-spin text-[10px]"></i>';
        } else if (st === 'red') {
            bg = 'bg-[var(--color-terracotta)]'; border = 'border-[var(--color-terracotta)]'; text = 'text-white';
            anim = 'animate-pulse-red rounded-full shadow-lg';
            icon = '<i class="fa-solid fa-pen text-[10px]"></i>';
        }

        if (q.status === 'rejected' && idx + 1 === q.stage) {
            icon = '<i class="fa-solid fa-xmark text-[10px]"></i>'; // 報廢打叉
        }

        // 當前節點點亮下方的連線
        let lineActive = st === 'green' ? 'w-full' : (st !== 'gray' ? 'w-1/2' : 'w-0');
        let lineDiv = idx < 6 ? `<div class="absolute top-1/2 left-full h-0.5 bg-[var(--color-sage)] transition-all z-10 -translate-y-1/2" style="width: calc(100% * flex-grow); ${lineActive !== 'w-0' ? 'width: ' + (st === 'green' ? '100%' : '50%') : 'display:none;'}"></div>` : '';

        sHtml += `
            <div class="flex flex-col items-center relative z-10" title="${lbl}">
                <div class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${bg} ${border} ${text} ${anim} text-xs">
                    ${icon || (idx + 1)}
                </div>
                <div class="text-[9px] mt-1 font-bold ${st !== 'gray' ? 'text-gray-700' : 'text-gray-400'}">${lbl}</div>
                <!--${lineDiv}-->
            </div>
        `;
    });
    sHtml += '</div>';
    return sHtml;
}

// ----------------------------------------
// Slide-over 詳細面版控制
// ----------------------------------------

function openPanel(id) {
    const q = mockQuestionsDb.find(x => x.id === id);
    if (!q) return;

    // 填入基本資料
    document.getElementById('dtlQid').innerText = q.id;
    document.getElementById('dtlAuthor').innerText = teacherMap[q.author_id] || q.author_id;
    document.getElementById('dtlType').innerText = qTypeMap[q.type];
    document.getElementById('dtlLevel').innerText = q.level;
    document.getElementById('dtlDiff').innerText = diffMap[q.difficulty];
    document.getElementById('dtlContent').innerHTML = q.content;

    // 狀態 Badge
    const sMeta = statusMap[q.status];
    const badge = document.getElementById('dtlStatusBadge');
    badge.className = `text-xs px-2 py-0.5 rounded-full font-bold border ${sMeta.color} ${sMeta.border}`;
    badge.innerText = sMeta.label;

    // 退回警告標籤
    const warnBadge = document.getElementById('dtlWarningBadge');
    if (q.returnCount >= 3) {
        warnBadge.classList.remove('hidden');
    } else {
        warnBadge.classList.add('hidden');
    }

    // 渲染歷史軌跡 (倒敘)
    const timelineContainer = document.getElementById('dtlTimelineLogs');
    if (q.history.length === 0) {
        timelineContainer.innerHTML = '<div class="text-sm text-gray-400 py-4">尚無任何歷史軌跡。</div>';
    } else {
        let tHtml = '';
        [...q.history].reverse().forEach((log, i) => {
            const isLatest = i === 0;
            const userIcon = log.user.startsWith('C') ? 'fa-user-tie text-[var(--color-morandi)]' : (log.user.startsWith('S') ? 'fa-user-shield text-[var(--color-terracotta)]' : 'fa-user text-[var(--color-sage)]');

            // 判斷決策給予特殊顏色標籤
            let actionBadgeColor = 'bg-white border-gray-200 text-gray-500';
            let actionIcon = '';

            if (log.action.includes('採用') && !log.action.includes('不採用')) {
                actionBadgeColor = 'bg-green-50 border-green-200 text-green-700 font-bold';
                actionIcon = '<i class="fa-solid fa-circle-check text-green-600 mr-1"></i>';
            } else if (log.action.includes('不採用')) {
                actionBadgeColor = 'bg-gray-100 border-gray-300 text-gray-700 font-bold';
                actionIcon = '<i class="fa-solid fa-ban text-gray-500 mr-1"></i>';
            } else if (log.action.includes('改後再審') || log.action.includes('退回')) {
                actionBadgeColor = 'bg-orange-50 border-orange-200 text-orange-700 font-bold';
                actionIcon = '<i class="fa-solid fa-rotate-left text-orange-600 mr-1"></i>';
            }

            tHtml += `
                <div class="relative">
                    <div class="absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white ${isLatest ? 'bg-[var(--color-morandi)] shadow-sm' : 'bg-gray-300'} z-10 flex items-center justify-center"></div>
                    <div class="bg-gray-50 rounded-lg p-3 border border-gray-100 ${isLatest ? 'shadow-sm border-[var(--color-morandi)]/30' : ''}">
                        <div class="flex justify-between items-start mb-1">
                            <div class="text-xs font-bold text-gray-700 flex items-center gap-1">
                                <i class="fa-solid gap-1 ${userIcon}"></i>
                                ${teacherMap[log.user] || log.user}
                                <span class="border px-1.5 py-0.5 rounded text-[10px] ml-1 shadow-sm ${actionBadgeColor}">${actionIcon}${log.action}</span>
                            </div>
                            <div class="text-[10px] text-gray-400 font-mono">${log.time}</div>
                        </div>
                        ${log.comment ? `<div class="mt-2 text-sm text-gray-800 bg-white p-2 rounded border border-gray-100 italic">" ${log.comment} "</div>` : ''}
                    </div>
                </div>
            `;
        });
        timelineContainer.innerHTML = tHtml;
    }

    // 動畫開展
    document.getElementById('slideOverWrapper').classList.remove('hidden');
    // slight delay to allow display block to apply before transition
    setTimeout(() => {
        document.getElementById('slideOverBackdrop').classList.remove('opacity-0');
        document.getElementById('slideOverBackdrop').classList.add('opacity-100');
        document.getElementById('slideOverPanel').classList.remove('translate-x-full');
    }, 10);
}

function closePanel() {
    document.getElementById('slideOverBackdrop').classList.remove('opacity-100');
    document.getElementById('slideOverBackdrop').classList.add('opacity-0');
    document.getElementById('slideOverPanel').classList.add('translate-x-full');

    // wait for transition to end before hiding
    setTimeout(() => {
        document.getElementById('slideOverWrapper').classList.add('hidden');
    }, 300);
}

// ----------------------------------------
// 匯出 CSV 報表
// ----------------------------------------
function exportToCsv() {
    // 取得當前專案資料
    const targetData = mockQuestionsDb.filter(q => q.project_id === currentProjId);

    if (targetData.length === 0) {
        Swal.fire({
            icon: 'info',
            title: '目前尚無資料可匯出',
            confirmButtonColor: 'var(--color-morandi)'
        });
        return;
    }

    // CSV 表頭
    let csvContent = "專案(梯次)代碼,試題編號,題型,等級,難易度,命題教師,當前所在階段(1~7),審核狀態,退回次數\n";

    // 填入資料列
    targetData.forEach(q => {
        const row = [
            q.project_id,
            q.id,
            qTypeMap[q.type] || q.type,
            q.level || '',
            diffMap[q.difficulty] || q.difficulty,
            teacherMap[q.author_id] || q.author_id,
            q.stage,
            statusMap[q.status] ? statusMap[q.status].label : q.status,
            q.returnCount
        ];

        // 為了避免內容有逗號破壞 csv 格式，用雙引號包起來
        const rowStr = row.map(item => `"${String(item).replace(/"/g, '""')}"`).join(',');
        csvContent += rowStr + "\n";
    });

    // 處理 BOM (讓 Excel 開啟不亂碼)
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // 建立一個隱藏的 <a> 標籤觸發下載
    const a = document.createElement('a');
    a.href = url;
    a.download = `CWT_試題報表_${currentProjId}_${new Date().getTime()}.csv`;
    a.style.display = 'none';

    document.body.appendChild(a);
    a.click();

    // 清理資源
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // 提示成功
    Swal.fire({
        icon: 'success',
        title: '匯出成功',
        text: '報表已下載至您的電腦',
        timer: 1500,
        showConfirmButton: false
    });
}

