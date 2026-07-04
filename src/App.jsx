import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import * as THREE from "three";
import { supabase } from "./supabaseClient";

/* ═══════════════════════════════════════════════════════════════════════════
   GAME QUEUE — v4 / DEEP SPACE
   Categorized hardware, scrolling carousel, detailed 3D, real cover art
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── PALETTE ─────────────────────────────────────────────────────────────────
// Pure black void / chrome retro-futuristic. The 3D model halos do the
// colorful heavy lifting; the UI chrome stays cool and monochrome so the
// games pop against it.
const PAL = {
  void:    "#000000",  // true black background
  bg:      "#050508",  // panel-fill black (almost void)
  bgLight: "#0c0c12",  // slightly raised black for layered surfaces
  bgGlow:  "#10131c",  // accent fill behind glowing elements
  ink:     "#e8eef5",  // primary text — cool off-white
  inkDim:  "#7a8694",  // secondary text — chrome silver
  inkFaint:"#3a424f",  // tertiary text — dim chrome
  cyan:    "#4fdfff",  // primary accent — electric cyan
  magenta: "#ff4fa1",  // hot pink for destructive / sort accents
  amber:   "#ffb84f",  // 100% achievement star
  violet:  "#b8c4d8",  // formerly purple — now icy steel-blue for Queue accent
  emerald: "#5fffaf",  // beaten state
  danger:  "#ff5a5a",  // critical red
  line:    "rgba(180, 200, 220, 0.10)", // chrome outline, very subtle
};

const GENRE_HUES = {
  "Platformer": "#ffb84f", "RPG": "#4fdfff", "Action/Adventure": "#ff4fa1",
  "Racing": "#5fffaf", "Shooter": "#ff7a45", "Fighting": "#a96bff",
  "Sports": "#ffd84f",
  "Puzzle": "#f5a3c7", "Strategy": "#9ad17a", "Simulation": "#b8e87e",
  "Horror": "#c84bff", "Other": "#8590c4",
};
const GENRES = Object.keys(GENRE_HUES);

// Iconic game per genre — used in the onboarding genre picker to give each
// genre a recognizable visual anchor (a spinning 3D box of a representative
// game). Once real cover art is available these boxes will use the artwork.
const GENRE_ICONS = {
  "Platformer":       "Super Mario 64",
  "RPG":              "Pokemon Red",
  "Action/Adventure": "The Legend of Zelda: Ocarina of Time",
  "Racing":           "Mario Kart 64",
  "Shooter":          "Call of Duty 4: Modern Warfare",
  "Fighting":         "Super Smash Bros. Ultimate",
  "Sports":           "Wii Sports",
  "Puzzle":           "Tetris",
  "Strategy":         "Fire Emblem",
  "Simulation":       "Stardew Valley",
  "Horror":           "Resident Evil 4",
  "Other":            null, // generic placeholder
};

// ─── CONSOLE CATALOG WITH CATEGORIES ─────────────────────────────────────────
const CONSOLE_GROUPS = [
  // Home Consoles — Nintendo
  { id: "nes",         label: "NES",               category: "Home",     color: "#ff7a45", model: "n64",        accentColor: 0xff7a45 },
  { id: "snes",        label: "SNES",              category: "Home",     color: "#a96bff", model: "n64",        accentColor: 0xa96bff },
  { id: "nintendo64",  label: "Nintendo 64",       category: "Home",     color: "#4fdfff", model: "n64",        accentColor: 0x4fdfff },
  { id: "gamecube",    label: "GameCube",          category: "Home",     color: "#a96bff", model: "gamecube",   accentColor: 0xa96bff },
  { id: "wii",         label: "Wii / Wii U",       category: "Home",     color: "#dde0e8", model: "wii",        accentColor: 0xdde0e8 },
  // Home Consoles — Sega
  { id: "sega",        label: "Sega Genesis",      category: "Home",     color: "#ff7a45", model: "genesis",    accentColor: 0xff7a45 },
  { id: "dreamcast",   label: "Dreamcast",         category: "Home",     color: "#ffffff", model: "gamecube",   accentColor: 0xffffff },
  // Home Consoles — PlayStation
  { id: "ps1",         label: "PlayStation 1",     category: "Home",     color: "#9a9a9a", model: "ps",         accentColor: 0x9a9a9a },
  { id: "ps2",         label: "PlayStation 2",     category: "Home",     color: "#2a2a2a", model: "ps",         accentColor: 0x2a2a2a },
  { id: "ps3",         label: "PlayStation 3",     category: "Home",     color: "#4f8cff", model: "ps",         accentColor: 0x4f8cff },
  { id: "ps4",         label: "PlayStation 4",     category: "Home",     color: "#1a4fcf", model: "ps",         accentColor: 0x1a4fcf },
  { id: "ps5",         label: "PlayStation 5",     category: "Home",     color: "#ffffff", model: "ps",         accentColor: 0xffffff },
  { id: "playstation", label: "PlayStation",       category: "Home",     color: "#4f8cff", model: "ps",         accentColor: 0x4f8cff },
  // Home Consoles — Xbox
  { id: "xbox",        label: "Xbox",              category: "Home",     color: "#7fff7f", model: "xbox",       accentColor: 0x7fff7f },
  { id: "xbox360",     label: "Xbox 360",          category: "Home",     color: "#9fffaf", model: "xbox",       accentColor: 0x9fffaf },
  { id: "xboxone",     label: "Xbox One",          category: "Home",     color: "#2a4a3a", model: "xbox",       accentColor: 0x2a4a3a },
  { id: "xboxseries",  label: "Xbox Series X|S",   category: "Home",     color: "#1a1a1a", model: "xbox",       accentColor: 0x1a1a1a },
  // Handhelds
  { id: "gameboy",     label: "Game Boy",          category: "Handheld", color: "#dde0e8", model: "gameboy",    accentColor: 0xdde0e8 },
  { id: "gba",         label: "Game Boy Advance",  category: "Handheld", color: "#5a3fff", model: "gba",        accentColor: 0x5a3fff },
  { id: "ds",          label: "DS / 3DS",          category: "Handheld", color: "#5fffaf", model: "ds",         accentColor: 0x5fffaf },
  { id: "switch",      label: "Switch / Switch 2", category: "Handheld", color: "#ff5a5a", model: "switch",     accentColor: 0xff5a5a },
  { id: "handheld",    label: "Steam Deck / ROG",  category: "Handheld", color: "#ffd84f", model: "steamdeck",  accentColor: 0xffd84f },
  // PC
  { id: "pc",          label: "PC / Steam",        category: "PC",       color: "#dcd0ff", model: "monitor",    accentColor: 0xdcd0ff },
  { id: "emulator",    label: "Emulators",         category: "PC",       color: "#ff4fa1", model: "monitor",    accentColor: 0xff4fa1 },
];
const CATEGORIES = ["Home", "Handheld", "PC"];

// Brand grouping for the onboarding hardware picker.
// Each brand expands to show the user's specific consoles within that family.
// Order matters — shown in the carousel left to right.
const BRANDS = [
  { id: "nintendo",    label: "Nintendo",   color: "#ff4f4f", icon: "switch",   consoles: ["nes", "snes", "nintendo64", "gamecube", "wii", "gameboy", "gba", "ds", "switch"] },
  { id: "playstation", label: "PlayStation", color: "#4f8cff", icon: "ps",       consoles: ["ps1", "ps2", "ps3", "ps4", "ps5"] },
  { id: "xbox",        label: "Xbox",        color: "#7fff7f", icon: "xbox",     consoles: ["xbox", "xbox360", "xboxone", "xboxseries"] },
  { id: "sega",        label: "Sega",        color: "#ff7a45", icon: "genesis",  consoles: ["sega", "dreamcast"] },
  { id: "pc",          label: "PC / Other",  color: "#dcd0ff", icon: "monitor",  consoles: ["pc", "handheld", "emulator"] },
];

// Returns the brand color for any console id. Falls back to the console's own
// color if it's not part of any brand grouping (shouldn't happen but safe).
function brandColorOf(consoleId) {
  const b = BRANDS.find(br => br.consoles.includes(consoleId));
  if (b) return b.color;
  const c = CONSOLE_GROUPS.find(cg => cg.id === consoleId);
  return c?.color || "#a96bff";
}

// ─── GAME DATABASE WITH COVER ART ────────────────────────────────────────────
// Cover URLs from Wikipedia upload servers (CORS-friendly, stable thumbnails)
// Format: https://upload.wikimedia.org/wikipedia/en/thumb/... using /XXXpx-FILENAME
const COVER = (path) => `https://upload.wikimedia.org/wikipedia/en/thumb/${path}/180px-${path.split("/").pop()}`;

const GAME_DB = [
  // Mario
  {name:"Super Mario 64",franchise:"Super Mario",genre:"Platformer",year:1996,cover:"6/6a/Super_Mario_64_box_cover.jpg"},
  {name:"Super Mario Sunshine",franchise:"Super Mario",genre:"Platformer",year:2002,cover:"6/6e/Super_Mario_Sunshine_box_art.png"},
  {name:"Super Mario Galaxy",franchise:"Super Mario",genre:"Platformer",year:2007,cover:"4/49/Super_Mario_Galaxy.jpg"},
  {name:"Super Mario Galaxy 2",franchise:"Super Mario",genre:"Platformer",year:2010,cover:"5/55/Super_Mario_Galaxy_2_box_artwork.png"},
  {name:"Super Mario 3D World",franchise:"Super Mario",genre:"Platformer",year:2013,cover:"a/a4/Super_Mario_3D_World_box_artwork.png"},
  {name:"Super Mario Odyssey",franchise:"Super Mario",genre:"Platformer",year:2017,cover:"8/8d/Super_Mario_Odyssey_cover_art.jpg"},
  {name:"Super Mario Bros. Wonder",franchise:"Super Mario",genre:"Platformer",year:2023,cover:"5/56/Super_Mario_Bros._Wonder_-_Cover_Art.jpg"},
  {name:"Bowser's Fury",franchise:"Super Mario",genre:"Platformer",year:2021},
  {name:"Super Mario World",franchise:"Super Mario",genre:"Platformer",year:1990,cover:"3/32/Super_Mario_World_Coverart.png"},
  {name:"Paper Mario",franchise:"Super Mario",genre:"RPG",year:2000,cover:"7/7e/Paper_Mario_box_art.png"},
  {name:"Paper Mario: The Thousand-Year Door",franchise:"Super Mario",genre:"RPG",year:2004,cover:"a/a8/Paper_Mario_TTYD.jpg"},
  {name:"Super Mario RPG",franchise:"Super Mario",genre:"RPG",year:1996,cover:"6/6c/Super_Mario_RPG.jpg"},
  {name:"Luigi's Mansion",franchise:"Super Mario",genre:"Action/Adventure",year:2001,cover:"b/b8/Luigi%27s_Mansion_box_art.png"},
  {name:"Luigi's Mansion 3",franchise:"Super Mario",genre:"Action/Adventure",year:2019,cover:"6/63/Luigi%27s_Mansion_3_box_art.png"},
  // Zelda
  {name:"The Legend of Zelda: Ocarina of Time",franchise:"Zelda",genre:"Action/Adventure",year:1998,cover:"4/41/The_Legend_of_Zelda_Ocarina_of_Time_box_art.jpg"},
  {name:"The Legend of Zelda: Majora's Mask",franchise:"Zelda",genre:"Action/Adventure",year:2000,cover:"b/bf/The_Legend_of_Zelda_-_Majora%27s_Mask_Box_Art.jpg"},
  {name:"The Legend of Zelda: The Wind Waker",franchise:"Zelda",genre:"Action/Adventure",year:2002,cover:"6/6a/The_Legend_of_Zelda_The_Wind_Waker_box_art.jpg"},
  {name:"The Legend of Zelda: Twilight Princess",franchise:"Zelda",genre:"Action/Adventure",year:2006,cover:"6/65/The_Legend_of_Zelda_Twilight_Princess_Game_Cover.jpg"},
  {name:"The Legend of Zelda: Breath of the Wild",franchise:"Zelda",genre:"Action/Adventure",year:2017,cover:"c/c6/The_Legend_of_Zelda_Breath_of_the_Wild.jpg"},
  {name:"The Legend of Zelda: Tears of the Kingdom",franchise:"Zelda",genre:"Action/Adventure",year:2023,cover:"f/f0/The_Legend_of_Zelda_Tears_of_the_Kingdom_cover.jpg"},
  {name:"The Legend of Zelda: A Link to the Past",franchise:"Zelda",genre:"Action/Adventure",year:1991,cover:"6/6b/The_Legend_of_Zelda_A_Link_to_the_Past_SNES_Game_Cover.jpg"},
  // Sonic
  {name:"Sonic the Hedgehog",franchise:"Sonic",genre:"Platformer",year:1991,cover:"b/ba/Sonic_the_Hedgehog_1_Genesis_box_art.jpg"},
  {name:"Sonic Adventure",franchise:"Sonic",genre:"Platformer",year:1998,cover:"7/78/Sonic_Adventure.PNG"},
  {name:"Sonic Adventure 2",franchise:"Sonic",genre:"Platformer",year:2001,cover:"f/f5/Sonic_Adventure_2_box_art.png"},
  {name:"Sonic Heroes",franchise:"Sonic",genre:"Platformer",year:2003,cover:"d/d1/SonicHeroesPS2.png"},
  {name:"Shadow the Hedgehog",franchise:"Sonic",genre:"Platformer",year:2005,cover:"5/55/Shadow_the_Hedgehog_box_artwork.png"},
  {name:"Sonic Generations",franchise:"Sonic",genre:"Platformer",year:2011,cover:"6/6b/Sonic_Generations_cover.png"},
  {name:"Sonic Mania",franchise:"Sonic",genre:"Platformer",year:2017,cover:"d/d6/Sonic_Mania_cover_art.jpg"},
  {name:"Sonic Frontiers",franchise:"Sonic",genre:"Platformer",year:2022,cover:"a/a0/Sonic_Frontiers_cover_art.jpg"},
  {name:"Shadow Generations",franchise:"Sonic",genre:"Platformer",year:2024},
  // Pokemon
  {name:"Pokemon Red",franchise:"Pokemon",genre:"RPG",year:1996,cover:"9/98/Pokemon_Red_EN_boxart.jpg"},
  {name:"Pokemon Blue",franchise:"Pokemon",genre:"RPG",year:1996,cover:"5/53/Pokemon_Blue_EN_boxart.jpg"},
  {name:"Pokemon Gold",franchise:"Pokemon",genre:"RPG",year:1999,cover:"c/c6/Pokemon_Gold_EN_boxart.jpg"},
  {name:"Pokemon Silver",franchise:"Pokemon",genre:"RPG",year:1999,cover:"7/74/Pokemon_Silver_EN_boxart.jpg"},
  {name:"Pokemon Ruby",franchise:"Pokemon",genre:"RPG",year:2002,cover:"5/5b/Pokemon_Ruby_box_art.jpg"},
  {name:"Pokemon Sapphire",franchise:"Pokemon",genre:"RPG",year:2002,cover:"f/fb/Pokemon_Sapphire_box_art.jpg"},
  {name:"Pokemon Emerald",franchise:"Pokemon",genre:"RPG",year:2004,cover:"6/68/Pokemon_Emerald_box.png"},
  {name:"Pokemon FireRed",franchise:"Pokemon",genre:"RPG",year:2004,cover:"1/1b/Pokemon_FireRed_box.jpg"},
  {name:"Pokemon LeafGreen",franchise:"Pokemon",genre:"RPG",year:2004,cover:"a/a6/Pokemon_LeafGreen_box.jpg"},
  {name:"Pokemon Diamond",franchise:"Pokemon",genre:"RPG",year:2006,cover:"a/a0/Pokemon_Diamond_box.jpg"},
  {name:"Pokemon HeartGold",franchise:"Pokemon",genre:"RPG",year:2009,cover:"6/65/Pokemon_HeartGold_box.jpg"},
  {name:"Pokemon SoulSilver",franchise:"Pokemon",genre:"RPG",year:2009,cover:"6/63/Pokemon_SoulSilver_box.jpg"},
  {name:"Pokemon Sword",franchise:"Pokemon",genre:"RPG",year:2019,cover:"4/41/Pokemon_Sword_and_Shield_EN_cover.png"},
  {name:"Pokemon Scarlet",franchise:"Pokemon",genre:"RPG",year:2022,cover:"e/e1/Pokemon_Scarlet_EN_boxart.png"},
  {name:"Pokemon Violet",franchise:"Pokemon",genre:"RPG",year:2022,cover:"a/aa/Pokemon_Violet_EN_boxart.png"},
  {name:"Pokemon Snap",franchise:"Pokemon",genre:"Other",year:1999,cover:"7/70/Pokemonsnapna.png"},
  {name:"Pokemon Colosseum",franchise:"Pokemon",genre:"RPG",year:2003,cover:"6/63/Pokemon_Colosseum_box.jpg"},
  // Banjo / Rare
  {name:"Banjo-Kazooie",franchise:"Banjo-Kazooie",genre:"Platformer",year:1998,cover:"c/c4/Banjo-Kazooie_Cover.png"},
  {name:"Banjo-Tooie",franchise:"Banjo-Kazooie",genre:"Platformer",year:2000,cover:"d/d8/Banjo-Tooie_Coverart.png"},
  {name:"Conker's Bad Fur Day",franchise:"Rare",genre:"Platformer",year:2001,cover:"3/35/Conker%27s_Bad_Fur_Day.jpg"},
  {name:"Donkey Kong 64",franchise:"Donkey Kong",genre:"Platformer",year:1999,cover:"5/57/Donkey_Kong_64.jpg"},
  {name:"Donkey Kong Country",franchise:"Donkey Kong",genre:"Platformer",year:1994,cover:"4/47/Donkey_Kong_Country_SNES_cover.png"},
  {name:"Donkey Kong Country: Tropical Freeze",franchise:"Donkey Kong",genre:"Platformer",year:2014,cover:"5/50/Donkey_Kong_Country_Tropical_Freeze_box_art.png"},
  {name:"Donkey Kong Bonanza",franchise:"Donkey Kong",genre:"Platformer",year:2025},
  {name:"GoldenEye 007",franchise:"007",genre:"Shooter",year:1997,cover:"3/3b/GoldenEye_007_box_art.jpg"},
  // Crash / Spyro
  {name:"Crash Bandicoot",franchise:"Crash Bandicoot",genre:"Platformer",year:1996,cover:"7/79/Crash_Bandicoot_Cover.png"},
  {name:"Crash Bandicoot 2: Cortex Strikes Back",franchise:"Crash Bandicoot",genre:"Platformer",year:1997,cover:"8/80/Crash_Bandicoot_2_-_Cortex_Strikes_Back_cover.png"},
  {name:"Crash Bandicoot 3: Warped",franchise:"Crash Bandicoot",genre:"Platformer",year:1998,cover:"b/b3/Crash_Bandicoot_3_-_Warped_-_NA_PS_cover_art.jpg"},
  {name:"Crash Bandicoot: The Wrath of Cortex",franchise:"Crash Bandicoot",genre:"Platformer",year:2001,cover:"e/e9/Crash_Bandicoot_-_The_Wrath_of_Cortex_Coverart.png"},
  {name:"Crash Bandicoot 4: It's About Time",franchise:"Crash Bandicoot",genre:"Platformer",year:2020,cover:"d/d6/Crash_Bandicoot_4_It%27s_About_Time_cover_art.png"},
  {name:"Spyro the Dragon",franchise:"Spyro",genre:"Platformer",year:1998,cover:"4/4e/Spyro_the_Dragon_cover.jpg"},
  // Pac-Man
  {name:"Pac-Man World",franchise:"Pac-Man",genre:"Platformer",year:1999,cover:"d/dd/Pac-Man_World_-_20th_Anniversary_Coverart.png"},
  {name:"Pac-Man World 2",franchise:"Pac-Man",genre:"Platformer",year:2002,cover:"5/56/Pac-Man_World_2_Coverart.png"},
  {name:"Pac-Man World 3",franchise:"Pac-Man",genre:"Platformer",year:2005,cover:"f/f5/Pac-Man_World_3_Coverart.png"},
  // Metroid
  {name:"Metroid Prime",franchise:"Metroid",genre:"Action/Adventure",year:2002,cover:"b/b1/Metroid_Prime_box_art.png"},
  {name:"Metroid Dread",franchise:"Metroid",genre:"Action/Adventure",year:2021,cover:"a/a4/Metroid_Dread_cover_art.jpg"},
  // Smash
  {name:"Super Smash Bros. Melee",franchise:"Smash Bros",genre:"Fighting",year:2001,cover:"b/b0/SSBM_NTSC-U_gamebox.jpg"},
  {name:"Super Smash Bros. Brawl",franchise:"Smash Bros",genre:"Fighting",year:2008,cover:"a/aa/SSBB.jpg"},
  {name:"Super Smash Bros. Ultimate",franchise:"Smash Bros",genre:"Fighting",year:2018,cover:"f/fa/Super_Smash_Bros._Ultimate.jpg"},
  // Halo
  {name:"Halo: Combat Evolved",franchise:"Halo",genre:"Shooter",year:2001,cover:"4/48/Halo_-_Combat_Evolved_%28XBox_version_-_box_art%29.jpg"},
  {name:"Halo 2",franchise:"Halo",genre:"Shooter",year:2004,cover:"6/60/Halo_2_-_Box_Art.jpg"},
  {name:"Halo 3",franchise:"Halo",genre:"Shooter",year:2007,cover:"f/f9/Halo3_FinalBoxart.jpg"},
  {name:"Halo: Reach",franchise:"Halo",genre:"Shooter",year:2010,cover:"5/52/Halo-_Reach_box_art.png"},
  {name:"Halo Infinite",franchise:"Halo",genre:"Shooter",year:2021,cover:"1/14/Halo_Infinite.png"},
  // CoD
  {name:"Call of Duty 4: Modern Warfare",franchise:"Call of Duty",genre:"Shooter",year:2007,cover:"5/5f/Call_of_Duty_4_Modern_Warfare.jpg"},
  {name:"Call of Duty: World at War",franchise:"Call of Duty",genre:"Shooter",year:2008,cover:"5/55/Call_of_Duty_World_at_War_box_art.png"},
  {name:"Call of Duty: Modern Warfare 2",franchise:"Call of Duty",genre:"Shooter",year:2009,cover:"5/57/Modern_Warfare_2_cover.PNG"},
  {name:"Call of Duty: Black Ops",franchise:"Call of Duty",genre:"Shooter",year:2010,cover:"3/36/Call_of_Duty_Black_Ops_cover.jpg"},
  // GTA
  {name:"GTA San Andreas",franchise:"GTA",genre:"Action/Adventure",year:2004,cover:"7/7d/GTA_San_Andreas_cover.jpg"},
  {name:"GTA V",franchise:"GTA",genre:"Action/Adventure",year:2013,cover:"a/a5/Grand_Theft_Auto_V.png"},
  {name:"GTA VI",franchise:"GTA",genre:"Action/Adventure",year:2026},
  // RPGs
  {name:"Final Fantasy VII",franchise:"Final Fantasy",genre:"RPG",year:1997,cover:"c/c2/Final_Fantasy_VII_Box_Art.jpg"},
  {name:"Final Fantasy VII Remake",franchise:"Final Fantasy",genre:"RPG",year:2020,cover:"5/52/Final_Fantasy_VII_Remake_box_art.jpg"},
  {name:"Final Fantasy X",franchise:"Final Fantasy",genre:"RPG",year:2001,cover:"5/5b/Final_Fantasy_X_%28NA%29.jpg"},
  {name:"Chrono Trigger",franchise:"Chrono",genre:"RPG",year:1995,cover:"a/a7/Chrono_Trigger.jpg"},
  {name:"Kingdom Hearts",franchise:"Kingdom Hearts",genre:"RPG",year:2002,cover:"7/75/Kingdom_Hearts.jpg"},
  {name:"Kingdom Hearts II",franchise:"Kingdom Hearts",genre:"RPG",year:2005,cover:"e/e9/Kingdom_Hearts_II_boxart.jpg"},
  {name:"Persona 5 Royal",franchise:"Persona",genre:"RPG",year:2019,cover:"f/f9/Persona_5_Royal.jpg"},
  {name:"Elden Ring",franchise:"Soulsborne",genre:"RPG",year:2022,cover:"b/b9/Elden_Ring_Box_art.jpg"},
  {name:"Dark Souls",franchise:"Soulsborne",genre:"RPG",year:2011,cover:"8/8d/Dark_Souls_Cover_Art.jpg"},
  {name:"Bloodborne",franchise:"Soulsborne",genre:"RPG",year:2015,cover:"6/68/Bloodborne_Cover_Wallpaper.jpg"},
  {name:"Sekiro: Shadows Die Twice",franchise:"Soulsborne",genre:"RPG",year:2019,cover:"e/e0/Sekiro_art.jpg"},
  {name:"The Witcher 3: Wild Hunt",franchise:"Witcher",genre:"RPG",year:2015,cover:"0/0c/Witcher_3_cover_art.jpg"},
  {name:"Baldur's Gate 3",franchise:"Baldur's Gate",genre:"RPG",year:2023,cover:"c/c2/Baldur%27s_Gate_3_cover_art.jpg"},
  {name:"Skyrim",franchise:"Elder Scrolls",genre:"RPG",year:2011,cover:"1/15/The_Elder_Scrolls_V_Skyrim_cover.png"},
  // Racing
  {name:"Mario Kart 64",franchise:"Mario Kart",genre:"Racing",year:1996,cover:"e/e2/Mario_Kart_64.jpg"},
  {name:"Mario Kart 8 Deluxe",franchise:"Mario Kart",genre:"Racing",year:2017,cover:"7/79/Mario_Kart_8_Deluxe.jpg"},
  {name:"Mario Kart World",franchise:"Mario Kart",genre:"Racing",year:2025},
  {name:"F-Zero GX",franchise:"F-Zero",genre:"Racing",year:2003,cover:"8/8b/F-Zero_GX_box.jpg"},
  {name:"Forza Horizon 5",franchise:"Forza",genre:"Racing",year:2021,cover:"e/e2/Forza_Horizon_5_cover_art.jpg"},
  {name:"Lego Racers",franchise:"Lego",genre:"Racing",year:1999,cover:"e/e2/LegoRacersBox.jpg"},
  // Indie / modern
  {name:"Celeste",franchise:"Celeste",genre:"Platformer",year:2018,cover:"e/eb/Celeste_box_art_full.png"},
  {name:"Hollow Knight",franchise:"Hollow Knight",genre:"Platformer",year:2017,cover:"6/60/Hollow_Knight_first_cover_art.png"},
  {name:"Hades",franchise:"Hades",genre:"RPG",year:2020,cover:"c/cc/Hades_cover_art.jpg"},
  {name:"Stardew Valley",franchise:"Stardew Valley",genre:"Simulation",year:2016,cover:"f/fd/Logo_of_Stardew_Valley.png"},
  {name:"Minecraft",franchise:"Minecraft",genre:"Simulation",year:2011,cover:"c/cd/Minecraft_cover.png"},
  {name:"It Takes Two",franchise:"Hazelight",genre:"Platformer",year:2021,cover:"d/d8/It_Takes_Two_cover_art.jpg"},
  {name:"Cuphead",franchise:"Cuphead",genre:"Platformer",year:2017,cover:"4/45/Cuphead_%28artwork%29.png"},
  // Action/Adventure
  {name:"God of War",franchise:"God of War",genre:"Action/Adventure",year:2018,cover:"a/a7/God_of_War_4_cover.jpg"},
  {name:"God of War Ragnarok",franchise:"God of War",genre:"Action/Adventure",year:2022,cover:"e/ee/God_of_War_Ragnar%C3%B6k_cover.jpg"},
  {name:"Spider-Man",franchise:"Marvel",genre:"Action/Adventure",year:2018,cover:"5/5a/Spider-Man_PS4_cover.jpg"},
  {name:"Red Dead Redemption 2",franchise:"Red Dead",genre:"Action/Adventure",year:2018,cover:"4/44/Red_Dead_Redemption_II.jpg"},
  {name:"The Last of Us",franchise:"Last of Us",genre:"Action/Adventure",year:2013,cover:"4/46/Video_Game_Cover_-_The_Last_of_Us.jpg"},
  {name:"Horizon Zero Dawn",franchise:"Horizon",genre:"Action/Adventure",year:2017,cover:"9/93/Horizon_Zero_Dawn.jpg"},
  {name:"Ghost of Tsushima",franchise:"Ghost of Tsushima",genre:"Action/Adventure",year:2020,cover:"b/b6/Ghost_of_Tsushima.jpg"},
  // Horror
  {name:"Resident Evil 4",franchise:"Resident Evil",genre:"Horror",year:2005,cover:"d/d5/Resident_Evil_4_cover.jpg"},
  {name:"Resident Evil Village",franchise:"Resident Evil",genre:"Horror",year:2021,cover:"3/3a/Resident_Evil_Village_cover_art.jpg"},
  // SpongeBob / South Park
  {name:"SpongeBob: Battle for Bikini Bottom",franchise:"SpongeBob",genre:"Platformer",year:2003,cover:"3/37/SpongeBob_Battle_For_Bikini_Bottom_Box_Art.png"},
  {name:"South Park: The Stick of Truth",franchise:"South Park",genre:"RPG",year:2014,cover:"d/d6/South_Park_-_The_Stick_of_Truth_cover.png"},
  // Misc classics
  {name:"Star Fox 64",franchise:"Star Fox",genre:"Shooter",year:1997,cover:"a/ad/Starfox64_N64_Game_Box.jpg"},
  {name:"Kirby and the Forgotten Land",franchise:"Kirby",genre:"Platformer",year:2022,cover:"b/b9/Kirby_and_the_Forgotten_Land_cover.png"},
  {name:"Xenoblade Chronicles 3",franchise:"Xenoblade",genre:"RPG",year:2022,cover:"d/df/Xenoblade_Chronicles_3_cover.jpg"},
  {name:"Fire Emblem: Three Houses",franchise:"Fire Emblem",genre:"Strategy",year:2019,cover:"6/64/Fire_Emblem_Three_Houses_box_art.jpg"},
  {name:"DOOM Eternal",franchise:"DOOM",genre:"Shooter",year:2020,cover:"6/65/Doom_Eternal.jpg"},
  // Sports
  {name:"Wii Sports",franchise:"Wii Sports",genre:"Sports",year:2006,cover:"7/7e/Wii_Sports_Europe.jpg"},
  {name:"Wii Sports Resort",franchise:"Wii Sports",genre:"Sports",year:2009,cover:"6/6a/Wii_Sports_Resort_cover_NA.jpg"},
  {name:"Madden NFL 25",franchise:"Madden NFL",genre:"Sports",year:2023,cover:"a/ab/Madden_NFL_25_cover_art.jpg"},
  {name:"FIFA 23",franchise:"FIFA",genre:"Sports",year:2022,cover:"5/5e/FIFA_23_Cover.jpg"},
  {name:"EA Sports FC 24",franchise:"EA Sports FC",genre:"Sports",year:2023,cover:"7/75/EA_Sports_FC_24_cover_art.jpg"},
  {name:"NBA 2K24",franchise:"NBA 2K",genre:"Sports",year:2023,cover:"3/3c/NBA_2K24_cover_art.jpg"},
  {name:"NBA Jam",franchise:"NBA Jam",genre:"Sports",year:1993,cover:"6/68/NBA_Jam_Coverart.png"},
  {name:"Tony Hawk's Pro Skater",franchise:"Tony Hawk's",genre:"Sports",year:1999,cover:"9/9e/Tony_Hawk%27s_Pro_Skater_cover.jpg"},
  {name:"Tony Hawk's Pro Skater 2",franchise:"Tony Hawk's",genre:"Sports",year:2000,cover:"6/6b/Tony_Hawk%27s_Pro_Skater_2_cover.jpg"},
  {name:"Tony Hawk's Pro Skater 1+2",franchise:"Tony Hawk's",genre:"Sports",year:2020,cover:"c/cb/Tony_Hawk%27s_Pro_Skater_1+2.jpg"},
  {name:"Rocket League",franchise:"Rocket League",genre:"Sports",year:2015,cover:"f/f1/Rocket_League_coverart.jpg"},
  {name:"MLB The Show 24",franchise:"MLB The Show",genre:"Sports",year:2024,cover:"f/fc/MLB_The_Show_24_cover_art.jpg"},
];

// Build full Wikipedia URL
function coverUrl(game) {
  if (!game.cover) return null;
  const filename = game.cover.split("/").pop();
  return `https://upload.wikimedia.org/wikipedia/en/thumb/${game.cover}/300px-${filename}`;
}

function searchGames(query, limit = 8) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  const exact = [], starts = [], contains = [];
  for (const g of GAME_DB) {
    const n = g.name.toLowerCase();
    if (n === q) exact.push(g);
    else if (n.startsWith(q)) starts.push(g);
    else if (n.includes(q) || g.franchise.toLowerCase().includes(q)) contains.push(g);
  }
  return [...exact, ...starts, ...contains].slice(0, limit);
}

// ─── PLATFORM INFERENCE ──────────────────────────────────────────────────────
// Returns array of console IDs a game is available on, based on franchise/year/name rules.
// "emulator" is always added for older games (pre-2010), since they're emulatable.
const PLATFORM_OVERRIDES = {
  // Specific titles where rules don't get it right
  "Super Mario 64": ["nintendo64", "ds", "switch", "emulator"],
  "Super Mario Sunshine": ["gamecube", "switch", "emulator"],
  "Super Mario Galaxy": ["wii", "switch", "emulator"],
  "Super Mario Galaxy 2": ["wii", "emulator"],
  "Super Mario 3D World": ["wii", "switch", "emulator"],
  "Super Mario Odyssey": ["switch"],
  "Super Mario Bros. Wonder": ["switch"],
  "Bowser's Fury": ["switch"],
  "Super Mario World": ["wii", "switch", "emulator"],
  "Super Mario Bros. 3": ["wii", "switch", "emulator"],
  "Paper Mario": ["nintendo64", "wii", "switch", "emulator"],
  "Paper Mario: The Thousand-Year Door": ["gamecube", "switch", "emulator"],
  "Super Mario RPG": ["switch", "emulator"],
  "Luigi's Mansion": ["gamecube", "ds", "switch", "emulator"],
  "Luigi's Mansion 3": ["switch"],
  "The Legend of Zelda: Ocarina of Time": ["nintendo64", "gamecube", "wii", "switch", "emulator"],
  "The Legend of Zelda: Majora's Mask": ["nintendo64", "gamecube", "wii", "switch", "emulator"],
  "The Legend of Zelda: The Wind Waker": ["gamecube", "wii", "switch", "emulator"],
  "The Legend of Zelda: Twilight Princess": ["gamecube", "wii", "switch", "emulator"],
  "The Legend of Zelda: Breath of the Wild": ["wii", "switch", "emulator"],
  "The Legend of Zelda: Tears of the Kingdom": ["switch"],
  "The Legend of Zelda: A Link to the Past": ["gba", "wii", "switch", "emulator"],
  "The Legend of Zelda: Link's Awakening": ["gameboy", "switch", "emulator"],
  "Sonic the Hedgehog": ["sega", "switch", "xbox", "playstation", "pc", "emulator"],
  "Sonic the Hedgehog 2": ["sega", "switch", "xbox", "playstation", "pc", "emulator"],
  "Sonic Adventure": ["gamecube", "xbox", "playstation", "pc", "emulator"],
  "Sonic Adventure 2": ["gamecube", "xbox", "playstation", "pc", "switch", "emulator"],
  "Sonic Heroes": ["gamecube", "xbox", "playstation", "pc", "emulator"],
  "Shadow the Hedgehog": ["gamecube", "xbox", "playstation", "emulator"],
  "Sonic Generations": ["xbox", "playstation", "pc", "switch", "emulator"],
  "Sonic Mania": ["switch", "xbox", "playstation", "pc"],
  "Sonic Frontiers": ["switch", "xbox", "playstation", "pc"],
  "Shadow Generations": ["switch", "xbox", "playstation", "pc"],
  "Pokemon Red": ["gameboy", "emulator"], "Pokemon Blue": ["gameboy", "emulator"], "Pokemon Yellow": ["gameboy", "emulator"],
  "Pokemon Gold": ["gameboy", "emulator"], "Pokemon Silver": ["gameboy", "emulator"], "Pokemon Crystal": ["gameboy", "emulator"],
  "Pokemon Ruby": ["gba", "emulator"], "Pokemon Sapphire": ["gba", "emulator"], "Pokemon Emerald": ["gba", "emulator"],
  "Pokemon FireRed": ["gba", "emulator"], "Pokemon LeafGreen": ["gba", "emulator"],
  "Pokemon Diamond": ["ds", "emulator"], "Pokemon Pearl": ["ds", "emulator"],
  "Pokemon HeartGold": ["ds", "emulator"], "Pokemon SoulSilver": ["ds", "emulator"],
  "Pokemon Sword": ["switch"], "Pokemon Scarlet": ["switch"], "Pokemon Violet": ["switch"],
  "Pokemon Snap": ["nintendo64", "wii", "switch", "emulator"],
  "Pokemon Colosseum": ["gamecube", "emulator"],
  "Banjo-Kazooie": ["nintendo64", "xbox", "switch", "emulator"],
  "Banjo-Tooie": ["nintendo64", "xbox", "switch", "emulator"],
  "Banjo-Kazooie: Grunty's Revenge": ["gba", "emulator"],
  "Conker's Bad Fur Day": ["nintendo64", "xbox", "emulator"],
  "Donkey Kong 64": ["nintendo64", "switch", "emulator"],
  "Donkey Kong Country": ["wii", "switch", "gba", "emulator"],
  "Donkey Kong Country Returns": ["wii", "switch", "emulator"],
  "Donkey Kong Country: Tropical Freeze": ["wii", "switch"],
  "Donkey Kong Bonanza": ["switch"],
  "GoldenEye 007": ["nintendo64", "switch", "xbox", "emulator"],
  "Crash Bandicoot": ["playstation", "pc", "emulator", "switch", "xbox"],
  "Crash Bandicoot 2: Cortex Strikes Back": ["playstation", "pc", "emulator", "switch", "xbox"],
  "Crash Bandicoot 3: Warped": ["playstation", "pc", "emulator", "switch", "xbox"],
  "Crash Bandicoot: The Wrath of Cortex": ["playstation", "xbox", "gamecube", "emulator"],
  "Crash Bandicoot 4: It's About Time": ["playstation", "xbox", "switch", "pc"],
  "Spyro the Dragon": ["playstation", "pc", "switch", "xbox", "emulator"],
  "Pac-Man World": ["playstation", "emulator", "switch", "xbox", "pc"],
  "Pac-Man World 2": ["playstation", "xbox", "gamecube", "pc", "emulator"],
  "Pac-Man World 3": ["playstation", "xbox", "gamecube", "pc", "emulator"],
  "Metroid Prime": ["gamecube", "wii", "switch", "emulator"],
  "Metroid Dread": ["switch"],
  "Super Smash Bros. Melee": ["gamecube", "emulator"],
  "Super Smash Bros. Brawl": ["wii", "emulator"],
  "Super Smash Bros. Ultimate": ["switch"],
  "Halo: Combat Evolved": ["xbox", "pc"],
  "Halo 2": ["xbox", "pc"], "Halo 3": ["xbox", "pc"], "Halo: Reach": ["xbox", "pc"], "Halo Infinite": ["xbox", "pc"],
  "Call of Duty 4: Modern Warfare": ["xbox", "playstation", "pc"],
  "Call of Duty: World at War": ["xbox", "playstation", "pc", "wii"],
  "Call of Duty: Modern Warfare 2": ["xbox", "playstation", "pc"],
  "Call of Duty: Black Ops": ["xbox", "playstation", "pc"],
  "GTA San Andreas": ["playstation", "xbox", "pc", "switch", "emulator"],
  "GTA V": ["playstation", "xbox", "pc"], "GTA VI": ["playstation", "xbox", "pc"],
  "Final Fantasy VII": ["playstation", "pc", "switch", "xbox", "emulator"],
  "Final Fantasy VII Remake": ["playstation", "pc", "xbox"],
  "Final Fantasy X": ["playstation", "pc", "switch", "xbox", "emulator"],
  "Chrono Trigger": ["pc", "ds", "switch", "emulator"],
  "Kingdom Hearts": ["playstation", "pc", "xbox", "switch", "emulator"],
  "Kingdom Hearts II": ["playstation", "pc", "xbox", "switch", "emulator"],
  "Persona 5 Royal": ["playstation", "xbox", "switch", "pc"],
  "Elden Ring": ["playstation", "xbox", "pc"],
  "Dark Souls": ["playstation", "xbox", "pc", "switch"],
  "Bloodborne": ["playstation"],
  "Sekiro: Shadows Die Twice": ["playstation", "xbox", "pc"],
  "The Witcher 3: Wild Hunt": ["playstation", "xbox", "pc", "switch"],
  "Baldur's Gate 3": ["playstation", "xbox", "pc"],
  "Skyrim": ["playstation", "xbox", "pc", "switch"],
  "Earthbound": ["wii", "switch", "emulator"],
  "Mario Kart 64": ["nintendo64", "wii", "switch", "emulator"],
  "Mario Kart 8 Deluxe": ["wii", "switch"],
  "Mario Kart World": ["switch"],
  "F-Zero GX": ["gamecube", "emulator"],
  "Burnout Paradise": ["playstation", "xbox", "pc", "switch"],
  "Forza Horizon 5": ["xbox", "pc"],
  "Lego Racers": ["playstation", "pc", "nintendo64", "gameboy", "emulator"],
  "Celeste": ["playstation", "xbox", "pc", "switch"],
  "Hollow Knight": ["playstation", "xbox", "pc", "switch"],
  "Hollow Knight: Silksong": ["playstation", "xbox", "pc", "switch"],
  "Hades": ["playstation", "xbox", "pc", "switch"],
  "Stardew Valley": ["playstation", "xbox", "pc", "switch", "ds"],
  "Animal Crossing: New Horizons": ["switch"],
  "Minecraft": ["playstation", "xbox", "pc", "switch", "ds"],
  "It Takes Two": ["playstation", "xbox", "pc", "switch"],
  "Split Fiction": ["playstation", "xbox", "pc", "switch"],
  "Cuphead": ["playstation", "xbox", "pc", "switch"],
  "God of War": ["playstation", "pc"],
  "God of War Ragnarok": ["playstation", "pc"],
  "Spider-Man": ["playstation", "pc"],
  "Red Dead Redemption 2": ["playstation", "xbox", "pc"],
  "The Last of Us": ["playstation", "pc"],
  "Horizon Zero Dawn": ["playstation", "pc"],
  "Ghost of Tsushima": ["playstation", "pc"],
  "Resident Evil 4": ["gamecube", "playstation", "xbox", "pc", "switch", "emulator"],
  "Resident Evil Village": ["playstation", "xbox", "pc"],
  "SpongeBob: Battle for Bikini Bottom": ["gamecube", "playstation", "xbox", "pc", "switch", "emulator"],
  "South Park: The Stick of Truth": ["xbox", "playstation", "pc", "switch"],
  "Star Fox 64": ["nintendo64", "wii", "switch", "emulator"],
  "Kirby and the Forgotten Land": ["switch"],
  "Xenoblade Chronicles 3": ["switch"],
  "Fire Emblem: Three Houses": ["switch"],
  "DOOM Eternal": ["playstation", "xbox", "pc", "switch"],
  // Sports
  "Wii Sports": ["wii"],
  "Wii Sports Resort": ["wii"],
  "Madden NFL 25": ["ps4", "ps5", "xboxone", "xboxseries", "pc"],
  "FIFA 23": ["ps4", "ps5", "xboxone", "xboxseries", "switch", "pc"],
  "EA Sports FC 24": ["ps4", "ps5", "xboxone", "xboxseries", "switch", "pc"],
  "NBA 2K24": ["ps4", "ps5", "xboxone", "xboxseries", "switch", "pc"],
  "NBA Jam": ["snes", "sega", "emulator"],
  "Tony Hawk's Pro Skater": ["ps1", "emulator"],
  "Tony Hawk's Pro Skater 2": ["ps1", "ps2", "emulator"],
  "Tony Hawk's Pro Skater 1+2": ["ps4", "ps5", "xboxone", "xboxseries", "switch", "pc"],
  "Rocket League": ["ps4", "ps5", "xboxone", "xboxseries", "switch", "pc"],
  "MLB The Show 24": ["ps4", "ps5", "xboxone", "xboxseries", "switch"],
};

function getAvailablePlatforms(name) {
  if (PLATFORM_OVERRIDES[name]) return PLATFORM_OVERRIDES[name];
  // Fallback: show all consoles if we don't know
  return null;
}

// ─── SEED LIBRARY ────────────────────────────────────────────────────────────
const SEED_GAMES = [
  { franchise: "Sonic", name: "Sonic Adventure 2", completed: true, date: "Childhood", console: "gamecube", genre: "Platformer" },
  { franchise: "Sonic", name: "Sonic Adventure", completed: true, date: "Childhood", console: "gamecube", genre: "Platformer" },
  { franchise: "Sonic", name: "Sonic Advance", completed: true, date: "Childhood", console: "gba", genre: "Platformer" },
  { franchise: "Sonic", name: "Sonic Frontiers", completed: true, date: "2024", console: "switch", genre: "Platformer" },
  { franchise: "Sonic", name: "Shadow the Hedgehog", completed: true, date: "2025", console: "emulator", genre: "Platformer" },
  { franchise: "Sonic", name: "Shadow Generations", completed: true, date: "2025", console: "switch", genre: "Platformer" },
  { franchise: "Sonic", name: "Sonic Heroes", completed: false, genre: "Platformer" },
  { franchise: "Sonic", name: "Sonic Mania", completed: false, genre: "Platformer" },
  { franchise: "Super Mario", name: "Super Mario 64", completed: true, date: "Childhood", console: "nintendo64", genre: "Platformer" },
  { franchise: "Super Mario", name: "Super Mario Sunshine", completed: true, date: "Childhood", console: "gamecube", genre: "Platformer" },
  { franchise: "Super Mario", name: "Super Mario Galaxy", completed: true, date: "2022", console: "switch", genre: "Platformer" },
  { franchise: "Super Mario", name: "Super Mario Galaxy 2", completed: true, date: "2025", console: "wii", genre: "Platformer" },
  { franchise: "Super Mario", name: "Bowser's Fury", completed: true, date: "2026", console: "switch", genre: "Platformer" },
  { franchise: "Super Mario", name: "Super Mario 3D World", completed: true, date: "2026", console: "switch", genre: "Platformer" },
  { franchise: "Super Mario", name: "Super Mario 64 DS", completed: true, date: "Childhood", console: "ds", genre: "Platformer" },
  { franchise: "Super Mario", name: "Paper Mario", completed: true, date: "2024", console: "switch", genre: "RPG" },
  { franchise: "Super Mario", name: "Super Mario Eclipse", completed: true, date: "2025", console: "emulator", genre: "Platformer", percent100: true },
  { franchise: "Super Mario", name: "Super Mario RPG", completed: true, date: "2025", console: "switch", genre: "RPG", percent100: true },
  { franchise: "Pokemon", name: "Pokemon FireRed", completed: true, date: "Childhood", console: "gba", genre: "RPG" },
  { franchise: "Pokemon", name: "Pokemon Sapphire", completed: true, date: "Childhood", console: "gba", genre: "RPG" },
  { franchise: "Pokemon", name: "Pokemon Ruby", completed: true, date: "Childhood", console: "gba", genre: "RPG" },
  { franchise: "Pokemon", name: "Pokemon Emerald", completed: true, date: "Childhood", console: "gba", genre: "RPG" },
  { franchise: "Pokemon", name: "Pokemon Colosseum", completed: true, date: "2025", console: "gamecube", genre: "RPG" },
  { franchise: "Pokemon", name: "Pokemon Snap", completed: true, date: "2023", console: "switch", genre: "Other" },
  { franchise: "F-Zero", name: "F-Zero GX", completed: true, date: "2023", console: "emulator", genre: "Racing" },
  { franchise: "Hazelight", name: "It Takes Two", completed: true, date: "2024", console: "switch", genre: "Platformer" },
  { franchise: "Hazelight", name: "Split Fiction", completed: true, date: "2025", genre: "Platformer" },
  { franchise: "Pac-Man", name: "Pac-Man World 2", completed: true, date: "2024", console: "xbox", genre: "Platformer" },
  { franchise: "Pac-Man", name: "Pac-Man World", completed: true, date: "2026", genre: "Platformer" },
  { franchise: "Banjo-Kazooie", name: "Banjo-Kazooie", completed: true, date: "2024", console: "switch", genre: "Platformer", percent100: true },
  { franchise: "Banjo-Kazooie", name: "Banjo-Kazooie: Grunty's Revenge", completed: true, date: "2025", console: "gba", genre: "Platformer" },
  { franchise: "Banjo-Kazooie", name: "Banjo-Tooie", completed: false, console: "nintendo64", genre: "Platformer" },
  { franchise: "Zelda", name: "The Legend of Zelda: Ocarina of Time", completed: true, date: "2025", console: "switch", genre: "Action/Adventure" },
  { franchise: "SpongeBob", name: "SpongeBob: Battle for Bikini Bottom", completed: true, date: "2025", genre: "Platformer" },
  { franchise: "South Park", name: "South Park: The Stick of Truth", completed: true, date: "2014", console: "xbox", genre: "RPG" },
  { franchise: "Crash Bandicoot", name: "Crash Bandicoot: The Wrath of Cortex", completed: true, date: "2025", console: "emulator", genre: "Platformer", percent100: true },
  { franchise: "Crash Bandicoot", name: "Crash Bandicoot", completed: true, date: "2026", console: "emulator", genre: "Platformer" },
  { franchise: "Donkey Kong", name: "Donkey Kong 64", completed: true, date: "2026", console: "nintendo64", genre: "Platformer" },
  { franchise: "Rare", name: "Conker's Bad Fur Day", completed: true, date: "2026", console: "emulator", genre: "Platformer" },
  { franchise: "Call of Duty", name: "Call of Duty 4: Modern Warfare", completed: true, date: "Childhood", genre: "Shooter" },
  { franchise: "Call of Duty", name: "Call of Duty: World at War", completed: true, date: "Childhood", genre: "Shooter" },
  { franchise: "Call of Duty", name: "Call of Duty: Modern Warfare 2", completed: true, date: "Childhood", genre: "Shooter" },
  { franchise: "Call of Duty", name: "Call of Duty: Black Ops", completed: true, date: "Childhood", genre: "Shooter" },
];

const ACHIEVEMENTS = [
  { id: "first_clear",   name: "FIRST CONTACT",  desc: "Beat your first game",          test: g => g.filter(x=>x.completed).length>=1 },
  { id: "ten_done",      name: "DOUBLE DIGITS",  desc: "Beat 10 games",                 test: g => g.filter(x=>x.completed).length>=10 },
  { id: "twentyfive",    name: "STAR SAILOR",    desc: "Beat 25 games",                 test: g => g.filter(x=>x.completed).length>=25 },
  { id: "fifty",         name: "HALF CENTURY",   desc: "Beat 50 games",                 test: g => g.filter(x=>x.completed).length>=50 },
  { id: "first_100",     name: "PERFECTIONIST",  desc: "100% your first game",          test: g => g.some(x=>x.percent100) },
  { id: "platformer_5",  name: "JUMP MASTER",    desc: "Beat 5 platformers",            test: g => g.filter(x=>x.completed&&x.genre==="Platformer").length>=5 },
  { id: "platformer_15", name: "PLATFORM LORD",  desc: "Beat 15 platformers",           test: g => g.filter(x=>x.completed&&x.genre==="Platformer").length>=15 },
  { id: "rpg_5",         name: "PARTY LEADER",   desc: "Beat 5 RPGs",                   test: g => g.filter(x=>x.completed&&x.genre==="RPG").length>=5 },
  { id: "three_genres",  name: "GENERALIST",     desc: "Beat games in 3 genres",        test: g => new Set(g.filter(x=>x.completed).map(x=>x.genre)).size>=3 },
  { id: "franchise_3",   name: "BRAND LOYAL",    desc: "3 games in one franchise",      test: g => Object.values(g.filter(x=>x.completed).reduce((a,x)=>({...a,[x.franchise]:(a[x.franchise]||0)+1}),{})).some(c=>c>=3) },
  { id: "retro_5",       name: "TIME TRAVELER",  desc: "5 games from childhood",        test: g => g.filter(x=>x.completed&&x.date==="Childhood").length>=5 },
  { id: "emulation",     name: "ROM RIDER",      desc: "Beat a game via emulation",     test: g => g.some(x=>x.completed&&x.console==="emulator") },
];

const FONT_DISPLAY = "'Orbitron', sans-serif";
const FONT_BODY = "'Rajdhani', sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";
const FONT_TITLE = "'Audiowide', sans-serif";    // chunky rounded retro for the GAME QUEUE mark
const FONT_TAGLINE = "'Michroma', sans-serif";   // thin spaced geometric for the tagline

const STORAGE_KEY = "gamevault:v4";
const CLOUD_TABLE = "game_data";

// ─── PERSISTENCE ─────────────────────────────────────────────────────────────
// Data now lives in Supabase (Postgres) so a user's queue syncs across every
// device they sign in on. Each user owns exactly one row in `public.game_data`
// keyed by their auth uid; the `data` jsonb column holds the same
// { profile, games } shape the app has always used. Row Level Security keeps
// each row private to its owner.

// Read the legacy localStorage save, if any. Only used to offer a one-time
// migration of pre-cloud data into a user's fresh account.
function loadLocalState() {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    }
  } catch {}
  return null;
}

// Load the signed-in user's { profile, games } blob from the cloud.
// Returns null when the row doesn't exist yet (brand-new account) or on error.
async function loadCloud(userId) {
  try {
    const { data, error } = await supabase
      .from(CLOUD_TABLE)
      .select("data")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) { console.error("[supabase] load failed:", error.message); return null; }
    return data?.data ?? null;
  } catch (e) {
    console.error("[supabase] load threw:", e);
    return null;
  }
}

// Upsert the user's blob. onConflict=user_id means repeated saves update the
// same row rather than erroring on the primary key.
async function saveCloud(userId, state) {
  try {
    const { error } = await supabase
      .from(CLOUD_TABLE)
      .upsert(
        { user_id: userId, data: state, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    if (error) console.error("[supabase] save failed:", error.message);
  } catch (e) {
    console.error("[supabase] save threw:", e);
  }
}

// "Reset all data" — empties the user's row but keeps them signed in.
async function clearCloud(userId) {
  await saveCloud(userId, {});
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,8);
const hueOf = g => GENRE_HUES[g] || GENRE_HUES.Other;
const consoleOf = id => CONSOLE_GROUPS.find(c => c.id === id);

/* ═══════════════════════════════════════════════════════════════════════════
   STARFIELD
   ═══════════════════════════════════════════════════════════════════════════ */

function Starfield() {
  return (
    <>
      <AmbientStarfield />
      <WarpStarfield3D />
    </>
  );
}

// 2D canvas layer — ambient drifting and twinkling background stars.
// Pure parallax decoration, no depth motion.
function AmbientStarfield() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let w, h, stars;
    const init = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      stars = [];
      for (let i = 0; i < 400; i++) {
        stars.push({
          x: Math.random() * w, y: Math.random() * h,
          z: Math.random() * 3 + 0.3,
          baseSize: Math.random() * 1.4 + 0.3,
          twinkle: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.02 + Math.random() * 0.04,
          vx: (Math.random() - 0.5) * 0.05,
          vy: 0.02 + Math.random() * 0.08,
        });
      }
    };
    init();
    let raf;
    const draw = () => {
      // Subtle trail wash so star drift looks soft
      ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
      ctx.fillRect(0, 0, w, h);
      stars.forEach(s => {
        s.x += s.vx * s.z; s.y += s.vy * s.z;
        s.twinkle += s.twinkleSpeed;
        if (s.y > h + 5) { s.y = -5; s.x = Math.random() * w; }
        if (s.x > w + 5) s.x = -5;
        if (s.x < -5) s.x = w + 5;
        const tw = 0.5 + Math.sin(s.twinkle) * 0.5;
        const size = s.baseSize * (0.8 + tw * 0.6);
        const alpha = 0.3 + tw * 0.7;
        if (s.z > 2) {
          ctx.fillStyle = `rgba(200, 230, 255, ${alpha * 0.15})`;
          ctx.beginPath(); ctx.arc(s.x, s.y, size * 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = `rgba(${230 + Math.sin(s.twinkle*0.5)*20}, ${230 + Math.cos(s.twinkle*0.7)*20}, 255, ${alpha})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, size, 0, Math.PI * 2); ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    const resize = () => init();
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />;
}

// True 3D warp shooting stars rendered via a 2D canvas overlay.
//
// Three.js handles the position math: each star lives in real 3D space and
// flies toward the camera (z=0), so projection automatically gives the
// outward-from-center motion that reads as "coming at the user."
//
// But Three.js Points sprites can't render proper line streaks (LineSegments
// render as 1px wide which is invisible on high-DPI screens). So instead of
// rendering with Three.js, we project each star's 3D position to 2D screen
// coordinates ourselves, then draw a line streak with a bright head dot
// using a regular 2D canvas. This gives us crisp, controllable streaks.
function WarpStarfield3D() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w, h, cx, cy, dpr = window.devicePixelRatio || 1;

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      cx = w / 2; cy = h / 2;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    // Pool of in-flight stars. Each star has a 3D position; we move its z
    // forward each frame and project to 2D for rendering.
    const MAX_STARS = 6;
    const SPAWN_RADIUS = 4;
    const SPAWN_DEPTH = -100;
    const DESPAWN_Z = -6;
    const STAR_SPEED = 0.6;
    const FOCAL_LENGTH = h * 0.7; // controls how wide the perspective is

    const stars = [];
    function spawnStar() {
      if (stars.length >= MAX_STARS) return;
      const r = Math.sqrt(Math.random()) * SPAWN_RADIUS;
      const theta = Math.random() * Math.PI * 2;
      stars.push({
        x: Math.cos(theta) * r,
        y: Math.sin(theta) * r,
        z: SPAWN_DEPTH,
        prevScreenX: null, // for computing tail length from previous frame's position
        prevScreenY: null,
      });
    }

    let raf;
    let lastSpawn = -1500;
    let nextSpawnDelay = 800;
    let startTime = performance.now();
    spawnStar(); // immediate first star

    const draw = (t) => {
      const elapsed = t - startTime;

      // Clear with full transparency (lets the AmbientStarfield show through)
      ctx.clearRect(0, 0, w, h);

      // Spawn new stars on the schedule
      if (elapsed - lastSpawn > nextSpawnDelay) {
        lastSpawn = elapsed;
        nextSpawnDelay = 4000 + Math.random() * 4000;
        spawnStar();
        if (Math.random() < 0.4) spawnStar();
      }

      // Update each star and draw as a line streak with bright dot head
      for (let i = stars.length - 1; i >= 0; i--) {
        const s = stars[i];
        s.z += STAR_SPEED;
        if (s.z >= DESPAWN_Z) {
          stars.splice(i, 1);
          continue;
        }

        // Project 3D to 2D using simple perspective: screenX = cx + (x / -z) * focalLength
        const depth = -s.z; // positive distance from camera
        const screenX = cx + (s.x / depth) * FOCAL_LENGTH;
        const screenY = cy + (s.y / depth) * FOCAL_LENGTH;

        // Compute outward direction from screen center for tail direction
        const dx = screenX - cx;
        const dy = screenY - cy;
        const distFromCenter = Math.hypot(dx, dy);
        if (distFromCenter < 0.001) continue; // exactly at center — no direction yet, skip this frame

        // Unit vector pointing outward from center
        const ox = dx / distFromCenter;
        const oy = dy / distFromCenter;

        // Tail length grows as the star gets closer (more screen-space motion per frame).
        // Cap it so it doesn't get absurdly long when very close.
        const tailLen = Math.min(distFromCenter * 0.5, 120);

        // Tail end point (toward center)
        const tailX = screenX - ox * tailLen;
        const tailY = screenY - oy * tailLen;

        // Lifetime fade — bright through most of journey, fade only at very end
        const totalDist = -SPAWN_DEPTH;
        const distFromDespawn = depth - (-DESPAWN_Z);
        const journey = 1 - depth / totalDist;
        const fadeIn = Math.min(1, journey * 5);
        const fadeOut = Math.min(1, distFromDespawn / (totalDist * 0.10));
        const alpha = fadeIn * fadeOut;
        if (alpha <= 0.001) continue;

        // Head dot size grows with proximity to camera (perspective)
        const headRadius = Math.min(0.6 + (1 / depth) * 60, 5);

        // Draw the tail — a thin gradient line from transparent (at tail) to bright (at head)
        const grad = ctx.createLinearGradient(tailX, tailY, screenX, screenY);
        grad.addColorStop(0, "rgba(220, 240, 255, 0)");
        grad.addColorStop(0.6, `rgba(220, 240, 255, ${alpha * 0.3})`);
        grad.addColorStop(1, `rgba(240, 250, 255, ${alpha})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = Math.max(1, headRadius * 0.6);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(screenX, screenY);
        ctx.stroke();

        // Draw the bright round head dot at the leading end of the streak.
        // Two-layer composition: soft outer glow halo, then a smaller bright
        // core. Keeps the head reading as a luminous star rather than a flat
        // white disc.
        const haloRadius = headRadius * 2.5;
        const haloGrad = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, haloRadius);
        haloGrad.addColorStop(0, `rgba(240, 250, 255, ${alpha * 0.55})`);
        haloGrad.addColorStop(0.4, `rgba(220, 240, 255, ${alpha * 0.18})`);
        haloGrad.addColorStop(1, "rgba(220, 240, 255, 0)");
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(screenX, screenY, haloRadius, 0, Math.PI * 2);
        ctx.fill();
        // Inner core — slightly transparent so it doesn't read as solid pixel
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.75})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, headRadius * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);
  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />;
}

/* ═══════════════════════════════════════════════════════════════════════════
   3D CHROME TITLE — letters built from rounded boxes, lit chrome material
   ═══════════════════════════════════════════════════════════════════════════ */

// Each letter is constructed as a Group of rounded BoxGeometry pieces.
// Coordinate system: letter cell is 5 units wide x 7 units tall, origin bottom-left.
// Stroke thickness is 1 unit. Letters compose by stacking horizontal/vertical bars.
function buildLetter(char, material) {
  const group = new THREE.Group();
  const STROKE = 1.0;     // thickness of letter strokes
  const D = 1.4;          // extrusion depth

  // Helper to add a rectangular stroke at (x, y) of size (w, h)
  // x/y are bottom-left coords of the rect
  function bar(x, y, w, h, r = 0.18) {
    const geom = roundedBox(w, h, D, r, 4);
    const mesh = new THREE.Mesh(geom, material);
    mesh.position.set(x + w / 2, y + h / 2, 0);
    group.add(mesh);
  }

  // Helper for a diagonal bar (used in A, M, V).
  // Connects (x1,y1) to (x2,y2) with given thickness.
  function diagBar(x1, y1, x2, y2, thickness = STROKE) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const geom = roundedBox(len, thickness, D, 0.2, 4);
    const mesh = new THREE.Mesh(geom, material);
    mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
    mesh.rotation.z = angle;
    group.add(mesh);
  }

  switch (char) {
    case "G":
      // Left vertical, top horizontal, bottom horizontal, middle-right horizontal stub, right vertical lower
      bar(0, 0, STROKE, 7);              // left vertical
      bar(STROKE, 6, 4, STROKE);         // top
      bar(STROKE, 0, 4, STROKE);         // bottom
      bar(4, 0, STROKE, 3.5);            // right vertical (lower half)
      bar(2.5, 3, 2.5, STROKE);          // middle crossbar (the G's notch)
      break;
    case "A":
      bar(0, 0, STROKE, 7);              // left vertical
      bar(4, 0, STROKE, 7);              // right vertical
      bar(STROKE, 6, 3, STROKE);         // top crossbar
      bar(STROKE, 3.2, 3, STROKE);       // middle crossbar
      break;
    case "M":
      bar(0, 0, STROKE, 7);              // left vertical
      bar(4, 0, STROKE, 7);              // right vertical
      // Two diagonals meeting in the middle, like /\ inside the letter
      diagBar(STROKE * 0.6, 6.5, 2.5, 3.3, STROKE * 0.9);    // left diagonal
      diagBar(2.5, 3.3, 4.4, 6.5, STROKE * 0.9);             // right diagonal
      break;
    case "E":
      bar(0, 0, STROKE, 7);              // left vertical
      bar(STROKE, 6, 4, STROKE);         // top
      bar(STROKE, 3, 3, STROKE);         // middle
      bar(STROKE, 0, 4, STROKE);         // bottom
      break;
    case "V":
      // Two diagonals meeting at bottom center
      diagBar(0, 7, 2.5, 0.4, STROKE);
      diagBar(2.5, 0.4, 5, 7, STROKE);
      break;
    case "N":
      bar(0, 0, STROKE, 7);              // left vertical
      bar(4, 0, STROKE, 7);              // right vertical
      // Single diagonal from top-left to bottom-right
      diagBar(STROKE * 0.7, 6.5, 4.3, 0.5, STROKE * 0.95);
      break;
    case "W":
      bar(0, 0, STROKE, 7);              // left vertical
      bar(4, 0, STROKE, 7);              // right vertical
      // Two diagonals forming the V in the lower middle
      diagBar(STROKE * 0.6, 0.5, 2.5, 3.7, STROKE * 0.9);
      diagBar(2.5, 3.7, 4.4, 0.5, STROKE * 0.9);
      break;
    case "O":
      // Four-side box like the bowl of Q (no tail)
      bar(0, STROKE, STROKE, 5);           // left vertical
      bar(4, STROKE, STROKE, 5);           // right vertical
      bar(STROKE, 6, 3, STROKE);           // top
      bar(STROKE, 0, 3, STROKE);           // bottom
      break;
    case "D":
      bar(0, 0, STROKE, 7);                // left vertical
      bar(4, STROKE, STROKE, 5);           // right vertical (between top/bottom curves)
      bar(STROKE, 6, 3, STROKE);           // top
      bar(STROKE, 0, 3, STROKE);           // bottom
      break;
    case "Q":
      // Like O — four sides forming a box — plus a diagonal tail in the lower right
      bar(0, STROKE, STROKE, 5);           // left vertical (between top and bottom rounded corners)
      bar(4, STROKE, STROKE, 5);           // right vertical
      bar(STROKE, 6, 3, STROKE);           // top horizontal
      bar(STROKE, 0, 3, STROKE);           // bottom horizontal
      // Diagonal tail extending from lower-right of the bowl outward beyond the cell
      diagBar(3.1, 1.6, 4.8, -0.2, STROKE * 0.85);
      break;
    case "U":
      bar(0, STROKE, STROKE, 6);         // left vertical
      bar(4, STROKE, STROKE, 6);         // right vertical
      bar(STROKE, 0, 3, STROKE);         // bottom
      break;
    case "L":
      bar(0, 0, STROKE, 7);              // left vertical
      bar(STROKE, 0, 4, STROKE);         // bottom
      break;
    case "T":
      bar(0, 6, 5, STROKE);              // top horizontal
      bar(2, 0, STROKE, 6);              // center vertical
      break;
    default:
      break;
  }

  // Re-center the group horizontally on x=0 (each letter cell is 5 wide, center at 2.5)
  group.position.x = -2.5;
  return group;
}

function Title3D({ rows: rowsProp = [{ chars: "GAME", y: 4.5 }, { chars: "QUEUE", y: -4.5 }], height = 280, targetWidth = 22, idleRotation = true }) {
  const mountRef = useRef(null);
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth || 320;
    const h = height;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 200);
    camera.position.z = 32;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    mount.appendChild(renderer.domElement);

    // Chrome lighting — strong overall illumination so the metal reads as
    // silver/polished rather than dark steel.
    scene.add(new THREE.AmbientLight(0xffffff, 1.0));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
    keyLight.position.set(2, 4, 6);
    scene.add(keyLight);
    const fillLight = new THREE.PointLight(0x9ed4ff, 2.2, 60);   // cool cyan fill (matches app accent)
    fillLight.position.set(-8, 2, 8);
    scene.add(fillLight);
    const rimLight = new THREE.PointLight(0xff9fc0, 1.0, 50);    // subtle magenta rim
    rimLight.position.set(8, -2, 4);
    scene.add(rimLight);
    const topLight = new THREE.PointLight(0xffffff, 1.6, 40);
    topLight.position.set(0, 8, 3);
    scene.add(topLight);
    const frontLight = new THREE.PointLight(0xffffff, 1.4, 40);
    frontLight.position.set(0, 0, 12);
    scene.add(frontLight);

    // Chrome material — light silver base color, high metalness, low roughness
    // for that polished reflective surface. Higher envMapIntensity boosts the
    // perceived brightness without losing the metallic look.
    const chromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xf0f4fa,
      metalness: 1.0,
      roughness: 0.25,
      envMapIntensity: 1.5,
      emissive: 0x6f7d8c,
      emissiveIntensity: 0.25,
    });

    // Build all rows from the provided rowsProp
    const titleGroup = new THREE.Group();
    const LETTER_WIDTH = 5;
    const LETTER_GAP = 1.4;

    rowsProp.forEach(({ chars, y }) => {
      const rowGroup = new THREE.Group();
      const totalWidth = chars.length * LETTER_WIDTH + (chars.length - 1) * LETTER_GAP;
      let x = -totalWidth / 2 + LETTER_WIDTH / 2;
      for (const ch of chars) {
        const letter = buildLetter(ch, chromeMaterial);
        letter.position.x = x + 2.5; // compensate for buildLetter's centering offset
        letter.position.y = -3.5;    // letters drawn with origin at bottom, recenter vertically
        rowGroup.add(letter);
        x += LETTER_WIDTH + LETTER_GAP;
      }
      rowGroup.position.y = y;
      titleGroup.add(rowGroup);
    });

    // Scale + center so the title fits and sits exactly in the canvas center
    const box = new THREE.Box3().setFromObject(titleGroup);
    const sz = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    // Shift the group so its bounding-box center sits at world origin
    titleGroup.position.sub(center);
    const scaleFactor = targetWidth / sz.x;
    titleGroup.scale.setScalar(scaleFactor);

    scene.add(titleGroup);

    let raf, t = 0;
    const animate = () => {
      t += 0.008;
      if (idleRotation) {
        // Subtle tilt animation — rocks gently like a chrome logo catching different angles of light
        titleGroup.rotation.y = Math.sin(t * 1.2) * 0.18;
        titleGroup.rotation.x = Math.sin(t * 0.7) * 0.08;
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    const onResize = () => {
      const nw = mount.clientWidth || 320;
      camera.aspect = nw / h;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      chromeMaterial.dispose();
      renderer.dispose();
    };
  }, [JSON.stringify(rowsProp), height, targetWidth, idleRotation]);

  return <div ref={mountRef} style={{ width: "100%", height: `${height}px`, position: "relative" }} />;
}

/* ═══════════════════════════════════════════════════════════════════════════
   3D MODELS — DETAILED
   ═══════════════════════════════════════════════════════════════════════════ */

// Helper: rounded box via shape extrusion
function roundedBox(w, h, d, r = 0.1, segments = 4) {
  const shape = new THREE.Shape();
  const hw = w / 2, hh = h / 2;
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  return new THREE.ExtrudeGeometry(shape, {
    depth: d, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: segments, curveSegments: 12,
  });
}

function buildModel(modelId, color) {
  const group = new THREE.Group();
  const mat = (col, opts = {}) => new THREE.MeshStandardMaterial({ color: col, metalness: 0.3, roughness: 0.6, ...opts });
  const glow = (col, intensity = 0.6) => new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: intensity, metalness: 0.4, roughness: 0.4 });
  const plastic = (col) => new THREE.MeshStandardMaterial({ color: col, metalness: 0.1, roughness: 0.55 });
  const matte = (col) => new THREE.MeshStandardMaterial({ color: col, metalness: 0.05, roughness: 0.85 });

  switch (modelId) {
    // ─── N64 CARTRIDGE: accurate shape with the iconic top finger groove ───
    case "n64": {
      const cartColor = 0x1a1a1a;
      // Main body with rounded edges
      const body = new THREE.Mesh(roundedBox(1.55, 1.7, 0.4, 0.06), plastic(cartColor));
      body.position.z = -0.2;
      group.add(body);
      // Top finger groove cutout (suggested by adding two raised side pieces)
      const topL = new THREE.Mesh(roundedBox(0.32, 0.35, 0.42, 0.05), plastic(cartColor));
      topL.position.set(-0.61, 0.95, -0.21);
      group.add(topL);
      const topR = topL.clone();
      topR.position.x = 0.61;
      group.add(topR);
      // The curved arch between them (cylinder section)
      const archGeom = new THREE.CylinderGeometry(0.45, 0.45, 0.42, 24, 1, false, Math.PI, Math.PI);
      const arch = new THREE.Mesh(archGeom, plastic(cartColor));
      arch.rotation.x = Math.PI / 2;
      arch.position.set(0, 0.95, -0.21);
      arch.scale.set(0.7, 1, 1);
      group.add(arch);
      // Recessed label area
      const labelBg = new THREE.Mesh(roundedBox(1.2, 0.9, 0.04, 0.04), mat(0x0a0a0a));
      labelBg.position.set(0, 0.0, 0.02);
      group.add(labelBg);
      // The glowing label itself
      const label = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 0.82), glow(color, 0.7));
      label.position.set(0, 0.0, 0.07);
      group.add(label);
      // Contact pins at bottom
      const contactsBase = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.25, 0.35), mat(0x666666, { metalness: 0.9, roughness: 0.3 }));
      contactsBase.position.set(0, -1.0, -0.2);
      group.add(contactsBase);
      // Individual contact pins
      for (let i = -10; i <= 10; i += 2) {
        const pin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.02), mat(0xddccaa, { metalness: 1.0, roughness: 0.2 }));
        pin.position.set(i * 0.055, -1.05, -0.02);
        group.add(pin);
      }
      // Side ridges (the textured grip lines)
      for (let i = -1; i <= 1; i += 2) {
        for (let j = 0; j < 8; j++) {
          const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.42), mat(0x0a0a0a));
          ridge.position.set(i * 0.79, -0.3 + j * 0.1, -0.2);
          group.add(ridge);
        }
      }
      break;
    }

    // ─── GAME BOY: faithful original DMG-01 ───
    case "gameboy": {
      // Body with subtle rounded corners
      const body = new THREE.Mesh(roundedBox(1.45, 2.1, 0.32, 0.08), plastic(0xc8c8c0));
      group.add(body);
      // Top section (darker plastic where the screen sits)
      const topSection = new THREE.Mesh(roundedBox(1.3, 0.85, 0.04, 0.05), plastic(0x3a3a3a));
      topSection.position.set(0, 0.55, 0.18);
      group.add(topSection);
      // Screen bezel (darker)
      const screenBezel = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.7), plastic(0x111111));
      screenBezel.position.set(0, 0.55, 0.21);
      group.add(screenBezel);
      // Iconic Game Boy green screen
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.62), glow(0x9bbc0f, 1.4));
      screen.position.set(0, 0.55, 0.22);
      group.add(screen);
      // "DOT MATRIX" red lines on either side of screen (Nintendo branding line)
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.01), glow(0xff0044, 0.8));
      stripe.position.set(-0.6, 0.55, 0.22);
      group.add(stripe);
      // D-pad — proper cross shape
      const dpadCol = 0x1a1a1a;
      const dpadH = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.05), plastic(dpadCol));
      dpadH.position.set(-0.42, -0.4, 0.18);
      group.add(dpadH);
      const dpadV = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, 0.05), plastic(dpadCol));
      dpadV.position.set(-0.42, -0.4, 0.18);
      group.add(dpadV);
      const dpadCenter = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 16), plastic(dpadCol));
      dpadCenter.rotation.x = Math.PI / 2;
      dpadCenter.position.set(-0.42, -0.4, 0.2);
      group.add(dpadCenter);
      // A/B buttons (the iconic magenta/maroon)
      const btnColor = 0x6a1f3a;
      for (let i = 0; i < 2; i++) {
        const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.08, 24), plastic(btnColor));
        btn.rotation.x = Math.PI / 2;
        btn.position.set(0.2 + i * 0.25, -0.4, 0.19);
        group.add(btn);
      }
      // Start / Select (gray rubber slants)
      for (let i = 0; i < 2; i++) {
        const btn = new THREE.Mesh(roundedBox(0.2, 0.06, 0.04, 0.02), plastic(0x6a6a6a));
        btn.position.set(-0.15 + i * 0.3, -0.85, 0.16);
        btn.rotation.z = -0.25;
        group.add(btn);
      }
      // Speaker grille — six diagonal slots
      for (let i = 0; i < 6; i++) {
        const slot = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.02), mat(0x333333));
        slot.position.set(0.4 + i * 0.06, -0.75, 0.17);
        slot.rotation.z = -0.5;
        group.add(slot);
      }
      // Nintendo logo strip (small)
      const logoStrip = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.04), glow(0x444444, 0.3));
      logoStrip.position.set(0, 0.1, 0.18);
      group.add(logoStrip);
      break;
    }

    // ─── GAME BOY ADVANCE: horizontal indigo with proper proportions ───
    case "gba": {
      // Main horizontal body
      const body = new THREE.Mesh(roundedBox(2.3, 1.15, 0.28, 0.12), plastic(0x4f1fc4));
      group.add(body);
      // Curved outer edges suggested by softer corners (already in rounded box)
      // Screen bezel
      const screenBezel = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.85), plastic(0x111111));
      screenBezel.position.set(0, 0.05, 0.16);
      group.add(screenBezel);
      // Screen
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.75), glow(color, 1.1));
      screen.position.set(0, 0.05, 0.17);
      group.add(screen);
      // D-pad (left side)
      const dpadH = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.04), plastic(0x111111));
      dpadH.position.set(-0.82, 0.05, 0.15);
      group.add(dpadH);
      const dpadV = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.04), plastic(0x111111));
      dpadV.position.set(-0.82, 0.05, 0.15);
      group.add(dpadV);
      // A/B buttons (right, diagonal arrangement)
      const btnA = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.06, 20), plastic(0x6a1f3a));
      btnA.rotation.x = Math.PI / 2;
      btnA.position.set(1.0, -0.05, 0.17);
      group.add(btnA);
      const btnB = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.06, 20), plastic(0x6a1f3a));
      btnB.rotation.x = Math.PI / 2;
      btnB.position.set(0.78, 0.15, 0.17);
      group.add(btnB);
      // Start/Select (centered between joycons)
      for (let i = 0; i < 2; i++) {
        const btn = new THREE.Mesh(roundedBox(0.18, 0.05, 0.03, 0.02), plastic(0x6a6a6a));
        btn.position.set(-0.1 + i * 0.2, -0.45, 0.15);
        btn.rotation.z = -0.2;
        group.add(btn);
      }
      // L/R shoulder buttons (visible from front as curved)
      const lShoulder = new THREE.Mesh(roundedBox(0.4, 0.15, 0.22, 0.06), plastic(0x3a17a3));
      lShoulder.position.set(-1.0, 0.5, -0.02);
      group.add(lShoulder);
      const rShoulder = lShoulder.clone();
      rShoulder.position.x = 1.0;
      group.add(rShoulder);
      // Speaker grille (right side, near A/B)
      for (let i = 0; i < 4; i++) {
        const slot = new THREE.Mesh(new THREE.CircleGeometry(0.025, 8), mat(0x222222));
        slot.position.set(0.7 + i * 0.06, -0.35, 0.15);
        group.add(slot);
      }
      // SP-style indigo accent strip below screen
      const accent = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.04), glow(color, 0.6));
      accent.position.set(0, -0.45, 0.15);
      group.add(accent);
      break;
    }

    // ─── GAMECUBE: detailed purple cube ───
    case "gamecube": {
      // Main body (slightly trapezoidal — wider on bottom)
      const body = new THREE.Mesh(roundedBox(1.55, 1.25, 1.55, 0.06), plastic(0x4a2587));
      group.add(body);
      // Top disc lid panel
      const lidPanel = new THREE.Mesh(roundedBox(1.4, 0.04, 1.4, 0.04), plastic(0x5f33a0));
      lidPanel.position.y = 0.63;
      group.add(lidPanel);
      // Inset disc circle (lighter, with metallic ring)
      const discCircle = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), mat(0x3a1d6b, { roughness: 0.4 }));
      discCircle.rotation.x = -Math.PI / 2;
      discCircle.position.y = 0.66;
      group.add(discCircle);
      // Disc lid release button (small circle)
      const lidButton = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 16), plastic(0x222222));
      lidButton.position.set(0, 0.65, -0.6);
      group.add(lidButton);
      // Open lid arch indicator
      const arch = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.02, 8, 32), glow(color, 0.5));
      arch.rotation.x = Math.PI / 2;
      arch.position.y = 0.67;
      group.add(arch);
      // Back handle (curved arch protruding from back)
      const handleGeom = new THREE.TorusGeometry(0.32, 0.05, 8, 24, Math.PI);
      const handle = new THREE.Mesh(handleGeom, plastic(0x2a1158));
      handle.rotation.x = Math.PI / 2;
      handle.rotation.z = Math.PI;
      handle.position.set(0, 0.5, -0.85);
      group.add(handle);
      // Power button (round, red when on)
      const power = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16), glow(0xff3333, 0.9));
      power.rotation.x = Math.PI / 2;
      power.position.set(-0.55, -0.3, 0.78);
      group.add(power);
      // Reset button (small, gray, next to power)
      const reset = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 12), plastic(0x444444));
      reset.rotation.x = Math.PI / 2;
      reset.position.set(-0.35, -0.3, 0.78);
      group.add(reset);
      // Open button
      const open = new THREE.Mesh(roundedBox(0.18, 0.07, 0.03, 0.02), plastic(0x222222));
      open.position.set(0.45, 0.3, 0.78);
      group.add(open);
      // 4 controller ports
      for (let i = 0; i < 4; i++) {
        const port = new THREE.Mesh(roundedBox(0.22, 0.08, 0.03, 0.02), mat(0x1a0944));
        port.position.set(-0.5 + i * 0.33, -0.5, 0.78);
        group.add(port);
      }
      // 2 memory card slots
      for (let i = 0; i < 2; i++) {
        const slot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.02), mat(0x111111));
        slot.position.set(-0.05 + i * 0.18, 0.3, 0.78);
        group.add(slot);
      }
      break;
    }

    // ─── WII: detailed slim white console ───
    case "wii": {
      // Main body
      const body = new THREE.Mesh(roundedBox(0.55, 2.0, 1.45, 0.05), plastic(0xf5f5f5));
      group.add(body);
      // Front face plate (slightly inset look)
      const facePlate = new THREE.Mesh(new THREE.PlaneGeometry(0.51, 1.95), mat(0xf0f0f0));
      facePlate.rotation.y = Math.PI / 2;
      facePlate.position.x = 0.28;
      group.add(facePlate);
      // Disc slot (front, vertical)
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.05), plastic(0x111111));
      slot.position.set(0.28, 0.5, 0);
      group.add(slot);
      // Glowing disc slot light when active
      const slotGlow = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 1.0), glow(0x4fafff, 2.0));
      slotGlow.position.set(0.29, 0.5, 0);
      group.add(slotGlow);
      // Eject button (next to slot)
      const eject = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 16), plastic(0xdddddd));
      eject.rotation.z = Math.PI / 2;
      eject.position.set(0.29, 0.5, 0.6);
      group.add(eject);
      // Power button
      const power = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.08), glow(0x4fafff, 0.6));
      power.position.set(0.28, 0.15, 0.55);
      group.add(power);
      // Reset button
      const reset = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.06), plastic(0xcccccc));
      reset.position.set(0.28, -0.05, 0.55);
      group.add(reset);
      // SD slot (flap)
      const sd = new THREE.Mesh(roundedBox(0.18, 0.08, 0.04, 0.02), plastic(0xeeeeee));
      sd.rotation.y = Math.PI / 2;
      sd.position.set(0.3, -0.25, 0.45);
      group.add(sd);
      // 2 controller ports door
      const ctrlDoor = new THREE.Mesh(roundedBox(0.4, 0.14, 0.04, 0.02), plastic(0xeeeeee));
      ctrlDoor.rotation.y = Math.PI / 2;
      ctrlDoor.position.set(0.3, -0.7, 0.4);
      group.add(ctrlDoor);
      // Bottom stand (with the iconic clear ring base)
      const baseStand = new THREE.Mesh(roundedBox(0.7, 0.08, 0.55, 0.04), plastic(0x222222));
      baseStand.position.y = -1.05;
      group.add(baseStand);
      // Base ring (subtle glow underneath)
      const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.02, 8, 32), glow(0x4fafff, 0.4));
      baseRing.rotation.x = Math.PI / 2;
      baseRing.position.y = -1.1;
      group.add(baseRing);
      break;
    }

    // ─── SWITCH: detailed tablet + joy-cons ───
    case "switch": {
      // Main tablet
      const tablet = new THREE.Mesh(roundedBox(1.4, 1.0, 0.1, 0.05), plastic(0x1a1a1a));
      group.add(tablet);
      // Screen bezel
      const bezel = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.9), mat(0x0a0a0a));
      bezel.position.z = 0.06;
      group.add(bezel);
      // Screen (with glow)
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.22, 0.82), glow(0x4fdfff, 1.0));
      screen.position.z = 0.07;
      group.add(screen);
      // Left Joy-Con (blue/cyan)
      const lJoy = new THREE.Mesh(roundedBox(0.38, 1.0, 0.16, 0.06), glow(0x1d92e0, 0.4));
      lJoy.position.x = -0.89;
      group.add(lJoy);
      // L Joy-Con inner edge (where it slides in)
      const lEdge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 0.16), plastic(0x222222));
      lEdge.position.x = -0.73;
      group.add(lEdge);
      // L thumbstick (raised cylinder)
      const lStick = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.1, 20), plastic(0x111111));
      lStick.position.set(-0.89, 0.25, 0.12);
      group.add(lStick);
      const lStickCap = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.04, 20), plastic(0x222222));
      lStickCap.position.set(-0.89, 0.25, 0.16);
      group.add(lStickCap);
      // D-pad-ish 4 buttons on left
      const lButtons = [[-1.0, -0.05], [-0.78, -0.05], [-0.89, 0.06], [-0.89, -0.16]];
      lButtons.forEach(p => {
        const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 12), plastic(0x111111));
        btn.rotation.x = Math.PI / 2;
        btn.position.set(p[0], p[1], 0.1);
        group.add(btn);
      });
      // Capture button
      const capture = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.02), plastic(0x111111));
      capture.position.set(-0.89, -0.35, 0.1);
      group.add(capture);
      // Right Joy-Con (red/neon)
      const rJoy = new THREE.Mesh(roundedBox(0.38, 1.0, 0.16, 0.06), glow(0xe04134, 0.4));
      rJoy.position.x = 0.89;
      group.add(rJoy);
      const rEdge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 0.16), plastic(0x222222));
      rEdge.position.x = 0.73;
      group.add(rEdge);
      // R thumbstick (lower position)
      const rStick = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.1, 20), plastic(0x111111));
      rStick.position.set(0.89, -0.2, 0.12);
      group.add(rStick);
      // ABXY (right joy-con) with proper Nintendo layout: A right, B bottom, X top, Y left
      const abxy = [
        [1.0, 0.2, 0xff4444],   // A
        [0.78, 0.2, 0xffd84f],  // X
        [0.89, 0.31, 0x44dd44], // top button visible
        [0.89, 0.09, 0x4f8cff],
      ];
      abxy.forEach(([x, y, c]) => {
        const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 16), glow(c, 0.5));
        btn.rotation.x = Math.PI / 2;
        btn.position.set(x, y, 0.1);
        group.add(btn);
      });
      // Home button (small circle with glow)
      const home = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), glow(0xffffff, 1.2));
      home.position.set(0.89, -0.35, 0.1);
      group.add(home);
      break;
    }

    // ─── DS: clamshell with both screens ───
    case "ds": {
      // Bottom half
      const bottom = new THREE.Mesh(roundedBox(1.7, 1.0, 0.14, 0.06), plastic(0x9a9a9a));
      bottom.position.y = -0.5;
      group.add(bottom);
      // Top half — rotated to look opened
      const top = new THREE.Group();
      const topBody = new THREE.Mesh(roundedBox(1.7, 1.0, 0.14, 0.06), plastic(0x9a9a9a));
      top.add(topBody);
      // Top screen bezel
      const topBezel = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.85), plastic(0x0a0a0a));
      topBezel.position.z = 0.08;
      top.add(topBezel);
      // Top screen
      const topScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.78), glow(color, 1.0));
      topScreen.position.z = 0.085;
      top.add(topScreen);
      top.position.y = 0.4;
      top.rotation.x = -0.6;
      group.add(top);
      // Bottom screen bezel
      const botBezel = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.85), plastic(0x0a0a0a));
      botBezel.position.set(0, -0.5, 0.08);
      group.add(botBezel);
      // Bottom screen (touchscreen)
      const botScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.78), glow(color, 0.8));
      botScreen.position.set(0, -0.5, 0.085);
      group.add(botScreen);
      // D-pad
      const dpadH = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.07, 0.04), plastic(0x111111));
      dpadH.position.set(-0.65, -0.45, 0.09);
      group.add(dpadH);
      const dpadV = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.22, 0.04), plastic(0x111111));
      dpadV.position.set(-0.65, -0.45, 0.09);
      group.add(dpadV);
      // ABXY (right side)
      const dsBtns = [[0.6, -0.35, 0xff4444], [0.74, -0.5, 0xffd84f], [0.6, -0.65, 0x44dd44], [0.46, -0.5, 0x4f8cff]];
      dsBtns.forEach(([x, y, c]) => {
        const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 16), glow(c, 0.6));
        btn.rotation.x = Math.PI / 2;
        btn.position.set(x, y, 0.09);
        group.add(btn);
      });
      // Start/Select
      for (let i = 0; i < 2; i++) {
        const btn = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.02), plastic(0x222222));
        btn.position.set(-0.1 + i * 0.2, -0.9, 0.09);
        group.add(btn);
      }
      // Hinge between screens (cylinder)
      const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 16), plastic(0x444444));
      hinge.rotation.z = Math.PI / 2;
      hinge.position.set(0, 0.0, 0);
      group.add(hinge);
      break;
    }

    // ─── PLAYSTATION DUALSHOCK CONTROLLER ───
    case "ps": {
      // Center body — wider, flatter
      const center = new THREE.Mesh(roundedBox(1.0, 0.55, 0.5, 0.1), plastic(0x1a1a2a));
      group.add(center);
      // Grips — using cylinder + sphere combination
      const buildGrip = (x, angle) => {
        const grip = new THREE.Group();
        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.55, 20), plastic(0x1a1a2a));
        grip.add(cyl);
        const capTop = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), plastic(0x1a1a2a));
        capTop.position.y = 0.275;
        grip.add(capTop);
        const capBot = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), plastic(0x1a1a2a));
        capBot.position.y = -0.275;
        grip.add(capBot);
        grip.position.set(x, -0.2, 0);
        grip.rotation.z = angle;
        return grip;
      };
      group.add(buildGrip(-0.65, 0.35));
      group.add(buildGrip(0.65, -0.35));
      // Light bar (top center, glowing)
      const lightbar = new THREE.Mesh(roundedBox(0.55, 0.05, 0.06, 0.02), glow(color, 1.8));
      lightbar.position.set(0, 0.32, 0.2);
      group.add(lightbar);
      // Touchpad (PS4 style — large flat area in center)
      const touchpad = new THREE.Mesh(roundedBox(0.55, 0.25, 0.04, 0.03), mat(0x2a2a3a, { roughness: 0.7 }));
      touchpad.position.set(0, 0.08, 0.28);
      group.add(touchpad);
      // Analog sticks
      const buildStick = (x, y) => {
        const stickBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 24), plastic(0x111111));
        stickBase.position.set(x, y, 0.28);
        const stickTop = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.1, 24), plastic(0x222222));
        stickTop.position.set(x, y, 0.32);
        const stickCap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.04, 24), mat(0x111111, { roughness: 0.9 }));
        stickCap.position.set(x, y, 0.37);
        return [stickBase, stickTop, stickCap];
      };
      buildStick(-0.22, -0.18).forEach(m => group.add(m));
      buildStick(0.22, -0.18).forEach(m => group.add(m));
      // Symbol buttons (iconic PlayStation: pink square, cyan X, red O, green triangle)
      const psBtns = [
        [0.55, 0.08, 0xff5599],  // square (left)
        [0.7, -0.05, 0x4fdfff],  // X (bottom — but the bottom one is X here)
        [0.85, 0.08, 0xff4444],  // O (right)
        [0.7, 0.22, 0x44dd44],   // triangle (top)
      ];
      psBtns.forEach(([x, y, c]) => {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 20), glow(c, 0.9));
        b.rotation.x = Math.PI / 2;
        b.position.set(x, y, 0.28);
        group.add(b);
      });
      // D-pad
      const dpadH = new THREE.Mesh(roundedBox(0.26, 0.08, 0.05, 0.02), plastic(0x111111));
      dpadH.position.set(-0.7, 0.08, 0.28);
      group.add(dpadH);
      const dpadV = new THREE.Mesh(roundedBox(0.08, 0.26, 0.05, 0.02), plastic(0x111111));
      dpadV.position.set(-0.7, 0.08, 0.28);
      group.add(dpadV);
      // Start/Options buttons (small)
      const start = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.04), plastic(0x222222));
      start.position.set(-0.32, 0.22, 0.28);
      group.add(start);
      const options = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.04), plastic(0x222222));
      options.position.set(0.32, 0.22, 0.28);
      group.add(options);
      // PS Home button (centered, glowing)
      const ps = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 16), glow(0xffffff, 1.0));
      ps.rotation.x = Math.PI / 2;
      ps.position.set(0, -0.18, 0.32);
      group.add(ps);
      break;
    }

    // ─── XBOX CONTROLLER ───
    case "xbox": {
      // Center body (more rounded organic shape)
      const center = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), plastic(0x1a2a1a));
      center.scale.set(1, 0.7, 0.7);
      group.add(center);
      // Grips
      const buildXGrip = (x, angle) => {
        const grip = new THREE.Group();
        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.6, 20), plastic(0x1a2a1a));
        grip.add(cyl);
        const capTop = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), plastic(0x1a2a1a));
        capTop.position.y = 0.3;
        grip.add(capTop);
        const capBot = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), plastic(0x1a2a1a));
        capBot.position.y = -0.3;
        grip.add(capBot);
        grip.position.set(x, -0.2, 0);
        grip.rotation.z = angle;
        return grip;
      };
      group.add(buildXGrip(-0.6, 0.4));
      group.add(buildXGrip(0.6, -0.4));
      // Left thumbstick (HIGH — Xbox layout)
      const lStickBase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.06, 24), plastic(0x111111));
      lStickBase.rotation.x = Math.PI / 2;
      lStickBase.position.set(-0.3, 0.12, 0.36);
      group.add(lStickBase);
      const lStick = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.12, 24), plastic(0x222222));
      lStick.rotation.x = Math.PI / 2;
      lStick.position.set(-0.3, 0.12, 0.42);
      group.add(lStick);
      // Right thumbstick (LOW — Xbox layout)
      const rStickBase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.06, 24), plastic(0x111111));
      rStickBase.rotation.x = Math.PI / 2;
      rStickBase.position.set(0.15, -0.18, 0.36);
      group.add(rStickBase);
      const rStick = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.12, 24), plastic(0x222222));
      rStick.rotation.x = Math.PI / 2;
      rStick.position.set(0.15, -0.18, 0.42);
      group.add(rStick);
      // ABXY in proper Xbox layout: Y top (yellow), B right (red), A bottom (green), X left (blue)
      const xboxBtns = [
        [0, 0.18, 0xffd84f],   // Y top
        [0.18, 0.0, 0xff4444], // B right
        [0, -0.18, 0x44dd44],  // A bottom
        [-0.18, 0.0, 0x4f8cff], // X left
      ];
      xboxBtns.forEach(([x, y, c]) => {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 20), glow(c, 0.9));
        b.rotation.x = Math.PI / 2;
        b.position.set(0.42 + x, y, 0.34);
        group.add(b);
      });
      // D-pad
      const dpadH = new THREE.Mesh(roundedBox(0.24, 0.07, 0.05, 0.02), plastic(0x111111));
      dpadH.position.set(-0.05, -0.2, 0.32);
      group.add(dpadH);
      const dpadV = new THREE.Mesh(roundedBox(0.07, 0.24, 0.05, 0.02), plastic(0x111111));
      dpadV.position.set(-0.05, -0.2, 0.32);
      group.add(dpadV);
      // Menu/View buttons
      const menu = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), plastic(0x222222));
      menu.position.set(0.2, 0.22, 0.36);
      group.add(menu);
      const view = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), plastic(0x222222));
      view.position.set(-0.05, 0.22, 0.36);
      group.add(view);
      // Iconic glowing Xbox logo (large, center top)
      const logo = new THREE.Mesh(new THREE.CircleGeometry(0.14, 32), glow(0x7fff7f, 2.0));
      logo.position.set(0.06, 0.36, 0.42);
      group.add(logo);
      break;
    }

    // ─── SEGA GENESIS: classic Model 1 ───
    case "genesis": {
      // Main body (long, flat black wedge)
      const body = new THREE.Mesh(roundedBox(2.3, 0.45, 1.6, 0.04), plastic(0x111111));
      group.add(body);
      // Iconic cartridge slot on top
      const slotFrame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.65), plastic(0x222222));
      slotFrame.position.y = 0.23;
      group.add(slotFrame);
      const slot = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.05, 0.55), mat(0x000000));
      slot.position.y = 0.25;
      group.add(slot);
      // Power switch (rectangle slider)
      const powerHousing = new THREE.Mesh(roundedBox(0.22, 0.12, 0.15, 0.02), plastic(0x222222));
      powerHousing.position.set(-0.95, 0.22, 0.55);
      group.add(powerHousing);
      const powerSwitch = new THREE.Mesh(roundedBox(0.1, 0.06, 0.06, 0.01), plastic(0xdddddd));
      powerSwitch.position.set(-0.95, 0.28, 0.62);
      group.add(powerSwitch);
      // Reset button (red)
      const reset = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 16), plastic(0xcc0000));
      reset.rotation.x = Math.PI / 2;
      reset.position.set(-0.7, 0.22, 0.78);
      group.add(reset);
      // Iconic red Genesis stripe across front
      const stripe = new THREE.Mesh(roundedBox(2.32, 0.06, 0.12, 0.02), glow(color, 1.0));
      stripe.position.set(0, -0.1, 0.78);
      group.add(stripe);
      // Glowing power LED
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), glow(0x44ff44, 2.5));
      led.position.set(0.95, -0.05, 0.79);
      group.add(led);
      // "GENESIS" embossed area (subtle highlight strip)
      const logoStrip = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.05), mat(0x333333));
      logoStrip.position.set(0.5, 0.05, 0.81);
      group.add(logoStrip);
      // 2 controller ports
      for (let i = 0; i < 2; i++) {
        const port = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.1, 0.04), mat(0x000000));
        port.position.set(0.4 + i * 0.35, 0.1, 0.81);
        group.add(port);
      }
      break;
    }

    // ─── PC / CRT MONITOR ───
    case "monitor": {
      // Front bezel
      const bezel = new THREE.Mesh(roundedBox(2.3, 1.75, 0.45, 0.06), plastic(0xc8c8c0));
      group.add(bezel);
      // Screen recess (darker)
      const screenBezel = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.5), plastic(0x111111));
      screenBezel.position.z = 0.23;
      group.add(screenBezel);
      // Glowing screen (with subtle scanlines effect via reduced metalness)
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.42), glow(color, 1.4));
      screen.position.z = 0.24;
      group.add(screen);
      // Brand strip
      const brandStrip = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.05), mat(0xaaaaaa));
      brandStrip.position.set(0, -0.95, 0.23);
      group.add(brandStrip);
      // Power LED
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.025, 16, 8), glow(0x44ff44, 2.5));
      led.position.set(0.9, -0.95, 0.24);
      group.add(led);
      // Power button
      const power = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), plastic(0x222222));
      power.position.set(-0.9, -0.95, 0.24);
      group.add(power);
      // CRT back bulge
      const backBulge = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.3, 1.0), plastic(0xb8b8b0));
      backBulge.position.z = -0.7;
      group.add(backBulge);
      // Back taper (cylinder approximating CRT curve)
      const backTaper = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.7, 0.5, 16), plastic(0xa8a8a0));
      backTaper.rotation.x = Math.PI / 2;
      backTaper.position.z = -1.3;
      group.add(backTaper);
      // Stand
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.55, 0.18, 12), plastic(0x888880));
      stand.position.y = -1.3;
      group.add(stand);
      // Base plate
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.04, 24), plastic(0x666660));
      base.position.y = -1.42;
      group.add(base);
      break;
    }

    // ─── STEAM DECK / ROG ALLY ───
    case "steamdeck": {
      // Main body — wide handheld with subtle curves
      const body = new THREE.Mesh(roundedBox(2.7, 1.15, 0.3, 0.1), plastic(0x222222));
      group.add(body);
      // Screen bezel
      const screenBezel = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.95), plastic(0x111111));
      screenBezel.position.z = 0.16;
      group.add(screenBezel);
      // Screen (with vibrant glow)
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.88), glow(color, 1.1));
      screen.position.z = 0.17;
      group.add(screen);
      // Left thumbstick
      const lStickBase = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.06, 24), plastic(0x111111));
      lStickBase.rotation.x = Math.PI / 2;
      lStickBase.position.set(-1.05, 0.3, 0.18);
      group.add(lStickBase);
      const lStick = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.1, 24), plastic(0x222222));
      lStick.rotation.x = Math.PI / 2;
      lStick.position.set(-1.05, 0.3, 0.22);
      group.add(lStick);
      // Right thumbstick (Xbox-style offset — high on right too here, since Steam Deck has both high)
      const rStickBase = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.06, 24), plastic(0x111111));
      rStickBase.rotation.x = Math.PI / 2;
      rStickBase.position.set(1.05, 0.3, 0.18);
      group.add(rStickBase);
      const rStick = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.1, 24), plastic(0x222222));
      rStick.rotation.x = Math.PI / 2;
      rStick.position.set(1.05, 0.3, 0.22);
      group.add(rStick);
      // D-pad (left, below stick)
      const dpadH = new THREE.Mesh(roundedBox(0.2, 0.06, 0.04, 0.02), plastic(0x444444));
      dpadH.position.set(-1.05, -0.15, 0.17);
      group.add(dpadH);
      const dpadV = new THREE.Mesh(roundedBox(0.06, 0.2, 0.04, 0.02), plastic(0x444444));
      dpadV.position.set(-1.05, -0.15, 0.17);
      group.add(dpadV);
      // ABXY (right, below stick) — Steam Deck order
      const sdBtns = [
        [1.05, -0.05, 0xff4444],   // A
        [1.2, -0.15, 0x44dd44],    // B
        [1.05, -0.25, 0x4f8cff],   // X
        [0.9, -0.15, 0xffd84f],    // Y
      ];
      sdBtns.forEach(([x, y, c]) => {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 16), glow(c, 0.6));
        b.rotation.x = Math.PI / 2;
        b.position.set(x, y, 0.17);
        group.add(b);
      });
      // Steam Deck-style trackpads (circular)
      const lTrack = new THREE.Mesh(new THREE.CircleGeometry(0.16, 32), mat(0x0a0a0a, { roughness: 0.9 }));
      lTrack.position.set(-1.05, -0.45, 0.17);
      group.add(lTrack);
      const rTrack = new THREE.Mesh(new THREE.CircleGeometry(0.16, 32), mat(0x0a0a0a, { roughness: 0.9 }));
      rTrack.position.set(1.05, -0.45, 0.17);
      group.add(rTrack);
      // Speaker grilles (small dots near sticks)
      for (let i = 0; i < 3; i++) {
        const dotL = new THREE.Mesh(new THREE.CircleGeometry(0.02, 12), mat(0x444444));
        dotL.position.set(-1.3 + i * 0.06, 0.45, 0.17);
        group.add(dotL);
      }
      // Steam button (glowing center accent)
      const homeBtn = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), glow(color, 1.5));
      homeBtn.position.set(0, -0.45, 0.17);
      group.add(homeBtn);
      break;
    }

    default: {
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 0.4), glow(color, 0.4));
      group.add(body);
    }
  }

  return group;
}

function ConsoleModel({ modelId, color, selected, size = 220, autoRotate = true }) {
  const mountRef = useRef(null);
  const stateRef = useRef({});

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.z = 4.8;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.PointLight(color, 3.5, 12);
    key.position.set(2.5, 2.5, 3);
    scene.add(key);
    const fill = new THREE.PointLight(0x6688ff, 1.0, 10);
    fill.position.set(-3, -1, 2);
    scene.add(fill);
    const rim = new THREE.PointLight(0xffffff, 0.6, 10);
    rim.position.set(0, 3, -3);
    scene.add(rim);

    const mesh = buildModel(modelId, color);
    const box = new THREE.Box3().setFromObject(mesh);
    const sz = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(sz.x, sz.y, sz.z);
    const baseScale = 2.3 / maxDim;
    mesh.scale.setScalar(baseScale);
    box.setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    mesh.position.sub(center);

    scene.add(mesh);
    mesh.rotation.x = 0.2;
    stateRef.current = { mesh, baseScale };

    let raf, t = 0;
    const animate = () => {
      t += 0.01;
      const sel = stateRef.current.selected;
      if (autoRotate) {
        mesh.rotation.y += sel ? 0.025 : 0.01;
        mesh.position.y = Math.sin(t * 1.2) * 0.1;
      }
      const target = sel ? baseScale * 1.08 : baseScale;
      mesh.scale.lerp(new THREE.Vector3(target, target, target), 0.1);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [modelId, color, size, autoRotate]);

  useEffect(() => { stateRef.current.selected = selected; }, [selected]);

  return <div ref={mountRef} style={{ width: size, height: size, display: "flex" }} />;
}

// Viewport-based lazy renderer: only mounts the WebGL canvas when card is visible.
// Critical because browsers cap WebGL contexts at ~16 — too many at once and they silently fail.
function LazyConsoleModel({ modelId, color, selected, size = 220 }) {
  const containerRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => setVisible(entry.isIntersecting));
      },
      { root: null, rootMargin: "200px", threshold: 0.01 } // preload 200px before entering view
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Static placeholder while off-screen — solid color silhouette
  return (
    <div ref={containerRef} style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {visible ? (
        <ConsoleModel modelId={modelId} color={color} selected={selected} size={size} />
      ) : (
        <div style={{
          width: size * 0.6, height: size * 0.6,
          background: `radial-gradient(circle, ${`#${color.toString(16).padStart(6, '0')}`}33 0%, transparent 70%)`,
          border: `1px solid ${`#${color.toString(16).padStart(6, '0')}`}44`,
          borderRadius: "8px",
        }} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   3D GAME BOX — rotating box with cover art texture
   ═══════════════════════════════════════════════════════════════════════════ */

// Create a fallback canvas texture when cover image fails or is missing
function makeFallbackTexture(title, hue) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 360;
  const ctx = canvas.getContext("2d");
  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 360);
  grad.addColorStop(0, hue);
  grad.addColorStop(1, "#000000");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 360);
  // Subtle grid pattern
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 256; i += 16) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 360); ctx.stroke();
  }
  for (let i = 0; i < 360; i += 16) {
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
  }
  // Title text — wrap to lines
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px Orbitron, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const words = title.split(" ");
  const lines = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).length > 14) { lines.push(current); current = w; }
    else current = current ? current + " " + w : w;
  }
  if (current) lines.push(current);
  const startY = 180 - (lines.length - 1) * 14;
  lines.forEach((line, i) => ctx.fillText(line, 128, startY + i * 28));
  return canvas;
}

function GameBox({ game, size = 240, autoRotate = true, selected = false }) {
  const mountRef = useRef(null);
  const stateRef = useRef({});
  const hue = hueOf(game.genre);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.z = 5.2;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const key = new THREE.PointLight(0xffffff, 2.5, 12);
    key.position.set(3, 3, 4);
    scene.add(key);
    const rim = new THREE.PointLight(hue, 1.5, 10);
    rim.position.set(-3, 1, -2);
    scene.add(rim);

    // Game box dimensions (taller than wide, slim depth — like a DVD case)
    const W = 1.5, H = 2.1, D = 0.25;
    const geom = new THREE.BoxGeometry(W, H, D);

    // Six materials, one per face — front gets the cover, others get themed solid colors
    const sideColor = new THREE.Color(hue).multiplyScalar(0.25);
    const spineColor = new THREE.Color(hue).multiplyScalar(0.4);

    // Convert hue to hex string for canvas
    const hueHex = hue;

    // Build texture
    const buildBox = (frontTex) => {
      const materials = [
        new THREE.MeshStandardMaterial({ map: null, color: spineColor, metalness: 0.2, roughness: 0.6 }), // right (spine)
        new THREE.MeshStandardMaterial({ map: null, color: spineColor, metalness: 0.2, roughness: 0.6 }), // left (spine)
        new THREE.MeshStandardMaterial({ color: sideColor, metalness: 0.1, roughness: 0.7 }), // top
        new THREE.MeshStandardMaterial({ color: sideColor, metalness: 0.1, roughness: 0.7 }), // bottom
        new THREE.MeshStandardMaterial({ map: frontTex, metalness: 0.15, roughness: 0.55 }), // front (cover)
        new THREE.MeshStandardMaterial({ color: sideColor, metalness: 0.1, roughness: 0.7 }), // back
      ];
      const mesh = new THREE.Mesh(geom, materials);
      return mesh;
    };

    let mesh;
    const finishWith = (tex) => {
      mesh = buildBox(tex);
      scene.add(mesh);
      stateRef.current.mesh = mesh;
    };

    // Cross-version-safe color space helper (r128 uses .encoding, r152+ uses .colorSpace)
    const setSRGB = (tex) => {
      if (THREE.SRGBColorSpace !== undefined) tex.colorSpace = THREE.SRGBColorSpace;
      else if (THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;
    };

    // Load via <img> tag → canvas → texture. This works around some Three.js
    // TextureLoader CORS quirks with Wikimedia images.
    const coverImageUrl = coverUrl(game);
    const loadCoverAsTexture = (url) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            // Pad the image to a box-art aspect ratio (5:7) with black bars if needed
            canvas.width = 256;
            canvas.height = 360;
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, 256, 360);
            // Fit image preserving aspect ratio
            const imgAspect = img.width / img.height;
            const canvasAspect = 256 / 360;
            let dw, dh, dx, dy;
            if (imgAspect > canvasAspect) {
              // Image is wider; fit by width
              dw = 256;
              dh = 256 / imgAspect;
              dx = 0;
              dy = (360 - dh) / 2;
            } else {
              dh = 360;
              dw = 360 * imgAspect;
              dx = (256 - dw) / 2;
              dy = 0;
            }
            ctx.drawImage(img, dx, dy, dw, dh);
            const tex = new THREE.CanvasTexture(canvas);
            setSRGB(tex);
            resolve(tex);
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => reject(new Error("image load failed"));
        img.src = url;
      });
    };

    if (coverImageUrl) {
      loadCoverAsTexture(coverImageUrl)
        .then(tex => finishWith(tex))
        .catch(() => {
          const canvas = makeFallbackTexture(game.name, hueHex);
          const tex = new THREE.CanvasTexture(canvas);
          setSRGB(tex);
          finishWith(tex);
        });
    } else {
      const canvas = makeFallbackTexture(game.name, hueHex);
      const tex = new THREE.CanvasTexture(canvas);
      setSRGB(tex);
      finishWith(tex);
    }

    let raf, t = 0;
    const animate = () => {
      t += 0.01;
      if (mesh) {
        const sel = stateRef.current.selected;
        if (autoRotate) {
          mesh.rotation.y += sel ? 0.025 : 0.012;
          mesh.position.y = Math.sin(t * 1.2) * 0.08;
        }
        const target = sel ? 1.08 : 1.0;
        mesh.scale.lerp(new THREE.Vector3(target, target, target), 0.1);
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [game.name, game.cover, hue, size, autoRotate]);

  useEffect(() => { stateRef.current.selected = selected; }, [selected]);

  return <div ref={mountRef} style={{ width: size, height: size, display: "flex" }} />;
}

// Lazy GameBox — same viewport gating as LazyConsoleModel
function LazyGameBox({ game, size = 220, selected = false }) {
  const containerRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const hue = hueOf(game.genre);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => setVisible(entry.isIntersecting));
      },
      { root: null, rootMargin: "200px", threshold: 0.01 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {visible ? (
        <GameBox game={game} size={size} selected={selected} />
      ) : (
        <div style={{
          width: size * 0.55, height: size * 0.78,
          background: `linear-gradient(135deg, ${hue}33 0%, ${hue}11 100%)`,
          border: `1px solid ${hue}44`, borderRadius: "4px",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "8px", textAlign: "center",
        }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: "10px", color: hue, letterSpacing: "1px", fontWeight: 600, lineHeight: 1.3 }}>{game.name}</div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PRIMITIVES
   ═══════════════════════════════════════════════════════════════════════════ */

function Panel({ children, glow, pulse, style = {}, onClick }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!pulse) return;
    let raf;
    const tick = () => { setT(performance.now()); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pulse]);
  const pulseAmt = pulse ? 0.7 + Math.sin(t / 600) * 0.3 : 1;
  const glowStrength = glow ? Math.floor(48 * pulseAmt) : 0;
  const glowAlpha = glow ? Math.floor(80 * pulseAmt).toString(16).padStart(2, '0') : '00';
  return (
    <div onClick={onClick} style={{
      background: "linear-gradient(180deg, rgba(12,12,18,0.92) 0%, rgba(5,5,8,0.92) 100%)",
      border: `1px solid ${glow || PAL.line}`,
      borderRadius: "2px",
      boxShadow: glow ? `0 0 ${glowStrength}px ${glow}${glowAlpha}, 0 0 ${glowStrength * 2}px ${glow}33, inset 0 1px 0 rgba(255,255,255,0.05)` : `inset 0 1px 0 rgba(255,255,255,0.04)`,
      backdropFilter: "blur(8px)", cursor: onClick ? "pointer" : "default",
      position: "relative", transition: "border-color 0.2s", ...style,
    }}>{children}</div>
  );
}

// Used only on the splash screen — wraps a 3D chrome label as the entire
// clickable surface, with a soft halo glow on hover to indicate it's tappable.
// Replaces the standard Btn for the splash because the standard Btn's clip-path
// arrows + colored borders look broken when the visible label is a small 3D mesh.
function SplashButton({ chars, color, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={() => setHovered(true)}
      onTouchEnd={() => setHovered(false)}
      style={{
        background: "transparent",
        border: "none",
        padding: "24px 16px",
        cursor: "pointer",
        position: "relative",
        width: "220px",
        transition: "transform 0.15s",
        transform: hovered ? "scale(1.05)" : "scale(1)",
      }}
    >
      {/* Soft colored halo behind the 3D label — hints at the brand color */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: `radial-gradient(circle at center, ${color}${hovered ? "55" : "2a"} 0%, ${color}${hovered ? "14" : "0a"} 40%, transparent 70%)`,
        pointerEvents: "none",
        transition: "background 0.2s",
        filter: "blur(6px)",
      }} />
      <div style={{ position: "relative", zIndex: 1, pointerEvents: "none" }}>
        <Title3D
          rows={[{ chars, y: 0 }]}
          height={110}
          targetWidth={chars.length * 5.5}
          idleRotation={false}
        />
      </div>
    </button>
  );
}

function Btn({ children, onClick, color = PAL.cyan, disabled, full, size = "md", style = {}, glow }) {
  const [h, setH] = useState(false);
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!glow) return;
    let raf;
    const tick = () => { setT(performance.now()); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [glow]);
  const pulseAmt = glow ? 0.6 + Math.sin(t / 500) * 0.4 : 1;
  const sizes = {
    sm: { padding: "8px 14px", fontSize: "11px" },
    md: { padding: "12px 22px", fontSize: "13px" },
    lg: { padding: "16px 32px", fontSize: "15px" },
  };
  const baseGlow = `0 0 ${Math.floor(20 * pulseAmt)}px ${color}66, 0 0 ${Math.floor(40 * pulseAmt)}px ${color}33`;
  const hoverGlow = `0 0 32px ${color}cc, 0 0 64px ${color}66`;
  return (
    <button onClick={onClick} disabled={disabled} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        fontFamily: FONT_DISPLAY, fontWeight: 600, ...sizes[size],
        letterSpacing: "2px", textTransform: "uppercase",
        background: h && !disabled ? color : "transparent",
        color: h && !disabled ? PAL.void : color,
        border: `1px solid ${color}`,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1,
        boxShadow: h && !disabled ? hoverGlow : baseGlow,
        transition: "background 0.15s, color 0.15s", width: full ? "100%" : "auto",
        clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%)",
        ...style,
      }}
    >{children}</button>
  );
}

function Chip({ children, color = PAL.inkDim, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      fontFamily: FONT_DISPLAY, fontSize: "10px", fontWeight: 500,
      letterSpacing: "1.5px", textTransform: "uppercase", padding: "6px 12px",
      background: active ? `${color}22` : "transparent",
      color: active ? color : PAL.inkDim,
      border: `1px solid ${active ? color : PAL.line}`,
      borderRadius: "2px", cursor: onClick ? "pointer" : "default",
      transition: "all 0.15s", whiteSpace: "nowrap",
      boxShadow: active ? `0 0 12px ${color}44` : "none",
    }}>{children}</button>
  );
}

function Label({ children, color = PAL.inkDim }) {
  return <div style={{ fontFamily: FONT_DISPLAY, fontSize: "10px", fontWeight: 500, color, letterSpacing: "3px", textTransform: "uppercase", marginBottom: "12px" }}>{children}</div>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSOLE CAROUSEL — horizontal scroller per category
   ═══════════════════════════════════════════════════════════════════════════ */

function BrandPicker({ selected, onToggle }) {
  // One brand can be "expanded" at a time to reveal its specific consoles.
  const [expandedId, setExpandedId] = useState(null);

  const countForBrand = (brand) =>
    brand.consoles.filter(cid => selected.includes(cid)).length;

  return (
    <div style={{ marginBottom: "24px" }}>
      {/* Brand carousel — no boxes, just floating 3D models with glow halos when selected */}
      <div className="hide-scrollbar" style={{
        display: "flex", gap: "12px", overflowX: "auto", overflowY: "hidden",
        padding: "12px 4px 16px",
        WebkitOverflowScrolling: "touch",
      }}>
        {BRANDS.map(brand => {
          const count = countForBrand(brand);
          const isExpanded = expandedId === brand.id;
          const hasSelection = count > 0;
          const glowing = isExpanded || hasSelection;
          return (
            <button
              key={brand.id}
              onClick={() => setExpandedId(isExpanded ? null : brand.id)}
              style={{
                flex: "0 0 110px",
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: "6px",
                padding: "8px 6px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                transition: "transform 0.2s",
                transform: glowing ? "scale(1.04)" : "scale(1)",
                position: "relative",
              }}
            >
              {/* Halo behind the 3D model — only visible when selected or expanded */}
              {glowing && (
                <div style={{
                  position: "absolute", top: "6px", left: "50%", transform: "translateX(-50%)",
                  width: "110px", height: "110px",
                  background: `radial-gradient(circle, ${brand.color}66 0%, ${brand.color}22 35%, ${brand.color}08 60%, transparent 80%)`,
                  pointerEvents: "none", zIndex: 0,
                  filter: "blur(2px)",
                }} />
              )}
              <div style={{ position: "relative", zIndex: 1, pointerEvents: "none" }}>
                <LazyConsoleModel modelId={brand.icon} color={parseInt(brand.color.slice(1), 16)} selected={glowing} size={80} />
              </div>
              <div style={{
                fontFamily: FONT_DISPLAY, fontSize: "10px",
                letterSpacing: "1.5px", textTransform: "uppercase",
                color: glowing ? brand.color : PAL.inkDim, fontWeight: 600,
                textShadow: glowing ? `0 0 10px ${brand.color}cc, 0 0 20px ${brand.color}66` : "none",
                position: "relative", zIndex: 1,
                textAlign: "center", lineHeight: 1.2,
              }}>{brand.label}</div>
              {count > 0 && (
                <div style={{
                  fontFamily: FONT_MONO, fontSize: "9px",
                  color: brand.color, letterSpacing: "1px",
                  position: "relative", zIndex: 1,
                  textShadow: `0 0 6px ${brand.color}88`,
                }}>{count} LINKED</div>
              )}
              <div style={{
                fontFamily: FONT_MONO, fontSize: "12px",
                color: isExpanded ? brand.color : PAL.inkFaint,
                letterSpacing: "1px",
                position: "relative", zIndex: 1,
                transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
                fontWeight: 600,
                textShadow: isExpanded ? `0 0 8px ${brand.color}88` : "none",
              }}>▼</div>
            </button>
          );
        })}
      </div>

      {/* Expanded brand — list of specific consoles inside it (no boxes either) */}
      {expandedId && (() => {
        const brand = BRANDS.find(b => b.id === expandedId);
        const items = brand.consoles
          .map(cid => CONSOLE_GROUPS.find(c => c.id === cid))
          .filter(Boolean);
        return (
          <div style={{
            padding: "16px 4px",
            borderTop: `1px solid ${brand.color}44`,
            borderBottom: `1px solid ${brand.color}44`,
            marginBottom: "16px",
          }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: "10px", color: brand.color, letterSpacing: "2px", marginBottom: "12px", fontWeight: 600, textShadow: `0 0 8px ${brand.color}66` }}>
              ◇ {brand.label.toUpperCase()} HARDWARE
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "8px" }}>
              {items.map(c => {
                const sel = selected.includes(c.id);
                return (
                  <button key={c.id} onClick={() => onToggle(c.id)} style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    gap: "6px", padding: "8px 4px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    transition: "transform 0.15s",
                    transform: sel ? "scale(1.05)" : "scale(1)",
                    position: "relative",
                  }}>
                    {/* Halo around 3D model when selected — replaces the box */}
                    {sel && (
                      <div style={{
                        position: "absolute", top: "4px", left: "50%", transform: "translateX(-50%)",
                        width: "90px", height: "90px",
                        background: `radial-gradient(circle, ${brand.color}66 0%, ${brand.color}22 35%, ${brand.color}08 60%, transparent 80%)`,
                        pointerEvents: "none", zIndex: 0,
                        filter: "blur(2px)",
                      }} />
                    )}
                    <div style={{ position: "relative", zIndex: 1, pointerEvents: "none" }}>
                      <LazyConsoleModel modelId={c.model} color={c.accentColor} selected={sel} size={64} />
                    </div>
                    <div style={{
                      fontFamily: FONT_DISPLAY, fontSize: "9px",
                      letterSpacing: "1px", textAlign: "center", lineHeight: 1.2,
                      color: sel ? brand.color : PAL.inkDim, fontWeight: 600,
                      textShadow: sel ? `0 0 8px ${brand.color}cc, 0 0 16px ${brand.color}66` : "none",
                      position: "relative", zIndex: 1,
                    }}>{c.label}</div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function ConsoleCarousel({ category, consoles, selected, onToggle }) {
  const scrollerRef = useRef(null);
  const list = consoles.filter(c => c.category === category);
  const shouldLoop = list.length >= 4;
  const COPIES = 5;
  const MIDDLE_COPY = 2;
  const displayList = shouldLoop ? Array.from({ length: COPIES }, () => list).flat() : list;
  const setSize = list.length;
  const CARD_WIDTH = 256;

  const scrollEndTimer = useRef(null);
  const hasInitScroll = useRef(false);

  useEffect(() => {
    if (!shouldLoop || !scrollerRef.current || hasInitScroll.current) return;
    scrollerRef.current.scrollLeft = setSize * CARD_WIDTH * MIDDLE_COPY;
    hasInitScroll.current = true;
  }, [shouldLoop, setSize]);

  const onScroll = useCallback(() => {
    if (!shouldLoop || !scrollerRef.current) return;
    clearTimeout(scrollEndTimer.current);
    scrollEndTimer.current = setTimeout(() => {
      if (!scrollerRef.current) return;
      const el = scrollerRef.current;
      const totalWidth = setSize * CARD_WIDTH;
      const middlePos = totalWidth * MIDDLE_COPY;
      const drift = el.scrollLeft - middlePos;
      if (Math.abs(drift) >= totalWidth) {
        const newPos = middlePos + (drift % totalWidth);
        el.scrollLeft = newPos;
      }
    }, 150);
  }, [shouldLoop, setSize]);

  return (
    <div style={{ marginBottom: "32px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "6px", height: "20px", background: PAL.cyan, boxShadow: `0 0 12px ${PAL.cyan}` }} />
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: "14px", color: PAL.ink, letterSpacing: "4px", fontWeight: 600, textShadow: `0 0 12px ${PAL.cyan}44` }}>
            {category === "Home" ? "HOME CONSOLES" : category === "Handheld" ? "HANDHELDS" : "PC / EMULATORS"}
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: "10px", color: PAL.inkFaint, marginLeft: "8px" }}>
            {list.filter(c => selected.includes(c.id)).length}/{list.length}
          </div>
        </div>
      </div>
      <div ref={scrollerRef} onScroll={onScroll} className="hide-scrollbar" style={{
        display: "flex", gap: "16px", overflowX: "auto", overflowY: "hidden",
        scrollSnapType: "none", paddingBottom: "8px",
        WebkitOverflowScrolling: "touch",
      }}>
        {displayList.map((c, idx) => {
          const sel = selected.includes(c.id);
          return (
            <div key={`${c.id}-${idx}`} data-card style={{ flex: "0 0 240px" }}>
              <div onClick={() => onToggle(c.id)} style={{
                padding: "12px", display: "flex", flexDirection: "column", alignItems: "center",
                textAlign: "center", cursor: "pointer", position: "relative",
                transition: "transform 0.2s",
                transform: sel ? "scale(1.02)" : "scale(1)",
              }}>
                {/* Selection halo glow */}
                {sel && (
                  <div style={{
                    position: "absolute", top: "20px", left: "50%", transform: "translateX(-50%)",
                    width: "220px", height: "220px",
                    background: `radial-gradient(circle, ${c.color}44 0%, ${c.color}11 40%, transparent 70%)`,
                    pointerEvents: "none", zIndex: 0,
                  }} />
                )}
                <div style={{ position: "relative", zIndex: 1 }}>
                  <LazyConsoleModel modelId={c.model} color={c.accentColor} selected={sel} size={220} />
                </div>
                <div style={{ position: "relative", zIndex: 1, marginTop: "8px" }}>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: "12px", fontWeight: 600, color: sel ? c.color : PAL.ink, letterSpacing: "2px", textShadow: sel ? `0 0 12px ${c.color}88` : `0 0 8px ${PAL.void}` }}>{c.label}</div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: "9px", color: sel ? c.color : PAL.inkFaint, marginTop: "4px", letterSpacing: "1px" }}>
                    {sel ? "◇ LINKED" : "○ TAP TO LINK"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   GAME SUGGESTION CAROUSEL
   ═══════════════════════════════════════════════════════════════════════════ */

function CoverImage({ url, fallbackColor, name }) {
  const [error, setError] = useState(false);
  if (!url || error) {
    return (
      <div style={{
        width: "100%", height: "100%",
        background: `linear-gradient(135deg, ${fallbackColor}33 0%, ${fallbackColor}11 100%)`,
        border: `1px solid ${fallbackColor}44`, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "12px", textAlign: "center",
      }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: "11px", color: fallbackColor, letterSpacing: "1.5px", fontWeight: 600, lineHeight: 1.3 }}>{name}</div>
      </div>
    );
  }
  return (
    <img src={url} alt={name} onError={() => setError(true)}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
  );
}

function GameSuggestionCarousel({ suggestions, chosen, onToggle }) {
  // Chunk into pages of 9 — each page is a 3x3 grid, scroll horizontally between pages.
  const pages = [];
  for (let i = 0; i < suggestions.length; i += 9) {
    pages.push(suggestions.slice(i, i + 9));
  }

  return (
    <div className="hide-scrollbar" style={{
      display: "flex", overflowX: "auto", overflowY: "hidden",
      WebkitOverflowScrolling: "touch",
      paddingBottom: "12px",
    }}>
      {pages.map((pageGames, pi) => (
        <div key={pi} style={{
          flex: "0 0 100%",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px",
          padding: "4px",
          alignContent: "start",
        }}>
          {pageGames.map(g => {
            const entry = chosen.find(x => x.name === g.name);
            const status = entry ? (entry.completed ? "beaten" : "backlog") : "none";
            const sel = status !== "none";
            const hue = hueOf(g.genre);
            // Color & label per state
            const statusColor = status === "beaten" ? PAL.emerald : (status === "backlog" ? PAL.violet : null);
            const statusBadge = status === "beaten" ? "✓ BEATEN" : (status === "backlog" ? "◇ QUEUED" : null);
            return (
              <div key={g.id} onClick={() => onToggle(g)} style={{
                padding: "8px 6px", display: "flex", flexDirection: "column", alignItems: "center",
                textAlign: "center", cursor: "pointer", position: "relative",
                transition: "transform 0.2s",
                transform: sel ? "scale(1.03)" : "scale(1)",
              }}>
                {/* Selection halo glow behind the 3D box — color reflects status */}
                {sel && (
                  <div style={{
                    position: "absolute", top: "10px", left: "50%", transform: "translateX(-50%)",
                    width: "110px", height: "110px",
                    background: `radial-gradient(circle, ${statusColor}44 0%, ${statusColor}11 40%, transparent 70%)`,
                    pointerEvents: "none", zIndex: 0,
                  }} />
                )}
                {/* 3D rotating game box, floating */}
                <div style={{ position: "relative", zIndex: 1 }}>
                  <LazyGameBox game={g} size={100} selected={sel} />
                  {sel && (
                    <div style={{
                      position: "absolute", top: "2px", right: "2px",
                      fontFamily: FONT_MONO, fontSize: "8px",
                      background: statusColor, color: PAL.void,
                      padding: "2px 5px", fontWeight: 700, letterSpacing: "0.5px",
                      boxShadow: `0 0 12px ${statusColor}cc`,
                    }}>{status === "beaten" ? "✓" : "◇"}</div>
                  )}
                </div>
                {/* Floating text below — no box wrapping */}
                <div style={{ marginTop: "6px", width: "100%", position: "relative", zIndex: 1 }}>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: "7px", color: hue, letterSpacing: "1.5px", marginBottom: "2px", fontWeight: 600, textShadow: `0 0 6px ${hue}88`, height: "10px", overflow: "hidden" }}>{g.genre.toUpperCase()}</div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: "10px", color: PAL.ink, lineHeight: 1.15, fontWeight: 500, height: "23px", textShadow: `0 0 6px ${PAL.void}`, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{g.name}</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: "10px", color: PAL.inkDim, fontWeight: 300, marginTop: "2px", height: "14px", overflow: "hidden" }}>{g.year || ""}</div>
                  {/* Status label below — reserves space whether or not it's set so cards align */}
                  <div style={{
                    fontFamily: FONT_DISPLAY, fontSize: "8px",
                    letterSpacing: "1.5px", fontWeight: 700,
                    color: statusColor || "transparent",
                    textShadow: statusColor ? `0 0 8px ${statusColor}cc` : "none",
                    marginTop: "4px", height: "12px",
                  }}>{statusBadge || "—"}</div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ONBOARDING
   ═══════════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════════
   WARP STREAK BACKGROUND — localized hyperspace effect that lives behind a
   specific section. Used on the calibrate page so the 3D genre boxes feel
   like they're hovering in deep space with stars whipping past behind them.
   ═══════════════════════════════════════════════════════════════════════════ */

function WarpStreakBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w, h, streaks, raf;
    let dpr = window.devicePixelRatio || 1;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawnStreak(initialX) {
      // Streaks fly left-to-right. Each one has its own speed (layered for
      // depth), thickness, brightness, and vertical position.
      const speed = 2 + Math.random() * 8; // px per frame
      return {
        x: initialX !== undefined ? initialX : -20 - Math.random() * 100,
        y: Math.random() * h,
        speed,
        length: 20 + speed * 6,         // faster streaks are longer (motion blur)
        brightness: 0.3 + Math.random() * 0.7,
        thickness: 0.4 + (speed / 10) * 1.2,
      };
    }

    function init() {
      resize();
      streaks = [];
      // Pre-populate so the effect doesn't fade in awkwardly on mount.
      // 35 base streaks keeps the panel lively without overwhelming the games.
      for (let i = 0; i < 35; i++) {
        streaks.push(spawnStreak(Math.random() * w));
      }
    }

    init();

    const draw = () => {
      // Fully clear the canvas each frame — transparent background so the
      // page's main starfield shows through. The streaks themselves are the
      // only thing this canvas contributes.
      ctx.clearRect(0, 0, w, h);

      // Move + render each streak
      streaks.forEach((s, idx) => {
        s.x += s.speed;
        if (s.x - s.length > w) {
          // Recycle off-screen streaks back to the left
          streaks[idx] = spawnStreak();
          return;
        }
        // Draw the streak as a horizontal gradient line: fades from tail (transparent) to head (bright)
        const grad = ctx.createLinearGradient(s.x - s.length, s.y, s.x, s.y);
        grad.addColorStop(0, "rgba(180, 220, 255, 0)");
        grad.addColorStop(0.6, `rgba(200, 230, 255, ${s.brightness * 0.4})`);
        grad.addColorStop(1, `rgba(240, 250, 255, ${s.brightness})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = s.thickness;
        ctx.beginPath();
        ctx.moveTo(s.x - s.length, s.y);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
      });

      // Occasionally spawn extra streaks for variety, but cap density
      if (Math.random() < 0.25 && streaks.length < 55) {
        streaks.push(spawnStreak());
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const onResize = () => init();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}

function Onboarding({ onDone, onImport }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [genres, setGenres] = useState([]);
  const [consoles, setConsoles] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [chosen, setChosen] = useState([]);
  const [dateMap, setDateMap] = useState({}); // { gameName: "2024" } for beaten games
  const [loading, setLoading] = useState(false);

  const toggle = (arr, setArr, v) => setArr(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

  async function generate() {
    setLoading(true);
    const consoleNames = consoles.map(id => consoleOf(id)?.label).join(", ");
    try {
      const prompt = `A gamer enjoys these genres: ${genres.join(", ")}.
They play on: ${consoleNames}.
Suggest exactly 15 specific iconic games matching their taste, prioritizing well-known classics that would have Wikipedia entries. Mix the genres throughout the list rather than grouping them together.

Respond with ONLY a JSON array, no markdown:
[{"name":"Exact Game Title","franchise":"Franchise Name","genre":"Genre","year":1998}]

Use ONLY these genres: ${GENRES.join(", ")}.`;
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1500, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json();
      const text = data.content.map(c => c.text || "").join("");
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      // Try to enrich with cover art from our DB
      const enriched = parsed.map(g => {
        const match = GAME_DB.find(dbg => dbg.name.toLowerCase() === g.name.toLowerCase());
        return { ...g, id: uid(), cover: match?.cover };
      });
      // Shuffle for variety (Fisher-Yates)
      for (let i = enriched.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [enriched[i], enriched[j]] = [enriched[j], enriched[i]];
      }
      setSuggestions(enriched);
    } catch {
      // Fallback: pull straight from local DB matching genres
      const local = GAME_DB.filter(g => genres.includes(g.genre)).map(g => ({ ...g, id: uid() }));
      // Shuffle and take 15
      for (let i = local.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [local[i], local[j]] = [local[j], local[i]];
      }
      setSuggestions(local.slice(0, 15));
    }
    setLoading(false);
    setStep(4);
  }

  function finish() {
    onDone({
      profile: { name, genres, consoles, createdAt: Date.now() },
      games: chosen.map(g => {
        const platforms = getAvailablePlatforms(g.name);
        let inferredConsole = g.console || "";
        if (!inferredConsole && platforms && platforms.length > 0) {
          const ownedPlatforms = platforms.filter(p => consoles.includes(p));
          if (ownedPlatforms.length >= 1) {
            // Prefer current-gen owned platforms (switch > older). Use the FIRST owned platform
            // as a sensible default — it's typically the most current.
            inferredConsole = ownedPlatforms[0];
          } else {
            // User doesn't own any of the listed platforms — default to first known platform
            // so the game at least has a console for filtering. They can change it later.
            inferredConsole = platforms[0];
          }
        }
        const completedAt = g.completed === true ? (dateMap[g.name] || "").trim() : "";
        return {
          ...g,
          id: uid(),
          completed: g.completed === true,
          percent100: false,
          console: inferredConsole,
          date: completedAt,
        };
      }),
    });
  }

  // Called from the lineup screen's LAUNCH button.
  // If any games are marked beaten → route to the date-collection step.
  // Otherwise → skip straight to finish.
  function continueFromLineup() {
    const beatenCount = chosen.filter(c => c.completed).length;
    if (beatenCount > 0) {
      setStep(5);
    } else {
      finish();
    }
  }

  const screen = {
    minHeight: "100vh", color: PAL.ink, fontFamily: FONT_BODY,
    padding: "32px 20px", display: "flex", alignItems: "center", justifyContent: "center",
    position: "relative", zIndex: 1,
  };

  if (step === 0) return (
    <div style={{
      minHeight: "100vh", color: PAL.ink, fontFamily: FONT_BODY,
      padding: "32px 20px", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "space-between",
      position: "relative", zIndex: 1,
    }}>
      {/* Top: SYSTEM ONLINE label + 3D title */}
      <div style={{ maxWidth: "520px", width: "100%", textAlign: "center", paddingTop: "20px" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: "10px", color: PAL.cyan, letterSpacing: "8px", marginBottom: "16px", opacity: 0.7 }}>◇ SYSTEM ONLINE ◇</div>
        <Title3D height={260} />
      </div>

      {/* Middle: NEW / LOAD buttons take the central space */}
      <div style={{ display: "flex", gap: "24px", alignItems: "center", justifyContent: "center", width: "100%", maxWidth: "520px" }}>
        <SplashButton onClick={() => setStep(1)} chars="NEW" color={PAL.cyan} />
        <SplashButton onClick={onImport} chars="LOAD" color={PAL.magenta} />
      </div>

      {/* Bottom: version stamp anchored to the screen bottom */}
      <div style={{ fontFamily: FONT_MONO, fontSize: "13px", color: PAL.inkDim, letterSpacing: "2px", paddingBottom: "8px" }}>
        v4.0 // deep space
      </div>
    </div>
  );

  if (step === 1) return (
    <div style={screen}>
      <div style={{ maxWidth: "480px", width: "100%" }}>
        <Label color={PAL.cyan}>◇ Identity / 1 of 3</Label>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: "36px", color: PAL.ink, margin: "0 0 8px", letterSpacing: "4px", textShadow: `0 0 24px ${PAL.cyan}44` }}>DESIGNATE</h2>
        <div style={{ fontFamily: FONT_BODY, fontSize: "18px", color: PAL.inkDim, marginBottom: "32px", fontWeight: 300 }}>What should the cosmos call you?</div>
        <Panel glow={PAL.cyan} pulse style={{ padding: "16px 20px", marginBottom: "32px" }}>
          <input value={name} onChange={e => setName(e.target.value.slice(0, 20))} onKeyDown={e => e.key === "Enter" && name.trim() && setStep(2)} autoFocus placeholder="ENTER CALLSIGN..."
            style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontFamily: FONT_DISPLAY, fontSize: "20px", color: PAL.cyan, letterSpacing: "4px", textTransform: "uppercase", fontWeight: 600 }} />
        </Panel>
        <div style={{ display: "flex", gap: "12px" }}>
          <Btn onClick={() => setStep(0)} color={PAL.inkDim} size="md">◁ BACK</Btn>
          <Btn onClick={() => setStep(2)} disabled={!name.trim()} color={PAL.cyan} size="md" glow={!!name.trim()}>CONTINUE ▷</Btn>
        </div>
      </div>
    </div>
  );

  if (step === 2) return (
    <div style={screen}>
      <div style={{ maxWidth: "640px", width: "100%" }}>
        <Label color={PAL.cyan}>◇ Preferences / 2 of 3</Label>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: "36px", color: PAL.ink, margin: "0 0 8px", letterSpacing: "4px", textShadow: `0 0 24px ${PAL.cyan}44` }}>CALIBRATE</h2>
        <div style={{ fontFamily: FONT_BODY, fontSize: "18px", color: PAL.inkDim, marginBottom: "24px", fontWeight: 300 }}>Select genres you orbit most. ({genres.length} chosen)</div>

        {/* Horizontal-paged 2x2 grid of iconic 3D game boxes — one per genre.
            Wrapped in a relative container with a localized WarpStreakBackground
            so stars whip past behind the boxes as the user swipes. */}
        {(() => {
          const pages = [];
          for (let i = 0; i < GENRES.length; i += 4) {
            pages.push(GENRES.slice(i, i + 4));
          }
          return (
            <div style={{ position: "relative", marginBottom: "24px" }}>
              {/* Localized hyperspace streaks — sit on transparent canvas so the
                  page's main starfield shows through. The streaks feel like part
                  of the same space rather than a contained panel. */}
              <WarpStreakBackground />
              <div className="hide-scrollbar" style={{
                display: "flex", overflowX: "auto", overflowY: "hidden",
                WebkitOverflowScrolling: "touch",
                position: "relative", zIndex: 2,
              }}>
              {pages.map((pageGenres, pi) => (
                <div key={pi} style={{
                  flex: "0 0 100%",
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "12px",
                  padding: "4px",
                  alignContent: "start",
                }}>
                  {pageGenres.map(g => {
                    const active = genres.includes(g);
                    const iconGameName = GENRE_ICONS[g];
                    const iconGame = (iconGameName && GAME_DB.find(x => x.name === iconGameName))
                      || { name: iconGameName || g, genre: g };
                    const hue = hueOf(g);
                    // Stack Action/Adventure vertically so it doesn't widen the cell
                    const displayLabel = g === "Action/Adventure"
                      ? <>ACTION<br/>/ ADVENTURE</>
                      : g.toUpperCase();
                    return (
                      <button key={g} onClick={() => toggle(genres, setGenres, g)} style={{
                        display: "flex", flexDirection: "column", alignItems: "center",
                        gap: "10px",
                        padding: "16px 8px",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        transition: "transform 0.2s",
                        transform: active ? "scale(1.05)" : "scale(1)",
                        position: "relative",
                      }}>
                        {/* Glow halo around the model when selected — replaces the rectangular box */}
                        {active && (
                          <div style={{
                            position: "absolute", top: "8px", left: "50%", transform: "translateX(-50%)",
                            width: "160px", height: "160px",
                            background: `radial-gradient(circle, ${hue}66 0%, ${hue}22 35%, ${hue}08 60%, transparent 80%)`,
                            pointerEvents: "none", zIndex: 0,
                            filter: "blur(2px)",
                          }} />
                        )}
                        <div style={{ position: "relative", zIndex: 1, pointerEvents: "none" }}>
                          <LazyGameBox game={iconGame} size={120} selected={active} />
                        </div>
                        <div style={{
                          fontFamily: FONT_DISPLAY, fontSize: "12px",
                          letterSpacing: "1.5px",
                          color: active ? hue : PAL.inkDim, fontWeight: 600,
                          textShadow: active ? `0 0 10px ${hue}cc, 0 0 20px ${hue}66` : "none",
                          position: "relative", zIndex: 1,
                          textAlign: "center", lineHeight: 1.2,
                        }}>{displayLabel}</div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            </div>
          );
        })()}

        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <Btn onClick={() => setStep(1)} color={PAL.inkDim} size="md">◁ BACK</Btn>
          <Btn onClick={() => setStep(3)} disabled={!genres.length} color={PAL.cyan} size="md" glow={genres.length > 0}>CONTINUE ▷</Btn>
          <div style={{ flex: 1 }} />
          <button onClick={() => onDone({ profile: { name: name.trim() || "Player 1", genres: [], consoles: [], createdAt: Date.now() }, games: [] })}
            style={{ background: "transparent", border: "none", color: PAL.inkFaint, cursor: "pointer", fontFamily: FONT_DISPLAY, fontSize: "11px", letterSpacing: "3px", padding: "10px 6px" }}>
            SKIP — START EMPTY ▷
          </button>
        </div>
      </div>
    </div>
  );

  if (step === 3) return (
    <div style={{ ...screen, alignItems: "flex-start", paddingTop: "40px", paddingBottom: "40px" }}>
      <div style={{ maxWidth: "1000px", width: "100%" }}>
        <Label color={PAL.cyan}>◇ Hardware / 3 of 3</Label>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: "36px", color: PAL.ink, margin: "0 0 8px", letterSpacing: "4px", textShadow: `0 0 24px ${PAL.cyan}44` }}>HARDWARE</h2>
        <div style={{ fontFamily: FONT_BODY, fontSize: "18px", color: PAL.inkDim, marginBottom: "16px", fontWeight: 300 }}>
          Tap a brand to expand and select consoles. ({consoles.length} linked)
        </div>
        <BrandPicker selected={consoles} onToggle={(id) => toggle(consoles, setConsoles, id)} />
        <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap" }}>
          <Btn onClick={() => setStep(2)} color={PAL.inkDim} size="md">◁ BACK</Btn>
          <Btn onClick={generate} disabled={!consoles.length || loading} color={PAL.cyan} size="md" glow={consoles.length > 0}>
            {loading ? "SCANNING..." : "GENERATE PICKS ▷"}
          </Btn>
        </div>
      </div>
    </div>
  );

  if (step === 4) return (
    <div style={{ ...screen, alignItems: "flex-start", paddingTop: "40px" }}>
      <div style={{ maxWidth: "900px", width: "100%" }}>
        <Label color={PAL.cyan}>◇ Transmission Received</Label>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: "32px", color: PAL.ink, margin: "0 0 8px", letterSpacing: "4px", textShadow: `0 0 24px ${PAL.cyan}44` }}>STARTING LINEUP</h2>
        <div style={{ fontFamily: FONT_BODY, fontSize: "16px", color: PAL.inkDim, marginBottom: "12px", fontWeight: 300, lineHeight: 1.5 }}>
          Tap to add to your queue. Tap again to mark as beaten. Tap once more to remove.
        </div>
        <div style={{ fontFamily: FONT_MONO, fontSize: "11px", color: PAL.inkFaint, marginBottom: "20px", letterSpacing: "1px" }}>
          ◇ {chosen.length} ADDED · {chosen.filter(c => c.completed).length} BEATEN · {chosen.filter(c => !c.completed).length} QUEUED
        </div>
        <GameSuggestionCarousel suggestions={suggestions} chosen={chosen}
          onToggle={(g) => setChosen(c => {
            // Cycle: not added → BACKLOG → BEATEN → not added
            const existing = c.find(x => x.name === g.name);
            if (!existing) {
              return [...c, { ...g, completed: false }];
            }
            if (existing.completed === false) {
              return c.map(x => x.name === g.name ? { ...x, completed: true } : x);
            }
            // existing.completed === true → remove
            return c.filter(x => x.name !== g.name);
          })} />
        <div style={{ marginTop: "32px" }}>
          <Btn onClick={continueFromLineup} color={PAL.cyan} size="lg" full glow>
            {chosen.length ? `LAUNCH WITH ${chosen.length} GAMES ▷` : "LAUNCH EMPTY ▷"}
          </Btn>
        </div>
      </div>
    </div>
  );

  // step 5 — date collection for beaten games. Only reached if user marked
  // any games as beaten on the lineup screen. All dates optional.
  const beatenGames = chosen.filter(c => c.completed);
  return (
    <div style={{ ...screen, alignItems: "flex-start", paddingTop: "40px", paddingBottom: "40px" }}>
      <div style={{ maxWidth: "640px", width: "100%" }}>
        <Label color={PAL.emerald}>◇ Timestamps</Label>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: "32px", color: PAL.ink, margin: "0 0 8px", letterSpacing: "4px", textShadow: `0 0 24px ${PAL.emerald}44` }}>WHEN BEATEN?</h2>
        <div style={{ fontFamily: FONT_BODY, fontSize: "16px", color: PAL.inkDim, marginBottom: "24px", fontWeight: 300, lineHeight: 1.5 }}>
          Optional. Add a year, date, or label like "Childhood" for any games you've already beaten. Leave blank to skip — you can fill these in later.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
          {beatenGames.map(g => {
            const hue = hueOf(g.genre);
            return (
              <div key={g.id} style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "10px 12px",
                border: `1px solid ${PAL.line}`,
                background: `${PAL.emerald}06`,
              }}>
                <div style={{ flex: "0 0 60px", position: "relative" }}>
                  <LazyGameBox game={g} size={60} selected />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: "7px", color: hue, letterSpacing: "1.5px", marginBottom: "2px", fontWeight: 600, textShadow: `0 0 6px ${hue}88` }}>{(g.franchise || g.genre).toUpperCase()}</div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: "13px", color: PAL.ink, lineHeight: 1.2, fontWeight: 500, marginBottom: "6px" }}>{g.name}</div>
                  <input
                    value={dateMap[g.name] || ""}
                    onChange={e => setDateMap(m => ({ ...m, [g.name]: e.target.value.slice(0, 30) }))}
                    placeholder="e.g. 2024, Childhood, March 2024"
                    style={{
                      width: "100%", background: PAL.bg, color: PAL.ink,
                      border: `1px solid ${PAL.line}`,
                      fontFamily: FONT_BODY, fontSize: "14px",
                      padding: "6px 10px", outline: "none",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Btn onClick={() => setStep(4)} color={PAL.inkDim} size="md">◁ BACK</Btn>
          <Btn onClick={finish} color={PAL.cyan} size="md" glow>LAUNCH ▷</Btn>
          <div style={{ flex: 1 }} />
          <button onClick={() => { setDateMap({}); finish(); }} style={{
            background: "transparent", border: "none",
            color: PAL.inkFaint, cursor: "pointer",
            fontFamily: FONT_DISPLAY, fontSize: "11px",
            letterSpacing: "3px", padding: "10px 6px",
          }}>SKIP ALL ▷</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AUTOCOMPLETE
   ═══════════════════════════════════════════════════════════════════════════ */

function GameAutocomplete({ value, onChange, onPick, placeholder = "SEARCH GAMES..." }) {
  const [focused, setFocused] = useState(false);
  const [hi, setHi] = useState(0);
  const results = useMemo(() => searchGames(value, 8), [value]);
  const open = focused && value.length >= 2 && results.length > 0;
  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input value={value} onChange={e => { onChange(e.target.value); setHi(0); }}
        onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 150)}
        onKeyDown={e => {
          if (!open) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setHi(h => (h + 1) % results.length); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHi(h => (h - 1 + results.length) % results.length); }
          else if (e.key === "Enter") { e.preventDefault(); onPick(results[hi]); }
        }} placeholder={placeholder}
        style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontFamily: FONT_DISPLAY, fontSize: "13px", color: PAL.ink, letterSpacing: "2px", textTransform: "uppercase", fontWeight: 500 }} />
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, background: "rgba(10,7,23,0.96)", border: `1px solid ${PAL.cyan}66`, boxShadow: `0 4px 32px ${PAL.cyan}55, inset 0 1px 0 rgba(255,255,255,0.04)`, backdropFilter: "blur(12px)", zIndex: 50, maxHeight: "340px", overflowY: "auto" }}>
          {results.map((g, i) => (
            <div key={g.name} onMouseDown={() => onPick(g)} onMouseEnter={() => setHi(i)}
              style={{ padding: "10px 14px", borderBottom: i === results.length - 1 ? "none" : `1px solid ${PAL.line}`, background: i === hi ? `${hueOf(g.genre)}15` : "transparent", cursor: "pointer", transition: "background 0.1s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: "13px", color: PAL.ink, fontWeight: 500 }}>{g.name}</div>
                <div style={{ fontFamily: FONT_MONO, fontSize: "10px", color: PAL.inkFaint }}>{g.year}</div>
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "3px" }}>
                <span style={{ fontFamily: FONT_BODY, fontSize: "13px", color: hueOf(g.genre), letterSpacing: "1px" }}>{g.genre}</span>
                <span style={{ fontFamily: FONT_BODY, fontSize: "13px", color: PAL.inkDim }}>· {g.franchise}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MODALS
   ═══════════════════════════════════════════════════════════════════════════ */

function GameModal({ game, onClose, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(game);
  const [confirm, setConfirm] = useState(false);
  const hue = hueOf(game.genre);
  useEffect(() => setDraft(game), [game]);
  const update = (patch) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    if (!editing) onUpdate(next);
  };

  // Read-only display row used when not editing
  const ReadField = ({ label, k }) => (
    <div style={{ marginBottom: "18px" }}>
      <Label>{label}</Label>
      <div style={{ fontFamily: FONT_BODY, fontSize: "16px", color: draft[k] ? PAL.ink : PAL.inkFaint, fontWeight: 400 }}>
        {k === "console" && draft[k] ? consoleOf(draft[k])?.label : (draft[k] || "—")}
      </div>
    </div>
  );

  const consoleOpts = (() => {
    const avail = getAvailablePlatforms(draft.name);
    return avail ? CONSOLE_GROUPS.filter(c => avail.includes(c.id)) : CONSOLE_GROUPS;
  })();

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "linear-gradient(180deg, rgba(12,12,18,0.96) 0%, rgba(5,5,8,0.96) 100%)",
        border: `1px solid ${hue}`, boxShadow: `0 0 64px ${hue}66, 0 0 128px ${hue}33`,
        maxWidth: "560px", width: "100%", maxHeight: "92vh", overflow: "auto",
      }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${hue}33`, background: `${hue}11`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: "10px", color: hue, letterSpacing: "3px", fontWeight: 600, textShadow: `0 0 8px ${hue}88` }}>◇ {(game.franchise || "GAME").toUpperCase()}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: PAL.inkDim, cursor: "pointer", fontFamily: FONT_DISPLAY, fontSize: "16px" }}>✕</button>
        </div>
        <div style={{ padding: "24px" }}>
          {editing ? (
            <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}
              style={{ width: "100%", background: PAL.bg, color: PAL.ink, border: `1px solid ${PAL.line}`, fontFamily: FONT_DISPLAY, fontSize: "20px", padding: "8px 10px", marginBottom: "20px", outline: "none", letterSpacing: "2px" }} />
          ) : (
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(18px, 4vw, 24px)", color: PAL.ink, marginBottom: "20px", letterSpacing: "2px", fontWeight: 600 }}>{game.name}</div>
          )}
          <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
            <Btn onClick={() => update({ completed: !draft.completed })} color={draft.completed ? PAL.emerald : PAL.inkDim} size="sm">
              {draft.completed ? "✓ BEATEN" : "○ NOT YET"}
            </Btn>
            <Btn onClick={() => update({ percent100: !draft.percent100 })} color={draft.percent100 ? PAL.amber : PAL.inkDim} size="sm" disabled={!draft.completed}>
              {draft.percent100 ? "★ 100%" : "☆ 100%?"}
            </Btn>
          </div>
          {editing ? (
            <>
              <ModalField label="Genre" value={draft.genre} onChange={e => setDraft({ ...draft, genre: e.target.value })} opts={GENRES} />
              <ModalField label="Console" value={draft.console} onChange={e => setDraft({ ...draft, console: e.target.value })} opts={consoleOpts} />
              <ModalField label={draft.completed ? "Completion Date / Year" : "Year Released or Started"} value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} />
              <ModalField label="Franchise" value={draft.franchise} onChange={e => setDraft({ ...draft, franchise: e.target.value })} />
              <ModalField label="Notes" value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} multiline />
            </>
          ) : (
            <>
              <ReadField label="Genre" k="genre" />
              <ReadField label="Console" k="console" />
              <ReadField label={draft.completed ? "Completion Date / Year" : "Year Released or Started"} k="date" />
              <ReadField label="Franchise" k="franchise" />
              <ReadField label="Notes" k="notes" />
            </>
          )}
          <div style={{ height: "1px", background: PAL.line, margin: "20px 0" }} />
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {editing ? (
              <>
                <Btn onClick={() => { onUpdate(draft); setEditing(false); }} size="sm" color={PAL.emerald}>SAVE</Btn>
                <Btn onClick={() => { setDraft(game); setEditing(false); }} size="sm" color={PAL.inkDim}>CANCEL</Btn>
              </>
            ) : (
              <Btn onClick={() => setEditing(true)} size="sm" color={hue}>EDIT</Btn>
            )}
            {!editing && (confirm ? (
              <>
                <Btn onClick={() => { onDelete(game.id); onClose(); }} size="sm" color={PAL.danger}>CONFIRM</Btn>
                <Btn onClick={() => setConfirm(false)} size="sm" color={PAL.inkDim}>NO</Btn>
              </>
            ) : (
              <Btn onClick={() => setConfirm(true)} size="sm" color={PAL.danger}>DELETE</Btn>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Module-level form field — kept OUTSIDE the modal component so that re-renders
// (e.g. on each keystroke) don't unmount and remount the input. Defining it
// inline inside the modal caused the mobile keyboard to close after each key.
function ModalField({ label, value, onChange, opts, help, multiline }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <Label>{label}</Label>
      {opts ? (
        <select value={value || ""} onChange={onChange}
          style={{ width: "100%", background: PAL.bg, color: PAL.ink, border: `1px solid ${PAL.line}`, fontFamily: FONT_BODY, fontSize: "16px", padding: "8px 10px", outline: "none" }}>
          <option value="">—</option>
          {opts.map(o => <option key={o.id || o} value={o.id || o}>{o.label || o}</option>)}
        </select>
      ) : multiline ? (
        <textarea value={value || ""} onChange={onChange} rows={3}
          style={{ width: "100%", background: PAL.bg, color: PAL.ink, border: `1px solid ${PAL.line}`, fontFamily: FONT_BODY, fontSize: "16px", padding: "8px 10px", outline: "none", resize: "vertical" }} />
      ) : (
        <input value={value || ""} onChange={onChange}
          style={{ width: "100%", background: PAL.bg, color: PAL.ink, border: `1px solid ${PAL.line}`, fontFamily: FONT_BODY, fontSize: "16px", padding: "8px 10px", outline: "none" }} />
      )}
      {help && <div style={{ fontFamily: FONT_BODY, fontSize: "12px", color: PAL.inkFaint, marginTop: "4px", fontStyle: "italic" }}>{help}</div>}
    </div>
  );
}

function AddModal({ onClose, onAdd, existingGames = [] }) {
  const [mode, setMode] = useState("search"); // "search" | "browse"
  const [searchVal, setSearchVal] = useState("");
  const [g, setG] = useState({ name: "", franchise: "", genre: "Platformer", console: "", date: "", completed: false, percent100: false, notes: "" });
  const onPick = (match) => {
    // When a game is matched: auto-select console if there's only one valid option
    const platforms = getAvailablePlatforms(match.name);
    let autoConsole = "";
    if (platforms && platforms.length === 1) autoConsole = platforms[0];
    setG({ ...g, name: match.name, franchise: match.franchise, genre: match.genre, console: autoConsole });
    setSearchVal(match.name);
  };
  const submit = () => { if (!g.name.trim()) return; onAdd({ ...g, id: uid() }); onClose(); };

  // Filter console list to those actually available for this game
  const availablePlatforms = useMemo(() => getAvailablePlatforms(g.name), [g.name]);
  const filteredConsoles = useMemo(() => {
    if (!availablePlatforms) return CONSOLE_GROUPS;
    return CONSOLE_GROUPS.filter(c => availablePlatforms.includes(c.id));
  }, [availablePlatforms]);

  // If the filtered list collapses to exactly one option and nothing is selected, auto-pick it
  useEffect(() => {
    if (!g.console && filteredConsoles.length === 1) {
      setG(prev => ({ ...prev, console: filteredConsoles[0].id }));
    }
  }, [filteredConsoles, g.console]);

  // Date label depends on whether marked beaten
  const dateLabel = g.completed ? "Completion Date / Year" : "Year Released or Started";
  const dateHelp = g.completed
    ? "When did you beat this? (e.g. 2025, Childhood, March 2024)"
    : "When was it released, or when did you start playing?";

  // BROWSE mode — adds a game from GAME_DB straight into library with sensible defaults.
  // Beaten status is left as backlog (matches the rest of the app's add-defaults).
  const addFromBrowse = (dbGame) => {
    const platforms = getAvailablePlatforms(dbGame.name);
    const auto = platforms && platforms.length >= 1 ? platforms[0] : "";
    onAdd({
      id: uid(),
      name: dbGame.name,
      franchise: dbGame.franchise,
      genre: dbGame.genre,
      console: auto,
      date: "",
      completed: false,
      percent100: false,
      notes: "",
    });
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "linear-gradient(180deg, rgba(12,12,18,0.96) 0%, rgba(5,5,8,0.96) 100%)", border: `1px solid ${PAL.cyan}`, boxShadow: `0 0 64px ${PAL.cyan}66, 0 0 128px ${PAL.cyan}33`, maxWidth: "640px", width: "100%", maxHeight: "92vh", overflow: "auto" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${PAL.cyan}33`, background: `${PAL.cyan}11` }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: "11px", color: PAL.cyan, letterSpacing: "3px", fontWeight: 600, textShadow: `0 0 8px ${PAL.cyan}88` }}>◇ NEW ENTRY</div>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", borderBottom: `1px solid ${PAL.line}` }}>
          {[["search", "◇ SEARCH"], ["browse", "◊ BROWSE"]].map(([k, l]) => (
            <button key={k} onClick={() => setMode(k)} style={{
              flex: 1, padding: "12px 14px",
              background: mode === k ? `${PAL.cyan}11` : "transparent",
              border: "none",
              borderBottom: `2px solid ${mode === k ? PAL.cyan : "transparent"}`,
              color: mode === k ? PAL.cyan : PAL.inkDim,
              fontFamily: FONT_DISPLAY, fontSize: "11px",
              letterSpacing: "2.5px", fontWeight: 600,
              cursor: "pointer",
              textShadow: mode === k ? `0 0 8px ${PAL.cyan}88` : "none",
              transition: "all 0.15s",
            }}>{l}</button>
          ))}
        </div>

        {mode === "search" ? (
          <div style={{ padding: "24px" }}>
            <Label>Game Title *</Label>
            <Panel glow={PAL.cyan} style={{ padding: "10px 14px", marginBottom: "20px" }}>
              <GameAutocomplete value={searchVal} onChange={v => { setSearchVal(v); setG({ ...g, name: v }); }} onPick={onPick} placeholder="START TYPING..." />
            </Panel>
            {g.franchise && (<div style={{ fontFamily: FONT_MONO, fontSize: "11px", color: PAL.cyan, marginBottom: "20px", letterSpacing: "1px" }}>◇ MATCHED: {g.franchise} · {g.genre}</div>)}

            {/* Show 3D box preview if we have a matched game */}
            {g.name && GAME_DB.find(x => x.name === g.name) && (
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
                <GameBox game={GAME_DB.find(x => x.name === g.name)} size={180} />
              </div>
            )}

            <ModalField label="Franchise" value={g.franchise} onChange={e => setG({ ...g, franchise: e.target.value })} />
            <ModalField label="Genre" value={g.genre} onChange={e => setG({ ...g, genre: e.target.value })} opts={GENRES} />
            <ModalField
              label="Console / Platform"
              value={g.console}
              onChange={e => setG({ ...g, console: e.target.value })}
              opts={filteredConsoles}
              help={!availablePlatforms && g.name ? "Showing all consoles — game not in database" : null}
            />
            <ModalField label={dateLabel} value={g.date} onChange={e => setG({ ...g, date: e.target.value })} help={dateHelp} />
            <ModalField label="Notes" value={g.notes} onChange={e => setG({ ...g, notes: e.target.value })} multiline />
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
              <Btn onClick={() => setG({ ...g, completed: !g.completed })} color={g.completed ? PAL.emerald : PAL.inkDim} size="sm">{g.completed ? "✓ BEATEN" : "○ BACKLOG"}</Btn>
              <Btn onClick={() => setG({ ...g, percent100: !g.percent100 })} color={g.percent100 ? PAL.amber : PAL.inkDim} size="sm" disabled={!g.completed}>{g.percent100 ? "★ 100%" : "☆ 100%?"}</Btn>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <Btn onClick={submit} disabled={!g.name.trim()} color={PAL.cyan} size="md" glow={!!g.name.trim()}>ADD ▷</Btn>
              <Btn onClick={onClose} color={PAL.inkDim} size="md">CANCEL</Btn>
            </div>
          </div>
        ) : (
          <BrowseTab existingGames={existingGames} onAdd={addFromBrowse} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   BROWSE TAB — Browse the local GAME_DB with filter chips for console/genre.
   Games already in the user's library show with a "✓ ADDED" badge but remain
   tappable.
   ═══════════════════════════════════════════════════════════════════════════ */
function BrowseTab({ existingGames, onAdd, onClose }) {
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("ALL");
  const [brand, setBrand] = useState("ALL");

  // Set of names already in the user's library — quick lookup
  const existingNames = useMemo(
    () => new Set(existingGames.map(g => (g.name || "").toLowerCase())),
    [existingGames]
  );

  // Filter the local game DB by user's chosen brand/genre/search.
  // Hide games already in the user's library — browsing here is for finding
  // new additions, not re-adding what they already own.
  const filtered = useMemo(() => {
    return GAME_DB.filter(dbGame => {
      if (existingNames.has(dbGame.name.toLowerCase())) return false;
      if (genre !== "ALL" && dbGame.genre !== genre) return false;
      if (brand !== "ALL") {
        const brandObj = BRANDS.find(b => b.id === brand);
        if (!brandObj) return false;
        const platforms = getAvailablePlatforms(dbGame.name) || [];
        const matches = platforms.some(p => brandObj.consoles.includes(p));
        if (!matches) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const hay = `${dbGame.name} ${dbGame.franchise}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [genre, brand, search, existingNames]);

  // Genres present in the filtered DB
  const allGenres = useMemo(() => {
    const set = new Set(GAME_DB.map(g => g.genre).filter(Boolean));
    return ["ALL", ...Array.from(set).sort()];
  }, []);

  return (
    <div style={{ padding: "20px 16px" }}>
      {/* Search */}
      <Panel glow={PAL.cyan} style={{ padding: "10px 14px", marginBottom: "12px" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="SEARCH LOCAL DATABASE..."
          style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontFamily: FONT_DISPLAY, fontSize: "12px", color: PAL.ink, letterSpacing: "2px", fontWeight: 500 }} />
      </Panel>

      {/* Brand filter (uses 5 short brand chips, more compact than full console list) */}
      <div style={{ marginBottom: "8px" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: "9px", color: PAL.inkFaint, letterSpacing: "2px", marginBottom: "6px" }}>BRAND</div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <Chip color={PAL.inkDim} active={brand === "ALL"} onClick={() => setBrand("ALL")}>ALL</Chip>
          {BRANDS.map(b => (
            <Chip key={b.id} color={b.color} active={brand === b.id} onClick={() => setBrand(b.id)}>{b.label}</Chip>
          ))}
        </div>
      </div>

      {/* Genre filter */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: "9px", color: PAL.inkFaint, letterSpacing: "2px", marginBottom: "6px" }}>GENRE</div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {allGenres.map(gn => (
            <Chip key={gn} color={gn === "ALL" ? PAL.inkDim : hueOf(gn)} active={genre === gn} onClick={() => setGenre(gn)}>{gn}</Chip>
          ))}
        </div>
      </div>

      {/* Result count */}
      <div style={{ fontFamily: FONT_MONO, fontSize: "11px", color: PAL.inkFaint, letterSpacing: "2px", marginBottom: "12px" }}>
        ◇ {filtered.length} GAMES
      </div>

      {/* Game grid — 3 columns, vertical scroll within the modal */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", fontFamily: FONT_DISPLAY, fontSize: "12px", color: PAL.inkFaint, letterSpacing: "3px" }}>
          NO MATCHES
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
          {filtered.map(dbGame => {
            const hue = hueOf(dbGame.genre);
            return (
              <div key={dbGame.name} onClick={() => onAdd(dbGame)} style={{
                padding: "8px 4px", display: "flex", flexDirection: "column", alignItems: "center",
                textAlign: "center", cursor: "pointer", position: "relative",
                transition: "transform 0.15s",
              }}
              onMouseDown={e => e.currentTarget.style.transform = "scale(0.96)"}
              onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >
                <div style={{ position: "relative", zIndex: 1 }}>
                  <LazyGameBox game={dbGame} size={80} />
                </div>
                <div style={{ marginTop: "6px", width: "100%", position: "relative", zIndex: 1 }}>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: "6px", color: hue, letterSpacing: "1.5px", marginBottom: "2px", fontWeight: 600, textShadow: `0 0 6px ${hue}88`, height: "9px", overflow: "hidden" }}>{(dbGame.franchise || "").toUpperCase()}</div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: "9px", color: PAL.ink, lineHeight: 1.15, fontWeight: 500, height: "21px", textShadow: `0 0 6px ${PAL.void}`, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{dbGame.name}</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: "9px", color: PAL.inkDim, fontWeight: 300, marginTop: "2px", height: "13px", overflow: "hidden" }}>
                    {dbGame.year || ""}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Close button */}
      <div style={{ marginTop: "16px", display: "flex", gap: "10px" }}>
        <Btn onClick={onClose} color={PAL.inkDim} size="md">DONE</Btn>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN APP TABS
   ═══════════════════════════════════════════════════════════════════════════ */

function GameCard({ game, onClick, onToggle, size = "md" }) {
  const hue = hueOf(game.genre);
  const c = consoleOf(game.console);
  const isXs = size === "xs";
  const isSm = size === "sm";
  const boxSize = isXs ? 60 : isSm ? 80 : 110;
  const haloSize = isXs ? 70 : isSm ? 90 : 120;
  return (
    <div style={{
      padding: isXs ? "2px" : isSm ? "4px" : "8px", display: "flex", flexDirection: "column", alignItems: "center",
      textAlign: "center", position: "relative",
    }}>
      {/* Halo behind 3D box when beaten */}
      {game.completed && (
        <div style={{
          position: "absolute", top: isXs ? "2px" : isSm ? "4px" : "8px", left: "50%", transform: "translateX(-50%)",
          width: `${haloSize}px`, height: `${haloSize}px`,
          background: `radial-gradient(circle, ${hue}33 0%, ${hue}11 40%, transparent 70%)`,
          pointerEvents: "none", zIndex: 0,
        }} />
      )}
      {/* 3D box — clickable to open detail */}
      <div onClick={onClick} style={{ position: "relative", zIndex: 1, cursor: "pointer" }}>
        <LazyGameBox game={game} size={boxSize} selected={game.completed} />
        {game.percent100 && (
          <div style={{
            position: "absolute", top: "2px", right: "2px",
            fontFamily: FONT_MONO, fontSize: isXs ? "6px" : isSm ? "7px" : "8px",
            background: PAL.amber, color: PAL.void,
            padding: isXs ? "1px 4px" : "2px 5px", fontWeight: 700, letterSpacing: "0.5px",
            boxShadow: `0 0 10px ${PAL.amber}cc`,
          }}>★100</div>
        )}
      </div>
      {/* Floating text — fixed heights so cards align regardless of title length */}
      <div onClick={onClick} style={{ position: "relative", zIndex: 1, marginTop: isXs ? "2px" : "4px", width: "100%", cursor: "pointer" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: isXs ? "5px" : isSm ? "6px" : "7px", color: hue, letterSpacing: "1px", fontWeight: 600, textShadow: `0 0 6px ${hue}88`, marginBottom: "2px", height: isXs ? "8px" : isSm ? "10px" : "12px", overflow: "hidden" }}>{(game.franchise || "—").toUpperCase()}</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: isXs ? "8px" : isSm ? "9px" : "11px", color: PAL.ink, lineHeight: 1.15, fontWeight: 500, height: isXs ? "18px" : isSm ? "22px" : "27px", textShadow: `0 0 6px ${PAL.void}`, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{game.name}</div>
        <div style={{ fontFamily: FONT_BODY, fontSize: isXs ? "9px" : isSm ? "10px" : "11px", color: PAL.inkDim, marginTop: "2px", height: isXs ? "14px" : isSm ? "16px" : "18px", overflow: "hidden" }}>
          {c?.label || "—"}{game.completed && game.date ? ` · ${game.date}` : ""}
        </div>
      </div>
      {/* Beaten toggle — compact floating button */}
      <button onClick={(e) => { e.stopPropagation(); onToggle({ completed: !game.completed }); }} style={{
        marginTop: isXs ? "2px" : isSm ? "4px" : "6px", position: "relative", zIndex: 1,
        background: "transparent", border: `1px solid ${game.completed ? PAL.emerald : PAL.line}`,
        color: game.completed ? PAL.emerald : PAL.inkDim,
        fontFamily: FONT_DISPLAY, fontSize: isXs ? "6px" : isSm ? "7px" : "8px", padding: isXs ? "2px 5px" : isSm ? "3px 7px" : "4px 10px", cursor: "pointer", letterSpacing: "1.5px", fontWeight: 500,
        boxShadow: game.completed ? `0 0 10px ${PAL.emerald}44` : "none",
      }}>{game.completed ? "✓ BEATEN" : "○ MARK"}</button>
    </div>
  );
}

// Collapsible section inside the filter drawer
function FilterSection({ title, count, color, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: "12px", border: `1px solid ${open ? color : PAL.line}`, transition: "border-color 0.15s" }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between",
        background: open ? `${color}11` : "transparent", border: "none", cursor: "pointer",
        fontFamily: FONT_DISPLAY, fontSize: "11px", color: open ? color : PAL.inkDim,
        letterSpacing: "2.5px", fontWeight: 600,
        textShadow: open ? `0 0 10px ${color}88` : "none",
        transition: "all 0.15s",
      }}>
        <span>◇ {title}{count !== undefined && count !== null ? ` · ${count}` : ""}</span>
        <span style={{ fontSize: "10px", transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▶</span>
      </button>
      {open && (
        <div style={{ padding: "12px 14px", borderTop: `1px solid ${color}22` }}>
          {children}
        </div>
      )}
    </div>
  );
}

function LibraryTab({ games, onClick, onToggle }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [genre, setGenre] = useState("ALL");
  const [console_, setConsole_] = useState("ALL");
  const [sort, setSort] = useState("RECENT");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [manualDensity, setManualDensity] = useState(null); // null = auto, 4 = force 2x2, 9 = force 3x3
  const pagesRef = useRef(null);

  const allGenres = useMemo(() => ["ALL", ...new Set(games.map(g => g.genre).filter(Boolean))], [games]);
  const allConsoles = useMemo(() => ["ALL", ...new Set(games.map(g => g.console).filter(Boolean))], [games]);

  const filtered = useMemo(() => {
    let list = games.filter(g => {
      if (status === "BEATEN" && !g.completed) return false;
      if (status === "BACKLOG" && g.completed) return false;
      if (status === "HUNDRED" && !g.percent100) return false;
      if (genre !== "ALL" && g.genre !== genre) return false;
      if (console_ !== "ALL" && g.console !== console_) return false;
      if (search && !`${g.name} ${g.franchise}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    if (sort === "AZ") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "YEAR") list.sort((a, b) => (parseInt(b.date) || 0) - (parseInt(a.date) || 0));
    else if (sort === "CONSOLE") list.sort((a, b) => (a.console || "zzz").localeCompare(b.console || "zzz"));
    return list;
  }, [games, status, genre, console_, search, sort]);

  // Effective density: respect manual override; otherwise auto-pick based on filtered count.
  // <12 → 2x2; 12-29 → 3x3; ≥30 → 4x4 (super-dense view for large libraries).
  const density = manualDensity ?? (
    filtered.length >= 30 ? 16 :
    filtered.length >= 12 ? 9 :
    4
  );

  // Reset scroll position when filters / sort / density change
  useEffect(() => {
    if (pagesRef.current) pagesRef.current.scrollLeft = 0;
  }, [status, genre, console_, search, sort, density]);

  // Count active filters for the FILTERS button badge
  const activeFilterCount = [
    status !== "ALL" ? 1 : 0,
    genre !== "ALL" ? 1 : 0,
    console_ !== "ALL" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // Human-readable summary of active filters
  const filterSummary = useMemo(() => {
    const parts = [];
    if (status !== "ALL") parts.push(status === "HUNDRED" ? "100%" : status);
    if (genre !== "ALL") parts.push(genre);
    if (console_ !== "ALL") parts.push(consoleOf(console_)?.label || console_);
    return parts.join(" · ");
  }, [status, genre, console_]);

  const clearFilters = () => {
    setStatus("ALL"); setGenre("ALL"); setConsole_("ALL");
  };

  return (
    <div style={{ padding: "20px" }}>
      {/* Compact toolbar: SEARCH | SORT | FILTERS — all collapsible */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
        <button onClick={() => setSearchOpen(!searchOpen)} style={{
          display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px",
          background: searchOpen ? `${PAL.cyan}22` : (search ? `${PAL.cyan}11` : "transparent"),
          border: `1px solid ${searchOpen || search ? PAL.cyan : PAL.line}`,
          color: searchOpen || search ? PAL.cyan : PAL.inkDim,
          cursor: "pointer", fontFamily: FONT_DISPLAY, fontSize: "11px",
          letterSpacing: "2px", fontWeight: 600,
          boxShadow: search ? `0 0 12px ${PAL.cyan}44` : "none",
        }}>
          <span>◇ SEARCH</span>
          <span style={{ fontSize: "9px", transform: searchOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
        </button>

        <button onClick={() => setSortOpen(!sortOpen)} style={{
          display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px",
          background: sortOpen ? `${PAL.magenta}22` : (sort !== "RECENT" ? `${PAL.magenta}11` : "transparent"),
          border: `1px solid ${sortOpen || sort !== "RECENT" ? PAL.magenta : PAL.line}`,
          color: sortOpen || sort !== "RECENT" ? PAL.magenta : PAL.inkDim,
          cursor: "pointer", fontFamily: FONT_DISPLAY, fontSize: "11px",
          letterSpacing: "2px", fontWeight: 600,
          boxShadow: sort !== "RECENT" ? `0 0 12px ${PAL.magenta}44` : "none",
        }}>
          <span>◇ SORT</span>
          {sort !== "RECENT" && (
            <span style={{
              background: PAL.magenta, color: PAL.void,
              padding: "2px 7px", fontSize: "10px", fontWeight: 700,
              fontFamily: FONT_MONO, borderRadius: "2px",
            }}>{sort === "AZ" ? "A-Z" : sort}</span>
          )}
          <span style={{ fontSize: "9px", transform: sortOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
        </button>

        <button onClick={() => setFiltersOpen(!filtersOpen)} style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "8px 14px",
          background: filtersOpen ? `${PAL.cyan}22` : (activeFilterCount > 0 ? `${PAL.cyan}11` : "transparent"),
          border: `1px solid ${filtersOpen || activeFilterCount > 0 ? PAL.cyan : PAL.line}`,
          color: filtersOpen || activeFilterCount > 0 ? PAL.cyan : PAL.inkDim,
          cursor: "pointer", fontFamily: FONT_DISPLAY, fontSize: "11px",
          letterSpacing: "2px", fontWeight: 600,
          boxShadow: activeFilterCount > 0 ? `0 0 12px ${PAL.cyan}44` : "none",
          transition: "all 0.15s",
        }}>
          <span>◇ FILTERS</span>
          {activeFilterCount > 0 && (
            <span style={{
              background: PAL.cyan, color: PAL.void,
              padding: "2px 7px", fontSize: "10px", fontWeight: 700,
              fontFamily: FONT_MONO, borderRadius: "2px",
            }}>{activeFilterCount}</span>
          )}
          <span style={{ fontSize: "9px", transform: filtersOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
        </button>
      </div>

      {/* Search bar drawer */}
      {searchOpen && (
        <Panel glow={PAL.cyan} style={{ padding: "12px 16px", marginBottom: "12px" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="SCAN LIBRARY..." autoFocus
            style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontFamily: FONT_DISPLAY, fontSize: "12px", color: PAL.ink, letterSpacing: "2px", fontWeight: 500 }} />
        </Panel>
      )}

      {/* Sort drawer */}
      {sortOpen && (
        <div style={{ marginBottom: "12px", padding: "10px 12px", border: `1px solid ${PAL.magenta}33`, background: `${PAL.magenta}08` }}>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
            {[["RECENT","RECENT"],["AZ","A-Z"],["YEAR","YEAR"],["CONSOLE","BY CONSOLE"]].map(([k,l]) => (
              <Chip key={k} color={PAL.magenta} active={sort === k} onClick={() => setSort(k)}>{l}</Chip>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", paddingTop: "8px", borderTop: `1px solid ${PAL.magenta}22` }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: "9px", color: PAL.inkFaint, letterSpacing: "2px" }}>VIEW</span>
            <Chip color={PAL.magenta} active={manualDensity === null} onClick={() => setManualDensity(null)}>AUTO</Chip>
            <Chip color={PAL.magenta} active={manualDensity === 4} onClick={() => setManualDensity(4)}>2×2</Chip>
            <Chip color={PAL.magenta} active={manualDensity === 9} onClick={() => setManualDensity(9)}>3×3</Chip>
            <Chip color={PAL.magenta} active={manualDensity === 16} onClick={() => setManualDensity(16)}>4×4</Chip>
          </div>
        </div>
      )}

      {/* Active filter summary chip row (shown when filters applied + drawer closed) */}
      {!filtersOpen && activeFilterCount > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: "11px", color: PAL.cyan, letterSpacing: "1px" }}>{filterSummary}</span>
          <button onClick={clearFilters} style={{
            background: "transparent", border: `1px solid ${PAL.line}`,
            color: PAL.inkDim, cursor: "pointer",
            fontFamily: FONT_DISPLAY, fontSize: "9px", padding: "4px 10px",
            letterSpacing: "1.5px", fontWeight: 500,
          }}>✕ CLEAR</button>
        </div>
      )}

      {/* Collapsible filter drawer */}
      {filtersOpen && (
        <div style={{ marginBottom: "16px" }}>
          {/* Completion status */}
          <FilterSection
            title="STATUS"
            count={status !== "ALL" ? 1 : null}
            color={PAL.cyan}
            defaultOpen
          >
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {[["ALL","ALL"],["BEATEN","BEATEN"],["BACKLOG","BACKLOG"],["HUNDRED","100%"]].map(([k,l]) => (
                <Chip key={k} color={k === "HUNDRED" ? PAL.amber : PAL.cyan} active={status === k} onClick={() => setStatus(k)}>{l}</Chip>
              ))}
            </div>
          </FilterSection>

          {/* Genre */}
          <FilterSection
            title="GENRE"
            count={genre !== "ALL" ? 1 : null}
            color={PAL.violet}
          >
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {allGenres.map(g => (
                <Chip key={g} color={g === "ALL" ? PAL.inkDim : hueOf(g)} active={genre === g} onClick={() => setGenre(g)}>{g}</Chip>
              ))}
            </div>
          </FilterSection>

          {/* Console with 3D thumbnails */}
          <FilterSection
            title="CONSOLE"
            count={console_ !== "ALL" ? 1 : null}
            color={PAL.emerald}
          >
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {allConsoles.map(cid => {
                const c = cid === "ALL" ? null : consoleOf(cid);
                const active = console_ === cid;
                const accent = cid === "ALL" ? PAL.inkDim : brandColorOf(cid);
                return (
                  <button key={cid} onClick={() => setConsole_(cid)} style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: c ? "4px 12px 4px 4px" : "10px 14px",
                    background: active ? `${accent}22` : "transparent",
                    border: `1px solid ${active ? accent : PAL.line}`,
                    color: active ? accent : PAL.inkDim,
                    cursor: "pointer", borderRadius: "2px",
                    boxShadow: active ? `0 0 14px ${accent}55` : "none",
                    transition: "all 0.15s",
                  }}>
                    {c && (
                      <div style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <LazyConsoleModel modelId={c.model} color={c.accentColor} selected={active} size={44} />
                      </div>
                    )}
                    <span style={{ fontFamily: FONT_DISPLAY, fontSize: "10px", letterSpacing: "1.5px", fontWeight: 600, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                      {cid === "ALL" ? "ALL" : (c?.label || cid)}
                    </span>
                  </button>
                );
              })}
            </div>
          </FilterSection>

          {/* Clear all + Apply done buttons */}
          {activeFilterCount > 0 && (
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <Btn onClick={clearFilters} color={PAL.danger} size="sm">CLEAR ALL FILTERS</Btn>
            </div>
          )}
        </div>
      )}

      {/* Entry count */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: "11px", color: PAL.inkFaint, letterSpacing: "2px" }}>
          ◇ {filtered.length} ENTRIES{manualDensity !== null && <span style={{ marginLeft: "10px", color: PAL.magenta }}>· {density === 4 ? "2×2" : density === 9 ? "3×3" : "4×4"} VIEW</span>}
        </div>
      </div>

      {/* Horizontal continuous-scroll library — chunked into screen-width "pages" of 2x2 / 3x3 / 4x4 grids */}
      {filtered.length > 0 ? (() => {
        const pages = [];
        for (let i = 0; i < filtered.length; i += density) {
          pages.push(filtered.slice(i, i + density));
        }
        const cols = density === 4 ? 2 : density === 9 ? 3 : 4;
        const gap = density === 4 ? "12px" : density === 9 ? "8px" : "6px";
        const cardSize = density === 4 ? "md" : density === 9 ? "sm" : "xs";
        return (
          <div
            ref={pagesRef}
            className="hide-scrollbar"
            style={{
              display: "flex", overflowX: "auto", overflowY: "hidden",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {pages.map((pageGames, pi) => (
              <div key={pi} style={{
                flex: "0 0 100%",
                display: "grid",
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gap,
                padding: "4px",
                alignContent: "start",
              }}>
                {pageGames.map(g => <GameCard key={g.id} game={g} onClick={() => onClick(g)} onToggle={p => onToggle(g.id, p)} size={cardSize} />)}
              </div>
            ))}
          </div>
        );
      })() : (
        <div style={{ textAlign: "center", padding: "60px 20px", fontFamily: FONT_DISPLAY, fontSize: "12px", color: PAL.inkFaint, letterSpacing: "3px" }}>NO ENTRIES FOUND</div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DRAGGABLE GRID — long-press to pick up, drag to reorder
   Works with touch and mouse via Pointer Events.
   ═══════════════════════════════════════════════════════════════════════════ */

function DraggableGrid({ items, onReorder, renderItem, cols, gap = 12 }) {
  const containerRef = useRef(null);
  const itemRefs = useRef([]);
  const [dragState, setDragState] = useState(null); // { id, fromIdx, x, y, offsetX, offsetY, hoverIdx }
  const longPressTimer = useRef(null);
  const startPos = useRef(null);
  const activePointerId = useRef(null);
  const justDragged = useRef(false);

  // Reset refs when items change
  itemRefs.current = items.map((_, i) => itemRefs.current[i] || null);

  const pickUp = (idx, e) => {
    const item = itemRefs.current[idx];
    if (!item) return;
    const rect = item.getBoundingClientRect();
    setDragState({
      id: items[idx].id,
      fromIdx: idx,
      hoverIdx: idx,
      x: e.clientX,
      y: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    });
    // Haptic feedback on supported devices
    if (navigator.vibrate) navigator.vibrate(20);
  };

  const onPointerDown = (idx) => (e) => {
    // Only handle primary button / single touch
    if (e.button !== undefined && e.button !== 0) return;
    activePointerId.current = e.pointerId;
    startPos.current = { x: e.clientX, y: e.clientY };
    // Start long-press timer
    longPressTimer.current = setTimeout(() => {
      pickUp(idx, e);
    }, 350);
    // Capture so we keep getting events
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (e.pointerId !== activePointerId.current) return;
    // Cancel long-press if moved too far before it fired
    if (longPressTimer.current && startPos.current) {
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
    if (!dragState) return;
    // Prevent default scroll while dragging
    e.preventDefault();
    // Update drag ghost position
    setDragState(prev => {
      if (!prev) return prev;
      // Determine which item we're hovering by checking center against each item's rect
      let hoverIdx = prev.fromIdx;
      for (let i = 0; i < items.length; i++) {
        if (i === prev.fromIdx) continue;
        const el = itemRefs.current[i];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          hoverIdx = i;
          break;
        }
      }
      return { ...prev, x: e.clientX, y: e.clientY, hoverIdx };
    });
  };

  const onPointerUp = (e) => {
    if (e.pointerId !== activePointerId.current) return;
    activePointerId.current = null;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (dragState) {
      const { fromIdx, hoverIdx } = dragState;
      if (fromIdx !== hoverIdx) {
        const next = [...items];
        const [moved] = next.splice(fromIdx, 1);
        next.splice(hoverIdx, 0, moved);
        onReorder(next);
        if (navigator.vibrate) navigator.vibrate(15);
      }
      setDragState(null);
      // Block the subsequent synthetic click event so we don't open the modal
      // after dropping
      justDragged.current = true;
      setTimeout(() => { justDragged.current = false; }, 300);
    }
  };

  const onPointerCancel = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
    setDragState(null);
    activePointerId.current = null;
  };

  return (
    <>
      <div
        ref={containerRef}
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: `${gap}px`,
          touchAction: dragState ? "none" : "auto",
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClickCapture={(e) => {
          if (justDragged.current) {
            e.stopPropagation();
            e.preventDefault();
          }
        }}
      >
        {items.map((item, idx) => {
          const isDragging = dragState && dragState.fromIdx === idx;
          const isHoverTarget = dragState && dragState.hoverIdx === idx && dragState.fromIdx !== idx;
          return (
            <div
              key={item.id}
              ref={el => itemRefs.current[idx] = el}
              onPointerDown={onPointerDown(idx)}
              style={{
                opacity: isDragging ? 0.25 : 1,
                transform: isHoverTarget ? "scale(0.92)" : "scale(1)",
                transition: dragState ? "transform 0.15s, opacity 0.15s" : "none",
                position: "relative",
                touchAction: "auto",
              }}
            >
              {isHoverTarget && (
                <div style={{
                  position: "absolute", inset: "-4px",
                  border: `2px dashed ${PAL.violet}`,
                  background: `${PAL.violet}11`,
                  pointerEvents: "none", zIndex: 0,
                  boxShadow: `0 0 20px ${PAL.violet}66`,
                }} />
              )}
              <div style={{ position: "relative", zIndex: 1 }}>
                {renderItem(item, idx)}
              </div>
            </div>
          );
        })}
      </div>
      {/* Drag ghost — follows pointer */}
      {dragState && (
        <div style={{
          position: "fixed",
          left: dragState.x - dragState.offsetX,
          top: dragState.y - dragState.offsetY,
          width: dragState.width,
          height: dragState.height,
          pointerEvents: "none",
          zIndex: 1000,
          transform: "scale(1.05) rotate(-2deg)",
          filter: `drop-shadow(0 8px 24px ${PAL.violet}cc)`,
        }}>
          {renderItem(items[dragState.fromIdx], dragState.fromIdx)}
        </div>
      )}
    </>
  );
}

function QueueTab({ games, onClick, onToggle, onReorder }) {
  const [genre, setGenre] = useState("ALL");
  const [console_, setConsole_] = useState("ALL");
  const [sort, setSort] = useState("CUSTOM");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const queue = useMemo(() => games.filter(g => !g.completed), [games]);

  const allGenres = useMemo(() => ["ALL", ...new Set(queue.map(g => g.genre).filter(Boolean))], [queue]);
  const allConsoles = useMemo(() => ["ALL", ...new Set(queue.map(g => g.console).filter(Boolean))], [queue]);

  // The master queue: always sorted by user's manual queueOrder field.
  // Every view (master/group-by-genre/group-by-console) reads from this.
  const masterOrdered = useMemo(() => {
    const ordered = [...queue];
    ordered.sort((a, b) => {
      const ao = a.queueOrder !== undefined ? a.queueOrder : Number.MAX_SAFE_INTEGER;
      const bo = b.queueOrder !== undefined ? b.queueOrder : Number.MAX_SAFE_INTEGER;
      return ao - bo;
    });
    return ordered;
  }, [queue]);

  // Apply filter chips (genre / console) to the master-ordered list.
  // We do NOT re-sort here — master order is sacred.
  const filtered = useMemo(() => {
    return masterOrdered.filter(g => {
      if (genre !== "ALL" && g.genre !== genre) return false;
      if (console_ !== "ALL" && g.console !== console_) return false;
      return true;
    });
  }, [masterOrdered, genre, console_]);

  const activeFilterCount = [genre !== "ALL" ? 1 : 0, console_ !== "ALL" ? 1 : 0].reduce((a, b) => a + b, 0);

  const filterSummary = useMemo(() => {
    const parts = [];
    if (genre !== "ALL") parts.push(genre);
    if (console_ !== "ALL") parts.push(consoleOf(console_)?.label || console_);
    return parts.join(" · ");
  }, [genre, console_]);

  const clearFilters = () => { setGenre("ALL"); setConsole_("ALL"); };

  // Group while preserving master order — groups themselves are ordered by
  // the master-order position of the first game in each group, so the genre
  // (or console) containing your highest-priority game appears first.
  const groupOrdered = (key) => {
    const m = {}; // groupName -> [games...] (insertion order = master order)
    const firstSeen = {}; // groupName -> first encountered idx
    filtered.forEach((g, i) => {
      const k = g[key] || "Other";
      if (!(k in m)) { m[k] = []; firstSeen[k] = i; }
      m[k].push(g);
    });
    return Object.entries(m).sort(([a], [b]) => firstSeen[a] - firstSeen[b]);
  };

  const byGenre = useMemo(() => groupOrdered("genre"), [filtered]);
  const byConsole = useMemo(() => groupOrdered("console"), [filtered]);

  if (!queue.length) {
    return (
      <div style={{ padding: "20px" }}>
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: "12px", color: PAL.violet, letterSpacing: "3px", marginBottom: "6px", fontWeight: 600, textShadow: `0 0 12px ${PAL.violet}66` }}>◇ STANDBY QUEUE</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: "16px", color: PAL.inkDim, fontWeight: 300 }}>0 games awaiting launch.</div>
        </div>
        <div style={{ textAlign: "center", padding: "80px 20px", fontFamily: FONT_BODY, fontSize: "18px", color: PAL.inkFaint, fontWeight: 300 }}>Queue is empty. All systems clear.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: "12px", color: PAL.violet, letterSpacing: "3px", marginBottom: "6px", fontWeight: 600, textShadow: `0 0 12px ${PAL.violet}66` }}>◇ STANDBY QUEUE</div>
        <div style={{ fontFamily: FONT_BODY, fontSize: "16px", color: PAL.inkDim, fontWeight: 300 }}>{queue.length} games awaiting launch.</div>
      </div>

      {/* Compact toolbar: SORT | FILTERS */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
        <button onClick={() => setSortOpen(!sortOpen)} style={{
          display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px",
          background: sortOpen ? `${PAL.magenta}22` : (sort !== "CUSTOM" ? `${PAL.magenta}11` : "transparent"),
          border: `1px solid ${sortOpen || sort !== "CUSTOM" ? PAL.magenta : PAL.line}`,
          color: sortOpen || sort !== "CUSTOM" ? PAL.magenta : PAL.inkDim,
          cursor: "pointer", fontFamily: FONT_DISPLAY, fontSize: "11px",
          letterSpacing: "2px", fontWeight: 600,
          boxShadow: sort !== "CUSTOM" ? `0 0 12px ${PAL.magenta}44` : "none",
        }}>
          <span>◇ SORT</span>
          {sort !== "CUSTOM" && (
            <span style={{
              background: PAL.magenta, color: PAL.void,
              padding: "2px 7px", fontSize: "10px", fontWeight: 700,
              fontFamily: FONT_MONO, borderRadius: "2px",
            }}>{sort === "AZ" ? "A-Z" : sort}</span>
          )}
          <span style={{ fontSize: "9px", transform: sortOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
        </button>

        <button onClick={() => setFiltersOpen(!filtersOpen)} style={{
          display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px",
          background: filtersOpen ? `${PAL.violet}22` : (activeFilterCount > 0 ? `${PAL.violet}11` : "transparent"),
          border: `1px solid ${filtersOpen || activeFilterCount > 0 ? PAL.violet : PAL.line}`,
          color: filtersOpen || activeFilterCount > 0 ? PAL.violet : PAL.inkDim,
          cursor: "pointer", fontFamily: FONT_DISPLAY, fontSize: "11px",
          letterSpacing: "2px", fontWeight: 600,
          boxShadow: activeFilterCount > 0 ? `0 0 12px ${PAL.violet}44` : "none",
        }}>
          <span>◇ FILTERS</span>
          {activeFilterCount > 0 && (<span style={{ background: PAL.violet, color: PAL.void, padding: "2px 7px", fontSize: "10px", fontWeight: 700, fontFamily: FONT_MONO, borderRadius: "2px" }}>{activeFilterCount}</span>)}
          <span style={{ fontSize: "9px", transform: filtersOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
        </button>
      </div>

      {/* Sort drawer */}
      {sortOpen && (
        <div style={{ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap", padding: "10px 12px", border: `1px solid ${PAL.magenta}33`, background: `${PAL.magenta}08` }}>
          {[["CUSTOM","MASTER ORDER"],["GENRE","GROUP BY GENRE"],["CONSOLE","GROUP BY CONSOLE"]].map(([k,l]) => (
            <Chip key={k} color={PAL.magenta} active={sort === k} onClick={() => setSort(k)}>{l}</Chip>
          ))}
        </div>
      )}

      {/* Active filter summary */}
      {!filtersOpen && activeFilterCount > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: "11px", color: PAL.violet, letterSpacing: "1px" }}>{filterSummary}</span>
          <button onClick={clearFilters} style={{ background: "transparent", border: `1px solid ${PAL.line}`, color: PAL.inkDim, cursor: "pointer", fontFamily: FONT_DISPLAY, fontSize: "9px", padding: "4px 10px", letterSpacing: "1.5px", fontWeight: 500 }}>✕ CLEAR</button>
        </div>
      )}

      {/* Filter drawer */}
      {filtersOpen && (
        <div style={{ marginBottom: "16px" }}>
          <FilterSection title="GENRE" count={genre !== "ALL" ? 1 : null} color={PAL.violet} defaultOpen>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {allGenres.map(g => (
                <Chip key={g} color={g === "ALL" ? PAL.inkDim : hueOf(g)} active={genre === g} onClick={() => setGenre(g)}>{g}</Chip>
              ))}
            </div>
          </FilterSection>
          <FilterSection title="CONSOLE" count={console_ !== "ALL" ? 1 : null} color={PAL.emerald}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {allConsoles.map(cid => {
                const c = cid === "ALL" ? null : consoleOf(cid);
                const active = console_ === cid;
                const accent = cid === "ALL" ? PAL.inkDim : brandColorOf(cid);
                return (
                  <button key={cid} onClick={() => setConsole_(cid)} style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: c ? "4px 12px 4px 4px" : "10px 14px",
                    background: active ? `${accent}22` : "transparent",
                    border: `1px solid ${active ? accent : PAL.line}`,
                    color: active ? accent : PAL.inkDim,
                    cursor: "pointer", borderRadius: "2px",
                    boxShadow: active ? `0 0 14px ${accent}55` : "none",
                  }}>
                    {c && (<div style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <LazyConsoleModel modelId={c.model} color={c.accentColor} selected={active} size={44} />
                    </div>)}
                    <span style={{ fontFamily: FONT_DISPLAY, fontSize: "10px", letterSpacing: "1.5px", fontWeight: 600, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                      {cid === "ALL" ? "ALL" : (c?.label || cid)}
                    </span>
                  </button>
                );
              })}
            </div>
          </FilterSection>
          {activeFilterCount > 0 && (
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <Btn onClick={clearFilters} color={PAL.danger} size="sm">CLEAR ALL FILTERS</Btn>
            </div>
          )}
        </div>
      )}

      {/* Entry count */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: "11px", color: PAL.inkFaint, letterSpacing: "2px" }}>◇ {filtered.length} ENTRIES</div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", fontFamily: FONT_DISPLAY, fontSize: "12px", color: PAL.inkFaint, letterSpacing: "3px" }}>NO ENTRIES FOUND</div>
      ) : sort === "CUSTOM" ? (
        // Drag-to-reorder grid
        <>
          <div style={{ fontFamily: FONT_BODY, fontSize: "13px", color: PAL.inkFaint, marginBottom: "12px", fontStyle: "italic" }}>
            ◇ Long-press a game and drag to reorder your queue.
          </div>
          <DraggableGrid
            items={filtered}
            cols={2}
            gap={12}
            onReorder={(newOrder) => {
              // Persist new positions via queueOrder field on each game.
              // Use indexed values so future items can be inserted between.
              const updates = newOrder.map((g, i) => ({ ...g, queueOrder: i * 10 }));
              onReorder(updates);
            }}
            renderItem={(g) => (
              <GameCard game={g} onClick={() => onClick(g)} onToggle={p => onToggle(g.id, p)} />
            )}
          />
        </>
      ) : sort === "GENRE" ? (
        // Genre-grouped vertical view — groups ordered by master priority
        byGenre.map(([gname, list]) => (
          <div key={gname} style={{ marginBottom: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: "11px", color: hueOf(gname), letterSpacing: "3px", fontWeight: 600, textShadow: `0 0 10px ${hueOf(gname)}66` }}>{gname.toUpperCase()}</div>
              <div style={{ flex: 1, height: "1px", background: hueOf(gname), opacity: 0.3 }} />
              <div style={{ fontFamily: FONT_MONO, fontSize: "10px", color: PAL.inkFaint }}>{list.length}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "12px" }}>
              {list.map(g => <GameCard key={g.id} game={g} onClick={() => onClick(g)} onToggle={p => onToggle(g.id, p)} />)}
            </div>
          </div>
        ))
      ) : (
        // Console-grouped vertical view — groups ordered by master priority
        byConsole.map(([cid, list]) => {
          const c = consoleOf(cid);
          const label = c?.label || cid || "Other";
          const accent = brandColorOf(cid);
          return (
            <div key={cid} style={{ marginBottom: "28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: "11px", color: accent, letterSpacing: "3px", fontWeight: 600, textShadow: `0 0 10px ${accent}66` }}>{label.toUpperCase()}</div>
                <div style={{ flex: 1, height: "1px", background: accent, opacity: 0.3 }} />
                <div style={{ fontFamily: FONT_MONO, fontSize: "10px", color: PAL.inkFaint }}>{list.length}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "12px" }}>
                {list.map(g => <GameCard key={g.id} game={g} onClick={() => onClick(g)} onToggle={p => onToggle(g.id, p)} />)}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function StatsTab({ games }) {
  const completed = games.filter(g => g.completed);
  const hundred = games.filter(g => g.percent100);
  const backlog = games.length - completed.length;
  const byGenre = useMemo(() => {
    const m = {};
    completed.forEach(g => { m[g.genre || "Other"] = (m[g.genre || "Other"] || 0) + 1; });
    return Object.entries(m).sort(([,a],[,b]) => b - a);
  }, [completed]);
  const byYear = useMemo(() => {
    const m = {};
    completed.forEach(g => { if (g.date) m[g.date] = (m[g.date] || 0) + 1; });
    return Object.entries(m).sort(([a],[b]) => { if (a === "Childhood") return 1; if (b === "Childhood") return -1; return parseInt(b) - parseInt(a); });
  }, [completed]);
  const byFranchise = useMemo(() => {
    const m = {};
    completed.forEach(g => { if (g.franchise) m[g.franchise] = (m[g.franchise] || 0) + 1; });
    return Object.entries(m).sort(([,a],[,b]) => b - a).slice(0, 6);
  }, [completed]);
  const byConsole = useMemo(() => {
    const m = {};
    completed.forEach(g => { if (g.console) m[g.console] = (m[g.console] || 0) + 1; });
    return Object.entries(m).sort(([,a],[,b]) => b - a);
  }, [completed]);
  const earned = ACHIEVEMENTS.filter(a => a.test(games));
  const maxG = byGenre[0]?.[1] || 1;

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {[{ v: completed.length, l: "BEATEN", c: PAL.emerald }, { v: hundred.length, l: "100%", c: PAL.amber }, { v: backlog, l: "BACKLOG", c: PAL.violet }, { v: games.length, l: "TOTAL", c: PAL.cyan }].map(s => (
          <Panel key={s.l} glow={s.c} style={{ padding: "18px" }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: "36px", color: s.c, lineHeight: 1, fontWeight: 700, textShadow: `0 0 24px ${s.c}88, 0 0 48px ${s.c}44` }}>{s.v}</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: "10px", color: PAL.inkDim, letterSpacing: "2px", marginTop: "8px", fontWeight: 500 }}>{s.l}</div>
          </Panel>
        ))}
      </div>
      {byGenre.length > 0 && (
        <Panel style={{ padding: "20px", marginBottom: "16px" }}>
          <Label>◇ Genre Distribution</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "14px" }}>
            {byGenre.map(([g, c]) => (
              <div key={g}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontFamily: FONT_DISPLAY, fontSize: "12px", color: hueOf(g), letterSpacing: "2px", fontWeight: 500 }}>{g}</span>
                  <span style={{ fontFamily: FONT_MONO, fontSize: "11px", color: PAL.inkDim }}>{c}</span>
                </div>
                <div style={{ height: "4px", background: PAL.bg, position: "relative", borderRadius: "2px", overflow: "hidden" }}>
                  <div style={{ position: "absolute", inset: 0, width: `${(c/maxG)*100}%`, background: hueOf(g), boxShadow: `0 0 16px ${hueOf(g)}` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
      {byConsole.length > 0 && (
        <Panel style={{ padding: "20px", marginBottom: "16px" }}>
          <Label>◇ Hardware Stats</Label>
          <div style={{ marginTop: "12px" }}>
            {byConsole.map(([cid, c]) => {
              const cons = consoleOf(cid);
              return (
                <div key={cid} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${PAL.line}` }}>
                  <span style={{ fontFamily: FONT_DISPLAY, fontSize: "12px", color: cons?.color || PAL.ink, letterSpacing: "1px", fontWeight: 500 }}>{cons?.label || cid}</span>
                  <span style={{ fontFamily: FONT_MONO, fontSize: "12px", color: PAL.emerald }}>{c}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      )}
      {byYear.length > 0 && (
        <Panel style={{ padding: "20px", marginBottom: "16px" }}>
          <Label>◇ Timeline</Label>
          <div style={{ marginTop: "12px" }}>
            {byYear.map(([y, c]) => (
              <div key={y} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${PAL.line}` }}>
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: "14px", color: PAL.ink, letterSpacing: "2px", fontWeight: 500 }}>{y}</span>
                <span style={{ fontFamily: FONT_MONO, fontSize: "12px", color: PAL.emerald }}>{c}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}
      {byFranchise.length > 0 && (
        <Panel style={{ padding: "20px", marginBottom: "16px" }}>
          <Label>◇ Top Franchises</Label>
          <div style={{ marginTop: "12px" }}>
            {byFranchise.map(([f, c], i) => (
              <div key={f} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i === byFranchise.length - 1 ? "none" : `1px solid ${PAL.line}` }}>
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: "14px", color: PAL.ink, fontWeight: 500, letterSpacing: "1px" }}><span style={{ color: PAL.amber, marginRight: "10px", fontFamily: FONT_MONO }}>#{i+1}</span>{f}</span>
                <span style={{ fontFamily: FONT_MONO, fontSize: "12px", color: PAL.emerald }}>{c}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}
      <Panel style={{ padding: "20px" }}>
        <Label>◇ Achievements ({earned.length}/{ACHIEVEMENTS.length})</Label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "10px", marginTop: "14px" }}>
          {ACHIEVEMENTS.map(a => {
            const e = a.test(games);
            return (
              <div key={a.id} style={{ padding: "12px", background: e ? `${PAL.amber}11` : "transparent", border: `1px solid ${e ? PAL.amber : PAL.line}`, boxShadow: e ? `0 0 20px ${PAL.amber}44` : "none", opacity: e ? 1 : 0.5 }}>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: "10px", color: e ? PAL.amber : PAL.inkFaint, letterSpacing: "2px", marginBottom: "4px", fontWeight: 600 }}>{e ? "★" : "☆"} {a.name}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: "14px", color: e ? PAL.ink : PAL.inkFaint, lineHeight: 1.3, fontWeight: 300 }}>{a.desc}</div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function ProfileTab({ profile, games, onReset, onUpdateProfile, onLogout, email }) {
  const [confirm, setConfirm] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.name || "");

  const saveName = () => {
    const next = nameDraft.trim() || "PLAYER 1";
    onUpdateProfile({ name: next });
    setEditingName(false);
  };

  return (
    <div style={{ padding: "20px" }}>
      <Panel glow={PAL.cyan} pulse style={{ padding: "24px", marginBottom: "16px" }}>
        <Label color={PAL.cyan}>◇ Pilot</Label>
        {editingName ? (
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px", alignItems: "center", flexWrap: "wrap" }}>
            <input
              value={nameDraft}
              onChange={e => setNameDraft(e.target.value.slice(0, 20))}
              onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") { setNameDraft(profile.name || ""); setEditingName(false); } }}
              autoFocus
              style={{
                flex: 1, minWidth: "180px",
                background: PAL.bg, color: PAL.cyan,
                border: `1px solid ${PAL.cyan}`,
                fontFamily: FONT_DISPLAY, fontSize: "20px",
                letterSpacing: "4px", textTransform: "uppercase",
                padding: "8px 12px", outline: "none", fontWeight: 600,
              }}
            />
            <Btn onClick={saveName} color={PAL.emerald} size="sm">SAVE</Btn>
            <Btn onClick={() => { setNameDraft(profile.name || ""); setEditingName(false); }} color={PAL.inkDim} size="sm">CANCEL</Btn>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "20px", flexWrap: "wrap" }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: "28px", color: PAL.cyan, letterSpacing: "4px", fontWeight: 700, textShadow: `0 0 24px ${PAL.cyan}88, 0 0 48px ${PAL.cyan}44` }}>{profile.name || "PLAYER 1"}</div>
            <button onClick={() => { setNameDraft(profile.name || ""); setEditingName(true); }} style={{
              background: "transparent", border: `1px solid ${PAL.line}`,
              color: PAL.inkDim, cursor: "pointer",
              fontFamily: FONT_DISPLAY, fontSize: "10px",
              letterSpacing: "2px", padding: "5px 10px", fontWeight: 500,
            }}>✎ EDIT</button>
          </div>
        )}
        <div style={{ fontFamily: FONT_BODY, fontSize: "16px", color: PAL.inkDim, marginBottom: "6px", fontWeight: 300 }}>{games.length} entries · {games.filter(g => g.completed).length} cleared</div>
        {profile.createdAt && (<div style={{ fontFamily: FONT_MONO, fontSize: "12px", color: PAL.inkFaint, letterSpacing: "1px" }}>◇ ACTIVE SINCE {new Date(profile.createdAt).toLocaleDateString()}</div>)}
      </Panel>
      {profile.genres?.length > 0 && (
        <Panel style={{ padding: "20px", marginBottom: "16px" }}>
          <Label>◇ Preferred Genres</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
            {profile.genres.map(g => <Chip key={g} color={hueOf(g)} active>{g}</Chip>)}
          </div>
        </Panel>
      )}
      {profile.consoles?.length > 0 && (
        <Panel style={{ padding: "20px", marginBottom: "16px" }}>
          <Label>◇ Linked Hardware</Label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "12px", marginTop: "10px" }}>
            {profile.consoles.map(id => {
              const c = consoleOf(id);
              if (!c) return null;
              const bc = brandColorOf(id);
              return (
                <Panel key={id} glow={bc} style={{ padding: "12px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <ConsoleModel modelId={c.model} color={c.accentColor} selected={false} size={110} />
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: "9px", color: bc, letterSpacing: "2px", marginTop: "6px", fontWeight: 600, textShadow: `0 0 8px ${bc}66` }}>{c.label}</div>
                </Panel>
              );
            })}
          </div>
        </Panel>
      )}
      <Panel style={{ padding: "20px", marginBottom: "16px" }}>
        <Label color={PAL.cyan}>◇ Session</Label>
        {email && (
          <div style={{ fontFamily: FONT_MONO, fontSize: "12px", color: PAL.inkDim, letterSpacing: "1px", marginBottom: "14px", wordBreak: "break-all" }}>
            ◇ SIGNED IN AS {email.toUpperCase()}
          </div>
        )}
        <div style={{ fontFamily: FONT_BODY, fontSize: "14px", color: PAL.inkDim, marginBottom: "14px", fontWeight: 300 }}>Sign out on this device. Your queue stays safe in the cloud.</div>
        <Btn onClick={onLogout} color={PAL.cyan} size="sm">SIGN OUT</Btn>
      </Panel>
      <Panel glow={PAL.danger} style={{ padding: "20px" }}>
        <Label color={PAL.danger}>◇ Self-Destruct</Label>
        <div style={{ fontFamily: FONT_BODY, fontSize: "14px", color: PAL.inkDim, marginBottom: "14px", marginTop: "8px", fontWeight: 300 }}>Wipes all data. Cannot be undone.</div>
        {confirm ? (
          <div style={{ display: "flex", gap: "8px" }}>
            <Btn onClick={onReset} color={PAL.danger} size="sm">CONFIRM WIPE</Btn>
            <Btn onClick={() => setConfirm(false)} color={PAL.inkDim} size="sm">ABORT</Btn>
          </div>
        ) : (
          <Btn onClick={() => setConfirm(true)} color={PAL.danger} size="sm">RESET ALL DATA</Btn>
        )}
      </Panel>
      <div style={{ marginTop: "24px", textAlign: "center", fontFamily: FONT_MONO, fontSize: "10px", color: PAL.inkFaint, letterSpacing: "3px" }}>◇ CLOUD SYNC ACTIVE ◇ DATA PERSISTED</div>
    </div>
  );
}

function TabBar({ tab, setTab, onAdd }) {
  const tabs = [
    { id: "queue", l: "QUEUE", c: PAL.violet },
    { id: "lib", l: "LIBRARY", c: PAL.cyan },
    { id: "stats", l: "STATS", c: PAL.emerald },
    { id: "profile", l: "PILOT", c: PAL.magenta },
  ];
  return (
    <div style={{ position: "sticky", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)", borderTop: `1px solid ${PAL.cyan}33`, display: "flex", padding: "10px", gap: "8px", zIndex: 50 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{
          flex: 1, background: tab === t.id ? `${t.c}15` : "transparent",
          border: `1px solid ${tab === t.id ? t.c : "transparent"}`,
          cursor: "pointer", padding: "10px 4px",
          fontFamily: FONT_DISPLAY, fontSize: "10px",
          color: tab === t.id ? t.c : PAL.inkFaint,
          letterSpacing: "2px", fontWeight: 600,
          boxShadow: tab === t.id ? `0 0 20px ${t.c}66, 0 0 40px ${t.c}33` : "none",
          textShadow: tab === t.id ? `0 0 8px ${t.c}aa` : "none",
          transition: "all 0.2s",
        }}>{t.l}</button>
      ))}
      <button onClick={onAdd} style={{ width: "56px", background: PAL.cyan, color: PAL.void, border: "none", cursor: "pointer", fontFamily: FONT_DISPLAY, fontSize: "20px", fontWeight: 700, boxShadow: `0 0 32px ${PAL.cyan}cc, 0 0 64px ${PAL.cyan}66` }}>+</button>
    </div>
  );
}

function StatusBar({ profile, games }) {
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    let raf;
    const tick = () => { setPulse(performance.now()); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const ledGlow = 0.6 + Math.sin(pulse / 400) * 0.4;
  return (
    <div style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", padding: "12px 20px", borderBottom: `1px solid ${PAL.cyan}33`, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ width: "8px", height: "8px", background: PAL.emerald, borderRadius: "50%", boxShadow: `0 0 ${12 * ledGlow}px ${PAL.emerald}, 0 0 ${24 * ledGlow}px ${PAL.emerald}88` }} />
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: "11px", color: PAL.cyan, letterSpacing: "3px", fontWeight: 700, textShadow: `0 0 ${10 * ledGlow}px ${PAL.cyan}aa` }}>GAMEQUEUE</div>
        <div style={{ fontFamily: FONT_MONO, fontSize: "9px", color: PAL.inkFaint, letterSpacing: "1px" }}>v4.0</div>
      </div>
      <div style={{ fontFamily: FONT_MONO, fontSize: "10px", color: PAL.inkDim, letterSpacing: "2px" }}>
        {profile.name?.toUpperCase() || "PLAYER 1"} · {games.filter(g => g.completed).length}/{games.length}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AUTH — email/password gate (Supabase)
   ═══════════════════════════════════════════════════════════════════════════ */

// Turn Supabase's terse error strings into on-brand, human messages.
function friendlyAuthError(msg) {
  const m = (msg || "").toLowerCase();
  if (m.includes("invalid login")) return "Wrong email or password.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "That email is already registered — try signing in instead.";
  if (m.includes("email not confirmed")) return "Confirm your email first — check your inbox.";
  if (m.includes("password should be at least")) return "Password must be at least 6 characters.";
  if (m.includes("unable to validate email") || m.includes("invalid email") || m.includes("invalid format"))
    return "That doesn't look like a valid email address.";
  if (m.includes("rate limit") || m.includes("too many") || m.includes("for security purposes"))
    return "Too many attempts — wait a moment and try again.";
  if (m.includes("signups not allowed")) return "New sign-ups are disabled for this project.";
  return msg || "Something went wrong. Please try again.";
}

function AuthScreen() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isSignup = mode === "signup";

  async function submit() {
    if (loading) return;
    setError(""); setNotice("");
    if (!email.trim() || !password) { setError("Enter your email and password."); return; }
    setLoading(true);
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) {
          setError(friendlyAuthError(error.message));
        } else if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          // Supabase returns an obfuscated user with no identities when the
          // email already exists (to avoid leaking which emails are registered).
          setError("That email is already registered — try signing in instead.");
        } else if (!data.session) {
          // Email confirmation is enabled on the project — no session yet.
          setNotice("Account created. Check your email to confirm, then sign in.");
          setMode("signin");
        }
        // If a session came back, onAuthStateChange swaps this screen out.
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) setError(friendlyAuthError(error.message));
      }
    } catch (e) {
      setError(friendlyAuthError(e?.message));
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    background: PAL.bg, color: PAL.ink,
    border: `1px solid ${PAL.line}`,
    fontFamily: FONT_BODY, fontSize: "16px", fontWeight: 400,
    letterSpacing: "1px", padding: "12px 14px", outline: "none",
    marginBottom: "14px", transition: "border-color 0.2s, box-shadow 0.2s",
  };
  const focusOn = e => { e.target.style.borderColor = PAL.cyan; e.target.style.boxShadow = `0 0 16px ${PAL.cyan}33`; };
  const focusOff = e => { e.target.style.borderColor = PAL.line; e.target.style.boxShadow = "none"; };
  const onKey = e => { if (e.key === "Enter") submit(); };

  return (
    <div style={{
      minHeight: "100vh", color: PAL.ink, fontFamily: FONT_BODY,
      padding: "32px 20px", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      position: "relative", zIndex: 1,
    }}>
      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: "10px", color: PAL.cyan, letterSpacing: "8px", marginBottom: "4px", opacity: 0.7 }}>◇ SYSTEM ONLINE ◇</div>
        <Title3D height={180} />
      </div>

      <Panel glow={PAL.cyan} pulse style={{ padding: "28px 24px", width: "100%", maxWidth: "380px" }}>
        <Label color={PAL.cyan}>◇ {isSignup ? "Create Pilot Access" : "Pilot Sign-In"}</Label>

        <input
          type="email" value={email} autoComplete="email"
          onChange={e => setEmail(e.target.value)}
          onFocus={focusOn} onBlur={focusOff} onKeyDown={onKey}
          placeholder="email@address.com"
          style={inputStyle}
        />
        <input
          type="password" value={password}
          autoComplete={isSignup ? "new-password" : "current-password"}
          onChange={e => setPassword(e.target.value)}
          onFocus={focusOn} onBlur={focusOff} onKeyDown={onKey}
          placeholder="password"
          style={{ ...inputStyle, marginBottom: "18px" }}
        />

        {error && (
          <div style={{ fontFamily: FONT_BODY, fontSize: "13px", color: PAL.danger, letterSpacing: "0.5px", marginBottom: "14px", textShadow: `0 0 12px ${PAL.danger}66` }}>
            ✕ {error}
          </div>
        )}
        {notice && (
          <div style={{ fontFamily: FONT_BODY, fontSize: "13px", color: PAL.emerald, letterSpacing: "0.5px", marginBottom: "14px", textShadow: `0 0 12px ${PAL.emerald}66` }}>
            ◇ {notice}
          </div>
        )}

        <Btn onClick={submit} color={PAL.cyan} full disabled={loading} glow={!loading}>
          {loading ? "◇ LINKING ◇" : isSignup ? "CREATE ACCOUNT" : "SIGN IN"}
        </Btn>

        <div style={{ marginTop: "18px", textAlign: "center" }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: "11px", color: PAL.inkDim, letterSpacing: "1px" }}>
            {isSignup ? "Already have access?" : "No account yet?"}
          </span>
          <button
            onClick={() => { setMode(isSignup ? "signin" : "signup"); setError(""); setNotice(""); }}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              fontFamily: FONT_DISPLAY, fontSize: "11px", fontWeight: 600,
              color: PAL.cyan, letterSpacing: "2px", marginLeft: "8px",
              textShadow: `0 0 10px ${PAL.cyan}66`,
            }}
          >{isSignup ? "SIGN IN" : "SIGN UP"}</button>
        </div>
      </Panel>

      <div style={{ marginTop: "24px", fontFamily: FONT_MONO, fontSize: "10px", color: PAL.inkFaint, letterSpacing: "2px" }}>
        v4.0 // cloud sync active
      </div>
    </div>
  );
}

// Offered once when a user signs into a fresh cloud account while legacy
// localStorage data from a pre-cloud session still exists on this device.
function MigrationModal({ data, onUpload, onSkip }) {
  const count = data?.games?.length || 0;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.82)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
    }}>
      <Panel glow={PAL.amber} pulse style={{ padding: "28px 24px", width: "100%", maxWidth: "380px" }}>
        <Label color={PAL.amber}>◇ Local Save Detected</Label>
        <div style={{ fontFamily: FONT_BODY, fontSize: "15px", color: PAL.ink, fontWeight: 300, lineHeight: 1.5, marginBottom: "8px" }}>
          Found {count} game{count === 1 ? "" : "s"} saved on this device from before you had an account.
        </div>
        <div style={{ fontFamily: FONT_BODY, fontSize: "14px", color: PAL.inkDim, fontWeight: 300, lineHeight: 1.5, marginBottom: "20px" }}>
          Upload them to your cloud account so they sync across your devices?
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <Btn onClick={onUpload} color={PAL.emerald} full glow>UPLOAD TO CLOUD</Btn>
          <Btn onClick={onSkip} color={PAL.inkDim} full size="sm">START FRESH</Btn>
        </div>
      </Panel>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = checking, null = logged out
  const [migrateOffer, setMigrateOffer] = useState(null);
  const [booted, setBooted] = useState(false);
  const [phase, setPhase] = useState("onboard");
  const [profile, setProfile] = useState({});
  const [games, setGames] = useState([]);
  const [tab, setTab] = useState("queue");
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Audiowide&family=Michroma&family=Orbitron:wght@400;500;600;700&family=Rajdhani:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap";
    document.head.appendChild(link);
    // Inject scrollbar-hide CSS for the carousels
    const style = document.createElement("style");
    style.textContent = `
      .hide-scrollbar::-webkit-scrollbar { display: none; }
      .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    `;
    document.head.appendChild(style);
    document.body.style.background = PAL.void;
    document.body.style.margin = "0";
  }, []);

  // Track the Supabase auth session. `session === undefined` means we're still
  // checking; `null` means signed out (show AuthScreen); an object means signed in.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Whenever the signed-in user changes, load their cloud queue. On sign-out,
  // wipe in-memory state so the next account never sees the previous one's data.
  const userId = session?.user?.id ?? null;
  useEffect(() => {
    if (session === undefined) return; // auth still resolving
    if (!userId) {
      setBooted(false);
      setProfile({}); setGames([]); setPhase("onboard");
      setMigrateOffer(null); setTab("queue");
      return;
    }
    let cancelled = false;
    setBooted(false);
    (async () => {
      const cloud = await loadCloud(userId);
      if (cancelled) return;
      if (cloud && (cloud.profile?.name || cloud.games?.length)) {
        setProfile(cloud.profile || {});
        setGames(cloud.games || []);
        setPhase("app");
      } else {
        // Empty cloud account — offer to import any legacy local save.
        const local = loadLocalState();
        if (local && (local.profile?.name || local.games?.length)) setMigrateOffer(local);
        setProfile({}); setGames([]); setPhase("onboard");
      }
      setBooted(true);
    })();
    return () => { cancelled = true; };
  }, [session, userId]);

  // Persist to the cloud on change. Guarded on `booted` so the initial load
  // (which briefly holds empty state) can never overwrite the real cloud row.
  useEffect(() => {
    if (!booted || phase !== "app" || !userId) return;
    saveCloud(userId, { profile, games });
  }, [profile, games, phase, booted, userId]);

  const finishOnboard = ({ profile: p, games: g }) => { setProfile(p); setGames(g); setPhase("app"); };
  const importSeed = () => {
    setProfile({ name: "PLAYER 1", genres: ["Platformer", "RPG", "Action/Adventure"], consoles: ["nintendo64", "switch", "handheld", "emulator"], createdAt: Date.now() });
    setGames(SEED_GAMES.map(g => ({ ...g, id: uid() })));
    setPhase("app");
  };
  const updateGame = useCallback((u) => { setGames(prev => prev.map(g => g.id === u.id ? u : g)); if (selected?.id === u.id) setSelected(u); }, [selected]);
  const quickToggle = useCallback((id, p) => setGames(prev => prev.map(g => g.id === id ? { ...g, ...p } : g)), []);
  const deleteGame = useCallback((id) => setGames(prev => prev.filter(g => g.id !== id)), []);
  const addGame = useCallback((g) => setGames(prev => [g, ...prev]), []);
  // Receives a list of {id, queueOrder} updates from the drag-reorder UI
  const reorderQueue = useCallback((updates) => {
    setGames(prev => prev.map(g => {
      const u = updates.find(x => x.id === g.id);
      return u ? { ...g, queueOrder: u.queueOrder } : g;
    }));
  }, []);
  // "Reset all data" — empties the cloud row but keeps the user signed in.
  const resetAll = async () => { if (userId) await clearCloud(userId); setProfile({}); setGames([]); setPhase("onboard"); };
  const updateProfile = useCallback((patch) => setProfile(prev => ({ ...prev, ...patch })), []);
  const logout = async () => { await supabase.auth.signOut(); };

  const acceptMigration = () => {
    const local = migrateOffer;
    setMigrateOffer(null);
    if (!local) return;
    setProfile(local.profile || {});
    setGames(local.games || []);
    setPhase("app"); // triggers the save effect → pushes to cloud
  };
  const declineMigration = () => setMigrateOffer(null);

  // Auth is still resolving, or we're signed in but the queue hasn't loaded yet.
  const showBooting = session === undefined || (session && !booted);

  return (
    <>
      <Starfield />
      {session === null ? (
        <AuthScreen />
      ) : showBooting ? (
        <div style={{ minHeight: "100vh", color: PAL.cyan, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_DISPLAY, fontSize: "12px", letterSpacing: "4px", position: "relative", zIndex: 1 }}>◇ SYNCING ◇</div>
      ) : phase === "onboard" ? (
        <Onboarding onDone={finishOnboard} onImport={importSeed} />
      ) : (
        <div style={{ minHeight: "100vh", color: PAL.ink, fontFamily: FONT_BODY, maxWidth: "1000px", margin: "0 auto", position: "relative", zIndex: 1, paddingBottom: "20px" }}>
          <StatusBar profile={profile} games={games} />
          <div style={{ minHeight: "calc(100vh - 130px)" }}>
            {tab === "lib" && <LibraryTab games={games} onClick={setSelected} onToggle={quickToggle} />}
            {tab === "queue" && <QueueTab games={games} onClick={setSelected} onToggle={quickToggle} onReorder={reorderQueue} />}
            {tab === "stats" && <StatsTab games={games} />}
            {tab === "profile" && <ProfileTab profile={profile} games={games} onReset={resetAll} onUpdateProfile={updateProfile} onLogout={logout} email={session?.user?.email} />}
          </div>
          <TabBar tab={tab} setTab={setTab} onAdd={() => setShowAdd(true)} />
          {selected && <GameModal game={selected} onClose={() => setSelected(null)} onUpdate={updateGame} onDelete={deleteGame} />}
          {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={addGame} existingGames={games} />}
        </div>
      )}
      {session && migrateOffer && (
        <MigrationModal data={migrateOffer} onUpload={acceptMigration} onSkip={declineMigration} />
      )}
    </>
  );
}
