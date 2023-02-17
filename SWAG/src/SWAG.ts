
import { DependencyContainer } from "tsyringe";
import { IPreAkiLoadMod } from "@spt-aki/models/external/IPreAkiLoadMod";
import { IPostDBLoadMod } from "@spt-aki/models/external/IPostDBLoadMod";
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import { ILogger } from "@spt-aki/models/spt/utils/ILogger";
import { StaticRouterModService } from "@spt-aki/services/mod/staticRouter/StaticRouterModService";
import { RandomUtil } from "@spt-aki/utils/RandomUtil";
import { JsonUtil } from "@spt-aki/utils/JsonUtil";
import { BotHelper } from "@spt-aki/helpers/BotHelper";
import { ConfigTypes } from "@spt-aki/models/enums/ConfigTypes";
import { IBotConfig } from "@spt-aki/models/spt/config/IBotConfig";
import { LocationCallbacks } from "@spt-aki/callbacks/LocationCallbacks";
import { ConfigServer } from "@spt-aki/servers/ConfigServer";

const modName = "SWAG"
let logger: ILogger;
let jsonUtil: JsonUtil
let configServer: ConfigServer;
let botConfig: IBotConfig;
let databaseServer: DatabaseServer;
let locations;
let savedLocations;
let botHelper: BotHelper;
let randomUtil: RandomUtil;

let config;
let pmcpattern;
let scavpattern;
let bosspattern;
let waveLimit;
let bossChance;
let aiAmountMultiplier;
let Spawnpoints: SpawnLocations;
let status: gamestate;
let bossSpawnedInCurrentMap: boolean;


type JSONValue =
	| string
	| number
	| boolean
	| { [x: string]: JSONValue }
	| Array<JSONValue>;

enum gamestate {
	"infoInitialized",
	"clearedSpawns"
}

class SWAG implements IPreAkiLoadMod, IPostDBLoadMod {

	public static roleCase: object = {
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
		"followerbirdeye": "followerBirdEye",
		"bosszryachiy": "bossZryachiy",
		"followerzryachiy": "followerZryachiy"
	}

	public static pmcType: string[] = [
		"sptbear",
		"sptusec"
	]

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
		"assaultgroup"
	]
		
	public static bossType: string[] = [
		"bossbully",
		"bosstagilla",
		"bossgluhar",
		"bosskilla",
		"bosskojaniy",
		"bosssanitar",
		"bossknight",
		"bosszryachiy",
		"sectantpriest"
	]

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
		"woods"
	]

	public static diffProper: object = {
		"easy": "easy",
		"asonline": "normal",
		"normal": "normal",
		"hard": "hard",
		"impossible": "impossible",
		"random": "random"
	}

	public static aiAmountProper: object = {
		"low": "low",
		"AsOnline": "medium",
		"medium": "medium",
		"high": "high",
		"horde": "horde"
	}

	preAkiLoad(container: DependencyContainer): void {

		const staticRouterModService = container.resolve<StaticRouterModService>("StaticRouterModService");

		
		staticRouterModService.registerStaticRouter(`${modName}/singleplayer/settings/raid/endstate`,
			[
				{
					url: "/singleplayer/settings/raid/endstate",
					action: (url: string, info: any, sessionID: string, output: string): any => {
						if (status != gamestate.infoInitialized) {
							SWAG.ClearDefaultSpawns();
							SWAG.configureMaps();
						}
						return output;
					}
				}], "aki");

		staticRouterModService.registerStaticRouter(`${modName}/client/locations`,
			[
				{
					url: "/client/locations",
					action: (url: string, info: any, sessionID: string, output: string): any => {
						SWAG.ClearDefaultSpawns();
						SWAG.configureMaps();
						return output;
					}
				}], "aki");
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
		pmcpattern = require(`../config/pmcpattern.json`);
		scavpattern = require(`../config/scavpattern.json`);
		bosspattern = require(`../config/bosspattern.json`);

		waveLimit = config.waveLimit;
		bossChance = config.bossChance;

		//Set Max Bot Caps 
		for (let map in botConfig.maxBotCap) {
			botConfig.maxBotCap[map] = config.setMaxBotsPerTypePerMap;
		}

		//Fix PMC Bot Limits
		for (let map in botConfig.pmc.pmcType.sptbear) {
			for (let botType in botConfig.pmc.pmcType.sptbear[map]) {
				botConfig.pmc.pmcType.sptbear[map][botType] = config.setMaxBotsPerTypePerMap;
			}
		}

		for (let map in botConfig.pmc.pmcType.sptusec) {
			for (let botType in botConfig.pmc.pmcType.sptusec[map]) {
				botConfig.pmc.pmcType.sptusec[map][botType] = config.setMaxBotsPerTypePerMap;
			}
		}

		botConfig.botGenerationBatchSizePerType = 10;

		//show me what is fucking wrong
		for (let thetype in botConfig.presetBatch) {
			botConfig.presetBatch[thetype] = 50;
			//logger.info(`thetype:${thetype} - ${JSON.stringify(botConfig.presetBatch[thetype], null, `\t`)}`);
		}
		
		SWAG.findSpawnValues();
	}

	static removeNonUnique(array: string[]): string[] {
		return array.filter((item, index) => array.indexOf(item) === index);
	  }

	static findSpawnValues(): void {
		//Assign names to all spawn points for existing maps (even custom locations)
		let workingspawnpoints: SpawnPointParam[];

		for (let map in locations) {
			let baseobj = locations[map].base;
			for(let element in baseobj){
				if (element === "SpawnPointParams")
				{
					workingspawnpoints = baseobj[element];

					if(config.DebugOutput){
						//logger.info(`Found spawnpoints for ${map}`)
					}

					workingspawnpoints.forEach(element => {
						let temp: SpawnPointParam = element;
						if (temp.BotZoneName === undefined || temp.BotZoneName === null || temp.BotZoneName === "") {
							temp.BotZoneName = `${map}${element.Id.substring(0,8)}Zone`;
						}
						
						if(config.DebugOutput){
							//logger.info(`Adding spawnpoint name:${JSON.stringify(temp.BotZoneName, null, `\t`)}`);
						}					
					});

					break;
				}
			}
			
			//logger.info(`spawns:${JSON.stringify(spawns, null, `\t`)}`)
		}

		
		//Add spawn points to map manager with existing Open Zones
		Spawnpoints = new SpawnLocations();
		for (let map in locations) 
		{
			let baseobj = locations[map].base;
			let myOpenZones: string[] = [];

			for (let element in baseobj)
			{
				if (element === "OpenZones")
				{
					myOpenZones = baseobj[element].split(",");
					Spawnpoints.addSpawns(map, myOpenZones);	
					break;
				}
			}

		}
	}

	static configureMaps(): void {
		if(config.DebugOutput)
			logger.info(`SWAG: Generating Waves`)
		// Uses it as variable for waves were generated (server restart, etc)

		status = gamestate.infoInitialized;

		for (let map in locations) {
			let map_name = map.toLowerCase();
			// logger.info(`map_name: ${map_name}`);
			// logger.info(`locations: ${locations}`);

			if (this.validMaps.includes(map_name)) {
				
				if(config.RandomSoloPatternFilePerMap){
					let choice = randomUtil.getArrayValue(["pmc", "scav", "boss"]);
					switch(choice){
						case "pmc": SWAG.genWaveManager(pmcpattern, map, "pmc"); break;
						case "scav": SWAG.genWaveManager(scavpattern, map, "scav"); break;
						case "boss": SWAG.genWaveManager(bosspattern, map, "boss"); break;
						default: SWAG.genWaveManager(pmcpattern, map, "pmc"); break;
					}
				}
				else{
					bossSpawnedInCurrentMap = false;
					if(config.DebugOutput){ 
						logger.info(`========================================`);
						logger.error(`SWAG: Generate Boss Pattern: ${map}`);
					}
					SWAG.genWaveManager(bosspattern, map, "boss");
					
					// if boss wave is selected, skip other waves
					if(config.skipOtherWavesIfBossWaveSelected && bossSpawnedInCurrentMap)
					{
						if(config.DebugOutput)
						{
							logger.error(`SWAG: Skipping Other PMC & SCAV as Boss Wave Selected On: ${map}`)
							logger.info(`========================================`);

						}
						continue;
					}
						
					// i took a poop and realized i was doing this wrong.  needs no changes
					if(config.DebugOutput)
						logger.error(`SWAG: Generate PMC Pattern: ${map}`)
					SWAG.genWaveManager(pmcpattern, map, "pmc");

					if(config.DebugOutput)
						logger.error(`SWAG: Generate Scav Pattern: ${map}`)
					SWAG.genWaveManager(scavpattern, map, "scav");
					
					
					//logger.info(`waves: ${JSON.stringify(locations[map].base.waves, null, `\t`)}`);
					if(config.DebugOutput)
						logger.info(`========================================`);
					
				}
			
					
			}
		}
	}

	static getRandIntInclusive(min: number, max: number): number {
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	static getRandomStringArrayValue(array: string[]): string {
		return array[Math.floor(Math.random() * array.length)];
	}

	static getRandomisedPmcSide(): string {
		return (randomUtil.getChance100(botConfig.pmc.isUsec))
			? "Usec"
			: "Bear";
	}


	static getPmcSideByRole(botRole: string): string {
		switch (botRole.toLowerCase()) {
			case botConfig.pmc.bearType.toLowerCase():
				return "Bear";
			case botConfig.pmc.usecType.toLowerCase():
				return "Usec";
			default:
				return SWAG.getRandomisedPmcSide();
		}
	}

	static genWaveManager(patternConfig: any, map: string, managetype: string): void {
		switch (managetype) {
			case "pmc": this.genWave(patternConfig, map, managetype); break;
			case "boss": this.genWave(patternConfig, map, managetype); break;
			case "scav": this.genWave(patternConfig, map, managetype); break;
			default: break;
		}
	}

	static genWave(patternConfig: any, map: string, manageType: string): void {
		if(config.DebugOutput)
			logger.info(`managetype: ${manageType}`);
		
		let patternArray: Pattern[];

		patternArray = patternConfig;


		//set up ai horde mode to work
		if(config.DebugOutput)
			logger.info(`config.aiAmount: ${config.aiAmount}`);

		switch (config.aiAmount.toLowerCase()) {
			case "low": aiAmountMultiplier = 0.5; break;
			case "medium": aiAmountMultiplier = 1.0; break;
			case "high": aiAmountMultiplier = 2.5; break;
			case "horde": aiAmountMultiplier = 5.0; break;
			default: aiAmountMultiplier = 1.0; break;
		}

		if(config.DebugOutput)
			logger.info(`config.aiDifficulty: ${config.aiDifficulty}`);

		let wavetimemin: number = 0;
		let wavetimemax: number = 0;
		let customwavetimemin: number;
		let customwavetimemax: number;
		let randomPattern: Pattern;
		let pmcSide: string;
		let isPlayers: boolean;
		let sameNameinBoss: boolean = false;
		let sameBossPattern: Pattern;
		let sameNameinScav: boolean = false;
		let sameScavPattern: Pattern;
		let sameNameinPmc: boolean = false;
		let samePmcPattern: Pattern;
		let targetname: string;

		//Start waves here.
		for (let wavenum = 0; wavenum < waveLimit; wavenum++) 
		{
			if (manageType === "boss") {
				let chance = randomUtil.getChance100(bossChance);
				if (!chance) {
					//logger.info(`SWAG: Boss Wave Chance: ${chance}`);
					continue;
				}
				//logger.info(`SWAG: Boss Wave Chance: ${chance}`);
			}

			//get chance to spawn boss from config at the wave level
			if(config.DebugOutput)
				logger.warning(`=====================================================`);

			// if(config.DebugOutput)
			//  	logger.info(`patternArray: ${patternArray}`);

			if (patternArray.length > 0) 
			{
				randomPattern = patternArray[SWAG.getRandIntInclusive(0, patternArray.length - 1)];
			}

			if(randomPattern === undefined || randomPattern === null){
				continue;
			}

			if(config.DebugOutput)
				logger.info(`randomPattern: ${JSON.stringify(randomPattern)}`);

			//redo this entire logic as it is causing an infinite loop
			//if they entered timer for a non-boss wave then use it.

			if(manageType !== "boss"){
				if(randomPattern.specificTimeOnly == true)
				{
					//is the time good?
					if(randomPattern.time_min == null || randomPattern.time_max == null)
					{
						if(wavenum == 0){
							wavetimemin = config.WaveTimerMinInSeconds;
							wavetimemax = config.WaveTimerMaxInSeconds;
						}
						else{
							wavetimemin += config.WaveTimerMaxInSeconds;
							wavetimemax += config.WaveTimerMaxInSeconds;
						}
					}
					else{
						customwavetimemin = randomPattern.time_min;
						customwavetimemax = randomPattern.time_max;
					}
					
				}
				else{
					if(wavenum == 0){
						wavetimemin = config.WaveTimerMinInSeconds;
						wavetimemax = config.WaveTimerMaxInSeconds;
					}
					else{
						wavetimemin += config.WaveTimerMaxInSeconds;
						wavetimemax += config.WaveTimerMaxInSeconds;
					}
				}
			}
			
			if(config.DebugOutput)
			{
				logger.info(`wavetimemin: ${JSON.stringify(wavetimemin)}`);
				logger.info(`wavetimemax: ${JSON.stringify(wavetimemax)}`);
				logger.info(`customwavetimemin: ${JSON.stringify(customwavetimemin)}`);
				logger.info(`customwavetimemax: ${JSON.stringify(customwavetimemax)}`);
			}
				

			//Logic to determine if we need to print concurrent waves at same time
			
			targetname = randomPattern.Name.toLowerCase();

				//check all 3 files for same name
				if (pmcpattern) {
					for (let pattern in pmcpattern) {
						if (pmcpattern[pattern].Name.toLowerCase() === targetname) {
							sameNameinPmc = true;
							samePmcPattern = pmcpattern[pattern];
							if(config.DebugOutput)
								logger.info(`SWAG: Same Name in PMC: ${pmcpattern[pattern].Name}`);
						}
					}
				}

				if (bosspattern) {
					for (let pattern in bosspattern) {
						if (bosspattern[pattern].Name.toLowerCase() === targetname) {
							sameNameinBoss = true;
							sameBossPattern = bosspattern[pattern];
							if(config.DebugOutput)
								logger.info(`SWAG: Same Name in Boss: ${bosspattern[pattern].Name}`);
						}
					}
				}

				if (scavpattern) {
					for (let pattern in scavpattern) {
						if (scavpattern[pattern].Name.toLowerCase() === targetname) {
							sameNameinScav = true;
							sameScavPattern = scavpattern[pattern];
							if(config.DebugOutput)
								logger.info(`SWAG: Same Name in Scav: ${scavpattern[pattern].Name}`);
						}
					}
				}

			//rewrite this logic so that its based on individual booleans.
			
			if(sameNameinPmc == true)
			{
				SWAG.genWaveStage2(samePmcPattern, map, locations, aiAmountMultiplier, wavetimemin, wavetimemax, customwavetimemin, customwavetimemax, pmcSide, isPlayers, wavenum);
			}
			
			if(sameNameinBoss == true)
			{
				SWAG.genWaveStage2(sameBossPattern, map, locations, aiAmountMultiplier, wavetimemin, wavetimemax, customwavetimemin, customwavetimemax, pmcSide, isPlayers, wavenum);
			}

			if(sameNameinScav == true)
			{
				SWAG.genWaveStage2(sameScavPattern, map, locations, aiAmountMultiplier, wavetimemin, wavetimemax, customwavetimemin, customwavetimemax, pmcSide, isPlayers, wavenum);
			}
			// cycle through the bot types and spawn them as additional waves
			continue;
		}
	}

	static genWaveStage2(genPattern: any, map: string, locations: any, aiAmountMultiplier: number, wavetimemin: number, wavetimemax: number, customwavetimemin: number, customwavetimemax: number,
		pmcSide: string, isPlayers: boolean, wavenumalt: number)
	{
		if(SWAG.bossType.includes(genPattern.BossName))
			{
				isPlayers = false;
				let theBoss = genPattern.BossName;
				let theBossSupport: BossSupport[] = null;
				let myBossZones = this.getRandomStringArrayValue(Spawnpoints.getSpawns(map));
				
				if (myBossZones == null){
					myBossZones = ""
				}

				if(config.DebugOutput)
				{
					logger.error(`Random Boss Zone: ${JSON.stringify(myBossZones)}`);
				}
					
				
				if (genPattern.Supports != null)
				{
					theBossSupport = [];
					for(let index in genPattern.Supports)
					{
						let tempDifficulty: string[] = [SWAG.diffProper[config.aiDifficulty.toLowerCase()]];
						let tempsupport = new BossSupport(
							SWAG.roleCase[genPattern.Supports[index].BossEscortType.toLowerCase()],
							tempDifficulty,
							genPattern.Supports[index].BossEscortAmount
						);

						if(config.DebugOutput)
							logger.info(`SWAG: Boss Support: ${JSON.stringify(tempsupport)}`);

						theBossSupport.push(tempsupport);
					}
				}
				
				
				if (genPattern.Time === undefined || genPattern.Time === null)
				{
					genPattern.Time = (customwavetimemin !== undefined ? customwavetimemin : wavetimemin);
				}
				
				let mybosswave = new bosswave(SWAG.roleCase[theBoss], 100, myBossZones, false, SWAG.diffProper[config.aiDifficulty.toLowerCase()], SWAG.roleCase[genPattern.BossEscortType.toLowerCase()],
				SWAG.diffProper[config.aiDifficulty.toLowerCase()], genPattern.BossEscortAmount, genPattern.Time, theBossSupport, genPattern.RandomTimeSpawn);

				if(config.DebugOutput)
					logger.info(`wave#${wavenumalt} (boss): ${genPattern.BossName}: ${JSON.stringify(mybosswave)}`)

				locations[map].base.BossLocationSpawn.push(mybosswave);
				bossSpawnedInCurrentMap = true;
				return;
			}
		else{

				for (let type in genPattern.botTypes)
				{
					//logger.info(`type: ${randomPattern[1].botTypes[type]}`);
					if (SWAG.pmcType.includes(genPattern.botTypes[type])){
						pmcSide = SWAG.getPmcSideByRole(genPattern.botTypes[type]);
						isPlayers = true;
		
						let aiAmountTemp = Math.floor((aiAmountMultiplier * randomUtil.getInt(1, genPattern.botCounts[type])));
		
						let pmcwave = new wave(0, customwavetimemin !== undefined ? customwavetimemin : wavetimemin, 
							customwavetimemax !== undefined ? customwavetimemax : wavetimemax, 1, aiAmountTemp,
							"", pmcSide, SWAG.diffProper[config.aiDifficulty.toLowerCase()], SWAG.roleCase[genPattern.botTypes[type].toLowerCase()], isPlayers);
						if(config.DebugOutput)
							logger.info(`wave#${wavenumalt} (pmc): ${genPattern.botTypes[type]}: ${JSON.stringify(pmcwave)}`)
		
						locations[map].base.waves.push(pmcwave);
					}
					
					if(SWAG.scavType.includes(genPattern.botTypes[type])){
						pmcSide = "Savage";
						isPlayers = false;
		
						let aiAmountTemp = Math.floor((aiAmountMultiplier * randomUtil.getInt(1, genPattern.botCounts[type])));
		
						let scavwave = new wave(0, customwavetimemin !== undefined ? customwavetimemin : wavetimemin, 
							customwavetimemax !== undefined ? customwavetimemax : wavetimemax, 1, aiAmountTemp,
							"", pmcSide, SWAG.diffProper[config.aiDifficulty.toLowerCase()], SWAG.roleCase[genPattern.botTypes[type].toLowerCase()], isPlayers);
						if(config.DebugOutput)
							logger.info(`wave#${wavenumalt} (scav): ${genPattern.botTypes[type]}: ${JSON.stringify(scavwave)}`)
						
						locations[map].base.waves.push(scavwave);
					}					
				}
			}
		
			return;
		
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

		status = gamestate.clearedSpawns;

	}
}

module.exports = { mod: new SWAG() }

class wave {
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

class bosswave {
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

	constructor(BossName, BossChance, BossZone, BossPlayer, BossDifficult, BossEscortType, BossEscortDifficult, BossEscortAmount, Time, Supports, RandomTimeSpawn) {
		this.BossName = BossName;
		this.BossChance = BossChance;
		this.BossZone = BossZone;
		this.BossPlayer = BossPlayer;
		this.BossDifficult = BossDifficult;
		this.BossEscortType = BossEscortType;
		this.BossEscortDifficult = BossEscortDifficult;
		this.BossEscortAmount = BossEscortAmount;
		this.Time = Time;
		// this.TriggerId = TriggerId;
		// this.TriggerName = TriggerName;
		this.Supports = Supports;
		this.RandomTimeSpawn = RandomTimeSpawn;
	}
}

class BossSupport {
	BossEscortType: string;
	BossEscortDifficult: string[];
	BossEscortAmount: number;

	constructor(BossEscortType, BossEscortDifficult, BossEscortAmount) {
		this.BossEscortType = BossEscortType;
		this.BossEscortDifficult = BossEscortDifficult;
		this.BossEscortAmount = BossEscortAmount;
	}
}

class Pattern {
	Name: string;
	botTypes: string[];
	botCounts: number[];
	time_min: number;
	time_max: number;
	specificTimeOnly: boolean;
}


class SpawnLocations {
	private spawnLocations: { [key: string]: string[] };
  
	constructor() {
	  this.spawnLocations = {};
	}
  
	public getSpawns(mapName: string): string[] {
	  return this.spawnLocations[mapName];
	}
  
	public addSpawns(mapName: string, spawns: string[]): void {
	  this.spawnLocations[mapName] = spawns;
	}
  }
    
   class SpawnPointParam {
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

	class Position {
        x: number;
        y: number;
        z: number;
    }

	class ColliderParams {
        _parent: string;
        _props: Props;
    }

	class Center {
        x: number;
        y: number;
        z: number;
    }

	class Props {
        Center: Center;
        Radius: number;
    }
