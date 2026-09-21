import { Artifact } from "../types";

export const defaultArtifacts: Artifact[] = [
  {
    id: "art-1",
    title: "The Genesis of GoblinCoin",
    type: "lore",
    description: "The sacred parchment tracing the minting of the first underground peer currency.",
    content: `# The Genesis of GoblinCoin

In the subterranean depths beneath the abandoned silicon foundries, the cave dwellers forged the first **GoblinCoin**.

Unlike the inflated tokens of the surface dwellers, GoblinCoin is backed entirely by:
1. **Raw Scavenged Copper**: Retrieved from decommissioned server racks.
2. **Subterranean Consensus**: Verified by peer cackles in echoing cavern chambers.
3. **Cave Equity**: Zero royalty, infinite laughter, and complete underground autonomy.

> "A surface dweller counts paper profits; a goblin counts shiny trinkets that survive a cave-in." — Elder Grumbletooth

GoblinCoin powers the hidden barter economy of the underground vaults, traded for rare moss rations, glowing fungus spores, and overclocked microchips.`,
    tags: ["goblincoin", "origin", "economy", "cave-lore"],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    sizeKb: 1.8
  },
  {
    id: "art-2",
    title: "Bioluminescent Cavern Matrix",
    type: "art",
    description: "Visual schematic of the fluorescent fungal networks lighting sector 9.",
    content: `A visual cartographic study documenting the radiant emerald fungus *Chlorociboria subterrania* growing along damp conduit walls. This bioluminescence provides low-frequency illumination that is invisible to surface drone sensors but guides goblin foragers through deep fault tunnels.`,
    imageUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><defs><linearGradient id='bg' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%23020606'/><stop offset='100%' stop-color='%23061912'/></linearGradient><radialGradient id='glow' cx='50%' cy='50%' r='50%'><stop offset='0%' stop-color='%2310b981' stop-opacity='0.8'/><stop offset='50%' stop-color='%23059669' stop-opacity='0.3'/><stop offset='100%' stop-color='%23000000' stop-opacity='0'/></radialGradient><filter id='fuzz'><feTurbulence type='fractalNoise' baseFrequency='0.04' numOctaves='3' result='noise'/><feDisplacementMap in='SourceGraphic' in2='noise' scale='8'/></filter></defs><rect width='600' height='400' fill='url(%23bg)'/><circle cx='300' cy='200' r='180' fill='url(%23glow)'/><g stroke='%2334d399' stroke-width='1.5' fill='none' opacity='0.75'><path d='M100,320 Q200,180 300,210 T500,120' filter='url(%23fuzz)'/><path d='M80,120 Q250,260 380,180 T540,300' filter='url(%23fuzz)'/><circle cx='300' cy='210' r='8' fill='%2310b981'/><circle cx='200' cy='180' r='5' fill='%23a7f3d0'/><circle cx='420' cy='160' r='6' fill='%236ee7b7'/><circle cx='150' cy='280' r='4' fill='%2310b981'/><circle cx='480' cy='220' r='7' fill='%2334d399'/></g><text x='30' y='370' fill='%2334d399' font-family='monospace' font-size='12' letter-spacing='2'>[SECTOR_9 // RADIANT_MYCELIUM_MAP]</text><text x='480' y='370' fill='%23059669' font-family='monospace' font-size='10'>LAT: -842m</text></svg>",
    tags: ["art", "cavern", "mycelium", "glow"],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    sizeKb: 4.2
  },
  {
    id: "art-3",
    title: "The Underdweller's Peer Manifesto",
    type: "document",
    description: "The fundamental rules of goblin coexistence and equal camaraderie.",
    content: `# The Underdweller's Peer Manifesto

**Preamble:** We do not look down from ivory spires, nor do we worship high-altitude clouds. We dwell in the bedrock. We are peers.

### Articles of Fellowship:
- **Article I (Never Above, Never Below):** No goblin shall claim divine or oracular supremacy. We share the same damp stone.
- **Article II (The Sacred Hoard):** Every shiny piece of salvage belongs to the finder, unless exchanged for savory roasted cave crickets or fresh GoblinCoin.
- **Article III (Humor Over Protocol):** If a plan fails, cackle first, salvage second, rebuild third.
- **Article IV (Surface Distrust):** Surface dwellers build fragile glass towers; cave dwellers build enduring labyrinths.`,
    tags: ["manifesto", "peer", "rules", "society"],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    sizeKb: 1.2
  },
  {
    id: "art-4",
    title: "The Warm Cavern Geode",
    type: "relic",
    description: "A polished subterranean geode radiating a gentle warmth and soft emerald glow.",
    content: `# The Warm Cavern Geode

**Artifact Designation:** RELIC-042
**Material Composition:** Natural silicate geode, bioluminescent crystal core.

Discovered by a cooperative team of goblin foragers resting beside the underground hot springs. The geode retains geothermal warmth for days, making it the favorite communal hand-warmer during cold cavern drafts.

Passed from peer to peer during evening gatherings where goblins joke, play dice games, and admire shiny GoblinCoins.

> "True wealth isn't hoarding alone; it's passing the warm geode to your cave peer and sharing a good cackle." — Goblin Elder Wisdom`,
    tags: ["relic", "geode", "warmth", "camaraderie"],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    sizeKb: 1.5
  }
];
