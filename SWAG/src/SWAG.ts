import {
  BossLocationSpawn,
  ILocationBase,
  Wave,
} from "@spt-aki/models/eft/common/ILocationBase";
import { ConfigTypes } from "@spt-aki/models/enums/ConfigTypes";
import { IPostDBLoadMod } from "@spt-aki/models/external/IPostDBLoadMod";
import { IPreAkiLoadMod } from "@spt-aki/models/external/IPreAkiLoadMod";
import { IBotConfig } from "@spt-aki/models/spt/config/IBotConfig";
import { ILocations } from "@spt-aki/models/spt/server/ILocations";
import { ILogger } from "@spt-aki/models/spt/utils/ILogger";
import { ConfigServer } from "@spt-aki/servers/ConfigServer";
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import { StaticRouterModService } from "@spt-aki/services/mod/staticRouter/StaticRouterModService";
import { JsonUtil } from "@spt-aki/utils/JsonUtil";
import { RandomUtil } from "@spt-aki/utils/RandomUtil";
import { DependencyContainer } from "tsyringe";
import { LocationCallbacks } from "@spt-aki/callbacks/LocationCallbacks";
import * as ClassDef from "./ClassDef";
import {
  BossPattern,
  GroupPattern,
  aiAmountProper,
  diffProper,
  pmcType,
  roleCase,
  GlobalRandomWaveTimer,
} from "./ClassDef";

import config from "../config/config.json";

const modName = "SWAG";
let logger: ILogger;
let jsonUtil: JsonUtil;
let configServer: ConfigServer;
let botConfig: IBotConfig;
let databaseServer: DatabaseServer;
let locations: ILocations;
let randomUtil: RandomUtil;
let BossWaveSpawnedOnceAlready: boolean;
let locationCallbacks: LocationCallbacks;

const customPatterns: Record<string, ClassDef.GroupPattern> = {};

type LocationName = keyof Omit<ILocations, "base">;
type LocationBackupData = Record<
  LocationName,
  | {
      waves: Wave[];
      BossLocationSpawn: BossLocationSpawn[];
      openZones: string[];
    }
  | undefined
>;

type GlobalPatterns = Record<string, MapPatterns>;
type MapPatterns = {
  MapGroups: GroupPattern[];
  MapBosses: BossPattern[];
};

const globalPatterns: GlobalPatterns = {};

class SWAG implements IPreAkiLoadMod, IPostDBLoadMod {
  public static savedLocationData: LocationBackupData = {
    factory4_day: undefined,
    factory4_night: undefined,
    bigmap: undefined,
    interchange: undefined,
    laboratory: undefined,
    lighthouse: undefined,
    rezervbase: undefined,
    shoreline: undefined,
    tarkovstreets: undefined,
    woods: undefined,

    // unused
    develop: undefined,
    hideout: undefined,
    privatearea: undefined,
    suburbs: undefined,
    terminal: undefined,
    town: undefined,
  };

  preAkiLoad(container: DependencyContainer): void {
    const staticRouterModService = container.resolve<StaticRouterModService>(
      "StaticRouterModService"
    );

    staticRouterModService.registerStaticRouter(
      `${modName}/client/match/offline/end`,
      [
        {
          url: "/client/match/offline/end",
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

    staticRouterModService.registerStaticRouter(
      `${modName}/client/locations`,
      [
        {
          url: "/client/locations",
          action: (
            url: string,
            info: any,
            sessionID: string,
            output: string
          ): any => {
            SWAG.ClearDefaultSpawns();
            SWAG.ConfigureMaps();
            return locationCallbacks.getLocationData(url, info, sessionID);
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
    locationCallbacks =
      container.resolve<LocationCallbacks>("LocationCallbacks");

    SWAG.SetConfigCaps();
    SWAG.ReadAllPatterns();
    SWAG.fillGlobalPatterns();
  }

  static SetConfigCaps(): void {
    //Set Max Bot Caps.. these names changed
    botConfig.maxBotCap["factory4_day"] = config.MaxBotCap["factory"];
    botConfig.maxBotCap["factory4_night"] = config.MaxBotCap["factory"];
    botConfig.maxBotCap["bigmap"] = config.MaxBotCap["customs"];
    botConfig.maxBotCap["interchange"] = config.MaxBotCap["interchange"];
    botConfig.maxBotCap["shoreline"] = config.MaxBotCap["shoreline"];
    botConfig.maxBotCap["woods"] = config.MaxBotCap["woods"];
    botConfig.maxBotCap["rezervbase"] = config.MaxBotCap["reserve"];
    botConfig.maxBotCap["laboratory"] = config.MaxBotCap["laboratory"];
    botConfig.maxBotCap["lighthouse"] = config.MaxBotCap["lighthouse"];
    botConfig.maxBotCap["tarkovstreets"] = config.MaxBotCap["tarkovstreets"];

    //Set Max Bots Per Zone Per Map
    for (let map in locations) {
      locations[map].MaxBotPerZone = config.MaxBotPerZone;
    }

    logger.info("SWAG: Config/Bot Caps Set");
  }

  /**
   * Returns all available OpenZones specified in location.base.OpenZones as well as any OpenZone found in the SpawnPointParams.
   * Filters out all sniper zones
   * @param map
   * @returns
   */
  static GetOpenZones(map: LocationName): string[] {
    const baseobj: ILocationBase = locations[map]?.base;

    // Get all OpenZones defined in the base obj that do not include sniper zones. Need to filter for empty strings as well.
    const foundOpenZones =
      baseobj?.OpenZones?.split(",")
        .filter((name) => !name.includes("Snipe"))
        .filter((name) => name.trim() !== "") ?? [];

    // Sometimes there are zones in the SpawnPointParams that arent listed in the OpenZones, parse these and add them to the list of zones
    baseobj?.SpawnPointParams?.forEach((spawn) => {
      //check spawn for open zones and if it doesn't exist add to end of array
      if (
        spawn?.BotZoneName &&
        !foundOpenZones.includes(spawn.BotZoneName) &&
        !spawn.BotZoneName.includes("Snipe")
      ) {
        foundOpenZones.push(spawn.BotZoneName);
      }
    });

    //logger.info(`SWAG: Open Zones(${map}): ${JSON.stringify(foundOpenZones)}`);
    return foundOpenZones;
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

  static fillGlobalPatterns(): void {
    // Loop through all the custom patterns
    for (const [key, value] of Object.entries(customPatterns)) {
      // `value` is an array of objects containing `MapWrapper`, `GroupPattern`, and `BossPattern` objects
      const mapWrapper = value[0];
      const mapName = mapWrapper.MapName;
      const mapGroups = mapWrapper.MapGroups;
      const mapBosses = mapWrapper.MapBosses;

      // Create an entry in globalPatterns for the map, if it doesn't exist
      if (!globalPatterns[mapName]) {
        globalPatterns[mapName] = { MapGroups: [], MapBosses: [] };
      }

      // Add the mapGroups and mapBosses to the globalPatterns object
      globalPatterns[mapName].MapGroups.push(...mapGroups);
      globalPatterns[mapName].MapBosses.push(...mapBosses);

      // If the mapName is "all", add the patterns to all maps
      if (mapName === "all") {
        for (const map in locations) {
          if (!globalPatterns[map]) {
            globalPatterns[map] = { MapGroups: [], MapBosses: [] };
          }

          globalPatterns[map].MapGroups.push(...mapGroups);
          globalPatterns[map].MapBosses.push(...mapBosses);
        }
      }
    }

    logger.info("SWAG: Global Patterns Filled");
  }

  //This is the main top level function
  static ConfigureMaps(): void {
    // read all customPatterns and push them to the locations table. Invalid maps were being read, those should be filteredout as it causes an error when
    // assigning an openzone to a map that doesn't exist (base)
    Object.keys(locations)
      .filter((name) => ClassDef.validMaps.includes(name))
      .forEach((globalmap: LocationName) => {
        //globalmap is the map name, locations[globalmap] is the map object
        config.DebugOutput && logger.warning(`Configuring ${globalmap}`);

        //read groups setup for globalpatterns
        const mapGroups: ClassDef.GroupPattern[] =
          globalPatterns[globalmap].MapGroups;
        const mapBosses: ClassDef.BossPattern[] =
          globalPatterns[globalmap].MapBosses;

        //reset the bossWaveSpawnedOnceAlready flag
        BossWaveSpawnedOnceAlready = false;

        // Configure Global Random Wave Timer needs to be reset each map
        GlobalRandomWaveTimer.WaveTimerMinSec =
          config.GlobalRandomWaveTimer.WaveTimerMinSec;
        GlobalRandomWaveTimer.WaveTimerMaxSec =
          config.GlobalRandomWaveTimer.WaveTimerMaxSec;

        SWAG.SetUpGroups(mapGroups, mapBosses, globalmap);

        //config.DebugOutput && logger.warning(`Waves for ${globalmap} : ${JSON.stringify(locations[globalmap].base?.waves)}`);
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

    return group.RandomTimeSpawn || isRandomMax || isRandomMin;
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

    //check to see if OnlySpawnOnce is true, if so, check to see if group is already spawned
    if (
      randomGroup.OnlySpawnOnce &&
      AlreadySpawnedGroups.includes(randomGroup)
    ) {
      //if group is already spawned, repick a random group
      config.DebugOutput &&
        logger.warning(`Already spawned ${randomGroup.Name}, repicking`);
      const remainingGroups = RandomGroups.filter(
        (group) => group !== randomGroup
      );
      if (remainingGroups.length > 0) {
        // recursively call until no more groups left to check
        SWAG.SetUpRandomBots(remainingGroups, globalmap, AlreadySpawnedGroups);
      } else {
        // no more groups left to check, exit back to SetUpGroups
        return;
      }
    }

    SWAG.SpawnBots(randomGroup, globalmap, AlreadySpawnedGroups);
  }

  static SetUpRandomBosses(
    RandomBossGroups: ClassDef.BossPattern[],
    globalmap: LocationName,
    AlreadySpawnedBossGroups: ClassDef.BossPattern[]
  ): void {
    //read a random group from RandomBossGroups
    const randomBossGroup = randomUtil.getArrayValue(RandomBossGroups);

    //check to see if RandomBossGroupSpawnOnce is true, if so, check to see if boss group is already spawned
    if (
      randomBossGroup.OnlySpawnOnce &&
      AlreadySpawnedBossGroups.includes(randomBossGroup)
    ) {
      //if boss group is already spawned, repick a random boss group
      config.DebugOutput &&
        logger.warning(
          `Already spawned ${randomBossGroup.BossName}, repicking`
        );
      const remainingBossGroups = RandomBossGroups.filter(
        (boss) => boss !== randomBossGroup
      );
      if (remainingBossGroups.length > 0) {
        // recursively call until no more boss groups left to check
        SWAG.SetUpRandomBosses(
          remainingBossGroups,
          globalmap,
          AlreadySpawnedBossGroups
        );
      } else {
        // no more boss groups left to check, exit back to SetUpGroups
        return;
      }
    }

    SWAG.SpawnBosses(randomBossGroup, globalmap, AlreadySpawnedBossGroups);
  }

  static SetUpStaticBots(
    StaticGroups: ClassDef.GroupPattern[],
    globalmap: LocationName,
    AlreadySpawnedGroups: ClassDef.GroupPattern[]
  ): void {
    //read StaticGroups and set local values
    for (let group of StaticGroups) {
      SWAG.SpawnBots(group, globalmap, AlreadySpawnedGroups);
    }
  }

  static SetUpStaticBosses(
    StaticBossGroups: ClassDef.BossPattern[],
    globalmap: LocationName,
    AlreadySpawnedBossGroups: ClassDef.BossPattern[]
  ): void {
    //read StaticBossGroups and set local values
    for (let boss of StaticBossGroups) {
      SWAG.SpawnBosses(boss, globalmap, AlreadySpawnedBossGroups);
    }
  }

  static SpawnBosses(
    boss: ClassDef.BossPattern,
    globalmap: LocationName,
    AlreadySpawnedBossGroups: ClassDef.BossPattern[]
  ): void {
    //coming into the function, boss has not been spawned yet, do chance and config checks then add to AlreadySpawnedBossGroups

    //check chance against randomint100 to see if boss should spawn from config.bossChance
    if (SWAG.getRandIntInclusive(0, 100) > config.BossChance) {
      return;
    }

    //check make sure BossWaveSpawnedOnceAlready = true and config.SkipOtherBossWavesIfBossWaveSelected = true
    if (
      BossWaveSpawnedOnceAlready &&
      config.SkipOtherBossWavesIfBossWaveSelected
    ) {
      config.DebugOutput &&
        logger.info("SWAG: Skipping boss spawn as one spawned already");
      return;
    }

    //Add boss to alreadyspawnedbosses since passed chance and not alreadyspawned
    AlreadySpawnedBossGroups.push(boss);
    //read group and create wave from individual boss but same timing and location if RandomBossGroupBotZone is not null
    let wave: BossLocationSpawn = SWAG.ConfigureBossWave(boss, globalmap);

    locations[globalmap].base.BossLocationSpawn.push(wave);
  }

  static SpawnBots(
    group: ClassDef.GroupPattern,
    globalmap: LocationName,
    AlreadySpawnedGroups: ClassDef.GroupPattern[]
  ): void {
    AlreadySpawnedGroups.push(group);
    let groupsSpawnPoint: string;
    //read group and create wave from individual bots but same timing and location if StaticGroupBotZone is not null
    for (let bot of group.Bots) {
      const wave: Wave = SWAG.ConfigureBotWave(
        group,
        bot,
        globalmap,
        groupsSpawnPoint
      );

      locations[globalmap].base.waves.push(wave);
    }
  }

  static ConfigureBotWave(
    group: ClassDef.GroupPattern,
    bot: ClassDef.Bot,
    globalmap: LocationName,
    groupsSpawnPoint: string
  ): Wave {
    const isRandom = SWAG.isGroupRandom(group);

    let spawnPoints = "";

    if (groupsSpawnPoint == null || groupsSpawnPoint == undefined) {
      spawnPoints = !!group.BotZone
        ? randomUtil.getStringArrayValue(group.BotZone.split(","))
        : SWAG.savedLocationData[globalmap].openZones &&
          SWAG.savedLocationData[globalmap].openZones.length > 0
        ? randomUtil.getStringArrayValue(
            SWAG.savedLocationData[globalmap].openZones
          )
        : "";
    } else {
      spawnPoints = group.BotZone;
    }

    const wave: Wave = {
      number: null,
      WildSpawnType: roleCase[bot.BotType.toLowerCase()],
      time_min: isRandom
        ? GlobalRandomWaveTimer.WaveTimerMinSec
        : group.Time_min,
      time_max: isRandom
        ? GlobalRandomWaveTimer.WaveTimerMaxSec
        : group.Time_max,
      slots_min: 1,
      slots_max: Math.floor(
        bot.MaxBotCount *
          aiAmountProper[
            config.aiAmount ? config.aiAmount.toLowerCase() : "asonline"
          ]
      ),
      BotPreset: diffProper[config.aiDifficulty.toLowerCase()],
      SpawnPoints: spawnPoints,

      //set manually to Savage as supposedly corrects when bot data is requested
      BotSide: "Savage",
      //verify if its a pmcType and set isPlayers to true if it is
      isPlayers: pmcType.includes(bot.BotType.toLowerCase()),
    };

    if (groupsSpawnPoint == null || groupsSpawnPoint == undefined) {
      groupsSpawnPoint = wave.SpawnPoints;
    }

    // If the wave has a random time, increment the wave timer counts
    if (isRandom) {
      //wave time increment is getting bigger each wave. Fix this by adding maxtimer to min timer
      GlobalRandomWaveTimer.WaveTimerMinSec +=
        config.GlobalRandomWaveTimer.WaveTimerMaxSec;
      GlobalRandomWaveTimer.WaveTimerMaxSec +=
        config.GlobalRandomWaveTimer.WaveTimerMaxSec;
    }

    config.DebugOutput &&
      logger.info("SWAG: Configured Bot Wave: " + JSON.stringify(wave));

    return wave;
  }

  static ConfigureBossWave(
    boss: BossLocationSpawn,
    globalmap: LocationName
  ): BossLocationSpawn {
    //read support bots if defined, set the difficulty to match config
    boss?.Supports?.forEach((escort) => {
      escort.BossEscortDifficult = [
        diffProper[config.aiDifficulty.toLowerCase()],
      ];
      escort.BossEscortType = roleCase[escort.BossEscortType.toLowerCase()];
    });

    //set bossWaveSpawnedOnceAlready to true if not already
    BossWaveSpawnedOnceAlready = true;

    const wave: BossLocationSpawn = {
      BossName: roleCase[boss.BossName.toLowerCase()],
      // If we are configuring a boss wave, we have already passed an internal check to add the wave based off the bossChance.
      // Set the bossChance to guarantee the added boss wave is spawned
      BossChance: 100,
      BossZone: !!boss.BossZone
        ? randomUtil.getStringArrayValue(boss.BossZone.split(","))
        : SWAG.savedLocationData[globalmap].openZones &&
          SWAG.savedLocationData[globalmap].openZones.length > 0
        ? randomUtil.getStringArrayValue(
            SWAG.savedLocationData[globalmap].openZones
          )
        : "",
      BossPlayer: false,
      BossDifficult: diffProper[config.aiDifficulty.toLowerCase()],
      BossEscortType: roleCase[boss.BossEscortType.toLowerCase()],
      BossEscortDifficult: diffProper[config.aiDifficulty.toLowerCase()],
      BossEscortAmount: boss.BossEscortAmount,
      Time: boss.Time,
      Supports: boss.Supports,
      RandomTimeSpawn: boss.RandomTimeSpawn,
      TriggerId: "",
      TriggerName: "",
    };

    config.DebugOutput &&
      logger.warning("SWAG: Configured Boss Wave: " + JSON.stringify(wave));

    return wave;
  }

  static getRandIntInclusive(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static ClearDefaultSpawns(): void {
    let map: keyof ILocations;
    for (map in locations) {
      if (map === "base" || map === "hideout") {
        continue;
      }

      // Save a backup of the wave data and the BossLocationSpawn to use when restoring defaults on raid end. Store openzones in this data as well
      if (!SWAG.savedLocationData[map]) {
        const locationBase = locations[map].base;
        SWAG.savedLocationData[map] = {
          waves: locationBase.waves,
          BossLocationSpawn: locationBase.BossLocationSpawn,
          openZones: this.GetOpenZones(map),
        };
      }

      // Reset Database, Cringe  -- i stole this code from LUA
      locations[map].base.waves = [...SWAG.savedLocationData[map].waves];
      locations[map].base.BossLocationSpawn = [
        ...SWAG.savedLocationData[map].BossLocationSpawn,
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
