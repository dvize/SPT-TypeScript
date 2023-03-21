import { Difficulties } from "@spt-aki/models/eft/common/tables/IBotType";
import { Difficulty } from "../../../Server/project/src/models/eft/common/tables/IBotType";

export interface POOPConfig {
  EnableAutomaticDifficulty: boolean;
  EnableLegendaryPlayerMode: boolean;
  AIChanges: {
    ChanceChangeScavToNewRole: number;
    ScavAlternateRolesAllowed: string[];
    RoguesNeutralToUsecs: boolean;
    AllowHealthTweaks: {
      Enabled: boolean;
      Multipliers: {
        PMCHealthMult: number;
        ScavHealthMult: number;
        RaiderHealthMult: number;
        BossHealthMult: number;
        CultistHealthMult: number;
      };
    };
    AllowBotsToTalk: {
      Scavs: boolean;
      Raiders: boolean;
      PMCs: boolean;
      Bosses: boolean;
      Rogues: boolean;
      Followers: boolean;
    };
  };
  Difficulty: {
    OverallDifficultyModifier: number;
    Multipliers: {
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
    };
  };

  DebugOutput: boolean;
}

export interface AITemplate {
  RoleTypes: string[];
  AIDifficultyModifier: number;
  difficulty: Difficulty;
}

export interface progressRecord {
  successfulConsecutiveRaids: number;
  failedConsecutiveRaids: number;
  ScoreData: ScoreData;
}

interface ScoreData {
  PlayerID: string;
  PlayerName: string;
  Level: number;
  ConsSurvived: number;
  LongestKillShot: number;
  OverallDeaths: number;
  OverallKills: number;
  OverallPedometer: number;
}

export const RoleCase: Record<string, string> = {
  assault: "assault",
  assaultgroup: "assaultGroup",
  bear: "bear",
  bossbully: "bossBully",
  bossgluhar: "bossGluhar",
  bosskilla: "bossKilla",
  bossknight: "bossKnight",
  bosskojaniy: "bossKojaniy",
  bosssanitar: "bossSanitar",
  bosstagilla: "bossTagilla",
  bosszryachiy: "bossZryachiy",
  cursedassault: "cursedAssault",
  exusec: "exUsec",
  followerbigpipe: "followerBigPipe",
  followerbirdeye: "followerBirdEye",
  followerbully: "followerBully",
  followergluharassault: "followerGluharAssault",
  followergluharscout: "followerGluharScout",
  followergluharsecurity: "followerGluharSecurity",
  followergluharsnipe: "followerGluharSnipe",
  followerkojaniy: "followerKojaniy",
  followersanitar: "followerSanitar",
  followertagilla: "followerTagilla",
  followerzryachiy: "followerZryachiy",
  gifter: "gifter",
  marksman: "marksman",
  pmcbot: "pmcBot",
  sectantpriest: "sectantPriest",
  sectantwarrior: "sectantWarrior",
  sptbear: "sptBear",
  sptusec: "sptUsec",
  usec: "usec",
};

export const PmcTypes: string[] = ["sptbear", "sptusec", "assaultgroup"];

export const RaiderTypes: string[] = ["pmcbot"];

export const RogueTypes: string[] = ["exusec"];

export const ScavTypes: string[] = ["assault", "cursedassault", "marksman"];

export const BossTypes: string[] = [
  "bossbully",
  "bossgluhar",
  "bosskilla",
  "bossknight",
  "bosskojaniy",
  "bosssanitar",
  "bosstagilla",
  "bosszryachiy",
  "sectantpriest",
  "sectantwarrior",
];

export const FollowerTypes: string[] = [
  "followerbigpipe",
  "followerbirdeye",
  "followerbully",
  "followergluharassault",
  "followergluharscout",
  "followergluharsecurity",
  "followergluharsnipe",
  "followerkojaniy",
  "followersanitar",
  "followertagilla",
  "followerzryachiy",
];

export const LocationNames: string[] = [
  "bigmap",
  "factory4_day",
  "factory4_night",
  "interchange",
  "laboratory",
  "lighthouse",
  "rezervbase",
  "shoreline",
  "tarkovstreets",
  "woods",
];
