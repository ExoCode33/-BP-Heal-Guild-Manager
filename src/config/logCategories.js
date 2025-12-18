export const LOG_CATEGORIES = {
  startup: { name: 'Bot Startup', description: 'Bot initialization and startup', emoji: '🚀', group: 'System' },
  shutdown: { name: 'Bot Shutdown', description: 'Bot shutdown and restart', emoji: '🔴', group: 'System' },
  errors: { name: 'Errors', description: 'Error messages and exceptions', emoji: '❌', group: 'System' },
  commands: { name: 'Commands', description: 'Slash command executions', emoji: '⚡', group: 'Commands' },
  adminCommands: { name: 'Admin Commands', description: 'Admin-only commands', emoji: '👑', group: 'Commands' },
  registration: { name: 'Registration', description: 'New character registrations', emoji: '📝', group: 'Characters' },
  editing: { name: 'Editing', description: 'Character edits', emoji: '✏️', group: 'Characters' },
  deletion: { name: 'Deletion', description: 'Character deletions', emoji: '🗑️', group: 'Characters' },
  profileViews: { name: 'Profile Views', description: 'Profile views', emoji: '👁️', group: 'Characters' },
  interactions: { name: 'Interactions', description: 'Button/menu interactions', emoji: '🖱️', group: 'Interactions' },
  sheetsSync: { name: 'Sheets Sync', description: 'Google Sheets sync', emoji: '📊', group: 'Sync' },
  nicknameSync: { name: 'Nickname Sync', description: 'Nickname sync', emoji: '🏷️', group: 'Sync' },
};

export const LOG_GROUPS = {
  System: ['startup', 'shutdown', 'errors'],
  Commands: ['commands', 'adminCommands'],
  Characters: ['registration', 'editing', 'deletion', 'profileViews'],
  Interactions: ['interactions'],
  Sync: ['sheetsSync', 'nicknameSync']
};

export const DEFAULT_ENABLED = ['startup', 'shutdown', 'errors', 'commands', 'adminCommands', 'registration', 'editing', 'deletion', 'sheetsSync'];

export const BATCH_INTERVALS = [
  { label: 'Instant (No batching)', value: '0' },
  { label: 'Every 1 minute', value: '1' },
  { label: 'Every 5 minutes', value: '5' },
  { label: 'Every 10 minutes', value: '10' },
  { label: 'Every 30 minutes', value: '30' },
  { label: 'Every 1 hour', value: '60' },
];
