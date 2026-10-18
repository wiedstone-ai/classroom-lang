/**
 * GOOGLE APPS SCRIPT - BACKEND LMS CLASSROOM ENGLISH UT PGSD
 * Spreadsheet ID: 1ETjJYbWnNVIfYhzAdx0gs77c73k6CsRW_-9-ZU4gQsc
 * 
 * CARA MEMASANG:
 * 1. Buka spreadsheet: https://docs.google.com/spreadsheets/d/1ETjJYbWnNVIfYhzAdx0gs77c73k6CsRW_-9-ZU4gQsc
 * 2. Klik menu 'Extensions' (Ekstensi) -> 'Apps Script'.
 * 3. Hapus kode default, lalu tempel (paste) seluruh isi kode file ini.
 * 4. Untuk mengatur PIN Tutor rahasia Anda:
 *    - Jalankan fungsi 'setupTutorPin' di editor ini, ATAU
 *    - Atur di menu 'Project Settings' (ikon gerigi) -> 'Script Properties' -> Add: TUTOR_PIN
 * 5. Klik 'Save' (ikon disket).
 * 6. Klik tombol 'Deploy' (Terapkan) di kanan atas -> 'New deployment' (Penerapan baru).
 * 7. Pilih jenis: 'Web app' (Aplikasi Web).
 * 8. Konfigurasi:
 *    - Description: "LMS Backend API v2"
 *    - Execute as: "Me" (Saya / akun Google Anda)
 *    - Who has access: "Anyone" (Siapa saja - agar bisa diakses dari GitHub Pages)
 * 9. Klik 'Deploy'. Berikan izin otorisasi jika diminta.
 * 10. Salin "Web app URL" (URL Aplikasi Web) yang dihasilkan, lalu masukkan ke Panel Tutor LMS!
 */

const SHEET_STUDENTS = "Students";
const SHEET_SCORES = "Scores";

/**
 * Mendapatkan PIN Tutor dari Script Properties yang tersimpan aman di Google Cloud,
 * sehingga PIN rahasia Anda TIDAK PERNAH tampak di GitHub atau frontend web.
 */
function getTutorPin() {
  const props = PropertiesService.getScriptProperties();
  const savedPin = props.getProperty("TUTOR_PIN");
  return savedPin ? String(savedPin).trim() : "";
}

/**
 * Jalankan fungsi ini satu kali di editor Apps Script jika Anda ingin mengatur atau mereset PIN Tutor:
 */
function setupTutorPin() {
  // Ganti nilai di bawah ini dengan PIN rahasia pilihan Anda sebelum menekan tombol 'Run'
  const PIN_BARU_ANDA = "123456"; 
  PropertiesService.getScriptProperties().setProperty("TUTOR_PIN", PIN_BARU_ANDA);
  Logger.log("PIN Tutor berhasil disimpan secara aman di Google Script Properties!");
}

function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function initSheets() {
  const ss = getSpreadsheet();
  
  // Sheet Students
  let studentSheet = ss.getSheetByName(SHEET_STUDENTS);
  if (!studentSheet) {
    studentSheet = ss.insertSheet(SHEET_STUDENTS);
    studentSheet.appendRow([
      "Timestamp", "NIM", "Nama", "Kelas", "Password", "TotalScore", "ModulesPassed", "LastActive"
    ]);
    studentSheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#0B3B60").setFontColor("#FFFFFF");
    studentSheet.setFrozenRows(1);
  }
  
  // Sheet Scores
  let scoreSheet = ss.getSheetByName(SHEET_SCORES);
  if (!scoreSheet) {
    scoreSheet = ss.insertSheet(SHEET_SCORES);
    scoreSheet.appendRow([
      "Timestamp", "NIM", "Nama", "Kelas", "ModuleId", "Score", "Status", "Attempts"
    ]);
    scoreSheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#F59E0B").setFontColor("#000000");
    scoreSheet.setFrozenRows(1);
  }
  
  return { studentSheet, scoreSheet };
}

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    const { studentSheet, scoreSheet } = initSheets();
    let params = e && e.parameter ? e.parameter : {};
    
    // Cek jika body berupa JSON (POST)
    if (e && e.postData && e.postData.contents) {
      try {
        const body = JSON.parse(e.postData.contents);
        params = Object.assign({}, params, body);
      } catch (err) {
        // Abaikan jika bukan JSON
      }
    }
    
    const action = params.action || "ping";
    let response = { success: false, action: action };
    
    if (action === "ping" || action === "init") {
      response = {
        success: true,
        message: "LMS Classroom English Backend is active & ready!",
        spreadsheetName: getSpreadsheet().getName(),
        totalStudents: Math.max(0, studentSheet.getLastRow() - 1),
        totalAttempts: Math.max(0, scoreSheet.getLastRow() - 1),
        hasTutorPinConfigured: getTutorPin() !== ""
      };
    }
    else if (action === "verifyTutorPin") {
      const inputPin = String(params.pin || params.tutorPin || "").trim();
      const actualPin = getTutorPin();
      
      // Jika belum diset di Script Properties, perbolehkan tutor mengatur PIN pertama kali
      if (!actualPin) {
        if (inputPin.length >= 4) {
          PropertiesService.getScriptProperties().setProperty("TUTOR_PIN", inputPin);
          response = { success: true, verified: true, message: "PIN Tutor baru berhasil diatur dan disimpan secara aman!" };
        } else {
          response = { success: false, verified: false, message: "PIN belum diatur. Masukkan minimal 4 karakter untuk membuat PIN baru." };
        }
      } else if (inputPin === actualPin) {
        response = { success: true, verified: true, message: "Verifikasi PIN Tutor berhasil." };
      } else {
        response = { success: false, verified: false, message: "PIN Tutor salah." };
      }
    }
    else if (action === "updateTutorPin") {
      const currentPin = String(params.currentPin || "").trim();
      const newPin = String(params.newPin || "").trim();
      const actualPin = getTutorPin();
      
      if (actualPin && currentPin !== actualPin) {
        response = { success: false, message: "PIN lama salah." };
      } else if (!newPin || newPin.length < 4) {
        response = { success: false, message: "PIN baru minimal 4 karakter." };
      } else {
        PropertiesService.getScriptProperties().setProperty("TUTOR_PIN", newPin);
        response = { success: true, message: "PIN Tutor berhasil diperbarui secara aman." };
      }
    }
    else if (action === "register") {
      response = registerStudent(studentSheet, params);
    }
    else if (action === "login") {
      response = loginStudent(studentSheet, scoreSheet, params);
    }
    else if (action === "submitScore") {
      response = submitStudentScore(studentSheet, scoreSheet, params);
    }
    else if (action === "getLeaderboard") {
      response = getLeaderboardData(studentSheet, params);
    }
    else if (action === "getStudentData") {
      response = getSingleStudentData(studentSheet, scoreSheet, params);
    }
    else if (action === "getAllStudents") {
      const inputPin = String(params.pin || params.tutorPin || "").trim();
      const actualPin = getTutorPin();
      
      if (!actualPin || inputPin !== actualPin) {
        response = { success: false, message: "Akses ditolak. PIN Tutor salah atau belum diatur." };
      } else {
        response = getAllStudentsForTutor(studentSheet);
      }
    }
    else {
      response = { success: false, message: "Aksi tidak dikenali: " + action };
    }
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 1. REGISTER
function registerStudent(sheet, p) {
  const nim = String(p.nim || "").trim();
  const nama = String(p.nama || "").trim();
  const kelas = String(p.kelas || "").trim(); // PGSD 1A atau PGSD 1B
  const password = String(p.password || nim).trim(); // default to NIM
  
  if (!nim || !nama || !kelas) {
    return { success: false, message: "Mohon lengkapi NIM, Nama, dan Kelas (PGSD 1A / PGSD 1B)." };
  }
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === nim) {
      return { success: false, message: "NIM " + nim + " sudah terdaftar! Silakan gunakan menu Masuk (Login) dengan password NIM Anda." };
    }
  }
  
  const now = new Date();
  const newRow = [
    now,
    nim,
    nama,
    kelas,
    password,
    0, // TotalScore
    0, // ModulesPassed
    now // LastActive
  ];
  sheet.appendRow(newRow);
  
  return {
    success: true,
    message: "Pendaftaran berhasil! Selamat datang di LMS Classroom English UT.",
    student: {
      nim: nim,
      nama: nama,
      kelas: kelas,
      totalScore: 0,
      modulesPassed: 0,
      passedModules: []
    }
  };
}

// 2. LOGIN
function loginStudent(studentSheet, scoreSheet, p) {
  const nim = String(p.nim || "").trim();
  const password = String(p.password || "").trim();
  
  if (!nim || !password) {
    return { success: false, message: "Mohon masukkan NIM dan Password." };
  }
  
  const sData = studentSheet.getDataRange().getValues();
  let foundStudent = null;
  let rowIndex = -1;
  
  for (let i = 1; i < sData.length; i++) {
    if (String(sData[i][1]).trim() === nim) {
      if (String(sData[i][4]).trim() === password) {
        foundStudent = {
          nim: String(sData[i][1]).trim(),
          nama: String(sData[i][2]).trim(),
          kelas: String(sData[i][3]).trim(),
          totalScore: Number(sData[i][5]) || 0,
          modulesPassed: Number(sData[i][6]) || 0
        };
        rowIndex = i + 1;
        break;
      } else {
        return { success: false, message: "Password salah. Password awal adalah NIM Anda." };
      }
    }
  }
  
  if (!foundStudent) {
    return { success: false, message: "NIM " + nim + " belum terdaftar. Silakan pilih tab 'Daftar Baru' terlebih dahulu." };
  }
  
  // Update LastActive
  studentSheet.getRange(rowIndex, 8).setValue(new Date());
  
  // Ambil data nilai per modul dari sheet Scores
  const scoresData = scoreSheet.getDataRange().getValues();
  const moduleScores = {};
  const passedModules = [];
  
  for (let j = 1; j < scoresData.length; j++) {
    if (String(scoresData[j][1]).trim() === nim) {
      const mId = Number(scoresData[j][4]);
      const sc = Number(scoresData[j][5]);
      const st = String(scoresData[j][6]);
      
      if (!moduleScores[mId] || sc > moduleScores[mId].score) {
        moduleScores[mId] = {
          score: sc,
          status: st,
          date: Utilities.formatDate(new Date(scoresData[j][0]), "GMT+7", "dd/MM/yyyy")
        };
      }
      if (st === "Passed" && !passedModules.includes(mId)) {
        passedModules.push(mId);
      }
    }
  }
  
  foundStudent.passedModules = passedModules.sort((a,b) => a - b);
  foundStudent.moduleScores = moduleScores;
  
  return {
    success: true,
    message: "Login berhasil! Selamat datang kembali, " + foundStudent.nama,
    student: foundStudent
  };
}

// 3. SUBMIT SCORE
function submitStudentScore(studentSheet, scoreSheet, p) {
  const nim = String(p.nim || "").trim();
  const moduleId = Number(p.moduleId);
  const score = Number(p.score);
  
  if (!nim || isNaN(moduleId) || isNaN(score)) {
    return { success: false, message: "Data kuis tidak lengkap." };
  }
  
  // Cari data mahasiswa
  const sData = studentSheet.getDataRange().getValues();
  let studentName = "";
  let studentKelas = "";
  let studentRow = -1;
  
  for (let i = 1; i < sData.length; i++) {
    if (String(sData[i][1]).trim() === nim) {
      studentName = sData[i][2];
      studentKelas = sData[i][3];
      studentRow = i + 1;
      break;
    }
  }
  
  if (studentRow === -1) {
    return { success: false, message: "Mahasiswa tidak ditemukan di database." };
  }
  
  const isPassed = score >= 70;
  const statusStr = isPassed ? "Passed" : "Failed";
  const now = new Date();
  
  // Hitung jumlah attempt modul ini
  const scData = scoreSheet.getDataRange().getValues();
  let attempts = 1;
  
  for (let j = 1; j < scData.length; j++) {
    if (String(scData[j][1]).trim() === nim && Number(scData[j][4]) === moduleId) {
      attempts++;
    }
  }
  
  // Catat baris di sheet Scores
  scoreSheet.appendRow([
    now,
    nim,
    studentName,
    studentKelas,
    moduleId,
    score,
    statusStr,
    attempts
  ]);
  
  // Ambil skor tertinggi untuk tiap modul
  const updatedScData = scoreSheet.getDataRange().getValues();
  const highestScores = {};
  const passedList = [];
  
  for (let k = 1; k < updatedScData.length; k++) {
    if (String(updatedScData[k][1]).trim() === nim) {
      const m = Number(updatedScData[k][4]);
      const s = Number(updatedScData[k][5]);
      const st = String(updatedScData[k][6]);
      
      if (!highestScores[m] || s > highestScores[m]) {
        highestScores[m] = s;
      }
      if (st === "Passed" && !passedList.includes(m)) {
        passedList.push(m);
      }
    }
  }
  
  let totalScoreCalc = 0;
  for (let mod in highestScores) {
    totalScoreCalc += highestScores[mod];
  }
  
  // Update sheet Students
  studentSheet.getRange(studentRow, 6).setValue(totalScoreCalc);
  studentSheet.getRange(studentRow, 7).setValue(passedList.length);
  studentSheet.getRange(studentRow, 8).setValue(now);
  
  return {
    success: true,
    isPassed: isPassed,
    score: score,
    moduleId: moduleId,
    passedModules: passedList.sort((a,b) => a - b),
    totalScore: totalScoreCalc,
    modulesPassedCount: passedList.length,
    nextModuleUnlocked: isPassed && moduleId < 19 ? moduleId + 1 : null,
    isAllCompleted: passedList.length >= 19
  };
}

// 4. LEADERBOARD
function getLeaderboardData(sheet, p) {
  const kelasFilter = p.kelas || "ALL"; // ALL, PGSD 1A, PGSD 1B
  const data = sheet.getDataRange().getValues();
  const list = [];
  
  for (let i = 1; i < data.length; i++) {
    const nim = String(data[i][1]).trim();
    const nama = String(data[i][2]).trim();
    const kelas = String(data[i][3]).trim();
    const totalScore = Number(data[i][5]) || 0;
    const modulesPassed = Number(data[i][6]) || 0;
    const lastActive = data[i][7];
    
    if (kelasFilter !== "ALL" && kelas !== kelasFilter) {
      continue;
    }
    
    // Masked NIM untuk privasi publik (misal 8585****)
    let maskedNim = nim;
    if (nim.length >= 6) {
      maskedNim = nim.substring(0, 4) + "*".repeat(nim.length - 4);
    }
    
    const avgScore = modulesPassed > 0 ? Math.round(totalScore / modulesPassed) : 0;
    
    list.push({
      nama: nama,
      nimMasked: maskedNim,
      kelas: kelas,
      modulesPassed: modulesPassed,
      totalScore: totalScore,
      avgScore: avgScore,
      progressPercent: Math.round((modulesPassed / 19) * 100),
      lastActive: lastActive
    });
  }
  
  // Sort: modulesPassed desc, then totalScore desc
  list.sort((a, b) => {
    if (b.modulesPassed !== a.modulesPassed) {
      return b.modulesPassed - a.modulesPassed;
    }
    return b.totalScore - a.totalScore;
  });
  
  list.forEach((item, idx) => {
    item.rank = idx + 1;
  });
  
  return {
    success: true,
    kelasFilter: kelasFilter,
    totalStudents: list.length,
    leaderboard: list
  };
}

// 5. GET STUDENT DATA (Untuk Transkrip & Sertifikat)
function getSingleStudentData(studentSheet, scoreSheet, p) {
  const nim = String(p.nim || "").trim();
  const sData = studentSheet.getDataRange().getValues();
  let student = null;
  
  for (let i = 1; i < sData.length; i++) {
    if (String(sData[i][1]).trim() === nim) {
      student = {
        nim: String(sData[i][1]).trim(),
        nama: String(sData[i][2]).trim(),
        kelas: String(sData[i][3]).trim(),
        totalScore: Number(sData[i][5]) || 0,
        modulesPassed: Number(sData[i][6]) || 0,
        registrationDate: sData[i][0]
      };
      break;
    }
  }
  
  if (!student) {
    return { success: false, message: "Mahasiswa tidak ditemukan." };
  }
  
  const scData = scoreSheet.getDataRange().getValues();
  const moduleDetails = {};
  for (let j = 1; j < scData.length; j++) {
    if (String(scData[j][1]).trim() === nim) {
      const mId = Number(scData[j][4]);
      const sc = Number(scData[j][5]);
      const st = String(scData[j][6]);
      const dt = scData[j][0];
      
      if (!moduleDetails[mId] || sc > moduleDetails[mId].score) {
        moduleDetails[mId] = {
          score: sc,
          status: st,
          date: Utilities.formatDate(new Date(dt), "GMT+7", "dd/MM/yyyy")
        };
      }
    }
  }
  
  student.moduleDetails = moduleDetails;
  student.isEligibleCertificate = student.modulesPassed >= 19;
  
  return {
    success: true,
    student: student
  };
}

// 6. GET ALL STUDENTS (TUTOR DASHBOARD)
function getAllStudentsForTutor(studentSheet) {
  const sData = studentSheet.getDataRange().getValues();
  const students = [];
  
  for (let i = 1; i < sData.length; i++) {
    students.push({
      timestamp: sData[i][0],
      nim: sData[i][1],
      nama: sData[i][2],
      kelas: sData[i][3],
      totalScore: sData[i][5],
      modulesPassed: sData[i][6],
      lastActive: sData[i][7]
    });
  }
  
  return {
    success: true,
    totalStudents: students.length,
    students: students
  };
}
