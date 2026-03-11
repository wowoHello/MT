/**
 * Shared Application Module
 * 負責跨頁面共用的組件邏輯：身份驗證、Top Navbar、專案切換器、本地儲存資料模擬。
 * Version: 1.0 (DEMO)
 */

// 假資料：梯次 (專案) 列表
const mockProjects = [
    { id: 'P2026-01', name: '115年度 春季全民中檢', status: 'active', year: '115' },
    { id: 'P2026-02', name: '115年度 秋季全民中檢', status: 'preparing', year: '115' },
    { id: 'P2025-02', name: '114年度 秋季全民中檢', status: 'closed', year: '114' },
    { id: 'P2025-01', name: '114年度 春季全民中檢', status: 'closed', year: '114' }
];

document.addEventListener('DOMContentLoaded', () => {
    // 檢查是否有登入，若無則重導向回登入頁面
    checkAuth();

    // 佈署 Navbar (如果頁面上有占位符號)
    initNavbar();

    // 佈署共用字體縮放
    injectGlobalFontController();
});

/**
 * 檢查會員是否登入
 */
function checkAuth() {
    const user = localStorage.getItem('cwt_user');
    // 如果沒有使用者且當前不在 index.html 就強制跳轉
    if (!user && !window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
        window.location.replace('index.html');
    }
}

/**
 * 初始化 Navbar 與專案切換器
 */
function initNavbar() {
    const userStr = localStorage.getItem('cwt_user');
    if (!userStr) return;
    const user = JSON.parse(userStr);

    // 取得或設定當前專案
    let currentProjectId = localStorage.getItem('cwt_current_project');
    if (!currentProjectId && mockProjects.length > 0) {
        currentProjectId = mockProjects[0].id;
        localStorage.setItem('cwt_current_project', currentProjectId);
    }

    const currentProject = mockProjects.find(p => p.id === currentProjectId) || mockProjects[0];

    // --- 動態注入 Navbar 結構 ---
    // (為了 DEMO 方便統一管理，這裡使用 JS 注入，實體開發可使用 Blazor Component)
    const navbarContainer = document.getElementById('navbar-container');
    if (navbarContainer) {
        navbarContainer.innerHTML = `
            <nav class="bg-white border-b border-gray-200 shadow-sm fixed top-0 w-full z-40 h-16 transition-all">
                <div class="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 h-full">
                    <div class="flex justify-between items-center h-full gap-4">
                        
                        <!-- Left: Logo & Brand -->
                        <div class="flex-shrink-0 flex items-center lg:w-1/4">
                            <a href="firstpage.html" class="flex items-center gap-2 text-[var(--color-slate-main)] hover:text-[var(--color-morandi)] transition-colors">
                                <div class="w-8 h-8 bg-[var(--color-morandi)]/10 rounded-md flex items-center justify-center overflow-hidden">
                                    <img src="./assets/images/pencil.png" alt="CWT Logo" class="w-6 h-6 object-contain">
                                </div>
                                <span class="font-bold text-lg hidden sm:block tracking-wide">CWT 命題工作平臺</span>
                            </a>
                        </div>
                        
                        <!-- Center: Project Switcher -->
                        <div class="flex-grow flex justify-center items-center relative lg:w-2/4">
                            <button id="projectSelectorBtn" class="flex items-center justify-center gap-2 px-4 py-1.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 rounded-full transition-all cursor-pointer focus:outline-none min-w-[200px] sm:min-w-[280px]">
                                <span class="bg-[var(--color-morandi)] text-white text-xs px-2 py-0.5 rounded-full mr-1">${currentProject.year}年度</span>
                                <span class="font-semibold text-[var(--color-slate-main)] truncate max-w-[150px] sm:max-w-[200px]" id="currentProjectName">${currentProject.name}</span>
                                <i class="fa-solid fa-chevron-down text-gray-400 text-xs mt-0.5 ml-1 transition-transform" id="projectSelectorIcon"></i>
                            </button>
                            
                            <!-- Dropdown Menu -->
                            <div id="projectDropdown" class="hidden absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-[320px] bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                                <div class="p-3 border-b border-gray-100 bg-gray-50/50">
                                    <div class="relative">
                                        <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-gray-400 text-sm"></i>
                                        <input type="text" id="projectSearchInput" class="w-full pl-8 pr-3 py-1.5 text-sm border-gray-300 rounded-lg focus:ring-[var(--color-morandi)] focus:border-[var(--color-morandi)]" placeholder="搜尋專案梯次...">
                                    </div>
                                </div>
                                <div class="max-h-[60vh] overflow-y-auto" id="projectListContainer">
                                    <!-- List injected by JS -->
                                </div>
                            </div>
                        </div>

                        <!-- Right: User Info & Actions -->
                        <div class="flex-shrink-0 flex items-center justify-end gap-3 lg:w-1/4">
                            <div class="flex items-center gap-2 relative group cursor-pointer">
                                <div class="w-8 h-8 rounded-full bg-[var(--color-sage)] text-white flex items-center justify-center font-bold text-sm">
                                    ${user.name.charAt(0)}
                                </div>
                                <div class="hidden md:block text-sm text-right">
                                    <div class="font-bold text-[var(--color-slate-main)] leading-none">${user.name}</div>
                                </div>
                                
                                <!-- User Dropdown -->
                                <div class="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                    <div class="py-1">
                                        <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[var(--color-morandi)]"><i class="fa-solid fa-user-pen w-5 text-center mr-1"></i> 個人設定</a>
                                        <div class="border-t border-gray-100 my-1"></div>
                                        <button onclick="logout()" class="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-red-50"><i class="fa-solid fa-arrow-right-from-bracket w-5 text-center mr-1"></i> 登出系統</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                    </div>
                </div>
            </nav>
            <!-- Spacer to prevent content from hiding under fixed navbar -->
            <div class="h-16 w-full shrink-0"></div>
        `;

        initProjectSwitcher();
    }
}

/**
 * 處理專案(梯次)切換器的展開、搜尋與點擊邏輯
 */
function initProjectSwitcher() {
    const btn = document.getElementById('projectSelectorBtn');
    const icon = document.getElementById('projectSelectorIcon');
    const dropdown = document.getElementById('projectDropdown');
    const searchInput = document.getElementById('projectSearchInput');
    const listContainer = document.getElementById('projectListContainer');

    // 從 localStorage 判斷身分 (DEMO 邏輯：ADMIN 看全部，TEACHER 為了展示只篩選一部分，這裡暫時全顯示)
    // const user = JSON.parse(localStorage.getItem('cwt_user'));
    let filteredProjects = [...mockProjects];

    const renderList = (searchQuery = '') => {
        let currentSel = localStorage.getItem('cwt_current_project');
        listContainer.innerHTML = '';

        let groups = {
            'active': { label: '進行中 (包含準備中)', items: [] },
            'closed': { label: '已結案 (歷史專案)', items: [] }
        };

        filteredProjects.forEach(p => {
            if (searchQuery && !p.name.includes(searchQuery) && !p.year.includes(searchQuery)) return;

            let groupKey = p.status === 'closed' ? 'closed' : 'active';
            groups[groupKey].items.push(p);
        });

        let html = '';
        Object.keys(groups).forEach(key => {
            const group = groups[key];
            if (group.items.length === 0) return;

            html += `<div class="px-3 py-1 bg-gray-100 border-y border-gray-200 text-xs font-bold text-gray-500">${group.label}</div>`;

            group.items.forEach(p => {
                const isSelected = p.id === currentSel;
                html += `
                    <button class="project-item w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--color-morandi)]/5 focus:bg-[var(--color-morandi)]/10 border-b border-gray-50 last:border-0 flex items-center justify-between transition-colors ${isSelected ? 'bg-blue-50/50' : ''}" data-id="${p.id}">
                        <div class="flex flex-col">
                            <span class="${isSelected ? 'text-[var(--color-morandi)] font-bold' : 'text-gray-700 font-medium'}">${p.name}</span>
                            <span class="text-[10px] text-gray-400">ID: ${p.id}</span>
                        </div>
                        ${isSelected ? '<i class="fa-solid fa-check text-[var(--color-morandi)]"></i>' : ''}
                    </button>
                `;
            });
        });

        if (html === '') {
            html = '<div class="p-4 text-center text-sm text-gray-500">查無相符專案</div>';
        }

        listContainer.innerHTML = html;

        // Bind click events
        document.querySelectorAll('.project-item').forEach(el => {
            el.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                selectProject(id);
                closeDropdown();
            });
        });
    };

    const closeDropdown = () => {
        dropdown.classList.add('hidden');
        icon.classList.remove('rotate-180');
    };

    const toggleDropdown = (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
        icon.classList.toggle('rotate-180');
        if (!dropdown.classList.contains('hidden')) {
            renderList(searchInput.value);
            searchInput.focus();
        }
    };

    btn.addEventListener('click', toggleDropdown);
    dropdown.addEventListener('click', e => e.stopPropagation()); // 防止點擊內部關閉

    // 點擊外部關閉
    document.addEventListener('click', () => {
        if (!dropdown.classList.contains('hidden')) {
            closeDropdown();
        }
    });

    // 搜尋過濾
    searchInput.addEventListener('input', (e) => {
        renderList(e.target.value);
    });
}

function selectProject(id) {
    localStorage.setItem('cwt_current_project', id);
    const proj = mockProjects.find(p => p.id === id);
    if (proj) {
        document.getElementById('currentProjectName').textContent = proj.name;
        // 發送自訂事件讓其他頁面知道專案已切換，進行資料的重新撈取
        const event = new CustomEvent('projectChanged', { detail: proj });
        document.dispatchEvent(event);

        Swal.fire({
            icon: 'info',
            title: '已切換梯次',
            text: `目前工作專案：${proj.name}`,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
        });
    }
}

/**
 * 共用登出邏輯
 */
function logout() {
    Swal.fire({
        title: '確認登出?',
        text: "您將被引導回登入畫面。",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#6B8EAD',
        cancelButtonColor: '#d33',
        confirmButtonText: '是的，登出',
        cancelButtonText: '取消'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('cwt_user');
            // 我們保留 cwt_current_project 以便下次登入有記憶
            window.location.replace('index.html');
        }
    });
}

/**
 * 注入全域字體縮放控制器 HTML
 */
function injectGlobalFontController() {
    // 如果已經存在就不要重複注入
    if (document.getElementById('cwtFontController')) return;

    const controllerHtml = `
        <!-- Font Size Controller (Shared) -->
        <div id="cwtFontController" class="fixed bottom-6 right-6 z-[9999] flex items-center group">
            <!-- 展開後的按鈕群 (預設隱藏且寬度為 0) -->
            <div id="fontActionGroup" class="flex items-center gap-2 bg-white/95 backdrop-blur border border-gray-200 p-1.5 rounded-full shadow-xl mr-2 max-w-0 opacity-0 overflow-hidden transition-all duration-300 ease-out group-hover:max-w-xs group-hover:opacity-100 group-hover:px-2">
                <button id="fontDecreaseBtn" class="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-[var(--color-morandi)] transition-colors focus:outline-none" title="縮小字體 (A-)">
                    <i class="fa-solid fa-minus text-[10px]"></i><span class="text-xs ml-0.5 font-bold" style="letter-spacing:-1px;">A</span>
                </button>
                <button id="fontResetBtn" class="w-8 h-8 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 hover:text-[var(--color-morandi)] transition-colors text-xs font-bold focus:outline-none" title="恢復預設 (100%)">
                    A
                </button>
                <button id="fontIncreaseBtn" class="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-[var(--color-morandi)] transition-colors focus:outline-none" title="放大字體 (A+)">
                    <i class="fa-solid fa-plus text-[10px]"></i><span class="text-xs ml-0.5 font-bold" style="letter-spacing:-1px;">A</span>
                </button>
            </div>
            
            <!-- 主要觸發按鈕 (A) -->
            <button id="fontToggleMain" class="w-12 h-12 rounded-full bg-white/80 backdrop-blur border border-gray-200 shadow-lg flex items-center justify-center text-[var(--color-morandi)] hover:bg-white hover:shadow-xl transition-all duration-300 focus:outline-none z-10">
                <i class="fa-solid fa-font text-lg"></i>
            </button>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', controllerHtml);
    initGlobalFontSizeLogic();
}

/**
 * 全域字體縮放控制器互動邏輯
 */
function initGlobalFontSizeLogic() {
    const root = document.documentElement;
    let currentScale = parseFloat(localStorage.getItem('cwt_font_scale')) || 100;

    // 初始化套用 scale
    const applyScale = (scale) => {
        if (scale < 90) scale = 90;
        if (scale > 130) scale = 130;
        root.style.fontSize = `${scale}%`;
        localStorage.setItem('cwt_font_scale', scale);
        currentScale = scale;

        // 更新按鈕狀態 (簡單標示當前是否為預設)
        const resetBtn = document.getElementById('fontResetBtn');
        if (resetBtn) {
            if (scale === 100) {
                resetBtn.classList.add('bg-[var(--color-morandi)]/10', 'text-[var(--color-morandi)]');
            } else {
                resetBtn.classList.remove('bg-[var(--color-morandi)]/10', 'text-[var(--color-morandi)]');
            }
        }
    };

    applyScale(currentScale);

    // 綁定按鈕事件
    const incBtn = document.getElementById('fontIncreaseBtn');
    const decBtn = document.getElementById('fontDecreaseBtn');
    const resetBtn = document.getElementById('fontResetBtn');

    if (incBtn) incBtn.addEventListener('click', (e) => { e.stopPropagation(); applyScale(currentScale + 5); });
    if (decBtn) decBtn.addEventListener('click', (e) => { e.stopPropagation(); applyScale(currentScale - 5); });
    if (resetBtn) resetBtn.addEventListener('click', (e) => { e.stopPropagation(); applyScale(100); });
}

