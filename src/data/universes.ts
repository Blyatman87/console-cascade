import type { Universe } from '../types/models';

export const UNIVERSE_1: Universe = {
  id: 'u1_cartridge_dawn',
  index: 1,
  name: 'Cartridge Dawn',
  eraLabel: 'Cartridge Dawn Era',
  description:
    'The first cascade of glowing phosphor nights. Homage to the living-room cartridge boom — jungle digs, invader skies, and a maze that hungers.',
  themeId: 'cartridge_dawn',
  unlocked: true,
  levels: [
    {
      id: 'u1_l1',
      index: 1,
      title: 'Dig-Site Jungle Canopy',
      storyBlurb:
        'Vines drip over a half-buried console dig. Clear the canopy debris before the vines reclaim the board.',
      startLevel: 0,
      targetLines: 8,
      garbageRows: 0,
      disruption: 'none',
      rewardCartridges: 25,
    },
    {
      id: 'u1_l2',
      index: 2,
      title: 'Invader Barrage Sky',
      storyBlurb:
        'Pixel silhouettes blot the stars. Survive the barrage — rows will rain if you linger.',
      startLevel: 1,
      targetLines: 10,
      garbageRows: 1,
      disruption: 'garbage_rain',
      rewardCartridges: 30,
    },
    {
      id: 'u1_l3',
      index: 3,
      title: 'Drifting Rock Belt',
      storyBlurb:
        'Spinning stones tumble through the void. Timing is everything when gravity spikes without warning.',
      startLevel: 2,
      targetLines: 10,
      garbageRows: 0,
      disruption: 'speed_spikes',
      rewardCartridges: 35,
    },
    {
      id: 'u1_l4',
      index: 4,
      title: 'Brick-Wall Rally',
      storyBlurb:
        'A wall of bricks dares you to break through. Smash lines like paddles against phosphor glass.',
      startLevel: 2,
      targetLines: 12,
      garbageRows: 3,
      disruption: 'none',
      rewardCartridges: 40,
    },
    {
      id: 'u1_l5',
      index: 5,
      title: 'Silo Defense Grid',
      storyBlurb:
        'Incoming trails light the sky. Defend the silo — garbage rain intensifies under pressure.',
      startLevel: 3,
      targetLines: 12,
      garbageRows: 2,
      disruption: 'garbage_rain',
      rewardCartridges: 45,
    },
    {
      id: 'u1_l6',
      index: 6,
      title: 'Dustbowl Combat Yard',
      storyBlurb:
        'Two tanks, one dusty yard, endless ricochets. Mirror fields scramble your edges.',
      startLevel: 3,
      targetLines: 14,
      garbageRows: 1,
      disruption: 'mirror_field',
      rewardCartridges: 50,
    },
    {
      id: 'u1_l7',
      index: 7,
      title: 'Adventure Castle Crypt',
      storyBlurb:
        'Keys, dragons, and a castle that remembers every wrong turn. Dig deep through the crypt rows.',
      startLevel: 4,
      targetLines: 14,
      garbageRows: 4,
      disruption: 'none',
      rewardCartridges: 55,
    },
    {
      id: 'u1_l8',
      index: 8,
      title: 'Canyon River Run',
      storyBlurb:
        'A river of light races through canyon walls. Speed spikes threaten every soft drop.',
      startLevel: 5,
      targetLines: 15,
      garbageRows: 2,
      disruption: 'speed_spikes',
      rewardCartridges: 60,
    },
    {
      id: 'u1_l9',
      index: 9,
      title: 'Fly-Swatter Grid',
      storyBlurb:
        'A restless grid hums with revenge energy. Clear the swatter zone before it clears you.',
      startLevel: 5,
      targetLines: 16,
      garbageRows: 3,
      disruption: 'garbage_rain',
      rewardCartridges: 70,
    },
    {
      id: 'u1_l10',
      index: 10,
      title: 'Segment Garden Crawl',
      storyBlurb:
        'Segmented garden pests weave through the beds. One last crawl before the Maw awakens.',
      startLevel: 6,
      targetLines: 18,
      garbageRows: 3,
      disruption: 'speed_spikes',
      rewardCartridges: 80,
    },
  ],
  boss: {
    id: 'u1_boss',
    name: 'Maw of the Maze',
    title: 'End Boss — Maw of the Maze',
    storyBlurb:
      'The maze opens its mouth. Walls close in, gravity surges, and garbage spills from every corridor. Clear 25 lines across hardening phases to silence the Maw.',
    phases: 3,
    startLevel: 7,
  },
};

export const UNIVERSES: Universe[] = [UNIVERSE_1];
