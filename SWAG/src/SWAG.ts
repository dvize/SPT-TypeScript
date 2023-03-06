import { DependencyContainer } from "tsyringe";
import { IPreAkiLoadMod } from "@spt-aki/models/external/IPreAkiLoadMod";
import { IPostDBLoadMod } from "@spt-aki/models/external/IPostDBLoadMod";
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import { ILogger } from "@spt-aki/models/spt/utils/ILogger";
import { StaticRouterModService } from "@spt-aki/services/mod/staticRouter/StaticRouterModService";
import { RandomUtil } from "@spt-aki/utils/RandomUtil";
import { JsonUtil } from "@spt-aki/utils/JsonUtil";
import {
BossLocationSpawn,
ILocationBase,
Wave,
} from "@spt-aki/models/eft/common/ILocationBase";
import { ConfigTypes } from "@spt-aki/models/enums/ConfigTypes";
import { IBotConfig } from "@spt-aki/models/spt/config/IBotConfig";
import { ILocations } from "@spt-aki/models/spt/server/ILocations";
import { ConfigServer } from "@spt-aki/servers/ConfigServer";
import * as ClassDef from "./ClassDef";

const modName = "SWAG";
let logger: ILogger;
let jsonUtil: JsonUtil;
let configServer: ConfigServer;
let botConfig: IBotConfig;
let databaseServer: DatabaseServer;
let locations: ILocations;
let savedLocations;
let randomUtil: RandomUtil;
let BossWaveSpawnedOnceAlready: boolean;

let config: ClassDef.SWAGConfig;
const customPatterns: Record<string, ClassDef.GroupPattern> = {};

type LocationName = keyof Omit<ILocations, "base">;
type SpawnZonesByLocation = Record<LocationName, string[]>;

class SWAG implements IPreAkiLoadMod, IPostDBLoadMod {
  public static roleCase: object = {
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

  public static pmcType: string[] = ["sptbear", "sptusec"];

  public static validMaps: string[] = [
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

  public static diffProper = {
    easy: "easy",
    asonline: "normal",
    normal: "normal",
    hard: "hard",
    impossible: "impossible",
    random: "random",
  };

  public static aiAmountProper = {
    low: 0.5,
    asonline: 1,
    medium: 1,
    high: 2,
    horde: 4,
  };

  public static mappedSpawns: SpawnZonesByLocation = {
    factory4_day: [],
    factory4_night: [],
    bigmap: [],
    interchange: [],
    laboratory: [],
    lighthouse: [],
    rezervbase: [],
    shoreline: [],
    tarkovstreets: [],
    woods: [],

    // unused
    develop: [],
    hideout: [],
    privatearea: [],
    suburbs: [],
    terminal: [],
    town: [],
  };

  public static randomWaveTimer = {
    time_min: 0,
    time_max: 0
  };

  preAkiLoad(container: DependencyContainer): void {
    const staticRouterModService = container.resolve<StaticRouterModService>(
      "StaticRouterModService"
    );

    staticRouterModService.registerStaticRouter(
      `${modName}/singleplayer/settings/raid/endstate`,
      [
        {
          url: "/singleplayer/settings/raid/endstate",
          action: (
            url: string,
            info: any,
            sessionID: string,
            output: string
          ): any => {
            SWAG.ClearDefaultSpawns();
            SWAG.ConfigureMaps();
            return output;
          },
        },
      ],
      "aki"
    );
  }

  postDBLoad(container: DependencyContainer): void {
    logger = container.resolve<ILogger>("WinstonLogger");
    jsonUtil = container.resolve<JsonUtil>("JsonUtil");
    configServer = container.resolve<ConfigServer>("ConfigServer");
    botConfig = configServer.getConfig<IBotConfig>(ConfigTypes.BOT);
    databaseServer = container.resolve<DatabaseServer>("DatabaseServer");
    locations = databaseServer.getTables().locations;
    randomUtil = container.resolve<RandomUtil>("RandomUtil");

    config = require(`../config/config.json`);

    SWAG.SetConfigCaps();
    SWAG.ReadAllPatterns();
    SWAG.StoreOpenZones();
    SWAG.ClearDefaultSpawns();
    SWAG.ConfigureMaps();
  }

  static SetConfigCaps(): void {
    //Set Max Bot Caps
    botConfig.maxBotCap["factory"] = config.MaxBotCap["factory"];
    botConfig.maxBotCap["customs"] = config.MaxBotCap["customs"];
    botConfig.maxBotCap["interchange"] = config.MaxBotCap["interchange"];
    botConfig.maxBotCap["shoreline"] = config.MaxBotCap["shoreline"];
    botConfig.maxBotCap["woods"] = config.MaxBotCap["woods"];
    botConfig.maxBotCap["reserve"] = config.MaxBotCap["reserve"];
    botConfig.maxBotCap["laboratory"] = config.MaxBotCap["laboratory"];
    botConfig.maxBotCap["lighthouse"] = config.MaxBotCap["lighthouse"];
    botConfig.maxBotCap["tarkovstreets"] = config.MaxBotCap["tarkovstreets"];

    //Set Max Bots Per Zone Per Map
    for (let map in locations) {
      locations[map].MaxBotPerZone = config.MaxBotPerZone;
    }

    logger.info("SWAG: Config/Bot Caps Set");
  }

  static StoreOpenZones(): void {
    for (let map in locations) {
      const baseobj: ILocationBase = locations[map].base;

      const openZones = baseobj?.OpenZones?.split(",").filter(
        (name) => !name.includes("Snipe")
      );

      SWAG.mappedSpawns[map] = openZones;
    }
  }

  static ReadAllPatterns(): void {
    //find dirpath and get one level up
    let dirpath = __dirname;
    dirpath = dirpath.split("\\").slice(0, -1).join("\\");

    //Read all patterns from files in /patterns
    const fs = require("fs");
    if (!fs.existsSync(`${dirpath}/config/patterns/`)) {
      console.log("SWAG: Pattern Directory not found");
      return;
    }
    const files = fs.readdirSync(`${dirpath}/config/patterns/`);
    for (let file of files) {
      const temppattern = require(`${dirpath}/config/patterns/${file}`);
      const tempname = file.split(".")[0];
      //parse the json and push it to the customPatterns array

      customPatterns[tempname] = temppattern;

      logger.info("SWAG: Loaded Pattern: " + tempname);
    }
  }

  //This is the main top level function
  static ConfigureMaps(): void {

    // read all customPatterns and push them to the locations table
    Object.keys(locations).forEach((globalmap: LocationName) => {
      for (let pattern in customPatterns) {
        //read mapWrapper in pattern and set its values to be used locally
        const mapWrapper: ClassDef.MapWrapper = customPatterns[pattern][0];
        const mapName: string = mapWrapper.MapName.toLowerCase();
        const mapGroups: ClassDef.GroupPattern[] = mapWrapper.MapGroups;
        const mapBosses: ClassDef.BossPattern[] = mapWrapper.MapBosses;

        //reset the bossWaveSpawnedOnceAlready flag
        BossWaveSpawnedOnceAlready = false;

        //if mapName is not the same as the globalmap, skip. otherwise if all or matches, continue
        if (mapName === globalmap || mapName === "all") {
          config.DebugOutput && logger.warning(`Configuring ${globalmap}`);

          // Configure random wave timer.. needs to be reset each map
          SWAG.randomWaveTimer.time_min = config.WaveTimerMinSec;
          SWAG.randomWaveTimer.time_max = config.WaveTimerMaxSec;

          SWAG.SetUpGroups(mapGroups, mapBosses, globalmap);
        }

        //config.DebugOutput && logger.warning(`Waves for ${globalmap} : ${JSON.stringify(locations[globalmap].base?.waves)}`);
      }
    });
  }

  /**
   * Groups can be marked random with the RandomTimeSpawn. groups that dont have a time_max or time_min will also be considered random
   * @param group 
   * @returns 
   */
  static isGroupRandom(group: ClassDef.GroupPattern) {
    const isRandomMin = group.Time_min === null || group.Time_min === undefined;
    const isRandomMax = group.Time_max === null || group.Time_max === undefined;

    return group.RandomTimeSpawn || isRandomMax || isRandomMin
  }

  static SetUpGroups(
    mapGroups: ClassDef.GroupPattern[],
    mapBosses: ClassDef.BossPattern[],
    globalmap: LocationName
  ): void {
    //set up local variables to contain outside of loop
    const RandomGroups: ClassDef.GroupPattern[] = [];
    const RandomBossGroups: ClassDef.BossPattern[] = [];
    const StaticGroups: ClassDef.GroupPattern[] = [];
    const StaticBossGroups: ClassDef.BossPattern[] = [];
    const AlreadySpawnedGroups: ClassDef.GroupPattern[] = [];
    const AlreadySpawnedBossGroups: ClassDef.BossPattern[] = [];

    //read mapGroups and see if value Random, OnlySpawnOnce, or BotZone is set and set local values
    for (let group of mapGroups) {
      const groupRandom = SWAG.isGroupRandom(group);

      //if groupRandom is true, push group to RandomGroups, otherwise push to StaticGroups
      if (groupRandom) {
        RandomGroups.push(group);
      } else {
        StaticGroups.push(group);
      }
    }

    //read BossGroups and see if value Random, OnlySpawnOnce, or BotZone is set and set local values
    for (let boss of mapBosses) {
      const groupRandom: boolean = boss.RandomTimeSpawn;

      //if groupRandom is true, push group to RandomGroups, otherwise push to StaticGroups
      if (groupRandom) {
        RandomBossGroups.push(boss);
      } else {
        StaticBossGroups.push(boss);
      }

    }

    //if RandomGroups is not empty, set up bot spawning for random groups
    if (RandomGroups.length > 0) {
      //call SetUpRandomBots amount of times specified in config.RandomWaveCount
      for (let i = 0; i < config.RandomWaveCount; i++) {
        SWAG.SetUpRandomBots(RandomGroups, globalmap, AlreadySpawnedGroups);
      }
    }

    //if StaticGroups is not empty, set up bot spawning for static groups
    if (StaticGroups.length > 0) {
      SWAG.SetUpStaticBots(StaticGroups, globalmap, AlreadySpawnedGroups);
    }

    //if RandomBossGroups is not empty, set up bot spawning for random boss groups
    if (RandomBossGroups.length > 0) {
      //call SetUpRandomBots amount of times specified in config.RandomWaveCount
      for (let i = 0; i < config.BossWaveCount; i++) {
        SWAG.SetUpRandomBosses(
          RandomBossGroups,
          globalmap,
          AlreadySpawnedBossGroups
        );
      }
    }

    //if StaticBossGroups is not empty, set up bot spawning for static boss groups
    if (StaticBossGroups.length > 0) {
      SWAG.SetUpStaticBosses(
        StaticBossGroups,
        globalmap,
        AlreadySpawnedBossGroups
      );
    }
  }

  static SetUpRandomBots(
    RandomGroups: ClassDef.GroupPattern[],
    globalmap: LocationName,
    AlreadySpawnedGroups: ClassDef.GroupPattern[]
  ): void {
    //read a random group from RandomGroups
    const randomGroup = randomUtil.getArrayValue(RandomGroups);

    SWAG.SpawnBots(
      randomGroup,
      globalmap,
      AlreadySpawnedGroups
    );
  }

  static SetUpRandomBosses(
    RandomBossGroups: ClassDef.BossPattern[],
    globalmap: LocationName,
    AlreadySpawnedBossGroups: ClassDef.BossPattern[]
  ): void {
    //read a random group from RandomBossGroups
    const randomBossGroup = randomUtil.getArrayValue(RandomBossGroups);

    SWAG.SpawnBosses(
      randomBossGroup,
      globalmap,
      AlreadySpawnedBossGroups
    );
  }

  static SetUpStaticBots(
    StaticGroups: ClassDef.GroupPattern[],
    globalmap: LocationName,
    AlreadySpawnedGroups: ClassDef.GroupPattern[]
  ): void {
    //read StaticGroups and set local values
    for (let group of StaticGroups) {
      SWAG.SpawnBots(
        group,
        globalmap,
        AlreadySpawnedGroups
      );
    }
  }

  static SetUpStaticBosses(
    StaticBossGroups: ClassDef.BossPattern[],
    globalmap: LocationName,
    AlreadySpawnedBossGroups: ClassDef.BossPattern[]
  ): void {
    //read StaticBossGroups and set local values
    for (let boss of StaticBossGroups) {
      SWAG.SpawnBosses(
        boss,
        globalmap,
        AlreadySpawnedBossGroups
      );
    }
  }

  static SpawnBosses(
    boss: ClassDef.BossPattern,
    globalmap: LocationName,
    AlreadySpawnedBossGroups: ClassDef.BossPattern[]
  ): void {

    //check to see if RandomBossGroupSpawnOnce is true, if so, check to see if group is already spawned
    if (boss.OnlySpawnOnce && AlreadySpawnedBossGroups.includes(boss)) {
      return;
    }

    AlreadySpawnedBossGroups.push(boss);

    //check chance against randomint100 to see if boss should spawn from config.bossChance
    if (SWAG.getRandIntInclusive(0,100) > config.BossChance) {
      return;
    }

    //check make sure BossWaveSpawnedOnceAlready = true and config.SkipOtherBossWavesIfBossWaveSelected = true
    if (BossWaveSpawnedOnceAlready && config.SkipOtherBossWavesIfBossWaveSelected) {
      config.DebugOutput && logger.info("SWAG: Skipping boss spawn as one spawned already")
      return;
    }

    //read group and create wave from individual boss but same timing and location if RandomBossGroupBotZone is not null
    let wave: BossLocationSpawn = SWAG.ConfigureBossWave(
      boss,
      globalmap
    );

    locations[globalmap].base.BossLocationSpawn.push(wave);
  }

  static SpawnBots(
    group: ClassDef.GroupPattern,
    globalmap: LocationName,
    AlreadySpawnedGroups: ClassDef.GroupPattern[]
  ): void {
    //check to see if OnlySpawnOnce is true, if so, check to see if group is already spawned
    if (group.OnlySpawnOnce && AlreadySpawnedGroups.includes(group)) {
      return;
    } 

    AlreadySpawnedGroups.push(group);

    //read group and create wave from individual bots but same timing and location if StaticGroupBotZone is not null
    for (let bot of group.Bots) {
      const wave: Wave = SWAG.ConfigureBotWave(
        group,
        bot,
        globalmap
      );

      locations[globalmap].base.waves.push(wave);
    }
  }


  static ConfigureBotWave(
    group: ClassDef.GroupPattern,
    bot: ClassDef.Bot,
    globalmap: string
  ): Wave {
    const isRandom = SWAG.isGroupRandom(group);

    const wave: Wave = {
      number: null,
      WildSpawnType: SWAG.roleCase[bot.BotType.toLowerCase()],
      time_min: isRandom ? SWAG.randomWaveTimer.time_min : group.Time_min,
      time_max: isRandom ? SWAG.randomWaveTimer.time_max : group.Time_max,
      slots_min: 1,
      slots_max: Math.floor(
        bot.MaxBotCount *
          SWAG.aiAmountProper[
            config.aiAmount ? config.aiAmount.toLowerCase() : "asonline"
          ]
      ),
      BotPreset: SWAG.diffProper[config.aiDifficulty.toLowerCase()],
      SpawnPoints:
        !!group.BotZone
          ? group.BotZone
          : randomUtil.getStringArrayValue(SWAG.mappedSpawns[globalmap]),
      //set manually to Savage as supposedly corrects when bot data is requested
      BotSide: "Savage",
      //verify if its a pmcType and set isPlayers to true if it is
      isPlayers: SWAG.pmcType.includes(bot.BotType.toLowerCase()),
    };

    // If the wave has a random time, increment the wave timer counts
    if (isRandom) {

      //wave time increment is getting bigger each wave. Fix this by adding maxtimer to min timer
      SWAG.randomWaveTimer.time_min += config.WaveTimerMaxSec;
      SWAG.randomWaveTimer.time_max += config.WaveTimerMaxSec;
    }

    config.DebugOutput && logger.info("SWAG: Configured Bot Wave: " + JSON.stringify(wave));

    return wave;
  }

  static ConfigureBossWave(
    boss: BossLocationSpawn,
    globalmap: string
  ): BossLocationSpawn {
    //read support bots if defined, set the difficulty to match config
    boss?.Supports?.forEach(escort => {
      escort.BossEscortDifficult = [SWAG.diffProper[config.aiDifficulty.toLowerCase()]];
      escort.BossEscortType = SWAG.roleCase[escort.BossEscortType.toLowerCase()];
    })

    //set bossWaveSpawnedOnceAlready to true if not already
    BossWaveSpawnedOnceAlready = true;

    const wave: BossLocationSpawn = {
      BossName: SWAG.roleCase[boss.BossName.toLowerCase()],
      BossChance: boss.BossChance ?? 100,
      BossZone:
        !!boss.BossZone
          ? boss.BossZone
          : randomUtil.getStringArrayValue(SWAG.mappedSpawns[globalmap]),
      BossPlayer: false,
      BossDifficult: SWAG.diffProper[config.aiDifficulty.toLowerCase()],
      BossEscortType: SWAG.roleCase[boss.BossEscortType.toLowerCase()],
      BossEscortDifficult: SWAG.diffProper[config.aiDifficulty.toLowerCase()],
      BossEscortAmount: boss.BossEscortAmount,
      Time: boss.Time,
      Supports: boss.Supports,
      RandomTimeSpawn: boss.RandomTimeSpawn,
      TriggerId: "",
      TriggerName: "",
    };

    config.DebugOutput && logger.warning("SWAG: Configured Boss Wave: " + JSON.stringify(wave));
    
    return wave;
  }

  static getRandIntInclusive(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static ClearDefaultSpawns(): void {
    if (!savedLocations) {
      savedLocations = jsonUtil.clone(locations);
    }

    for (const mapName in locations) {
      const map = mapName.toLowerCase();
      if (map === "base" || map === "hideout") {
        continue;
      }

      // Reset Database, Cringe  -- i stole this code from LUA
      locations[map].base.waves = [...savedLocations[map].base.waves];
      locations[map].base.BossLocationSpawn = [
        ...savedLocations[map].base.BossLocationSpawn,
      ];

      //Clear bots spawn
      if (!config?.UseDefaultSpawns?.Waves) {
        locations[map].base.waves = [];
      }

      //Clear boss spawn
      const bossLocationSpawn = locations[map].base.BossLocationSpawn;
      if (
        !config?.UseDefaultSpawns?.Bosses &&
        !config?.UseDefaultSpawns?.TriggeredWaves
      ) {
        locations[map].base.BossLocationSpawn = [];
      } else {
        // Remove Default Boss Spawns
        if (!config?.UseDefaultSpawns?.Bosses) {
          for (let i = 0; i < bossLocationSpawn.length; i++) {
            // Triggered wave check
            if (bossLocationSpawn[i]?.TriggerName?.length === 0) {
              locations[map].base.BossLocationSpawn.splice(i--, 1);
            }
          }
        }

        // Remove Default Triggered Waves
        if (!config?.UseDefaultSpawns?.TriggeredWaves) {
          for (let i = 0; i < bossLocationSpawn.length; i++) {
            // Triggered wave check
            if (bossLocationSpawn[i]?.TriggerName?.length > 0) {
              locations[map].base.BossLocationSpawn.splice(i--, 1);
            }
          }
        }
      }
    }
  }
}

module.exports = { mod: new SWAG() };
