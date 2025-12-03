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

  async formatSheet(sheetName, headerCount) {
    if (!this.sheets) return;

    try {
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
        // Format header row (bold, dark background, white text, centered)
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
                  red: 0.26,
                  green: 0.52,
                  blue: 0.96
                },
                textFormat: {
                  foregroundColor: {
                    red: 1.0,
                    green: 1.0,
                    blue: 1.0
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
              startColumnIndex: 0,
              endColumnIndex: headerCount
            },
            top: {
              style: 'SOLID',
              width: 1,
              color: { red: 0.7, green: 0.7, blue: 0.7 }
            },
            bottom: {
              style: 'SOLID',
              width: 1,
              color: { red: 0.7, green: 0.7, blue: 0.7 }
            },
            left: {
              style: 'SOLID',
              width: 1,
              color: { red: 0.7, green: 0.7, blue: 0.7 }
            },
            right: {
              style: 'SOLID',
              width: 1,
              color: { red: 0.7, green: 0.7, blue: 0.7 }
            },
            innerHorizontal: {
              style: 'SOLID',
              width: 1,
              color: { red: 0.7, green: 0.7, blue: 0.7 }
            },
            innerVertical: {
              style: 'SOLID',
              width: 1,
              color: { red: 0.7, green: 0.7, blue: 0.7 }
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
        },
        // Alternate row colors (zebra striping)
        {
          addConditionalFormatRule: {
            rule: {
              ranges: [{
                sheetId: sheetId,
                startRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: headerCount
              }],
              booleanRule: {
                condition: {
                  type: 'CUSTOM_FORMULA',
                  values: [{
                    userEnteredValue: '=MOD(ROW(),2)=0'
                  }]
                },
                format: {
                  backgroundColor: {
                    red: 0.95,
                    green: 0.95,
                    blue: 0.95
                  }
                }
              }
            },
            index: 0
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
      // Prepare headers
      const headers = [
        'Discord Name',
        'IGN',
        'Class',
        'Subclass',
        'Role',
        'Ability Score',
        'Guild',
        'Timezone',
        'Registered'
      ];

      // Prepare data rows with formatted dates
      const rows = characters.map(char => [
        char.discord_name,
        char.ign,
        char.class,
        char.subclass,
        char.role,
        char.ability_score || 'N/A',
        char.guild || 'None',
        char.timezone || 'N/A',
        new Date(char.created_at).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        })
      ]);

      // Clear and update the sheet
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: 'Main Characters!A:I',
      });

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Main Characters!A1',
        valueInputOption: 'RAW',
        resource: {
          values: [headers, ...rows],
        },
      });

      // Apply formatting
      await this.formatSheet('Main Characters', headers.length);

      console.log(`✅ Synced ${characters.length} main characters to Google Sheets (formatted)`);
    } catch (error) {
      console.error('❌ Error syncing main characters to Google Sheets:', error);
    }
  }

  async syncAltCharacters(alts) {
    if (!this.sheets) {
      return;
    }

    try {
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

      // Clear and update the sheet
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: 'Alt Characters!A:F',
      });

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Alt Characters!A1',
        valueInputOption: 'RAW',
        resource: {
          values: [headers, ...rows],
        },
      });

      // Apply formatting
      await this.formatSheet('Alt Characters', headers.length);

      console.log(`✅ Synced ${alts.length} alt characters to Google Sheets (formatted)`);
    } catch (error) {
      console.error('❌ Error syncing alt characters to Google Sheets:', error);
    }
  }

  async fullSync(mainCharacters, altCharacters) {
    await this.syncMainCharacters(mainCharacters);
    await this.syncAltCharacters(altCharacters);
  }
}

export default new GoogleSheetsService();
