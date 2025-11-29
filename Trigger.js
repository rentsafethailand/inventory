/**
 * =================================================================
 * TIME-DRIVEN TRIGGERS
 * ฟังก์ชันสำหรับตั้งเวลาทำงานอัตโนมัติ
 * =================================================================
 */

/**
 * 1. แจ้งเตือนนับสต็อกประจำวัน (Daily Reminder)
 * Trigger: ให้ทำงานทุกวันตามเวลาที่แต่ละสาขากำหนด
 */
function triggerDailyReminders() {
  const allStores = getAllStores().stores;
  const now = new Date();
  const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

  // แปลงวันปัจจุบันเป็นรูปแบบ 3 ตัวอักษร (Mon, Tue, Wed, ...)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentDay = dayNames[now.getDay()];

  // วันที่เป้าหมายคือ "วันปัจจุบัน" (แจ้งเตือนนับสต๊อกวันนี้)
  const targetDate = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');

  allStores.forEach(store => {
    try {
      const storeInfo = getStoreInfoById(store.id);
      if (!storeInfo || !storeInfo.sheet_id) return;

      const storeSettings = getStoreSettings(storeInfo.sheet_id).settings;

      // ตรวจสอบ:
      // 1. เวลาตรงกับที่ตั้งไว้
      // 2. มี group_line_id
      // 3. วันปัจจุบันอยู่ในรายการ notify_days
      const notifyDaysArray = storeSettings.notify_days ? storeSettings.notify_days.split(',').map(d => d.trim()) : [];
      const shouldNotify = notifyDaysArray.includes(currentDay);

      if (storeSettings.notify_time_daily === currentTime && storeSettings.group_line_id && shouldNotify) {
        const data = {
          storeId: store.id,
          storeName: store.name,
          date: targetDate,
          notificationText: `🔔 แจ้งเตือนนับสต็อกประจำวัน สาขา ${store.name} (วันที่ ${targetDate})`
        };
        sendAppNotification(storeSettings.group_line_id, 'DAILY_REMINDER', data);
        Logger.log(`✅ Sent daily reminder to ${store.name} for ${targetDate} at ${currentTime}`);
      }
    } catch(e) {
      console.error(`Error processing daily reminder for store ${store.name}: ${e.message}`);
    }
  });
}




/**
 * อัพเดทสถานะ Deposits ที่หมดอายุ
 * Trigger: รันทุกวัน เวลา 00:05 น.
 */
function triggerUpdateExpiredDeposits() {
  const mainSS = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
  const storesSheet = mainSS.getSheetByName('Stores');
  const storesData = storesSheet.getDataRange().getValues();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalUpdated = 0;

  // วนทุกสาขา (column: 0=id, 1=code, 2=name, 3=sheet_id)
  for (let i = 1; i < storesData.length; i++) {
    const storeName = storesData[i][2];
    const sheetId = storesData[i][3];

    if (!sheetId) continue;

    try {
      const storeSS = SpreadsheetApp.openById(sheetId);
      const depositsSheet = storeSS.getSheetByName('Deposits');

      if (!depositsSheet) continue;

      const data = depositsSheet.getDataRange().getValues();
      const headers = data[0];

      const expiryCol = headers.indexOf('expiry_date');
      const statusCol = headers.indexOf('status');

      if (expiryCol === -1 || statusCol === -1) continue;

      let storeUpdated = 0;

      for (let j = 1; j < data.length; j++) {
        const status = data[j][statusCol];
        const expiryDate = data[j][expiryCol];

        // ถ้า status = 'in_store' และหมดอายุแล้ว -> เปลี่ยนเป็น 'expired'
        if (status === 'in_store' && expiryDate) {
          const expDate = new Date(expiryDate);
          expDate.setHours(0, 0, 0, 0);

          if (expDate < today) {
            depositsSheet.getRange(j + 1, statusCol + 1).setValue('expired');
            storeUpdated++;
          }
        }
      }

      if (storeUpdated > 0) {
        Logger.log(`✅ ${storeName}: อัพเดท ${storeUpdated} รายการเป็น expired`);
        totalUpdated += storeUpdated;
      }

    } catch (e) {
      Logger.log(`❌ Error updating ${storeName}: ${e.message}`);
    }
  }

  Logger.log(`📊 รวมอัพเดททั้งหมด: ${totalUpdated} รายการ`);
  return { success: true, totalUpdated: totalUpdated };
}


function triggerFollowUpReminders() {
  const apiConfig = getAPIConfig();
  const followUpIntervalHours = parseInt(apiConfig.FOLLOW_UP_INTERVAL_HOURS || '2', 10);

  // หากตั้งค่าเป็น 0 (ปิด) ให้หยุดการทำงานของฟังก์ชันนี้ทันที
  if (followUpIntervalHours === 0) {
    Logger.log("Follow-up reminders are disabled. Trigger will not run.");
    return;
  }

  const allStores = getAllStores().stores;
  const now = new Date().getTime();

  // วันที่เป้าหมายคือ "วันปัจจุบัน" (ตรวจสอบว่าส่งยอดวันนี้หรือยัง)
  const today = new Date();
  const targetDate = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');

  allStores.forEach(store => {
    try {
      const storeInfo = getStoreInfoById(store.id);
      if (!storeInfo || !storeInfo.sheet_id) return;

      const storeSettings = getStoreSettings(storeInfo.sheet_id).settings;
      if (!storeSettings.group_line_id) return;

      const activity = getStaffActivityHistory(storeInfo.sheet_id, targetDate, targetDate).data[0];

      if (activity && !activity.hasPdfUpload && !activity.hasManualCount) {
        const scriptProperties = PropertiesService.getScriptProperties();
        const lastFollowUpKey = `lastFollowUp_${store.id}_${targetDate}`;
        const lastFollowUpTimestamp = parseInt(scriptProperties.getProperty(lastFollowUpKey) || '0', 10);
        
        const hoursSinceLastFollowUp = (now - lastFollowUpTimestamp) / (1000 * 60 * 60);

        if (lastFollowUpTimestamp === 0 || hoursSinceLastFollowUp >= followUpIntervalHours) {
          const data = {
            storeId: store.id,
            storeName: store.name,
            date: targetDate,
            notificationText: `🟡 [ติดตาม] สาขา ${store.name} ยังไม่ส่งยอดของวันที่ ${targetDate}`
          };
          

          scriptProperties.setProperty(lastFollowUpKey, now.toString());
          Logger.log(`Follow-up sent for store ${store.name} for date ${targetDate}.`);
        } else {
          Logger.log(`Skipping follow-up for store ${store.name}. Only ${hoursSinceLastFollowUp.toFixed(2)} hours have passed (Interval: ${followUpIntervalHours} hours).`);
        }
      }
    } catch(e) {
      console.error(`Error processing follow-up for store ${store.name}: ${e.message}`);
    }
  });
}
















