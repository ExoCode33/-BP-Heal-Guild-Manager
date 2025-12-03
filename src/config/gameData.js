// Game data configuration
export const GAME_DATA = {
  classes: {
    'Beat Performer': {
      subclasses: ['Dissonance', 'Concerto'],
      role: 'Support'
    },
    'Frost Mage': {
      subclasses: ['Icicle', 'Frostbeam'],
      role: 'DPS'
    },
    'Heavy Guardian': {
      subclasses: ['Earthfort', 'Block'],
      role: 'Tank'
    },
    'Marksman': {
      subclasses: ['Wildpack', 'Falconry'],
      role: 'DPS'
    },
    'Shield Knight': {
      subclasses: ['Recovery', 'Shield'],
      role: 'Tank'
    },
    'Stormblade': {
      subclasses: ['Iaido', 'Moonstrike'],
      role: 'DPS'
    },
    'Verdant Oracle': {
      subclasses: ['Smite', 'Lifebind'],
      role: 'Support'
    },
    'Wind Knight': {
      subclasses: ['Vanguard', 'Skyward'],
      role: 'DPS'
    }
  },
  
  // Role-based guilds
  guilds: {
    Tank: ['Tank Guild 1', 'Tank Guild 2', 'Tank Guild 3'],
    DPS: ['DPS Guild 1', 'DPS Guild 2', 'DPS Guild 3'],
    Support: ['Support Guild 1', 'Support Guild 2', 'Support Guild 3']
  },
  
  // Timezones with better descriptions
  timezones: [
    { value: 'UTC-12', label: 'UTC-12 (Baker Island)' },
    { value: 'UTC-11', label: 'UTC-11 (American Samoa)' },
    { value: 'UTC-10', label: 'UTC-10 (Hawaii)' },
    { value: 'UTC-9', label: 'UTC-9 (Alaska)' },
    { value: 'UTC-8', label: 'UTC-8 (Pacific Time - LA, Vancouver)' },
    { value: 'UTC-7', label: 'UTC-7 (Mountain Time - Denver, Phoenix)' },
    { value: 'UTC-6', label: 'UTC-6 (Central Time - Chicago, Mexico City)' },
    { value: 'UTC-5', label: 'UTC-5 (Eastern Time - NYC, Toronto)' },
    { value: 'UTC-4', label: 'UTC-4 (Atlantic Time - Halifax, Caracas)' },
    { value: 'UTC-3', label: 'UTC-3 (Buenos Aires, São Paulo)' },
    { value: 'UTC-2', label: 'UTC-2 (South Georgia)' },
    { value: 'UTC-1', label: 'UTC-1 (Azores, Cape Verde)' },
    { value: 'UTC+0', label: 'UTC+0 (London, Lisbon, Reykjavik)' },
    { value: 'UTC+1', label: 'UTC+1 (Paris, Berlin, Rome)' },
    { value: 'UTC+2', label: 'UTC+2 (Cairo, Athens, Helsinki)' },
    { value: 'UTC+3', label: 'UTC+3 (Moscow, Istanbul, Riyadh)' },
    { value: 'UTC+4', label: 'UTC+4 (Dubai, Baku)' },
    { value: 'UTC+5', label: 'UTC+5 (Pakistan, Maldives)' },
    { value: 'UTC+6', label: 'UTC+6 (Bangladesh, Kazakhstan)' },
    { value: 'UTC+7', label: 'UTC+7 (Bangkok, Jakarta, Hanoi)' },
    { value: 'UTC+8', label: 'UTC+8 (Beijing, Singapore, Perth)' },
    { value: 'UTC+9', label: 'UTC+9 (Tokyo, Seoul, Pyongyang)' },
    { value: 'UTC+10', label: 'UTC+10 (Sydney, Melbourne, Brisbane)' },
    { value: 'UTC+11', label: 'UTC+11 (Solomon Islands, New Caledonia)' },
    { value: 'UTC+12', label: 'UTC+12 (Auckland, Fiji)' }
  ]
};

// Helper function to get role from class
export function getRoleFromClass(className) {
  return GAME_DATA.classes[className]?.role || 'Unknown';
}

// Helper function to get subclasses for a class
export function getSubclassesForClass(className) {
  return GAME_DATA.classes[className]?.subclasses || [];
}

// Helper function to get guilds for a role
export function getGuildsForRole(role) {
  return GAME_DATA.guilds[role] || [];
}

// Helper function to validate class and subclass combination
export function isValidClassSubclass(className, subclass) {
  const classData = GAME_DATA.classes[className];
  if (!classData) return false;
  return classData.subclasses.includes(subclass);
}
