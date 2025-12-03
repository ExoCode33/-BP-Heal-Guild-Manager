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

  // 🎨 Ultra-professional and cute color palette for classes (pastel tones)
  getClassColor(className) {
    const colors = {
      'Beat Performer': { red: 1, green: 0.75, blue: 0.85 },      // Soft pink
      'Frost Mage': { red: 0.8, green: 0.9, blue: 1 },           // Ice blue
      'Heavy Guardian': { red: 0.85, green: 0.75, blue: 0.65 },  // Warm tan
      'Marksman': { red: 0.85, green: 0.95, blue: 0.75 },        // Soft lime
      'Shield Knight': { red: 1, green: 0.95, blue: 0.7 },       // Soft gold
      'Stormblade': { red: 0.85, green: 0.8, blue: 1 },          // Soft purple
      'Verdant Oracle': { red: 0.8, green: 0.95, blue: 0.85 },   // Mint green
      'Wind Knight': { red: 0.75, green: 0.95, blue: 0.95 }      // Sky blue
    };
    return colors[className] || { red: 0.95, green: 0.95, blue: 0.95 };
  }

  // 🌟 Cute gradient ability score colors with emojis
  getAbilityScoreColor(score) {
    if (!score || score === '') return { red: 0.98, green: 0.98, blue: 0.98 };
    
    const numScore = parseInt(score);
    
    // Legendary tier - Deep purple gradient
    if (numScore >= 30000) return { red: 0.7, green: 0.6, blue: 0.9 };
    // Epic tier - Pink/Purple
    if (numScore >= 27000) return { red: 0.95, green: 0.7, blue: 0.9 };
    // Rare tier - Rose
    if (numScore >= 24000) return { red: 1, green: 0.8, blue: 0.85 };
    // Uncommon tier - Peach
    if (numScore >= 21000) return { red: 1, green: 0.85, blue: 0.7 };
    // Common tier - Soft yellow
    if (numScore >= 18000) return { red: 1, green: 0.95, blue: 0.75 };
    // Beginner tier - Light blue
    if (numScore >= 15000) return { red: 0.8, green: 0.9, blue: 1 };
    // Starter tier - Mint
    if (numScore >= 10000) return { red: 0.85, green: 0.95, blue: 0.9 };
    return { red: 0.95, green: 0.95, blue: 0.95 };
  }

  // 🎭 Professional role colors with better contrast
  getRoleColor(role) {
    const roleColors = {
      'Tank': { red: 0.6, green: 0.75, blue: 0.9 },      // Soft blue
      'DPS': { red: 1, green: 0.75, blue: 0.75 },        // Soft red
      'Support': { red: 0.75, green: 0.9, blue: 0.75 }   // Soft green
    };
    return roleColors[role] || { red: 0.9, green: 0.9, blue: 0.9 };
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
                red: 0.7,
                green: 0.5,
                blue: 0.95
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
                  red: 0.7,
                  green: 0.6,
                  blue: 0.95
                },
                textFormat: {
                  foregroundColor: {
                    red: 1,
                    green: 1,
                    blue: 1
                  },
                  fontSize: 12,
                  bold: true,
                  fontFamily: 'Google Sans'
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                padding: {
                  top: 12,
                  bottom: 12,
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
                  fontSize: 10,
                  fontFamily: 'Google Sans'
                },
                horizontalAlignment: 'LEFT',
                verticalAlignment: 'MIDDLE',
                padding: {
                  top: 8,
                  bottom: 8,
                  left: 10,
                  right: 10
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
              width: 2,
              color: { red: 0.7, green: 0.6, blue: 0.95 }
            },
            bottom: {
              style: 'SOLID',
              width: 2,
              color: { red: 0.7, green: 0.6, blue: 0.95 }
            },
            left: {
              style: 'SOLID',
              width: 1,
              color: { red: 0.9, green: 0.9, blue: 0.95 }
            },
            right: {
              style: 'SOLID',
              width: 1,
              color: { red: 0.9, green: 0.9, blue: 0.95 }
            },
            innerHorizontal: {
              style: 'SOLID',
              width: 1,
              color: { red: 0.95, green: 0.95, blue: 0.98 }
            },
            innerVertical: {
              style: 'SOLID',
              width: 1,
              color: { red: 0.95, green: 0.95, blue: 0.98 }
            }
          }
        }
      ];

      // Alternating row colors with cute pastel scheme
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
                  ? { red: 0.98, green: 0.97, blue: 1 }      // Very light lavender
                  : { red: 1, green: 1, blue: 1 }            // Pure white
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

  async syncMemberList(mainCharacters, altCharacters) {
    if (!this.sheets) return;

    try {
      const totalMembers = mainCharacters.length + altCharacters.length;
      console.log(`📊 [SHEETS] Starting sync for ${totalMembers} total members (${mainCharacters.length} main + ${altCharacters.length} alts)...`);
      
      const headers = [
        'Discord Name',
        'IGN',
        'Type',
        'Class',
        'Subclass',
        'Role',
        'Ability Score',
        'Guild',
        'Timezone',
        'Registered'
      ];

      // Combine main and alt characters into one array
      const allMembers = [];
      
      // Add main characters
      mainCharacters.forEach(char => {
        allMembers.push({
          type: 'Main',
          discord_name: char.discord_name,
          ign: char.ign,
          class: char.class,
          subclass: char.subclass,
          role: char.role,
          ability_score: char.ability_score || '',
          guild: char.guild || '',
          timezone: char.timezone || '',
          created_at: char.created_at,
          isMain: true
        });
      });
      
      // Add alt characters
      altCharacters.forEach(alt => {
        allMembers.push({
          type: 'Alt',
          discord_name: alt.discord_name || 'Unknown',
          ign: alt.ign,
          class: alt.class,
          subclass: alt.subclass,
          role: alt.role,
          ability_score: '',
          guild: '',
          timezone: '',
          created_at: alt.created_at,
          isMain: false
        });
      });

      // Sort: Main characters first, then alts, both sorted by Discord name
      allMembers.sort((a, b) => {
        if (a.isMain !== b.isMain) {
          return a.isMain ? -1 : 1; // Mains first
        }
        return a.discord_name.localeCompare(b.discord_name);
      });

      const rows = allMembers.map(member => [
        member.discord_name,
        member.ign,
        member.type,
        member.class,
        member.subclass,
        member.role,
        member.ability_score,
        member.guild,
        member.timezone,
        new Date(member.created_at).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        })
      ]);

      console.log(`📊 [SHEETS] Clearing Member List sheet...`);
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: 'Member List!A:J',
      });

      console.log(`📊 [SHEETS] Writing ${rows.length} rows to Member List...`);
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Member List!A1',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [headers, ...rows],
        },
      });

      console.log(`📊 [SHEETS] Applying professional formatting...`);
      await this.formatProfessionalSheet('Member List', headers.length, rows.length);

      console.log(`📊 [SHEETS] Applying colors to all members...`);
      await this.applyMemberListColors('Member List', allMembers);

      console.log(`✅ [SHEETS] Member List synced successfully! (${mainCharacters.length} main + ${altCharacters.length} alts = ${totalMembers} total)`);
    } catch (error) {
      console.error('❌ [SHEETS] Error syncing member list:', error.message);
    }
  }

  async applyMemberListColors(sheetName, members) {
    if (!this.sheets || members.length === 0) return;

    try {
      console.log(`🎨 [SHEETS] Applying colorful formatting to ${members.length} members...`);
      
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
      if (!sheet) return;

      const sheetId = sheet.properties.sheetId;
      const requests = [];

      // Set column widths for Member List
      requests.push(
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 160 }, fields: 'pixelSize' } },  // Discord Name
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 180 }, fields: 'pixelSize' } },  // IGN
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 2, endIndex: 3 }, properties: { pixelSize: 80 }, fields: 'pixelSize' } },   // Type
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 3, endIndex: 4 }, properties: { pixelSize: 150 }, fields: 'pixelSize' } },  // Class
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 4, endIndex: 5 }, properties: { pixelSize: 130 }, fields: 'pixelSize' } },  // Subclass
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 5, endIndex: 6 }, properties: { pixelSize: 100 }, fields: 'pixelSize' } },  // Role
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 6, endIndex: 7 }, properties: { pixelSize: 140 }, fields: 'pixelSize' } },  // Ability Score
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 7, endIndex: 8 }, properties: { pixelSize: 120 }, fields: 'pixelSize' } },  // Guild
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 8, endIndex: 9 }, properties: { pixelSize: 200 }, fields: 'pixelSize' } },  // Timezone
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 9, endIndex: 10 }, properties: { pixelSize: 120 }, fields: 'pixelSize' } }  // Registered
      );

      for (let i = 0; i < members.length; i++) {
        const member = members[i];
        const rowIndex = i + 1;
        
        const classColor = this.getClassColor(member.class);
        const roleColor = this.getRoleColor(member.role);
        const abilityColor = member.ability_score ? this.getAbilityScoreColor(member.ability_score) : { red: 0.95, green: 0.95, blue: 0.95 };
        
        // Type column (Main/Alt) with cute pastel colors
        const typeColor = member.isMain 
          ? { red: 0.7, green: 0.9, blue: 0.75 }   // Soft mint green for Main
          : { red: 1, green: 0.85, blue: 0.7 };     // Soft peach for Alt
        
        const typeTextColor = member.isMain
          ? { red: 0.2, green: 0.5, blue: 0.3 }    // Dark green text
          : { red: 0.7, green: 0.4, blue: 0.2 };    // Dark orange text
        
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
                backgroundColor: typeColor,
                textFormat: {
                  bold: true,
                  fontSize: 10,
                  foregroundColor: typeTextColor
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
          }
        });

        // Class column with cute pastel background
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
                backgroundColor: classColor,
                textFormat: {
                  bold: true,
                  fontSize: 11,
                  foregroundColor: { red: 0.2, green: 0.2, blue: 0.3 }  // Dark text for readability
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                wrapStrategy: 'WRAP'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)'
          }
        });

        // Subclass column with even lighter pastel
        const lighterColor = {
          red: Math.min(classColor.red + 0.1, 0.98),
          green: Math.min(classColor.green + 0.1, 0.98),
          blue: Math.min(classColor.blue + 0.1, 0.98)
        };
        
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
                backgroundColor: lighterColor,
                textFormat: {
                  fontSize: 10,
                  italic: true,
                  foregroundColor: { red: 0.3, green: 0.3, blue: 0.4 }  // Soft gray text
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
          }
        });

        // Role column with cute pastel colors and dark text
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
                backgroundColor: roleColor,
                textFormat: {
                  bold: true,
                  fontSize: 10,
                  foregroundColor: { red: 0.2, green: 0.2, blue: 0.3 }  // Dark text for readability
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
          }
        });

        // Ability Score column with gradient tiers (only for main characters)
        if (member.ability_score && member.ability_score !== '') {
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
                  backgroundColor: abilityColor,
                  textFormat: {
                    bold: true,
                    fontSize: 11,
                    foregroundColor: { red: 0.25, green: 0.25, blue: 0.35 }  // Dark purple-gray text
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

        // Guild column with soft lavender (only for main characters)
        if (member.guild && member.guild !== '') {
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
                  backgroundColor: { red: 0.95, green: 0.93, blue: 0.98 },  // Soft lavender
                  textFormat: {
                    fontSize: 10,
                    bold: true,
                    fontFamily: 'Google Sans',
                    foregroundColor: { red: 0.4, green: 0.3, blue: 0.6 }   // Purple text
                  },
                  horizontalAlignment: 'CENTER',
                  verticalAlignment: 'MIDDLE'
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
            }
          });
        }
        
        // Timezone column with soft yellow (only for main characters)
        if (member.timezone && member.timezone !== '') {
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
                  backgroundColor: { red: 1, green: 0.98, blue: 0.9 },      // Soft cream
                  textFormat: {
                    fontSize: 9,
                    fontFamily: 'Google Sans',
                    foregroundColor: { red: 0.5, green: 0.4, blue: 0.2 }   // Brown text
                  },
                  horizontalAlignment: 'CENTER',
                  verticalAlignment: 'MIDDLE'
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
            }
          });
        }
        
        // Registered column with soft gray
        requests.push({
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: rowIndex,
              endRowIndex: rowIndex + 1,
              startColumnIndex: 9,
              endColumnIndex: 10
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.97, green: 0.97, blue: 0.98 },   // Very light gray
                textFormat: {
                  fontSize: 9,
                  italic: true,
                  foregroundColor: { red: 0.5, green: 0.5, blue: 0.55 }   // Medium gray text
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
        console.log(`✅ [SHEETS] Applied ${requests.length} color formats to Member List`);
      }
    } catch (error) {
      console.error('❌ [SHEETS] Error applying member list colors:', error.message);
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
    
    await this.syncMemberList(mainCharacters, altCharacters);
    
    console.log(`✅ [SHEETS] ========== FULL SYNC COMPLETE (${timestamp}) ==========\n`);
  }
}

export default new GoogleSheetsService();
