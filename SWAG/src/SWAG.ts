import { GameController } from "@spt-aki/controllers/GameController";
import { BotHelper } from "@spt-aki/helpers/BotHelper";
import {
  BossLocationSpawn,
  BossSupport,
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

const modName = "SWAG";

enum gamestate {
  "infoInitialized",
  "clearedSpawns",
}
type LocationName = keyof Omit<ILocations, "base">;

type SpawnZonesByLocation = Record<LocationName, string[]>;

// Structure of the pmc/scav pattern json file entries
interface Pattern {
  Name: string;
  botTypes: string[];
  botCounts: number[];
  time_min: number;
  time_max: number;
  specificTimeOnly: boolean;
}

// Data used in the generation of any wave
interface WaveData<T extends Pattern | BossLocationSpawn> {
  pattern: T;
  map: LocationName;
  customwavetimemin: number;
  wavetimemin: number;
  wavenum: number;
}

// Data used specifically for generating PMC/Scav bots
interface BotWaveData extends WaveData<Pattern> {
  wavetimemin: number;
  wavetimemax: number;
  customwavetimemax: number;
  pmcSide: "Savage" | "Usec" | "Bear";
  isPlayers: boolean;
}

// Data used specifically for generating boss waves
type BossWaveData = WaveData<BossLocationSpawn>;

class SWAG implements IPreAkiLoadMod, IPostDBLoadMod {
  public static roleCase = {
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

  public static pmcType: string[] = ["sptbear", "sptusec"];

  public static scavType: string[] = [
    "assault",
    "cursedassault",
    "exusec",
    "marksman",
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
    "followerzryachiy",
    "sectantwarrior",
    "gifter",
    "pmcbot",
    "assaultgroup",
  ];

  public static bossType: string[] = [
    "bossbully",
    "bosstagilla",
    "bossgluhar",
    "bosskilla",
    "bosskojaniy",
    "bosssanitar",
    "bossknight",
    "bosszryachiy",
    "sectantpriest",
  ];

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

  public static diffProper: object = {
    easy: "easy",
    asonline: "normal",
    normal: "normal",
    hard: "hard",
    impossible: "impossible",
    random: "random",
  };

  public static aiAmountProper: object = {
    low: "low",
    AsOnline: "medium",
    medium: "medium",
    high: "high",
    horde: "horde",
  };

  private static aiAmountMultiplier: number;
  private static config;
  private static pmcpattern: Pattern[];
  private static scavpattern: Pattern[];
  private static bosspattern: BossLocationSpawn[];
  private static waveLimit;
  private static bossChance;
  private static status: gamestate;
  private static bossSpawnedInCurrentMap: boolean;
  private static logger: ILogger;
  private static jsonUtil: JsonUtil;
  private static configServer: ConfigServer;
  private static botConfig: IBotConfig;
  private static databaseServer: DatabaseServer;
  private static locations: ILocations;
  private static savedLocations;
  private static botHelper: BotHelper;
  private static randomUtil: RandomUtil;
  private static gameController: GameController;

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
            if (SWAG.status != gamestate.infoInitialized) {
              SWAG.configureLocationsWaveData()
            }
            return output;
          },
        },
      ],
      "aki"
    );
  }

  postDBLoad(container: DependencyContainer): void {
    SWAG.logger = container.resolve<ILogger>("WinstonLogger");
    SWAG.jsonUtil = container.resolve<JsonUtil>("JsonUtil");
    SWAG.configServer = container.resolve<ConfigServer>("ConfigServer");
    SWAG.botConfig = SWAG.configServer.getConfig<IBotConfig>(ConfigTypes.BOT);
    SWAG.databaseServer = container.resolve<DatabaseServer>("DatabaseServer");
    SWAG.locations = SWAG.databaseServer.getTables().locations;
    SWAG.botHelper = container.resolve<BotHelper>("BotHelper");
    SWAG.randomUtil = container.resolve<RandomUtil>("RandomUtil");
    SWAG.gameController = container.resolve<GameController>("GameController");

    SWAG.config = require(`../config/config.json`);
    SWAG.pmcpattern = require(`../config/pmcpattern.json`);
    SWAG.scavpattern = require(`../config/scavpattern.json`);
    SWAG.bosspattern = require(`../config/bosspattern.json`);
    SWAG.waveLimit = SWAG.config.waveLimit;
    SWAG.bossChance = SWAG.config.bossChance;

    SWAG.swagConfig()
    SWAG.storeOpenZones();
    SWAG.configureLocationsWaveData();
  }

  
  static swagConfig() {
    //Set Max Bot Caps
    for (let map in SWAG.botConfig.maxBotCap) {
      SWAG.botConfig.maxBotCap[map] = SWAG.config.setMaxBotsPerTypePerMap;
    }

    //Fix PMC Bot Limits
    for (let map in SWAG.botConfig.pmc.pmcType.sptbear) {
      for (let botType in SWAG.botConfig.pmc.pmcType.sptbear[map]) {
        SWAG.botConfig.pmc.pmcType.sptbear[map][botType] =
          SWAG.config.setMaxBotsPerTypePerMap;
      }
    }

    for (let map in SWAG.botConfig.pmc.pmcType.sptusec) {
      for (let botType in SWAG.botConfig.pmc.pmcType.sptusec[map]) {
        SWAG.botConfig.pmc.pmcType.sptusec[map][botType] =
          SWAG.config.setMaxBotsPerTypePerMap;
      }
    }

    SWAG.botConfig.botGenerationBatchSizePerType = 10;

    //show me what is fucking wrong
    for (let thetype in SWAG.botConfig.presetBatch) {
      SWAG.botConfig.presetBatch[thetype] = 50;
      //logger.info(`thetype:${thetype} - ${JSON.stringify(botConfig.presetBatch[thetype], null, `\t`)}`);
    }

    //set up ai horde mode to work
    if (SWAG.config.DebugOutput)
      SWAG.logger.info(`config.aiAmount: ${SWAG.config.aiAmount}`);

    switch (SWAG.config.aiAmount.toLowerCase()) {
      case "low":
        SWAG.aiAmountMultiplier = 0.5;
        break;
      case "medium":
        SWAG.aiAmountMultiplier = 1.0;
        break;
      case "high":
        SWAG.aiAmountMultiplier = 2.5;
        break;
      case "horde":
        SWAG.aiAmountMultiplier = 5.0;
        break;
      default:
        SWAG.aiAmountMultiplier = 1.0;
        break;
    }

    if (SWAG.config.DebugOutput)
      SWAG.logger.info(`config.aiDifficulty: ${SWAG.config.aiDifficulty}`);
  }

  static configureLocationsWaveData() {
    SWAG.clearDefaultWaves();
    SWAG.generateAllLocationWaves();
  }

  /**
   * Parse database -> locations.json and for each location map the available open zones
   */
  static storeOpenZones(): void {
    for (let map in SWAG.locations) {
      const baseobj: ILocationBase = SWAG.locations[map].base;

      const openZones = baseobj?.OpenZones?.split(",").filter(
        (name) => !name.includes("Snipe")
      );

      SWAG.mappedSpawns[map] = openZones;
    }
  }

  static generateAllLocationWaves(): void {
    if (SWAG.config.DebugOutput) SWAG.logger.info(`SWAG: Generating Waves`);

    // Uses it as variable for waves were generated (server restart, etc)
    SWAG.status = gamestate.infoInitialized;

    // Iterate through each map in the locations.json and generate waves
    Object.keys(SWAG.locations).forEach((map: LocationName) => {
      const map_name = map.toLowerCase();
      // logger.info(`map_name: ${map_name}`);
      // logger.info(`locations: ${locations}`);

      if (SWAG.validMaps.includes(map_name)) {
        if (SWAG.config.DebugOutput) {
          SWAG.logger.info(`========================================`);
        }

        if (SWAG.config.RandomSoloPatternFilePerMap) {
          const choice = SWAG.randomUtil.getArrayValue(["pmc", "scav", "boss"]);
          switch (choice) {
            case "pmc":
              SWAG.genWaves(SWAG.pmcpattern, map, "pmc");
              break;
            case "scav":
              SWAG.genWaves(SWAG.scavpattern, map, "scav");
              break;
            case "boss":
              SWAG.genWaves(SWAG.bosspattern, map, "boss");
              break;
            default:
              SWAG.genWaves(SWAG.pmcpattern, map, "pmc");
              break;
          }
        } else {
          SWAG.bossSpawnedInCurrentMap = false;
          SWAG.genWaves(SWAG.bosspattern, map, "boss");

          const skipWaves =
            SWAG.config.skipOtherWavesIfBossWaveSelected &&
            SWAG.bossSpawnedInCurrentMap;

          // if boss wave is selected, skip other waves
          if (!skipWaves) {
            SWAG.genWaves(SWAG.pmcpattern, map, "pmc");
            SWAG.genWaves(SWAG.scavpattern, map, "scav");
          } else if (SWAG.config.DebugOutput) {
            SWAG.logger.error(
              `SWAG: Skipping Other PMC & SCAV as Boss Wave Selected On: ${map}`
            );
            SWAG.logger.info(`========================================`);
          }

          if (SWAG.config.DebugOutput) {
            SWAG.logger.info(`========================================`);
            SWAG.logger.error(
              `Total waves: ${SWAG.locations[map].base.waves.length}`
            );
          }
        }
      }
    });

    SWAG.gameController.fixBrokenOfflineMapWaves();
    SWAG.gameController.splitBotWavesIntoSingleWaves();
  }

  static genWaves(
    patternConfig: Array<Pattern | BossLocationSpawn>,
    map: LocationName,
    manageType: "boss" | "pmc" | "scav"
  ): void {
    if (SWAG.config.DebugOutput) {
      SWAG.logger.error(`SWAG: Generate ${manageType} Pattern: ${map}`);
    }

    let wavetimemin: number = 0;
    let wavetimemax: number = 0;
    let customwavetimemin: number;
    let customwavetimemax: number;

    //Start waves here.
    for (let wavenum = 0; wavenum < SWAG.waveLimit; wavenum++) {
      // Select a random pattern from the supplied config
      const randomPattern =
        patternConfig.length > 0
          ? SWAG.randomUtil.getArrayValue(patternConfig)
          : undefined;

      // Skip generating wave if there is no pattern
      if (!randomPattern) {
        continue;
      }

      if (manageType === "boss") {
        //get chance to spawn boss from config at the wave level
        const chance = SWAG.randomUtil.getChance100(SWAG.bossChance);
        if (!chance) {
          //logger.info(`SWAG: Boss Wave Chance: ${chance}`);
          continue;
        }
        //logger.info(`SWAG: Boss Wave Chance: ${chance}`);
      }

      if (SWAG.config.DebugOutput) {
        SWAG.logger.warning(
          `=====================================================`
        );
        SWAG.logger.info(`randomPattern: ${JSON.stringify(randomPattern)}`);
      }

      // if(config.DebugOutput)
      //  	logger.info(`patternArray: ${patternArray}`);

      //redo this entire logic as it is causing an infinite loop
      //if they entered timer for a non-boss wave then use it.

      if (manageType !== "boss") {
        const randomBotPattern = randomPattern as Pattern;
        if (randomBotPattern.specificTimeOnly == true) {
          //is the time good?
          if (
            randomBotPattern.time_min == null ||
            randomBotPattern.time_max == null
          ) {
            if (wavenum == 0) {
              wavetimemin = SWAG.config.WaveTimerMinInSeconds;
              wavetimemax = SWAG.config.WaveTimerMaxInSeconds;
            } else {
              wavetimemin += SWAG.config.WaveTimerMaxInSeconds;
              wavetimemax += SWAG.config.WaveTimerMaxInSeconds;
            }
          } else {
            customwavetimemin = randomBotPattern.time_min;
            customwavetimemax = randomBotPattern.time_max;
          }
        } else {
          if (wavenum == 0) {
            wavetimemin = SWAG.config.WaveTimerMinInSeconds;
            wavetimemax = SWAG.config.WaveTimerMaxInSeconds;
          } else {
            wavetimemin += SWAG.config.WaveTimerMaxInSeconds;
            wavetimemax += SWAG.config.WaveTimerMaxInSeconds;
          }
        }
      }

      if (SWAG.config.DebugOutput) {
        SWAG.logger.info(`wavetimemin: ${JSON.stringify(wavetimemin)}`);
        SWAG.logger.info(`wavetimemax: ${JSON.stringify(wavetimemax)}`);
        SWAG.logger.info(
          `customwavetimemin: ${JSON.stringify(customwavetimemin)}`
        );
        SWAG.logger.info(
          `customwavetimemax: ${JSON.stringify(customwavetimemax)}`
        );
      }

      //Logic to determine if we need to print concurrent waves at same time
      const randomPatternName =
        (randomPattern as Pattern)?.Name.toLowerCase() ||
        (randomPattern as BossLocationSpawn)?.BossName.toLowerCase();

      //check all 3 files for same name
      const matchingPMCPatterns = SWAG.pmcpattern?.filter(
        (pattern) => pattern.Name.toLowerCase() === randomPatternName
      );
      const matchingBossPatterns = SWAG.bosspattern?.filter(
        (pattern) => pattern.BossName.toLowerCase() === randomPatternName
      );
      const matchingScavPatterns = SWAG.scavpattern?.filter(
        (pattern) => pattern.Name.toLowerCase() === randomPatternName
      );

      // Go through all matching patterns and generate wave data for each
      matchingPMCPatterns?.forEach((pattern) => {
        SWAG.createBotWaveData({
          pattern,
          map,
          customwavetimemax,
          customwavetimemin,
          wavenum,
          wavetimemax,
          wavetimemin,
          pmcSide: "Savage",
          isPlayers: false,
        });
        if (SWAG.config.DebugOutput)
          SWAG.logger.info(`SWAG: Same Name in PMC: ${pattern.Name}`);
      });

      matchingBossPatterns?.forEach((pattern) => {
        SWAG.createBossWaveData({
          pattern,
          map,
          customwavetimemin,
          wavenum,
          wavetimemin,
        });

        if (SWAG.config.DebugOutput)
          SWAG.logger.info(`SWAG: Same Name in Boss: ${pattern.BossName}`);
      });

      matchingScavPatterns?.forEach((pattern) => {
        SWAG.createBotWaveData({
          pattern,
          map,
          wavetimemin,
          wavetimemax,
          customwavetimemin,
          customwavetimemax,
          wavenum,
          pmcSide: "Savage",
          isPlayers: false,
        });
        if (SWAG.config.DebugOutput)
          SWAG.logger.info(`SWAG: Same Name in Scav: ${pattern.Name}`);
      });
    }
  }

  static createBossWaveData({
    pattern,
    map,
    customwavetimemin,
    wavetimemin,
    wavenum,
  }: BossWaveData) {
    const bossPattern = pattern as BossLocationSpawn;

    if (SWAG.bossType.includes(bossPattern.BossName)) {
      const theBoss = bossPattern.BossName;
      const theBossSupport: BossSupport[] = [];

      let myBossZones = SWAG.randomUtil.getStringArrayValue(
        SWAG.mappedSpawns[map]
      );

      if (myBossZones == null) {
        myBossZones = "";
      }

      if (SWAG.config.DebugOutput) {
        SWAG.logger.error(`Random Boss Zone: ${JSON.stringify(myBossZones)}`);
      }

      if (bossPattern.Supports != null) {
        for (let index in bossPattern.Supports) {
          const tempDifficulty: string[] = [
            SWAG.diffProper[SWAG.config.aiDifficulty.toLowerCase()],
          ];

          const tempsupport: BossSupport = {
            BossEscortAmount:
              SWAG.roleCase[
                bossPattern.Supports[index].BossEscortType.toLowerCase()
              ],
            BossEscortDifficult: tempDifficulty,
            BossEscortType: bossPattern.Supports[index].BossEscortAmount,
          };

          if (SWAG.config.DebugOutput)
            SWAG.logger.info(
              `SWAG: Boss Support: ${JSON.stringify(tempsupport)}`
            );

          theBossSupport.push(tempsupport);
        }
      }

      if (bossPattern.Time === undefined || bossPattern.Time === null) {
        bossPattern.Time =
          customwavetimemin !== undefined ? customwavetimemin : wavetimemin;
      }

      const bossWave: BossLocationSpawn = {
        BossName: SWAG.roleCase[theBoss],
        BossChance: 100,
        BossZone: myBossZones,
        BossPlayer: false,
        BossDifficult: SWAG.diffProper[SWAG.config.aiDifficulty.toLowerCase()],
        BossEscortType: SWAG.roleCase[bossPattern.BossEscortType.toLowerCase()],
        BossEscortDifficult:
          SWAG.diffProper[SWAG.config.aiDifficulty.toLowerCase()],
        BossEscortAmount: bossPattern.BossEscortAmount,
        Time: bossPattern.Time,
        Supports: theBossSupport,
        RandomTimeSpawn: bossPattern.RandomTimeSpawn,
        TriggerId: "",
        TriggerName: "",
      };

      if (SWAG.config.DebugOutput)
        SWAG.logger.info(
          `wave#${wavenum} (boss): ${bossPattern.BossName}: ${JSON.stringify(
            bossWave
          )}`
        );

      SWAG.locations[map].base.BossLocationSpawn.push(bossWave);
      SWAG.bossSpawnedInCurrentMap = true;
    }
  }

  static createBotWaveData({
    pattern,
    map,
    customwavetimemin,
    customwavetimemax,
    wavetimemax,
    wavetimemin,
    wavenum,
  }: BotWaveData) {
    const botPattern = pattern as Pattern;

    // cycle through the bot types and spawn them as additional waves
    for (let type in botPattern.botTypes) {
      //logger.info(`type: ${randomPattern[1].botTypes[type]}`);
      const wildSpawnType =
        SWAG.roleCase[botPattern.botTypes[type].toLowerCase()];

      const aiAmountTemp = Math.floor(
        SWAG.aiAmountMultiplier *
          SWAG.randomUtil.getInt(2, botPattern.botCounts[type])
      );

      const spawnPoints = SWAG.randomUtil.getStringArrayValue(
        SWAG.mappedSpawns[map]
      );

      const isPMC = SWAG.botHelper.isBotPmc(wildSpawnType);

      const wave: Wave = {
        number: 0,
        time_min:
          customwavetimemin !== undefined ? customwavetimemin : wavetimemin,
        time_max:
          customwavetimemax !== undefined ? customwavetimemax : wavetimemax,
        slots_min: 1,
        slots_max: aiAmountTemp,
        SpawnPoints: spawnPoints,
        BotSide: "Savage",
        BotPreset: SWAG.diffProper[SWAG.config.aiDifficulty.toLowerCase()],
        WildSpawnType: wildSpawnType,
        isPlayers: isPMC,
      };

      if (SWAG.config.DebugOutput) {
        SWAG.logger.info(
          `wave#${wavenum} (${
            isPMC ? "pmc" : "scav"
          }): ${wildSpawnType}: ${JSON.stringify(wave)}`
        );
      }

      SWAG.locations[map].base.waves.push(wave);
    }
  }

  static clearDefaultWaves(): void {
    if (!SWAG.savedLocations) {
      SWAG.savedLocations = SWAG.jsonUtil.clone(SWAG.locations);
    }

    for (const mapName in SWAG.locations) {
      const map = mapName.toLowerCase();
      if (map === "base" || map === "hideout") {
        continue;
      }

      // Reset Database, Cringe  -- i stole this code from LUA
      SWAG.locations[map].base.waves = [...SWAG.savedLocations[map].base.waves];
      SWAG.locations[map].base.BossLocationSpawn = [
        ...SWAG.savedLocations[map].base.BossLocationSpawn,
      ];

      //Clear bots spawn
      if (!SWAG.config?.UseDefaultSpawns?.Waves) {
        SWAG.locations[map].base.waves = [];
      }

      //Clear boss spawn
      const bossLocationSpawn = SWAG.locations[map].base.BossLocationSpawn;
      if (
        !SWAG.config?.UseDefaultSpawns?.Bosses &&
        !SWAG.config?.UseDefaultSpawns?.TriggeredWaves
      ) {
        SWAG.locations[map].base.BossLocationSpawn = [];
      } else {
        // Remove Default Boss Spawns
        if (!SWAG.config?.UseDefaultSpawns?.Bosses) {
          for (let i = 0; i < bossLocationSpawn.length; i++) {
            // Triggered wave check
            if (bossLocationSpawn[i]?.TriggerName?.length === 0) {
              SWAG.locations[map].base.BossLocationSpawn.splice(i--, 1);
            }
          }
        }

        // Remove Default Triggered Waves
        if (!SWAG.config?.UseDefaultSpawns?.TriggeredWaves) {
          for (let i = 0; i < bossLocationSpawn.length; i++) {
            // Triggered wave check
            if (bossLocationSpawn[i]?.TriggerName?.length > 0) {
              SWAG.locations[map].base.BossLocationSpawn.splice(i--, 1);
            }
          }
        }
      }
    }

    SWAG.status = gamestate.clearedSpawns;
  }
}

module.exports = { mod: new SWAG() };
