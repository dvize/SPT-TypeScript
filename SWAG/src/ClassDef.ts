export class Wave {
	number: number;
	time_min: number;
	time_max: number;
	slots_min: number;
	slots_max: number;
	SpawnPoints: string; // always botZone
	BotSide: string; //Savage
	BotPreset: string; //easy, hard
	WildSpawnType: string; // assault
	isPlayers: boolean;

	constructor() {

	}

}

export class BossWave {
	BossName: string;
    BossChance: number;
    BossZone: string;
    BossPlayer: boolean;
    BossDifficult: string;
	BossEscortType: string;
	BossEscortDifficult: string;
	BossEscortAmount: string;
	Time: number;  //default -1 for instant?
	// TriggerId: string;
	// TriggerName: string;
	Supports: BossSupport[];
    RandomTimeSpawn: boolean; // default false
    OnlySpawnOnce: boolean;

	constructor() {
	}
}

export class BossSupport {
	BossEscortType: string;
	BossEscortDifficult: string[];
	BossEscortAmount: number;

	constructor(BossEscortType, BossEscortDifficult, BossEscortAmount) {
		this.BossEscortType = BossEscortType;
		this.BossEscortDifficult = BossEscortDifficult;
		this.BossEscortAmount = BossEscortAmount;
	}
}

export class Bot 
{
	BotType: string;
	MaxBotCount: number;
}

export class GroupPattern 
{
	Name: string;
	Bots: Bot[];
	Time_min: number;
	Time_max: number;
	RandomTimeSpawn: boolean;
	OnlySpawnOnce: boolean;
	BotZone: string;
}

export class MapWrapper
{
	MapName: string;
	MapGroups: GroupPattern[];
    MapBosses: BossWave[];
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

    