// ==========================================
// CONFIGURATION
// ==========================================


const CONFIG = {
  // Master Sheet Configuration
  MASTER_SHEET_ID: '1Pl3J1uKcKiWxJKxvxx0vI5H-UabJQz8RdR6CJzi8FyQ',
  WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbzgz8rzQXPaD7AYAaeLwyjCYmkiH2w-EzhK4SDVnSmzj2lDN_azqmzHuM4taFkcu0vcJg/exec',

  // Logging
  ENABLE_DETAILED_LOGS: true,
  LOG_SHEET_NAME: 'API_Logs',

  // Security
  PASSWORD_SALT: 'StockCount2025!@#',
  SESSION_DURATION: 24 * 60 * 60 * 1000,

  // Default Settings
  DEFAULT_TIMEZONE: 'Asia/Bangkok',
  DEFAULT_NOTIFY_TIMES: ['08:00', '18:00'],
  DEFAULT_DIFF_THRESHOLD: 5,

  // Sheet Names
  MASTER_SHEETS: {
    USERS: 'Users',
    STORES: 'Stores',
    LOGIN_LOGS: 'Login_Logs',
    MASTER_SETTINGS: 'Master_Settings',
    MASTER_AUDIT_LOG: 'Master_Audit_Log'
  },

  STORE_SHEETS: {
    PRODUCTS: 'Products',
    MANUAL_COUNT: 'Manual_Count',
    OCR_LOG: 'OCR_Log',
    OCR_ITEMS: 'OCR_Items',
    COMPARISON: 'Comparison',
    PENALTIES: 'Penalty_Log',
    SETTINGS: 'Settings',
    AUDIT: 'Audit_Log'
  }
};


// ===================================
// WEB APP ENTRY POINTS
// ===================================

function doGet(e) {
  const page = e.parameter.page || 'index';

  if (page === 'explanation') {
    const template = HtmlService.createTemplateFromFile('explanation');
    template.storeId = e.parameter.store || '';
    template.date = e.parameter.date || '';
    return template.evaluate()
      .setTitle('ชี้แจงผลต่างสต็อก')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  if (page === 'approval') {
    const template = HtmlService.createTemplateFromFile('approval');
    template.storeId = e.parameter.store || '';
    template.date = e.parameter.date || '';
    return template.evaluate()
      .setTitle('อนุมัติรายการผลต่าง')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  if (page === 'dailycheck') {
    const template = HtmlService.createTemplateFromFile('dailycheck');
    template.storeId = e.parameter.store || '';
    template.date = e.parameter.date || '';
    return template.evaluate()
      .setTitle('เช็คสต็อกประจําวัน')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }


  if (page === 'manual') {
    return HtmlService.createHtmlOutputFromFile('manual')
      .setTitle('คู่มือการใช้งาน - Stock Count System')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  // === Deposit System Pages ===

  if (page === 'deposit') {
    const template = HtmlService.createTemplateFromFile('deposit');
    template.storeId = e.parameter.store || '';
    return template.evaluate()
      .setTitle('ระบบฝากเหล้า')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  if (page === 'liff-deposit') {
    return HtmlService.createHtmlOutputFromFile('liff-deposit-form')
      .setTitle('ฟอร์มขอฝากเหล้า')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  if (page === 'liff-withdrawal') {
    return HtmlService.createHtmlOutputFromFile('liff-withdrawal-form')
      .setTitle('ฟอร์มขอเบิกเหล้า')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  if (page === 'liff-transfer') {
    return HtmlService.createHtmlOutputFromFile('liff-confirm-transfer')
      .setTitle('ยืนยันรับโอนคลังกลาง')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  // === Receipt Pages ===

  if (page === 'receipt-customer') {
    return HtmlService.createHtmlOutputFromFile('receipt-customer')
      .setTitle('ใบรับฝากเหล้า')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (page === 'receipt-bottle') {
    return HtmlService.createHtmlOutputFromFile('receipt-bottle-label')
      .setTitle('ป้ายติดขวดเหล้า')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // หน้าเริ่มต้น (Default)
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Stock Count System')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}





function doPost(e) {
  try {
    const eventData = JSON.parse(e.postData.contents);

    // Check if this is a deposit system API call (has 'action' property)
    if (eventData.action) {
      return handleDepositSystemAPI(eventData);
    }

    // Otherwise, handle as LINE webhook event
    const event = eventData.events[0];

    if (event && event.type === 'message' && event.message.type === 'text') {
      const messageText = event.message.text.trim().toLowerCase();
      const groupId = event.source.groupId;

      // ตรวจสอบคำสั่งที่ต้องการ
      const keywords = ['davis', 'เดวิส', 'ai', 'เวบไซต์', 'เข้าเว็บ'];
      const shouldRespond = keywords.some(keyword => messageText.includes(keyword));

      if (shouldRespond && groupId) {
        // ส่ง Flex Message พร้อมลิงก์เว็บไซต์
        sendWebsiteLinkMessage(groupId);
      }

      // Log Group ID
      writeToLogSheet("Received Group ID: " + groupId + " | Message: " + messageText);
    }

  } catch (err) {
    writeToLogSheet("Error: " + err.message);
  }

  return ContentService.createTextOutput(JSON.stringify({ 'status': 'ok' })).setMimeType(ContentService.MimeType.JSON);
}


// ========================================
// 21. handleDepositSystemAPI - Route deposit system API calls
// ========================================
function handleDepositSystemAPI(eventData) {
  try {
    console.log('🚀 handleDepositSystemAPI called');
    console.log('Event data:', JSON.stringify(eventData));

    const action = eventData.action;
    const data = eventData.data || {};
    console.log('Action:', action);

    let result;

    // Route to appropriate function based on action
    switch (action) {
      // Deposit Request Flow
      case 'submitDepositRequest':
        result = submitDepositRequest(data);
        break;

      case 'receiveDepositByStaff':
        result = receiveDepositByStaff(data);
        break;

      case 'confirmDeposit':
        result = confirmDeposit(data);
        break;

      // Withdrawal Flow
      case 'submitWithdrawalRequest':
        result = submitWithdrawalRequest(data);
        break;

      case 'processWithdrawal':
        result = processWithdrawal(data);
        break;

      // Transfer Flow
      case 'submitCentralTransferRequest':
        result = submitCentralTransferRequest(data);
        break;

      case 'confirmCentralTransfer':
        result = confirmCentralTransfer(data);
        break;

      case 'getCentralTransferRequests':
        result = getCentralTransferRequests();
        break;

      case 'isCentralStore':
        result = isCentralStore(eventData.storeId || data.storeId);
        break;

      case 'getExpiredDeposits':
        result = getExpiredDeposits(eventData.storeId || data.storeId);
        break;

      case 'createTransferRequest':
        result = createTransferRequest(
          eventData.storeId || data.storeId,
          eventData.depositIds || data.depositIds,
          eventData.note || data.note,
          eventData.createdBy || data.createdBy || '',
          eventData.photoUrl || data.photoUrl || ''
        );
        break;

      case 'getPendingTransfers':
        result = getPendingTransfersForHQ(eventData.storeId || data.storeId);
        break;

      case 'getConfirmedTransfers':
        result = getConfirmedTransfersForHQ(eventData.storeId || data.storeId);
        break;

      case 'getTransferPendingDeposits':
        result = getTransferPendingDeposits(eventData.storeId || data.storeId);
        break;

      case 'getTransferConfirmedDeposits':
        result = getTransferConfirmedDeposits(eventData.storeId || data.storeId);
        break;

      case 'getTransferSummary':
        result = getTransferSummary(eventData.storeId || data.storeId);
        break;

      case 'getHQTransferSummary':
        result = getHQTransferSummary(eventData.storeId || data.storeId);
        break;

      case 'confirmTransfer':
        // สร้าง confirmData object จาก parameters ที่ส่งมา
        const confirmData = {
          notes: eventData.note || data.note || '',
          confirmedBy: eventData.confirmedBy || data.confirmedBy || '',
          receivedFrom: eventData.receivedFrom || data.receivedFrom || '',
          receivedQty: eventData.receivedQty || data.receivedQty || '',
          receivedPercent: eventData.receivedPercent || data.receivedPercent || ''
        };
        result = confirmTransferRequest(eventData.transferId || data.transferId, confirmData);
        break;

      case 'rejectTransfer':
        // สร้าง rejectData object จาก parameters ที่ส่งมา
        const rejectData = {
          reason: eventData.reason || data.reason || 'ปฏิเสธโดยคลังกลาง',
          cancelledBy: eventData.cancelledBy || data.cancelledBy || ''
        };
        result = rejectTransferRequest(eventData.transferId || data.transferId, rejectData);
        break;

      case 'getTransfersByStatus':
        result = getTransfersByStatus(data.storeId, data.status);
        break;

      case 'getAllPendingTransfersForHQ':
        result = getAllPendingTransfersForHQ();
        break;

      case 'getConfirmedTransfersForHQ':
        result = getConfirmedTransfersForHQ();
        break;

      case 'cancelTransfer':
        result = cancelTransfer(data);
        break;

      case 'disposeDeposits':
        result = disposeDeposits(data);
        break;

      // Data Retrieval
      case 'getDepositData':
        result = getDepositData(data.storeId);
        break;

      case 'getMyDeposits':
        result = getMyDeposits(data.lineUserId);
        break;

      case 'getDashboardDepositData':
        result = getDashboardDepositData(data.storeId);
        break;

      // Utility Functions
      case 'uploadAlcoholPhoto':
        result = uploadAlcoholPhoto(data.base64Image);
        break;

      case 'extendDepositExpiry':
        result = extendDepositExpiry(data);
        break;

      case 'linkLineUserToDeposit':
        result = linkLineUserToDeposit(data.depositId, data.lineUserId);
        break;

      case 'generateDepositReceipt':
        result = generateDepositReceipt(data.depositId);
        break;

      case 'getStoreReceiptConfig':
        result = getStoreReceiptConfig(data.storeId);
        break;

      case 'updateStoreReceiptConfig':
        console.log('📝 handleDepositSystemAPI: updateStoreReceiptConfig called');
        console.log('Data received:', JSON.stringify(data));
        result = updateStoreReceiptConfig(data);
        console.log('Result:', JSON.stringify(result));
        break;

      case 'getStoreLineOAConfig':
        result = getStoreLineOAConfig(data.storeId);
        break;

      case 'updateStoreLineOAConfig':
        result = updateStoreLineOAConfig(data);
        break;

      case 'getDepositReceiptData':
        result = getDepositReceiptData(data.depositId, data.receiptType);
        break;

      default:
        result = { success: false, message: 'Unknown action: ' + action };
    }

    console.log('✅ Returning result:', JSON.stringify(result));

    // Check if this is called from Web App (doPost/doGet) or google.script.run
    // Web App calls will have 'e' parameter with postData or queryString
    // google.script.run calls will not
    const isWebApp = typeof eventData.postData !== 'undefined' || typeof eventData.queryString !== 'undefined';

    if (isWebApp) {
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      // Called from google.script.run - return plain object
      return result;
    }

  } catch (error) {
    console.error('❌ Error in handleDepositSystemAPI:', error);
    console.error('Error stack:', error.stack);
    const errorResponse = { success: false, message: error.toString() };
    console.log('Returning error response:', JSON.stringify(errorResponse));

    const isWebApp = typeof eventData.postData !== 'undefined' || typeof eventData.queryString !== 'undefined';

    if (isWebApp) {
      return ContentService.createTextOutput(JSON.stringify(errorResponse))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      return errorResponse;
    }
  }
}



/**
 * ส่ง Flex Message พร้อมลิงก์เว็บไซต์หลัก (ฉบับปรับปรุง: เพิ่ม Log)
 */
function sendWebsiteLinkMessage(groupId) {
  // [!code ++]
  // --- 1. Log จุดเริ่มต้น ---
  writeToLogSheet(`Attempting to send website link to: ${groupId}`);
  // [!code ++]

  try {
    const apiConfig = getAPIConfig();
    const accessToken = apiConfig.LINE_ACCESS_TOKEN;

    // [!code ++]
    // --- 2. Log ตรวจสอบ Access Token ---
    if (!accessToken || accessToken === '') {
      // [!code ++]
      // --- 3. Log จุดที่ล้มเหลว (สำคัญมาก) ---
      writeToLogSheet("CRITICAL FAILURE: LINE_ACCESS_TOKEN is missing or empty in Master_Settings. Function will exit.");
      console.error('Line Access Token not configured');
      return;
    }
    // [!code ++]
    writeToLogSheet("Access Token found. Starting to build message...");

    const flexMessage = generateWebsiteLinkFlex();

    // [!code ++]
    writeToLogSheet("Flex Message generated. Preparing to send to LINE API...");

    const url = 'https://api.line.me/v2/bot/message/push';
    const payload = {
      'to': groupId,
      'messages': [
        {
          'type': 'flex',
          'altText': '🌐 เข้าสู่ระบบ Stock Count System',
          'contents': flexMessage
        }
      ]
    };
    const options = {
      'method': 'post',
      'headers': {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + accessToken
      },
      'payload': JSON.stringify(payload),
      'muteHttpExceptions': true
    };

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    // [!code ++]
    const responseText = response.getContentText(); // ดึงค่า response body มาด้วย

    // [!code ++]
    // --- 4. Log ผลลัพธ์จาก LINE API (สำคัญมาก) ---
    writeToLogSheet(`LINE API Response Code: ${responseCode} | Response Body: ${responseText}`);

    if (responseCode === 200) {
      console.log('Website link message sent successfully');
    } else {
      console.error('Failed to send message:', responseText);
    }

  } catch (error) {
    // [!code ++]
    // --- 5. Log กรณีเกิด Exception ---
    writeToLogSheet(`EXCEPTION in sendWebsiteLinkMessage: ${error.toString()}`);
    console.error('Error in sendWebsiteLinkMessage:', error);
  }
}

function writeToLogSheet(message) {
  try {
    // ให้แน่ใจว่าคุณใส่ ID ของ Spreadsheet ที่ต้องการบันทึก Log ถูกต้อง
    const ss = SpreadsheetApp.openById("1JIOXNUe-F1whi9RydNMvmq7qwXrz2qkeazAy6rknOuM");
    let logSheet = ss.getSheetByName("WebhookLogs");
    if (!logSheet) {
      logSheet = ss.insertSheet("WebhookLogs");
      logSheet.appendRow(["Timestamp", "Log Message"]);
    }
    logSheet.appendRow([new Date(), message]);
  } catch (e) {
    console.error("Failed to write to log sheet: " + e.message);
  }
}

// ===================================
// AUTHENTICATION FUNCTIONS
// ===================================


function doLogin(username, password) {
  try {
    const masterSheet = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const usersSheet = masterSheet.getSheetByName(CONFIG.MASTER_SHEETS.USERS);
    const userData = usersSheet.getDataRange().getValues();

    // Find user (skip header row)
    for (let i = 1; i < userData.length; i++) {
      const row = userData[i];
      const [userId, uname, pwdHash, salt, role, storeIds, active] = row;

      if (uname === username && active === true) {
        // Verify password
        const hashedInput = hashPassword(password, salt);
        if (hashedInput === pwdHash) {
          // Get user's stores
          const storesSheet = masterSheet.getSheetByName(CONFIG.MASTER_SHEETS.STORES);
          const storesData = storesSheet.getDataRange().getValues();
          const userStoreIds = JSON.parse(storeIds || '[]');

          const userStores = [];
          for (let j = 1; j < storesData.length; j++) {
            const storeRow = storesData[j];
            const [storeId, storeCode, storeName, sheetId, folderId, lineToken] = storeRow;

            if (role === 'owner' || role === 'accountant' || userStoreIds.includes(storeId)) {
              userStores.push({
                store_id: storeId,
                code: storeCode,
                name: storeName,
                sheet_id: sheetId,
                folder_id: folderId,
                line_token: lineToken
              });
            }
          }

          // Log successful login
          logLogin(userId, username, 'success');

          return {
            success: true,
            user: {
              id: userId,
              username: username,
              role: role,
              stores: userStores,
              currentStore: null,
              sheetId: null
            },
            webAppUrl: CONFIG.WEB_APP_URL
          };
        }
      }
    }

    // Log failed login
    logLogin(null, username, 'failed');

    return {
      success: false,
      message: 'Invalid username or password'
    };

  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: 'System error occurred'
    };
  }
}

function hashPassword(password, salt) {
  const input = password + salt;
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input);
  return Utilities.base64Encode(hash);
}

function logLogin(userId, username, status) {
  try {
    const masterSheet = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const logSheet = masterSheet.getSheetByName(CONFIG.MASTER_SHEETS.LOGIN_LOGS);

    logSheet.appendRow([
      Utilities.getUuid(),
      userId || '',
      username,
      status,
      new Date(),
      Session.getActiveUser().getEmail() || 'Unknown'
    ]);
  } catch (error) {
    console.error('Error logging login:', error);
  }
}



function addUser(userData) {
  try {
    const masterSheet = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const usersSheet = masterSheet.getSheetByName(CONFIG.MASTER_SHEETS.USERS);
    const salt = Utilities.getUuid();
    const passwordHash = hashPassword(userData.password, salt);
    const usernameAsText = "'" + userData.username;

    // --- START: ส่วนที่แก้ไข ---
    // แปลง array ของ store_ids ที่ได้รับมาเป็น JSON String
    // เพิ่ม || [] เพื่อป้องกัน error หากไม่มีการส่ง store_ids มา
    const storeIdsJson = JSON.stringify(userData.store_ids || []);
    // --- END: ส่วนที่แก้ไข ---

    usersSheet.appendRow([
      Utilities.getUuid(),
      usernameAsText,
      passwordHash,
      salt,
      userData.role,
      storeIdsJson, // <-- แก้ไขตรงนี้ จากเดิมที่เป็น '[]'
      true, // active
      new Date(),
      Session.getActiveUser().getEmail() || 'System'
    ]);
    return { success: true };
  } catch (error) {
    console.error('Error adding user:', error);
    return { success: false, message: error.toString() };
  }
}



// ฟังก์ชันสำหรับดึงข้อมูลผู้ใช้ทั้งหมด
function getUsers() {
  try {
    const masterSheet = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const usersSheet = masterSheet.getSheetByName(CONFIG.MASTER_SHEETS.USERS);
    const data = usersSheet.getDataRange().getValues();

    const users = [];
    // เริ่มจาก i = 1 เพื่อข้าม Header
    for (let i = 1; i < data.length; i++) {
      users.push({
        user_id: data[i][0],
        username: data[i][1],
        // ไม่ส่ง password hash กลับไปที่ frontend เพื่อความปลอดภัย
        role: data[i][4],
        store_ids: JSON.parse(data[i][5] || '[]'),
        active: data[i][6]
      });
    }
    return { success: true, users: users };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// ฟังก์ชันสำหรับอัปเดตข้อมูลผู้ใช้
function updateUser(userData) {
  try {
    const masterSheet = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const usersSheet = masterSheet.getSheetByName(CONFIG.MASTER_SHEETS.USERS);
    const data = usersSheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userData.user_id) { // หาจาก user_id
        usersSheet.getRange(i + 1, 2).setValue(userData.username); // อัปเดต username
        usersSheet.getRange(i + 1, 5).setValue(userData.role);       // อัปเดต role
        usersSheet.getRange(i + 1, 6).setValue(JSON.stringify(userData.store_ids)); // อัปเดต store_ids
        usersSheet.getRange(i + 1, 7).setValue(userData.active);     // อัปเดต active
        return { success: true };
      }
    }
    return { success: false, message: "User not found." };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// ฟังก์ชันสำหรับลบผู้ใช้ (Soft Delete)
function deleteUser(userId) {
  try {
    const masterSheet = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const usersSheet = masterSheet.getSheetByName(CONFIG.MASTER_SHEETS.USERS);
    const data = usersSheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        usersSheet.getRange(i + 1, 7).setValue(false); // ตั้งค่า active เป็น false
        return { success: true };
      }
    }
    return { success: false, message: "User not found." };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}



function changePassword(username, newPassword) {
  try {
    const masterSheet = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const usersSheet = masterSheet.getSheetByName(CONFIG.MASTER_SHEETS.USERS);
    const usersData = usersSheet.getDataRange().getValues();

    // หา user ที่ต้องการเปลี่ยนรหัส
    let userRowIndex = -1;
    for (let i = 1; i < usersData.length; i++) {
      if (usersData[i][0] === username) {
        userRowIndex = i + 1; // +1 เพราะ sheet index เริ่มที่ 1
        break;
      }
    }

    if (userRowIndex === -1) {
      return { success: false, message: 'ไม่พบผู้ใช้ในระบบ' };
    }

    // Hash รหัสผ่านใหม่
    const hashedPassword = hashPassword(newPassword);

    // อัปเดตรหัสผ่านใน sheet (คอลัมน์ B คือ password)
    usersSheet.getRange(userRowIndex, 2).setValue(hashedPassword);

    return { success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' };

  } catch (error) {
    return { success: false, message: 'เกิดข้อผิดพลาด: ' + error.toString() };
  }
}


// ===================================
// STORE MANAGEMENT FUNCTIONS
// ===================================

function getStoreData(storeId, sheetType) {
  try {
    const masterSheet = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const storesSheet = masterSheet.getSheetByName(CONFIG.MASTER_SHEETS.STORES);
    const storeData = storesSheet.getDataRange().getValues();

    // Find store
    for (let i = 1; i < storeData.length; i++) {
      if (storeData[i][0] === storeId) {
        const sheetId = storeData[i][3];
        const storeSheet = SpreadsheetApp.openById(sheetId);
        const dataSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS[sheetType]);

        if (dataSheet) {
          return {
            success: true,
            data: dataSheet.getDataRange().getValues()
          };
        }
      }
    }

    return {
      success: false,
      message: 'Store or sheet not found'
    };

  } catch (error) {
    console.error('Error getting store data:', error);
    return {
      success: false,
      message: error.toString()
    };
  }
}




function createNewStore(storeName, storeCode, groupLineId, managerId) {
  try {
    // 1. ดึงค่า ROOT_FOLDER_ID จาก Master Settings
    const apiConfig = getAPIConfig();
    const rootFolderId = apiConfig.ROOT_FOLDER_ID;

    if (!rootFolderId) {
      throw new Error("ROOT_FOLDER_ID not found in Master_Settings. Please check your Master Sheet setup or run createMasterSheet() again.");
    }
    const parentFolder = DriveApp.getFolderById(rootFolderId);

    // 2. สร้าง Folder ของสาขาใหม่ ให้อยู่ภายใต้โฟลเดอร์หลัก
    const folder = parentFolder.createFolder(`${storeName}_Stock_System`);

    // 3. สร้าง Spreadsheet และย้ายเข้า Folder
    const newSpreadsheet = SpreadsheetApp.create(`${storeName}_Inventory`);
    const newSheetId = newSpreadsheet.getId();
    DriveApp.getFileById(newSheetId).moveTo(folder);

    // 4. สร้างโครงสร้างชีต (ไม่รวม Deposit Sheets)
    initializeStoreStructure(newSheetId, {
      name: storeName,
      code: storeCode,
      groupLineId: groupLineId
    });

    // 4.5 สร้าง Deposit Sheets (6 sheets) สำหรับระบบฝากเหล้า
    const depositSheetsResult = createDepositSheets(newSheetId, Utilities.getUuid());
    if (!depositSheetsResult.success) {
      console.warn('Failed to create Deposit Sheets:', depositSheetsResult.message);
    }

    // 5. บันทึกข้อมูลสาขาลงใน Master Sheet
    const masterSheet = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const storesSheet = masterSheet.getSheetByName('Stores');
    const storeId = Utilities.getUuid();
    storesSheet.appendRow([
      storeId,                                      // store_id
      storeCode,                                     // store_code
      storeName,                                     // store_name
      newSheetId,                                    // sheet_id
      folder.getId(),                                // folder_id
      '',                                            // line_token (LINE OA Access Token - กรอกทีหลัง)
      managerId || Session.getActiveUser().getEmail(), // manager_id
      true,                                          // active
      new Date(),                                    // created_at
      '',                                            // line_channel_secret
      '',                                            // staff_group_id
      '',                                            // bar_group_id
      '',                                            // central_group_id
      '',                                            // line_id
      '',                                            // line_add_friend_url
      '',                                            // qr_code_image_url
      '',                                            // store_address
      '',                                            // store_phone
      '',                                            // receipt_logo_url
      '80mm',                                        // default_paper_size
      1                                              // default_copies
    ]);

    // 6. ส่งการแจ้งเตือน Line (ถ้ามี)
    if (groupLineId && apiConfig.LINE_ACCESS_TOKEN) {
      sendLineNotification(groupLineId,
        `✅ สาขา ${storeName} ถูกสร้างเรียบร้อยแล้ว\n` +
        `📍 รหัสสาขา: ${storeCode}\n` +
        `📅 วันที่สร้าง: ${new Date().toLocaleDateString('th-TH')}\n` +
        `👤 ผู้จัดการ: ${managerId || Session.getActiveUser().getEmail()}`
      );
    }

    console.log(`Store created successfully inside root folder: ${storeName}`);
    return {
      success: true,
      store_id: storeId,
      sheet_id: newSheetId,
      folder_id: folder.getId(),
      sheet_url: newSpreadsheet.getUrl()
    };
  } catch (error) {
    console.error('Error creating store:', error);
    return { success: false, message: error.toString() };
  }
}


// ฟังก์ชันสร้างโครงสร้างชีตใหม่ทั้งหมด (ไม่มีสินค้าเริ่มต้น)
function initializeStoreStructure(sheetId, storeDetails) {
  const spreadsheet = SpreadsheetApp.openById(sheetId);

  // โครงสร้างชีตทั้งหมดที่ต้องสร้าง
  const sheets = [
    {
      name: 'Products',
      headers: ['product_id', 'product_code', 'barcode', 'product_name', 'category', 'unit', 'cost_price', 'selling_price', 'min_stock', 'image_url', 'active', 'count_status']
    },
    {
      name: 'Manual_Count',
      headers: ['count_id', 'count_date', 'product_code', 'product_name', 'quantity', 'counted_by', 'count_time', 'status', 'submitted_at']
    },
    {
      name: 'OCR_Log',
      headers: ['ocr_id', 'ocr_date', 'pdf_url', 'pdf_file_id', 'ocr_raw_data', 'total_items', 'processed_items', 'failed_items', 'uploaded_by', 'upload_time', 'ocr_status', 'process_time']
    },
    {
      name: 'OCR_Items',
      headers: ['item_id', 'ocr_id', 'ocr_date', 'product_code', 'product_name', 'quantity', 'unit', 'match_status', 'confidence_score']
    },
    {
      name: 'Comparison',
      headers: ['comp_id', 'comp_date', 'product_code', 'product_name', 'pos_quantity', 'manual_quantity', 'difference', 'diff_percent', 'status', 'explanation', 'explained_by', 'approved_by', 'approval_status', 'owner_notes']
    },
    {
      name: 'Audit_Log',
      headers: ['audit_id', 'action_date', 'action_type', 'table_name', 'record_id', 'old_value', 'new_value', 'changed_by']
    },
    // NOTE: Deposits sheets จะถูกสร้างโดย createDepositSheets() แทน (6 sheets)
    {
      name: 'Settings',
      headers: ['setting_key', 'setting_value', 'setting_type', 'description']
    }
  ];

  // สร้างแต่ละชีต
  sheets.forEach((sheetConfig, index) => {
    let sheet;
    if (index === 0) {
      // ใช้ชีตแรกที่มีอยู่แล้ว
      sheet = spreadsheet.getSheets()[0];
      sheet.setName(sheetConfig.name);
    } else {
      // สร้างชีตใหม่
      sheet = spreadsheet.insertSheet(sheetConfig.name);
    }

    // ตั้งค่า headers
    const headerRange = sheet.getRange(1, 1, 1, sheetConfig.headers.length);
    headerRange.setValues([sheetConfig.headers]);
    headerRange.setBackground('#4A5568').setFontColor('#FFFFFF').setFontWeight('bold');
    sheet.setFrozenRows(1);

    // ปรับความกว้างคอลัมน์
    for (let i = 1; i <= sheetConfig.headers.length; i++) {
      sheet.setColumnWidth(i, 120);
    }
  });

  // เพิ่มค่าเริ่มต้นใน Settings sheet (โครงสร้างใหม่)
  const settingsSheet = spreadsheet.getSheetByName('Settings');
  const defaultSettings = [
    ['group_line_id', storeDetails.groupLineId || '', 'string', 'Group Line ID ของสาขา'],
    ['notify_time_daily', '08:00', 'time', 'เวลาแจ้งเตือนนับสต๊อกประจำวัน'],
    ['notify_days', 'Mon,Tue,Wed,Thu,Fri,Sat,Sun', 'string', 'วันที่ต้องการแจ้งเตือน (Mon-Sun) คั่นด้วย comma'],
    ['store_name', storeDetails.name || '', 'string', 'ชื่อสาขา'],
    ['store_code', storeDetails.code || '', 'string', 'รหัสสาขา'],
    ['created_date', new Date(), 'datetime', 'วันที่สร้างสาขา'],
    ['last_updated', new Date(), 'datetime', 'อัพเดทล่าสุด']
  ];

  settingsSheet.getRange(2, 1, defaultSettings.length, 4).setValues(defaultSettings);


  console.log(`Store structure created for: ${storeDetails.name}`);
}

/**
 * สร้าง 6 Sheets สำหรับระบบฝากเหล้าในสาขา
 * @param {string} storeSheetId - Sheet ID ของสาขา
 * @param {string} storeId - Store ID (reserved for future use)
 */
function createDepositSheets(storeSheetId, storeId = null) {
  try {
    const storeSS = SpreadsheetApp.openById(storeSheetId);

    // ตรวจสอบว่ามี sheets อยู่แล้วหรือไม่
    const existingSheets = storeSS.getSheets().map(s => s.getName());
    const depositSheets = ['Deposits', 'Deposit_Requests', 'Withdrawals', 'Withdrawal_Requests', 'Transfer_Requests', 'Deposit_History'];

    const alreadyExists = depositSheets.some(name => existingSheets.includes(name));
    if (alreadyExists) {
      console.log(`⚠ สาขานี้มี Deposit Sheets อยู่แล้ว`);
      return { success: false, message: 'Sheets already exist' };
    }

    // 1. Deposits - รายการฝากทั้งหมด
    const depositsSheet = storeSS.insertSheet('Deposits');
    const depositsHeaders = [
      'deposit_id', 'deposit_code', 'store_id', 'line_user_id', 'customer_name',
      'customer_phone', 'product_name', 'category', 'quantity', 'remaining_percent', 'remaining_qty', 'table_number',
      'deposit_date', 'expiry_date', 'is_vip', 'status', 'photo_url',
      'received_by', 'confirmed_by', 'notes', 'created_at', 'updated_at'
    ];
    depositsSheet.getRange(1, 1, 1, depositsHeaders.length).setValues([depositsHeaders]);

    // 2. Deposit_Requests - คำขอฝากจาก LINE
    const depositRequestsSheet = storeSS.insertSheet('Deposit_Requests');
    const depositRequestsHeaders = [
      'request_id', 'store_id', 'line_user_id', 'customer_name', 'customer_phone',
      'product_name', 'category', 'quantity', 'remaining_percent', 'table_number', 'notes', 'status',
      'request_date', 'processed_by', 'processed_at', 'deposit_id'
    ];
    depositRequestsSheet.getRange(1, 1, 1, depositRequestsHeaders.length).setValues([depositRequestsHeaders]);

    // 3. Withdrawals - ประวัติการเบิก
    const withdrawalsSheet = storeSS.insertSheet('Withdrawals');
    const withdrawalsHeaders = [
      'withdrawal_id', 'deposit_id', 'deposit_code', 'line_user_id', 'customer_name',
      'requested_qty', 'actual_qty', 'table_number', 'withdrawal_date',
      'processed_by', 'notes', 'created_at'
    ];
    withdrawalsSheet.getRange(1, 1, 1, withdrawalsHeaders.length).setValues([withdrawalsHeaders]);

    // 4. Withdrawal_Requests - คำขอเบิกจาก LINE
    const withdrawalRequestsSheet = storeSS.insertSheet('Withdrawal_Requests');
    const withdrawalRequestsHeaders = [
      'request_id', 'deposit_id', 'deposit_code', 'line_user_id',
      'requested_qty', 'table_number', 'notes', 'status',
      'request_date', 'processed_by', 'processed_at', 'withdrawal_id'
    ];
    withdrawalRequestsSheet.getRange(1, 1, 1, withdrawalRequestsHeaders.length).setValues([withdrawalRequestsHeaders]);

    // 5. Transfer_Requests - คำขอโอนคลังกลาง
    const transferRequestsSheet = storeSS.insertSheet('Transfer_Requests');
    const transferRequestsHeaders = [
      'transfer_id', 'transfer_code', 'from_store_id', 'deposit_ids', 'total_items',
      'transfer_date', 'confirm_date', 'photo_url', 'confirm_photo_url',
      'status', 'notes', 'confirmed_by', 'created_by', 'created_at'
    ];
    transferRequestsSheet.getRange(1, 1, 1, transferRequestsHeaders.length).setValues([transferRequestsHeaders]);

    // 6. Deposit_History - ประวัติทั้งหมด (เบิกหมด/หมดอายุ/โอนคลัง)
    const depositHistorySheet = storeSS.insertSheet('Deposit_History');
    const depositHistoryHeaders = [
      'history_id', 'deposit_id', 'deposit_code', 'customer_name', 'product_name', 'category',
      'original_qty', 'final_status', 'status_date', 'transfer_id',
      'notes', 'archived_at'
    ];
    depositHistorySheet.getRange(1, 1, 1, depositHistoryHeaders.length).setValues([depositHistoryHeaders]);

    // จัดรูปแบบ Headers ทุก sheet
    const allSheets = [
      depositsSheet, depositRequestsSheet, withdrawalsSheet,
      withdrawalRequestsSheet, transferRequestsSheet, depositHistorySheet
    ];

    allSheets.forEach(sheet => {
      const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn());
      headerRow.setBackground('#7c3aed').setFontColor('#FFFFFF').setFontWeight('bold');
      sheet.setFrozenRows(1);
      sheet.autoResizeColumns(1, sheet.getLastColumn());
    });

    console.log(`✓ สร้าง 6 Deposit Sheets สำเร็จ`);

    return {
      success: true,
      message: 'Created 6 deposit sheets successfully',
      sheets: depositSheets
    };

  } catch (error) {
    console.error('Error in createDepositSheets:', error);
    return {
      success: false,
      message: error.toString()
    };
  }
}


// ===================================
// PRODUCT MANAGEMENT
// ===================================



// ===================================
// PRODUCT MANAGEMENT (แก้ไขทั้งหมด)
// ===================================

/**
 * แก้ไข: เพิ่มการดึงข้อมูล count_status (คอลัมน์ที่ 12)
 */
function getProducts(sheetId) {
  try {
    const storeSheet = SpreadsheetApp.openById(sheetId);
    const productsSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.PRODUCTS);
    if (!productsSheet) {
      return { success: true, products: [] };
    }
    const data = productsSheet.getDataRange().getValues();

    const products = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      products.push({
        product_id: row[0],
        product_code: row[1],
        barcode: row[2],
        product_name: row[3],
        category: row[4],
        unit: row[5],
        cost_price: row[6],
        selling_price: row[7],
        min_stock: row[8],
        image_url: row[9],
        active: row[10],
        count_status: row[11] || 'active' // *** เพิ่มบรรทัดนี้: ดึงข้อมูลสถานะการนับ ***
      });
    }

    return {
      success: true,
      products: products
    };
  } catch (error) {
    console.error('Error getting products:', error);
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * ฟังก์ชันใหม่: ดึงรายชื่อเหล้าและหมวดหมู่สำหรับระบบฝาก/เบิก
 */
function getProductsForDeposit(storeId) {
  try {
    // Get store's sheet_id
    const masterSheet = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const storesSheet = masterSheet.getSheetByName(CONFIG.MASTER_SHEETS.STORES);
    const storesData = storesSheet.getDataRange().getValues();

    let sheetId = null;
    for (let i = 1; i < storesData.length; i++) {
      if (storesData[i][0] === storeId) {
        sheetId = storesData[i][3]; // sheet_id column
        break;
      }
    }

    if (!sheetId) {
      return { success: false, message: 'Store not found' };
    }

    const storeSheet = SpreadsheetApp.openById(sheetId);
    const productsSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.PRODUCTS);
    if (!productsSheet) {
      return { success: true, products: [], categories: [] };
    }
    const data = productsSheet.getDataRange().getValues();

    const products = [];
    const categoriesSet = new Set();

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const category = row[4];
      const productName = row[3];
      const active = row[10];

      // Only include active products
      if (active === true) {
        products.push({
          name: productName,
          category: category,
          product_code: row[1],
          barcode: row[2],
          unit: row[5]
        });

        if (category) {
          categoriesSet.add(category);
        }
      }
    }

    return {
      success: true,
      products: products,
      categories: Array.from(categoriesSet).sort()
    };
  } catch (error) {
    console.error('Error getting products for deposit:', error);
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * Upload photo to Google Drive with folder structure: Store Folder → รูปฝากเหล้า → DDMMYYYY
 * @param {string} storeId - Store ID
 * @param {string} base64Image - Base64 encoded image data
 * @param {string} fileName - File name
 * @returns {string} Photo URL or empty string if failed
 */
function uploadDepositPhoto(storeId, base64Image, fileName) {
  try {
    if (!base64Image) {
      return '';
    }

    // Get store's folder_id from Master sheet
    const masterSheet = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const storesSheet = masterSheet.getSheetByName(CONFIG.MASTER_SHEETS.STORES);
    const storesData = storesSheet.getDataRange().getValues();

    let storeFolderId = null;
    for (let i = 1; i < storesData.length; i++) {
      if (storesData[i][0] === storeId) {
        storeFolderId = storesData[i][4]; // folder_id column (index 4)
        break;
      }
    }

    if (!storeFolderId) {
      console.error('Store folder not found for store:', storeId);
      return '';
    }

    const storeFolder = DriveApp.getFolderById(storeFolderId);

    // Create/Get "รูปฝากเหล้า" subfolder
    let depositPhotosFolder;
    const depositPhotosFolders = storeFolder.getFoldersByName('รูปฝากเหล้า');
    if (depositPhotosFolders.hasNext()) {
      depositPhotosFolder = depositPhotosFolders.next();
    } else {
      depositPhotosFolder = storeFolder.createFolder('รูปฝากเหล้า');
      console.log('Created "รูปฝากเหล้า" folder for store:', storeId);
    }

    // Create/Get date folder (DDMMYYYY format)
    const now = new Date();
    const dateFolder = Utilities.formatDate(now, 'Asia/Bangkok', 'ddMMyyyy');

    let dateFolderObj;
    const dateFolders = depositPhotosFolder.getFoldersByName(dateFolder);
    if (dateFolders.hasNext()) {
      dateFolderObj = dateFolders.next();
    } else {
      dateFolderObj = depositPhotosFolder.createFolder(dateFolder);
      console.log('Created date folder:', dateFolder);
    }

    // Parse base64 image (format: "data:image/png;base64,...")
    const base64Data = base64Image.split(',')[1] || base64Image;
    const mimeType = base64Image.match(/data:([^;]+);/)?.[1] || 'image/jpeg';

    // Decode base64 and create blob
    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      mimeType,
      fileName
    );

    // Upload file to date folder
    const file = dateFolderObj.createFile(blob);

    // Set file sharing to anyone with link can view
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const photoUrl = file.getUrl();
    console.log('Photo uploaded successfully:', photoUrl);

    return photoUrl;

  } catch (error) {
    console.error('Error uploading photo:', error);
    return '';
  }
}

/**
 * สร้างรายการฝาก Walk-in (สำหรับลูกค้าที่มาร้านโดยตรง)
 */
function createWalkInDeposit(depositData) {
  try {
    console.log('Creating walk-in deposit for store:', depositData.storeId);

    // Get store's sheet_id
    const masterSheet = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const storesSheet = masterSheet.getSheetByName(CONFIG.MASTER_SHEETS.STORES);
    const storesData = storesSheet.getDataRange().getValues();

    let sheetId = null;
    for (let i = 1; i < storesData.length; i++) {
      if (storesData[i][0] === depositData.storeId) {
        sheetId = storesData[i][3]; // sheet_id column
        break;
      }
    }

    if (!sheetId) {
      return { success: false, message: 'Store not found' };
    }

    const storeSheet = SpreadsheetApp.openById(sheetId);
    const depositsSheet = storeSheet.getSheetByName('Deposits');
    if (!depositsSheet) {
      return { success: false, message: 'Deposits sheet not found. Please create deposit sheets first.' };
    }

    // Generate deposit ID and code
    const depositId = Utilities.getUuid();
    const depositCodeResult = generateDepositCode(depositData.storeId);

    if (!depositCodeResult.success) {
      console.error('Failed to generate deposit code:', depositCodeResult.message);
      return { success: false, message: 'ไม่สามารถสร้างรหัสฝากได้' };
    }

    const depositCode = depositCodeResult.code;
    const now = new Date();

    // Calculate expiry date (30 days from now)
    const expiryDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

    // Upload photo if provided
    let photoUrl = '';
    if (depositData.photoBase64) {
      const fileName = `${depositCode}_${Date.now()}.jpg`;
      photoUrl = uploadDepositPhoto(depositData.storeId, depositData.photoBase64, fileName);
      console.log('Photo uploaded for deposit:', depositCode, 'URL:', photoUrl);
    }

    // Prepare row data based on schema:
    // 'deposit_id', 'deposit_code', 'store_id', 'line_user_id', 'customer_name',
    // 'customer_phone', 'product_name', 'category', 'quantity', 'remaining_percent', 'remaining_qty', 'table_number',
    // 'deposit_date', 'expiry_date', 'is_vip', 'status', 'photo_url',
    // 'received_by', 'confirmed_by', 'notes', 'created_at', 'updated_at'

    const rowData = [
      depositId,                                    // deposit_id
      depositCode,                                  // deposit_code
      depositData.storeId,                          // store_id
      depositData.customerLineId || '',             // line_user_id (walk-in ไม่มี)
      depositData.customerName,                     // customer_name
      "'" + depositData.customerPhone,              // customer_phone (เพิ่ม ' เพื่อบันทึกเป็น text)
      depositData.productName,                      // product_name
      depositData.category,                         // category
      depositData.quantity,                         // quantity
      depositData.remainingPercent || 100,          // remaining_percent (default 100%)
      depositData.quantity,                         // remaining_qty (initially = quantity)
      depositData.tableNumber || '',                // table_number
      now,                                          // deposit_date
      expiryDate,                                   // expiry_date
      false,                                        // is_vip (default false)
      'pending_confirm',                            // status (Walk-in: Staff ทำแล้ว รอ Bar ยืนยันและถ่ายรูป)
      photoUrl,                                     // photo_url (Staff อัพโหลดหรือว่าง ให้ Bar ถ่ายทีหลัง)
      depositData.receivedBy,                       // received_by (staff username)
      '',                                           // confirmed_by (ยังไม่มี)
      depositData.notes || '',                      // notes
      now,                                          // created_at
      now                                           // updated_at
    ];

    depositsSheet.appendRow(rowData);

    console.log('Walk-in deposit created successfully:', depositCode);

    return {
      success: true,
      depositId: depositId,
      depositCode: depositCode,
      message: 'Walk-in deposit created successfully'
    };

  } catch (error) {
    console.error('Error creating walk-in deposit:', error);
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * Generate unique deposit code (format: DEP-STORE_CODE-XXXXX)
 * @param {string} storeId - Store ID to get store_code
 * @returns {Object} {success: boolean, code: string, message: string}
 */
function generateDepositCode(storeId) {
  try {
    // Get store info to retrieve store_code
    const storeInfo = getStoreInfoById(storeId);

    if (!storeInfo || !storeInfo.store_code) {
      return {
        success: false,
        message: 'Store code not found'
      };
    }

    // Generate 5-character random code (base36: 0-9, A-Z)
    const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
    const depositCode = `DEP-${storeInfo.store_code}-${randomStr}`;

    return {
      success: true,
      code: depositCode
    };

  } catch (error) {
    console.error('Error generating deposit code:', error);
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * แก้ไข: เพิ่มการบันทึก count_status ตอนสร้างสินค้าใหม่
 */
function addProduct(sheetId, productData) {
  try {
    const storeSheet = SpreadsheetApp.openById(sheetId);
    const productsSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.PRODUCTS);
    const productId = Utilities.getUuid();

    productsSheet.appendRow([
      productId,
      productData.product_code,
      productData.barcode || '',
      productData.product_name,
      productData.category,
      productData.unit,
      productData.cost_price,
      productData.selling_price,
      productData.min_stock || 0,
      productData.image_url || '',
      true, // active (ค่าเริ่มต้น)
      productData.count_status || 'active' // *** เพิ่มบรรทัดนี้: บันทึกสถานะการนับ ***
    ]);

    logAudit(sheetId, 'INSERT', CONFIG.STORE_SHEETS.PRODUCTS, productId, null, productData);

    return {
      success: true,
      product_id: productId
    };
  } catch (error) {
    console.error('Error adding product:', error);
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * แก้ไข: เพิ่มการอัปเดต count_status
 */
function updateProduct(sheetId, productData) {
  try {
    const storeSheet = SpreadsheetApp.openById(sheetId);
    const productsSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.PRODUCTS);
    const data = productsSheet.getDataRange().getValues();
    const productId = productData.product_id; // ใช้ product_id ในการค้นหาเพื่อความแม่นยำ

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === productId) { // [0] คือคอลัมน์ product_id
        const oldData = { ...data[i] };

        // *** แก้ไข: อัปเดตข้อมูลทั้งแถวรวมถึง count_status (12 คอลัมน์) ***
        productsSheet.getRange(i + 1, 1, 1, 12).setValues([[
          productId,
          productData.product_code,
          productData.barcode || '',
          productData.product_name,
          productData.category,
          productData.unit,
          productData.cost_price,
          productData.selling_price,
          productData.min_stock,
          productData.image_url,
          productData.active,
          productData.count_status // *** เพิ่มค่านี้ ***
        ]]);

        logAudit(sheetId, 'UPDATE', CONFIG.STORE_SHEETS.PRODUCTS, productId, oldData, productData);
        return { success: true };
      }
    }
    return { success: false, message: 'Product not found' };
  } catch (error) {
    console.error('Error updating product:', error);
    return { success: false, message: error.toString() };
  }
}








function toggleProductStatus(sheetId, productCode, isActive) {
  try {
    const storeSheet = SpreadsheetApp.openById(sheetId);
    const productsSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.PRODUCTS);
    const data = productsSheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === productCode) { // [1] คือคอลัมน์ product_code
        // อัปเดตเฉพาะคอลัมน์ active (คอลัมน์ที่ 11)
        productsSheet.getRange(i + 1, 11).setValue(isActive);
        logAudit(sheetId, 'TOGGLE_STATUS', CONFIG.STORE_SHEETS.PRODUCTS, data[i][0], { active: !isActive }, { active: isActive });
        return { success: true };
      }
    }
    return { success: false, message: 'Product not found' };
  } catch (error) {
    console.error('Error toggling product status:', error);
    return { success: false, message: error.toString() };
  }
}

function deleteProduct(sheetId, productCode) {
  try {
    const storeSheet = SpreadsheetApp.openById(sheetId);
    const productsSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.PRODUCTS);
    const data = productsSheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === productCode) { // [1] คือคอลัมน์ product_code
        // Soft delete: ตั้งค่าคอลัมน์ active (คอลัมน์ที่ 11) เป็น false
        productsSheet.getRange(i + 1, 11).setValue(false);

        logAudit(sheetId, 'DELETE', CONFIG.STORE_SHEETS.PRODUCTS, data[i][0], { active: true }, { active: false });
        return { success: true };
      }
    }
    return { success: false, message: 'Product not found' };
  } catch (error) {
    console.error('Error deleting product:', error);
    return { success: false, message: error.toString() };
  }
}

// ===================================
// MANUAL COUNT FUNCTIONS
// ===================================



// function getManualCountForm(sheetId, countDate) {
//   try {
//     const storeSheet = SpreadsheetApp.openById(sheetId);
//     const countSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.MANUAL_COUNT);
//     const productsSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.PRODUCTS);

//     const productsData = productsSheet.getDataRange().getValues();
//     // *** แก้ไขเงื่อนไข: กรองเอาเฉพาะสินค้าที่ไม่ได้ถูก excluded ***
//     const products = productsData.slice(1)
//       .filter(row => row[11] !== 'excluded') // คอลัมน์ L คือ index 11 (count_status)
//       .map(row => ({
//         product_code: row[1], product_name: row[3], category: row[4], unit: row[5], image_url: row[9]
//     }));

//     const countData = countSheet.getDataRange().getValues();
//     const existingCounts = {};
//     let foundMatch = false;
//     let countedBy = null; // *** เพิ่ม: ตัวแปรเก็บชื่อผู้นับ ***

//     for (let i = 1; i < countData.length; i++) {
//       const row = countData[i];
//       let sheetDateString = (row[1] instanceof Date) ? Utilities.formatDate(row[1], Session.getScriptTimeZone(), 'yyyy-MM-dd') : row[1];
//       if (sheetDateString === countDate) {
//         existingCounts[row[2]] = row[4];

//         // *** เพิ่ม: เก็บค่า counted_by จากแถวแรกที่เจอ ***
//         if (!foundMatch && row[5]) {  
//           countedBy = row[5];
//         }

//         foundMatch = true;
//       }
//     }

//     let matchedCount = 0;
//     let unmatchedCount = 0;

//     if (foundMatch) {
//       const comparisonData = getComparisonResults(sheetId, countDate);
//       if (comparisonData.success) {
//         comparisonData.results.forEach(item => {
//           if (item.status === 'matched') {
//             matchedCount++;
//           } else if (item.status === 'discrepancy') {
//             unmatchedCount++;
//           }
//         });
//       }
//     }

//     return {
//       success: true,
//       products: products,
//       existingCounts: existingCounts,
//       hasExisting: foundMatch,
//       matchedCount: matchedCount,
//       unmatchedCount: unmatchedCount,
//       countedBy: countedBy  // *** เพิ่ม: ส่งค่า counted_by กลับไป ***
//     };
//   } catch (error) {
//     return { success: false, message: error.toString() };
//   }
// }




function getManualCountForm(sheetId, countDate) {
  try {
    const storeSheet = SpreadsheetApp.openById(sheetId);
    const countSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.MANUAL_COUNT);
    const productsSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.PRODUCTS);

    // ดึงรายการสินค้าที่ active และไม่ถูก excluded
    const productsData = productsSheet.getDataRange().getValues();
    const products = productsData.slice(1)
      .filter(row => row[11] !== 'excluded' && row[10] === true)
      .map(row => ({
        product_code: row[1],
        product_name: row[3],
        category: row[4],
        unit: row[5],
        image_url: row[9]
      }));

    // ดึงข้อมูลการนับที่มีอยู่แล้ว
    const countData = countSheet.getDataRange().getValues();
    const existingCounts = {};
    let foundMatch = false;
    let countedBy = null;

    for (let i = 1; i < countData.length; i++) {
      const row = countData[i];
      let sheetDateString = (row[1] instanceof Date)
        ? Utilities.formatDate(row[1], Session.getScriptTimeZone(), 'yyyy-MM-dd')
        : row[1];

      if (sheetDateString === countDate) {
        existingCounts[row[2]] = row[4];

        // เก็บค่า counted_by จากแถวแรกที่เจอ
        if (!foundMatch && row[5]) {
          countedBy = row[5];
        }

        foundMatch = true;
      }
    }

    // ✅ ตรวจสอบว่ามีการอัพโหลด PDF สำหรับวันที่นี้หรือไม่
    const ocrLogSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.OCR_LOG);
    let hasPdfUpload = false;

    if (ocrLogSheet) {
      const ocrData = ocrLogSheet.getDataRange().getValues();

      // วนลูปตรวจสอบว่ามี PDF ของวันนี้หรือไม่
      for (let i = 1; i < ocrData.length; i++) {
        const row = ocrData[i];

        // แปลงวันที่ให้เป็นรูปแบบเดียวกัน
        const ocrDate = (row[1] instanceof Date)
          ? Utilities.formatDate(row[1], Session.getScriptTimeZone(), 'yyyy-MM-dd')
          : row[1];

        // ตรวจสอบว่าตรงวันที่และสถานะเป็น success
        if (ocrDate === countDate && row[10] === 'success') {
          hasPdfUpload = true;
          Logger.log(`✅ Found PDF upload for date: ${countDate}`);
          break;
        }
      }
    }

    // ✅ ดึงข้อมูล POS และ Comparison เฉพาะเมื่อมีการอัพโหลด PDF แล้ว
    const posCounts = {};
    let matchedCount = 0;
    let unmatchedCount = 0;

    if (hasPdfUpload) {
      Logger.log(`📊 PDF exists - loading comparison data...`);

      const comparisonData = getComparisonResults(sheetId, countDate);
      if (comparisonData.success) {
        comparisonData.results.forEach(item => {
          posCounts[item.product_code] = item.pos_quantity;

          if (item.status === 'matched') {
            matchedCount++;
          } else if (item.status === 'discrepancy') {
            unmatchedCount++;
          }
        });
      }
    } else {
      Logger.log(`⏳ No PDF upload yet for date: ${countDate} - skipping comparison`);
    }

    return {
      success: true,
      products: products,
      existingCounts: existingCounts,
      posCounts: posCounts,              // ✅ ส่งข้อมูล POS กลับไป
      hasExisting: foundMatch,
      hasPdfUpload: hasPdfUpload,        // ✅ ส่งสถานะว่ามี PDF หรือไม่
      matchedCount: matchedCount,
      unmatchedCount: unmatchedCount,
      countedBy: countedBy
    };

  } catch (error) {
    Logger.log(`!!! ERROR in getManualCountForm: ${error.toString()}`);
    return {
      success: false,
      message: error.toString()
    };
  }
}


// function submitManualCount(sheetId, countDate, counts, username) {
//   try {
//     const storeSheet = SpreadsheetApp.openById(sheetId);
//     const countSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.MANUAL_COUNT);

//     // Clear existing counts for this date
//     const existingData = countSheet.getDataRange().getValues();
//     const rowsToDelete = [];

//     for (let i = existingData.length - 1; i > 0; i--) {
//       if (existingData[i][1] === countDate) {
//         rowsToDelete.push(i + 1);
//       }
//     }

//     rowsToDelete.forEach(row => countSheet.deleteRow(row));

//     // Add new counts
//     const timestamp = new Date();
//     counts.forEach(count => {
//       const countId = Utilities.getUuid();
//       countSheet.appendRow([
//         countId,
//         countDate,
//         count.product_code,
//         count.product_name,
//         count.quantity,
//         username,
//         timestamp,
//         'submitted',
//         timestamp
//       ]);
//     });

//     // Auto-compare if enabled
//     const settingsSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.SETTINGS);
//     const settings = getSettings(settingsSheet);

//     if (settings.auto_compare === 'true') {
//       compareWithOCR(sheetId, countDate);
//     }

//     return {
//       success: true,
//       message: 'Count submitted successfully'
//     };

//   } catch (error) {
//     console.error('Error submitting count:', error);
//     return {
//       success: false,
//       message: error.toString()
//     };
//   }
// }


function submitManualCount(sheetId, countDate, counts, username) {
  try {
    const storeSheet = SpreadsheetApp.openById(sheetId);
    const countSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.MANUAL_COUNT);

    // 1. อ่านข้อมูลทั้งหมดครั้งเดียว
    const existingData = countSheet.getDataRange().getValues();
    const headers = existingData[0];

    // 2. กรองเอาเฉพาะแถวที่ไม่ใช่วันที่ต้องการลบ (เก็บไว้)
    const dataToKeep = [headers]; // เริ่มด้วย headers

    for (let i = 1; i < existingData.length; i++) {
      const rowDate = existingData[i][1];
      const dateString = (rowDate instanceof Date)
        ? Utilities.formatDate(rowDate, Session.getScriptTimeZone(), 'yyyy-MM-dd')
        : rowDate;

      // เก็บเฉพาะแถวที่ไม่ใช่วันที่ต้องการ update
      if (dateString !== countDate) {
        dataToKeep.push(existingData[i]);
      }
    }

    // 3. เตรียมข้อมูลใหม่ที่จะเพิ่ม (batch prepare)
    const timestamp = new Date();
    const newRows = counts.map(count => {
      const countId = Utilities.getUuid();
      return [
        countId,
        countDate,
        count.product_code,
        count.product_name,
        count.quantity,
        username,
        timestamp,
        'submitted',
        timestamp
      ];
    });

    // 4. รวมข้อมูลเก่า + ใหม่
    const allData = dataToKeep.concat(newRows);

    // 5. Clear sheet และเขียนข้อมูลทั้งหมดในครั้งเดียว
    countSheet.clear();

    // 6. เขียนข้อมูลทั้งหมดในครั้งเดียว (Batch Write)
    if (allData.length > 0) {
      countSheet.getRange(1, 1, allData.length, allData[0].length)
        .setValues(allData);
    }

    // 7. จัดรูปแบบ headers
    const headerRange = countSheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#4A5568')
      .setFontColor('#FFFFFF')
      .setFontWeight('bold');
    countSheet.setFrozenRows(1);

    // ✅ 8. ตรวจสอบว่ามี PDF ก่อนจะ Compare
    const settingsSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.SETTINGS);
    const settings = getSettings(settingsSheet);

    if (settings.auto_compare === 'true') {
      Logger.log('Auto-compare is enabled. Checking if PDF exists...');

      // ✅ เช็คว่ามี PDF สำหรับวันที่นี้หรือไม่
      const ocrLogSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.OCR_LOG);
      let hasPdfUpload = false;

      if (ocrLogSheet) {
        const ocrData = ocrLogSheet.getDataRange().getValues();

        for (let i = 1; i < ocrData.length; i++) {
          const row = ocrData[i];
          const ocrDate = (row[1] instanceof Date)
            ? Utilities.formatDate(row[1], Session.getScriptTimeZone(), 'yyyy-MM-dd')
            : row[1];

          if (ocrDate === countDate && row[10] === 'success') {
            hasPdfUpload = true;
            Logger.log(`✅ Found PDF upload for date: ${countDate}`);
            break;
          }
        }
      }

      // ✅ Compare เฉพาะเมื่อมี PDF
      if (hasPdfUpload) {
        Logger.log('📊 PDF exists - triggering comparison...');
        compareWithOCR(sheetId, countDate);
      } else {
        Logger.log('⏳ No PDF upload yet - skipping comparison until PDF is uploaded');
      }
    } else {
      Logger.log('Auto-compare is disabled');
    }

    return {
      success: true,
      message: 'Count submitted successfully'
    };

  } catch (error) {
    console.error('Error submitting count:', error);
    return {
      success: false,
      message: error.toString()
    };
  }
}


// ===================================
// OCR FUNCTIONS
// ===================================

function getRecentUploads(sheetId) {
  try {
    const storeSheet = SpreadsheetApp.openById(sheetId);
    const ocrLogSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.OCR_LOG);
    if (!ocrLogSheet) {
      return { success: true, uploads: [] };
    }
    const data = ocrLogSheet.getDataRange().getValues();
    const uploads = [];
    // เริ่มจากท้ายสุด (ข้อมูลล่าสุด) ไม่เกิน 10 รายการ
    for (let i = data.length - 1; i > 0 && uploads.length < 10; i--) {
      const row = data[i];
      const fileName = row[2].substring(row[2].lastIndexOf('/') + 1); // ดึงชื่อไฟล์จาก URL
      uploads.push({
        ocr_id: row[0],
        ocr_date: Utilities.formatDate(new Date(row[1]), Session.getScriptTimeZone(), 'dd-MM-yyyy'),
        pdf_url: row[2],
        file_name: fileName,
        status: row[10], // ocr_status
        total_items: row[5] // total_items
      });
    }
    return { success: true, uploads: uploads };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function reauthorize() {
  // Force re-authorization
  DriveApp.getRootFolder();
  Drive.Files.list();
  SpreadsheetApp.getActiveSpreadsheet();

  console.log('Re-authorization complete');
}


function processWithVisionAPI(fileId) {
  const startTime = new Date();

  try {
    // อ่าน PDF file
    const file = DriveApp.getFileById(fileId);
    const blob = file.getBlob();
    const base64Content = Utilities.base64Encode(blob.getBytes());

    console.log('File size:', (base64Content.length * 0.75 / 1024 / 1024).toFixed(2), 'MB');

    // ใช้ค่าจาก CONFIG แทน
    const url = `https://${CONFIG.DOCUMENT_AI.LOCATION}-documentai.googleapis.com/v1/projects/${CONFIG.DOCUMENT_AI.PROJECT_ID}/locations/${CONFIG.DOCUMENT_AI.LOCATION}/processors/${CONFIG.DOCUMENT_AI.PROCESSOR_ID}:process`;

    // Payload สำหรับ OCR
    const payload = {
      rawDocument: {
        content: base64Content,
        mimeType: 'application/pdf'
      },
      processOptions: {
        ocrConfig: {
          enableNativePdfParsing: true,
          advancedOcrOptions: ['ENABLE_MATH_OCR']
        }
      }
    };

    // Request options
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + getServiceAccountToken()
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    console.log('Calling Document AI API...');
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();

    if (responseCode !== 200) {
      const errorContent = response.getContentText();
      console.error('Document AI Error:', errorContent);
      throw new Error(`Document AI failed (${responseCode}): ${errorContent}`);
    }

    const result = JSON.parse(response.getContentText());
    // === DEBUG: Log raw response ===
    console.log('=== RAW DOCUMENT AI DATA ===');
    console.log('Full text length:', result.document?.text?.length || 0);
    console.log('Number of pages:', result.document?.pages?.length || 0);

    if (result.document?.pages?.[0]?.tables) {
      console.log('Number of tables found:', result.document.pages[0].tables.length);
      console.log('First table structure:', JSON.stringify(result.document.pages[0].tables[0], null, 2).substring(0, 2000));
    } else {
      console.log('No tables found - will use text fallback');
    }

    // Log first 1000 characters of raw text
    console.log('First 1000 chars of extracted text:');
    console.log(result.document?.text?.substring(0, 1000));
    console.log('=== END RAW DATA ===');

    // Parse ข้อมูลจาก Document AI
    const parsedItems = parseDocumentAIResponse(result);

    const endTime = new Date();
    const processTime = (endTime - startTime) / 1000;

    console.log('Total items parsed:', parsedItems.length);

    return {
      raw: result.document?.text || '',
      items: parsedItems,
      totalItems: parsedItems.length,
      processedItems: parsedItems.length,
      failedItems: [],
      processTime: processTime,
      pagesProcessed: result.document?.pages?.length || 0
    };

  } catch (error) {
    console.error('Error in processWithVisionAPI:', error);
    throw error;
  }
}


function parseDocumentAIResponse(result) {
  const items = [];
  const fullText = result.document?.text || '';

  // STEP 1: ลองใช้วิธี structured tables ก่อน
  if (result.document && result.document.pages) {
    for (const page of result.document.pages) {
      if (page.tables) {
        for (const table of page.tables) {
          const bodyRows = table.bodyRows || [];
          for (const row of bodyRows) {
            const cells = row.cells || [];
            if (cells.length >= 3) {
              const code = extractTextFromCell(cells[0], fullText);
              const name = extractTextFromCell(cells[1], fullText);
              const qty = extractTextFromCell(cells[2], fullText);

              if (code && code.match(/^M\d+/)) {
                items.push({
                  product_code: code.trim(),
                  product_name: name.trim(),
                  quantity: parseFloat(qty.replace(/,/g, '')) || 0
                });
              }
            }
          }
        }
      }
    }
  }

  // STEP 2: ถ้าไม่เจอ table ให้ใช้วิธี text parsing
  if (items.length > 0) {
    console.log(`Successfully found ${items.length} items using the table method.`);
    return items;
  } else {
    console.log('No tables found. Switching to fallback raw text parsing method...');
    const fallbackItems = parseOcrText(fullText);
    console.log(`Found ${fallbackItems.length} items using the fallback method.`);
    return fallbackItems;
  }
}



function calculateStringSimilarity(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;

  if (str1 === str2) return 1.0;

  if (len1 === 0 || len2 === 0) return 0.0;

  // เช็คง่ายๆ ว่าอันหนึ่งมีอีกอันอยู่ข้างใน
  if (str1.includes(str2) || str2.includes(str1)) {
    return 0.8;
  }

  // Levenshtein distance
  const matrix = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1 - (distance / maxLen);
}



function compareUnits(unit1, unit2) {
  if (!unit1 || !unit2) return false;

  const clean1 = unit1.toLowerCase().replace(/\s/g, '');
  const clean2 = unit2.toLowerCase().replace(/\s/g, '');

  if (clean1 === clean2) return true;

  // ตรวจสอบว่ามีคำเดียวกันหรือไม่
  const type1 = clean1.match(/^(bottle|can|pcs|kg|l|ขวด|กระป๋อง|แพ็ค|ถัง|กล่อง)/i);
  const type2 = clean2.match(/^(bottle|can|pcs|kg|l|ขวด|กระป๋อง|แพ็ค|ถัง|กล่อง)/i);

  if (type1 && type2 && type1[1].toLowerCase() === type2[1].toLowerCase()) {
    return true;
  }

  return false;
}




function extractTextFromCell(cell, fullText) {
  if (!cell?.layout?.textAnchor?.textSegments) return '';

  let cellText = '';
  for (const segment of cell.layout.textAnchor.textSegments) {
    const start = parseInt(segment.startIndex) || 0;
    const end = parseInt(segment.endIndex) || fullText.length;
    cellText += fullText.substring(start, end);
  }

  return cellText;
}











function getUploadStatusForDate(sheetId, checkDate) {
  try {
    const storeSheet = SpreadsheetApp.openById(sheetId);
    const ocrLogSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.OCR_LOG);
    if (!ocrLogSheet) {
      return { success: true, uploaded: false };
    }
    const data = ocrLogSheet.getDataRange().getValues();
    // ค้นหาจากล่างขึ้นบน (ข้อมูลล่าสุด)
    for (let i = data.length - 1; i > 0; i--) {
      const row = data[i];
      const ocrDate = Utilities.formatDate(new Date(row[1]), Session.getScriptTimeZone(), 'yyyy-MM-dd');
      if (ocrDate === checkDate && row[10] === 'success') { // คอลัมน์ที่ 10 คือ ocr_status
        const fileName = row[2].substring(row[2].lastIndexOf('/') + 1);
        return { success: true, uploaded: true, fileName: fileName };
      }
    }
    return { success: true, uploaded: false };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}


function getOcrBatchForEditing(sheetId, ocrId) {
  try {
    const storeSheet = SpreadsheetApp.openById(sheetId);
    const logSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.OCR_LOG);
    const itemsSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.OCR_ITEMS);
    const productsSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.PRODUCTS);

    // หาข้อมูลหลักจาก Log
    const logData = logSheet.getDataRange().getValues();
    let logRow = null;
    for (let i = 1; i < logData.length; i++) {
      if (logData[i][0] === ocrId) {
        logRow = logData[i];
        break;
      }
    }
    if (!logRow) throw new Error("OCR Log not found for ID: " + ocrId);

    // ✅ เพิ่ม: สร้าง productMap จาก Products sheet
    const productsData = productsSheet.getDataRange().getValues();
    const productMap = {};
    for (let i = 1; i < productsData.length; i++) {
      const row = productsData[i];
      productMap[row[1]] = {
        product_name: row[2],
        category: row[3],
        unit: row[4]
      };
    }

    // รวบรวม Items ทั้งหมดที่เกี่ยวข้อง
    const itemsData = itemsSheet.getDataRange().getValues();
    const results = [];
    for (let i = 1; i < itemsData.length; i++) {
      if (itemsData[i][1] === ocrId) {
        const itemRow = itemsData[i];
        const productCode = itemRow[3];
        const masterProduct = productMap[productCode];

        // ✅ แก้ไข: ใช้ข้อมูลจาก Products sheet (master)
        results.push({
          product_code: productCode,
          product_name: masterProduct ? masterProduct.product_name : itemRow[4],
          quantity: itemRow[5],
          unit: masterProduct ? masterProduct.unit : itemRow[6],
          category: masterProduct ? masterProduct.category : '',  // ✅ เพิ่ม category
          status: itemRow[7] || 'verified'
        });
      }
    }

    const fileName = logRow[2].substring(logRow[2].lastIndexOf('/') + 1);

    return {
      success: true,
      data: {
        ocr_id: ocrId,
        results: results,
        ocr_date: Utilities.formatDate(new Date(logRow[1]), Session.getScriptTimeZone(), 'dd-MM-yyyy'),  // ✅ แก้รูปแบบวันที่
        file_name: fileName,
        stats: {  // ✅ เพิ่ม stats
          totalItems: results.length,
          verifiedItems: results.filter(r => r.status === 'verified').length,
          unmatchedItems: results.filter(r => r.status === 'unmatched').length
        }
      }
    };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * Helper function to find a subfolder by name within a parent folder, or create it if it doesn't exist.
 * @param {Folder} parentFolder The parent Google Drive folder.
 * @param {string} subFolderName The name of the subfolder to find or create.
 * @return {Folder} The found or created subfolder.
 */
function getOrCreateSubFolder(parentFolder, subFolderName) {
  const subFolders = parentFolder.getFoldersByName(subFolderName);
  if (subFolders.hasNext()) {
    // ถ้าเจอโฟลเดอร์แล้ว ให้ return โฟลเดอร์นั้นไปเลย
    console.log(`Subfolder "${subFolderName}" already exists.`);
    return subFolders.next();
  } else {
    // ถ้ายังไม่มี ให้สร้างใหม่
    console.log(`Creating new subfolder: "${subFolderName}"...`);
    return parentFolder.createFolder(subFolderName);
  }
}






// ==========================================
// AI PROVIDER ROUTER
// ==========================================







/**
 * อ่าน Expected Categories จากชีต Settings ของสาขา
 */
function getExpectedCategories(sheetId) {
  try {
    const storeSheet = SpreadsheetApp.openById(sheetId);
    const settingsSheet = storeSheet.getSheetByName('Settings');

    if (!settingsSheet) {
      Logger.log('Settings sheet not found, using default categories');
      return getDefaultCategories();
    }

    const data = settingsSheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0] === 'EXPECTED_CATEGORIES') {
        try {
          const categories = JSON.parse(row[1]);
          if (Array.isArray(categories) && categories.length > 0) {
            Logger.log(`Loaded ${categories.length} categories from Settings`);
            return categories;
          }
        } catch (e) {
          Logger.log('Error parsing categories:', e);
        }
      }
    }

    Logger.log('Using default categories');
    return getDefaultCategories();

  } catch (error) {
    Logger.log('Error getting categories:', error);
    return getDefaultCategories();
  }
}

/**
 * Default Categories
 */
function getDefaultCategories() {
  return [
    'MAT-Aperitif', 'MAT-Beer', 'MAT-Bitter', 'MAT-Bourbon',
    'MAT-Brandy', 'MAT-Champagne', 'MAT-General', 'MAT-Gin',
    'MAT-Juice', 'MAT-Lique', 'MAT-Other', 'MAT-Rum',
    'MAT-Singal Malt', 'MAT-Soft Drink', 'MAT-Sparkling wine',
    'MAT-Syrup', 'MAT-Tequila', 'MAT-Vodka', 'MAT-Whisky',
    'MAT-Wine', 'MAT-แม่บ้าน'
  ];
}

/**
 * บันทึก Expected Categories
 */
function saveExpectedCategories(sheetId, categories) {
  try {
    const storeSheet = SpreadsheetApp.openById(sheetId);
    let settingsSheet = storeSheet.getSheetByName('Settings');

    if (!settingsSheet) {
      settingsSheet = storeSheet.insertSheet('Settings');
      const headers = ['setting_key', 'setting_value', 'setting_type', 'description'];
      settingsSheet.getRange(1, 1, 1, 4).setValues([headers]);
      settingsSheet.getRange(1, 1, 1, 4)
        .setFontWeight('bold')
        .setBackground('#4285f4')
        .setFontColor('#ffffff');
    }

    if (!Array.isArray(categories) || categories.length === 0) {
      return { success: false, message: 'Invalid categories' };
    }

    const categoriesJson = JSON.stringify(categories);
    const data = settingsSheet.getDataRange().getValues();
    let rowIndex = -1;

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === 'EXPECTED_CATEGORIES') {
        rowIndex = i + 1;
        break;
      }
    }

    const newRow = [
      'EXPECTED_CATEGORIES',
      categoriesJson,
      'json',
      `Expected categories (${categories.length} total)`
    ];

    if (rowIndex > 0) {
      settingsSheet.getRange(rowIndex, 1, 1, 4).setValues([newRow]);
    } else {
      settingsSheet.appendRow(newRow);
    }

    Logger.log(`Saved ${categories.length} categories`);
    return {
      success: true,
      message: `Saved ${categories.length} categories`,
      categories: categories
    };

  } catch (error) {
    Logger.log('Error saving categories:', error);
    return { success: false, message: error.toString() };
  }
}




function initializeExpectedCategories(sheetId) {
  try {
    const storeSheet = SpreadsheetApp.openById(sheetId);
    let settingsSheet = storeSheet.getSheetByName('Settings');

    // ถ้าไม่มี Settings sheet เลย → สร้างใหม่พร้อม categories
    if (!settingsSheet) {
      Logger.log('Settings sheet not found. Creating with default categories...');
      const defaultCategories = getDefaultCategories();
      return saveExpectedCategories(sheetId, defaultCategories);
    }

    // มี Settings sheet แล้ว → ตรวจสอบว่ามี row EXPECTED_CATEGORIES หรือไม่
    const data = settingsSheet.getDataRange().getValues();
    let foundCategories = false;

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === 'EXPECTED_CATEGORIES') {
        foundCategories = true;
        break;
      }
    }

    // ถ้าไม่เจอ row EXPECTED_CATEGORIES → สร้างใหม่
    if (!foundCategories) {
      Logger.log('Settings sheet exists but EXPECTED_CATEGORIES not found. Adding default categories...');
      const defaultCategories = getDefaultCategories();
      return saveExpectedCategories(sheetId, defaultCategories);
    }

    // มี row EXPECTED_CATEGORIES แล้ว → ข้าม
    const currentCategories = getExpectedCategories(sheetId);
    return {
      success: true,
      message: 'Categories already exist',
      categories: currentCategories
    };

  } catch (error) {
    Logger.log('Error in initializeExpectedCategories: ' + error.toString());
    return {
      success: false,
      message: error.toString()
    };
  }
}





/**
 * Backend Functions สำหรับ Category Management UI
 * รับ sheetId โดยตรงจาก Frontend
 */

function getCurrentCategoriesForUI(sheetId) {
  if (!sheetId) {
    return {
      success: false,
      message: 'Sheet ID is required'
    };
  }

  try {
    const categories = getExpectedCategories(sheetId);

    return {
      success: true,
      categories: categories,
      json: JSON.stringify(categories, null, 2)
    };
  } catch (error) {
    return {
      success: false,
      message: error.toString()
    };
  }
}

function saveCategoriesFromUI(sheetId, jsonString) {
  if (!sheetId) {
    return {
      success: false,
      message: 'Sheet ID is required'
    };
  }

  try {
    const categories = JSON.parse(jsonString);

    if (!Array.isArray(categories)) {
      return {
        success: false,
        message: 'Categories must be an array'
      };
    }

    return saveExpectedCategories(sheetId, categories);

  } catch (error) {
    return {
      success: false,
      message: error.toString()
    };
  }
}

function getDefaultCategoriesForUI() {
  // ฟังก์ชันนี้ไม่ต้องใช้ sheetId เพราะ return default ค่าเดียวกันเสมอ
  return {
    success: true,
    categories: getDefaultCategories()
  };
}





function viewBatchLogs(sheetId, limit = 50) {
  try {
    const ss = SpreadsheetApp.openById(sheetId);
    const logSheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);

    if (!logSheet) {
      Logger.log('No log sheet found');
      return;
    }

    const data = logSheet.getDataRange().getValues();
    const batchLogs = [];

    // กรองเฉพาะ log ที่เกี่ยวกับ batch
    for (let i = data.length - 1; i > 0 && batchLogs.length < limit; i--) {
      const row = data[i];
      const logType = row[1];

      if (logType === 'BATCH' || logType === 'BATCH_RESULT' || logType === 'SUCCESS') {
        batchLogs.push({
          timestamp: row[0],
          type: row[1],
          message: row[2],
          data: row[3] ? JSON.parse(row[3]) : null
        });
      }
    }

    // แสดงผล
    Logger.log('=== RECENT BATCH LOGS ===');
    batchLogs.reverse().forEach(log => {
      Logger.log(`[${log.timestamp}] ${log.type}: ${log.message}`);
      if (log.data) {
        Logger.log('  Data:', JSON.stringify(log.data, null, 2));
      }
      Logger.log('---');
    });

    return batchLogs;

  } catch (error) {
    Logger.log('Error viewing logs:', error);
  }
}























function parseOcrText(rawText) {
  const items = [];
  const lines = rawText.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const categoryPrefix = 'MAT-';
  let currentCategory = 'Unknown';
  const foundCodes = new Set();

  console.log(`Total lines to parse: ${lines.length}`);

  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i];

    // อัพเดทหมวดหมู่เมื่อเจอ "หมวดสินค้า :"
    if (currentLine.includes('หมวดสินค้า') && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      if (nextLine.startsWith(categoryPrefix)) {
        currentCategory = nextLine;
        console.log(`Category updated to: ${currentCategory}`);
      }
      continue;
    }

    // เช็คว่าบรรทัดนี้เป็นชื่อหมวดหมู่เฉยๆ หรือไม่
    if (currentLine.startsWith(categoryPrefix)) {
      currentCategory = currentLine;
      continue;
    }

    // เช็คว่าบรรทัดนี้เป็นรหัสสินค้าหรือไม่
    const codeMatch = currentLine.match(/^(M\d+)$/);
    if (!codeMatch) continue;

    const productCode = codeMatch[1];

    // ข้ามถ้าเจอซ้ำ
    if (foundCodes.has(productCode)) continue;

    // ข้ามบรรทัดสรุป "Total of"
    if (i + 1 < lines.length && lines[i + 1].startsWith('Total of')) {
      continue;
    }

    // รวบรวมบรรทัดถัดไปไว้ดูบริบท (สูงสุด 12 บรรทัด)
    const contextLines = [];
    for (let j = 1; j <= 12 && (i + j) < lines.length; j++) {
      const line = lines[i + j];
      // หยุดถ้าเจอรหัสสินค้าตัวถัดไป หรือหมวดหมู่ใหม่
      if (line.match(/^M\d+$/) || line.startsWith(categoryPrefix) || line.includes('หมวดสินค้า')) {
        break;
      }
      contextLines.push(line);
    }

    // แยกข้อมูลสินค้า
    const extractedData = extractProductData(productCode, contextLines);

    const item = {
      product_code: productCode,
      product_name: extractedData.productName,
      quantity: extractedData.quantity,
      unit: extractedData.unit,
      category: currentCategory
    };

    items.push(item);
    foundCodes.add(productCode);

    console.log(`Parsed: Code=${productCode}, Name="${extractedData.productName}", Qty=${extractedData.quantity}, Unit=${extractedData.unit}, Cat=${currentCategory}`);
  }

  console.log(`Total items parsed: ${items.length}`);
  return items;
}



function extractProductData(productCode, contextLines) {
  let productName = '';
  let quantity = 0;
  let unit = 'pcs';

  // Dictionary สำหรับสินค้าพิเศษที่มีตัวเลขในชื่อ
  const SPECIAL_PRODUCTS = {
    'M0100': { namePattern: '1757 Rosso', hasNumber: 1757 },
    'M0111': { namePattern: '1757 Extra Dry', hasNumber: 1757 },
    'M00018': { namePattern: 'Jose Cuervo Reposado', hasNumber: null },
    'M0019': { namePattern: '1800 Tequila Cristalino', hasNumber: 1800 },
    'M0021': { namePattern: '818 Reposado', hasNumber: 818 },
    'M0022': { namePattern: '818 Anejo', hasNumber: 818 },
    'M0023': { namePattern: 'Eight Reserve by 818', hasNumber: 818 },
    'M0025': { namePattern: 'Don Julio 1942', hasNumber: 1942 }
  };

  const isSpecialProduct = SPECIAL_PRODUCTS[productCode];

  // === STEP 1: หาชื่อสินค้า ===
  for (let idx = 0; idx < Math.min(3, contextLines.length); idx++) {
    const line = contextLines[idx];

    if (!line || line.length === 0) continue;

    // ถ้าบรรทัดนี้เป็นตัวเลขล้วนๆ ให้ข้าม
    if (/^-?\d+\.?\d*$/.test(line)) continue;

    // ถ้าบรรทัดนี้ขึ้นต้นด้วย bottle, can, pcs ฯลฯ
    if (/^(bottle|can|pcs|kg|L|ขวด|กระป๋อง|แพ็ค|ถัง|กล่อง|Bottle|Can)\s*\(/i.test(line)) {
      if (!productName && idx > 0) {
        productName = contextLines[idx - 1];
      }
      break;
    }

    // ถ้าบรรทัดนี้เป็นรูปแบบ "จำนวน หน่วย"
    if (/^-?\d+\.?\d*\s+(bottle|can|pcs|Bottle)/i.test(line)) {
      if (!productName && idx > 0) {
        productName = contextLines[idx - 1];
      }
      break;
    }

    // ถ้ายังไม่พบชื่อ และบรรทัดนี้ดูเหมือนชื่อสินค้า
    if (!productName && line.length > 2 && !/^Total of/.test(line)) {
      productName = line;
    }
  }

  // === STEP 2: หาจำนวนและหน่วย ===
  for (let idx = 0; idx < contextLines.length; idx++) {
    const line = contextLines[idx];

    // Pattern 1: "จำนวน หน่วย" ในบรรทัดเดียวกัน
    const qtyUnitMatch = line.match(/^(-?\d+\.?\d*)\s+(.+)/);
    if (qtyUnitMatch) {
      const potentialQty = parseFloat(qtyUnitMatch[1]);
      const potentialUnit = qtyUnitMatch[2];

      // เช็คว่าเป็นจำนวนที่สมเหตุสมผลหรือไม่
      const isYearLike = potentialQty >= 1700 && potentialQty <= 2100;
      const isSpecialNumber = isSpecialProduct && isSpecialProduct.hasNumber === potentialQty;

      if (!isYearLike && !isSpecialNumber) {
        if (/bottle|can|pcs|kg|L|ขวด|กระป๋อง|แพ็ค|ถัง|กล่อง|Bottle|Can|\(/i.test(potentialUnit)) {
          quantity = potentialQty;
          unit = cleanUnit(potentialUnit);
          break;
        }
      } else if (isSpecialNumber) {
        console.log(`Skipping special number ${potentialQty} for product ${productCode}`);
        continue;
      }
    }

    // Pattern 2: ตัวเลขเดี่ยวๆ แล้วบรรทัดถัดไปเป็นหน่วย
    const soloNumberMatch = line.match(/^(-?\d+\.?\d*)$/);
    if (soloNumberMatch && quantity === 0) {
      const potentialQty = parseFloat(soloNumberMatch[1]);

      const isYearLike = potentialQty >= 1700 && potentialQty <= 2100;
      const isSpecialNumber = isSpecialProduct && isSpecialProduct.hasNumber === potentialQty;

      if (!isYearLike && !isSpecialNumber && Math.abs(potentialQty) <= 10000) {
        if (idx + 1 < contextLines.length) {
          const nextLine = contextLines[idx + 1];
          if (/^(bottle|can|pcs|kg|L|ขวด|กระป๋อง|แพ็ค|ถัง|กล่อง|Bottle|Can|\()/i.test(nextLine)) {
            quantity = potentialQty;
            unit = cleanUnit(nextLine);
            break;
          }
        }
      }
    }
  }

  // === STEP 3: ทำความสะอาดและ validation ===

  if (!productName || productName === '' || /^-?\d+\.?\d*$/.test(productName)) {
    productName = 'Unknown';
  }

  // สำหรับสินค้าพิเศษ ให้แน่ใจว่าชื่อถูกต้อง
  if (isSpecialProduct && (productName === 'Unknown' || !productName.includes(String(isSpecialProduct.hasNumber || '')))) {
    productName = isSpecialProduct.namePattern;
  }

  // ปัดเศษจำนวนให้เหลือ 2 ทศนิยม
  quantity = Math.round(quantity * 100) / 100;

  return {
    productName: productName,
    quantity: quantity,
    unit: unit
  };
}


function cleanUnit(unitText) {
  if (!unitText) return 'pcs';

  // ตัดเอาส่วนแรกที่มี bottle, can, etc.
  const match = unitText.match(/(bottle|can|pcs|kg|L|ขวด|กระป๋อง|แพ็ค|ถัง|กล่อง|Bottle|Can)(\([^\)]+\))?/i);
  if (match) {
    return match[0];
  }

  // ถ้าไม่เจอ ให้คืนค่าทั้งหมดแต่ตัดเอาแค่ 30 ตัวอักษรแรก
  return unitText.substring(0, 30).trim();
}





/**
 * ✅ NEW FUNCTION - uploadAndProcessTXT()
 * Upload TXT file to Google Drive and parse its content
 */
function uploadAndProcessTXT(sheetId, txtContent, fileName, uploadDate, includeZeroQty) {
  try {
    console.log('--- uploadAndProcessTXT started ---');
    console.log('sheetId:', sheetId);
    console.log('fileName:', fileName);
    console.log('uploadDate:', uploadDate);
    console.log('includeZeroQty:', includeZeroQty);

    // 1. Upload TXT file to Google Drive
    const blob = Utilities.newBlob(txtContent, 'text/plain', fileName);
    const parentFolder = DriveApp.getFileById(sheetId).getParents().next();

    let txtFolder;
    const folderIterator = parentFolder.getFoldersByName('TXT_Uploads');
    if (folderIterator.hasNext()) {
      txtFolder = folderIterator.next();
    } else {
      txtFolder = parentFolder.createFolder('TXT_Uploads');
    }

    const file = txtFolder.createFile(blob);
    const driveFileId = file.getId();
    const driveFileUrl = file.getUrl();

    console.log('Uploaded TXT file to Drive ID:', driveFileId);
    console.log('File URL:', driveFileUrl);

    // 2. Parse TXT content
    const parseResult = parseTXTForVerification(sheetId, txtContent, fileName, true);

    if (parseResult.success) {
      parseResult.ocr_date = uploadDate;
      parseResult.file_url = driveFileUrl;
      parseResult.file_id = driveFileId;
      parseResult.file_name = fileName;
      parseResult.userSelectedIncludeZeroQty = includeZeroQty;

      if (!parseResult.stats) {
        parseResult.stats = {};
      }
      if (!parseResult.stats.processTime) {
        parseResult.stats.processTime = 0;
      }

      console.log('TXT parsing completed. Results:', parseResult.results.length, 'items');
    }

    console.log('--- uploadAndProcessTXT finished ---');
    return parseResult;
  } catch (error) {
    console.error('!!! ERROR in uploadAndProcessTXT !!!', error);
    return {
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ' + error.message
    };
  }
}


/**
 * ✅ NEW FUNCTION - parseTXTForVerification()
 * Parse TXT file content and verify against master product list
 */
function parseTXTForVerification(sheetId, txtContent, fileName, includeZeroQty) {
  try {
    logDetail(sheetId, 'START', 'Parsing TXT', {
      fileName: fileName,
      includeZeroQty: includeZeroQty
    });

    const lines = txtContent.split('\n');
    const extractedItems = [];
    let currentCategory = '';

    // Parse TXT file line by line
    for (let i = 6; i < lines.length - 2; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Check for category line (รองรับ 2 รูปแบบ)
      // รูปแบบที่ 1: MAT-Aperitif (บรรทัดขึ้นต้นด้วย MAT-)
      if (line.startsWith('MAT-')) {
        currentCategory = line;
        continue;
      }
      // รูปแบบที่ 2: หมวดสินค้า : [TAB] MAT-Aperitif (MAT- อยู่ในคอลัมน์ถัดไป)
      else if (line.includes('\t') && line.includes('MAT-')) {
        const columns = line.split('\t');
        for (const col of columns) {
          const trimmedCol = col.trim();
          if (trimmedCol.startsWith('MAT-')) {
            currentCategory = trimmedCol;
            break;
          }
        }
        continue;
      }

      // Skip summary lines
      if (line.startsWith('รวม') || line.startsWith('Total')) continue;

      // Split by tab
      const columns = line.split('\t');
      if (columns.length < 4) continue;

      const productCode = columns[0].trim();
      const productName = columns[1].trim();
      const quantityStr = columns[2].trim();
      const unit = columns[3].trim();

      // Only process lines that start with M (product code)
      if (productCode && productCode.startsWith('M')) {
        const quantity = parseFloat(quantityStr.replace(/,/g, '')) || 0;

        extractedItems.push({
          product_code: productCode,
          product_name: productName,
          quantity: quantity,
          unit: unit,
          category: currentCategory
        });
      }
    }

    logDetail(sheetId, 'EXTRACTED', `Got ${extractedItems.length} items from TXT`, { itemCount: extractedItems.length });

    // Verify against master product list
    const ss = SpreadsheetApp.openById(sheetId);
    const productsSheet = ss.getSheetByName(CONFIG.STORE_SHEETS.PRODUCTS);
    const productsData = productsSheet.getDataRange().getValues();
    const productMap = {};

    for (let i = 1; i < productsData.length; i++) {
      const row = productsData[i];
      productMap[row[1]] = { product_name: row[3], category: row[4], unit: row[5] };
    }

    logDetail(sheetId, 'INFO', `Master has ${Object.keys(productMap).length} products`);

    const allResults = [];
    const zeroQtyProducts = [];
    let verifiedCount = 0;
    let unmatchedCount = 0;
    let zeroQtyCount = 0;

    for (const item of extractedItems) {
      const quantity = parseFloat(item.quantity) || 0;
      const masterProduct = productMap[item.product_code];

      let resultItem;
      let warnings = [];

      if (masterProduct) {
        // ⭐ เช็คความไม่สอดคล้อง
        if (item.product_name.trim() !== masterProduct.product_name.trim()) {
          warnings.push({
            field: 'product_name',
            fileValue: item.product_name,
            masterValue: masterProduct.product_name,
            message: `ชื่อสินค้าไม่ตรงกัน: ไฟล์="${item.product_name}" vs Master="${masterProduct.product_name}"`
          });
        }

        if (item.category && item.category.trim() !== masterProduct.category.trim()) {
          warnings.push({
            field: 'category',
            fileValue: item.category,
            masterValue: masterProduct.category,
            message: `หมวดหมู่ไม่ตรงกัน: ไฟล์="${item.category}" vs Master="${masterProduct.category}"`
          });
        }

        if (item.unit.trim() !== masterProduct.unit.trim()) {
          warnings.push({
            field: 'unit',
            fileValue: item.unit,
            masterValue: masterProduct.unit,
            message: `หน่วยไม่ตรงกัน: ไฟล์="${item.unit}" vs Master="${masterProduct.unit}"`
          });
        }

        resultItem = {
          product_code: item.product_code,
          product_name: masterProduct.product_name,
          quantity: quantity,
          unit: masterProduct.unit,
          category: masterProduct.category,
          status: 'verified',
          warnings: warnings,
          hasWarning: warnings.length > 0,
          fileData: {
            product_name: item.product_name,
            category: item.category,
            unit: item.unit
          }
        };
        if (quantity > 0) verifiedCount++;
      } else {
        resultItem = {
          product_code: item.product_code,
          product_name: item.product_name,
          quantity: quantity,
          unit: item.unit || '',
          category: item.category || '',
          status: 'unmatched',
          warnings: [],
          hasWarning: false
        };
        if (quantity > 0) unmatchedCount++;
      }

      allResults.push(resultItem);

      if (quantity === 0) {
        zeroQtyProducts.push(item);
        zeroQtyCount++;
      }
    }

    logDetail(sheetId, 'COMPLETE', 'TXT parsing complete, returning all items.', {
      total: allResults.length,
      verified: verifiedCount,
      unmatched: unmatchedCount,
      zeroQty: zeroQtyCount
    });

    return {
      success: true,
      file_name: fileName,
      ocr_date: new Date().toISOString().split('T')[0],
      results: allResults,
      zeroQtyProducts: zeroQtyProducts,
      stats: {
        totalItems: allResults.length,
        verifiedItems: verifiedCount,
        unmatchedItems: unmatchedCount,
        zeroQtyItems: zeroQtyCount
      }
    };
  } catch (error) {
    logDetail(sheetId, 'ERROR', 'Fatal error in TXT parsing', { error: error.toString(), stack: error.stack });
    return { success: false, message: error.toString() };
  }
}






function saveVerifiedOcrData(sheetId, verifiedData, uploadedBy) {
  try {
    console.log('--- Starting saveVerifiedOcrData ---');
    console.log('Received sheetId:', sheetId);
    console.log('Uploaded by:', uploadedBy);
    console.log('Received verifiedData:', JSON.stringify(verifiedData, null, 2));

    const storeSheet = SpreadsheetApp.openById(sheetId);
    const ocrLogSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.OCR_LOG);
    const ocrItemsSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.OCR_ITEMS);
    const productsSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.PRODUCTS);

    // ===== 1. ดึงรหัสสินค้าทั้งหมดที่มีอยู่แล้ว =====
    const productsData = productsSheet.getDataRange().getValues();
    const existingProductCodes = new Set();
    for (let i = 1; i < productsData.length; i++) {
      existingProductCodes.add(productsData[i][1]);
    }
    console.log(`Found ${existingProductCodes.size} existing product codes in the "Products" sheet.`);

    // ===== 2. เตรียมรายการสินค้าใหม่ที่จะเพิ่ม =====
    const newProductsToAdd = [];
    console.log('--- Checking for new products to add from verified results ---');

    verifiedData.results.forEach((item, index) => {
      console.log(`[Item ${index}] Checking product code: ${item.product_code}`);

      const isNew = !existingProductCodes.has(item.product_code);
      const hasRequiredData = item.product_code && item.product_name && item.unit && item.category;

      console.log(`[Item ${index}] Is it new? ${isNew}, Has required data? ${hasRequiredData}`);

      if (isNew && hasRequiredData) {
        console.log(`[Item ${index}] ---> SUCCESS: This is a new product. Preparing to add.`);

        // ✅ แก้ไข: ลบการตรวจสอบ includeZeroQty ออก
        // ใช้ logic ง่ายๆ: qty=0 → active=false, qty>0 → active=true
        const newProductRow = [
          Utilities.getUuid(),      // product_id
          item.product_code,        // product_code
          '',                       // barcode
          item.product_name,        // product_name
          item.category,            // category
          item.unit,                // unit
          0,                        // cost_price
          0,                        // selling_price
          0,                        // min_stock
          '',                       // image_url
          (item.quantity === 0) ? false : true,  // ✅ แก้ไข: ถ้า qty=0 → active=false, ไม่เช่นนั้น → active=true
          'active'                  // count_status = 'active'
        ];
        newProductsToAdd.push(newProductRow);
        existingProductCodes.add(item.product_code);
      } else {
        console.log(`[Item ${index}] ---> SKIPPED: This product is either old or missing required data.`);
      }
    });
    console.log('--- Finished checking products from verified results ---');

    // ===== 3. เพิ่มสินค้าใหม่ทั้งหมดลงในชีต Products (ถ้ามี) =====
    console.log(`Found ${newProductsToAdd.length} new products to add to the sheet.`);
    if (newProductsToAdd.length > 0) {
      const startRow = productsSheet.getLastRow() + 1;
      const numRows = newProductsToAdd.length;
      const numCols = newProductsToAdd[0].length;
      productsSheet.getRange(startRow, 1, numRows, numCols).setValues(newProductsToAdd);
      console.log(`SUCCESS: Added ${newProductsToAdd.length} new products to the "Products" sheet.`);
    }

    // ===== 4. บันทึก Log และ Items =====
    let ocrId = verifiedData.ocr_id;
    const timestamp = new Date();

    if (ocrId) {
      console.log(`Editing existing OCR batch with ID: ${ocrId}`);
      const itemsData = ocrItemsSheet.getDataRange().getValues();
      const rowsToDelete = [];
      for (let i = itemsData.length - 1; i > 0; i--) {
        if (itemsData[i][1] === ocrId) {
          rowsToDelete.push(i + 1);
        }
      }
      rowsToDelete.forEach(rowNum => ocrItemsSheet.deleteRow(rowNum));
    } else {
      ocrId = Utilities.getUuid();
      console.log(`Creating new OCR Log with ID: ${ocrId}`);
      ocrLogSheet.appendRow([
        ocrId,
        verifiedData.ocr_date,
        verifiedData.file_url || '',
        verifiedData.file_id || '',
        '',
        verifiedData.results.length,
        verifiedData.results.length,
        0,
        uploadedBy,
        timestamp,
        'success',
        verifiedData.stats.processTime || 0
      ]);
    }

    // กรองเอาเฉพาะรายการที่มี qty ไม่เท่ากับ 0 เพื่อบันทึกลง OCR_Items
    const itemsToSave = verifiedData.results.filter(item => item.quantity !== 0).map(item => [
      Utilities.getUuid(),
      ocrId,
      verifiedData.ocr_date,
      item.product_code,
      item.product_name,
      item.quantity,
      item.unit,
      item.status,
      item.confidence || 0.95
    ]);

    if (itemsToSave.length > 0) {
      console.log(`Saving ${itemsToSave.length} items (qty !== 0) to "OCR_Items" sheet.`);
      ocrItemsSheet.getRange(ocrItemsSheet.getLastRow() + 1, 1, itemsToSave.length, itemsToSave[0].length).setValues(itemsToSave);
    }

    // ===== 5. จัดการสินค้า qty = 0 → ปิด active =====
    console.log('--- Processing zero quantity products ---');
    const zeroQtyProducts = verifiedData.zeroQtyProducts || [];
    console.log(`Found ${zeroQtyProducts.length} products with zero quantity from original OCR data`);

    if (zeroQtyProducts.length > 0) {
      let deactivatedCount = 0;
      const currentProductsData = productsSheet.getDataRange().getValues();

      zeroQtyProducts.forEach(zeroItem => {
        const productCode = zeroItem.product_code;
        console.log(`[Zero Qty] Checking product: ${productCode}`);

        for (let i = 1; i < currentProductsData.length; i++) {
          const row = currentProductsData[i];
          const code = row[1];           // product_code
          const isActive = row[10];      // active

          if (code === productCode) {
            if (isActive === true) {
              console.log(`[Zero Qty] DEACTIVATING existing product: ${productCode}`);
              productsSheet.getRange(i + 1, 11).setValue(false);
              logAudit(sheetId, 'AUTO_DEACTIVATE', CONFIG.STORE_SHEETS.PRODUCTS,
                row[0], { active: true, reason: 'Zero quantity in OCR' }, { active: false });
              deactivatedCount++;
            }
            break;
          }
        }
      });
      console.log(`--- Finished processing zero qty products: ${deactivatedCount} products deactivated ---`);
    }

    // ===== 6. ✅ เพิ่มใหม่: จัดการสินค้า qty > 0 → เปิด active กลับมา =====
    console.log('--- Processing products with quantity > 0 ---');
    const productsWithStock = verifiedData.results.filter(item => item.quantity > 0);

    if (productsWithStock.length > 0) {
      let reactivatedCount = 0;
      const currentProductsData = productsSheet.getDataRange().getValues();

      productsWithStock.forEach(stockItem => {
        const productCode = stockItem.product_code;

        for (let i = 1; i < currentProductsData.length; i++) {
          const row = currentProductsData[i];
          const code = row[1];           // product_code
          const isActive = row[10];      // active

          // ถ้าเจอสินค้าที่ active = false → เปิดกลับมา
          if (code === productCode && isActive === false) {
            console.log(`[Reactivate] Product ${productCode} has stock (${stockItem.quantity}), reactivating...`);

            productsSheet.getRange(i + 1, 11).setValue(true); // active = true
            reactivatedCount++;

            logAudit(sheetId, 'AUTO_REACTIVATE', CONFIG.STORE_SHEETS.PRODUCTS,
              row[0], { active: false }, { active: true, reason: 'Stock returned' });
            break;
          }
        }
      });

      console.log(`--- Finished processing stock: ${reactivatedCount} products reactivated ---`);
    }

    // ===== 7. Auto-compare (ถ้าเปิดใช้งาน) =====
    const settings = getSettings(storeSheet.getSheetByName(CONFIG.STORE_SHEETS.SETTINGS));
    if (String(settings.auto_compare) === 'true') {
      Logger.log('Auto-compare is enabled. Checking if manual count exists for this date...');

      if (doesManualCountExist(sheetId, verifiedData.ocr_date)) {
        Logger.log('Manual count found! Triggering comparison from OCR save...');
        compareWithOCR(sheetId, verifiedData.ocr_date);
      } else {
        Logger.log('Manual count not yet submitted. Skipping comparison until then.');
      }
    }

    console.log('--- saveVerifiedOcrData finished successfully ---');
    return { success: true, ocr_id: ocrId };

  } catch (error) {
    console.error('!!! ERROR in saveVerifiedOcrData !!!', error);
    return { success: false, message: error.toString() };
  }
}




/**
 * Helper function to check if a manual count for a specific date exists.
 * @param {string} sheetId The ID of the store's spreadsheet.
 * @param {string} date The date to check in 'yyyy-MM-dd' format.
 * @returns {boolean} True if a count exists for the date, false otherwise.
 */
function doesManualCountExist(sheetId, date) {
  try {
    const storeSheet = SpreadsheetApp.openById(sheetId);
    const manualCountSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.MANUAL_COUNT);
    if (!manualCountSheet) return false;

    const data = manualCountSheet.getRange('B:B').getValues(); // อ่านเฉพาะคอลัมน์วันที่เพื่อความรวดเร็ว
    const timeZone = Session.getScriptTimeZone();

    for (let i = 1; i < data.length; i++) { // เริ่มจากแถวที่ 2 (ข้าม Header)
      const rowDate = data[i][0];
      if (rowDate) {
        const dateStr = (rowDate instanceof Date)
          ? Utilities.formatDate(rowDate, timeZone, 'yyyy-MM-dd')
          : rowDate.toString().substring(0, 10);
        if (dateStr === date) {
          return true; // เจอข้อมูลของวันที่ตรงกันแล้ว
        }
      }
    }
    return false; // วนลูปจนจบแล้วไม่เจอ
  } catch (e) {
    Logger.log(`Error in doesManualCountExist: ${e.message}`);
    return false;
  }
}




function extractDateFromPDF(fileName) {
  // Extract date from filename pattern like "POS_20250928.pdf"
  const match = fileName.match(/(\d{8})/);
  if (match) {
    const dateStr = match[1];
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${year}-${month}-${day}`;
  }
  return new Date().toISOString().split('T')[0];
}

// ===================================
// COMPARISON FUNCTIONS
// ===================================

/**
 * เปรียบเทียบข้อมูลระหว่าง Manual Count และ OCR Items, บันทึกผลลงชีต Comparison,
 * และส่ง Line Notify สรุปผลไปยังกลุ่มพนักงาน
 * @param {string} sheetId - ID ของไฟล์ Google Sheet ของสาขา
 * @param {string} compareDate - วันที่ที่ต้องการเปรียบเทียบ (yyyy-MM-dd)
 * @returns {object} ผลลัพธ์การทำงาน
 */
function compareWithOCR(sheetId, compareDate) {
  try {
    const storeSheet = SpreadsheetApp.openById(sheetId);
    const manualSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.MANUAL_COUNT);
    const ocrItemsSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.OCR_ITEMS);
    const comparisonSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.COMPARISON);
    const productsSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.PRODUCTS);

    // 1. สร้าง Map ข้อมูลที่จำเป็นเพื่อการเปรียบเทียบที่รวดเร็ว
    const productStatusMap = new Map();
    const productsData = productsSheet.getDataRange().getValues();
    for (let i = 1; i < productsData.length; i++) {
      const row = productsData[i];
      productStatusMap.set(row[1], { active: row[10], count_status: row[11] });
    }

    const manualCounts = new Map();
    const manualData = manualSheet.getDataRange().getValues();
    for (let i = 1; i < manualData.length; i++) {
      const row = manualData[i];
      const sheetDateString = (row[1] instanceof Date) ? Utilities.formatDate(row[1], Session.getScriptTimeZone(), 'yyyy-MM-dd') : row[1];
      if (sheetDateString === compareDate && row[7] === 'submitted') {
        manualCounts.set(row[2], { product_name: row[3], quantity: parseFloat(row[4]) });
      }
    }

    const ocrCounts = new Map();
    const ocrData = ocrItemsSheet.getDataRange().getValues();
    for (let i = 1; i < ocrData.length; i++) {
      const row = ocrData[i];
      const sheetDateString = (row[2] instanceof Date) ? Utilities.formatDate(row[2], Session.getScriptTimeZone(), 'yyyy-MM-dd') : row[2];
      if (sheetDateString === compareDate) {
        ocrCounts.set(row[3], { product_name: row[4], quantity: parseFloat(row[5]) });
      }
    }

    // 2. ล้างข้อมูลผลการเปรียบเทียบเก่าของวันนั้นๆ ออกก่อน
    const compData = comparisonSheet.getDataRange().getValues();
    const rowsToDelete = [];
    for (let i = compData.length - 1; i > 0; i--) {
      const rowDate = (compData[i][1] instanceof Date) ? Utilities.formatDate(compData[i][1], Session.getScriptTimeZone(), 'yyyy-MM-dd') : compData[i][1];
      if (rowDate === compareDate) {
        rowsToDelete.push(i + 1);
      }
    }
    rowsToDelete.forEach(rowNum => comparisonSheet.deleteRow(rowNum));

    // 3. เริ่ม Logic การเปรียบเทียบข้อมูล
    const allProductCodes = new Set([...manualCounts.keys(), ...ocrCounts.keys()]);
    const comparisonResults = [];
    allProductCodes.forEach(productCode => {
      const pStatus = productStatusMap.get(productCode);
      if (pStatus && pStatus.count_status === 'excluded') return;

      const manualEntry = manualCounts.get(productCode);
      const ocrEntry = ocrCounts.get(productCode);
      const productName = manualEntry?.product_name || ocrEntry?.product_name || 'Unknown Product';

      let rowData = {
        comp_id: Utilities.getUuid(),
        comp_date: compareDate,
        product_code: productCode,
        product_name: productName,
        pos_quantity: null, manual_quantity: null, difference: null, diff_percent: null, status: ''
      };

      if (ocrEntry && !manualEntry) {
        rowData.pos_quantity = ocrEntry.quantity;
        if (pStatus && pStatus.active === false) {
          rowData.status = 'pending_count';
        } else {
          rowData.manual_quantity = 0;
          rowData.difference = 0 - rowData.pos_quantity;
          rowData.status = 'discrepancy';
        }
      } else if (!ocrEntry && manualEntry) {
        rowData.manual_quantity = manualEntry.quantity;
        rowData.pos_quantity = 0;
        rowData.difference = rowData.manual_quantity - 0;
        rowData.status = 'discrepancy';
      } else if (ocrEntry && manualEntry) {
        rowData.pos_quantity = ocrEntry.quantity;
        rowData.manual_quantity = manualEntry.quantity;
        rowData.difference = rowData.manual_quantity - rowData.pos_quantity;
        rowData.status = Math.abs(rowData.difference) < 0.01 ? 'matched' : 'discrepancy';
      }

      if (rowData.difference !== null && rowData.pos_quantity > 0) {
        rowData.diff_percent = (rowData.difference / rowData.pos_quantity) * 100;
      }

      comparisonResults.push([
        rowData.comp_id, rowData.comp_date, rowData.product_code, rowData.product_name,
        rowData.pos_quantity, rowData.manual_quantity, rowData.difference, rowData.diff_percent,
        rowData.status, '', '', '', '', ''
      ]);
    });

    if (comparisonResults.length > 0) {
      comparisonSheet.getRange(comparisonSheet.getLastRow() + 1, 1, comparisonResults.length, comparisonResults[0].length).setValues(comparisonResults);
    }

    // 4. Trigger Line Notification
    const storeInfo = getStoreInfoBySheetId(sheetId);
    const storeSettings = getStoreSettings(sheetId).settings; // ดึงค่า Settings จากชีตของสาขา

    if (storeInfo && storeSettings && storeSettings.group_line_id) {
      const dataForFlex = {
        storeId: storeInfo.id,
        storeName: storeInfo.name,
        date: compareDate,
        notificationText: ''
      };

      const discrepancies = comparisonResults.filter(row => row[8] === 'discrepancy');

      if (discrepancies.length === 0) {
        // กรณีไม่มีผลต่างเลย
        dataForFlex.notificationText = `✅ [${storeInfo.name}] ยอดสต็อกวันที่ ${compareDate} ตรงกันทุกรายการ`;
        sendAppNotification(storeSettings.group_line_id, 'COMPARISON_MATCHED', dataForFlex);
      } else {
        // กรณีมีผลต่าง
        const overItems = discrepancies.filter(row => row[6] > 0);
        const shortItems = discrepancies.filter(row => row[6] < 0);

        if (shortItems.length > 0) {
          dataForFlex.items = shortItems.slice(0, 5).map(row => ({ product_name: row[3], manual_quantity: row[5], pos_quantity: row[4], difference: row[6] }));
          dataForFlex.notificationText = `🔻 [${storeInfo.name}] พบสินค้าขาด ${shortItems.length} รายการ`;
          sendAppNotification(storeSettings.group_line_id, 'COMPARISON_SHORT', dataForFlex);
        }
        if (overItems.length > 0) {
          dataForFlex.items = overItems.slice(0, 5).map(row => ({ product_name: row[3], manual_quantity: row[5], pos_quantity: row[4], difference: row[6] }));
          dataForFlex.notificationText = `🔺 [${storeInfo.name}] พบสินค้าเกิน ${overItems.length} รายการ`;
          sendAppNotification(storeSettings.group_line_id, 'COMPARISON_OVER', dataForFlex);
        }
      }
    }

    return { success: true };

  } catch (error) {
    console.error('Error in compareWithOCR:', error.stack);
    return { success: false, message: error.toString() };
  }
}



/**
 * ฟังก์ชันใหม่: ดึงข้อมูลสรุปผลต่างเป็นรายวันสำหรับหน้า Discrepancy Dashboard
 */
function getDailyComparisonSummary(sheetId) {
  try {
    const storeSheet = SpreadsheetApp.openById(sheetId);
    const comparisonSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.COMPARISON);
    const data = comparisonSheet.getDataRange().getValues();

    const summaryByDate = {};

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const date = (row[1] instanceof Date) ? Utilities.formatDate(row[1], Session.getScriptTimeZone(), 'yyyy-MM-dd') : row[1].toString().substring(0, 10);
      const status = row[8];
      const explanation = row[9] || '';

      // --- [แก้ไข] เปลี่ยน Index จาก 11 เป็น 12 เพื่ออ่านจากคอลัมน์ M ---
      const approvalStatus = row[12] || 'pending';

      if (!summaryByDate[date]) {
        summaryByDate[date] = {
          date: date,
          totalDiscrepancies: 0,
          explainedCount: 0,
          pendingApprovalCount: 0,
          approvedCount: 0,
          rejectedCount: 0
        };
      }

      if (status === 'discrepancy') {
        summaryByDate[date].totalDiscrepancies++;
        if (explanation.trim() !== '') {
          summaryByDate[date].explainedCount++;
        }

        if (approvalStatus === 'approved') {
          summaryByDate[date].approvedCount++;
        } else if (approvalStatus === 'rejected') {
          summaryByDate[date].rejectedCount++;
        } else {
          // หากยังไม่มีการชี้แจง ก็จะถือว่ายังรอตรวจสอบ
          if (explanation.trim() !== '') {
            summaryByDate[date].pendingApprovalCount++;
          }
        }
      }
    }

    const results = Object.values(summaryByDate).sort((a, b) => new Date(b.date) - new Date(a.date));
    return { success: true, summary: results };

  } catch (e) {
    return { success: false, message: e.toString() };
  }
}




/**
 * ฟังก์ชันใหม่: ดึงรายละเอียดของรายการที่ผิดพลาดทั้งหมดในวันที่ระบุ
 */
function getDiscrepancyDetailsForDate(sheetId, date) {
  try {
    // ใช้ฟังก์ชัน getComparisonResults ที่มีอยู่แล้วเพื่อดึงข้อมูล
    const comparisonData = getComparisonResults(sheetId, date);
    if (!comparisonData.success) {
      return comparisonData;
    }

    // กรองเอาเฉพาะรายการที่เป็น 'discrepancy'
    const discrepancies = comparisonData.results.filter(item => item.status === 'discrepancy');

    return { success: true, details: discrepancies };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}




/**
 * ฟังก์ชันใหม่: อัปเดตสถานะการอนุมัติ (Approved/Rejected)
 */
function updateApprovalStatus(sheetId, date, newStatus, ownerName, notes = '') {
  try {
    const storeSheet = SpreadsheetApp.openById(sheetId);
    const comparisonSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.COMPARISON);
    const data = comparisonSheet.getDataRange().getValues();

    for (let i = data.length - 1; i > 0; i--) {
      const row = data[i];
      const rowDate = (row[1] instanceof Date) ? Utilities.formatDate(row[1], Session.getScriptTimeZone(), 'yyyy-MM-dd') : row[1].toString().substring(0, 10);

      if (rowDate === date && row[8] === 'discrepancy') {
        const rowIndex = i + 1;

        // อัปเดตคอลัมน์ approved_by (L = 12)
        comparisonSheet.getRange(rowIndex, 12).setValue(ownerName);

        // อัปเดตคอลัมน์ approval_status (M = 13)
        comparisonSheet.getRange(rowIndex, 13).setValue(newStatus);

        // อัปเดตคอลัมน์ owner_notes (N = 14)
        comparisonSheet.getRange(rowIndex, 14).setValue(notes);
      }
    }

    // เพิ่มส่วนส่ง Line Notification
    const storeInfo = getStoreInfoBySheetId(sheetId);

    // แก้ไข: ใช้ sheetId แทน storeInfo.id
    const storeSettingsResult = getStoreSettings(sheetId);

    // ตรวจสอบโครงสร้าง object ที่ถูกต้อง
    if (storeSettingsResult.success && storeSettingsResult.settings && storeSettingsResult.settings.group_line_id) {
      // ดึงข้อมูลสินค้าที่มีผลต่าง
      const comparisonData = getComparisonResults(sheetId, date);
      const discrepancyItems = comparisonData.results
        .filter(item => item.status === 'discrepancy')
        .slice(0, 5); // แสดงแค่ 5 รายการแรก

      const data = {
        storeId: storeInfo.id,
        storeName: storeInfo.name,
        date: date,
        items: discrepancyItems,
        ownerName: ownerName,
        remark: notes || (newStatus === 'approved' ? 'อนุมัติเรียบร้อย' : 'ไม่อนุมัติ'),
        notificationText: `[${storeInfo.name}] เจ้าของได้${newStatus === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}คำชี้แจงแล้ว`
      };

      // ใช้ eventType ที่เหมาะสม
      const eventType = newStatus === 'approved' ? 'OWNER_APPROVED' : 'OWNER_REJECTED';

      // ส่งไปยังกลุ่มไลน์ของพนักงาน
      sendAppNotification(storeSettingsResult.settings.group_line_id, eventType, data);

      Logger.log(`Line notification sent: ${eventType} to group: ${storeSettingsResult.settings.group_line_id}`);
    } else {
      Logger.log('No group_line_id found for this store or failed to get settings');
      Logger.log('Settings Result:', storeSettingsResult);
    }

    return { success: true, message: 'อัปเดตสถานะและส่งการแจ้งเตือนเรียบร้อยแล้ว' };

  } catch (e) {
    Logger.log(`ERROR in updateApprovalStatus: ${e.toString()}`);
    return { success: false, message: e.toString() };
  }
}



/**
 * =================================================================
 *                     Approval Page
 * =================================================================
 */

/**
 * ดึงข้อมูลสำหรับหน้า Approval Page
 * @param {string} storeId - ID ของสาขาที่มาจาก URL
 * @param {string} date - วันที่ที่ต้องการดูข้อมูล (yyyy-MM-dd)
 * @returns {object} ผลลัพธ์ข้อมูลสำหรับแสดงผล
 */
function getApprovalData(storeId, date) {
  try {
    // 1. ค้นหา sheetId และ storeName จาก Master Sheet
    const masterSheet = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const storesSheet = masterSheet.getSheetByName(CONFIG.MASTER_SHEETS.STORES);
    const storesData = storesSheet.getDataRange().getValues();
    let sheetId = null;
    let storeName = '';

    for (let i = 1; i < storesData.length; i++) {
      // ค้นหา storeId จากคอลัมน์ A และดึง sheetId จากคอลัมน์ D, storeName จากคอลัมน์ C
      if (storesData[i][0].toString().trim() === storeId.toString().trim()) {
        sheetId = storesData[i][3];
        storeName = storesData[i][2];
        break;
      }
    }

    if (!sheetId) {
      return { success: false, message: `ไม่พบข้อมูลสาขาใน Master Sheet (Store ID: ${storeId})` };
    }

    // 2. ดึงข้อมูลผลการเปรียบเทียบจากชีตของสาขานั้นๆ
    const comparisonData = getComparisonResults(sheetId, date);

    // 3. ส่งข้อมูลกลับไปให้ Frontend
    return {
      success: true,
      data: {
        items: comparisonData.success ? comparisonData.results : [],
        storeName: storeName,
        sheetId: sheetId
      }
    };
  } catch (e) {
    Logger.log(`ERROR in getApprovalData: ${e.toString()}`);
    return { success: false, message: e.toString() };
  }
}

/**
 * ฟังก์ชันย่อย: ทำหน้าที่ดึงข้อมูลจากชีต 'Comparison' ของ Sheet ID ที่ระบุ
 * @param {string} sheetId - ID ของไฟล์ Google Sheet ของสาขา
 * @param {string} compareDate - วันที่ที่ต้องการ (yyyy-MM-dd)
 * @returns {object} ข้อมูลผลต่างทั้งหมดในวันที่ระบุ
 */
function getComparisonResults(sheetId, compareDate) {
  try {
    const storeSheet = SpreadsheetApp.openById(sheetId);
    const comparisonSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.COMPARISON);
    if (!comparisonSheet) {
      throw new Error(`ไม่พบชีตชื่อ '${CONFIG.STORE_SHEETS.COMPARISON}' ในไฟล์ Sheet ID: ${sheetId}`);
    }
    const data = comparisonSheet.getDataRange().getValues();
    const results = [];
    const timeZone = Session.getScriptTimeZone();

    // วนลูปตั้งแต่แถวที่ 2 (ข้ามหัวตาราง)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const sheetDate = row[1]; // Column B: date

      const sheetDateString = (sheetDate instanceof Date)
        ? Utilities.formatDate(sheetDate, timeZone, 'yyyy-MM-dd')
        : (sheetDate ? sheetDate.toString().substring(0, 10) : '');

      // ตรวจสอบว่าวันที่ตรงกับที่ต้องการหรือไม่
      if (sheetDateString === compareDate) {
        results.push({
          comp_id: row[0],  // A
          product_code: row[2],  // C
          product_name: row[3],  // D
          pos_quantity: row[4],  // E
          manual_quantity: row[5],  // F
          difference: row[6],  // G
          status: row[8],  // I
          explanation: row[9],  // J
          approval_status: row[12], // M
          owner_notes: row[13]  // N
        });
      }
    }
    return { success: true, results: results };
  } catch (error) {
    Logger.log(`ERROR in getComparisonResults: ${error.toString()}`);
    return { success: false, message: error.toString() };
  }
}




/**
 * แก้ไข: เพิ่มการยิง Line Notify และแก้ไขการดึง group_line_id ให้ถูกต้อง
 */
function updateItemApprovalStatus(payload) {
  const { storeId, compId, status, ownerNotes } = payload;
  const ownerName = Session.getActiveUser().getEmail();

  try {
    // 1. ค้นหา sheetId และ storeName จาก Master Sheet
    const masterSheet = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const storesSheet = masterSheet.getSheetByName(CONFIG.MASTER_SHEETS.STORES);
    const storesData = storesSheet.getDataRange().getValues();
    let sheetId = null;
    let storeName = '';

    for (let i = 1; i < storesData.length; i++) {
      if (storesData[i][0].toString().trim() === storeId.toString().trim()) {
        sheetId = storesData[i][3];  // คอลัมน์ D = sheet_id
        storeName = storesData[i][2]; // คอลัมน์ C = store_name
        break;
      }
    }

    if (!sheetId) {
      throw new Error(`ไม่พบ Sheet ID ที่ผูกกับ Store ID: '${storeId}'`);
    }

    // 2. เปิด Store Sheet และหา Comparison Sheet
    const storeSheet = SpreadsheetApp.openById(sheetId);
    const comparisonSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.COMPARISON);

    // 3. หา row index ของ compId
    const idColumnValues = comparisonSheet.getRange("A:A").getValues().flat();
    const rowIndex = idColumnValues.indexOf(compId);

    if (rowIndex === -1) {
      throw new Error(`ไม่พบรายการที่มี comp_id: ${compId}`);
    }

    const targetRow = rowIndex + 1; // เพราะ Array เริ่มที่ 0 แต่ Spreadsheet เริ่มที่ 1

    // 4. ดึงข้อมูลแถวปัจจุบันเพื่อใช้ใน notification
    const rowData = comparisonSheet.getRange(targetRow, 1, 1, 14).getValues()[0];

    // 5. อัปเดตข้อมูลใน Comparison Sheet
    // คอลัมน์ L (12) = approved_by
    // คอลัมน์ M (13) = approval_status
    // คอลัมน์ N (14) = owner_notes
    comparisonSheet.getRange(targetRow, 12, 1, 3).setValues([[
      ownerName,
      status,
      ownerNotes
    ]]);

    SpreadsheetApp.flush(); // บันทึกการเปลี่ยนแปลงทันที

    // 6. ส่ง Line Notification ไปยังกลุ่มพนักงาน
    // ✅ FIX: ใช้ sheetId แทน storeId
    const storeSettings = getStoreSettings(sheetId);

    // ✅ FIX: ตรวจสอบ storeSettings.settings.group_line_id
    if (storeSettings && storeSettings.success && storeSettings.settings && storeSettings.settings.group_line_id) {

      // สร้างข้อมูลรายการสินค้าสำหรับ Flex Message
      const item = {
        product_name: rowData[3],    // คอลัมน์ D
        manual_quantity: rowData[5], // คอลัมน์ F
        pos_quantity: rowData[4],    // คอลัมน์ E
        difference: rowData[6]       // คอลัมน์ G
      };

      // แปลงวันที่เป็นรูปแบบ yyyy-MM-dd
      const date = (rowData[1] instanceof Date)
        ? Utilities.formatDate(rowData[1], Session.getScriptTimeZone(), 'yyyy-MM-dd')
        : rowData[1].toString().substring(0, 10);

      // เตรียมข้อมูลสำหรับ Flex Message
      const data = {
        storeId: storeId,
        storeName: storeName,
        date: date,
        items: [item], // ส่งเฉพาะรายการที่อัปเดต
        ownerName: ownerName,
        remark: ownerNotes || (status === 'approved' ? 'อนุมัติเรียบร้อย' : 'ไม่อนุมัติ'),
        notificationText: `[${storeName}] เจ้าของได้${status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}รายการสินค้า`
      };

      // เลือก eventType ตามสถานะ
      const eventType = status === 'approved' ? 'OWNER_APPROVED' : 'OWNER_REJECTED';

      // ส่งการแจ้งเตือนไปยังกลุ่มไลน์ของพนักงาน
      sendAppNotification(storeSettings.settings.group_line_id, eventType, data);

      Logger.log(`✅ ส่ง LINE notification (${eventType}) ไปยัง ${storeSettings.settings.group_line_id} สำเร็จ`);
    } else {
      Logger.log(`⚠️ ไม่พบ group_line_id สำหรับร้าน ${storeName} (Store ID: ${storeId})`);
    }

    return {
      success: true,
      message: 'อัปเดตสถานะและส่งการแจ้งเตือนเรียบร้อยแล้ว'
    };

  } catch (error) {
    Logger.log(`ERROR in updateItemApprovalStatus: ${error.toString()}`);
    return { success: false, message: error.toString() };
  }
}

// ===================================
// EXPLANATION FUNCTIONS
// ===================================

function submitExplanation(sheetId, compId, explanation, username) {
  try {
    const storeSheet = SpreadsheetApp.openById(sheetId);
    const comparisonSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.COMPARISON);
    const explanationSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.EXPLANATIONS);

    // Update comparison record
    const compData = comparisonSheet.getDataRange().getValues();
    for (let i = 1; i < compData.length; i++) {
      if (compData[i][0] === compId) {
        comparisonSheet.getRange(i + 1, 10).setValue(explanation); // explanation column
        comparisonSheet.getRange(i + 1, 11).setValue(username); // explained_by column
        break;
      }
    }

    // Add to explanation history
    const expId = Utilities.getUuid();
    explanationSheet.appendRow([
      expId,
      compId,
      '', // product_code - could fetch from comparison
      explanation,
      username,
      new Date(),
      'pending',
      '', // reviewed_by
      ''  // reviewed_at
    ]);

    return {
      success: true,
      explanation_id: expId
    };

  } catch (error) {
    console.error('Error submitting explanation:', error);
    return {
      success: false,
      message: error.toString()
    };
  }
}



/**
 * เพิ่ม Log การทำงานแบบละเอียดเพื่อตรวจสอบปัญหา
 */
function getExplanationData(storeId, date) {
  // --- START LOGGING ---
  Logger.log(`--- [START] getExplanationData ---`);
  Logger.log(`1. ได้รับ Parameters: storeId='${storeId}', date='${date}'`);
  // --- END LOGGING ---
  try {
    const masterSheet = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const storesSheet = masterSheet.getSheetByName(CONFIG.MASTER_SHEETS.STORES);
    const storesData = storesSheet.getDataRange().getValues();
    let sheetId = null;
    let storeName = '';
    for (let i = 1; i < storesData.length; i++) {
      if (storesData[i][0].toString().trim() === storeId.toString().trim()) {
        sheetId = storesData[i][3];
        storeName = storesData[i][2];
        break;
      }
    }

    if (!sheetId) {
      Logger.log(`!!! [ERROR] ไม่พบ Sheet ID สำหรับ storeId: '${storeId}'`);
      return { success: false, message: `ไม่พบข้อมูลสาขา (Store ID: ${storeId})` };
    }
    // --- START LOGGING ---
    Logger.log(`2. ค้นหาข้อมูลสาขาสำเร็จ: sheetId='${sheetId}', storeName='${storeName}'`);
    // --- END LOGGING ---

    const storeSheet = SpreadsheetApp.openById(sheetId);
    const comparisonSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.COMPARISON);
    if (!comparisonSheet) {
      Logger.log(`!!! [ERROR] ไม่พบชีต '${CONFIG.STORE_SHEETS.COMPARISON}'`);
      throw new Error(`ไม่พบชีต '${CONFIG.STORE_SHEETS.COMPARISON}' ในสาขานี้`);
    }
    const data = comparisonSheet.getDataRange().getValues();
    const results = [];
    const timeZone = Session.getScriptTimeZone();

    // --- START LOGGING ---
    Logger.log(`3. อ่านข้อมูลจากชีต Comparison สำเร็จ: พบข้อมูลทั้งหมด ${data.length - 1} แถว`);
    Logger.log(`4. เริ่มต้นวนลูปเพื่อตรวจสอบข้อมูลทีละแถว...`);
    // --- END LOGGING ---

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const sheetDateString = (row[1] instanceof Date)
        ? Utilities.formatDate(row[1], timeZone, 'yyyy-MM-dd')
        : (row[1] ? row[1].toString().substring(0, 10) : '');

      const isDateMatch = (sheetDateString === date);

      // --- START LOGGING ---
      Logger.log(`\n--- แถวที่ ${i} ---`);
      Logger.log(`  - ข้อมูลดิบวันที่ (คอลัมน์ B): ${row[1]}`);
      Logger.log(`  - แปลงเป็นวันที่: '${sheetDateString}'`);
      Logger.log(`  - วันที่ตรงกับที่ต้องการหรือไม่ (${date})?: ${isDateMatch}`);
      // --- END LOGGING ---

      if (isDateMatch) {
        const statusRaw = row[8] || ''; // คอลัมน์ I: status
        const statusTrimmed = statusRaw.toString().trim();
        const isStatusMatch = (statusTrimmed === 'discrepancy' || statusTrimmed === 'pending_count');

        // --- START LOGGING ---
        Logger.log(`  - >>> วันที่ตรงกัน! กำลังตรวจสอบ status...`);
        Logger.log(`  - ข้อมูลดิบ status (คอลัมน์ I): '${statusRaw}'`);
        Logger.log(`  - status หลัง trim: '${statusTrimmed}'`);
        Logger.log(`  - status ตรงกับเงื่อนไข ('discrepancy' or 'pending_count')?: ${isStatusMatch}`);
        // --- END LOGGING ---

        if (isStatusMatch) {
          // --- START LOGGING ---
          Logger.log(`  - ✅ SUCCESS: แถวที่ ${i} ผ่านเงื่อนไขทั้งหมด จะถูกเพิ่มในผลลัพธ์`);
          // --- END LOGGING ---
          results.push({
            comp_id: row[0],
            product_code: row[2],
            product_name: row[3],
            pos_quantity: parseFloat(row[4]) || 0,
            manual_quantity: parseFloat(row[5]) || 0,
            difference: parseFloat(row[6]) || 0,
            status: statusTrimmed,
            explanation: row[9] || '',
            approval_status: (row[12] || '').toString().trim(),
            owner_notes: row[13] || ''
          });
        }
      }
    }

    // --- START LOGGING ---
    Logger.log(`\n5. วนลูปเสร็จสิ้น`);
    Logger.log(`6. จำนวนรายการทั้งหมดที่ผ่านเงื่อนไข: ${results.length} รายการ`);
    Logger.log(`--- [END] getExplanationData ---`);
    // --- END LOGGING ---

    return {
      success: true,
      data: {
        items: results,
        storeName: storeName,
        sheetId: sheetId
      }
    };
  } catch (e) {
    Logger.log(`!!! [FATAL ERROR] เกิดข้อผิดพลาดร้ายแรง: ${e.toString()}\n${e.stack}`);
    return { success: false, message: e.toString() };
  }
}



/**
 * รับข้อมูลทั้งคำชี้แจง (explanations) และจำนวนนับที่ตกหล่น (counts) จากหน้าเว็บ
 * ทำการบันทึกข้อมูลลงชีต, อัปเดตสถานะเป็น 'pending', และส่ง Line Notify ไปยังกลุ่มเจ้าของร้าน
 * @param {string} sheetId - ID ของไฟล์ Google Sheet ของสาขา
 * @param {object} submittedData - Object ที่มี array ของ explanations และ/หรือ counts
 * @param {string} username - ชื่อผู้ใช้ที่ส่งข้อมูล
 * @returns {object} ผลลัพธ์การทำงาน
 */
function submitExplanationsAndCounts(sheetId, submittedData, username) {
  try {
    if (!submittedData || (!submittedData.explanations && !submittedData.counts)) {
      return { success: false, message: 'ไม่มีข้อมูลสำหรับบันทึก' };
    }

    const storeSheet = SpreadsheetApp.openById(sheetId);
    const comparisonSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.COMPARISON);
    const manualCountSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.MANUAL_COUNT);
    const productsSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.PRODUCTS);
    const compData = comparisonSheet.getDataRange().getValues();
    const productData = productsSheet.getDataRange().getValues();

    // สร้าง Map เพื่อให้ค้นหาแถวได้เร็วขึ้น
    const compIdToRowIndex = new Map(compData.map((row, i) => [row[0], i + 1]));
    const productCodeToRowIndex = new Map(productData.map((row, i) => [row[1], i + 1]));

    const timestamp = new Date();

    // 1. จัดการรายการที่มี "คำชี้แจง" (explanations)
    if (submittedData.explanations && submittedData.explanations.length > 0) {
      submittedData.explanations.forEach(exp => {
        const rowIndex = compIdToRowIndex.get(exp.compId);
        if (rowIndex) {
          // อัปเดต 4 คอลัมน์พร้อมกัน: explanation, explained_by, approved_by (ปล่อยว่าง), และ approval_status
          comparisonSheet.getRange(rowIndex, 10, 1, 4).setValues([[
            exp.explanation, // Column J: explanation
            username,        // Column K: explained_by
            '',              // Column L: approved_by (ปล่อยว่างไว้ก่อน)
            'pending'        // Column M: approval_status
          ]]);
        }
      });
    }

    // 2. จัดการรายการที่มี "จำนวนนับใหม่" (counts) สำหรับรายการที่สถานะเป็น 'pending_count'
    if (submittedData.counts && submittedData.counts.length > 0) {
      submittedData.counts.forEach(count => {
        const rowIndex = compIdToRowIndex.get(count.compId);
        if (rowIndex) {
          const compRow = compData[rowIndex - 1];
          const posQty = parseFloat(compRow[4]);
          const manualQty = parseFloat(count.quantity);
          const difference = manualQty - posQty;
          const status = Math.abs(difference) < 0.01 ? 'matched' : 'discrepancy';

          // อัปเดตชีต Comparison
          comparisonSheet.getRange(rowIndex, 6).setValue(manualQty); // manual_quantity
          comparisonSheet.getRange(rowIndex, 7).setValue(difference); // difference
          comparisonSheet.getRange(rowIndex, 9).setValue(status); // status

          // เพิ่มข้อมูลการนับลงชีต Manual_Count
          manualCountSheet.appendRow([
            Utilities.getUuid(), compRow[1], compRow[2], compRow[3],
            manualQty, username, timestamp, 'submitted', timestamp
          ]);

          // อัปเดตสถานะ active ของสินค้า (ถ้าจำเป็น)
          const productRowIndex = productCodeToRowIndex.get(compRow[2]);
          if (productRowIndex) {
            productsSheet.getRange(productRowIndex, 11).setValue(true); // active
          }
        }
      });
    }

    // 3. Trigger Line Notify to Owner (ถ้ามีการส่งคำชี้แจง)
    if (submittedData.explanations && submittedData.explanations.length > 0) {
      const apiConfig = getAPIConfig();
      if (apiConfig.OWNER_GROUP_LINE_ID) {
        const storeInfo = getStoreInfoBySheetId(sheetId);
        // ดึงข้อมูลวันที่จากแถวแรกที่มีการชี้แจง
        const firstCompId = submittedData.explanations[0].compId;
        const dateOfExplanation = compData[compIdToRowIndex.get(firstCompId) - 1][1];
        const formattedDate = Utilities.formatDate(new Date(dateOfExplanation), Session.getScriptTimeZone(), 'yyyy-MM-dd');

        const data = {
          storeId: storeInfo.id,
          storeName: storeInfo.name,
          date: formattedDate,
          notificationText: `📝 [${storeInfo.name}] พนักงานได้ชี้แจงผลต่างของวันที่ ${formattedDate}`,
          // ส่งข้อมูล item ไปด้วยเพื่อสร้าง Flex ที่มีรายละเอียด
          items: submittedData.explanations.map(exp => {
            const rowIndex = compIdToRowIndex.get(exp.compId);
            const row = compData[rowIndex - 1];
            return {
              product_name: row[3],
              manual_quantity: row[5],
              pos_quantity: row[4],
              difference: row[6],
              explanation: exp.explanation
            };
          }).filter(item => item.difference !== 0).slice(0, 5) // กรองเฉพาะรายการที่มี DIFF ไม่เท่ากับ 0 และส่งตัวอย่าง 5 รายการแรก
        };
        // ใช้ eventType 'STAFF_EXPLANATION' เพื่อให้ FlexGenerator สร้าง Flex ที่ถูกต้อง
        sendAppNotification(apiConfig.OWNER_GROUP_LINE_ID, 'STAFF_EXPLANATION', data);
      }
    }

    return { success: true };
  } catch (e) {
    Logger.log("Error in submitExplanationsAndCounts: " + e.toString());
    return { success: false, message: e.toString() };
  }
}


/**
 * บันทึกคำชี้แจงหลายรายการจากหน้า Explanation Page
 */
function submitMultipleExplanations(sheetId, explanations, username) {
  try {
    if (!explanations || explanations.length === 0) {
      return { success: false, message: 'ไม่มีข้อมูลคำชี้แจง' };
    }

    // เราจะเรียกใช้ฟังก์ชัน submitExplanation เดิมซ้ำๆ
    explanations.forEach(exp => {
      submitExplanation(sheetId, exp.compId, exp.explanation, username);
    });

    return { success: true };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}






// ===================================
// UTILITY FUNCTIONS
// ===================================

function getStoreSettings(sheetId) {
  try {
    if (!sheetId) {
      return { success: false, message: 'No sheet ID provided', settings: {} };
    }

    const storeSheet = SpreadsheetApp.openById(sheetId);
    let settingsSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.SETTINGS);

    if (!settingsSheet) {
      // Return default settings instead of null
      return {
        success: true,
        settings: {
          group_line_id: '',
          notify_time_daily: '08:00',
          notify_days: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
          store_name: '',
          store_code: ''
        }
      };
    }

    const settings = getSettings(settingsSheet);
    return { success: true, settings: settings };

  } catch (error) {
    console.error('Error in getStoreSettings:', error);
    // Always return object with success property
    return { success: false, message: error.toString(), settings: {} };
  }
}

// แก้ไขฟังก์ชัน updateStoreSettingsBackend
function updateStoreSettingsBackend(sheetId, newSettings) {
  try {
    console.log('--- Starting updateStoreSettingsBackend ---');
    console.log('New settings:', JSON.stringify(newSettings));

    if (!sheetId) {
      return { success: false, message: 'ไม่พบ Sheet ID' };
    }

    const storeSheet = SpreadsheetApp.openById(sheetId);
    const settingsSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.SETTINGS);

    if (!settingsSheet) {
      return { success: false, message: 'ไม่พบ Settings sheet' };
    }

    const data = settingsSheet.getDataRange().getValues();

    // อัปเดตค่าที่มีอยู่
    for (let i = 1; i < data.length; i++) {
      const key = data[i][0];
      if (key && newSettings.hasOwnProperty(key)) {
        settingsSheet.getRange(i + 1, 2).setValue(newSettings[key]);
      }
    }

    // Log audit
    logAudit(sheetId, 'UPDATE_SETTINGS', 'Settings', null, null, newSettings);

    return { success: true, message: 'บันทึกการตั้งค่าเรียบร้อย' };

  } catch (error) {
    console.error('Error in updateStoreSettingsBackend:', error);
    return { success: false, message: error.toString() };
  }
}




function getUserStores(userId, role) {
  try {
    const masterSheet = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const storesSheet = masterSheet.getSheetByName(CONFIG.MASTER_SHEETS.STORES);
    const usersSheet = masterSheet.getSheetByName(CONFIG.MASTER_SHEETS.USERS);

    // ค้นหา store_ids ของ user คนนั้นๆ
    const userData = usersSheet.getDataRange().getValues();
    let userStoreIds = [];
    for (let i = 1; i < userData.length; i++) {
      if (userData[i][0] === userId) {
        userStoreIds = JSON.parse(userData[i][5] || '[]');
        break;
      }
    }

    const storesData = storesSheet.getDataRange().getValues();
    const userStores = [];

    // วนลูปเพื่อสร้าง array ของ store ที่ user คนนั้นดูแล
    for (let j = 1; j < storesData.length; j++) {
      const storeRow = storesData[j];
      const [storeId, storeCode, storeName, sheetId, folderId, lineToken] = storeRow;

      // ถ้าเป็น owner หรือ accountant ให้เห็นทุกสาขา, ถ้าไม่ใช่ให้เช็คจาก userStoreIds
      if (role === 'owner' || role === 'accountant' || userStoreIds.includes(storeId)) {
        userStores.push({
          store_id: storeId,
          code: storeCode,
          name: storeName,
          sheet_id: sheetId,
          folder_id: folderId,
          line_token: lineToken
        });
      }
    }

    return { success: true, stores: userStores };

  } catch (error) {
    return { success: false, message: error.toString() };
  }
}



function getAllStores() {
  try {
    const masterSheet = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const storesSheet = masterSheet.getSheetByName(CONFIG.MASTER_SHEETS.STORES);
    const storesData = storesSheet.getDataRange().getValues();
    const allStores = [];

    // วนลูปตั้งแต่แถวที่ 2 เพื่อข้าม Header
    for (let i = 1; i < storesData.length; i++) {
      const storeRow = storesData[i];
      const [storeId, storeCode, storeName, sheetId, folderId, lineToken] = storeRow;

      allStores.push({
        id: storeId,
        code: storeCode,
        name: storeName,
        sheet_id: sheetId,
        folder_id: folderId,
        line_token: lineToken
      });
    }

    return { success: true, stores: allStores };

  } catch (error) {
    return { success: false, message: error.toString() };
  }
}


/**
 * ดึงข้อมูลสาขาที่ active ทั้งหมด (รวม is_central)
 * @returns {Array} รายการสาขาที่ active
 */
function getActiveStores() {
  const masterSheet = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
  const storesSheet = masterSheet.getSheetByName(CONFIG.MASTER_SHEETS.STORES);
  const storesData = storesSheet.getDataRange().getValues();
  const headers = storesData[0];
  const activeStores = [];

  for (let i = 1; i < storesData.length; i++) {
    const storeRow = storesData[i];
    // ข้ามแถวว่าง
    if (!storeRow[0]) continue;

    activeStores.push({
      store_id: storeRow[0],
      store_code: storeRow[1],
      store_name: storeRow[2],
      sheet_id: storeRow[3],
      folder_id: storeRow[4],
      is_central: storeRow[headers.indexOf('is_central')] === true || storeRow[headers.indexOf('is_central')] === 'TRUE'
    });
  }

  return activeStores;
}


function getSettings(settingsSheet) {
  try {
    if (!settingsSheet) {
      console.error('settingsSheet is null');
      return {
        line_token: '',
        notify_time_daily: '08:00', // <-- เพิ่มค่าเริ่มต้น
        auto_compare: 'true',
        diff_threshold: '5'
      };
    }

    const data = settingsSheet.getDataRange().getValues();
    if (data.length <= 1) {
      console.log('No settings data found, returning defaults');
      return {
        line_token: '',
        notify_time_daily: '08:00', // <-- เพิ่มค่าเริ่มต้น
        auto_compare: 'true',
        diff_threshold: '5'
      };
    }

    const settings = {};
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        const key = data[i][0];
        let value = data[i][1];

        // --- START: ส่วนที่แก้ไข ---
        // เพิ่ม 'notify_time_daily' เข้าไปในเงื่อนไขนี้
        if (key === 'notify_time_daily' || key === 'notify_time_morning' || key === 'notify_time_evening') {
          if (value instanceof Date) {
            const hours = value.getHours().toString().padStart(2, '0');
            const minutes = value.getMinutes().toString().padStart(2, '0');
            value = `${hours}:${minutes}`;
          } else if (typeof value === 'string') {
            // ถ้าเป็น string อยู่แล้วให้ใช้เลย (ป้องกัน error)
            value = value;
          } else {
            // ถ้าเป็นอย่างอื่นให้ใช้ค่า default
            value = '08:00';
          }
          // --- END: ส่วนที่แก้ไข ---

        } else if (key === 'auto_compare') {
          value = String(value === true ? 'true' : 'false');
        } else {
          value = value === null || value === undefined ? '' : String(value);
        }

        settings[key] = value;
      }
    }

    // ตรวจสอบและเติมค่า default ที่จำเป็น
    const requiredKeys = {
      line_token: '',
      notify_time_daily: '08:00',
      auto_compare: 'true',
      diff_threshold: '5'
    };
    for (const key in requiredKeys) {
      if (!settings.hasOwnProperty(key)) {
        settings[key] = requiredKeys[key];
      }
    }

    console.log('Settings processed:', JSON.stringify(settings));
    return settings;

  } catch (error) {
    console.error('Error in getSettings:', error);
    return {
      line_token: '',
      notify_time_daily: '08:00',
      auto_compare: 'true',
      diff_threshold: '5'
    };
  }
}




function logAudit(sheetId, actionType, tableName, recordId, oldValue, newValue) {
  try {
    const storeSheet = SpreadsheetApp.openById(sheetId);
    const auditSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.AUDIT);

    auditSheet.appendRow([
      Utilities.getUuid(),
      new Date(),
      actionType,
      tableName,
      recordId,
      JSON.stringify(oldValue),
      JSON.stringify(newValue),
      Session.getActiveUser().getEmail() || 'System'
    ]);

  } catch (error) {
    console.error('Error logging audit:', error);
  }
}


// ===================================
// DASHBOARD FUNCTIONS
// ===================================


function getDashboardData(sheetId, dateFrom, dateTo) {
  Logger.clear();
  try {
    Logger.log(`--- [START] getDashboardData ---`);
    Logger.log(`1. Received Parameters: sheetId='${sheetId}', dateFrom='${dateFrom}', dateTo='${dateTo}'`);

    if (!sheetId) {
      throw new Error("sheetId is missing or null.");
    }

    const storeSheet = SpreadsheetApp.openById(sheetId);

    // ========================================
    // ✅ เพิ่ม: ตรวจสอบและสร้าง Expected Categories
    // ========================================
    try {
      Logger.log(`2a. Checking Expected Categories...`);
      const categoryResult = initializeExpectedCategories(sheetId);

      if (categoryResult.success) {
        if (categoryResult.message === 'Categories already exist') {
          Logger.log(`   ✅ Expected Categories already exist (${categoryResult.categories.length} categories)`);
        } else {
          Logger.log(`   ✅ Created Settings sheet with default categories (${categoryResult.categories.length} categories)`);
        }
      } else {
        Logger.log(`   ⚠️ Warning: Could not initialize categories: ${categoryResult.message}`);
      }
    } catch (categoryError) {
      Logger.log(`   ⚠️ Warning: Error initializing categories: ${categoryError.message}`);
      // ไม่ throw error เพราะไม่ใช่ส่วนที่จำเป็นต้องมีเพื่อให้ Dashboard ทำงาน
    }

    // ========================================
    // ✅ เดิม: ตรวจสอบและสร้าง Notification_Log sheet
    // ========================================
    try {
      Logger.log(`2b. Checking Notification_Log sheet...`);
      let logSheet = storeSheet.getSheetByName('Notification_Log');

      if (!logSheet) {
        Logger.log(`   ⚠️ Notification_Log sheet not found in Store Sheet. Creating...`);

        // สร้าง sheet ใหม่
        logSheet = storeSheet.insertSheet('Notification_Log');

        // เพิ่ม header row
        logSheet.appendRow([
          'log_id',           // A: รหัส log (UUID)
          'timestamp',        // B: วันที่เวลาที่ส่ง
          'store_id',         // C: รหัสสาขา
          'target_group_id',  // D: LINE Group ID
          'event_type',       // E: ประเภทการแจ้งเตือน
          'status',           // F: สถานะ (success/failed)
          'details'           // G: รายละเอียดเพิ่มเติม
        ]);

        // Format header
        const headerRange = logSheet.getRange(1, 1, 1, 7);
        headerRange.setFontWeight('bold');
        headerRange.setBackground('#FF9800');
        headerRange.setFontColor('#FFFFFF');
        headerRange.setHorizontalAlignment('center');

        // ปรับความกว้างคอลัมน์
        logSheet.setColumnWidth(1, 250);  // log_id (UUID ยาว)
        logSheet.setColumnWidth(2, 150);  // timestamp
        logSheet.setColumnWidth(3, 300);  // store_id
        logSheet.setColumnWidth(4, 250);  // target_group_id
        logSheet.setColumnWidth(5, 180);  // event_type
        logSheet.setColumnWidth(6, 100);  // status
        logSheet.setColumnWidth(7, 300);  // details

        // Freeze header row
        logSheet.setFrozenRows(1);

        Logger.log(`   ✅ Created Notification_Log sheet in Store Sheet`);
      } else {
        Logger.log(`   ✅ Notification_Log sheet exists in Store Sheet`);
      }
    } catch (logError) {
      Logger.log(`   ⚠️ Warning: Could not check/create Notification_Log: ${logError.message}`);
      // ไม่ throw error เพราะไม่ใช่ส่วนสำคัญของฟังก์ชันนี้
    }

    const comparisonSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.COMPARISON);

    if (!comparisonSheet) {
      throw new Error(`Sheet not found: "${CONFIG.STORE_SHEETS.COMPARISON}"`);
    }
    Logger.log(`3. Found Sheet: '${CONFIG.STORE_SHEETS.COMPARISON}'`);

    const compData = comparisonSheet.getDataRange().getValues();
    Logger.log(`4. Data Read: Found ${compData.length - 1} total rows.`);

    const filteredData = [];
    Logger.log(`5. Filtering Data by Date Range...`);
    for (let i = 1; i < compData.length; i++) {
      const row = compData[i];
      const compDate = row[1]; // comp_date column

      // ตรรกะการเปรียบเทียบวันที่ให้ยืดหยุ่น
      let compDateStr = '';
      if (compDate instanceof Date) {
        compDateStr = Utilities.formatDate(compDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
      } else if (typeof compDate === 'string' && compDate.length >= 10) {
        compDateStr = compDate.substring(0, 10);
      }

      if (compDateStr >= dateFrom && compDateStr <= dateTo) {
        filteredData.push({
          comp_id: row[0],
          comp_date: compDateStr,
          product_code: row[2],
          product_name: row[3],
          pos_quantity: parseFloat(row[4] || 0),
          manual_quantity: parseFloat(row[5] || 0),
          difference: parseFloat(row[6] || 0),
          status: row[8]
        });
      }
    }
    Logger.log(`6. Filtering Complete: ${filteredData.length} rows matched the date range.`);

    if (filteredData.length === 0) {
      Logger.log(`[WARNING] No data was found for the period ${dateFrom} to ${dateTo}.`);
    }

    const productsSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.PRODUCTS);
    if (!productsSheet) {
      throw new Error(`Sheet not found: "${CONFIG.STORE_SHEETS.PRODUCTS}"`);
    }
    Logger.log(`7. Found Products Sheet, proceeding with calculations.`);

    const stats = calculateDashboardStats(filteredData);
    const topDiffItems = getTopDiffItems(filteredData, 5);
    const categoryData = getCategoryBreakdown(filteredData, productsSheet);
    const discrepancies = filteredData.filter(item => item.status === 'discrepancy');

    Logger.log(`8. Calculations Complete: stats=${JSON.stringify(stats)}, topItems=${topDiffItems.length}, categories=${categoryData.length}, discrepancies=${discrepancies.length}`);
    Logger.log(`--- [SUCCESS] getDashboardData ---`);

    return {
      success: true,
      stats: stats,
      topDiffItems: topDiffItems,
      categoryData: categoryData,
      discrepancies: discrepancies
    };
  } catch (error) {
    Logger.log(`!!! [FATAL CATCH] Error in getDashboardData: ${error.toString()} !!!`);
    Logger.log(`Stack Trace: ${error.stack}`);
    return {
      success: false,
      message: error.toString()
    };
  }
}















function calculateDashboardStats(data) {
  const totalItems = data.length;
  const sumDiff = data.reduce((sum, item) => sum + item.difference, 0);

  // Calculate shrinkage rate
  const totalPosQty = data.reduce((sum, item) => sum + item.pos_quantity, 0);
  const shrinkageRate = totalPosQty > 0 ? (Math.abs(sumDiff) / totalPosQty * 100) : 0;

  // Find top offender
  let topOffender = 'None';
  if (data.length > 0) {
    const sorted = [...data].sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
    topOffender = sorted[0].product_name;
  }

  return {
    totalItems: totalItems,
    sumDiff: sumDiff,
    shrinkageRate: shrinkageRate,
    topOffender: topOffender
  };
}

function getTopDiffItems(data, limit = 5) {
  return data
    .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
    .slice(0, limit)
    .map(item => ({
      name: item.product_name,
      value: item.difference,
      color: item.difference > 0 ? '#10b981' : '#ef4444'
    }));
}

function getCategoryBreakdown(data, productsSheet) {
  const productsData = productsSheet.getDataRange().getValues();
  const categoryMap = {};

  // Create product code to category map
  for (let i = 1; i < productsData.length; i++) {
    const productCode = productsData[i][1];
    const category = productsData[i][4];
    categoryMap[productCode] = category;
  }

  // Count discrepancies by category
  const categoryCount = {};
  data.forEach(item => {
    const category = categoryMap[item.product_code] || 'Unknown';
    const simplifiedCategory = category.replace('MAT-', '');
    categoryCount[simplifiedCategory] = (categoryCount[simplifiedCategory] || 0) + Math.abs(item.difference);
  });

  // Convert to array and assign colors
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#64748b'];
  const result = [];
  let colorIndex = 0;

  for (const category in categoryCount) {
    result.push({
      category: category,
      value: categoryCount[category],
      color: colors[colorIndex % colors.length]
    });
    colorIndex++;
  }

  return result.sort((a, b) => b.value - a.value);
}

function getProductDetails(productsSheet, productCode) {
  const data = productsSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === productCode) {
      return {
        product_id: data[i][0],
        product_code: data[i][1],
        product_name: data[i][3],
        category: data[i][4],
        unit: data[i][5],
        cost_price: parseFloat(data[i][6] || 0),
        selling_price: parseFloat(data[i][7] || 0)
      };
    }
  }

  return {};
}

// ===================================
// EXPORT FUNCTIONS
// ===================================

function exportDashboard(sheetId, dateFrom, dateTo, format, storeName) {
  try {
    // Get dashboard data
    const dashboardData = getDashboardData(sheetId, dateFrom, dateTo);

    if (!dashboardData.success) {
      return dashboardData;
    }

    // Get store folder
    const masterSheet = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const storesSheet = masterSheet.getSheetByName(CONFIG.MASTER_SHEETS.STORES);
    const storeData = storesSheet.getDataRange().getValues();

    let folderId;
    for (let i = 1; i < storeData.length; i++) {
      if (storeData[i][3] === sheetId) {
        folderId = storeData[i][4];
        break;
      }
    }

    const folder = DriveApp.getFolderById(folderId);

    if (format === 'excel') {
      return exportToExcel(dashboardData, folder, storeName, dateFrom, dateTo);
    } else if (format === 'pdf') {
      return exportToPDF(dashboardData, folder, storeName, dateFrom, dateTo);
    }

    return {
      success: false,
      message: 'Invalid export format'
    };

  } catch (error) {
    console.error('Error exporting dashboard:', error);
    return {
      success: false,
      message: error.toString()
    };
  }
}

function exportToExcel(data, folder, storeName, dateFrom, dateTo) {
  try {
    // Create new spreadsheet
    const fileName = `Dashboard_${storeName}_${dateFrom}_to_${dateTo}`;
    const spreadsheet = SpreadsheetApp.create(fileName);
    const file = DriveApp.getFileById(spreadsheet.getId());
    file.moveTo(folder);

    // Summary Sheet
    const summarySheet = spreadsheet.getActiveSheet();
    summarySheet.setName('Summary');

    // Add headers
    summarySheet.getRange('A1:B1').setValues([['Dashboard Report', '']]).merge();
    summarySheet.getRange('A2:B2').setValues([[`Store: ${storeName}`, '']]);
    summarySheet.getRange('A3:B3').setValues([[`Period: ${dateFrom} to ${dateTo}`, '']]);

    // Add statistics
    summarySheet.getRange('A5:B5').setValues([['Statistics', 'Value']]);
    summarySheet.getRange('A6:B9').setValues([
      ['Total Items', data.stats.totalItems],
      ['Sum Diff (Qty)', data.stats.sumDiff.toFixed(2)],
      ['Shrinkage Rate (%)', data.stats.shrinkageRate.toFixed(2)],
      ['Top Offender', data.stats.topOffender]
    ]);

    // Discrepancies Sheet
    const discrepancySheet = spreadsheet.insertSheet('Discrepancies');
    const headers = ['Product Code', 'Product Name', 'POS Qty', 'Manual Qty',
      'Difference', 'Direction', 'Category', 'Cost Impact'];
    discrepancySheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // Add discrepancy data
    if (data.discrepancies.length > 0) {
      const discrepancyData = data.discrepancies.map(item => [
        item.product_code,
        item.product_name,
        item.pos_quantity,
        item.manual_quantity,
        item.difference,
        item.direction,
        item.category,
        item.cost_impact
      ]);
      discrepancySheet.getRange(2, 1, discrepancyData.length, discrepancyData[0].length)
        .setValues(discrepancyData);
    }

    // Format sheets
    [summarySheet, discrepancySheet].forEach(sheet => {
      sheet.getRange(1, 1, 1, sheet.getLastColumn())
        .setBackground('#4A5568')
        .setFontColor('#FFFFFF')
        .setFontWeight('bold');
      sheet.autoResizeColumns(1, sheet.getLastColumn());
    });

    return {
      success: true,
      fileUrl: spreadsheet.getUrl()
    };

  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return {
      success: false,
      message: error.toString()
    };
  }
}

function exportToPDF(data, folder, storeName, dateFrom, dateTo) {
  try {
    // Create HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #4A5568; border-bottom: 2px solid #4A5568; padding-bottom: 10px; }
          h2 { color: #2D3748; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #4A5568; color: white; padding: 10px; text-align: left; }
          td { padding: 8px; border-bottom: 1px solid #E2E8F0; }
          .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
          .stat-box { padding: 15px; background: #F7FAFC; border-radius: 8px; }
          .stat-label { color: #718096; font-size: 14px; }
          .stat-value { font-size: 24px; font-weight: bold; color: #2D3748; }
        </style>
      </head>
      <body>
        <h1>Inventory Dashboard Report</h1>
        <p><strong>Store:</strong> ${storeName}</p>
        <p><strong>Period:</strong> ${dateFrom} to ${dateTo}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        
        <h2>Statistics</h2>
        <div class="stats">
          <div class="stat-box">
            <div class="stat-label">Total Items</div>
            <div class="stat-value">${data.stats.totalItems}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Sum Diff (Qty)</div>
            <div class="stat-value">${data.stats.sumDiff.toFixed(2)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Shrinkage Rate</div>
            <div class="stat-value">${data.stats.shrinkageRate.toFixed(2)}%</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Top Offender</div>
            <div class="stat-value">${data.stats.topOffender}</div>
          </div>
        </div>
        
        <h2>Discrepancies</h2>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>POS Qty</th>
              <th>Count</th>
              <th>Diff</th>
              <th>Category</th>
              <th>Impact</th>
            </tr>
          </thead>
          <tbody>
            ${data.discrepancies.map(item => `
              <tr>
                <td>${item.product_name}</td>
                <td>${item.pos_quantity}</td>
                <td>${item.manual_quantity}</td>
                <td style="color: ${item.difference > 0 ? 'green' : 'red'}">${item.difference.toFixed(2)}</td>
                <td>${item.category}</td>
                <td>${item.cost_impact}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    // Create blob and save as PDF
    const blob = Utilities.newBlob(htmlContent, 'text/html');
    const pdf = blob.getAs('application/pdf');
    pdf.setName(`Dashboard_${storeName}_${dateFrom}_to_${dateTo}.pdf`);

    const file = folder.createFile(pdf);

    return {
      success: true,
      fileUrl: file.getUrl()
    };

  } catch (error) {
    console.error('Error exporting to PDF:', error);
    return {
      success: false,
      message: error.toString()
    };
  }
}




// ==========================================
// MASTER SETTINGS MANAGEMENT 
// ==========================================

function initializeMasterSettings() {
  try {
    const masterSheet = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    let settingsSheet = masterSheet.getSheetByName('Master_Settings');

    if (!settingsSheet) {
      // สร้าง Master_Settings sheet ถ้ายังไม่มี
      settingsSheet = masterSheet.insertSheet('Master_Settings');

      // สร้าง headers
      const headers = ['setting_key', 'setting_value', 'setting_type', 'description'];
      settingsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);

      // เพิ่ม default settings
      const defaultSettings = [
        ['LINE_ACCESS_TOKEN', '', 'string', 'Line Access Token สำหรับส่งแจ้งเตือน'],
        ['IMGBB_API_KEY', '', 'string', 'ImgBB API Key สำหรับอัพโหลดรูปภาพ']
      ];

      settingsSheet.getRange(2, 1, defaultSettings.length, 4).setValues(defaultSettings);

      // จัด format
      const headerRow = settingsSheet.getRange(1, 1, 1, 4);
      headerRow.setBackground('#4A5568');
      headerRow.setFontColor('#FFFFFF');
      headerRow.setFontWeight('bold');
      settingsSheet.setFrozenRows(1);
    }

    return { success: true, message: 'Master Settings initialized' };
  } catch (error) {
    console.error('Error initializing master settings:', error);
    return { success: false, message: error.toString() };
  }
}


/**
 * ดึงข้อมูลการตั้งค่าหลักจากชีต Master_Settings
 * @returns {object} ผลลัพธ์พร้อมกับ object ของ settings
 */
function getMasterSettings() {
  try {
    const masterSheet = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const settingsSheet = masterSheet.getSheetByName('Master_Settings');

    // กรณีที่ยังไม่มีชีต Master_Settings ให้ trả về object ค่าว่างพร้อมสถานะ success
    if (!settingsSheet) {
      console.warn('Master_Settings sheet not found. Returning empty settings.');
      return {
        success: true,
        settings: {
          LINE_ACCESS_TOKEN: '',
          IMGBB_API_KEY: '',
          OWNER_GROUP_LINE_ID: '', // เพิ่มค่าเริ่มต้น
          FOLLOW_UP_INTERVAL_HOURS: '2' // เพิ่มค่าเริ่มต้น
        }
      };
    }

    const data = settingsSheet.getDataRange().getValues();
    const settings = {};

    // วนลูปเพื่ออ่านค่าทุกแถว (ข้ามหัวตาราง)
    for (let i = 1; i < data.length; i++) {
      const key = data[i][0]; // คอลัมน์ A (setting_key)
      const value = data[i][1]; // คอลัมน์ B (setting_value)
      if (key) {
        settings[key] = value || '';
      }
    }

    // ตรวจสอบว่ามีค่าที่จำเป็นครบหรือไม่ ถ้าไม่มีให้ใส่ค่าเริ่มต้น
    if (!settings.OWNER_GROUP_LINE_ID) {
      settings.OWNER_GROUP_LINE_ID = '';
    }
    if (!settings.FOLLOW_UP_INTERVAL_HOURS) {
      settings.FOLLOW_UP_INTERVAL_HOURS = '2';
    }

    return { success: true, settings: settings };

  } catch (error) {
    console.error('Error getting master settings:', error);
    // กรณีเกิดข้อผิดพลาด ให้ trả về object error พร้อม settings ว่าง
    return {
      success: false,
      message: error.toString(),
      settings: {}
    };
  }
}



function updateMasterSettings(newSettings) {
  try {
    const masterSheet = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    let settingsSheet = masterSheet.getSheetByName('Master_Settings');

    if (!settingsSheet) {
      initializeMasterSettings();
      settingsSheet = masterSheet.getSheetByName('Master_Settings');
    }

    const data = settingsSheet.getDataRange().getValues();

    // อัปเดตค่าที่มีอยู่
    for (let i = 1; i < data.length; i++) {
      const key = data[i][0];
      if (key && newSettings.hasOwnProperty(key)) {
        settingsSheet.getRange(i + 1, 2).setValue(newSettings[key]);
      }
    }

    // --- ส่วนที่แก้ไข ---
    // เปลี่ยนจาก const เป็น let
    let auditSheet = masterSheet.getSheetByName('Master_Audit_Log');

    // ถ้าไม่เจอชีต
    if (!auditSheet) {
      // ให้สร้างชีตใหม่และกำหนดค่าให้กับตัวแปร auditSheet เดิม
      auditSheet = masterSheet.insertSheet('Master_Audit_Log');
      // เพิ่มหัวข้อคอลัมน์
      auditSheet.appendRow(['timestamp', 'action', 'changed_by', 'details']);
    }

    // บันทึก Log การเปลี่ยนแปลง
    // ณ จุดนี้ auditSheet จะมีค่าเป็นชีตเสมอ ทำให้ .appendRow() ทำงานได้
    auditSheet.appendRow([
      new Date(),
      'UPDATE_MASTER_SETTINGS',
      Session.getActiveUser().getEmail(),
      JSON.stringify(newSettings)
    ]);
    // --- จบส่วนที่แก้ไข ---

    return { success: true, message: 'Master settings updated successfully' };
  } catch (error) {
    console.error('Error updating master settings:', error);
    return { success: false, message: error.toString() };
  }
}


function getAPIConfig() {
  const masterSettings = getMasterSettings();
  if (!masterSettings.success) {
    // ถ้าดึงไม่ได้ให้ใช้ค่า default จาก CONFIG
    return CONFIG;
  }

  const settings = masterSettings.settings;

  return {
    ...CONFIG,
    ROOT_FOLDER_ID: settings.ROOT_FOLDER_ID || '',
    OWNER_GROUP_LINE_ID: settings.OWNER_GROUP_LINE_ID || '',
    FOLLOW_UP_INTERVAL_HOURS: settings.FOLLOW_UP_INTERVAL_HOURS || '2',
    LINE_ACCESS_TOKEN: settings.LINE_ACCESS_TOKEN || '',
    GEMINI_API_KEY: settings.GEMINI_API_KEY || '',
    IMGBB_API_KEY: settings.IMGBB_API_KEY || ''
  };
}



// ===================================
// INITIALIZATION FUNCTIONS
// ===================================


function getAllTemplateProducts() {
  return [
    // MAT-Aperitif (15 items)
    { product_code: 'M000172', product_name: 'Fermet Branca', category: 'MAT-Aperitif', unit: 'bottle(700)', cost_price: 1168.23, selling_price: 1850 },
    { product_code: 'M0100', product_name: '1757 Rosso', category: 'MAT-Aperitif', unit: 'bottle(1000)', cost_price: 950.00, selling_price: 1500 },
    { product_code: 'M0104', product_name: 'Campari', category: 'MAT-Aperitif', unit: 'bottle(700)', cost_price: 950.45, selling_price: 1550 },
    { product_code: 'M0105', product_name: 'Aperol', category: 'MAT-Aperitif', unit: 'bottle(700)', cost_price: 845.00, selling_price: 1400 },
    { product_code: 'M0106', product_name: 'Pimms No.1', category: 'MAT-Aperitif', unit: 'bottle(700)', cost_price: 780.00, selling_price: 1300 },
    { product_code: 'M0107', product_name: 'Ricard', category: 'MAT-Aperitif', unit: 'bottle(700)', cost_price: 920.00, selling_price: 1500 },
    { product_code: 'M0108', product_name: 'Pastis 51', category: 'MAT-Aperitif', unit: 'bottle(700)', cost_price: 890.00, selling_price: 1450 },
    { product_code: 'M0109', product_name: 'Dubonnet', category: 'MAT-Aperitif', unit: 'bottle(750)', cost_price: 680.00, selling_price: 1100 },
    { product_code: 'M0110', product_name: 'Lillet Blanc', category: 'MAT-Aperitif', unit: 'bottle(750)', cost_price: 750.00, selling_price: 1200 },
    { product_code: 'M0111', product_name: 'Cynar', category: 'MAT-Aperitif', unit: 'bottle(700)', cost_price: 980.00, selling_price: 1600 },
    { product_code: 'M0112', product_name: 'Suze', category: 'MAT-Aperitif', unit: 'bottle(700)', cost_price: 920.00, selling_price: 1500 },
    { product_code: 'M0113', product_name: 'Chartreuse Green', category: 'MAT-Aperitif', unit: 'bottle(700)', cost_price: 2200.00, selling_price: 3500 },
    { product_code: 'M0114', product_name: 'Chartreuse Yellow', category: 'MAT-Aperitif', unit: 'bottle(700)', cost_price: 1950.00, selling_price: 3200 },
    { product_code: 'M0115', product_name: 'St-Germain', category: 'MAT-Aperitif', unit: 'bottle(750)', cost_price: 1680.00, selling_price: 2700 },
    { product_code: 'M0116', product_name: 'Cocchi Americano', category: 'MAT-Aperitif', unit: 'bottle(750)', cost_price: 950.00, selling_price: 1550 },

    // MAT-Gin (20 items)
    { product_code: 'M0001', product_name: 'Bombay', category: 'MAT-Gin', unit: 'bottle(700)', cost_price: 1092.98, selling_price: 1800 },
    { product_code: 'M0003', product_name: 'Lady Trieu', category: 'MAT-Gin', unit: 'bottle(750)', cost_price: 1500.00, selling_price: 2400 },
    { product_code: 'M0004', product_name: 'Tanqueray No.10', category: 'MAT-Gin', unit: 'bottle(750)', cost_price: 1272.00, selling_price: 2100 },
    { product_code: 'M0005', product_name: 'Hendricks Gin', category: 'MAT-Gin', unit: 'bottle(700)', cost_price: 1901.90, selling_price: 3100 },
    { product_code: 'M0006', product_name: 'Monkey 47', category: 'MAT-Gin', unit: 'bottle(500)', cost_price: 1853.85, selling_price: 3000 },
    { product_code: 'M0007', product_name: 'No.3 London Dry Gin', category: 'MAT-Gin', unit: 'bottle(700)', cost_price: 2824.01, selling_price: 4500 },
    { product_code: 'M0008', product_name: 'Beefeater', category: 'MAT-Gin', unit: 'bottle(700)', cost_price: 750.00, selling_price: 1200 },
    { product_code: 'M0009', product_name: 'Gordon\'s', category: 'MAT-Gin', unit: 'bottle(700)', cost_price: 680.00, selling_price: 1100 },
    { product_code: 'M0010', product_name: 'Plymouth Gin', category: 'MAT-Gin', unit: 'bottle(700)', cost_price: 1450.00, selling_price: 2300 },
    { product_code: 'M0011', product_name: 'Botanist', category: 'MAT-Gin', unit: 'bottle(700)', cost_price: 1780.00, selling_price: 2900 },
    { product_code: 'M0012', product_name: 'Roku Gin', category: 'MAT-Gin', unit: 'bottle(700)', cost_price: 1320.00, selling_price: 2200 },
    { product_code: 'M0013', product_name: 'Aviation Gin', category: 'MAT-Gin', unit: 'bottle(700)', cost_price: 1480.00, selling_price: 2400 },
    { product_code: 'M0014', product_name: 'Silent Pool', category: 'MAT-Gin', unit: 'bottle(700)', cost_price: 2100.00, selling_price: 3400 },
    { product_code: 'M0015', product_name: 'Martin Miller\'s', category: 'MAT-Gin', unit: 'bottle(700)', cost_price: 1580.00, selling_price: 2500 },
    { product_code: 'M0016', product_name: 'Citadelle', category: 'MAT-Gin', unit: 'bottle(700)', cost_price: 1350.00, selling_price: 2200 },
    { product_code: 'M0017', product_name: 'Hayman\'s', category: 'MAT-Gin', unit: 'bottle(700)', cost_price: 1250.00, selling_price: 2000 },
    { product_code: 'M0018', product_name: 'Whitley Neill', category: 'MAT-Gin', unit: 'bottle(700)', cost_price: 1180.00, selling_price: 1900 },
    { product_code: 'M0019', product_name: 'Bloom', category: 'MAT-Gin', unit: 'bottle(700)', cost_price: 1080.00, selling_price: 1750 },
    { product_code: 'M0020', product_name: 'Bobby\'s Gin', category: 'MAT-Gin', unit: 'bottle(700)', cost_price: 1420.00, selling_price: 2300 },
    { product_code: 'M0021', product_name: 'Mare Mediterranean', category: 'MAT-Gin', unit: 'bottle(700)', cost_price: 1680.00, selling_price: 2700 },

    // MAT-Whiskey (30 items)
    { product_code: 'M0031', product_name: 'Red Label', category: 'MAT-Whiskey', unit: 'bottle(700)', cost_price: 818.00, selling_price: 1350 },
    { product_code: 'M0032', product_name: 'Black Label', category: 'MAT-Whiskey', unit: 'bottle(700)', cost_price: 1575.00, selling_price: 2500 },
    { product_code: 'M0033', product_name: 'Jack Daniels', category: 'MAT-Whiskey', unit: 'bottle(700)', cost_price: 1466.35, selling_price: 2400 },
    { product_code: 'M0034', product_name: 'Hennessy VSOP', category: 'MAT-Whiskey', unit: 'bottle(700)', cost_price: 3068.91, selling_price: 4900 },
    { product_code: 'M0035', product_name: 'Jameson', category: 'MAT-Whiskey', unit: 'bottle(700)', cost_price: 1080.00, selling_price: 1750 },
    { product_code: 'M0036', product_name: 'Chivas Regal 12', category: 'MAT-Whiskey', unit: 'bottle(700)', cost_price: 1680.00, selling_price: 2700 },
    { product_code: 'M0037', product_name: 'Macallan 12', category: 'MAT-Whiskey', unit: 'bottle(700)', cost_price: 3500.00, selling_price: 5500 },
    { product_code: 'M0038', product_name: 'Glenfiddich 12', category: 'MAT-Whiskey', unit: 'bottle(700)', cost_price: 1950.00, selling_price: 3100 },
    { product_code: 'M0039', product_name: 'Glenlivet 12', category: 'MAT-Whiskey', unit: 'bottle(700)', cost_price: 1880.00, selling_price: 3000 },
    { product_code: 'M0040', product_name: 'Maker\'s Mark', category: 'MAT-Whiskey', unit: 'bottle(700)', cost_price: 1580.00, selling_price: 2500 },
    { product_code: 'M0041', product_name: 'Wild Turkey', category: 'MAT-Whiskey', unit: 'bottle(700)', cost_price: 1280.00, selling_price: 2100 },
    { product_code: 'M0042', product_name: 'Buffalo Trace', category: 'MAT-Whiskey', unit: 'bottle(700)', cost_price: 1450.00, selling_price: 2350 },
    { product_code: 'M0043', product_name: 'Woodford Reserve', category: 'MAT-Whiskey', unit: 'bottle(700)', cost_price: 1780.00, selling_price: 2850 },
    { product_code: 'M0044', product_name: 'Bulleit Bourbon', category: 'MAT-Whiskey', unit: 'bottle(700)', cost_price: 1380.00, selling_price: 2200 },
    { product_code: 'M0045', product_name: 'Lagavulin 16', category: 'MAT-Whiskey', unit: 'bottle(700)', cost_price: 3850.00, selling_price: 6000 },
    { product_code: 'M0046', product_name: 'Ardbeg 10', category: 'MAT-Whiskey', unit: 'bottle(700)', cost_price: 2450.00, selling_price: 3900 },
    { product_code: 'M0047', product_name: 'Laphroaig 10', category: 'MAT-Whiskey', unit: 'bottle(700)', cost_price: 2280.00, selling_price: 3650 },
    { product_code: 'M0048', product_name: 'Highland Park 12', category: 'MAT-Whiskey', unit: 'bottle(700)', cost_price: 1980.00, selling_price: 3200 },
    { product_code: 'M0049', product_name: 'Talisker 10', category: 'MAT-Whiskey', unit: 'bottle(700)', cost_price: 2180.00, selling_price: 3500 },
    { product_code: 'M0050', product_name: 'Balvenie 12', category: 'MAT-Whiskey', unit: 'bottle(700)', cost_price: 2780.00, selling_price: 4400 },
    { product_code: 'M0051', product_name: 'Nikka From The Barrel', category: 'MAT-Whiskey', unit: 'bottle(500)', cost_price: 1850.00, selling_price: 3000 },
    { product_code: 'M0052', product_name: 'Hibiki Harmony', category: 'MAT-Whiskey', unit: 'bottle(700)', cost_price: 3200.00, selling_price: 5100 },
    { product_code: 'M0053', product_name: 'Yamazaki 12', category: 'MAT-Whiskey', unit: 'bottle(700)', cost_price: 4500.00, selling_price: 7200 },
    { product_code: 'M0054', product_name: 'Crown Royal', category: 'MAT-Whiskey', unit: 'bottle(700)', cost_price: 1380.00, selling_price: 2200 },
    { product_code: 'M0055', product_name: 'Canadian Club', category: 'MAT-Whiskey', unit: 'bottle(700)', cost_price: 780.00, selling_price: 1300 },
    { product_code: 'M0056', product_name: 'Famous Grouse', category: 'MAT-Whiskey', unit: 'bottle(700)', cost_price: 750.00, selling_price: 1200 },
    { product_code: 'M0057', product_name: 'Dewars White', category: 'MAT-Whiskey', unit: 'bottle(700)', cost_price: 850.00, selling_price: 1400 },
    { product_code: 'M0058', product_name: 'Grant\'s', category: 'MAT-Whiskey', unit: 'bottle(700)', cost_price: 680.00, selling_price: 1100 },
    { product_code: 'M0059', product_name: 'Bushmills', category: 'MAT-Whiskey', unit: 'bottle(700)', cost_price: 1150.00, selling_price: 1850 },
    { product_code: 'M0060', product_name: 'Tullamore Dew', category: 'MAT-Whiskey', unit: 'bottle(700)', cost_price: 1080.00, selling_price: 1750 },

    // MAT-Vodka (15 items)
    { product_code: 'M0070', product_name: 'Absolute', category: 'MAT-Vodka', unit: 'bottle(700)', cost_price: 750.00, selling_price: 1200 },
    { product_code: 'M0071', product_name: 'Grey Goose', category: 'MAT-Vodka', unit: 'bottle(700)', cost_price: 1780.00, selling_price: 2850 },
    { product_code: 'M0072', product_name: 'Belvedere', category: 'MAT-Vodka', unit: 'bottle(700)', cost_price: 1680.00, selling_price: 2700 },
    { product_code: 'M0073', product_name: 'Ciroc', category: 'MAT-Vodka', unit: 'bottle(700)', cost_price: 1850.00, selling_price: 2950 },
    { product_code: 'M0074', product_name: 'Ketel One', category: 'MAT-Vodka', unit: 'bottle(700)', cost_price: 1280.00, selling_price: 2100 },
    { product_code: 'M0075', product_name: 'Russian Standard', category: 'MAT-Vodka', unit: 'bottle(700)', cost_price: 680.00, selling_price: 1100 },
    { product_code: 'M0076', product_name: 'Stolichnaya', category: 'MAT-Vodka', unit: 'bottle(700)', cost_price: 750.00, selling_price: 1200 },
    { product_code: 'M0077', product_name: 'Finlandia', category: 'MAT-Vodka', unit: 'bottle(700)', cost_price: 650.00, selling_price: 1050 },
    { product_code: 'M0078', product_name: 'Skyy', category: 'MAT-Vodka', unit: 'bottle(700)', cost_price: 680.00, selling_price: 1100 },
    { product_code: 'M0079', product_name: 'Svedka', category: 'MAT-Vodka', unit: 'bottle(700)', cost_price: 620.00, selling_price: 1000 },
    { product_code: 'M0080', product_name: 'Tito\'s', category: 'MAT-Vodka', unit: 'bottle(700)', cost_price: 980.00, selling_price: 1600 },
    { product_code: 'M0081', product_name: 'Chopin', category: 'MAT-Vodka', unit: 'bottle(700)', cost_price: 1480.00, selling_price: 2400 },
    { product_code: 'M0082', product_name: 'Crystal Head', category: 'MAT-Vodka', unit: 'bottle(700)', cost_price: 2180.00, selling_price: 3500 },
    { product_code: 'M0083', product_name: 'Reyka', category: 'MAT-Vodka', unit: 'bottle(700)', cost_price: 1180.00, selling_price: 1900 },
    { product_code: 'M0084', product_name: 'Zubrowka', category: 'MAT-Vodka', unit: 'bottle(700)', cost_price: 780.00, selling_price: 1300 },

    // MAT-Rum (15 items)
    { product_code: 'M0090', product_name: 'Bacardi White', category: 'MAT-Rum', unit: 'bottle(700)', cost_price: 680.00, selling_price: 1100 },
    { product_code: 'M0091', product_name: 'Captain Morgan', category: 'MAT-Rum', unit: 'bottle(700)', cost_price: 750.00, selling_price: 1200 },
    { product_code: 'M0092', product_name: 'Havana Club 3', category: 'MAT-Rum', unit: 'bottle(700)', cost_price: 780.00, selling_price: 1300 },
    { product_code: 'M0093', product_name: 'Havana Club 7', category: 'MAT-Rum', unit: 'bottle(700)', cost_price: 1280.00, selling_price: 2100 },
    { product_code: 'M0094', product_name: 'Mount Gay', category: 'MAT-Rum', unit: 'bottle(700)', cost_price: 980.00, selling_price: 1600 },
    { product_code: 'M0095', product_name: 'Appleton Estate', category: 'MAT-Rum', unit: 'bottle(700)', cost_price: 1150.00, selling_price: 1850 },
    { product_code: 'M0096', product_name: 'Zacapa 23', category: 'MAT-Rum', unit: 'bottle(700)', cost_price: 2450.00, selling_price: 3900 },
    { product_code: 'M0097', product_name: 'Diplomatico', category: 'MAT-Rum', unit: 'bottle(700)', cost_price: 1680.00, selling_price: 2700 },
    { product_code: 'M0098', product_name: 'Plantation XO', category: 'MAT-Rum', unit: 'bottle(700)', cost_price: 2180.00, selling_price: 3500 },
    { product_code: 'M0099', product_name: 'Kraken Black', category: 'MAT-Rum', unit: 'bottle(700)', cost_price: 1080.00, selling_price: 1750 },
    { product_code: 'M0100R', product_name: 'Sailor Jerry', category: 'MAT-Rum', unit: 'bottle(700)', cost_price: 980.00, selling_price: 1600 },
    { product_code: 'M0101R', product_name: 'Malibu', category: 'MAT-Rum', unit: 'bottle(700)', cost_price: 680.00, selling_price: 1100 },
    { product_code: 'M0102R', product_name: 'Goslings Black Seal', category: 'MAT-Rum', unit: 'bottle(700)', cost_price: 1180.00, selling_price: 1900 },
    { product_code: 'M0103R', product_name: 'El Dorado 12', category: 'MAT-Rum', unit: 'bottle(700)', cost_price: 1580.00, selling_price: 2500 },
    { product_code: 'M0104R', product_name: 'Pyrat XO', category: 'MAT-Rum', unit: 'bottle(700)', cost_price: 1780.00, selling_price: 2850 },

    // MAT-Tequila (15 items)
    { product_code: 'M0120', product_name: 'Jose Cuervo Silver', category: 'MAT-Tequila', unit: 'bottle(700)', cost_price: 780.00, selling_price: 1300 },
    { product_code: 'M0121', product_name: 'Jose Cuervo Gold', category: 'MAT-Tequila', unit: 'bottle(700)', cost_price: 850.00, selling_price: 1400 },
    { product_code: 'M0122', product_name: 'Patron Silver', category: 'MAT-Tequila', unit: 'bottle(700)', cost_price: 2450.00, selling_price: 3900 },
    { product_code: 'M0123', product_name: 'Patron Anejo', category: 'MAT-Tequila', unit: 'bottle(700)', cost_price: 2850.00, selling_price: 4500 },
    { product_code: 'M0124', product_name: 'Don Julio Blanco', category: 'MAT-Tequila', unit: 'bottle(700)', cost_price: 2180.00, selling_price: 3500 },
    { product_code: 'M0125', product_name: 'Don Julio Reposado', category: 'MAT-Tequila', unit: 'bottle(700)', cost_price: 2380.00, selling_price: 3800 },
    { product_code: 'M0126', product_name: '1800 Silver', category: 'MAT-Tequila', unit: 'bottle(700)', cost_price: 1280.00, selling_price: 2100 },
    { product_code: 'M0127', product_name: 'Herradura Silver', category: 'MAT-Tequila', unit: 'bottle(700)', cost_price: 1480.00, selling_price: 2400 },
    { product_code: 'M0128', product_name: 'Espolon Blanco', category: 'MAT-Tequila', unit: 'bottle(700)', cost_price: 980.00, selling_price: 1600 },
    { product_code: 'M0129', product_name: 'Olmeca Altos', category: 'MAT-Tequila', unit: 'bottle(700)', cost_price: 1080.00, selling_price: 1750 },
    { product_code: 'M0130', product_name: 'Cazadores Blanco', category: 'MAT-Tequila', unit: 'bottle(700)', cost_price: 1180.00, selling_price: 1900 },
    { product_code: 'M0131', product_name: 'Milagro Silver', category: 'MAT-Tequila', unit: 'bottle(700)', cost_price: 1380.00, selling_price: 2200 },
    { product_code: 'M0132', product_name: 'Casa Noble', category: 'MAT-Tequila', unit: 'bottle(700)', cost_price: 1980.00, selling_price: 3200 },
    { product_code: 'M0133', product_name: 'Clase Azul Reposado', category: 'MAT-Tequila', unit: 'bottle(700)', cost_price: 5500.00, selling_price: 8800 },
    { product_code: 'M0134', product_name: 'Fortaleza Blanco', category: 'MAT-Tequila', unit: 'bottle(700)', cost_price: 2280.00, selling_price: 3650 },

    // MAT-Liqueur (20 items)
    { product_code: 'M0140', product_name: 'Baileys', category: 'MAT-Liqueur', unit: 'bottle(700)', cost_price: 880.00, selling_price: 1450 },
    { product_code: 'M0141', product_name: 'Kahlua', category: 'MAT-Liqueur', unit: 'bottle(700)', cost_price: 780.00, selling_price: 1300 },
    { product_code: 'M0142', product_name: 'Cointreau', category: 'MAT-Liqueur', unit: 'bottle(700)', cost_price: 1280.00, selling_price: 2100 },
    { product_code: 'M0143', product_name: 'Grand Marnier', category: 'MAT-Liqueur', unit: 'bottle(700)', cost_price: 1580.00, selling_price: 2500 },
    { product_code: 'M0144', product_name: 'Amaretto Disaronno', category: 'MAT-Liqueur', unit: 'bottle(700)', cost_price: 980.00, selling_price: 1600 },
    { product_code: 'M0145', product_name: 'Frangelico', category: 'MAT-Liqueur', unit: 'bottle(700)', cost_price: 1080.00, selling_price: 1750 },
    { product_code: 'M0146', product_name: 'Sambuca', category: 'MAT-Liqueur', unit: 'bottle(700)', cost_price: 880.00, selling_price: 1450 },
    { product_code: 'M0147', product_name: 'Drambuie', category: 'MAT-Liqueur', unit: 'bottle(700)', cost_price: 1480.00, selling_price: 2400 },
    { product_code: 'M0148', product_name: 'Benedictine', category: 'MAT-Liqueur', unit: 'bottle(700)', cost_price: 1380.00, selling_price: 2200 },
    { product_code: 'M0149', product_name: 'Chambord', category: 'MAT-Liqueur', unit: 'bottle(700)', cost_price: 1680.00, selling_price: 2700 },
    { product_code: 'M0150', product_name: 'Midori Melon', category: 'MAT-Liqueur', unit: 'bottle(700)', cost_price: 880.00, selling_price: 1450 },
    { product_code: 'M0151', product_name: 'Triple Sec', category: 'MAT-Liqueur', unit: 'bottle(700)', cost_price: 480.00, selling_price: 800 },
    { product_code: 'M0152', product_name: 'Blue Curacao', category: 'MAT-Liqueur', unit: 'bottle(700)', cost_price: 580.00, selling_price: 950 },
    { product_code: 'M0153', product_name: 'Peach Schnapps', category: 'MAT-Liqueur', unit: 'bottle(700)', cost_price: 680.00, selling_price: 1100 },
    { product_code: 'M0154', product_name: 'Jagermeister', category: 'MAT-Liqueur', unit: 'bottle(700)', cost_price: 980.00, selling_price: 1600 },
    { product_code: 'M0155', product_name: 'Galliano', category: 'MAT-Liqueur', unit: 'bottle(700)', cost_price: 1180.00, selling_price: 1900 },
    { product_code: 'M0156', product_name: 'Luxardo Maraschino', category: 'MAT-Liqueur', unit: 'bottle(700)', cost_price: 1380.00, selling_price: 2200 },
    { product_code: 'M0157', product_name: 'Creme de Cassis', category: 'MAT-Liqueur', unit: 'bottle(700)', cost_price: 780.00, selling_price: 1300 },
    { product_code: 'M0158', product_name: 'Creme de Menthe', category: 'MAT-Liqueur', unit: 'bottle(700)', cost_price: 680.00, selling_price: 1100 },
    { product_code: 'M0159', product_name: 'Limoncello', category: 'MAT-Liqueur', unit: 'bottle(700)', cost_price: 880.00, selling_price: 1450 },

    // Wine (30 items)
    { product_code: 'W001', product_name: 'House Wine Red', category: 'Wine', unit: 'bottle(750)', cost_price: 450.00, selling_price: 850 },
    { product_code: 'W002', product_name: 'House Wine White', category: 'Wine', unit: 'bottle(750)', cost_price: 450.00, selling_price: 850 },
    { product_code: 'W003', product_name: 'Cabernet Sauvignon', category: 'Wine', unit: 'bottle(750)', cost_price: 680.00, selling_price: 1200 },
    { product_code: 'W004', product_name: 'Merlot', category: 'Wine', unit: 'bottle(750)', cost_price: 650.00, selling_price: 1150 },
    { product_code: 'W005', product_name: 'Pinot Noir', category: 'Wine', unit: 'bottle(750)', cost_price: 780.00, selling_price: 1350 },
    { product_code: 'W006', product_name: 'Shiraz', category: 'Wine', unit: 'bottle(750)', cost_price: 720.00, selling_price: 1250 },
    { product_code: 'W007', product_name: 'Malbec', category: 'Wine', unit: 'bottle(750)', cost_price: 750.00, selling_price: 1300 },
    { product_code: 'W008', product_name: 'Chardonnay', category: 'Wine', unit: 'bottle(750)', cost_price: 680.00, selling_price: 1200 },
    { product_code: 'W009', product_name: 'Sauvignon Blanc', category: 'Wine', unit: 'bottle(750)', cost_price: 650.00, selling_price: 1150 },
    { product_code: 'W010', product_name: 'Pinot Grigio', category: 'Wine', unit: 'bottle(750)', cost_price: 620.00, selling_price: 1100 },
    { product_code: 'W011', product_name: 'Riesling', category: 'Wine', unit: 'bottle(750)', cost_price: 680.00, selling_price: 1200 },
    { product_code: 'W012', product_name: 'Moscato', category: 'Wine', unit: 'bottle(750)', cost_price: 580.00, selling_price: 1000 },
    { product_code: 'W013', product_name: 'Prosecco', category: 'Wine', unit: 'bottle(750)', cost_price: 780.00, selling_price: 1350 },
    { product_code: 'W014', product_name: 'Champagne Brut', category: 'Wine', unit: 'bottle(750)', cost_price: 2450.00, selling_price: 3900 },
    { product_code: 'W015', product_name: 'Cava', category: 'Wine', unit: 'bottle(750)', cost_price: 580.00, selling_price: 1000 },
    { product_code: 'W016', product_name: 'Bordeaux Red', category: 'Wine', unit: 'bottle(750)', cost_price: 1280.00, selling_price: 2100 },
    { product_code: 'W017', product_name: 'Burgundy Red', category: 'Wine', unit: 'bottle(750)', cost_price: 1580.00, selling_price: 2500 },
    { product_code: 'W018', product_name: 'Chianti', category: 'Wine', unit: 'bottle(750)', cost_price: 880.00, selling_price: 1500 },
    { product_code: 'W019', product_name: 'Rioja', category: 'Wine', unit: 'bottle(750)', cost_price: 980.00, selling_price: 1650 },
    { product_code: 'W020', product_name: 'Barolo', category: 'Wine', unit: 'bottle(750)', cost_price: 1880.00, selling_price: 3000 },
    { product_code: 'W021', product_name: 'Amarone', category: 'Wine', unit: 'bottle(750)', cost_price: 2180.00, selling_price: 3500 },
    { product_code: 'W022', product_name: 'Chateauneuf du Pape', category: 'Wine', unit: 'bottle(750)', cost_price: 1680.00, selling_price: 2700 },
    { product_code: 'W023', product_name: 'Sancerre', category: 'Wine', unit: 'bottle(750)', cost_price: 1280.00, selling_price: 2100 },
    { product_code: 'W024', product_name: 'Chablis', category: 'Wine', unit: 'bottle(750)', cost_price: 1180.00, selling_price: 1900 },
    { product_code: 'W025', product_name: 'Pouilly-Fuisse', category: 'Wine', unit: 'bottle(750)', cost_price: 1380.00, selling_price: 2200 },
    { product_code: 'W026', product_name: 'Rose Provence', category: 'Wine', unit: 'bottle(750)', cost_price: 880.00, selling_price: 1500 },
    { product_code: 'W027', product_name: 'Port Wine', category: 'Wine', unit: 'bottle(750)', cost_price: 1480.00, selling_price: 2400 },
    { product_code: 'W028', product_name: 'Sherry', category: 'Wine', unit: 'bottle(750)', cost_price: 780.00, selling_price: 1300 },
    { product_code: 'W029', product_name: 'Madeira', category: 'Wine', unit: 'bottle(750)', cost_price: 980.00, selling_price: 1600 },
    { product_code: 'W030', product_name: 'Ice Wine', category: 'Wine', unit: 'bottle(375)', cost_price: 1680.00, selling_price: 2700 },

    // Beer (25 items)
    { product_code: 'B001', product_name: 'Beer Chang', category: 'Beer', unit: 'bottle(320)', cost_price: 32.00, selling_price: 65 },
    { product_code: 'B002', product_name: 'Beer Singha', category: 'Beer', unit: 'bottle(320)', cost_price: 35.00, selling_price: 70 },
    { product_code: 'B003', product_name: 'Beer Leo', category: 'Beer', unit: 'bottle(320)', cost_price: 28.00, selling_price: 55 },
    { product_code: 'B004', product_name: 'Heineken', category: 'Beer', unit: 'bottle(330)', cost_price: 45.00, selling_price: 85 },
    { product_code: 'B005', product_name: 'Tiger Beer', category: 'Beer', unit: 'bottle(330)', cost_price: 38.00, selling_price: 75 },
    { product_code: 'B006', product_name: 'San Miguel Light', category: 'Beer', unit: 'bottle(330)', cost_price: 35.00, selling_price: 70 },
    { product_code: 'B007', product_name: 'Asahi', category: 'Beer', unit: 'bottle(330)', cost_price: 48.00, selling_price: 90 },
    { product_code: 'B008', product_name: 'Corona Extra', category: 'Beer', unit: 'bottle(330)', cost_price: 52.00, selling_price: 95 },
    { product_code: 'B009', product_name: 'Stella Artois', category: 'Beer', unit: 'bottle(330)', cost_price: 50.00, selling_price: 90 },
    { product_code: 'B010', product_name: 'Budweiser', category: 'Beer', unit: 'bottle(330)', cost_price: 42.00, selling_price: 80 },
    { product_code: 'B011', product_name: 'Carlsberg', category: 'Beer', unit: 'bottle(330)', cost_price: 40.00, selling_price: 75 },
    { product_code: 'B012', product_name: 'Hoegaarden', category: 'Beer', unit: 'bottle(330)', cost_price: 55.00, selling_price: 100 },
    { product_code: 'B013', product_name: 'Guinness Stout', category: 'Beer', unit: 'can(440)', cost_price: 65.00, selling_price: 120 },
    { product_code: 'B014', product_name: 'Sapporo', category: 'Beer', unit: 'can(350)', cost_price: 50.00, selling_price: 90 },
    { product_code: 'B015', product_name: 'Kirin', category: 'Beer', unit: 'bottle(330)', cost_price: 48.00, selling_price: 90 },
    { product_code: 'B016', product_name: 'Blue Moon', category: 'Beer', unit: 'bottle(330)', cost_price: 58.00, selling_price: 105 },
    { product_code: 'B017', product_name: 'Leffe Blonde', category: 'Beer', unit: 'bottle(330)', cost_price: 62.00, selling_price: 110 },
    { product_code: 'B018', product_name: 'Chimay Blue', category: 'Beer', unit: 'bottle(330)', cost_price: 85.00, selling_price: 150 },
    { product_code: 'B019', product_name: 'Duvel', category: 'Beer', unit: 'bottle(330)', cost_price: 75.00, selling_price: 135 },
    { product_code: 'B020', product_name: 'Paulaner', category: 'Beer', unit: 'bottle(500)', cost_price: 68.00, selling_price: 120 },
    { product_code: 'B021', product_name: 'Erdinger', category: 'Beer', unit: 'bottle(500)', cost_price: 70.00, selling_price: 125 },
    { product_code: 'B022', product_name: 'Franziskaner', category: 'Beer', unit: 'bottle(500)', cost_price: 65.00, selling_price: 115 },
    { product_code: 'B023', product_name: 'Peroni', category: 'Beer', unit: 'bottle(330)', cost_price: 48.00, selling_price: 85 },
    { product_code: 'B024', product_name: 'Modelo Especial', category: 'Beer', unit: 'bottle(330)', cost_price: 52.00, selling_price: 95 },
    { product_code: 'B025', product_name: 'Beerlao', category: 'Beer', unit: 'bottle(330)', cost_price: 30.00, selling_price: 60 },

    // Snack (20 items)
    { product_code: 'S001', product_name: 'Peanuts', category: 'Snack', unit: 'pack', cost_price: 25.00, selling_price: 50 },
    { product_code: 'S002', product_name: 'Cashew Nuts', category: 'Snack', unit: 'pack', cost_price: 45.00, selling_price: 80 },
    { product_code: 'S003', product_name: 'Mixed Nuts', category: 'Snack', unit: 'pack', cost_price: 55.00, selling_price: 95 },
    { product_code: 'S004', product_name: 'Potato Chips', category: 'Snack', unit: 'pack', cost_price: 30.00, selling_price: 55 },
    { product_code: 'S005', product_name: 'Pretzels', category: 'Snack', unit: 'pack', cost_price: 35.00, selling_price: 60 },
    { product_code: 'S006', product_name: 'Popcorn', category: 'Snack', unit: 'pack', cost_price: 28.00, selling_price: 50 },
    { product_code: 'S007', product_name: 'Nachos', category: 'Snack', unit: 'pack', cost_price: 40.00, selling_price: 70 },
    { product_code: 'S008', product_name: 'Cheese Crackers', category: 'Snack', unit: 'pack', cost_price: 32.00, selling_price: 55 },
    { product_code: 'S009', product_name: 'Rice Crackers', category: 'Snack', unit: 'pack', cost_price: 30.00, selling_price: 50 },
    { product_code: 'S010', product_name: 'Wasabi Peas', category: 'Snack', unit: 'pack', cost_price: 35.00, selling_price: 60 },
    { product_code: 'S011', product_name: 'Dried Squid', category: 'Snack', unit: 'pack', cost_price: 65.00, selling_price: 110 },
    { product_code: 'S012', product_name: 'Beef Jerky', category: 'Snack', unit: 'pack', cost_price: 85.00, selling_price: 140 },
    { product_code: 'S013', product_name: 'Olives', category: 'Snack', unit: 'jar', cost_price: 55.00, selling_price: 95 },
    { product_code: 'S014', product_name: 'Pickles', category: 'Snack', unit: 'jar', cost_price: 45.00, selling_price: 80 },
    { product_code: 'S015', product_name: 'Cheese Platter', category: 'Snack', unit: 'set', cost_price: 180.00, selling_price: 300 },
    { product_code: 'S016', product_name: 'Salami', category: 'Snack', unit: 'pack', cost_price: 95.00, selling_price: 160 },
    { product_code: 'S017', product_name: 'Chocolate', category: 'Snack', unit: 'bar', cost_price: 45.00, selling_price: 75 },
    { product_code: 'S018', product_name: 'Candy Mix', category: 'Snack', unit: 'pack', cost_price: 35.00, selling_price: 60 },
    { product_code: 'S019', product_name: 'Dried Fruits', category: 'Snack', unit: 'pack', cost_price: 50.00, selling_price: 85 },
    { product_code: 'S020', product_name: 'Trail Mix', category: 'Snack', unit: 'pack', cost_price: 60.00, selling_price: 100 }
  ];
}


function uploadImageToImgbbBackend(base64Image) {
  const apiConfig = getAPIConfig();
  const apiKey = apiConfig.IMGBB_API_KEY;

  if (!apiKey || apiKey === 'YOUR_API_KEY_HERE' || apiKey === '') {
    return { success: false, message: 'ImgBB API Key ยังไม่ได้ตั้งค่าใน Master Settings' };
  }

  try {
    const base64Data = base64Image.split(',')[1];
    const apiUrl = `https://api.imgbb.com/1/upload?key=${apiKey}`;

    const payload = {
      'image': base64Data
    };

    const options = {
      'method': 'post',
      'payload': payload,
      'muteHttpExceptions': true
    };

    const response = UrlFetchApp.fetch(apiUrl, options);
    const result = JSON.parse(response.getContentText());

    if (result.success) {
      return { success: true, url: result.data.display_url };
    } else {
      console.error('ImgBB Upload Failed:', result);
      return { success: false, message: result.error ? result.error.message : 'Unknown error from ImgBB' };
    }

  } catch (error) {
    console.error('Error in uploadImageToImgbbBackend:', error);
    return { success: false, message: error.toString() };
  }
}

// แก้ไขฟังก์ชัน sendLineNotification ให้ใช้ Master Settings
function sendLineNotification(groupLineId, message) {
  try {
    const apiConfig = getAPIConfig();
    const accessToken = apiConfig.LINE_ACCESS_TOKEN;

    if (!accessToken || accessToken === '') {
      console.error('Line Access Token ยังไม่ได้ตั้งค่าใน Master Settings');
      return { success: false, message: 'Line Access Token not configured' };
    }

    const url = 'https://notify-api.line.me/api/notify';

    const options = {
      'method': 'post',
      'headers': {
        'Authorization': 'Bearer ' + accessToken
      },
      'payload': {
        'message': '\n' + message,
        'notificationDisabled': false
      },
      'muteHttpExceptions': true
    };

    const response = UrlFetchApp.fetch(url, options);
    const responseData = JSON.parse(response.getContentText());

    if (responseData.status === 200) {
      console.log('Line notification sent successfully to group:', groupLineId);
      return { success: true };
    } else {
      console.error('Line notification failed:', responseData);
      return { success: false, message: responseData.message };
    }

  } catch (error) {
    console.error('Error sending Line notification:', error);
    return { success: false, message: error.toString() };
  }
}


// ==========================================
// LOGGING SYSTEM
// ==========================================

function logDetail(sheetId, logType, message, data = null) {
  if (!CONFIG.ENABLE_DETAILED_LOGS) return;

  try {
    const ss = SpreadsheetApp.openById(sheetId);
    let logSheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);

    // สร้าง log sheet ถ้ายังไม่มี
    if (!logSheet) {
      logSheet = ss.insertSheet(CONFIG.LOG_SHEET_NAME);
      logSheet.appendRow(['Timestamp', 'Type', 'Message', 'Data', 'Provider']);
    }

    const timestamp = new Date().toLocaleString('th-TH', { timeZone: CONFIG.DEFAULT_TIMEZONE });
    const dataStr = data ? JSON.stringify(data).substring(0, 5000) : ''; // จำกัด 5000 ตัวอักษร

    logSheet.appendRow([
      timestamp,
      logType,
      message,
      dataStr,
      CONFIG.AI_PROVIDER
    ]);

    // เก็บแค่ 1000 แถวล่าสุด
    if (logSheet.getLastRow() > 1000) {
      logSheet.deleteRows(2, logSheet.getLastRow() - 1000);
    }

  } catch (error) {
    Logger.log('Logging error: ' + error.toString());
  }
}




// ==========================================
// Export SYSTEM
// ==========================================


/**
 * ฟังก์ชันหลักในการ Export ไฟล์ (ฉบับแก้ไข)
 * แก้ไข Logic การคำนวณ Summary ให้ถูกต้อง
 */
function exportDailyChecklist(sheetId, date, format) {
  try {
    // --- 1. ดึงข้อมูลทั้งหมดของวันนั้นๆ (ไม่มีการกรองออก) ---
    const comparisonData = getComparisonResults(sheetId, date);
    if (!comparisonData.success || comparisonData.results.length === 0) {
      return { success: false, message: `ไม่พบข้อมูลการเปรียบเทียบของวันที่ ${date}` };
    }
    const items = comparisonData.results;

    // --- 2. ดึงข้อมูลเสริม (Category, Unit) ---
    const storeSheet = SpreadsheetApp.openById(sheetId);
    const productsSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.PRODUCTS);
    const productsData = productsSheet.getDataRange().getValues();
    const productMap = {};
    for (let i = 1; i < productsData.length; i++) {
      const row = productsData[i];
      productMap[row[1]] = { category: row[4], unit: row[5] };
    }

    // --- 3. คำนวณข้อมูลสรุป (แก้ไขใหม่ให้ถูกต้อง) ---
    const totalItemsInReport = items.length;
    const diffItemCount = items.filter(item => item.difference !== 0).length;

    const summary = {
      totalItems: totalItemsInReport,
      diffItemCount: diffItemCount
    };

    // --- 4. ดึงชื่อร้านค้า ---
    const settings = getSettings(storeSheet.getSheetByName(CONFIG.STORE_SHEETS.SETTINGS));
    const storeName = settings.store_name || 'Unknown Store';

    // --- 5. สร้างข้อมูลสำหรับใส่ในตาราง (ไม่มีการกรองออก) ---
    const tableData = items.map(item => {
      const productInfo = productMap[item.product_code] || { category: 'N/A', unit: 'N/A' };
      return [
        item.product_code,
        item.product_name,
        productInfo.category,
        item.pos_quantity,
        item.manual_quantity,
        item.difference,
        productInfo.unit
      ];
    });

    // --- 6. สร้างไฟล์ตาม Format ที่เลือก ---
    const parentFolder = DriveApp.getFileById(sheetId).getParents().next();
    if (format === 'excel') {
      return createDailyChecklistExcel(parentFolder, storeName, date, summary, tableData);
    } else if (format === 'pdf') {
      return createDailyChecklistPdf(parentFolder, storeName, date, summary, tableData);
    }

  } catch (e) {
    return { success: false, message: e.toString() };
  }
}



/**
 * ฟังก์ชันสำหรับสร้างไฟล์ PDF (ฉบับแก้ไข)
 * ปรับปรุงการแสดงผล Summary ให้ถูกต้อง
 */
function createDailyChecklistPdf(folder, storeName, date, summary, tableData) {
  const dateParts = date.split('-');
  const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
  const fileName = `Daily_Stock_Check_${storeName.replace(/\s/g, '_')}_${formattedDate}.pdf`;
  const headers = ['product_code', 'product_name', 'category', 'POS Count', 'Manual Count', 'Difference', 'unit'];

  let html = `
    <style>
      body { font-family: 'Tahoma'; font-size: 12px; }
      h1, h3 { color: #333; }
      table { width: 100%; border-collapse: collapse; border: 1px solid #333; }
      th, td { border: 1px solid #333; text-align: left; padding: 6px; }
      th { background-color: #f2f2f2; font-weight: bold; }
      .summary-table { width: 400px; border: none; margin-bottom: 20px; }
      .summary-table td { border: none; padding: 4px; }
      .summary-table .label { text-align: left; }
      .summary-table .value { text-align: center; font-weight: bold; }
    </style>
    <h1>รายการเช็คสต๊อกประจำวัน</h1>
    <p><b>สาขา:</b> ${storeName}</p>
    <p><b>วันที่:</b> ${formattedDate}</p>
    <hr>
    <h3>สรุปข้อมูล</h3>
    <table class="summary-table">
      <tr>
        <td class="label">จำนวนรายการทั้งหมดในรายงาน:</td>
        <td class="value">${summary.totalItems}</td>
      </tr>
      <tr>
        <td class="label">จำนวนรายการที่แตกต่างกัน:</td>
        <td class="value">${summary.diffItemCount}</td>
      </tr>
    </table>
    <hr>
    <h3>ตารางข้อมูล</h3>
    <table>
      <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
      ${tableData.map(row => {
    const difference = parseFloat(row[5]);
    let diffColor = 'black';
    if (difference > 0) { diffColor = 'green'; }
    else if (difference < 0) { diffColor = 'red'; }
    const differenceText = difference > 0 ? `+${difference.toFixed(2)}` : difference.toFixed(2);
    return `
          <tr>
            <td>${row[0]}</td>
            <td>${row[1]}</td>
            <td>${row[2]}</td>
            <td>${row[3]}</td>
            <td>${row[4]}</td>
            <td style="color: ${diffColor}; font-weight: bold;">${differenceText}</td>
            <td>${row[6]}</td>
          </tr>
        `;
  }).join('')}
    </table>
  `;

  const blob = Utilities.newBlob(html, 'text/html', fileName);
  const pdfFile = folder.createFile(blob.getAs('application/pdf'));
  return { success: true, fileUrl: pdfFile.getUrl() };
}



/**
 * ฟังก์ชันสำหรับสร้างไฟล์ Excel (ฉบับแก้ไข)
 * ปรับปรุงการแสดงผล Summary ให้ถูกต้อง
 */
function createDailyChecklistExcel(folder, storeName, date, summary, tableData) {
  const dateParts = date.split('-');
  const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
  const fileName = `Daily_Stock_Check_${storeName.replace(/\s/g, '_')}_${formattedDate}`;
  const spreadsheet = SpreadsheetApp.create(fileName);
  const sheet = spreadsheet.getActiveSheet();
  sheet.setName("Stock Check Report");

  sheet.getRange('A1').setValue('รายการเช็คสต๊อกประจำวัน').setFontWeight('bold').setFontSize(14);
  sheet.getRange('A2').setValue(`สาขา: ${storeName}`);
  sheet.getRange('A3').setValue(`วันที่: ${formattedDate}`);

  sheet.getRange('A5').setValue('สรุปข้อมูล').setFontWeight('bold');
  const summaryRange = sheet.getRange('A6:B7'); // ปรับ Range ให้เหลือ 2 แถว
  summaryRange.setValues([
    ['จำนวนรายการทั้งหมดในรายงาน', summary.totalItems],
    ['จำนวนรายการที่แตกต่างกัน', summary.diffItemCount]
  ]);
  sheet.getRange('B6:B7').setHorizontalAlignment('center');

  const headers = ['product_code', 'product_name', 'category', 'POS Count', 'Manual Count', 'Difference', 'unit'];
  const headerRange = sheet.getRange(9, 1, 1, headers.length); // เลื่อนตารางลงมาที่แถว 9
  headerRange.setValues([headers]).setFontWeight('bold').setBackground('#D3D3D3');

  if (tableData.length > 0) {
    sheet.getRange(10, 1, tableData.length, tableData[0].length).setValues(tableData);
  }

  const tableRange = sheet.getRange(9, 1, tableData.length + 1, headers.length);
  tableRange.setBorder(true, true, true, true, true, true);

  const diffColumnRange = sheet.getRange(10, 6, tableData.length, 1);
  diffColumnRange.setNumberFormat('+#,##0.00;-#,##0.00;0.00');

  const redRule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(0).setFontColor("#9C0006").setBold(true).setRanges([diffColumnRange]).build();
  const greenRule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThan(0).setFontColor("#006100").setBold(true).setRanges([diffColumnRange]).build();

  const rules = sheet.getConditionalFormatRules();
  rules.push(redRule, greenRule);
  sheet.setConditionalFormatRules(rules);

  sheet.autoResizeColumns(1, headers.length);

  const file = DriveApp.getFileById(spreadsheet.getId());
  file.moveTo(folder);
  return { success: true, fileUrl: spreadsheet.getUrl() };
}




// ===================================
// DISCREPANCY DASHBOARD FUNCTIONS 
// ===================================

function approvePartialItems(sheetId, date, compIds, ownerName, reason) {
  try {
    const storeSheet = SpreadsheetApp.openById(sheetId);
    const compSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.COMPARISON);

    // ดึง headers และหา index
    const headers = compSheet.getRange(1, 1, 1, compSheet.getLastColumn()).getValues()[0];
    const compIdIdx = headers.indexOf('comp_id');
    const dateIdx = headers.indexOf('comp_date');
    const approvalStatusIdx = headers.indexOf('approval_status');
    const approvedByIdx = headers.indexOf('approved_by');
    const ownerNotesIdx = headers.indexOf('owner_notes');

    if (compIdIdx === -1 || dateIdx === -1 || approvalStatusIdx === -1) {
      throw new Error('Required columns not found in Comparison sheet');
    }

    // ดึงข้อมูลทั้งหมด
    const data = compSheet.getDataRange().getValues();
    let updatedCount = 0;
    const approvedItems = [];

    // วนลูปอัปเดตข้อมูล
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowDate = (row[dateIdx] instanceof Date)
        ? Utilities.formatDate(row[dateIdx], Session.getScriptTimeZone(), 'yyyy-MM-dd')
        : (row[dateIdx] ? row[dateIdx].toString().substring(0, 10) : '');

      if (rowDate === date && compIds.includes(row[compIdIdx])) {
        // เก็บข้อมูลสำหรับ notification
        approvedItems.push({
          product_name: row[headers.indexOf('product_name')],
          manual_quantity: row[headers.indexOf('manual_quantity')],
          pos_quantity: row[headers.indexOf('pos_quantity')],
          difference: row[headers.indexOf('difference')]
        });

        // อัปเดตข้อมูลในชีต
        compSheet.getRange(i + 1, approvalStatusIdx + 1).setValue('approved');
        compSheet.getRange(i + 1, approvedByIdx + 1).setValue(ownerName);
        compSheet.getRange(i + 1, ownerNotesIdx + 1).setValue(reason);
        updatedCount++;
      }
    }

    // ส่ง Line Notification
    if (updatedCount > 0) {
      const storeInfo = getStoreInfoBySheetId(sheetId);

      // แก้ไข: ใช้ sheetId และดึง settings ที่ถูกต้อง
      const storeSettingsResult = getStoreSettings(sheetId);

      Logger.log('Store Info:', storeInfo);
      Logger.log('Store Settings Result:', storeSettingsResult);

      if (storeSettingsResult.success && storeSettingsResult.settings && storeSettingsResult.settings.group_line_id) {
        const data = {
          storeId: storeInfo.id,
          storeName: storeInfo.name,
          date: date,
          items: approvedItems.slice(0, 5), // แสดงแค่ 5 รายการแรก
          ownerName: ownerName,
          remark: reason || 'อนุมัติบางรายการ',
          notificationText: `[${storeInfo.name}] เจ้าของได้อนุมัติบางรายการแล้ว`
        };

        Logger.log('Sending notification with data:', data);

        sendAppNotification(storeSettingsResult.settings.group_line_id, 'OWNER_APPROVED', data);

        Logger.log(`Partial approval notification sent to group: ${storeSettingsResult.settings.group_line_id}`);
      } else {
        Logger.log('Failed to send notification - no group_line_id or settings not found');
      }
    }

    return {
      success: true,
      message: `อนุมัติ ${updatedCount} รายการเรียบร้อยแล้ว และส่งการแจ้งเตือนแล้ว`
    };

  } catch (e) {
    Logger.log(`ERROR in approvePartialItems: ${e.toString()}`);
    return { success: false, message: e.toString() };
  }
}




function getDiscrepancyDashboardData(sheetId, dateFrom, dateTo) {
  try {
    // --- จุดที่ 1: ตรวจสอบค่าที่รับเข้ามา ---
    Logger.log(`--- Starting Debug ---`);
    Logger.log(`1. Received date range: From ${dateFrom} To ${dateTo}`);

    const storeSheet = SpreadsheetApp.openById(sheetId);
    const comparisonSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.COMPARISON);
    const productsSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.PRODUCTS);
    const ocrLogSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.OCR_LOG);
    const manualCountSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.MANUAL_COUNT);
    if (!productsSheet) {
      throw new Error("Sheet 'Products' not found.");
    }

    const timeZone = Session.getScriptTimeZone();

    // --- START: LOGIC ใหม่ ---

    // 1. สร้าง Array ของทุกวันในช่วงที่เลือก
    const dateRange = [];
    let currentDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    while (currentDate <= endDate) {
      dateRange.push(Utilities.formatDate(currentDate, timeZone, 'yyyy-MM-dd'));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 2. ดึงข้อมูลสถานะทั้งหมดมาเตรียมไว้
    const successfulPdfUploads = new Set();
    if (ocrLogSheet) {
      ocrLogSheet.getDataRange().getValues().slice(1).forEach(row => {
        const dateStr = (row[1] instanceof Date) ? Utilities.formatDate(row[1], timeZone, 'yyyy-MM-dd') : (row[1] ? row[1].toString().substring(0, 10) : '');
        if (row[10] === 'success') successfulPdfUploads.add(dateStr);
      });
    }

    const successfulManualCounts = new Set();
    if (manualCountSheet) {
      manualCountSheet.getDataRange().getValues().slice(1).forEach(row => {
        const dateStr = (row[1] instanceof Date) ? Utilities.formatDate(row[1], timeZone, 'yyyy-MM-dd') : (row[1] ? row[1].toString().substring(0, 10) : '');
        if (row[7] === 'submitted') successfulManualCounts.add(dateStr);
      });
    }

    // 3. ดึงข้อมูล Comparison ทั้งหมดมาประมวลผลใส่ Map เพื่อความเร็ว
    const productInfoMap = new Map();
    productsSheet.getDataRange().getValues().slice(1).forEach(row => {
      productInfoMap.set(row[1], { cost: parseFloat(row[6]) || 0, category: row[4] || 'Unknown' });
    });
    const comparisonDataMap = new Map();
    if (comparisonSheet) {
      const compData = comparisonSheet.getDataRange().getValues();
      for (let i = 1; i < compData.length; i++) {
        const row = compData[i];
        const dateStr = (row[1] instanceof Date) ? Utilities.formatDate(row[1], timeZone, 'yyyy-MM-dd') : (row[1] ? row[1].toString().substring(0, 10) : '');
        if (!comparisonDataMap.has(dateStr)) {
          comparisonDataMap.set(dateStr, {
            items: [], isFullyApproved: true, hasRejection: false, explainedBy: new Set()
          });
        }

        const dayData = comparisonDataMap.get(dateStr);
        const approvalStatus = row[12] || 'pending';
        if (approvalStatus !== 'approved') dayData.isFullyApproved = false;
        if (approvalStatus === 'rejected') dayData.hasRejection = true;
        if (row[10]) dayData.explainedBy.add(row[10]);

        dayData.items.push({
          product_code: row[2],
          difference: parseFloat(row[6]) || 0,
          explanation: row[9] || '',
          approval_status: approvalStatus,
          productInfo: productInfoMap.get(row[2]) || { cost: 0, category: 'Unknown' }
        });
      }
    }

    // --- จุดที่ 2: ตรวจสอบว่าดึงข้อมูลจากชีท Comparison มาได้กี่วัน ---
    Logger.log(`2. Found data for ${comparisonDataMap.size} unique days in 'Comparison' sheet.`);

    // 4. สร้างข้อมูลสำหรับ Frontend (KPIs, Charts, Table)
    let kpiShrinkage = 0, kpiOverage = 0, kpiPending = 0;
    const trendChartData = [], tableData = [];
    const categoryValues = {};
    let totalDiscrepancyDays = 0;
    // วนลูปตามวันที่ที่ดึงมาจาก Comparison Map เพื่อคำนวณ KPI และ Chart
    for (const [date, dayData] of comparisonDataMap.entries()) {
      // --- จุดที่ 3: ตรวจสอบการกรองข้อมูลตามช่วงวันที่ ---
      if (date < dateFrom || date > dateTo) {
        // Logger.log(` - Skipping date ${date} (outside range)`); // สามารถเปิด log นี้เพื่อดูวันที่ถูกข้ามได้
        continue;
      }
      Logger.log(`3. Processing data for date: ${date} (within range)`);

      let dayShrinkage = 0, dayOverage = 0, hasDiscrepancy = false;
      dayData.items.forEach(item => {
        const financialImpact = item.difference * item.productInfo.cost;
        if (financialImpact < 0) dayShrinkage += Math.abs(financialImpact);
        else dayOverage += financialImpact;
        if (item.difference !== 0) {
          hasDiscrepancy = true;
          const cleanCategory = item.productInfo.category.replace('MAT-', '');
          categoryValues[cleanCategory] = (categoryValues[cleanCategory] || 0) + Math.abs(financialImpact);
        }
      });
      kpiShrinkage += dayShrinkage;
      kpiOverage += dayOverage;
      if (hasDiscrepancy) totalDiscrepancyDays++;

      let overallStatus = 'pending';
      if (dayData.hasRejection) overallStatus = 'rejected';
      else if (dayData.isFullyApproved) overallStatus = 'approved';
      if (overallStatus === 'pending') kpiPending++;

      trendChartData.push({ date: date, shrinkage: dayShrinkage, overage: dayOverage });
    }

    // --- จุดที่ 4: ตรวจสอบผลลัพธ์ของ categoryValues ก่อนแปลงเป็น Array ---
    Logger.log(`4. Final 'categoryValues' object before conversion: ${JSON.stringify(categoryValues)}`);

    // วนลูปตามช่วงวันที่ที่เลือก เพื่อสร้างข้อมูลตาราง
    dateRange.forEach(dateStr => {
      const hasPdf = successfulPdfUploads.has(dateStr);
      const hasManual = successfulManualCounts.has(dateStr);
      const compData = comparisonDataMap.get(dateStr);

      if (compData) { // กรณีมีผลเปรียบเทียบแล้ว
        const summaryCounts = { total: 0, explained: 0, pending: 0, rejected: 0 };
        let financialImpactSum = 0;
        compData.items.forEach(item => {
          if (item.difference !== 0) {
            summaryCounts.total++;
            if (item.explanation) summaryCounts.explained++;
            if (item.approval_status === 'pending' && item.explanation) summaryCounts.pending++;
            if (item.approval_status === 'rejected') summaryCounts.rejected++;
          }
          financialImpactSum += item.difference * item.productInfo.cost;
        });

        let overallStatus = 'pending';
        if (compData.hasRejection) overallStatus = 'rejected';
        else if (compData.isFullyApproved && summaryCounts.total > 0) overallStatus = 'approved';
        tableData.push({
          id: dateStr, date: dateStr, hasPdfUpload: hasPdf, hasManualCount: hasManual,
          isComplete: true, // ระบุว่าขั้นตอนนี้สมบูรณ์แล้ว
          approvalStatus: overallStatus,
          summaryCounts: summaryCounts,
          financialImpact: financialImpactSum
        });
      } else { // กรณีที่ยังไม่มีผลเปรียบเทียบ
        let statusText = 'รอการดำเนินการ';
        if (!hasPdf && !hasManual) statusText = 'รอ PDF และนับสต๊อก';
        else if (!hasPdf) statusText = 'รออัปโหลด PDF';
        else if (!hasManual) statusText = 'รอนับสต๊อก';

        tableData.push({
          id: dateStr, date: dateStr, hasPdfUpload: hasPdf, hasManualCount: hasManual,
          isComplete: false, // ระบุว่ายังไม่สมบูรณ์
          approvalStatus: 'pending',
          summaryCounts: { displayText: statusText }, // ส่งเป็นข้อความไปแสดงแทน
          financialImpact: 0
        });
      }
    });

    // 5. ส่งข้อมูลกลับ
    const accuracyRate = dateRange.length > 0 ?
      ((dateRange.length - totalDiscrepancyDays) / dateRange.length) * 100 : 100;

    const resultData = {
      kpis: {
        shrinkageValue: kpiShrinkage, overageValue: kpiOverage, pendingApprovalCount: kpiPending, accuracyRate: accuracyRate
      },
      trendChartData: trendChartData.sort((a, b) => new Date(a.date) - new Date(b.date)),
      categoryChartData: Object.entries(categoryValues).map(([category, value]) => ({ category, value })),
      tableData: tableData.sort((a, b) => new Date(b.date) - new Date(a.date))
    };

    // --- จุดที่ 5: ตรวจสอบข้อมูลสุดท้ายที่จะส่งกลับไป ---
    Logger.log(`5. Final 'categoryChartData' being sent: ${JSON.stringify(resultData.categoryChartData)}`);
    Logger.log(`--- Debug End ---`);

    return {
      success: true,
      data: resultData
    };
  } catch (e) {
    Logger.log("Error in getDiscrepancyDashboardData: " + e.toString() + "\n" + e.stack);
    return { success: false, message: e.toString() };
  }
}



/**
 * ดึงรายละเอียดของรายการผลต่างที่ "รอการอนุมัติ" ในวันที่ระบุ
 * @param {string} sheetId - ID ของ Google Sheet
 * @param {string} date - วันที่ที่ต้องการ (yyyy-MM-dd)
 * @returns {object} ผลลัพธ์ที่มีเฉพาะรายการที่รออนุมัติ
 */
function getPendingDiscrepancyDetailsForDate(sheetId, date) {
  try {
    const comparisonData = getComparisonResults(sheetId, date);
    if (!comparisonData.success) {
      return comparisonData;
    }

    // กรองเอาเฉพาะรายการที่เป็น 'discrepancy' และมีสถานะการอนุมัติเป็น 'pending' หรือยังไม่มีค่า (null/undefined)
    const pendingDiscrepancies = comparisonData.results.filter(item =>
      item.status === 'discrepancy' &&
      (item.approval_status === 'pending' || !item.approval_status)
    );

    return { success: true, details: pendingDiscrepancies };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}






function approveMultipleDays(sheetId, dates, approverName, reason) { // <--- เพิ่ม reason
  try {
    const storeSheet = SpreadsheetApp.openById(sheetId);
    const comparisonSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.COMPARISON);
    const data = comparisonSheet.getDataRange().getValues();
    const dateSet = new Set(dates);
    const timeZone = Session.getScriptTimeZone();
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const dateStr = (row[1] instanceof Date) ? Utilities.formatDate(row[1], timeZone, 'yyyy-MM-dd') : (row[1] ? row[1].toString().substring(0, 10) : '');
      if (dateSet.has(dateStr) && (row[12] === 'pending' || !row[12])) {
        comparisonSheet.getRange(i + 1, 13).setValue('approved');
        // approval_status (M)
        comparisonSheet.getRange(i + 1, 12).setValue(approverName);
        // approved_by (L)
        comparisonSheet.getRange(i + 1, 14).setValue(reason); // <--- เพิ่มการบันทึก reason ในคอลัมน์ N
      }
    }
    return { success: true };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}



function rejectPartialItems(sheetId, date, compIds, ownerName, reason) {
  try {
    const storeSheet = SpreadsheetApp.openById(sheetId);
    const compSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.COMPARISON);

    // ดึง headers และหา index
    const headers = compSheet.getRange(1, 1, 1, compSheet.getLastColumn()).getValues()[0];
    const compIdIdx = headers.indexOf('comp_id');
    const dateIdx = headers.indexOf('comp_date');
    const approvalStatusIdx = headers.indexOf('approval_status');
    const approvedByIdx = headers.indexOf('approved_by');
    const ownerNotesIdx = headers.indexOf('owner_notes');

    if (compIdIdx === -1 || dateIdx === -1 || approvalStatusIdx === -1) {
      throw new Error('Required columns not found in Comparison sheet');
    }

    // ดึงข้อมูลทั้งหมด
    const data = compSheet.getDataRange().getValues();
    let updatedCount = 0;
    const rejectedItems = [];

    // วนลูปอัปเดตข้อมูล
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowDate = (row[dateIdx] instanceof Date)
        ? Utilities.formatDate(row[dateIdx], Session.getScriptTimeZone(), 'yyyy-MM-dd')
        : (row[dateIdx] ? row[dateIdx].toString().substring(0, 10) : '');

      if (rowDate === date && compIds.includes(row[compIdIdx])) {
        // เก็บข้อมูลสำหรับ notification
        rejectedItems.push({
          product_name: row[headers.indexOf('product_name')],
          manual_quantity: row[headers.indexOf('manual_quantity')],
          pos_quantity: row[headers.indexOf('pos_quantity')],
          difference: row[headers.indexOf('difference')]
        });

        // อัปเดตข้อมูลในชีต
        compSheet.getRange(i + 1, approvalStatusIdx + 1).setValue('rejected');
        compSheet.getRange(i + 1, approvedByIdx + 1).setValue(ownerName);
        compSheet.getRange(i + 1, ownerNotesIdx + 1).setValue(reason);
        updatedCount++;
      }
    }

    // ส่ง Line Notification
    if (updatedCount > 0) {
      const storeInfo = getStoreInfoBySheetId(sheetId);

      // แก้ไข: ใช้ sheetId และดึง settings ที่ถูกต้อง
      const storeSettingsResult = getStoreSettings(sheetId);

      Logger.log('Store Info:', storeInfo);
      Logger.log('Store Settings Result:', storeSettingsResult);

      if (storeSettingsResult.success && storeSettingsResult.settings && storeSettingsResult.settings.group_line_id) {
        const data = {
          storeId: storeInfo.id,
          storeName: storeInfo.name,
          date: date,
          items: rejectedItems.slice(0, 5), // แสดงแค่ 5 รายการแรก
          ownerName: ownerName,
          remark: reason || 'ไม่อนุมัติ',
          notificationText: `[${storeInfo.name}] เจ้าของไม่อนุมัติบางรายการ`
        };

        Logger.log('Sending notification with data:', data);

        sendAppNotification(storeSettingsResult.settings.group_line_id, 'OWNER_REJECTED', data);

        Logger.log(`Partial rejection notification sent to group: ${storeSettingsResult.settings.group_line_id}`);
      } else {
        Logger.log('Failed to send notification - no group_line_id or settings not found');
      }
    }

    return {
      success: true,
      message: `ปฏิเสธ ${updatedCount} รายการเรียบร้อยแล้ว และส่งการแจ้งเตือนแล้ว`
    };

  } catch (e) {
    Logger.log(`ERROR in rejectPartialItems: ${e.toString()}`);
    return { success: false, message: e.toString() };
  }
}


/**
 * ฟังก์ชันสำหรับ Export Report เป็น Excel หรือ PDF (แก้ไขส่วน PDF)
 */
function exportDiscrepancyReport(sheetId, reportData, format, dateFrom, dateTo) {
  try {
    const masterSheet = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const storesSheet = masterSheet.getSheetByName(CONFIG.MASTER_SHEETS.STORES);
    const storesData = storesSheet.getDataRange().getValues();
    let storeFolderId = null;
    let storeName = '';
    for (let i = 1; i < storesData.length; i++) {
      const row = storesData[i];
      if (row[3] === sheetId) {
        storeFolderId = row[4];
        storeName = row[2];
        break;
      }
    }
    if (!storeFolderId) throw new Error("Store folder not found.");

    const parentFolder = DriveApp.getFolderById(storeFolderId);
    const reportFolder = getOrCreateSubFolder(parentFolder, "Discrepancy Reports");
    const fileName = `Discrepancy_Report_${storeName}_${dateFrom}_to_${dateTo}`.replace(/\s/g, '_');

    const summary = reportData.reduce((acc, row) => {
      if (row.financialImpact < 0) acc.shrinkageValue += Math.abs(row.financialImpact);
      else acc.overageValue += row.financialImpact;
      return acc;
    }, { shrinkageValue: 0, overageValue: 0 });

    if (format === 'excel') {
      // ส่วนของ Excel ทำงานถูกต้องแล้ว (โค้ดเหมือนเดิม)
      const spreadsheet = SpreadsheetApp.create(fileName);
      const sheet = spreadsheet.getActiveSheet();
      sheet.setName("Report");
      sheet.getRange('A1:B1').merge().setValue('Discrepancy Report').setFontWeight('bold').setFontSize(14);
      sheet.getRange('A2').setValue('Store:').setValue(storeName);
      sheet.getRange('A3').setValue('Period:').setValue(`${dateFrom} to ${dateTo}`);
      sheet.getRange('A5:B5').setValues([['Total Shrinkage', 'Total Overage']]).setFontWeight('bold');
      sheet.getRange('A6:B6').setValues([[summary.shrinkageValue, summary.overageValue]]).setNumberFormat('#,##0.00');
      const headers = ['Date', 'Explained By', 'Status', 'Financial Impact (THB)'];
      sheet.getRange(8, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#f3f4f6');
      if (reportData.length > 0) {
        const tableValues = reportData.map(r => [r.date, r.explainedBy, r.approvalStatus, r.financialImpact]);
        sheet.getRange(9, 1, tableValues.length, tableValues[0].length).setValues(tableValues);
        sheet.getRange(9, 4, tableValues.length, 1).setNumberFormat('#,##0.00;(#,##0.00)');
      }
      sheet.autoResizeColumns(1, headers.length);
      const file = DriveApp.getFileById(spreadsheet.getId()).moveTo(reportFolder);
      return { success: true, fileUrl: file.getUrl() };

    } else if (format === 'pdf') {
      // *** แก้ไขส่วนนี้: เพิ่มโค้ดสร้าง HTML ฉบับเต็ม ***
      let tableRows = reportData.map(r => `
        <tr>
          <td>${r.date}</td>
          <td>${r.explainedBy}</td>
          <td>${r.approvalStatus}</td>
          <td style="color: ${r.financialImpact < 0 ? 'red' : 'green'}; text-align: right;">${r.financialImpact.toFixed(2)}</td>
        </tr>`).join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Sarabun&display=swap');
            body { font-family: 'Sarabun', sans-serif; font-size: 10pt; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>Discrepancy Report</h1>
          <p><strong>Store:</strong> ${storeName}</p>
          <p><strong>Period:</strong> ${dateFrom} to ${dateTo}</p>
          <hr>
          <h3>Summary</h3>
          <p><strong>Total Shrinkage:</strong> ${summary.shrinkageValue.toFixed(2)} THB</p>
          <p><strong>Total Overage:</strong> ${summary.overageValue.toFixed(2)} THB</p>
          <hr>
          <h3>Details</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Explained By</th>
                <th>Status</th>
                <th style="text-align: right;">Financial Impact (THB)</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
        </html>`;

      const blob = Utilities.newBlob(html, 'text/html', `${fileName}.html`);
      const pdfFile = reportFolder.createFile(blob.getAs('application/pdf'));
      return { success: true, fileUrl: pdfFile.getUrl() };
    }

    return { success: false, message: "Invalid format" };

  } catch (e) {
    return { success: false, message: e.toString() };
  }
}




/**
 * ฟังก์ชันสำหรับส่งค่า Configuration ที่จำเป็นไปให้ Frontend
 * @returns {object} Object ที่มีค่า config ต่างๆ เช่น Web App URL
 */
function getFrontendConfig() {
  return {
    webAppUrl: CONFIG.WEB_APP_URL
  };
}

/**
 * =================================================================
 * STAFF ACTIVITY HISTORY
 * =================================================================
 */


/**
 * ดึงข้อมูลสรุปการทำงานรายวันสำหรับ Staff ในช่วงวันที่ที่กำหนด (ปรับปรุงใหม่)
 */
function getStaffActivityHistory(sheetId, dateFrom, dateTo) {
  try {
    const storeSheet = SpreadsheetApp.openById(sheetId);
    const comparisonSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.COMPARISON);
    const manualCountSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.MANUAL_COUNT);
    const ocrLogSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.OCR_LOG);

    if (!comparisonSheet) {
      return { success: true, data: [] };
    }

    const timeZone = Session.getScriptTimeZone();
    const summaryByDate = {};

    // 1. สร้าง object เริ่มต้นสำหรับทุกวันในช่วงที่เลือก
    let currentDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    while (currentDate <= endDate) {
      const dateStr = Utilities.formatDate(currentDate, timeZone, 'yyyy-MM-dd');
      summaryByDate[dateStr] = {
        date: dateStr,
        hasManualCount: false,
        hasPdfUpload: false,
        status: 'pending_comparison',
        // *** เพิ่ม counter ใหม่ ***
        totalDiscrepancies: 0,
        pendingApprovalCount: 0,
        rejectedCount: 0
      };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 2. ตรวจสอบสถานะการนับมือ
    if (manualCountSheet) {
      manualCountSheet.getDataRange().getValues().slice(1).forEach(row => {
        const dateStr = (row[1] instanceof Date) ? Utilities.formatDate(row[1], timeZone, 'yyyy-MM-dd') : (row[1] ? row[1].toString().substring(0, 10) : '');
        if (summaryByDate[dateStr] && row[7] === 'submitted') {
          summaryByDate[dateStr].hasManualCount = true;
        }
      });
    }

    // 3. ตรวจสอบสถานะการอัปโหลด PDF
    if (ocrLogSheet) {
      ocrLogSheet.getDataRange().getValues().slice(1).forEach(row => {
        const dateStr = (row[1] instanceof Date) ? Utilities.formatDate(row[1], timeZone, 'yyyy-MM-dd') : (row[1] ? row[1].toString().substring(0, 10) : '');
        if (summaryByDate[dateStr] && row[10] === 'success') {
          summaryByDate[dateStr].hasPdfUpload = true;
        }
      });
    }

    // 4. วนลูปข้อมูลผลต่างเพื่อนับสรุป
    const compData = comparisonSheet.getDataRange().getValues();
    for (let i = 1; i < compData.length; i++) {
      const row = compData[i];
      const dateStr = (row[1] instanceof Date) ? Utilities.formatDate(row[1], timeZone, 'yyyy-MM-dd') : (row[1] ? row[1].toString().substring(0, 10) : '');

      if (summaryByDate[dateStr]) {
        const summary = summaryByDate[dateStr];

        // ตรวจสอบว่าเป็นรายการที่มีผลต่างหรือไม่
        if (row[8] === 'discrepancy' || row[8] === 'pending_count') {
          summary.totalDiscrepancies++;

          const approvalStatus = row[12] || 'pending'; // คอลัมน์ M
          const explanation = row[9]; // คอลัมน์ J

          // *** ตรรกะการนับใหม่ ***
          if (approvalStatus === 'rejected') {
            summary.rejectedCount++;
          } else if (explanation && (approvalStatus === 'pending' || !approvalStatus)) {
            summary.pendingApprovalCount++;
          }
        }
      }
    }

    // 5. ประมวลผลสถานะสุดท้ายและจัดเรียงข้อมูล
    const results = Object.values(summaryByDate).map(summary => {
      const hasComparisonRun = summary.totalDiscrepancies > 0 || compData.some(row => ((row[1] instanceof Date) ? Utilities.formatDate(row[1], timeZone, 'yyyy-MM-dd') : (row[1] ? row[1].toString().substring(0, 10) : '')) === summary.date);

      if (hasComparisonRun) {
        if (summary.totalDiscrepancies > 0) {
          if (summary.rejectedCount > 0) {
            summary.status = 'rejected';
          } else if (summary.pendingApprovalCount > 0) {
            summary.status = 'pending_approval';
          } else if (summary.totalDiscrepancies > (summary.pendingApprovalCount + summary.rejectedCount)) {
            // ถ้ายังมีผลต่างที่ยังไม่ได้ชี้แจง
            summary.status = 'pending_explanation';
          } else {
            summary.status = 'completed'; // กรณีที่ทุกอย่าง approve หมดแล้ว
          }
        } else {
          summary.status = 'completed';
        }
      } else {
        summary.status = 'pending_comparison';
      }

      return summary;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    return { success: true, data: results };

  } catch (e) {
    Logger.log(`ERROR in getStaffActivityHistory: ${e.toString()}\n${e.stack}`);
    return { success: false, message: e.toString() };
  }
}




// ===================================
// NOTIFICATION SYSTEM (NEW & REVISED)
// ===================================

function sendAppNotification(targetGroupId, eventType, data) {
  try {
    // --- LOGGING STEP 1: เริ่มต้นการทำงาน ---
    logNotification(targetGroupId, eventType, data.storeId || null, 'info', 'Function sendAppNotification started.', data.date); // [!code ++]

    if (!targetGroupId) {
      logNotification(targetGroupId, eventType, data.storeId || null, 'failed', 'Target Group ID is missing.', data.date); // [!code ++]
      return;
    }

    const flexMessageObject = generateFlexMessage(eventType, data);
    if (!flexMessageObject) {
      logNotification(targetGroupId, eventType, data.storeId || null, 'failed', 'Could not generate Flex Message.', data.date); // [!code ++]
      return;
    }

    // --- LOGGING STEP 2: สร้าง Flex สำเร็จ ---
    logNotification(targetGroupId, eventType, data.storeId || null, 'info', 'Flex Message generated successfully.', data.date); // [!code ++]
    const apiConfig = getAPIConfig();
    const accessToken = apiConfig.LINE_ACCESS_TOKEN;

    if (!accessToken) {
      logNotification(targetGroupId, eventType, data.storeId || null, 'failed', 'Line Access Token not configured.', data.date); // [!code ++]
      return;
    }

    // --- LOGGING STEP 3: ดึง Access Token สำเร็จ ---
    logNotification(targetGroupId, eventType, data.storeId || null, 'info', 'Access Token retrieved successfully.', data.date); // [!code ++]

    const altText = data.notificationText || `[${data.storeName}] มีการแจ้งเตือน ${eventType}`;
    const url = 'https://api.line.me/v2/bot/message/push';
    const payload = {
      'to': targetGroupId,
      'messages': [
        {
          'type': 'flex',
          'altText': altText,
          'contents': flexMessageObject
        }
      ]
    };
    const options = {
      'method': 'post',
      'headers': {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + accessToken
      },
      'payload': JSON.stringify(payload),
      'muteHttpExceptions': true
    };

    // --- LOGGING STEP 4: กำลังจะส่ง Request ---
    logNotification(targetGroupId, eventType, data.storeId || null, 'info', 'Attempting to push message via LINE Messaging API...', data.date); // [!code ++]

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode === 200) {
      logNotification(targetGroupId, eventType, data.storeId || null, 'success', 'Sent successfully via LINE Messaging API.', data.date); // [!code ++]
    } else {
      const errorMessage = responseBody ? JSON.parse(responseBody).message : 'Unknown error';
      logNotification(targetGroupId, eventType, data.storeId || null, 'failed', `Error: ${errorMessage} (Code: ${responseCode})`, data.date); // [!code ++]
    }

  } catch (e) {
    console.error(`Error in sendAppNotification for event ${eventType}: ${e.toString()}`);
    // --- LOGGING STEP 5: บันทึก Exception ที่เกิดขึ้น ---
    logNotification(targetGroupId, eventType, data.storeId || null, 'error', e.message, data.date); // [!code ++]
  }
}



/**
 * ฟังก์ชันสำหรับจัดการการกดปุ่ม "ส่งซ้ำ" จาก Frontend (ฉบับแก้ไข)
 */
function resendNotification(storeId, date, eventType) {
  try {
    const apiConfig = getAPIConfig();

    // 1. ดึงข้อมูลพื้นฐานของสาขา (เช่น sheet_id, storeName) จาก Master Sheet ก่อน
    const storeInfo = getStoreInfoById(storeId);
    if (!storeInfo) throw new Error(`Store with ID ${storeId} not found.`);

    // --- START: ส่วนที่แก้ไข ---
    // 2. ใช้ sheet_id ที่ได้มา ไปดึงค่า settings จากชีต "Settings" ของสาขานั้นๆ
    const storeSettings = getStoreSettings(storeInfo.sheet_id).settings;
    // --- END: ส่วนที่แก้ไข ---

    const data = { storeId, date, storeName: storeInfo.name };
    let targetGroupId = '';

    // เพิ่ม Logic การดึงข้อมูลสำหรับแต่ละ EventType
    switch (eventType) {
      case 'DAILY_REMINDER':
      case 'COMPARISON_SHORT':
      case 'COMPARISON_OVER':

        targetGroupId = storeSettings.group_line_id;


        data.notificationText = `[ส่งซ้ำ] 🔔 แจ้งเตือนนับสต็อก สาขา ${storeInfo.name}`;
        if (eventType !== 'DAILY_REMINDER') {
          const compResults = getComparisonResults(storeInfo.sheet_id, date).results;
          data.items = compResults.filter(item => item.status === 'discrepancy').slice(0, 5);
          data.notificationText = `[ส่งซ้ำ] ⚠️ แจ้งเตือนผลต่าง สาขา ${storeInfo.name}`;
        }
        break;

      case 'STAFF_EXPLANATION':
        targetGroupId = apiConfig.OWNER_GROUP_LINE_ID;
        data.notificationText = `[ส่งซ้ำ] 📝 พนักงานสาขา ${storeInfo.name} ได้ชี้แจงผลต่างแล้ว`;
        // --- เพิ่มส่วนนี้เข้าไป ---
        const compResultsForStaff = getComparisonResults(storeInfo.sheet_id, date).results;
        data.items = compResultsForStaff.filter(item => item.status === 'discrepancy' && item.explanation).slice(0, 5);
        // --- สิ้นสุดส่วนที่เพิ่ม ---
        break;

      default:
        throw new Error(`Invalid event type for resend: ${eventType}`);
    }

    sendAppNotification(targetGroupId, eventType, data);
    return { success: true, message: `กำลังส่งการแจ้งเตือน '${eventType}' อีกครั้ง...` };

  } catch (e) {
    return { success: false, message: e.message };
  }
}




/**
 * ✅ FIXED VERSION - logNotification()
 * บันทึก log ไปที่ Store Sheet ของสาขานั้นๆ
 * แก้ไข: เพิ่มการตรวจสอบและสร้างคอลัมน์ event_date และใช้การค้นหาชื่อคอลัมน์แทนการ Fix ตำแหน่ง
 */
function logNotification(targetGroupId, eventType, storeId, status, details, eventDate) {
  try {
    // 1. หา sheetId จาก storeId
    const masterSheet = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const storesSheet = masterSheet.getSheetByName(CONFIG.MASTER_SHEETS.STORES);
    const storesData = storesSheet.getDataRange().getValues();

    let sheetId = null;
    for (let i = 1; i < storesData.length; i++) {
      if (storesData[i][0] === storeId) {
        sheetId = storesData[i][3]; // column D = sheet_id
        break;
      }
    }

    if (!sheetId) {
      Logger.log(`❌ logNotification: Store ${storeId} not found in Stores sheet`);
      return;
    }

    // 2. เปิด Store Sheet และหา Notification_Log sheet
    const storeSheet = SpreadsheetApp.openById(sheetId);
    let logSheet = storeSheet.getSheetByName('Notification_Log');

    const initialHeaders = ['log_id', 'timestamp', 'event_date', 'store_id', 'target_group_id', 'event_type', 'status', 'details'];

    // 3. ตรวจสอบและสร้าง Notification_Log sheet ถ้ายังไม่มี
    if (!logSheet) {
      Logger.log(`⚠️ Creating Notification_Log sheet for store ${storeId}...`);
      logSheet = storeSheet.insertSheet('Notification_Log');
      logSheet.appendRow(initialHeaders);
    }

    // 4. ตรวจสอบและเพิ่มคอลัมน์ event_date ถ้ายังไม่มี (Dynamic Column Check)
    const headers = logSheet.getRange(1, 1, 1, logSheet.getLastColumn()).getValues()[0];
    if (headers.indexOf('event_date') === -1) {
      Logger.log(`⚠️ Column 'event_date' not found. Adding it...`);
      // หาตำแหน่งของ 'timestamp'
      const timestampIndex = headers.indexOf('timestamp');
      if (timestampIndex !== -1) {
        // เพิ่มคอลัมน์ 'event_date' ต่อจาก 'timestamp'
        logSheet.insertColumnAfter(timestampIndex + 1);
        logSheet.getRange(1, timestampIndex + 2).setValue('event_date');
      } else {
        // กรณีฉุกเฉิน: ถ้าไม่มี timestamp ให้เพิ่มไว้ท้ายสุด
        logSheet.getRange(1, headers.length + 1).setValue('event_date');
      }
    }

    // 5. เตรียมข้อมูลและบันทึก Log
    const logTimestamp = new Date(); // เวลาที่เกิดเหตุการณ์จริง
    const activityDate = eventDate ? new Date(eventDate) : new Date(); // วันที่ของกิจกรรม

    // appendRow จะเพิ่มข้อมูลต่อท้ายเสมอ ไม่ต้องกังวลเรื่องตำแหน่งคอลัมน์
    logSheet.appendRow([
      Utilities.getUuid(),
      logTimestamp,     // timestamp: เวลาที่ส่งจริง
      activityDate,     // event_date: วันที่ของกิจกรรม
      storeId,
      targetGroupId,
      eventType,
      status,
      details
    ]);

    Logger.log(`✅ Logged ${eventType} for store ${storeId}: ${status}`);

  } catch (e) {
    Logger.log(`❌ Failed to log notification: ${e.message}`);
  }
}




/**
 * ✅ FIXED VERSION - getLineDashboardData()
 * ดึงข้อมูลสำหรับหน้า Line Dashboard
 * แก้ไข: อ่าน Notification_Log จาก Store Sheet และใช้การค้นหาชื่อคอลัมน์แบบ Dynamic
 */
function getLineDashboardData(date) {
  try {
    const masterSheet = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const stores = masterSheet.getSheetByName(CONFIG.MASTER_SHEETS.STORES).getDataRange().getValues().slice(1);

    const dashboardData = stores.map(storeRow => {
      const storeId = storeRow[0];
      const storeName = storeRow[2];
      const sheetId = storeRow[3];

      try {
        const storeSheet = SpreadsheetApp.openById(sheetId);
        let logSheet = storeSheet.getSheetByName('Notification_Log');

        if (!logSheet) {
          return {
            storeId: storeId, storeName: storeName, overallStatus: 'NOT_STARTED',
            timeline: buildTimeline({ hasDiscrepancy: false, isExplained: false, isDecided: false }, [], {}) // ส่ง columnIndex ว่างไป
          };
        }

        // 1. อ่าน Headers และสร้าง Index Map แบบ Dynamic
        const headers = logSheet.getRange(1, 1, 1, logSheet.getLastColumn()).getValues()[0];
        const columnIndex = {
          timestamp: headers.indexOf('timestamp'),
          event_date: headers.indexOf('event_date'),
          event_type: headers.indexOf('event_type'),
          status: headers.indexOf('status')
        };

        if (columnIndex.timestamp === -1 || columnIndex.event_date === -1) {
          Logger.log(`❌ Store ${storeName}: Missing required columns 'timestamp' or 'event_date'. Attempting to fix...`);
          // เรียก logNotification เพื่อให้มันสร้างคอลัมน์อัตโนมัติ
          logNotification(null, 'MAINTENANCE', storeId, 'info', 'Auto-creating event_date column.', date);
          // หลังจากสร้างแล้ว ให้ return ค่า default ไปก่อนในรอบนี้ รอบถัดไปจะทำงานได้ปกติ
          return {
            storeId: storeId, storeName: storeName, overallStatus: 'FAILED',
            timeline: [{ id: 1, name: 'Error', status: 'FAILED', timestamp: 'Config Error' }]
          };
        }

        const notificationLogs = logSheet.getLastRow() > 1
          ? logSheet.getRange(2, 1, logSheet.getLastRow() - 1, logSheet.getLastColumn()).getValues()
          : [];

        // 2. ดึงข้อมูลสถานะ
        const activity = getActivityStatusForDate(sheetId, date);

        // 3. กรอง logs โดยใช้ event_date จาก Index Map
        const logsForDate = notificationLogs.filter(log => {
          const eventDateValue = log[columnIndex.event_date];
          let logDateStr = '';
          if (eventDateValue instanceof Date) {
            logDateStr = Utilities.formatDate(eventDateValue, Session.getScriptTimeZone(), 'yyyy-MM-dd');
          } else if (typeof eventDateValue === 'string' && eventDateValue.length >= 10) {
            logDateStr = eventDateValue.substring(0, 10);
          }
          return logDateStr === date;
        });

        // 4. สร้าง Timeline โดยส่ง columnIndex ไปด้วย
        const timeline = buildTimeline(activity, logsForDate, columnIndex);

        return {
          storeId: storeId,
          storeName: storeName,
          overallStatus: determineOverallStatus(timeline),
          timeline: timeline
        };
      } catch (storeError) {
        Logger.log(`❌ Error processing store ${storeName}: ${storeError.message}`);
        return {
          storeId: storeId, storeName: storeName, overallStatus: 'FAILED',
          timeline: [{ id: 1, name: 'แจ้งเตือนนับสต็อก', eventType: 'DAILY_REMINDER', status: 'FAILED', timestamp: '' }]
        };
      }
    });

    return { success: true, data: dashboardData };
  } catch (e) {
    Logger.log('Error in getLineDashboardData: ' + e.message + "\n" + e.stack);
    return { success: false, message: e.message };
  }
}



/**
 * ✅ NEW FUNCTION - determineOverallStatus()
 * กำหนดสถานะโดยรวมของ timeline
 */
function determineOverallStatus(timeline) {
  // ตรวจสอบว่ามี FAILED หรือไม่
  if (timeline.some(step => step.status === 'FAILED')) {
    return 'FAILED';
  }

  // ตรวจสอบว่าเสร็จสิ้นทั้งหมดหรือไม่
  const completedCount = timeline.filter(step => step.status === 'COMPLETED').length;
  const notStartedCount = timeline.filter(step => step.status === 'NOT_STARTED').length;

  // ถ้า COMPLETED ทั้งหมด หรือ COMPLETED + NOT_STARTED (ข้าม steps)
  if (completedCount + notStartedCount === timeline.length) {
    // ถ้ามี step สุดท้ายเป็น COMPLETED → เสร็จสิ้น
    if (timeline[timeline.length - 1].status === 'COMPLETED') {
      return 'COMPLETED';
    }
  }

  // ตรวจสอบว่ามี PENDING หรือไม่
  if (timeline.some(step => step.status === 'PENDING')) {
    return 'PENDING';
  }

  // Default
  return 'NOT_STARTED';
}




/**
 * Helper: ตรวจสอบสถานะการทำงานของสาขาในวันที่กำหนด (ฉบับแก้ไข)
 * ตรวจสอบว่ามีการดำเนินการ 'อย่างน้อยหนึ่งรายการ' หรือไม่
 */
function getActivityStatusForDate(sheetId, date) {
  const storeSheet = SpreadsheetApp.openById(sheetId);
  const comparisonSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.COMPARISON);
  if (!comparisonSheet) return { hasDiscrepancy: false, hasAnyExplanation: false, hasAnyDecision: false };

  const data = comparisonSheet.getDataRange().getValues();
  const discrepanciesForDate = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowDate = (row[1] instanceof Date) ? Utilities.formatDate(row[1], Session.getScriptTimeZone(), 'yyyy-MM-dd') : (row[1] ? row[1].toString().substring(0, 10) : '');
    if (rowDate === date && row[8] === 'discrepancy') {
      discrepanciesForDate.push(row);
    }
  }

  if (discrepanciesForDate.length === 0) {
    return { hasDiscrepancy: false, hasAnyExplanation: false, hasAnyDecision: false };
  }

  // ตรวจสอบว่ามี "อย่างน้อยหนึ่งแถว" ที่มีการชี้แจงหรือไม่
  const hasAnyExplanation = discrepanciesForDate.some(row => row[9]);

  // ตรวจสอบว่ามี "อย่างน้อยหนึ่งแถว" ที่มีการตัดสินใจหรือไม่
  const hasAnyDecision = discrepanciesForDate.some(row => row[12]);

  return {
    hasDiscrepancy: true,
    hasAnyExplanation: hasAnyExplanation,
    hasAnyDecision: hasAnyDecision
  };
}



/**
 * ✅ IMPROVED VERSION - buildTimeline()
 * สร้างข้อมูล Timeline 6 ขั้นตอน
 * แก้ไข: รับ columnIndex เพื่อรองรับ Dynamic Column Mapping
 */
function buildTimeline(activity, logs, columnIndex) {
  const steps = [
    { id: 1, name: 'แจ้งเตือนนับสต็อก', eventType: 'DAILY_REMINDER', status: 'NOT_STARTED', timestamp: '' },
    { id: 2, name: 'สรุปผลต่าง', eventType: 'COMPARISON_DISCREPANCY', status: 'NOT_STARTED', timestamp: '' },
    { id: 3, name: 'พนักงานชี้แจง', eventType: 'STAFF_EXPLANATION', status: 'NOT_STARTED', timestamp: '' },
    { id: 4, name: 'รอเจ้าของตัดสินใจ', eventType: 'WAITING_APPROVAL', status: 'NOT_STARTED', timestamp: '' },
    { id: 5, name: 'แจ้งผลการตัดสินใจ', eventType: 'OWNER_DECISION', status: 'NOT_STARTED', timestamp: '' },
    { id: 6, name: 'เสร็จสิ้น', eventType: 'COMPLETED', status: 'NOT_STARTED', timestamp: '' }
  ];

  // ตรวจสอบว่า columnIndex ถูกส่งมาหรือไม่ ถ้าไม่ ให้หยุดทำงาน
  if (!columnIndex || columnIndex.event_type === undefined || columnIndex.status === undefined || columnIndex.timestamp === undefined) {
    Logger.log('buildTimeline: columnIndex is missing or incomplete. Returning default steps.');
    return steps;
  }

  // ===================================
  // Step 1: แจ้งเตือนนับสต็อก
  // ===================================
  const reminderLog = logs.find(log => log[columnIndex.event_type] === 'DAILY_REMINDER' && log[columnIndex.status] === 'success');
  if (reminderLog) {
    steps[0].status = 'COMPLETED';
    steps[0].timestamp = formatTime(reminderLog[columnIndex.timestamp]);
  } else {
    steps[0].status = 'PENDING';
    return steps;
  }

  // ===================================
  // กรณีที่ 1: ไม่มีผลต่าง
  // ===================================
  if (!activity.hasDiscrepancy) {
    steps[1].status = 'NOT_STARTED';
    steps[2].status = 'NOT_STARTED';
    steps[3].status = 'NOT_STARTED';
    steps[4].status = 'NOT_STARTED';
    steps[5].status = 'COMPLETED';
    steps[5].timestamp = 'Auto';
    return steps;
  }

  // ===================================
  // กรณีที่ 2: มีผลต่าง
  // ===================================

  // Step 2: สรุปผลต่าง
  const discrepancyLog = logs.find(log =>
    (log[columnIndex.event_type] === 'COMPARISON_SHORT' || log[columnIndex.event_type] === 'COMPARISON_OVER') && log[columnIndex.status] === 'success'
  );
  if (discrepancyLog) {
    steps[1].status = 'COMPLETED';
    steps[1].timestamp = formatTime(discrepancyLog[columnIndex.timestamp]);
  } else {
    steps[1].status = 'PENDING';
    return steps;
  }

  // Step 3: พนักงานชี้แจง
  const explanationLog = logs.find(log => log[columnIndex.event_type] === 'STAFF_EXPLANATION' && log[columnIndex.status] === 'success');
  if (explanationLog || activity.hasAnyExplanation) {
    steps[2].status = 'COMPLETED';
    steps[2].timestamp = explanationLog ? formatTime(explanationLog[columnIndex.timestamp]) : 'Manual';
  } else {
    steps[2].status = 'PENDING';
    return steps;
  }

  // Step 4: รอเจ้าของตัดสินใจ (เสร็จสิ้นอัตโนมัติเมื่อพนักงานชี้แจงแล้ว)
  steps[3].status = 'COMPLETED';
  steps[3].timestamp = 'Auto';

  // Step 5: แจ้งผลการตัดสินใจ
  const decisionLog = logs.find(log => (log[columnIndex.event_type] === 'OWNER_APPROVED' || log[columnIndex.event_type] === 'OWNER_REJECTED') && log[columnIndex.status] === 'success');
  if (decisionLog || activity.hasAnyDecision) {
    steps[4].status = 'COMPLETED';
    steps[4].timestamp = decisionLog ? formatTime(decisionLog[columnIndex.timestamp]) : 'Manual';
  } else {
    steps[4].status = 'PENDING';
    return steps;
  }

  // Step 6: เสร็จสิ้น (เสร็จสิ้นอัตโนมัติเมื่อเจ้าของตัดสินใจแล้ว)
  steps[5].status = 'COMPLETED';
  steps[5].timestamp = 'Auto';

  return steps;
}



/**
 * ✅ NEW FUNCTION - formatTime()
 * Format timestamp เป็น HH:mm
 */
function formatTime(timestamp) {
  if (!timestamp) return '';
  try {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return Utilities.formatDate(date, Session.getScriptTimeZone(), 'HH:mm');
  } catch (e) {
    Logger.log('Error formatting time: ' + e.message);
    return '';
  }
}


function testBuildTimeline() {
  // กรณีทดสอบ 1: ไม่มีผลต่าง
  const activity1 = { hasDiscrepancy: false, isExplained: false, isDecided: false };
  const logs1 = [
    ['log1', new Date('2025-10-06 08:00:00'), 'store001', 'groupId', 'DAILY_REMINDER', 'success', '']
  ];
  const result1 = buildTimeline(activity1, logs1);
  Logger.log('Case 1 (No Discrepancy): ' + JSON.stringify(result1));

  // กรณีทดสอบ 2: มีผลต่าง พนักงานชี้แจงแล้ว รอเจ้าของ
  const activity2 = { hasDiscrepancy: true, isExplained: true, isDecided: false };
  const logs2 = [
    ['log1', new Date('2025-10-06 08:00:00'), 'store001', 'groupId', 'DAILY_REMINDER', 'success', ''],
    ['log2', new Date('2025-10-06 09:30:00'), 'store001', 'groupId', 'COMPARISON_DISCREPANCY', 'success', ''],
    ['log3', new Date('2025-10-06 14:00:00'), 'store001', 'groupId', 'STAFF_EXPLANATION', 'success', '']
  ];
  const result2 = buildTimeline(activity2, logs2);
  Logger.log('Case 2 (Waiting Approval): ' + JSON.stringify(result2));

  // กรณีทดสอบ 3: ทำครบทุกขั้นตอน
  const activity3 = { hasDiscrepancy: true, isExplained: true, isDecided: true };
  const logs3 = [
    ['log1', new Date('2025-10-06 08:00:00'), 'store001', 'groupId', 'DAILY_REMINDER', 'success', ''],
    ['log2', new Date('2025-10-06 09:30:00'), 'store001', 'groupId', 'COMPARISON_DISCREPANCY', 'success', ''],
    ['log3', new Date('2025-10-06 14:00:00'), 'store001', 'groupId', 'STAFF_EXPLANATION', 'success', ''],
    ['log4', new Date('2025-10-06 16:00:00'), 'store001', 'groupId', 'OWNER_DECISION', 'success', '']
  ];
  const result3 = buildTimeline(activity3, logs3);
  Logger.log('Case 3 (All Completed): ' + JSON.stringify(result3));
}

// ===================================
// HELPER FUNCTIONS (NEW)
// ===================================


/**
 * Helper: ดึงข้อมูลเบื้องต้นของสาขาด้วย ID
 */
function getStoreInfoById(storeId) {
  const masterSheet = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
  const storesSheet = masterSheet.getSheetByName(CONFIG.MASTER_SHEETS.STORES);
  const storesData = storesSheet.getDataRange().getValues();
  const headers = storesData[0];

  // หา column index จาก header (ใช้ชื่อที่ตรงกับชีท: store_id, store_code, store_name)
  const idCol = headers.indexOf('store_id');
  const codeCol = headers.indexOf('store_code');
  const nameCol = headers.indexOf('store_name');
  const sheetIdCol = headers.indexOf('sheet_id');
  const groupLineIdCol = headers.indexOf('group_line_id');

  for (let i = 1; i < storesData.length; i++) {
    const rowId = storesData[i][idCol];
    // ใช้ == แทน === เพื่อรองรับ type ต่างกัน และ trim() กัน whitespace
    if (String(rowId).trim() == String(storeId).trim()) {
      return {
        id: storesData[i][idCol],
        code: storesData[i][codeCol],
        store_code: storesData[i][codeCol], // Alias for deposit code generation
        name: storesData[i][nameCol],
        sheet_id: storesData[i][sheetIdCol],
        group_line_id: storesData[i][groupLineIdCol],
        // Deposit System LINE Config
        line_token: storesData[i][headers.indexOf('line_token')] || '',
        line_channel_secret: storesData[i][headers.indexOf('line_channel_secret')] || '',
        staff_group_id: storesData[i][headers.indexOf('staff_group_id')] || '',
        bar_group_id: storesData[i][headers.indexOf('bar_group_id')] || '',
        central_group_id: storesData[i][headers.indexOf('central_group_id')] || '',
        is_central: storesData[i][headers.indexOf('is_central')] === true || storesData[i][headers.indexOf('is_central')] === 'TRUE',
        // Receipt Printing Config
        line_id: storesData[i][headers.indexOf('line_id')] || '',
        line_add_friend_url: storesData[i][headers.indexOf('line_add_friend_url')] || '',
        qr_code_image_url: storesData[i][headers.indexOf('qr_code_image_url')] || '',
        store_address: storesData[i][headers.indexOf('store_address')] || '',
        store_phone: storesData[i][headers.indexOf('store_phone')] || '',
        receipt_logo_url: storesData[i][headers.indexOf('receipt_logo_url')] || '',
        receipt_header_text: storesData[i][headers.indexOf('receipt_header_text')] || 'ใบรับฝากเหล้า',
        receipt_footer_line1: storesData[i][headers.indexOf('receipt_footer_line1')] || 'กรุณาเก็บใบรับนี้ไว้เป็นหลักฐาน',
        receipt_footer_line2: storesData[i][headers.indexOf('receipt_footer_line2')] || 'แสดงใบรับหรือรหัสเมื่อต้องการเบิก'
      };
    }
  }
  return null;
}


/**
 * Helper: ดึงข้อมูลเบื้องต้นของสาขาด้วย Sheet ID
 */
function getStoreInfoBySheetId(sheetId) {
  const masterSheet = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
  const storesSheet = masterSheet.getSheetByName(CONFIG.MASTER_SHEETS.STORES);
  const storesData = storesSheet.getDataRange().getValues();
  const headers = storesData[0];

  for (let i = 1; i < storesData.length; i++) {
    if (storesData[i][3] === sheetId) {
      return {
        id: storesData[i][0],
        code: storesData[i][1],
        store_code: storesData[i][1], // Alias for deposit code generation
        name: storesData[i][2],
        sheet_id: storesData[i][3],
        group_line_id: storesData[i][5],
        // Deposit System LINE Config
        line_token: storesData[i][headers.indexOf('line_token')] || '',
        line_channel_secret: storesData[i][headers.indexOf('line_channel_secret')] || '',
        staff_group_id: storesData[i][headers.indexOf('staff_group_id')] || '',
        bar_group_id: storesData[i][headers.indexOf('bar_group_id')] || '',
        central_group_id: storesData[i][headers.indexOf('central_group_id')] || '',
        is_central: storesData[i][headers.indexOf('is_central')] === true || storesData[i][headers.indexOf('is_central')] === 'TRUE',
        // Receipt Printing Config
        line_id: storesData[i][headers.indexOf('line_id')] || '',
        line_add_friend_url: storesData[i][headers.indexOf('line_add_friend_url')] || '',
        qr_code_image_url: storesData[i][headers.indexOf('qr_code_image_url')] || '',
        store_address: storesData[i][headers.indexOf('store_address')] || '',
        store_phone: storesData[i][headers.indexOf('store_phone')] || '',
        receipt_logo_url: storesData[i][headers.indexOf('receipt_logo_url')] || '',
        receipt_header_text: storesData[i][headers.indexOf('receipt_header_text')] || 'ใบรับฝากเหล้า',
        receipt_footer_line1: storesData[i][headers.indexOf('receipt_footer_line1')] || 'กรุณาเก็บใบรับนี้ไว้เป็นหลักฐาน',
        receipt_footer_line2: storesData[i][headers.indexOf('receipt_footer_line2')] || 'แสดงใบรับหรือรหัสเมื่อต้องการเบิก'
      };
    }
  }
  return null;
}

/**
 * Helper: ดึงข้อมูล item จาก comp_id
 */
function getItemInfoByCompId(sheetId, compId) {
  const storeSheet = SpreadsheetApp.openById(sheetId);
  const comparisonSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.COMPARISON);
  const data = comparisonSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === compId) {
      return {
        date: Utilities.formatDate(new Date(data[i][1]), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
        product_name: data[i][3],
        pos_quantity: data[i][4],
        manual_quantity: data[i][5],
        difference: data[i][6]
      };
    }
  }
  return null;
}




// =================================================================
// STOCK COUNT EDIT FUNCTIONS 
// =================================================================

/**
 * ดึงข้อมูลทั้งหมดที่จำเป็นสำหรับหน้าแก้ไขการนับสต๊อก
 * โดยจะรวมข้อมูลสินค้า, จำนวนนับเดิม, และจำนวนจาก POS เข้าไว้ด้วยกัน
 */
function getCountDataForEdit(sheetId, date) {
  try {
    Logger.log(`--- [START] getCountDataForEdit ---`);
    Logger.log(`1. Parameters: sheetId=${sheetId}, date=${date}`);

    const storeSheet = SpreadsheetApp.openById(sheetId);
    const productsSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.PRODUCTS);
    const manualCountSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.MANUAL_COUNT);
    const comparisonSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.COMPARISON);

    // 1. ดึงข้อมูลสินค้าทั้งหมดที่ active
    const productsData = productsSheet.getDataRange().getValues();
    const allProducts = productsData.slice(1)
      .filter(row => row[10] === true && row[11] !== 'excluded') // active & not excluded
      .map(row => ({
        product_code: row[1],
        product_name: row[3],
        category: row[4]
      }));
    Logger.log(`2. Found ${allProducts.length} active products.`);

    // 2. สร้าง Map ของจำนวนนับเดิม
    const manualCounts = new Map();
    if (manualCountSheet) {
      manualCountSheet.getDataRange().getValues().slice(1).forEach(row => {
        const rowDate = (row[1] instanceof Date) ? Utilities.formatDate(row[1], Session.getScriptTimeZone(), 'yyyy-MM-dd') : row[1];
        if (rowDate === date) {
          manualCounts.set(row[2], parseFloat(row[4]) || 0);
        }
      });
    }
    Logger.log(`3. Found ${manualCounts.size} items in Manual_Count for the selected date.`);

    // 3. สร้าง Map ของจำนวนจาก POS
    const posCounts = new Map();
    if (comparisonSheet) {
      comparisonSheet.getDataRange().getValues().slice(1).forEach(row => {
        const rowDate = (row[1] instanceof Date) ? Utilities.formatDate(row[1], Session.getScriptTimeZone(), 'yyyy-MM-dd') : row[1];
        if (rowDate === date) {
          posCounts.set(row[2], parseFloat(row[4]) || 0);
        }
      });
    }
    Logger.log(`4. Found ${posCounts.size} items in Comparison for the selected date.`);

    // 4. ประกอบข้อมูลทั้งหมดเข้าด้วยกัน
    const results = allProducts.map(product => {
      const manualQty = manualCounts.get(product.product_code);
      const posQty = posCounts.get(product.product_code);
      const difference = (manualQty !== undefined ? manualQty : 0) - (posQty !== undefined ? posQty : 0);

      return {
        ...product,
        pos_quantity: posQty !== undefined ? posQty : null,
        manual_quantity: manualQty !== undefined ? manualQty : null,
        new_quantity: manualQty !== undefined ? manualQty : 0, // [!code ++] แก้ไข: ถ้ายังไม่เคยนับ ให้ค่าเริ่มต้นเป็น 0
        difference: difference
      };
    });
    Logger.log(`5. Combined data into ${results.length} total result items (before filtering).`);

    // [!code --] // ลบเงื่อนไขเดิมที่เข้มงวดเกินไป
    // const finalResults = results.filter(r => r.pos_quantity !== null || r.manual_quantity !== null);

    // [!code ++] // ใช้เงื่อนไขใหม่ที่ยืดหยุ่นกว่า
    const finalResults = results.filter(r => posCounts.has(r.product_code) || manualCounts.has(r.product_code));
    Logger.log(`6. After filtering, ${finalResults.length} items remain.`);
    Logger.log(`--- [END] getCountDataForEdit ---`);

    return { success: true, data: finalResults };
  } catch (e) {
    Logger.log(`!!! ERROR in getCountDataForEdit: ${e.toString()}`);
    return { success: false, message: e.toString() };
  }
}


/**
 * ฟังก์ชันสำหรับอัปเดตการนับสต๊อกและปรับปรุงข้อมูลในชีต Comparison
 * @param {string} sheetId - ID ของ Sheet สาขา
 * @param {string} date - วันที่ที่แก้ไข (YYYY-MM-DD)
 * @param {Array<object>} updatedItems - [{product_code, new_quantity, product_name}, ...]
 * @param {string} updatedBy - Username ของผู้ที่ทำการแก้ไข
 * @returns {object} ผลลัพธ์การทำงาน
 */
function updateStockCountAndComparison(sheetId, date, updatedItems, updatedBy) {
  try {
    const storeSheet = SpreadsheetApp.openById(sheetId);
    const comparisonSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.COMPARISON);
    const manualCountSheet = storeSheet.getSheetByName(CONFIG.STORE_SHEETS.MANUAL_COUNT);

    if (!comparisonSheet) throw new Error("Sheet 'Comparison' not found.");
    if (!manualCountSheet) throw new Error("Sheet 'Manual_Count' not found.");

    const compData = comparisonSheet.getDataRange().getValues();
    const manualData = manualCountSheet.getDataRange().getValues();

    const adjustedItemsForFlex = [];
    const timestamp = new Date();

    // 1. อัปเดตชีต Manual_Count (ลบของเก่าแล้วเขียนใหม่)
    const rowsToKeep = manualData.filter((row, index) => {
      if (index === 0) return true; // Keep header
      const rowDate = (row[1] instanceof Date) ? Utilities.formatDate(row[1], Session.getScriptTimeZone(), 'yyyy-MM-dd') : row[1];
      return rowDate !== date;
    });
    const newManualRows = updatedItems.map(item => [
      Utilities.getUuid(), date, item.product_code, item.product_name,
      item.new_quantity, updatedBy, timestamp, 'submitted (edited)', timestamp
    ]);
    manualCountSheet.clearContents();
    manualCountSheet.getRange(1, 1, rowsToKeep.length + newManualRows.length, manualData[0].length).setValues([...rowsToKeep, ...newManualRows]);

    // 2. อัปเดตชีต Comparison
    for (const item of updatedItems) {
      let found = false;
      for (let i = 1; i < compData.length; i++) {
        const row = compData[i];
        const rowDate = (row[1] instanceof Date) ? Utilities.formatDate(row[1], Session.getScriptTimeZone(), 'yyyy-MM-dd') : row[1];

        if (rowDate === date && row[2] === item.product_code) {
          const originalManualQty = parseFloat(row[5]);
          const posQty = parseFloat(row[4]);
          const newManualQty = parseFloat(item.new_quantity);
          const newDifference = newManualQty - posQty;
          const newStatus = Math.abs(newDifference) < 0.01 ? 'matched' : 'discrepancy';

          comparisonSheet.getRange(i + 1, 6).setValue(newManualQty); // manual_quantity
          comparisonSheet.getRange(i + 1, 7).setValue(newDifference); // difference
          comparisonSheet.getRange(i + 1, 9).setValue(newStatus); // status

          logAudit(sheetId, 'EDIT_STOCK_COUNT', 'Comparison', row[0],
            { manual_quantity: originalManualQty }, { manual_quantity: newManualQty, updated_by: updatedBy });

          adjustedItemsForFlex.push({
            product_name: item.product_name,
            original_quantity: originalManualQty,
            new_quantity: newManualQty,
            pos_quantity: posQty
          });
          found = true;
          break;
        }
      }
    }

    // 3. ส่ง Notification
    SpreadsheetApp.flush(); // Ensure all changes are saved before sending notification
    const storeInfo = getStoreInfoBySheetId(sheetId);
    const storeSettings = getStoreSettings(sheetId).settings;
    if (storeInfo && storeSettings && storeSettings.group_line_id) {
      const finalComparison = getComparisonResults(sheetId, date).results;
      const remainingDiffItems = finalComparison.filter(item => item.status === 'discrepancy');

      const notificationData = {
        storeId: storeInfo.id,
        storeName: storeInfo.name,
        date: date,
        updatedBy: updatedBy,
        adjustedItems: adjustedItemsForFlex.slice(0, 5),
        remainingDiffItems: remainingDiffItems.slice(0, 5),
        notificationText: `มีการปรับสต็อกวันที่ ${date} โดย ${updatedBy}`
      };
      sendAppNotification(storeSettings.group_line_id, 'STOCK_ADJUSTMENT', notificationData);
    }

    return { success: true, message: 'อัปเดตข้อมูลเรียบร้อย' };
  } catch (e) {
    console.error("Error in updateStockCountAndComparison: " + e.stack);
    return { success: false, message: e.toString() };
  }
}

// ===================================================================
// DEPOSIT SYSTEM - BACKEND FUNCTIONS
// ===================================================================

/**
 * 1. ลูกค้าส่งคำขอฝากผ่าน LIFF
 */
function submitDepositRequest(data) {
  try {
    const { storeId, lineUserId, customerName, customerPhone, alcoholType, quantity, tableNumber, notes } = data;

    // ดึง store sheet
    const storeInfo = getStoreInfoById(storeId);
    if (!storeInfo) {
      return { success: false, message: 'ไม่พบข้อมูลสาขา' };
    }

    const storeSS = SpreadsheetApp.openById(storeInfo.sheet_id);
    const requestsSheet = storeSS.getSheetByName('Deposit_Requests');

    if (!requestsSheet) {
      return { success: false, message: 'ไม่พบ Deposit_Requests sheet' };
    }

    const requestId = Utilities.getUuid();
    const now = new Date();

    requestsSheet.appendRow([
      requestId,
      storeId,
      lineUserId,
      customerName,
      customerPhone,
      alcoholType,
      quantity,
      tableNumber || '-',
      notes || '-',
      'pending', // status
      now, // request_date
      '', // processed_by
      '', // processed_at
      '' // deposit_id
    ]);

    // ส่ง notification ไปหา Staff Group
    if (storeInfo.staff_group_id) {
      const message = `📝 คำขอฝากเหล้าใหม่\n\nลูกค้า: ${customerName}\nเบอร์: ${customerPhone}\nประเภท: ${alcoholType}\nจำนวน: ${quantity} ขวด\nโต๊ะ: ${tableNumber || '-'}`;
      sendLineMessage(storeInfo.staff_group_id, message, storeId);
    }

    return {
      success: true,
      message: 'ส่งคำขอฝากเรียบร้อย',
      requestId
    };

  } catch (error) {
    console.error('Error in submitDepositRequest:', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * 2. Staff รับคำขอฝากเข้าสู่ระบบ
 */
function receiveDepositByStaff(requestId, staffUsername) {
  try {
    const userInfo = getUserByUsername(staffUsername);
    if (!userInfo || userInfo.role !== 'staff') {
      return { success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' };
    }

    // ค้นหา request
    let requestData = null;
    let requestSheet = null;
    let requestRow = -1;

    const storeIds = JSON.parse(userInfo.store_ids || '[]');
    for (const storeId of storeIds) {
      const storeInfo = getStoreInfoById(storeId);
      if (!storeInfo) continue;

      const storeSS = SpreadsheetApp.openById(storeInfo.sheet_id);
      const sheet = storeSS.getSheetByName('Deposit_Requests');
      if (!sheet) continue;

      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === requestId && data[i][11] === 'pending') {
          requestData = data[i];
          requestSheet = sheet;
          requestRow = i + 1;
          break;
        }
      }
      if (requestData) break;
    }

    if (!requestData) {
      return { success: false, message: 'ไม่พบคำขอหรือถูกดำเนินการแล้ว' };
    }

    // อัปเดตสถานะ request
    const now = new Date();
    requestSheet.getRange(requestRow, 12).setValue('received'); // status (index 11)
    requestSheet.getRange(requestRow, 14).setValue(staffUsername); // processed_by (index 13)
    requestSheet.getRange(requestRow, 15).setValue(now); // processed_at (index 14)

    // สร้างรหัสฝาก
    const storeId = requestData[1];
    const depositCodeResult = generateDepositCode(storeId);

    if (!depositCodeResult.success) {
      return { success: false, message: 'ไม่สามารถสร้างรหัสฝากได้' };
    }

    const depositCode = depositCodeResult.code;

    // เพิ่มเข้า Deposits sheet (สถานะ pending_confirm)
    const storeInfo = getStoreInfoById(storeId);
    const storeSS = SpreadsheetApp.openById(storeInfo.sheet_id);
    const depositsSheet = storeSS.getSheetByName('Deposits');

    const depositId = Utilities.getUuid();
    const expiryDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // +30 วัน

    depositsSheet.appendRow([
      depositId,
      depositCode,
      storeId,
      requestData[2], // line_user_id
      requestData[3], // customer_name
      requestData[4], // customer_phone
      requestData[5], // product_name
      requestData[6], // category
      requestData[7], // quantity
      requestData[8], // remaining_percent
      requestData[7], // remaining_qty (same as quantity initially)
      requestData[9], // table_number
      now, // deposit_date
      expiryDate, // expiry_date
      false, // is_vip
      'pending_confirm', // status
      '', // photo_url
      staffUsername, // received_by
      '', // confirmed_by
      requestData[10], // notes
      now, // created_at
      now // updated_at
    ]);

    // อัปเดต deposit_id ใน request
    requestSheet.getRange(requestRow, 16).setValue(depositId); // deposit_id (index 15)

    return {
      success: true,
      message: 'รับเข้าระบบเรียบร้อย รอ Bar ยืนยัน',
      depositId,
      depositCode
    };

  } catch (error) {
    console.error('Error in receiveDepositByStaff:', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * 3. Bar ยืนยันการฝาก (อัปโหลดรูป)
 */
function confirmDeposit(depositId, barUsername, photoUrl) {
  try {
    const userInfo = getUserByUsername(barUsername);
    if (!userInfo || userInfo.role !== 'bar') {
      return { success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' };
    }

    // ค้นหา deposit
    let depositData = null;
    let depositsSheet = null;
    let depositRow = -1;
    let storeInfo = null;
    let foundStoreId = null;

    const storeIds = JSON.parse(userInfo.store_ids || '[]');
    for (const storeId of storeIds) {
      storeInfo = getStoreInfoById(storeId);
      if (!storeInfo) continue;

      const storeSS = SpreadsheetApp.openById(storeInfo.sheet_id);
      const sheet = storeSS.getSheetByName('Deposits');
      if (!sheet) continue;

      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === depositId && data[i][15] === 'pending_confirm') {
          depositData = data[i];
          depositsSheet = sheet;
          depositRow = i + 1;
          foundStoreId = storeId;
          break;
        }
      }
      if (depositData) break;
    }

    if (!depositData) {
      return { success: false, message: 'ไม่พบรายการหรือถูกยืนยันแล้ว' };
    }

    // อัปเดตสถานะ
    const now = new Date();
    depositsSheet.getRange(depositRow, 16).setValue('in_store'); // status
    depositsSheet.getRange(depositRow, 17).setValue(photoUrl); // photo_url
    depositsSheet.getRange(depositRow, 19).setValue(barUsername); // confirmed_by
    depositsSheet.getRange(depositRow, 22).setValue(now); // updated_at

    // ส่งข้อความหา LINE ลูกค้า
    const lineUserId = depositData[3];
    const depositCode = depositData[1];
    const customerName = depositData[4];
    const alcoholType = depositData[6];
    const quantity = depositData[7];
    const expiryDate = new Date(depositData[11]);

    const message = `✅ ฝากเหล้าสำเร็จ!\n\nรหัสฝาก: ${depositCode}\nประเภท: ${alcoholType}\nจำนวน: ${quantity} ขวด\nหมดอายุ: ${Utilities.formatDate(expiryDate, 'GMT+7', 'dd/MM/yyyy')}\n\nขอบคุณที่ใช้บริการค่ะ`;

    sendLineMessage(lineUserId, message, foundStoreId);

    // Link LINE User ID to Deposit
    linkLineUserToDeposit(depositId, lineUserId);

    return {
      success: true,
      message: 'ยืนยันการฝากเรียบร้อย',
      depositCode
    };

  } catch (error) {
    console.error('Error in confirmDeposit:', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Confirm deposit with edited data (Bar can edit before confirming)
 */
function confirmDepositWithEdits(data) {
  try {
    console.log('📝 Confirming deposit with edits:', data.depositId);

    const {
      depositId,
      storeId,
      customerName,
      customerPhone,
      productName,
      category,
      quantity,
      remainingPercent,
      tableNumber,
      notes,
      photoBase64,
      existingPhotoUrl
    } = data;

    // Get store info
    const storeInfo = getStoreInfoById(storeId);
    if (!storeInfo) {
      return { success: false, message: 'ไม่พบข้อมูลสาขา' };
    }

    // Open store sheet
    const storeSS = SpreadsheetApp.openById(storeInfo.sheet_id);
    const depositsSheet = storeSS.getSheetByName('Deposits');
    if (!depositsSheet) {
      return { success: false, message: 'ไม่พบชีต Deposits' };
    }

    // Find deposit row
    const data_rows = depositsSheet.getDataRange().getValues();
    let depositRow = -1;
    let depositCode = null;
    let lineUserId = null;
    let depositDate = null;
    let expiryDate = null;

    for (let i = 1; i < data_rows.length; i++) {
      if (data_rows[i][0] === depositId && data_rows[i][15] === 'pending_confirm') {
        depositRow = i + 1;
        depositCode = data_rows[i][1];
        lineUserId = data_rows[i][3];
        depositDate = data_rows[i][12];
        expiryDate = data_rows[i][13];
        break;
      }
    }

    if (depositRow === -1) {
      return { success: false, message: 'ไม่พบรายการหรือถูกยืนยันแล้ว' };
    }

    // Upload new photo if provided, otherwise keep existing
    let photoUrl = existingPhotoUrl || '';
    if (photoBase64) {
      const fileName = `${depositCode}_${Date.now()}.jpg`;
      photoUrl = uploadDepositPhoto(storeId, photoBase64, fileName);
      console.log('📸 New photo uploaded:', photoUrl);
    }

    // Update deposit with edited data
    const now = new Date();

    // Column mapping (1-based for getRange):
    // 5: customer_name, 6: customer_phone
    // 7: product_name, 8: category
    // 9: quantity, 10: remaining_percent, 11: remaining_qty, 12: table_number
    // 13: deposit_date, 14: expiry_date, 15: is_vip
    // 16: status (index 15), 17: photo_url (index 16)
    // 19: confirmed_by (index 18), 20: notes (index 19), 22: updated_at (index 21)

    depositsSheet.getRange(depositRow, 5).setValue(customerName);
    depositsSheet.getRange(depositRow, 6).setValue("'" + customerPhone); // Text format
    depositsSheet.getRange(depositRow, 7).setValue(productName);
    depositsSheet.getRange(depositRow, 8).setValue(category);
    depositsSheet.getRange(depositRow, 9).setValue(quantity);
    depositsSheet.getRange(depositRow, 10).setValue(remainingPercent);
    depositsSheet.getRange(depositRow, 11).setValue(quantity); // remaining_qty = quantity initially
    depositsSheet.getRange(depositRow, 12).setValue(tableNumber); // table_number is column 12, not 11!
    depositsSheet.getRange(depositRow, 20).setValue(notes); // notes is column 20, not 12!
    depositsSheet.getRange(depositRow, 16).setValue('in_store');
    depositsSheet.getRange(depositRow, 17).setValue(photoUrl);
    // TODO: Set confirmed_by when we have bar user info
    depositsSheet.getRange(depositRow, 22).setValue(now);

    console.log('✅ Deposit confirmed and updated:', depositCode);

    // Send LINE message to customer if LINE user
    if (lineUserId) {
      const message = `✅ ฝากเหล้าสำเร็จ!\n\nรหัสฝาก: ${depositCode}\nชื่อเหล้า: ${productName}\nจำนวน: ${quantity} ขวด\n\nขอบคุณที่ใช้บริการค่ะ`;
      sendLineMessage(lineUserId, message, storeId);
    }

    return {
      success: true,
      message: 'ยืนยันการฝากเรียบร้อย',
      depositCode: depositCode
    };

  } catch (error) {
    console.error('❌ Error in confirmDepositWithEdits:', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * 4. ลูกค้าส่งคำขอเบิกผ่าน LIFF
 */
function submitWithdrawalRequest(data) {
  try {
    const { depositId, lineUserId, requestedQty, tableNumber, notes } = data;

    // ค้นหา deposit
    let depositData = null;
    let storeId = null;

    const masterSS = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const storeSheet = masterSS.getSheetByName(CONFIG.MASTER_SHEETS.STORES);
    const storesData = storeSheet.getDataRange().getValues();

    for (let i = 1; i < storesData.length; i++) {
      const sheetId = storesData[i][3]; // sheet_id column
      if (!sheetId) continue;

      const storeSS = SpreadsheetApp.openById(sheetId);
      const depositsSheet = storeSS.getSheetByName('Deposits');
      if (!depositsSheet) continue;

      const data = depositsSheet.getDataRange().getValues();
      for (let j = 1; j < data.length; j++) {
        if (data[j][0] === depositId && data[j][13] === 'in_store') {
          depositData = data[j];
          storeId = data[j][2];
          break;
        }
      }
      if (depositData) break;
    }

    if (!depositData) {
      return { success: false, message: 'ไม่พบรายการฝากหรือไม่สามารถเบิกได้' };
    }

    const remainingQty = depositData[8];
    if (requestedQty > remainingQty) {
      return { success: false, message: `จำนวนเบิกเกินที่มี (คงเหลือ ${remainingQty} ขวด)` };
    }

    // เพิ่มคำขอเบิก
    const storeInfo = getStoreInfoById(storeId);
    const storeSS = SpreadsheetApp.openById(storeInfo.sheet_id);
    const withdrawalRequestsSheet = storeSS.getSheetByName('Withdrawal_Requests');

    const requestId = Utilities.getUuid();
    const now = new Date();

    withdrawalRequestsSheet.appendRow([
      requestId,
      depositId,
      depositData[1], // deposit_code
      lineUserId,
      requestedQty,
      tableNumber || '-',
      notes || '-',
      'pending', // status
      now, // request_date
      '', // processed_by
      '', // processed_at
      '' // withdrawal_id
    ]);

    // ส่ง notification ไปหา Bar Group
    if (storeInfo.bar_group_id) {
      const message = `🍾 คำขอเบิกเหล้า\n\nรหัสฝาก: ${depositData[1]}\nลูกค้า: ${depositData[4]}\nขอเบิก: ${requestedQty} ขวด\nโต๊ะ: ${tableNumber || '-'}`;
      sendLineMessage(storeInfo.bar_group_id, message, storeId);
    }

    return {
      success: true,
      message: 'ส่งคำขอเบิกเรียบร้อย',
      requestId
    };

  } catch (error) {
    console.error('Error in submitWithdrawalRequest:', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * 5. Bar ดำเนินการเบิก
 */
function processWithdrawal(requestId, barUsername, actualQuantity, notes) {
  try {
    const userInfo = getUserByUsername(barUsername);
    if (!userInfo || userInfo.role !== 'bar') {
      return { success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' };
    }

    // ค้นหา withdrawal request
    let requestData = null;
    let requestSheet = null;
    let requestRow = -1;
    let storeInfo = null;
    let foundStoreId = null;

    const storeIds = JSON.parse(userInfo.store_ids || '[]');
    for (const storeId of storeIds) {
      storeInfo = getStoreInfoById(storeId);
      if (!storeInfo) continue;

      const storeSS = SpreadsheetApp.openById(storeInfo.sheet_id);
      const sheet = storeSS.getSheetByName('Withdrawal_Requests');
      if (!sheet) continue;

      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === requestId && data[i][7] === 'pending') {
          requestData = data[i];
          requestSheet = sheet;
          requestRow = i + 1;
          foundStoreId = storeId;
          break;
        }
      }
      if (requestData) break;
    }

    if (!requestData) {
      return { success: false, message: 'ไม่พบคำขอหรือถูกดำเนินการแล้ว' };
    }

    const depositId = requestData[1];
    const depositCode = requestData[2];
    const lineUserId = requestData[3];

    // อัปเดต Deposits (ลดจำนวน)
    const storeSS = SpreadsheetApp.openById(storeInfo.sheet_id);
    const depositsSheet = storeSS.getSheetByName('Deposits');
    const depositsData = depositsSheet.getDataRange().getValues();

    let depositRow = -1;
    let depositData = null;

    for (let i = 1; i < depositsData.length; i++) {
      if (depositsData[i][0] === depositId) {
        depositData = depositsData[i];
        depositRow = i + 1;
        break;
      }
    }

    if (!depositData) {
      return { success: false, message: 'ไม่พบรายการฝาก' };
    }

    // Fix: If remaining_qty is empty/null, use quantity as fallback
    let currentRemaining = depositData[10];
    if (!currentRemaining || currentRemaining === '') {
      console.warn('⚠️  remaining_qty is empty in processWithdrawal, using quantity as fallback');
      currentRemaining = depositData[8]; // Use quantity
      // Update the sheet to fix the data
      depositsSheet.getRange(depositRow, 11).setValue(currentRemaining);
      console.log('✅ Fixed remaining_qty to:', currentRemaining);
    }

    const newRemaining = currentRemaining - actualQuantity;

    if (newRemaining < 0) {
      return { success: false, message: 'จำนวนเบิกเกินที่มี' };
    }

    // อัปเดตจำนวนคงเหลือ
    const now = new Date();
    depositsSheet.getRange(depositRow, 11).setValue(newRemaining); // remaining_qty (index 10 = column 11)
    depositsSheet.getRange(depositRow, 22).setValue(now); // updated_at (index 21 = column 22)

    // ถ้าเบิกหมด ย้ายไป History
    if (newRemaining === 0) {
      depositsSheet.getRange(depositRow, 16).setValue('withdrawn'); // status (index 15 = column 16)
      archiveDeposit(depositId, storeInfo.sheet_id, 'withdrawn');
    }

    // บันทึก Withdrawal
    const withdrawalsSheet = storeSS.getSheetByName('Withdrawals');
    const withdrawalId = Utilities.getUuid();

    withdrawalsSheet.appendRow([
      withdrawalId,
      depositId,
      depositCode,
      lineUserId,
      depositData[4], // customer_name
      requestData[4], // requested_qty
      actualQuantity, // actual_qty
      requestData[5], // table_number
      now, // withdrawal_date
      barUsername, // processed_by
      notes || '-',
      now // created_at
    ]);

    // อัปเดต request status
    requestSheet.getRange(requestRow, 8).setValue('completed'); // status
    requestSheet.getRange(requestRow, 10).setValue(barUsername); // processed_by
    requestSheet.getRange(requestRow, 11).setValue(now); // processed_at
    requestSheet.getRange(requestRow, 12).setValue(withdrawalId); // withdrawal_id

    // ส่งข้อความหา LINE ลูกค้า
    const message = `✅ เบิกเหล้าเรียบร้อย!\n\nรหัสฝาก: ${depositCode}\nเบิก: ${actualQuantity} ขวด\nคงเหลือ: ${newRemaining} ขวด\n\nขอบคุณที่ใช้บริการค่ะ`;
    sendLineMessage(lineUserId, message, foundStoreId);

    return {
      success: true,
      message: 'ดำเนินการเบิกเรียบร้อย',
      withdrawalId,
      newRemaining
    };

  } catch (error) {
    console.error('Error in processWithdrawal:', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * 6. Trigger รายวันตรวจสอบ Expiry และส่ง Notification
 */
function triggerExpiryNotifications() {
  try {
    console.log('Running daily expiry check...');

    const masterSS = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const storeSheet = masterSS.getSheetByName(CONFIG.MASTER_SHEETS.STORES);
    const storesData = storeSheet.getDataRange().getValues();

    let totalExpired = 0;
    let totalNotified = 0;

    for (let i = 1; i < storesData.length; i++) {
      const sheetId = storesData[i][3]; // sheet_id
      const storeId = storesData[i][0]; // store_id
      const storeName = storesData[i][2]; // store_name

      if (!sheetId) continue;

      const storeSS = SpreadsheetApp.openById(sheetId);
      const depositsSheet = storeSS.getSheetByName('Deposits');
      if (!depositsSheet) continue;

      const data = depositsSheet.getDataRange().getValues();
      const now = new Date();
      const threeDaysLater = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));

      for (let j = 1; j < data.length; j++) {
        const status = data[j][13];
        if (status !== 'in_store') continue;

        const expiryDate = new Date(data[j][11]);
        const lineUserId = data[j][3];
        const depositCode = data[j][1];
        const alcoholType = data[j][6];
        const remainingQty = data[j][8];

        // หมดอายุแล้ว
        if (expiryDate <= now) {
          depositsSheet.getRange(j + 1, 14).setValue('expired');
          archiveDeposit(data[j][0], sheetId, 'expired');
          totalExpired++;

          const message = `⚠️ รายการฝากของคุณหมดอายุแล้ว\n\nรหัสฝาก: ${depositCode}\nประเภท: ${alcoholType}\nจำนวน: ${remainingQty} ขวด\n\nจะถูกโอนไปคลังกลาง`;
          sendLineMessage(lineUserId, message, storeId);
        }
        // ใกล้หมดอายุ (3 วัน)
        else if (expiryDate <= threeDaysLater) {
          const daysLeft = Math.ceil((expiryDate - now) / (24 * 60 * 60 * 1000));
          const message = `⏰ เหล้าฝากของคุณใกล้หมดอายุ\n\nรหัสฝาก: ${depositCode}\nเหลืออีก: ${daysLeft} วัน\nหมดอายุ: ${Utilities.formatDate(expiryDate, 'GMT+7', 'dd/MM/yyyy')}\n\nกรุณาเบิกหรือต่ออายุค่ะ`;
          sendLineMessage(lineUserId, message, storeId);
          totalNotified++;
        }
      }
    }

    console.log(`Expiry check completed. Expired: ${totalExpired}, Notified: ${totalNotified}`);

    return {
      success: true,
      totalExpired,
      totalNotified
    };

  } catch (error) {
    console.error('Error in triggerExpiryNotifications:', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * 7. VIP ต่ออายุ (90 วัน)
 */
function extendDepositExpiry(depositId, extensionDays) {
  try {
    // ค้นหา deposit
    const masterSS = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const storeSheet = masterSS.getSheetByName(CONFIG.MASTER_SHEETS.STORES);
    const storesData = storeSheet.getDataRange().getValues();

    for (let i = 1; i < storesData.length; i++) {
      const sheetId = storesData[i][3];
      const storeId = storesData[i][0];
      if (!sheetId) continue;

      const storeSS = SpreadsheetApp.openById(sheetId);
      const depositsSheet = storeSS.getSheetByName('Deposits');
      if (!depositsSheet) continue;

      const data = depositsSheet.getDataRange().getValues();

      for (let j = 1; j < data.length; j++) {
        if (data[j][0] === depositId) {
          const currentExpiry = new Date(data[j][13]); // expiry_date is at index 13
          const newExpiry = new Date(currentExpiry.getTime() + (extensionDays * 24 * 60 * 60 * 1000));

          depositsSheet.getRange(j + 1, 14).setValue(newExpiry); // expiry_date (index 13 = column 14)
          depositsSheet.getRange(j + 1, 15).setValue(true); // is_vip (index 14 = column 15)
          depositsSheet.getRange(j + 1, 22).setValue(new Date()); // updated_at (index 21 = column 22)

          // ส่ง LINE แจ้งลูกค้า
          const lineUserId = data[j][3];
          const depositCode = data[j][1];
          const message = `✅ ต่ออายุสำเร็จ!\n\nรหัสฝาก: ${depositCode}\nหมดอายุใหม่: ${Utilities.formatDate(newExpiry, 'GMT+7', 'dd/MM/yyyy')}\nสถานะ: VIP (${extensionDays} วัน)`;
          sendLineMessage(lineUserId, message, storeId);

          return {
            success: true,
            message: 'ต่ออายุเรียบร้อย',
            newExpiry
          };
        }
      }
    }

    return { success: false, message: 'ไม่พบรายการฝาก' };

  } catch (error) {
    console.error('Error in extendDepositExpiry:', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * 8. ส่งคำขอโอนคลังกลาง
 */
function submitCentralTransferRequest(storeId, depositIds, photoUrl, notes, createdBy) {
  try {
    const storeInfo = getStoreInfoById(storeId);
    if (!storeInfo) {
      return { success: false, message: 'ไม่พบข้อมูลสาขา' };
    }

    const storeSS = SpreadsheetApp.openById(storeInfo.sheet_id);
    const transferSheet = storeSS.getSheetByName('Transfer_Requests');
    const depositsSheet = storeSS.getSheetByName('Deposits');

    if (!transferSheet || !depositsSheet) {
      return { success: false, message: 'ไม่พบ sheets ที่จำเป็น' };
    }

    const transferId = Utilities.getUuid();
    const transferCode = generateTransferCode(storeId);
    const now = new Date();

    // อัปเดตสถานะ deposits เป็น transfer_pending
    const depositsData = depositsSheet.getDataRange().getValues();

    for (const depositId of depositIds) {
      for (let i = 1; i < depositsData.length; i++) {
        if (depositsData[i][0] === depositId) {
          depositsSheet.getRange(i + 1, 16).setValue('transfer_pending'); // status (index 15 = column 16)
          depositsSheet.getRange(i + 1, 22).setValue(now); // updated_at (index 21 = column 22)
          break;
        }
      }
    }

    // สร้าง transfer request
    transferSheet.appendRow([
      transferId,
      transferCode,
      storeId,
      JSON.stringify(depositIds), // deposit_ids as JSON array
      depositIds.length, // total_items
      now, // transfer_date
      '', // confirm_date
      photoUrl, // photo_url
      '', // confirm_photo_url
      'pending', // status
      notes || '-',
      '', // confirmed_by
      createdBy,
      now // created_at
    ]);

    // ส่ง LINE แจ้ง Central
    if (storeInfo.central_group_id) {
      const message = `📦 คำขอโอนคลังกลาง\n\nรหัสโอน: ${transferCode}\nสาขา: ${storeInfo.name}\nจำนวน: ${depositIds.length} รายการ`;
      sendLineMessage(storeInfo.central_group_id, message, storeId);
    }

    return {
      success: true,
      message: 'ส่งคำขอโอนเรียบร้อย',
      transferId,
      transferCode
    };

  } catch (error) {
    console.error('Error in submitCentralTransferRequest:', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * 9. Central ยืนยันรับโอน (LIFF)
 */
function confirmCentralTransfer(transferId, centralUserId, confirmPhotoUrl, notes) {
  try {
    // ค้นหา transfer request
    const masterSS = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const storeSheet = masterSS.getSheetByName(CONFIG.MASTER_SHEETS.STORES);
    const storesData = storeSheet.getDataRange().getValues();

    for (let i = 1; i < storesData.length; i++) {
      const sheetId = storesData[i][3];
      const storeId = storesData[i][0];

      if (!sheetId) continue;

      const storeSS = SpreadsheetApp.openById(sheetId);
      const transferSheet = storeSS.getSheetByName('Transfer_Requests');
      if (!transferSheet) continue;

      const data = transferSheet.getDataRange().getValues();

      for (let j = 1; j < data.length; j++) {
        if (data[j][0] === transferId && data[j][9] === 'pending') {
          const now = new Date();

          // อัปเดต transfer request
          transferSheet.getRange(j + 1, 7).setValue(now); // confirm_date
          transferSheet.getRange(j + 1, 9).setValue(confirmPhotoUrl); // confirm_photo_url
          transferSheet.getRange(j + 1, 10).setValue('confirmed'); // status
          transferSheet.getRange(j + 1, 12).setValue(centralUserId); // confirmed_by

          // อัปเดต deposits เป็น transferred
          const depositIds = JSON.parse(data[j][3]);
          const depositsSheet = storeSS.getSheetByName('Deposits');
          const depositsData = depositsSheet.getDataRange().getValues();

          for (const depositId of depositIds) {
            for (let k = 1; k < depositsData.length; k++) {
              if (depositsData[k][0] === depositId) {
                depositsSheet.getRange(k + 1, 16).setValue('transferred'); // status (index 15 = column 16)
                depositsSheet.getRange(k + 1, 22).setValue(now); // updated_at (index 21 = column 22)
                archiveDeposit(depositId, sheetId, 'transferred', transferId);
                break;
              }
            }
          }

          // ส่ง LINE แจ้งสาขา
          const storeInfoForNotif = getStoreInfoById(storeId);
          if (storeInfoForNotif && storeInfoForNotif.central_group_id) {
            const transferCode = data[j][1];
            const message = `✅ คลังกลางยืนยันรับโอนแล้ว\n\nรหัสโอน: ${transferCode}\nจำนวน: ${data[j][4]} รายการ`;
            sendLineMessage(storeInfoForNotif.central_group_id, message, storeId);
          }

          return {
            success: true,
            message: 'ยืนยันรับโอนเรียบร้อย'
          };
        }
      }
    }

    return { success: false, message: 'ไม่พบคำขอโอนหรือถูกดำเนินการแล้ว' };

  } catch (error) {
    console.error('Error in confirmCentralTransfer:', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * 10. ดึงข้อมูล Dashboard
 */
function getDashboardDepositData(storeId) {
  try {
    const storeInfo = getStoreInfoById(storeId);
    if (!storeInfo) {
      return { success: false, message: 'ไม่พบข้อมูลสาขา' };
    }

    const storeSS = SpreadsheetApp.openById(storeInfo.sheet_id);
    const depositsSheet = storeSS.getSheetByName('Deposits');
    const withdrawalsSheet = storeSS.getSheetByName('Withdrawals');
    const historySheet = storeSS.getSheetByName('Deposit_History');

    if (!depositsSheet) {
      return { success: false, message: 'ไม่พบ Deposits sheet' };
    }

    const data = depositsSheet.getDataRange().getValues();

    // Deposits Schema:
    // 0: deposit_id, 1: deposit_code, 2: store_id, 3: line_user_id, 4: customer_name
    // 5: customer_phone, 6: product_name, 7: category, 8: quantity (ฝากรวม), 9: remaining_percent
    // 10: remaining_qty (คงเหลือ), 11: table_number, 12: deposit_date, 13: expiry_date, 14: is_vip
    // 15: status, 16: photo_url, 17: received_by, 18: confirmed_by, 19: notes

    let totalDeposits = 0;
    let inStore = 0;
    let withdrawn = 0;
    let expired = 0;
    let transferred = 0;
    let expiringSoon = 0;
    let readyToTransfer = 0;  // รายการหมดอายุพร้อมโอน
    let transferPending = 0;  // รายการที่กำลังรอโอน
    let byCategory = {};
    let expiringSoonList = [];
    let expiredList = [];
    let readyToTransferList = [];  // รายการพร้อมโอน
    let transferPendingList = [];  // รายการที่กำลังรอโอน
    let recentDeposits = [];
    let transferredList = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Date boundaries
    const startOfDay = new Date(today);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - 7);
    const startOfMonth = new Date(today);
    startOfMonth.setDate(today.getDate() - 30);

    // Period counters
    let periodDepositsDaily = 0;
    let periodDepositsWeekly = 0;
    let periodDepositsMonthly = 0;
    let depositsByCategoryPeriod = {};

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;

      const status = row[15];
      const category = row[7] || 'อื่นๆ';
      const quantity = Number(row[8]) || 0;
      const remainingQty = Number(row[10]) || 0;
      const depositDateRaw = row[12];
      const expiryDateRaw = row[13];

      totalDeposits += quantity;

      if (!byCategory[category]) {
        byCategory[category] = 0;
      }

      // Clean phone number
      let phone = row[5] || '';
      if (typeof phone === 'string' && phone.startsWith("'")) {
        phone = phone.substring(1);
      }

      // Parse deposit date
      let depositDate = null;
      if (depositDateRaw) {
        depositDate = new Date(depositDateRaw);
        depositDate.setHours(0, 0, 0, 0);
      }

      if (status === 'in_store') {
        inStore += remainingQty;
        byCategory[category] += remainingQty;
        withdrawn += (quantity - remainingQty);

        // Count deposits by period
        if (depositDate) {
          if (depositDate >= startOfDay) {
            periodDepositsDaily += quantity;
            if (!depositsByCategoryPeriod[category]) depositsByCategoryPeriod[category] = 0;
            depositsByCategoryPeriod[category] += quantity;
          }
          if (depositDate >= startOfWeek) {
            periodDepositsWeekly += quantity;
          }
          if (depositDate >= startOfMonth) {
            periodDepositsMonthly += quantity;
            // Add to recent deposits list
            recentDeposits.push({
              id: row[0],
              code: row[1],
              customer: row[4],
              product: row[6],
              category: category,
              quantity: quantity,
              date: depositDate.toLocaleDateString('th-TH')
            });
          }
        }

        // Check expiry
        if (expiryDateRaw) {
          const expiryDate = new Date(expiryDateRaw);
          expiryDate.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

          const itemData = {
            id: row[0],
            code: row[1],
            customer: row[4],
            phone: phone,
            product: row[6],
            category: category,
            quantity: remainingQty,
            depositDate: depositDate ? depositDate.toLocaleDateString('th-TH') : '',
            expiryDate: expiryDate.toLocaleDateString('th-TH'),
            daysRemaining: diffDays,
            daysExpired: Math.abs(diffDays)
          };

          if (diffDays <= 7 && diffDays > 0) {
            // ใกล้หมดอายุ 1-7 วัน
            expiringSoon += remainingQty;
            expiringSoonList.push(itemData);
          } else if (diffDays <= 0) {
            // หมดอายุแล้ว (diffDays <= 0)
            expired += remainingQty;
            expiredList.push(itemData);
            // รายการพร้อมโอนคลังกลาง
            readyToTransfer += remainingQty;
            readyToTransferList.push(itemData);
          }
        }
      } else if (status === 'expired') {
        // รายการที่มี status = 'expired' ในชีท (ถูกเปลี่ยนโดย trigger หรือ manual)
        const expiryDate = expiryDateRaw ? new Date(expiryDateRaw) : today;
        expiryDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

        const itemData = {
          id: row[0],
          code: row[1],
          customer: row[4],
          phone: phone,
          product: row[6],
          category: category,
          quantity: remainingQty,
          depositDate: depositDate ? depositDate.toLocaleDateString('th-TH') : '',
          expiryDate: expiryDate.toLocaleDateString('th-TH'),
          daysRemaining: diffDays,
          daysExpired: Math.abs(diffDays)
        };

        expired += remainingQty;
        expiredList.push(itemData);
        readyToTransfer += remainingQty;
        readyToTransferList.push(itemData);
      } else if (status === 'transferred' || status === 'transfer_confirmed') {
        transferred += remainingQty;
        transferredList.push({
          id: row[0],
          code: row[1],
          customer: row[4],
          product: row[6],
          category: category,
          quantity: remainingQty,
          date: depositDate ? depositDate.toLocaleDateString('th-TH') : ''
        });
      } else if (status === 'transfer_pending') {
        // รายการที่กำลังรอโอนไปคลังกลาง
        const expiryDate = expiryDateRaw ? new Date(expiryDateRaw) : today;
        expiryDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

        transferPending += remainingQty;
        transferPendingList.push({
          id: row[0],
          code: row[1],
          customer: row[4],
          phone: phone,
          product: row[6],
          category: category,
          quantity: remainingQty,
          depositDate: depositDate ? depositDate.toLocaleDateString('th-TH') : '',
          expiryDate: expiryDate.toLocaleDateString('th-TH'),
          daysExpired: Math.abs(diffDays)
        });
      }
    }

    // Get withdrawal data
    let recentWithdrawals = [];
    let periodWithdrawalsDaily = 0;
    let periodWithdrawalsWeekly = 0;
    let periodWithdrawalsMonthly = 0;

    if (withdrawalsSheet) {
      const withdrawalsData = withdrawalsSheet.getDataRange().getValues();
      // Withdrawals Schema (from actual sheet):
      // A(0): withdrawal_id, B(1): deposit_id, C(2): deposit_code, D(3): line_user_id
      // E(4): customer_name, F(5): requested_qty, G(6): actual_qty, H(7): table_number
      // I(8): withdrawal_date, J(9): processed_by, K(10): notes, L(11): created_at

      for (let i = 1; i < withdrawalsData.length; i++) {
        const row = withdrawalsData[i];
        if (!row[0]) continue;

        const withdrawnQty = Number(row[6]) || 0; // actual_qty at index 6
        const withdrawalDateRaw = row[8]; // withdrawal_date at index 8

        if (withdrawalDateRaw) {
          const withdrawalDate = new Date(withdrawalDateRaw);
          withdrawalDate.setHours(0, 0, 0, 0);

          if (withdrawalDate >= startOfDay) {
            periodWithdrawalsDaily += withdrawnQty;
          }
          if (withdrawalDate >= startOfWeek) {
            periodWithdrawalsWeekly += withdrawnQty;
          }
          if (withdrawalDate >= startOfMonth) {
            periodWithdrawalsMonthly += withdrawnQty;
            recentWithdrawals.push({
              id: row[0],
              code: row[2],
              customer: row[4],
              product: '', // Will lookup from deposits if needed
              quantity: withdrawnQty,
              date: withdrawalDate.toLocaleDateString('th-TH')
            });
          }
        }
      }
    }

    // Process history for archived items
    if (historySheet) {
      const historyData = historySheet.getDataRange().getValues();
      for (let i = 1; i < historyData.length; i++) {
        const row = historyData[i];
        if (!row[0]) continue;

        const finalStatus = row[7];
        const originalQty = Number(row[6]) || 0;
        const statusDate = row[8] ? new Date(row[8]) : null;

        totalDeposits += originalQty;

        if (finalStatus === 'fully_withdrawn' || finalStatus === 'withdrawn') {
          withdrawn += originalQty;
        } else if (finalStatus === 'expired') {
          expired += originalQty;
        } else if (finalStatus === 'transferred') {
          transferred += originalQty;
          if (statusDate) {
            transferredList.push({
              id: row[1],
              code: row[2],
              customer: row[3],
              product: row[4],
              category: row[5],
              quantity: originalQty,
              date: statusDate.toLocaleDateString('th-TH')
            });
          }
        }
      }
    }

    // Sort lists
    expiringSoonList.sort((a, b) => a.daysRemaining - b.daysRemaining);
    expiredList.sort((a, b) => b.daysExpired - a.daysExpired);
    readyToTransferList.sort((a, b) => b.daysExpired - a.daysExpired);
    transferPendingList.sort((a, b) => b.daysExpired - a.daysExpired);
    recentDeposits.sort((a, b) => new Date(b.date) - new Date(a.date));
    recentWithdrawals.sort((a, b) => new Date(b.date) - new Date(a.date));
    transferredList.sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      success: true,
      storeName: storeInfo.name,
      data: {
        totalDeposits,
        inStore,
        withdrawn,
        expired,
        transferred,
        expiringSoon,
        readyToTransfer,  // จำนวนพร้อมโอนคลังกลาง
        transferPending,  // จำนวนที่กำลังรอโอน
        byCategory,
        // Period data (will be updated by frontend based on selectedPeriod)
        periodDeposits: periodDepositsDaily, // default daily
        periodWithdrawals: periodWithdrawalsDaily,
        periodDepositsDaily,
        periodDepositsWeekly,
        periodDepositsMonthly,
        periodWithdrawalsDaily,
        periodWithdrawalsWeekly,
        periodWithdrawalsMonthly,
        depositsByCategory: depositsByCategoryPeriod,
        // Lists
        expiringSoonList: expiringSoonList.slice(0, 10),
        expiredList: expiredList.slice(0, 10),
        readyToTransferList: readyToTransferList.slice(0, 10),  // รายการพร้อมโอน
        transferPendingList: transferPendingList.slice(0, 10),  // รายการที่กำลังรอโอน
        recentDeposits: recentDeposits.slice(0, 20),
        recentWithdrawals: recentWithdrawals.slice(0, 20),
        transferredList: transferredList.slice(0, 20)
      }
    };

  } catch (error) {
    console.error('Error in getDashboardDepositData:', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * 11. ดึงรายการฝากทั้งหมดของสาขา
 */
/**
 * Search deposit for manual withdrawal (by code, name, or phone)
 */
function searchDepositForWithdrawal(storeId, searchQuery) {
  try {
    console.log('🔍 Searching deposit for withdrawal:', { storeId, searchQuery });

    const storeInfo = getStoreInfoById(storeId);
    if (!storeInfo) {
      return { success: false, message: 'ไม่พบข้อมูลสาขา' };
    }

    const storeSS = SpreadsheetApp.openById(storeInfo.sheet_id);
    const depositsSheet = storeSS.getSheetByName('Deposits');
    if (!depositsSheet) {
      return { success: false, message: 'ไม่พบชีต Deposits' };
    }

    const data = depositsSheet.getDataRange().getValues();
    const query = searchQuery.toLowerCase().trim();
    const matchedDeposits = []; // Array to collect all matching deposits

    // ค้นหาในแถวที่มีสถานะ 'in_store' และยังมีของเหลืออยู่
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const status = row[15]; // status column (index 15, column 16)
      const quantity = row[8] || 0; // quantity column (index 8, column 9)

      // Skip if not in_store or no quantity
      // Check quantity > 0 (not remainingQty which is initially empty)
      if (status !== 'in_store' || quantity <= 0) {
        continue;
      }

      const depositCode = (row[1] || '').toString().toLowerCase();
      const customerName = (row[4] || '').toString().toLowerCase();
      const customerPhone = (row[5] || '').toString();

      // Match by deposit code, customer name, or phone
      if (depositCode.includes(query) ||
          customerName.includes(query) ||
          customerPhone.includes(query)) {

        const deposit = {
          id: row[0],
          depositCode: row[1],
          storeId: row[2],
          lineUserId: row[3],
          customerName: row[4],
          customerPhone: row[5],
          productName: row[6],
          category: row[7],
          quantity: row[8],
          remainingPercent: row[9],
          remainingQty: row[10],
          tableNumber: row[11],
          depositDate: row[12] ? row[12].toString() : '',
          expiryDate: row[13] ? row[13].toString() : '',
          isVip: row[14],
          status: row[15],
          photoUrl: row[16],
          notes: row[19]
        };

        matchedDeposits.push(deposit);
        console.log('✅ Found deposit:', deposit.depositCode);
      }
    }

    // Return all matched deposits
    if (matchedDeposits.length > 0) {
      console.log(`✅ Found ${matchedDeposits.length} matching deposit(s)`);
      return { success: true, deposits: matchedDeposits, count: matchedDeposits.length };
    }

    console.log('❌ No matching deposit found');
    return { success: false, message: 'ไม่พบรายการฝากที่มีของคงเหลือ' };

  } catch (error) {
    console.error('❌ Error in searchDepositForWithdrawal:', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Create manual withdrawal (Staff creates request, Bar processes immediately)
 */
function createManualWithdrawal(data) {
  try {
    console.log('📝 Creating manual withdrawal:', data);

    const {
      depositId,
      storeId,
      quantity,
      notes,
      requestedBy,
      role
    } = data;

    const storeInfo = getStoreInfoById(storeId);
    if (!storeInfo) {
      return { success: false, message: 'ไม่พบข้อมูลสาขา' };
    }

    const storeSS = SpreadsheetApp.openById(storeInfo.sheet_id);
    const depositsSheet = storeSS.getSheetByName('Deposits');

    // Find deposit
    const depositsData = depositsSheet.getDataRange().getValues();
    let depositRow = -1;
    let depositData = null;

    for (let i = 1; i < depositsData.length; i++) {
      if (depositsData[i][0] === depositId && depositsData[i][15] === 'in_store') {
        depositData = depositsData[i];
        depositRow = i + 1;
        break;
      }
    }

    if (!depositData) {
      return { success: false, message: 'ไม่พบรายการฝากหรือไม่สามารถเบิกได้' };
    }

    // Debug: Log deposit data to check column values
    console.log('🔍 Debug depositData:', {
      depositId: depositData[0],
      depositCode: depositData[1],
      customerName: depositData[4],
      productName_col6: depositData[6],
      category_col7: depositData[7],
      quantity_col8: depositData[8],
      remainingPercent_col9: depositData[9],
      remainingQty_col10: depositData[10],
      tableNumber_col11: depositData[11],
      totalColumns: depositData.length
    });

    // Fix: If remaining_qty is empty/null, use quantity as fallback and update the sheet
    let remainingQty = depositData[10];
    if (!remainingQty || remainingQty === '') {
      console.warn('⚠️  remaining_qty is empty, using quantity as fallback');
      remainingQty = depositData[8]; // Use quantity

      // Update the sheet to fix the data
      depositsSheet.getRange(depositRow, 11).setValue(remainingQty); // Set remaining_qty (col 11)
      console.log('✅ Updated remaining_qty to:', remainingQty);
    }

    if (quantity > remainingQty) {
      return { success: false, message: `จำนวนเบิกเกินที่มี (คงเหลือ ${remainingQty} ขวด)` };
    }

    const depositCode = depositData[1];
    const customerName = depositData[4];
    const lineUserId = depositData[3];
    const now = new Date();

    // If Staff: Create withdrawal request
    if (role === 'staff') {
      const withdrawalRequestsSheet = storeSS.getSheetByName('Withdrawal_Requests');
      const requestId = Utilities.getUuid();

      withdrawalRequestsSheet.appendRow([
        requestId,
        depositId,
        depositCode,
        lineUserId || '-',
        quantity,
        depositData[11] || '-', // table_number
        notes || '-',
        'pending',
        now, // request_date
        '', // processed_by
        '', // processed_at
        '' // withdrawal_id
      ]);

      console.log('✅ Staff created withdrawal request:', requestId);

      // Notify Bar group if exists
      if (storeInfo.bar_group_id) {
        const message = `🍾 คำขอเบิกเหล้า (Manual)\n\nรหัสฝาก: ${depositCode}\nลูกค้า: ${customerName}\nขอเบิก: ${quantity} ขวด\n\nโดย: ${requestedBy}`;
        sendLineMessage(storeInfo.bar_group_id, message, storeId);
      }

      return { success: true, message: 'บันทึกคำขอเบิกเรียบร้อย', requestId };
    }

    // If Bar/Manager/Owner: Process withdrawal immediately
    if (['bar', 'manager', 'owner'].includes(role)) {
      const withdrawalsSheet = storeSS.getSheetByName('Withdrawals');
      const withdrawalId = Utilities.getUuid();

      // Update deposit remaining quantity
      const newRemainingQty = remainingQty - quantity;
      depositsSheet.getRange(depositRow, 11).setValue(newRemainingQty); // remaining_qty
      depositsSheet.getRange(depositRow, 21).setValue(now); // updated_at

      // Check if fully withdrawn
      if (newRemainingQty === 0) {
        // Move to history
        depositsSheet.getRange(depositRow, 16).setValue('withdrawn'); // status
        archiveDeposit(depositId, storeInfo.sheet_id, 'fully_withdrawn');
      }

      // Record withdrawal
      withdrawalsSheet.appendRow([
        withdrawalId,
        depositId,
        depositCode,
        lineUserId || '-',
        customerName,
        quantity, // requested_qty
        quantity, // actual_qty (same as requested for manual)
        depositData[11] || '-', // table_number (index 11 = table_number in Deposits schema)
        now, // withdrawal_date
        requestedBy, // processed_by (Bar username)
        notes || 'เบิกแบบ Manual',
        now // created_at
      ]);

      console.log('✅ Bar processed withdrawal immediately:', withdrawalId);

      // Notify customer if has LINE
      if (lineUserId) {
        const message = `✅ เบิกเหล้าสำเร็จ!\n\nรหัสฝาก: ${depositCode}\nเบิก: ${quantity} ขวด\nคงเหลือ: ${newRemainingQty} ขวด\n\nขอบคุณที่ใช้บริการค่ะ`;
        sendLineMessage(lineUserId, message, storeId);
      }

      return { success: true, message: 'เบิกเรียบร้อยแล้ว', withdrawalId };
    }

    return { success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' };

  } catch (error) {
    console.error('❌ Error in createManualWithdrawal:', error);
    return { success: false, message: error.toString() };
  }
}

function getDepositData(storeId) {
  try {
    console.log('📊 getDepositData called for store:', storeId);

    if (!storeId) {
      console.error('❌ No store ID provided');
      return { success: false, message: 'ไม่มี store ID' };
    }

    const storeInfo = getStoreInfoById(storeId);
    if (!storeInfo) {
      console.error('❌ Store not found:', storeId);
      return { success: false, message: 'ไม่พบข้อมูลสาขา' };
    }

    console.log('✅ Store info found:', storeInfo.name, 'Sheet ID:', storeInfo.sheet_id);

    if (!storeInfo.sheet_id) {
      console.error('❌ No sheet_id for store:', storeId);
      return { success: false, message: 'ไม่พบ sheet_id ของสาขา' };
    }

    const storeSS = SpreadsheetApp.openById(storeInfo.sheet_id);
    console.log('✅ Store spreadsheet opened');

    const deposits = {
      new_requests: [],
      pending_confirm: [],
      deposited: [],
      history: []
    };

    const withdrawals = {
      pending: []
    };

    // Deposit Requests
    // Schema: 'request_id', 'store_id', 'line_user_id', 'customer_name', 'customer_phone',
    // 'product_name', 'category', 'quantity', 'remaining_percent', 'table_number', 'notes', 'status',
    // 'request_date', 'processed_by', 'processed_at', 'deposit_id'
    const requestsSheet = storeSS.getSheetByName('Deposit_Requests');
    console.log('📄 Deposit_Requests sheet:', requestsSheet ? 'found' : 'not found');
    if (requestsSheet) {
      const data = requestsSheet.getDataRange().getValues();
      console.log('📊 Deposit_Requests rows:', data.length - 1);
      for (let i = 1; i < data.length; i++) {
        // Clean phone number (remove leading single quote if exists)
        let phoneNumber = data[i][4] || '';
        if (typeof phoneNumber === 'string' && phoneNumber.startsWith("'")) {
          phoneNumber = phoneNumber.substring(1);
        }

        if (data[i][11] === 'pending') { // status column (index 11)
          deposits.new_requests.push({
            id: data[i][0],
            customerName: data[i][3],
            customerPhone: phoneNumber,  // cleaned
            alcoholType: data[i][5], // product_name
            category: data[i][6],
            quantity: data[i][7],
            remainingPercent: data[i][8],
            tableNumber: data[i][9],
            notes: data[i][10],
            requestDate: data[i][12] ? data[i][12].toString() : ''  // convert to string
          });
        }
        // Note: 'received' status removed - requests go straight to pending_confirm after staff processes
      }
    }

    // Deposits
    // Schema: 'deposit_id', 'deposit_code', 'store_id', 'line_user_id', 'customer_name',
    // 'customer_phone', 'product_name', 'category', 'quantity', 'remaining_percent', 'remaining_qty', 'table_number',
    // 'deposit_date', 'expiry_date', 'is_vip', 'status', 'photo_url',
    // 'received_by', 'confirmed_by', 'notes', 'created_at', 'updated_at'
    const depositsSheet = storeSS.getSheetByName('Deposits');
    if (depositsSheet) {
      const data = depositsSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        // Clean phone number (remove leading single quote if exists)
        let phoneNumber = data[i][5] || '';
        if (typeof phoneNumber === 'string' && phoneNumber.startsWith("'")) {
          phoneNumber = phoneNumber.substring(1);
        }

        // Skip rows with invalid depositCode (error objects or error strings)
        const depositCodeValue = data[i][1];
        if (!depositCodeValue ||
            typeof depositCodeValue === 'object' ||
            (typeof depositCodeValue === 'string' && depositCodeValue.includes('message=')) ||
            (typeof depositCodeValue === 'string' && depositCodeValue.includes('success=false'))) {
          console.warn('⚠️  Skipping row with invalid depositCode:', data[i][0], depositCodeValue);
          continue;
        }

        const item = {
          id: data[i][0],                    // deposit_id
          depositCode: depositCodeValue,     // deposit_code (validated)
          customerName: data[i][4],          // customer_name
          customerPhone: phoneNumber,        // customer_phone (cleaned)
          alcoholType: data[i][6],           // product_name (แสดงเป็น alcoholType ใน UI)
          category: data[i][7],              // category
          quantity: data[i][8],              // quantity
          remainingPercent: data[i][9],      // remaining_percent
          remainingQty: data[i][10],         // remaining_qty
          tableNumber: data[i][11],          // table_number
          depositDate: data[i][12] ? data[i][12].toString() : '',  // deposit_date (convert to string)
          expiryDate: data[i][13] ? data[i][13].toString() : '',   // expiry_date (convert to string)
          isVip: data[i][14],                // is_vip
          status: data[i][15],               // status
          photoUrl: data[i][16]              // photo_url
        };

        // จัดกลุ่มตาม status
        if (data[i][15] === 'pending_confirm') {
          deposits.pending_confirm.push(item);
        } else if (data[i][15] === 'in_store') {
          deposits.deposited.push(item);
        } else if (data[i][15] === 'expired' || data[i][15] === 'transferred' || data[i][15] === 'transfer_pending' || data[i][15] === 'transfer_confirmed') {
          // รายการที่หมดอายุ, รอโอน, หรือโอนแล้ว ให้แสดงในประวัติ
          deposits.history.push(item);
        }
        // Note: pending_approval status removed from workflow
      }
    }

    // Withdrawal Requests
    const withdrawalRequestsSheet = storeSS.getSheetByName('Withdrawal_Requests');
    if (withdrawalRequestsSheet) {
      const data = withdrawalRequestsSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][7] === 'pending') {
          withdrawals.pending.push({
            id: data[i][0],
            depositId: data[i][1],
            depositCode: data[i][2],
            requestedQty: data[i][4],
            tableNumber: data[i][5],
            requestDate: data[i][8] ? data[i][8].toString() : ''  // convert to string
          });
        }
      }
    }

    // History
    // Schema: 'history_id', 'deposit_id', 'deposit_code', 'customer_name', 'product_name', 'category',
    // 'original_qty', 'final_status', 'status_date', 'transfer_id', 'notes', 'archived_at'
    const historySheet = storeSS.getSheetByName('Deposit_History');
    if (historySheet) {
      const data = historySheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        deposits.history.push({
          id: data[i][0],              // history_id
          depositCode: data[i][2],     // deposit_code
          customerName: data[i][3],    // customer_name
          alcoholType: data[i][4],     // product_name (แสดงเป็น alcoholType ใน UI)
          category: data[i][5],        // category
          quantity: data[i][6],        // original_qty
          status: data[i][7],          // final_status
          statusDate: data[i][8] ? data[i][8].toString() : ''  // status_date (convert to string)
        });
      }
    }

    const result = {
      success: true,
      deposits: deposits,
      withdrawals: withdrawals
    };

    console.log('✅ getDepositData result:', {
      new_requests: deposits.new_requests.length,
      pending_confirm: deposits.pending_confirm.length,
      deposited: deposits.deposited.length,
      history: deposits.history.length,
      withdrawals: withdrawals.pending.length
    });

    console.log('🔄 Returning result object:', JSON.stringify(result).substring(0, 200));

    return result;

  } catch (error) {
    console.error('❌ Error in getDepositData:', error);
    return { success: false, message: error.toString() };
  }
}

// ========================================
// getAllDepositsWithHistory - Get all deposits with withdrawal history for staff
// ========================================
function getAllDepositsWithHistory(storeId) {
  try {
    console.log('📊 getAllDepositsWithHistory called for store:', storeId);

    if (!storeId) {
      return { success: false, message: 'ไม่มี store ID' };
    }

    const storeInfo = getStoreInfoById(storeId);
    if (!storeInfo || !storeInfo.sheet_id) {
      return { success: false, message: 'ไม่พบข้อมูลสาขา' };
    }

    const storeSS = SpreadsheetApp.openById(storeInfo.sheet_id);
    const depositsSheet = storeSS.getSheetByName('Deposits');
    const withdrawalsSheet = storeSS.getSheetByName('Withdrawals');
    const historySheet = storeSS.getSheetByName('Deposit_History');

    let deposits = [];

    // Get active deposits from Deposits sheet
    if (depositsSheet) {
      const depositsData = depositsSheet.getDataRange().getValues();
      for (let i = 1; i < depositsData.length; i++) {
        const row = depositsData[i];
        if (!row[0]) continue; // Skip empty rows

        // Clean phone number
        let phoneNumber = row[5] || '';
        if (typeof phoneNumber === 'string' && phoneNumber.startsWith("'")) {
          phoneNumber = phoneNumber.substring(1);
        }

        deposits.push({
          id: row[0],
          code: row[1],
          customer_name: row[4],
          customer_phone: phoneNumber,
          product_name: row[6],
          category: row[7],
          quantity: row[8],
          remaining_percent: row[9],
          remaining_qty: row[10],
          deposit_date: row[12] ? row[12].toString() : '',
          expiry_date: row[13] ? row[13].toString() : '',
          status: row[15] || 'in_store',
          status_date: '', // Will be filled from withdrawals/history
          withdrawals: []
        });
      }
    }

    // Get withdrawal history
    // Withdrawals Schema: A(0): withdrawal_id, B(1): deposit_id, C(2): deposit_code, D(3): line_user_id
    // E(4): customer_name, F(5): requested_qty, G(6): actual_qty, H(7): table_number
    // I(8): withdrawal_date, J(9): processed_by, K(10): notes, L(11): created_at
    if (withdrawalsSheet) {
      const withdrawalsData = withdrawalsSheet.getDataRange().getValues();
      for (let i = 1; i < withdrawalsData.length; i++) {
        const row = withdrawalsData[i];
        const depositId = row[1]; // deposit_id column

        // Find matching deposit
        const deposit = deposits.find(d => d.id === depositId);
        if (deposit) {
          const withdrawalDate = row[8] ? row[8].toString() : ''; // withdrawal_date at index 8
          deposit.withdrawals.push({
            id: row[0],
            quantity: row[6], // actual_qty at index 6
            date: withdrawalDate
          });
          // Update status_date to latest withdrawal
          if (withdrawalDate && (!deposit.status_date || new Date(withdrawalDate) > new Date(deposit.status_date))) {
            deposit.status_date = withdrawalDate;
          }
        }
      }
    }

    // Get archived deposits from history
    // Deposit_History columns: history_id(0), deposit_id(1), deposit_code(2), customer_name(3),
    // product_name(4), category(5), original_qty(6), final_status(7), status_date(8),
    // transfer_id(9), notes(10), archived_at(11)
    if (historySheet) {
      const historyData = historySheet.getDataRange().getValues();
      for (let i = 1; i < historyData.length; i++) {
        const row = historyData[i];
        if (!row[0]) continue;

        // Check if already in deposits list
        const existingIndex = deposits.findIndex(d => d.id === row[1]);

        // Map final_status to display status
        let status = row[7] || 'fully_withdrawn';
        if (status === 'fully_withdrawn' || status === 'withdrawn') {
          status = 'fully_withdrawn';
        }

        const statusDate = row[8] ? row[8].toString() : '';

        if (existingIndex === -1) {
          // ไม่มีใน Deposits sheet - เป็นรายการที่ถูก archive แล้ว
          deposits.push({
            id: row[1],
            code: row[2],
            customer_name: row[3],
            customer_phone: '',
            product_name: row[4],
            category: row[5],
            quantity: row[6],
            remaining_percent: 0,
            remaining_qty: 0,
            deposit_date: statusDate, // use status_date as deposit_date approximation
            expiry_date: '',
            status: status,
            status_date: statusDate,
            notes: row[10] || '',
            withdrawals: []
          });
        } else {
          // มีอยู่แล้วใน deposits - อัพเดต status และ status_date จาก history
          if (status === 'fully_withdrawn' || status === 'expired' || status === 'transferred') {
            deposits[existingIndex].status = status;
            deposits[existingIndex].status_date = statusDate;
          }
        }
      }
    }

    // Sort by deposit date descending
    deposits.sort((a, b) => {
      if (!a.deposit_date) return 1;
      if (!b.deposit_date) return -1;
      return new Date(b.deposit_date) - new Date(a.deposit_date);
    });

    console.log('✅ getAllDepositsWithHistory returning', deposits.length, 'deposits');
    return { success: true, deposits: deposits };

  } catch (error) {
    console.error('❌ Error in getAllDepositsWithHistory:', error);
    return { success: false, message: error.toString() };
  }
}


// ========================================
// 12. getMyDeposits - Get deposits for specific LINE user (for LIFF)
// ========================================
function getMyDeposits(lineUserId) {
  try {
    const allStores = getActiveStores();
    let myDeposits = [];

    // Search across all stores
    allStores.forEach(store => {
      try {
        const storeSS = SpreadsheetApp.openById(store.sheet_id);
        const depositsSheet = storeSS.getSheetByName('Deposits');

        if (!depositsSheet) return;

        const data = depositsSheet.getDataRange().getValues();
        const headers = data[0];

        // Get column indices
        const colIndices = {
          deposit_id: headers.indexOf('deposit_id'),
          deposit_code: headers.indexOf('deposit_code'),
          store_id: headers.indexOf('store_id'),
          line_user_id: headers.indexOf('line_user_id'),
          customer_name: headers.indexOf('customer_name'),
          alcohol_type: headers.indexOf('alcohol_type'),
          quantity: headers.indexOf('quantity'),
          remaining_qty: headers.indexOf('remaining_qty'),
          deposit_date: headers.indexOf('deposit_date'),
          expiry_date: headers.indexOf('expiry_date'),
          status: headers.indexOf('status'),
          photo_url: headers.indexOf('photo_url')
        };

        // Filter deposits for this user that are in_store (active)
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (row[colIndices.line_user_id] === lineUserId && row[colIndices.status] === 'in_store') {
            myDeposits.push({
              id: row[colIndices.deposit_id],
              depositCode: row[colIndices.deposit_code],
              storeId: row[colIndices.store_id],
              storeName: store.store_name,
              alcoholType: row[colIndices.alcohol_type],
              quantity: row[colIndices.quantity],
              remainingQty: row[colIndices.remaining_qty],
              depositDate: row[colIndices.deposit_date],
              expiryDate: row[colIndices.expiry_date],
              photoUrl: row[colIndices.photo_url] || ''
            });
          }
        }
      } catch (storeError) {
        console.error('Error reading store ' + store.store_id + ':', storeError);
      }
    });

    return { success: true, deposits: myDeposits };

  } catch (error) {
    console.error('Error in getMyDeposits:', error);
    return { success: false, message: error.toString() };
  }
}


// ========================================
// 13. uploadAlcoholPhoto - Upload photo to ImgBB and return URL
// ========================================
function uploadAlcoholPhoto(base64Image) {
  try {
    const masterSettings = getMasterSettings();
    const imgbbApiKey = masterSettings.imgbb_api_key || '';

    if (!imgbbApiKey) {
      return { success: false, message: 'ImgBB API key not configured in Master_Settings' };
    }

    // Remove data URL prefix if present
    let imageData = base64Image;
    if (imageData.includes('base64,')) {
      imageData = imageData.split('base64,')[1];
    }

    // Upload to ImgBB
    const url = 'https://api.imgbb.com/1/upload';
    const payload = {
      key: imgbbApiKey,
      image: imageData
    };

    const options = {
      method: 'post',
      payload: payload,
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());

    if (result.success) {
      return {
        success: true,
        url: result.data.url,
        display_url: result.data.display_url,
        delete_url: result.data.delete_url
      };
    } else {
      return { success: false, message: 'ImgBB upload failed: ' + result.error.message };
    }

  } catch (error) {
    console.error('Error in uploadAlcoholPhoto:', error);
    return { success: false, message: error.toString() };
  }
}


// ========================================
// 14. generateDepositCode - REMOVED (duplicate)
// ========================================
// This function was a duplicate of the one at line 1280
// The correct implementation uses store_code + random: DEP-{store_code}-{random}
// This version (year + sequential) has been removed to avoid conflicts


// ========================================
// 15. generateTransferCode - Generate unique transfer code
// ========================================
function generateTransferCode(storeId) {
  try {
    const storeInfo = getStoreInfoById(storeId);
    const storeSS = SpreadsheetApp.openById(storeInfo.sheet_id);
    const transferSheet = storeSS.getSheetByName('Transfer_Requests');

    if (!transferSheet) {
      return { success: false, message: 'Transfer_Requests sheet not found' };
    }

    // Get current year
    const year = new Date().getFullYear();

    // Get all transfer codes to find the highest number
    const data = transferSheet.getDataRange().getValues();
    const headers = data[0];
    const codeColIndex = headers.indexOf('transfer_code');

    let maxNumber = 0;
    const prefix = `TRANS-${year}-`;

    for (let i = 1; i < data.length; i++) {
      const code = data[i][codeColIndex] || '';
      if (code.startsWith(prefix)) {
        const numPart = code.replace(prefix, '');
        const num = parseInt(numPart);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    }

    // Generate new code
    const newNumber = maxNumber + 1;
    const transferCode = `${prefix}${String(newNumber).padStart(4, '0')}`;

    return { success: true, code: transferCode };

  } catch (error) {
    console.error('Error in generateTransferCode:', error);
    return { success: false, message: error.toString() };
  }
}


// ========================================
// 16. archiveDeposit - Move deposit to Deposit_History
// ========================================
function archiveDeposit(depositId, sheetId, finalStatus, transferId = null) {
  try {
    const storeSS = SpreadsheetApp.openById(sheetId);
    const depositsSheet = storeSS.getSheetByName('Deposits');
    const historySheet = storeSS.getSheetByName('Deposit_History');

    if (!depositsSheet || !historySheet) {
      return { success: false, message: 'Required sheets not found' };
    }

    const data = depositsSheet.getDataRange().getValues();
    const headers = data[0];
    const depositIdIndex = headers.indexOf('deposit_id');

    // Find the deposit
    for (let i = 1; i < data.length; i++) {
      if (data[i][depositIdIndex] === depositId) {
        const deposit = data[i];
        const now = new Date();

        // Map Deposits data to Deposit_History schema
        // Deposits: deposit_id[0], deposit_code[1], store_id[2], line_user_id[3], customer_name[4],
        //           customer_phone[5], product_name[6], category[7], quantity[8], remaining_percent[9],
        //           remaining_qty[10], table_number[11], deposit_date[12], expiry_date[13], is_vip[14],
        //           status[15], photo_url[16], received_by[17], confirmed_by[18], notes[19], created_at[20], updated_at[21]
        //
        // History:  history_id, deposit_id, deposit_code, customer_name, product_name, category,
        //           original_qty, final_status, status_date, transfer_id, notes, archived_at

        const historyRow = [
          Utilities.getUuid(),           // history_id (NEW)
          deposit[0],                    // deposit_id
          deposit[1],                    // deposit_code
          deposit[4],                    // customer_name
          deposit[6],                    // product_name
          deposit[7],                    // category
          deposit[8],                    // original_qty (quantity)
          finalStatus,                   // final_status
          now,                           // status_date
          transferId || '',              // transfer_id
          deposit[19] || '',             // notes
          now                            // archived_at
        ];

        // Append to history
        historySheet.appendRow(historyRow);

        // Delete from Deposits
        depositsSheet.deleteRow(i + 1);

        return { success: true, message: 'Deposit archived successfully' };
      }
    }

    return { success: false, message: 'Deposit not found' };

  } catch (error) {
    console.error('Error in archiveDeposit:', error);
    return { success: false, message: error.toString() };
  }
}


// ========================================
// 17. linkLineUserToDeposit - Link LINE User ID to deposit record
// ========================================
function linkLineUserToDeposit(depositId, lineUserId) {
  try {
    const allStores = getActiveStores();

    // Search across all stores
    for (let store of allStores) {
      try {
        const storeSS = SpreadsheetApp.openById(store.sheet_id);
        const depositsSheet = storeSS.getSheetByName('Deposits');

        if (!depositsSheet) continue;

        const data = depositsSheet.getDataRange().getValues();
        const headers = data[0];

        const depositIdIndex = headers.indexOf('deposit_id');
        const lineUserIdIndex = headers.indexOf('line_user_id');
        const updatedAtIndex = headers.indexOf('updated_at');

        // Find and update the deposit
        for (let i = 1; i < data.length; i++) {
          if (data[i][depositIdIndex] === depositId) {
            depositsSheet.getRange(i + 1, lineUserIdIndex + 1).setValue(lineUserId);
            depositsSheet.getRange(i + 1, updatedAtIndex + 1).setValue(new Date());

            return { success: true, message: 'LINE User linked successfully' };
          }
        }
      } catch (storeError) {
        console.error('Error in store ' + store.store_id + ':', storeError);
      }
    }

    return { success: false, message: 'Deposit not found' };

  } catch (error) {
    console.error('Error in linkLineUserToDeposit:', error);
    return { success: false, message: error.toString() };
  }
}


// ========================================
// 18. sendExpiryNotification - Helper to send expiry warning
// ========================================
function sendExpiryNotification(depositData, storeId) {
  try {
    const { line_user_id, deposit_code, alcohol_type, remaining_qty, expiry_date } = depositData;

    if (!line_user_id) {
      return { success: false, message: 'No LINE User ID linked to deposit' };
    }

    const expiryDateFormatted = new Date(expiry_date).toLocaleDateString('th-TH');

    const message = `⚠️ แจ้งเตือนเหล้าใกล้หมดอายุ\n\n` +
      `รหัสฝาก: ${deposit_code}\n` +
      `ประเภท: ${alcohol_type}\n` +
      `จำนวนคงเหลือ: ${remaining_qty} ขวด\n` +
      `วันหมดอายุ: ${expiryDateFormatted}\n\n` +
      `กรุณามาเบิกภายใน 3 วัน มิฉะนั้นจะถูกโอนไปสาขากลาง`;

    const result = sendLineMessage(line_user_id, message, storeId);

    return result;

  } catch (error) {
    console.error('Error in sendExpiryNotification:', error);
    return { success: false, message: error.toString() };
  }
}


// ========================================
// 19. generateDepositReceipt - Generate receipt/confirmation message
// ========================================
function generateDepositReceipt(depositId) {
  try {
    const allStores = getActiveStores();

    // Search across all stores
    for (let store of allStores) {
      try {
        const storeSS = SpreadsheetApp.openById(store.sheet_id);
        const depositsSheet = storeSS.getSheetByName('Deposits');

        if (!depositsSheet) continue;

        const data = depositsSheet.getDataRange().getValues();
        const headers = data[0];

        const colIndices = {
          deposit_id: headers.indexOf('deposit_id'),
          deposit_code: headers.indexOf('deposit_code'),
          customer_name: headers.indexOf('customer_name'),
          customer_phone: headers.indexOf('customer_phone'),
          alcohol_type: headers.indexOf('alcohol_type'),
          quantity: headers.indexOf('quantity'),
          remaining_qty: headers.indexOf('remaining_qty'),
          deposit_date: headers.indexOf('deposit_date'),
          expiry_date: headers.indexOf('expiry_date'),
          status: headers.indexOf('status'),
          received_by: headers.indexOf('received_by'),
          confirmed_by: headers.indexOf('confirmed_by')
        };

        // Find the deposit
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (row[colIndices.deposit_id] === depositId) {
            const depositDate = new Date(row[colIndices.deposit_date]).toLocaleDateString('th-TH');
            const expiryDate = new Date(row[colIndices.expiry_date]).toLocaleDateString('th-TH');

            const receipt = {
              depositCode: row[colIndices.deposit_code],
              storeName: store.store_name,
              customerName: row[colIndices.customer_name],
              customerPhone: row[colIndices.customer_phone],
              alcoholType: row[colIndices.alcohol_type],
              quantity: row[colIndices.quantity],
              remainingQty: row[colIndices.remaining_qty],
              depositDate: depositDate,
              expiryDate: expiryDate,
              status: row[colIndices.status],
              receivedBy: row[colIndices.received_by] || '-',
              confirmedBy: row[colIndices.confirmed_by] || '-'
            };

            // Generate formatted message
            const receiptMessage = `🧾 ใบเสร็จการฝากเหล้า\n\n` +
              `รหัสฝาก: ${receipt.depositCode}\n` +
              `สาขา: ${receipt.storeName}\n` +
              `────────────────────\n` +
              `ลูกค้า: ${receipt.customerName}\n` +
              `เบอร์โทร: ${receipt.customerPhone}\n` +
              `ประเภทเหล้า: ${receipt.alcoholType}\n` +
              `จำนวน: ${receipt.quantity} ขวด\n` +
              `คงเหลือ: ${receipt.remainingQty} ขวด\n` +
              `────────────────────\n` +
              `วันที่ฝาก: ${receipt.depositDate}\n` +
              `วันหมดอายุ: ${receipt.expiryDate}\n` +
              `สถานะ: ${receipt.status}\n` +
              `────────────────────\n` +
              `ผู้รับฝาก: ${receipt.receivedBy}\n` +
              `ผู้ยืนยัน: ${receipt.confirmedBy}`;

            return { success: true, receipt: receipt, message: receiptMessage };
          }
        }
      } catch (storeError) {
        console.error('Error in store ' + store.store_id + ':', storeError);
      }
    }

    return { success: false, message: 'Deposit not found' };

  } catch (error) {
    console.error('Error in generateDepositReceipt:', error);
    return { success: false, message: error.toString() };
  }
}


// ========================================
// 19. Store Settings Management - Receipt Printing Config
// ========================================

/**
 * Get store receipt configuration
 * @param {string} storeId - Store ID
 * @returns {Object} Receipt configuration object
 */
function getStoreReceiptConfig(storeId) {
  try {
    const storeInfo = getStoreInfoById(storeId);

    if (!storeInfo) {
      return { success: false, message: 'Store not found' };
    }

    const config = {
      line_id: storeInfo.line_id || '',
      line_add_friend_url: storeInfo.line_add_friend_url || '',
      qr_code_image_url: storeInfo.qr_code_image_url || '',
      store_address: storeInfo.store_address || '',
      store_phone: storeInfo.store_phone || '',
      receipt_logo_url: storeInfo.receipt_logo_url || '',
      receipt_header_text: storeInfo.receipt_header_text || 'ใบรับฝากเหล้า',
      receipt_footer_line1: storeInfo.receipt_footer_line1 || 'กรุณาเก็บใบรับนี้ไว้เป็นหลักฐาน',
      receipt_footer_line2: storeInfo.receipt_footer_line2 || 'แสดงใบรับหรือรหัสเมื่อต้องการเบิก'
    };

    return { success: true, config: config };

  } catch (error) {
    console.error('Error in getStoreReceiptConfig:', error);
    return { success: false, message: error.toString() };
  }
}


/**
 * Update store receipt configuration
 * @param {Object} data - Configuration data with storeId and config fields
 * @returns {Object} Success/failure result
 */
function updateStoreReceiptConfig(data) {
  try {
    console.log('=== updateStoreReceiptConfig START ===');
    console.log('Received data:', JSON.stringify(data));

    const { storeId, config } = data;
    console.log('Store ID:', storeId);
    console.log('Config:', JSON.stringify(config));

    if (!storeId) {
      console.log('❌ Store ID is missing');
      return { success: false, message: 'Store ID is required' };
    }

    // Get master spreadsheet
    console.log('Getting Master Spreadsheet:', CONFIG.MASTER_SHEET_ID);
    const masterSS = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const storesSheet = masterSS.getSheetByName('Stores');

    if (!storesSheet) {
      console.log('❌ Stores sheet not found');
      return { success: false, message: 'Stores sheet not found' };
    }

    const storesData = storesSheet.getDataRange().getValues();
    const headers = storesData[0];
    console.log('Headers found:', headers.join(', '));

    // Find column indices
    const colIndices = {
      store_id: headers.indexOf('store_id'),
      line_id: headers.indexOf('line_id'),
      line_add_friend_url: headers.indexOf('line_add_friend_url'),
      qr_code_image_url: headers.indexOf('qr_code_image_url'),
      store_address: headers.indexOf('store_address'),
      store_phone: headers.indexOf('store_phone'),
      receipt_logo_url: headers.indexOf('receipt_logo_url'),
      receipt_header_text: headers.indexOf('receipt_header_text'),
      receipt_footer_line1: headers.indexOf('receipt_footer_line1'),
      receipt_footer_line2: headers.indexOf('receipt_footer_line2')
    };
    console.log('Column indices:', JSON.stringify(colIndices));

    // Find the store row
    console.log(`Searching for store: ${storeId} in ${storesData.length - 1} rows`);

    // Debug: Print all store IDs found
    if (storesData.length > 1) {
      console.log('Store IDs in sheet:');
      for (let i = 1; i < storesData.length; i++) {
        console.log(`  Row ${i}: "${storesData[i][colIndices.store_id]}"`);
      }
    } else {
      console.log('⚠️  No stores found in Stores sheet (only header row exists)');
    }

    for (let i = 1; i < storesData.length; i++) {
      if (storesData[i][colIndices.store_id] === storeId) {
        console.log(`✓ Found store at row ${i + 1}`);
        const rowNum = i + 1; // +1 for 1-based indexing

        // Update each field if provided
        let updatedFields = [];

        if (config.line_id !== undefined && colIndices.line_id >= 0) {
          storesSheet.getRange(rowNum, colIndices.line_id + 1).setValue(config.line_id);
          updatedFields.push('line_id');
        }
        if (config.line_add_friend_url !== undefined && colIndices.line_add_friend_url >= 0) {
          storesSheet.getRange(rowNum, colIndices.line_add_friend_url + 1).setValue(config.line_add_friend_url);
          updatedFields.push('line_add_friend_url');
        }
        if (config.qr_code_image_url !== undefined && colIndices.qr_code_image_url >= 0) {
          storesSheet.getRange(rowNum, colIndices.qr_code_image_url + 1).setValue(config.qr_code_image_url);
          updatedFields.push('qr_code_image_url');
        }
        if (config.store_address !== undefined && colIndices.store_address >= 0) {
          storesSheet.getRange(rowNum, colIndices.store_address + 1).setValue(config.store_address);
          updatedFields.push('store_address');
        }
        if (config.store_phone !== undefined && colIndices.store_phone >= 0) {
          storesSheet.getRange(rowNum, colIndices.store_phone + 1).setValue(config.store_phone);
          updatedFields.push('store_phone');
        }
        if (config.receipt_logo_url !== undefined && colIndices.receipt_logo_url >= 0) {
          storesSheet.getRange(rowNum, colIndices.receipt_logo_url + 1).setValue(config.receipt_logo_url);
          updatedFields.push('receipt_logo_url');
        }
        if (config.receipt_header_text !== undefined && colIndices.receipt_header_text >= 0) {
          storesSheet.getRange(rowNum, colIndices.receipt_header_text + 1).setValue(config.receipt_header_text);
          updatedFields.push('receipt_header_text');
        }
        if (config.receipt_footer_line1 !== undefined && colIndices.receipt_footer_line1 >= 0) {
          storesSheet.getRange(rowNum, colIndices.receipt_footer_line1 + 1).setValue(config.receipt_footer_line1);
          updatedFields.push('receipt_footer_line1');
        }
        if (config.receipt_footer_line2 !== undefined && colIndices.receipt_footer_line2 >= 0) {
          storesSheet.getRange(rowNum, colIndices.receipt_footer_line2 + 1).setValue(config.receipt_footer_line2);
          updatedFields.push('receipt_footer_line2');
        }

        console.log('Updated fields:', updatedFields.join(', '));
        SpreadsheetApp.flush();
        console.log('✅ Update completed successfully');

        return {
          success: true,
          message: 'Store receipt configuration updated successfully',
          updatedConfig: config
        };
      }
    }

    console.log('❌ Store not found in Stores sheet');
    return { success: false, message: 'Store not found in Stores sheet' };

  } catch (error) {
    console.error('❌ Error in updateStoreReceiptConfig:', error);
    console.error('Error stack:', error.stack);
    return { success: false, message: error.toString() };
  }
}


/**
 * Get deposit receipt data for printing
 * @param {string} depositId - Deposit ID
 * @param {string} receiptType - 'customer' or 'bottle'
 * @returns {Object} Receipt data ready for printing
 */
function getDepositReceiptData(depositId, receiptType = 'customer') {
  try {
    if (!depositId) {
      return { success: false, message: 'Deposit ID is required' };
    }

    // Find the deposit across all store sheets
    const stores = getAllStores();
    let depositData = null;
    let storeId = null;

    for (const store of stores) {
      const storeSheet = SpreadsheetApp.openById(store.sheet_id).getSheetByName('Deposits');
      if (!storeSheet) continue;

      const data = storeSheet.getDataRange().getValues();
      const headers = data[0];
      const depositIdCol = headers.indexOf('deposit_id');

      for (let i = 1; i < data.length; i++) {
        if (data[i][depositIdCol] === depositId) {
          // Found the deposit
          depositData = {};
          headers.forEach((header, index) => {
            depositData[header] = data[i][index];
          });
          storeId = store.id;
          break;
        }
      }
      if (depositData) break;
    }

    if (!depositData) {
      return { success: false, message: 'Deposit not found' };
    }

    // Get store info including receipt config
    const storeInfo = getStoreInfoById(storeId);
    const receiptConfig = getStoreReceiptConfig(storeId);

    if (!receiptConfig.success) {
      return { success: false, message: 'Failed to load receipt configuration' };
    }

    // Format dates
    const depositDate = depositData.deposit_date ?
      new Date(depositData.deposit_date).toLocaleDateString('th-TH') : '';
    const expiryDate = depositData.expiry_date ?
      new Date(depositData.expiry_date).toLocaleDateString('th-TH') : '';

    // Prepare receipt data
    const receiptData = {
      // Store info
      storeName: storeInfo.name || '',
      storeAddress: receiptConfig.config.store_address || '',
      storePhone: receiptConfig.config.store_phone || '',
      storeLogo: receiptConfig.config.receipt_logo_url || '',

      // LINE OA info (for QR Code)
      lineId: receiptConfig.config.line_id || '',
      lineAddFriendUrl: receiptConfig.config.line_add_friend_url || '',
      qrCodeUrl: receiptConfig.config.qr_code_image_url || '',

      // Deposit info
      depositId: depositData.deposit_id || '',
      customerName: depositData.customer_name || '',
      customerPhone: depositData.customer_phone || '',
      alcoholType: depositData.alcohol_type || '',
      quantity: depositData.quantity || 1,
      notes: depositData.notes || '',
      depositDate: depositDate,
      expiryDate: expiryDate,

      // Staff info
      receivedBy: depositData.received_by_name || '',
      confirmedBy: depositData.confirmed_by_name || '',

      // Print settings
      paperSize: receiptConfig.config.default_paper_size || '80mm',
      receiptType: receiptType
    };

    return {
      success: true,
      data: receiptData,
      htmlTemplate: receiptType === 'customer' ? 'receipt-customer.html' : 'receipt-bottle-label.html'
    };

  } catch (error) {
    console.error('Error in getDepositReceiptData:', error);
    return { success: false, message: error.toString() };
  }
}


/**
 * Get LINE OA configuration for a store
 * @param {string} storeId - Store ID
 * @returns {Object} Configuration object with LINE OA settings
 */
function getStoreLineOAConfig(storeId) {
  try {
    const storeInfo = getStoreInfoById(storeId);

    if (!storeInfo) {
      return { success: false, message: 'Store not found' };
    }

    const config = {
      line_token: storeInfo.line_token || '',
      line_channel_secret: storeInfo.line_channel_secret || '',
      staff_group_id: storeInfo.staff_group_id || '',
      bar_group_id: storeInfo.bar_group_id || '',
      central_group_id: storeInfo.central_group_id || ''
    };

    return { success: true, config: config };

  } catch (error) {
    console.error('Error in getStoreLineOAConfig:', error);
    return { success: false, message: error.toString() };
  }
}


/**
 * Update LINE OA configuration for a store
 * @param {Object} data - Configuration data with storeId and config fields
 * @returns {Object} Success/failure result
 */
function updateStoreLineOAConfig(data) {
  try {
    const { storeId, config } = data;

    if (!storeId) {
      return { success: false, message: 'Store ID is required' };
    }

    // Get master spreadsheet
    const masterSS = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const storesSheet = masterSS.getSheetByName('Stores');

    if (!storesSheet) {
      return { success: false, message: 'Stores sheet not found' };
    }

    const storesData = storesSheet.getDataRange().getValues();
    const headers = storesData[0];

    // Find column indices
    const colIndices = {
      store_id: headers.indexOf('store_id'),
      line_token: headers.indexOf('line_token'),
      line_channel_secret: headers.indexOf('line_channel_secret'),
      staff_group_id: headers.indexOf('staff_group_id'),
      bar_group_id: headers.indexOf('bar_group_id'),
      central_group_id: headers.indexOf('central_group_id')
    };

    // Find the store row
    for (let i = 1; i < storesData.length; i++) {
      if (storesData[i][colIndices.store_id] === storeId) {
        const rowNum = i + 1; // +1 for 1-based indexing

        // Update each field if provided
        if (config.line_token !== undefined && colIndices.line_token >= 0) {
          storesSheet.getRange(rowNum, colIndices.line_token + 1).setValue(config.line_token);
        }
        if (config.line_channel_secret !== undefined && colIndices.line_channel_secret >= 0) {
          storesSheet.getRange(rowNum, colIndices.line_channel_secret + 1).setValue(config.line_channel_secret);
        }
        if (config.staff_group_id !== undefined && colIndices.staff_group_id >= 0) {
          storesSheet.getRange(rowNum, colIndices.staff_group_id + 1).setValue(config.staff_group_id);
        }
        if (config.bar_group_id !== undefined && colIndices.bar_group_id >= 0) {
          storesSheet.getRange(rowNum, colIndices.bar_group_id + 1).setValue(config.bar_group_id);
        }
        if (config.central_group_id !== undefined && colIndices.central_group_id >= 0) {
          storesSheet.getRange(rowNum, colIndices.central_group_id + 1).setValue(config.central_group_id);
        }

        SpreadsheetApp.flush();

        return {
          success: true,
          message: 'LINE OA configuration updated successfully',
          updatedConfig: config
        };
      }
    }

    return { success: false, message: 'Store not found in Stores sheet' };

  } catch (error) {
    console.error('Error in updateStoreLineOAConfig:', error);
    return { success: false, message: error.toString() };
  }
}


// ========================================
// 20. getCentralTransferRequests - Get pending transfer requests for Central LIFF
// ========================================
function getCentralTransferRequests() {
  try {
    const allStores = getActiveStores();
    let allTransferRequests = [];

    // Search across all stores
    allStores.forEach(store => {
      try {
        const storeSS = SpreadsheetApp.openById(store.sheet_id);
        const transferSheet = storeSS.getSheetByName('Transfer_Requests');

        if (!transferSheet) return;

        const data = transferSheet.getDataRange().getValues();
        const headers = data[0];

        const colIndices = {
          transfer_id: headers.indexOf('transfer_id'),
          transfer_code: headers.indexOf('transfer_code'),
          store_id: headers.indexOf('store_id'),
          deposit_ids: headers.indexOf('deposit_ids'),
          total_quantity: headers.indexOf('total_quantity'),
          request_date: headers.indexOf('request_date'),
          photo_url: headers.indexOf('photo_url'),
          status: headers.indexOf('status'),
          notes: headers.indexOf('notes')
        };

        // Get pending transfers
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (row[colIndices.status] === 'pending') {
            allTransferRequests.push({
              transferId: row[colIndices.transfer_id],
              transferCode: row[colIndices.transfer_code],
              storeId: row[colIndices.store_id],
              storeName: store.store_name,
              depositIds: JSON.parse(row[colIndices.deposit_ids] || '[]'),
              totalQuantity: row[colIndices.total_quantity],
              requestDate: row[colIndices.request_date],
              photoUrl: row[colIndices.photo_url] || '',
              notes: row[colIndices.notes] || '-'
            });
          }
        }
      } catch (storeError) {
        console.error('Error reading store ' + store.store_id + ':', storeError);
      }
    });

    // Sort by request date (newest first)
    allTransferRequests.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));

    return { success: true, transfers: allTransferRequests };

  } catch (error) {
    console.error('Error in getCentralTransferRequests:', error);
    return { success: false, message: error.toString() };
  }
}


/**
 * เช็คว่าสาขานี้เป็น HQ (คลังกลาง) หรือไม่
 */
function isCentralStore(storeId) {
  try {
    console.log('isCentralStore called with storeId:', storeId, 'type:', typeof storeId);
    const storeInfo = getStoreInfoById(storeId);
    console.log('storeInfo result:', storeInfo);
    if (!storeInfo) {
      return { success: false, message: 'Store not found', isCentral: false };
    }
    return { success: true, isCentral: storeInfo.is_central || false };
  } catch (error) {
    console.error('Error in isCentralStore:', error);
    return { success: false, message: error.toString(), isCentral: false };
  }
}


/**
 * ดึงรายการฝากที่หมดอายุ (status = 'expired') ของสาขา
 */
function getExpiredDeposits(storeId) {
  try {
    const storeInfo = getStoreInfoById(storeId);
    if (!storeInfo) {
      return { success: false, message: 'Store not found' };
    }

    const storeSS = SpreadsheetApp.openById(storeInfo.sheet_id);
    const depositsSheet = storeSS.getSheetByName('Deposits');
    if (!depositsSheet) {
      return { success: true, deposits: [] };
    }

    const data = depositsSheet.getDataRange().getValues();
    const headers = data[0];

    const colIndices = {
      deposit_id: headers.indexOf('deposit_id'),
      deposit_code: headers.indexOf('deposit_code'),
      customer_name: headers.indexOf('customer_name'),
      customer_phone: headers.indexOf('customer_phone'),
      product_name: headers.indexOf('product_name'),
      category: headers.indexOf('category'),
      quantity: headers.indexOf('quantity'),
      remaining_qty: headers.indexOf('remaining_qty'),
      remaining_percent: headers.indexOf('remaining_percent'),
      deposit_date: headers.indexOf('deposit_date'),
      expiry_date: headers.indexOf('expiry_date'),
      status: headers.indexOf('status'),
      photo_url: headers.indexOf('photo_url')
    };

    const expiredDeposits = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log('getExpiredDeposits - today:', today);
    console.log('getExpiredDeposits - colIndices:', JSON.stringify(colIndices));
    console.log('getExpiredDeposits - total rows:', data.length);

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const status = row[colIndices.status];
      const expiryDate = row[colIndices.expiry_date];

      console.log(`Row ${i}: status=${status}, expiryDate=${expiryDate}`);

      // ดึงเฉพาะที่ status = 'in_store' หรือ 'expired' และวันหมดอายุผ่านไปแล้ว
      if ((status === 'in_store' || status === 'expired') && expiryDate) {
        const expDate = new Date(expiryDate);
        expDate.setHours(0, 0, 0, 0);

        if (expDate <= today) {
          // แปลง Date เป็น string เพื่อป้องกันปัญหา serialization
          const depositDateRaw = row[colIndices.deposit_date];
          const expiryDateRaw = row[colIndices.expiry_date];

          expiredDeposits.push({
            depositId: row[colIndices.deposit_id],
            depositCode: row[colIndices.deposit_code],
            customerName: row[colIndices.customer_name],
            customerPhone: row[colIndices.customer_phone],
            productName: row[colIndices.product_name],
            category: row[colIndices.category],
            quantity: row[colIndices.quantity],
            remainingQty: row[colIndices.remaining_qty] || row[colIndices.quantity],
            remainingPercent: row[colIndices.remaining_percent] || 100,
            depositDate: depositDateRaw instanceof Date ? depositDateRaw.toISOString() : String(depositDateRaw || ''),
            expiryDate: expiryDateRaw instanceof Date ? expiryDateRaw.toISOString() : String(expiryDateRaw || ''),
            photoUrl: row[colIndices.photo_url] || ''
          });
        }
      }
    }

    // Sort by expiry date (oldest first)
    expiredDeposits.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

    // แปลง field names ให้ตรงกับ Frontend (ค่าเป็น string อยู่แล้ว)
    const formattedData = expiredDeposits.map(d => ({
      deposit_id: String(d.depositId || ''),
      deposit_code: String(d.depositCode || ''),
      customer_name: String(d.customerName || ''),
      customer_phone: String(d.customerPhone || ''),
      item_name: String(d.productName || ''),
      category: String(d.category || ''),
      quantity: Number(d.remainingQty || d.quantity || 0),
      deposit_date: String(d.depositDate || ''),
      expiry_date: String(d.expiryDate || ''),
      photo_url: String(d.photoUrl || '')
    }));

    return { success: true, data: formattedData };

  } catch (error) {
    console.error('Error in getExpiredDeposits:', error);
    return { success: false, message: error.toString() };
  }
}


/**
 * ดึงรายการที่กำลังนำส่ง HQ (status = transfer_pending)
 */
function getTransferPendingDeposits(storeId) {
  try {
    const storeInfo = getStoreInfoById(storeId);
    if (!storeInfo) {
      return { success: false, message: 'Store not found' };
    }

    const storeSS = SpreadsheetApp.openById(storeInfo.sheet_id);
    const depositsSheet = storeSS.getSheetByName('Deposits');
    if (!depositsSheet) {
      return { success: true, data: [] };
    }

    const data = depositsSheet.getDataRange().getValues();
    const headers = data[0];

    const colIndices = {
      deposit_id: headers.indexOf('deposit_id'),
      deposit_code: headers.indexOf('deposit_code'),
      customer_name: headers.indexOf('customer_name'),
      product_name: headers.indexOf('product_name'),
      category: headers.indexOf('category'),
      remaining_qty: headers.indexOf('remaining_qty'),
      remaining_percent: headers.indexOf('remaining_percent'),
      expiry_date: headers.indexOf('expiry_date'),
      status: headers.indexOf('status')
    };

    const pendingDeposits = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[colIndices.status] === 'transfer_pending') {
        const expiryDateRaw = row[colIndices.expiry_date];
        pendingDeposits.push({
          deposit_id: String(row[colIndices.deposit_id] || ''),
          deposit_code: String(row[colIndices.deposit_code] || ''),
          customer_name: String(row[colIndices.customer_name] || ''),
          item_name: String(row[colIndices.product_name] || ''),
          category: String(row[colIndices.category] || ''),
          quantity: Number(row[colIndices.remaining_qty] || 0),
          remaining_percent: Number(row[colIndices.remaining_percent] || 100),
          expiry_date: expiryDateRaw instanceof Date ? expiryDateRaw.toISOString() : String(expiryDateRaw || '')
        });
      }
    }

    return { success: true, data: pendingDeposits };

  } catch (error) {
    console.error('Error in getTransferPendingDeposits:', error);
    return { success: false, message: error.toString() };
  }
}


/**
 * ดึงรายการที่โอนสำเร็จแล้ว (status = transfer_confirmed)
 */
function getTransferConfirmedDeposits(storeId) {
  try {
    const storeInfo = getStoreInfoById(storeId);
    if (!storeInfo) {
      return { success: false, message: 'Store not found' };
    }

    const storeSS = SpreadsheetApp.openById(storeInfo.sheet_id);
    const depositsSheet = storeSS.getSheetByName('Deposits');
    if (!depositsSheet) {
      return { success: true, data: [] };
    }

    const data = depositsSheet.getDataRange().getValues();
    const headers = data[0];

    const colIndices = {
      deposit_id: headers.indexOf('deposit_id'),
      deposit_code: headers.indexOf('deposit_code'),
      customer_name: headers.indexOf('customer_name'),
      product_name: headers.indexOf('product_name'),
      category: headers.indexOf('category'),
      remaining_qty: headers.indexOf('remaining_qty'),
      remaining_percent: headers.indexOf('remaining_percent'),
      expiry_date: headers.indexOf('expiry_date'),
      status: headers.indexOf('status')
    };

    const confirmedDeposits = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[colIndices.status] === 'transfer_confirmed') {
        const expiryDateRaw = row[colIndices.expiry_date];
        confirmedDeposits.push({
          deposit_id: String(row[colIndices.deposit_id] || ''),
          deposit_code: String(row[colIndices.deposit_code] || ''),
          customer_name: String(row[colIndices.customer_name] || ''),
          item_name: String(row[colIndices.product_name] || ''),
          category: String(row[colIndices.category] || ''),
          quantity: Number(row[colIndices.remaining_qty] || 0),
          remaining_percent: Number(row[colIndices.remaining_percent] || 100),
          expiry_date: expiryDateRaw instanceof Date ? expiryDateRaw.toISOString() : String(expiryDateRaw || '')
        });
      }
    }

    return { success: true, data: confirmedDeposits };

  } catch (error) {
    console.error('Error in getTransferConfirmedDeposits:', error);
    return { success: false, message: error.toString() };
  }
}


/**
 * ดึงรายการโอนที่ HQ รับแล้ว รอถอนออกจากระบบ
 */
function getConfirmedTransfersForHQ(hqStoreId) {
  try {
    const mainSS = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const storesSheet = mainSS.getSheetByName('Stores');
    const storesData = storesSheet.getDataRange().getValues();
    const storeHeaders = storesData[0];

    const storeIdCol = storeHeaders.indexOf('store_id');
    const storeNameCol = storeHeaders.indexOf('name');
    const sheetIdCol = storeHeaders.indexOf('sheet_id');
    const isCentralCol = storeHeaders.indexOf('is_central');

    // หา HQ store
    let hqSheetId = null;
    for (let i = 1; i < storesData.length; i++) {
      if (storesData[i][storeIdCol] === hqStoreId && storesData[i][isCentralCol] === true) {
        hqSheetId = storesData[i][sheetIdCol];
        break;
      }
    }

    if (!hqSheetId) {
      return { success: false, message: 'HQ store not found' };
    }

    const confirmedTransfers = [];

    // วนทุกสาขา (ไม่รวม HQ)
    for (let i = 1; i < storesData.length; i++) {
      const branchStoreId = storesData[i][storeIdCol];
      const branchName = storesData[i][storeNameCol];
      const branchSheetId = storesData[i][sheetIdCol];
      const isCentral = storesData[i][isCentralCol];

      if (!branchSheetId || isCentral === true) continue;

      try {
        const branchSS = SpreadsheetApp.openById(branchSheetId);
        const transferSheet = branchSS.getSheetByName('Transfer_Requests');

        if (!transferSheet) continue;

        const transferData = transferSheet.getDataRange().getValues();
        const headers = transferData[0];

        const colMap = {};
        headers.forEach((h, idx) => colMap[h] = idx);

        for (let j = 1; j < transferData.length; j++) {
          const row = transferData[j];
          // ดึงเฉพาะที่ status = 'confirmed'
          if (row[colMap['status']] === 'confirmed') {
            const depositIds = JSON.parse(row[colMap['deposit_ids']] || '[]');
            const depositDetails = getDepositDetailsForTransfer(branchSheetId, depositIds);

            confirmedTransfers.push({
              transfer_id: row[colMap['transfer_id']],
              transfer_code: row[colMap['transfer_code']],
              from_store_id: branchStoreId,
              from_store_name: branchName,
              from_sheet_id: branchSheetId,
              items_count: row[colMap['total_items']],
              total_quantity: row[colMap['total_quantity']],
              transfer_date: row[colMap['transfer_date']] instanceof Date
                ? row[colMap['transfer_date']].toLocaleDateString('th-TH')
                : String(row[colMap['transfer_date']] || ''),
              confirm_date: row[colMap['confirm_date']] instanceof Date
                ? row[colMap['confirm_date']].toLocaleDateString('th-TH')
                : String(row[colMap['confirm_date']] || ''),
              confirmed_by: row[colMap['confirmed_by']] || '',
              deposit_ids: depositIds,
              deposits: depositDetails
            });
          }
        }

      } catch (e) {
        console.error(`Error reading transfers from ${branchName}:`, e);
      }
    }

    return { success: true, data: confirmedTransfers };

  } catch (error) {
    console.error('Error in getConfirmedTransfersForHQ:', error);
    return { success: false, message: error.toString() };
  }
}


/**
 * นับจำนวน deposits ตาม status สำหรับ Summary Cards
 */
function getTransferSummary(storeId) {
  try {
    const storeInfo = getStoreInfoById(storeId);
    if (!storeInfo) {
      return { success: false, message: 'Store not found' };
    }

    const storeSS = SpreadsheetApp.openById(storeInfo.sheet_id);
    const depositsSheet = storeSS.getSheetByName('Deposits');

    let expiredCount = 0;
    let pendingCount = 0;
    let confirmedCount = 0;

    if (depositsSheet) {
      const data = depositsSheet.getDataRange().getValues();
      const headers = data[0];
      const statusCol = headers.indexOf('status');
      const qtyCol = headers.indexOf('remaining_qty');

      for (let i = 1; i < data.length; i++) {
        const status = data[i][statusCol];
        const qty = Number(data[i][qtyCol] || 0);

        if (status === 'expired') {
          expiredCount += qty;
        } else if (status === 'transfer_pending') {
          pendingCount += qty;
        } else if (status === 'transfer_confirmed') {
          confirmedCount += qty;
        }
      }
    }

    return {
      success: true,
      data: {
        expired: expiredCount,
        pending: pendingCount,
        confirmed: confirmedCount
      }
    };

  } catch (error) {
    console.error('Error in getTransferSummary:', error);
    return { success: false, message: error.toString() };
  }
}


/**
 * นับจำนวน transfers สำหรับ HQ Summary Cards
 */
function getHQTransferSummary(hqStoreId) {
  try {
    const mainSS = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const storesSheet = mainSS.getSheetByName('Stores');
    const storesData = storesSheet.getDataRange().getValues();
    const storeHeaders = storesData[0];

    const storeIdCol = storeHeaders.indexOf('store_id');
    const sheetIdCol = storeHeaders.indexOf('sheet_id');
    const isCentralCol = storeHeaders.indexOf('is_central');

    let pendingCount = 0;
    let confirmedCount = 0;

    // วนทุกสาขา (ไม่รวม HQ)
    for (let i = 1; i < storesData.length; i++) {
      const branchSheetId = storesData[i][sheetIdCol];
      const isCentral = storesData[i][isCentralCol];

      if (!branchSheetId || isCentral === true) continue;

      try {
        const branchSS = SpreadsheetApp.openById(branchSheetId);
        const transferSheet = branchSS.getSheetByName('Transfer_Requests');

        if (!transferSheet) continue;

        const transferData = transferSheet.getDataRange().getValues();
        const headers = transferData[0];
        const statusCol = headers.indexOf('status');
        const itemsCol = headers.indexOf('total_items');

        for (let j = 1; j < transferData.length; j++) {
          const status = transferData[j][statusCol];
          const items = Number(transferData[j][itemsCol] || 0);

          if (status === 'pending') {
            pendingCount += items;
          } else if (status === 'confirmed') {
            confirmedCount += items;
          }
        }

      } catch (e) {
        console.error(`Error counting transfers:`, e);
      }
    }

    return {
      success: true,
      data: {
        pending: pendingCount,
        confirmed: confirmedCount
      }
    };

  } catch (error) {
    console.error('Error in getHQTransferSummary:', error);
    return { success: false, message: error.toString() };
  }
}


/**
 * สร้างคำขอโอนจากสาขาไป HQ
 */
function createTransferRequest(storeId, depositIds, note, createdBy, photoUrl) {
  try {
    if (!depositIds || depositIds.length === 0) {
      return { success: false, message: 'กรุณาเลือกรายการที่ต้องการโอน' };
    }

    const storeInfo = getStoreInfoById(storeId);
    if (!storeInfo) {
      return { success: false, message: 'Store not found' };
    }

    const storeSS = SpreadsheetApp.openById(storeInfo.sheet_id);

    // สร้างหรือหา Transfer_Requests sheet ตาม design
    let transferSheet = storeSS.getSheetByName('Transfer_Requests');
    if (!transferSheet) {
      transferSheet = storeSS.insertSheet('Transfer_Requests');
      // Headers ตาม design doc
      transferSheet.appendRow([
        'transfer_id', 'transfer_code', 'from_store_id', 'deposit_ids',
        'total_items', 'total_quantity', 'transfer_date', 'photo_url',
        'created_by', 'status', 'notes', 'confirm_date', 'confirm_photo_url',
        'confirmed_by', 'received_from', 'received_qty', 'received_percent',
        'cancel_reason', 'cancelled_by', 'cancelled_at'
      ]);
    }

    // สร้าง transfer code (TRF-YYYY-XXXX)
    const year = new Date().getFullYear();
    const transferData = transferSheet.getDataRange().getValues();
    const transferCount = transferData.length; // รวม header
    const transferCode = `TRF-${year}-${String(transferCount).padStart(4, '0')}`;
    const transferId = Utilities.getUuid();

    // คำนวณ total quantity จาก deposits
    const depositsSheet = storeSS.getSheetByName('Deposits');
    let totalQuantity = 0;
    if (depositsSheet) {
      const depositsData = depositsSheet.getDataRange().getValues();
      const depHeaders = depositsData[0];
      const idCol = depHeaders.indexOf('deposit_id');
      const qtyCol = depHeaders.indexOf('remaining_qty');
      const origQtyCol = depHeaders.indexOf('quantity');

      for (let i = 1; i < depositsData.length; i++) {
        if (depositIds.includes(depositsData[i][idCol])) {
          totalQuantity += Number(depositsData[i][qtyCol] || depositsData[i][origQtyCol] || 0);
        }
      }
    }

    // บันทึก transfer request
    transferSheet.appendRow([
      transferId,                    // transfer_id
      transferCode,                  // transfer_code
      storeId,                       // from_store_id
      JSON.stringify(depositIds),    // deposit_ids
      depositIds.length,             // total_items
      totalQuantity,                 // total_quantity
      new Date(),                    // transfer_date
      photoUrl || '',                // photo_url
      createdBy || '',               // created_by
      'pending',                     // status
      note || '',                    // notes
      '',                            // confirm_date
      '',                            // confirm_photo_url
      '',                            // confirmed_by
      '',                            // received_from
      '',                            // received_qty
      '',                            // received_percent
      '',                            // cancel_reason
      '',                            // cancelled_by
      ''                             // cancelled_at
    ]);

    // อัพเดทสถานะ deposits เป็น 'transfer_pending'
    if (depositsSheet) {
      const depositsData = depositsSheet.getDataRange().getValues();
      const depHeaders = depositsData[0];
      const idCol = depHeaders.indexOf('deposit_id');
      const statusCol = depHeaders.indexOf('status');

      for (let i = 1; i < depositsData.length; i++) {
        if (depositIds.includes(depositsData[i][idCol])) {
          depositsSheet.getRange(i + 1, statusCol + 1).setValue('transfer_pending');
        }
      }
    }

    return {
      success: true,
      message: 'สร้างคำขอโอนเรียบร้อย',
      transferId: transferId,
      transferCode: transferCode
    };

  } catch (error) {
    console.error('Error in createTransferRequest:', error);
    return { success: false, message: error.toString() };
  }
}


/**
 * ดึงรายการรอรับสำหรับ HQ
 */
function getPendingTransfersForHQ(hqStoreId) {
  try {
    const mainSS = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const storesSheet = mainSS.getSheetByName(CONFIG.MASTER_SHEETS.STORES);
    const storesData = storesSheet.getDataRange().getValues();
    const storeHeaders = storesData[0];

    // หา column indices จาก header
    const storeIdCol = storeHeaders.indexOf('store_id');
    const storeCodeCol = storeHeaders.indexOf('store_code');
    const storeNameCol = storeHeaders.indexOf('store_name');
    const sheetIdCol = storeHeaders.indexOf('sheet_id');
    const isCentralCol = storeHeaders.indexOf('is_central');

    const pendingTransfers = [];

    // วนหาทุกสาขา
    for (let i = 1; i < storesData.length; i++) {
      const row = storesData[i];
      const branchStoreId = row[storeIdCol];
      const branchSheetId = row[sheetIdCol];
      const branchName = row[storeNameCol];
      const isCentral = row[isCentralCol] === true || String(row[isCentralCol]).toLowerCase() === 'true';

      // ข้าม HQ (is_central = true)
      if (isCentral) {
        continue;
      }

      if (!branchSheetId) continue;

      try {
        const branchSS = SpreadsheetApp.openById(branchSheetId);
        const transferSheet = branchSS.getSheetByName('Transfer_Requests');
        if (!transferSheet) continue;

        const transferData = transferSheet.getDataRange().getValues();
        const headers = transferData[0];

        // หา column indices
        const transferIdCol = headers.indexOf('transfer_id');
        const transferCodeCol = headers.indexOf('transfer_code');
        const depositIdsCol = headers.indexOf('deposit_ids');
        const totalItemsCol = headers.indexOf('total_items');
        const totalQtyCol = headers.indexOf('total_quantity');
        const transferDateCol = headers.indexOf('transfer_date');
        const statusCol = headers.indexOf('status');
        const notesCol = headers.indexOf('notes');
        const photoUrlCol = headers.indexOf('photo_url');

        for (let j = 1; j < transferData.length; j++) {
          const tRow = transferData[j];
          if (tRow[statusCol] === 'pending') {
            const depositIds = JSON.parse(tRow[depositIdsCol] || '[]');
            const transferDate = tRow[transferDateCol];

            // ดึงรายละเอียด deposits
            const depositDetails = getDepositDetailsForTransfer(branchSheetId, depositIds);

            pendingTransfers.push({
              transfer_id: String(tRow[transferIdCol] || ''),
              transfer_code: String(tRow[transferCodeCol] || ''),
              from_store_id: String(branchStoreId || ''),
              from_store_name: String(branchName || ''),
              from_sheet_id: String(branchSheetId || ''),
              items_count: Number(tRow[totalItemsCol] || depositIds.length),
              total_quantity: Number(tRow[totalQtyCol] || 0),
              transfer_date: transferDate instanceof Date
                ? transferDate.toLocaleDateString('th-TH')
                : String(transferDate || ''),
              notes: String(tRow[notesCol] || ''),
              photo_url: String(tRow[photoUrlCol] || ''),
              deposit_ids: depositIds,
              deposits: depositDetails
            });
          }
        }
      } catch (e) {
        console.log('Error reading branch ' + branchName + ': ' + e);
      }
    }

    // Sort by transfer_date (newest first)
    pendingTransfers.sort((a, b) => {
      return new Date(b.transfer_date) - new Date(a.transfer_date);
    });

    return { success: true, data: pendingTransfers };

  } catch (error) {
    console.error('Error in getPendingTransfersForHQ:', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Helper: ดึงรายละเอียด deposits สำหรับ transfer
 */
function getDepositDetailsForTransfer(sheetId, depositIds) {
  try {
    if (!depositIds || depositIds.length === 0) return [];

    const storeSS = SpreadsheetApp.openById(sheetId);
    const depositsSheet = storeSS.getSheetByName('Deposits');
    if (!depositsSheet) return [];

    const data = depositsSheet.getDataRange().getValues();
    const headers = data[0];

    const idCol = headers.indexOf('deposit_id');
    const codeCol = headers.indexOf('deposit_code');
    const customerCol = headers.indexOf('customer_name');
    const productCol = headers.indexOf('product_name');
    const categoryCol = headers.indexOf('category');
    const qtyCol = headers.indexOf('remaining_qty');
    const origQtyCol = headers.indexOf('quantity');
    const percentCol = headers.indexOf('remaining_percent');

    const details = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (depositIds.includes(row[idCol])) {
        details.push({
          deposit_id: String(row[idCol] || ''),
          deposit_code: String(row[codeCol] || ''),
          customer_name: String(row[customerCol] || ''),
          product_name: String(row[productCol] || ''),
          category: String(row[categoryCol] || ''),
          quantity: Number(row[qtyCol] || row[origQtyCol] || 0),
          remaining_percent: Number(row[percentCol] || 100)
        });
      }
    }

    return details;
  } catch (e) {
    console.error('Error in getDepositDetailsForTransfer:', e);
    return [];
  }
}


/**
 * ยืนยันรับโอน
 * @param {string} transferId - รหัส transfer
 * @param {Object} confirmData - ข้อมูลการยืนยัน { note, receivedFrom, receivedQty, receivedPercent, confirmedBy }
 */
function confirmTransferRequest(transferId, confirmData) {
  try {
    const mainSS = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const storesSheet = mainSS.getSheetByName(CONFIG.MASTER_SHEETS.STORES);
    const storesData = storesSheet.getDataRange().getValues();
    const storeHeaders = storesData[0];
    const sheetIdCol = storeHeaders.indexOf('sheet_id');

    // หา transfer ในทุกสาขา
    for (let i = 1; i < storesData.length; i++) {
      const branchSheetId = storesData[i][sheetIdCol];
      if (!branchSheetId) continue;

      try {
        const branchSS = SpreadsheetApp.openById(branchSheetId);
        const transferSheet = branchSS.getSheetByName('Transfer_Requests');
        if (!transferSheet) continue;

        const transferData = transferSheet.getDataRange().getValues();
        const headers = transferData[0];

        // หา column indices
        const transferIdCol = headers.indexOf('transfer_id');
        const depositIdsCol = headers.indexOf('deposit_ids');
        const statusCol = headers.indexOf('status');
        const confirmDateCol = headers.indexOf('confirm_date');
        const confirmedByCol = headers.indexOf('confirmed_by');
        const receivedFromCol = headers.indexOf('received_from');
        const receivedQtyCol = headers.indexOf('received_qty');
        const receivedPercentCol = headers.indexOf('received_percent');

        for (let j = 1; j < transferData.length; j++) {
          if (transferData[j][transferIdCol] === transferId) {
            // อัพเดทสถานะเป็น confirmed
            const rowNum = j + 1;
            transferSheet.getRange(rowNum, statusCol + 1).setValue('confirmed');
            transferSheet.getRange(rowNum, confirmDateCol + 1).setValue(new Date());

            if (confirmData) {
              if (confirmData.confirmedBy && confirmedByCol >= 0) {
                transferSheet.getRange(rowNum, confirmedByCol + 1).setValue(confirmData.confirmedBy);
              }
              if (confirmData.receivedFrom && receivedFromCol >= 0) {
                transferSheet.getRange(rowNum, receivedFromCol + 1).setValue(confirmData.receivedFrom);
              }
              if (confirmData.receivedQty && receivedQtyCol >= 0) {
                transferSheet.getRange(rowNum, receivedQtyCol + 1).setValue(confirmData.receivedQty);
              }
              if (confirmData.receivedPercent && receivedPercentCol >= 0) {
                transferSheet.getRange(rowNum, receivedPercentCol + 1).setValue(confirmData.receivedPercent);
              }
            }

            // อัพเดทสถานะ deposits เป็น 'transfer_confirmed'
            const depositIds = JSON.parse(transferData[j][depositIdsCol] || '[]');
            const depositsSheet = branchSS.getSheetByName('Deposits');
            if (depositsSheet) {
              const depositsData = depositsSheet.getDataRange().getValues();
              const depHeaders = depositsData[0];
              const idCol = depHeaders.indexOf('deposit_id');
              const depStatusCol = depHeaders.indexOf('status');

              for (let k = 1; k < depositsData.length; k++) {
                if (depositIds.includes(depositsData[k][idCol])) {
                  depositsSheet.getRange(k + 1, depStatusCol + 1).setValue('transfer_confirmed');
                }
              }
            }

            return { success: true, message: 'ยืนยันรับโอนเรียบร้อย' };
          }
        }
      } catch (e) {
        console.log('Error in branch: ' + e);
      }
    }

    return { success: false, message: 'ไม่พบรายการโอน' };

  } catch (error) {
    console.error('Error in confirmTransferRequest:', error);
    return { success: false, message: error.toString() };
  }
}


/**
 * ปฏิเสธ/ยกเลิกการโอน
 * @param {string} transferId - รหัส transfer
 * @param {Object} rejectData - ข้อมูลการยกเลิก { reason, cancelledBy }
 */
function rejectTransferRequest(transferId, rejectData) {
  try {
    const mainSS = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const storesSheet = mainSS.getSheetByName(CONFIG.MASTER_SHEETS.STORES);
    const storesData = storesSheet.getDataRange().getValues();
    const storeHeaders = storesData[0];
    const sheetIdCol = storeHeaders.indexOf('sheet_id');

    for (let i = 1; i < storesData.length; i++) {
      const branchSheetId = storesData[i][sheetIdCol];
      if (!branchSheetId) continue;

      try {
        const branchSS = SpreadsheetApp.openById(branchSheetId);
        const transferSheet = branchSS.getSheetByName('Transfer_Requests');
        if (!transferSheet) continue;

        const transferData = transferSheet.getDataRange().getValues();
        const headers = transferData[0];

        // หา column indices
        const transferIdCol = headers.indexOf('transfer_id');
        const depositIdsCol = headers.indexOf('deposit_ids');
        const statusCol = headers.indexOf('status');
        const cancelReasonCol = headers.indexOf('cancel_reason');
        const cancelledByCol = headers.indexOf('cancelled_by');
        const cancelledAtCol = headers.indexOf('cancelled_at');

        for (let j = 1; j < transferData.length; j++) {
          if (transferData[j][transferIdCol] === transferId) {
            const rowNum = j + 1;

            // อัพเดทสถานะเป็น cancelled
            transferSheet.getRange(rowNum, statusCol + 1).setValue('cancelled');
            if (cancelledAtCol >= 0) {
              transferSheet.getRange(rowNum, cancelledAtCol + 1).setValue(new Date());
            }

            if (rejectData) {
              if (rejectData.reason && cancelReasonCol >= 0) {
                transferSheet.getRange(rowNum, cancelReasonCol + 1).setValue(rejectData.reason);
              }
              if (rejectData.cancelledBy && cancelledByCol >= 0) {
                transferSheet.getRange(rowNum, cancelledByCol + 1).setValue(rejectData.cancelledBy);
              }
            }

            // คืนสถานะ deposits กลับเป็น expired
            const depositIds = JSON.parse(transferData[j][depositIdsCol] || '[]');
            const depositsSheet = branchSS.getSheetByName('Deposits');
            if (depositsSheet) {
              const depositsData = depositsSheet.getDataRange().getValues();
              const depHeaders = depositsData[0];
              const idCol = depHeaders.indexOf('deposit_id');
              const depStatusCol = depHeaders.indexOf('status');

              for (let k = 1; k < depositsData.length; k++) {
                if (depositIds.includes(depositsData[k][idCol])) {
                  depositsSheet.getRange(k + 1, depStatusCol + 1).setValue('expired');
                }
              }
            }

            return { success: true, message: 'ยกเลิกการโอนเรียบร้อย' };
          }
        }
      } catch (e) {
        console.log('Error in branch: ' + e);
      }
    }

    return { success: false, message: 'ไม่พบรายการโอน' };

  } catch (error) {
    console.error('Error in rejectTransferRequest:', error);
    return { success: false, message: error.toString() };
  }
}


/**
 * ดึงรายการ Transfer ตามสถานะของสาขา
 * @param {string} storeId - รหัสสาขา
 * @param {string} status - สถานะ: 'pending' | 'confirmed' | 'cancelled'
 */
function getTransfersByStatus(storeId, status) {
  try {
    const storeInfo = getStoreInfoById(storeId);
    if (!storeInfo) {
      return { success: false, message: 'Store not found' };
    }

    const storeSS = SpreadsheetApp.openById(storeInfo.sheet_id);
    const transferSheet = storeSS.getSheetByName('Transfer_Requests');
    if (!transferSheet) {
      return { success: true, transfers: [] };
    }

    const data = transferSheet.getDataRange().getValues();
    const headers = data[0];

    const colIndices = {
      transfer_id: headers.indexOf('transfer_id'),
      transfer_code: headers.indexOf('transfer_code'),
      deposit_ids: headers.indexOf('deposit_ids'),
      total_items: headers.indexOf('total_items'),
      total_quantity: headers.indexOf('total_quantity'),
      transfer_date: headers.indexOf('transfer_date'),
      photo_url: headers.indexOf('photo_url'),
      created_by: headers.indexOf('created_by'),
      status: headers.indexOf('status'),
      notes: headers.indexOf('notes'),
      confirm_date: headers.indexOf('confirm_date'),
      confirmed_by: headers.indexOf('confirmed_by'),
      cancel_reason: headers.indexOf('cancel_reason')
    };

    const transfers = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[colIndices.status] === status) {
        transfers.push({
          transferId: row[colIndices.transfer_id],
          transferCode: row[colIndices.transfer_code],
          depositIds: JSON.parse(row[colIndices.deposit_ids] || '[]'),
          totalItems: row[colIndices.total_items],
          totalQuantity: row[colIndices.total_quantity],
          transferDate: row[colIndices.transfer_date],
          photoUrl: row[colIndices.photo_url] || '',
          createdBy: row[colIndices.created_by],
          status: row[colIndices.status],
          notes: row[colIndices.notes] || '',
          confirmDate: row[colIndices.confirm_date] || '',
          confirmedBy: row[colIndices.confirmed_by] || '',
          cancelReason: row[colIndices.cancel_reason] || ''
        });
      }
    }

    // Sort by date (newest first)
    transfers.sort((a, b) => new Date(b.transferDate) - new Date(a.transferDate));

    return { success: true, transfers: transfers };

  } catch (error) {
    console.error('Error in getTransfersByStatus:', error);
    return { success: false, message: error.toString() };
  }
}


/**
 * HQ: ดึงรายการ Transfer ที่รอนำส่งจากทุกสาขา (status = 'pending')
 */
function getAllPendingTransfersForHQ() {
  try {
    const allStores = getActiveStores();
    let allTransfers = [];

    allStores.forEach(store => {
      // ข้ามสาขาที่เป็น HQ
      if (store.is_central) return;

      try {
        const storeSS = SpreadsheetApp.openById(store.sheet_id);
        const transferSheet = storeSS.getSheetByName('Transfer_Requests');
        if (!transferSheet) return;

        const data = transferSheet.getDataRange().getValues();
        const headers = data[0];

        const colIndices = {
          transfer_id: headers.indexOf('transfer_id'),
          transfer_code: headers.indexOf('transfer_code'),
          deposit_ids: headers.indexOf('deposit_ids'),
          total_items: headers.indexOf('total_items'),
          total_quantity: headers.indexOf('total_quantity'),
          transfer_date: headers.indexOf('transfer_date'),
          photo_url: headers.indexOf('photo_url'),
          created_by: headers.indexOf('created_by'),
          status: headers.indexOf('status'),
          notes: headers.indexOf('notes')
        };

        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (row[colIndices.status] === 'pending') {
            allTransfers.push({
              transferId: row[colIndices.transfer_id],
              transferCode: row[colIndices.transfer_code],
              storeId: store.store_id,
              storeName: store.store_name,
              storeSheetId: store.sheet_id,
              depositIds: JSON.parse(row[colIndices.deposit_ids] || '[]'),
              totalItems: row[colIndices.total_items],
              totalQuantity: row[colIndices.total_quantity],
              transferDate: row[colIndices.transfer_date],
              photoUrl: row[colIndices.photo_url] || '',
              createdBy: row[colIndices.created_by] || '',
              notes: row[colIndices.notes] || ''
            });
          }
        }
      } catch (storeError) {
        console.error('Error reading store ' + store.store_id + ':', storeError);
      }
    });

    // Sort by date (newest first)
    allTransfers.sort((a, b) => new Date(b.transferDate) - new Date(a.transferDate));

    return { success: true, transfers: allTransfers };

  } catch (error) {
    console.error('Error in getAllPendingTransfersForHQ:', error);
    return { success: false, message: error.toString() };
  }
}


/**
 * HQ: ดึงรายการ Transfer ที่รับแล้ว รอถอนออกจากระบบ (status = 'confirmed')
 */
function getConfirmedTransfersForHQ() {
  try {
    const allStores = getActiveStores();
    let allTransfers = [];

    allStores.forEach(store => {
      // ข้ามสาขาที่เป็น HQ
      if (store.is_central) return;

      try {
        const storeSS = SpreadsheetApp.openById(store.sheet_id);
        const transferSheet = storeSS.getSheetByName('Transfer_Requests');
        if (!transferSheet) return;

        const data = transferSheet.getDataRange().getValues();
        const headers = data[0];

        const colIndices = {
          transfer_id: headers.indexOf('transfer_id'),
          transfer_code: headers.indexOf('transfer_code'),
          deposit_ids: headers.indexOf('deposit_ids'),
          total_items: headers.indexOf('total_items'),
          total_quantity: headers.indexOf('total_quantity'),
          transfer_date: headers.indexOf('transfer_date'),
          confirm_date: headers.indexOf('confirm_date'),
          confirmed_by: headers.indexOf('confirmed_by'),
          received_from: headers.indexOf('received_from'),
          received_qty: headers.indexOf('received_qty'),
          status: headers.indexOf('status')
        };

        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (row[colIndices.status] === 'confirmed') {
            allTransfers.push({
              transferId: row[colIndices.transfer_id],
              transferCode: row[colIndices.transfer_code],
              storeId: store.store_id,
              storeName: store.store_name,
              storeSheetId: store.sheet_id,
              depositIds: JSON.parse(row[colIndices.deposit_ids] || '[]'),
              totalItems: row[colIndices.total_items],
              totalQuantity: row[colIndices.total_quantity],
              transferDate: row[colIndices.transfer_date],
              confirmDate: row[colIndices.confirm_date],
              confirmedBy: row[colIndices.confirmed_by] || '',
              receivedFrom: row[colIndices.received_from] || '',
              receivedQty: row[colIndices.received_qty] || 0
            });
          }
        }
      } catch (storeError) {
        console.error('Error reading store ' + store.store_id + ':', storeError);
      }
    });

    // Sort by confirm date (newest first)
    allTransfers.sort((a, b) => new Date(b.confirmDate) - new Date(a.confirmDate));

    return { success: true, transfers: allTransfers };

  } catch (error) {
    console.error('Error in getConfirmedTransfersForHQ:', error);
    return { success: false, message: error.toString() };
  }
}


/**
 * HQ: ยกเลิกการนำส่ง (คืนสถานะ deposits กลับเป็น expired)
 */
function cancelTransfer(data) {
  try {
    const { transferId, storeSheetId, cancelReason, cancelledBy } = data;

    const storeSS = SpreadsheetApp.openById(storeSheetId);
    const transferSheet = storeSS.getSheetByName('Transfer_Requests');
    const depositsSheet = storeSS.getSheetByName('Deposits');

    if (!transferSheet || !depositsSheet) {
      return { success: false, message: 'Sheet not found' };
    }

    // Find transfer row
    const transferData = transferSheet.getDataRange().getValues();
    const transferHeaders = transferData[0];
    const transferColIndices = {
      transfer_id: transferHeaders.indexOf('transfer_id'),
      deposit_ids: transferHeaders.indexOf('deposit_ids'),
      status: transferHeaders.indexOf('status'),
      cancel_reason: transferHeaders.indexOf('cancel_reason'),
      cancelled_by: transferHeaders.indexOf('cancelled_by'),
      cancelled_at: transferHeaders.indexOf('cancelled_at')
    };

    let transferRowIndex = -1;
    let depositIds = [];

    for (let i = 1; i < transferData.length; i++) {
      if (transferData[i][transferColIndices.transfer_id] === transferId) {
        transferRowIndex = i + 1; // 1-based
        depositIds = JSON.parse(transferData[i][transferColIndices.deposit_ids] || '[]');
        break;
      }
    }

    if (transferRowIndex === -1) {
      return { success: false, message: 'Transfer not found' };
    }

    // Update transfer status
    transferSheet.getRange(transferRowIndex, transferColIndices.status + 1).setValue('cancelled');
    if (transferColIndices.cancel_reason >= 0) {
      transferSheet.getRange(transferRowIndex, transferColIndices.cancel_reason + 1).setValue(cancelReason);
    }
    if (transferColIndices.cancelled_by >= 0) {
      transferSheet.getRange(transferRowIndex, transferColIndices.cancelled_by + 1).setValue(cancelledBy);
    }
    if (transferColIndices.cancelled_at >= 0) {
      transferSheet.getRange(transferRowIndex, transferColIndices.cancelled_at + 1).setValue(new Date());
    }

    // Revert deposits status back to 'expired'
    const depositsData = depositsSheet.getDataRange().getValues();
    const depositsHeaders = depositsData[0];
    const depositIdCol = depositsHeaders.indexOf('deposit_id');
    const depositStatusCol = depositsHeaders.indexOf('status');

    for (let i = 1; i < depositsData.length; i++) {
      if (depositIds.includes(depositsData[i][depositIdCol])) {
        depositsSheet.getRange(i + 1, depositStatusCol + 1).setValue('expired');
      }
    }

    return { success: true, message: 'ยกเลิกการนำส่งสำเร็จ' };

  } catch (error) {
    console.error('Error in cancelTransfer:', error);
    return { success: false, message: error.toString() };
  }
}


/**
 * HQ: ถอนรายการออกจากระบบ (เปลี่ยนสถานะ deposits เป็น disposed)
 */
function disposeDeposits(data) {
  try {
    const { transferId, storeSheetId, disposedBy } = data;

    const storeSS = SpreadsheetApp.openById(storeSheetId);
    const transferSheet = storeSS.getSheetByName('Transfer_Requests');
    const depositsSheet = storeSS.getSheetByName('Deposits');
    const historySheet = storeSS.getSheetByName('Deposit_History');

    if (!transferSheet || !depositsSheet) {
      return { success: false, message: 'Sheet not found' };
    }

    // Find transfer row
    const transferData = transferSheet.getDataRange().getValues();
    const transferHeaders = transferData[0];
    const transferColIndices = {
      transfer_id: transferHeaders.indexOf('transfer_id'),
      deposit_ids: transferHeaders.indexOf('deposit_ids'),
      status: transferHeaders.indexOf('status')
    };

    let transferRowIndex = -1;
    let depositIds = [];

    for (let i = 1; i < transferData.length; i++) {
      if (transferData[i][transferColIndices.transfer_id] === transferId) {
        transferRowIndex = i + 1;
        depositIds = JSON.parse(transferData[i][transferColIndices.deposit_ids] || '[]');
        break;
      }
    }

    if (transferRowIndex === -1) {
      return { success: false, message: 'Transfer not found' };
    }

    // Update transfer status to 'disposed'
    transferSheet.getRange(transferRowIndex, transferColIndices.status + 1).setValue('disposed');

    // Update deposits status to 'disposed' and add to history
    const depositsData = depositsSheet.getDataRange().getValues();
    const depositsHeaders = depositsData[0];
    const depositColIndices = {
      deposit_id: depositsHeaders.indexOf('deposit_id'),
      deposit_code: depositsHeaders.indexOf('deposit_code'),
      customer_name: depositsHeaders.indexOf('customer_name'),
      product_name: depositsHeaders.indexOf('product_name'),
      category: depositsHeaders.indexOf('category'),
      quantity: depositsHeaders.indexOf('quantity'),
      status: depositsHeaders.indexOf('status')
    };

    for (let i = 1; i < depositsData.length; i++) {
      const row = depositsData[i];
      if (depositIds.includes(row[depositColIndices.deposit_id])) {
        // Update status to disposed
        depositsSheet.getRange(i + 1, depositColIndices.status + 1).setValue('disposed');

        // Add to history if sheet exists
        if (historySheet) {
          historySheet.appendRow([
            Utilities.getUuid(), // history_id
            row[depositColIndices.deposit_id],
            row[depositColIndices.deposit_code],
            row[depositColIndices.customer_name],
            row[depositColIndices.product_name],
            row[depositColIndices.category],
            row[depositColIndices.quantity],
            'disposed',
            new Date(),
            transferId,
            'ถอนออกจากระบบโดย ' + disposedBy,
            new Date()
          ]);
        }
      }
    }

    return { success: true, message: 'ถอนออกจากระบบสำเร็จ' };

  } catch (error) {
    console.error('Error in disposeDeposits:', error);
    return { success: false, message: error.toString() };
  }
}


// ==========================================
// LINE MESSAGING API - DEPOSIT SYSTEM
// ==========================================

/**
 * ส่งข้อความ LINE ผ่าน Messaging API (ใช้ Access Token ของสาขา)
 *
 * @param {string} to - LINE User ID หรือ Group ID ที่ต้องการส่งข้อความ
 * @param {string} message - ข้อความที่ต้องการส่ง
 * @param {string} storeId - รหัสสาขา (ใช้ดึง Access Token ของสาขานั้น)
 * @returns {Object} { success: boolean, message: string }
 */
function sendLineMessage(to, message, storeId = null) {
  try {
    // ถ้าไม่มี storeId ให้ใช้ Token จาก Master_Settings (ระบบเดิม)
    let accessToken = '';

    if (storeId) {
      // ดึง Access Token จาก Stores sheet
      const storeInfo = getStoreInfoById(storeId);
      if (!storeInfo) {
        console.error('Store not found:', storeId);
        return { success: false, message: 'Store not found' };
      }

      accessToken = storeInfo.line_token || '';
    } else {
      // Fallback: ใช้ Global Token จาก Master_Settings
      const masterSettings = getMasterSettings();
      accessToken = masterSettings.settings.line_channel_access_token || '';
    }

    if (!accessToken || accessToken === '') {
      console.error('LINE Access Token ยังไม่ได้ตั้งค่า (store:', storeId, ')');
      return { success: false, message: 'LINE Access Token not configured' };
    }

    const url = 'https://api.line.me/v2/bot/message/push';
    const payload = {
      to: to,
      messages: [
        {
          type: 'text',
          text: message
        }
      ]
    };

    const options = {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + accessToken
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode === 200) {
      console.log('LINE message sent successfully to:', to);
      return { success: true };
    } else {
      const errorData = JSON.parse(responseBody);
      console.error('LINE message failed:', errorData);
      return { success: false, message: errorData.message || 'Unknown error' };
    }

  } catch (error) {
    console.error('Error in sendLineMessage:', error);
    return { success: false, message: error.toString() };
  }
}




function createMasterSheet() {
  try {
    // 1. สร้างโฟลเดอร์หลัก
    const rootFolder = DriveApp.createFolder('ระบบนับสต๊อกร้านเหล้า');
    const rootFolderId = rootFolder.getId();
    console.log(`Created root folder "ระบบนับสต๊อกร้านเหล้า" with ID: ${rootFolderId}`);

    // 2. สร้างไฟล์ Master Sheet
    const masterSheetFile = SpreadsheetApp.create('Stock_Count_Master');
    const sheetId = masterSheetFile.getId();
    
    // 3. ย้าย Master Sheet เข้าไปในโฟลเดอร์หลัก
    DriveApp.getFileById(sheetId).moveTo(rootFolder);
    
    const masterSheet = SpreadsheetApp.openById(sheetId);
    
    // 4. สร้างชีต Users
    const usersSheet = masterSheet.getActiveSheet();
    usersSheet.setName(CONFIG.MASTER_SHEETS.USERS);
    usersSheet.clear();
    const usersHeaders = ['user_id', 'username', 'password_hash', 'salt', 'role', 'store_ids', 'active', 'created_at', 'created_by'];
    usersSheet.getRange(1, 1, 1, usersHeaders.length).setValues([usersHeaders]);

    // 5. เพิ่มผู้ใช้ admin เริ่มต้น
    const adminPassword = 'admin123';
    const adminSalt = Utilities.getUuid();
    const adminHash = hashPassword(adminPassword, adminSalt);
    usersSheet.appendRow([ Utilities.getUuid(), 'admin', adminHash, adminSalt, 'owner', '[]', true, new Date(), 'System' ]);

    // 6. สร้างชีต Stores และ Login_Logs
    const storesSheet = masterSheet.insertSheet(CONFIG.MASTER_SHEETS.STORES);
    const storesHeaders = [
      'store_id',
      'store_code',
      'store_name',
      'sheet_id',
      'folder_id',
      'line_token',                  // LINE OA Access Token ของสาขา (ใช้สำหรับ Deposit System)
      'manager_id',
      'active',
      'created_at',
      // Deposit System LINE Config
      'line_channel_secret',         // LINE OA Channel Secret
      'staff_group_id',              // Group ID สำหรับแจ้ง Staff
      'bar_group_id',                // Group ID สำหรับแจ้ง Bar
      'central_group_id',            // Group ID สำหรับคลังกลาง
      // Receipt Printing Config
      'line_id',                     // LINE OA ID (เช่น @abc123)
      'line_add_friend_url',         // URL Add Friend
      'qr_code_image_url',           // รูป QR Code (อัพโหลดผ่าน ImgBB)
      'store_address',               // ที่อยู่สาขา (สำหรับพิมพ์ใบเสร็จ)
      'store_phone',                 // เบอร์โทรสาขา
      'receipt_logo_url',            // URL โลโก้ร้าน (optional)
      'default_paper_size',          // "58mm" หรือ "80mm"
      'default_copies'               // จำนวนสำเนาเริ่มต้น (เช่น 1)
    ];
    storesSheet.getRange(1, 1, 1, storesHeaders.length).setValues([storesHeaders]);

    const loginSheet = masterSheet.insertSheet(CONFIG.MASTER_SHEETS.LOGIN_LOGS);
    const loginHeaders = ['log_id', 'user_id', 'username', 'status', 'timestamp', 'ip_address'];
    loginSheet.getRange(1, 1, 1, loginHeaders.length).setValues([loginHeaders]);
    
    // 7. สร้าง Master_Settings sheet และเพิ่มการตั้งค่าทั้งหมด
    const settingsSheet = masterSheet.insertSheet('Master_Settings');
    const settingsHeaders = ['setting_key', 'setting_value', 'setting_type', 'description'];
    settingsSheet.getRange(1, 1, 1, settingsHeaders.length).setValues([settingsHeaders]);
    
    const defaultSettings = [
      ['ROOT_FOLDER_ID', rootFolderId, 'string', 'ID ของโฟลเดอร์หลักของโปรเจกต์'],
      ['OWNER_GROUP_LINE_ID', '', 'string', 'Group Line ID ของเจ้าของร้านสำหรับรับการแจ้งเตือนสรุป'], 
      ['FOLLOW_UP_INTERVAL_HOURS', '2', 'numbe', 'ความถี่ในการส่งแจ้งเตือนซ้ำ (ชั่วโมง)'], 
      ['LINE_ACCESS_TOKEN', '', 'string', 'Line Access Token สำหรับส่งแจ้งเตือน'],
      ['AI_PROVIDER', 'gemini', 'select', 'AI Provider (gemini, claude, openai)'],
      ['GEMINI_API_KEY', '', 'string', 'Gemini API Key'],
      ['CLAUDE_API_KEY', '', 'string', 'Claude API Key'],
      ['OPENAI_API_KEY', '', 'string', 'OpenAI API Key'],
      ['IMGBB_API_KEY', '', 'string', 'ImgBB API Key สำหรับอัพโหลดรูปภาพ']
    ];
    settingsSheet.getRange(2, 1, defaultSettings.length, 4).setValues(defaultSettings);

    // 8. จัดรูปแบบ Headers
    [usersSheet, storesSheet, loginSheet, settingsSheet].forEach(sheet => {
      const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn());
      headerRow.setBackground('#4A5568').setFontColor('#FFFFFF').setFontWeight('bold');
      sheet.setFrozenRows(1);
    });

    console.log('Master Sheet created successfully inside the root folder.');
    console.log('Default admin credentials - Username: admin, Password: admin123');
    console.log('Please update CONFIG.MASTER_SHEET_ID with this ID:', sheetId);
    return sheetId;

  } catch (e) {
    console.error("Error creating Master Sheet:", e);
    return { success: false, message: e.toString() };
  }
}



function createStore1() {
  // Create first store as example
  if (!CONFIG.MASTER_SHEET_ID) {
    console.log('Please set MASTER_SHEET_ID and TEMPLATE_SHEET_ID first');
    return;
  }
  

  const result = createNewStore(
    'Upper House',           // Store name
    'UPH',                  // Store code
    '',                     // Stock count group line (ไม่ใช้แล้ว - ใช้ Master Settings แทน)
    'admin'                 // Manager ID
  );
  
  if (result.success) {
    console.log('==============================');
    console.log('✅ Store created successfully!');
    console.log('==============================');
    console.log('Store ID:', result.store_id);
    console.log('Sheet ID:', result.sheet_id);
    console.log('Sheet URL:', result.sheet_url);
    console.log('Folder ID:', result.folder_id);
    console.log('');
    console.log('📊 All sheets ready to use');
    console.log('⚙️ Settings configured');
    console.log('');
    console.log('Next steps:');
    console.log('1. Update Line Token in Settings sheet');
    console.log('2. Add users through the web interface');
    console.log('3. Start using the system!');
  } else {
    console.log('❌ Failed to create store:', result.message);
  }
  
  return result;
}



// ==========================================
// ระบบฝากเหล้า - DEPOSIT SYSTEM SETUP
// ==========================================

/**
 * อัพเกรด Schema ของ Stores sheet สำหรับระบบฝากเหล้า
 *
 * วิธีใช้:
 * 1. เปิด Apps Script Editor
 * 2. เลือกฟังก์ชัน: updateStoresSheetSchema
 * 3. กด Run (รันครั้งเดียวก่อนรัน createDepositSheetsForAllStores)
 *
 * ฟังก์ชันนี้จะ:
 * - ตรวจสอบว่า Stores sheet มีคอลัมน์ใหม่หรือยัง
 * - ถ้ายังไม่มี: เพิ่มคอลัมน์ใหม่ 4 คอลัมน์
 * - ล้างข้อมูลในคอลัมน์ line_token (เพราะจะเปลี่ยนวัตถุประสงค์การใช้งาน)
 */
function updateStoresSheetSchema() {
  try {
    const masterSS = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const storeSheet = masterSS.getSheetByName(CONFIG.MASTER_SHEETS.STORES);

    if (!storeSheet) {
      throw new Error('ไม่พบ Stores sheet ใน Master Spreadsheet');
    }

    const data = storeSheet.getDataRange().getValues();
    const headers = data[0];

    Logger.log('═══════════════════════════════════════');
    Logger.log('🔄 อัพเกรด Stores Sheet Schema');
    Logger.log('═══════════════════════════════════════\n');

    // ตรวจสอบว่ามีคอลัมน์ใหม่หรือยัง
    const newColumns = [
      'line_channel_secret',
      'staff_group_id',
      'bar_group_id',
      'central_group_id',
      'line_id',
      'line_add_friend_url',
      'qr_code_image_url',
      'store_address',
      'store_phone',
      'receipt_logo_url',
      'receipt_header_text',
      'receipt_footer_line1',
      'receipt_footer_line2'
    ];

    const missingColumns = newColumns.filter(col => headers.indexOf(col) === -1);

    if (missingColumns.length === 0) {
      Logger.log('✅ Stores sheet มีคอลัมน์ครบแล้ว ไม่ต้องอัพเกรด\n');
      return {
        success: true,
        message: 'Schema already up to date',
        updated: false
      };
    }

    Logger.log(`📝 พบคอลัมน์ที่ขาดหายไป: ${missingColumns.length} คอลัมน์`);
    missingColumns.forEach(col => Logger.log(`   - ${col}`));

    // เพิ่มคอลัมน์ใหม่
    const currentColCount = headers.length;
    const lastCol = currentColCount + missingColumns.length;

    // เพิ่ม header
    const newHeaderRow = [...headers, ...missingColumns];
    storeSheet.getRange(1, 1, 1, newHeaderRow.length).setValues([newHeaderRow]);

    Logger.log(`\n✅ เพิ่มคอลัมน์ใหม่สำเร็จ (${missingColumns.length} คอลัมน์)`);

    // ล้างข้อมูลในคอลัมน์ line_token (เพราะจะเปลี่ยนการใช้งาน)
    const lineTokenIndex = headers.indexOf('line_token');
    if (lineTokenIndex !== -1 && data.length > 1) {
      Logger.log('\n🧹 กำลังล้างข้อมูลในคอลัมน์ line_token (เปลี่ยนวัตถุประสงค์การใช้งาน)...');

      for (let i = 2; i <= data.length; i++) {
        storeSheet.getRange(i, lineTokenIndex + 1).setValue('');
      }

      Logger.log('✅ ล้างข้อมูล line_token เรียบร้อย');
    }

    Logger.log('\n═══════════════════════════════════════');
    Logger.log('✅ อัพเกรด Schema สำเร็จ');
    Logger.log('═══════════════════════════════════════');
    Logger.log('ℹ️  คอลัมน์ line_token จะถูกใช้เก็บ LINE OA Access Token ของแต่ละสาขา');
    Logger.log('ℹ️  คุณสามารถรัน createDepositSheetsForAllStores() ได้แล้ว\n');

    return {
      success: true,
      message: 'Schema updated successfully',
      updated: true,
      addedColumns: missingColumns
    };

  } catch (error) {
    Logger.log('❌ Error in updateStoresSheetSchema: ' + error);
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * สร้าง Sheets ระบบฝากเหล้าสำหรับสาขาที่มีอยู่แล้ว (อัพเกรดระบบเดิม)
 *
 * วิธีใช้:
 * 1. เปิด Apps Script Editor
 * 2. รัน updateStoresSheetSchema() ก่อน (ครั้งเดียว)
 * 3. เลือกฟังก์ชัน: createDepositSheetsForAllStores
 * 4. กด Run
 * 5. ตรวจสอบ Logs เพื่อดูผลลัพธ์
 *
 * ฟังก์ชันนี้จะ:
 * - อ่านรายการสาขาทั้งหมดจาก Master Sheet > Stores
 * - สร้าง 6 Sheets ระบบฝากเหล้าในทุกสาขาที่ active
 * - ข้ามสาขาที่มี Deposit Sheets อยู่แล้ว
 */
function createDepositSheetsForAllStores() {
  try {
    const masterSS = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const storeSheet = masterSS.getSheetByName(CONFIG.MASTER_SHEETS.STORES);

    if (!storeSheet) {
      throw new Error('ไม่พบ Stores sheet ใน Master Spreadsheet');
    }

    const data = storeSheet.getDataRange().getValues();
    const headers = data[0];

    // หา column indices
    const columns = {
      store_id: headers.indexOf('store_id'),
      store_name: headers.indexOf('store_name'),
      sheet_id: headers.indexOf('sheet_id'),
      active: headers.indexOf('active')
    };

    // ตรวจสอบว่ามี columns ที่จำเป็นครบหรือไม่
    if (columns.store_id === -1 || columns.store_name === -1 || columns.sheet_id === -1) {
      throw new Error('Stores sheet ไม่มี columns ที่จำเป็น (store_id, store_name, sheet_id)');
    }

    let successCount = 0;
    let skippedCount = 0;
    let existingCount = 0;
    let failedStores = [];

    Logger.log('═══════════════════════════════════════');
    Logger.log('🚀 เริ่มสร้าง Deposit Sheets สำหรับทุกสาขา');
    Logger.log('═══════════════════════════════════════\n');

    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // ตรวจสอบ active status (ถ้ามี column นี้)
      if (columns.active !== -1) {
        const isActive = row[columns.active] === true || row[columns.active] === 'TRUE';
        if (!isActive) {
          skippedCount++;
          continue;
        }
      }

      const storeId = row[columns.store_id];
      const storeName = row[columns.store_name];
      const sheetId = row[columns.sheet_id];

      if (!sheetId) {
        failedStores.push(`${storeName} (ไม่มี sheet_id)`);
        Logger.log(`⚠️  ข้าม: ${storeName} - ไม่มี sheet_id`);
        continue;
      }

      Logger.log(`📝 กำลังสร้างสำหรับ: ${storeName} (${storeId})`);

      const result = createDepositSheets(sheetId, storeId);

      if (result.success) {
        successCount++;
        Logger.log(`✅ สำเร็จ: ${storeName}\n`);
      } else if (result.message === 'Sheets already exist') {
        existingCount++;
        Logger.log(`⏭️  ข้าม: ${storeName} - มี Deposit Sheets อยู่แล้ว\n`);
      } else {
        failedStores.push(`${storeName} (${result.message})`);
        Logger.log(`❌ ล้มเหลว: ${storeName} - ${result.message}\n`);
      }
    }

    // สรุปผล
    Logger.log('═══════════════════════════════════════');
    Logger.log('📊 สรุปผลการสร้าง Deposit Sheets');
    Logger.log('═══════════════════════════════════════');
    Logger.log(`✅ สร้างสำเร็จ: ${successCount} สาขา`);
    Logger.log(`⏭️  มีอยู่แล้ว: ${existingCount} สาขา`);
    Logger.log(`⏭️  ข้าม (inactive): ${skippedCount} สาขา`);
    Logger.log(`❌ ล้มเหลว: ${failedStores.length} สาขา`);

    if (failedStores.length > 0) {
      Logger.log('\n⚠️  สาขาที่ล้มเหลว:');
      failedStores.forEach(store => Logger.log(`   - ${store}`));
    }

    Logger.log('═══════════════════════════════════════\n');

    return {
      success: true,
      successCount,
      existingCount,
      skippedCount,
      failedCount: failedStores.length,
      failedStores
    };

  } catch (error) {
    Logger.log('❌ Error in createDepositSheetsForAllStores: ' + error);
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * อัปเดต Schema ของ Deposit Sheets ที่มีอยู่แล้ว (เพิ่ม product_name, category, remaining_percent)
 *
 * วิธีใช้:
 * 1. เปิด Apps Script Editor
 * 2. เลือกฟังก์ชัน: updateDepositSheetsSchema
 * 3. กด Run
 *
 * ฟังก์ชันนี้จะ:
 * - อัปเดตทุกสาขาที่มี Deposit Sheets อยู่แล้ว
 * - เปลี่ยน 'alcohol_type' → 'product_name'
 * - เพิ่มคอลัมน์ 'category' และ 'remaining_percent'
 * - อัปเดต 3 sheets: Deposits, Deposit_Requests, Deposit_History
 */
function updateDepositSheetsSchema() {
  try {
    const masterSS = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const storeSheet = masterSS.getSheetByName(CONFIG.MASTER_SHEETS.STORES);

    if (!storeSheet) {
      throw new Error('ไม่พบ Stores sheet');
    }

    const data = storeSheet.getDataRange().getValues();
    const headers = data[0];

    const columns = {
      store_id: headers.indexOf('store_id'),
      store_name: headers.indexOf('store_name'),
      sheet_id: headers.indexOf('sheet_id'),
      active: headers.indexOf('active')
    };

    let successCount = 0;
    let skippedCount = 0;
    let failedStores = [];

    Logger.log('═══════════════════════════════════════');
    Logger.log('🔄 อัปเดต Deposit Sheets Schema');
    Logger.log('═══════════════════════════════════════\n');

    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // ตรวจสอบ active
      if (columns.active !== -1) {
        const isActive = row[columns.active] === true || row[columns.active] === 'TRUE';
        if (!isActive) {
          skippedCount++;
          continue;
        }
      }

      const storeId = row[columns.store_id];
      const storeName = row[columns.store_name];
      const sheetId = row[columns.sheet_id];

      if (!sheetId) {
        failedStores.push(`${storeName} (ไม่มี sheet_id)`);
        continue;
      }

      Logger.log(`📝 กำลังอัปเดต: ${storeName} (${storeId})`);

      try {
        const storeSS = SpreadsheetApp.openById(sheetId);

        // อัปเดต 3 sheets
        const sheetsToUpdate = [
          {
            name: 'Deposits',
            oldHeaders: [
              'deposit_id', 'deposit_code', 'store_id', 'line_user_id', 'customer_name',
              'customer_phone', 'alcohol_type', 'quantity', 'remaining_qty', 'table_number',
              'deposit_date', 'expiry_date', 'is_vip', 'status', 'photo_url',
              'received_by', 'confirmed_by', 'notes', 'created_at', 'updated_at'
            ],
            newHeaders: [
              'deposit_id', 'deposit_code', 'store_id', 'line_user_id', 'customer_name',
              'customer_phone', 'product_name', 'category', 'quantity', 'remaining_percent', 'remaining_qty', 'table_number',
              'deposit_date', 'expiry_date', 'is_vip', 'status', 'photo_url',
              'received_by', 'confirmed_by', 'notes', 'created_at', 'updated_at'
            ]
          },
          {
            name: 'Deposit_Requests',
            oldHeaders: [
              'request_id', 'store_id', 'line_user_id', 'customer_name', 'customer_phone',
              'alcohol_type', 'quantity', 'table_number', 'notes', 'status',
              'request_date', 'processed_by', 'processed_at', 'deposit_id'
            ],
            newHeaders: [
              'request_id', 'store_id', 'line_user_id', 'customer_name', 'customer_phone',
              'product_name', 'category', 'quantity', 'remaining_percent', 'table_number', 'notes', 'status',
              'request_date', 'processed_by', 'processed_at', 'deposit_id'
            ]
          },
          {
            name: 'Deposit_History',
            oldHeaders: [
              'history_id', 'deposit_id', 'deposit_code', 'customer_name', 'alcohol_type',
              'original_qty', 'final_status', 'status_date', 'transfer_id',
              'notes', 'archived_at'
            ],
            newHeaders: [
              'history_id', 'deposit_id', 'deposit_code', 'customer_name', 'product_name', 'category',
              'original_qty', 'final_status', 'status_date', 'transfer_id',
              'notes', 'archived_at'
            ]
          }
        ];

        for (const sheetConfig of sheetsToUpdate) {
          const sheet = storeSS.getSheetByName(sheetConfig.name);
          if (!sheet) {
            Logger.log(`   ⚠️  ไม่พบ sheet "${sheetConfig.name}" - ข้าม`);
            continue;
          }

          const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

          // ตรวจสอบว่าอัปเดตแล้วหรือยัง
          if (currentHeaders.includes('product_name') && currentHeaders.includes('category')) {
            Logger.log(`   ✓ "${sheetConfig.name}" อัปเดตแล้ว - ข้าม`);
            continue;
          }

          // อัปเดต headers
          sheet.getRange(1, 1, 1, sheetConfig.newHeaders.length).setValues([sheetConfig.newHeaders]);

          // Migrate existing data rows
          const dataRange = sheet.getDataRange();
          const numRows = dataRange.getNumRows();

          if (numRows > 1) {
            const allData = dataRange.getValues();

            // Migrate data for each sheet type
            if (sheetConfig.name === 'Deposits') {
              // Old schema: deposit_id, deposit_code, store_id, line_user_id, customer_name, customer_phone,
              //             alcohol_type[6], quantity[7], remaining_qty[8], table_number[9], ...
              // New schema: deposit_id, deposit_code, store_id, line_user_id, customer_name, customer_phone,
              //             product_name[6], category[7], quantity[8], remaining_percent[9], remaining_qty[10], table_number[11], ...

              for (let i = 1; i < allData.length; i++) {
                const oldRow = allData[i];
                const newRow = [
                  oldRow[0],  // deposit_id
                  oldRow[1],  // deposit_code
                  oldRow[2],  // store_id
                  oldRow[3],  // line_user_id
                  oldRow[4],  // customer_name
                  oldRow[5],  // customer_phone
                  oldRow[6] || 'ไม่ระบุ',  // product_name (was alcohol_type)
                  'ทั่วไป',   // category (NEW - default value)
                  oldRow[7],  // quantity
                  100,        // remaining_percent (NEW - default 100%)
                  oldRow[8],  // remaining_qty
                  oldRow[9],  // table_number
                  oldRow[10], // deposit_date
                  oldRow[11], // expiry_date
                  oldRow[12], // is_vip
                  oldRow[13], // status
                  oldRow[14], // photo_url
                  oldRow[15], // received_by
                  oldRow[16], // confirmed_by
                  oldRow[17], // notes
                  oldRow[18], // created_at
                  oldRow[19]  // updated_at
                ];
                sheet.getRange(i + 1, 1, 1, newRow.length).setValues([newRow]);
              }
              Logger.log(`   ✓ Migrated ${numRows - 1} deposit rows`);

            } else if (sheetConfig.name === 'Deposit_Requests') {
              // Old: request_id, store_id, line_user_id, customer_name, customer_phone,
              //      alcohol_type[5], quantity[6], table_number[7], notes[8], status[9], ...
              // New: request_id, store_id, line_user_id, customer_name, customer_phone,
              //      product_name[5], category[6], quantity[7], remaining_percent[8], table_number[9], notes[10], status[11], ...

              for (let i = 1; i < allData.length; i++) {
                const oldRow = allData[i];
                const newRow = [
                  oldRow[0],  // request_id
                  oldRow[1],  // store_id
                  oldRow[2],  // line_user_id
                  oldRow[3],  // customer_name
                  oldRow[4],  // customer_phone
                  oldRow[5] || 'ไม่ระบุ',  // product_name (was alcohol_type)
                  'ทั่วไป',   // category (NEW)
                  oldRow[6],  // quantity
                  100,        // remaining_percent (NEW)
                  oldRow[7],  // table_number
                  oldRow[8],  // notes
                  oldRow[9],  // status
                  oldRow[10], // request_date
                  oldRow[11], // processed_by
                  oldRow[12], // processed_at
                  oldRow[13]  // deposit_id
                ];
                sheet.getRange(i + 1, 1, 1, newRow.length).setValues([newRow]);
              }
              Logger.log(`   ✓ Migrated ${numRows - 1} deposit request rows`);

            } else if (sheetConfig.name === 'Deposit_History') {
              // Old: history_id, deposit_id, deposit_code, customer_name, alcohol_type[4], ...
              // New: history_id, deposit_id, deposit_code, customer_name, product_name[4], category[5], ...

              for (let i = 1; i < allData.length; i++) {
                const oldRow = allData[i];
                const newRow = [
                  oldRow[0],  // history_id
                  oldRow[1],  // deposit_id
                  oldRow[2],  // deposit_code
                  oldRow[3],  // customer_name
                  oldRow[4] || 'ไม่ระบุ',  // product_name (was alcohol_type)
                  'ทั่วไป',   // category (NEW)
                  oldRow[5],  // original_qty
                  oldRow[6],  // final_status
                  oldRow[7],  // status_date
                  oldRow[8],  // transfer_id
                  oldRow[9],  // notes
                  oldRow[10]  // archived_at
                ];
                sheet.getRange(i + 1, 1, 1, newRow.length).setValues([newRow]);
              }
              Logger.log(`   ✓ Migrated ${numRows - 1} history rows`);
            }
          }

          Logger.log(`   ✓ อัปเดต "${sheetConfig.name}" สำเร็จ`);
        }

        successCount++;
        Logger.log(`✅ สำเร็จ: ${storeName}\n`);

      } catch (error) {
        failedStores.push(`${storeName} (${error.message})`);
        Logger.log(`❌ ล้มเหลว: ${storeName} - ${error.message}\n`);
      }
    }

    // สรุปผล
    Logger.log('═══════════════════════════════════════');
    Logger.log('📊 สรุปผลการอัปเดต Schema');
    Logger.log('═══════════════════════════════════════');
    Logger.log(`✅ อัปเดตสำเร็จ: ${successCount} สาขา`);
    Logger.log(`⏭️  ข้าม (inactive): ${skippedCount} สาขา`);
    Logger.log(`❌ ล้มเหลว: ${failedStores.length} สาขา`);

    if (failedStores.length > 0) {
      Logger.log('\n⚠️  สาขาที่ล้มเหลว:');
      failedStores.forEach(store => Logger.log(`   - ${store}`));
    }

    Logger.log('═══════════════════════════════════════\n');

    return {
      success: true,
      successCount,
      skippedCount,
      failedCount: failedStores.length,
      failedStores
    };

  } catch (error) {
    Logger.log('❌ Error in updateDepositSheetsSchema: ' + error);
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * สร้าง 6 Sheets สำหรับระบบฝากเหล้าในสาขา
 * @param {string} storeSheetId - Sheet ID ของสาขา
 * @param {string} storeId - Store ID (reserved for future use)
 *
 * NOTE: ฟังก์ชันนี้เหมือนกันกับที่อยู่ใน รหัส.js - ใช้สำหรับ Setup.js เท่านั้น
 * ถ้าแก้ไข schema ต้องแก้ทั้ง 2 ที่
 */
function createDepositSheets(storeSheetId, storeId = null) {
  try {
    const storeSS = SpreadsheetApp.openById(storeSheetId);

    // ตรวจสอบว่ามี sheets อยู่แล้วหรือไม่
    const existingSheets = storeSS.getSheets().map(s => s.getName());
    const depositSheets = ['Deposits', 'Deposit_Requests', 'Withdrawals', 'Withdrawal_Requests', 'Transfer_Requests', 'Deposit_History'];

    const alreadyExists = depositSheets.some(name => existingSheets.includes(name));
    if (alreadyExists) {
      console.log(`⚠ สาขานี้มี Deposit Sheets อยู่แล้ว`);
      return { success: false, message: 'Sheets already exist' };
    }

    // 1. Deposits - รายการฝากทั้งหมด
    const depositsSheet = storeSS.insertSheet('Deposits');
    const depositsHeaders = [
      'deposit_id', 'deposit_code', 'store_id', 'line_user_id', 'customer_name',
      'customer_phone', 'product_name', 'category', 'quantity', 'remaining_percent', 'remaining_qty', 'table_number',
      'deposit_date', 'expiry_date', 'is_vip', 'status', 'photo_url',
      'received_by', 'confirmed_by', 'notes', 'created_at', 'updated_at'
    ];
    depositsSheet.getRange(1, 1, 1, depositsHeaders.length).setValues([depositsHeaders]);

    // 2. Deposit_Requests - คำขอฝากจาก LINE
    const depositRequestsSheet = storeSS.insertSheet('Deposit_Requests');
    const depositRequestsHeaders = [
      'request_id', 'store_id', 'line_user_id', 'customer_name', 'customer_phone',
      'product_name', 'category', 'quantity', 'remaining_percent', 'table_number', 'notes', 'status',
      'request_date', 'processed_by', 'processed_at', 'deposit_id'
    ];
    depositRequestsSheet.getRange(1, 1, 1, depositRequestsHeaders.length).setValues([depositRequestsHeaders]);

    // 3. Withdrawals - ประวัติการเบิก
    const withdrawalsSheet = storeSS.insertSheet('Withdrawals');
    const withdrawalsHeaders = [
      'withdrawal_id', 'deposit_id', 'deposit_code', 'line_user_id', 'customer_name',
      'requested_qty', 'actual_qty', 'table_number', 'withdrawal_date',
      'processed_by', 'notes', 'created_at'
    ];
    withdrawalsSheet.getRange(1, 1, 1, withdrawalsHeaders.length).setValues([withdrawalsHeaders]);

    // 4. Withdrawal_Requests - คำขอเบิกจาก LINE
    const withdrawalRequestsSheet = storeSS.insertSheet('Withdrawal_Requests');
    const withdrawalRequestsHeaders = [
      'request_id', 'deposit_id', 'deposit_code', 'line_user_id',
      'requested_qty', 'table_number', 'notes', 'status',
      'request_date', 'processed_by', 'processed_at', 'withdrawal_id'
    ];
    withdrawalRequestsSheet.getRange(1, 1, 1, withdrawalRequestsHeaders.length).setValues([withdrawalRequestsHeaders]);

    // 5. Transfer_Requests - คำขอโอนคลังกลาง
    const transferRequestsSheet = storeSS.insertSheet('Transfer_Requests');
    const transferRequestsHeaders = [
      'transfer_id', 'transfer_code', 'from_store_id', 'deposit_ids', 'total_items',
      'transfer_date', 'confirm_date', 'photo_url', 'confirm_photo_url',
      'status', 'notes', 'confirmed_by', 'created_by', 'created_at'
    ];
    transferRequestsSheet.getRange(1, 1, 1, transferRequestsHeaders.length).setValues([transferRequestsHeaders]);

    // 6. Deposit_History - ประวัติทั้งหมด (เบิกหมด/หมดอายุ/โอนคลัง)
    const depositHistorySheet = storeSS.insertSheet('Deposit_History');
    const depositHistoryHeaders = [
      'history_id', 'deposit_id', 'deposit_code', 'customer_name', 'product_name', 'category',
      'original_qty', 'final_status', 'status_date', 'transfer_id',
      'notes', 'archived_at'
    ];
    depositHistorySheet.getRange(1, 1, 1, depositHistoryHeaders.length).setValues([depositHistoryHeaders]);

    // จัดรูปแบบ Headers ทุก sheet
    const allSheets = [
      depositsSheet, depositRequestsSheet, withdrawalsSheet,
      withdrawalRequestsSheet, transferRequestsSheet, depositHistorySheet
    ];

    allSheets.forEach(sheet => {
      const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn());
      headerRow.setBackground('#7c3aed').setFontColor('#FFFFFF').setFontWeight('bold');
      sheet.setFrozenRows(1);
      sheet.autoResizeColumns(1, sheet.getLastColumn());
    });

    console.log(`✓ สร้าง 6 Deposit Sheets สำเร็จ`);

    return {
      success: true,
      message: 'Created 6 deposit sheets successfully',
      sheets: depositSheets
    };

  } catch (error) {
    console.error('Error in createDepositSheets:', error);
    return {
      success: false,
      message: error.toString()
    };
  }
}

function generateTestLinks() {
  const startTime = new Date();
  
  try {
    // เปิด Master Spreadsheet
    const masterSS = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    const storeSheet = masterSS.getSheetByName(CONFIG.MASTER_SHEETS.STORES);
    
    if (!storeSheet) {
      throw new Error(`ไม่พบ sheet "${CONFIG.MASTER_SHEETS.STORES}" ใน Master Spreadsheet`);
    }
    
    // รับวันที่ปัจจุบัน
    const today = new Date();
    const dateStr = Utilities.formatDate(today, CONFIG.DEFAULT_TIMEZONE, 'yyyy-MM-dd');
    const dateDisplay = Utilities.formatDate(today, CONFIG.DEFAULT_TIMEZONE, 'dd/MM/yyyy');
    
    // อ่านข้อมูลทั้งหมดจาก Stores sheet
    const data = storeSheet.getDataRange().getValues();
    
    // หา index ของ columns ที่ต้องการ
    const headers = data[0];
    const columns = {
      store_id: headers.indexOf('store_id'),
      store_code: headers.indexOf('store_code'),
      store_name: headers.indexOf('store_name'),
      active: headers.indexOf('active'),
      sheet_id: headers.indexOf('sheet_id'),
      manager_id: headers.indexOf('manager_id')
    };
    
    // ตรวจสอบว่าพบ columns ที่จำเป็น
    if (columns.store_id === -1 || columns.store_name === -1 || columns.active === -1) {
      throw new Error('ไม่พบ column ที่จำเป็น (store_id, store_name, active)');
    }
    
    // สร้าง output array
    const output = [];
    output.push('='.repeat(100));
    output.push(`🔗 ลิงก์ทดสอบระบบนับสต๊อก - วันที่ ${dateDisplay}`);
    output.push('='.repeat(100));
    output.push(`Web App URL: ${CONFIG.WEB_APP_URL}`);
    output.push(`Master Sheet ID: ${CONFIG.MASTER_SHEET_ID}`);
    output.push('='.repeat(100));
    output.push('');
    
    let activeStoreCount = 0;
    const storeLinks = [];
    
    // วนลูปสร้างลิงก์สำหรับแต่ละสาขา (เริ่มจากแถวที่ 2 เพราะแถวแรกเป็น header)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // ตรวจสอบว่า active = TRUE
      const isActive = row[columns.active] === true || row[columns.active] === 'TRUE';
      if (!isActive) continue;
      
      const storeId = row[columns.store_id];
      const storeCode = row[columns.store_code] || '';
      const storeName = row[columns.store_name] || 'ไม่ระบุชื่อ';
      const sheetId = row[columns.sheet_id] || '';
      const managerId = row[columns.manager_id] || '';
      
      // ข้ามถ้าไม่มี store_id
      if (!storeId || storeId === '') continue;
      
      activeStoreCount++;
      
      // สร้างลิงก์สำหรับ 3 หน้า
      const baseUrl = CONFIG.WEB_APP_URL;
      const dailycheckUrl = `${baseUrl}?page=dailycheck&store=${storeId}&date=${dateStr}`;
      const explanationUrl = `${baseUrl}?page=explanation&store=${storeId}&date=${dateStr}`;
      const approvalUrl = `${baseUrl}?page=approval&store=${storeId}&date=${dateStr}`;
      
      // เพิ่มข้อมูลสาขาในผลลัพธ์
      output.push(`📍 ${activeStoreCount}. สาขา: ${storeName}${storeCode ? ` (${storeCode})` : ''}`);
      output.push('─'.repeat(80));
      output.push(`   Store ID: ${storeId}`);
      if (sheetId) output.push(`   Sheet ID: ${sheetId}`);
      if (managerId) output.push(`   Manager ID: ${managerId}`);
      output.push('');
      
      output.push('   📋 ลิงก์เช็คสต๊อก (dailycheck):');
      output.push(`      ${dailycheckUrl}`);
      output.push('');
      
      output.push('   📝 ลิงก์ชี้แจงผลต่างสต๊อก (explanation):');
      output.push(`      ${explanationUrl}`);
      output.push('');
      
      output.push('   ✅ ลิงก์อนุมัติรายการผลต่าง (approval):');
      output.push(`      ${approvalUrl}`);
      output.push('');
      output.push('');
      
      // เก็บข้อมูลลิงก์ไว้ใน array สำหรับการประมวลผลเพิ่มเติม
      storeLinks.push({
        storeId,
        storeCode,
        storeName,
        sheetId,
        managerId,
        dailycheckUrl,
        explanationUrl,
        approvalUrl
      });
    }
    
    // สรุปผลการทำงาน
    const endTime = new Date();
    const processingTime = (endTime - startTime) / 1000;
    
    output.push('='.repeat(100));
    output.push('📊 สรุปผลการสร้างลิงก์ทดสอบ');
    output.push('─'.repeat(80));
    output.push(`✅ พบสาขาที่ active ทั้งหมด: ${activeStoreCount} สาขา`);
    output.push(`⏱️ เวลาที่ใช้ในการประมวลผล: ${processingTime.toFixed(2)} วินาที`);
    output.push(`📅 วันที่สร้างลิงก์: ${dateDisplay}`);
    output.push('='.repeat(100));
    
    // แสดงใน Logger
    const finalOutput = output.join('\n');
    Logger.log(finalOutput);
    
    // Log เพิ่มเติมถ้า ENABLE_DETAILED_LOGS เปิดอยู่
    if (CONFIG.ENABLE_DETAILED_LOGS) {
      Logger.log('\n📦 Store Links Data (JSON):');
      Logger.log(JSON.stringify(storeLinks, null, 2));
    }
    
    // Return ข้อมูลสำหรับใช้ต่อ
    return {
      success: true,
      message: `สร้างลิงก์สำหรับ ${activeStoreCount} สาขาเรียบร้อยแล้ว`,
      totalStores: activeStoreCount,
      processingTime: processingTime,
      date: dateStr,
      links: storeLinks,
      output: finalOutput
    };
    
  } catch (error) {
    const errorMsg = `❌ Error in generateTestLinks: ${error.toString()}`;
    Logger.log(errorMsg);
    
    if (CONFIG.ENABLE_DETAILED_LOGS) {
      Logger.log('Stack trace:');
      Logger.log(error.stack);
    }
    
    return {
      success: false,
      message: errorMsg,
      error: error.toString()
    };
  }
}




/**
 * =================================================================
 * FLEX MESSAGE GENERATOR
 * สำหรับสร้าง JSON Object ของ Flex Message ในรูปแบบต่างๆ
 * =================================================================
 */



function generateFlexMessage(eventType, data) {
  // สร้าง URL สำหรับปุ่ม Action ต่างๆ
  const explanationLink = `${CONFIG.WEB_APP_URL}?page=explanation&store=${data.storeId}&date=${data.date}`;
  const approvalLink = `${CONFIG.WEB_APP_URL}?page=approval&store=${data.storeId}&date=${data.date}`;
  const dailyCheckLink = `${CONFIG.WEB_APP_URL}?page=dailycheck&store=${data.storeId}&date=${data.date}`;

  // แทนที่ค่า Placeholder ใน Template
  const replacePlaceholders = (templateString, replacements) => {
    let jsonString = templateString;
    for (const key in replacements) {
      jsonString = jsonString.replace(new RegExp(`{{${key}}}`, 'g'), replacements[key]);
    }
    return JSON.parse(jsonString);
  };

  switch (eventType) {
    case 'DAILY_REMINDER':
      return replacePlaceholders(getDailyReminderTemplate(), {
        displayDate: formatDateForFlex(data.date),
        branchName: data.storeName,
        actionUri: dailyCheckLink
      });

    case 'COMPARISON_SHORT':
      return replacePlaceholders(getDiscrepancyShortTemplate(data.items), {
        displayDate: formatDateForFlex(data.date),
        branchName: data.storeName,
        actionUri: explanationLink
      });

    case 'COMPARISON_OVER':
      return replacePlaceholders(getDiscrepancyOverTemplate(data.items), {
        displayDate: formatDateForFlex(data.date),
        branchName: data.storeName,
        actionUri: explanationLink
      });

    case 'COMPARISON_MATCHED':
      return replacePlaceholders(getNoDifferenceTemplate(), {
        displayDate: formatDateForFlex(data.date),
        branchName: data.storeName,
        actionUri: dailyCheckLink
      });

    case 'STAFF_EXPLANATION':
  return replacePlaceholders(getStaffExplanationTemplate(data), { // [!code ++]
    displayDate: formatDateForFlex(data.date),
    branchName: data.storeName,
    actionUri: approvalLink
  });

case 'STOCK_ADJUSTMENT':
      return replacePlaceholders(getStockAdjustmentTemplate(data), {
        displayDate: formatDateForFlex(data.date),
        branchName: data.storeName,
        updatedBy: data.updatedBy,
        actionUri: explanationLink 
      });



    // เพิ่ม case ใหม่สำหรับการแจ้งผลการตัดสินใจ
    case 'OWNER_APPROVED':
      return replacePlaceholders(getOwnerApprovedTemplate(data.items, data.remark), {
        displayDate: formatDateForFlex(data.date),
        branchName: data.storeName,
        actionUri: explanationLink
      });

    case 'OWNER_REJECTED':
      return replacePlaceholders(getOwnerRejectedTemplate(data.items, data.remark), {
        displayDate: formatDateForFlex(data.date),
        branchName: data.storeName,
        actionUri: explanationLink  // ลิงค์ไปหน้า explanation
      });

    default:
      return null;
  }
}


/**
 * Helper: แปลงวันที่ 'YYYY-MM-DD' เป็น 'DD/MM/YYYY'
 */
function formatDateForFlex(dateString) {
  if (!dateString || dateString.length !== 10) return dateString;
  const parts = dateString.split('-');
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}


// ===================================
// FLEX MESSAGE TEMPLATES
// ===================================

function getDailyReminderTemplate() {
  return `{
    "type": "bubble", "size": "mega", "body": { "type": "box", "layout": "vertical", "paddingAll": "20px", "spacing": "14px", "contents": [ { "type": "box", "layout": "horizontal", "contents": [ { "type": "box", "layout": "vertical", "width": "36px", "height": "36px", "cornerRadius": "999px", "backgroundColor": "#2563EB", "contents": [ { "type": "text", "text": "📝", "size": "lg", "align": "center", "weight": "bold", "color": "#FFFFFF", "margin": "sm" } ] }, { "type": "box", "layout": "vertical", "margin": "md", "contents": [ { "type": "text", "text": "ส่งยอดประจำวัน", "size": "lg", "weight": "bold", "color": "#111827", "wrap": true }, { "type": "text", "size": "xs", "color": "#6B7280", "wrap": true, "text": "POS & HANDSCOUNT" } ] } ] }, { "type": "box", "layout": "horizontal", "cornerRadius": "999px", "backgroundColor": "#E0E7FF", "paddingAll": "6px", "contents": [ { "type": "text", "text": "📅 {{displayDate}}", "size": "xs", "color": "#1E3A8A", "weight": "bold" }, { "type": "text", "text": "สาขา: {{branchName}}", "size": "xs", "color": "#1E3A8A" } ] }, { "type": "separator", "color": "#E5E7EB", "margin": "md" }, { "type": "text", "text": "กดปุ่มด้านล่างเพื่อส่งข้อมูล", "size": "xs", "color": "#6B7280", "align": "center", "margin": "none", "offsetTop": "lg" } ] }, "footer": { "type": "box", "layout": "vertical", "spacing": "sm", "contents": [ { "type": "button", "style": "primary", "height": "md", "color": "#2563EB", "action": { "type": "uri", "label": "เปิดแบบฟอร์มกรอกยอด", "uri": "{{actionUri}}" } } ], "flex": 0 }
  }`;
}

function getDiscrepancyShortTemplate(items) {
  const itemRows = items.map(item => `
    { "type": "box", "layout": "horizontal", "margin": "md", "contents": [
      { "type": "text", "text": "${item.product_name}", "size": "sm", "color": "#111827", "flex": 3, "wrap": true },
      { "type": "text", "text": "${item.manual_quantity}", "size": "sm", "color": "#111827", "align": "end", "flex": 1 },
      { "type": "text", "text": "${item.pos_quantity}", "size": "sm", "color": "#111827", "align": "end", "flex": 1 },
      { "type": "box", "layout": "vertical", "backgroundColor": "#FEE2E2", "cornerRadius": "999px", "paddingAll": "0.01px", "contents": [
        { "type": "text", "text": "${item.difference}", "size": "sm", "weight": "bold", "align": "center", "color": "#DC2626" }
        ], "flex": 1, "margin": "md" }
    ] }
  `).join(',');
  return `{
    "type": "bubble", "size": "mega", "header": { "type": "box", "layout": "vertical", "height": "60px", "paddingAll": "12px", "contents": [ { "type": "box", "layout": "vertical", "position": "absolute", "width": "140px", "height": "140px", "cornerRadius": "999px", "backgroundColor": "#00000000", "borderWidth": "14px", "borderColor": "#FFFFFF22", "offsetTop": "-56px", "offsetEnd": "-44px", "contents": [] }, { "type": "box", "layout": "vertical", "position": "absolute", "width": "88px", "height": "88px", "cornerRadius": "999px", "backgroundColor": "#FFFFFF1A", "offsetTop": "6px", "offsetEnd": "8px", "contents": [] }, 
      { 
        "type": "box", 
        "layout": "horizontal", 
        "contents": [ 
          { "type": "box", "layout": "vertical", "width": "32px", "height": "32px", "cornerRadius": "999px", "backgroundColor": "#FFFFFF", "contents": [ { "type": "text", "text": "🚨", "size": "lg", "weight": "bold", "align": "center", "color": "#EF4444", "margin": "3px" } ] }, 
          {
            "type": "box",
            "layout": "vertical",
            "justifyContent": "center",
            "alignItems": "flex-end",
            "contents": [
              {
                "type": "text",
                "text": "{{displayDate}}",
                "color": "#FFFFFF",
                "size": "sm",
                "weight": "bold"
              }
            ]
          }
        ]
      } 
    ] }, "body": { "type": "box", "layout": "vertical", "paddingAll": "20px", "spacing": "14px", "contents": [ { "type": "box", "layout": "vertical", "contents": [ { "type": "text", "text": "Short ⚠️ (สาขา: {{branchName}})", "weight": "bold", "size": "lg", "color": "#B91C1C", "wrap": true }, { "type": "text", "text": "สินค้าคงเหลือไม่ตรงกับ POS", "size": "xs", "color": "#B91C1C", "wrap": true } ] }, { "type": "separator", "color": "#FECACA", "margin": "md" }, { "type": "box", "layout": "vertical", "backgroundColor": "#FEF2F2", "cornerRadius": "20px", "paddingAll": "16px", "contents": [ { "type": "box", "layout": "horizontal", "contents": [ { "type": "text", "text": "รายการสินค้า", "size": "xs", "weight": "bold", "color": "#6B7280", "flex": 3 }, { "type": "text", "text": "นับมือ", "size": "xs", "weight": "bold", "color": "#6B7280", "align": "end", "flex": 1 }, { "type": "text", "text": "POS", "size": "xs", "weight": "bold", "color": "#6B7280", "align": "end", "flex": 1 }, { "type": "text", "text": "DIFF", "size": "xs", "weight": "bold", "color": "#6B7280", "align": "end", "flex": 1 } ] }, { "type": "separator", "margin": "sm", "color": "#FECACA" }, ${itemRows} ] } ] }, "footer": { "type": "box", "layout": "vertical", "spacing": "sm", "contents": [ { "type": "button", "style": "primary", "color": "#EF4444", "height": "md", "action": { "type": "uri", "label": "สินค้าไม่ครบ โปรดชี้แจง", "uri": "{{actionUri}}" } } ], "flex": 0 }, "styles": { "header": { "backgroundColor": "#EF4444" } }
  }`;
}


function getDiscrepancyOverTemplate(items) {
  const itemRows = items.map(item => `
    { "type": "box", "layout": "horizontal", "margin": "md", "contents": [
      { "type": "text", "text": "${item.product_name}", "size": "sm", "color": "#111827", "flex": 3, "wrap": true },
      { "type": "text", "text": "${item.manual_quantity}", "size": "sm", "color": "#111827", "align": "end", "flex": 1 },
      { "type": "text", "text": "${item.pos_quantity}", "size": "sm", "color": "#111827", "align": "end", "flex": 1 },
      { "type": "box", "layout": "vertical", "backgroundColor": "#DBEAFE", "cornerRadius": "999px", "paddingAll": "0.01px", "contents": [
        { "type": "text", "text": "+${item.difference}", "size": "sm", "weight": "bold", "align": "center", "color": "#1D4ED8" }
        ], "flex": 1, "margin": "md" }
    ] }
  `).join(',');
  return `{
    "type": "bubble", "size": "mega", "header": { "type": "box", "layout": "vertical", "height": "52px", "paddingAll": "12px", "contents": [ { "type": "box", "layout": "vertical", "position": "absolute", "width": "140px", "height": "140px", "cornerRadius": "999px", "backgroundColor": "#00000000", "borderWidth": "14px", "borderColor": "#FFFFFF22", "offsetTop": "-56px", "offsetEnd": "-44px", "contents": [] }, { "type": "box", "layout": "vertical", "position": "absolute", "width": "88px", "height": "88px", "cornerRadius": "999px", "backgroundColor": "#FFFFFF1A", "offsetTop": "18px", "offsetEnd": "6px", "contents": [] }, 
      { 
        "type": "box", 
        "layout": "horizontal", 
        "contents": [ 
          { "type": "box", "layout": "vertical", "width": "32px", "height": "32px", "cornerRadius": "999px", "backgroundColor": "#FFFFFF", "contents": [ { "type": "text", "size": "lg", "weight": "bold", "align": "center", "color": "#1D4ED8", "margin": "3px", "text": "🚨" } ] }, 
          {
            "type": "box",
            "layout": "vertical",
            "justifyContent": "center",
            "alignItems": "flex-end",
            "contents": [
              {
                "type": "text",
                "text": "{{displayDate}}",
                "color": "#FFFFFF",
                "size": "sm",
                "weight": "bold"
              }
            ]
          }
        ]
      } 
    ] }, "body": { "type": "box", "layout": "vertical", "paddingAll": "16px", "spacing": "md", "contents": [ { "type": "text", "text": "Over ⚠️ (สาขา: {{branchName}})", "weight": "bold", "size": "lg", "color": "#1E3A8A" }, { "type": "text", "text": "สินค้ามีจำนวนเกินกว่าใน Stock", "size": "xs", "color": "#1D4ED8", "wrap": true }, { "type": "separator", "color": "#BFDBFE", "margin": "md" }, { "type": "box", "layout": "vertical", "backgroundColor": "#EFF6FF", "cornerRadius": "16px", "paddingAll": "14px", "contents": [ { "type": "box", "layout": "horizontal", "contents": [ { "type": "text", "text": "รายการสินค้า", "size": "xs", "weight": "bold", "color": "#1E40AF", "flex": 3 }, { "type": "text", "text": "นับมือ", "size": "xs", "weight": "bold", "color": "#1E40AF", "align": "end", "flex": 1 }, { "type": "text", "text": "POS", "size": "xs", "weight": "bold", "color": "#1E40AF", "align": "end", "flex": 1 }, { "type": "text", "text": "DIFF", "size": "xs", "weight": "bold", "color": "#1E40AF", "align": "end", "flex": 1 } ] }, { "type": "separator", "margin": "sm", "color": "#BFDBFE" }, ${itemRows} ] } ] }, "footer": { "type": "box", "layout": "vertical", "spacing": "sm", "contents": [ { "type": "button", "style": "primary", "color": "#2563EB", "height": "md", "action": { "type": "uri", "label": "สินค้าเกิน โปรดชี้แจง", "uri": "{{actionUri}}" } } ] }, "styles": { "header": { "backgroundColor": "#1D4ED8" } }
  }`;
}



function getNoDifferenceTemplate() {
  return `{
    "type": "bubble", "size": "mega", "header": { "type": "box", "layout": "vertical", "height": "52px", "paddingAll": "12px", "contents": [ { "type": "box", "layout": "vertical", "position": "absolute", "width": "140px", "height": "140px", "cornerRadius": "999px", "backgroundColor": "#00000000", "borderWidth": "14px", "borderColor": "#FFFFFF22", "offsetTop": "-56px", "offsetEnd": "-44px", "contents": [] }, { "type": "box", "layout": "vertical", "position": "absolute", "width": "88px", "height": "88px", "cornerRadius": "999px", "backgroundColor": "#FFFFFF1A", "offsetTop": "18px", "offsetEnd": "6px", "contents": [] }, 
      { 
        "type": "box", 
        "layout": "horizontal", 
        "contents": [ 
          { "type": "box", "layout": "vertical", "width": "32px", "height": "32px", "cornerRadius": "999px", "backgroundColor": "#FFFFFF", "contents": [ { "type": "text", "size": "lg", "weight": "bold", "align": "center", "color": "#EF4444", "margin": "3px", "text": "✅" } ] },
          {
            "type": "box",
            "layout": "vertical",
            "justifyContent": "center",
            "alignItems": "flex-end",
            "contents": [
              {
                "type": "text",
                "text": "{{displayDate}}",
                "color": "#FFFFFF",
                "size": "sm",
                "weight": "bold"
              }
            ]
          }
        ]
      } 
    ] }, "body": { "type": "box", "layout": "vertical", "paddingAll": "16px", "spacing": "md", "contents": [ { "type": "text", "text": "Success 🎉 (สาขา: {{branchName}})", "weight": "bold", "size": "lg", "color": "#065F46" }, { "type": "text", "text": "สินค้าครบถ้วนทุกรายการ", "size": "xs", "color": "#047857", "wrap": true }, { "type": "separator", "color": "#E5E7EB", "margin": "md" }, { "type": "box", "layout": "vertical", "backgroundColor": "#F0FDF4", "cornerRadius": "16px", "paddingAll": "14px", "contents": [ { "type": "box", "layout": "horizontal", "contents": [ { "type": "text", "text": "รายการสินค้า", "size": "xs", "weight": "bold", "color": "#6B7280", "flex": 3 }, { "type": "text", "text": "นับมือ", "size": "xs", "weight": "bold", "color": "#6B7280", "align": "end", "flex": 1 }, { "type": "text", "text": "POS", "size": "xs", "weight": "bold", "color": "#6B7280", "align": "end", "flex": 1 }, { "type": "text", "text": "DIFF", "size": "xs", "weight": "bold", "color": "#6B7280", "flex": 1, "align": "end" } ] }, { "type": "separator", "margin": "sm", "color": "#E5E7EB" }, { "type": "box", "layout": "horizontal", "margin": "md", "contents": [ { "type": "text", "text": "No Difference", "size": "sm", "color": "#111827", "flex": 3, "wrap": true }, { "type": "text", "text": "-", "size": "sm", "color": "#111827", "align": "end", "flex": 1 }, { "type": "text", "text": "-", "size": "sm", "color": "#111827", "align": "end", "flex": 1 }, { "type": "text", "text": "-", "size": "sm", "color": "#111827", "align": "end", "flex": 1 } ] } ] } ] }, "footer": { "type": "box", "layout": "vertical", "spacing": "sm", "contents": [ { "type": "button", "style": "primary", "color": "#22C55E", "height": "md", "action": { "type": "uri", "label": "ดูรายการตรวจนับ", "uri": "{{actionUri}}" } } ] }, "styles": { "header": { "backgroundColor": "#10B981" } }
  }`;
}



function getSuccessWithToleranceTemplate(items) {
  const itemRows = items.map(item => `
    { "type": "box", "layout": "horizontal", "margin": "md", "contents": [
      { "type": "text", "text": "${item.product_name}", "size": "sm", "color": "#111827", "flex": 3, "wrap": true },
      { "type": "text", "text": "${item.manual_quantity}", "size": "sm", "color": "#111827", "align": "end", "flex": 1 },
      { "type": "text", "text": "${item.pos_quantity}", "size": "sm", "color": "#111827", "align": "end", "flex": 1 },
      { "type": "box", "layout": "vertical", "backgroundColor": "#DCFCE7", "cornerRadius": "999px", "paddingAll": "0.01px", "contents": [
        { "type": "text", "text": "${item.difference > 0 ? '+' : ''}${item.difference}", "size": "sm", "weight": "bold", "align": "center", "color": "#16A34A" }
      ], "flex": 1, "margin": "md" }
    ] }
  `).join(',');

  return `{
    "type": "bubble", "size": "mega", "header": { "type": "box", "layout": "vertical", "height": "52px", "paddingAll": "12px", "contents": [ { "type": "box", "layout": "vertical", "position": "absolute", "width": "140px", "height": "140px", "cornerRadius": "999px", "backgroundColor": "#00000000", "borderWidth": "14px", "borderColor": "#FFFFFF22", "offsetTop": "-56px", "offsetEnd": "-44px", "contents": [] }, { "type": "box", "layout": "vertical", "position": "absolute", "width": "88px", "height": "88px", "cornerRadius": "999px", "backgroundColor": "#FFFFFF1A", "offsetTop": "18px", "offsetEnd": "6px", "contents": [] }, { "type": "box", "layout": "horizontal", "contents": [ { "type": "box", "layout": "vertical", "width": "32px", "height": "32px", "cornerRadius": "999px", "backgroundColor": "#FFFFFF", "contents": [ { "type": "text", "size": "lg", "weight": "bold", "align": "center", "color": "#EF4444", "margin": "3px", "text": "✅" } ] }, { "type": "filler" } ] } ] }, "body": { "type": "box", "layout": "vertical", "paddingAll": "16px", "spacing": "md", "contents": [ { "type": "text", "text": "Success 🎉 (สาขา: {{branchName}})", "weight": "bold", "size": "lg", "color": "#065F46" }, { "type": "text", "text": "สินค้าครบถ้วน ส่วนต่างอยู่ในเกณฑ์ยอมรับได้", "size": "xs", "color": "#047857", "wrap": true }, { "type": "separator", "color": "#E5E7EB", "margin": "md" }, { "type": "box", "layout": "vertical", "backgroundColor": "#F0FDF4", "cornerRadius": "16px", "paddingAll": "14px", "contents": [ { "type": "box", "layout": "horizontal", "contents": [ { "type": "text", "text": "รายการสินค้า", "size": "xs", "weight": "bold", "color": "#6B7280", "flex": 3 }, { "type": "text", "text": "นับมือ", "size": "xs", "weight": "bold", "color": "#6B7280", "align": "end", "flex": 1 }, { "type": "text", "text": "POS", "size": "xs", "weight": "bold", "color": "#6B7280", "align": "end", "flex": 1 }, { "type": "text", "text": "DIFF", "size": "xs", "weight": "bold", "color": "#6B7280", "align": "end", "flex": 1 } ] }, { "type": "separator", "margin": "sm", "color": "#E5E7EB" }, ${itemRows} ] }, { "type": "text", "text": "สินค้าครบถ้วน มีส่วนต่างเพียงเล็กน้อย..", "size": "xs", "color": "#065F46", "align": "center", "margin": "md", "offsetTop": "md" } ] }, "footer": { "type": "box", "layout": "vertical", "spacing": "sm", "contents": [ { "type": "button", "style": "primary", "color": "#22C55E", "height": "md", "action": { "type": "uri", "label": "ดูรายการตรวจนับ", "uri": "{{actionUri}}" } } ] }, "styles": { "header": { "backgroundColor": "#10B981" } }
  }`;
}

function getApprovedTemplate(items, remark) {
  const itemRows = items.map(item => `
    { "type": "box", "layout": "horizontal", "margin": "md", "contents": [
      { "type": "text", "text": "${item.product_name}", "size": "sm", "color": "#111827", "flex": 3, "wrap": true },
      { "type": "text", "text": "${item.manual_quantity}", "size": "sm", "color": "#111827", "align": "end", "flex": 1 },
      { "type": "text", "text": "${item.pos_quantity}", "size": "sm", "color": "#111827", "align": "end", "flex": 1 },
      { "type": "box", "layout": "vertical", "backgroundColor": "#DCFCE7", "cornerRadius": "999px", "paddingAll": "0.01px", "contents": [
        { "type": "text", "text": "${item.difference > 0 ? '+' : ''}${item.difference}", "size": "sm", "weight": "bold", "align": "center", "color": "#16A34A" }
      ], "flex": 1, "margin": "md" }
    ] }
  `).join(',');

  return `{
    "type": "bubble", "size": "mega", "body": { "type": "box", "layout": "vertical", "paddingAll": "16px", "spacing": "md", "contents": [ { "type": "text", "text": "✅ อนุมัติ (สาขา: {{branchName}})", "weight": "bold", "size": "lg", "color": "#065F46", "align": "center" }, { "type": "separator", "color": "#D1FAE5", "margin": "md" }, { "type": "box", "layout": "vertical", "backgroundColor": "#ECFDF5", "cornerRadius": "16px", "paddingAll": "14px", "contents": [ { "type": "box", "layout": "horizontal", "contents": [ { "type": "text", "text": "รายการสินค้า", "size": "xs", "weight": "bold", "color": "#047857", "flex": 3 }, { "type": "text", "text": "นับมือ", "size": "xs", "weight": "bold", "color": "#047857", "align": "end", "flex": 1 }, { "type": "text", "text": "POS", "size": "xs", "weight": "bold", "color": "#047857", "align": "end", "flex": 1 }, { "type": "text", "text": "DIFF", "size": "xs", "weight": "bold", "color": "#047857", "align": "end", "flex": 1 } ] }, { "type": "separator", "margin": "sm", "color": "#D1FAE5" }, ${itemRows} ] }, { "type": "text", "text": "REMARK", "size": "xs", "color": "#065F46", "align": "start", "margin": "md", "weight": "bold" }, { "type": "box", "layout": "vertical", "backgroundColor": "#ECFDF5", "cornerRadius": "16px", "paddingAll": "24px", "contents": [ { "type": "text", "text": "${remark || 'อนุมัติเรียบร้อย'}", "size": "xs", "weight": "bold", "color": "#047857", "align": "center", "flex": 1, "wrap": true } ] } ] }, "footer": { "type": "box", "layout": "vertical", "spacing": "sm", "contents": [ { "type": "button", "style": "primary", "color": "#22C55E", "height": "sm", "action": { "type": "uri", "label": "ตรวจสอบ", "uri": "{{actionUri}}" } } ] }
  }`;
}

function getRejectedTemplate(items, remark) {
  const itemRows = items.map(item => `
    { "type": "box", "layout": "horizontal", "margin": "md", "contents": [
      { "type": "text", "text": "${item.product_name}", "size": "sm", "color": "#111827", "flex": 3, "wrap": true },
      { "type": "text", "text": "${item.manual_quantity}", "size": "sm", "color": "#111827", "align": "end", "flex": 1 },
      { "type": "text", "text": "${item.pos_quantity}", "size": "sm", "color": "#111827", "align": "end", "flex": 1 },
      { "type": "box", "layout": "vertical", "backgroundColor": "#FEE2E2", "cornerRadius": "999px", "paddingAll": "0.01px", "contents": [
        { "type": "text", "text": "${item.difference > 0 ? '+' : ''}${item.difference}", "size": "sm", "weight": "bold", "align": "center", "color": "#DC2626" }
      ], "flex": 1, "margin": "md" }
    ] }
  `).join(',');

  return `{
    "type": "bubble", "size": "mega", "body": { "type": "box", "layout": "vertical", "paddingAll": "16px", "spacing": "md", "contents": [ { "type": "text", "text": "⚠️ ไม่อนุมัติ (สาขา: {{branchName}})", "weight": "bold", "size": "lg", "color": "#B91C1C", "align": "center" }, { "type": "separator", "color": "#E5E7EB", "margin": "md" }, { "type": "box", "layout": "vertical", "backgroundColor": "#FEF2F2", "cornerRadius": "16px", "paddingAll": "14px", "contents": [ { "type": "box", "layout": "horizontal", "contents": [ { "type": "text", "text": "รายการสินค้า", "size": "xs", "weight": "bold", "color": "#6B7280", "flex": 3 }, { "type": "text", "text": "นับมือ", "size": "xs", "weight": "bold", "color": "#6B7280", "align": "end", "flex": 1 }, { "type": "text", "text": "POS", "size": "xs", "weight": "bold", "color": "#6B7280", "align": "end", "flex": 1 }, { "type": "text", "text": "DIFF", "size": "xs", "weight": "bold", "color": "#6B7280", "align": "end", "flex": 1 } ] }, { "type": "separator", "margin": "sm", "color": "#E5E7EB" }, ${itemRows} ] }, { "type": "text", "text": "REMARK", "size": "xs", "color": "#B91C1C", "align": "start", "margin": "md", "weight": "bold" }, { "type": "box", "layout": "vertical", "backgroundColor": "#FEF2F2", "cornerRadius": "16px", "paddingAll": "24px", "contents": [ { "type": "text", "text": "${remark}", "size": "xs", "weight": "bold", "color": "#6B7280", "align": "center", "flex": 1, "wrap": true } ] } ] }, "footer": { "type": "box", "layout": "vertical", "spacing": "sm", "contents": [ { "type": "box", "layout": "horizontal", "spacing": "sm", "contents": [ { "type": "button", "style": "primary", "color": "#EF4444", "height": "sm", "action": { "type": "uri", "label": "แก้ไขคำชี้แจง", "uri": "{{actionUri}}" } }, { "type": "button", "style": "secondary", "color": "#F3F4F6", "height": "sm", "action": { "type": "uri", "label": "ดูรายละเอียด", "uri": "{{actionUri}}" } } ] } ] }
  }`;
}



/**
 * Template สำหรับแจ้งเตือนเมื่อพนักงานชี้แจง (ฉบับแก้ไข)
 * - แสดงคำชี้แจงจริง
 * - เปลี่ยนไอคอน
 */
function getStaffExplanationTemplate(data) {
  // สร้างส่วนแสดงรายการสินค้า
  const itemRows = data.items.map(item => `
    { "type": "box", "layout": "horizontal", "margin": "md", "contents": [
      { "type": "text", "text": "${item.product_name}", "size": "sm", "color": "#111827", "flex": 3, "wrap": true },
      { "type": "text", "text": "${item.manual_quantity}", "size": "sm", "color": "#111827", "align": "end", "flex": 1 },
      { "type": "text", "text": "${item.pos_quantity}", "size": "sm", "color": "#111827", "align": "end", "flex": 1 },
      { "type": "box", "layout": "vertical", "backgroundColor": "${item.difference < 0 ? '#FEE2E2' : '#DBEAFE'}", "cornerRadius": "999px", "paddingAll": "4px", "contents": [
          { "type": "text", "text": "${item.difference > 0 ? '+' : ''}${Math.abs(item.difference)}", "size": "sm", "weight": "bold", "align": "center", "color": "${item.difference < 0 ? '#DC2626' : '#1D4ED8'}" }
        ], "flex": 1, "margin": "md" }
    ] }
  `).join(',');

  // สร้างส่วนแสดงคำชี้แจงแบบไดนามิก
  const explanationRows = data.items
    .filter(item => item.explanation) // กรองเอารายการที่มีคำชี้แจงเท่านั้น
    .map(item => `
    {
      "type": "box",
      "layout": "vertical",
      "margin": "md",
      "spacing": "xs",
      "contents": [
        {
        
          "type": "text",
          "text": "${item.product_name}",
          "size": "sm",
          "color": "#92400E",
          "weight": "bold"
        },
        {
          "type": "text",
          "text": "${item.explanation.replace(/"/g, '\\"')}",
          "wrap": true,
   
           "size": "sm",
          "color": "#1F2937"
        }
      ]
    }
  `).join(',');

  return `{
    "type": "bubble", "size": "mega",
    "header": { "type": "box", "layout": "vertical", "height": "60px", "paddingAll": "12px", "backgroundColor": "#F59E0B", "contents": [
        { "type": "box", "layout": "horizontal", "contents": [
            { "type": "box", "layout": "vertical", "width": "32px", "height": "32px", "cornerRadius": "999px", "backgroundColor": "#FFFFFF", "contents": [
                { "type": "text", "text": "📝", "size": "lg", "weight": "bold", "align": "center", "color": "#F59E0B", "margin": "3px" }
            ]},
            { "type": "filler" }
        ]}
    ]},
    "body": { "type": "box", "layout": "vertical", "paddingAll": "20px", "spacing": "14px", "contents": [
        { "type": "box", "layout": "vertical", "contents": [
            { "type": "text", "text": "📋 พนักงานชี้แจงแล้ว", "weight": "bold", "size": "lg", "color": "#D97706", "wrap": true },
            { "type": "text", "text": "สาขา: {{branchName}}", "size": "xs", "color": "#92400E", "wrap": true, "margin": "xs" }
        ]},
        { "type": "box", "layout": "horizontal", "cornerRadius": "999px", "backgroundColor": "#FEF3C7", "paddingAll": "8px", "contents": [
            { "type": "text", "text": "📅 {{displayDate}}", "size": "xs", "color": "#78350F", "weight": "bold", "flex": 0 }
        ]},
        { "type": "separator", "color": "#FDE68A", "margin": "md" },
        { "type": "box", "layout": "vertical", "backgroundColor": "#FFFBEB", "cornerRadius": "16px", "paddingAll": "16px", "contents": [
            { "type": "box", "layout": "horizontal", "contents": [
                { "type": "text", "text": "รายการสินค้า", "size": "xs", "weight": "bold", "color": "#92400E", "flex": 3 },
                { "type": "text", "text": "นับมือ", "size": "xs", "weight": "bold", "color": "#92400E", "align": "end", "flex": 1 },
                { "type": "text", "text": "POS", "size": "xs", "weight": "bold", "color": "#92400E", "align": "end", "flex": 1 },
                { "type": "text", "text": "DIFF", "size": "xs", "weight": "bold", "color": "#92400E", "align": "end", "flex": 1 }
      
            ]},
            { "type": "separator", "margin": "sm", "color": "#FDE68A" },
            ${itemRows}
        ]},
        {
          "type": "box",
          "layout": "vertical",
          "margin": "lg",
          "backgroundColor": "#FEF3C7",
   
           "cornerRadius": "12px",
          "paddingAll": "12px",
          "contents": [
            {
              "type": "box",
              "layout": "horizontal",
              "spacing": "sm",
             
              "contents": [
                {
                  "type": "text",
                  "text": "💬",
                  "size": "lg",
                  "flex": 0
      
                },
                {
                  "type": "text",
                  "text": "คำชี้แจงจากพนักงาน",
                  "color": "#92400E",
                 
                  "weight": "bold",
                  "size": "sm"
                }
              ]
            },
            {
              "type": "separator",
          
              "margin": "md"
            },
            ${explanationRows}
          ]
        }
    ]},
    "footer": { "type": "box", "layout": "vertical", "spacing": "sm", "contents": [
        { "type": "button", "style": "primary", "color": "#F59E0B", "height": "md", "action": {
            "type": "uri", "label": "ตรวจสอบและอนุมัติ", "uri": "{{actionUri}}"
 
        }}
    ], "flex": 0 }
  }`;
}


/**
 * Template สำหรับแจ้งผลการอนุมัติจากเจ้าของ
 */
function getOwnerApprovedTemplate(items, remark) {
  const itemRows = items.map(item => `
    {
      "type": "box",
      "layout": "horizontal",
      "margin": "md",
      "contents": [
        {
          "type": "text",
          "text": "${item.product_name}",
          "size": "sm",
          "color": "#111827",
          "flex": 3,
          "wrap": true
        },
        {
          "type": "text",
          "text": "${item.manual_quantity}",
          "size": "sm",
          "color": "#111827",
          "align": "end",
          "flex": 1
        },
        {
          "type": "text",
          "text": "${item.pos_quantity}",
          "size": "sm",
          "color": "#111827",
          "align": "end",
          "flex": 1
        },
        {
          "type": "box",
          "layout": "vertical",
          "backgroundColor": "#DCFCE7",
          "cornerRadius": "9999px",
          "paddingAll": "0.01px",
          "contents": [
            {
              "type": "text",
              "text": "${item.difference > 0 ? '+' : ''}${item.difference}",
              "size": "sm",
              "weight": "bold",
              "align": "center",
              "color": "#16A34A"
            }
          ],
          "flex": 1,
          "margin": "md"
        }
      ]
    }
  `).join(',');

  return `{
    "type": "bubble",
    "size": "mega",
    "body": {
      "type": "box",
      "layout": "vertical",
      "paddingAll": "16px",
      "spacing": "14px",
      "contents": [
        {
          "type": "text",
          "text": "✅ อนุมัติ",
          "weight": "bold",
          "size": "lg",
          "color": "#065F46",
          "align": "center",
          "wrap": true
        },
        {
          "type": "box",
          "layout": "horizontal",
          "margin": "md",
          "backgroundColor": "#D1FAE5",
          "cornerRadius": "999px",
          "paddingAll": "8px",
          "paddingStart": "12px",
          "paddingEnd": "12px",
          "spacing": "sm",
          "contents": [
            {
              "type": "text",
              "text": "📅 {{displayDate}}",
              "size": "xs",
              "color": "#065F46",
              "weight": "bold"
            },
            {
              "type": "text",
              "text": "สาขา: {{branchName}}",
              "size": "xs",
              "color": "#065F46",
              "align": "end"
            }
          ]
        },
        {
          "type": "separator",
          "color": "#D1FAE5",
          "margin": "md"
        },
        {
          "type": "box",
          "layout": "vertical",
          "backgroundColor": "#ECFDF5",
          "cornerRadius": "16px",
          "paddingAll": "14px",
          "contents": [
            {
              "type": "box",
              "layout": "horizontal",
              "contents": [
                {
                  "type": "text",
                  "text": "รายการสินค้า",
                  "size": "xs",
                  "weight": "bold",
                  "color": "#047857",
                  "flex": 3
                },
                {
                  "type": "text",
                  "text": "นับมือ",
                  "size": "xs",
                  "weight": "bold",
                  "color": "#047857",
                  "align": "end",
                  "flex": 1
                },
                {
                  "type": "text",
                  "text": "POS",
                  "size": "xs",
                  "weight": "bold",
                  "color": "#047857",
                  "align": "end",
                  "flex": 1
                },
                {
                  "type": "text",
                  "text": "DIFF",
                  "size": "xs",
                  "weight": "bold",
                  "color": "#047857",
                  "align": "end",
                  "flex": 1
                }
              ]
            },
            {
              "type": "separator",
              "margin": "sm",
              "color": "#D1FAE5"
            },
            ${itemRows}
          ]
        },
        {
          "type": "text",
          "text": "REMARK",
          "size": "xs",
          "color": "#065F46",
          "align": "start",
          "margin": "md",
          "weight": "bold"
        },
        {
          "type": "box",
          "layout": "vertical",
          "backgroundColor": "#ECFDF5",
          "cornerRadius": "16px",
          "paddingAll": "24px",
          "contents": [
            {
              "type": "text",
              "text": "${remark || 'อนุมัติเรียบร้อย'}",
              "size": "xs",
              "weight": "bold",
              "color": "#047857",
              "align": "center",
              "flex": 1,
              "wrap": true
            }
          ]
        }
      ]
    },
    "footer": {
      "type": "box",
      "layout": "vertical",
      "spacing": "sm",
      "contents": [
        {
          "type": "button",
          "style": "primary",
          "color": "#22C55E",
          "height": "sm",
          "action": {
            "type": "uri",
            "label": "ตรวจสอบ",
            "uri": "{{actionUri}}"
          }
        }
      ]
    }
  }`;
}



/**
 * Template สำหรับแจ้งผลการปฏิเสธจากเจ้าของ
 */
function getOwnerRejectedTemplate(items, remark) {
  const itemRows = items.map(item => `
    {
      "type": "box",
      "layout": "horizontal",
      "margin": "md",
      "contents": [
        {
          "type": "text",
          "text": "${item.product_name}",
          "size": "sm",
          "color": "#111827",
          "flex": 3,
          "wrap": true
        },
        {
          "type": "text",
          "text": "${item.manual_quantity}",
          "size": "sm",
          "color": "#111827",
          "align": "end",
          "flex": 1
        },
        {
          "type": "text",
          "text": "${item.pos_quantity}",
          "size": "sm",
          "color": "#111827",
          "align": "end",
          "flex": 1
        },
        {
          "type": "box",
          "layout": "vertical",
          "backgroundColor": "#FEE2E2",
          "cornerRadius": "9999px",
          "paddingAll": "0.01px",
          "contents": [
            {
              "type": "text",
              "text": "${item.difference > 0 ? '+' : ''}${item.difference}",
              "size": "sm",
              "weight": "bold",
              "align": "center",
              "color": "#DC2626"
            }
          ],
          "flex": 1,
          "margin": "md"
        }
      ]
    }
  `).join(',');

  return `{
    "type": "bubble",
    "size": "mega",
    "body": {
      "type": "box",
      "layout": "vertical",
      "paddingAll": "16px",
      "spacing": "14px",
      "contents": [
        {
          "type": "text",
          "text": "⚠️ ไม่อนุมัติ",
          "weight": "bold",
          "size": "lg",
          "color": "#B91C1C",
          "align": "center",
          "wrap": true
        },
        {
          "type": "box",
          "layout": "horizontal",
          "margin": "md",
          "backgroundColor": "#FEE2E2",
          "cornerRadius": "999px",
          "paddingAll": "8px",
          "paddingStart": "12px",
          "paddingEnd": "12px",
          "spacing": "sm",
          "contents": [
            {
              "type": "text",
              "text": "📅 {{displayDate}}",
              "size": "xs",
              "color": "#991B1B",
              "weight": "bold"
            },
            {
              "type": "text",
              "text": "สาขา: {{branchName}}",
              "size": "xs",
              "color": "#991B1B",
              "align": "end"
            }
          ]
        },
        {
          "type": "separator",
          "color": "#E5E7EB",
          "margin": "md"
        },
        {
          "type": "box",
          "layout": "vertical",
          "backgroundColor": "#FEF2F2",
          "cornerRadius": "16px",
          "paddingAll": "14px",
          "contents": [
            {
              "type": "box",
              "layout": "horizontal",
              "contents": [
                {
                  "type": "text",
                  "text": "รายการสินค้า",
                  "size": "xs",
                  "weight": "bold",
                  "color": "#6B7280",
                  "flex": 3
                },
                {
                  "type": "text",
                  "text": "นับมือ",
                  "size": "xs",
                  "weight": "bold",
                  "color": "#6B7280",
                  "align": "end",
                  "flex": 1
                },
                {
                  "type": "text",
                  "text": "POS",
                  "size": "xs",
                  "weight": "bold",
                  "color": "#6B7280",
                  "align": "end",
                  "flex": 1
                },
                {
                  "type": "text",
                  "text": "DIFF",
                  "size": "xs",
                  "weight": "bold",
                  "color": "#6B7280",
                  "align": "end",
                  "flex": 1
                }
              ]
            },
            {
              "type": "separator",
              "margin": "sm",
              "color": "#E5E7EB"
            },
            ${itemRows}
          ]
        },
        {
          "type": "text",
          "text": "REMARK",
          "size": "xs",
          "color": "#B91C1C",
          "align": "start",
          "margin": "md",
          "weight": "bold"
        },
        {
          "type": "box",
          "layout": "vertical",
          "backgroundColor": "#FEF2F2",
          "cornerRadius": "16px",
          "paddingAll": "24px",
          "contents": [
            {
              "type": "text",
              "text": "${remark || 'ไม่อนุมัติ'}",
              "size": "xs",
              "weight": "bold",
              "color": "#6B7280",
              "align": "center",
              "flex": 1,
              "wrap": true
            }
          ]
        }
      ]
    },
    "footer": {
      "type": "box",
      "layout": "vertical",
      "spacing": "sm",
      "contents": [
        {
          "type": "button",
          "style": "primary",
          "color": "#EF4444",
          "height": "sm",
          "action": {
            "type": "uri",
            "label": "แก้ไขคำชี้แจง",
            "uri": "{{actionUri}}"
          }
        }
      ]
    }
  }`;
}









/**
 * Template สำหรับแจ้งเตือนเมื่อมีการแก้ไขการนับสต๊อก (ฉบับสมบูรณ์)
 */
function getStockAdjustmentTemplate(data) {
  // Section 1: สร้างรายการที่ถูกปรับแก้
  const adjustedItemRows = data.adjustedItems.map(item => `
    {
      "type": "box", "layout": "horizontal", "margin": "md", "contents": [
        { "type": "text", "text": "${item.product_name.replace(/"/g, '\\"')}", "size": "sm", "color": "#111827", "flex": 3, "wrap": true },
        { "type": "box", "layout": "horizontal", "flex": 2, "justifyContent": "flex-end", "spacing": "sm", "contents": [
            { "type": "text", "text": "${item.original_quantity}", "size": "sm", "color": "#EF4444", "flex": 0, "decoration": "line-through" },
            { "type": "text", "text": "→", "size": "sm", "color": "#6B7280", "flex": 0 },
            { "type": "text", "text": "${item.new_quantity}", "size": "sm", "color": "#10B981", "weight": "bold", "flex": 0 }
        ]}
      ]
    }
  `).join(',');

  // Section 2: สร้างรายการที่ยังคงไม่ตรง
  const remainingDiffRows = data.remainingDiffItems.map(item => `
    {
      "type": "box", "layout": "horizontal", "margin": "md", "contents": [
        { "type": "text", "text": "${item.product_name.replace(/"/g, '\\"')}", "size": "sm", "color": "#111827", "flex": 3, "wrap": true },
        { "type": "text", "text": "${item.manual_quantity}", "size": "sm", "color": "#111827", "align": "center", "flex": 1 },
        { "type": "text", "text": "${item.pos_quantity}", "size": "sm", "color": "#111827", "align": "center", "flex": 1 },
        { "type": "text", "text": "${item.difference > 0 ? '+' : ''}${item.difference}", "size": "sm", "color": "${item.difference < 0 ? '#DC2626' : '#1D4ED8'}", "weight": "bold", "align": "end", "flex": 1 }
      ]
    }
  `).join(',');
  
  const hasRemainingDiff = data.remainingDiffItems.length > 0;

  return `{
    "type": "bubble", "size": "giga",
    "header": { "type": "box", "layout": "vertical", "paddingAll": "12px", "backgroundColor": "#F97316", "contents": [
      { "type": "box", "layout": "horizontal", "contents": [
        { "type": "box", "layout": "vertical", "width": "32px", "height": "32px", "cornerRadius": "999px", "backgroundColor": "#FFFFFF", "contents": [
          { "type": "text", "text": "✏️", "size": "lg", "weight": "bold", "align": "center", "color": "#F97316", "margin": "3px" }
        ]},
        { "type": "box", "layout": "vertical", "margin": "md", "contents": [
          { "type": "text", "text": "แจ้งปรับสต็อก", "color": "#FFFFFF", "size": "lg", "weight": "bold" },
          { "type": "text", "text": "สาขา: {{branchName}}", "color": "#FED7AA", "size": "xs" }
        ]}
      ]}
    ]},
    "body": { "type": "box", "layout": "vertical", "paddingAll": "16px", "spacing": "lg", "contents": [
      { "type": "box", "layout": "horizontal", "backgroundColor": "#FFF7ED", "cornerRadius": "md", "paddingAll": "8px", "contents": [
        { "type": "text", "text": "📅 วันที่: {{displayDate}}", "size": "sm", "color": "#9A3412", "weight": "bold" },
        { "type": "text", "text": "👤 ผู้แก้ไข: {{updatedBy}}", "size": "sm", "color": "#9A3412", "align": "end" }
      ]},
      { "type": "box", "layout": "vertical", "contents": [
        { "type": "text", "text": "รายการที่ปรับแก้ (สูงสุด 5 รายการ)", "size": "sm", "weight": "bold", "color": "#B45309", "margin": "md" },
        { "type": "box", "layout": "horizontal", "paddingTop": "sm", "contents": [
          { "type": "text", "text": "รายการ", "size": "xs", "color": "#6B7280", "flex": 3 },
          { "type": "text", "text": "เดิม → ใหม่", "size": "xs", "color": "#6B7280", "flex": 2, "align": "end" }
        ]},
        { "type": "separator", "margin": "sm" },
        ${adjustedItemRows}
      ]},
      ${hasRemainingDiff ? `
      { "type": "box", "layout": "vertical", "backgroundColor": "#FEF2F2", "paddingAll": "12px", "cornerRadius": "md", "contents": [
        { "type": "text", "text": "⚠️ รายการที่ยังไม่ตรง (สูงสุด 5 รายการ)", "size": "sm", "weight": "bold", "color": "#B91C1C" },
        { "type": "box", "layout": "horizontal", "paddingTop": "sm", "contents": [
          { "type": "text", "text": "รายการ", "size": "xs", "color": "#6B7280", "flex": 3 },
          { "type": "text", "text": "นับ", "size": "xs", "color": "#6B7280", "align": "center", "flex": 1 },
          { "type": "text", "text": "POS", "size": "xs", "color": "#6B7280", "align": "center", "flex": 1 },
          { "type": "text", "text": "DIFF", "size": "xs", "color": "#6B7280", "align": "end", "flex": 1 }
        ]},
        { "type": "separator", "margin": "sm", "color": "#FECACA" },
        ${remainingDiffRows}
      ]}` : `
      { "type": "box", "layout": "vertical", "backgroundColor": "#F0FDF4", "paddingAll": "12px", "cornerRadius": "md", "contents": [
        { "type": "text", "text": "✅ ยอดตรงกันทุกรายการแล้ว", "size": "sm", "weight": "bold", "color": "#166534", "align": "center" }
      ]}`
      }
    ]},
    "footer": {
      "type": "box",
      "layout": "vertical",
      "spacing": "sm",
      "contents": [
        {
          "type": "button",
          "style": "primary",
          "color": "#F97316",
          "height": "md",
          "action": {
            "type": "uri",
            "label": "ตรวจสอบ/ชี้แจงเพิ่มเติม",
            "uri": "{{actionUri}}"
          }
        }
      ],
      "flex": 0
    }
  }`;
}




/**
 * Template สำหรับส่งลิงก์เว็บไซต์หลัก (สีเขียว)
 */
function generateWebsiteLinkFlex() {
  // ✅ ใช้ URL จาก CONFIG
  const webAppUrl = CONFIG.WEB_APP_URL;
  return {
    "type": "bubble",
    "size": "mega",
    "header": {
      "type": "box",
      "layout": "vertical",
      "height": "52px",
      "paddingAll": "12px",
      "contents": [
        {
          "type": "box",
          "layout": "vertical",
          "position": "absolute",
          "width": "140px",
          "height": "140px",
          "cornerRadius": "999px",
          "backgroundColor": "#00000000",
          "borderWidth": "14px",
          "borderColor": "#FFFFFF22",
          "offsetTop": "-56px",
          "offsetEnd": "-44px",
          "contents": []
        },
        {
          "type": "box",
          "layout": "vertical",
          "position": "absolute",
          "width": "88px",
          "height": "88px",
          "cornerRadius": "999px",
          "backgroundColor": "#FFFFFF1A",
          "offsetTop": "18px",
          "offsetEnd": "6px",
          "contents": []
        },
        {
          "type": "box",
          "layout": "horizontal",
          "contents": [
            {
              "type": "box",
              "layout": "vertical",
              "width": "32px",
              "height": "32px",
              "cornerRadius": "999px",
              "backgroundColor": "#FFFFFF",
              "contents": [
                {
                  "type": "text",
                  "size": "lg",
                  "weight": "bold",
                  "align": "center",
                  "color": "#10B981",
                  "margin": "3px",
                  "text": "🌐"
                }
              ]
            },
            {
              "type": "box",
              "layout": "vertical",
              "justifyContent": "center",
              "alignItems": "flex-end",
              "contents": [
                {
                  "type": "text",
                  "text": "DAVIS AI",
                  "color": "#FFFFFF",
                  "size": "sm",
                  "weight": "bold"
                }
              ]
            }
          ]
        }
      ]
    },
    "body": {
      "type": "box",
      "layout": "vertical",
      "paddingAll": "16px",
      "spacing": "md",
      "contents": [
        {
          "type": "text",
          "text": "🎯 เข้าสู่ระบบนับสต็อก",
          "weight": "bold",
          "size": "lg",
          "align": "center",
          "color": "#065F46"
        },
        {
          "type": "text",
          "text": "Stock Count System",
          "size": "xs",
          "color": "#047857",
          "align": "center",
          "wrap": true
        },
        {
          "type": "separator",
          "color": "#D1FAE5",
          "margin": "md"
        }
      ]
    },
    "footer": {
      "type": "box",
      "layout": "vertical",
      "spacing": "sm",
      "contents": [
        {
          "type": "button",
          "style": "primary",
          "color": "#22C55E",
          "height": "md",
          "action": {
            "type": "uri",
            "label": "เปิดเว็บไซต์ระบบนับสต็อก",
            "uri": webAppUrl  // ✅ ใช้ค่าจาก CONFIG.WEB_APP_URL
          }
        },
        {
          "type": "text",
          "text": "คลิกเพื่อเข้าสู่ระบบ DAVIS",
          "size": "xxs",
          "color": "#6B7280",
          "align": "center",
          "margin": "sm"
        }
      ]
    },
    "styles": {
      "header": {
        "backgroundColor": "#10B981"
      }
    }
  };
}









