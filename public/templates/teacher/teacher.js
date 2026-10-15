let styledPromptResolver = null;
let styledConfirmResolver = null;

function showTeacherNotification(message) {
    const container = document.getElementById("teacher-notifications");
    const text = String(message);
    const isError = /lỗi|thất bại|không thể|không hợp lệ|vui lòng|chặn|error|failed/i.test(text);
    const isSuccess = /thành công|đã lưu|đã xóa|đã khóa|đã mở khóa|đã cập nhật|đã duyệt/i.test(text);
    const notification = document.createElement("div");
    notification.className = `teacher-notification${isError ? " error" : isSuccess ? " success" : ""}`;
    notification.setAttribute("role", isError ? "alert" : "status");

    const icon = document.createElement("span");
    icon.className = "teacher-notification-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = isError ? "⚠️" : isSuccess ? "✓" : "ℹ️";

    const messageElement = document.createElement("span");
    messageElement.className = "teacher-notification-message";
    messageElement.textContent = text;

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "teacher-notification-close";
    closeButton.setAttribute("aria-label", "Đóng thông báo");
    closeButton.textContent = "×";
    closeButton.addEventListener("click", () => notification.remove());

    notification.append(icon, messageElement, closeButton);
    container.appendChild(notification);
    window.setTimeout(() => notification.remove(), 5000);
}

function showStyledConfirm(message) {
    if (styledConfirmResolver) closeStyledConfirm(false);

    const dialog = document.getElementById("confirm-dialog");
    document.getElementById("confirm-dialog-message").textContent = message;
    dialog.classList.add("show");
    requestAnimationFrame(() => document.getElementById("confirm-dialog-accept").focus());

    return new Promise(resolve => {
    styledConfirmResolver = resolve;
    });
}

function closeStyledConfirm(confirmed) {
    document.getElementById("confirm-dialog").classList.remove("show");
    if (!styledConfirmResolver) return;

    const resolve = styledConfirmResolver;
    styledConfirmResolver = null;
    resolve(confirmed);
}

function showStyledPrompt(message, defaultValue = "") {
    const dialog = document.getElementById("prompt-dialog");
    const input = document.getElementById("prompt-dialog-input");
    document.getElementById("prompt-dialog-message").textContent = message;
    input.value = defaultValue;
    dialog.classList.add("show");
    requestAnimationFrame(() => input.focus());

    return new Promise(resolve => {
    styledPromptResolver = resolve;
    });
}

function closeStyledPrompt(value) {
    const dialog = document.getElementById("prompt-dialog");
    dialog.classList.remove("show");
    if (!styledPromptResolver) return;

    const resolve = styledPromptResolver;
    styledPromptResolver = null;
    resolve(value);
}

function submitStyledPrompt(event) {
    event.preventDefault();
    closeStyledPrompt(document.getElementById("prompt-dialog-input").value);
}

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && styledPromptResolver) {
    closeStyledPrompt(null);
    }
    if (event.key === "Escape" && styledConfirmResolver) {
    closeStyledConfirm(false);
    }
});

/* BẬT / TẮT MENU BẢNG CHỌN TRÊN MOBILE */
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const overlay = document.getElementById('mobile-nav-overlay');
const adminSidebar = document.getElementById('admin-sidebar');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
    adminSidebar.classList.remove('collapsed');
    adminSidebar.classList.toggle('show-menu');
    overlay.classList.toggle('show');
    });
}

if (overlay) {
    overlay.addEventListener('click', () => {
    adminSidebar.classList.remove('show-menu');
    overlay.classList.remove('show');
    });
}

const user = checkAuth("teacher");
if (user) document.getElementById("teacher-name").textContent = user.fullName || user.username;

if (window.innerWidth <= 768) document.getElementById('admin-sidebar').classList.add('collapsed');

function toggleSidebar() {
    const sidebar = document.getElementById('admin-sidebar');
    const isCollapsing = !sidebar.classList.contains('collapsed');

    sidebar.getAnimations().forEach(animation => animation.cancel());
    sidebar.classList.toggle('collapsed', isCollapsing);

    sidebar.animate(
    isCollapsing
        ? [{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }]
        : [{ transform: 'translateX(-100%)' }, { transform: 'translateX(0)' }],
    {
        duration: 260,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
    }
    );
}

function toggleDropdownMenu(e) {
    e.stopPropagation();
    const list = document.getElementById('dropdown-list-items');
    list.classList.toggle('show');
}

window.addEventListener('click', () => {
    const list = document.getElementById('dropdown-list-items');
    if (list && list.classList.contains('show')) {
    list.classList.remove('show');
    }
    document.querySelectorAll('.action-dropdown-menu.show').forEach(m => m.classList.remove('show'));
});

function toggleActionDropdown(event, index) {
    event.stopPropagation();
    const currentMenu = document.getElementById(`action-menu-${index}`);
    const btn = event.currentTarget;
    
    document.querySelectorAll('.action-dropdown-menu.show').forEach(m => {
    if (m !== currentMenu) m.classList.remove('show');
    });

    if (currentMenu) {
    const isOpening = !currentMenu.classList.contains('show');
    
    if (isOpening) {
        const rect = btn.getBoundingClientRect();
        const menuWidth = 175;

        currentMenu.style.left = `${rect.right - menuWidth}px`;
        currentMenu.style.right = 'auto';
        currentMenu.style.bottom = 'auto';
        currentMenu.style.top = `${rect.bottom + 4}px`;

        currentMenu.classList.add('show');
    } else {
        currentMenu.classList.remove('show');
    }
    }
}

window.addEventListener('scroll', () => {
    document.querySelectorAll('.action-dropdown-menu.show').forEach(m => m.classList.remove('show'));
}, true);

function toggleBatchActionDropdown(event) {
    event.stopPropagation();
    const menu = document.getElementById('batch-action-menu');
    
    document.querySelectorAll('.action-dropdown-menu.show').forEach(m => {
    if (m !== menu) m.classList.remove('show');
    });

    if (!menu.classList.contains('show')) {
    menu.classList.add('show');
    } else {
    menu.classList.remove('show');
    }
}

function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (input.type === "password") {
    input.type = "text";
    btn.textContent = "🙈";
    } else {
    input.type = "password";
    btn.textContent = "👁️";
    }
}

function toggleCardBody(bodyId, iconId) {
    const bodyEl = document.getElementById(bodyId);
    const iconEl = document.getElementById(iconId);
    bodyEl.classList.toggle('collapsed');
    if (bodyEl.classList.contains('collapsed')) {
    iconEl.textContent = '▶';
    } else {
    iconEl.textContent = '▼';
    }
}

function formatNameInput(input) {
    const cursorPos = input.selectionStart;
    let words = input.value.split(" ");
    for (let i = 0; i < words.length; i++) {
    if (words[i].length > 0) {
        words[i] = words[i][0].toUpperCase() + words[i].slice(1);
    }
    }
    input.value = words.join(" ");
    if (cursorPos !== null) {
    input.setSelectionRange(cursorPos, cursorPos);
    }
}

function hasVietnameseTone(text) {
    if (!text || typeof text !== 'string') return false;
    const vnToneRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúúúụủũưừứựửữỳýỵỷỹđĐ]/i;
    return vnToneRegex.test(text);
}

function removeVietnameseTones(str) {
    if (!str) return "";
    return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function parseStudentFullName(rawFullName) {
    const words = rawFullName.trim().replace(/\s+/g, ' ').split(' ');
    if (words.length === 0 || words[0] === '') return null;

    let firstName = words[words.length - 1];
    let lastName = words.slice(0, words.length - 1).join(' ');

    if (words.length === 1) {
    firstName = words[0];
    lastName = "";
    }

    let middleInitial = "";
    if (words.length >= 2) {
    const middleWord = words[words.length - 2];
    const cleanMiddle = removeVietnameseTones(middleWord);
    middleInitial = cleanMiddle.charAt(0).toUpperCase();
    }

    const cleanFirstName = removeVietnameseTones(firstName).toLowerCase();
    const usernameBase = middleInitial ? `${middleInitial}${cleanFirstName}` : cleanFirstName;

    return {
    fullName: words.join(' '),
    lastName,
    firstName,
    usernameBase
    };
}

/* QUẢN LÝ DANH SÁCH TẠO HÀNG LOẠT (BATCH CREATE) */
let batchStudentsList = [];

const batchFullnameInput = document.getElementById("batch-fullname-input");
const batchCoinInput = document.getElementById("batch-coin-input");

batchFullnameInput.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
    e.preventDefault();
    if (batchFullnameInput.value.trim() !== "") {
        addStudentToBatchList();
    }
    } else if (e.key === "Enter") {
    e.preventDefault();
    if (batchFullnameInput.value.trim() !== "") {
        addStudentToBatchList();
    }
    executeBatchCreateStudents();
    }
});

batchCoinInput.addEventListener("keydown", (e) => {
    if (e.key === "Tab" || e.key === "Enter") {
    e.preventDefault();
    if (batchFullnameInput.value.trim() !== "") {
        addStudentToBatchList();
    }
    }
});

function toggleBatchCoinInput() {
    const wrapper = document.getElementById("batch-coin-input-wrapper");
    const coinInput = document.getElementById("batch-coin-input");
    const btn = document.getElementById("btn-toggle-batch-coin");

    if (wrapper.style.display === "none" || wrapper.style.display === "") {
    wrapper.style.display = "block";
    coinInput.focus();
    btn.textContent = "✕ Đóng";
    btn.style.background = "#fee2e2";
    btn.style.color = "#991b1b";
    btn.style.borderColor = "#fca5a5";
    } else {
    wrapper.style.display = "none";
    coinInput.value = "";
    btn.textContent = "🪙 Điều chỉnh";
    btn.style.background = "#fef08a";
    btn.style.color = "#854d0e";
    btn.style.borderColor = "#fde047";
    document.getElementById("batch-fullname-input").focus();
    }
}

function addStudentToBatchList() {
    const nameInput = document.getElementById("batch-fullname-input");
    const coinInput = document.getElementById("batch-coin-input");
    const rawName = nameInput.value.trim();
    const rawCoin = coinInput.value.trim();
    const statusEl = document.getElementById("batch-create-status");
    statusEl.textContent = "";

    if (!rawName) return;

    const parsed = parseStudentFullName(rawName);
    if (!parsed) return;

    let initialCoins = 100;
    if (rawCoin !== "") {
    const delta = Number(rawCoin) || 0;
    initialCoins = Math.max(0, 100 + delta);
    }

    const base = parsed.usernameBase;
    let calculatedUsername = base;
    let counter = 1;

    const existingUsernames = batchStudentsList.map(s => s.username);
    while (existingUsernames.includes(calculatedUsername)) {
    calculatedUsername = `${base}${counter}`;
    counter++;
    }

    batchStudentsList.push({
    fullName: parsed.fullName,
    lastName: parsed.lastName,
    firstName: parsed.firstName,
    usernameBase: parsed.usernameBase,
    username: calculatedUsername,
    password: "123",
    coins: initialCoins
    });

    nameInput.value = "";
    coinInput.value = "";
    
    const coinWrapper = document.getElementById("batch-coin-input-wrapper");
    const btnCoin = document.getElementById("btn-toggle-batch-coin");
    if (coinWrapper && coinWrapper.style.display !== "none") {
    coinWrapper.style.display = "none";
    if (btnCoin) {
        btnCoin.textContent = "🪙 Điều chỉnh";
        btnCoin.style.background = "#fef08a";
        btnCoin.style.color = "#854d0e";
        btnCoin.style.borderColor = "#fde047";
    }
    }

    nameInput.focus();
    renderBatchPreviewTable();
}

function renderBatchPreviewTable() {
    const tbody = document.getElementById("batch-preview-tbody");
    const wrapper = document.getElementById("batch-preview-wrapper");
    const countSpan = document.getElementById("batch-count");

    if (batchStudentsList.length === 0) {
    wrapper.style.display = "none";
    tbody.innerHTML = "";
    return;
    }

    wrapper.style.display = "block";
    countSpan.textContent = batchStudentsList.length;
    tbody.innerHTML = "";

    batchStudentsList.forEach((stu, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td style="text-align: center; color: #64748b; font-weight: bold;">${idx + 1}</td>
        <td>
        <input type="text" class="batch-table-input" value="${stu.lastName || ''}" 
            placeholder="Họ và tên đệm"
            onchange="updateBatchField(${idx}, 'lastName', this.value)">
        </td>
        <td>
        <input type="text" class="batch-table-input" value="${stu.firstName || ''}" 
            placeholder="Tên" style="font-weight: 600;"
            onchange="updateBatchField(${idx}, 'firstName', this.value)">
        </td>
        <td>
        <input type="text" class="batch-table-input" id="batch-user-input-${idx}" value="${stu.username || ''}" 
            placeholder="Tên tài khoản" style="font-family: monospace; font-weight: 600;"
            onchange="updateBatchField(${idx}, 'username', this.value)">
        </td>
        <td>
        <input type="text" class="batch-table-input" value="${stu.password || '123'}" 
            placeholder="Mật khẩu" style="font-family: monospace;"
            onchange="updateBatchField(${idx}, 'password', this.value)">
        </td>
        <td>
        <input type="number" class="batch-table-input" value="${stu.coins !== undefined ? stu.coins : 100}" 
            style="width: 100%; text-align: center;"
            onchange="updateBatchField(${idx}, 'coins', Number(this.value) || 0)">
        </td>
        <td style="text-align: center;">
        <button type="button" onclick="removeBatchItem(${idx})" 
            style="background: none; border: none; color: #ef4444; cursor: pointer; font-weight: bold; font-size: 16px;" 
            title="Xóa học sinh này">✕</button>
        </td>
    `;
    tbody.appendChild(tr);
    });
}

function updateBatchField(index, field, value) {
    if (!batchStudentsList[index]) return;

    if (field === 'lastName' || field === 'firstName') {
    batchStudentsList[index][field] = value.trim();
    const full = `${batchStudentsList[index].lastName || ''} ${batchStudentsList[index].firstName || ''}`.trim();
    batchStudentsList[index].fullName = full;

    const parsed = parseStudentFullName(full);
    if (parsed) {
        batchStudentsList[index].usernameBase = parsed.usernameBase;
        recalculateBatchUsernames();
        const userInput = document.getElementById(`batch-user-input-${index}`);
        if (userInput) {
        userInput.value = batchStudentsList[index].username;
        }
    }
    } else if (field === 'username') {
    batchStudentsList[index].username = value.trim().toLowerCase();
    } else if (field === 'password') {
    batchStudentsList[index].password = value.trim();
    } else if (field === 'coins') {
    batchStudentsList[index].coins = Math.max(0, Number(value) || 0);
    }
}

function removeBatchItem(index) {
    batchStudentsList.splice(index, 1);
    recalculateBatchUsernames();
    renderBatchPreviewTable();
}

function recalculateBatchUsernames() {
    const seen = {};
    batchStudentsList.forEach(stu => {
    const base = stu.usernameBase || stu.username;
    if (!seen[base]) {
        seen[base] = 0;
        stu.username = base;
    } else {
        seen[base]++;
        stu.username = `${base}${seen[base]}`;
    }
    });
}

function clearBatchList() {
    batchStudentsList = [];
    renderBatchPreviewTable();
    document.getElementById("batch-create-status").textContent = "";
}

async function executeBatchCreateStudents() {
    const schoolSelect = document.getElementById("batch-school-select");
    const classInput = document.getElementById("batch-stu-class");
    const statusEl = document.getElementById("batch-create-status");
    const btnSubmit = document.getElementById("btn-submit-batch");

    const school = schoolSelect.value;
    const rawClass = classInput.value.trim().toUpperCase();

    if (!school) {
    statusEl.className = "status-msg status-error";
    statusEl.textContent = "Vui lòng chọn trường học cố định!";
    schoolSelect.focus();
    return;
    }

    if (!rawClass) {
    statusEl.className = "status-msg status-error";
    statusEl.textContent = "Vui lòng nhập lớp học cố định!";
    classInput.focus();
    return;
    }

    if (batchStudentsList.length === 0) {
    statusEl.className = "status-msg status-error";
    statusEl.textContent = "Danh sách học sinh đang trống! Vui lòng nhập họ tên và nhấn Tab.";
    return;
    }

    const matchGrade = rawClass.match(/\d/);
    const grade = matchGrade ? matchGrade[0] : "7";

    btnSubmit.disabled = true;
    statusEl.className = "status-msg";
    statusEl.textContent = `Đang tạo ${batchStudentsList.length} tài khoản lên hệ thống... ⏳`;

    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        action: "batch_create_students",
        school: school,
        className: rawClass,
        grade: grade,
        students: batchStudentsList
        })
    });

    const result = await res.json();

    if (!result.success) {
        statusEl.className = "status-msg status-error";
        statusEl.textContent = result.message || "Tạo tài khoản hàng loạt thất bại!";
        btnSubmit.disabled = false;
        return;
    }

    statusEl.className = "status-msg status-success";
    statusEl.textContent = `🎉 ${result.message}`;
    clearBatchList();
    
    await loadSchools();
    schoolSelect.value = school;
    classInput.value = rawClass;

    filterSchoolSelect.value = school;
    document.getElementById("filter-class-input").value = rawClass;
    fetchStudentList(true);

    } catch (err) {
    statusEl.className = "status-msg status-error";
    statusEl.textContent = "Lỗi kết nối máy chủ!";
    } finally {
    btnSubmit.disabled = false;
    }
}

const filterSchoolSelect = document.getElementById("filter-school-select");
const batchSchoolSelect = document.getElementById("batch-school-select");
const studentListBody = document.getElementById("student-list-body");

const createSchoolForm = document.getElementById("create-school-form");
const schoolCreateStatus = document.getElementById("school-create-status");
const newSchoolNameInput = document.getElementById("new-school-name-input");
const schoolsManagementList = document.getElementById("schools-management-list");

let currentSchoolsData = [];
let cachedStudentsList = [];
let adminMemesCache = [];
let currentAdminFilter = 'ALL';
let currentRewardStudentId = null;
let currentStudentRewardData = null;
let currentSelectedMeme = null;
let replacementMemeBase64Image = null;
let pendingRewardsList = [];
let currentRewardClassFilter = 'ALL';
const quickPageScroll = document.getElementById("quick-page-scroll");
const quickPageScrollButton = document.getElementById("quick-page-scroll-button");
let quickPageScrollTimer;
let previousScrollY = window.scrollY;
let quickScrollDirection = "up";

function isQuickScrollTabActive() {
    return document.getElementById("tab-student-manage").classList.contains("active") ||
    document.getElementById("tab-login-history").classList.contains("active");
}

function hideQuickPageScroll() {
    quickPageScroll.classList.remove("visible");
    clearTimeout(quickPageScrollTimer);
}

function showQuickPageScrollOnScroll() {
    const currentScrollY = window.scrollY;
    if (!isQuickScrollTabActive()) {
    previousScrollY = currentScrollY;
    hideQuickPageScroll();
    return;
    }

    if (currentScrollY > previousScrollY) quickScrollDirection = "down";
    else if (currentScrollY < previousScrollY) quickScrollDirection = "up";
    previousScrollY = currentScrollY;

    const isAtPageBottom = window.innerHeight + currentScrollY >= document.documentElement.scrollHeight - 2;
    if (isAtPageBottom) quickScrollDirection = "up";
    else if (currentScrollY <= 0) quickScrollDirection = "down";

    const scrollTarget = quickScrollDirection === "down" ? "bottom" : "top";
    quickPageScrollButton.textContent = quickScrollDirection === "down" ? "↓" : "↑";
    quickPageScrollButton.setAttribute("aria-label", scrollTarget === "bottom" ? "Cuộn xuống cuối trang" : "Cuộn lên đầu trang");
    quickPageScrollButton.title = scrollTarget === "bottom" ? "Xuống cuối trang" : "Lên đầu trang";

    quickPageScroll.classList.add("visible");
    clearTimeout(quickPageScrollTimer);
    quickPageScrollTimer = setTimeout(hideQuickPageScroll, 2400);
}

function scrollTeacherPage() {
    const top = quickScrollDirection === "up" ? 0 : document.documentElement.scrollHeight;
    window.scrollTo({ top, behavior: "smooth" });
    showQuickPageScrollOnScroll();
}

window.addEventListener("scroll", showQuickPageScrollOnScroll, { passive: true });

function switchTab(tabId) {
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".sidebar-nav .nav-item").forEach(b => b.classList.remove("active"));
    
    const targetPanel = document.getElementById(tabId);
    if (targetPanel) targetPanel.classList.add("active");
    
    const clickedBtn = Array.from(document.querySelectorAll(".sidebar-nav .nav-item")).find(b => 
    b.getAttribute("onclick") && b.getAttribute("onclick").includes(tabId)
    );
    if (clickedBtn) clickedBtn.classList.add("active");
    
    sessionStorage.setItem("teacher_active_tab", tabId);
    hideQuickPageScroll();

    if (window.innerWidth <= 768) {
    const sidebarObj = document.getElementById('admin-sidebar');
    if (sidebarObj) sidebarObj.classList.remove('show-menu');
    const overlayObj = document.getElementById('mobile-nav-overlay');
    if (overlayObj) overlayObj.classList.remove('show');
    }

    if (tabId === 'tab-student-manage') {
    fetchPendingRewardRequests();
    } else if (tabId === 'tab-collection') {
    loadAdminMemeCollection();
    loadGachaSettings();
    } else if (tabId === 'tab-login-history') {
    loadLoginHistory();
    loadIpManagement();
    } else if (tabId === 'tab-attendance') {
    loadClassSchedules();
    fetchActiveClassesForDate();
    }
    else if (tabId === 'tab-exam') {
    loadQuizzesList();
    }
}

const savedTab = sessionStorage.getItem("teacher_active_tab");
if (savedTab && document.getElementById(savedTab)) {
    switchTab(savedTab);
}

function renderSchoolDropdown(schools) {
    currentSchoolsData = schools || [];
    const currentSelectedSchool = filterSchoolSelect.value;
    const currentBatchSchool = batchSchoolSelect.value;

    filterSchoolSelect.innerHTML = '<option value="" disabled selected hidden>-- Chọn trường học --</option>';
    batchSchoolSelect.innerHTML = '<option value="" disabled selected hidden>-- Chọn trường học --</option>';
    
    const transferSchoolSelect = document.getElementById("transfer-school-select");
    if (transferSchoolSelect) transferSchoolSelect.innerHTML = '<option value="" disabled selected hidden>-- Chọn trường học --</option>';
    
    const schedSchoolSel = document.getElementById("sched-school-select");
    if (schedSchoolSel) schedSchoolSel.innerHTML = '<option value="" disabled selected hidden>-- Chọn trường học --</option>';

    const viewAttSchoolSel = document.getElementById("view-att-school-select");
    if (viewAttSchoolSel) viewAttSchoolSel.innerHTML = '<option value="" disabled selected hidden>-- Chọn trường học --</option>';

    schoolsManagementList.innerHTML = "";

    if (currentSchoolsData.length === 0) {
    schoolsManagementList.innerHTML = '<div style="color: #64748b; font-size: 13px; padding: 4px;">Chưa có trường học nào được tạo.</div>';
    return;
    }

    currentSchoolsData.forEach(school => {
    const schoolName = school.name || school; 
    const isHidden = school.is_hidden || false;
    const idSafe = schoolName.replace(/[^a-zA-Z0-9]/g, '_');
    const isExamLocked = school.is_exam_locked || false;
    const isRewardSharingLocked = school.is_reward_sharing_locked || false;

    const opt2 = document.createElement("option");
    opt2.value = schoolName;
    opt2.textContent = schoolName;
    filterSchoolSelect.appendChild(opt2);

    const optBatch = document.createElement("option");
    optBatch.value = schoolName;
    optBatch.textContent = schoolName;
    batchSchoolSelect.appendChild(optBatch);
    
    if (transferSchoolSelect) {
        const optTransfer = document.createElement("option");
        optTransfer.value = schoolName;
        optTransfer.textContent = schoolName;
        transferSchoolSelect.appendChild(optTransfer);
    }

    if (schedSchoolSel) {
        const optSched = document.createElement("option");
        optSched.value = schoolName;
        optSched.textContent = schoolName;
        schedSchoolSel.appendChild(optSched);
    }

    if (viewAttSchoolSel) {
        const optView = document.createElement("option");
        optView.value = schoolName;
        optView.textContent = schoolName;
        viewAttSchoolSel.appendChild(optView);
    }

    const itemDiv = document.createElement("div");
    itemDiv.className = "school-row-item";
    itemDiv.innerHTML = `
        <div class="school-row-main">
        <span style="font-weight: 500; color: ${isHidden ? '#94a3b8' : '#1e293b'}">
            ${schoolName} ${isHidden ? '<span style="color:#ef4444; font-size:12px;">(Đang ẩn)</span>' : '<span style="color:#10b981; font-size:12px;">(Đang hiện)</span>'}
        </span>
        <div style="display: flex; align-items: center; gap: 8px;" onclick="event.stopPropagation()">
            <button type="button" onclick="toggleSchoolStatus('${schoolName}', ${isHidden})" class="btn" style="padding: 3px 10px; font-size: 12px; background: ${isHidden ? '#dcfce7' : '#fee2e2'}; color: ${isHidden ? '#166534' : '#991b1b'}; border: 1px solid ${isHidden ? '#86efac' : '#fca5a5'}; cursor: pointer;">
                ${isHidden ? '👁️ Hiện' : '🚫 Ẩn'}
            </button>
            <button type="button" class="btn school-actions-toggle" aria-expanded="false" aria-controls="actions-${idSafe}" onclick="toggleSchoolActions('${idSafe}', this)" style="padding: 6px 12px; font-size: 13px; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; cursor: pointer;">
                Thao tác <span aria-hidden="true">▾</span>
            </button>
        </div>
        </div>
        <div class="school-dropdown-actions" id="actions-${idSafe}">
        <div class="school-action-buttons">
            <button type="button" class="btn school-classes-toggle" style="padding: 6px 10px; font-size: 12px; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; cursor: pointer;">
                📚 Danh sách lớp
            </button>
            <button type="button" onclick="toggleSchoolExamLock('${schoolName}', ${isExamLocked})" class="btn" style="padding: 6px 10px; font-size: 12px; background: ${isExamLocked ? '#fee2e2' : '#f0fdf4'}; color: ${isExamLocked ? '#991b1b' : '#166534'}; border: 1px solid ${isExamLocked ? '#fca5a5' : '#86efac'}; cursor: pointer;">
                ${isExamLocked ? '🔒 Đang khóa bài thi' : '🔓 Đang mở bài thi'}
            </button>
            <button type="button" onclick="toggleSchoolRewardShareLock('${escapeForJsString(schoolName)}', ${isRewardSharingLocked})" class="btn" style="padding: 6px 10px; font-size: 12px; background: ${isRewardSharingLocked ? '#fef3c7' : '#ecfeff'}; color: ${isRewardSharingLocked ? '#92400e' : '#0f766e'}; border: 1px solid ${isRewardSharingLocked ? '#fcd34d' : '#67e8f9'}; cursor: pointer;">
                ${isRewardSharingLocked ? '🔒 Đang chặn chia sẻ' : '🔓 Cho phép chia sẻ'}
            </button>
            <div class="school-delete-controls">
                <input type="password" id="del-pwd-${idSafe}" placeholder="Nhập mật khẩu để xóa trường" style="flex: 1; min-width: 0; padding: 6px 10px; font-size: 13px; border: 1px solid #cbd5e1; border-radius: 4px;">
                <button type="button" onclick="verifyAndDeleteSchool('${schoolName}', '${idSafe}')" class="btn" style="background: #ef4444; color: #fff; padding: 6px 12px; font-size: 12px; border-radius: 4px; cursor: pointer;">Xóa trường</button>
            </div>
        </div>
        <div class="school-classes-panel" hidden></div>
        </div>
    `;
    schoolsManagementList.appendChild(itemDiv);

    const classesToggle = itemDiv.querySelector(".school-classes-toggle");
    const classesPanel = itemDiv.querySelector(".school-classes-panel");
    classesToggle.addEventListener("click", () => toggleSchoolClasses(schoolName, classesToggle, classesPanel));
    });

    let defaultSchool = currentSelectedSchool;
    if (!defaultSchool) {
    const savedFilters = getSavedFilters();
    defaultSchool = (savedFilters && savedFilters.school) ? savedFilters.school : (currentSchoolsData[0]?.name || currentSchoolsData[0] || "");
    }

    if (defaultSchool) {
    filterSchoolSelect.value = defaultSchool;
    if (schedSchoolSel) schedSchoolSel.value = defaultSchool;
    if (viewAttSchoolSel) viewAttSchoolSel.value = defaultSchool;
    }

    if (currentBatchSchool) {
    batchSchoolSelect.value = currentBatchSchool;
    }
}

function toggleSchoolActions(idSafe, button) {
    const actionsEl = document.getElementById(`actions-${idSafe}`);
    if (actionsEl) {
    const isOpen = actionsEl.classList.toggle('show');
    button.setAttribute("aria-expanded", String(isOpen));
    }
}

async function toggleSchoolClasses(school, button, panel) {
    if (!panel.hidden) {
    panel.hidden = true;
    button.setAttribute("aria-expanded", "false");
    return;
    }

    panel.hidden = false;
    button.setAttribute("aria-expanded", "true");
    panel.replaceChildren();
    const loading = document.createElement("div");
    loading.className = "school-class-status";
    loading.textContent = "Đang tải danh sách lớp...";
    panel.appendChild(loading);

    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_school_classes", school })
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
        throw new Error(result.message || "Không thể tải danh sách lớp.");
    }

    panel.replaceChildren();
    if (!result.data?.classes?.length) {
        const empty = document.createElement("div");
        empty.className = "school-class-status";
        empty.textContent = "Trường này chưa có lớp học sinh nào.";
        panel.appendChild(empty);
        return;
    }

    result.data.classes.forEach(classInfo => {
        const row = document.createElement("div");
        row.className = "school-class-row";

        const className = document.createElement("strong");
        className.textContent = `Lớp ${classInfo.class_name}`;

        const lockButton = document.createElement("button");
        lockButton.type = "button";
        lockButton.className = "btn btn-sm";
        lockButton.textContent = classInfo.is_login_locked ? "🔒 Đang khóa đăng nhập" : "🔓 Đang mở đăng nhập";
        lockButton.style.background = classInfo.is_login_locked ? "#fee2e2" : "#f0fdf4";
        lockButton.style.color = classInfo.is_login_locked ? "#991b1b" : "#166534";
        lockButton.style.border = `1px solid ${classInfo.is_login_locked ? "#fca5a5" : "#86efac"}`;
        lockButton.addEventListener("click", () => {
        lockButton.disabled = true;
        toggleClassLoginLock(
            school,
            classInfo.class_name,
            !classInfo.is_login_locked,
            lockButton,
            button,
            panel
        );
        });

        row.append(className, lockButton);
        panel.appendChild(row);
    });
    } catch (error) {
    panel.replaceChildren();
    const errorMessage = document.createElement("div");
    errorMessage.className = "school-class-status";
    errorMessage.style.color = "#b91c1c";
    errorMessage.textContent = error.message || "Lỗi kết nối khi tải danh sách lớp.";
    panel.appendChild(errorMessage);
    }
}

async function toggleClassLoginLock(school, className, isLoginLocked, actionButton, toggleButton, panel) {
    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        action: "toggle_class_login_lock",
        school,
        class_name: className,
        is_login_locked: isLoginLocked,
        teacher_username: user.username
        })
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
        throw new Error(result.message || "Không thể cập nhật trạng thái lớp.");
    }
    showTeacherNotification(result.message);
    panel.hidden = true;
    await toggleSchoolClasses(school, toggleButton, panel);
    } catch (error) {
    showTeacherNotification(error.message || "Lỗi kết nối khi cập nhật trạng thái lớp.");
    actionButton.disabled = false;
    }
}

async function verifyAndDeleteSchool(schoolName, idSafe) {
    const pwdInput = document.getElementById(`del-pwd-${idSafe}`);
    const password = pwdInput ? pwdInput.value.trim() : "";

    if (!password) {
    showTeacherNotification("Vui lòng nhập mật khẩu tài khoản giáo viên để tiếp tục!");
    return;
    }

    if (!await showStyledConfirm(`Bạn có chắc chắn muốn xóa vĩnh viễn trường "${schoolName}" không?`)) {
    return;
    }

    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        action: "delete_school",
        school: schoolName,
        teacher_username: user.username,
        password: password
        })
    });
    const result = await res.json();
    if (result.success) {
        showTeacherNotification(result.message);
        loadSchools();
    } else {
        showTeacherNotification(result.message || "Xóa trường thất bại!");
    }
    } catch (e) {
    showTeacherNotification("Lỗi kết nối máy chủ!");
    }
}

async function loadSchools() {
    try {
    const res = await fetch("/.netlify/functions/auth");
    const result = await res.json();
    if (result.success && result.data && Array.isArray(result.data.schools)) {
        renderSchoolDropdown(result.data.schools);
    } else {
        const errorEl = document.createElement("div");
        errorEl.style.cssText = "color: #b91c1c; font-size: 13px; padding: 4px;";
        errorEl.textContent = result.message || result.error || "Lỗi tải danh sách trường.";
        schoolsManagementList.replaceChildren(errorEl);
    }
    } catch (err) {
    const errorEl = document.createElement("div");
    errorEl.style.cssText = "color: #b91c1c; font-size: 13px; padding: 4px;";
    errorEl.textContent = "Không kết nối được máy chủ để tải danh sách trường.";
    schoolsManagementList.replaceChildren(errorEl);
    }
}

function refreshSchools() {
    loadSchools();
}

async function toggleSchoolStatus(schoolName, currentHiddenStatus) {
    const newStatus = !currentHiddenStatus;
    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_school", school: schoolName, is_hidden: newStatus })
    });
    const result = await res.json();
    if (result.success) {
        loadSchools();
    } else {
        showTeacherNotification(result.message);
    }
    } catch (e) {
    showTeacherNotification("Lỗi kết nối máy chủ!");
    }
}

async function toggleSchoolExamLock(schoolName, currentLockStatus) {
    const newLockStatus = !currentLockStatus;
    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_school_exam_lock", school: schoolName, is_exam_locked: newLockStatus })
    });
    const result = await res.json();
    if (result.success) {
        loadSchools();
    } else {
        showTeacherNotification(result.message);
    }
    } catch (e) {
    showTeacherNotification("Lỗi kết nối máy chủ!");
    }
}

async function toggleSchoolRewardShareLock(schoolName, currentLockStatus) {
    const newLockStatus = !currentLockStatus;
    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_school_reward_sharing_lock", school: schoolName, is_reward_sharing_locked: newLockStatus })
    });
    const result = await res.json();
    if (result.success) {
        showTeacherNotification(result.message || "Đã cập nhật trạng thái khóa chia sẻ phần thưởng.");
        loadSchools();
    } else {
        showTeacherNotification(result.message);
    }
    } catch (e) {
    showTeacherNotification("Lỗi kết nối máy chủ!");
    }
}

createSchoolForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    schoolCreateStatus.className = "status-msg";
    schoolCreateStatus.textContent = "Đang tạo trường...";

    const schoolName = newSchoolNameInput.value.trim();
    if (!schoolName) return;

    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_school", school: schoolName })
    });
    const result = await res.json();

    if (!res.ok || !result.success) {
        schoolCreateStatus.className = "status-msg status-error";
        schoolCreateStatus.textContent = result.message || "Tạo trường thất bại!";
        return;
    }

    schoolCreateStatus.className = "status-msg status-success";
    schoolCreateStatus.textContent = `🎉 Tạo thành công trường "${schoolName}"!`;
    createSchoolForm.reset();
    loadSchools(); 
    } catch (err) {
    schoolCreateStatus.className = "status-msg status-error";
    schoolCreateStatus.textContent = "Lỗi kết nối đến máy chủ!";
    }
});

function toggleGachaSettingInput(checkboxId, inputId) {
    const checkbox = document.getElementById(checkboxId);
    const input = document.getElementById(inputId);
    input.disabled = !checkbox.checked;
    input.required = checkbox.checked;
    if (!checkbox.checked) input.value = "";
}

function toggleGachaTargetInputs() {
    const enabled = document.getElementById("gacha-target-enabled").checked;
    document.querySelectorAll(".gacha-target-limit").forEach(input => {
    input.disabled = !enabled;
    if (!enabled) input.value = "";
    });
}

async function loadGachaSettings() {
    const statusEl = document.getElementById("gacha-settings-status");
    if (statusEl) {
    statusEl.className = "status-msg";
    statusEl.textContent = "Đang tải cài đặt...";
    }

    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_gacha_settings" })
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.message || "Không thể tải cài đặt quay thưởng.");

    const settings = result.data || {};
    const targetLimits = settings.target_pull_limits || {};
    document.getElementById("gacha-target-enabled").checked = settings.target_enabled === true;
    ["sss", "ss", "s", "a", "b", "c"].forEach(rarity => {
        document.getElementById(`gacha-target-limit-${rarity}`).value = targetLimits[rarity.toUpperCase()] || "";
    });
    document.getElementById("gacha-new-meme-enabled").checked = settings.new_meme_enabled === true;
    document.getElementById("gacha-new-meme-limit").value = settings.new_meme_pull_limit || "";
    toggleGachaTargetInputs();
    toggleGachaSettingInput("gacha-new-meme-enabled", "gacha-new-meme-limit");
    if (statusEl) {
        statusEl.className = "status-msg status-success";
        statusEl.textContent = "Đã tải cài đặt.";
    }
    } catch (error) {
    if (statusEl) {
        statusEl.className = "status-msg status-error";
        statusEl.textContent = error.message || "Lỗi kết nối máy chủ.";
    }
    }
}

async function saveGachaSettings(event) {
    event.preventDefault();
    const statusEl = document.getElementById("gacha-settings-status");
    const button = document.getElementById("btn-save-gacha-settings");
    const targetEnabled = document.getElementById("gacha-target-enabled").checked;
    const newMemeEnabled = document.getElementById("gacha-new-meme-enabled").checked;
    const targetPullLimits = {};
    ["SSS", "SS", "S", "A", "B", "C"].forEach(rarity => {
    targetPullLimits[rarity] = document.getElementById(`gacha-target-limit-${rarity.toLowerCase()}`).value;
    });
    button.disabled = true;
    statusEl.className = "status-msg";
    statusEl.textContent = "Đang lưu...";

    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        action: "save_gacha_settings",
        teacher_username: user.username,
        target_enabled: targetEnabled,
        target_pull_limits: targetPullLimits,
        new_meme_enabled: newMemeEnabled,
        new_meme_pull_limit: newMemeEnabled ? document.getElementById("gacha-new-meme-limit").value : null
        })
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.message || "Không thể lưu cài đặt quay thưởng.");
    statusEl.className = "status-msg status-success";
    statusEl.textContent = result.message || "Đã lưu cài đặt quay thưởng.";
    } catch (error) {
    statusEl.className = "status-msg status-error";
    statusEl.textContent = error.message || "Lỗi kết nối máy chủ.";
    } finally {
    button.disabled = false;
    }
}

async function loadAdminMemeCollection() {
    const container = document.getElementById("admin-meme-grid-container");
    container.innerHTML = `<div style="grid-column: span 3; text-align: center; color: #64748b; padding: 20px;">Đang tải danh sách meme...</div>`;

    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_all_memes" })
    });
    const result = await res.json();

    if (!result.success || !result.data.memes) {
        container.innerHTML = `<p style="grid-column: span 3; text-align: center; color: #64748b; font-size: 14px;">Chưa có meme nào trong hệ thống.</p>`;
        return;
    }

    adminMemesCache = result.data.memes;
    renderAdminMemes();
    } catch (err) {
    container.innerHTML = `<p style="grid-column: span 3; text-align: center; color: red; font-size: 14px;">Lỗi tải bộ sưu tập từ máy chủ.</p>`;
    }
}

function filterAdminMemes(rarity, btnElement) {
    currentAdminFilter = rarity;
    document.querySelectorAll("#admin-filter-bar .filter-btn").forEach(b => b.classList.remove("active"));
    if (btnElement) btnElement.classList.add("active");
    renderAdminMemes();
}

function renderAdminMemes() {
    const container = document.getElementById("admin-meme-grid-container");
    const rarityOrder = { 'SSS': 1, 'SS': 2, 'S': 3, 'A': 4, 'B': 5, 'C': 6 };

    let sorted = [...adminMemesCache].sort((a, b) => {
    let rA = rarityOrder[a.rarity] || 99;
    let rB = rarityOrder[b.rarity] || 99;
    return rA - rB;
    });

    if (currentAdminFilter !== 'ALL') {
    sorted = sorted.filter(m => m.rarity === currentAdminFilter);
    }

    if (sorted.length === 0) {
    container.innerHTML = `<p style="grid-column: span 3; text-align: center; color: #64748b; font-size: 14px;">Không có meme nào thuộc độ hiếm này.</p>`;
    return;
    }

    container.innerHTML = "";
    sorted.forEach((meme) => {
    const card = document.createElement("div");
    card.className = "admin-meme-card";
    card.onclick = () => openEditMemeModal(meme);
    const imageStorageType = typeof meme.image === "string" && meme.image.startsWith("https://pub")
        ? "R2"
        : typeof meme.image === "string" && meme.image.startsWith("data:image/")
        ? "base64"
        : "";
    
    // Đã sửa lại cấu trúc innerHTML: Thêm div bao bọc có text-align: center
    // và thêm dòng ID nằm ngay trên Slogan
    card.innerHTML = `
        <div>
        <span class="rarity-label" data-rarity="${meme.rarity}" style="padding:2px 6px; font-size:10px; margin-bottom:4px;">${meme.rarity}</span>
        <div class="admin-meme-image-frame">
            <img src="${meme.image}" alt="Meme">
        </div>
        </div>
        <div style="margin-top: 8px; text-align: center;">
        <div style="font-size: 11px; color: #94a3b8; font-weight: bold; margin-bottom: 3px;">ID: ${meme.id}${imageStorageType ? ` | ${imageStorageType}` : ""}</div>
        <div style="font-size: 12px; color: #334155; font-weight: 500; word-break: break-word;">${meme.slogan}</div>
        </div>
    `;
    container.appendChild(card);
    });
}

function openEditMemeModal(meme) {
    currentSelectedMeme = meme;
    document.getElementById("edit-meme-id").value = meme._id || meme.id || meme.slogan;
    document.getElementById("edit-meme-preview").src = meme.image;
    document.getElementById("edit-meme-slogan").value = meme.slogan || "";
    document.getElementById("edit-meme-rarity").value = meme.rarity || "C";
    clearReplacementMemeImage();
    document.getElementById("edit-meme-status").textContent = "";
    document.getElementById("edit-meme-status").className = "status-msg mt-2";
    document.getElementById("edit-meme-modal").classList.add("show");
}

function closeEditMemeModal() {
    document.getElementById("edit-meme-modal").classList.remove("show");
    clearReplacementMemeImage();
    currentSelectedMeme = null;
}

function clearReplacementMemeImage() {
    replacementMemeBase64Image = null;
    const fileInput = document.getElementById("replace-meme-file");
    const preview = document.getElementById("replace-meme-preview");
    if (fileInput) fileInput.value = "";
    if (preview) {
    preview.src = "";
    preview.style.display = "none";
    }
}

async function submitUpdateMeme(e) {
    e.preventDefault();
    const statusEl = document.getElementById("edit-meme-status");
    statusEl.className = "status-msg mt-2";
    statusEl.textContent = replacementMemeBase64Image
    ? "Đang cập nhật meme và tải ảnh mới lên R2..."
    : "Đang cập nhật...";

    const memeId = document.getElementById("edit-meme-id").value;
    const slogan = document.getElementById("edit-meme-slogan").value.trim();
    const rarity = document.getElementById("edit-meme-rarity").value;

    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        action: "update_meme",
        id: memeId,
        old_slogan: currentSelectedMeme?.slogan,
        slogan: slogan,
        rarity: rarity,
        image_url: replacementMemeBase64Image
        })
    });
    const result = await res.json();

    if (!result.success) {
        statusEl.className = "status-msg status-error mt-2";
        statusEl.textContent = result.message || "Cập nhật thất bại!";
        return;
    }

    showTeacherNotification(result.message || "Cập nhật meme thành công!");
    closeEditMemeModal();
    loadAdminMemeCollection();
    } catch (err) {
    statusEl.className = "status-msg status-error mt-2";
    statusEl.textContent = "Lỗi kết nối máy chủ!";
    }
}

async function confirmDeleteMeme() {
    if (!currentSelectedMeme) return;
    if (!await showStyledConfirm(`Bạn có chắc chắn muốn xóa meme "${currentSelectedMeme.slogan}" không?`)) return;

    const memeId = document.getElementById("edit-meme-id").value;
    const statusEl = document.getElementById("edit-meme-status");
    statusEl.className = "status-msg mt-2";
    statusEl.textContent = "Đang xóa meme...";

    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        action: "delete_meme",
        id: memeId,
        slogan: currentSelectedMeme.slogan
        })
    });
    const result = await res.json();

    if (!result.success) {
        statusEl.className = "status-msg status-error mt-2";
        statusEl.textContent = result.message || "Xóa meme thất bại!";
        return;
    }

    showTeacherNotification("Đã xóa meme thành công!");
    closeEditMemeModal();
    loadAdminMemeCollection();
    } catch (err) {
    statusEl.className = "status-msg status-error mt-2";
    statusEl.textContent = "Lỗi kết nối máy chủ!";
    }
}

/* QUẢN LÝ KHÓA/MỞ KHÓA TÀI KHOẢN HỌC SINH */
async function banStudent(username) {
    const reason = await showStyledPrompt(`Nhập lý do khóa tài khoản ${username}:`, "Vi phạm nội quy");
    if (reason === null) return;
    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ban_account", username: username, reason: reason })
    });
    const result = await res.json();
    showTeacherNotification(result.message);
    if (result.success) fetchStudentList(true);
    } catch (e) {
    showTeacherNotification("Lỗi kết nối máy chủ!");
    }
}

async function unbanStudent(username) {
    if (!await showStyledConfirm(`Bạn có chắc chắn muốn mở khóa cho tài khoản ${username}?`)) return;
    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unban_account", username: username })
    });
    const result = await res.json();
    showTeacherNotification(result.message);
    if (result.success) fetchStudentList(true);
    } catch (e) {
    showTeacherNotification("Lỗi kết nối máy chủ!");
    }
}

/* TÍNH NĂNG ĐÁNH DẤU HỌC SINH */
async function setStudentHighlight(studentId, status) {
    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        action: "update_student_highlight",
        student_id: studentId,
        status: status
        })
    });
    const result = await res.json();
    if (result.success) {
        const stu = cachedStudentsList.find(s => String(s.id) === String(studentId));
        if (stu) {
        stu.is_highlighted = status;
        }
        saveCurrentFilterState();
        sortAndRenderStudents();
    } else {
        showTeacherNotification(result.message || "Cập nhật trạng thái đánh dấu thất bại!");
    }
    } catch (err) {
    showTeacherNotification("Lỗi kết nối máy chủ khi đánh dấu!");
    }
}

function openSingleCoinModal(studentId) {
    const stu = cachedStudentsList.find(s => String(s.id) === String(studentId));
    if (!stu) return;

    document.getElementById("single-coin-stu-id").value = stu.id;
    document.getElementById("single-coin-stu-name").textContent = stu.fullName || `${stu.lastName || ''} ${stu.firstName || ''}`.trim() || stu.username;
    document.getElementById("single-coin-stu-class").textContent = stu.className || "---";
    
    const coinVal = stu.coins !== undefined ? stu.coins : 0;
    const coinEl = document.getElementById("single-coin-current-coins");
    coinEl.textContent = coinVal;
    coinEl.style.color = coinVal < 0 ? "#dc2626" : "#d97706";
    
    document.getElementById("single-coin-delta").value = "";

    const statusEl = document.getElementById("single-coin-status");
    statusEl.textContent = "";
    statusEl.className = "status-msg mt-2";

    document.getElementById("single-coin-modal").classList.add("show");
}

function closeSingleCoinModal() {
    document.getElementById("single-coin-modal").classList.remove("show");
}

async function submitSingleCoin(e) {
    e.preventDefault();
    const statusEl = document.getElementById("single-coin-status");
    const btnSubmit = document.getElementById("btn-confirm-single-coin");
    
    const studentId = document.getElementById("single-coin-stu-id").value;
    const deltaRaw = document.getElementById("single-coin-delta").value;
    const coinDelta = parseInt(deltaRaw, 10);

    if (isNaN(coinDelta) || coinDelta === 0) {
    statusEl.className = "status-msg status-error mt-2";
    statusEl.textContent = "Vui lòng nhập số lượng xu hợp lệ (khác 0)!";
    return;
    }

    btnSubmit.disabled = true;
    statusEl.className = "status-msg mt-2";
    statusEl.textContent = "Đang cập nhật xu...";

    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        action: "batch_update_coins",
        student_ids: [studentId],
        coin_delta: coinDelta
        })
    });
    const result = await res.json();

    if (!result.success) {
        statusEl.className = "status-msg status-error mt-2";
        statusEl.textContent = result.message || "Cập nhật thất bại!";
        btnSubmit.disabled = false;
        return;
    }

    showTeacherNotification(result.message || "Cập nhật xu học sinh thành công!");
    closeSingleCoinModal();
    fetchStudentList(true);
    } catch (err) {
    statusEl.className = "status-msg status-error mt-2";
    statusEl.textContent = "Lỗi kết nối máy chủ!";
    } finally {
    btnSubmit.disabled = false;
    }
}

function openEditStudentModal(studentId) {
    const stu = cachedStudentsList.find(s => String(s.id) === String(studentId));
    if (!stu) return;

    document.getElementById("edit-stu-id").value = stu.id;
    document.getElementById("edit-stu-lastname").value = stu.lastName || "";
    document.getElementById("edit-stu-firstname").value = stu.firstName || "";
    document.getElementById("edit-stu-class").value = stu.className || "";
    document.getElementById("edit-stu-password").value = "";

    const statusEl = document.getElementById("edit-student-status");
    statusEl.textContent = "";
    statusEl.className = "status-msg mt-2";

    document.getElementById("edit-student-modal").classList.add("show");
}

function closeEditStudentModal() {
    document.getElementById("edit-student-modal").classList.remove("show");
}

function openDeleteStudentModal(studentId) {
    const stu = cachedStudentsList.find(s => String(s.id) === String(studentId));
    if (!stu) return;

    document.getElementById("delete-stu-id").value = stu.id;
    document.getElementById("delete-stu-name").textContent = stu.fullName || `${stu.lastName || ''} ${stu.firstName || ''}`.trim() || stu.username;
    document.getElementById("delete-stu-class").textContent = stu.className || "---";
    document.getElementById("delete-admin-password").value = "";

    const statusEl = document.getElementById("delete-student-status");
    statusEl.textContent = "";
    statusEl.className = "status-msg mt-2";

    document.getElementById("delete-student-modal").classList.add("show");
}

function closeDeleteStudentModal() {
    document.getElementById("delete-student-modal").classList.remove("show");
}

async function submitDeleteStudent(e) {
    e.preventDefault();
    const statusEl = document.getElementById("delete-student-status");
    const btnDelete = document.getElementById("btn-confirm-delete-stu");
    const studentId = document.getElementById("delete-stu-id").value;
    const adminPassword = document.getElementById("delete-admin-password").value.trim();

    if (!adminPassword) {
    statusEl.className = "status-msg status-error mt-2";
    statusEl.textContent = "Vui lòng nhập mật khẩu giáo viên!";
    return;
    }

    btnDelete.disabled = true;
    statusEl.className = "status-msg mt-2";
    statusEl.textContent = "Đang xác thực và xóa học sinh...";

    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        action: "delete_student",
        student_id: studentId,
        teacher_username: user.username,
        password: adminPassword
        })
    });
    const result = await res.json();

    if (!result.success) {
        statusEl.className = "status-msg status-error mt-2";
        statusEl.textContent = result.message || "Xóa học sinh thất bại!";
        btnDelete.disabled = false;
        return;
    }

    showTeacherNotification(result.message || "Đã xóa học sinh thành công!");
    closeDeleteStudentModal();
    fetchStudentList(true);
    } catch (err) {
    statusEl.className = "status-msg status-error mt-2";
    statusEl.textContent = "Lỗi kết máy chủ!";
    } finally {
    btnDelete.disabled = false;
    }
}

function openFeedbackModal(studentId) {
    const stu = cachedStudentsList.find(s => String(s.id) === String(studentId));
    if (!stu) return;

    document.getElementById("feedback-stu-id").value = stu.id;
    document.getElementById("feedback-stu-name").textContent = stu.fullName || `${stu.lastName || ''} ${stu.firstName || ''}`.trim() || stu.username;
    document.getElementById("feedback-stu-class").textContent = stu.className || "---";
    document.getElementById("feedback-stu-text").value = stu.feedback || "";

    const statusEl = document.getElementById("feedback-student-status");
    statusEl.textContent = "";
    statusEl.className = "status-msg mt-2";

    document.getElementById("feedback-student-modal").classList.add("show");
}

function closeFeedbackModal() {
    document.getElementById("feedback-student-modal").classList.remove("show");
}

function openStudentRewardModal(studentId) {
    const student = cachedStudentsList.find(item => String(item.id) === String(studentId));
    const teacher = getCurrentTeacherSession();
    if (!student || !teacher || teacher.role !== "teacher" || !teacher.username) {
    showTeacherNotification("Không thể xác minh học sinh hoặc phiên giáo viên.");
    return;
    }

    currentRewardStudentId = student.id;
    currentStudentRewardData = null;
    document.getElementById("student-reward-name").textContent =
    student.fullName || `${student.lastName || ""} ${student.firstName || ""}`.trim() || student.username;
    document.getElementById("student-reward-class").textContent = ` · Lớp ${student.className || "---"}`;
    document.getElementById("student-reward-controls").style.display = "none";
    document.getElementById("student-reward-inventory").replaceChildren();
    const status = document.getElementById("student-reward-status");
    status.textContent = "";
    status.className = "status-msg mt-2";
    document.getElementById("student-reward-select-all").checked = false;
    document.getElementById("student-reward-modal").classList.add("show");
    void loadStudentRewardInventory();
}

function closeStudentRewardModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById("student-reward-modal").classList.remove("show");
    currentRewardStudentId = null;
    currentStudentRewardData = null;
}

function setStudentRewardStatus(message, isError = false) {
    const status = document.getElementById("student-reward-status");
    status.className = `status-msg mt-2 ${isError ? "status-error" : ""}`;
    status.textContent = message;
}

async function requestStudentRewardManagement(mode, extra = {}) {
    const teacher = getCurrentTeacherSession();
    if (!teacher || teacher.role !== "teacher" || !teacher.username || !teacher.sessionToken || !currentRewardStudentId) {
    setStudentRewardStatus("Phiên giáo viên hiện tại đã cũ. Vui lòng đăng nhập lại để tiếp tục.", true);
    return null;
    }

    const buttons = document.querySelectorAll("#student-reward-modal button");
    buttons.forEach(button => { button.disabled = true; });
    setStudentRewardStatus(mode === "get" ? "Đang tải bộ sưu tập..." : "Đang cập nhật phần thưởng...");
    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        action: "manage_student_rewards",
        mode,
        student_id: currentRewardStudentId,
        teacher_username: teacher.username,
        teacher_session_token: teacher.sessionToken,
        ...extra
        })
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
        setStudentRewardStatus(result.message || "Không thể quản lý phần thưởng.", true);
        return null;
    }

    currentStudentRewardData = result.data;
    renderStudentRewardInventory(result.data);
    document.getElementById("student-reward-controls").style.display = "block";
    setStudentRewardStatus(result.message || "Đã cập nhật phần thưởng.");
    return result.data;
    } catch (error) {
    console.error("Không thể kết nối khi quản lý phần thưởng học sinh:", error);
    setStudentRewardStatus("Lỗi kết nối máy chủ khi quản lý phần thưởng.", true);
    return null;
    } finally {
    buttons.forEach(button => { button.disabled = false; });
    if (currentStudentRewardData) {
        const hasRewards = currentStudentRewardData.inventory.length > 0;
        document.getElementById("btn-remove-selected-rewards").disabled =
        !hasRewards || !document.querySelector(".student-reward-select:checked");
        document.getElementById("btn-remove-all-rewards").disabled = !hasRewards;
    }
    }
}

async function loadStudentRewardInventory() {
    await requestStudentRewardManagement("get");
}

function renderStudentRewardInventory(data) {
    const inventory = document.getElementById("student-reward-inventory");
    const summary = document.getElementById("student-reward-summary");
    const addSelect = document.getElementById("student-reward-add-select");
    const ownedCards = Array.isArray(data.inventory) ? data.inventory : [];
    const memes = Array.isArray(data.memes) ? data.memes : [];
    const totalCards = ownedCards.reduce((total, meme) => total + Number(meme.count || 0), 0);
    summary.textContent = `Đang sở hữu ${ownedCards.length} loại thẻ, tổng cộng ${totalCards} thẻ. Chọn thẻ và số lượng cần xóa.`;

    addSelect.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "-- Chọn thẻ cần thêm --";
    addSelect.appendChild(placeholder);
    [...memes].sort((a, b) => String(a.rarity).localeCompare(String(b.rarity)) || String(a.slogan || "").localeCompare(String(b.slogan || ""), "vi"))
    .forEach(meme => {
        const option = document.createElement("option");
        option.value = String(meme.id);
        option.textContent = `[${meme.rarity || "?"}] ${meme.slogan || `Thẻ #${meme.id}`}`;
        addSelect.appendChild(option);
    });

    inventory.replaceChildren();
    const selectAll = document.getElementById("student-reward-select-all");
    selectAll.checked = false;
    selectAll.indeterminate = false;
    selectAll.disabled = ownedCards.length === 0;
    if (ownedCards.length === 0) {
    const empty = document.createElement("p");
    empty.style.cssText = "grid-column: 1 / -1; margin: 0; padding: 20px; color: #64748b; text-align: center;";
    empty.textContent = "Học sinh chưa sở hữu thẻ nào.";
    inventory.appendChild(empty);
    document.getElementById("btn-remove-selected-rewards").disabled = true;
    document.getElementById("btn-remove-all-rewards").disabled = true;
    return;
    }

    ownedCards.forEach(meme => {
    const card = document.createElement("label");
    card.className = "student-reward-item";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "student-reward-select";
    checkbox.dataset.memeId = String(meme.id);
    checkbox.setAttribute("aria-label", `Chọn thẻ ${meme.slogan || meme.id} để xóa`);
    checkbox.addEventListener("change", updateStudentRewardSelectionState);
    const image = document.createElement("img");
    image.src = meme.image || "";
    image.alt = "";
    image.loading = "lazy";
    const info = document.createElement("span");
    info.className = "student-reward-item-info";
    const title = document.createElement("strong");
    title.textContent = `[${meme.rarity || "?"}] ${meme.slogan || `Thẻ #${meme.id}`}`;
    const count = document.createElement("span");
    count.textContent = `Đang sở hữu: ${meme.count}`;
    const removeCount = document.createElement("input");
    removeCount.type = "number";
    removeCount.className = "student-reward-remove-count";
    removeCount.min = "1";
    removeCount.max = String(meme.count);
    removeCount.value = "1";
    removeCount.dataset.memeId = String(meme.id);
    removeCount.setAttribute("aria-label", `Số bản sao cần xóa, tối đa ${meme.count}`);
    info.append(title, count, removeCount);
    card.append(checkbox, image, info);
    inventory.appendChild(card);
    });
    document.getElementById("btn-remove-selected-rewards").disabled = true;
    document.getElementById("btn-remove-all-rewards").disabled = false;
}

function toggleAllStudentRewardSelections(checked) {
    document.querySelectorAll(".student-reward-select").forEach(checkbox => {
    checkbox.checked = checked;
    });
    updateStudentRewardSelectionState();
}

function updateStudentRewardSelectionState() {
    const checkboxes = [...document.querySelectorAll(".student-reward-select")];
    const selectedCount = checkboxes.filter(checkbox => checkbox.checked).length;
    const selectAll = document.getElementById("student-reward-select-all");
    selectAll.checked = checkboxes.length > 0 && selectedCount === checkboxes.length;
    selectAll.indeterminate = selectedCount > 0 && selectedCount < checkboxes.length;
    document.getElementById("btn-remove-selected-rewards").disabled = selectedCount === 0;
}

async function addStudentReward() {
    const memeId = Number(document.getElementById("student-reward-add-select").value);
    if (!Number.isInteger(memeId) || memeId <= 0) {
    setStudentRewardStatus("Vui lòng chọn một thẻ cần thêm.", true);
    return;
    }
    await requestStudentRewardManagement("add", { meme_id: memeId });
}

async function removeSelectedStudentRewards() {
    const selections = [...document.querySelectorAll(".student-reward-select:checked")]
    .map(checkbox => {
        const memeId = checkbox.dataset.memeId;
        const countInput = checkbox.closest(".student-reward-item")?.querySelector(".student-reward-remove-count");
        return { meme_id: Number(memeId), count: Number(countInput?.value) };
    });
    if (selections.length === 0) {
    setStudentRewardStatus("Chọn ít nhất một thẻ cần xóa.", true);
    return;
    }
    if (selections.some(item => !Number.isInteger(item.count) || item.count < 1)) {
    setStudentRewardStatus("Số lượng xóa phải là số nguyên dương.", true);
    return;
    }
    await requestStudentRewardManagement("remove_selected", { selections });
}

async function removeAllStudentRewards() {
    const confirmed = await showStyledConfirm("Bạn có chắc muốn xóa toàn bộ thẻ trong bộ sưu tập của học sinh này? Không thể hoàn tác thao tác này.");
    if (!confirmed) return;
    await requestStudentRewardManagement("remove_all");
}

async function submitSaveFeedback(e) {
    e.preventDefault();
    const statusEl = document.getElementById("feedback-student-status");
    statusEl.className = "status-msg mt-2";
    statusEl.textContent = "Đang lưu đánh giá...";

    const studentId = document.getElementById("feedback-stu-id").value;
    const feedbackText = document.getElementById("feedback-stu-text").value.trim();

    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        action: "save_feedback",
        student_id: studentId,
        feedback: feedbackText
        })
    });
    const result = await res.json();

    if (!result.success) {
        statusEl.className = "status-msg status-error mt-2";
        statusEl.textContent = result.message || "Lưu đánh giá thất bại!";
        return;
    }

    const stu = cachedStudentsList.find(s => String(s.id) === String(studentId));
    if (stu) stu.feedback = feedbackText;
    saveCurrentFilterState();

    showTeacherNotification("Lưu đánh giá cho học sinh thành công!");
    closeFeedbackModal();
    } catch (err) {
    statusEl.className = "status-msg status-error mt-2";
    statusEl.textContent = "Lỗi kết nối máy chủ!";
    }
}

async function submitUpdateStudent(e) {
    e.preventDefault();
    const statusEl = document.getElementById("edit-student-status");
    statusEl.className = "status-msg mt-2";
    statusEl.textContent = "Đang cập nhật...";

    const studentId = document.getElementById("edit-stu-id").value;
    const lastName = document.getElementById("edit-stu-lastname").value.trim();
    const firstName = document.getElementById("edit-stu-firstname").value.trim();
    const className = document.getElementById("edit-stu-class").value.trim();
    const password = document.getElementById("edit-stu-password").value.trim();

    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        action: "update_student",
        student_id: studentId,
        lastName,
        firstName,
        className,
        password,
        coin_delta: 0 
        })
    });
    const result = await res.json();

    if (!result.success) {
        statusEl.className = "status-msg status-error mt-2";
        statusEl.textContent = result.message || "Cập nhật thất bại!";
        return;
    }

    showTeacherNotification("Cập nhật thông tin học sinh thành công!");
    closeEditStudentModal();
    fetchStudentList(true);
    } catch (err) {
    statusEl.className = "status-msg status-error mt-2";
    statusEl.textContent = "Lỗi kết nối máy chủ!";
    }
}

function getSavedFilters() {
    try {
    return JSON.parse(sessionStorage.getItem("teacher_student_filter") || "{}");
    } catch (e) {
    return {};
    }
}

function saveCurrentFilterState() {
    const school = filterSchoolSelect.value;
    const className = document.getElementById("filter-class-input").value.trim();
    const sortBy = document.getElementById("sort-select").value;

    const togglers = document.querySelectorAll('.col-toggler');
    const checkedCols = [];
    togglers.forEach(chk => {
    if (chk.checked) checkedCols.push(chk.getAttribute('data-col'));
    });

    const saved = getSavedFilters() || {};
    const filterState = {
    ...saved,
    school,
    className,
    sortBy,
    students: cachedStudentsList
    };

    if (window.innerWidth <= 768) {
    filterState.checkedColsMobile = checkedCols;
    } else {
    filterState.checkedCols = checkedCols;
    }

    sessionStorage.setItem("teacher_student_filter", JSON.stringify(filterState));
}

function restoreFilterAndStudents() {
    const saved = getSavedFilters() || {};
    const togglers = document.querySelectorAll('.col-toggler');
    const isMobile = window.innerWidth <= 768;
    const selectedCols = isMobile
    ? (Array.isArray(saved.checkedColsMobile) ? saved.checkedColsMobile : ['0', '1', '2', '8'])
    : (Array.isArray(saved.checkedCols) ? saved.checkedCols : []);

    togglers.forEach(chk => {
    chk.checked = selectedCols.includes(chk.getAttribute('data-col'));
    });
    applyColumnVisibility();

    if (!saved || !saved.school) return;

    if (saved.school) filterSchoolSelect.value = saved.school;
    if (saved.className !== undefined) document.getElementById("filter-class-input").value = saved.className;
    if (saved.sortBy) document.getElementById("sort-select").value = saved.sortBy;

    if (saved.students && saved.students.length > 0) {
    cachedStudentsList = saved.students;
    sortAndRenderStudents();
    }
}

let isMobileColumnLayout = window.innerWidth <= 768;
window.addEventListener("resize", () => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile === isMobileColumnLayout) return;
    isMobileColumnLayout = isMobile;

    const saved = getSavedFilters() || {};
    const togglers = document.querySelectorAll('.col-toggler');
    const selectedCols = isMobile
    ? (Array.isArray(saved.checkedColsMobile) ? saved.checkedColsMobile : ['0', '1', '2', '8'])
    : (Array.isArray(saved.checkedCols) ? saved.checkedCols : []);

    togglers.forEach(chk => {
    chk.checked = selectedCols.includes(chk.getAttribute('data-col'));
    });

    applyColumnVisibility();
});

async function fetchStudentList(isSilentUpdate = false) {
    const school = filterSchoolSelect.value;
    const className = document.getElementById("filter-class-input").value.trim();

    if (!school) {
    showTeacherNotification("Vui lòng chọn trường học trước!");
    return;
    }

    if (!isSilentUpdate) {
    studentListBody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 32px;">Đang tải dữ liệu... ⏳</td></tr>`;
    }

    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_students", school: school, className: className })
    });
    const result = await res.json();
    
    if (!res.ok || !result.success) {
        studentListBody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:red;">${result.message || "Lỗi tải dữ liệu"}</td></tr>`;
        return;
    }

    cachedStudentsList = result.data.students || [];
    sortAndRenderStudents();
    saveCurrentFilterState();
    } catch (err) {
    studentListBody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:red;">Lỗi kết nối đến máy chủ!</td></tr>`;
    }
}

function clearStudentListSearch() {
    filterSchoolSelect.value = "";
    document.getElementById("filter-class-input").value = "";
    cachedStudentsList = [];
    studentListBody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 32px; color: #64748b;">Vui lòng chọn trường và bấm "Xem danh sách"</td></tr>`;
    sessionStorage.removeItem("teacher_student_filter");
    if (typeof turnOffAllBatchModes === 'function') {
    turnOffAllBatchModes();
    }
}

/* TÍNH NĂNG CHỌN NHIỀU HỌC SINH ĐỂ THAO TÁC */
let isQuickBanMode = false;
let isQuickUnbanMode = false;
let isBatchCoinMode = false;
let isQuickDeleteMode = false;

function activateBatchMode(mode) {
    turnOffAllBatchModes();

    document.getElementById('batch-action-wrapper').style.display = 'none';
    document.getElementById('btn-cancel-batch-mode').style.display = 'inline-flex';

    if (mode === 'coin') {
    isBatchCoinMode = true;
    document.getElementById('btn-confirm-batch-coin-mode').style.display = 'inline-flex';
    } else if (mode === 'ban') {
    isQuickBanMode = true;
    document.getElementById('btn-confirm-quick-ban').style.display = 'inline-flex';
    } else if (mode === 'unban') {
    isQuickUnbanMode = true;
    document.getElementById('btn-confirm-quick-unban').style.display = 'inline-flex';
    } else if (mode === 'delete') {
    isQuickDeleteMode = true;
    document.getElementById('btn-confirm-quick-delete').style.display = 'inline-flex';
    }

    if (document.getElementById('student-list-body').innerHTML !== '') {
    sortAndRenderStudents();
    }
}

function turnOffAllBatchModes() {
    isQuickBanMode = false;
    isQuickUnbanMode = false;
    isBatchCoinMode = false;
    isQuickDeleteMode = false;

    document.getElementById('btn-confirm-batch-coin-mode').style.display = 'none';
    document.getElementById('btn-confirm-quick-ban').style.display = 'none';
    document.getElementById('btn-confirm-quick-unban').style.display = 'none';
    document.getElementById('btn-confirm-quick-delete').style.display = 'none';
    document.getElementById('btn-cancel-batch-mode').style.display = 'none';

    document.getElementById('batch-action-wrapper').style.display = 'inline-block';

    const masterChk = document.getElementById("select-all-batch");
    if (masterChk) masterChk.checked = false;
    updateBatchSelectionCount();

    if (document.getElementById('student-list-body').innerHTML !== '') {
    sortAndRenderStudents();
    }
}

function toggleSelectAllBatch(masterCheckbox) {
    const checkboxes = document.querySelectorAll('.batch-checkbox');
    checkboxes.forEach(cb => cb.checked = masterCheckbox.checked);
    updateBatchSelectionCount();
}

function updateBatchSelectionCount() {
    const count = document.querySelectorAll('.batch-checkbox:checked').length;
    const banSpan = document.getElementById("quick-ban-count");
    const unbanSpan = document.getElementById("quick-unban-count");
    const coinSpan = document.getElementById("batch-coin-selected-count");
    const delSpan = document.getElementById("quick-delete-count");

    if (banSpan) banSpan.textContent = count;
    if (unbanSpan) unbanSpan.textContent = count;
    if (coinSpan) coinSpan.textContent = count;
    if (delSpan) delSpan.textContent = count;
}

async function executeBatchBan() {
    const selectedCheckboxes = document.querySelectorAll('.batch-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
    showTeacherNotification("Vui lòng tích chọn ít nhất 1 học sinh ở các ô bên trái để khóa!");
    return;
    }

    const reason = await showStyledPrompt(`Nhập lý do khóa cho ${selectedCheckboxes.length} tài khoản này:`, "Vi phạm nội quy");
    if (reason === null) return; 

    const btnConfirm = document.getElementById("btn-confirm-quick-ban");
    btnConfirm.disabled = true;
    btnConfirm.textContent = "Đang xử lý...";

    const usernamesToBan = Array.from(selectedCheckboxes).map(cb => cb.getAttribute('data-username'));
    let successCount = 0, failCount = 0;

    for (const uname of usernamesToBan) {
        try {
            const res = await fetch("/.netlify/functions/auth", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "ban_account", username: uname, reason: reason })
            });
            const result = await res.json();
            if (result.success) successCount++; else failCount++;
        } catch (e) { failCount++; }
    }
    showTeacherNotification(`Đã khóa thành công ${successCount} tài khoản.${failCount > 0 ? ` Thất bại ${failCount} tài khoản.` : ''}`);
    btnConfirm.disabled = false;
    btnConfirm.innerHTML = `Tiến hành khóa (<span id="quick-ban-count">0</span>)`;
    turnOffAllBatchModes();
    fetchStudentList(true); 
}

async function executeBatchUnban() {
    const selectedCheckboxes = document.querySelectorAll('.batch-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
    showTeacherNotification("Vui lòng tích chọn ít nhất 1 học sinh ở các ô bên trái để mở khóa!");
    return;
    }
    if (!await showStyledConfirm(`Bạn có chắc chắn muốn mở khóa cho ${selectedCheckboxes.length} tài khoản đã chọn?`)) return;

    const btnConfirm = document.getElementById("btn-confirm-quick-unban");
    btnConfirm.disabled = true;
    btnConfirm.textContent = "Đang xử lý...";

    const usernamesToUnban = Array.from(selectedCheckboxes).map(cb => cb.getAttribute('data-username'));
    let successCount = 0, failCount = 0;

    for (const uname of usernamesToUnban) {
        try {
            const res = await fetch("/.netlify/functions/auth", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "unban_account", username: uname })
            });
            const result = await res.json();
            if (result.success) successCount++; else failCount++;
        } catch (e) { failCount++; }
    }
    showTeacherNotification(`Đã mở khóa thành công ${successCount} tài khoản.${failCount > 0 ? ` Thất bại ${failCount} tài khoản.` : ''}`);
    btnConfirm.disabled = false;
    btnConfirm.innerHTML = `Tiến hành mở khóa (<span id="quick-unban-count">0</span>)`;
    turnOffAllBatchModes();
    fetchStudentList(true); 
}

function sortAndRenderStudents() {
    if (!cachedStudentsList || cachedStudentsList.length === 0) {
    studentListBody.innerHTML = `<tr><td colspan="10" style="text-align:center;">Không tìm thấy học sinh nào.</td></tr>`;
    return;
    }

    const sortBy = document.getElementById("sort-select").value;

    let sortedList = [...cachedStudentsList];
    sortedList.sort((a, b) => {
    const nameA = (a.firstName || "").toLowerCase();
    const nameB = (b.firstName || "").toLowerCase();
    const lastNameA = (a.lastName || "").toLowerCase();
    const lastNameB = (b.lastName || "").toLowerCase();

    if (sortBy === "name-az") {
        const nameCompare = nameA.localeCompare(nameB, 'vi');
        if (nameCompare === 0) return lastNameA.localeCompare(lastNameB, 'vi');
        return nameCompare;
    } else if (sortBy === "name-za") {
        const nameCompare = nameB.localeCompare(nameA, 'vi');
        if (nameCompare === 0) return lastNameB.localeCompare(lastNameA, 'vi');
        return nameCompare;
    } else if (sortBy === "total-coins-desc") {
        const coinA = Number(a.total_coins) || 0;
        const coinB = Number(b.total_coins) || 0;
        return coinB - coinA;
    } else if (sortBy === "total-coins-asc") {
        const coinA = Number(a.total_coins) || 0;
        const coinB = Number(b.total_coins) || 0;
        return coinA - coinB;
    }
    return 0;
    });

    let seenNames = new Set();

    studentListBody.innerHTML = "";
    sortedList.forEach((stu, index) => {
    const tr = document.createElement("tr");
    const rawPassword = stu.password || "---";

    const lastName = (stu.lastName || '').trim();
    const firstName = (stu.firstName || '').trim();

    const hasToneInLastName = hasVietnameseTone(lastName);
    const hasToneInFirstName = hasVietnameseTone(firstName);
    const isBothUnaccented = (!hasToneInLastName && !hasToneInFirstName) && (lastName !== '' || firstName !== '');

    let isDuplicate = false;
    if (typeof isQuickDeleteMode !== 'undefined' && isQuickDeleteMode) {
        const fullNameKey = (lastName + " " + firstName).toLowerCase();
        if (seenNames.has(fullNameKey)) {
        isDuplicate = true;
        } else {
        seenNames.add(fullNameKey);
        }
    }
    
    let isChecked = false;
    if (typeof isQuickDeleteMode !== 'undefined' && isQuickDeleteMode) {
        isChecked = isDuplicate;
    } else if ((typeof isQuickBanMode !== 'undefined' && isQuickBanMode) || 
                (typeof isQuickUnbanMode !== 'undefined' && isQuickUnbanMode) || 
                (typeof isBatchCoinMode !== 'undefined' && isBatchCoinMode)) {
        isChecked = true;
    }

    if (stu.is_highlighted === true || stu.is_highlighted === "true") {
        tr.className = "row-student-good";
        tr.title = "Học sinh được đánh dấu: Tốt ⭐";
    } else if (stu.is_highlighted === false || stu.is_highlighted === "false") {
        tr.className = "row-student-bad";
        tr.title = "Học sinh được đánh dấu: Kém ⚠️";
    } else if (isBothUnaccented || isDuplicate) {
        tr.className = "row-unaccented-highlight";
        let titles = [];
        if (isBothUnaccented) titles.push("Cả họ và tên đều chưa có dấu tiếng Việt");
        if (isDuplicate) titles.push("Học sinh bị trùng tên (Đã tự động chọn để xóa)");
        tr.title = titles.join(" | ");
    }

    const isMarked = stu.is_highlighted === true || stu.is_highlighted === false || stu.is_highlighted === "true" || stu.is_highlighted === "false";

    tr.innerHTML = `
        <td data-col="checkbox" style="display: none; text-align: center;">
            <input type="checkbox" class="batch-checkbox" value="${stu.id}" data-username="${stu.username}" onchange="updateBatchSelectionCount()" ${isChecked ? 'checked' : ''}>
        </td>
        <td data-col="0">${index + 1}</td>
        <td data-col="1">${stu.lastName || '---'}</td>
        <td data-col="2" style="font-weight: 500;">${stu.firstName || '---'}</td>
        <td data-col="3">
        <code class="username-cell-code">${stu.username || '---'}</code>
        ${stu.is_banned ? '<span style="color:#ef4444; font-size:11px; font-weight:bold; display:block;">🔒 Bị khóa</span>' : ''}
        </td>
        <td data-col="4">
        <span id="pwd-text-${index}" style="font-family: monospace; margin-right: 6px;">••••••</span>
        <button type="button" onclick="toggleTablePassword('${escapeForJsString(rawPassword)}', 'pwd-text-${index}', this)" style="background: none; border: none; cursor: pointer; font-size: 14px; padding: 0;" title="Hiện/Ẩn mật khẩu">👁️</button>
        </td>
        <td data-col="5">${stu.className || '---'}</td>
        <td data-col="6"><span class="badge-coin ${stu.total_coins < 0 ? 'negative' : ''}">💰 ${stu.total_coins !== undefined ? stu.total_coins : '0'}</span></td>
        <td data-col="7"><span class="badge-coin ${stu.coins < 0 ? 'negative' : ''}">💰 ${stu.coins !== undefined ? stu.coins : '0'}</span></td>
        <td data-col="8">
        <div class="action-dropdown-wrapper">
            <button type="button" class="btn-action-main" onclick="toggleActionDropdown(event, ${index})">
            Thao tác ▾
            </button>
            <div class="action-dropdown-menu" id="action-menu-${index}">
            <button type="button" class="action-dropdown-item" onclick="openSingleCoinModal('${stu.id}')">
                💰 Xu
            </button>
            <button type="button" class="action-dropdown-item" onclick="openEditStudentModal('${stu.id}')">
                ✏️ Sửa
            </button>
            <button type="button" class="action-dropdown-item" onclick="openFeedbackModal('${stu.id}')">
                ✍️ Nhận xét
            </button>
            
            <button type="button" class="action-dropdown-item" style="color: #16a34a;" onclick="setStudentHighlight('${stu.id}', true)">
                ⭐ Đánh dấu: Tốt
            </button>
            <button type="button" class="action-dropdown-item" style="color: #dc2626;" onclick="setStudentHighlight('${stu.id}', false)">
                ⚠️ Đánh dấu: Kém
            </button>
            ${isMarked ? `
                <button type="button" class="action-dropdown-item" style="color: #64748b;" onclick="setStudentHighlight('${stu.id}', null)">
                ↺ Hủy đánh dấu
                </button>
            ` : ''}
            ${stu.is_banned
                ? `<button type="button" class="action-dropdown-item" style="color:#16a34a;" onclick="unbanStudent('${stu.username}')">🔓 Mở khóa tài khoản</button>`
                : `<button type="button" class="action-dropdown-item danger" onclick="banStudent('${stu.username}')">🔒 Khóa tài khoản</button>`
            }
            <button type="button" class="action-dropdown-item danger" onclick="openDeleteStudentModal('${stu.id}')">
                🗑️ Xóa tài khoản
            </button>
            <button type="button" class="action-dropdown-item" style="color: #0f766e;" onclick="quickLoginAsStudent('${stu.id}', '${escapeForJsString(stu.username || '')}', '${escapeForJsString(stu.lastName || '')}', '${escapeForJsString(stu.firstName || '')}', '${escapeForJsString(stu.className || '')}', '${escapeForJsString(stu.grade || '')}')">
                🚀 Đăng nhập nhanh
            </button>
            <button type="button" class="action-dropdown-item" style="color: #7c3aed;" onclick="openStudentRewardModal('${stu.id}')">
                🎁 Quản lý phần thưởng
            </button>
            </div>
        </div>
        </td>
    `;
    studentListBody.appendChild(tr);
    });

    applyColumnVisibility();
    
    const isAnyBatchMode = (typeof isQuickBanMode !== 'undefined' && isQuickBanMode) || 
                            (typeof isQuickUnbanMode !== 'undefined' && isQuickUnbanMode) || 
                            (typeof isBatchCoinMode !== 'undefined' && isBatchCoinMode) || 
                            (typeof isQuickDeleteMode !== 'undefined' && isQuickDeleteMode);
                            
    const chkHeaders = document.querySelectorAll('th[data-col="checkbox"]');
    const chkCells = document.querySelectorAll('td[data-col="checkbox"]');
    const masterChk = document.getElementById("select-all-batch");
    
    if (isAnyBatchMode) {
    chkHeaders.forEach(el => el.style.display = "table-cell");
    chkCells.forEach(el => el.style.display = "table-cell");
    
    if (masterChk) {
        masterChk.checked = (typeof isQuickBanMode !== 'undefined' && isQuickBanMode) || 
                            (typeof isQuickUnbanMode !== 'undefined' && isQuickUnbanMode) || 
                            (typeof isBatchCoinMode !== 'undefined' && isBatchCoinMode);
    }
    
    updateBatchSelectionCount();
    } else {
    chkHeaders.forEach(el => el.style.display = "none");
    chkCells.forEach(el => el.style.display = "none");
    if (masterChk) masterChk.checked = false;
    }
}

function escapeForJsString(value) {
    return String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function toggleTablePassword(realPassword, textElementId, btn) {
    const span = document.getElementById(textElementId);
    if (span.textContent === "••••••") {
    span.textContent = realPassword;
    btn.textContent = "🙈";
    } else {
    span.textContent = "••••••";
    btn.textContent = "👁️";
    }
}

function getCurrentTeacherSession() {
    try {
    const localUser = localStorage.getItem("user_session");
    if (localUser) return JSON.parse(localUser);
    const sessionUser = sessionStorage.getItem("user_session");
    if (sessionUser) return JSON.parse(sessionUser);
    } catch (e) {}
    return null;
}

function quickLoginAsStudent(studentId, username, lastName, firstName, className, grade) {
    const teacherSession = getCurrentTeacherSession();
    if (teacherSession && teacherSession.role === "teacher") {
    sessionStorage.setItem("admin_quick_login_backup", JSON.stringify(teacherSession));
    localStorage.setItem("admin_quick_login_backup", JSON.stringify(teacherSession));
    }

    const studentSession = {
    id: studentId,
    username: username || "",
    fullName: `${lastName || ""} ${firstName || ""}`.trim(),
    lastName: lastName || "",
    firstName: firstName || "",
    className: className || "",
    school: document.getElementById("filter-school-select")?.value || "",
    role: "student",
    grade: grade || "",
    username_change_limit: 2
    };

    localStorage.setItem("user_session", JSON.stringify(studentSession));
    sessionStorage.setItem("user_session", JSON.stringify(studentSession));
    sessionStorage.setItem("current_user", JSON.stringify(studentSession));
    window.location.href = "/student";
}

function applyColumnVisibility() {
    const togglers = document.querySelectorAll('.col-toggler');
    const table = document.getElementById('student-table');
    const labelSpan = document.getElementById('dropdown-label');
    
    let checkedCount = 0;
    let totalCount = togglers.length;

    togglers.forEach(chk => {
    if (chk.checked) checkedCount++;
    });

    togglers.forEach(chk => {
    const colIdx = chk.getAttribute('data-col');
    const isChecked = chk.checked;

    const cells = table.querySelectorAll(`[data-col="${colIdx}"]`);
    cells.forEach(cell => {
        cell.style.display = (checkedCount === 0 || isChecked) ? '' : 'none';
    });
    });

    if (checkedCount === 0) {
    labelSpan.textContent = "-- Hiển thị tất cả (Mặc định) --";
    } else if (checkedCount === totalCount) {
    labelSpan.textContent = "Đã chọn (Tất cả)";
    } else {
    labelSpan.textContent = `Đã chọn (${checkedCount}/${totalCount} cột)`;
    }

    saveCurrentFilterState();
}

function clearColumnFilter() {
    const togglers = document.querySelectorAll('.col-toggler');
    togglers.forEach(chk => {
    chk.checked = false;
    });
    applyColumnVisibility();
}

function openBatchDeleteModal() {
    const selectedCheckboxes = document.querySelectorAll('.batch-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
    showTeacherNotification("Vui lòng tích chọn ít nhất 1 học sinh ở các ô bên trái để xóa!");
    return;
    }
    document.getElementById("batch-delete-count-display").textContent = selectedCheckboxes.length;
    document.getElementById("batch-delete-admin-password").value = "";
    document.getElementById("batch-delete-status").textContent = "";
    document.getElementById("batch-delete-status").className = "status-msg mt-2";
    document.getElementById("batch-delete-student-modal").classList.add("show");
}

function closeBatchDeleteModal() {
    document.getElementById("batch-delete-student-modal").classList.remove("show");
}

async function submitBatchDeleteStudent(e) {
    e.preventDefault();
    const statusEl = document.getElementById("batch-delete-status");
    const btnDelete = document.getElementById("btn-confirm-batch-delete");
    const adminPassword = document.getElementById("batch-delete-admin-password").value.trim();

    const selectedCheckboxes = document.querySelectorAll('.batch-checkbox:checked');
    const studentIds = Array.from(selectedCheckboxes).map(cb => cb.value);

    if (!adminPassword) {
    statusEl.className = "status-msg status-error mt-2";
    statusEl.textContent = "Vui lòng nhập mật khẩu giáo viên!";
    return;
    }

    btnDelete.disabled = true;
    statusEl.className = "status-msg mt-2";
    statusEl.textContent = "Đang xác thực và xóa dữ liệu...";

    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        action: "batch_delete_students",
        student_ids: studentIds,
        teacher_username: user.username,
        password: adminPassword
        })
    });
    const result = await res.json();

    if (!result.success) {
        statusEl.className = "status-msg status-error mt-2";
        statusEl.textContent = result.message || "Xóa hàng loạt thất bại!";
        btnDelete.disabled = false;
        return;
    }

    showTeacherNotification(result.message || "Đã xóa hàng loạt thành công!");
    closeBatchDeleteModal();
    turnOffAllBatchModes();
    fetchStudentList(true);
    } catch (err) {
    statusEl.className = "status-msg status-error mt-2";
    statusEl.textContent = "Lỗi kết nối máy chủ!";
    } finally {
    btnDelete.disabled = false;
    }
}

function openBatchCoinModal() {
    const selectedCheckboxes = document.querySelectorAll('.batch-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
    showTeacherNotification("Vui lòng tích chọn ít nhất 1 học sinh ở các ô bên trái để cộng/trừ xu!");
    return;
    }
    
    window.selectedBatchCoinIds = Array.from(selectedCheckboxes).map(cb => cb.value);

    document.getElementById("batch-coin-count").textContent = window.selectedBatchCoinIds.length;
    document.getElementById("batch-coin-delta").value = "";
    document.getElementById("batch-coin-status").textContent = "";
    document.getElementById("batch-coin-status").className = "status-msg mt-2";
    document.getElementById("batch-coin-modal").classList.add("show");
}

function closeBatchCoinModal() {
    document.getElementById("batch-coin-modal").classList.remove("show");
}

async function submitBatchCoin(e) {
    e.preventDefault();
    const statusEl = document.getElementById("batch-coin-status");
    const btnSubmit = document.getElementById("btn-confirm-batch-coin");
    const deltaRaw = document.getElementById("batch-coin-delta").value;
    const coinDelta = parseInt(deltaRaw, 10);

    if (isNaN(coinDelta) || coinDelta === 0) {
    statusEl.className = "status-msg status-error mt-2";
    statusEl.textContent = "Vui lòng nhập số lượng xu hợp lệ (khác 0)!";
    return;
    }

    const studentIds = window.selectedBatchCoinIds || [];
    if (studentIds.length === 0) return;

    btnSubmit.disabled = true;
    statusEl.className = "status-msg mt-2";
    statusEl.textContent = "Đang cập nhật xu...";

    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        action: "batch_update_coins",
        student_ids: studentIds, 
        coin_delta: coinDelta
        })
    });
    const result = await res.json();

    if (!result.success) {
        statusEl.className = "status-msg status-error mt-2";
        statusEl.textContent = result.message || "Cập nhật thất bại!";
        btnSubmit.disabled = false;
        return;
    }

    showTeacherNotification(result.message || "Cập nhật xu các học sinh đã chọn thành công!");
    closeBatchCoinModal();
    if (typeof turnOffAllBatchModes === 'function') turnOffAllBatchModes();
    fetchStudentList(true);
    } catch (err) {
    statusEl.className = "status-msg status-error mt-2";
    statusEl.textContent = "Lỗi kết nối máy chủ!";
    } finally {
    btnSubmit.disabled = false;
    }
}

/* CHUYỂN LỚP HÀNG LOẠT */
let transferStudentsList = [];

async function fetchStudentsForTransfer() {
    const school = document.getElementById("transfer-school-select").value;
    const oldClass = document.getElementById("transfer-old-class").value.trim();
    const wrapper = document.getElementById("transfer-preview-wrapper");
    const tbody = document.getElementById("transfer-preview-tbody");
    const statusEl = document.getElementById("transfer-status");
    
    statusEl.textContent = "";

    if (!school) {
    showTeacherNotification("Vui lòng chọn trường học!");
    return;
    }
    if (!oldClass) {
    showTeacherNotification("Vui lòng nhập tên lớp hiện tại cần tìm!");
    return;
    }

    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center;">Đang tải danh sách học sinh... ⏳</td></tr>`;
    wrapper.style.display = "block";

    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_students", school: school, className: oldClass })
    });
    const result = await res.json();
    
    if (!result.success || !result.data.students || result.data.students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#ef4444;">Không tìm thấy học sinh nào thuộc lớp ${oldClass}</td></tr>`;
        transferStudentsList = [];
        document.getElementById("transfer-count").textContent = 0;
        return;
    }

    transferStudentsList = result.data.students;
    document.getElementById("transfer-count").textContent = transferStudentsList.length;
    renderTransferTable();
    } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">Lỗi kết nối đến máy chủ!</td></tr>`;
    }
}

function renderTransferTable() {
    const tbody = document.getElementById("transfer-preview-tbody");
    tbody.innerHTML = "";
    document.getElementById("transfer-select-all").checked = true;

    transferStudentsList.forEach((stu) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td style="text-align:center;"><input type="checkbox" class="transfer-checkbox" value="${stu.id}" checked></td>
        <td>${stu.lastName || ''} <strong>${stu.firstName || ''}</strong></td>
        <td><code>${stu.username}</code></td>
        <td>${stu.className}</td>
    `;
    tbody.appendChild(tr);
    });
}

function toggleSelectAllTransfer(checkbox) {
    const checkboxes = document.querySelectorAll('.transfer-checkbox');
    checkboxes.forEach(cb => cb.checked = checkbox.checked);
}

async function executeBatchTransfer() {
    const newClass = document.getElementById("transfer-new-class").value.trim();
    const statusEl = document.getElementById("transfer-status");
    const btnSubmit = document.getElementById("btn-submit-transfer");

    if (!newClass) {
    statusEl.className = "status-msg status-error";
    statusEl.textContent = "Vui lòng nhập tên lớp mới để chuyển đổi!";
    return;
    }

    const checkboxes = document.querySelectorAll('.transfer-checkbox:checked');
    const selectedIds = Array.from(checkboxes).map(cb => cb.value);

    if (selectedIds.length === 0) {
    statusEl.className = "status-msg status-error";
    statusEl.textContent = "Vui lòng đánh dấu chọn ít nhất 1 học sinh để chuyển lớp!";
    return;
    }

    btnSubmit.disabled = true;
    statusEl.className = "status-msg";
    statusEl.textContent = `Đang tiến hành chuyển ${selectedIds.length} học sinh sang lớp ${newClass}... ⏳`;

    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        action: "batch_update_class",
        student_ids: selectedIds,
        new_class: newClass
        })
    });

    const result = await res.json();

    if (!result.success) {
        statusEl.className = "status-msg status-error";
        statusEl.textContent = result.message || "Chuyển lớp thất bại!";
        btnSubmit.disabled = false;
        return;
    }

    statusEl.className = "status-msg status-success";
    statusEl.textContent = `🎉 ${result.message}`;
    
    transferStudentsList = [];
    document.getElementById("transfer-preview-tbody").innerHTML = "";
    document.getElementById("transfer-new-class").value = "";
    document.getElementById("transfer-count").textContent = "0";
    document.getElementById("transfer-old-class").value = newClass;
    
    document.getElementById("filter-class-input").value = newClass;
    fetchStudentList(true);

    } catch (err) {
    statusEl.className = "status-msg status-error";
    statusEl.textContent = "Lỗi kết nối máy chủ!";
    } finally {
    btnSubmit.disabled = false;
    }
}

/* QUẢN LÝ LỊCH SỬ ĐĂNG NHẬP VÀ IP & THIẾT BỊ (TAB 6) */
let loginLogsCache = [];
let currentLogRole = 'student';
let currentLogPage = 1;
let currentLogPageSize = 10;

function getStarredIps() {
    try {
    return JSON.parse(localStorage.getItem("trusted_starred_ips") || "[]");
    } catch (e) {
    return [];
    }
}

function toggleStarIp(ip) {
    let list = getStarredIps();
    if (list.includes(ip)) {
    list = list.filter(item => item !== ip);
    } else {
    list.push(ip);
    }
    localStorage.setItem("trusted_starred_ips", JSON.stringify(list));
    loadIpManagement();
}

function switchLoginView(view) {
    const logsView = document.getElementById("view-login-logs");
    const ipsView = document.getElementById("view-ip-management");
    const btnLogs = document.getElementById("btn-view-logs");
    const btnIps = document.getElementById("btn-view-ips");

    if (view === 'logs') {
    logsView.style.display = "block";
    ipsView.style.display = "none";
    btnLogs.className = "btn btn-primary";
    btnIps.className = "btn btn-secondary";
    } else {
    logsView.style.display = "none";
    ipsView.style.display = "block";
    btnLogs.className = "btn btn-secondary";
    btnIps.className = "btn btn-primary";
    }
}

async function loadLoginHistory() {
    const tbody = document.getElementById("login-history-tbody");
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:24px;">Đang tải dữ liệu nhật ký... ⏳</td></tr>`;

    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_login_history", limit: 1000 })
    });
    const result = await res.json();

    if (!result.success || !result.data.logs) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">${result.message || "Không thể tải nhật ký"}</td></tr>`;
        return;
    }

    loginLogsCache = result.data.logs;
    currentLogPage = 1;
    renderLoginHistory();
    } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Lỗi kết nối máy chủ!</td></tr>`;
    }
}

function filterLoginLogs(role) {
    currentLogRole = role;
    currentLogPage = 1;
    
    const btnStudent = document.getElementById("btn-log-student");
    const btnTeacher = document.getElementById("btn-log-teacher");

    if (btnStudent) btnStudent.className = role === 'student' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
    if (btnTeacher) btnTeacher.className = role === 'teacher' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';

    renderLoginHistory();
}

function changeLogPageSize(size) {
    currentLogPageSize = size === 'all' ? 'all' : parseInt(size, 10);
    currentLogPage = 1;
    renderLoginHistory();
}

function prevLogPage() {
    if (currentLogPage > 1) {
    currentLogPage--;
    renderLoginHistory();
    }
}

function nextLogPage() {
    let filtered = loginLogsCache.filter(l => l.role === currentLogRole);
    const maxPages = currentLogPageSize === 'all' ? 1 : Math.ceil(filtered.length / currentLogPageSize);
    if (currentLogPage < maxPages) {
    currentLogPage++;
    renderLoginHistory();
    }
}

function renderLoginHistory() {
    const tbody = document.getElementById("login-history-tbody");
    const thead = document.getElementById("login-history-thead");
    const isStudentTab = currentLogRole === 'student';

    if (thead) {
    thead.innerHTML = `
        <tr>
        <th>Thời gian</th>
        <th>Tài khoản</th>
        <th>Họ và tên</th>
        ${isStudentTab ? '<th>Lớp</th>' : ''}
        <th>Địa chỉ IP</th>
        </tr>
    `;
    }

    let filtered = loginLogsCache.filter(l => l.role === currentLogRole);
    const totalItems = filtered.length;
    const colSpanNum = isStudentTab ? 5 : 4;

    if (totalItems === 0) {
    tbody.innerHTML = `<tr><td colspan="${colSpanNum}" style="text-align:center; padding:24px; color:#64748b;">Chưa có bản ghi đăng nhập nào cho ${isStudentTab ? 'học sinh' : 'giáo viên'}.</td></tr>`;
    document.getElementById("log-pagination-info").textContent = "Hiển thị 0 - 0 của 0 mục";
    document.getElementById("btn-page-prev").disabled = true;
    document.getElementById("btn-page-next").disabled = true;
    return;
    }

    let pagedData = [];
    let startIdx = 0;
    let endIdx = totalItems;

    if (currentLogPageSize !== 'all') {
    const totalPages = Math.ceil(totalItems / currentLogPageSize);
    if (currentLogPage > totalPages) currentLogPage = totalPages;

    startIdx = (currentLogPage - 1) * currentLogPageSize;
    endIdx = Math.min(startIdx + currentLogPageSize, totalItems);
    pagedData = filtered.slice(startIdx, endIdx);

    document.getElementById("log-pagination-info").textContent = `Hiển thị ${startIdx + 1} - ${endIdx} của ${totalItems} mục`;
    document.getElementById("log-page-current").textContent = `${currentLogPage} / ${totalPages}`;
    document.getElementById("btn-page-prev").disabled = currentLogPage <= 1;
    document.getElementById("btn-page-next").disabled = currentLogPage >= totalPages;
    } else {
    pagedData = filtered;
    document.getElementById("log-pagination-info").textContent = `Hiển thị tất cả (${totalItems} mục)`;
    document.getElementById("log-page-current").textContent = "1 / 1";
    document.getElementById("btn-page-prev").disabled = true;
    document.getElementById("btn-page-next").disabled = true;
    }

    tbody.innerHTML = "";
    pagedData.forEach(log => {
    const tr = document.createElement("tr");
    const timeStr = new Date(log.login_at).toLocaleString('vi-VN');

    tr.innerHTML = `
        <td><span style="font-size:12px; color:#64748b;">${timeStr}</span></td>
        <td><code>${log.username || '---'}</code></td>
        <td><strong>${log.full_name || '---'}</strong></td>
        ${isStudentTab ? `<td><span style="font-weight:600; color:#1e293b;">${log.class_name || '---'}</span></td>` : ''}
        <td><code style="background:#eff6ff; color:#1d4ed8; padding:2px 6px; border-radius:4px;">${log.ip_address || '---'}</code></td>
    `;
    tbody.appendChild(tr);
    });
}

async function clearAllLoginLogs() {
    const roleText = currentLogRole === 'teacher' ? 'giáo viên' : 'học sinh';
    if (!await showStyledConfirm(`Bạn có chắc chắn muốn xóa vĩnh viễn nhật ký đăng nhập (${roleText})?`)) return;

    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_login_history", role: currentLogRole })
    });
    const result = await res.json();
    showTeacherNotification(result.message);
    if (result.success) loadLoginHistory();
    } catch (e) {
    showTeacherNotification("Lỗi kết nối máy chủ khi xóa nhật ký!");
    }
}

async function loadIpManagement() {
    const tbody = document.getElementById("ip-management-tbody");
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:24px;">Đang thống kê dữ liệu nhóm IP... ⏳</td></tr>`;

    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_ip_management" })
    });
    const result = await res.json();

    if (!result.success || !result.data.ip_list) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">${result.message || "Không thể tải quản lý IP"}</td></tr>`;
        return;
    }

    const ipList = result.data.ip_list;
    if (ipList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:24px; color:#64748b;">Chưa có dữ liệu IP nào.</td></tr>`;
        return;
    }

    const starredList = getStarredIps();

    ipList.sort((a, b) => {
        const isStarA = starredList.includes(a.ip_address) ? 1 : 0;
        const isStarB = starredList.includes(b.ip_address) ? 1 : 0;
        return isStarB - isStarA;
    });

    tbody.innerHTML = "";
    ipList.forEach(item => {
        const tr = document.createElement("tr");
        const timeStr = new Date(item.last_login).toLocaleString('vi-VN');
        const isStarred = starredList.includes(item.ip_address);
        
        let accountsHtml = item.accounts.map(acc => `<span class="ip-list-badge">${acc}</span>`).join('');
        
        let statusHtml = item.is_banned 
        ? `<span class="ban-status banned">Bị Khóa</span>` 
        : `<span class="ban-status active">Đang Mở</span>`;
        
        let banBtn = item.is_banned
        ? `<button class="btn btn-secondary btn-sm" onclick="unbanIp('${item.ip_address}')">Mở Khóa</button>`
        : `<button class="btn btn-sm" style="background:#ef4444; color:#fff;" onclick="banIp('${item.ip_address}')">Khóa IP</button>`;

        let deleteBtn = `<button class="btn btn-secondary btn-sm" title="Xóa toàn bộ bản ghi IP này" style="color:#ef4444;" onclick="deleteIpRecord('${item.ip_address}')">Xóa</button>`;

        tr.innerHTML = `
        <td style="text-align:center;">
            <button onclick="toggleStarIp('${item.ip_address}')" title="${isStarred ? 'Hủy đánh dấu tin cậy' : 'Đánh dấu sao IP máy chủ / máy giáo viên'}" style="background:none; border:none; cursor:pointer; font-size:18px;">
            ${isStarred ? '⭐' : '☆'}
            </button>
        </td>
        <td class="ip-management-address-cell">
            <code class="ip-management-address" style="background:${isStarred ? '#fef08a' : '#eff6ff'}; color:${isStarred ? '#854d0e' : '#1d4ed8'}; padding:3px 6px; border-radius:4px; font-weight:bold;">${item.ip_address}</code>
            ${isStarred ? '<span style="font-size:11px; color:#d97706; display:block; font-weight:600;">(Máy chủ / GV)</span>' : ''}
        </td>
        <td class="ip-management-cell">${accountsHtml}</td>
        <td><span style="font-size:12px; color:#64748b;">${timeStr}</span></td>
        <td>${statusHtml}</td>
        <td>
            <div style="display:flex; gap:6px;">
            ${banBtn}
            ${deleteBtn}
            </div>
        </td>
        `;
        tbody.appendChild(tr);
    });

    } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Lỗi kết nối máy chủ!</td></tr>`;
    }
}

async function banIp(ipAddress) {
    const reason = await showStyledPrompt(`Nhập lý do khóa (Cấm vĩnh viễn) IP ${ipAddress}:`, "Vi phạm quy chế hệ thống");
    if (reason === null) return;

    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ban_ip", ip_address: ipAddress, reason: reason })
    });
    const result = await res.json();
    
    showTeacherNotification(result.message);
    if (result.success) loadIpManagement();
    } catch (e) {
    showTeacherNotification("Lỗi kết nối máy chủ khi thực hiện Ban IP!");
    }
}

async function unbanIp(ipAddress) {
    if (!await showStyledConfirm(`Bạn có chắc muốn bỏ cấm cho IP ${ipAddress} không?`)) return;

    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unban_ip", ip_address: ipAddress })
    });
    const result = await res.json();
    
    showTeacherNotification(result.message);
    if (result.success) loadIpManagement();
    } catch (e) {
    showTeacherNotification("Lỗi kết nối máy chủ khi Unban IP!");
    }
}

async function deleteIpRecord(ipAddress) {
    const starredList = getStarredIps();
    if (starredList.includes(ipAddress)) {
    if (!await showStyledConfirm(`⚠️ CẢNH BÁO: IP ${ipAddress} đang được đánh dấu sao là MÁY CHỦ hoặc GIÁO VIÊN!\nBạn có thực sự muốn xóa IP này khỏi danh sách không?`)) {
        return;
    }
    } else {
    if (!await showStyledConfirm(`Bạn có chắc chắn muốn xóa IP ${ipAddress} ra khỏi hệ thống?\n(Khi thiết bị thuộc dải IP này đăng nhập lại sau này, hệ thống sẽ ghi nhận lại từ đầu)`)) {
        return;
    }
    }

    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_ip_logs", ip_address: ipAddress })
    });
    const result = await res.json();
    showTeacherNotification(result.message);
    if (result.success) {
        loadIpManagement();
        loadLoginHistory();
    }
    } catch (e) {
    showTeacherNotification("Lỗi kết nối máy chủ khi xóa IP!");
    }
}

/* TÍNH NĂNG DUYỆT THƯỞNG XU PHÁT BIỂU */
async function fetchPendingRewardRequests() {
    const tbody = document.getElementById("pending-rewards-tbody");
    const badge = document.getElementById("approval-badge-count");
    const btnApproveAll = document.getElementById("btn-approve-all-rewards");
    const filterWrapper = document.getElementById("reward-class-filter-wrapper");
    const classSelect = document.getElementById("reward-class-select");

    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_pending_rewards" })
    });
    const result = await res.json();

    if (!result.success || !result.data || !result.data.requests) {
        pendingRewardsList = [];
    } else {
        pendingRewardsList = result.data.requests;
    }

    const count = pendingRewardsList.length;
    if (count > 0) {
        badge.textContent = count;
        badge.style.display = "inline-block";
    } else {
        badge.textContent = "0";
        badge.style.display = "none";
    }

    const classes = [...new Set(pendingRewardsList.map(r => r.class_name).filter(Boolean))].sort();

    if (classes.length === 0) {
        if (filterWrapper) filterWrapper.style.display = "none";
        currentRewardClassFilter = 'ALL';
    } else {
        if (filterWrapper) filterWrapper.style.display = "inline-flex";
        
        const previousSelected = currentRewardClassFilter;
        if (classSelect) {
        classSelect.innerHTML = '<option value="ALL">-- Tất cả --</option>';
        classes.forEach(cls => {
            const opt = document.createElement("option");
            opt.value = cls;
            opt.textContent = `Lớp ${cls}`;
            classSelect.appendChild(opt);
        });

        if (classes.includes(previousSelected)) {
            classSelect.value = previousSelected;
        } else {
            classSelect.value = 'ALL';
            currentRewardClassFilter = 'ALL';
        }
        }
    }

    renderPendingRewardsTable();

    } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red; padding: 18px;">Lỗi kết nối máy chủ!</td></tr>`;
    }
}

function filterRewardsByClass(selectedClass) {
    currentRewardClassFilter = selectedClass;
    renderPendingRewardsTable();
}

function renderPendingRewardsTable() {
    const tbody = document.getElementById("pending-rewards-tbody");
    const btnApproveAll = document.getElementById("btn-approve-all-rewards");

    let filteredList = [...pendingRewardsList];
    if (currentRewardClassFilter !== 'ALL') {
    filteredList = filteredList.filter(r => r.class_name === currentRewardClassFilter);
    }

    if (filteredList.length === 0) {
    if (btnApproveAll) btnApproveAll.style.display = "none";
    if (pendingRewardsList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 18px; color: #64748b;">Không có yêu cầu nào đang chờ duyệt.</td></tr>`;
    } else {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 18px; color: #64748b;">Không có yêu cầu nào thuộc lớp ${currentRewardClassFilter}.</td></tr>`;
    }
    return;
    }

    if (btnApproveAll) {
    btnApproveAll.style.display = "inline-block";
    btnApproveAll.textContent = currentRewardClassFilter === 'ALL' 
        ? `✅ Duyệt tất cả (${filteredList.length})` 
        : `✅ Duyệt cả lớp ${currentRewardClassFilter} (${filteredList.length})`;
    }

    tbody.innerHTML = "";
    filteredList.forEach((req, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td>${idx + 1}</td>
        <td><strong>${req.full_name || '---'}</strong></td>
        <td><code>${req.username || '---'}</code></td>
        <td>${req.class_name || '---'}</td>
        <td><span class="badge-coin" style="background: #fef08a; color: #854d0e;">🪙 +${req.pending_coins}</span></td>
        <td>
        <div style="display: flex; gap: 6px;">
            <button type="button" class="btn btn-primary btn-sm" onclick="approveSingleReward('${req.student_id}', ${req.pending_coins})" style="background: #16a34a; border-color: #16a34a; padding: 4px 10px;">
            Duyệt
            </button>
            <button type="button" class="btn btn-sm" onclick="rejectSingleReward('${req.student_id}', ${req.pending_coins})" style="background: #ef4444; color: #fff; border: 1px solid #ef4444; padding: 4px 8px;">
            Từ chối
            </button>
        </div>
        </td>
    `;
    tbody.appendChild(tr);
    });
}

async function approveSingleReward(studentId, coins) {
    if (!await showStyledConfirm(`Xác nhận duyệt cộng ${coins} xu cho học sinh này?`)) return;

    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        action: "approve_reward",
        student_id: studentId
        })
    });
    const result = await res.json();
    showTeacherNotification(result.message);
    if (result.success) {
        fetchPendingRewardRequests();
        if (filterSchoolSelect.value) {
        fetchStudentList(true);
        }
    }
    } catch (err) {
    showTeacherNotification("Lỗi kết nối máy chủ khi duyệt thưởng!");
    }
}

async function rejectSingleReward(studentId, coins) {
    const reason = await showStyledPrompt(`Nhập lý do từ chối (+${coins} xu):`, "Không hợp lệ");
    if (reason === null) return;

    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        action: "reject_reward",
        student_id: studentId,
        reason: reason.trim()
        })
    });
    const result = await res.json();
    showTeacherNotification(result.message);
    if (result.success) {
        fetchPendingRewardRequests();
    }
    } catch (err) {
    showTeacherNotification("Lỗi kết nối máy chủ khi từ chối nhận thưởng!");
    }
}

async function approveAllRewards() {
    let filteredList = [...pendingRewardsList];
    if (currentRewardClassFilter !== 'ALL') {
    filteredList = filteredList.filter(r => r.class_name === currentRewardClassFilter);
    }

    if (!filteredList || filteredList.length === 0) return;

    const confirmMsg = currentRewardClassFilter === 'ALL'
    ? `Bạn có chắc chắn muốn duyệt tất cả ${filteredList.length} yêu cầu nhận xu này không?`
    : `Bạn có chắc chắn muốn duyệt tất cả ${filteredList.length} yêu cầu của lớp ${currentRewardClassFilter} không?`;

    if (!await showStyledConfirm(confirmMsg)) return;

    const studentIds = filteredList.map(r => r.student_id);

    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        action: "approve_all_rewards",
        student_ids: studentIds
        })
    });
    const result = await res.json();
    showTeacherNotification(result.message);
    if (result.success) {
        fetchPendingRewardRequests();
        if (filterSchoolSelect.value) {
        fetchStudentList(true);
        }
    }
    } catch (err) {
    showTeacherNotification("Lỗi kết nối máy chủ khi duyệt tất cả thưởng!");
    }
}

/* ========================================================
    LOGIC QUẢN LÝ ĐIỂM DANH THEO THỨ, KHÓA/MỞ, SỬA/XÓA VÀ SẮP XẾP TÊN
    ======================================================== */
const DAY_NAMES = { 1: "Thứ 2", 2: "Thứ 3", 3: "Thứ 4", 4: "Thứ 5", 5: "Thứ 6", 6: "Thứ 7", 0: "Chủ nhật" };
let currentClassAttendanceRecords = [];
let currentSchedules = []; // Thêm dòng này để lưu dữ liệu lịch lớp

document.addEventListener("DOMContentLoaded", () => {
    const picker = document.getElementById("view-att-date-picker");
    if (picker) {
    picker.value = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    }
});

function resetScheduleForm() {
    document.getElementById("sched-class-input").value = "";
    document.querySelectorAll('input[name="sched_day"]').forEach(chk => chk.checked = false);
}

async function loadClassSchedules() {
    const school = document.getElementById("sched-school-select").value;
    const tbody = document.getElementById("sched-table-body");
    if (!school) return;

    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center;">Đang tải cấu hình lịch lớp... ⏳</td></tr>`;

    try {
    const res = await fetch(`/.netlify/functions/attendance?action=get_schedules&school=${encodeURIComponent(school)}`);
    const data = await res.json();
    
    currentSchedules = data.schedules || []; // Lưu dữ liệu vào mảng

    if (currentSchedules.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #64748b;">Chưa có cấu hình lịch cho lớp nào thuộc trường này.</td></tr>`;
        return;
    }

    // Gọi hàm sắp xếp và hiển thị
    sortAndRenderSchedules();
    } catch (e) {
    tbody.innerHTML = `<tr><td colspan="4" style="color: red; text-align: center;">Lỗi tải cấu hình lịch!</td></tr>`;
    }
}

function sortAndRenderSchedules() {
    const tbody = document.getElementById("sched-table-body");
    if (!tbody || currentSchedules.length === 0) return;

    const sortMode = document.getElementById("schedule-sort-select")?.value || "class_asc";

    let sorted = [...currentSchedules].sort((a, b) => {
    if (sortMode === "class_asc" || sortMode === "class_desc") {
        // numeric: true giúp các chuỗi có số như 7B12 được xếp sau 7B5 
        const cmp = (a.class_name || "").localeCompare(b.class_name || "", undefined, { numeric: true, sensitivity: 'base' });
        return sortMode === "class_asc" ? cmp : -cmp;
    } else {
        // Xếp theo Thứ (Quy ước Chủ nhật là 7 để xếp cuối)
        const getMinDay = (days) => {
            if (!days || days.length === 0) return 999;
            return Math.min(...days.map(d => d === 0 ? 7 : d));
        };
        const minA = getMinDay(a.schedule_days);
        const minB = getMinDay(b.schedule_days);
        
        if (minA !== minB) {
            return sortMode === "day_asc" ? minA - minB : minB - minA;
        } else {
            // Nếu trùng thứ, xếp theo tên lớp (với thứ tự tự nhiên)
            return (a.class_name || "").localeCompare(b.class_name || "", undefined, { numeric: true, sensitivity: 'base' });
        }
    }
    });

    tbody.innerHTML = "";
    sorted.forEach(item => {
        const daysStr = (item.schedule_days || []).map(d => DAY_NAMES[d]).join(', ') || 'Chưa thiết lập';
        const tr = document.createElement('tr');
        tr.innerHTML = `
        <td><strong>${item.class_name}</strong></td>
        <td>${daysStr}</td>
        <td>
            <button type="button" class="btn btn-sm" onclick="toggleLockSchedule('${item.class_name}', ${!item.is_locked})" style="background: ${item.is_locked ? '#fee2e2' : '#f0fdf4'}; color: ${item.is_locked ? '#991b1b' : '#166534'}; border: 1px solid ${item.is_locked ? '#fca5a5' : '#86efac'}; font-weight: 600;">
            ${item.is_locked ? '🔒 Đang khóa' : '🔓 Đang mở'}
            </button>
        </td>
        <td style="text-align: center;">
            <div style="display: inline-flex; gap: 6px;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="editScheduleFill('${item.class_name}', ${JSON.stringify(item.schedule_days || [])})">Sửa</button>
            <button type="button" class="btn btn-sm" style="background: #ef4444; color: #fff; border: 1px solid #ef4444;" onclick="deleteClassSchedule('${item.class_name}')">Xóa</button>
            </div>
        </td>
        `;
        tbody.appendChild(tr);
    });
}

function editScheduleFill(className, days) {
    const bodyEl = document.getElementById('schedule-manage-body');
    const iconEl = document.getElementById('schedule-manage-toggle-icon');
    if (bodyEl.classList.contains('collapsed')) {
    bodyEl.classList.remove('collapsed');
    iconEl.textContent = '▼';
    }

    document.getElementById("sched-class-input").value = className;
    document.querySelectorAll('input[name="sched_day"]').forEach(chk => {
    chk.checked = days.includes(Number(chk.value));
    });
    window.scrollTo({ top: document.getElementById('sched-class-input').offsetTop - 120, behavior: 'smooth' });
}

async function deleteClassSchedule(className) {
    const school = document.getElementById("sched-school-select").value;
    if (!await showStyledConfirm(`Bạn có chắc chắn muốn xóa hoàn toàn lịch điểm danh của lớp ${className}?`)) {
    return;
    }

    try {
    const res = await fetch('/.netlify/functions/attendance', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school, class_name: className })
    });
    const result = await res.json();
    showTeacherNotification(result.message);
    loadClassSchedules();
    fetchActiveClassesForDate();
    } catch (e) {
    showTeacherNotification("Lỗi kết nối máy chủ khi xóa lịch!");
    }
}

async function saveClassSchedule() {
    const school = document.getElementById("sched-school-select").value;
    const className = document.getElementById("sched-class-input").value.trim().toUpperCase();
    if (!school || !className) {
    showTeacherNotification("Vui lòng chọn trường và nhập tên lớp!");
    return;
    }

    const selectedDays = [];
    document.querySelectorAll('input[name="sched_day"]:checked').forEach(chk => {
    selectedDays.push(Number(chk.value));
    });

    try {
    const res = await fetch('/.netlify/functions/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        action: 'save_schedule',
        school,
        class_name: className,
        schedule_days: selectedDays
        })
    });
    const result = await res.json();
    showTeacherNotification(result.message);
    loadClassSchedules();
    fetchActiveClassesForDate();
    } catch (e) {
    showTeacherNotification("Lỗi kết nối máy chủ khi lưu lịch điểm danh!");
    }
}

async function toggleLockSchedule(className, newLockState) {
    const school = document.getElementById("sched-school-select").value;
    try {
    const res = await fetch('/.netlify/functions/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        action: 'toggle_lock',
        school,
        class_name: className,
        is_locked: newLockState
        })
    });
    const result = await res.json();
    showTeacherNotification(result.message);
    loadClassSchedules();
    fetchActiveClassesForDate();
    } catch (e) {
    showTeacherNotification("Lỗi kết nối máy chủ khi cập nhật trạng thái!");
    }
}

async function fetchActiveClassesForDate() {
    const school = document.getElementById("view-att-school-select").value;
    const date = document.getElementById("view-att-date-picker").value;
    const container = document.getElementById("active-classes-buttons");
    const dayLabel = document.getElementById("day-of-week-label");
    document.getElementById("class-detail-container").style.display = "none";

    if (!school || !date) return;

    const d = new Date(date + "T00:00:00");
    dayLabel.textContent = DAY_NAMES[d.getDay()] || "--";
    container.innerHTML = `<span style="color: #64748b;">Đang quét các lớp có lịch... ⏳</span>`;

    try {
    const res = await fetch(`/.netlify/functions/attendance?action=get_active_classes_by_date&school=${encodeURIComponent(school)}&date=${date}`);
    const data = await res.json();
    const classes = data.classes || [];

    if (classes.length === 0) {
        container.innerHTML = `<span style="color: #64748b; font-size: 13px;">Không có lớp nào mở điểm danh vào ${DAY_NAMES[data.dayOfWeek]}.</span>`;
        return;
    }

    container.innerHTML = "";
    classes.forEach(c => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "class-attendance-btn";
        btn.textContent = `Lớp ${c.class_name}`;
        btn.onclick = () => {
        document.querySelectorAll('.class-attendance-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadClassAttendanceDetail(school, c.class_name, date);
        };
        container.appendChild(btn);
    });
    } catch (e) {
    container.innerHTML = `<span style="color: red;">Lỗi tải danh sách lớp!</span>`;
    }
}

/* HÀM SẮP XẾP THEO TÊN (first_name) VÀ RENDER 2 CỘT HỌ - TÊN */
function sortAndRenderClassAttendance() {
    const tbody = document.getElementById("class-attendance-tbody");
    if (!tbody || currentClassAttendanceRecords.length === 0) return;

    const sortMode = document.getElementById("att-sort-select")?.value || "first_name_asc";

    const sorted = [...currentClassAttendanceRecords].sort((a, b) => {
    const firstA = (a.first_name || '').trim();
    const firstB = (b.first_name || '').trim();
    const lastA = (a.last_name || '').trim();
    const lastB = (b.last_name || '').trim();

    if (sortMode === "first_name_asc") {
        const cmp = firstA.localeCompare(firstB, 'vi');
        return cmp !== 0 ? cmp : lastA.localeCompare(lastB, 'vi');
    } else {
        const cmp = firstB.localeCompare(firstA, 'vi');
        return cmp !== 0 ? cmp : lastB.localeCompare(lastA, 'vi');
    }
    });

    tbody.innerHTML = "";
    sorted.forEach((stu, idx) => {
    const isPresent = stu.status === 'Có mặt';
    const timeDisplay = stu.checkin_time 
        ? new Date(stu.checkin_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
        : '';

    const tr = document.createElement("tr");
    if (!isPresent) {
        tr.style.backgroundColor = "#fee2e2";
    }

    const actionBtn = isPresent
        ? `<button type="button" class="btn btn-sm" style="background: #ef4444; color: #fff; border: none; padding: 4px 10px; border-radius: 4px; font-weight: 600; cursor: pointer;" onclick="cancelSingleAttendance('${stu.student_id}')">Hủy Đ.Danh</button>`
        : `<button type="button" class="btn btn-sm" style="background: #10b981; color: #fff; border: none; padding: 4px 10px; border-radius: 4px; font-weight: 600; cursor: pointer;" onclick="markSingleAttendance('${stu.student_id}', '${(stu.student_name || '').replace(/'/g, "\\'")}')">Điểm danh</button>`;

    tr.innerHTML = `
        <td style="color: #64748b; font-weight: 600;">${idx + 1}</td>
        <td>${stu.last_name || '---'}</td>
        <td style="font-weight: 600;">${stu.first_name || '---'}</td>
        <td>
        <span style="padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: bold; background: ${isPresent ? '#dcfce7' : '#fecaca'}; color: ${isPresent ? '#166534' : '#991b1b'};">
            ${stu.status}
        </span>
        </td>
        <td style="text-align: right; font-family: monospace; color: #475569; font-weight: 600;">
        ${timeDisplay}
        </td>
        <td style="text-align: center;">
        ${actionBtn}
        </td>
    `;
    tbody.appendChild(tr);
    });
}

async function loadClassAttendanceDetail(school, className, date) {
    const detailBox = document.getElementById("class-detail-container");
    const tbody = document.getElementById("class-attendance-tbody");
    document.getElementById("current-viewing-class").textContent = className;
    detailBox.style.display = "block";

    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px;">Đang tải danh sách học sinh... ⏳</td></tr>`;

    try {
    const res = await fetch(`/.netlify/functions/attendance?action=get_class_attendance&school=${encodeURIComponent(school)}&className=${encodeURIComponent(className)}&date=${date}`);
    const result = await res.json();

    document.getElementById("stat-class-total").textContent = result.total || 0;
    document.getElementById("stat-class-present").textContent = result.present || 0;
    document.getElementById("stat-class-absent").textContent = result.absent || 0;

    if (!result.records || result.records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #64748b; padding: 20px;">Lớp này chưa có học sinh nào trong cơ sở dữ liệu.</td></tr>`;
        currentClassAttendanceRecords = [];
        return;
    }

    currentClassAttendanceRecords = result.records;
    sortAndRenderClassAttendance();

    } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Lỗi tải dữ liệu chi tiết điểm danh!</td></tr>`;
    }
}

async function markAllPresent() {
    const school = document.getElementById("view-att-school-select").value;
    const date = document.getElementById("view-att-date-picker").value;
    const className = document.getElementById("current-viewing-class").textContent;

    if (!school || !date || className === "---" || currentClassAttendanceRecords.length === 0) {
    showTeacherNotification("Dữ liệu không hợp lệ hoặc lớp hiện tại chưa có học sinh!");
    return;
    }

    if (!await showStyledConfirm(`Bạn có chắc chắn muốn đánh dấu CÓ MẶT cho toàn bộ học sinh lớp ${className} trong ngày ${date}?`)) return;

    const studentsToMark = currentClassAttendanceRecords.map(stu => ({
    student_id: stu.student_id,
    student_name: stu.student_name
    }));

    try {
    const res = await fetch("/.netlify/functions/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        action: "batch_attendance",
        school: school,
        class_name: className,
        date: date,
        students: studentsToMark
        })
    });
    const result = await res.json();
    
    if (res.ok && result.success) {
        showTeacherNotification(result.message || "Đã đánh dấu có mặt cho toàn bộ lớp!");
        loadClassAttendanceDetail(school, className, date);
    } else {
        showTeacherNotification(result.message || "Lỗi khi điểm danh cả lớp!");
    }
    } catch (e) {
    showTeacherNotification("Lỗi kết nối đến máy chủ!");
    }
}

async function cancelAllAttendance() {
    const school = document.getElementById("view-att-school-select").value;
    const date = document.getElementById("view-att-date-picker").value;
    const className = document.getElementById("current-viewing-class").textContent;

    if (!school || !date || className === "---") return;

    if (!await showStyledConfirm(`⚠️ Bạn có chắc chắn muốn HỦY điểm danh toàn bộ lớp ${className} trong ngày ${date} (chuyển tất cả thành Vắng)?`)) return;

    try {
    const res = await fetch("/.netlify/functions/attendance", {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        action: "batch_cancel_attendance",
        school: school,
        class_name: className,
        date: date
        })
    });
    const result = await res.json();
    
    if (res.ok && result.success) {
        showTeacherNotification(result.message || "Đã hủy điểm danh cả lớp (Chuyển thành Vắng)!");
        loadClassAttendanceDetail(school, className, date);
    } else {
        showTeacherNotification(result.message || "Lỗi khi hủy điểm danh!");
    }
    } catch (e) {
    showTeacherNotification("Lỗi kết nối đến máy chủ!");
    }
}

async function markSingleAttendance(studentId, studentName) {
    const school = document.getElementById("view-att-school-select").value;
    const date = document.getElementById("view-att-date-picker").value;
    const className = document.getElementById("current-viewing-class").textContent;

    if (!school || !date || className === "---") return;

    try {
    const res = await fetch("/.netlify/functions/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        action: "teacher_mark_single", 
        school: school,
        class_name: className,
        date: date,
        student_id: studentId,
        student_name: studentName
        })
    });
    const result = await res.json();
    if (res.ok && result.success) {
        loadClassAttendanceDetail(school, className, date);
    } else {
        showTeacherNotification(result.message || "Lỗi khi điểm danh!");
    }
    } catch (e) {
    showTeacherNotification("Lỗi kết nối máy chủ!");
    }
}

async function cancelSingleAttendance(studentId) {
    const school = document.getElementById("view-att-school-select").value;
    const date = document.getElementById("view-att-date-picker").value;
    const className = document.getElementById("current-viewing-class").textContent;

    if (!school || !date || className === "---") return;

    try {
    const res = await fetch("/.netlify/functions/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        action: "cancel_single_attendance", 
        school: school,
        class_name: className,
        date: date,
        student_id: studentId
        })
    });
    const result = await res.json();
    if (res.ok && result.success) {
        loadClassAttendanceDetail(school, className, date);
    } else {
        showTeacherNotification(result.message || "Lỗi khi hủy điểm danh!");
    }
    } catch (e) {
    showTeacherNotification("Lỗi kết nối máy chủ!");
    }
}

/* ========================================================
    LOGIC KÉO THẢ VÀ TẢI MEME TRỰC TIẾP LÊN HỆ THỐNG
    ======================================================== */
const fileDropArea = document.getElementById('file-drop-area');
const fileInput = document.getElementById('new-meme-file');
const filePreview = document.getElementById('new-meme-preview');
const previewContainer = document.getElementById('preview-container');
const fileDropText = document.getElementById('file-drop-text');
const replacementMemeFileInput = document.getElementById('replace-meme-file');
const replacementMemeDropArea = document.getElementById('replace-meme-drop-area');
let currentBase64Image = null;

replacementMemeDropArea.addEventListener('dragover', event => {
    event.preventDefault();
    replacementMemeDropArea.style.background = '#e2e8f0';
});
replacementMemeDropArea.addEventListener('dragleave', event => {
    if (!replacementMemeDropArea.contains(event.relatedTarget)) {
    replacementMemeDropArea.style.background = '#f8fafc';
    }
});
replacementMemeDropArea.addEventListener('drop', event => {
    event.preventDefault();
    replacementMemeDropArea.style.background = '#f8fafc';
    const file = event.dataTransfer.files && event.dataTransfer.files[0];
    if (file) loadReplacementMemeFile(file);
});

replacementMemeFileInput.addEventListener('change', function() {
    const file = this.files && this.files[0];
    if (!file) return;
    loadReplacementMemeFile(file);
});

function loadReplacementMemeFile(file) {
    if (!file.type.match('image.*')) {
    showTeacherNotification("Vui lòng chọn file hình ảnh hợp lệ!");
    clearReplacementMemeImage();
    return;
    }

    const reader = new FileReader();
    reader.onload = event => {
    if (typeof event.target.result !== 'string') {
        showTeacherNotification("Không thể đọc ảnh đã chọn!");
        clearReplacementMemeImage();
        return;
    }
    replacementMemeBase64Image = event.target.result;
    const preview = document.getElementById("replace-meme-preview");
    preview.src = replacementMemeBase64Image;
    preview.style.display = "block";
    };
    reader.onerror = () => {
    showTeacherNotification("Không thể đọc ảnh đã chọn!");
    clearReplacementMemeImage();
    };
    reader.readAsDataURL(file);
}

if (fileDropArea) {
    fileDropArea.addEventListener('click', () => fileInput.click());
    fileDropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileDropArea.style.background = '#e2e8f0';
    });
    fileDropArea.addEventListener('dragleave', () => {
    fileDropArea.style.background = '#f8fafc';
    });
    fileDropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    fileDropArea.style.background = '#f8fafc';
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files[0]);
    }
    });
    fileInput.addEventListener('change', function() {
    if (this.files && this.files.length > 0) handleFileSelect(this.files[0]);
    });
}

function handleFileSelect(file) {
    if (!file.type.match('image.*')) {
    showTeacherNotification("Vui lòng chọn file hình ảnh hợp lệ!");
    return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
    currentBase64Image = e.target.result;
    
    // Hiện preview ảnh, ẩn vùng kéo thả
    filePreview.src = currentBase64Image;
    previewContainer.style.display = 'flex';
    fileDropArea.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

// Hàm xóa ảnh đã chọn để tải lại vùng kéo thả
function removeSelectedImage(e) {
    if (e) e.stopPropagation(); // Ngăn sự kiện click của div cha (tránh mở popup chọn file)
    currentBase64Image = null;
    fileInput.value = "";
    filePreview.src = "";
    previewContainer.style.display = 'none';
    fileDropArea.style.display = 'flex';
}

async function submitNewMeme(e) {
    e.preventDefault();
    const statusEl = document.getElementById("new-meme-submit-status");
    const btnSave = document.getElementById("btn-save-new-meme");
    
    if (!currentBase64Image) {
    statusEl.className = "status-msg status-error";
    statusEl.textContent = "Vui lòng chọn hoặc kéo thả ảnh!";
    return;
    }

    const slogan = document.getElementById("new-meme-slogan").value.trim();
    const rarity = document.getElementById("new-meme-rarity").value;

    btnSave.disabled = true;
    statusEl.className = "status-msg";
    statusEl.textContent = "Đang tải ảnh lên Cloudflare R2... ⏳";

    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        action: "add_meme_from_drive", 
        image_url: currentBase64Image,
        slogan: slogan,
        rarity: rarity
        })
    });
    const result = await res.json();

    if (!result.success) {
        statusEl.className = "status-msg status-error";
        statusEl.textContent = result.message || "Lưu thất bại!";
        btnSave.disabled = false;
        return;
    }

    statusEl.className = "status-msg status-success";
    statusEl.textContent = "✅ Thêm Meme thành công!";
    
    // Khôi phục UI form
    document.getElementById("new-meme-slogan").value = "";
    document.getElementById("new-meme-rarity").value = "C";
    removeSelectedImage(); // Gọi hàm xóa ảnh để phục hồi lại giao diện Drop
    
    loadAdminMemeCollection(); 
    } catch (err) {
    statusEl.className = "status-msg status-error";
    statusEl.textContent = "Lỗi kết nối máy chủ!";
    } finally {
    btnSave.disabled = false;
    }
}

// TỰ ĐỘNG NẠP DỮ LIỆU ĐIỂM DANH KHI TẢI LẠI TRANG
loadSchools().then(() => {
    restoreFilterAndStudents();
    fetchPendingRewardRequests();

    const currentActiveTab = sessionStorage.getItem("teacher_active_tab");
    if (currentActiveTab === "tab-attendance") {
    loadClassSchedules();
    fetchActiveClassesForDate();
    }
});
/* ========================================================
LOGIC TẠO BÁO CÁO CUỐI BUỔI DẠY VÀ COPY VÀO CLIPBOARD
======================================================== */
const startReportFieldIds = ['repStart_Teacher', 'repStart_TA', 'repStart_Room', 'repStart_TotalPC', 'repStart_BrokenPC', 'repStart_MissingPC', 'repStart_Netsupport', 'repStart_Speaker', 'repStart_AC'];
const endReportFieldIds = ['rep_Teacher', 'rep_TA', 'rep_Room', 'rep_TotalPC', 'rep_Docs', 'rep_BrokenPC', 'rep_MissingPC', 'rep_Netsupport', 'rep_Speaker', 'rep_AC', 'rep_Power', 'rep_Chairs', 'rep_Clean', 'rep_Rules', 'rep_Violations'];
const professionalReportDefaultValues = {
    repPro_FlashGM: 'GMT 1  ( %), GMT 2 ( %)',
    repPro_FlashOT: 'OT 1 ( %), OT 2 ( %), OT 3 ( %)',
    repPro_Gmetrix: 'GMT 1 ( %), GMT 2 ( %)'
};
const reportFormLoadVersions = new Map();

function closeReportMenu(menuItem) {
    const menu = menuItem.closest('.report-menu');
    if (menu) menu.open = false;
}

async function requestTeacherReportStorage(action, reportType, reportData) {
    const teacher = getCurrentTeacherSession();
    if (!teacher || teacher.role !== 'teacher' || !teacher.username || !teacher.sessionToken) {
    throw new Error('Phiên giáo viên không hợp lệ hoặc đã hết hạn. Hãy đăng nhập lại.');
    }

    const response = await fetch('/.netlify/functions/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        action,
        report_type: reportType,
        report_data: reportData,
        teacher_username: teacher.username,
        teacher_session_token: teacher.sessionToken
    })
    });

    const responseText = await response.text();
    let result;
    try {
    result = JSON.parse(responseText);
    } catch (error) {
    const responseDetails = responseText.trim().slice(0, 200);
    throw new Error(`Máy chủ trả về phản hồi không phải JSON (HTTP ${response.status})${responseDetails ? `: ${responseDetails}` : '.'}`);
    }
    if (!response.ok || !result.success) {
    throw new Error(result.message || 'Không thể xử lý báo cáo.');
    }
    return result.data;
}

async function loadTeacherReportForm(reportType, fieldIds, buttonId, reportName, defaultValues = {}) {
    const formKey = fieldIds.join(',');
    const loadVersion = (reportFormLoadVersions.get(formKey) || 0) + 1;
    reportFormLoadVersions.set(formKey, loadVersion);
    const button = document.getElementById(buttonId);
    if (button) button.disabled = true;
    fieldIds.forEach(id => {
    const field = document.getElementById(id);
    if (field) {
        field.value = defaultValues[id] || '';
        field.disabled = true;
    }
    });

    try {
    const result = await requestTeacherReportStorage('load', reportType);
    if (reportFormLoadVersions.get(formKey) !== loadVersion) return;
    const savedData = result?.report_data;
    if (savedData) {
        fieldIds.forEach(id => {
        const field = document.getElementById(id);
        if (field && typeof savedData[id] === 'string' && savedData[id] !== '') field.value = savedData[id];
        });
    }
    } catch (error) {
    if (reportFormLoadVersions.get(formKey) === loadVersion) {
        console.error(`Lỗi khi tải ${reportName} từ cơ sở dữ liệu:`, error);
        showTeacherNotification(`Không thể tải ${reportName} từ cơ sở dữ liệu: ${error.message}`);
    }
    } finally {
    if (reportFormLoadVersions.get(formKey) === loadVersion) {
        fieldIds.forEach(id => {
        const field = document.getElementById(id);
        if (field) field.disabled = false;
        });
        if (button) button.disabled = false;
    }
    }
}

async function saveTeacherReportAndCopy(reportType, reportName, reportData, reportContent, buttonId, closeModal) {
    const button = document.getElementById(buttonId);
    if (button) button.disabled = true;

    try {
    await requestTeacherReportStorage('save', reportType, reportData);
    } catch (error) {
    console.error(`Lỗi khi lưu ${reportName} vào cơ sở dữ liệu:`, error);
    showTeacherNotification(`Không thể lưu ${reportName} vào cơ sở dữ liệu: ${error.message}`);
    if (button) button.disabled = false;
    return;
    }

    try {
    await navigator.clipboard.writeText(reportContent);
    showTeacherNotification(`Đã lưu ${reportName} vào cơ sở dữ liệu và Clipboard thành công.`);
    closeModal();
    } catch (error) {
    console.error(`Lỗi khi copy ${reportName} vào clipboard:`, error);
    showTeacherNotification(`Đã lưu ${reportName} vào cơ sở dữ liệu nhưng không thể copy vào Clipboard. Hãy thử lại trên máy tính.`);
    } finally {
    if (button) button.disabled = false;
    }
}

function openStartReportModal() {
    const modal = document.getElementById('startReportModal');
    if (modal) {
    modal.classList.add('show');
    }
    loadTeacherReportForm('start_of_class', startReportFieldIds, 'btnCopyStartReport', 'báo cáo đầu buổi');
}

function closeStartReportModal() {
    const modal = document.getElementById('startReportModal');
    if (modal) {
    modal.classList.remove('show');
    }
}

function generateAndCopyStartReport() {
    const formData = {};
    startReportFieldIds.forEach(id => {
    const field = document.getElementById(id);
    formData[id] = field ? field.value : "";
    });

    const reportContent = `BÁO CÁO ĐẦU BUỔI DẠY
- Tên giáo viên: ${formData['repStart_Teacher']}
- Tên trợ giảng: ${formData['repStart_TA']}
- Phòng máy: ${formData['repStart_Room']}
- Tổng số máy: ${formData['repStart_TotalPC']}
- Tổng số máy bị lỗi: ${formData['repStart_BrokenPC']}
- Số máy còn thiếu cho HS: ${formData['repStart_MissingPC']}
- Tình trạng Netsupport: ${formData['repStart_Netsupport']}
- Tình trạng loa, âm ly: ${formData['repStart_Speaker']}
- Tình trạng máy lạnh, máy quạt: ${formData['repStart_AC']}`;

    saveTeacherReportAndCopy('start_of_class', 'báo cáo đầu buổi', formData, reportContent, 'btnCopyStartReport', closeStartReportModal);
}

const professionalReportFieldIds = ['repPro_Teacher', 'repPro_Class', 'repPro_Subject', 'repPro_Materials', 'repPro_Content', 'repPro_PlannedLessons', 'repPro_TaughtLessons', 'repPro_CompletionCount', 'repPro_FlashGM', 'repPro_FlashOT', 'repPro_Gmetrix'];
let currentProfessionalReportNumber = 1;

function openProfessionalReportModal(reportNumber) {
    if (reportNumber !== 1 && reportNumber !== 2) {
    showTeacherNotification("Báo cáo chuyên môn không hợp lệ.");
    return;
    }

    currentProfessionalReportNumber = reportNumber;
    const title = document.getElementById('professionalReportTitle');
    if (title) title.textContent = `📝 Báo Cáo Chuyên Môn ${reportNumber}`;

    const modal = document.getElementById('professionalReportModal');
    if (modal) modal.classList.add('show');
    loadTeacherReportForm(`professional_${reportNumber}`, professionalReportFieldIds, 'btnCopyProfessionalReport', `báo cáo chuyên môn ${reportNumber}`, professionalReportDefaultValues);
}

function closeProfessionalReportModal() {
    const modal = document.getElementById('professionalReportModal');
    if (modal) modal.classList.remove('show');
}

function generateAndCopyProfessionalReport() {
    const reportNumber = currentProfessionalReportNumber;
    const formData = {};
    professionalReportFieldIds.forEach(id => {
    const field = document.getElementById(id);
    const value = field ? field.value : "";
    formData[id] = value.trim() ? value : professionalReportDefaultValues[id] || value;
    });

    const reportContent = `BÁO CÁO CHUYÊN MÔN ${reportNumber}
- Tên giáo viên: ${formData['repPro_Teacher']}
- Lớp: ${formData['repPro_Class']}
- Môn: ${formData['repPro_Subject']}
- Tài liệu dạy: ${formData['repPro_Materials']}
- Nội dung dạy: ${formData['repPro_Content']}
- Số tiết dự kiến: ${formData['repPro_PlannedLessons']}
- Số tiết đã dạy: ${formData['repPro_TaughtLessons']}
- Số lần hoàn thành bài tổng hợp: ${formData['repPro_CompletionCount']}
- Tỷ lệ kết quả Flash GM: ${formData['repPro_FlashGM']}
- Tỷ lệ kết quả Flash OT: ${formData['repPro_FlashOT']}
- Tỷ lệ kết quả điểm Gmetrix: ${formData['repPro_Gmetrix']}`;

    saveTeacherReportAndCopy(`professional_${reportNumber}`, `báo cáo chuyên môn ${reportNumber}`, formData, reportContent, 'btnCopyProfessionalReport', closeProfessionalReportModal);
}

function openReportModal() {
    const school = document.getElementById("view-att-school-select")?.value || "";
    const date = document.getElementById("view-att-date-picker")?.value || new Date().toISOString().split('T')[0];

    if(!school) {
        showTeacherNotification("Vui lòng chọn trường ở mục 'Tra Cứu & Giám Sát Điểm Danh' trước khi tạo báo cáo!");
        return;
    }

    const modal = document.getElementById('reportModal');
    if (modal) {
    modal.classList.add('show'); 
    }

    loadTeacherReportForm('end_of_class', endReportFieldIds, 'btnCopyReport', 'báo cáo cuối buổi');

    // Tải danh sách lớp vào dropdown
    fetch(`/.netlify/functions/attendance?action=get_active_classes_by_date&school=${encodeURIComponent(school)}&date=${date}`)
    .then(res => res.json())
    .then(data => {
        const select = document.getElementById('reportClassSelect');
        if(!select) return;
        select.innerHTML = ''; // Xóa rỗng
        
        if(data.classes && data.classes.length > 0) {
            data.classes.forEach(c => {
                const lbl = document.createElement('label');
                lbl.style.cursor = 'pointer';
                lbl.style.display = 'flex';
                lbl.style.alignItems = 'center';
                lbl.style.gap = '10px';
                lbl.style.padding = '12px 16px';
                lbl.style.border = '1px solid #cbd5e1';
                lbl.style.borderRadius = '8px';
                lbl.style.backgroundColor = '#f8fafc';
                lbl.style.fontWeight = '600';
                lbl.style.color = '#1e293b';
                lbl.style.transition = 'all 0.2s';

                // Thêm hiệu ứng hover đổi màu
                lbl.onmouseenter = () => { lbl.style.backgroundColor = '#f1f5f9'; lbl.style.borderColor = '#94a3b8'; };
                lbl.onmouseleave = () => { lbl.style.backgroundColor = '#f8fafc'; lbl.style.borderColor = '#cbd5e1'; };

                // Phóng to nút checkbox lên 18px
                lbl.innerHTML = `<input type="checkbox" class="report-class-cb" value="${c.class_name}" onchange="validateClassAttendance()" style="width: 18px; height: 18px; margin: 0; cursor: pointer;"> Lớp ${c.class_name}`;
                select.appendChild(lbl);
            });
        } else {
            select.innerHTML = '<span style="color: #ef4444; font-size: 13px;">Không có lớp học nào trong ngày</span>';
        }
        
        // Reset form fields
        document.getElementById('attendanceWarning').style.display = 'none';
        document.getElementById('reportFields').style.display = 'block';
    }).catch(err => console.error(err));
}

function closeReportModal() {
    const modal = document.getElementById('reportModal');
    if (modal) {
    modal.classList.remove('show');
    }
}

async function validateClassAttendance() {
    const school = document.getElementById("view-att-school-select")?.value;
    const date = document.getElementById("view-att-date-picker")?.value;
    const checkboxes = document.querySelectorAll('.report-class-cb:checked');
    const warningStr = document.getElementById('attendanceWarning');
    // Đã xóa dòng gọi reportFields

    if (checkboxes.length === 0) {
        warningStr.style.display = 'none';
        // Đã xóa dòng ẩn form
        return;
    }

    try {
        let hasUncheckedClass = false;
        let classReportStrings = [];

        for (const cb of checkboxes) {
            const className = cb.value;
            const res = await fetch(`/.netlify/functions/attendance?action=get_class_attendance&school=${encodeURIComponent(school)}&className=${encodeURIComponent(className)}&date=${date}`);
            const result = await res.json();

            const total = result.total || 0;
            const absent = result.absent || 0;
            const present = result.present || 0;

            if (total > 0 && absent === total) {
                hasUncheckedClass = true;
                break;
            }
            classReportStrings.push(`${className}(${total}/${present})`);
        }

        if (hasUncheckedClass) {
            warningStr.style.display = 'block';
            // Đã xóa dòng ẩn form
        } else {
            warningStr.style.display = 'none';
            // Đã xóa dòng hiện form
            
            const modal = document.getElementById('reportModal');
            modal.dataset.classesInfo = classReportStrings.join(', ');
        }
    } catch (err) {
        console.error("Lỗi khi kiểm tra sĩ số điểm danh", err);
    }
}

function generateAndCopyReport() {
    const classesInfo = document.getElementById('reportModal').dataset.classesInfo || "";
    if (!classesInfo || document.getElementById('attendanceWarning').style.display === 'block') {
        showTeacherNotification("⚠ Vui lòng chọn lớp và đảm bảo các lớp đã được điểm danh đầy đủ trước khi copy báo cáo!");
        return;
    }

    // 1. Thu thập dữ liệu từ Form
    const formData = {};
    endReportFieldIds.forEach(id => {
        const el = document.getElementById(id);
        formData[id] = el ? el.value : "";
    });
    formData.classesInfo = classesInfo;

    // 3. Ghép chuỗi báo cáo
    const reportContent = `BÁO CÁO CUỐI BUỔI DẠY
- Tên giáo viên: ${formData['rep_Teacher']}
- Tên trợ giảng: ${formData['rep_TA']}
- Phòng máy: ${formData['rep_Room']}
- Tổng số máy: ${formData['rep_TotalPC']}
- Số lượng HS: ${classesInfo}
- Tỷ lệ học sinh có tài liệu: ${formData['rep_Docs']}
- Tổng số máy bị lỗi: ${formData['rep_BrokenPC']}
- Số máy còn thiếu cho HS: ${formData['rep_MissingPC']}
- Tình trạng Netsupport: ${formData['rep_Netsupport']}
- Tình trạng loa, âm ly: ${formData['rep_Speaker']}
- Tình trạng máy lạnh, máy quạt: ${formData['rep_AC']}
- Đã tắt thiết bị điện chưa: ${formData['rep_Power']}
- Ghế ngồi của HS được sắp xếp gọn gàng: ${formData['rep_Chairs']}
- Vệ sinh phòng máy: ${formData['rep_Clean']}
- Việc tuân thủ nội quy của HS: ${formData['rep_Rules']}
- Danh sách vi phạm: ${formData['rep_Violations']}`;

    saveTeacherReportAndCopy('end_of_class', 'báo cáo cuối buổi', formData, reportContent, 'btnCopyReport', closeReportModal);
}
/* ========================================================
    QUẢN LÝ BÀI THI (QUIZZES) & CÂU HỎI ĐA DẠNG (QUESTIONS)
    ======================================================== */
let quizzesCache = [];
let currentEditingQuizId = null;
let currentQuizQuestions = [];
let selectedQuestionImageData = null;
let questionImageRemoved = false;

const QUESTION_TYPE_LABELS = {
    single_choice: "🔘 1 Đáp án",
    multiple_choice: "☑️ Nhiều đáp án",
    ordering: "🔢 Sắp xếp",
    matching: "🔗 Nối cặp",
    fill_in_the_blank: "✍️ Điền từ"
};

async function loadQuizzesList() {
    const tbody = document.getElementById("quizzes-list-tbody");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px;">Đang tải danh sách bài thi... ⏳</td></tr>`;

    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_quizzes" })
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.message);

    quizzesCache = result.data.quizzes || [];
    renderQuizzesTable();
    } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #ef4444;">${err.message || "Lỗi tải danh sách bài thi"}</td></tr>`;
    }
}

function renderQuizzesTable() {
    const tbody = document.getElementById("quizzes-list-tbody");
    if (quizzesCache.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px; color: #64748b;">Chưa có bài thi nào. Hãy tạo bài thi mới ở khung bên trên!</td></tr>`;
    return;
    }

    tbody.innerHTML = "";
    quizzesCache.forEach((quiz, idx) => {
    const tr = document.createElement("tr");
    const timeText = quiz.time_limit_minutes > 0 ? `${quiz.time_limit_minutes} phút` : "Không giới hạn";
    const statusBadge = quiz.is_published
        ? `<span class="ban-status active">Đang mở</span>`
        : `<span class="ban-status banned">Đang ẩn</span>`;

    tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>
        <strong style="color: #1e293b;">${quiz.title}</strong>
        ${quiz.description ? `<div style="font-size: 12px; color: #64748b;">${quiz.description}</div>` : ""}
        </td>
        <td>Khối ${quiz.grade || "All"}</td>
        <td><strong>${quiz.question_count || 0}</strong> câu</td>
        <td>${timeText}</td>
        <td><span class="badge-coin">🪙 +${quiz.reward_coins || 0}</span></td>
        <td>${statusBadge}</td>
        <td>
        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button type="button" class="btn btn-primary btn-sm" onclick="openQuestionsManager('${quiz.id}')">📋 Câu hỏi (${quiz.question_count || 0})</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="fillQuizFormForEdit('${quiz.id}')">✏️ Sửa</button>
            <button type="button" class="btn btn-sm" style="background: #ef4444; color: #fff;" onclick="deleteQuizItem('${quiz.id}')">🗑️</button>
        </div>
        </td>
    `;
    tbody.appendChild(tr);
    });
}

function resetQuizForm() {
    document.getElementById("exam-quiz-id").value = "";
    document.getElementById("exam-quiz-title").value = "";
    document.getElementById("exam-quiz-grade").value = "7";
    document.getElementById("exam-quiz-time").value = "15";
    document.getElementById("exam-quiz-coins").value = "50";
    document.getElementById("exam-quiz-desc").value = "";
    document.getElementById("exam-quiz-published").checked = true;
    document.getElementById("quiz-form-title").textContent = "📝 Tạo Bài Thi Mới";
}

function fillQuizFormForEdit(quizId) {
    const quiz = quizzesCache.find(q => q.id === quizId);
    if (!quiz) return;

    document.getElementById("exam-quiz-id").value = quiz.id;
    document.getElementById("exam-quiz-title").value = quiz.title || "";
    document.getElementById("exam-quiz-grade").value = quiz.grade || "7";
    document.getElementById("exam-quiz-time").value = quiz.time_limit_minutes || 0;
    document.getElementById("exam-quiz-coins").value = quiz.reward_coins ?? 50;
    document.getElementById("exam-quiz-desc").value = quiz.description || "";
    document.getElementById("exam-quiz-published").checked = Boolean(quiz.is_published);
    document.getElementById("quiz-form-title").textContent = `✏️ Chỉnh Sửa Bài Thi: ${quiz.title}`;

    const formBody = document.getElementById("quiz-form-body");
    if (formBody.classList.contains("collapsed")) {
    toggleCardBody("quiz-form-body", "quiz-form-toggle-icon");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
}

async function submitSaveQuiz(e) {
    e.preventDefault();
    const teacher = getCurrentTeacherSession();
    if (!teacher?.sessionToken) {
    showTeacherNotification("Phiên đăng nhập giáo viên đã hết hạn. Vui lòng đăng nhập lại.");
    return;
    }

    const btn = document.getElementById("btn-save-quiz");
    btn.disabled = true;

    try {
    const payload = {
        action: "save_quiz",
        teacher_username: teacher.username,
        teacher_session_token: teacher.sessionToken,
        id: document.getElementById("exam-quiz-id").value || null,
        title: document.getElementById("exam-quiz-title").value,
        grade: document.getElementById("exam-quiz-grade").value,
        time_limit_minutes: document.getElementById("exam-quiz-time").value,
        reward_coins: document.getElementById("exam-quiz-coins").value,
        description: document.getElementById("exam-quiz-desc").value,
        is_published: document.getElementById("exam-quiz-published").checked
    };

    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.message);

    showTeacherNotification(result.message);
    resetQuizForm();
    loadQuizzesList();
    } catch (err) {
    showTeacherNotification(err.message || "Lỗi khi lưu bài thi!");
    } finally {
    btn.disabled = false;
    }
}

async function deleteQuizItem(quizId) {
    const quiz = quizzesCache.find(q => q.id === quizId);
    if (!quiz) return;
    if (!await showStyledConfirm(`Bạn có chắc chắn muốn xóa bài thi "${quiz.title}" và toàn bộ câu hỏi bên trong không?`)) return;

    const teacher = getCurrentTeacherSession();
    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        action: "delete_quiz",
        quiz_id: quizId,
        teacher_username: teacher?.username,
        teacher_session_token: teacher?.sessionToken
        })
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.message);

    showTeacherNotification(result.message);
    if (currentEditingQuizId === quizId) closeQuestionsManager();
    loadQuizzesList();
    } catch (err) {
    showTeacherNotification(err.message || "Không thể xóa bài thi!");
    }
}

/* ---------------- QUẢN LÝ CÂU HỎI TRONG BÀI THI ---------------- */
async function openQuestionsManager(quizId) {
    const quiz = quizzesCache.find(q => q.id === quizId);
    if (!quiz) return;

    currentEditingQuizId = quizId;
    document.getElementById("current-editing-quiz-title").textContent = quiz.title;
    const managerCard = document.getElementById("quiz-questions-manager");
    managerCard.style.display = "block";

    await loadQuizQuestions(quizId);
    managerCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeQuestionsManager() {
    currentEditingQuizId = null;
    currentQuizQuestions = [];
    document.getElementById("quiz-questions-manager").style.display = "none";
}

async function loadQuizQuestions(quizId) {
    const tbody = document.getElementById("quiz-questions-tbody");
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px;">Đang tải câu hỏi... ⏳</td></tr>`;

    const teacher = getCurrentTeacherSession();
    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        action: "get_quiz_questions",
        quiz_id: quizId,
        teacher_username: teacher?.username,
        teacher_session_token: teacher?.sessionToken
        })
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.message);

    currentQuizQuestions = result.data.questions || [];
    renderQuizQuestionsTable();
    } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #ef4444;">${err.message}</td></tr>`;
    }
}

function renderQuizQuestionsTable() {
    const tbody = document.getElementById("quiz-questions-tbody");
    if (currentQuizQuestions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: #64748b;">Bài thi này chưa có câu hỏi nào. Hãy bấm "➕ Thêm Câu Hỏi Mới"!</td></tr>`;
    return;
    }

    tbody.innerHTML = "";
    currentQuizQuestions.forEach(q => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td style="font-weight: bold; text-align: center;">#${q.order_index}</td>
        <td><span class="badge-role teacher">${QUESTION_TYPE_LABELS[q.type] || q.type}</span></td>
        <td style="white-space: normal; max-width: 480px;">
        ${q.img ? `<img src="${q.img}" alt="Ảnh câu hỏi" loading="lazy" style="display:block; max-width:180px; max-height:110px; object-fit:contain; margin-bottom:8px; border:1px solid #e2e8f0; border-radius:6px;">` : ''}
        ${q.prompt}
        </td>
        <td><strong>${q.points}</strong> đ</td>
        <td>
        <div class="quiz-question-row-actions">
            <button type="button" class="btn btn-secondary btn-sm" onclick="openQuestionModal('${q.id}')">✏️ Sửa</button>
            <button type="button" class="btn btn-sm" style="background: #ef4444; color: #fff;" onclick="deleteQuestionItem('${q.id}')">🗑️ Xóa</button>
        </div>
        </td>
    `;
    tbody.appendChild(tr);
    });
}

/* ---------------- TRÌNH TẠO CÂU HỎI ĐỘNG (DYNAMIC BUILDER) ---------------- */
function openQuestionModal(questionId = null) {
    if (!currentEditingQuizId) return;

    const modal = document.getElementById("question-editor-modal");
    const existingQ = questionId ? currentQuizQuestions.find(item => item.id === questionId) : null;

    document.getElementById("q-edit-id").value = existingQ ? existingQ.id : "";
    document.getElementById("question-modal-title").textContent = existingQ ? "✏️ Chỉnh Sửa Câu Hỏi" : "➕ Thêm Câu Hỏi Mới";
    document.getElementById("q-edit-type").value = existingQ ? existingQ.type : "single_choice";
    document.getElementById("q-edit-order").value = existingQ ? existingQ.order_index : (currentQuizQuestions.length + 1);
    document.getElementById("q-edit-points").value = existingQ ? existingQ.points : 10;
    document.getElementById("q-edit-prompt").value = existingQ ? existingQ.prompt : "";
    document.getElementById("q-edit-explanation").value = existingQ ? (existingQ.explanation || "") : "";
    document.getElementById("q-edit-image").value = "";
    selectedQuestionImageData = null;
    questionImageRemoved = false;
    setQuestionImagePreview(existingQ?.img || "");

    renderDynamicQuestionBuilder(existingQ);
    modal.classList.add("show");
}

function setQuestionImagePreview(imageUrl) {
    const previewWrap = document.getElementById("q-edit-image-preview-wrap");
    const preview = document.getElementById("q-edit-image-preview");
    preview.src = imageUrl || "";
    previewWrap.style.display = imageUrl ? "flex" : "none";
}

function handleQuestionImageSelection(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"].includes(file.type)) {
    event.target.value = "";
    showTeacherNotification("Chỉ hỗ trợ ảnh JPEG, PNG, WebP, GIF hoặc AVIF.");
    return;
    }
    if (file.size > 4 * 1024 * 1024) {
    event.target.value = "";
    showTeacherNotification("Ảnh câu hỏi phải nhỏ hơn hoặc bằng 4 MB.");
    return;
    }

    const reader = new FileReader();
    reader.onload = () => {
    if (typeof reader.result !== "string" || !reader.result.startsWith("data:image/")) {
        showTeacherNotification("Không thể đọc tệp ảnh đã chọn.");
        return;
    }
    selectedQuestionImageData = reader.result;
    questionImageRemoved = false;
    setQuestionImagePreview(reader.result);
    };
    reader.onerror = () => showTeacherNotification("Đã xảy ra lỗi khi đọc tệp ảnh.");
    reader.readAsDataURL(file);
}

function removeQuestionImage() {
    selectedQuestionImageData = null;
    questionImageRemoved = true;
    document.getElementById("q-edit-image").value = "";
    setQuestionImagePreview("");
}

function closeQuestionModal() {
    document.getElementById("question-editor-modal").classList.remove("show");
}

function renderDynamicQuestionBuilder(existingQ = null) {
    const type = document.getElementById("q-edit-type").value;
    const container = document.getElementById("q-dynamic-builder");
    const promptHint = document.getElementById("q-prompt-hint");
    promptHint.style.display = type === "fill_in_the_blank" ? "block" : "none";

    if (type === "single_choice" || type === "multiple_choice") {
    const inputType = type === "single_choice" ? "radio" : "checkbox";
    const options = existingQ?.data?.options || [
        { id: "opt_1", text: "" },
        { id: "opt_2", text: "" },
        { id: "opt_3", text: "" },
        { id: "opt_4", text: "" }
    ];
    const correctList = existingQ?.solution?.correct_answers || ["opt_1"];

    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <strong style="font-size: 13px; color: #334155;">Danh sách phương án & Chọn đáp án đúng:</strong>
        <button type="button" class="btn btn-secondary btn-sm" onclick="addChoiceOptionRow('${inputType}')">+ Thêm phương án</button>
        </div>
        <div id="q-choices-list" style="display: flex; flex-direction: column; gap: 8px;"></div>
    `;

    options.forEach(opt => {
        addChoiceOptionRow(inputType, opt.id, opt.text, correctList.includes(opt.id));
    });
    } 
    else if (type === "ordering") {
    // Khi sửa câu hỏi Sắp xếp, hiển thị các mục theo đúng thứ tự đúng trong solution.correct_order
    let orderedItems = [
        { id: "step_1", text: "" },
        { id: "step_2", text: "" },
        { id: "step_3", text: "" }
    ];
    if (existingQ?.data?.items && existingQ?.solution?.correct_order) {
        const itemMap = new Map(existingQ.data.items.map(i => [i.id, i]));
        orderedItems = existingQ.solution.correct_order.map(id => itemMap.get(id)).filter(Boolean);
    }

    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <strong style="font-size: 13px; color: #334155;">Nhập các bước theo ĐÚNG THỨ TỰ chuẩn (Hệ thống sẽ tự động xáo trộn khi thi):</strong>
        <button type="button" class="btn btn-secondary btn-sm" onclick="addOrderingRow()">+ Thêm bước</button>
        </div>
        <div id="q-ordering-list" style="display: flex; flex-direction: column; gap: 8px;"></div>
    `;
    orderedItems.forEach(item => addOrderingRow(item.id, item.text));
    } 
    else if (type === "matching") {
    let pairsData = [
        { leftText: "", rightText: "" },
        { leftText: "", rightText: "" }
    ];
    if (existingQ?.data?.left_items && existingQ?.data?.right_items && existingQ?.solution?.pairs) {
        const leftMap = new Map(existingQ.data.left_items.map(i => [i.id, i.text]));
        const rightMap = new Map(existingQ.data.right_items.map(i => [i.id, i.text]));
        pairsData = existingQ.solution.pairs.map(p => ({
        leftText: leftMap.get(p.left) || "",
        rightText: rightMap.get(p.right) || ""
        }));
    }

    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <strong style="font-size: 13px; color: #334155;">Nhập các cặp tương ứng (Cột A ↔ Cột B):</strong>
        <button type="button" class="btn btn-secondary btn-sm" onclick="addMatchingRow()">+ Thêm cặp nối</button>
        </div>
        <div id="q-matching-list" style="display: flex; flex-direction: column; gap: 8px;"></div>
    `;
    pairsData.forEach(p => addMatchingRow(p.leftText, p.rightText));
    } 
    else if (type === "fill_in_the_blank") {
    container.innerHTML = `
        <strong style="font-size: 13px; color: #334155; display: block; margin-bottom: 8px;">Đáp án cho từng chỗ trống (Ngăn cách các đáp án chấp nhận được bằng dấu phẩy):</strong>
        <div id="q-blanks-list" style="display: flex; flex-direction: column; gap: 8px;"></div>
    `;
    syncBlanksWithPrompt(existingQ?.solution?.answers || {});
    }
}

function addChoiceOptionRow(inputType, optId = "", text = "", isCorrect = false) {
    const list = document.getElementById("q-choices-list");
    const id = optId || `opt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const row = document.createElement("div");
    row.className = "q-choice-row";
    row.dataset.optId = id;
    row.style.cssText = "display: flex; align-items: center; gap: 8px;";
    row.innerHTML = `
    <input type="${inputType}" name="q_correct_choice" value="${id}" ${isCorrect ? "checked" : ""} title="Đánh dấu là đáp án đúng" style="width: 18px; height: 18px; cursor: pointer;">
    <input type="text" class="q-choice-text" value="${text.replace(/"/g, '&quot;')}" required placeholder="Nhập nội dung đáp án..." style="flex: 1;">
    <button type="button" onclick="this.parentElement.remove()" style="background:none; border:none; color:#ef4444; cursor:pointer; font-weight:bold;">✕</button>
    `;
    list.appendChild(row);
}

function addOrderingRow(stepId = "", text = "") {
    const list = document.getElementById("q-ordering-list");
    const id = stepId || `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const row = document.createElement("div");
    row.className = "q-order-row";
    row.dataset.stepId = id;
    row.style.cssText = "display: flex; align-items: center; gap: 8px;";
    row.innerHTML = `
    <span style="font-size: 12px; font-weight: bold; color: #64748b; width: 24px;">☰</span>
    <input type="text" class="q-order-text" value="${text.replace(/"/g, '&quot;')}" required placeholder="Nhập nội dung bước..." style="flex: 1;">
    <button type="button" onclick="this.parentElement.remove()" style="background:none; border:none; color:#ef4444; cursor:pointer; font-weight:bold;">✕</button>
    `;
    list.appendChild(row);
}

function addMatchingRow(leftVal = "", rightVal = "") {
    const list = document.getElementById("q-matching-list");
    const row = document.createElement("div");
    row.className = "q-match-row";
    row.style.cssText = "display: grid; grid-template-columns: 1fr auto 1fr auto; align-items: center; gap: 8px;";
    row.innerHTML = `
    <input type="text" class="q-match-left" value="${leftVal.replace(/"/g, '&quot;')}" required placeholder="Nội dung Cột A...">
    <span style="color: #64748b; font-weight: bold;">↔</span>
    <input type="text" class="q-match-right" value="${rightVal.replace(/"/g, '&quot;')}" required placeholder="Nội dung Cột B tương ứng...">
    <button type="button" onclick="this.parentElement.remove()" style="background:none; border:none; color:#ef4444; cursor:pointer; font-weight:bold;">✕</button>
    `;
    list.appendChild(row);
}

function onPromptInputUpdate() {
    const type = document.getElementById("q-edit-type").value;
    if (type === "fill_in_the_blank") {
    const currentAnswers = {};
    document.querySelectorAll(".q-blank-input").forEach(inp => {
        currentAnswers[inp.dataset.blankId] = inp.value.split(",").map(s => s.trim()).filter(Boolean);
    });
    syncBlanksWithPrompt(currentAnswers);
    }
}

function syncBlanksWithPrompt(savedAnswers = {}) {
    const promptText = document.getElementById("q-edit-prompt").value;
    const list = document.getElementById("q-blanks-list");
    if (!list) return;

    const matches = [...promptText.matchAll(/\{\{([a-zA-Z0-9_-]+)\}\}/g)];
    const blankIds = [...new Set(matches.map(m => m[1]))];

    if (blankIds.length === 0) {
    list.innerHTML = `<div style="color: #b45309; font-size: 13px;">⚠️ Hãy gõ <code>{{b1}}</code>, <code>{{b2}}</code>... vào ô Đề bài phía trên để tạo chỗ trống.</div>`;
    return;
    }

    list.innerHTML = "";
    blankIds.forEach(bId => {
    const prevVal = Array.isArray(savedAnswers[bId]) ? savedAnswers[bId].join(", ") : "";
    const row = document.createElement("div");
    row.style.cssText = "display: flex; align-items: center; gap: 10px;";
    row.innerHTML = `
        <code style="background: #dbeafe; color: #1e40af; padding: 6px 10px; border-radius: 6px; font-weight: bold;">{{${bId}}}</code>
        <input type="text" class="q-blank-input" data-blank-id="${bId}" value="${prevVal.replace(/"/g, '&quot;')}" required placeholder="VD: LAN, mạng cục bộ" style="flex: 1;">
    `;
    list.appendChild(row);
    });
}

async function submitSaveQuestion(e) {
    e.preventDefault();
    const type = document.getElementById("q-edit-type").value;
    const prompt = document.getElementById("q-edit-prompt").value.trim();

    let data = {};
    let solution = {};

    if (type === "single_choice" || type === "multiple_choice") {
    const rows = [...document.querySelectorAll(".q-choice-row")];
    if (rows.length < 2) {
        showTeacherNotification("Vui lòng thêm ít nhất 2 phương án trả lời!");
        return;
    }
    const options = [];
    const correct_answers = [];
    rows.forEach(r => {
        const id = r.dataset.optId;
        const text = r.querySelector(".q-choice-text").value.trim();
        const checked = r.querySelector("input[name='q_correct_choice']").checked;
        options.push({ id, text });
        if (checked) correct_answers.push(id);
    });
    if (correct_answers.length === 0) {
        showTeacherNotification("Vui lòng tích chọn ít nhất 1 đáp án đúng!");
        return;
    }
    data = { options, shuffle: true };
    solution = { correct_answers };
    } 
    else if (type === "ordering") {
    const rows = [...document.querySelectorAll(".q-order-row")];
    if (rows.length < 2) {
        showTeacherNotification("Cần ít nhất 2 bước để sắp xếp!");
        return;
    }
    const items = rows.map(r => ({
        id: r.dataset.stepId,
        text: r.querySelector(".q-order-text").value.trim()
    }));
    const correct_order = items.map(i => i.id);
    // Xáo trộn vị trí trong data.items để học sinh không nhìn thấy thứ tự chuẩn ban đầu
    const shuffledItems = [...items].sort(() => Math.random() - 0.5);
    data = { items: shuffledItems };
    solution = { correct_order };
    } 
    else if (type === "matching") {
    const rows = [...document.querySelectorAll(".q-match-row")];
    if (rows.length < 2) {
        showTeacherNotification("Cần ít nhất 2 cặp nối!");
        return;
    }
    const left_items = [];
    const right_items = [];
    const pairs = [];
    rows.forEach((r, idx) => {
        const lId = `L_${idx + 1}`;
        const rId = `R_${idx + 1}`;
        left_items.push({ id: lId, text: r.querySelector(".q-match-left").value.trim() });
        right_items.push({ id: rId, text: r.querySelector(".q-match-right").value.trim() });
        pairs.push({ left: lId, right: rId });
    });
    data = { left_items, right_items: [...right_items].sort(() => Math.random() - 0.5) };
    solution = { pairs };
    } 
    else if (type === "fill_in_the_blank") {
    const inputs = [...document.querySelectorAll(".q-blank-input")];
    if (inputs.length === 0) {
        showTeacherNotification("Đề bài chưa có ký hiệu chỗ trống {{b1}}, {{b2}}...");
        return;
    }
    const blanks = [];
    const answers = {};
    inputs.forEach(inp => {
        const bId = inp.dataset.blankId;
        blanks.push({ id: bId });
        answers[bId] = inp.value.split(",").map(s => s.trim()).filter(Boolean);
    });
    data = { blanks, case_sensitive: false };
    solution = { answers };
    }

    const teacher = getCurrentTeacherSession();
    const btn = document.getElementById("btn-submit-question");
    btn.disabled = true;

    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        action: "save_question",
        teacher_username: teacher?.username,
        teacher_session_token: teacher?.sessionToken,
        id: document.getElementById("q-edit-id").value || null,
        quiz_id: currentEditingQuizId,
        type,
        prompt,
        data,
        solution,
        explanation: document.getElementById("q-edit-explanation").value,
        points: document.getElementById("q-edit-points").value,
        order_index: document.getElementById("q-edit-order").value,
        img: selectedQuestionImageData || (questionImageRemoved ? null : undefined)
        })
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.message);

    showTeacherNotification(result.message);
    closeQuestionModal();
    await loadQuizQuestions(currentEditingQuizId);
    loadQuizzesList();
    } catch (err) {
    showTeacherNotification(err.message || "Không thể lưu câu hỏi!");
    } finally {
    btn.disabled = false;
    }
}

async function deleteQuestionItem(questionId) {
    if (!await showStyledConfirm("Bạn có chắc chắn muốn xóa câu hỏi này khỏi đề thi?")) return;

    const teacher = getCurrentTeacherSession();
    try {
    const res = await fetch("/.netlify/functions/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        action: "delete_question",
        question_id: questionId,
        teacher_username: teacher?.username,
        teacher_session_token: teacher?.sessionToken
        })
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.message);

    showTeacherNotification(result.message);
    await loadQuizQuestions(currentEditingQuizId);
    loadQuizzesList();
    } catch (err) {
    showTeacherNotification(err.message || "Lỗi xóa câu hỏi!");
    }
}