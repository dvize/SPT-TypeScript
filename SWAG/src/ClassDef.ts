import { BossLocationSpawn, WildSpawnType } from "@spt-aki/models/eft/common/ILocationBase";

export interface SWAGConfig {
	aiDifficulty: "normal" | "easy" | "hard" | "impossible" | "random";
	aiAmount: "low" | "asonline" | "medium" | "high" | "horde";
	RandomWaveCount: number;
	BossWaveCount: number;
	SkipOtherBossWavesIfBossWaveSelected: boolean;
	WaveTimerMinSec: number;
	WaveTimerMaxSec: number;
	maxBotCap: {
	  factory: number;
	  customs: number;
	  woods: number;
	  shoreline: number;
	  lighthouse: number;
	  reservebase: number;
	  interchange: number;
	  laboratory: number;
	  tarkovstreets: number;
	};
	maxBotPerZone: number;
	UseDefaultSpawns: {
	  Waves: boolean;
	  Bosses: boolean;
	  TriggeredWaves: boolean;
	};
	DebugOutput: boolean;
  }
  
  export class Wave {
	number: number;
	time_min: number;
	time_max: number;
	slots_min: number;
	slots_max: number;
	SpawnPoints: string; // always botZone
	BotSide: string; //Savage
	BotPreset: string; //easy, hard
	WildSpawnType: WildSpawnType; // assault
	isPlayers: boolean;
  
	constructor() {}
  }
  
  export interface BossPattern extends BossLocationSpawn {
	OnlySpawnOnce?: boolean;
  }
  
  export class Bot {
	BotType: string;
	MaxBotCount: number;
  }
  
  export class GroupPattern {
	Name: string;
	Bots: Bot[];
	Time_min: number;
	Time_max: number;
	BotZone: string;
	RandomTimeSpawn?: boolean;
	OnlySpawnOnce?: boolean;
  }
  
  export class MapWrapper {
	MapName: string;
	MapGroups: GroupPattern[];
	MapBosses: BossPattern[];
  }
  
  export class SpawnPointParam {
	Id: string;
	Position: Position;
	Rotation: number;
	Sides: string[];
	Categories: string[];
	Infiltration: string;
	DelayToCanSpawnSec: number;
	ColliderParams: ColliderParams;
	BotZoneName: string;
  }
  
  export class Position {
	x: number;
	y: number;
	z: number;
  }
  
  export class ColliderParams {
	_parent: string;
	_props: Props;
  }
  
  export class Center {
	x: number;
	y: number;
	z: number;
  }
  
  export class Props {
	Center: Center;
	Radius: number;
  }
  