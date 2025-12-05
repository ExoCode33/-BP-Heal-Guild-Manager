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

  // 🎨 Professional color palette - Strategic use only
  getTypeColor(type) {
    if (type === 'Main') return { red: 0.29, green: 0.56, blue: 0.89 }; // Professional Blue
    if (type === 'Alt') return { red: 0.95, green: 0.61, blue: 0.07 }; // Amber
    return { red: 0.62, green: 0.64, blue: 0.66 }; // Neutral Gray for Subclass
  }

  getRoleColor(role) {
    if (role === 'Tank') return { red: 0.26, green: 0.52, blue: 0.96 };
    if (role === 'DPS') return { red: 0.96, green: 0.26, blue: 0.21 };
    if (role === 'Support') return { red: 0.30, green: 0.69, blue: 0.31 };
    return { red: 0.62, green: 0.64, blue: 0.66 };
  }

  getAbilityScoreTier(score) {
    if (!score || score === '') return { tier: 'None', color: { red: 0.96, green: 0.96, blue: 0.96 } };
    
    const numScore = parseInt(score);
    
    if (numScore >= 40000) return { tier: 'S+', color: { red: 0.61, green: 0.15, blue: 0.69 } }; // Purple
    if (numScore >= 35000) return { tier: 'S', color: { red: 0.84, green: 0.15, blue: 0.16 } }; // Red
    if (numScore >= 30000) return { tier: 'A+', color: { red: 0.95, green: 0.49, blue: 0.13 } }; // Orange
    if (numScore >= 25000) return { tier: 'A', color: { red: 0.97, green: 0.73, blue: 0.15 } }; // Gold
    if (numScore >= 20000) return { tier: 'B+', color: { red: 0.55, green: 0.76, blue: 0.29 } }; // Light Green
    if (numScore >= 15000) return { tier: 'B', color: { red: 0.30, green: 0.69, blue: 0.31 } }; // Green
    if (numScore >= 10000) return { tier: 'C', color: { red: 0.26, green: 0.59, blue: 0.98 } }; // Blue
    return { tier: 'D', color: { red: 0.62, green: 0.64, blue: 0.66 } }; // Gray
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
        // Professional sheet properties
        {
          updateSheetProperties: {
            properties: {
              sheetId: sheetId,
              gridProperties: {
                frozenRowCount: 1,
                hideGridlines: false // Keep subtle gridlines for professional look
              },
              tabColor: {
                red: 0.26,
                green: 0.52,
                blue: 0.96
              }
            },
            fields: 'gridProperties.frozenRowCount,gridProperties.hideGridlines,tabColor'
          }
        },
        // Corporate header - Navy blue
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
                  red: 0.20,
                  green: 0.25,
                  blue: 0.37
                },
                textFormat: {
                  foregroundColor: {
                    red: 1,
                    green: 1,
                    blue: 1
                  },
                  fontSize: 11,
                  bold: true,
                  fontFamily: 'Arial'
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
            fields: 'userEnteredFormat'
          }
        },
        // Professional border under header
        {
          updateBorders: {
            range: {
              sheetId: sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: headerCount
            },
            bottom: {
              style: 'SOLID_MEDIUM',
              width: 2,
              color: { red: 0.20, green: 0.25, blue: 0.37 }
            }
          }
        }
      ];

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: { requests }
      });

      console.log(`✅ [SHEETS] Professional formatting applied to ${sheetName}`);
    } catch (error) {
      console.error(`Error formatting ${sheetName}:`, error.message);
    }
  }

  async syncMemberList(allCharactersWithSubclasses) {
    if (!this.sheets) return;

    try {
      console.log(`📊 [SHEETS] Starting professional sync...`);
      
      const { queries } = await import('../database/queries.js');
      
      const headers = [
        'Discord Name',
        'IGN',
        'Type',
        'Class',
        'Subclass',
        'Role',
        'Score',
        'Tier',
        'Guild',
        'Timezone',
        'Registered'
      ];

      const rows = [];
      const rowMetadata = [];

      // Group characters by discord_id
      const userGroups = {};
      allCharactersWithSubclasses.forEach(char => {
        if (!userGroups[char.discord_id]) {
          userGroups[char.discord_id] = [];
        }
        userGroups[char.discord_id].push(char);
      });

      // Process each user's characters
      for (const [discordId, userChars] of Object.entries(userGroups)) {
        const mainChar = userChars.find(c => c.character_type === 'main');
        const mainSubclasses = userChars.filter(c => c.character_type === 'main_subclass');
        const alts = userChars.filter(c => c.character_type === 'alt');
        
        let userTimezone = '';
        try {
          const timezoneData = await queries.getUserTimezone(discordId);
          userTimezone = timezoneData?.timezone || '';
        } catch (error) {
          console.log(`⚠️ [SHEETS] Could not fetch timezone for ${discordId}`);
        }
        
        let discordName = '';
        
        if (mainChar) {
          discordName = mainChar.discord_name;
          const scoreTier = this.getAbilityScoreTier(mainChar.ability_score);
          
          rows.push([
            discordName,
            mainChar.ign,
            'Main',
            mainChar.class,
            mainChar.subclass,
            mainChar.role,
            mainChar.ability_score || '',
            scoreTier.tier,
            mainChar.guild || '',
            userTimezone || '',
            `'${this.formatDate(mainChar.created_at)}`
          ]);

          rowMetadata.push({
            character: mainChar,
            discordName: discordName,
            timezone: userTimezone,
            scoreTier: scoreTier,
            isSubclass: false,
            isMain: true,
            isAlt: false,
            isFirstInGroup: true
          });

          mainSubclasses.forEach(subclass => {
            const subScoreTier = this.getAbilityScoreTier(subclass.ability_score);
            
            rows.push([
              '',
              `  ↳ ${subclass.class}`,
              'Subclass',
              subclass.class,
              subclass.subclass,
              subclass.role,
              subclass.ability_score || '',
              subScoreTier.tier,
              '',
              '',
              ''
            ]);

            rowMetadata.push({
              character: subclass,
              discordName: discordName,
              timezone: userTimezone,
              scoreTier: subScoreTier,
              parentIGN: mainChar.ign,
              isSubclass: true,
              isMain: false,
              isAlt: false,
              isFirstInGroup: false
            });
          });
        }

        alts.forEach((alt, altIndex) => {
          const altScoreTier = this.getAbilityScoreTier(alt.ability_score);
          
          rows.push([
            altIndex === 0 && mainSubclasses.length === 0 ? '' : '',
            alt.ign,
            'Alt',
            alt.class,
            alt.subclass,
            alt.role,
            alt.ability_score || '',
            altScoreTier.tier,
            alt.guild || '',
            '',
            `'${this.formatDate(alt.created_at)}`
          ]);

          rowMetadata.push({
            character: alt,
            discordName: discordName,
            timezone: userTimezone,
            scoreTier: altScoreTier,
            isSubclass: false,
            isMain: false,
            isAlt: true,
            isFirstInGroup: altIndex === 0 && mainSubclasses.length === 0
          });

          const altSubclasses = userChars.filter(c => 
            c.character_type === 'alt_subclass' && 
            c.parent_character_id === alt.id
          );

          altSubclasses.forEach(subclass => {
            const subScoreTier = this.getAbilityScoreTier(subclass.ability_score);
            
            rows.push([
              '',
              `  ↳ ${subclass.class}`,
              'Subclass',
              subclass.class,
              subclass.subclass,
              subclass.role,
              subclass.ability_score || '',
              subScoreTier.tier,
              '',
              '',
              ''
            ]);

            rowMetadata.push({
              character: subclass,
              discordName: discordName,
              timezone: userTimezone,
              scoreTier: subScoreTier,
              parentIGN: alt.ign,
              isSubclass: true,
              isMain: false,
              isAlt: false,
              isFirstInGroup: false
            });
          });
        });
      }

      console.log(`📊 [SHEETS] Clearing Member List sheet...`);
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: 'Member List!A:K',
      });

      console.log(`📊 [SHEETS] Writing ${rows.length} rows to Member List...`);
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Member List!A1',
        valueInputOption: 'RAW',
        resource: {
          values: [headers, ...rows],
        },
      });

      console.log(`📊 [SHEETS] Applying professional formatting...`);
      await this.formatProfessionalSheet('Member List', headers.length, rows.length);

      console.log(`📊 [SHEETS] Applying professional design...`);
      await this.applyProfessionalDesign('Member List', rowMetadata);

      console.log(`✅ [SHEETS] Member List synced successfully! (${rows.length} total rows)`);
    } catch (error) {
      console.error('❌ [SHEETS] Error syncing member list:', error.message);
    }
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }

  async applyProfessionalDesign(sheetName, rowMetadata) {
    if (!this.sheets || rowMetadata.length === 0) return;

    try {
      console.log(`🎨 [SHEETS] Applying professional design to ${rowMetadata.length} rows...`);
      
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
      if (!sheet) return;

      const sheetId = sheet.properties.sheetId;
      const requests = [];

      // Professional column widths
      const columnWidths = [160, 150, 80, 140, 140, 75, 90, 50, 100, 170, 100];
      columnWidths.forEach((width, index) => {
        requests.push({
          updateDimensionProperties: {
            range: {
              sheetId: sheetId,
              dimension: 'COLUMNS',
              startIndex: index,
              endIndex: index + 1
            },
            properties: {
              pixelSize: width
            },
            fields: 'pixelSize'
          }
        });
      });

      // Professional row heights
      for (let i = 0; i < rowMetadata.length; i++) {
        const meta = rowMetadata[i];
        const rowHeight = meta.isSubclass ? 32 : 36;
        
        requests.push({
          updateDimensionProperties: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: i + 1,
              endIndex: i + 2
            },
            properties: {
              pixelSize: rowHeight
            },
            fields: 'pixelSize'
          }
        });
      }

      // Track user groups for borders
      let lastDiscordName = '';
      let userGroupStart = 1;

      // Apply professional styling to each row
      for (let i = 0; i < rowMetadata.length; i++) {
        const rowIndex = i + 1;
        const meta = rowMetadata[i];
        const member = meta.character;
        
        // Detect user group changes
        const isNewUserGroup = meta.discordName !== lastDiscordName && meta.discordName !== '';
        if (isNewUserGroup) {
          lastDiscordName = meta.discordName;
          userGroupStart = rowIndex;
        }
        
        // Professional alternating background
        const rowBg = meta.isSubclass 
          ? { red: 0.97, green: 0.97, blue: 0.98 }
          : { red: 1, green: 1, blue: 1 };
        
        // Discord Name (A) - Only show for main characters
        if (meta.isMain) {
          requests.push({
            repeatCell: {
              range: {
                sheetId: sheetId,
                startRowIndex: rowIndex,
                endRowIndex: rowIndex + 1,
                startColumnIndex: 0,
                endColumnIndex: 1
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: rowBg,
                  textFormat: {
                    fontSize: 10,
                    fontFamily: 'Arial',
                    foregroundColor: { red: 0.13, green: 0.13, blue: 0.13 },
                    bold: true
                  },
                  horizontalAlignment: 'LEFT',
                  verticalAlignment: 'MIDDLE'
                }
              },
              fields: 'userEnteredFormat'
            }
          });
        } else {
          requests.push({
            repeatCell: {
              range: {
                sheetId: sheetId,
                startRowIndex: rowIndex,
                endRowIndex: rowIndex + 1,
                startColumnIndex: 0,
                endColumnIndex: 1
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: rowBg
                }
              },
              fields: 'userEnteredFormat(backgroundColor)'
            }
          });
        }

        // IGN (B) - Professional text
        const ignColor = meta.isSubclass 
          ? { red: 0.46, green: 0.46, blue: 0.46 }
          : { red: 0.13, green: 0.13, blue: 0.13 };
        
        requests.push({
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: rowIndex,
              endRowIndex: rowIndex + 1,
              startColumnIndex: 1,
              endColumnIndex: 2
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: rowBg,
                textFormat: {
                  fontSize: 10,
                  fontFamily: meta.isSubclass ? 'Courier New' : 'Arial',
                  foregroundColor: ignColor,
                  bold: !meta.isSubclass,
                  italic: meta.isSubclass
                },
                horizontalAlignment: 'LEFT',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat'
          }
        });

        // Type (C) - Strategic color badge
        const typeColor = this.getTypeColor(member.character_type === 'main' ? 'Main' : member.character_type === 'alt' ? 'Alt' : 'Subclass');
        this.addProfessionalBadge(requests, sheetId, rowIndex, 2, typeColor, rowBg);
        
        // Class (D) - Clean text
        this.addCleanText(requests, sheetId, rowIndex, 3, rowBg);
        
        // Subclass (E) - Clean text
        this.addCleanText(requests, sheetId, rowIndex, 4, rowBg);
        
        // Role (F) - Strategic color badge
        const roleColor = this.getRoleColor(member.role);
        this.addProfessionalBadge(requests, sheetId, rowIndex, 5, roleColor, rowBg);
        
        // Score (G) - Right-aligned number
        this.addNumberCell(requests, sheetId, rowIndex, 6, rowBg);
        
        // Tier (H) - Strategic color badge
        if (meta.scoreTier.tier !== 'None') {
          this.addProfessionalBadge(requests, sheetId, rowIndex, 7, meta.scoreTier.color, rowBg);
        } else {
          this.addCleanText(requests, sheetId, rowIndex, 7, rowBg);
        }
        
        // Guild (I) - Clean text
        this.addCleanText(requests, sheetId, rowIndex, 8, rowBg);
        
        // Timezone (J) - Subtle text
        this.addSubtleText(requests, sheetId, rowIndex, 9, rowBg);
        
        // Registered (K) - Subtle text
        this.addSubtleText(requests, sheetId, rowIndex, 10, rowBg);

        // Professional borders - Group separation
        const isLastInGroup = i === rowMetadata.length - 1 || 
                              (i + 1 < rowMetadata.length && rowMetadata[i + 1].isMain);
        
        if (isLastInGroup) {
          // Thick border at end of user group
          requests.push({
            updateBorders: {
              range: {
                sheetId: sheetId,
                startRowIndex: rowIndex,
                endRowIndex: rowIndex + 1,
                startColumnIndex: 0,
                endColumnIndex: 11
              },
              bottom: {
                style: 'SOLID_MEDIUM',
                width: 2,
                color: { red: 0.20, green: 0.25, blue: 0.37 }
              }
            }
          });
        } else {
          // Subtle border between rows
          requests.push({
            updateBorders: {
              range: {
                sheetId: sheetId,
                startRowIndex: rowIndex,
                endRowIndex: rowIndex + 1,
                startColumnIndex: 0,
                endColumnIndex: 11
              },
              bottom: {
                style: 'SOLID',
                width: 1,
                color: { red: 0.90, green: 0.90, blue: 0.90 }
              }
            }
          });
        }
      }

      // Apply in batches
      if (requests.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < requests.length; i += batchSize) {
          const batch = requests.slice(i, i + batchSize);
          await this.sheets.spreadsheets.batchUpdate({
            spreadsheetId: this.spreadsheetId,
            requestBody: { requests: batch }
          });
        }
        console.log(`✅ [SHEETS] Applied ${requests.length} professional styling requests`);
      }
    } catch (error) {
      console.error('❌ [SHEETS] Error applying professional design:', error.message);
    }
  }

  addProfessionalBadge(requests, sheetId, rowIndex, colIndex, bgColor, rowBg) {
    requests.push({
      repeatCell: {
        range: {
          sheetId: sheetId,
          startRowIndex: rowIndex,
          endRowIndex: rowIndex + 1,
          startColumnIndex: colIndex,
          endColumnIndex: colIndex + 1
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: bgColor,
            textFormat: {
              bold: true,
              fontSize: 9,
              foregroundColor: { red: 1, green: 1, blue: 1 },
              fontFamily: 'Arial'
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat'
      }
    });
  }

  addCleanText(requests, sheetId, rowIndex, colIndex, rowBg) {
    requests.push({
      repeatCell: {
        range: {
          sheetId: sheetId,
          startRowIndex: rowIndex,
          endRowIndex: rowIndex + 1,
          startColumnIndex: colIndex,
          endColumnIndex: colIndex + 1
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: rowBg,
            textFormat: {
              fontSize: 10,
              fontFamily: 'Arial',
              foregroundColor: { red: 0.13, green: 0.13, blue: 0.13 }
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat'
      }
    });
  }

  addSubtleText(requests, sheetId, rowIndex, colIndex, rowBg) {
    requests.push({
      repeatCell: {
        range: {
          sheetId: sheetId,
          startRowIndex: rowIndex,
          endRowIndex: rowIndex + 1,
          startColumnIndex: colIndex,
          endColumnIndex: colIndex + 1
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: rowBg,
            textFormat: {
              fontSize: 9,
              fontFamily: 'Arial',
              foregroundColor: { red: 0.46, green: 0.46, blue: 0.46 }
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            numberFormat: {
              type: 'TEXT'
            }
          }
        },
        fields: 'userEnteredFormat'
      }
    });
  }

  addNumberCell(requests, sheetId, rowIndex, colIndex, rowBg) {
    requests.push({
      repeatCell: {
        range: {
          sheetId: sheetId,
          startRowIndex: rowIndex,
          endRowIndex: rowIndex + 1,
          startColumnIndex: colIndex,
          endColumnIndex: colIndex + 1
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: rowBg,
            textFormat: {
              fontSize: 10,
              fontFamily: 'Arial',
              foregroundColor: { red: 0.13, green: 0.13, blue: 0.13 }
            },
            horizontalAlignment: 'RIGHT',
            verticalAlignment: 'MIDDLE',
            numberFormat: {
              type: 'NUMBER',
              pattern: '#,##0'
            }
          }
        },
        fields: 'userEnteredFormat'
      }
    });
  }

  async fullSync(allCharactersWithSubclasses) {
    const timestamp = new Date().toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    console.log(`\n🔄 [SHEETS] ========== FULL SYNC STARTED (${timestamp}) ==========`);
    
    await this.syncMemberList(allCharactersWithSubclasses);
    
    console.log(`✅ [SHEETS] ========== FULL SYNC COMPLETE (${timestamp}) ==========\n`);
  }
}

export default new GoogleSheetsService();
