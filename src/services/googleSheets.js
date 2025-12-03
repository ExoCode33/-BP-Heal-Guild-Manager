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
      if (!process.env.GOOGLE_SHEETS_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
        console.log('⚠️  Google Sheets credentials not configured - skipping');
        return false;
      }

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

  // 🎨 Ultra-vibrant color palette for classes
  getClassColor(className) {
    const colors = {
      'Beat Performer': { red: 1, green: 0.2, blue: 0.6 },
      'Frost Mage': { red: 0.2, green: 0.6, blue: 1 },
      'Heavy Guardian': { red: 0.6, green: 0.4, blue: 0.2 },
      'Marksman': { red: 0.4, green: 0.9, blue: 0.2 },
      'Shield Knight': { red: 1, green: 0.84, blue: 0 },
      'Stormblade': { red: 0.6, green: 0.2, blue: 1 },
      'Verdant Oracle': { red: 0.2, green: 0.9, blue: 0.4 },
      'Wind Knight': { red: 0.2, green: 0.9, blue: 0.9 }
    };
    return colors[className] || { red: 0.95, green: 0.95, blue: 0.95 };
  }

  // 🌟 Ability score color tiers
  getAbilityScoreColor(score) {
    if (!score || score === '') return { red: 0.95, green: 0.95, blue: 0.95 };
    
    const numScore = parseInt(score);
    
    if (numScore >= 30000) return { red: 0.5, green: 0, blue: 0.8 };
    if (numScore >= 27000) return { red: 1, green: 0, blue: 0.8 };
    if (numScore >= 24000) return { red: 1, green: 0.2, blue: 0.4 };
    if (numScore >= 21000) return { red: 1, green: 0.5, blue: 0 };
    if (numScore >= 18000) return { red: 1, green: 0.84, blue: 0 };
    if (numScore >= 15000) return { red: 0.3, green: 0.8, blue: 1 };
    if (numScore >= 10000) return { red: 0.5, green: 0.9, blue: 0.5 };
    return { red: 0.9, green: 0.9, blue: 0.9 };
  }

  // 🎭 Role colors
  getRoleColor(role) {
    const roleColors = {
      'Tank': { red: 0.3, green: 0.5, blue: 0.7 },
      'DPS': { red: 0.9, green: 0.3, blue: 0.3 },
      'Support': { red: 0.4, green: 0.8, blue: 0.4 }
    };
    return roleColors[role] || { red: 0.8, green: 0.8, blue: 0.8 };
  }

  async formatProfessionalSheet(sheetName, headerCount, dataRowCount) {
    if (!this.sheets) return;

    try {
      console.log(`📊 [SHEETS] Applying professional formatting to ${sheetName}...`);
      
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
      if (!sheet) return;

      const sheetId = sheet.properties.sheetId;

      const requests = [
        {
          updateSheetProperties: {
            properties: {
              sheetId: sheetId,
              gridProperties: {
                frozenRowCount: 1,
                hideGridlines: false
              },
              tabColor: {
                red: 0.4,
                green: 0.2,
                blue: 0.9
              }
            },
            fields: 'gridProperties.frozenRowCount,gridProperties.hideGridlines,tabColor'
          }
        },
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
                  red: 0.4,
                  green: 0.2,
                  blue: 0.9
                },
                textFormat: {
                  foregroundColor: {
                    red: 1,
                    green: 1,
                    blue: 1
                  },
                  fontSize: 14,
                  bold: true,
                  fontFamily: 'Montserrat'
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                padding: {
                  top: 10,
                  bottom: 10,
                  left: 10,
                  right: 10
                }
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,padding)'
          }
        },
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: 1,
              endRowIndex: dataRowCount + 1,
              startColumnIndex: 0,
              endColumnIndex: headerCount
            },
            cell: {
              userEnteredFormat: {
                textFormat: {
                  fontSize: 11,
                  fontFamily: 'Roboto'
                },
                horizontalAlignment: 'LEFT',
                verticalAlignment: 'MIDDLE',
                padding: {
                  top: 6,
                  bottom: 6,
                  left: 8,
                  right: 8
                }
              }
            },
            fields: 'userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment,padding)'
          }
        },
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
              width: 3,
              color: { red: 0.4, green: 0.2, blue: 0.9 }
            },
            bottom: {
              style: 'SOLID',
              width: 3,
              color: { red: 0.4, green: 0.2, blue: 0.9 }
            },
            left: {
              style: 'SOLID',
              width: 1,
              color: { red: 0.8, green: 0.8, blue: 0.8 }
            },
            right: {
              style: 'SOLID',
              width: 1,
              color: { red: 0.8, green: 0.8, blue: 0.8 }
            },
            innerHorizontal: {
              style: 'SOLID',
              width: 1,
              color: { red: 0.9, green: 0.9, blue: 0.9 }
            },
            innerVertical: {
              style: 'SOLID',
              width: 1,
              color: { red: 0.9, green: 0.9, blue: 0.9 }
            }
          }
        }
      ];

      // Set column widths for Main Characters
      if (sheetName === 'Main Characters') {
        requests.push(
          { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 160 }, fields: 'pixelSize' } },
          { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 180 }, fields: 'pixelSize' } },
          { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 2, endIndex: 3 }, properties: { pixelSize: 180 }, fields: 'pixelSize' } },
          { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 3, endIndex: 4 }, properties: { pixelSize: 150 }, fields: 'pixelSize' } },
          { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 4, endIndex: 5 }, properties: { pixelSize: 100 }, fields: 'pixelSize' } },
          { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 5, endIndex: 6 }, properties: { pixelSize: 130 }, fields: 'pixelSize' } },
          { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 6, endIndex: 7 }, properties: { pixelSize: 140 }, fields: 'pixelSize' } },
          { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 7, endIndex: 8 }, properties: { pixelSize: 200 }, fields: 'pixelSize' } },
          { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 8, endIndex: 9 }, properties: { pixelSize: 120 }, fields: 'pixelSize' } }
        );
      }

      // Alternating row colors
      for (let i = 1; i <= dataRowCount; i++) {
        const isEvenRow = i % 2 === 0;
        requests.push({
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: i,
              endRowIndex: i + 1,
              startColumnIndex: 0,
              endColumnIndex: headerCount
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: isEvenRow 
                  ? { red: 0.96, green: 0.96, blue: 1 }
                  : { red: 1, green: 1, blue: 1 }
              }
            },
            fields: 'userEnteredFormat.backgroundColor'
          }
        });
      }

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: { requests }
      });

      console.log(`✅ [SHEETS] Professional formatting applied to ${sheetName}`);
    } catch (error) {
      console.error(`Error formatting ${sheetName}:`, error.message);
    }
  }

  async applyDataColors(sheetName, characters) {
    if (!this.sheets || characters.length === 0) return;

    try {
      console.log(`🎨 [SHEETS] Applying colorful class and ability score colors...`);
      
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
      if (!sheet) return;

      const sheetId = sheet.properties.sheetId;
      const requests = [];

      for (let i = 0; i < characters.length; i++) {
        const char = characters[i];
        const rowIndex = i + 1;
        
        const classColor = this.getClassColor(char.class);
        const roleColor = this.getRoleColor(char.role);
        const abilityColor = this.getAbilityScoreColor(char.ability_score);

        // Main Class column
        requests.push({
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: rowIndex,
              endRowIndex: rowIndex + 1,
              startColumnIndex: 2,
              endColumnIndex: 3
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: classColor,
                textFormat: {
                  bold: true,
                  fontSize: 12,
                  foregroundColor: { red: 0, green: 0, blue: 0 }
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                wrapStrategy: 'WRAP'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)'
          }
        });

        // Subclass column
        const lighterColor = {
          red: Math.min(classColor.red + 0.2, 1),
          green: Math.min(classColor.green + 0.2, 1),
          blue: Math.min(classColor.blue + 0.2, 1)
        };
        
        requests.push({
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: rowIndex,
              endRowIndex: rowIndex + 1,
              startColumnIndex: 3,
              endColumnIndex: 4
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: lighterColor,
                textFormat: {
                  fontSize: 10,
                  italic: true,
                  foregroundColor: { red: 0, green: 0, blue: 0 }
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
          }
        });

        // Role column
        requests.push({
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: rowIndex,
              endRowIndex: rowIndex + 1,
              startColumnIndex: 4,
              endColumnIndex: 5
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: roleColor,
                textFormat: {
                  bold: true,
                  fontSize: 10,
                  foregroundColor: { red: 1, green: 1, blue: 1 }
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
          }
        });

        // Ability Score column
        if (char.ability_score) {
          requests.push({
            repeatCell: {
              range: {
                sheetId: sheetId,
                startRowIndex: rowIndex,
                endRowIndex: rowIndex + 1,
                startColumnIndex: 5,
                endColumnIndex: 6
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: abilityColor,
                  textFormat: {
                    bold: true,
                    fontSize: 12,
                    foregroundColor: { red: 0, green: 0, blue: 0 }
                  },
                  horizontalAlignment: 'CENTER',
                  verticalAlignment: 'MIDDLE',
                  numberFormat: {
                    type: 'NUMBER',
                    pattern: '#,##0'
                  }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,numberFormat)'
            }
          });
        }

        // Guild column
        requests.push({
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: rowIndex,
              endRowIndex: rowIndex + 1,
              startColumnIndex: 6,
              endColumnIndex: 7
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.93, green: 0.93, blue: 0.98 },
                textFormat: {
                  fontSize: 10,
                  bold: true,
                  fontFamily: 'Roboto'
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
          }
        });
        
        // Timezone column
        requests.push({
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: rowIndex,
              endRowIndex: rowIndex + 1,
              startColumnIndex: 7,
              endColumnIndex: 8
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.98, green: 0.98, blue: 0.93 },
                textFormat: {
                  fontSize: 9,
                  fontFamily: 'Courier New'
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
          }
        });
        
        // Registered column
        requests.push({
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: rowIndex,
              endRowIndex: rowIndex + 1,
              startColumnIndex: 8,
              endColumnIndex: 9
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.96, green: 0.96, blue: 0.96 },
                textFormat: {
                  fontSize: 9,
                  italic: true
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
          }
        });
      }

      if (requests.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < requests.length; i += batchSize) {
          const batch = requests.slice(i, i + batchSize);
          await this.sheets.spreadsheets.batchUpdate({
            spreadsheetId: this.spreadsheetId,
            requestBody: { requests: batch }
          });
        }
        console.log(`✅ [SHEETS] Applied ${requests.length} color formats`);
      }
    } catch (error) {
      console.error('❌ [SHEETS] Error applying data colors:', error.message);
    }
  }

  async syncMainCharacters(characters) {
    if (!this.sheets) return;

    try {
      console.log(`📊 [SHEETS] Starting sync for ${characters.length} main characters...`);
      
      const headers = [
        'Name',
        'Discord Name',
        'Main Class',
        'Subclass',
        'Role',
        'Ability Score',
        'Guild',
        'Timezone',
        'Registered'
      ];

      const rows = characters.map(char => [
        char.ign,
        char.discord_name,
        char.class,
        char.subclass,
        char.role,
        char.ability_score || '',
        char.guild || '',
        char.timezone || '',
        new Date(char.created_at).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        })
      ]);

      console.log(`📊 [SHEETS] Clearing Main Characters sheet...`);
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: 'Main Characters!A:I',
      });

      console.log(`📊 [SHEETS] Writing ${rows.length} rows to Main Characters...`);
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Main Characters!A1',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [headers, ...rows],
        },
      });

      console.log(`📊 [SHEETS] Applying professional formatting...`);
      await this.formatProfessionalSheet('Main Characters', headers.length, rows.length);

      console.log(`📊 [SHEETS] Applying class and ability score colors...`);
      await this.applyDataColors('Main Characters', characters);

      console.log(`✅ [SHEETS] Main Characters synced successfully! (${characters.length} characters)`);
    } catch (error) {
      console.error('❌ [SHEETS] Error syncing main characters:', error.message);
    }
  }

  async applyAltColors(sheetName, alts) {
    if (!this.sheets || alts.length === 0) return;

    try {
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
      if (!sheet) return;

      const sheetId = sheet.properties.sheetId;
      const requests = [];
      
      // Column widths
      requests.push(
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 180 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 160 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 2, endIndex: 3 }, properties: { pixelSize: 180 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 3, endIndex: 4 }, properties: { pixelSize: 150 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 4, endIndex: 5 }, properties: { pixelSize: 100 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 5, endIndex: 6 }, properties: { pixelSize: 120 }, fields: 'pixelSize' } }
      );

      alts.forEach((alt, index) => {
        const rowIndex = index + 1;
        const classColor = this.getClassColor(alt.class);
        const roleColor = this.getRoleColor(alt.role);

        requests.push({
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: rowIndex,
              endRowIndex: rowIndex + 1,
              startColumnIndex: 2,
              endColumnIndex: 3
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: classColor,
                textFormat: {
                  bold: true,
                  fontSize: 12,
                  foregroundColor: { red: 0, green: 0, blue: 0 }
                },
                horizontalAlignment: 'CENTER',
                wrapStrategy: 'WRAP'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,wrapStrategy)'
          }
        });

        const lighterColor = {
          red: Math.min(classColor.red + 0.2, 1),
          green: Math.min(classColor.green + 0.2, 1),
          blue: Math.min(classColor.blue + 0.2, 1)
        };

        requests.push({
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: rowIndex,
              endRowIndex: rowIndex + 1,
              startColumnIndex: 3,
              endColumnIndex: 4
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: lighterColor,
                textFormat: {
                  fontSize: 11,
                  italic: true,
                  foregroundColor: { red: 0, green: 0, blue: 0 }
                },
                horizontalAlignment: 'CENTER'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
          }
        });

        requests.push({
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: rowIndex,
              endRowIndex: rowIndex + 1,
              startColumnIndex: 4,
              endColumnIndex: 5
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: roleColor,
                textFormat: {
                  bold: true,
                  fontSize: 11,
                  foregroundColor: { red: 1, green: 1, blue: 1 }
                },
                horizontalAlignment: 'CENTER'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
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
      console.error('❌ [SHEETS] Error applying alt colors:', error.message);
    }
  }

  async syncAltCharacters(alts) {
    if (!this.sheets) return;

    try {
      console.log(`📊 [SHEETS] Starting sync for ${alts.length} alt characters...`);
      
      const headers = [
        'Discord Name',
        'Alt IGN',
        'Class',
        'Subclass',
        'Role',
        'Registered'
      ];

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

      console.log(`📊 [SHEETS] Applying professional formatting...`);
      await this.formatProfessionalSheet('Alt Characters', headers.length, rows.length);
      
      console.log(`📊 [SHEETS] Applying colors to alt characters...`);
      await this.applyAltColors('Alt Characters', alts);

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
