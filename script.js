document.addEventListener('DOMContentLoaded', () => {
    const itemInput = document.getElementById('item-input');
    const addBtn = document.getElementById('add-btn');
    const vegetablePool = document.getElementById('vegetable-pool');
    const dailySelection = document.getElementById('daily-selection');
    const currentDayName = document.getElementById('current-day-name');
    const clearMenuBtn = document.getElementById('clear-menu');
    const toast = document.getElementById('toast');
    const homePage = document.getElementById('home-page');
    const poolPage = document.getElementById('pool-page');
    const goToPoolBtn = document.getElementById('go-to-pool');
    const backToHomeBtn = document.getElementById('back-to-home');
    const finishPickingBtn = document.getElementById('finish-picking');
    const calendarTitle = document.getElementById('calendar-title');
    const calendarGrid = document.getElementById('calendar-grid');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const pickingDateSpan = document.getElementById('picking-date');

    let currentViewDate = new Date(); // 目前月曆顯示的月份
    let selectedDateStr = formatDate(new Date()); // 目前選取的日期

    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // View Switching Logic
    function switchView(view) {
        if (view === 'pool') {
            homePage.classList.add('hidden');
            poolPage.classList.remove('hidden');
            pickingDateSpan.textContent = selectedDateStr;
            renderPool();
        } else {
            poolPage.classList.add('hidden');
            homePage.classList.remove('hidden');
            renderCalendar();
            renderDailyMenu();
        }
    }

    // ----------------------------------------------------------------
    // 資料結構
    // items：食材庫（全域共用），每筆 { id, text }
    // dailyMenus：每日紀錄，key 為日期字串，value 為食材【文字】陣列
    //   => 與食材庫完全獨立，刪除食材庫不影響歷史紀錄
    // ----------------------------------------------------------------
    let items = JSON.parse(localStorage.getItem('vegPool')) || [
        { id: '1', text: '青江菜' },
        { id: '2', text: '大白菜' },
        { id: '3', text: '胡蘿蔔' },
        { id: '4', text: '高麗菜' }
    ];

    // dailyMenus[dateStr] = ['青江菜', '胡蘿蔔', ...]  (存文字，非 ID)
    let dailyMenus = JSON.parse(localStorage.getItem('dailyMenus')) || {};

    // --- 舊資料相容性升級 ---
    // 若舊格式仍以 ID 儲存（全為數字字串），自動轉換為文字
    (function migrateLegacyData() {
        let needSave = false;
        for (let date in dailyMenus) {
            const arr = dailyMenus[date];
            if (arr.length === 0) continue;
            // 判斷是否為 ID 格式（純數字字串）
            const looksLikeIds = arr.every(v => /^\d+$/.test(v));
            if (looksLikeIds) {
                dailyMenus[date] = arr
                    .map(id => {
                        const found = items.find(i => i.id === id);
                        return found ? found.text : null;
                    })
                    .filter(Boolean);
                needSave = true;
            }
        }
        if (needSave) {
            localStorage.setItem('dailyMenus', JSON.stringify(dailyMenus));
        }
    })();

    function saveData() {
        localStorage.setItem('vegPool', JSON.stringify(items));
        localStorage.setItem('dailyMenus', JSON.stringify(dailyMenus));
        updateSummary();
    }

    function updateSummary() {
        const countBadge = document.getElementById('items-count');
        if (countBadge) countBadge.textContent = items.length;
    }

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    }

    function renderCalendar() {
        calendarGrid.innerHTML = '';
        const year = currentViewDate.getFullYear();
        const month = currentViewDate.getMonth();

        calendarTitle.textContent = `${year}年 ${month + 1}月`;

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const lastDayOfPrevMonth = new Date(year, month, 0).getDate();

        // 填充前一個月的尾巴
        for (let i = firstDayOfMonth - 1; i >= 0; i--) {
            createDayElement(lastDayOfPrevMonth - i, true);
        }

        // 填充當月
        for (let i = 1; i <= daysInMonth; i++) {
            createDayElement(i, false);
        }

        // 填充下一個月的開頭 (補滿 42 格確保排版整齊)
        const totalSquares = calendarGrid.children.length;
        const remainingSquares = 42 - totalSquares;
        for (let i = 1; i <= remainingSquares; i++) {
            createDayElement(i, true);
        }
    }

    function createDayElement(day, isNotCurrentMonth) {
        const div = document.createElement('div');
        div.className = 'cal-day';
        if (isNotCurrentMonth) div.classList.add('not-current');

        if (isNotCurrentMonth) {
            div.textContent = day;
            calendarGrid.appendChild(div);
            return;
        }

        const dateObj = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth(), day);
        const dateStr = formatDate(dateObj);
        div.textContent = day;

        // 今天標記
        if (dateStr === formatDate(new Date())) div.classList.add('today');

        // 目前選取標記
        if (dateStr === selectedDateStr) div.classList.add('active');

        // 是否有紀錄標記 (小點)
        if (dailyMenus[dateStr] && dailyMenus[dateStr].length > 0) {
            const dot = document.createElement('div');
            dot.className = 'dot';
            div.appendChild(dot);
        }

        div.addEventListener('click', () => {
            selectedDateStr = dateStr;
            currentDayName.textContent = dateStr;
            renderCalendar();
            renderDailyMenu();
        });

        calendarGrid.appendChild(div);
    }

    function renderPool() {
        vegetablePool.innerHTML = '';
        // 取得當日已記錄的食材文字清單
        const currentMenuTexts = dailyMenus[selectedDateStr] || [];

        items.forEach(item => {
            const isActive = currentMenuTexts.includes(item.text);
            const chip = document.createElement('div');
            chip.className = `v-chip ${isActive ? 'active' : ''}`;
            chip.innerHTML = `
                <div class="chip-checkbox">
                    ${isActive ? '✓' : ''}
                </div>
                <span class="chip-text">${item.text}</span>
                <span class="delete-x" title="從庫中刪除">×</span>
            `;

            chip.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-x')) {
                    deleteFromPool(item.id);
                    return;
                }
                toggleItemInMenu(item.text);
            });

            vegetablePool.appendChild(chip);
        });
        updateSummary();
    }

    function renderDailyMenu() {
        dailySelection.innerHTML = '';
        // 直接以文字陣列渲染，不依賴食材庫
        const currentMenuTexts = dailyMenus[selectedDateStr] || [];

        if (currentMenuTexts.length === 0) {
            dailySelection.innerHTML = '<div class="empty-state">目前紀錄空白。請點擊按鈕去挑選食材</div>';
            return;
        }

        currentMenuTexts.forEach(text => {
            const div = document.createElement('div');
            div.className = 'menu-item';
            div.innerHTML = `
                <span>${text}</span>
                <span class="remove-item" title="移除此項">×</span>
            `;

            div.querySelector('.remove-item').addEventListener('click', (e) => {
                e.stopPropagation();
                toggleItemInMenu(text);
            });

            dailySelection.appendChild(div);
        });
    }

    // ----------------------------------------------------------------
    // toggleItemInMenu：改為操作「文字」而非 ID
    // ----------------------------------------------------------------
    function toggleItemInMenu(itemText) {
        if (!dailyMenus[selectedDateStr]) {
            dailyMenus[selectedDateStr] = [];
        }

        const menu = dailyMenus[selectedDateStr];
        const index = menu.indexOf(itemText);

        if (index > -1) {
            menu.splice(index, 1);
        } else {
            menu.push(itemText);
        }

        saveData();
        renderPool();
        renderDailyMenu();
        renderCalendar();
    }

    // ----------------------------------------------------------------
    // deleteFromPool：僅從食材庫移除，完全不影響各日紀錄
    // ----------------------------------------------------------------
    function deleteFromPool(itemId) {
        if (!confirm('確定要從食材庫中永久移除嗎？\n\n已記錄在各天的紀錄不受影響。')) return;

        items = items.filter(i => i.id !== itemId);

        // 不再清除 dailyMenus，歷史紀錄保持完整
        saveData();
        renderPool();
        renderDailyMenu();
        renderCalendar();
        showToast('已從食材庫移除（歷史紀錄保留）');
    }

    function addItem() {
        const text = itemInput.value.trim();
        if (!text) return;

        const exists = items.some(i => i.text === text);
        if (exists) {
            showToast('這項食材已經在清單中了');
            return;
        }

        const newItem = {
            id: Date.now().toString(),
            text: text
        };

        items.push(newItem);
        itemInput.value = '';
        saveData();
        renderPool();
        showToast(`已新增 ${text}`);
    }

    // Event Listeners
    addBtn.addEventListener('click', addItem);
    itemInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addItem();
    });

    prevMonthBtn.addEventListener('click', () => {
        currentViewDate.setMonth(currentViewDate.getMonth() - 1);
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentViewDate.setMonth(currentViewDate.getMonth() + 1);
        renderCalendar();
    });

    clearMenuBtn.addEventListener('click', () => {
        if (confirm('確定要清空這天的記錄嗎？')) {
            dailyMenus[selectedDateStr] = [];
            saveData();
            renderPool();
            renderDailyMenu();
            renderCalendar();
            showToast('記錄已重設');
        }
    });

    // Navigation Listeners
    goToPoolBtn.addEventListener('click', () => switchView('pool'));
    backToHomeBtn.addEventListener('click', () => switchView('home'));
    finishPickingBtn.addEventListener('click', () => switchView('home'));

    // Initial Load
    currentDayName.textContent = selectedDateStr;
    renderCalendar();
    renderDailyMenu();
});
