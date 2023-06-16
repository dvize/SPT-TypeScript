import { IPmcData } from "@spt-aki/models/eft/common/IPmcData";
import { Difficulties } from "@spt-aki/models/eft/common/tables/IBotType";

export interface POOPConfig {
  EnableReplacementScavAI: boolean;
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
    ChanceSayFkUonContact: number;
  };
  Difficulty: {
    OverallDifficultyModifier: number;
    Multipliers: {
      AimSpeedMult: number;
      ShotSpreadMult: number;
      VisionSpeedMult: number;
      VisibleDistanceMult: number;
      FullAutoFireRateMult: number;
      RecoilMult: number;
      HearingMult: number;
      GrenadePrecisionMult: number;
    };
    DirectValue: {
      CanAimForHead: boolean;
      AimingType: number | string;
      AllowGrenades: boolean;
      AllowStationaryTurrets: boolean;
      PistolFireDistancePref: number;
      RifleFireDistancePref: number;
      ShotgunFireDistancePref: number;
      MAX_VISION_GRASS_METERS: number;
      VisibleAngle: number;
      GrenadeThrowRangeMax: number;
    };
  };

  DebugOutput: boolean;
}

export interface progressRecord {
  SessionID: string;
  successfulConsecutiveRaids: number;
  failedConsecutiveRaids: number;
  currentDifficulty: number;
}

export interface legendFile {
  SessionID: string;
  pmcData: IPmcData;
}

export const gameDifficulty: Record<string, number> = {
  easy: -0.5,
  normal: 0,
  hard: 1,
  impossible: 2,
};

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

export const PmcTypes: string[] = ["bear", "usec"];

export const RaiderTypes: string[] = ["pmcbot"];

export const RogueTypes: string[] = ["exusec"];

export const ScavTypes: string[] = ["assault", "cursedassault", "marksman"];

export const CultistTypes: string[] = ["sectantwarrior", "sectantpriest"];

export const assaultTypesBotGen: string[] = [
  "assaulteasy",
  "assaultnormal",
  "assaulthard",
  "cursedassaulteasy",
  "cursedassaultnormal",
  "cursedassaulthard",
  "assaultimpossible",
  "cursedassaultimpossible",
];

export const pmcTypesBotGen: string[] = [
  "sptbeareasy",
  "sptbearnormal",
  "sptbearhard",
  "sptuseceasy",
  "sptusecnormal",
  "sptusechard",
  "sptbearimpossible",
  "sptusecimpossible",
];

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

export interface CoreAITemplate {
  ARMOR_CLASS_COEF: number;
  AXE_MAN_KILLS_END: number;
  BASE_WALK_SPEREAD2: number;
  BORN_POINSTS_FREE_ONLY_FAREST_PLAYER: boolean;
  BORN_POISTS_FREE_ONLY_FAREST_BOT: boolean;
  CAN_SHOOT_TO_HEAD: boolean;
  CAN_TILT: boolean;
  CARE_ENEMY_ONLY_TIME: number;
  CHECK_BOT_INIT_TIME_SEC: number;
  CLOSE_POINTS: number;
  CLOSE_TO_WALL_ROTATE_BY_WALL_SQRT: number;
  COME_INSIDE_TIMES: number;
  CORE_POINT_MAX_VALUE: number;
  CORE_POINTS_MAX: number;
  CORE_POINTS_MIN: number;
  COUNT_TURNS: number;
  COVER_DIST_CLOSE: number;
  COVER_SECONDS_AFTER_LOSE_VISION: number;
  COVER_TOOFAR_FROM_BOSS: number;
  COVER_TOOFAR_FROM_BOSS_SQRT: number;
  DANGER_POINT_LIFE_TIME_SEC: number;
  DANGER_POWER: number;
  DEAD_AGR_DIST: number;
  DEFENCE_LEVEL_SHIFT: number;
  DELTA_GRENADE_END_TIME: number;
  DELTA_GRENADE_RUN_DIST: number;
  DELTA_GRENADE_RUN_DIST_SQRT: number;
  DELTA_GRENADE_START_TIME: number;
  DELTA_SUPRESS_DISTANCE: number;
  DELTA_SUPRESS_DISTANCE_SQRT: number;
  DIST_NOT_TO_GROUP: number;
  DIST_NOT_TO_GROUP_SQR: number;
  FLARE_POWER: number;
  FLARE_TIME: number;
  FORMUL_COEF_DELTA_DIST: number;
  FORMUL_COEF_DELTA_FRIEND_COVER: number;
  FORMUL_COEF_DELTA_SHOOT: number;
  G: number;
  GESTUS_AIMING_DELAY: number;
  GESTUS_ANYWAY_CHANCE: number;
  GESTUS_DIST_ANSWERS: number;
  GESTUS_DIST_ANSWERS_SQRT: number;
  GESTUS_FIRST_STAGE_MAX_TIME: number;
  GESTUS_FUCK_TO_SHOOT: number;
  GESTUS_MAX_ANSWERS: number;
  GESTUS_PERIOD_SEC: number;
  GESTUS_REQUEST_LIFETIME: number;
  GESTUS_SECOND_STAGE_MAX_TIME: number;
  GOOD_DIST_TO_POINT: number;
  GRENADE_PRECISION: number;
  GUNSHOT_SPREAD: number;
  GUNSHOT_SPREAD_SILENCE: number;
  HOLD_MIN_LIGHT_DIST: number;
  HOLD_REQUEST_TIME_SEC: number;
  JUMP_NOISE_DELTA: number;
  JUMP_SPREAD_DIST: number;
  LAST_DAMAGE_ACTIVE: number;
  LAST_SEEN_POS_LIFETIME: number;
  LAY_COEF: number;
  LAY_DOWN_ANG_SHOOT: number;
  LOCAL_BOTS_COUNT: number;
  LOOK_ANYSIDE_BY_WALL_SEC_OF_ENEMY: number;
  LOOK_TIMES_TO_KILL: number;
  LOWER_POSE: number;
  MAIN_TACTIC_ONLY_ATTACK: boolean;
  MAX_ARG_COEF: number;
  MAX_BASE_REQUESTS_PER_PLAYER: number;
  MAX_COME_WITH_ME_REQUESTS_PER_PLAYER: number;
  MAX_DANGER_CARE_DIST: number;
  MAX_DANGER_CARE_DIST_SQRT: number;
  MAX_DIST_TO_COV: number;
  MAX_GO_TO_REQUESTS_PER_PLAYER: number;
  MAX_HOLD_REQUESTS_PER_PLAYER: number;
  MAX_ITERATIONS: number;
  MAX_POSE: number;
  MAX_REQUESTS__PER_GROUP: number;
  MAX_WARNS_BEFORE_KILL: number;
  MAX_Y_DIFF_TO_PROTECT: number;
  MIDDLE_POINT_COEF: number;
  MIN_ARG_COEF: number;
  MIN_BLOCK_DIST: number;
  MIN_BLOCK_TIME: number;
  MIN_DIST_CLOSE_DEF: number;
  MIN_DIST_TO_RUN_WHILE_ATTACK_MOVING: number;
  MIN_DIST_TO_RUN_WHILE_ATTACK_MOVING_OTHER_ENEMIS: number;
  MIN_DIST_TO_STOP_RUN: number;
  MIN_MAX_PERSON_SEARCH: number;
  MOVE_COEF: number;
  MOVE_SPEED_COEF_MAX: number;
  MOVING_AIM_COEF: number;
  PATROL_MIN_LIGHT_DIST: number;
  PERCENT_PERSON_SEARCH: number;
  PISTOL_POWER: number;
  PRONE_POSE: number;
  RIFLE_POWER: number;
  SAVAGE_KILL_DIST: number;
  SCAV_GROUPS_TOGETHER: boolean;
  SHALL_DIE_IF_NOT_INITED: boolean;
  SHOOT_TO_CHANGE_RND_PART_DELTA: number;
  SHOOT_TO_CHANGE_RND_PART_MAX: number;
  SHOOT_TO_CHANGE_RND_PART_MIN: number;
  SHOTGUN_POWER: number;
  SIMPLE_POINT_LIFE_TIME_SEC: number;
  SIT_COEF: number;
  SMG_POWER: number;
  SMOKE_GRENADE_RADIUS_COEF: number;
  SNIPE_POWER: number;
  SOUND_DOOR_BREACH_METERS: number;
  SOUND_DOOR_OPEN_METERS: number;
  SPEED_SERV_SOUND_COEF_A: number;
  SPEED_SERV_SOUND_COEF_B: number;
  STANDART_BOT_PAUSE_DOOR: number;
  START_ACTIVE_FOLLOW_PLAYER_EVENT: boolean;
  START_ACTIVE_FORCE_ATTACK_PLAYER_EVENT: boolean;
  START_DIST_TO_COV: number;
  STAY_COEF: number;
  STAY_HEIGHT: number;
  STEP_NOISE_DELTA: number;
  SUSPETION_POINT_DIST_CHECK: number;
  TALK_DELAY: number;
  TILT_CHANCE: number;
  TOTAL_TIME_KILL: number;
  TOTAL_TIME_KILL_AFTER_WARN: number;
  TRIGGERS_DOWN_TO_RUN_WHEN_MOVE: number;
  UPDATE_GOAL_TIMER_SEC: number;
  USE_ID_PRIOR_WHO_GO: boolean;
  VERTICAL_DIST_TO_IGNORE_SOUND: number;
  WAVE_COEF_HIGH: number;
  WAVE_COEF_HORDE: number;
  WAVE_COEF_LOW: number;
  WAVE_COEF_MID: number;
  WAVE_ONLY_AS_ONLINE: boolean;
  WEAPON_ROOT_Y_OFFSET: number;
}

export interface AITemplate {
  RoleTypes: string[];
  AIDifficultyModifier: number;
  OverrideConfigMultipliers: boolean;
  difficulty: Difficulties;
}

/* export interface Difficulties {
  easy: Difficulty;
  normal: Difficulty;
  hard: Difficulty;
  impossible: Difficulty;
} */

export interface Difficulty {
  Aiming: Aiming;
  Boss: Boss;
  Change: Change;
  Core: Core;
  Cover: Cover;
  Grenade: Grenade;
  Hearing: Hearing;
  Lay: Lay;
  Look: Look;
  Mind: Mind;
  Move: Move;
  Patrol: Patrol;
  Scattering: Scattering;
  Shoot: Shoot;
}

export interface Aiming {
  AIMING_TYPE: number;
  ANY_PART_SHOOT_TIME: number;
  ANYTIME_LIGHT_WHEN_AIM_100: number;
  BASE_HIT_AFFECTION_DELAY_SEC: number;
  BASE_HIT_AFFECTION_MAX_ANG: number;
  BASE_HIT_AFFECTION_MIN_ANG: number;
  BASE_SHIEF: number;
  BASE_SHIEF_STATIONARY_GRENADE: number;
  BETTER_PRECICING_COEF: number;
  BOT_MOVE_IF_DELTA: number;
  BOTTOM_COEF: number;
  COEF_FROM_COVER: number;
  COEF_IF_MOVE: number;
  DAMAGE_PANIC_TIME: number;
  DAMAGE_TO_DISCARD_AIM_0_100: number;
  DANGER_UP_POINT: number;
  DIST_TO_SHOOT_NO_OFFSET: number;
  DIST_TO_SHOOT_TO_CENTER: number;
  FIRST_CONTACT_ADD_CHANCE_100: number;
  FIRST_CONTACT_ADD_SEC: number;
  HARD_AIM: number;
  HARD_AIM_CHANCE_100: number;
  MAX_AIM_PRECICING: number;
  MAX_AIM_TIME: number;
  MAX_AIMING_UPGRADE_BY_TIME: number;
  MAX_TIME_DISCARD_AIM_SEC: number;
  MIN_DAMAGE_TO_GET_HIT_AFFETS: number;
  MIN_TIME_DISCARD_AIM_SEC: number;
  NEXT_SHOT_MISS_CHANCE_100: number;
  NEXT_SHOT_MISS_Y_OFFSET: number;
  OFFSET_RECAL_ANYWAY_TIME: number;
  PANIC_ACCURATY_COEF: number;
  PANIC_COEF: number;
  PANIC_TIME: number;
  RECALC_DIST: number;
  RECALC_MUST_TIME: number;
  RECALC_SQR_DIST: number;
  SCATTERING_DIST_MODIF: number;
  SCATTERING_DIST_MODIF_CLOSE: number;
  SCATTERING_HAVE_DAMAGE_COEF: number;
  SHOOT_TO_CHANGE_PRIORITY: number;
  SHPERE_FRIENDY_FIRE_SIZE: number;
  TIME_COEF_IF_MOVE: number;
  WEAPON_ROOT_OFFSET: number;
  XZ_COEF: number;
  XZ_COEF_STATIONARY_GRENADE: number;
  Y_BOTTOM_OFFSET_COEF: number;
  Y_TOP_OFFSET_COEF: number;
}

export interface Boss {
  BOSS_DIST_TO_SHOOT: number;
  BOSS_DIST_TO_SHOOT_SQRT: number;
  BOSS_DIST_TO_WARNING: number;
  BOSS_DIST_TO_WARNING_OUT: number;
  BOSS_DIST_TO_WARNING_OUT_SQRT: number;
  BOSS_DIST_TO_WARNING_SQRT: number;
  CHANCE_TO_SEND_GRENADE_100: number;
  CHANCE_USE_RESERVE_PATROL_100: number;
  COVER_TO_SEND: boolean;
  DELTA_SEARCH_TIME: number;
  KILLA_AFTER_GRENADE_SUPPRESS_DELAY: number;
  KILLA_BULLET_TO_RELOAD: number;
  KILLA_CLOSE_ATTACK_DIST: number;
  KILLA_CLOSEATTACK_DELAY: number;
  KILLA_CLOSEATTACK_TIMES: number;
  KILLA_CONTUTION_TIME: number;
  KILLA_DEF_DIST_SQRT: number;
  KILLA_DIST_TO_GO_TO_SUPPRESS: number;
  KILLA_DITANCE_TO_BE_ENEMY_BOSS: number;
  KILLA_ENEMIES_TO_ATTACK: number;
  KILLA_HOLD_DELAY: number;
  KILLA_LARGE_ATTACK_DIST: number;
  KILLA_MIDDLE_ATTACK_DIST: number;
  KILLA_ONE_IS_CLOSE: number;
  KILLA_SEARCH_METERS: number;
  KILLA_SEARCH_SEC_STOP_AFTER_COMING: number;
  KILLA_START_SEARCH_SEC: number;
  KILLA_TRIGGER_DOWN_DELAY: number;
  KILLA_WAIT_IN_COVER_COEF: number;
  KILLA_Y_DELTA_TO_BE_ENEMY_BOSS: number;
  MAX_DIST_COVER_BOSS: number;
  MAX_DIST_COVER_BOSS_SQRT: number;
  MAX_DIST_DECIDER_TO_SEND: number;
  MAX_DIST_DECIDER_TO_SEND_SQRT: number;
  PERSONS_SEND: number;
  SHALL_WARN: boolean;
  TIME_AFTER_LOSE: number;
  TIME_AFTER_LOSE_DELTA: number;
  WAIT_NO_ATTACK_SAVAGE: number;
}

export interface Change {
  FLASH_ACCURATY: number;
  FLASH_GAIN_SIGHT: number;
  FLASH_HEARING: number;
  FLASH_LAY_CHANCE: number;
  FLASH_PRECICING: number;
  FLASH_SCATTERING: number;
  FLASH_VISION_DIST: number;
  SMOKE_ACCURATY: number;
  SMOKE_GAIN_SIGHT: number;
  SMOKE_HEARING: number;
  SMOKE_LAY_CHANCE: number;
  SMOKE_PRECICING: number;
  SMOKE_SCATTERING: number;
  SMOKE_VISION_DIST: number;
  STUN_HEARING: number;
}

export interface Core {
  AccuratySpeed: number;
  AimingType: string;
  CanGrenade: boolean;
  CanRun: boolean;
  DamageCoeff: number;
  GainSightCoef: number;
  HearingSense: number;
  PistolFireDistancePref: number;
  RifleFireDistancePref: number;
  ScatteringClosePerMeter: number;
  ScatteringPerMeter: number;
  ShotgunFireDistancePref: number;
  VisibleAngle: number;
  VisibleDistance: number;
  WaitInCoverBetweenShotsSec: number;
}

export interface Cover {
  CHANGE_RUN_TO_COVER_SEC: number;
  CHANGE_RUN_TO_COVER_SEC_GREANDE: number;
  CHECK_COVER_ENEMY_LOOK: boolean;
  CLOSE_DIST_POINT_SQRT: number;
  DELTA_SEEN_FROM_COVE_LAST_POS: number;
  DEPENDS_Y_DIST_TO_BOT: boolean;
  DIST_CANT_CHANGE_WAY: number;
  DIST_CANT_CHANGE_WAY_SQR: number;
  DIST_CHECK_SFETY: number;
  DOG_FIGHT_AFTER_LEAVE: number;
  ENEMY_DIST_TO_GO_OUT: number;
  GOOD_DIST_TO_POINT_COEF: number;
  HIDE_TO_COVER_TIME: number;
  HITS_TO_LEAVE_COVER: number;
  HITS_TO_LEAVE_COVER_UNKNOWN: number;
  LOOK_LAST_ENEMY_POS_LOOKAROUND: number;
  LOOK_LAST_ENEMY_POS_MOVING: number;
  LOOK_TO_HIT_POINT_IF_LAST_ENEMY: number;
  MAX_DIST_OF_COVER: number;
  MAX_DIST_OF_COVER_SQR: number;
  MAX_SPOTTED_TIME_SEC: number;
  MIN_DEFENCE_LEVEL: number;
  MIN_DIST_TO_ENEMY: number;
  MOVE_TO_COVER_WHEN_TARGET: boolean;
  NOT_LOOK_AT_WALL_IS_DANGER: boolean;
  OFFSET_LOOK_ALONG_WALL_ANG: number;
  RETURN_TO_ATTACK_AFTER_AMBUSH_MAX: number;
  RETURN_TO_ATTACK_AFTER_AMBUSH_MIN: number;
  RUN_COVER_IF_CAN_AND_NO_ENEMIES: boolean;
  RUN_IF_FAR: number;
  RUN_IF_FAR_SQRT: number;
  SHOOT_NEAR_SEC_PERIOD: number;
  SHOOT_NEAR_TO_LEAVE: number;
  SOUND_TO_GET_SPOTTED: number;
  SPOTTED_COVERS_RADIUS: number;
  SPOTTED_GRENADE_RADIUS: number;
  SPOTTED_GRENADE_TIME: number;
  STATIONARY_WEAPON_MAX_DIST_TO_USE: number;
  STATIONARY_WEAPON_NO_ENEMY_GETUP: number;
  STAY_IF_FAR: number;
  STAY_IF_FAR_SQRT: number;
  TIME_CHECK_SAFE: number;
  TIME_TO_MOVE_TO_COVER: number;
  WAIT_INT_COVER_FINDING_ENEMY: number;
}

export interface CoreAITemplate {
  ARMOR_CLASS_COEF: number;
  AXE_MAN_KILLS_END: number;
  BASE_WALK_SPEREAD2: number;
  BORN_POINSTS_FREE_ONLY_FAREST_PLAYER: boolean;
  BORN_POISTS_FREE_ONLY_FAREST_BOT: boolean;
  CAN_SHOOT_TO_HEAD: boolean;
  CAN_TILT: boolean;
  CARE_ENEMY_ONLY_TIME: number;
  CHECK_BOT_INIT_TIME_SEC: number;
  CLOSE_POINTS: number;
  CLOSE_TO_WALL_ROTATE_BY_WALL_SQRT: number;
  COME_INSIDE_TIMES: number;
  CORE_POINT_MAX_VALUE: number;
  CORE_POINTS_MAX: number;
  CORE_POINTS_MIN: number;
  COUNT_TURNS: number;
  COVER_DIST_CLOSE: number;
  COVER_SECONDS_AFTER_LOSE_VISION: number;
  COVER_TOOFAR_FROM_BOSS: number;
  COVER_TOOFAR_FROM_BOSS_SQRT: number;
  DANGER_POINT_LIFE_TIME_SEC: number;
  DANGER_POWER: number;
  DEAD_AGR_DIST: number;
  DEFENCE_LEVEL_SHIFT: number;
  DELTA_GRENADE_END_TIME: number;
  DELTA_GRENADE_RUN_DIST: number;
  DELTA_GRENADE_RUN_DIST_SQRT: number;
  DELTA_GRENADE_START_TIME: number;
  DELTA_SUPRESS_DISTANCE: number;
  DELTA_SUPRESS_DISTANCE_SQRT: number;
  DIST_NOT_TO_GROUP: number;
  DIST_NOT_TO_GROUP_SQR: number;
  FLARE_POWER: number;
  FLARE_TIME: number;
  FORMUL_COEF_DELTA_DIST: number;
  FORMUL_COEF_DELTA_FRIEND_COVER: number;
  FORMUL_COEF_DELTA_SHOOT: number;
  G: number;
  GESTUS_AIMING_DELAY: number;
  GESTUS_ANYWAY_CHANCE: number;
  GESTUS_DIST_ANSWERS: number;
  GESTUS_DIST_ANSWERS_SQRT: number;
  GESTUS_FIRST_STAGE_MAX_TIME: number;
  GESTUS_FUCK_TO_SHOOT: number;
  GESTUS_MAX_ANSWERS: number;
  GESTUS_PERIOD_SEC: number;
  GESTUS_REQUEST_LIFETIME: number;
  GESTUS_SECOND_STAGE_MAX_TIME: number;
  GOOD_DIST_TO_POINT: number;
  GRENADE_PRECISION: number;
  GUNSHOT_SPREAD: number;
  GUNSHOT_SPREAD_SILENCE: number;
  HOLD_MIN_LIGHT_DIST: number;
  HOLD_REQUEST_TIME_SEC: number;
  JUMP_NOISE_DELTA: number;
  JUMP_SPREAD_DIST: number;
  LAST_DAMAGE_ACTIVE: number;
  LAST_SEEN_POS_LIFETIME: number;
  LAY_COEF: number;
  LAY_DOWN_ANG_SHOOT: number;
  LOCAL_BOTS_COUNT: number;
  LOOK_ANYSIDE_BY_WALL_SEC_OF_ENEMY: number;
  LOOK_TIMES_TO_KILL: number;
  LOWER_POSE: number;
  MAIN_TACTIC_ONLY_ATTACK: boolean;
  MAX_ARG_COEF: number;
  MAX_BASE_REQUESTS_PER_PLAYER: number;
  MAX_COME_WITH_ME_REQUESTS_PER_PLAYER: number;
  MAX_DANGER_CARE_DIST: number;
  MAX_DANGER_CARE_DIST_SQRT: number;
  MAX_DIST_TO_COV: number;
  MAX_GO_TO_REQUESTS_PER_PLAYER: number;
  MAX_HOLD_REQUESTS_PER_PLAYER: number;
  MAX_ITERATIONS: number;
  MAX_POSE: number;
  MAX_REQUESTS__PER_GROUP: number;
  MAX_WARNS_BEFORE_KILL: number;
  MAX_Y_DIFF_TO_PROTECT: number;
  MIDDLE_POINT_COEF: number;
  MIN_ARG_COEF: number;
  MIN_BLOCK_DIST: number;
  MIN_BLOCK_TIME: number;
  MIN_DIST_CLOSE_DEF: number;
  MIN_DIST_TO_RUN_WHILE_ATTACK_MOVING: number;
  MIN_DIST_TO_RUN_WHILE_ATTACK_MOVING_OTHER_ENEMIS: number;
  MIN_DIST_TO_STOP_RUN: number;
  MIN_MAX_PERSON_SEARCH: number;
  MOVE_COEF: number;
  MOVE_SPEED_COEF_MAX: number;
  MOVING_AIM_COEF: number;
  PATROL_MIN_LIGHT_DIST: number;
  PERCENT_PERSON_SEARCH: number;
  PISTOL_POWER: number;
  PRONE_POSE: number;
  RIFLE_POWER: number;
  SAVAGE_KILL_DIST: number;
  SCAV_GROUPS_TOGETHER: boolean;
  SHALL_DIE_IF_NOT_INITED: boolean;
  SHOOT_TO_CHANGE_RND_PART_DELTA: number;
  SHOOT_TO_CHANGE_RND_PART_MAX: number;
  SHOOT_TO_CHANGE_RND_PART_MIN: number;
  SHOTGUN_POWER: number;
  SIMPLE_POINT_LIFE_TIME_SEC: number;
  SIT_COEF: number;
  SMG_POWER: number;
  SMOKE_GRENADE_RADIUS_COEF: number;
  SNIPE_POWER: number;
  SOUND_DOOR_BREACH_METERS: number;
  SOUND_DOOR_OPEN_METERS: number;
  SPEED_SERV_SOUND_COEF_A: number;
  SPEED_SERV_SOUND_COEF_B: number;
  STANDART_BOT_PAUSE_DOOR: number;
  START_ACTIVE_FOLLOW_PLAYER_EVENT: boolean;
  START_ACTIVE_FORCE_ATTACK_PLAYER_EVENT: boolean;
  START_DIST_TO_COV: number;
  STAY_COEF: number;
  STAY_HEIGHT: number;
  STEP_NOISE_DELTA: number;
  SUSPETION_POINT_DIST_CHECK: number;
  TALK_DELAY: number;
  TILT_CHANCE: number;
  TOTAL_TIME_KILL: number;
  TOTAL_TIME_KILL_AFTER_WARN: number;
  TRIGGERS_DOWN_TO_RUN_WHEN_MOVE: number;
  UPDATE_GOAL_TIMER_SEC: number;
  USE_ID_PRIOR_WHO_GO: boolean;
  VERTICAL_DIST_TO_IGNORE_SOUND: number;
  WAVE_COEF_HIGH: number;
  WAVE_COEF_HORDE: number;
  WAVE_COEF_LOW: number;
  WAVE_COEF_MID: number;
  WAVE_ONLY_AS_ONLINE: boolean;
  WEAPON_ROOT_Y_OFFSET: number;
}

export interface Grenade {
  ADD_GRENADE_AS_DANGER: number;
  ADD_GRENADE_AS_DANGER_SQR: number;
  AMBUSH_IF_SMOKE_IN_ZONE_100: number;
  AMBUSH_IF_SMOKE_RETURN_TO_ATTACK_SEC: number;
  ANG_TYPE: number;
  BE_ATTENTION_COEF: number;
  BEWARE_TYPE: number;
  CAN_THROW_STRAIGHT_CONTACT: boolean;
  CHANCE_RUN_FLASHED_100: number;
  CHANCE_TO_NOTIFY_ENEMY_GR_100: number;
  CHEAT_START_GRENADE_PLACE: boolean;
  CLOSE_TO_SMOKE_TIME_DELTA: number;
  CLOSE_TO_SMOKE_TO_SHOOT: number;
  CLOSE_TO_SMOKE_TO_SHOOT_SQRT: number;
  DAMAGE_GRENADE_SUPPRESS_DELTA: number;
  DELTA_GRENADE_START_TIME: number;
  DELTA_NEXT_ATTEMPT: number;
  DELTA_NEXT_ATTEMPT_FROM_COVER: number;
  FLASH_GRENADE_TIME_COEF: number;
  GrenadePerMeter: number;
  GrenadePrecision: number;
  MAX_FLASHED_DIST_TO_SHOOT: number;
  MAX_FLASHED_DIST_TO_SHOOT_SQRT: number;
  MAX_THROW_POWER: number;
  MIN_DIST_NOT_TO_THROW: number;
  MIN_DIST_NOT_TO_THROW_SQR: number;
  MIN_THROW_GRENADE_DIST: number;
  MIN_THROW_GRENADE_DIST_SQRT: number;
  NEAR_DELTA_THROW_TIME_SEC: number;
  NO_RUN_FROM_AI_GRENADES: boolean;
  REQUEST_DIST_MUST_THROW: number;
  REQUEST_DIST_MUST_THROW_SQRT: number;
  RUN_AWAY: number;
  RUN_AWAY_SQR: number;
  SHOOT_TO_SMOKE_CHANCE_100: number;
  SIZE_SPOTTED_COEF: number;
  SMOKE_CHECK_DELTA: number;
  SMOKE_SUPPRESS_DELTA: number;
  STOP_WHEN_THROW_GRENADE: boolean;
  STRAIGHT_CONTACT_DELTA_SEC: number;
  STUN_SUPPRESS_DELTA: number;
  TIME_SHOOT_TO_FLASH: number;
  WAIT_TIME_TURN_AWAY: number;
}

export interface Hearing {
  BOT_CLOSE_PANIC_DIST: number;
  CHANCE_TO_HEAR_SIMPLE_SOUND_0_1: number;
  CLOSE_DIST: number;
  DEAD_BODY_SOUND_RAD: number;
  DISPERSION_COEF: number;
  DIST_PLACE_TO_FIND_POINT: number;
  FAR_DIST: number;
  HEAR_DELAY_WHEN_HAVE_SMT: number;
  HEAR_DELAY_WHEN_PEACE: number;
  LOOK_ONLY_DANGER: boolean;
  LOOK_ONLY_DANGER_DELTA: number;
  RESET_TIMER_DIST: number;
  SOUND_DIR_DEEFREE: number;
}

export interface Lay {
  ATTACK_LAY_CHANCE: number;
  CHECK_SHOOT_WHEN_LAYING: boolean;
  CLEAR_POINTS_OF_SCARE_SEC: number;
  DAMAGE_TIME_TO_GETUP: number;
  DELTA_AFTER_GETUP: number;
  DELTA_GETUP: number;
  DELTA_LAY_CHECK: number;
  DELTA_WANT_LAY_CHECL_SEC: number;
  DIST_ENEMY_CAN_LAY: number;
  DIST_ENEMY_CAN_LAY_SQRT: number;
  DIST_ENEMY_GETUP_LAY: number;
  DIST_ENEMY_GETUP_LAY_SQRT: number;
  DIST_ENEMY_NULL_DANGER_LAY: number;
  DIST_ENEMY_NULL_DANGER_LAY_SQRT: number;
  DIST_GRASS_TERRAIN_SQRT: number;
  DIST_TO_COVER_TO_LAY: number;
  DIST_TO_COVER_TO_LAY_SQRT: number;
  LAY_AIM: number;
  LAY_CHANCE_DANGER: number;
  MAX_CAN_LAY_DIST: number;
  MAX_CAN_LAY_DIST_SQRT: number;
  MAX_LAY_TIME: number;
  MIN_CAN_LAY_DIST: number;
  MIN_CAN_LAY_DIST_SQRT: number;
}

export interface Look {
  BODY_DELTA_TIME_SEARCH_SEC: number;
  CAN_LOOK_TO_WALL: boolean;
  CHECK_HEAD_ANY_DIST: boolean;
  CloseDeltaTimeSec: number;
  COME_TO_BODY_DIST: number;
  DIST_CHECK_WALL: number;
  DIST_NOT_TO_IGNORE_WALL: number;
  ENEMY_LIGHT_ADD: number;
  ENEMY_LIGHT_START_DIST: number;
  FAR_DISTANCE: number;
  FarDeltaTimeSec: number;
  GOAL_TO_FULL_DISSAPEAR: number;
  GOAL_TO_FULL_DISSAPEAR_SHOOT: number;
  LightOnVisionDistance: number;
  LOOK_AROUND_DELTA: number;
  LOOK_LAST_POSENEMY_IF_NO_DANGER_SEC: number;
  MARKSMAN_VISIBLE_DIST_COEF: number;
  MAX_VISION_GRASS_METERS: number;
  MAX_VISION_GRASS_METERS_FLARE: number;
  MAX_VISION_GRASS_METERS_FLARE_OPT: number;
  MAX_VISION_GRASS_METERS_OPT: number;
  MIDDLE_DIST: number;
  MiddleDeltaTimeSec: number;
  MIN_LOOK_AROUD_TIME: number;
  OLD_TIME_POINT: number;
  OPTIMIZE_TO_ONLY_BODY: boolean;
  POSIBLE_VISION_SPACE: number;
  VISIBLE_DISNACE_WITH_LIGHT: number;
  WAIT_NEW__LOOK_SENSOR: number;
  WAIT_NEW_SENSOR: number;
}

export interface Mind {
  AI_POWER_COEF: number;
  AMBUSH_WHEN_UNDER_FIRE: boolean;
  AMBUSH_WHEN_UNDER_FIRE_TIME_RESIST: number;
  ATTACK_ENEMY_IF_PROTECT_DELTA_LAST_TIME_SEEN: number;
  ATTACK_IMMEDIATLY_CHANCE_0_100: number;
  BULLET_FEEL_CLOSE_SDIST: number;
  BULLET_FEEL_DIST: number;
  CAN_PANIC_IS_PROTECT: boolean;
  CAN_RECEIVE_PLAYER_REQUESTS_BEAR: boolean;
  CAN_RECEIVE_PLAYER_REQUESTS_SAVAGE: boolean;
  CAN_RECEIVE_PLAYER_REQUESTS_USEC: boolean;
  CAN_STAND_BY: boolean;
  CAN_TALK: boolean;
  CAN_TAKE_ITEMS: boolean;
  CAN_THROW_REQUESTS: boolean;
  CAN_USE_MEDS: boolean;
  CHANCE_FUCK_YOU_ON_CONTACT_100: number;
  CHANCE_SHOOT_WHEN_WARN_PLAYER_100: number;
  CHANCE_TO_RUN_CAUSE_DAMAGE_0_100: number;
  CHANCE_TO_STAY_WHEN_WARN_PLAYER_100: number;
  COVER_DIST_COEF: number;
  COVER_SECONDS_AFTER_LOSE_VISION: number;
  COVER_SELF_ALWAYS_IF_DAMAGED: boolean;
  DAMAGE_REDUCTION_TIME_SEC: number;
  DANGER_POINT_CHOOSE_COEF: number;
  DIST_TO_ENEMY_YO_CAN_HEAL: number;
  DIST_TO_FOUND_SQRT: number;
  DIST_TO_STOP_RUN_ENEMY: number;
  DOG_FIGHT_IN: number;
  DOG_FIGHT_OUT: number;
  ENEMY_LOOK_AT_ME_ANG: number;
  FIND_COVER_TO_GET_POSITION_WITH_SHOOT: number;
  FRIEND_AGR_KILL: number;
  FRIEND_DEAD_AGR_LOW: number;
  GROUP_ANY_PHRASE_DELAY: number;
  GROUP_EXACTLY_PHRASE_DELAY: number;
  HEAL_DELAY_SEC: number;
  HIT_DELAY_WHEN_HAVE_SMT: number;
  HIT_DELAY_WHEN_PEACE: number;
  HIT_POINT_DETECTION: number;
  HOLD_IF_PROTECT_DELTA_LAST_TIME_SEEN: number;
  HOW_WORK_OVER_DEAD_BODY: number;
  LAST_ENEMY_LOOK_TO: number;
  LASTSEEN_POINT_CHOOSE_COEF: number;
  MAX_AGGRO_BOT_DIST: number;
  MAX_AGGRO_BOT_DIST_SQR: number;
  MAX_SHOOTS_TIME: number;
  MAX_START_AGGRESION_COEF: number;
  MIN_DAMAGE_SCARE: number;
  MIN_SHOOTS_TIME: number;
  MIN_START_AGGRESION_COEF: number;
  NO_RUN_AWAY_FOR_SAFE: boolean;
  PART_PERCENT_TO_HEAL: number;
  PISTOL_SHOTGUN_AMBUSH_DIST: number;
  PROTECT_DELTA_HEAL_SEC: number;
  PROTECT_TIME_REAL: boolean;
  SEC_TO_MORE_DIST_TO_RUN: number;
  SHOOT_INSTEAD_DOG_FIGHT: number;
  SIMPLE_POINT_CHOOSE_COEF: number;
  STANDART_AMBUSH_DIST: number;
  SURGE_KIT_ONLY_SAFE_CONTAINER: boolean;
  SUSPETION_POINT_CHANCE_ADD100: number;
  TALK_WITH_QUERY: boolean;
  TIME_LEAVE_MAP: number;
  TIME_TO_FIND_ENEMY: number;
  TIME_TO_FORGOR_ABOUT_ENEMY_SEC: number;
  TIME_TO_RUN_TO_COVER_CAUSE_SHOOT_SEC: number;
  WILL_PERSUE_AXEMAN: boolean;
}

export interface Move {
  BASE_ROTATE_SPEED: number;
  BASE_SQRT_START_SERACH: number;
  BASE_START_SERACH: number;
  BASESTART_SLOW_DIST: number;
  CHANCE_TO_RUN_IF_NO_AMMO_0_100: number;
  DELTA_LAST_SEEN_ENEMY: number;
  DIST_TO_CAN_CHANGE_WAY: number;
  DIST_TO_CAN_CHANGE_WAY_SQR: number;
  DIST_TO_START_RAYCAST: number;
  DIST_TO_START_RAYCAST_SQR: number;
  FAR_DIST: number;
  FAR_DIST_SQR: number;
  REACH_DIST: number;
  REACH_DIST_COVER: number;
  REACH_DIST_RUN: number;
  RUN_IF_CANT_SHOOT: boolean;
  RUN_IF_GAOL_FAR_THEN: number;
  RUN_TO_COVER_MIN: number;
  SEC_TO_CHANGE_TO_RUN: number;
  SLOW_COEF: number;
  START_SLOW_DIST: number;
  UPDATE_TIME_RECAL_WAY: number;
  Y_APPROXIMATION: number;
}

export interface Patrol {
  CAN_CHOOSE_RESERV: boolean;
  CAN_FRIENDLY_TILT: boolean;
  CAN_HARD_AIM: boolean;
  CAN_LOOK_TO_DEADBODIES: boolean;
  CAN_WATCH_SECOND_WEAPON: boolean;
  CHANCE_TO_CHANGE_WAY_0_100: number;
  CHANCE_TO_CUT_WAY_0_100: number;
  CHANCE_TO_SHOOT_DEADBODY: number;
  CHANGE_WAY_TIME: number;
  CLOSE_TO_SELECT_RESERV_WAY: number;
  CUT_WAY_MAX_0_1: number;
  CUT_WAY_MIN_0_1: number;
  DEAD_BODY_LOOK_PERIOD: number;
  FRIEND_SEARCH_SEC: number;
  LOOK_TIME_BASE: number;
  MAX_YDIST_TO_START_WARN_REQUEST_TO_REQUESTER: number;
  MIN_DIST_TO_CLOSE_TALK: number;
  MIN_DIST_TO_CLOSE_TALK_SQR: number;
  MIN_TALK_DELAY: number;
  RESERVE_OUT_TIME: number;
  RESERVE_TIME_STAY: number;
  SUSPETION_PLACE_LIFETIME: number;
  TALK_DELAY: number;
  TALK_DELAY_BIG: number;
  TRY_CHOOSE_RESERV_WAY_ON_START: boolean;
  VISION_DIST_COEF_PEACE: number;
}

export interface Scattering {
  AMPLITUDE_FACTOR: number;
  AMPLITUDE_SPEED: number;
  BloodFall: number;
  Caution: number;
  DIST_FROM_OLD_POINT_TO_NOT_AIM: number;
  DIST_FROM_OLD_POINT_TO_NOT_AIM_SQRT: number;
  DIST_NOT_TO_SHOOT: number;
  FromShot: number;
  HandDamageAccuracySpeed: number;
  HandDamageScatteringMinMax: number;
  LayFactor: number;
  MaxScatter: number;
  MinScatter: number;
  MovingSlowCoef: number;
  PoseChnageCoef: number;
  RecoilControlCoefShootDone: number;
  RecoilControlCoefShootDoneAuto: number;
  RecoilYCoef: number;
  RecoilYCoefSppedDown: number;
  RecoilYMax: number;
  SpeedDown: number;
  SpeedUp: number;
  SpeedUpAim: number;
  ToCaution: number;
  ToLowBotAngularSpeed: number;
  ToLowBotSpeed: number;
  ToSlowBotSpeed: number;
  ToStopBotAngularSpeed: number;
  ToUpBotSpeed: number;
  TracerCoef: number;
  WorkingScatter: number;
}

export interface Shoot {
  AUTOMATIC_FIRE_SCATTERING_COEF: number;
  BASE_AUTOMATIC_TIME: number;
  CAN_SHOOTS_TIME_TO_AMBUSH: number;
  CAN_STOP_SHOOT_CAUSE_ANIMATOR: boolean;
  CHANCE_TO_CHANGE_TO_AUTOMATIC_FIRE_100: number;
  CHANCE_TO_CHANGE_WEAPON: number;
  CHANCE_TO_CHANGE_WEAPON_WITH_HELMET: number;
  DELAY_BEFORE_EXAMINE_MALFUNCTION: number;
  DELAY_BEFORE_FIX_MALFUNCTION: number;
  FAR_DIST_ENEMY: number;
  FAR_DIST_ENEMY_SQR: number;
  FAR_DIST_TO_CHANGE_WEAPON: number;
  FINGER_HOLD_SINGLE_SHOT: number;
  FINGER_HOLD_STATIONARY_GRENADE: number;
  HORIZONT_RECOIL_COEF: number;
  LOW_DIST_TO_CHANGE_WEAPON: number;
  MARKSMAN_DIST_SEK_COEF: number;
  MAX_DIST_COEF: number;
  MAX_RECOIL_PER_METER: number;
  NOT_TO_SEE_ENEMY_TO_WANT_RELOAD_PERCENT: number;
  NOT_TO_SEE_ENEMY_TO_WANT_RELOAD_SEC: number;
  RECOIL_DELTA_PRESS: number;
  RECOIL_PER_METER: number;
  RECOIL_TIME_NORMALIZE: number;
  RELOAD_PECNET_NO_ENEMY: number;
  REPAIR_MALFUNCTION_IMMEDIATE_CHANCE: number;
  RUN_DIST_NO_AMMO: number;
  RUN_DIST_NO_AMMO_SQRT: number;
  SHOOT_FROM_COVER: number;
  SUPPRESS_BY_SHOOT_TIME: number;
  SUPPRESS_TRIGGERS_DOWN: number;
  VALIDATE_MALFUNCTION_CHANCE: number;
  WAIT_NEXT_SINGLE_SHOT: number;
  WAIT_NEXT_SINGLE_SHOT_LONG_MAX: number;
  WAIT_NEXT_SINGLE_SHOT_LONG_MIN: number;
  WAIT_NEXT_STATIONARY_GRENADE: number;
}
