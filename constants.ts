
import { SportType, PlayerRole, AuctionConfig, AuctionType, Player, Team } from './types';

export const SPORT_DEFAULTS: Record<SportType, Partial<AuctionConfig>> = {
  [SportType.CRICKET]: {
    squadSize: { min: 18, max: 25 },
    totalBudget: 100000000, // 100 Crore
    roles: [
      { id: 'bat', name: 'Batsman' },
      { id: 'bowl', name: 'Bowler' },
      { id: 'ar', name: 'All-Rounder' },
      { id: 'wk', name: 'Wicket-Keeper' }
    ],
    rules: { overseasLimit: 8 }
  },
  [SportType.KABADDI]: {
    squadSize: { min: 15, max: 20 },
    totalBudget: 50000000,
    roles: [
      { id: 'raider', name: 'Raider' },
      { id: 'defender', name: 'Defender' },
      { id: 'ar', name: 'All-Rounder' }
    ]
  },
  [SportType.FOOTBALL]: {
    squadSize: { min: 20, max: 30 },
    totalBudget: 80000000,
    roles: [
      { id: 'fwd', name: 'Forward' },
      { id: 'mid', name: 'Midfielder' },
      { id: 'def', name: 'Defender' },
      { id: 'gk', name: 'Goalkeeper' }
    ]
  },
  [SportType.ESPORTS]: {
    squadSize: { min: 5, max: 8 },
    totalBudget: 1000000,
    roles: [
      { id: 'igl', name: 'IGL' },
      { id: 'fragger', name: 'Entry Fragger' },
      { id: 'support', name: 'Support' },
      { id: 'sniper', name: 'Sniper' }
    ]
  },
  [SportType.CUSTOM]: {
    squadSize: { min: 1, max: 100 },
    totalBudget: 1000000,
    roles: [{ id: 'player', name: 'Player' }]
  }
};

export const INITIAL_CONFIG: AuctionConfig = {
  sport: SportType.CRICKET,
  type: AuctionType.OPEN,
  level: 'Professional',
  squadSize: { min: 18, max: 25 },
  totalBudget: 100000000,
  roles: SPORT_DEFAULTS[SportType.CRICKET].roles || [],
  rules: { overseasLimit: 8 }
};

export const MOCK_TEAMS: Team[] = [
  {
    id: 't1',
    name: 'Mumbai Titans',
    logo: 'https://images.unsplash.com/photo-1599305090598-fe179d501227?auto=format&fit=crop&q=80&w=200&h=200',
    budget: 100000000,
    remainingBudget: 100000000,
    players: [],
    owner: 'Reliance Sports Group',
    homeCity: 'Mumbai',
    foundationYear: 2008
  },
  {
    id: 't2',
    name: 'Bangalore Royals',
    logo: 'https://images.unsplash.com/photo-1599305090598-fe179d501227?auto=format&fit=crop&q=80&w=200&h=200',
    budget: 100000000,
    remainingBudget: 100000000,
    players: [],
    owner: 'United Spirits',
    homeCity: 'Bengaluru',
    foundationYear: 2008
  },
  {
    id: 't3',
    name: 'Chennai Super Kings',
    logo: 'https://images.unsplash.com/photo-1599305090598-fe179d501227?auto=format&fit=crop&q=80&w=200&h=200',
    budget: 100000000,
    remainingBudget: 100000000,
    players: [],
    owner: 'India Cements',
    homeCity: 'Chennai',
    foundationYear: 2008
  },
  {
    id: 't4',
    name: 'Delhi Capitals',
    logo: 'https://images.unsplash.com/photo-1599305090598-fe179d501227?auto=format&fit=crop&q=80&w=200&h=200',
    budget: 100000000,
    remainingBudget: 100000000,
    players: [],
    owner: 'GMR & JSW',
    homeCity: 'New Delhi',
    foundationYear: 2008
  }
];

export const MOCK_PLAYERS: Player[] = [
  {
    id: 'p1',
    name: 'Virat Kohli',
    roleId: 'bat',
    basePrice: 20000000,
    isOverseas: false,
    status: 'PENDING',
    age: 35,
    nationality: 'Indian',
    bio: 'Modern day legend. Highest century maker in ODIs.',
    stats: '80 Centuries, 13000+ Runs, Avg 58.6',
    imageUrl: 'https://images.unsplash.com/photo-1512719994953-eabf50895df7?auto=format&fit=crop&q=80&w=400&h=400'
  },
  {
    id: 'p2',
    name: 'Ben Stokes',
    roleId: 'ar',
    basePrice: 15000000,
    isOverseas: true,
    status: 'PENDING',
    age: 32,
    nationality: 'English',
    bio: 'Premier all-rounder. Match winner in clutch situations.',
    stats: '6000+ Runs, 200+ Wickets, WC Winner',
    imageUrl: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=400&h=400'
  },
  {
    id: 'p3',
    name: 'Rashid Khan',
    roleId: 'bowl',
    basePrice: 12000000,
    isOverseas: true,
    status: 'PENDING',
    age: 25,
    nationality: 'Afghan',
    bio: 'World class leg spinner. T20 specialist.',
    stats: '500+ T20 Wickets, Eco 6.4',
    imageUrl: 'https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?auto=format&fit=crop&q=80&w=400&h=400'
  },
  {
    id: 'p4',
    name: 'Jasprit Bumrah',
    roleId: 'bowl',
    basePrice: 20000000,
    isOverseas: false,
    status: 'PENDING',
    age: 30,
    nationality: 'Indian',
    bio: 'Unique action, deadly yorkers. Best death bowler.',
    stats: '350+ Wickets, Eco 4.5 in ODIs',
    imageUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80&w=400&h=400'
  },
  {
    id: 'p5',
    name: 'Kylian Mbappé',
    roleId: 'fwd',
    basePrice: 50000000,
    isOverseas: true,
    status: 'PENDING',
    age: 25,
    nationality: 'French',
    bio: 'World Cup winner. Blistering pace and clinical finish.',
    stats: '250+ Career Goals, 3x Ligue 1 POTY',
    imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=400&h=400'
  }
];
