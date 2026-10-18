/**
 * LMS CLASSROOM ENGLISH - LOGIKA APLIKASI UT PGSD
 * Terintegrasi dengan Google Spreadsheet & Google Apps Script
 * Versi Bersih: Bebas Data Dummy & PIN Aman (Tanpa Plaintext di Repositori)
 */

// Konfigurasi Sistem
const APP_CONFIG = {
  spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1ETjJYbWnNVIfYhzAdx0gs77c73k6CsRW_-9-ZU4gQsc",
  // Script URL dapat diisi di sini atau melalui Pengaturan Tutor di aplikasi
  scriptUrl: localStorage.getItem("ut_lms_script_url") || "",
  passThreshold: 70 // Minimal 70% untuk lulus modul
};

// State Aplikasi
const AppState = {
  currentUser: null,
  activeView: "dashboard",
  activeModuleId: 1,
  activeTab: "video",
  leaderboardFilter: "ALL",
  leaderboardData: []
};

// Inisialisasi saat halaman dimuat
document.addEventListener("DOMContentLoaded", () => {
  loadLocalSession();
  initEventListeners();
  renderApp();
  syncLeaderboard();
});

// ==========================================
// AUTHENTICATION & SESSION MANAGEMENT
// ==========================================

function loadLocalSession() {
  const savedUser = localStorage.getItem("ut_lms_user");
  if (savedUser) {
    try {
      AppState.currentUser = JSON.parse(savedUser);
    } catch (e) {
      AppState.currentUser = null;
    }
  }
}

function saveLocalSession(user) {
  AppState.currentUser = user;
  localStorage.setItem("ut_lms_user", JSON.stringify(user));
  updateStoredStudent(user);
}

function updateStoredStudent(user) {
  let allStudents = JSON.parse(localStorage.getItem("ut_lms_all_students") || "[]");
  const idx = allStudents.findIndex(s => s.nim === user.nim);
  if (idx !== -1) {
    allStudents[idx] = Object.assign({}, allStudents[idx], user);
  } else {
    allStudents.push(user);
  }
  localStorage.setItem("ut_lms_all_students", JSON.stringify(allStudents));
}

async function handleRegister(e) {
  e.preventDefault();
  const kelas = document.getElementById("regKelas").value;
  const nim = document.getElementById("regNim").value.trim();
  const nama = document.getElementById("regNama").value.trim();
  const password = nim; // Default password adalah NIM

  if (!kelas || !nim || !nama) {
    alert("Mohon lengkapi seluruh formulir pendaftaran.");
    return;
  }

  // Cek apakah NIM sudah terdaftar di database lokal
  const allStudents = JSON.parse(localStorage.getItem("ut_lms_all_students") || "[]");
  if (allStudents.some(s => s.nim === nim)) {
    alert(`NIM ${nim} sudah terdaftar! Silakan gunakan menu Masuk (Login) menggunakan Password NIM Anda.`);
    switchAuthTab("login");
    document.getElementById("loginNim").value = nim;
    document.getElementById("loginPassword").focus();
    return;
  }

  const submitBtn = document.getElementById("btnSubmitRegister");
  submitBtn.disabled = true;
  submitBtn.innerText = "Mendaftarkan...";

  const newStudent = {
    nim: nim,
    nama: nama,
    kelas: kelas,
    password: password,
    totalScore: 0,
    modulesPassed: 0,
    passedModules: [],
    moduleScores: {},
    registrationDate: new Date().toLocaleDateString("id-ID")
  };

  // Coba sinkronisasi ke Google Apps Script jika URL tersedia
  if (APP_CONFIG.scriptUrl) {
    try {
      const res = await fetch(APP_CONFIG.scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          action: "register",
          nim: nim,
          nama: nama,
          kelas: kelas,
          password: password
        })
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || "Gagal mendaftar di database spreadsheet.");
        submitBtn.disabled = false;
        submitBtn.innerText = "Daftar Sekarang";
        return;
      }
    } catch (err) {
      console.warn("Koneksi Google Apps Script gagal, menggunakan penyimpanan lokal:", err);
    }
  }

  saveLocalSession(newStudent);
  closeModal("modalAuth");
  alert(`Selamat datang, ${nama}!\n\nPendaftaran berhasil.\nKelas: ${kelas}\nUsername: ${nim}\nPassword Awal: ${nim}`);
  renderApp();
  syncLeaderboard();
  submitBtn.disabled = false;
  submitBtn.innerText = "Daftar Sekarang";
}

async function handleLogin(e) {
  e.preventDefault();
  const nim = document.getElementById("loginNim").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!nim || !password) {
    alert("Mohon masukkan NIM dan Password.");
    return;
  }

  const submitBtn = document.getElementById("btnSubmitLogin");
  submitBtn.disabled = true;
  submitBtn.innerText = "Memverifikasi...";

  // 1. Coba verifikasi ke Google Apps Script backend jika URL tersedia
  if (APP_CONFIG.scriptUrl) {
    try {
      const res = await fetch(`${APP_CONFIG.scriptUrl}?action=login&nim=${encodeURIComponent(nim)}&password=${encodeURIComponent(password)}`);
      const data = await res.json();
      if (data.success && data.student) {
        saveLocalSession(data.student);
        closeModal("modalAuth");
        alert(data.message || `Selamat datang kembali, ${data.student.nama}!`);
        renderApp();
        syncLeaderboard();
        submitBtn.disabled = false;
        submitBtn.innerText = "Masuk";
        return;
      } else if (data.message && data.message.includes("Password salah")) {
        alert(data.message);
        submitBtn.disabled = false;
        submitBtn.innerText = "Masuk";
        return;
      }
    } catch (err) {
      console.warn("Gagal menghubungi Google Apps Script, fallback ke verifikasi lokal:", err);
    }
  }

  // 2. Fallback verifikasi lokal dari database terdaftar
  let allStudents = JSON.parse(localStorage.getItem("ut_lms_all_students") || "[]");
  const found = allStudents.find(s => s.nim === nim);

  if (found) {
    if (found.password === password || (!found.password && password === nim)) {
      saveLocalSession(found);
      closeModal("modalAuth");
      alert(`Selamat datang kembali, ${found.nama}!`);
      renderApp();
      syncLeaderboard();
    } else {
      alert("Password salah. Password awal adalah NIM Anda.");
    }
  } else {
    alert(`NIM ${nim} belum terdaftar di sistem. Silakan pilih tab 'Daftar Baru' terlebih dahulu.`);
    switchAuthTab("register");
    document.getElementById("regNim").value = nim;
  }

  submitBtn.disabled = false;
  submitBtn.innerText = "Masuk";
}

function handleLogout() {
  if (confirm("Apakah Anda yakin ingin keluar dari akun ini?")) {
    AppState.currentUser = null;
    localStorage.removeItem("ut_lms_user");
    AppState.activeView = "dashboard";
    renderApp();
    syncLeaderboard();
    alert("Anda telah berhasil keluar (logout).");
  }
}

// ==========================================
// VIEW SWITCHING & RENDERING
// ==========================================

function switchView(viewName) {
  AppState.activeView = viewName;
  window.scrollTo({ top: 0, behavior: "smooth" });
  renderApp();
}

function renderApp() {
  updateNavbar();

  // Hide all view sections
  document.querySelectorAll(".view-section").forEach(sec => sec.style.display = "none");

  // Show active view section
  const targetSec = document.getElementById(`view-${AppState.activeView}`);
  if (targetSec) {
    targetSec.style.display = "block";
  }

  if (AppState.activeView === "dashboard") {
    renderDashboard();
  } else if (AppState.activeView === "study") {
    renderStudyView();
  } else if (AppState.activeView === "leaderboard") {
    renderLeaderboard();
  } else if (AppState.activeView === "transcript") {
    renderTranscript();
  } else if (AppState.activeView === "certificate") {
    renderCertificate();
  } else if (AppState.activeView === "tutor") {
    renderTutorPanel();
  }
}

function updateNavbar() {
  const user = AppState.currentUser;
  const userContainer = document.getElementById("navUserArea");

  // Update active class on nav links
  document.querySelectorAll(".nav-link").forEach(link => {
    link.classList.remove("active");
    if (link.dataset.view === AppState.activeView) {
      link.classList.add("active");
    }
  });

  if (user) {
    userContainer.innerHTML = `
      <div class="user-badge">
        <span>👤 ${escapeHtml(user.nama)}</span>
        <span class="class-tag">${escapeHtml(user.kelas)}</span>
      </div>
      <button class="btn btn-outline-white btn-sm" onclick="handleLogout()">Keluar</button>
    `;
  } else {
    userContainer.innerHTML = `
      <button class="btn btn-gold btn-sm" onclick="openAuthModal('login')">Masuk / Daftar</button>
    `;
  }
}

// ==========================================
// DASHBOARD VIEW
// ==========================================

function renderDashboard() {
  const user = AppState.currentUser;
  const passedCount = user ? (user.passedModules || []).length : 0;
  const percent = Math.round((passedCount / 19) * 100);

  // Update Hero Banner
  document.getElementById("dashStudentName").innerText = user ? user.nama : "Calon Guru SD";
  document.getElementById("dashProgressPercent").innerText = `${percent}%`;
  document.getElementById("dashProgressBar").style.width = `${percent}%`;
  document.getElementById("dashPassedCount").innerText = `${passedCount} dari 19 Modul Selesai`;
  document.getElementById("dashTotalScore").innerText = `Total Nilai: ${user ? (user.totalScore || 0) : 0}`;

  // Render Module Grid
  const grid = document.getElementById("modulesGrid");
  grid.innerHTML = "";

  MODULES_DATA.forEach((mod) => {
    const isCompleted = user && (user.passedModules || []).includes(mod.id);
    // Modul 1 selalu terbuka. Modul berikutnya terbuka jika modul sebelumnya sudah lulus.
    const isUnlocked = !user ? (mod.id === 1) : (mod.id === 1 || (user.passedModules || []).includes(mod.id - 1) || isCompleted);
    const scoreObj = user && user.moduleScores ? user.moduleScores[mod.id] : null;

    const card = document.createElement("div");
    card.className = `module-card ${isCompleted ? "completed" : (isUnlocked ? "active-module" : "locked")}`;

    let statusBadge = "";
    if (isCompleted) {
      statusBadge = `<div class="module-badge-status badge-passed">✓ Lulus (${scoreObj ? scoreObj.score : 100}%)</div>`;
    } else if (isUnlocked) {
      statusBadge = `<div class="module-badge-status badge-ready">Siap Dipelajari</div>`;
    } else {
      statusBadge = `<div class="module-badge-status badge-locked">🔒 Terkunci</div>`;
    }

    card.innerHTML = `
      <div class="module-thumbnail">
        <img src="https://img.youtube.com/vi/${mod.videoId}/hqdefault.jpg" alt="${escapeHtml(mod.titleId)}" loading="lazy">
        <span class="module-number">Modul ${mod.index}</span>
        <span class="module-duration">${mod.duration}</span>
        ${statusBadge}
      </div>
      <div class="module-body">
        <h4 class="module-title-id">${escapeHtml(mod.titleId)}</h4>
        <div class="module-title-en">${escapeHtml(mod.titleEn)}</div>
        <p class="module-desc">${escapeHtml(mod.summary)}</p>
        <div class="module-footer">
          ${scoreObj ? `<span class="score-display">Nilai: ${scoreObj.score}</span>` : `<span></span>`}
          <button class="btn ${isUnlocked ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="openModule(${mod.id})" ${!isUnlocked ? 'disabled' : ''}>
            ${isCompleted ? 'Pelajari Ulang' : (isUnlocked ? 'Mulai Belajar' : 'Terkunci')}
          </button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function openModule(moduleId) {
  const user = AppState.currentUser;
  if (!user && moduleId > 1) {
    alert("Silakan mendaftar atau login terlebih dahulu untuk mengakses modul ini.");
    openAuthModal("login");
    return;
  }

  // Cek apakah modul terbuka
  const isUnlocked = !user ? (moduleId === 1) : (moduleId === 1 || (user.passedModules || []).includes(moduleId - 1) || (user.passedModules || []).includes(moduleId));
  if (!isUnlocked) {
    alert(`Modul ${moduleId} masih terkunci! Anda harus menyelesaikan dan lulus kuis Modul ${moduleId - 1} terlebih dahulu.`);
    return;
  }

  AppState.activeModuleId = moduleId;
  AppState.activeTab = "video";
  switchView("study");
}

// ==========================================
// STUDY VIEW (VIDEO, READING, QUIZ)
// ==========================================

function renderStudyView() {
  const mod = MODULES_DATA.find(m => m.id === AppState.activeModuleId) || MODULES_DATA[0];
  const user = AppState.currentUser;

  document.getElementById("studyModuleTitle").innerHTML = `
    <span style="color:var(--accent-gold); font-weight:800;">Modul ${mod.index}:</span> ${escapeHtml(mod.titleId)}
  `;
  document.getElementById("studyModuleSub").innerText = mod.titleEn;

  // Video Tab
  const videoWrapper = document.getElementById("studyVideoContainer");
  videoWrapper.innerHTML = `
    <iframe src="https://www.youtube-nocookie.com/embed/${mod.videoId}?rel=0&autoplay=0" 
            title="${escapeHtml(mod.titleId)}" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen>
    </iframe>
  `;

  // Reading / Document Tab
  const docTab = document.getElementById("studyDocContainer");
  let exprRows = "";
  (mod.expressions || []).forEach((exp) => {
    exprRows += `
      <tr>
        <td style="font-weight:700; color:var(--primary);">${escapeHtml(exp.en)}</td>
        <td style="color:var(--text-secondary);">${escapeHtml(exp.id)}</td>
        <td style="font-size:0.85rem; color:#475569;">${escapeHtml(exp.gesture)}</td>
      </tr>
    `;
  });

  let keyPointsList = "";
  (mod.keyPoints || []).forEach(kp => {
    keyPointsList += `<li style="margin-bottom:0.4rem;">${escapeHtml(kp)}</li>`;
  });

  docTab.innerHTML = `
    <div style="margin-bottom: 1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; background:#f1f5f9; padding:1rem 1.25rem; border-radius:var(--radius-md);">
      <div>
        <h4 style="margin-bottom:0.2rem;">Dokumen Modul Resmi (PDF)</h4>
        <p style="font-size:0.8rem; color:var(--text-secondary); margin:0;">${escapeHtml(mod.pdfFile)}</p>
      </div>
      <a href="docs/${encodeURIComponent(mod.pdfFile)}" target="_blank" class="btn btn-primary btn-sm">
        📄 Buka / Unduh Dokumen Asli
      </a>
    </div>

    <h4 style="margin: 1.25rem 0 0.5rem; color:var(--primary-dark);">Rangkuman Konsep Pedagogis:</h4>
    <ul style="padding-left:1.5rem; color:var(--text-secondary); margin-bottom:1.5rem;">
      ${keyPointsList}
    </ul>

    <h4 style="margin: 1.5rem 0 0.5rem; color:var(--primary-dark);">Tabel Ungkapan Bahasa Kelas & Bahasa Tubuh:</h4>
    <div class="table-responsive">
      <table class="expression-table">
        <thead>
          <tr>
            <th style="width:35%;">Ungkapan Bahasa Inggris</th>
            <th style="width:30%;">Arti Bahasa Indonesia</th>
            <th style="width:35%;">Gestur / Bahasa Tubuh</th>
          </tr>
        </thead>
        <tbody>
          ${exprRows}
        </tbody>
      </table>
    </div>

    <div style="margin-top:1.5rem; padding:1.25rem; background:#eff6ff; border-left:4px solid var(--primary); border-radius:var(--radius-sm);">
      <h5 style="color:var(--primary-dark); margin-bottom:0.4rem;">Contoh Penerapan Skenario Nyata:</h5>
      <p style="font-size:0.9rem; color:var(--text-secondary); margin:0;">${escapeHtml(mod.scenario)}</p>
    </div>
  `;

  // Quiz Tab
  renderQuiz(mod);

  // Switch to active tab
  switchStudyTab(AppState.activeTab);
}

function switchStudyTab(tabName) {
  AppState.activeTab = tabName;
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.classList.toggle("active", panel.id === `tabPanel-${tabName}`);
  });
}

function renderQuiz(mod) {
  const quizContainer = document.getElementById("studyQuizContainer");
  const user = AppState.currentUser;
  const isCompleted = user && (user.passedModules || []).includes(mod.id);
  const scoreObj = user && user.moduleScores ? user.moduleScores[mod.id] : null;

  let quizHtml = `
    <div style="background:#fffbeb; border:1px solid #fde68a; padding:1rem 1.25rem; border-radius:var(--radius-md); margin-bottom:1.5rem;">
      <h5 style="color:#b45309; margin-bottom:0.25rem;">Aturan Kuis Evaluasi Modul ${mod.index}:</h5>
      <p style="font-size:0.85rem; color:#92400e; margin:0;">
        Kuis ini terdiri dari ${mod.quiz.length} soal esensial. Anda harus mencapai skor minimal <strong>${APP_CONFIG.passThreshold}%</strong> untuk lulus dan membuka Modul berikutnya.
        ${isCompleted ? `<br><strong style="color:var(--success);">✓ Anda telah lulus modul ini dengan nilai ${scoreObj ? scoreObj.score : 100}%.</strong>` : ''}
      </p>
    </div>
    <form id="quizForm" onsubmit="handleQuizSubmit(event, ${mod.id})">
  `;

  mod.quiz.forEach((q, qIdx) => {
    quizHtml += `
      <div class="quiz-card" id="quizCard-${qIdx}">
        <div class="quiz-question-num">Pertanyaan ${qIdx + 1} dari ${mod.quiz.length}</div>
        <div class="quiz-question-text">${escapeHtml(q.question)}</div>
        <div class="quiz-options">
          ${q.options.map((opt, optIdx) => `
            <label class="quiz-option" id="labelOption-${qIdx}-${optIdx}">
              <input type="radio" name="q_${qIdx}" value="${optIdx}" required>
              <span>${escapeHtml(opt)}</span>
            </label>
          `).join("")}
        </div>
        <div class="quiz-feedback" id="feedback-${qIdx}"></div>
      </div>
    `;
  });

  quizHtml += `
    <div style="text-align:center; margin-top:2rem;">
      <button type="submit" class="btn btn-gold btn-lg" id="btnSubmitQuiz">
        Kirim Jawaban & Evaluasi Nilai
      </button>
    </div>
    </form>
  `;

  quizContainer.innerHTML = quizHtml;
}

async function handleQuizSubmit(e, moduleId) {
  e.preventDefault();
  const user = AppState.currentUser;
  if (!user) {
    alert("Silakan login terlebih dahulu untuk menyimpan nilai kuis.");
    openAuthModal("login");
    return;
  }

  const mod = MODULES_DATA.find(m => m.id === moduleId);
  if (!mod) return;

  const form = document.getElementById("quizForm");
  const formData = new FormData(form);

  let correctCount = 0;
  const total = mod.quiz.length;

  mod.quiz.forEach((q, qIdx) => {
    const selected = parseInt(formData.get(`q_${qIdx}`), 10);
    const feedbackBox = document.getElementById(`feedback-${qIdx}`);
    const isCorrect = (selected === q.correct);

    if (isCorrect) correctCount++;

    // Style the options
    q.options.forEach((_, optIdx) => {
      const optLabel = document.getElementById(`labelOption-${qIdx}-${optIdx}`);
      if (optIdx === q.correct) {
        optLabel.classList.add("correct");
      } else if (optIdx === selected && !isCorrect) {
        optLabel.classList.add("wrong");
      }
    });

    feedbackBox.style.display = "block";
    feedbackBox.style.background = isCorrect ? "var(--success-bg)" : "var(--danger-bg)";
    feedbackBox.style.color = isCorrect ? "#065f46" : "#991b1b";
    feedbackBox.style.border = `1px solid ${isCorrect ? "var(--success)" : "var(--danger)"}`;
    feedbackBox.innerHTML = `
      <strong>${isCorrect ? "✓ Jawaban Benar!" : "✗ Jawaban Kurang Tepat"}</strong><br>
      ${escapeHtml(q.explanation)}
    `;
  });

  const finalScore = Math.round((correctCount / total) * 100);
  const isPassed = finalScore >= APP_CONFIG.passThreshold;

  // Update user state
  if (!user.moduleScores) user.moduleScores = {};
  user.moduleScores[moduleId] = {
    score: finalScore,
    status: isPassed ? "Passed" : "Failed",
    date: new Date().toLocaleDateString("id-ID")
  };

  if (isPassed && !(user.passedModules || []).includes(moduleId)) {
    if (!user.passedModules) user.passedModules = [];
    user.passedModules.push(moduleId);
    user.passedModules.sort((a,b) => a - b);
  }

  // Hitung ulang total score
  let newTotal = 0;
  for (let mId in user.moduleScores) {
    newTotal += user.moduleScores[mId].score;
  }
  user.totalScore = newTotal;
  user.modulesPassed = (user.passedModules || []).length;

  saveLocalSession(user);

  // Sync to Google Apps Script Web App
  if (APP_CONFIG.scriptUrl) {
    try {
      fetch(APP_CONFIG.scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          action: "submitScore",
          nim: user.nim,
          moduleId: moduleId,
          score: finalScore
        })
      });
    } catch (err) {
      console.warn("Gagal sync nilai ke Apps Script:", err);
    }
  }

  syncLeaderboard();

  // Dialog Hasil
  const nextMod = MODULES_DATA.find(m => m.id === moduleId + 1);
  if (isPassed) {
    let msg = `🎉 SELAMAT! Anda LULUS Modul ${mod.index} dengan nilai ${finalScore}!\n(${correctCount} dari ${total} soal benar).\n`;
    if (nextMod) {
      msg += `\nModul ${nextMod.index}: "${nextMod.titleId}" kini telah TERBUKA untuk dipelajari!`;
    } else {
      msg += `\nLuar biasa! Anda telah menyelesaikan seluruh 19 Modul! Sertifikat Kelulusan Anda sekarang dapat diunduh!`;
    }
    alert(msg);
  } else {
    alert(`Nilai Anda: ${finalScore}% (${correctCount} dari ${total} benar).\nBatas kelulusan adalah ${APP_CONFIG.passThreshold}%.\nSilakan pelajari kembali materi modul, lalu coba kuis kembali!`);
  }

  const submitBtn = document.getElementById("btnSubmitQuiz");
  submitBtn.innerText = "Coba Kuis Lagi";
  submitBtn.onclick = () => renderQuiz(mod);
}

// ==========================================
// LEADERBOARD VIEW (BERSIH DARI DATA DUMMY)
// ==========================================

async function syncLeaderboard() {
  if (APP_CONFIG.scriptUrl) {
    try {
      const res = await fetch(`${APP_CONFIG.scriptUrl}?action=getLeaderboard&kelas=${encodeURIComponent(AppState.leaderboardFilter)}`);
      const data = await res.json();
      if (data.success && data.leaderboard) {
        AppState.leaderboardData = data.leaderboard;
        if (AppState.activeView === "leaderboard") renderLeaderboard();
        return;
      }
    } catch (e) {
      console.warn("Gagal mengambil leaderboard live dari script, menggunakan data lokal:", e);
    }
  }

  // Fallback data lokal murni dari mahasiswa yang benar-benar mendaftar (TANPA DUMMY)
  let allStudents = JSON.parse(localStorage.getItem("ut_lms_all_students") || "[]");

  let list = allStudents.filter(s => {
    if (AppState.leaderboardFilter === "ALL") return true;
    return s.kelas === AppState.leaderboardFilter;
  });

  list.sort((a, b) => {
    if ((b.modulesPassed || 0) !== (a.modulesPassed || 0)) {
      return (b.modulesPassed || 0) - (a.modulesPassed || 0);
    }
    return (b.totalScore || 0) - (a.totalScore || 0);
  });

  AppState.leaderboardData = list.map((s, idx) => ({
    rank: idx + 1,
    nama: s.nama,
    nimMasked: s.nim ? (s.nim.substring(0, 4) + "****") : "****",
    kelas: s.kelas,
    modulesPassed: s.modulesPassed || 0,
    totalScore: s.totalScore || 0,
    avgScore: s.modulesPassed ? Math.round(s.totalScore / s.modulesPassed) : 0,
    progressPercent: Math.round(((s.modulesPassed || 0) / 19) * 100)
  }));

  if (AppState.activeView === "leaderboard") {
    renderLeaderboard();
  }
}

function filterLeaderboard(kelas) {
  AppState.leaderboardFilter = kelas;
  document.querySelectorAll(".lb-filter-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.kelas === kelas);
  });
  syncLeaderboard();
}

function renderLeaderboard() {
  const container = document.getElementById("leaderboardTableBody");
  const podiumContainer = document.getElementById("podiumContainer");
  const data = AppState.leaderboardData;

  // Render Podium jika sudah ada minimal 3 mahasiswa terdaftar yang lulus modul
  const activeStudents = data.filter(d => d.modulesPassed > 0 || d.totalScore > 0);

  if (activeStudents.length >= 3) {
    podiumContainer.innerHTML = `
      <!-- Juara 2 -->
      <div class="podium-card podium-2">
        <div class="podium-rank">2</div>
        <h4 style="font-size:1.05rem; margin-bottom:0.2rem;">${escapeHtml(activeStudents[1].nama)}</h4>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.5rem;">${escapeHtml(activeStudents[1].kelas)} (${activeStudents[1].nimMasked})</div>
        <div style="font-weight:700; color:var(--primary); font-size:1.1rem;">${activeStudents[1].totalScore} Poin</div>
        <div style="font-size:0.8rem; color:var(--success); font-weight:600;">${activeStudents[1].modulesPassed}/19 Modul</div>
      </div>
      <!-- Juara 1 -->
      <div class="podium-card podium-1">
        <div style="position:absolute; top:-15px; left:50%; transform:translateX(-50%); font-size:1.5rem;">👑</div>
        <div class="podium-rank">1</div>
        <h4 style="font-size:1.2rem; margin-bottom:0.2rem; color:#b45309;">${escapeHtml(activeStudents[0].nama)}</h4>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.5rem;">${escapeHtml(activeStudents[0].kelas)} (${activeStudents[0].nimMasked})</div>
        <div style="font-weight:800; color:#d97706; font-size:1.3rem;">${activeStudents[0].totalScore} Poin</div>
        <div style="font-size:0.85rem; color:var(--success); font-weight:700;">${activeStudents[0].modulesPassed}/19 Modul (${activeStudents[0].progressPercent}%)</div>
      </div>
      <!-- Juara 3 -->
      <div class="podium-card podium-3">
        <div class="podium-rank">3</div>
        <h4 style="font-size:1.05rem; margin-bottom:0.2rem;">${escapeHtml(activeStudents[2].nama)}</h4>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.5rem;">${escapeHtml(activeStudents[2].kelas)} (${activeStudents[2].nimMasked})</div>
        <div style="font-weight:700; color:var(--primary); font-size:1.1rem;">${activeStudents[2].totalScore} Poin</div>
        <div style="font-size:0.8rem; color:var(--success); font-weight:600;">${activeStudents[2].modulesPassed}/19 Modul</div>
      </div>
    `;
  } else {
    podiumContainer.innerHTML = `
      <div style="grid-column: span 3; text-align: center; padding: 2rem; background: #fff; border-radius: var(--radius-lg); border: 1px dashed var(--border);">
        <p style="color: var(--text-muted); margin: 0; font-size: 0.95rem;">
          📊 Papan podium akan otomatis terisi saat mahasiswa menyelesaikan kuis modul.
        </p>
      </div>
    `;
  }

  // Render Table
  let rows = "";
  data.forEach(item => {
    rows += `
      <tr>
        <td style="font-weight:700; text-align:center;">${item.rank}</td>
        <td style="font-weight:600;">${escapeHtml(item.nama)}</td>
        <td><code>${escapeHtml(item.nimMasked)}</code></td>
        <td><span class="user-badge" style="background:#e2e8f0; color:#0f172a; padding:0.15rem 0.5rem;">${escapeHtml(item.kelas)}</span></td>
        <td style="text-align:center;"><strong style="color:var(--success);">${item.modulesPassed}</strong> / 19</td>
        <td style="text-align:center;">
          <div style="display:flex; align-items:center; gap:0.5rem; justify-content:center;">
            <div style="width:60px; height:8px; background:#e2e8f0; border-radius:10px; overflow:hidden;">
              <div style="width:${item.progressPercent}%; height:100%; background:var(--primary);"></div>
            </div>
            <span style="font-size:0.75rem;">${item.progressPercent}%</span>
          </div>
        </td>
        <td style="font-weight:700; text-align:center; color:var(--primary);">${item.totalScore}</td>
        <td style="text-align:center;">${item.avgScore}</td>
      </tr>
    `;
  });

  container.innerHTML = rows || `
    <tr>
      <td colspan="8" style="text-align:center; padding:3rem; color:var(--text-muted);">
        Belum ada mahasiswa yang terdaftar. Silakan lakukan pendaftaran untuk mulai belajar dan mencatatkan nama di papan peringkat.
      </td>
    </tr>
  `;
}

// ==========================================
// TRANSCRIPT & ACADEMIC PROGRESS VIEW
// ==========================================

function renderTranscript() {
  const user = AppState.currentUser;
  const container = document.getElementById("transcriptContentArea");

  if (!user) {
    container.innerHTML = `
      <div style="text-align:center; padding:3rem 1rem; background:#fff; border-radius:var(--radius-xl); border:1px solid var(--border);">
        <h3>Silakan Masuk Terlebih Dahulu</h3>
        <p style="color:var(--text-muted); margin-bottom:1.5rem;">Anda harus login untuk melihat lembar capaian dan transkrip modul Anda.</p>
        <button class="btn btn-primary" onclick="openAuthModal('login')">Masuk Sekarang</button>
      </div>
    `;
    return;
  }

  const passedCount = (user.passedModules || []).length;
  const percent = Math.round((passedCount / 19) * 100);
  const avgScore = passedCount > 0 ? Math.round((user.totalScore || 0) / passedCount) : 0;

  let tableRows = "";
  MODULES_DATA.forEach(mod => {
    const isPassed = (user.passedModules || []).includes(mod.id);
    const scoreObj = user.moduleScores ? user.moduleScores[mod.id] : null;
    const scoreVal = scoreObj ? scoreObj.score : (isPassed ? 100 : "-");
    const dateVal = scoreObj ? scoreObj.date : (isPassed ? "Selesai" : "-");

    let gradeLetter = "-";
    if (scoreVal !== "-") {
      if (scoreVal >= 85) gradeLetter = "A (Sangat Baik)";
      else if (scoreVal >= 75) gradeLetter = "B (Baik)";
      else if (scoreVal >= 70) gradeLetter = "C (Cukup)";
      else gradeLetter = "D (Belum Lulus)";
    }

    tableRows += `
      <tr>
        <td style="text-align:center;">${mod.index}</td>
        <td><strong>${escapeHtml(mod.titleId)}</strong><br><small style="color:var(--text-muted);">${escapeHtml(mod.titleEn)}</small></td>
        <td style="text-align:center; font-weight:700;">${scoreVal}</td>
        <td style="text-align:center;">${gradeLetter}</td>
        <td style="text-align:center;">
          ${isPassed ? '<span style="color:var(--success); font-weight:700;">✓ Lulus</span>' : '<span style="color:var(--danger);">Belum Lulus</span>'}
        </td>
        <td style="text-align:center; font-size:0.8rem; color:var(--text-secondary);">${dateVal}</td>
      </tr>
    `;
  });

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
      <div>
        <h3 style="margin:0;">Transkrip Capaian Akademik Mahasiswa</h3>
        <p style="color:var(--text-muted); margin:0;">Universitas Terbuka - Program Studi Pendidikan Guru Sekolah Dasar (PGSD)</p>
      </div>
      <button class="btn btn-primary" onclick="printTranscript()">
        🖨️ Cetak / Unduh Capaian (PDF)
      </button>
    </div>

    <div class="transcript-sheet printable-area" id="transcriptPrintable">
      <div class="transcript-header">
        <div>
          <h2 style="font-size:1.3rem; color:var(--primary-dark); margin:0;">UNIVERSITAS TERBUKA</h2>
          <h4 style="font-size:0.95rem; color:#d97706; margin:0;">FAKULTAS KEGURUAN DAN ILMU PENDIDIKAN (FKIP)</h4>
          <p style="font-size:0.8rem; color:var(--text-secondary); margin:0;">Program Studi S1 Pendidikan Guru Sekolah Dasar (PGSD)</p>
        </div>
        <div style="text-align:right;">
          <span style="display:inline-block; padding:0.25rem 0.6rem; background:var(--primary); color:#fff; font-size:0.75rem; font-weight:700; border-radius:4px;">
            LEMBAR HASIL BELAJAR
          </span>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.3rem;">Classroom English for Teachers</p>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1.5rem; background:#f8fafc; padding:1rem; border-radius:var(--radius-md); font-size:0.875rem;">
        <div>
          <div><strong style="color:var(--text-secondary);">Nama Mahasiswa:</strong> ${escapeHtml(user.nama)}</div>
          <div><strong style="color:var(--text-secondary);">Nomor Induk (NIM):</strong> ${escapeHtml(user.nim)}</div>
        </div>
        <div>
          <div><strong style="color:var(--text-secondary);">Kelas Tutorial:</strong> ${escapeHtml(user.kelas)}</div>
          <div><strong style="color:var(--text-secondary);">Status Kelulusan:</strong> ${passedCount >= 19 ? '<strong style="color:var(--success);">LULUS SEMUA MODUL</strong>' : `Dalam Proses (${passedCount}/19 Modul)`}</div>
        </div>
      </div>

      <table class="expression-table" style="font-size:0.82rem;">
        <thead>
          <tr>
            <th style="width:6%; text-align:center;">No</th>
            <th style="width:44%;">Materi Pelatihan Classroom English</th>
            <th style="width:12%; text-align:center;">Nilai</th>
            <th style="width:16%; text-align:center;">Predikat</th>
            <th style="width:12%; text-align:center;">Status</th>
            <th style="width:10%; text-align:center;">Tanggal</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      <div style="margin-top:1.5rem; display:flex; justify-content:space-between; align-items:flex-end; font-size:0.85rem;">
        <div>
          <p style="margin:0;"><strong>Rata-Rata Nilai:</strong> ${avgScore} / 100</p>
          <p style="margin:0;"><strong>Total Modul Diselesaikan:</strong> ${passedCount} dari 19 Modul (${percent}%)</p>
        </div>
        <div style="text-align:center;">
          <p style="margin:0;">${new Date().toLocaleDateString("id-ID", { day:'numeric', month:'long', year:'numeric' })}</p>
          <p style="margin:0; font-weight:600;">Tutor Pembimbing,</p>
          <div style="height:45px;"></div>
          <p style="margin:0; font-weight:700; border-top:1px solid #000; padding-top:2px;">Tutor Classroom English UT</p>
        </div>
      </div>
    </div>
  `;
}

function printTranscript() {
  window.print();
}

// ==========================================
// CERTIFICATE OF COMPLETION
// ==========================================

function renderCertificate() {
  const user = AppState.currentUser;
  const container = document.getElementById("certificateContentArea");

  if (!user) {
    container.innerHTML = `
      <div style="text-align:center; padding:3rem 1rem; background:#fff; border-radius:var(--radius-xl); border:1px solid var(--border);">
        <h3>Silakan Masuk Terlebih Dahulu</h3>
        <p style="color:var(--text-muted); margin-bottom:1.5rem;">Sertifikat kelulusan hanya dapat diakses oleh mahasiswa yang terdaftar.</p>
        <button class="btn btn-primary" onclick="openAuthModal('login')">Masuk Sekarang</button>
      </div>
    `;
    return;
  }

  const passedCount = (user.passedModules || []).length;
  const isEligible = passedCount >= 19;

  if (!isEligible) {
    container.innerHTML = `
      <div style="text-align:center; padding:3rem 1.5rem; background:#fff; border-radius:var(--radius-xl); border:1px solid var(--border);">
        <div style="font-size:3rem; margin-bottom:1rem;">🔒</div>
        <h3 style="color:var(--primary-dark); margin-bottom:0.5rem;">Sertifikat Belum Terbuka</h3>
        <p style="color:var(--text-secondary); max-width:600px; margin:0 auto 1.5rem;">
          Untuk mendapatkan <strong>Certificate of Completion</strong> resmi, Anda harus menyelesaikan seluruh <strong>19 Modul Pelatihan Classroom English</strong> beserta kuis evaluasinya.
        </p>
        <div style="display:inline-block; padding:0.75rem 1.5rem; background:var(--bg-subtle); border-radius:var(--radius-full); margin-bottom:1.5rem; font-weight:700;">
          Capaian Anda Saat Ini: <span style="color:var(--primary);">${passedCount} dari 19 Modul</span> (${Math.round((passedCount/19)*100)}%)
        </div>
        <br>
        <button class="btn btn-primary" onclick="switchView('dashboard')">Lanjutkan Belajar Modul</button>
      </div>
    `;
    return;
  }

  // Render Sertifikat Resmi
  const certId = `UT-PGSD-CE-${user.nim.slice(-4)}-${new Date().getFullYear()}`;
  const completionDate = new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' });

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
      <div>
        <h3 style="margin:0;">Certificate of Completion</h3>
        <p style="color:var(--text-muted); margin:0;">Selamat! Anda telah menuntaskan seluruh 19 Modul Classroom English.</p>
      </div>
      <div style="display:flex; gap:0.75rem;">
        <button class="btn btn-gold" onclick="printCertificate()">
          🖨️ Cetak / Unduh Sertifikat (PDF)
        </button>
      </div>
    </div>

    <div class="certificate-preview-wrapper">
      <div class="certificate-sheet printable-area" id="certificatePrintable">
        <div class="cert-header">
          <div class="cert-ut-title">UNIVERSITAS TERBUKA</div>
          <div class="cert-subtitle">PROGRAM STUDI PENDIDIKAN GURU SEKOLAH DASAR (PGSD)</div>
          <div class="cert-main-title">Certificate of Completion</div>
        </div>

        <div class="cert-body">
          <div class="cert-presented-to">Diberikan dengan bangga kepada:</div>
          <div class="cert-student-name">${escapeHtml(user.nama)}</div>
          <div class="cert-student-meta">NIM: ${escapeHtml(user.nim)} | Kelas: ${escapeHtml(user.kelas)}</div>
          <div class="cert-description">
            Telah berhasil menyelesaikan secara tuntas seluruh 19 Modul Pembelajaran dan Evaluasi Kuis pada program
            <strong>"Classroom English for Primary School Teachers"</strong> (Bahasa Kelas untuk Calon Guru SD)
            dengan predikat kelulusan sangat memuaskan.
          </div>
        </div>

        <div class="cert-footer">
          <div style="font-size:0.75rem; color:#64748b;">
            <strong>Nomor Verifikasi:</strong><br>
            <code>${certId}</code><br>
            <span>Diterbitkan: ${completionDate}</span>
          </div>

          <div class="cert-seal">
            <span>UNIVERSITAS<br>TERBUKA</span>
            <span style="font-size:0.9rem;">★ ★ ★</span>
            <span>VERIFIED</span>
          </div>

          <div class="cert-signature">
            <div class="cert-sig-line">Tutor Pembimbing</div>
            <div style="font-size:0.75rem; color:#64748b;">Classroom English UT</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function printCertificate() {
  window.print();
}

// ==========================================
// TUTOR / ADMIN PANEL VIEW (BEBAS PIN PLAIN TEXT)
// ==========================================

function renderTutorPanel() {
  const container = document.getElementById("tutorContentArea");
  const isAuthenticated = sessionStorage.getItem("ut_tutor_auth") === "true";

  if (!isAuthenticated) {
    const hasLocalPin = localStorage.getItem("ut_tutor_local_pin") !== null;
    const isScriptConfigured = Boolean(APP_CONFIG.scriptUrl);

    container.innerHTML = `
      <div style="max-width:460px; margin:3rem auto; background:#fff; padding:2.25rem; border-radius:var(--radius-xl); border:1px solid var(--border); box-shadow:var(--shadow-md); text-align:center;">
        <div style="font-size:2.5rem; margin-bottom:0.75rem;">🔐</div>
        <h3 style="color:var(--primary-dark); margin-bottom:0.5rem;">Akses Khusus Tutor</h3>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1.5rem;">
          Hanya Tutor yang berhak mengakses rekap data mahasiswa, nilai kuis, dan pengelolaan spreadsheet database.
        </p>
        <form onsubmit="handleTutorLogin(event)">
          <div class="form-group" style="text-align:left;">
            <label for="tutorPinInput">${(!hasLocalPin && !isScriptConfigured) ? 'Buat PIN Pengaman Tutor Baru:' : 'Masukkan PIN Tutor Anda:'}</label>
            <input type="password" id="tutorPinInput" class="form-control" 
                   placeholder="${(!hasLocalPin && !isScriptConfigured) ? 'Buat PIN (minimal 4 karakter)' : 'Ketik PIN rahasia Anda'}" required>
            ${(!hasLocalPin && !isScriptConfigured) ? '<small style="color:var(--text-muted); font-size:0.75rem;">PIN ini akan disimpan secara privat di browser Anda.</small>' : ''}
          </div>
          <button type="submit" class="btn btn-primary" id="btnTutorLogin" style="width:100%;">
            ${(!hasLocalPin && !isScriptConfigured) ? 'Simpan PIN & Buka Panel' : 'Masuk ke Panel Tutor'}
          </button>
        </form>
      </div>
    `;
    return;
  }

  let allStudents = JSON.parse(localStorage.getItem("ut_lms_all_students") || "[]");
  let studentRows = "";

  allStudents.forEach((st, idx) => {
    studentRows += `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td><code>${escapeHtml(st.nim)}</code></td>
        <td style="font-weight:600;">${escapeHtml(st.nama)}</td>
        <td><span class="user-badge" style="background:#e2e8f0; color:#0f172a; padding:0.15rem 0.5rem;">${escapeHtml(st.kelas)}</span></td>
        <td style="text-align:center; font-weight:700; color:var(--success);">${st.modulesPassed || 0} / 19</td>
        <td style="text-align:center; font-weight:700;">${st.totalScore || 0}</td>
        <td style="text-align:center;">
          <button class="btn btn-outline btn-sm" onclick="inspectStudent('${st.nim}')">Detail</button>
        </td>
      </tr>
    `;
  });

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
      <div>
        <h3 style="margin:0;">Dashboard Tutor & Pengelolaan Database</h3>
        <p style="color:var(--text-muted); margin:0;">Kelola data mahasiswa PGSD 1A & 1B dan integrasi Google Sheets.</p>
      </div>
      <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
        <a href="${APP_CONFIG.spreadsheetUrl}" target="_blank" class="btn btn-gold">
          📊 Buka Google Spreadsheet Database
        </a>
        <button class="btn btn-outline" onclick="changeTutorPinPrompt()">Ubah PIN</button>
        <button class="btn btn-outline" onclick="sessionStorage.removeItem('ut_tutor_auth'); renderTutorPanel();">
          Kunci Panel
        </button>
      </div>
    </div>

    <!-- Integrasi Config Box -->
    <div style="background:#fff; border:1px solid var(--border); padding:1.5rem; border-radius:var(--radius-lg); margin-bottom:2rem; box-shadow:var(--shadow-sm);">
      <h4 style="margin-bottom:0.5rem; color:var(--primary-dark);">Konfigurasi Google Apps Script Web App</h4>
      <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:1rem;">
        Tempelkan URL Web App yang didapat setelah melakukan Deploy Google Apps Script di Google Sheets Anda:
      </p>
      <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
        <input type="url" id="scriptUrlInput" class="form-control" style="flex:1; min-width:300px;" 
               placeholder="Contoh: https://script.google.com/macros/s/AKfycb.../exec" 
               value="${escapeHtml(APP_CONFIG.scriptUrl)}">
        <button class="btn btn-primary" onclick="saveScriptUrl()">Simpan URL</button>
        <button class="btn btn-outline" onclick="testScriptConnection()">Uji Koneksi</button>
      </div>
      <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.5rem;">
        File script <code>Code.gs</code> tersedia di folder <code>google-apps-script/Code.gs</code> untuk disalin ke Extensions -> Apps Script di spreadsheet.
      </p>
    </div>

    <!-- Tabel Rekap Mahasiswa -->
    <div style="background:#fff; border:1px solid var(--border); border-radius:var(--radius-lg); padding:1.5rem; box-shadow:var(--shadow-sm);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:1rem;">
        <h4 style="margin:0;">Daftar Mahasiswa Terdaftar (${allStudents.length} Mahasiswa)</h4>
        <div style="display:flex; gap:0.5rem;">
          <button class="btn btn-outline btn-sm" onclick="exportStudentsCsv()">📥 Unduh Rekap (CSV)</button>
        </div>
      </div>
      <div class="table-responsive">
        <table class="expression-table">
          <thead>
            <tr>
              <th style="width:6%; text-align:center;">No</th>
              <th style="width:18%;">NIM (Username)</th>
              <th style="width:28%;">Nama Mahasiswa</th>
              <th style="width:14%;">Kelas</th>
              <th style="width:14%; text-align:center;">Modul Lulus</th>
              <th style="width:10%; text-align:center;">Total Nilai</th>
              <th style="width:10%; text-align:center;">Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${studentRows || '<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">Belum ada mahasiswa yang terdaftar di sistem.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function handleTutorLogin(e) {
  e.preventDefault();
  const pin = document.getElementById("tutorPinInput").value.trim();
  const submitBtn = document.getElementById("btnTutorLogin");
  if (submitBtn) submitBtn.disabled = true;

  // 1. Jika URL Google Apps Script sudah terhubung, verifikasi langsung ke Google Apps Script:
  if (APP_CONFIG.scriptUrl) {
    try {
      const res = await fetch(`${APP_CONFIG.scriptUrl}?action=verifyTutorPin&pin=${encodeURIComponent(pin)}`);
      const data = await res.json();
      if (data.success && data.verified) {
        sessionStorage.setItem("ut_tutor_auth", "true");
        alert(data.message || "Akses Tutor Terverifikasi.");
        renderTutorPanel();
        return;
      } else {
        alert(data.message || "PIN Tutor salah!");
        if (submitBtn) submitBtn.disabled = false;
        return;
      }
    } catch (err) {
      console.warn("Gagal kontak Google Apps Script:", err);
    }
  }

  // 2. Mode Mandiri / Lokal:
  let savedLocalPin = localStorage.getItem("ut_tutor_local_pin");
  if (!savedLocalPin) {
    if (pin.length < 4) {
      alert("PIN baru minimal 4 karakter.");
      if (submitBtn) submitBtn.disabled = false;
      return;
    }
    localStorage.setItem("ut_tutor_local_pin", pin);
    sessionStorage.setItem("ut_tutor_auth", "true");
    alert("PIN Pengaman Tutor Anda berhasil disimpan untuk browser ini!");
    renderTutorPanel();
    return;
  }

  if (pin === savedLocalPin) {
    sessionStorage.setItem("ut_tutor_auth", "true");
    renderTutorPanel();
  } else {
    alert("PIN Tutor salah!");
  }

  if (submitBtn) submitBtn.disabled = false;
}

function changeTutorPinPrompt() {
  const current = prompt("Masukkan PIN Tutor Anda saat ini:");
  if (!current) return;

  const savedLocalPin = localStorage.getItem("ut_tutor_local_pin");
  if (savedLocalPin && current !== savedLocalPin) {
    alert("PIN saat ini salah.");
    return;
  }

  const newPin = prompt("Masukkan PIN Tutor baru Anda (minimal 4 karakter):");
  if (!newPin || newPin.length < 4) {
    alert("PIN baru dibatalkan atau kurang dari 4 karakter.");
    return;
  }

  localStorage.setItem("ut_tutor_local_pin", newPin);

  // Jika scriptUrl terpasang, update juga ke Google Apps Script
  if (APP_CONFIG.scriptUrl) {
    try {
      fetch(`${APP_CONFIG.scriptUrl}?action=updateTutorPin&currentPin=${encodeURIComponent(current)}&newPin=${encodeURIComponent(newPin)}`);
    } catch (e) {
      // Abaikan
    }
  }

  alert("PIN Tutor Anda berhasil diperbarui!");
}

function saveScriptUrl() {
  const url = document.getElementById("scriptUrlInput").value.trim();
  APP_CONFIG.scriptUrl = url;
  localStorage.setItem("ut_lms_script_url", url);
  alert("URL Google Apps Script berhasil disimpan!");
}

async function testScriptConnection() {
  const url = document.getElementById("scriptUrlInput").value.trim();
  if (!url) {
    alert("Silakan masukkan URL Web App terlebih dahulu.");
    return;
  }
  try {
    const res = await fetch(`${url}?action=ping`);
    const data = await res.json();
    if (data.success) {
      alert(`Koneksi Sukses!\n\nNama Database: ${data.spreadsheetName}\nTotal Mahasiswa di Sheets: ${data.totalStudents}\nTotal Aktivitas Kuis: ${data.totalAttempts}`);
    } else {
      alert("Koneksi tersambung tetapi server mengembalikan pesan: " + JSON.stringify(data));
    }
  } catch (err) {
    alert("Gagal menghubungi URL Web App. Pastikan Deployment disetel ke 'Who has access: Anyone'.\nError: " + err.message);
  }
}

function exportStudentsCsv() {
  let allStudents = JSON.parse(localStorage.getItem("ut_lms_all_students") || "[]");
  if (allStudents.length === 0) {
    alert("Tidak ada data mahasiswa untuk diekspor.");
    return;
  }

  let csv = "NIM,Nama,Kelas,Modul_Lulus,Total_Nilai\n";
  allStudents.forEach(s => {
    csv += `"${s.nim}","${s.nama}","${s.kelas}",${s.modulesPassed || 0},${s.totalScore || 0}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Rekap_Nilai_Classroom_English_UT_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

function inspectStudent(nim) {
  let allStudents = JSON.parse(localStorage.getItem("ut_lms_all_students") || "[]");
  const s = allStudents.find(x => x.nim === nim);
  if (!s) return;
  alert(`Detail Mahasiswa:\n\nNIM: ${s.nim}\nNama: ${s.nama}\nKelas: ${s.kelas}\nModul Selesai: ${s.modulesPassed || 0}/19\nTotal Skor: ${s.totalScore || 0}`);
}

// ==========================================
// MODAL CONTROLS & EVENT LISTENERS
// ==========================================

function openAuthModal(mode) {
  const modal = document.getElementById("modalAuth");
  modal.classList.add("active");
  switchAuthTab(mode);
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("active");
}

function switchAuthTab(mode) {
  document.getElementById("formLogin").style.display = mode === "login" ? "block" : "none";
  document.getElementById("formRegister").style.display = mode === "register" ? "block" : "none";
  document.getElementById("tabAuthLogin").classList.toggle("active", mode === "login");
  document.getElementById("tabAuthRegister").classList.toggle("active", mode === "register");
}

function initEventListeners() {
  // Navigation Links
  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
      const view = link.dataset.view;
      if (view) switchView(view);
    });
  });

  // Close modals when clicking backdrop
  document.querySelectorAll(".modal-overlay").forEach(modal => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("active");
    });
  });
}

// Utility Escape HTML
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
