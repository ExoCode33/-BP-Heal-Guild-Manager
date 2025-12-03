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

  async syncMainCharacters(characters) {
    if (!this.sheets) {
      return; // Skip if not initialized
    }

    try {
      // Prepare headers
      const headers = [
        'Discord ID',
        'Discord Name',
        'IGN',
        'Role',
        'Class',
        'Subclass',
        'Ability Score',
        'Timezone',
        'Guild',
        'Last Updated'
      ];

      // Prepare data rows
      const rows = characters.map(char => [
        char.discord_id,
        char.discord_name,
        char.ign,
        char.role,
        char.class,
        char.subclass,
        char.ability_score || '',
        char.timezone || '',
        char.guild,
        new Date(char.updated_at).toISOString()
      ]);

      // Clear and update the sheet
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: 'Main Characters!A:J',
      });

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Main Characters!A1',
        valueInputOption: 'RAW',
        resource: {
          values: [headers, ...rows],
        },
      });

      console.log(`✅ Synced ${characters.length} main characters to Google Sheets`);
    } catch (error) {
      console.error('❌ Error syncing main characters to Google Sheets:', error);
    }
  }

  async syncAltCharacters(alts) {
    if (!this.sheets) {
      return; // Skip if not initialized
    }

    try {
      // Prepare headers
      const headers = [
        'Discord ID',
        'Main Character IGN',
        'Alt IGN',
        'Role',
        'Class',
        'Subclass',
        'Last Updated'
      ];

      // Prepare data rows
      const rows = alts.map(alt => [
        alt.discord_id,
        alt.main_character_id || '',
        alt.ign,
        alt.role,
        alt.class,
        alt.subclass,
        new Date(alt.updated_at).toISOString()
      ]);

      // Clear and update the sheet
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: 'Alt Characters!A:G',
      });

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Alt Characters!A1',
        valueInputOption: 'RAW',
        resource: {
          values: [headers, ...rows],
        },
      });

      console.log(`✅ Synced ${alts.length} alt characters to Google Sheets`);
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
