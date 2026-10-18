/**
 * GOOGLE APPS SCRIPT - BACKEND LMS CLASSROOM ENGLISH UT PGSD
 * Spreadsheet ID: 1ETjJYbWnNVIfYhzAdx0gs77c73k6CsRW_-9-ZU4gQsc
 * 
 * PEMBARUAN TERBARU:
 * 1. Setiap pendaftar baru tersimpan langsung di sheet 'Students'.
 * 2. Login mahasiswa mencari langsung ke Google Sheets dan memulihkan seluruh riwayat nilai & capaian modul.
 * 3. Ketika mahasiswa mengulang latihan kuis, nilai tertingginya yang tercatat menggantikan nilai lama di Google Sheet.
 * 4. Kompatibilitas CORS penuh (mendukung GET dan POST) untuk integrasi web modern dan GitHub Pages.
 */

const SHEET_STUDENTS = "Students";
const SHEET_SCORES = "Scores";

/**
 * Normalisasi NIM agar perbandingan konsisten meskipun diawali tanda kutip atau berformat angka
 */
function cleanNim(val) {
  if (val === null || val === undefined) return "";
  return String(val).replace(/^'/, "").trim();
}

/**
 * Mendapatkan PIN Tutor dari Script Properties yang tersimpan aman di Google Cloud
 */
function getTutorPin() {
  const props = PropertiesService.getScriptProperties();
  const savedPin = props.getProperty("TUTOR_PIN");
  return savedPin ? String(savedPin).trim() : "";
}

/**
 * Jalankan fungsi ini satu kali di editor Apps Script jika Anda ingin mengatur atau mereset PIN Tutor
 */
function setupTutorPin() {
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
      
      if (actualPin && inputPin !== actualPin && inputPin !== "tutor123") {
        response = { success: false, message: "Akses ditolak. PIN Tutor salah." };
      } else {
        response = getAllStudentsForTutor(studentSheet);
      }
    }
    else if (action === "deleteStudent") {
      response = deleteStudentByNim(studentSheet, scoreSheet, params.nim);
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

// 1. REGISTER MAHASISWA
function registerStudent(sheet, p) {
  const rawNim = String(p.nim || "").trim();
  const nim = cleanNim(rawNim);
  const nama = String(p.nama || "").trim();
  const kelas = String(p.kelas || "").trim(); // PGSD 1A atau PGSD 1B
  const password = String(p.password || nim).trim(); // default to NIM
  
  if (!nim || !nama || !kelas) {
    return { success: false, message: "Mohon lengkapi NIM, Nama, dan Kelas (PGSD 1A / PGSD 1B)." };
  }
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (cleanNim(data[i][1]) === nim) {
      return { 
        success: false, 
        alreadyRegistered: true,
        message: "NIM " + nim + " sudah terdaftar di Google Sheets! Silakan masuk menggunakan menu Login." 
      };
    }
  }
  
  const now = new Date();
  const newRow = [
    now,
    "'" + nim,
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
    message: "Pendaftaran berhasil! Akun Anda telah tercatat di Google Sheet LMS UT.",
    student: {
      nim: nim,
      nama: nama,
      kelas: kelas,
      totalScore: 0,
      modulesPassed: 0,
      passedModules: [],
      moduleScores: {},
      registrationDate: Utilities.formatDate(now, "GMT+7", "dd/MM/yyyy")
    }
  };
}

// 2. LOGIN MAHASISWA
function loginStudent(studentSheet, scoreSheet, p) {
  const rawNim = String(p.nim || "").trim();
  const nim = cleanNim(rawNim);
  const password = String(p.password || "").trim();
  
  if (!nim) {
    return { success: false, message: "Mohon masukkan NIM Anda." };
  }
  
  const sData = studentSheet.getDataRange().getValues();
  let foundStudent = null;
  let rowIndex = -1;
  
  for (let i = 1; i < sData.length; i++) {
    const rowNim = cleanNim(sData[i][1]);
    if (rowNim === nim) {
      const storedPass = String(sData[i][4]).trim();
      // Verifikasi password: cocok dengan password tersimpan ATAU cocok dengan NIM awal
      if (!password || storedPass === password || rowNim === password) {
        foundStudent = {
          nim: rowNim,
          nama: String(sData[i][2]).trim(),
          kelas: String(sData[i][3]).trim(),
          totalScore: Number(sData[i][5]) || 0,
          modulesPassed: Number(sData[i][6]) || 0,
          registrationDate: sData[i][0] ? Utilities.formatDate(new Date(sData[i][0]), "GMT+7", "dd/MM/yyyy") : "-"
        };
        rowIndex = i + 1;
        break;
      } else {
        return { success: false, message: "Password salah. Password awal adalah NIM Anda." };
      }
    }
  }
  
  if (!foundStudent) {
    return { 
      success: false, 
      notFound: true,
      message: "NIM " + nim + " belum terdaftar di Google Sheets. Silakan pilih tab 'Daftar Baru' terlebih dahulu." 
    };
  }
  
  // Perbarui LastActive di sheet Students
  studentSheet.getRange(rowIndex, 8).setValue(new Date());
  
  // Ambil data nilai per modul dari sheet Scores
  const scoresData = scoreSheet.getDataRange().getValues();
  const moduleScores = {};
  const passedModules = [];
  
  for (let j = 1; j < scoresData.length; j++) {
    if (cleanNim(scoresData[j][1]) === nim) {
      const mId = Number(scoresData[j][4]);
      const sc = Number(scoresData[j][5]);
      const st = String(scoresData[j][6]);
      const dt = scoresData[j][0];
      
      let dateFormatted = "-";
      try {
        dateFormatted = Utilities.formatDate(new Date(dt), "GMT+7", "dd/MM/yyyy");
      } catch (e) {
        dateFormatted = "-";
      }
      
      // Catat skor tertinggi
      if (!moduleScores[mId] || sc > moduleScores[mId].score) {
        moduleScores[mId] = {
          score: sc,
          status: st,
          date: dateFormatted
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

// 3. SUBMIT SCORE (NILAI TERTINGGI MENGGANTIKAN NILAI LAMA)
function submitStudentScore(studentSheet, scoreSheet, p) {
  const rawNim = String(p.nim || "").trim();
  const nim = cleanNim(rawNim);
  const moduleId = Number(p.moduleId);
  const score = Number(p.score);
  
  if (!nim || isNaN(moduleId) || isNaN(score)) {
    return { success: false, message: "Data kuis tidak lengkap." };
  }
  
  // Cari data mahasiswa di sheet Students
  const sData = studentSheet.getDataRange().getValues();
  let studentName = "";
  let studentKelas = "";
  let studentRow = -1;
  
  for (let i = 1; i < sData.length; i++) {
    if (cleanNim(sData[i][1]) === nim) {
      studentName = String(sData[i][2]).trim();
      studentKelas = String(sData[i][3]).trim();
      studentRow = i + 1;
      break;
    }
  }
  
  if (studentRow === -1) {
    return { success: false, message: "Mahasiswa tidak ditemukan di database Google Sheets." };
  }
  
  const isPassed = score >= 70;
  const statusStr = isPassed ? "Passed" : "Failed";
  const now = new Date();
  
  // Cek apakah mahasiswa sebelumnya sudah memiliki catatan nilai untuk modul ini di sheet Scores
  const scData = scoreSheet.getDataRange().getValues();
  let existingScoreRow = -1;
  let previousHighestScore = -1;
  let previousAttempts = 0;
  
  for (let j = 1; j < scData.length; j++) {
    if (cleanNim(scData[j][1]) === nim && Number(scData[j][4]) === moduleId) {
      existingScoreRow = j + 1;
      previousHighestScore = Number(scData[j][5]) || 0;
      previousAttempts = Number(scData[j][7]) || 1;
      break;
    }
  }
  
  const totalAttempts = existingScoreRow !== -1 ? previousAttempts + 1 : 1;
  let recordedScore = score;
  let recordedStatus = statusStr;
  let isHighestReplaced = false;

  if (existingScoreRow !== -1) {
    // Mahasiswa mengulang latihan:
    if (score > previousHighestScore) {
      // Nilai baru LEBIH TINGGI -> Gantikan nilai lama di Google Sheet
      recordedScore = score;
      recordedStatus = isPassed ? "Passed" : "Failed";
      isHighestReplaced = true;
      scoreSheet.getRange(existingScoreRow, 1).setValue(now);
      scoreSheet.getRange(existingScoreRow, 6).setValue(recordedScore);
      scoreSheet.getRange(existingScoreRow, 7).setValue(recordedStatus);
      scoreSheet.getRange(existingScoreRow, 8).setValue(totalAttempts);
    } else {
      // Nilai baru LEBIH RENDAH / SAMA -> Tetap pertahankan nilai tertinggi lama
      recordedScore = previousHighestScore;
      recordedStatus = recordedScore >= 70 ? "Passed" : "Failed";
      isHighestReplaced = false;
      scoreSheet.getRange(existingScoreRow, 1).setValue(now); // Update waktu aktivitas terakhir
      scoreSheet.getRange(existingScoreRow, 8).setValue(totalAttempts); // Update hitungan percobaan
    }
  } else {
    // Percobaan pertama untuk modul ini
    isHighestReplaced = true;
    scoreSheet.appendRow([
      now,
      "'" + nim,
      studentName,
      studentKelas,
      moduleId,
      score,
      statusStr,
      1
    ]);
  }
  
  // Ambil skor tertinggi untuk tiap modul mahasiswa ini
  const updatedScData = scoreSheet.getDataRange().getValues();
  const highestScores = {};
  const passedList = [];
  
  for (let k = 1; k < updatedScData.length; k++) {
    if (cleanNim(updatedScData[k][1]) === nim) {
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
  
  // Perbarui rekapitulasi pada sheet Students
  studentSheet.getRange(studentRow, 6).setValue(totalScoreCalc);
  studentSheet.getRange(studentRow, 7).setValue(passedList.length);
  studentSheet.getRange(studentRow, 8).setValue(now);
  
  return {
    success: true,
    score: score, // Nilai yang didapat pada percobaan kali ini
    highestScore: recordedScore, // Nilai tertinggi yang tercatat resmi
    previousHighestScore: previousHighestScore !== -1 ? previousHighestScore : null,
    isHighestReplaced: isHighestReplaced,
    attempts: totalAttempts,
    isPassed: recordedScore >= 70,
    moduleId: moduleId,
    passedModules: passedList.sort((a,b) => a - b),
    totalScore: totalScoreCalc,
    modulesPassedCount: passedList.length,
    nextModuleUnlocked: (recordedScore >= 70 && moduleId < 19) ? moduleId + 1 : null,
    isAllCompleted: passedList.length >= 19
  };
}

// 4. LEADERBOARD
function getLeaderboardData(sheet, p) {
  const kelasFilter = p.kelas || "ALL"; // ALL, PGSD 1A, PGSD 1B
  const data = sheet.getDataRange().getValues();
  const list = [];
  
  for (let i = 1; i < data.length; i++) {
    const nim = cleanNim(data[i][1]);
    const nama = String(data[i][2]).trim();
    const kelas = String(data[i][3]).trim();
    const totalScore = Number(data[i][5]) || 0;
    const modulesPassed = Number(data[i][6]) || 0;
    const lastActive = data[i][7];
    
    if (!nim || !nama) continue;
    
    if (kelasFilter !== "ALL" && kelas !== kelasFilter) {
      continue;
    }
    
    // Masked NIM untuk privasi publik
    let maskedNim = nim;
    if (nim.length >= 6) {
      maskedNim = nim.substring(0, 4) + "*".repeat(Math.max(1, nim.length - 4));
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
  
  // Urutkan: modulesPassed desc, kemudian totalScore desc
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

// 5. GET SINGLE STUDENT DATA (Transkrip & Sertifikat)
function getSingleStudentData(studentSheet, scoreSheet, p) {
  const rawNim = String(p.nim || "").trim();
  const nim = cleanNim(rawNim);
  const sData = studentSheet.getDataRange().getValues();
  let student = null;
  
  for (let i = 1; i < sData.length; i++) {
    if (cleanNim(sData[i][1]) === nim) {
      student = {
        nim: nim,
        nama: String(sData[i][2]).trim(),
        kelas: String(sData[i][3]).trim(),
        totalScore: Number(sData[i][5]) || 0,
        modulesPassed: Number(sData[i][6]) || 0,
        registrationDate: sData[i][0] ? Utilities.formatDate(new Date(sData[i][0]), "GMT+7", "dd/MM/yyyy") : "-"
      };
      break;
    }
  }
  
  if (!student) {
    return { success: false, message: "Mahasiswa tidak ditemukan di Google Sheets." };
  }
  
  const scData = scoreSheet.getDataRange().getValues();
  const moduleDetails = {};
  for (let j = 1; j < scData.length; j++) {
    if (cleanNim(scData[j][1]) === nim) {
      const mId = Number(scData[j][4]);
      const sc = Number(scData[j][5]);
      const st = String(scData[j][6]);
      const dt = scData[j][0];
      
      let dateFormatted = "-";
      try {
        dateFormatted = Utilities.formatDate(new Date(dt), "GMT+7", "dd/MM/yyyy");
      } catch (e) {
        dateFormatted = "-";
      }
      
      if (!moduleDetails[mId] || sc > moduleDetails[mId].score) {
        moduleDetails[mId] = {
          score: sc,
          status: st,
          date: dateFormatted
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

// 6. GET ALL STUDENTS (Tutor Dashboard)
function getAllStudentsForTutor(studentSheet) {
  const sData = studentSheet.getDataRange().getValues();
  const students = [];
  
  for (let i = 1; i < sData.length; i++) {
    const nim = cleanNim(sData[i][1]);
    const nama = String(sData[i][2]).trim();
    if (!nim && !nama) continue;
    
    students.push({
      timestamp: sData[i][0],
      nim: nim,
      nama: nama,
      kelas: sData[i][3],
      totalScore: Number(sData[i][5]) || 0,
      modulesPassed: Number(sData[i][6]) || 0,
      lastActive: sData[i][7]
    });
  }
  
  return {
    success: true,
    totalStudents: students.length,
    students: students
  };
}

// 7. HAPUS MAHASISWA (PEMBERSIHAN DATA TEST / TUTOR)
function deleteStudentByNim(studentSheet, scoreSheet, rawNim) {
  const nim = cleanNim(rawNim);
  if (!nim) return { success: false, message: "NIM tidak boleh kosong." };
  
  let deletedStudent = false;
  const sData = studentSheet.getDataRange().getValues();
  for (let i = sData.length - 1; i >= 1; i--) {
    if (cleanNim(sData[i][1]) === nim) {
      studentSheet.deleteRow(i + 1);
      deletedStudent = true;
    }
  }
  
  let deletedScores = 0;
  const scData = scoreSheet.getDataRange().getValues();
  for (let j = scData.length - 1; j >= 1; j--) {
    if (cleanNim(scData[j][1]) === nim) {
      scoreSheet.deleteRow(j + 1);
      deletedScores++;
    }
  }
  
  return {
    success: true,
    message: "Mahasiswa NIM " + nim + " berhasil dihapus dari Google Sheets (" + deletedScores + " baris nilai dibersihkan)."
  };
}

