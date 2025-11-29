/**
 * =================================================================
 * MIGRATION SCRIPT
 * ฟังก์ชันสำหรับอัพเดตโครงสร้างข้อมูลของสาขาที่มีอยู่แล้ว
 * =================================================================
 */

/**
 * Migration: เพิ่มฟิลด์ notify_days ให้กับทุกสาขา
 *
 * วิธีใช้:
 * 1. เปิด Google Apps Script Editor
 * 2. เลือกฟังก์ชัน "migrateAddNotifyDays" จาก dropdown
 * 3. คลิก Run (▶)
 * 4. ตรวจสอบ Log เพื่อดูผลลัพธ์
 */
function migrateAddNotifyDays() {
  Logger.log('=== Starting Migration: Add notify_days to all stores ===');

  try {
    // 1. ดึงรายการสาขาทั้งหมด
    const allStores = getAllStores().stores;

    if (!allStores || allStores.length === 0) {
      Logger.log('❌ No stores found!');
      return;
    }

    Logger.log(`Found ${allStores.length} store(s) to migrate`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // 2. วนลูปทุกสาขา
    allStores.forEach((store, index) => {
      try {
        Logger.log(`\n[${index + 1}/${allStores.length}] Processing: ${store.name} (ID: ${store.id})`);

        if (!store.sheet_id) {
          Logger.log(`  ⚠️ Skip: No sheet_id found`);
          skipCount++;
          return;
        }

        // 3. เปิด Spreadsheet ของสาขา
        const storeSheet = SpreadsheetApp.openById(store.sheet_id);
        const settingsSheet = storeSheet.getSheetByName('Settings');

        if (!settingsSheet) {
          Logger.log(`  ⚠️ Skip: No Settings sheet found`);
          skipCount++;
          return;
        }

        // 4. ดึงข้อมูล Settings ทั้งหมด
        const data = settingsSheet.getDataRange().getValues();

        // 5. เช็คว่ามีฟิลด์ notify_days อยู่แล้วหรือยัง
        let notifyDaysExists = false;
        let notifyTimeDailyRow = -1;

        for (let i = 0; i < data.length; i++) {
          if (data[i][0] === 'notify_days') {
            notifyDaysExists = true;
            Logger.log(`  ℹ️ notify_days already exists`);
            break;
          }
          if (data[i][0] === 'notify_time_daily') {
            notifyTimeDailyRow = i;
          }
        }

        // 6. ถ้ายังไม่มี notify_days ให้เพิ่มเข้าไป
        if (!notifyDaysExists) {
          if (notifyTimeDailyRow === -1) {
            Logger.log(`  ⚠️ Skip: notify_time_daily not found`);
            skipCount++;
            return;
          }

          // Insert แถวใหม่ถัดจาก notify_time_daily
          const insertRow = notifyTimeDailyRow + 2; // +1 for index, +1 to insert after
          settingsSheet.insertRowAfter(notifyTimeDailyRow + 1);

          // เขียนข้อมูล notify_days
          const newRowData = [
            'notify_days',
            'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
            'string',
            'วันที่ต้องการแจ้งเตือน (Mon-Sun) คั่นด้วย comma'
          ];

          settingsSheet.getRange(insertRow, 1, 1, 4).setValues([newRowData]);

          Logger.log(`  ✅ Added notify_days successfully`);
          successCount++;
        } else {
          Logger.log(`  ⏭️ Already migrated`);
          skipCount++;
        }

      } catch (storeError) {
        Logger.log(`  ❌ Error: ${storeError.message}`);
        errorCount++;
      }
    });

    // 7. แสดงสรุปผลลัพธ์
    Logger.log('\n=== Migration Summary ===');
    Logger.log(`✅ Success: ${successCount} store(s)`);
    Logger.log(`⏭️ Skipped: ${skipCount} store(s) (already migrated or no settings)`);
    Logger.log(`❌ Errors: ${errorCount} store(s)`);
    Logger.log(`📊 Total: ${allStores.length} store(s)`);
    Logger.log('\n=== Migration Completed ===');

  } catch (error) {
    Logger.log(`\n❌ Fatal Error: ${error.message}`);
    Logger.log(error.stack);
  }
}


/**
 * ฟังก์ชันตรวจสอบสถานะการ migrate
 * ใช้เช็คว่าสาขาไหนมี notify_days แล้วบ้าง
 */
function checkNotifyDaysMigrationStatus() {
  Logger.log('=== Checking Migration Status ===\n');

  try {
    const allStores = getAllStores().stores;

    if (!allStores || allStores.length === 0) {
      Logger.log('No stores found!');
      return;
    }

    let migratedCount = 0;
    let notMigratedCount = 0;

    allStores.forEach((store, index) => {
      try {
        if (!store.sheet_id) {
          Logger.log(`[${index + 1}] ${store.name}: ⚠️ No sheet_id`);
          notMigratedCount++;
          return;
        }

        const storeSheet = SpreadsheetApp.openById(store.sheet_id);
        const settingsSheet = storeSheet.getSheetByName('Settings');

        if (!settingsSheet) {
          Logger.log(`[${index + 1}] ${store.name}: ⚠️ No Settings sheet`);
          notMigratedCount++;
          return;
        }

        const data = settingsSheet.getDataRange().getValues();
        const hasNotifyDays = data.some(row => row[0] === 'notify_days');

        if (hasNotifyDays) {
          const notifyDaysRow = data.find(row => row[0] === 'notify_days');
          Logger.log(`[${index + 1}] ${store.name}: ✅ Migrated (Value: "${notifyDaysRow[1]}")`);
          migratedCount++;
        } else {
          Logger.log(`[${index + 1}] ${store.name}: ❌ Not migrated`);
          notMigratedCount++;
        }

      } catch (error) {
        Logger.log(`[${index + 1}] ${store.name}: ❌ Error - ${error.message}`);
        notMigratedCount++;
      }
    });

    Logger.log('\n=== Summary ===');
    Logger.log(`✅ Migrated: ${migratedCount} / ${allStores.length}`);
    Logger.log(`❌ Not Migrated: ${notMigratedCount} / ${allStores.length}`);

  } catch (error) {
    Logger.log(`Fatal Error: ${error.message}`);
  }
}


/**
 * ฟังก์ชันอัพเดตค่า notify_days สำหรับสาขาเฉพาะ
 * ใช้กรณีต้องการแก้ไขค่าของสาขาใดสาขาหนึ่ง
 */
function updateNotifyDaysForStore(storeId, newNotifyDays = 'Mon,Tue,Wed,Thu,Fri,Sat,Sun') {
  Logger.log(`Updating notify_days for store ID: ${storeId}`);

  try {
    const storeInfo = getStoreInfoById(storeId);

    if (!storeInfo || !storeInfo.sheet_id) {
      Logger.log('❌ Store not found or no sheet_id');
      return { success: false, message: 'Store not found' };
    }

    const storeSheet = SpreadsheetApp.openById(storeInfo.sheet_id);
    const settingsSheet = storeSheet.getSheetByName('Settings');

    if (!settingsSheet) {
      Logger.log('❌ Settings sheet not found');
      return { success: false, message: 'Settings sheet not found' };
    }

    const data = settingsSheet.getDataRange().getValues();

    // หาแถวที่มี notify_days
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === 'notify_days') {
        settingsSheet.getRange(i + 1, 2).setValue(newNotifyDays);
        Logger.log(`✅ Updated notify_days to: "${newNotifyDays}"`);
        return { success: true };
      }
    }

    Logger.log('❌ notify_days field not found');
    return { success: false, message: 'notify_days field not found' };

  } catch (error) {
    Logger.log(`❌ Error: ${error.message}`);
    return { success: false, message: error.message };
  }
}


