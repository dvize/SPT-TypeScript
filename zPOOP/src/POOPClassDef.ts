import {Difficulties} from '@spt-aki/models/eft/common/tables/IBotType';

export interface POOPConfig {
	EnableAutomaticDifficulty: boolean;
    EnableLegendaryPlayerMode: boolean;
    AIChanges:{
        ChanceChangeScavToNewRole: number;
        ScavAlternateRolesAllowed: string[];
        RoguesNeutralToUsecs: boolean;
        AllowHealthTweaks:{
            Enabled: boolean;
            Multipliers:
            {
                PMCHealthMult: number;
                ScavHealthMult: number;
                RaiderHealthMult: number;
                BossHealthMult: number;
                CultistHealthMult: number;
            }
        }
        AllowBotsToTalk: {
            Scavs: boolean;
            Raiders: boolean;
            PMCs: boolean;
            Bosses: boolean;
            Rogues: boolean;
            Followers: boolean;
        }
    }
    Difficulty:{
        OverallDifficultyModifier: number;
        Multipliers:{
            AimSpeedMult: number;
            ShotSpreadMult: number;
            VisionSpeedMult: number;
            AccuracyMult: number;
            SniperBotAccuracyMult: number;
            VisibleDistanceMult: number;
            SemiAutoFireRateMult: number;
            RecoilMult: number;
            HearingMult: number;
            VisibleAngleMult: number;
            VisibleAngleMax: number;
            GrenadePrecisionMult: number;
            GrenadeThrowRangeMax: number;
            AllowAimAtHead: true;
            AllowGrenades: true;
        }
    }
	
	DebugOutput: boolean;
  }
  
  export interface AITemplate {
	RoleTypes: string[];
    AIDifficultyModifier: number;
    difficulty: Difficulties;
  }
  
  export const RoleCase: Record<string, string> = {
    assault: "assault",
    exusec: "exUsec",
    marksman: "marksman",
    pmcbot: "pmcBot",
    sectantpriest: "sectantPriest",
    sectantwarrior: "sectantWarrior",
    assaultgroup: "assaultGroup",
    bossbully: "bossBully",
    bosstagilla: "bossTagilla",
    bossgluhar: "bossGluhar",
    bosskilla: "bossKilla",
    bosskojaniy: "bossKojaniy",
    bosssanitar: "bossSanitar",
    followerbully: "followerBully",
    followergluharassault: "followerGluharAssault",
    followergluharscout: "followerGluharScout",
    followergluharsecurity: "followerGluharSecurity",
    followergluharsnipe: "followerGluharSnipe",
    followerkojaniy: "followerKojaniy",
    followersanitar: "followerSanitar",
    followertagilla: "followerTagilla",
    cursedassault: "cursedAssault",
    usec: "usec",
    bear: "bear",
    sptbear: "sptBear",
    sptusec: "sptUsec",
    bosstest: "bossTest",
    followertest: "followerTest",
    gifter: "gifter",
    bossknight: "bossKnight",
    followerbigpipe: "followerBigPipe",
    followerbirdeye: "followerBirdEye",
    bosszryachiy: "bossZryachiy",
    followerzryachiy: "followerZryachiy",
};


export const PmcTypes: string[] = [
    "sptbear",
    "sptusec",
    "assaultgroup"
]

export const RaiderTypes: string[] = [
    "pmcbot"
]

export const RogueTypes: string[] = [
    "exusec"
]

export const ScavTypes: string[] = [
    "assault",
    "cursedassault",
    "marksman"
]

export const BossTypes: string[] = [
    "sectantpriest",
    "sectantwarrior",
    "bossbully",
    "bosstagilla",
    "bossgluhar",
    "bosskilla",
    "bosskojaniy",
    "bosssanitar",
    "bossknight",
    "bosszryachiy"
]

export const FollowerTypes: string[] = [
    "followerbully",
    "followergluharassault",
    "followergluharscout",
    "followergluharsecurity",
    "followergluharsnipe",
    "followerkojaniy",
    "followersanitar",
    "followertagilla",
    "followerbigpipe",
    "followerbirdeye",
    "followerzryachiy"
]

export const LocationNames: string[] = [
    "interchange", 
    "bigmap", 
    "rezervbase", 
    "woods", 
    "shoreline", 
    "laboratory", 
    "lighthouse", 
    "factory4_day", 
    "factory4_night", 
    "tarkovstreets"
]
  