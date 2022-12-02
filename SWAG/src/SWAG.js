"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ConfigTypes_1 = require("C:/snapshot/project/obj/models/enums/ConfigTypes");
const config = require(`../config/config.json`);
const pmcpattern = require(`../config/pmcpattern.json`);
const scavpattern = require(`../config/scavpattern.json`);
const bosspattern = require(`../config/bosspattern.json`);
const modName = "SWAG";
const waveLimit = config.waveLimit;
let logger;
let jsonUtil;
let configServer;
let botConfig;
let databaseServer;
let bots;
let locations;
let savedLocations;
let botHelper;
let randomUtil;
let status;
let globalSpawnCounter = 0;
let botCallbacks;
let botController;
let httpResponse;
let InRaidConfig;
var gamestate;
(function (gamestate) {
    gamestate[gamestate["infoInitialized"] = 0] = "infoInitialized";
    gamestate[gamestate["alreadyGenerated"] = 1] = "alreadyGenerated";
})(gamestate || (gamestate = {}));
class SWAG {
    preAkiLoad(container) {
        const dynamicRouterModService = container.resolve("DynamicRouterModService");
        const staticRouterModService = container.resolve("StaticRouterModService");
        staticRouterModService.registerStaticRouter(`${modName}-/singleplayer/settings/raid/menu`, [
            {
                url: "/singleplayer/settings/raid/menu",
                action: (url, info, sessionID, output) => {
                    // Is this hideout already closed?
                    const locations = container.resolve("DatabaseServer").getTables().locations;
                    if (status != gamestate.infoInitialized) {
                        SWAG.ClearDefaultSpawns();
                        SWAG.configureMaps(container);
                    }
                    return output;
                }
            }
        ], "aki");
        staticRouterModService.registerStaticRouter(`${modName}-/client/locations`, [
            {
                url: "/client/locations",
                action: (url, info, sessionID, output) => {
                    SWAG.ClearDefaultSpawns();
                    SWAG.configureMaps(container);
                    return container.resolve("LocationCallbacks").getLocationData(url, info, sessionID);
                }
            }
        ], "aki");
    }
    postDBLoad(container) {
        logger = container.resolve("WinstonLogger");
        jsonUtil = container.resolve("JsonUtil");
        configServer = container.resolve("ConfigServer");
        botConfig = configServer.getConfig(ConfigTypes_1.ConfigTypes.BOT);
        databaseServer = container.resolve("DatabaseServer");
        bots = databaseServer.getTables().bots;
        locations = databaseServer.getTables().locations;
        botHelper = container.resolve("BotHelper");
        randomUtil = container.resolve("RandomUtil");
        botController = container.resolve("BotController");
        httpResponse = container.resolve("HttpResponseUtil");
        InRaidConfig = configServer.getConfig(ConfigTypes_1.ConfigTypes.IN_RAID);
        //singleplayer/settings/bot/maxCap
        //singleplayer/settings/bot/limit/0
        //logger.info(JSON.stringify(botConfig.maxBotCap, null, `\t`));
        //Set Max Bot Caps 
        for (let map in botConfig.maxBotCap) {
            botConfig.maxBotCap[map] = 40;
        }
        //Fix PMC Bot Limits
        for (let map in botConfig.pmc.pmcType.sptbear) {
            for (let botType in botConfig.pmc.pmcType.sptbear[map]) {
                botConfig.pmc.pmcType.sptbear[map][botType] = 40;
            }
        }
        //show me what is fucking wrong
        for (let thetype in botConfig.presetBatch) {
            botConfig.presetBatch[thetype] = 50;
            //logger.info(`thetype:${thetype} - ${JSON.stringify(botConfig.presetBatch[thetype], null, `\t`)}`);
        }
        //logger.info(JSON.stringify(botConfig.maxBotCap, null, `\t`));
    }
    static configureMaps(container) {
        logger.info(`SWAG: Generating Waves`);
        // Uses it as variable for waves were generated (server restart, etc)
        status = gamestate.infoInitialized;
        let spawnpoints = [];
        for (let map in locations) {
            let map_name = map.toLowerCase();
            // logger.info(`map_name: ${map_name}`);
            // logger.info(`locations: ${locations}`);
            //Get unique possible zone types in array for pmc
            let pmcZoneTypes = [];
            let bossZoneTypes = [];
            //grab/assign a unique name to spawn points to use later 
            if (this.validMaps.includes(map_name)) {
                logger.info(`========================================`);
                logger.error(`SWAG: Generate PMC Pattern: ${map}`);
                SWAG.genWaveManager(pmcpattern, map, "pmc");
                logger.error(`SWAG: Generate Boss Pattern: ${map}`);
                SWAG.genWaveManager(bosspattern, map, "boss");
                logger.error(`SWAG: Generate Scav Pattern: ${map}`);
                SWAG.genWaveManager(scavpattern, map, "scav");
                //logger.info(`waves: ${JSON.stringify(locations[map].base.waves, null, `\t`)}`);
                logger.info(`========================================`);
                globalSpawnCounter = 0;
            }
        }
    }
    static getRandIntInclusive(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    static getRandomisedPmcSide() {
        return (randomUtil.getChance100(botConfig.pmc.isUsec))
            ? "Usec"
            : "Bear";
    }
    static getPmcSideByRole(botRole) {
        switch (botRole.toLowerCase()) {
            case botConfig.pmc.bearType.toLowerCase():
                return "Bear";
            case botConfig.pmc.usecType.toLowerCase():
                return "Usec";
            default:
                return SWAG.getRandomisedPmcSide();
        }
    }
    static genWaveManager(patternConfig, map, managetype) {
        const waveLimit = config.waveLimit;
        switch (managetype) {
            case "pmc":
                this.genWave(patternConfig, map, managetype);
                break;
            case "boss":
                this.genWave(patternConfig, map, managetype);
                break;
            case "scav":
                this.genWave(patternConfig, map, managetype);
                break;
            default: break;
        }
    }
    static genWave(patternConfig, map, manageType) {
        logger.info(`managetype: ${manageType}`);
        let patternType;
        //fk i'm dumb
        switch (manageType) {
            case "pmc":
                patternType = patternConfig.pmc;
                break;
            case "boss":
                patternType = patternConfig.boss;
                break;
            case "scav":
                patternType = patternConfig.scav;
                break;
            default: break;
        }
        //check if boss is enabled in the raid settings and get chance to spawn boss from config
        if (manageType == "boss" && InRaidConfig.raidMenuSettings.bossEnabled == true) {
            let chance = randomUtil.getChance100(config.bossWaveChance);
            if (!chance)
                return;
        }
        let aiAmountMultiplier;
        //set up ai horde mode to work
        switch (config.aiAmount.toLowerCase()) {
            case "low":
                aiAmountMultiplier = 0.5;
                break;
            case "medium":
                aiAmountMultiplier = 1.0;
                break;
            case "high":
                aiAmountMultiplier = 3.0;
                break;
            case "horde":
                aiAmountMultiplier = 6.0;
                break;
        }
        let wavetimemin = 0;
        let wavetimemax = 0;
        let randomPattern;
        let pmcSide;
        let isPlayers;
        for (let i = 0; i < waveLimit; i++) {
            //logger.info(`patternConfig: ${JSON.stringify(patternType)}`);
            wavetimemin += config.WaveTimerMinInSeconds;
            wavetimemax += config.WaveTimerMaxInSeconds;
            let patternobj = Object.entries(patternType);
            randomPattern = patternobj[SWAG.getRandIntInclusive(0, patternobj.length - 1)];
            //logger.info(`randomPattern: ${JSON.stringify(randomPattern)}`);
            for (let type in randomPattern[1].botTypes) {
                logger.info(`type: ${randomPattern[1].botTypes[type]}`);
                if (manageType == "pmc") {
                    pmcSide = SWAG.getPmcSideByRole(randomPattern[1].botTypes[type]);
                    isPlayers = true;
                }
                else {
                    pmcSide = "Savage";
                    isPlayers = false;
                }
                let tempwave = new wave(0, wavetimemin, wavetimemax, 1, Math.floor(aiAmountMultiplier * randomUtil.getInt(1, randomPattern[1].botCounts[type])), "", pmcSide, config.aiDifficulty.toLowerCase(), SWAG.roleCase[randomPattern[1].botTypes[type]], isPlayers);
                //logger.info(`tempwave${type}: ${JSON.stringify(tempwave)}`)
                locations[map].base.waves.push(tempwave);
            }
        }
    }
    static ClearDefaultSpawns() {
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
            locations[map].base.BossLocationSpawn = [...savedLocations[map].base.BossLocationSpawn];
            //Clear bots spawn
            if (!config?.UseDefaultSpawns?.Waves) {
                locations[map].base.waves = [];
            }
            //Clear boss spawn
            const bossLocationSpawn = locations[map].base.BossLocationSpawn;
            if (!config?.UseDefaultSpawns?.Bosses && !config?.UseDefaultSpawns?.TriggeredWaves) {
                locations[map].base.BossLocationSpawn = [];
            }
            else {
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
        status = gamestate.alreadyGenerated;
    }
}
SWAG.roleCase = {
    "assault": "assault",
    "exusec": "exUsec",
    "marksman": "marksman",
    "pmcbot": "pmcBot",
    "sectantpriest": "sectantPriest",
    "sectantwarrior": "sectantWarrior",
    "assaultgroup": "assaultGroup",
    "bossbully": "bossBully",
    "bosstagilla": "bossTagilla",
    "bossgluhar": "bossGluhar",
    "bosskilla": "bossKilla",
    "bosskojaniy": "bossKojaniy",
    "bosssanitar": "bossSanitar",
    "followerbully": "followerBully",
    "followergluharassault": "followerGluharAssault",
    "followergluharscout": "followerGluharScout",
    "followergluharsecurity": "followerGluharSecurity",
    "followergluharsnipe": "followerGluharSnipe",
    "followerkojaniy": "followerKojaniy",
    "followersanitar": "followerSanitar",
    "followertagilla": "followerTagilla",
    "cursedassault": "cursedAssault",
    "usec": "usec",
    "bear": "bear",
    "sptbear": "sptBear",
    "sptusec": "sptUsec",
    "bosstest": "bossTest",
    "followertest": "followerTest",
    "gifter": "gifter",
    "bossknight": "bossKnight",
    "followerbigpipe": "followerBigPipe",
    "followerbirdeye": "followerBirdEye"
};
SWAG.validMaps = [
    "bigmap",
    "factory4_day",
    "factory4_night",
    "interchange",
    "laboratory",
    "lighthouse",
    "rezervbase",
    "shoreline",
    "woods"
];
SWAG.diffProper = {
    "easy": "easy",
    "AsOnline": "normal",
    "hard": "hard",
    "impossible": "impossible",
    "random": "random"
};
SWAG.aiAmountProper = {
    "low": "low",
    "AsOnline": "medium",
    "medium": "medium",
    "high": "high",
    "horde": "horde"
};
module.exports = { mod: new SWAG() };
class wave {
    constructor(number, time_min, time_max, slots_min, slots_max, SpawnPoints, BotSide, BotPreset, WildSpawnType, isPlayers) {
        this.number = number;
        this.time_min = time_min;
        this.time_max = time_max;
        this.slots_min = slots_min;
        this.slots_max = slots_max;
        this.SpawnPoints = SpawnPoints;
        this.BotSide = BotSide;
        this.BotPreset = BotPreset;
        this.WildSpawnType = WildSpawnType;
        this.isPlayers = isPlayers;
    }
}
