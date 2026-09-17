/**
 * Static micro-tag list for IndieVault.
 * These are specific, descriptive tags (not broad genres) that help
 * players find games through meaningful discovery signals.
 *
 * AI-powered tag suggestions (step 7) will augment this static list.
 */

const MICRO_TAGS = {
  'Gameplay Style': [
    'cozy farming sim',
    'roguelike deckbuilder',
    'narrative horror',
    'bullet hell',
    'metroidvania',
    'souls-like',
    'tower defense',
    'idle clicker',
    'city builder',
    'survival crafting',
    'turn-based tactics',
    'real-time strategy',
    'visual novel',
    'point-and-click adventure',
    'rhythm game',
    'sandbox exploration'
  ],
  'Mood & Aesthetic': [
    'pixel art',
    'hand-drawn art',
    'lo-fi aesthetic',
    'neon cyberpunk',
    'dark fantasy',
    'wholesome',
    'atmospheric horror',
    'retro 8-bit',
    'minimalist',
    'pastel dreamscape',
    'steampunk'
  ],
  'Mechanics & Features': [
    'procedural generation',
    'base building',
    'crafting system',
    'dialogue choices',
    'permadeath',
    'time loop',
    'deck building',
    'physics-based puzzles',
    'character customization',
    'co-op multiplayer',
    'local couch co-op',
    'modding support',
    'level editor'
  ],
  'Theme & Setting': [
    'post-apocalyptic',
    'space exploration',
    'underwater adventure',
    'medieval fantasy',
    'modern day',
    'mythological',
    'sci-fi dystopia',
    'slice of life',
    'detective mystery',
    'cosmic horror',
    'animal protagonists'
  ],
  'Session Length & Accessibility': [
    'short sessions (< 30 min)',
    'long campaign (20+ hours)',
    'pick up and play',
    'controller support',
    'accessibility options',
    'colorblind friendly',
    'keyboard only'
  ]
};

// Flat list of all tags for validation
const ALL_TAGS = Object.values(MICRO_TAGS).flat();

module.exports = { MICRO_TAGS, ALL_TAGS };
