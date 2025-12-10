# Discord Guild Bot

Character management bot with Google Sheets sync.

## Setup

1. Create `.env` from `.env.example`
2. `npm install`
3. `npm run deploy`
4. `npm start`

## Commands

### User Commands
- `/register-character` - Register your main character
- `/edit-character` - Manage your characters (add/edit/remove)
- `/view-character` - View character profiles

### Admin Commands
- `/admin-heal sync` - Force sync to Google Sheets
- `/admin-heal edit-character` - Edit any user's character
- `/admin-heal stats` - View bot statistics

## Configuration

### Ephemeral Messages
Control message visibility in `.env`:
- `REGISTER_CHAR_EPHEMERAL=true` - Registration messages (default: true)
- `EDIT_CHAR_EPHEMERAL=true` - Edit/manage messages (default: true)
- `VIEW_CHAR_EPHEMERAL=false` - View profile messages (default: false)
- `ADMIN_EPHEMERAL=true` - Admin command messages (default: true)

Set to `false` to make messages visible to everyone in the channel.
