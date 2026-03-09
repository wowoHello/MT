/**
 * CWT List Module (命題任務)
 * 負責命題教師的試題管理：命題作業區、審修作業區、審核結果與歷史。
 * 包含 7 種題型表單、底部滑入式 Quill 編輯器、修題回覆機制。
 * Version: 1.0 (DEMO)
 *
 * [Blazor Migration Note]
 * - Mock 資料需替換為 API 呼叫
 * - Quill 編輯器需評估 Blazor 相容方案 (Blazored.TextEditor or JS Interop)
 * - localStorage 操作替換為 Server Session
 */

// ===================================================================
// 常數定義
// ===================================================================

/** 題型中文對應 */
const qTypeMap = {
    'single': '一般單選題', 'select': '精選單選題', 'readGroup': '閱讀題組',
    'longText': '長文題目', 'shortGroup': '短文題組', 'listen': '聽力測驗', 'listenGroup': '聽力題組'
};

/** 題型圖示 */
const qTypeIcon = {
    'single': 'fa-solid fa-circle-dot', 'select': 'fa-solid fa-star',
    'readGroup': 'fa-solid fa-book-open', 'longText': 'fa-solid fa-file-lines',
    'shortGroup': 'fa-solid fa-layer-group', 'listen': 'fa-solid fa-headphones',
    'listenGroup': 'fa-solid fa-headphones'
};

/** 難易度中文 */
const diffMap = { 'easy': '易', 'medium': '中', 'hard': '難' };

/** 試題狀態機 */
const statusMap = {
    'draft':            { label: '草稿',     color: 'bg-gray-100 text-gray-600',   border: 'border-gray-200',   tab: 'compose' },
    'completed':        { label: '命題完成', color: 'bg-blue-100 text-blue-700',    border: 'border-blue-200',   tab: 'compose' },
    'pending':          { label: '已送審',   color: 'bg-yellow-100 text-yellow-700', border: 'border-yellow-200', tab: 'compose' },
    'peer_reviewing':   { label: '互審中',   color: 'bg-blue-50 text-blue-600',     border: 'border-blue-200',   tab: 'revision' },
    'peer_editing':     { label: '互審修題', color: 'bg-amber-100 text-amber-700',  border: 'border-amber-300',  tab: 'revision' },
    'expert_reviewing': { label: '專審中',   color: 'bg-blue-50 text-blue-600',     border: 'border-blue-200',   tab: 'revision' },
    'expert_editing':   { label: '專審修題', color: 'bg-amber-100 text-amber-700',  border: 'border-amber-300',  tab: 'revision' },
    'final_reviewing':  { label: '總審中',   color: 'bg-blue-50 text-blue-600',     border: 'border-blue-200',   tab: 'revision' },
    'final_editing':    { label: '總審修題', color: 'bg-red-100 text-red-700',      border: 'border-red-300',    tab: 'revision' },
    'adopted':          { label: '採用',     color: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-300', tab: 'history' },
    'rejected':         { label: '不採用',   color: 'bg-gray-200 text-gray-500',    border: 'border-gray-300',   tab: 'history' }
};

/** 審查階段名稱對應 */
const reviewStageLabel = {
    'peer': '互審', 'expert': '專審', 'final': '總審'
};

// ===================================================================
// Mock 資料 — 命題教師 (T1001 劉雅婷) 的配額與試題
// ===================================================================

/** 教師在此梯次被指派的命題配額 */
const myQuotasDb = {
    'P2026-01': { single: 150, select: 100, readGroup: 25, longText: 10, shortGroup: 10, listen: 25, listenGroup: 10 },
    'P2026-02': { single: 50, select: 30, readGroup: 10, longText: 5, shortGroup: 5, listen: 10, listenGroup: 5 }
};

/** 教師名稱庫 (簡化) */
const teacherNames = {
    'T1001': '劉雅婷', 'T1002': '王健明', 'T1003': '張心怡', 'T1004': '吳家豪',
    'C2001': '李教授', 'C2002': '陳副教授', 'S3001': '林總召', 'S3002': '許編輯'
};

/** 試題假資料庫 */
let myQuestionsDb = [
    // ========== 命題作業區 ==========
    {
        id: 'Q-2602-M001', projectId: 'P2026-01', type: 'single', level: '中級', difficulty: 'medium',
        status: 'draft', stem: '下列何者不是臺灣的原住民族群？',
        options: [
            { label: 'A', text: '阿美族' }, { label: 'B', text: '排灣族' },
            { label: 'C', text: '苗族' }, { label: 'D', text: '布農族' }
        ],
        answer: 'C', analysis: '苗族主要分布於中國大陸西南方，並非臺灣原住民族。',
        createdAt: '2026-03-01 09:30', updatedAt: '2026-03-07 14:20',
        returnCount: 0, reviewComment: null, reviewerName: null, reviewStage: null, revisionReply: '',
        history: [{ time: '2026-03-01 09:30', user: '劉雅婷', action: '建立草稿', comment: '' }]
    },
    {
        id: 'Q-2602-M002', projectId: 'P2026-01', type: 'single', level: '初級', difficulty: 'easy',
        status: 'draft', stem: '「學而時習之，不亦說乎」出自哪一本經典？',
        options: [
            { label: 'A', text: '《孟子》' }, { label: 'B', text: '《論語》' },
            { label: 'C', text: '《大學》' }, { label: 'D', text: '《中庸》' }
        ],
        answer: 'B', analysis: '此句出自《論語・學而篇》，為孔子所言。',
        createdAt: '2026-03-02 10:15', updatedAt: '2026-03-02 10:15',
        returnCount: 0, reviewComment: null, reviewerName: null, reviewStage: null, revisionReply: '',
        history: [{ time: '2026-03-02 10:15', user: '劉雅婷', action: '建立草稿', comment: '' }]
    },
    {
        id: 'Q-2602-M003', projectId: 'P2026-01', type: 'select', level: '高級', difficulty: 'hard',
        status: 'completed', stem: '下列文句，何者使用了「倒裝」修辭？',
        options: [
            { label: 'A', text: '風蕭蕭兮易水寒，壯士一去兮不復還' },
            { label: 'B', text: '不以物喜，不以己悲' },
            { label: 'C', text: '甚矣，汝之不惠！' },
            { label: 'D', text: '有朋自遠方來，不亦樂乎' }
        ],
        answer: 'C', analysis: '「甚矣，汝之不惠」原句應為「汝之不惠，甚矣」，屬典型的主謂倒裝。',
        createdAt: '2026-03-03 11:00', updatedAt: '2026-03-06 16:45',
        returnCount: 0, reviewComment: null, reviewerName: null, reviewStage: null, revisionReply: '',
        history: [
            { time: '2026-03-03 11:00', user: '劉雅婷', action: '建立草稿', comment: '' },
            { time: '2026-03-06 16:45', user: '劉雅婷', action: '命題完成', comment: '已完成所有選項設計與解析撰寫' }
        ]
    },
    {
        id: 'Q-2602-M004', projectId: 'P2026-01', type: 'single', level: '中級', difficulty: 'medium',
        status: 'completed', stem: '下列詞語中，何者屬於「聯綿詞」？',
        options: [
            { label: 'A', text: '蝴蝶' }, { label: 'B', text: '書桌' },
            { label: 'C', text: '紅花' }, { label: 'D', text: '跑步' }
        ],
        answer: 'A', analysis: '蝴蝶為雙聲聯綿詞，不可拆開使用。',
        createdAt: '2026-03-04 09:00', updatedAt: '2026-03-08 10:30',
        returnCount: 0, reviewComment: null, reviewerName: null, reviewStage: null, revisionReply: '',
        history: [
            { time: '2026-03-04 09:00', user: '劉雅婷', action: '建立草稿', comment: '' },
            { time: '2026-03-08 10:30', user: '劉雅婷', action: '命題完成', comment: '' }
        ]
    },
    {
        id: 'Q-2602-M005', projectId: 'P2026-01', type: 'readGroup', level: '高級', difficulty: 'hard',
        status: 'pending',
        stem: '',
        passage: '子曰：「學而時習之，不亦說乎？有朋自遠方來，不亦樂乎？人不知而不慍，不亦君子乎？」——《論語・學而》',
        subQuestions: [
            {
                stem: '下列何者最能說明「學而時習之」的意涵？',
                options: [
                    { label: 'A', text: '學習後要時常溫習' }, { label: 'B', text: '學習需要有固定時間' },
                    { label: 'C', text: '學習只需一次就好' }, { label: 'D', text: '學習要跟隨潮流' }
                ],
                answer: 'A'
            },
            {
                stem: '「人不知而不慍」中的「慍」字意思最接近下列何者？',
                options: [
                    { label: 'A', text: '高興' }, { label: 'B', text: '生氣' },
                    { label: 'C', text: '難過' }, { label: 'D', text: '緊張' }
                ],
                answer: 'B'
            }
        ],
        options: [], answer: '',
        analysis: '此題組測驗學生對《論語》經典篇章的理解能力。',
        createdAt: '2026-03-05 13:00', updatedAt: '2026-03-08 15:00',
        returnCount: 0, reviewComment: null, reviewerName: null, reviewStage: null, revisionReply: '',
        history: [
            { time: '2026-03-05 13:00', user: '劉雅婷', action: '建立草稿', comment: '' },
            { time: '2026-03-07 10:00', user: '劉雅婷', action: '命題完成', comment: '閱讀題組含 2 子題' },
            { time: '2026-03-08 15:00', user: '劉雅婷', action: '送審', comment: '' }
        ]
    },
    {
        id: 'Q-2602-M006', projectId: 'P2026-01', type: 'longText', level: '中高級', difficulty: 'medium',
        status: 'draft',
        stem: '閱讀以下短文後，回答問題。',
        passage: '臺灣位於亞熱帶地區，四季分明，物產豐富。因地理位置特殊，兼具海洋性與大陸性氣候的特徵。山地面積佔全島約三分之二，平原主要分布於西部沿海地區。',
        options: [
            { label: 'A', text: '臺灣全島皆為平原地形' }, { label: 'B', text: '臺灣的山地面積大於平原' },
            { label: 'C', text: '臺灣位於溫帶地區' }, { label: 'D', text: '臺灣只有海洋性氣候' }
        ],
        answer: 'B', analysis: '文中明確指出「山地面積佔全島約三分之二」，故山地面積大於平原。',
        createdAt: '2026-03-06 11:00', updatedAt: '2026-03-06 11:00',
        returnCount: 0, reviewComment: null, reviewerName: null, reviewStage: null, revisionReply: '',
        history: [{ time: '2026-03-06 11:00', user: '劉雅婷', action: '建立草稿', comment: '' }]
    },
    {
        id: 'Q-2602-M007', projectId: 'P2026-01', type: 'listen', level: '難度二', difficulty: 'medium',
        status: 'draft',
        stem: '請聽一段對話，回答下列問題：對話中的男子想要做什麼？',
        audioUrl: 'demo_audio_001.mp3',
        options: [
            { label: 'A', text: '去圖書館借書' }, { label: 'B', text: '去超市買東西' },
            { label: 'C', text: '去公園散步' }, { label: 'D', text: '去餐廳吃飯' }
        ],
        answer: 'B', analysis: '對話中男子說「我們去超市買一些水果吧」，故答案為 B。',
        createdAt: '2026-03-07 14:00', updatedAt: '2026-03-07 14:00',
        returnCount: 0, reviewComment: null, reviewerName: null, reviewStage: null, revisionReply: '',
        history: [{ time: '2026-03-07 14:00', user: '劉雅婷', action: '建立草稿', comment: '' }]
    },
    {
        id: 'Q-2602-M008', projectId: 'P2026-01', type: 'shortGroup', level: '中高級', difficulty: 'medium',
        status: 'completed',
        stem: '',
        passage: '春天來了，小鳥在枝頭歌唱，花兒在路旁綻放。孩子們在公園裡奔跑嬉戲，大人們在樹蔭下閒聊。這是一個充滿生機的季節。',
        subQuestions: [
            {
                stem: '文中描寫的季節有什麼特點？',
                options: [
                    { label: 'A', text: '蕭瑟冷清' }, { label: 'B', text: '充滿生機' },
                    { label: 'C', text: '炎熱乾燥' }, { label: 'D', text: '白雪皚皚' }
                ],
                answer: 'B'
            }
        ],
        options: [], answer: '',
        analysis: '文末直接點明「充滿生機的季節」，故答案為 B。',
        createdAt: '2026-03-08 09:00', updatedAt: '2026-03-09 08:00',
        returnCount: 0, reviewComment: null, reviewerName: null, reviewStage: null, revisionReply: '',
        history: [
            { time: '2026-03-08 09:00', user: '劉雅婷', action: '建立草稿', comment: '' },
            { time: '2026-03-09 08:00', user: '劉雅婷', action: '命題完成', comment: '' }
        ]
    },

    // ========== 審修作業區 ==========
    {
        id: 'Q-2602-M010', projectId: 'P2026-01', type: 'single', level: '中級', difficulty: 'medium',
        status: 'peer_editing',
        stem: '下列何者是正確的成語用法？',
        options: [
            { label: 'A', text: '走投無路' }, { label: 'B', text: '按步就班' },
            { label: 'C', text: '破斧沉舟' }, { label: 'D', text: '再乘再勵' }
        ],
        answer: 'A', analysis: '「走投無路」為正確寫法。(B) 應為「按部就班」；(C) 應為「破釜沉舟」；(D) 應為「再接再厲」。',
        createdAt: '2026-02-20 10:00', updatedAt: '2026-03-05 09:15',
        returnCount: 1,
        reviewComment: '選項 (C)「破斧沉舟」的錯誤字建議改為更具迷惑性的寫法，例如「破斧沈舟」，讓學生需要更仔細辨別。另外建議在解析中補充每個成語的正確出處。',
        reviewerName: '王健明', reviewStage: 'peer', revisionReply: '',
        history: [
            { time: '2026-02-20 10:00', user: '劉雅婷', action: '建立草稿', comment: '' },
            { time: '2026-02-25 14:00', user: '劉雅婷', action: '命題完成', comment: '' },
            { time: '2026-02-26 09:00', user: '劉雅婷', action: '送審', comment: '' },
            { time: '2026-03-05 09:15', user: '王健明', action: '互審意見', comment: '選項 (C)「破斧沉舟」的錯誤字建議改為更具迷惑性的寫法。另外建議補充成語出處。' }
        ]
    },
    {
        id: 'Q-2602-M011', projectId: 'P2026-01', type: 'select', level: '高級', difficulty: 'hard',
        status: 'expert_editing',
        stem: '下列何者最能表現「物是人非」的感慨？',
        options: [
            { label: 'A', text: '年年歲歲花相似，歲歲年年人不同' },
            { label: 'B', text: '山重水複疑無路，柳暗花明又一村' },
            { label: 'C', text: '海內存知己，天涯若比鄰' },
            { label: 'D', text: '欲窮千里目，更上一層樓' }
        ],
        answer: 'A', analysis: '「年年歲歲花相似，歲歲年年人不同」正是描寫景物依舊但人事已變的感慨，最能體現「物是人非」。',
        createdAt: '2026-02-18 11:00', updatedAt: '2026-03-04 16:30',
        returnCount: 1,
        reviewComment: '題目設計佳，但選項 (B) 的詩句引用有誤，原文應為「山重水複」而非「山窮水複」。請確認並修正。另外，解析可再補充其他選項的修辭分析。',
        reviewerName: '李教授', reviewStage: 'expert', revisionReply: '',
        history: [
            { time: '2026-02-18 11:00', user: '劉雅婷', action: '建立草稿', comment: '' },
            { time: '2026-02-22 15:00', user: '劉雅婷', action: '命題完成', comment: '' },
            { time: '2026-02-23 09:00', user: '劉雅婷', action: '送審', comment: '' },
            { time: '2026-02-28 10:00', user: '張心怡', action: '互審意見', comment: '題目設計不錯。' },
            { time: '2026-03-04 16:30', user: '李教授', action: '專審意見 (改後再審)', comment: '選項引用有誤，請確認修正。' }
        ]
    },
    {
        id: 'Q-2602-M012', projectId: 'P2026-01', type: 'single', level: '中高級', difficulty: 'medium',
        status: 'final_editing',
        stem: '「亡羊補牢，猶未遲也」這句話的主要寓意為何？',
        options: [
            { label: 'A', text: '牧羊人要注意安全' }, { label: 'B', text: '發現錯誤後及時補救' },
            { label: 'C', text: '羊群走丟了很可惜' }, { label: 'D', text: '圍欄需要定期維修' }
        ],
        answer: 'B', analysis: '此成語出自《戰國策》，意指出了問題後及時補救仍然不晚。',
        createdAt: '2026-02-16 10:00', updatedAt: '2026-03-08 11:00',
        returnCount: 2,
        reviewComment: '解析過於簡略，請補充成語的歷史典故與實際應用情境，讓學生能深入理解。此為第二次退回，請務必修正完善。',
        reviewerName: '林總召', reviewStage: 'final', revisionReply: '',
        history: [
            { time: '2026-02-16 10:00', user: '劉雅婷', action: '建立草稿', comment: '' },
            { time: '2026-02-20 14:00', user: '劉雅婷', action: '命題完成', comment: '' },
            { time: '2026-02-21 09:00', user: '劉雅婷', action: '送審', comment: '' },
            { time: '2026-02-25 10:00', user: '王健明', action: '互審意見', comment: '建議加強解析。' },
            { time: '2026-03-01 14:00', user: '李教授', action: '專審意見 (採用)', comment: '基本合格。' },
            { time: '2026-03-05 10:00', user: '林總召', action: '總召決策 (改後再審)', comment: '解析不夠完整，退回修改。' },
            { time: '2026-03-06 09:00', user: '劉雅婷', action: '修題回覆', comment: '已補充典故出處。' },
            { time: '2026-03-08 11:00', user: '林總召', action: '總召決策 (改後再審)', comment: '解析仍過於簡略，請補充實際應用情境。' }
        ]
    },

    // ========== 審核結果與歷史 ==========
    {
        id: 'Q-2602-M015', projectId: 'P2026-01', type: 'single', level: '中級', difficulty: 'easy',
        status: 'adopted',
        stem: '「千里之行，始於足下」的意思是？',
        options: [
            { label: 'A', text: '走路一千里才能到達目的地' }, { label: 'B', text: '做事要從基礎做起' },
            { label: 'C', text: '腳下的路很長很遠' }, { label: 'D', text: '旅行要穿好鞋子' }
        ],
        answer: 'B', analysis: '此句出自《老子》第六十四章，強調做任何事都要從基礎開始，一步一步來。',
        createdAt: '2026-02-15 10:00', updatedAt: '2026-03-06 14:00',
        returnCount: 0, reviewComment: null, reviewerName: null, reviewStage: null, revisionReply: '',
        history: [
            { time: '2026-02-15 10:00', user: '劉雅婷', action: '建立草稿', comment: '' },
            { time: '2026-02-18 14:00', user: '劉雅婷', action: '命題完成', comment: '' },
            { time: '2026-02-19 09:00', user: '劉雅婷', action: '送審', comment: '' },
            { time: '2026-02-24 10:00', user: '張心怡', action: '互審意見', comment: '題目清楚明白，很好。' },
            { time: '2026-03-01 14:00', user: '李教授', action: '專審意見 (採用)', comment: '符合等級，予以採用。' },
            { time: '2026-03-06 14:00', user: '林總召', action: '總召決策 (採用)', comment: '核准入庫。' }
        ]
    },
    {
        id: 'Q-2602-M016', projectId: 'P2026-01', type: 'select', level: '中高級', difficulty: 'hard',
        status: 'adopted',
        stem: '下列何者使用了「對偶」的修辭手法？',
        options: [
            { label: 'A', text: '海記憶體知己，天涯若比鄰' }, { label: 'B', text: '千山鳥飛絕，萬徑人蹤滅' },
            { label: 'C', text: '白日依山盡，黃河入海流' }, { label: 'D', text: '以上皆是' }
        ],
        answer: 'D', analysis: '三個選項皆使用了對偶修辭，上下句字數相同、詞性相對、結構一致。',
        createdAt: '2026-02-16 09:00', updatedAt: '2026-03-07 11:00',
        returnCount: 0, reviewComment: null, reviewerName: null, reviewStage: null, revisionReply: '',
        history: [
            { time: '2026-02-16 09:00', user: '劉雅婷', action: '建立草稿', comment: '' },
            { time: '2026-02-20 11:00', user: '劉雅婷', action: '命題完成', comment: '' },
            { time: '2026-02-21 09:00', user: '劉雅婷', action: '送審', comment: '' },
            { time: '2026-02-26 10:00', user: '王健明', action: '互審意見', comment: '精選題型，設計精良。' },
            { time: '2026-03-03 14:00', user: '陳副教授', action: '專審意見 (採用)', comment: '題目優秀。' },
            { time: '2026-03-07 11:00', user: '林總召', action: '總召決策 (採用)', comment: '核准。' }
        ]
    },
    {
        id: 'Q-2602-M017', projectId: 'P2026-01', type: 'single', level: '初級', difficulty: 'easy',
        status: 'rejected',
        stem: '下列何者是水果？',
        options: [
            { label: 'A', text: '蘋果' }, { label: 'B', text: '白菜' },
            { label: 'C', text: '米飯' }, { label: 'D', text: '麵包' }
        ],
        answer: 'A', analysis: '蘋果是水果。',
        createdAt: '2026-02-17 10:00', updatedAt: '2026-03-07 16:00',
        returnCount: 2, reviewComment: null, reviewerName: null, reviewStage: null, revisionReply: '',
        history: [
            { time: '2026-02-17 10:00', user: '劉雅婷', action: '建立草稿', comment: '' },
            { time: '2026-02-19 11:00', user: '劉雅婷', action: '命題完成', comment: '' },
            { time: '2026-02-20 09:00', user: '劉雅婷', action: '送審', comment: '' },
            { time: '2026-02-25 10:00', user: '吳家豪', action: '互審意見', comment: '題目過於簡單。' },
            { time: '2026-03-02 14:00', user: '李教授', action: '專審意見 (改後再審)', comment: '需提升鑑別度。' },
            { time: '2026-03-07 16:00', user: '林總召', action: '總召決策 (不採用)', comment: '題目鑑別度過低，不適用於任何等級的正式考試。' }
        ]
    }
];


// ===================================================================
// 狀態管理
// ===================================================================
let currentTab = 'compose';       // 'compose' | 'revision' | 'history'
let filteredQuestions = [];       // 目前篩選後的題目列表
let currentEditingQuestion = null; // 目前正在編輯的題目 (null = 新增模式)
let formMode = 'create';          // 'create' | 'edit' | 'revision' | 'view'
let quillInstance = null;         // Quill 編輯器實例
let activeEditableField = null;   // 目前正在編輯的欄位 DOM 元素
let activeFieldKey = null;        // 目前正在編輯的欄位 key (如 'stem', 'analysis', 'passage')


// ===================================================================
// 初始化
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 權限檢查：僅命題教師可進入
    const userStr = localStorage.getItem('cwt_user');
    if (userStr) {
        const user = JSON.parse(userStr);
        // [DEMO] 為展示方便，暫時允許 ADMIN 也能進入
        if (user.role !== 'ADMIN' && user.role !== 'TEACHER') {
            Swal.fire({
                icon: 'error', title: '權限不足',
                text: '「我的命題任務」為命題教師專屬功能。即將導回首頁。',
                showConfirmButton: false, timer: 2500
            }).then(() => { window.location.href = 'firstpage.html'; });
            return;
        }
    }

    // 初始化 Quill 編輯器
    initQuillEditor();

    // 初始化 Tab 切換
    initTabs();

    // 初始化表單 Modal 事件
    initFormModal();

    // 初始化預覽 Modal
    initPreviewModal();

    // 載入資料
    const projectId = localStorage.getItem('cwt_current_project') || 'P2026-01';
    loadPageData(projectId);

    // 監聽專案切換事件
    document.addEventListener('projectChanged', (e) => {
        loadPageData(e.detail.id);
    });
});


// ===================================================================
// 頁面資料載入
// ===================================================================
const loadPageData = (projectId) => {
    renderQuotaCards(projectId);
    renderTabContent();
};


// ===================================================================
// 配額進度卡片
// ===================================================================
const renderQuotaCards = (projectId) => {
    const container = document.getElementById('quotaCardsContainer');
    const quotas = myQuotasDb[projectId] || {};
    const questions = myQuestionsDb.filter(q => q.projectId === projectId);

    let totalTarget = 0;
    let totalDone = 0;

    const typeKeys = Object.keys(qTypeMap);
    let html = '';

    typeKeys.forEach(key => {
        const target = quotas[key] || 0;
        const done = questions.filter(q => q.type === key && q.status !== 'rejected').length;
        totalTarget += target;
        totalDone += done;

        const pct = target > 0 ? Math.min(Math.round((done / target) * 100), 100) : 0;
        const barColor = pct >= 100 ? 'bg-[var(--color-sage)]' : pct >= 60 ? 'bg-[var(--color-morandi)]' : 'bg-[var(--color-terracotta)]';

        html += `
            <div class="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow transition-shadow">
                <div class="flex items-center justify-between mb-1">
                    <span class="text-xs font-bold text-gray-500 truncate"><i class="${qTypeIcon[key]} mr-1 opacity-50"></i>${qTypeMap[key]}</span>
                </div>
                <div class="text-lg font-bold text-[var(--color-slate-main)]">${done}<span class="text-sm text-gray-400 font-normal"> / ${target}</span></div>
                <div class="w-full bg-gray-100 rounded-full mt-1.5" style="height:4px;">
                    <div class="quota-bar ${barColor} rounded-full" style="width:${pct}%;"></div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    document.getElementById('quotaTotalProgress').textContent = `總計 ${totalDone} / ${totalTarget} 題`;
};


// ===================================================================
// Tab 切換
// ===================================================================
const initTabs = () => {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            switchTab(tab);
        });
    });
};

const switchTab = (tab) => {
    currentTab = tab;

    // 更新 Tab 按鈕樣式
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active-compose', 'active-revision', 'active-history');
        if (btn.getAttribute('data-tab') === tab) {
            btn.classList.add(`active-${tab === 'compose' ? 'compose' : tab === 'revision' ? 'revision' : 'history'}`);
        }
    });

    renderTabContent();
};


// ===================================================================
// Tab 內容渲染 (統計 + 篩選 + 列表)
// ===================================================================
const renderTabContent = () => {
    const projectId = localStorage.getItem('cwt_current_project') || 'P2026-01';
    const allQuestions = myQuestionsDb.filter(q => q.projectId === projectId);

    // 計算各 Tab 題數
    const composeQ = allQuestions.filter(q => ['draft', 'completed', 'pending'].includes(q.status));
    const revisionQ = allQuestions.filter(q => ['peer_reviewing', 'peer_editing', 'expert_reviewing', 'expert_editing', 'final_reviewing', 'final_editing'].includes(q.status));
    const historyQ = allQuestions.filter(q => ['adopted', 'rejected'].includes(q.status));

    document.getElementById('tabCountCompose').textContent = composeQ.length;
    document.getElementById('tabCountRevision').textContent = revisionQ.length;
    document.getElementById('tabCountHistory').textContent = historyQ.length;

    // 渲染統計卡片
    renderTabStats(composeQ, revisionQ, historyQ);

    // 根據當前 Tab 篩選題目
    let currentQuestions = [];
    if (currentTab === 'compose') currentQuestions = composeQ;
    else if (currentTab === 'revision') currentQuestions = revisionQ;
    else currentQuestions = historyQ;

    // 套用篩選條件
    filteredQuestions = applyFilters(currentQuestions);

    // 排序
    filteredQuestions = sortQuestions(filteredQuestions);

    // 渲染列表
    renderQuestionList();
};

/** 渲染各 Tab 的統計卡片 */
const renderTabStats = (composeQ, revisionQ, historyQ) => {
    const container = document.getElementById('tabStatsContainer');
    let html = '';

    if (currentTab === 'compose') {
        const draft = composeQ.filter(q => q.status === 'draft').length;
        const completed = composeQ.filter(q => q.status === 'completed').length;
        const pending = composeQ.filter(q => q.status === 'pending').length;
        html = `
            <div class="flex flex-wrap gap-3">
                <div class="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <span class="w-2.5 h-2.5 rounded-full bg-gray-400"></span>
                    <span class="text-sm text-gray-600">草稿</span>
                    <span class="text-lg font-bold text-gray-700">${draft}</span>
                </div>
                <div class="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    <span class="text-sm text-gray-600">命題完成</span>
                    <span class="text-lg font-bold text-blue-700">${completed}</span>
                </div>
                <div class="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <span class="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                    <span class="text-sm text-gray-600">已送審</span>
                    <span class="text-lg font-bold text-yellow-700">${pending}</span>
                </div>
            </div>`;
    } else if (currentTab === 'revision') {
        const reviewing = revisionQ.filter(q => q.status.endsWith('_reviewing')).length;
        const editing = revisionQ.filter(q => q.status.endsWith('_editing')).length;
        html = `
            <div class="flex flex-wrap gap-3">
                <div class="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <span class="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                    <span class="text-sm text-gray-600">鎖定審查中</span>
                    <span class="text-lg font-bold text-blue-700">${reviewing}</span>
                </div>
                <div class="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-amber-300 shadow-sm bg-amber-50">
                    <span class="w-2.5 h-2.5 rounded-full bg-[var(--color-terracotta)]"></span>
                    <span class="text-sm text-amber-700 font-medium">需修題</span>
                    <span class="text-lg font-bold text-[var(--color-terracotta)]">${editing}</span>
                </div>
            </div>`;
    } else {
        const adopted = historyQ.filter(q => q.status === 'adopted').length;
        const rejected = historyQ.filter(q => q.status === 'rejected').length;
        html = `
            <div class="flex flex-wrap gap-3">
                <div class="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-emerald-200 shadow-sm">
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span class="text-sm text-gray-600">已採用</span>
                    <span class="text-lg font-bold text-emerald-700">${adopted}</span>
                </div>
                <div class="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <span class="w-2.5 h-2.5 rounded-full bg-gray-400"></span>
                    <span class="text-sm text-gray-600">不採用</span>
                    <span class="text-lg font-bold text-gray-500">${rejected}</span>
                </div>
            </div>`;
    }

    container.innerHTML = html;
};


// ===================================================================
// 篩選與排序
// ===================================================================
const applyFilters = (questions) => {
    const keyword = document.getElementById('filterKeyword').value.trim().toLowerCase();
    const typeVal = document.getElementById('filterType').value;
    const levelVal = document.getElementById('filterLevel').value;

    return questions.filter(q => {
        if (keyword && !q.id.toLowerCase().includes(keyword) && !q.stem.toLowerCase().includes(keyword)) return false;
        if (typeVal !== 'all' && q.type !== typeVal) return false;
        if (levelVal !== 'all' && q.level !== levelVal) return false;
        return true;
    });
};

const sortQuestions = (questions) => {
    const statusPriority = {
        // 命題作業區排序：草稿 > 完成 > 已送審
        'draft': 0, 'completed': 1, 'pending': 2,
        // 審修作業區排序：審查中 > 修題中
        'peer_reviewing': 0, 'expert_reviewing': 0, 'final_reviewing': 0,
        'peer_editing': 1, 'expert_editing': 1, 'final_editing': 1,
        // 歷史排序
        'adopted': 0, 'rejected': 1
    };

    return [...questions].sort((a, b) => {
        const pa = statusPriority[a.status] ?? 99;
        const pb = statusPriority[b.status] ?? 99;
        if (pa !== pb) return pa - pb;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
};

// 監聽篩選欄位變化
document.getElementById('filterKeyword')?.addEventListener('input', () => renderTabContent());
document.getElementById('filterType')?.addEventListener('change', (e) => {
    // 依題型切換等級下拉選項（聽力 → 難度一~五；一般 → 初級~優級）
    syncLevelDropdown(document.getElementById('filterLevel'), e.target.value);
    renderTabContent();
});
document.getElementById('filterLevel')?.addEventListener('change', () => renderTabContent());

/**
 * 依據題型切換等級下拉選項的顯示
 * 聽力題型 (listen / listenGroup) → 顯示「難度一～難度五」
 * 其他題型 → 顯示「初級～優級」
 * @param {HTMLSelectElement} levelSelect - 等級下拉元素
 * @param {string} typeValue - 題型值
 */
const syncLevelDropdown = (levelSelect, typeValue) => {
    if (!levelSelect) return;
    const isListen = ['listen', 'listenGroup'].includes(typeValue);

    levelSelect.querySelectorAll('.opt-normal').forEach(opt => {
        opt.classList.toggle('hidden', isListen);
        opt.disabled = isListen;
    });
    levelSelect.querySelectorAll('.opt-listen').forEach(opt => {
        opt.classList.toggle('hidden', !isListen);
        opt.disabled = !isListen;
    });

    // 若 "all" 以外的值被隱藏了，重設為 "all" 或空值
    const currentVal = levelSelect.value;
    if (currentVal !== 'all' && currentVal !== '') {
        const selectedOpt = levelSelect.querySelector(`option[value="${currentVal}"]`);
        if (selectedOpt && selectedOpt.disabled) {
            levelSelect.value = levelSelect.id === 'filterLevel' ? 'all' : '';
        }
    }
};


// ===================================================================
// 題目列表渲染
// ===================================================================
const renderQuestionList = () => {
    const container = document.getElementById('questionListContainer');
    const emptyState = document.getElementById('emptyState');
    const listCount = document.getElementById('listCount');

    listCount.textContent = filteredQuestions.length;

    if (filteredQuestions.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        const emptyTexts = {
            'compose': '目前沒有命題作業，點擊右上角「新增試題」開始命題。',
            'revision': '目前沒有待修題的試題，您辛苦了！',
            'history': '此梯次尚無已審核的試題紀錄。'
        };
        document.getElementById('emptyStateText').textContent = emptyTexts[currentTab];
        return;
    }

    emptyState.classList.add('hidden');

    let html = '';
    filteredQuestions.forEach(q => {
        const st = statusMap[q.status] || {};
        const isRevision = currentTab === 'revision';
        const isHistory = currentTab === 'history';
        const isEditable = q.status.endsWith('_editing');
        const isLocked = q.status.endsWith('_reviewing');

        // 題幹預覽文字 (去除 HTML 標籤，取前 80 字)
        const plainStem = stripHtml(q.stem || q.passage || '(尚未輸入題幹)');
        const stemPreview = plainStem.length > 80 ? plainStem.substring(0, 80) + '...' : plainStem;

        // 選項預覽 (最多顯示 4 個選項)
        const optionsArr = q.subQuestions ? q.subQuestions.map((sq, i) => `第${i + 1}題`) : (q.options || []);
        const optionPreview = q.subQuestions
            ? `<span class="text-gray-400 text-xs">含 ${q.subQuestions.length} 道子題</span>`
            : optionsArr.map(o => `<span class="inline-block mr-2">(${o.label}) ${truncate(o.text, 8)}</span>`).join('');

        // 修題卡片的審查意見區塊
        let revisionBlock = '';
        if (isRevision && q.reviewComment) {
            const stageName = reviewStageLabel[q.reviewStage] || '審查';
            revisionBlock = `
                <div class="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-xs font-bold text-[var(--color-terracotta)] bg-[var(--color-terracotta)]/10 px-1.5 py-0.5 rounded">${stageName}意見</span>
                        <span class="text-xs text-gray-500">${q.reviewerName || '匿名'}</span>
                        ${q.returnCount >= 2 ? '<span class="text-xs text-red-600 font-bold ml-auto">⚠ 第 ' + q.returnCount + ' 次退回</span>' : ''}
                    </div>
                    <p class="text-gray-700 leading-relaxed">${truncate(q.reviewComment, 100)}</p>
                </div>`;
        }

        // 動作按鈕
        let actionBtns = '';
        if (currentTab === 'compose') {
            if (q.status === 'draft') {
                actionBtns = `
                    <button onclick="openFormModal('edit', '${q.id}')" class="text-xs px-3 py-1.5 bg-[var(--color-morandi)] text-white rounded-md hover:bg-[#5b7a95] transition-colors cursor-pointer font-medium">編輯</button>
                    <button onclick="submitQuestion('${q.id}')" class="text-xs px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer font-medium">送審</button>`;
            } else if (q.status === 'completed') {
                actionBtns = `
                    <button onclick="openFormModal('edit', '${q.id}')" class="text-xs px-3 py-1.5 bg-[var(--color-morandi)] text-white rounded-md hover:bg-[#5b7a95] transition-colors cursor-pointer font-medium">編輯</button>
                    <button onclick="submitQuestion('${q.id}')" class="text-xs px-3 py-1.5 bg-[var(--color-sage)] text-white rounded-md hover:bg-[#7a9a82] transition-colors cursor-pointer font-medium">命題送審</button>`;
            } else if (q.status === 'pending') {
                actionBtns = `
                    <button onclick="openFormModal('view', '${q.id}')" class="text-xs px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer font-medium">檢視</button>`;
            }
        } else if (currentTab === 'revision') {
            if (isEditable) {
                actionBtns = `
                    <button onclick="openFormModal('revision', '${q.id}')" class="text-xs px-3 py-1.5 bg-[var(--color-terracotta)] text-white rounded-md hover:bg-[#c87a5e] transition-colors cursor-pointer font-bold">進入修題</button>
                    <button onclick="openFormModal('view', '${q.id}')" class="text-xs px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer font-medium">檢視</button>`;
            } else {
                actionBtns = `
                    <span class="text-xs text-blue-500 font-medium"><i class="fa-solid fa-lock mr-1"></i>審查中，暫時無法操作</span>`;
            }
        } else {
            actionBtns = `
                <button onclick="openFormModal('view', '${q.id}')" class="text-xs px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer font-medium">檢視詳情</button>`;
        }

        html += `
            <div class="q-card ${isRevision && isEditable ? 'q-card-revision' : ''} bg-white p-4 sm:p-5 hover:bg-gray-50/50 transition-colors">
                <div class="flex flex-col sm:flex-row sm:items-start gap-3">
                    <!-- 左側：題號 + 類型 + 等級 -->
                    <div class="flex-shrink-0 sm:w-40">
                        <div class="font-mono text-sm font-bold text-[var(--color-morandi)]">${q.id}</div>
                        <div class="flex flex-wrap items-center gap-1.5 mt-1">
                            <span class="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-medium"><i class="${qTypeIcon[q.type]} mr-0.5 text-[10px]"></i> ${qTypeMap[q.type]}</span>
                            <span class="text-xs text-gray-400">${q.level} / ${diffMap[q.difficulty] || ''}</span>
                        </div>
                    </div>

                    <!-- 中間：題幹預覽 + 選項 -->
                    <div class="flex-grow min-w-0">
                        <p class="text-sm text-gray-700 leading-relaxed mb-1 line-clamp-2">${stemPreview}</p>
                        <div class="text-xs text-gray-400 leading-relaxed">${optionPreview}</div>
                        ${revisionBlock}
                    </div>

                    <!-- 右側：狀態 + 動作 -->
                    <div class="flex-shrink-0 flex flex-col items-end gap-2 sm:w-40">
                        <span class="text-xs px-2.5 py-1 rounded-full font-bold border ${st.color} ${st.border}">${st.label}</span>
                        <div class="text-[10px] text-gray-400">${q.updatedAt}</div>
                        <div class="flex items-center gap-1.5 mt-1">${actionBtns}</div>
                    </div>
                </div>
            </div>`;
    });

    container.innerHTML = html;
};


// ===================================================================
// 表單 Modal
// ===================================================================
const initFormModal = () => {
    // 返回列表按鈕
    document.getElementById('formBackBtn').addEventListener('click', closeFormModal);

    // 點擊背景：新增/編輯模式存為草稿並關閉；檢視模式直接關閉
    document.getElementById('formBackdrop').addEventListener('click', () => {
        if (formMode === 'view') {
            closeFormModal();
        } else {
            saveAsDraft();
            closeFormModal();
        }
    });

    // 存為草稿
    document.getElementById('formDraftBtn').addEventListener('click', () => {
        saveAsDraft();
        closeFormModal();
    });

    // 命題完成 / 完成修題 / 送審
    document.getElementById('formSubmitBtn').addEventListener('click', handleFormSubmit);

    // 預覽按鈕
    document.getElementById('formPreviewBtn').addEventListener('click', showExamPreview);

    // 題型切換 → 連動等級下拉 + 重渲染編輯區
    document.getElementById('formType').addEventListener('change', (e) => {
        syncLevelDropdown(document.getElementById('formLevel'), e.target.value);
        renderFormEditorContent(e.target.value);
    });

    // 新增試題按鈕
    document.getElementById('newQuestionBtn').addEventListener('click', () => {
        openFormModal('create');
    });
};

/** 開啟表單 Modal */
const openFormModal = (mode, questionId = null) => {
    formMode = mode;
    currentEditingQuestion = questionId ? myQuestionsDb.find(q => q.id === questionId) : null;

    const modal = document.getElementById('formModal');
    const panel = document.getElementById('formPanel');
    const backdrop = document.getElementById('formBackdrop');
    const revBanner = document.getElementById('revisionBanner');
    const revReplyArea = document.getElementById('revisionReplyArea');
    const title = document.getElementById('formTitle');
    const statusBadge = document.getElementById('formStatusBadge');
    const submitLabel = document.getElementById('formSubmitLabel');
    const submitBtn = document.getElementById('formSubmitBtn');
    const draftBtn = document.getElementById('formDraftBtn');

    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        backdrop.classList.remove('opacity-0');
        panel.classList.remove('opacity-0');
        panel.classList.add('modal-animate-in');
    });

    // 設定 Modal 標題與按鈕
    if (mode === 'create') {
        title.textContent = '新增試題';
        statusBadge.textContent = '草稿';
        statusBadge.className = 'text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-bold border border-gray-200';
        submitLabel.textContent = '命題完成';
        submitBtn.classList.remove('hidden');
        draftBtn.classList.remove('hidden');
        revBanner.classList.add('hidden');
        revReplyArea.classList.add('hidden');
    } else if (mode === 'edit') {
        title.textContent = '編輯試題';
        const st = statusMap[currentEditingQuestion.status];
        statusBadge.textContent = st.label;
        statusBadge.className = `text-xs px-2 py-0.5 rounded-full font-bold border ${st.color} ${st.border}`;
        submitLabel.textContent = '命題完成';
        submitBtn.classList.remove('hidden');
        draftBtn.classList.remove('hidden');
        revBanner.classList.add('hidden');
        revReplyArea.classList.add('hidden');
    } else if (mode === 'revision') {
        title.textContent = '修題作業';
        const st = statusMap[currentEditingQuestion.status];
        statusBadge.textContent = st.label;
        statusBadge.className = `text-xs px-2 py-0.5 rounded-full font-bold border ${st.color} ${st.border}`;
        submitLabel.textContent = '完成修題';
        submitBtn.classList.remove('hidden');
        submitBtn.className = 'px-4 py-1.5 text-sm bg-[var(--color-terracotta)] hover:bg-[#c87a5e] text-white rounded-lg font-bold transition-colors cursor-pointer';
        draftBtn.classList.remove('hidden');
        // 顯示修題意見橫幅
        revBanner.classList.remove('hidden');
        const stageName = reviewStageLabel[currentEditingQuestion.reviewStage] || '審查';
        document.getElementById('revBannerStage').textContent = `${stageName}意見`;
        document.getElementById('revBannerReviewer').textContent = `審查人：${currentEditingQuestion.reviewerName || '匿名'}`;
        document.getElementById('revBannerCount').textContent = `退回次數：${currentEditingQuestion.returnCount}/2`;
        document.getElementById('revBannerComment').textContent = currentEditingQuestion.reviewComment || '';
        // 顯示修題回覆區
        revReplyArea.classList.remove('hidden');
        document.getElementById('revisionReplyInput').value = currentEditingQuestion.revisionReply || '';
    } else {
        // view mode
        title.textContent = '檢視試題';
        const st = statusMap[currentEditingQuestion.status];
        statusBadge.textContent = st.label;
        statusBadge.className = `text-xs px-2 py-0.5 rounded-full font-bold border ${st.color} ${st.border}`;
        submitBtn.classList.add('hidden');
        draftBtn.classList.add('hidden');
        revBanner.classList.add('hidden');
        revReplyArea.classList.add('hidden');
    }

    // 填充左側表單
    populateFormSidebar();

    // 渲染右側編輯區域，並同步等級下拉選項
    const typeValue = currentEditingQuestion ? currentEditingQuestion.type : 'single';
    document.getElementById('formType').value = typeValue;
    syncLevelDropdown(document.getElementById('formLevel'), typeValue);
    renderFormEditorContent(typeValue);

    // 若為檢視模式，禁用所有輸入
    if (mode === 'view') {
        disableFormInputs();
    }
};

/** 關閉表單 Modal */
const closeFormModal = () => {
    // 先關閉 Quill 編輯器
    closeQuillEditor();

    const modal = document.getElementById('formModal');
    const panel = document.getElementById('formPanel');
    const backdrop = document.getElementById('formBackdrop');

    backdrop.classList.add('opacity-0');
    panel.classList.remove('modal-animate-in');
    panel.classList.add('opacity-0');

    setTimeout(() => {
        modal.classList.add('hidden');
        // 恢復送審按鈕樣式
        document.getElementById('formSubmitBtn').className = 'px-4 py-1.5 text-sm bg-[var(--color-sage)] hover:bg-[#7a9a82] text-white rounded-lg font-bold transition-colors cursor-pointer';
        currentEditingQuestion = null;
        formMode = 'create';
    }, 300);
};

/** 填充左側屬性表單 */
const populateFormSidebar = () => {
    const q = currentEditingQuestion;
    if (q) {
        document.getElementById('formType').value = q.type;
        document.getElementById('formLevel').value = q.level || '';
        document.getElementById('formDifficulty').value = q.difficulty || '';
        // 設定正確答案 radio
        const radios = document.querySelectorAll('input[name="formAnswer"]');
        radios.forEach(r => { r.checked = r.value === q.answer; });
    } else {
        document.getElementById('formType').value = 'single';
        document.getElementById('formLevel').value = '';
        document.getElementById('formDifficulty').value = '';
        document.querySelectorAll('input[name="formAnswer"]').forEach(r => { r.checked = false; });
    }
};

/** 依題型渲染右側編輯區內容 */
const renderFormEditorContent = (type) => {
    const container = document.getElementById('formEditorArea');
    const q = currentEditingQuestion;
    const isGroup = ['readGroup', 'shortGroup', 'listenGroup'].includes(type);
    const isListen = ['listen', 'listenGroup'].includes(type);
    const isLong = type === 'longText';

    // 控制左側答案區塊顯示
    const answerSection = document.getElementById('formAnswerSection');
    answerSection.style.display = isGroup ? 'none' : 'block';

    let html = '<div class="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">';

    // 聽力題型：音檔上傳區
    if (isListen) {
        html += `
            <div>
                <label class="block text-sm font-bold text-gray-700 mb-2"><i class="fa-solid fa-headphones mr-1 text-[var(--color-morandi)]"></i> 聽力音檔</label>
                <div class="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center bg-gray-50 hover:border-[var(--color-morandi)] transition-colors cursor-pointer">
                    <i class="fa-solid fa-cloud-arrow-up text-3xl text-gray-300 mb-2"></i>
                    <p class="text-sm text-gray-500">點擊或拖曳上傳音檔 (MP3/WAV)</p>
                    ${q && q.audioUrl ? `<p class="text-xs text-[var(--color-sage)] mt-2"><i class="fa-solid fa-check-circle mr-1"></i> 已上傳: ${q.audioUrl}</p>` : ''}
                </div>
            </div>`;
    }

    // 長文 / 閱讀題組 / 短文題組 / 聽力題組：引文/文章區
    if (isLong || isGroup) {
        const passageLabel = isListen ? '聽力腳本' : (type === 'readGroup' ? '閱讀文章' : (type === 'shortGroup' ? '短文內容' : '引文 / 長文'));
        const passageContent = q?.passage || '';
        html += `
            <div>
                <label class="block text-sm font-bold text-gray-700 mb-2"><i class="fa-solid fa-book mr-1 text-[var(--color-morandi)]"></i> ${passageLabel}</label>
                <div class="editable-field bg-white text-sm text-gray-700 leading-relaxed" data-field="passage" onclick="activateQuillField(this, 'passage', '${passageLabel}')">
                    ${passageContent || '<span class="text-gray-400 italic">點擊此處開始輸入${passageLabel}...</span>'}
                </div>
            </div>`;
    }

    // 題幹區 (單題型 / 長文題型)
    if (!isGroup) {
        const stemContent = q?.stem || '';
        html += `
            <div>
                <label class="block text-sm font-bold text-gray-700 mb-2"><i class="fa-solid fa-pen mr-1 text-[var(--color-morandi)]"></i> 題幹</label>
                <div class="editable-field bg-white text-sm text-gray-700 leading-relaxed" data-field="stem" onclick="activateQuillField(this, 'stem', '題幹')">
                    ${stemContent || '<span class="text-gray-400 italic">點擊此處開始編輯題幹...</span>'}
                </div>
            </div>`;

        // 選項區 (A/B/C/D)
        html += `
            <div>
                <label class="block text-sm font-bold text-gray-700 mb-2"><i class="fa-solid fa-list-ol mr-1 text-[var(--color-morandi)]"></i> 選項</label>
                <div class="space-y-3" id="formOptionsContainer">`;

        const labels = ['A', 'B', 'C', 'D'];
        labels.forEach((label, i) => {
            const optText = q?.options?.[i]?.text || '';
            const isCorrect = q?.answer === label;
            html += `
                    <div class="flex items-center gap-3">
                        <span class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isCorrect ? 'bg-[var(--color-sage)] text-white' : 'bg-gray-100 text-gray-500'}">${label}</span>
                        <input type="text" class="flex-grow px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--color-morandi)] focus:border-[var(--color-morandi)] bg-white"
                            data-option-index="${i}" data-option-label="${label}"
                            value="${escapeHtml(optText)}" placeholder="輸入選項 (${label}) 的內容...">
                    </div>`;
        });

        html += `</div></div>`;
    }

    // 子題區 (題組型)
    if (isGroup) {
        const subQs = q?.subQuestions || [{ stem: '', options: [{ label: 'A', text: '' }, { label: 'B', text: '' }, { label: 'C', text: '' }, { label: 'D', text: '' }], answer: '' }];
        html += `
            <div>
                <div class="flex items-center justify-between mb-3">
                    <label class="text-sm font-bold text-gray-700"><i class="fa-solid fa-layer-group mr-1 text-[var(--color-morandi)]"></i> 子題列表</label>
                    <button onclick="addSubQuestion()" class="text-xs px-3 py-1.5 bg-[var(--color-morandi)] text-white rounded-md hover:bg-[#5b7a95] transition-colors cursor-pointer font-medium">
                        <i class="fa-solid fa-plus mr-1"></i> 新增子題
                    </button>
                </div>
                <div class="space-y-4" id="subQuestionsContainer">`;

        subQs.forEach((sq, idx) => {
            html += renderSubQuestionBlock(sq, idx);
        });

        html += `</div></div>`;
    }

    // 解析區
    const analysisContent = q?.analysis || '';
    html += `
        <div>
            <label class="block text-sm font-bold text-gray-700 mb-2"><i class="fa-regular fa-lightbulb mr-1 text-yellow-500"></i> 解析</label>
            <div class="editable-field bg-white text-sm text-gray-700 leading-relaxed" data-field="analysis" onclick="activateQuillField(this, 'analysis', '解析')">
                ${analysisContent || '<span class="text-gray-400 italic">點擊此處編輯解析說明...</span>'}
            </div>
        </div>`;

    // 歷史軌跡 (檢視/修題模式才顯示)
    if (q && q.history && q.history.length > 0 && (formMode === 'view' || formMode === 'revision')) {
        html += `
            <div class="border-t border-gray-200 pt-6">
                <h3 class="text-sm font-bold text-gray-700 mb-4"><i class="fa-solid fa-clock-rotate-left mr-1 text-[var(--color-sage)]"></i> 歷程軌跡</h3>
                <div class="relative border-l-2 border-gray-200 ml-3 pl-5 space-y-4">`;

        q.history.forEach((h, i) => {
            const isLatest = i === q.history.length - 1;
            html += `
                    <div class="relative">
                        <div class="absolute -left-[1.625rem] top-1 w-3 h-3 rounded-full border-2 ${isLatest ? 'bg-[var(--color-morandi)] border-[var(--color-morandi)]' : 'bg-white border-gray-300'}"></div>
                        <div class="text-xs text-gray-400 mb-0.5">${h.time}</div>
                        <div class="text-sm"><span class="font-bold text-gray-700">${h.user}</span> <span class="text-gray-500">${h.action}</span></div>
                        ${h.comment ? `<p class="text-xs text-gray-500 mt-0.5 bg-gray-50 p-2 rounded">${h.comment}</p>` : ''}
                    </div>`;
        });

        html += `</div></div>`;
    }

    html += '</div>';
    container.innerHTML = html;
};

/** 渲染子題區塊 */
const renderSubQuestionBlock = (sq, idx) => {
    const labels = ['A', 'B', 'C', 'D'];
    let html = `
        <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm" data-sub-index="${idx}">
            <div class="flex items-center justify-between mb-3">
                <span class="text-sm font-bold text-[var(--color-morandi)]">第 ${idx + 1} 題</span>
                <button onclick="removeSubQuestion(${idx})" class="text-xs text-red-400 hover:text-red-600 transition-colors cursor-pointer">
                    <i class="fa-solid fa-trash-can mr-0.5"></i> 刪除
                </button>
            </div>
            <div class="mb-3">
                <input type="text" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--color-morandi)]"
                    data-sub-stem="${idx}" value="${escapeHtml(sq.stem || '')}" placeholder="輸入子題題幹...">
            </div>
            <div class="grid grid-cols-2 gap-2 mb-3">`;

    labels.forEach((label, i) => {
        const optText = sq.options?.[i]?.text || '';
        html += `
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-gray-400">(${label})</span>
                    <input type="text" class="flex-grow px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[var(--color-morandi)]"
                        data-sub-option="${idx}-${i}" value="${escapeHtml(optText)}" placeholder="選項${label}">
                </div>`;
    });

    html += `
            </div>
            <div class="flex items-center gap-2">
                <span class="text-xs text-gray-500">正確答案：</span>
                <select class="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[var(--color-morandi)] bg-white cursor-pointer" data-sub-answer="${idx}">
                    <option value="">請選擇</option>
                    ${labels.map(l => `<option value="${l}" ${sq.answer === l ? 'selected' : ''}>${l}</option>`).join('')}
                </select>
            </div>
        </div>`;

    return html;
};

/** 新增子題 */
const addSubQuestion = () => {
    const container = document.getElementById('subQuestionsContainer');
    if (!container) return;
    const currentCount = container.children.length;
    const newSq = {
        stem: '', answer: '',
        options: [{ label: 'A', text: '' }, { label: 'B', text: '' }, { label: 'C', text: '' }, { label: 'D', text: '' }]
    };
    container.insertAdjacentHTML('beforeend', renderSubQuestionBlock(newSq, currentCount));
};

/** 刪除子題 */
const removeSubQuestion = (idx) => {
    const container = document.getElementById('subQuestionsContainer');
    if (!container || container.children.length <= 1) {
        Swal.fire({ icon: 'warning', title: '至少需保留一道子題', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        return;
    }
    container.children[idx]?.remove();
    // 重新編號
    Array.from(container.children).forEach((el, i) => {
        el.querySelector('.text-sm.font-bold').textContent = `第 ${i + 1} 題`;
    });
};

/** 禁用所有表單輸入 (檢視模式) */
const disableFormInputs = () => {
    const formArea = document.getElementById('formPanel');
    formArea.querySelectorAll('input, select, textarea').forEach(el => {
        el.disabled = true;
        el.classList.add('opacity-60', 'cursor-not-allowed');
    });
    formArea.querySelectorAll('.editable-field').forEach(el => {
        el.style.pointerEvents = 'none';
        el.classList.add('opacity-60');
    });
    formArea.querySelectorAll('button').forEach(btn => {
        if (!['formBackBtn', 'formPreviewBtn', 'previewCloseBtn'].includes(btn.id) && !btn.closest('#formPanel > div:first-child')) {
            // 只保留返回和預覽按鈕可用
        }
    });
};


// ===================================================================
// 表單資料收集與儲存
// ===================================================================

/** 從表單收集當前資料 */
const collectFormData = () => {
    const type = document.getElementById('formType').value;
    const level = document.getElementById('formLevel').value;
    const difficulty = document.getElementById('formDifficulty').value;
    const isGroup = ['readGroup', 'shortGroup', 'listenGroup'].includes(type);

    const data = { type, level, difficulty };

    // 收集 editable field 內容
    document.querySelectorAll('#formEditorArea .editable-field').forEach(el => {
        const field = el.getAttribute('data-field');
        if (field) data[field] = el.innerHTML;
    });

    // 收集選項 (非題組型)
    if (!isGroup) {
        const options = [];
        document.querySelectorAll('#formOptionsContainer input[data-option-index]').forEach(input => {
            options.push({
                label: input.getAttribute('data-option-label'),
                text: input.value
            });
        });
        data.options = options;

        // 收集正確答案
        const checkedRadio = document.querySelector('input[name="formAnswer"]:checked');
        data.answer = checkedRadio ? checkedRadio.value : '';
    }

    // 收集子題 (題組型)
    if (isGroup) {
        const subQuestions = [];
        document.querySelectorAll('#subQuestionsContainer > div').forEach((block, idx) => {
            const stemInput = block.querySelector(`input[data-sub-stem="${idx}"]`);
            const answerSelect = block.querySelector(`select[data-sub-answer="${idx}"]`);
            const opts = [];
            ['A', 'B', 'C', 'D'].forEach((label, i) => {
                const optInput = block.querySelector(`input[data-sub-option="${idx}-${i}"]`);
                opts.push({ label, text: optInput?.value || '' });
            });
            subQuestions.push({
                stem: stemInput?.value || '',
                options: opts,
                answer: answerSelect?.value || ''
            });
        });
        data.subQuestions = subQuestions;
    }

    // 修題回覆
    if (formMode === 'revision') {
        data.revisionReply = document.getElementById('revisionReplyInput')?.value || '';
    }

    return data;
};

/** 存為草稿 */
const saveAsDraft = () => {
    const data = collectFormData();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

    if (currentEditingQuestion) {
        // 更新現有題目
        Object.assign(currentEditingQuestion, data);
        currentEditingQuestion.updatedAt = now;
        if (formMode === 'revision') {
            currentEditingQuestion.revisionReply = data.revisionReply;
        }
    } else {
        // 新增題目
        const newId = `Q-2602-M${String(myQuestionsDb.length + 100).padStart(3, '0')}`;
        const newQ = {
            id: newId,
            projectId: localStorage.getItem('cwt_current_project') || 'P2026-01',
            ...data,
            status: 'draft',
            passage: data.passage || '',
            createdAt: now, updatedAt: now,
            returnCount: 0, reviewComment: null, reviewerName: null, reviewStage: null, revisionReply: '',
            history: [{ time: now, user: '劉雅婷', action: '建立草稿', comment: '' }]
        };
        myQuestionsDb.push(newQ);
    }

    renderTabContent();
    showAutoSaveToast();
};

/** 命題完成 / 完成修題 */
const handleFormSubmit = () => {
    const data = collectFormData();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

    // 基本驗證
    if (!data.level || !data.difficulty) {
        Swal.fire({ icon: 'warning', title: '請填寫完整', text: '等級與難易度為必填欄位。' });
        return;
    }

    if (formMode === 'revision') {
        // 修題完成
        if (!data.revisionReply?.trim()) {
            Swal.fire({ icon: 'warning', title: '請填寫修題回覆', text: '請說明本次修改的內容。' });
            return;
        }

        Object.assign(currentEditingQuestion, data);
        currentEditingQuestion.updatedAt = now;
        currentEditingQuestion.revisionReply = data.revisionReply;

        // 修題完成後，狀態改為下一階段
        // peer_editing → pending (回到待審)
        // expert_editing → pending
        // final_editing → pending
        currentEditingQuestion.status = 'pending';
        currentEditingQuestion.history.push({
            time: now, user: '劉雅婷', action: '修題回覆',
            comment: data.revisionReply
        });

        Swal.fire({
            icon: 'success', title: '修題完成',
            text: '已提交修題回覆，試題將進入下一階段審查。',
            toast: true, position: 'top-end', showConfirmButton: false, timer: 2500, timerProgressBar: true
        });
    } else {
        // 命題完成
        if (currentEditingQuestion) {
            Object.assign(currentEditingQuestion, data);
            currentEditingQuestion.status = 'completed';
            currentEditingQuestion.updatedAt = now;
            currentEditingQuestion.history.push({
                time: now, user: '劉雅婷', action: '命題完成', comment: ''
            });
        } else {
            const newId = `Q-2602-M${String(myQuestionsDb.length + 100).padStart(3, '0')}`;
            const newQ = {
                id: newId,
                projectId: localStorage.getItem('cwt_current_project') || 'P2026-01',
                ...data,
                status: 'completed',
                passage: data.passage || '',
                createdAt: now, updatedAt: now,
                returnCount: 0, reviewComment: null, reviewerName: null, reviewStage: null, revisionReply: '',
                history: [
                    { time: now, user: '劉雅婷', action: '建立草稿', comment: '' },
                    { time: now, user: '劉雅婷', action: '命題完成', comment: '' }
                ]
            };
            myQuestionsDb.push(newQ);
        }

        Swal.fire({
            icon: 'success', title: '命題完成',
            text: '試題已儲存為「命題完成」狀態，可隨時送審。',
            toast: true, position: 'top-end', showConfirmButton: false, timer: 2500, timerProgressBar: true
        });
    }

    closeFormModal();
    renderTabContent();
};

/** 送審 */
const submitQuestion = (questionId) => {
    const q = myQuestionsDb.find(q => q.id === questionId);
    if (!q) return;

    if (q.status === 'draft') {
        Swal.fire({ icon: 'warning', title: '尚未命題完成', text: '請先完成命題後再送審。' });
        return;
    }

    Swal.fire({
        title: '確認送審？',
        text: `將「${q.id}」送出審查，送審後將無法再編輯。`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#8EAB94',
        cancelButtonColor: '#9ca3af',
        confirmButtonText: '確認送審',
        cancelButtonText: '取消'
    }).then((result) => {
        if (result.isConfirmed) {
            const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
            q.status = 'pending';
            q.updatedAt = now;
            q.history.push({ time: now, user: '劉雅婷', action: '送審', comment: '' });

            Swal.fire({
                icon: 'success', title: '已送審',
                toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, timerProgressBar: true
            });

            renderTabContent();
        }
    });
};


// ===================================================================
// Quill 底部滑入式編輯器
// ===================================================================
const initQuillEditor = () => {
    quillInstance = new Quill('#quillEditorContainer', {
        theme: 'snow',
        placeholder: '在此輸入內容...',
        modules: {
            toolbar: {
                container: [
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'header': [1, 2, 3, false] }],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                    ['blockquote'],
                    ['image'],   // 圖片上傳按鈕
                    ['clean']
                ],
                handlers: {
                    /** 自訂圖片上傳：觸發 file input 讀取為 Base64 嵌入 */
                    image: function () {
                        const input = document.createElement('input');
                        input.setAttribute('type', 'file');
                        input.setAttribute('accept', 'image/png, image/jpeg, image/gif, image/webp');
                        input.click();
                        input.onchange = () => {
                            const file = input.files?.[0];
                            if (!file) return;
                            // 限制 5 MB
                            if (file.size > 5 * 1024 * 1024) {
                                Swal.fire({ icon: 'warning', title: '圖片過大', text: '請上傳 5 MB 以內的圖片。' });
                                return;
                            }
                            const reader = new FileReader();
                            reader.onload = (e) => {
                                const range = quillInstance.getSelection(true);
                                quillInstance.insertEmbed(range.index, 'image', e.target.result);
                                quillInstance.setSelection(range.index + 1);
                            };
                            reader.readAsDataURL(file);
                        };
                    }
                }
            }
        }
    });

    // 中文標點按鈕事件（含括弧配對插入邏輯）
    document.querySelectorAll('.punct-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const char = btn.getAttribute('data-char');
            const isPair = btn.hasAttribute('data-pair'); // 括弧類：「」『』（）
            if (char && quillInstance) {
                const range = quillInstance.getSelection(true);
                quillInstance.insertText(range.index, char);
                if (isPair) {
                    // 括弧配對：左右同時插入，游標自動移到中間
                    quillInstance.setSelection(range.index + 1);
                } else {
                    quillInstance.setSelection(range.index + char.length);
                }
            }
        });
    });

    // 收起按鈕
    document.getElementById('quillCloseBtn').addEventListener('click', closeQuillEditor);

    // 監聽 Quill 內容變化，即時同步回欄位
    quillInstance.on('text-change', () => {
        if (activeEditableField && activeFieldKey) {
            const html = quillInstance.root.innerHTML;
            activeEditableField.innerHTML = html;
        }
    });
};

/** 啟動 Quill 編輯特定欄位 */
const activateQuillField = (element, fieldKey, label) => {
    if (formMode === 'view') return;

    // 移除前一個欄位的 editing 樣式
    if (activeEditableField) {
        activeEditableField.classList.remove('editing');
    }

    activeEditableField = element;
    activeFieldKey = fieldKey;

    // 加上 editing 樣式
    element.classList.add('editing');

    // 更新 Quill 編輯器內容
    const currentHtml = element.innerHTML;
    // 如果是佔位文字，清空
    const isPlaceholder = element.querySelector('.text-gray-400.italic');
    quillInstance.root.innerHTML = isPlaceholder ? '' : currentHtml;

    // 更新標籤
    document.getElementById('quillTargetLabel').textContent = label;

    // 滑出編輯器
    const panel = document.getElementById('quillPanel');
    panel.classList.remove('translate-y-full');
    panel.classList.add('translate-y-0');

    // 聚焦 Quill
    quillInstance.focus();
};

/** 關閉 Quill 編輯器 */
const closeQuillEditor = () => {
    const panel = document.getElementById('quillPanel');
    panel.classList.remove('translate-y-0');
    panel.classList.add('translate-y-full');

    if (activeEditableField) {
        activeEditableField.classList.remove('editing');
    }
    activeEditableField = null;
    activeFieldKey = null;
};


// ===================================================================
// 預覽 Modal (考卷樣式)
// ===================================================================
const initPreviewModal = () => {
    document.getElementById('previewCloseBtn').addEventListener('click', closePreviewModal);
    document.getElementById('previewBackdrop').addEventListener('click', closePreviewModal);
};

const showExamPreview = () => {
    const data = collectFormData();
    const content = document.getElementById('previewContent');
    const isGroup = ['readGroup', 'shortGroup', 'listenGroup'].includes(data.type);

    let html = `
        <div class="font-serif max-w-2xl mx-auto">
            <div class="text-center mb-6 pb-4 border-b-2 border-gray-800">
                <h2 class="text-xl font-bold mb-1">全民中文檢定 - 模擬試卷</h2>
                <p class="text-sm text-gray-500">${qTypeMap[data.type]} ・ ${data.level} ・ 難度：${diffMap[data.difficulty] || '--'}</p>
            </div>`;

    if (data.passage) {
        html += `<div class="mb-6 p-4 bg-gray-50 border border-gray-200 rounded leading-relaxed text-sm">${data.passage}</div>`;
    }

    if (isGroup && data.subQuestions) {
        data.subQuestions.forEach((sq, i) => {
            html += `
                <div class="mb-6">
                    <p class="font-bold mb-2">${i + 1}. ${sq.stem || '(題幹尚未填寫)'}</p>
                    <div class="ml-4 space-y-1 text-sm">
                        ${sq.options?.map(o => `<p>(${o.label}) ${o.text || '____'}</p>`).join('') || ''}
                    </div>
                </div>`;
        });
    } else {
        html += `
            <div class="mb-6">
                <p class="font-bold mb-3 leading-relaxed">${stripHtml(data.stem || '(題幹尚未填寫)')}</p>
                <div class="ml-4 space-y-2 text-sm">
                    ${data.options?.map(o => `<p>(${o.label}) ${o.text || '____'}</p>`).join('') || ''}
                </div>
            </div>`;
    }

    html += '</div>';
    content.innerHTML = html;

    document.getElementById('previewModal').classList.remove('hidden');
};

const closePreviewModal = () => {
    document.getElementById('previewModal').classList.add('hidden');
};


// ===================================================================
// 工具函式
// ===================================================================

/** 去除 HTML 標籤 */
const stripHtml = (html) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
};

/** 截斷文字 */
const truncate = (text, maxLen) => {
    if (!text) return '';
    return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
};

/** HTML 轉義 */
const escapeHtml = (str) => {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

/** 自動儲存 Toast */
const showAutoSaveToast = () => {
    const indicator = document.getElementById('autosaveIndicator');
    if (indicator) {
        indicator.classList.remove('hidden');
        indicator.classList.add('autosave-flash');
        setTimeout(() => {
            indicator.classList.add('hidden');
            indicator.classList.remove('autosave-flash');
        }, 2200);
    }
};

// 讓函式可在 HTML onclick 中使用 (全域掛載)
window.openFormModal = openFormModal;
window.submitQuestion = submitQuestion;
window.activateQuillField = activateQuillField;
window.addSubQuestion = addSubQuestion;
window.removeSubQuestion = removeSubQuestion;
