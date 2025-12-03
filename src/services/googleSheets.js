import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

class GoogleSheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  }

  async initialize() {
    try {
      // Check if credentials are provided
      if (!process.env.GOOGLE_SHEETS_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
        console.log('⚠️  Google Sheets credentials not configured - skipping');
        return false;
      }

      // Parse the private key (handle escaped newlines)
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      this.auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      console.log('✅ Google Sheets API initialized');
      return true;
    } catch (error) {
      console.error('⚠️  Google Sheets initialization failed:', error.message);
      return false;
    }
  }

  // Color mapping for classes
  getClassColor(className) {
    const colors = {
      'Mage': { red: 0.26, green: 0.52, blue: 0.96 }, // Blue
      'Frost Mage': { red: 0.26, green: 0.52, blue: 0.96 }, // Blue
      'Windknight': { red: 0, green: 0.9, blue: 0.9 }, // Cyan
      'Wind Knight': { red: 0, green: 0.9, blue: 0.9 }, // Cyan
      'Marksman': { red: 1, green: 1, blue: 0 }, // Yellow
      'Stormblade': { red: 0.8, green: 0.4, blue: 0.8 }, // Purple
      'Beat Performer': { red: 1, green: 0.65, blue: 0 }, // Orange
      'Verdant Oracle': { red: 0.6, green: 0.8, blue: 0.2 }, // Green
      'Shield Knight': { red: 1, green: 0.6, blue: 0 }, // Orange
      'Heavy Guardian': { red: 0.5, green: 0.3, blue: 0.1 } // Brown
    };
    return colors[className] || { red: 0.9, green: 0.9, blue: 0.9 };
  }

  async formatColorfulSheet(sheetName, headerCount, dataRowCount) {
    if (!this.sheets) return;

    try {
      console.log(`📊 [SHEETS] Applying colorful formatting to ${sheetName}...`);
      
      // Get sheet ID
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
      if (!sheet) return;

      const sheetId = sheet.properties.sheetId;

      const requests = [
        // Freeze header row
        {
          updateSheetProperties: {
            properties: {
              sheetId: sheetId,
              gridProperties: {
                frozenRowCount: 1
              }
            },
            fields: 'gridProperties.frozenRowCount'
          }
        },
        // Format header row (pink/magenta background, black bold text)
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: headerCount
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: {
                  red: 1.0,
                  green: 0.0,
                  blue: 1.0
                },
                textFormat: {
                  foregroundColor: {
                    red: 0.0,
                    green: 0.0,
                    blue: 0.0
                  },
                  fontSize: 11,
                  bold: true
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
          }
        },
        // Add borders to all cells
        {
          updateBorders: {
            range: {
              sheetId: sheetId,
              startRowIndex: 0,
              endRowIndex: dataRowCount + 1,
              startColumnIndex: 0,
              endColumnIndex: headerCount
            },
            top: {
              style: 'SOLID',
              width: 1,
              color: { red: 0, green: 0, blue: 0 }
            },
            bottom: {
              style: 'SOLID',
              width: 1,
              color: { red: 0, green: 0, blue: 0 }
            },
            left: {
              style: 'SOLID',
              width: 1,
              color: { red: 0, green: 0, blue: 0 }
            },
            right: {
              style: 'SOLID',
              width: 1,
              color: { red: 0, green: 0, blue: 0 }
            },
            innerHorizontal: {
              style: 'SOLID',
              width: 1,
              color: { red: 0, green: 0, blue: 0 }
            },
            innerVertical: {
              style: 'SOLID',
              width: 1,
              color: { red: 0, green: 0, blue: 0 }
            }
          }
        },
        // Auto-resize columns
        {
          autoResizeDimensions: {
            dimensions: {
              sheetId: sheetId,
              dimension: 'COLUMNS',
              startIndex: 0,
              endIndex: headerCount
            }
          }
        }
      ];

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: requests
        }
      });

    } catch (error) {
      console.error(`Error formatting ${sheetName}:`, error.message);
    }
  }

  async syncMainCharacters(characters) {
    if (!this.sheets) {
      return;
    }

    try {
      console.log(`📊 [SHEETS] Starting sync for ${characters.length} main characters...`);
      
      // Prepare headers - matching your desired format
      const headers = [
        'Name',
        'Main Class',
        'Subclass',
        'Ability Score',
        'Guild',
        'Timezone',
        'Role',
        'Registered'
      ];

      // Prepare data rows
      const rows = characters.map(char => [
        char.ign,
        char.class,
        char.subclass,
        char.ability_score || '',
        char.guild || '',
        char.timezone || '',
        char.role,
        new Date(char.created_at).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        })
      ]);

      console.log(`📊 [SHEETS] Clearing Main Characters sheet...`);
      // Clear the sheet
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: 'Main Characters!A:H',
      });

      console.log(`📊 [SHEETS] Writing ${rows.length} rows to Main Characters...`);
      // Write data
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Main Characters!A1',
        valueInputOption: 'RAW',
        resource: {
          values: [headers, ...rows],
        },
      });

      console.log(`📊 [SHEETS] Applying colorful formatting...`);
      // Apply base formatting
      await this.formatColorfulSheet('Main Characters', headers.length, rows.length);

      // Apply class-based colors
      await this.applyClassColors('Main Characters', characters);

      console.log(`✅ [SHEETS] Main Characters synced successfully! (${characters.length} characters)`);
    } catch (error) {
      console.error('❌ [SHEETS] Error syncing main characters:', error.message);
    }
  }

  async applyClassColors(sheetName, characters) {
    if (!this.sheets) return;

    try {
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
      if (!sheet) return;

      const sheetId = sheet.properties.sheetId;

      const requests = [];

      // Color code the Main Class column (column B, index 1)
      characters.forEach((char, index) => {
        const color = this.getClassColor(char.class);
        const rowIndex = index + 1; // +1 because row 0 is header

        requests.push({
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: rowIndex,
              endRowIndex: rowIndex + 1,
              startColumnIndex: 1, // Main Class column
              endColumnIndex: 2
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: color,
                textFormat: {
                  bold: true,
                  foregroundColor: { red: 0, green: 0, blue: 0 }
                }
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)'
          }
        });
      });

      if (requests.length > 0) {
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: { requests }
        });
      }
    } catch (error) {
      console.error('Error applying class colors:', error.message);
    }
  }

  async syncAltCharacters(alts) {
    if (!this.sheets) {
      return;
    }

    try {
      console.log(`📊 [SHEETS] Starting sync for ${alts.length} alt characters...`);
      
      // Prepare headers
      const headers = [
        'Discord Name',
        'Alt IGN',
        'Class',
        'Subclass',
        'Role',
        'Registered'
      ];

      // Prepare data rows
      const rows = alts.map(alt => [
        alt.discord_name || 'Unknown',
        alt.ign,
        alt.class,
        alt.subclass,
        alt.role,
        new Date(alt.created_at).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        })
      ]);

      console.log(`📊 [SHEETS] Clearing Alt Characters sheet...`);
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: 'Alt Characters!A:F',
      });

      console.log(`📊 [SHEETS] Writing ${rows.length} rows to Alt Characters...`);
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Alt Characters!A1',
        valueInputOption: 'RAW',
        resource: {
          values: [headers, ...rows],
        },
      });

      console.log(`📊 [SHEETS] Applying colorful formatting...`);
      await this.formatColorfulSheet('Alt Characters', headers.length, rows.length);

      // Apply class colors to Alt Characters
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = spreadsheet.data.sheets.find(s => s.properties.title === 'Alt Characters');
      if (sheet) {
        const sheetId = sheet.properties.sheetId;
        const requests = [];

        alts.forEach((alt, index) => {
          const color = this.getClassColor(alt.class);
          const rowIndex = index + 1;

          requests.push({
            repeatCell: {
              range: {
                sheetId: sheetId,
                startRowIndex: rowIndex,
                endRowIndex: rowIndex + 1,
                startColumnIndex: 2, // Class column in Alt Characters
                endColumnIndex: 3
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: color,
                  textFormat: {
                    bold: true,
                    foregroundColor: { red: 0, green: 0, blue: 0 }
                  }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)'
            }
          });
        });

        if (requests.length > 0) {
          await this.sheets.spreadsheets.batchUpdate({
            spreadsheetId: this.spreadsheetId,
            requestBody: { requests }
          });
        }
      }

      console.log(`✅ [SHEETS] Alt Characters synced successfully! (${alts.length} alts)`);
    } catch (error) {
      console.error('❌ [SHEETS] Error syncing alt characters:', error.message);
    }
  }

  async fullSync(mainCharacters, altCharacters) {
    const timestamp = new Date().toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    console.log(`\n🔄 [SHEETS] ========== FULL SYNC STARTED (${timestamp}) ==========`);
    
    await this.syncMainCharacters(mainCharacters);
    await this.syncAltCharacters(altCharacters);
    
    console.log(`✅ [SHEETS] ========== FULL SYNC COMPLETE (${timestamp}) ==========\n`);
  }
}

export default new GoogleSheetsService();
