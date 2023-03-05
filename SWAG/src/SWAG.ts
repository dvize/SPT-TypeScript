import { DependencyContainer } from "tsyringe";
import { IPreAkiLoadMod } from "@spt-aki/models/external/IPreAkiLoadMod";
import { IPostDBLoadMod } from "@spt-aki/models/external/IPostDBLoadMod";
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import { ILogger } from "@spt-aki/models/spt/utils/ILogger";
import { StaticRouterModService } from "@spt-aki/services/mod/staticRouter/StaticRouterModService";
import { RandomUtil } from "@spt-aki/utils/RandomUtil";
import { JsonUtil } from "@spt-aki/utils/JsonUtil";
import { BotHelper } from "@spt-aki/helpers/BotHelper";
import {
  BossLocationSpawn,
  BossSupport,
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
let botHelper: BotHelper;
let randomUtil: RandomUtil;

let config: ClassDef.SWAGConfig;
let bossChance;
let bossSpawnedInCurrentMap: boolean;
let SpawnPoints: string;
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
    botHelper = container.resolve<BotHelper>("BotHelper");
    randomUtil = container.resolve<RandomUtil>("RandomUtil");

    config = require(`../config/config.json`);

    // TODO: This is currently unused!
    bossChance = config.bossChance;

    SWAG.SetConfigCaps();
    SWAG.ReadAllPatterns();
    SWAG.StoreOpenZones();
    SWAG.ClearDefaultSpawns();
    SWAG.ConfigureMaps();
  }

  static SetConfigCaps(): void {
    //Set Max Bot Caps
    botConfig.maxBotCap["factory"] = config.maxBotCap["factory"];
    botConfig.maxBotCap["customs"] = config.maxBotCap["customs"];
    botConfig.maxBotCap["interchange"] = config.maxBotCap["interchange"];
    botConfig.maxBotCap["shoreline"] = config.maxBotCap["shoreline"];
    botConfig.maxBotCap["woods"] = config.maxBotCap["woods"];
    botConfig.maxBotCap["reserve"] = config.maxBotCap["reserve"];
    botConfig.maxBotCap["laboratory"] = config.maxBotCap["laboratory"];
    botConfig.maxBotCap["lighthouse"] = config.maxBotCap["lighthouse"];
    botConfig.maxBotCap["tarkovstreets"] = config.maxBotCap["tarkovstreets"];

    //Set Max Bots Per Zone Per Map
    for (let map in locations) {
      locations[map].MaxBotPerZone = config.maxBotPerZone;
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

        //if mapName is not the same as the globalmap, skip. otherwise if all or matches, continue
        if (mapName != globalmap && mapName != "all") {
          continue;
        }

        SWAG.SetUpGroups(mapGroups, mapBosses, globalmap);
      }
    });
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
      const groupRandom: boolean = group.RandomTimeSpawn;

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
      const groupOnlySpawnOnce: boolean = boss.OnlySpawnOnce;

      //if groupRandom is true, push group to RandomGroups, otherwise push to StaticGroups
      if (groupRandom) {
        RandomBossGroups.push(boss);
      } else {
        StaticBossGroups.push(boss);
      }

      //if groupOnlySpawnOnce is true, push group to AlreadySpawnedGroups
      if (groupOnlySpawnOnce) {
        AlreadySpawnedBossGroups.push(boss);
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
    const RandomGroupSpawnOnce: boolean = randomGroup.OnlySpawnOnce;
    const RandomGroupBotZone: string = randomGroup.BotZone;

    //if RandomGroupSpawnOnce is true, push group to AlreadySpawnedGroups and spawn individual bots
    if (RandomGroupSpawnOnce) {
      SWAG.SpawnRandomBots(
        randomGroup,
        globalmap,
        RandomGroupBotZone,
        RandomGroupSpawnOnce,
        AlreadySpawnedGroups
      );
      AlreadySpawnedGroups.push(randomGroup);
    }
    //if RandomGroupSpawnOnce is false, spawn individual bots
    else {
      SWAG.SpawnRandomBots(
        randomGroup,
        globalmap,
        RandomGroupBotZone,
        RandomGroupSpawnOnce,
        AlreadySpawnedGroups
      );
    }
  }

  static SetUpRandomBosses(
    RandomBossGroups: ClassDef.BossPattern[],
    globalmap: LocationName,
    AlreadySpawnedBossGroups: ClassDef.BossPattern[]
  ): void {
    //read a random group from RandomBossGroups
    const randomBossGroup = randomUtil.getArrayValue(RandomBossGroups);
    const RandomBossGroupSpawnOnce: boolean = randomBossGroup.OnlySpawnOnce;
    const RandomBossGroupBotZone: string = randomBossGroup.BossZone;

    //if RandomGroupSpawnOnce is true, push group to AlreadySpawnedGroups and spawn individual bots
    if (RandomBossGroupSpawnOnce) {
      SWAG.SpawnRandomBosses(
        randomBossGroup,
        globalmap,
        RandomBossGroupBotZone,
        RandomBossGroupSpawnOnce,
        AlreadySpawnedBossGroups
      );
      AlreadySpawnedBossGroups.push(randomBossGroup);
    }
    //if RandomGroupSpawnOnce is false, spawn individual bots
    else {
      SWAG.SpawnRandomBosses(
        randomBossGroup,
        globalmap,
        RandomBossGroupBotZone,
        RandomBossGroupSpawnOnce,
        AlreadySpawnedBossGroups
      );
    }
  }

  static SetUpStaticBots(
    StaticGroups: ClassDef.GroupPattern[],
    globalmap: LocationName,
    AlreadySpawnedGroups: ClassDef.GroupPattern[]
  ): void {
    //read StaticGroups and set local values
    for (let group of StaticGroups) {
      const StaticGroupSpawnOnce: boolean = group.OnlySpawnOnce;
      const StaticGroupBotZone: string = group.BotZone;

      //if StaticGroupSpawnOnce is true, push group to AlreadySpawnedGroups and spawn individual bots
      if (StaticGroupSpawnOnce) {
        SWAG.SpawnStaticBots(
          group,
          globalmap,
          StaticGroupBotZone,
          StaticGroupSpawnOnce,
          AlreadySpawnedGroups
        );
        AlreadySpawnedGroups.push(group);
      }
      //if StaticGroupSpawnOnce is false, spawn individual bots
      else {
        SWAG.SpawnStaticBots(
          group,
          globalmap,
          StaticGroupBotZone,
          StaticGroupSpawnOnce,
          AlreadySpawnedGroups
        );
      }
    }
  }

  static SetUpStaticBosses(
    StaticBossGroups: ClassDef.BossPattern[],
    globalmap: LocationName,
    AlreadySpawnedBossGroups: ClassDef.BossPattern[]
  ): void {
    //read StaticBossGroups and set local values
    for (let boss of StaticBossGroups) {
      let StaticBossGroupSpawnOnce: boolean = boss.OnlySpawnOnce;
      let StaticBossGroupBotZone: string = boss.BossZone;

      //if StaticGroupSpawnOnce is true, push group to AlreadySpawnedGroups and spawn individual bots
      if (StaticBossGroupSpawnOnce) {
        SWAG.SpawnStaticBosses(
          boss,
          globalmap,
          StaticBossGroupBotZone,
          StaticBossGroupSpawnOnce,
          AlreadySpawnedBossGroups
        );
        AlreadySpawnedBossGroups.push(boss);
      }
      //if StaticGroupSpawnOnce is false, spawn individual bots
      else {
        SWAG.SpawnStaticBosses(
          boss,
          globalmap,
          StaticBossGroupBotZone,
          StaticBossGroupSpawnOnce,
          AlreadySpawnedBossGroups
        );
      }
    }
  }

  static SpawnRandomBots(
    group: ClassDef.GroupPattern,
    globalmap: LocationName,
    RandomGroupBotZone: string,
    RandomGroupSpawnOnce: boolean,
    AlreadySpawnedGroups: ClassDef.GroupPattern[]
  ): void {
    //check to see if RandomGroupSpawnOnce is true, if so, check to see if group is already spawned
    if (RandomGroupSpawnOnce) {
      if (AlreadySpawnedGroups.includes(group)) {
        return;
      }
    }

    //read group and create wave from individual bots but same timing and location if RandomGroupBotZone is not null
    for (let bot of group.Bots) {
      let wave: ClassDef.Wave = SWAG.ConfigureBotWave(
        group,
        bot,
        RandomGroupBotZone,
        globalmap
      );

      locations[globalmap].base.waves.push(wave);
    }
  }

  static SpawnRandomBosses(
    boss: ClassDef.BossPattern,
    globalmap: LocationName,
    RandomBossGroupBotZone: string,
    RandomBossGroupSpawnOnce: boolean,
    AlreadySpawnedBossGroups: ClassDef.BossPattern[]
  ): void {
    //check to see if RandomBossGroupSpawnOnce is true, if so, check to see if group is already spawned
    if (RandomBossGroupSpawnOnce) {
      if (AlreadySpawnedBossGroups.includes(boss)) {
        return;
      }
    }

    //read support bots if not null, set the difficulty to match config
    if (boss.Supports != null) {
      for (let escort of boss.Supports) {
        escort.BossEscortDifficult =
          SWAG.diffProper[config.aiDifficulty.toLowerCase()];
      }
    }

    //read group and create wave from individual boss but same timing and location if RandomBossGroupBotZone is not null

    let wave: BossLocationSpawn = SWAG.ConfigureBossWave(
      boss,
      RandomBossGroupBotZone,
      globalmap
    );

    locations[globalmap].base.BossLocationSpawn.push(wave);
  }

  static SpawnStaticBots(
    group: ClassDef.GroupPattern,
    globalmap: LocationName,
    StaticGroupBotZone: string,
    StaticGroupSpawnOnce: boolean,
    AlreadySpawnedGroups: ClassDef.GroupPattern[]
  ): void {
    //check to see if StaticGroupSpawnOnce is true, if so, check to see if group is already spawned
    if (StaticGroupSpawnOnce) {
      if (AlreadySpawnedGroups.includes(group)) {
        return;
      }
    }

    //read group and create wave from individual bots but same timing and location if StaticGroupBotZone is not null
    for (let bot of group.Bots) {
      const wave: ClassDef.Wave = SWAG.ConfigureBotWave(
        group,
        bot,
        StaticGroupBotZone,
        globalmap
      );

      locations[globalmap].base.waves.push(wave);
    }
  }

  static SpawnStaticBosses(
    boss: ClassDef.BossPattern,
    globalmap: LocationName,
    StaticBossGroupBotZone: string,
    StaticBossGroupSpawnOnce: boolean,
    AlreadySpawnedBossGroups: ClassDef.BossPattern[]
  ): void {
    //check to see if StaticBossGroupSpawnOnce is true, if so, check to see if group is already spawned
    if (StaticBossGroupSpawnOnce) {
      if (AlreadySpawnedBossGroups.includes(boss)) {
        return;
      }
    }

    //read support bots if not null, set the difficulty to match config
    if (boss.Supports != null) {
      for (let escort of boss.Supports) {
        escort.BossEscortDifficult =
          SWAG.diffProper[config.aiDifficulty.toLowerCase()];
      }
    }

    //read group and create wave from individual boss but same timing and location if StaticBossGroupBotZone is not null

    const wave: BossLocationSpawn = SWAG.ConfigureBossWave(
      boss,
      StaticBossGroupBotZone,
      globalmap
    );

    locations[globalmap].base.BossLocationSpawn.push(wave);
  }

  static ConfigureBotWave(
    group: ClassDef.GroupPattern,
    bot: ClassDef.Bot,
    StaticGroupBotZone: string,
    globalmap: string
  ): ClassDef.Wave {
    let wave: ClassDef.Wave = new ClassDef.Wave();
    wave.number = null;
    wave.WildSpawnType = SWAG.roleCase[bot.BotType.toLowerCase()];
    wave.time_min = group.Time_min;
    wave.time_max = group.Time_max;
    wave.slots_min = 1;
    wave.slots_max = Math.floor(
      bot.MaxBotCount *
        SWAG.aiAmountProper[
          config.aiAmount ? config.aiAmount.toLowerCase() : "asonline"
        ]
    );
    wave.BotPreset = SWAG.diffProper[config.aiDifficulty.toLowerCase()];
    wave.SpawnPoints =
      StaticGroupBotZone != null
        ? StaticGroupBotZone
        : this.getRandomStringArrayValue(SWAG.mappedSpawns[globalmap]);

    //set manually to Savage as supposedly corrects when bot data is requested
    wave.BotSide = "Savage";

    //verify if its a pmcType and set isPlayers to true if it is
    if (SWAG.pmcType.includes(bot.BotType.toLowerCase())) {
      wave.isPlayers = true;
    } else {
      wave.isPlayers = false;
    }

    return wave;
  }

  static ConfigureBossWave(
    boss: BossLocationSpawn,
    RandomBossGroupBotZone: string,
    globalmap: string
  ): BossLocationSpawn {
    const wave: BossLocationSpawn = {
      BossName: SWAG.roleCase[boss.BossName],
      BossChance: boss.BossChance,
      BossZone:
        RandomBossGroupBotZone != null
          ? RandomBossGroupBotZone
          : this.getRandomStringArrayValue(SWAG.mappedSpawns[globalmap]),
      BossPlayer: false,
      BossDifficult: SWAG.diffProper[config.aiDifficulty.toLowerCase()],
      BossEscortType: boss.BossEscortType,
      BossEscortDifficult: SWAG.diffProper[config.aiDifficulty.toLowerCase()],
      BossEscortAmount: boss.BossEscortAmount,
      Time: boss.Time,
      Supports: boss.Supports,
      RandomTimeSpawn: boss.RandomTimeSpawn,
      TriggerId: "",
      TriggerName: "",
    };

    return wave;
  }

  static getRandIntInclusive(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static getRandomStringArrayValue(array: string[]): string {
    return array[Math.floor(Math.random() * array.length)];
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
