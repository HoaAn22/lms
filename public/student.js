document.addEventListener("DOMContentLoaded", () => {
  const session = checkAuth("student");
  if (!session) return;

  document.getElementById("header-student-name").textContent = session.fullName || session.username;
  document.getElementById("stu-fullname").textContent = session.fullName || "---";
  document.getElementById("stu-class").textContent = session.className || "---";
  document.getElementById("stu-school").textContent = session.school || "---";

  loadStudentData();
  renderGachaHistory();
});

function switchStudentTab(tabId) {
  document.querySelectorAll(".tab-view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".student-nav .nav-btn").forEach(b => b.classList.remove("active"));
  
  document.getElementById(tabId).classList.add("active");
  event.currentTarget.classList.add("active");
}

let studentCoins = 100;
let studentTotalCoins = 100;
let studentSpentCoins = 0;
let studentMemeIds = [];
let studentMemesCache = [];
let currentStudentFilter = 'ALL';

async function loadStudentData() {
  const session = getSession();
  if (!session) return;

  try {
    const res = await fetch("/.netlify/functions/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_student_info", id: session.id })
    });
    const result = await res.json();

    if (result.success && result.data) {
      studentCoins = result.data.coins !== undefined ? Number(result.data.coins) : 100;
      studentTotalCoins = result.data.total_coins !== undefined ? Number(result.data.total_coins) : 100;
      studentSpentCoins = result.data.spent_coins !== undefined ? Number(result.data.spent_coins) : 0;
      studentMemeIds = (result.data.meme_id_list || []).map(id => Number(id));
      
      updateCoinsDisplay();
      loadStudentCollection();
    }
  } catch (err) {
    console.error("Lỗi tải thông tin học sinh:", err);
  }

  loadStudentScores();
}

function updateCoinsDisplay() {
  const coinsEl = document.getElementById("user-coins");
  const spentEl = document.getElementById("user-spent-coins");
  if (coinsEl) coinsEl.textContent = studentCoins;
  if (spentEl) spentEl.textContent = studentSpentCoins;
}

async function syncStudentDataToDB() {
  const session = getSession();
  if (!session) return;

  try {
    await fetch("/.netlify/functions/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_student_items",
        student_id: session.id,
        coins: studentCoins,
        total_coins: studentTotalCoins,
        spent_coins: studentSpentCoins,
        meme_id_list: studentMemeIds
      })
    });
  } catch (err) {
    console.error("Lỗi đồng bộ dữ liệu xu/meme:", err);
  }
}

async function loadStudentScores() {
  const session = getSession();
  const tableBody = document.getElementById("score-table-body");
  tableBody.innerHTML = `<tr><td colspan="3">Đang đồng bộ dữ liệu điểm...</td></tr>`;

  try {
    const res = await fetch("/.netlify/functions/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_student_scores", id: session.id })
    });
    const result = await res.json();

    if (result.success && result.data.scores) {
      const scores = result.data.scores;
      tableBody.innerHTML = "";
      
      let total = 0, count = 0;
      scores.forEach((sc, idx) => {
        const val = sc !== "" && sc !== null ? Number(sc) : null;
        if (val !== null) {
          total += val;
          count++;
        }
        
        let evaluation = "Chưa có điểm";
        if (val !== null) {
          if (val >= 8) evaluation = "Giỏi 🌟";
          else if (val >= 6.5) evaluation = "Khá 👍";
          else if (val >= 5) evaluation = "Trung bình 📚";
          else evaluation = "Cần cố gắng ⚠️";
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>Cột điểm ${idx + 1}</td>
          <td><strong>${val !== null ? val : '---'}</strong></td>
          <td>${evaluation}</td>
        `;
        tableBody.appendChild(tr);
      });

      const avg = count > 0 ? (total / count).toFixed(1) : "--";
      document.getElementById("average-score").textContent = avg;
      
      let rank = "--";
      if (count > 0) {
        if (avg >= 8) rank = "Giỏi 🌟";
        else if (avg >= 6.5) rank = "Khá 👍";
        else if (avg >= 5) rank = "Trung bình 📚";
        else rank = "Cần cố gắng ⚠️";
      }
      document.getElementById("academic-rank").textContent = rank;
    } else {
      tableBody.innerHTML = `<tr><td colspan="3">Chưa có dữ liệu bảng điểm.</td></tr>`;
    }
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="3" style="color:red;">Lỗi kết nối máy chủ!</td></tr>`;
  }
}

let gameInterval = null;
let gameScoreCount = 0;
let timeLeft = 30;

function startMiniGame() {
  document.getElementById("game-intro").classList.add("hidden");
  document.getElementById("game-over").classList.add("hidden");
  document.getElementById("game-play").classList.remove("hidden");

  gameScoreCount = 0;
  timeLeft = 30;
  document.getElementById("game-timer").textContent = timeLeft + "s";

  generateGameQuestion();

  if (gameInterval) clearInterval(gameInterval);
  gameInterval = setInterval(() => {
    timeLeft--;
    document.getElementById("game-timer").textContent = timeLeft + "s";
    if (timeLeft <= 0) {
      clearInterval(gameInterval);
      endMiniGame();
    }
  }, 1000);
}

function generateGameQuestion() {
  const num1 = Math.floor(Math.random() * 20) + 1;
  const num2 = Math.floor(Math.random() * 20) + 1;
  const isAddition = Math.random() > 0.5;
  const correctAnswer = isAddition ? num1 + num2 : num1 - num2;

  document.getElementById("game-question").textContent = `${num1} ${isAddition ? '+' : '-'} ${num2} = ?`;

  const optionsContainer = document.getElementById("game-options");
  optionsContainer.innerHTML = "";

  let options = [correctAnswer];
  while (options.length < 4) {
    let wrong = correctAnswer + Math.floor(Math.random() * 10) - 5;
    if (!options.includes(wrong)) options.push(wrong);
  }
  options.sort(() => Math.random() - 0.5);

  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "btn btn-secondary";
    btn.textContent = opt;
    btn.onclick = () => {
      if (opt === correctAnswer) {
        gameScoreCount++;
      }
      generateGameQuestion();
    };
    optionsContainer.appendChild(btn);
  });
}

async function endMiniGame() {
  document.getElementById("game-play").classList.add("hidden");
  document.getElementById("game-over").classList.remove("hidden");
  
  document.getElementById("game-score").textContent = gameScoreCount;
  const coinsEarned = gameScoreCount * 10;
  document.getElementById("game-coins-earned").textContent = `+${coinsEarned} 🪙`;

  if (coinsEarned > 0) {
    studentCoins += coinsEarned;
    studentTotalCoins += coinsEarned;
    updateCoinsDisplay();
    await syncStudentDataToDB();
  }
}

/* Lịch sử quay Gacha trong phiên (Session Storage) */
function getGachaSessionHistory() {
  try {
    return JSON.parse(sessionStorage.getItem("gacha_session_history") || "[]");
  } catch (e) {
    return [];
  }
}

function addGachaHistoryItem(meme) {
  const history = getGachaSessionHistory();
  const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  history.unshift({
    rarity: meme.rarity,
    slogan: meme.slogan,
    image: meme.image,
    time: timeNow
  });
  sessionStorage.setItem("gacha_session_history", JSON.stringify(history));
  renderGachaHistory();
}

function renderGachaHistory() {
  const container = document.getElementById("gacha-history-list");
  if (!container) return;

  const history = getGachaSessionHistory();
  if (history.length === 0) {
    container.innerHTML = `<div style="color: #94a3b8; font-size: 13px; text-align: center; padding: 12px;">Bạn chưa quay lượt nào trong phiên đăng nhập này.</div>`;
    return;
  }

  container.innerHTML = "";
  history.forEach(item => {
    const div = document.createElement("div");
    div.className = "gacha-history-item";
    div.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <img src="${item.image}" alt="Meme">
        <div>
          <span class="rarity-tag" style="padding: 1px 6px; font-size: 10px; margin-bottom: 2px;">${item.rarity}</span>
          <div style="font-weight: 500; color: #1e293b; max-width: 220px; word-break: break-word;">${item.slogan}</div>
        </div>
      </div>
      <span style="font-size: 11px; color: #94a3b8;">${item.time}</span>
    `;
    container.appendChild(div);
  });
}

function clearGachaHistory() {
  sessionStorage.removeItem("gacha_session_history");
  renderGachaHistory();
}

/* Vòng quay Gacha với hiệu ứng hoạt hình */
async function pullGacha() {
  const session = getSession();
  const cost = 30;
  const notice = document.getElementById("gacha-result-notice");
  notice.textContent = "";

  if (studentCoins < cost) {
    notice.textContent = "Bạn không đủ Xu để quay! Hãy làm bài tập hoặc chơi mini-game.";
    return;
  }

  const btnPull = document.getElementById("btn-pull-gacha");
  const gachaBox = document.getElementById("gacha-box");
  
  btnPull.disabled = true;
  gachaBox.classList.add("shaking");
  notice.textContent = "✨ Đang mở hộp quà bí ẩn... ⏳";

  try {
    const res = await fetch("/.netlify/functions/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pull_gacha", student_id: session.id })
    });
    const result = await res.json();

    setTimeout(() => {
      gachaBox.classList.remove("shaking");
      btnPull.disabled = false;

      if (!res.ok || !result.success) {
        notice.textContent = result.message || "Lỗi quay Gacha!";
        return;
      }

      studentCoins = Number(result.data.coins);
      studentSpentCoins = Number(result.data.spent_coins !== undefined ? result.data.spent_coins : studentSpentCoins + cost);
      studentTotalCoins = Number(result.data.total_coins !== undefined ? result.data.total_coins : studentTotalCoins);
      studentMemeIds = (result.data.meme_id_list || []).map(id => Number(id));
      
      updateCoinsDisplay();
      loadStudentCollection();

      const won = result.data.wonMeme;
      notice.innerHTML = `🎉 Chúc mừng! Bạn nhận được meme [${won.rarity}]: <strong>${won.slogan}</strong>`;

      addGachaHistoryItem(won);
    }, 1200);

  } catch (err) {
    gachaBox.classList.remove("shaking");
    btnPull.disabled = false;
    notice.textContent = "Lỗi kết nối máy chủ!";
  }
}

async function loadStudentCollection() {
  const grid = document.getElementById("collection-grid");
  if (!grid) return;
  
  grid.innerHTML = `<div style="grid-column: span 3; text-align: center; color: #64748b; padding: 20px;">Đang tải bộ sưu tập...</div>`;

  try {
    const res = await fetch("/.netlify/functions/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_all_memes" })
    });
    const result = await res.json();

    if (!result.success || !result.data.memes) {
      grid.innerHTML = `<p style="color: #64748b; font-size: 14px;">Chưa có dữ liệu meme trong hệ thống.</p>`;
      return;
    }

    studentMemesCache = result.data.memes;
    renderStudentCollection();

  } catch (err) {
    grid.innerHTML = `<p style="color: red; font-size: 14px;">Lỗi tải bộ sưu tập từ máy chủ.</p>`;
  }
}

function filterStudentMemes(rarity, btnElement) {
  currentStudentFilter = rarity;
  document.querySelectorAll("#student-filter-bar .filter-btn").forEach(b => b.classList.remove("active"));
  if (btnElement) btnElement.classList.add("active");
  renderStudentCollection();
}

function renderStudentCollection() {
  const grid = document.getElementById("collection-grid");
  if (!grid) return;

  const rarityOrder = { 'SS': 1, 'S': 2, 'A': 3, 'B': 4, 'C': 5 };

  let sorted = [...studentMemesCache].sort((a, b) => {
    let rA = rarityOrder[a.rarity] || 99;
    let rB = rarityOrder[b.rarity] || 99;
    return rA - rB;
  });

  if (currentStudentFilter !== 'ALL') {
    sorted = sorted.filter(m => m.rarity === currentStudentFilter);
  }

  if (sorted.length === 0) {
    grid.innerHTML = `<p style="grid-column: span 3; text-align: center; color: #64748b; font-size: 14px;">Không có meme nào thuộc độ hiếm này.</p>`;
    return;
  }

  grid.innerHTML = "";
  sorted.forEach(meme => {
    const count = studentMemeIds.filter(id => id === Number(meme.id)).length;
    const isUnlocked = count > 0;
    
    const card = document.createElement("div");
    card.className = `meme-card-item ${isUnlocked ? 'unlocked' : 'locked'}`;

    if (isUnlocked) {
      card.onclick = () => openMemeViewModal(meme, count);
      card.innerHTML = `
        <div>
          <span class="rarity-tag">${meme.rarity}</span>
          <div class="meme-img-wrapper">
            <img src="${meme.image}" alt="Meme">
            <span class="meme-count-badge">x${count}</span>
          </div>
        </div>
        <div class="meme-slogan">${meme.slogan}</div>
      `;
    } else {
      card.innerHTML = `
        <div>
          <span class="rarity-tag" style="background:#94a3b8;">${meme.rarity}</span>
          <div style="height: 120px; background: #cbd5e1; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 24px;">🔒</div>
        </div>
        <div class="meme-slogan" style="color: #94a3b8; font-style: italic;">Chưa mở khóa</div>
      `;
    }
    grid.appendChild(card);
  });
}

/* Xem chi tiết Meme dành cho học sinh */
function openMemeViewModal(meme, count) {
  const modal = document.getElementById("view-meme-modal");
  if (!modal) return;

  document.getElementById("view-meme-rarity").textContent = meme.rarity;
  document.getElementById("view-meme-count").textContent = `Sở hữu: x${count}`;
  document.getElementById("view-meme-img").src = meme.image;
  document.getElementById("view-meme-slogan").textContent = meme.slogan;

  modal.classList.add("show");
}

function closeMemeViewModal() {
  const modal = document.getElementById("view-meme-modal");
  if (modal) {
    modal.classList.remove("show");
  }
}