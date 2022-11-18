import { IPreAkiLoadMod } from "@spt-aki/models/external/IPreAkiLoadMod";
import { IPostAkiLoadMod } from "@spt-aki/models/external/IPostAkiLoadMod";
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import { DependencyContainer } from "tsyringe";
import { ILogger } from "@spt-aki/models/spt/utils/ILogger";
import {DynamicRouterModService} from "@spt-aki/services/mod/dynamicRouter/DynamicRouterModService";
import {StaticRouterModService} from "@spt-aki/services/mod/staticRouter/StaticRouterModService";
import { ConfigServer } from "@spt-aki/servers/ConfigServer";
import { ConfigTypes } from "@spt-aki/models/enums/ConfigTypes";
import { IBotConfig } from "@spt-aki/models/spt/config/IBotConfig";
import { IInRaidConfig  } from "@spt-aki/models/spt/config/IInraidConfig";
import { BotHelper } from "@spt-aki/helpers/BotHelper";
import { ProfileHelper } from "@spt-aki/helpers/ProfileHelper";
import { IBotBase } from "@spt-aki/models/eft/common/tables/IBotBase";
import {BotGenerator} from "@spt-aki/generators/BotGenerator";
import { IGenerateBotsRequestData } from "@spt-aki/models/eft/bot/IGenerateBotsRequestData";
import {IBotType} from "@spt-aki/models/eft/common/tables/IBotType"
import {BotGenerationCacheService} from "@spt-aki/services/BotGenerationCacheService"
import { RandomUtil } from "@spt-aki/utils/RandomUtil";
import { JsonUtil } from "@spt-aki/utils/JsonUtil";

let configServer : ConfigServer;
let profileHelper;
let botHelper;
let Logger;
let BotConfig;
let database;
let databaseServer;
let locations;
let botTypes;
let modFolder;
let botGenerator;
let baseAI;
let config;
let advAIConfig;
let InRaidConfig;
let progressRecord;
let botGenerationCacheService;
let legendaryFile;
let playerLevelPMC;
let GlobalSessionID;
let profileOrigRole;
let profileOrigSide;
let pmcAltRolesPickList;

const modName = "Fin-AITweaks";
        
let roleCase = {
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
	"bosstest": "bossTest",
	"followertest": "followerTest",
	"gifter": "gifter",
	"bossknight": "bossKnight",
	"followerbigpipe": "followerBigPipe",
	"followerbirdeye": "followerBirdEye",
	"test": "test"
	}

const locationNames = ["interchange", "bigmap", "rezervbase", "woods", "shoreline", "laboratory", "lighthouse", "factory4_day", "factory4_night"];
const locationNamesVerbose = ["interchange", "customs", "reserve", "woods", "shoreline", "labs", "lighthouse", "factory", "factory"];

//add entourage mode - npcs with guard ai escort player.. random pmc generated with level below yours
//add legendary pmc mode - clone player if survive 10 raids weith no deaths inbetween from progress.json.  Fight cloned player randomly on map.

class AITweaks implements IPreAkiLoadMod, IPostAkiLoadMod
{
	preAkiLoad(container: DependencyContainer): void
	{
		Logger = container.resolve("WinstonLogger")
		config = require("../config/config.json");
		
		//set config checks early in case i need to not setup dynamic/static routers.

		if (config.enableEscortMode)
		{

		}
		
		const dynamicRouterModService = container.resolve<DynamicRouterModService>("DynamicRouterModService");
		const staticRouterModService = container.resolve<StaticRouterModService>("StaticRouterModService");

		//Raid Saving (End of raid)
		staticRouterModService.registerStaticRouter(`StaticAkiRaidSave${modName}`,[{url: "/raid/profile/save",
			action: (url, info, sessionId, output) =>{
				AITweaks.onRaidSave(url, info, sessionId, output);
				return output
			}}],"aki");

		//Game start
		staticRouterModService.registerStaticRouter(`StaticAkiGameStart${modName}`,[{url: "/client/game/start",
			action: (url, info, sessionId, output) =>{
				GlobalSessionID = sessionId;
				profileOrigRole = AITweaks.clone(profileHelper.getPmcProfile(sessionId).Info.Settings.Role);
				profileOrigSide = AITweaks.clone(profileHelper.getPmcProfile(sessionId).Info.Side);
				AITweaks.runOnGameStart(url, info, sessionId);
				return output
		}}],"aki");

		if (!config.disableAllAIChanges)
		{
			container.afterResolution("BotGenerationCacheService", (_t, result: BotGenerationCacheService) => 
			{
				result.getBot = AITweaks.getBot;
			}, {frequency: "Always"});

			container.afterResolution("BotGenerationCacheService", (_t, result: BotGenerationCacheService) => 
			{
				result.storeBots = AITweaks.storeBots;
			}, {frequency: "Always"});
		}

	}

	postAkiLoad(container: DependencyContainer): void
	{
		AITweaks.setupInitialValues(container);
		Logger.info(`Loading: ${modName}`);

		AITweaks.difficultyFunctions();
		AITweaks.setRogueNeutral();

		if (config.allowHealthTweaks.enabled)
		{
			this.adjustHealthValues(config.allowHealthTweaks.multipliers.PMCHealthMult, config.allowHealthTweaks.multipliers.scavHealthMult, 
				config.allowHealthTweaks.multipliers.raiderHealthMult, config.allowHealthTweaks.multipliers.bossHealthMult, 
				config.allowHealthTweaks.multipliers.cultistHealthMult)	
		}
		
		Logger.info("Fin's AI Tweaks: Finished")
	}

	static setupInitialValues(container)
	{
		Logger.info('FINs AI TWEAKS: SetupInitialValues');
		profileHelper = container.resolve("ProfileHelper");
		botHelper = container.resolve("BotHelper");
		configServer = container.resolve("ConfigServer");
		databaseServer = container.resolve("DatabaseServer");
		configServer = container.resolve("ConfigServer");
		botGenerator = container.resolve("BotGenerator");
		database = databaseServer.getTables();
		botGenerationCacheService = container.resolve("BotGenerationCacheService");

		locations = database.locations;
		botTypes = database.bots.types;
		pmcAltRolesPickList = config.aiChanges.pmcAltRolesPickList;
		
		let dir = __dirname;
		let dirArray = dir.split("\\");
		modFolder = (`${dirArray[dirArray.length - 4]}/${dirArray[dirArray.length - 3]}/${dirArray[dirArray.length - 2]}/`);
		
		// Setup Base AI Difficulty
		baseAI = AITweaks.clone(botTypes.pmcbot.difficulty.hard);

		//Load Config Files
		BotConfig = configServer.getConfig<IBotConfig>(ConfigTypes.BOT);
		InRaidConfig = configServer.getConfig<IInRaidConfig>(ConfigTypes.IN_RAID);
		
		advAIConfig = require("../config/advanced AI config.json");
		progressRecord = require("../donottouch/progress.json");
		legendaryFile = require("../donottouch/legendary.json");
		
		
	}
	
	//All functions that need to be run when the route "/raid/profile/save" is used should go in here, as config-reliant conditionals can't be used on the initial load function
	static onRaidSave(url, info, sessionId, output)
	{
		playerLevelPMC = profileHelper.getPmcProfile(sessionId).Info.Level;
		GlobalSessionID = sessionId;

		Logger.info('FINs AI TWEAKS: onRaidSave')
		
		AITweaks.recordWinLoss(url, info, sessionId)

		if (config.enableLegendaryPlayerMode)
		{
			AITweaks.legendaryPlayerCheck(sessionId)
		}
		//delete database.globals.config.genVals
		return output
	}


	static getBot(role: string): IBotBase
    {
		//need to also modify botcacheservice so when retrieving if no cached value then default to 

		if (["assault", "cursedassault"].includes(role.toLowerCase()))
		{
			// if the role is assault or cursedassault, change to newrole and return bot based on chance.
			
			if (botGenerationCacheService.storedBots.has(role))
			{
				let cachedOfType = botGenerationCacheService.storedBots.get(role); //still an array of maps of that type

				if (cachedOfType.length > 0)
            	{
					let chance = botGenerator.randomUtil.getChance100(config.aiChanges.chanceChangeScavToWild);
					//let mymodified = JSON.stringify(cachedOfType[0], null, "\t")
					//Logger.info(`mymodified = ${mymodified}`)

					if(chance)
					{
						//let tempside = botGenerator.getRandomisedPmcSide().toLowerCase();
						//let newrole = botGenerator.getPmcRoleByDescription(tempside); //will use built-in function
						let newrole = botGenerator.randomUtil.getArrayValue(pmcAltRolesPickList);
						newrole = roleCase[newrole];
						cachedOfType[cachedOfType.length-1].Info.Settings.Role = newrole;
						cachedOfType[cachedOfType.length-1].Info.Side = "Savage";
						botGenerationCacheService.logger.info(`AITweaks: Substituting ${role} with ${AITweaks.serialize(cachedOfType[cachedOfType.length-1].Info.Settings.Role)}!`);
						return cachedOfType.pop();

						//when bot dies return its role type to normal assault?
					}
					botGenerationCacheService.logger.info(`AITweaks: Not Substituting ${AITweaks.serialize(cachedOfType[cachedOfType.length-1].Info.Settings.Role)}!`);
					return cachedOfType.pop();
           	 	}
				
			}

			botGenerationCacheService.logger.error(`OH NO! Cache does not contain ${role} in it!`);
        	return undefined;
		}

        if (botGenerationCacheService.storedBots.has(role))
        {
            let cachedOfType = botGenerationCacheService.storedBots.get(role);
            if (cachedOfType.length > 0)
            {
                return cachedOfType.pop();
            }
			
            botGenerationCacheService.logger.error(`OH NO! Cache array does not contain value for ${role}!`);
        }
		

        botGenerationCacheService.logger.error(`OH NO! Cache does not contain ${role} in it!`);
        return undefined;
    }

	static storeBots(botsToStore: IBotBase[]): void
    {
		const pmcTypeLabel = "PMC";
		//Logger.info(`In AITweaks.storeBots Function`)
        botsToStore.forEach(bot => 
        {
            const type = bot.sptIsPmc ? pmcTypeLabel : bot.Info.Settings.Role;
            if (botGenerationCacheService.storedBots.has(type))
            {
				if (type == pmcTypeLabel)
				{
					//Logger.info(`${type} is a pmcTypeLabel`)
					if (legendaryFile[GlobalSessionID] && config.enableLegendaryPlayerMode)
					{
						//Logger.info(`legendaryFile[SessionID] exists`)
						try{
							let chance = botGenerator.randomUtil.getChance100(config.aiChanges.chanceLegendReplacesPMC)
							if (chance)
							{
								//Logger.info(`Hit the chance of replacing PMC`)
								
								bot = legendaryFile[GlobalSessionID];
								//Logger.info(`legendaryFile[GlobalSessionID] is the replacement for e`)
								
								bot = botGenerator.generateDogtag(bot);
								bot.Info.Side = "Savage"
								bot.Info.Settings.BotDifficulty = "hard"
								bot.Info.Settings.Role = botGenerator.randomUtil.getArrayValue(["followerBirdEye", "followerBigPipe", "bossKnight", "bossKilla"]);
								//botGenerator.botEquipmentFilterService.filterBotEquipment(e, playerLevelPMC, true, e.Info.Settings.Role);

								botGenerationCacheService.storedBots.get(type).unshift(bot);
								Logger.info(`Throwing legendary PMC of ${bot.Info.Settings.Role} into cachedbots (not guaranteed)`)
								return;
							}
							}
						catch{
							Logger.error(`BotstoStore for Legendary had an error`)
						}
					}
					
				}
				//Logger.info(`Has ${type} but not PMC so just storing on stack`)
                botGenerationCacheService.storedBots.get(type).unshift(bot);
            }
            else
            {
				//Logger.info(`Does not have ${type} so setting type`)
                botGenerationCacheService.storedBots.set(type, [bot]);
            }
        });
    }

	static legendaryPlayerCheck(sessionID: string)
	{
		if(progressRecord[sessionID]){

			if(profileHelper.getPmcProfile(sessionID)){
			
				let setLegendary: boolean;
				//Logger.info(`in legendaryPlayerCheck function`)
				
				let therecord = progressRecord[sessionID];
		
				//Logger.info(`therecord: ${AITweaks.serialize(therecord)}`)
		
				if(therecord.deathStreak > 0){
					setLegendary = false;
					Logger.info(`Last Winstreak: ${AITweaks.serialize(therecord.winStreak)}`)
					AITweaks.createLegendPlayer(sessionID, setLegendary);
					return;
				}
				if(therecord.winStreak >= 10) //change this later back to 10
				{
					setLegendary = true;
					Logger.info(`Current Winstreak: ${AITweaks.serialize(therecord.winStreak)}`)
					AITweaks.createLegendPlayer(sessionID, setLegendary);
					return;
				}
			}
		}
		
	}

	static createLegendPlayer(sessionID: string, setLegendary: boolean) : void
	{
		if (setLegendary){
			//do stuff here, add check to see if entry already exists
			//check if existing array of playerprofiles
			

			let playerprofile = AITweaks.clone(profileHelper.getPmcProfile(sessionID));
			
			if(playerprofile)
			{
				if (legendaryFile[sessionID])
				{
					Logger.info(`Legendary Player Exists, Overwriting`)
					//Logger.info(`playerprofile stringified: ${JSON.stringify(playerprofile)}`)
					legendaryFile[sessionID] = playerprofile;
					legendaryFile[sessionID].Info.Settings.Role;
					legendaryFile[sessionID].Info.Settings.BotDifficulty = "hard";
					AITweaks.saveToFile(legendaryFile, "donottouch/legendary.json");
				}
				else{
					Logger.info(`Legendary Player Does not exist, adding`)
					//Logger.info(`playerprofile stringified: ${JSON.stringify(playerprofile)}`)
					legendaryFile[sessionID] = playerprofile;
					legendaryFile[sessionID].Info.Settings.Role;
					legendaryFile[sessionID].Info.Settings.BotDifficulty = "hard";
					AITweaks.saveToFile(legendaryFile, "donottouch/legendary.json");
				}
				//Logger.info('Saved Legendary Player');
				//revert profile back in case it changed.
			}

		}
		else{
			//should i clear legendary profile?
			Logger.info('setLegendary was false. Do not save Legendary Player')

		}
	}

	static noTalking(botList, easy, normal, hard, impossible)
	{
		for (let i in botList)
		{
			let botName = botList[i].toLowerCase()

			if (!botTypes[botName] || !botTypes[botName].difficulty || !botTypes[botName].difficulty.easy || !botTypes[botName].difficulty.normal || !botTypes[botName].difficulty.hard || !botTypes[botName].difficulty.impossible)
			{
				if (botName.length > 0)
					Logger.error(`Bot with name ${botName} does not exist, or is missing at least one difficulty entry. 
					This error must be fixed, or you'll likely experience errors. Check your AI category entries in the config and 
					make sure they're all valid bot types.`)
				continue
			}
			!easy ? botTypes[botName].difficulty.easy.Mind.CAN_TALK = false : botTypes[botName].difficulty.easy.Mind.CAN_TALK = true
			!normal ? botTypes[botName].difficulty.normal.Mind.CAN_TALK = false : botTypes[botName].difficulty.normal.Mind.CAN_TALK = true
			!hard ? botTypes[botName].difficulty.hard.Mind.CAN_TALK = false : botTypes[botName].difficulty.hard.Mind.CAN_TALK = true
			!impossible ? botTypes[botName].difficulty.impossible.Mind.CAN_TALK = false : botTypes[botName].difficulty.impossible.Mind.CAN_TALK = true
		}
	}
	
	static checkTalking()
	{
		let botList = []
		for (let botCat in config.aiChanges.changeBots)
			for (let bot in config.aiChanges.changeBots[botCat])
				if (!botList.includes(config.aiChanges.changeBots[botCat][bot]))
					botList.push(config.aiChanges.changeBots[botCat][bot])
		
		AITweaks.noTalking(botList, config.allowBotsToTalk.scavs, config.allowBotsToTalk.PMCs, config.allowBotsToTalk.raiders, config.allowBotsToTalk.PMCs)
	}

	//Changes the AI values in the 'core' file common to all AIs
	
	static changeOverallDifficulty(accuracyCoef, scatteringCoef, gainSightCoef, marksmanCoef, visibleDistCoef)
	{
		for (let mapName in locations)
		{
			if (mapName != "base")
			{
				let map = locations[mapName]
				
				//Maybe round this afterwards. Might cause problems if it's not rounded?
				map.base.BotLocationModifier.AccuracySpeed = 1 / Math.sqrt(accuracyCoef)
				
				map.base.BotLocationModifier.Scattering = scatteringCoef
				map.base.BotLocationModifier.GainSight = gainSightCoef
				//-Trying something new, since Reserve seems a little out of whack if they're just set directly. Multiplying the maps's base value by the config modifier. For most maps this should be the exact same, but it may improve Reserve.
				// map.base.BotLocationModifier.AccuracySpeed = map.base.BotLocationModifier.AccuracySpeed * accuracyCoef
				// map.base.BotLocationModifier.Scattering = map.base.BotLocationModifier.Scattering * scatteringCoef
				// map.base.BotLocationModifier.GainSight = map.base.BotLocationModifier.GainSight * 
				map.base.BotLocationModifier.MarksmanAccuratyCoef = map.base.BotLocationModifier.MarksmanAccuratyCoef * marksmanCoef
				map.base.BotLocationModifier.VisibleDistance = visibleDistCoef
				//Not all maps have this value. Is it even used?
				map.base.BotLocationModifier.MagnetPower = 100
				map.base.BotLocationModifier.DistToPersueAxemanCoef = 0.7
				map.base.BotLocationModifier.DistToSleep = 350
				map.base.BotLocationModifier.DistToActivate = 330
				//Weird stuff going on with reserve. Variables need extra tweaking?
				if (["rezervbase"].includes(mapName))
				{
					//map.base.BotLocationModifier.AccuracySpeed = map.base.BotLocationModifier.AccuracySpeed * (1/0.6)
					map.base.BotLocationModifier.AccuracySpeed = map.base.BotLocationModifier.AccuracySpeed * 1.45
					map.base.BotLocationModifier.Scattering = map.base.BotLocationModifier.Scattering * 1.075
					//map.base.BotLocationModifier.GainSight = map.base.BotLocationModifier.GainSight * (1/1.3)
					
				}
				if (["interchange"].includes(mapName))
				{
					map.base.BotLocationModifier.Scattering /= 0.8
					//map.base.BotLocationModifier.GainSight = map.base.BotLocationModifier.GainSight * (1/1.3)
					
				}
				//This should probably be done for Woods as well.
				if (["woods"].includes(mapName))
				{
					map.base.BotLocationModifier.AccuracySpeed = map.base.BotLocationModifier.AccuracySpeed * 1.45
					//map.base.BotLocationModifier.AccuracySpeed = map.base.BotLocationModifier.AccuracySpeed * 1.4
					map.base.BotLocationModifier.Scattering = map.base.BotLocationModifier.Scattering * 1.1
					//map.base.BotLocationModifier.Scattering = map.base.BotLocationModifier.Scattering * 1.2
				}
				map.base.BotLocationModifier.AccuracySpeed *= 0.45
				map.base.BotLocationModifier.Scattering *= 0.5
			//	console.log(mapName)
			//	console.log(map.base.BotLocationModifier)
			}
		}
	}
	
	//Do you like my hacked-together code?
	//Does it make you angry?
	//It probably should.

	//diffVar should be an array (Or a list..? Dunno. Doesn't matter. Put it in square brackets either way) of four ints, one for each difficulty level
	static changeForAllDifficulties(mainBot, diffVar, diffMod, botName)
	{
		for (let i in diffVar)
			diffVar[i] = (diffVar[i] * 1) + diffMod + config.aiChanges.overallAIDifficultyMod
		//Cycle through all four difficulties for the given bot type, and assign them their difficulty number
		let botDiff = mainBot.difficulty.easy
		AITweaks.changeAI(mainBot, botDiff, diffVar[0], "easy", botName)
		botDiff = mainBot.difficulty.normal
		AITweaks.changeAI(mainBot, botDiff, diffVar[1], "normal", botName)
		botDiff = mainBot.difficulty.hard
		AITweaks.changeAI(mainBot, botDiff, diffVar[2], "hard", botName)
		botDiff = mainBot.difficulty.impossible
		AITweaks.changeAI(mainBot, botDiff, diffVar[3], "impossible", botName)
	}

	//This is awful and I'll clean it up later
	static setRogueNeutral()
	{
		//Rogues will only *ever* use exusec behaviour, so it's appropriate to flip the switch here. If they become a behaviour option, this will have to default to true if behaviour is enabled.
		if (config.spawnChanges.controlOptions.roguesNeutralToUsecs)
		{
			botTypes.exusec.difficulty.easy.Mind.DEFAULT_ENEMY_USEC = true
			botTypes.exusec.difficulty.normal.Mind.DEFAULT_ENEMY_USEC = false
			botTypes.exusec.difficulty.hard.Mind.DEFAULT_ENEMY_USEC = true
			botTypes.exusec.difficulty.impossible.Mind.DEFAULT_ENEMY_USEC = true
		}
	}
	
	//This is a whole mess at the moment, but this function swaps out easy, hard and impossible difficulties, while leaving normal as the default
	static replaceDifficulties(botName, aiLevel?)
	{
		botName = botName.toLowerCase()
		if (botTypes[botName])
		{
			if (aiLevel)
				botTypes[botName].difficulty = AITweaks.clone(database.globals.config.FinsDifficultyLevels[aiLevel])
			else
			{
				botTypes[botName].difficulty.easy = AITweaks.clone(database.globals.config.FinsDifficultyLevels.lowLevelAIs.easy)
				botTypes[botName].difficulty.hard = AITweaks.clone(database.globals.config.FinsDifficultyLevels.midLevelAIs.hard)
				///////////////////////////
				botTypes[botName].difficulty.normal = AITweaks.clone(database.globals.config.FinsDifficultyLevels.midLevelAIs.hard)
				///////////////////////////
				botTypes[botName].difficulty.impossible = AITweaks.clone(database.globals.config.FinsDifficultyLevels.highLevelAIs.impossible)
			}
		}
	}

	static saveToFile(data, filePath)
	{
		var fs = require('fs');
				fs.writeFile(modFolder + filePath, JSON.stringify(data, null, 4), function (err) {
				if (err) throw err;
			});
	}
	
	
	static recordWinLoss(url, info, sessionId) : void
	{
		let diffAdjust = 0.6
		let diffRatio = 1
		
		let upMult = diffRatio;
		let downMult = 1 / diffRatio;

		//Logger.info(`progressRecord[sessionID]: ${JSON.stringify(progressRecord[sessionId])}`)
		//Logger.info(`info: ${JSON.stringify(info)}`)

		if (info.exit == "survived")//If they survived
		{
			progressRecord[sessionId].winStreak += 1
			progressRecord[sessionId].deathStreak = 0
			progressRecord[sessionId].diffMod += (diffAdjust * Math.sqrt(progressRecord[sessionId].winStreak)) * upMult
		}
		else if (info.exit == "killed")//If they perished
		{
			progressRecord[sessionId].winStreak = 0
			progressRecord[sessionId].deathStreak += 1
			progressRecord[sessionId].diffMod -= (diffAdjust / Math.sqrt(progressRecord[sessionId].deathStreak)) * downMult
		}

		if (config.enableAutomaticDifficulty){
			Logger.info(`Fins AI Tweaks:  Difficulty adjusted by ${progressRecord[sessionId].diffMod}`)
			AITweaks.adjustDifficulty(url, info, sessionId)
		}
		
		AITweaks.saveToFile(progressRecord, "donottouch/progress.json");
		
		//return AITweaks.nullResponse()
		return;
	}
	
	static adjustDifficulty(url, info, sessionId)
	{
		if (config.enableAutomaticDifficulty && progressRecord[sessionId])
		{
			let PMC = profileHelper.getPmcProfile(sessionId)
			// console.log(PMC)
			
			let LLD = config.aiChanges.lowLevelAIDifficultyMod_Neg3_3
			let MLD = config.aiChanges.midLevelAIDifficultyMod_Neg3_3 - LLD
			let HLD = config.aiChanges.highLevelAIDifficultyMod_Neg3_3 - LLD
			LLD = progressRecord[sessionId].diffMod
			MLD += progressRecord[sessionId].diffMod
			HLD += progressRecord[sessionId].diffMod

			AITweaks.setDifficulty(LLD, HLD, MLD, MLD, MLD)
		}
	}
	
	
	//This is for things that I want to run exactly once upon the game actually starting.
	static runOnGameStart(url, info, sessionId) : void
	{
		InRaidConfig.raidMenuSettings.aiAmount = "AsOnline"
		InRaidConfig.raidMenuSettings.aiDifficulty = "AsOnline"
		GlobalSessionID = sessionId //Make the player's ID accessible at any point
	
		AITweaks.setDifficulty(config.aiChanges.lowLevelAIDifficultyMod_Neg3_3,
			 config.aiChanges.highLevelAIDifficultyMod_Neg3_3, config.aiChanges.midLevelAIDifficultyMod_Neg3_3, 
			 config.aiChanges.midLevelAIDifficultyMod_Neg3_3, config.aiChanges.midLevelAIDifficultyMod_Neg3_3)
		
		for (let i in database.globals.bot_presets)
			database.globals.bot_presets[i].UseThis = false
		
		//Autmatic difficulty adjustments. THESE ONLY ADJUST WHEN THE SERVER RESTARTS
		if (config.enableAutomaticDifficulty && sessionId)
		{
			AITweaks.adjustDifficulty(url, info, sessionId)
		}
		
		Logger.info(`progressRecord[sessionID]: ${JSON.stringify(progressRecord[sessionId])}`)

		if (!progressRecord[sessionId])
		{
			progressRecord[sessionId] = {}
			progressRecord[sessionId].diffMod = 0
			progressRecord[sessionId].raids = 0
			progressRecord[sessionId].deaths = 0
			progressRecord[sessionId].survives = 0
			progressRecord[sessionId].winStreak = 0
			progressRecord[sessionId].deathStreak = 0
			progressRecord[sessionId].lock = false
		}
		return;
	}
	
	
	static fillEmptyDifficultySlots()
	{
		//Doing this manually for now. Make it programatic later.
		let problemBots = ["followergluharsnipe", "assaultgroup"]
		for (let bot in botTypes)
			if (!botTypes[bot].difficulty || !botTypes[bot].difficulty.easy || !botTypes[bot].difficulty.easy.Lay)
				problemBots.push(bot)
		let solutionBot = "pmcbot"
		for (let bot in problemBots)
				botTypes[problemBots[bot]] = AITweaks.clone(botTypes[solutionBot])
		botTypes[BotConfig.pmc.bearType] = AITweaks.clone(botTypes.bear)
		botTypes[BotConfig.pmc.usecType] = AITweaks.clone(botTypes.usec)
		botTypes["followertagilla"] = AITweaks.clone(botTypes.assault)
		botTypes["assaultgroup"].inventory.items = botTypes.bear.inventory.items
	}
	
	
	//All actual assignment of difficulty values has been moved into this function
	static setDifficulty(scavDiffMod, PMCDiffMod, raiderDiffMod, gluharRaiderDiffMod, minionDiffMod)
	{
		
		let diffSet;
		let diffMod;
		
		if (!database.bots.types.assaultgroup)
			database.bots.types.assaultgroup = AITweaks.clone(botTypes.pmcbot);

		AITweaks.generateDifficultyLevels(scavDiffMod, PMCDiffMod, raiderDiffMod, gluharRaiderDiffMod, minionDiffMod)

		if (!config.disableAllAIChanges)
		{
			for (let aiTypes in config.aiChanges.changeBots)
				for (let botIndex in config.aiChanges.changeBots[aiTypes])
				{
					if (botTypes[config.aiChanges.changeBots[aiTypes][botIndex].toLowerCase()])
					{
						let botName = config.aiChanges.changeBots[aiTypes][botIndex].toLowerCase()
						let bot = botTypes[botName]
						bot.difficulty = database.globals.config.FinsDifficultyLevels[aiTypes]
					}
				}
				
			Logger.info("Fin's AI Tweaks: AI difficulty changes complete.")
		}
		
		//Do this after all the AI changes, to make sure this one sticks
		if (!config.disableAllAIChanges)
		{
			//AITweaks.setPMCHostility()
			AITweaks.checkTalking()

			if (advAIConfig.Enabled == true)
				AITweaks.applyAdvancedAIConfig()
		}
		AITweaks.roundAllBotStats()
		
		AITweaks.applySkills()
	}
	
	
	static applyAdvancedAIConfig()
	{
		for (let settingCat in advAIConfig.AI_setting_categories)
			for (let botGroup in advAIConfig.AI_setting_categories[settingCat].setting_multipliers)
				for (let settingName of advAIConfig.AI_setting_categories[settingCat].setting_names)
					for (let botName of advAIConfig.bot_Categories[botGroup])
						AITweaks.changeSettingByName(botTypes[botName], settingName, advAIConfig.AI_setting_categories[settingCat].setting_multipliers[botGroup], true)
	}
	
	static changeSettingByName(bot, settingName, value, mult)
	{
		if (settingName.substring(0,3) == "-1_")
		{
			settingName = settingName.substring(3)
			value = 1 / value
		}
		for (let diff in bot.difficulty)
			for (let cat in bot.difficulty[diff])
				//Why am I doing it this way? This is weird and looks mega inefficient. Fix later, assuming this wasn't done for a good reason.
				for (let set in bot.difficulty[diff][cat])
					if (set == settingName) //This kinda assumes no setting names will be repeated, which isn't entirely true.
					{
						mult ? bot.difficulty[diff][cat][set] *= value : bot.difficulty[diff][cat][set] = value
						return
					}
	}
	
	static difficultyFunctions()
	{
		AITweaks.fillEmptyDifficultySlots()
		// AITweaks.swapBearUsecConfig(botNameSwaps.bear, botNameSwaps.usec)
		
		//Change the core AI values. Check if any bots are set to be quiet
		AITweaks.changeCoreAI()
		let accuracyCoef = 1//config.overallDifficultyMultipliers.aiAimSpeedMult
		let scatteringCoef = 1//config.overallDifficultyMultipliers.aiShotSpreadMult
		let gainSightCoef = 1//config.overallDifficultyMultipliers.aiVisionSpeedMult
		let marksmanCoef = config.overallDifficultyMultipliers.sniperBotAccuracyMult
		let visibleDistCoef = 1//config.overallDifficultyMultipliers.visibleDistanceMult
		AITweaks.changeOverallDifficulty(accuracyCoef , scatteringCoef, gainSightCoef * 0.5, marksmanCoef, visibleDistCoef)
		//This is now done on game start
		AITweaks.setDifficulty(config.aiChanges.lowLevelAIDifficultyMod_Neg3_3, config.aiChanges.highLevelAIDifficultyMod_Neg3_3, config.aiChanges.midLevelAIDifficultyMod_Neg3_3, 
			config.aiChanges.midLevelAIDifficultyMod_Neg3_3, config.aiChanges.midLevelAIDifficultyMod_Neg3_3); 
	}
	

	
	//This is where skills get added to certain bots. -This is probably going to get a little messy.
	static applySkills()
	{
		Logger.info('FINs AI TWEAKS: applySkills')
		//followertagilla likes to rush in and get killed. So he needs some buffs.
		botTypes.followertagilla.skills.Common = {"Endurance":{"min":5100,"max":5100},"Strength":{"min":10000,"max":10000},"Vitality":{"min":5100,"max":5100},"Health":{"min":5100,"max":5100},"Metabolism":{"min":5100,"max":5100},"StressResistance":{"min":5100,"max":5100},"Immunity":{"min":5100,"max":5100},"CovertMovement":{"min":5100,"max":5100},"MagDrills":{"min":5100,"max":5100},"Intellect":{"min":5100,"max":5100},"BotSound":{"min":3600,"max":4400}}
	}
	
	
	static generateDifficultyLevels(scavDiffMod, PMCDiffMod, raiderDiffMod, gluharRaiderDiffMod, minionDiffMod)
	{
		let diffSet;
		let diffMod;
		database.globals.config.FinsDifficultyLevels = {}
		for (let aiTypes in config.aiChanges.changeBots)
		{
			database.bots.types[aiTypes] = AITweaks.clone(botTypes.pmcbot)
			let bot = database.bots.types[aiTypes]
			let botName = aiTypes
			if (aiTypes == "lowLevelAIs")
			{diffSet = [3,3,3,3];diffMod = scavDiffMod}
			else if (aiTypes == "midLevelAIs")
			{diffSet = [4,4,4,4]; diffMod = raiderDiffMod}
			else if (aiTypes == "highLevelAIs")
			{diffSet = [5,5,5,5];diffMod = PMCDiffMod}
			else if (aiTypes == "bossLevelAIs")
			{diffSet = [6.5,6.5,6.5,6.5];diffMod = Math.max(PMCDiffMod, raiderDiffMod, scavDiffMod)}
			else
			console.log(`${aiTypes} is being overwritten for some reason?`) //Should never appear if things are working properly.
			AITweaks.changeForAllDifficulties(bot, diffSet, diffMod, botName)
			// database.bots.types[aiTypes] = AITweaks.clone(database.bots.types[aiTypes].difficulty)
			database.globals.config.FinsDifficultyLevels[aiTypes] = AITweaks.clone(database.bots.types[aiTypes].difficulty)
			delete database.bots.types[aiTypes]
		}
	}

	changeHealth(bot, botName, mult)
	{
		Logger.info(`Fins AI Tweaks: Setting Health of ${botName}`)
		if (config.overallDifficultyMultipliers.setTheseBotsToDefaultPlayerHPBeforeMultsAreUsed.includes(botName))
			bot.health.BodyParts = [{"Head": {"min": 35,"max": 35},"Chest": {"min": 85,"max": 85},"Stomach": {"min": 70,"max": 70},"LeftArm": {"min": 60,"max": 60},"RightArm": {"min": 60,"max": 60},"LeftLeg": {"min": 65,"max": 65},"RightLeg": {"min": 65,"max": 65}}]
		for (let variants in bot.health.BodyParts)
			for (let limb in bot.health.BodyParts[variants])
				if (limb.toLowerCase() != "head" || config.overallDifficultyMultipliers.changeHeadHPValues)
					for (let maxMin in bot.health.BodyParts[variants][limb])
						bot.health.BodyParts[variants][limb][maxMin] = Math.round(bot.health.BodyParts[variants][limb][maxMin] * mult)
	}
	
	adjustHealthValues(PMC, scav, raider, boss, cultist)
	{
		for (let i in botTypes)
		{
			let bot = botTypes[i]
			if (["assault", "marksman", "cursedassault"].includes(i))
			{
				this.changeHealth(bot, i, scav)
			}
			else if (["pmcbot","exusec"].includes(i))
			{
				this.changeHealth(bot, i, PMC)
			}
			else if (["followergluharassault","followergluharsnipe","followergluharscout","followergluharsecurity","followerbully","followerkojaniy",
			"followersanitar", "followertagilla", "followerbirdeye", "followerbigpipe"].includes(i))
			{
				this.changeHealth(bot, i, raider)
			}
			else if (["sectantpriest", "sectantwarrior"].includes(i))
			{
				this.changeHealth(bot, i, cultist)
			}
			else if (["bossbully", "bossgluhar", "bosskilla", "bosskojaniy", "bosssanitar", "bosstagilla", "bossknight"].includes(i))
			{
				this.changeHealth(bot, i, boss)
			}
		}
	}

	static changeCoreAI()
	{
		let path = database.bots.core;
		/* path.SHOTGUN_POWER = 60
		path.RIFLE_POWER = 60
		path.PISTOL_POWER = 60
		path.SMG_POWER = 60
		path.SNIPE_POWER = 60 */
		path.START_DISTANCE_TO_COV = 5
		path.MAX_DISTANCE_TO_COV = 50
		// path.STAY_COEF = 1
		// path.SIT_COEF = 0.8
		// path.LAY_COEF = 0.8
		path.COVER_SECONDS_AFTER_LOSE_VISION = 2
		path.WEAPON_ROOT_Y_OFFSET = 0
		//Still seems to get stuck shooting the ground while prone sometimes
		path.LAY_DOWN_ANG_SHOOT = 10
		//Not really sure what these do. ..Changing them between 1-20 doesn't seem to have any big effects though?
		// path.SHOOT_TO_CHANGE_RND_PART_MIN = 1
		// path.SHOOT_TO_CHANGE_RND_PART_MAX = 2
		// path.SHOOT_TO_CHANGE_RND_PART_DELTA = 1
		// path.FORMUL_COEF_DELTA_DIST = 0.6
		// path.FORMUL_COEF_DELTA_SHOOT = 1
		// path.COVER_SECONDS_AFTER_LOSE_VISION = 2
		// path.MIDDLE_POINT_COEF = 0.5
		//Setting this to false because they don't seem to do it anyways. Let's see what changes.
		//Basically nothing? Not sure if they even aim for heads, only recoil seems to make them hit heads
		path.CAN_SHOOT_TO_HEAD = config.overallDifficultyMultipliers.allowAimAtHead
		//Is this better higher or lower? Can it get them to group up more? I hope so.
		//path.MIN_MAX_PERSON_SEARCH = 5
		//What exactly does this mean? What are other tactics
		path.MAIN_TACTIC_ONLY_ATTACK = false
		//Test this. Bigger smokes could make them less useless?
		path.SMOKE_GRENADE_RADIUS_COEF = 4.5
		path.LAST_SEEN_POS_LIFETIME = 60
		//Is this how blinded they are by flashlights maybe?
		//Doesn't seem to be. Power 100 duration 60, no noticable change.
		path.FLARE_POWER = 8
		path.FLARE_TIME = 1.5
		// path.DEFENCE_LEVEL_SHIFT = 0
		// path.MIN_DIST_CLOSE_DEF = 2.2
		// path.WAVE_COEF_LOW = 1
		// path.WAVE_COEF_MID = 1
		// path.WAVE_COEF_HIGH = 1
		// path.WAVE_COEF_HORDE = 2
		path.WAVE_ONLY_AS_ONLINE = false
		//In theory, a higher number *should* mean that they'll group with more of their buddies. ..Right? 300 is a super high default for that, though. 300m is ~1.5 times the length of the construction site on Customs. Test this.
		path.DIST_NOT_TO_GROUP = 15
		//Automatically square it, because math is hard.
		path.DIST_NOT_TO_GROUP_SQR = path.DIST_NOT_TO_GROUP * path.DIST_NOT_TO_GROUP
	}

	//Rounds bot stats.
	static roundAllBotStats()
	{
		for (let bot in botTypes)
			for (let diff in botTypes[bot].difficulty)
				for (let cat in botTypes[bot].difficulty[diff])
					for (let statName in botTypes[bot].difficulty[diff][cat])
					{
						let stat = botTypes[bot].difficulty[diff][cat][statName]
						let origStat = stat
						if (typeof(stat) == "number")
						{
							stat == AITweaks.roundNumber(stat)
						}
					}
	}

	static changeAI(mainBot, botDiff, difficulty, diffSetting, botName)
	{
		for (let category in botDiff)
			for (let setting in botDiff[category])
				if (baseAI[category] && baseAI[category][setting])
					botDiff[category][setting] = baseAI[category][setting]
		if (database.globals.config.FinsDifficultyTemplate)
		{
			let aiTemplate = database.globals.config.FinsDifficultyTemplate
			for (let category in aiTemplate)
				if (botDiff[category])
					for (let setting in aiTemplate[category])
						if (botDiff[category][setting])
						AITweaks.changeStat(setting, aiTemplate[category][setting].length == 2 && Array.isArray(aiTemplate[category][setting][0]) ? aiTemplate[category][setting][0] : aiTemplate[category][setting], difficulty, botDiff[category], aiTemplate[category][setting].length == 2 && Array.isArray(aiTemplate[category][setting][0]) ? aiTemplate[category][setting][1] : undefined)
		}
		else
		{
		//Using multipliers for easy testing. Will clean up later.
		//..This is a disgusting lie. The multipliers are here to stay >:D
		
		//As of 11856, a lot of these notes aren't relevant. Biiiiiig changes.
		//Beeg beeg changes
		
		let botCat
		
		//LAY
		botCat = botDiff.Lay;
		//LAY
		botCat.ATTACK_LAY_CHANCE = 5;
		
		//AIMING
		botCat = botDiff.Aiming;
		//AIMING
		//This variable is stupid and I hate it. Lower seems better, but it might rely heavily on other variables?
		// AITweaks.changeStat("MAX_AIM_PRECICING", [1.0,1.2,1.4,1.6,1.7,1.8], difficulty, botCat)
		// AITweaks.changeStat("MAX_AIM_PRECICING", [0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0], difficulty, botCat)
		// AITweaks.changeStat("MAX_AIM_PRECICING", [0.5,0.6,0.7,0.8,0.9,1.0,1.05,1.10,1.15,1.20,1.25], difficulty, botCat)
		AITweaks.changeStat("MAX_AIM_PRECICING", [1.0,1.05,1.10,1.15,1.20,1.25], difficulty, botCat)
		// AITweaks.changeStat("MAX_AIM_PRECICING", [2.1,2.1,2,1.9,1.8,1.7,1.6], difficulty, botCat)
		// botCat.MAX_AIM_PRECICING *= 30
		// botCat.MAX_AIM_PRECICING = 1
		// AITweaks.changeStat("MAX_AIM_PRECICING", [1,1,1,1,1,1.1,1.2,1.3,1.4,1.5,1.6,1.7,1.8,1.9,2], difficulty, botCat)
		AITweaks.changeStat("BETTER_PRECICING_COEF", [0.5,0.55,0.6,0.65,0.7,0.75,0.8,0.85,0.9,1], difficulty, botCat)
		botCat.BETTER_PRECICING_COEF *= 1
		botCat.COEF_FROM_COVER = 0.9; //Lower seems better
		//Setting HARD_AIM to 100 made bots hilariously inaccurate. Smaller is better. Probably.
		AITweaks.changeStat("HARD_AIM", [0.4,0.35,0.325,0.3,0.275,0.25,0.225], difficulty, botCat)
		botCat.HARD_AIM = botCat.HARD_AIM * 2
		botCat.HARD_AIM = 0.75
		botCat.CAN_HARD_AIM = false;
		//Max aiming upgrade by X many seconds? Unsure.
		//Seems to be the above, but it's.. Weird. Even at very high settings the AI *can* still land hits, it's just less likely.
		// AITweaks.changeStat("MAX_AIMING_UPGRADE_BY_TIME", [1.2,1.1,1,0.9,0.8,0.7], difficulty, botCat)
		AITweaks.changeStat("MAX_AIMING_UPGRADE_BY_TIME", [1.5,1.5,1.35,1.15,1,0.85,0.7], difficulty, botCat)
		botCat.MAX_AIMING_UPGRADE_BY_TIME *= 2
		//AITweaks.changeStat("DAMAGE_TO_DISCARD_AIM_0_100", [30,40,50,60,70,86,86], difficulty, botCat)
		botCat.DAMAGE_TO_DISCARD_AIM_0_100 = 28
		botCat.SCATTERING_HAVE_DAMAGE_COEF = 1.3
		//botCat.SHOOT_TO_CHANGE_PRIORITY = 55250
		botCat.DANGER_UP_POINT = 1.3 //test this
		AITweaks.changeStat("MIN_TIME_DISCARD_AIM_SEC", [1.5,2,2.5,3], difficulty, botCat)
		AITweaks.changeStat("MAX_TIME_DISCARD_AIM_SEC", [3.5,4.5,5.5,6.5], difficulty, botCat)
		//This one is weird.
		// AITweaks.changeStat("MIN_TIME_DISCARD_AIM_SEC", [5,4.5,3.5,2.5,2], difficulty, botCat)
		// AITweaks.changeStat("MAX_TIME_DISCARD_AIM_SEC", [5.5,5,4.5,3.5,2.5], difficulty, botCat)
		// botCat.MIN_TIME_DISCARD_AIM_SEC >= (botCat.MAX_TIME_DISCARD_AIM_SEC * 1.1) ? botCat.MIN_TIME_DISCARD_AIM_SEC = botCat.MAX_TIME_DISCARD_AIM_SEC / 1.1 : null
		
		AITweaks.changeStat("XZ_COEF", [0.5,0.5,0.5,0.48,0.475,0.45,0.4,0.375,0.35,0.325,0.3,0.3], difficulty, botCat)
		//AITweaks.changeStat("XZ_COEF", [0.35,0.3,0.25,0.2,0.015,0.1], difficulty, botCat)
		botCat.XZ_COEF = botCat.XZ_COEF * 2.5
		//When BOTTOM_COEF is high, the AI just doesn't shoot?
		AITweaks.changeStat("BOTTOM_COEF", [0.6,0.5,0.4], difficulty, botCat);
		botCat.BOTTOM_COEF = 0.6
		AITweaks.changeStat("FIRST_CONTACT_ADD_SEC", [1,0.75,0.5,0.4,0.3,0.3], difficulty, botCat);
		AITweaks.changeStat("FIRST_CONTACT_ADD_CHANCE_100", [75,65,55,40,50,35], difficulty, botCat);
		//botCat.FIRST_CONTACT_ADD_CHANCE_100 = 0
		botCat.BASE_HIT_AFFECTION_DELAY_SEC = 0.57;
		//botCat.BASE_HIT_AFFECTION_DELAY_SEC = 0.3;
		botCat.BASE_HIT_AFFECTION_MIN_ANG = 4.0;
		botCat.BASE_HIT_AFFECTION_MAX_ANG = 9.0;
		//What does SHIEF stand for? What is this number doing?
		//Apparently higher is worse. Good to know.
		// AITweaks.changeStat("BASE_SHIEF", [0.7,0.6,0.5,0.4,0.35,0.3,0.25,0.22,0.2,0.2], difficulty, botCat)
		AITweaks.changeStat("BASE_SHIEF", [0.8,0.75,0.7,0.65,0.6,0.55,0.5,0.4,0.45,0.43,0.41,0.38,0.35,0.32,0.31,0.30], difficulty, botCat)
		botCat.BASE_SHIEF *= 2
		AITweaks.changeStat("SCATTERING_DIST_MODIF", [0.7,0.675,0.65,0.625,0.6,0.55,0.5,0.475,0.45,0.425,0.4,0.375], difficulty, botCat)
		//AITweaks.changeStat("SCATTERING_DIST_MODIF_CLOSE", [0.5,0.475,0.45,0.425,0.4,0.375], difficulty, botCat)
		AITweaks.changeStat("SCATTERING_DIST_MODIF_CLOSE", [0.39,0.385,0.380,0.375,0.35,0.325], difficulty, botCat)
		botCat.SCATTERING_DIST_MODIF = 0.8
		// botCat.SCATTERING_DIST_MODIF_CLOSE = 0.35
		botCat.SCATTERING_DIST_MODIF *= 1
		botCat.SCATTERING_DIST_MODIF /= 1.1
		// botCat.SCATTERING_DIST_MODIF_CLOSE *= 0.4
		botCat.SCATTERING_DIST_MODIF_CLOSE *= 1
		//botCat.SCATTERING_DIST_MODIF_CLOSE /= 1.2
		
		// botCat.SCATTERING_DIST_MODIF = 1
		// botCat.SCATTERING_DIST_MODIF_CLOSE = 2
		
		//botCat.SCATTERING_DIST_MODIF = 0
		//Do I need the scattering at long range? It seems this only applies to the bots when they're moving, or something.
		//botCat.SCATTERING_DIST_MODIF_CLOSE = 0
		//INVESTIGAVE THIS
		//Using 3 now because a tiny xz value for the fish-wiggle is very useful for preventing the AI from locking itself into uselessness up-close
		//So apparently 1 = ???, 2 = No aiming for legs, 3 = Aim anywhere, 4 =	5 =
		AITweaks.changeStat("AIMING_TYPE", [5,5,5,5,5,3,3], difficulty, botCat)
		AITweaks.changeStat("AIMING_TYPE", [5,5,5,4,4,4,4,3,3], difficulty, botCat)
		if (config.overallDifficultyMultipliers.allowAimAtHead == false)
			botCat.AIMING_TYPE == 3 ? botCat.AIMING_TYPE = 4 : null
		//botCat.AIMING_TYPE = 4
		//
		botCat.SHPERE_FRIENDY_FIRE_SIZE = 0.1;
		AITweaks.changeStat("COEF_IF_MOVE", [1.4,1.3,1.2,1.1,1,1], difficulty, botCat)
		botCat.TIME_COEF_IF_MOVE = 2
		botCat.BOT_MOVE_IF_DELTA = 0.01;
		botCat.ANY_PART_SHOOT_TIME = 30;
		//Is this what makes them turn their flashlights on to blind you?
		AITweaks.changeStat("ANYTIME_LIGHT_WHEN_AIM_100", [35,45,55,65,75,85], difficulty, botCat)
		//botCat.ANYTIME_LIGHT_WHEN_AIM_100 = 0;
		//INVESTIGATE THIS
		//Still have no idea what this does. Made it 100. made it 0.001. AI behaved basically the same.
		//Seems to have some effect now, probably in combination with some other change I made, but maybe due to AKi changes?
		//Setting this to 1000 added maybe three seconds to the time it took a point-blank AI to acquire me. Does not seem related to spotting time, only aiming time. A bot firing on automatic hit me immediately from ~5m away. -The effect may be per-bullet, or something?
		AITweaks.changeStat("MAX_AIM_TIME", [1.1,1,0.95,0.92,0.89,0.87,0.85,0.8,0.7,0.6,0.5,0.4], difficulty, botCat)
		//
		botCat.MAX_AIM_TIME *= 0.6
		botCat.WEAPON_ROOT_OFFSET = 0.35
		//botCat.OFFSET_RECAL_ANYWAY_TIME = 1;
		//botCat.RECALC_MUST_TIME = 1;
		//These are coefs. -Presumably of WEAPON_ROOT_OFFSET? -Nope. They're completely separate.
		//..does an X offset exist?
		// AITweaks.changeStat("Y_TOP_OFFSET_COEF", [0,0.1,0.2,0.3,.4,0.5], difficulty, botCat)
		// AITweaks.changeStat("Y_BOTTOM_OFFSET_COEF", [0,0,0.1,0.1,0.2,0.2], difficulty, botCat)
		botCat.Y_TOP_OFFSET_COEF = 2
		botCat.Y_BOTTOM_OFFSET_COEF = 2
		// AITweaks.changeStat("ENEMY_Y_WEAPON_OFFSET", [0.08,0.06,0.04,0.03,0.02,0.01], difficulty, botCat)
		//Removed in the assembly || botCat.ENEMY_Y_WEAPON_OFFSET = 0.08;
		botCat.XZ_COEF_STATIONARY_GRENADE = 0.2;
		//Unsure of exactly what these do, but it makes the 'shoot to the left' issue a little less awful if they're high?
		//Alright. So apparently this ties into BAD_SHOOTS. BAD_SHOOTS cannot happen inside the no offset range
		botCat.DIST_TO_SHOOT_NO_OFFSET = 3;
		botCat.DIST_TO_SHOOT_TO_CENTER = 3;
		//Further testing revealed this actually does do something, you just have to have offset values that are noticeable
		//What was happening was that, for some strange reason, using the changeStat function to change a stat that doesn't naturally exist for a given AI (As is the case for BAD_SHOOTS stuff, and maybe others I haven't discovered yet) does nothing. You have to set it specifically first, then run the changeStat function. -That's part of what the bit of code at the top of this function is for.
		//BAD_SHOOTS only seems to apply to the first shots an AI fires at a target. If they use up all their BAD_SHOOTS, it does not matter how long you wait, they won't get any BAD_SHOOTS again.
		// AITweaks.changeStat("BAD_SHOOTS_MIN", [2,2,1,1,0,0], difficulty, botCat)
		// AITweaks.changeStat("BAD_SHOOTS_MAX", [3,3,3,2,2,1], difficulty, botCat)
		botCat.BAD_SHOOTS_MIN = 0
		botCat.BAD_SHOOTS_MAX = 0
		//AITweaks.changeStat("BAD_SHOOTS_OFFSET", [0.35,0.3,0.25,0.2,0.15,0.1], difficulty, botCat)
		botCat.BAD_SHOOTS_OFFSET = 2
		botCat.BAD_SHOOTS_MAIN_COEF = 0.25
		AITweaks.changeStat("MIN_DAMAGE_TO_GET_HIT_AFFETS", [10,15,20,25,35,50], difficulty, botCat)
		// botCat.MIN_DAMAGE_TO_GET_HIT_AFFETS = botCat.MIN_DAMAGE_TO_GET_HIT_AFFETS * 5
		AITweaks.changeStat("PANIC_TIME", [2,1.5,1,0.6,0.3,0.1,0.1], difficulty, botCat)
		AITweaks.changeStat("DAMAGE_PANIC_TIME", [12,9,6,4,2,1], difficulty, botCat)
		
		botCat.BASE_SHIEF *= config.overallDifficultyMultipliers.aiAccuracyMult
		botCat.MAX_AIM_TIME *= config.overallDifficultyMultipliers.aiAimSpeedMult
		botCat.SCATTERING_DIST_MODIF *= config.overallDifficultyMultipliers.aiShotSpreadMult
		//Take only half of the normal multiplier, regardless of if positive or negative
		botCat.SCATTERING_DIST_MODIF_CLOSE *= ((Math.sqrt(Math.pow(config.overallDifficultyMultipliers.aiShotSpreadMult,2)) / 2) * (config.overallDifficultyMultipliers.aiShotSpreadMult / (Math.sqrt(Math.pow(config.overallDifficultyMultipliers.aiShotSpreadMult,2)))))
		
		//LOOK
		botCat = botDiff.Look;
		//LOOK
		// NO LONGER USED botCat.ONLY_BODY = false //Currently testing
		AITweaks.changeStat("FAR_DISTANCE", [55,70,85], difficulty, botCat)
		AITweaks.changeStat("MIDDLE_DIST", [25,35,45], difficulty, botCat)
		// botCat.FarDeltaTimeSec = 2.4
		// botCat.MiddleDeltaTimeSec = 0.8
		// botCat.CloseDeltaTimeSec = 0.1
		//Not entirely convinced this does much
		AITweaks.changeStat("FarDeltaTimeSec", [4.7,4.1,3.5,3,2.4,1.8,1.5,1.2,1,1], difficulty, botCat)
		AITweaks.changeStat("MiddleDeltaTimeSec", [2,1.8,1.6,1.4,1.2,1,0.8,0.6,0.4,0.4], difficulty, botCat)
		AITweaks.changeStat("CloseDeltaTimeSec", [1.3,1.2,1.1,1,0.8,0.6,0.4,0.2,0.1,0.1], difficulty, botCat)
		botCat.CloseDeltaTimeSec *= 0.6
		botCat.MiddleDeltaTimeSec *= 0.85
		botCat.FarDeltaTimeSec *= 1
		botCat.CloseDeltaTimeSec *= 1
		botCat.MiddleDeltaTimeSec *= 2
		botCat.FarDeltaTimeSec *= 3
		
		botCat.CloseDeltaTimeSec *= 0.7
		botCat.MiddleDeltaTimeSec *= 1
		botCat.FarDeltaTimeSec *= 1
		
		botCat.CloseDeltaTimeSec *= 1.2
		botCat.MiddleDeltaTimeSec *= 1.7
		botCat.FarDeltaTimeSec *= 1.7
		
		//I have no idea what any of this means. Oh well.
		//Could it be related to when an AI can't see you anymore?
		botCat.GOAL_TO_FULL_DISSAPEAR = 2//1.1;
		//Check this one. Assault is 0.0001, Kojaniy is 0.03
		// botCat.GOAL_TO_FULL_DISSAPEAR_SHOOT = 0.09//0.03;
		botCat.CAN_LOOK_TO_WALL = false;
		botCat.CloseDeltaTimeSec *= config.overallDifficultyMultipliers.aiVisionSpeedMult
		botCat.MiddleDeltaTimeSec *= config.overallDifficultyMultipliers.aiVisionSpeedMult
		botCat.FarDeltaTimeSec *= config.overallDifficultyMultipliers.aiVisionSpeedMult
		
		//SHOOT
		botCat = botDiff.Shoot;
		//SHOOT
		//Test this one. Appears on cultists. Cultist default is 0.3
		botCat.FINGER_HOLD_STATIONARY_GRENADE = 0.01
		AITweaks.changeStat("RECOIL_TIME_NORMALIZE",[0.36,0.33,0.3,0.27,0.24,0.21,0.19], difficulty, botCat)
		AITweaks.changeStat("RECOIL_TIME_NORMALIZE",[0.12,0.12,0.12,0.12,0.11,0.10,0.095], difficulty, botCat)
		// botCat.RECOIL_TIME_NORMALIZE = 0.12
		// AITweaks.changeStat("RECOIL_PER_METER", [0.115,0.105,0.095,0.085,0.075,0.065,0.055], difficulty, botCat)
		// AITweaks.changeStat("MAX_RECOIL_PER_METER", [0.4,0.3,0.2,0.175,0.15,0.1], difficulty, botCat)
		botCat.RECOIL_PER_METER = 0.09
		// botCat.RECOIL_PER_METER *= 0.9
		botCat.RECOIL_PER_METER *= 1.4
		botCat.MAX_RECOIL_PER_METER = 0.1
		// botCat.MAX_RECOIL_PER_METER *= 1
		botCat.MAX_RECOIL_PER_METER *= 1.6
		// botCat.HORIZONT_RECOIL_COEF = 1.4
		// AITweaks.changeStat("HORIZONT_RECOIL_COEF",[3.2,3.1,3,2.85,2.7,2.55,2.4], difficulty, botCat)
		botCat.HORIZONT_RECOIL_COEF = 1
		//botCat.MAX_RECOIL_PER_METER = botCat.MAX_RECOIL_PER_METER * 0.4
		//botCat.MAX_RECOIL_PER_METER *= 10
		//botCat.RECOIL_PER_METER = botCat.MAX_RECOIL_PER_METER / 50
		//botCat.RECOIL_DELTA_PRESS = 0.15
		//AITweaks.changeStat("HORIZONT_RECOIL_COEF", [0.6,0.5,0.4,0.3,0.2,0.1], difficulty, botCat)
		//botCat.HORIZONT_RECOIL_COEF = botCat.HORIZONT_RECOIL_COEF * 2
		botCat.WAIT_NEXT_SINGLE_SHOT = 0.1
		AITweaks.changeStat("WAIT_NEXT_SINGLE_SHOT_LONG_MAX", [2.3,1.8,1.3,0.9,0.75,0.5], difficulty, botCat)
		botCat.WAIT_NEXT_SINGLE_SHOT_LONG_MIN = botCat.WAIT_NEXT_SINGLE_SHOT_LONG_MAX / 4
		//AITweaks.changeStat("WAIT_NEXT_SINGLE_SHOT_LONG_MIN", [0.4,0.3,0.2,0.15,0.15,0.15], difficulty, botCat)
		AITweaks.changeStat("BASE_AUTOMATIC_TIME", [0.2,0.5,0.8,0.9,1,1.1,1.2,1.2], difficulty, botCat)
		AITweaks.changeStat("CHANCE_TO_CHANGE_TO_AUTOMATIC_FIRE_100", [65,75,80,85,90,95,100,100], difficulty, botCat)
		botCat.FAR_DIST_ENEMY = 25.0;
		botCat.FAR_DIST_ENEMY_SQR = botCat.FAR_DIST_ENEMY * botCat.FAR_DIST_ENEMY;
		//botCat.MAX_DIST_COEF = 1;
		botCat.CAN_SHOOTS_TIME_TO_AMBUSH = 0;
		botCat.LOW_DIST_TO_CHANGE_WEAPON = 5.0;
		botCat.FAR_DIST_TO_CHANGE_WEAPON = 30.0;
		botCat.AUTOMATIC_FIRE_SCATTERING_COEF = 1.4;
//		botCat.MARKSMAN_DIST_SEK_COEF = 1000;
		//Using multipliers from config
			botCat.WAIT_NEXT_SINGLE_SHOT = botCat.WAIT_NEXT_SINGLE_SHOT * config.overallDifficultyMultipliers.semiAutoFireRateMult
			botCat.WAIT_NEXT_SINGLE_SHOT_LONG_MAX = botCat.WAIT_NEXT_SINGLE_SHOT_LONG_MAX * config.overallDifficultyMultipliers.semiAutoFireRateMult
			botCat.WAIT_NEXT_SINGLE_SHOT_LONG_MIN = botCat.WAIT_NEXT_SINGLE_SHOT_LONG_MIN * config.overallDifficultyMultipliers.semiAutoFireRateMult
			// botCat.RECOIL_TIME_NORMALIZE = botCat.RECOIL_TIME_NORMALIZE * config.overallDifficultyMultipliers.aiRecoilMult
			botCat.RECOIL_PER_METER = botCat.RECOIL_PER_METER * config.overallDifficultyMultipliers.aiRecoilMult
			botCat.MAX_RECOIL_PER_METER = botCat.MAX_RECOIL_PER_METER * config.overallDifficultyMultipliers.aiRecoilMult
			botCat.HORIZONT_RECOIL_COEF = botCat.HORIZONT_RECOIL_COEF * config.overallDifficultyMultipliers.aiRecoilMult
		botCat.SHOOT_FROM_COVER = 5
		botCat.MAX_DIST_COEF = 1.2
		botCat.TRY_HIT_PERIOD_MELEE = 4
		
		//MOVE
		botCat = botDiff.Move;
		//MOVE
		botCat.RUN_IF_CANT_SHOOT = true
		
		//GRENADE
		botCat = botDiff.Grenade;
		//GRENADE
		//INVESTIGATE. Is this shouting for when they throw grenades, or when they sense you throwing them?
		botCat.CHANCE_TO_NOTIFY_ENEMY_GR_100 = 100.0;
		botCat.AMBUSH_IF_SMOKE_IN_ZONE_100 = 5;
		botCat.SMOKE_SUPPRESS_DELTA = 25;
		
		//Play with these sometime
		//botCat.MAX_FLASHED_DIST_TO_SHOOT = 10
		//botCat.MAX_FLASHED_DIST_TO_SHOOT_SQRT = botCat.MAX_FLASHED_DIST_TO_SHOOT * botCat.MAX_FLASHED_DIST_TO_SHOOT
		//botCat.FLASH_GRENADE_TIME_COEF = 0.3
		//botCat.SIZE_SPOTTED_COEF = 2
		//botCat.BE_ATTENTION_COEF = 4
		//botCat.TIME_SHOOT_TO_FLASH = 4
		
		//CHANGE
		botCat = botDiff.Change;
		//CHANGE
		
        botCat.SMOKE_VISION_DIST = 0.05
        // botCat.SMOKE_GAIN_SIGHT = 1.6
        // botCat.SMOKE_SCATTERING = 1.6
        // botCat.SMOKE_PRECICING = 1.6
        // botCat.SMOKE_HEARING = 1
        // botCat.SMOKE_ACCURATY = 1.6
        // botCat.SMOKE_LAY_CHANCE = 1.6
        // botCat.FLASH_VISION_DIST = 0.05
        // botCat.FLASH_GAIN_SIGHT = 1.8
        // botCat.FLASH_SCATTERING = 1.6
        // botCat.FLASH_PRECICING = 1.6
        // botCat.FLASH_HEARING = 1
        // botCat.FLASH_ACCURATY = 1.6
        // botCat.FLASH_LAY_CHANCE = 1
        // botCat.STUN_HEARING = 0.01
		
		botCat.MIN_DIST_NOT_TO_THROW = 8
		AITweaks.changeStat("MIN_THROW_GRENADE_DIST", [12,11,10,9,8,8], difficulty, botCat)
		AITweaks.changeStat("MAX_THROW_POWER", [15,18,21], difficulty, botCat)
		AITweaks.changeStat("GrenadePrecision", [0.3,0.2,0.15,0.1,0.075,0.05], difficulty, botCat)
		//botCat.RUN_AWAY = 22
		AITweaks.changeStat("ADD_GRENADE_AS_DANGER", [20,20,20,20,20,30,40,50,60,65,65,65,65], difficulty, botCat)
		botCat.MIN_DIST_NOT_TO_THROW_SQR = botCat.MIN_DIST_NOT_TO_THROW * botCat.MIN_DIST_NOT_TO_THROW
		botCat.MIN_THROW_GRENADE_DIST_SQRT	= botCat.MIN_THROW_GRENADE_DIST * botCat.MIN_THROW_GRENADE_DIST //This looks like it should be a square root, but default values are the square of MIN_THROW_GRENADE_DIST??
		botCat.RUN_AWAY_SQR = botCat.RUN_AWAY * botCat.RUN_AWAY
		botCat.ADD_GRENADE_AS_DANGER_SQR = botCat.ADD_GRENADE_AS_DANGER * botCat.ADD_GRENADE_AS_DANGER
		AITweaks.changeStat("CHANCE_RUN_FLASHED_100", [0,0,0,10,20,30,40,50,60,70,80,90], difficulty, botCat)
		botCat.GrenadePrecision *= config.overallDifficultyMultipliers.grenadePrecisionMult
		botCat.MAX_THROW_POWER *= config.overallDifficultyMultipliers.grenadeThrowRangeMult
		botCat.MAX_THROW_POWER > config.overallDifficultyMultipliers.grenadeThrowRangeMax ? botCat.MAX_THROW_POWER = config.overallDifficultyMultipliers.grenadeThrowRangeMax : null
		
		//COVER
		botCat = botDiff.Cover;
		// botCat.STATIONARY_WEAPON_MAX_DIST_TO_USE = 0
		//COVER
		//INVESTIGATE THIS
		//Cover seems bad. The AI's accuracy goes to shit when they're in cover, but no variable seems to actually affect that. Is it hard coded, or am I just missing it?
		//Tried setting everything to zero that wouldn't break the game by being zero. The game was a slideshow, and accuracy was still garbage when in cover. Tried setting the zeroes to 100. Less of a slideshow, but the accuracy still sucked. I'm leaning towards the idea that it's hard coded.
		//That seems to just be part of the offline AI. Fixed as of newer AKI versions.
		botCat.MOVE_TO_COVER_WHEN_TARGET = false;
		botCat.CHECK_COVER_ENEMY_LOOK = false;
		botCat.REWORK_NOT_TO_SHOOT = false;
		botCat.DELETE_POINTS_BEHIND_ENEMIES = true;
		botCat.SHOOT_NEAR_TO_LEAVE = 3
		//botCat.LOOK_LAST_ENEMY_POS_MOVING = 0.1
		//botCat.LOOK_TO_HIT_POINT_IF_LAST_ENEMY = 0.1
		//botCat.LOOK_LAST_ENEMY_POS_LOOKAROUND = 0.1
		//What does this mean?
		botCat.CHECK_CLOSEST_FRIEND = true;
		botCat.MIN_TO_ENEMY_TO_BE_NOT_SAFE = 15.0;
		//botCat.MIN_TO_ENEMY_TO_BE_NOT_SAFE_SQRT = 0.0;
		// Removed from the assembly || botCat.CAN_LOOK_OUT_WHEN_HOLDING = true;
		//botCat.SIT_DOWN_WHEN_HOLDING = true;
		botCat.MIN_DEFENCE_LEVEL = 3//15//22 //Unsure exactly what this does either
		botCat.MIN_DIST_TO_ENEMY = 5
		botCat.DELTA_SEEN_FROM_COVE_LAST_POS = 6
		botCat.RETURN_TO_ATTACK_AFTER_AMBUSH_MIN = 5
		botCat.RETURN_TO_ATTACK_AFTER_AMBUSH_MAX = 10
		//
		
		//PATROL
		botCat = botDiff.Patrol;
		//PATROL
		//INVESTIGATE THIS
		botCat.CHANGE_WAY_TIME = 15.1;
		botCat.LOOK_TIME_BASE = 5
		botCat.CHANCE_TO_CHANGE_WAY_0_100 = 70//30.0;
		botCat.RESERVE_OUT_TIME = 5.0;
		botCat.RESERVE_TIME_STAY = 5.0;
		//
		botCat.VISION_DIST_COEF_PEACE = 0.5;
		//Test this.
		botCat.FRIEND_SEARCH_SEC = 60;
		
		//HEARING
		botCat = botDiff.Hearing;
		//HEARING
		botCat.LOOK_ONLY_DANGER = false
		botCat.CHANCE_TO_HEAR_SIMPLE_SOUND_0_1 = 1
		// botCat.CLOSE_DIST = 250 //25
		// botCat.FAR_DIST = 450 //45
		// botCat.SOUND_DIR_DEEFREE = 30
		//Is this even making a difference? Assuming higher is better for now.
		// botCat.DISPERSION_COEF = 40
		// botCat.DISPERSION_COEF_GUN = 160
		
		
		//MIND
		botCat = botDiff.Mind;
		//MIND
		botCat.TIME_LEAVE_MAP = undefined//50 //Might be the time they disappear, like cultists?
		//The game really doesn't like when Min or Max SHOOTS_TIME is anything but an integer. Unsure why.
		botCat.CAN_THROW_REQUESTS = true
		botCat.ENEMY_LOOK_AT_ME_ANG = 10
		//Seems to have nothing to do with talking?
		//..Or does it?
		botCat.TALK_WITH_QUERY = true;
		AITweaks.changeStat("MIN_SHOOTS_TIME", [0,0,0,0,0,0], difficulty, botCat);
		AITweaks.changeStat("MAX_SHOOTS_TIME", [0,0,0,0,0,0], difficulty, botCat);
		// botCat.MIN_SHOOTS_TIME = 1
		// botCat.MAX_SHOOTS_TIME = 2
		botCat.MIN_START_AGGRESION_COEF = 1, //Unsure of what these do. Defaults are 1 and 3.
		botCat.MAX_START_AGGRESION_COEF = 3,
		//Is this the chance they flip you off? Test this.
		//This is the change they flip you off.
		botCat.CHANCE_FUCK_YOU_ON_CONTACT_100 = 0;
		//INVESTIGATE THIS
		botCat.CAN_STAND_BY = true;
		// botCat.CAN_STAND_BY = false;
		//
		// botCat.DANGER_POINT_CHOOSE_COEF = 0.01
		// botCat.SIMPLE_POINT_CHOOSE_COEF = 0.01
		// botCat.LASTSEEN_POINT_CHOOSE_COEF = 0.01
		botCat.DANGER_EXPIRE_TIME_MIN = 0.4;
		botCat.DANGER_EXPIRE_TIME_MAX = 1.2;
		botCat.PANIC_RUN_WEIGHT = 20.0;
		botCat.PANIC_SIT_WEIGHT = 1.0;
		botCat.PANIC_LAY_WEIGHT = 1.0;
		botCat.PANIC_NONE_WEIGHT = 40.0;
		botCat.PANIC_SIT_WEIGHT_PEACE = 60.0;
		// botCat.CAN_USE_LONG_COVER_POINTS = true;
		//Doesn't affect talking
		botCat.CAN_EXECUTE_REQUESTS = true;
		botCat.DIST_TO_ENEMY_SPOTTED_ON_HIT = 20.0;
		AITweaks.changeStat("MIN_DAMAGE_SCARE", [20,30,40,50,60,70], difficulty, botCat)
		botCat.MIN_DAMAGE_SCARE = botCat.MIN_DAMAGE_SCARE * 10
		botCat.WILL_PERSUE_AXEMAN = false;
		botCat.CHANCE_SHOOT_WHEN_WARN_PLAYER_100 = 100.0
		//Test this. I assume it means "Heal below this percent", but who knows, it could be flipped around.
		//It does seem to be "Heal below this percent". Good.
		AITweaks.changeStat("PART_PERCENT_TO_HEAL", [0.70,0.75,0.80,0.85,0.90,0.95], difficulty, botCat)
		//AITweaks.changeStat("ATTACK_IMMEDIATLY_CHANCE_0_100", [0,0,25,45,75,85], difficulty, botCat)
		AITweaks.changeStat("ATTACK_IMMEDIATLY_CHANCE_0_100", [35,45,55,65,75,80,80], difficulty, botCat)
		//botCat.AI_POWER_COEF *= 2
		botCat.DOG_FIGHT_OUT = 6
		botCat.DOG_FIGHT_IN = 5
		// botCat.SHOOT_INSTEAD_DOG_FIGHT = 9
		botCat.NO_RUN_AWAY_FOR_SAFE = true
		AITweaks.changeStat("MAX_AGGRO_BOT_DIST", [100,105,110], difficulty, botCat)
		botCat.MAX_AGGRO_BOT_DIST_SQR = botCat.MAX_AGGRO_BOT_DIST * botCat.MAX_AGGRO_BOT_DIST
		//botCat.MAX_AGGRO_BOT_DIST = 100
		botCat.TIME_TO_FIND_ENEMY = 60
		AITweaks.changeStat("CHANCE_TO_RUN_CAUSE_DAMAGE_0_100", [70,60,50,40,30,25], difficulty, botCat)

		//botCat.HEAL_DELAY_SEC = 5
		//botCat.DIST_TO_ENEMY_YO_CAN_HEAL = 15.0
		botCat.TIME_TO_FORGOR_ABOUT_ENEMY_SEC = 102//52
		botCat.DEFAULT_ENEMY_USEC = true
		botCat.DEFAULT_BEAR_BEHAVIOUR = "Attack"
        botCat.DEFAULT_SAVAGE_BEHAVIOUR = "Warn"
        botCat.DEFAULT_USEC_BEHAVIOUR = "Attack"

		//BOSS
		botCat = botDiff.Boss;
		// botCat.TAGILLA_CLOSE_ATTACK_DIST = 5
		// botCat.TAGILLA_LARGE_ATTACK_DIST = 9
		// botCat.TAGILLA_FORCED_CLOSE_ATTACK_DIST = 3
		// botCat.TAGILLA_TIME_TO_PURSUIT_WITHOUT_HITS = 3
		//BOSS
		
		//CORE
		botCat = botDiff.Core;
		//CORE
		let maxAng = config.overallDifficultyMultipliers.visibleAngleMax
		config.overallDifficultyMultipliers.visibleAngleMax > 360 ? maxAng = 360 : null
		// config.overallDifficultyMultipliers.visibleAngleMax > 180 ? maxAng = 180 : null //Testing FOV weirdness. 180 might be the actual ingame cap, and things above that behave weirdly on some bots?
		
		AITweaks.changeStat("VisibleAngle", [120,150,180,210,240,270], difficulty, botCat)
		botCat.VisibleAngle *= config.overallDifficultyMultipliers.visibleAngleMult
		botCat.VisibleAngle > maxAng ? botCat.VisibleAngle = maxAng : null
		// botCat.VisibleAngle /= 2 //Some evidence suggests that visible angle is actually double what it should be ingame, and that super-high values cause errors?
		AITweaks.changeStat("VisibleDistance", [115,125,135,145,155,165], difficulty, botCat)
		//Making this high can have a dramatic impact on the AI's spotting time, making them take longer to see you. -However, making it super low does not bring the spotting time down to zero.
		botCat.GainSightCoef = 0.15;
		botCat.ScatteringPerMeter = 0.1;
		botCat.ScatteringClosePerMeter = 0.18;
		AITweaks.changeStat("ScatteringPerMeter", [0.15,0.1,0.085,0.06,0.045,0.03], difficulty, botCat)
		AITweaks.changeStat("ScatteringClosePerMeter", [0.21,0.18,0.15,0.12,0.09,0.06], difficulty, botCat)
		botCat.ScatteringClosePerMeter = botCat.ScatteringClosePerMeter * 1.3
		botCat.ScatteringPerMeter = botCat.ScatteringPerMeter * 1
		botCat.DamageCoeff = 1.0;
		//Set hearing to 10. Seemed to make bots enter 'ambush' mode extremely often, and rarely fought eachother. Suspect they heard movement from massive distance away, got caught in a loop. One moves, spooks the other, other moves into cover, first one hears it, also moves into cover. Forever.
		//Not sure though.
		// AITweaks.changeStat("HearingSense", [1.5,2.0,2.5,3.9,4.5,5.2], difficulty, botCat)
		AITweaks.changeStat("HearingSense", [0.1,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,0.92,0.94,0.96,0.98,0.98], difficulty, botCat)
		botCat.HearingSense *= 1
		//Check config entry for this one
		botCat.CanGrenade = config.overallDifficultyMultipliers.allowGrenades;
		//Are there other aiming types? Other bots all seem to use 'normal'.
		botCat.AimingType = "normal";
		// AITweaks.changeStat("AccuratySpeed", [0.32,0.3,0.28,0.26,0.24,0.22], difficulty, botCat)
		AITweaks.changeStat("AccuratySpeed", [0.34,0.33,0.32,0.31,0.29,0.28,0.27,0.26], difficulty, botCat)
		botCat.AccuratySpeed *= 2
		botCat.WaitInCoverBetweenShotsSec = 0.2;
		//Using multipliers from config
			// botCat.HearingSense = botCat.HearingSense * config.overallDifficultyMultipliers.aiHearingMult
		// botCat.AccuratySpeed *= Math.sqrt(config.overallDifficultyMultipliers.aiAimSpeedMult)
		botCat.VisibleDistance *= Math.sqrt(config.overallDifficultyMultipliers.visibleDistanceMult)
		botCat.ScatteringPerMeter *= config.overallDifficultyMultipliers.aiShotSpreadMult
		botCat.ScatteringClosePerMeter *= config.overallDifficultyMultipliers.aiShotSpreadMult

		//SCATTERING
		botCat = botDiff.Scattering;
		//SCATTERING
		//Scattering also doesn't affect shoot to the left / cover accuracy. Of course.
		AITweaks.changeStat("MinScatter", [1,0.8,0.7,0.6,0.5,0.4,0.35,0.3,0.25,0.2,0.15,0.1,0.09,0.08], difficulty, botCat)
		AITweaks.changeStat("WorkingScatter", [1,0.8,0.7,0.6,0.5,0.4,0.3,0.2], difficulty, botCat)
		AITweaks.changeStat("MaxScatter", [3,2.5,2,1.5,1.2,1,0.9,0.8,0.7,0.6,0.5], difficulty, botCat)
		botCat.MinScatter *= 2.8
		botCat.MinScatter *= 1.8
		botCat.WorkingScatter *= 2.5
		botCat.MaxScatter *= 0.9
		botCat.MaxScatter *= 1
		//Just in case stuff:
		// if (botCat.WorkingScatter > botCat.MaxScatter)
			// botCat.WorkingScatter = botCat.MaxScatter * 0.9
		// if (botCat.MinScatter > botCat.WorkingScatter)
			// botCat.MinScatter = botCat.WorkingScatter * 0.9
		// botCat.WorkingScatter *= 2
		// botCat.MaxScatter *= 2
		botCat.MinScatter *= config.overallDifficultyMultipliers.aiShotSpreadMult
		botCat.WorkingScatter *= config.overallDifficultyMultipliers.aiShotSpreadMult
		botCat.MaxScatter *= config.overallDifficultyMultipliers.aiShotSpreadMult
		
		//Testing
		botCat.SpeedUp = 0.3
		botCat.SpeedUpAim = 1.4
		botCat.SpeedDown = -0.3
		botCat.ToSlowBotSpeed = 1.5
		botCat.ToLowBotSpeed = 2.4
		botCat.ToUpBotSpeed = 3.6
		botCat.MovingSlowCoef = 1.5
		botCat.ToLowBotAngularSpeed = 80
		botCat.ToStopBotAngularSpeed = 40
		
		//Is this aimpunch? Doesn't seem to be
		botCat.FromShot = 0.01
		
		botCat.Caution = 0.3
		
		botCat.HandDamageAccuracySpeed = 1.3
		
		botCat.TracerCoef = 1;
		botCat.HandDamageScatteringMinMax = 0.7;
		//botCat.HandDamageAccuracySpeed = 1;
		// AITweaks.changeStat("RecoilControlCoefShootDone", [0.0025,0.0026,0.0027,0.0028,0.0029,0.003], difficulty, botCat)
		// AITweaks.changeStat("RecoilControlCoefShootDoneAuto", [0.00025,0.00026,0.00027,0.00028,0.00029,0.0003], difficulty, botCat)
		// botCat.RecoilControlCoefShootDone *= 5
		botCat.RecoilControlCoefShootDone = 0.0003
		botCat.RecoilControlCoefShootDoneAuto = 0.00009
		// AITweaks.changeStat("RecoilControlCoefShootDoneAuto", [0.0001425, 0.000145, 0.0001475, 0.00015, 0.0001525], difficulty, botCat)
		botCat.RecoilControlCoefShootDoneAuto /= 10
		botCat.DIST_FROM_OLD_POINT_TO_NOT_AIM = 15
		botCat.DIST_FROM_OLD_POINT_TO_NOT_AIM_SQRT = Math.sqrt(botCat.DIST_FROM_OLD_POINT_TO_NOT_AIM)
		botCat.RecoilYCoef = 0.0005
		botCat.RecoilYCoefSppedDown = -0.52
		botCat.RecoilYMax = 0.5
		//botCat.RecoilYMax = botCat.RecoilYMax / 6 //Not sure if this does anything? Sure doesn't seem to
		//AITweaks.changeStat("RecoilYMax", [0.5,0.48,0.46,0.44,0.42,0.40], difficulty, botCat)
		
		//Boss-specific modifications. These should probably take the form of multipliers on existing stats.

		}
		
		if (botDiff.Scattering.WorkingScatter > botDiff.Scattering.MaxScatter)
			botDiff.Scattering.WorkingScatter = botDiff.Scattering.MaxScatter * 0.9
		if (botDiff.Scattering.MinScatter > botDiff.Scattering.WorkingScatter)
			botDiff.Scattering.MinScatter = botDiff.Scattering.WorkingScatter * 0.9
		
		//Squares and square roots
		//THIS IS AN INCOMPLETE LIST
		botDiff.Shoot.FAR_DIST_ENEMY_SQR = botDiff.Shoot.FAR_DIST_ENEMY * botDiff.Shoot.FAR_DIST_ENEMY
		botDiff.Grenade.MIN_DIST_NOT_TO_THROW_SQR = botDiff.Grenade.MIN_DIST_NOT_TO_THROW * botDiff.Grenade.MIN_DIST_NOT_TO_THROW
		botDiff.Grenade.MIN_THROW_GRENADE_DIST_SQRT = botDiff.Grenade.MIN_THROW_GRENADE_DIST * botDiff.Grenade.MIN_THROW_GRENADE_DIST //This looks like it should be a square root: but default values are the square of MIN_THROW_GRENADE_DIST??
		botDiff.Grenade.RUN_AWAY_SQR = botDiff.Grenade.RUN_AWAY * botDiff.Grenade.RUN_AWAY
		botDiff.Grenade.ADD_GRENADE_AS_DANGER_SQR = botDiff.Grenade.ADD_GRENADE_AS_DANGER * botDiff.Grenade.ADD_GRENADE_AS_DANGER
		botDiff.Mind.MAX_AGGRO_BOT_DIST_SQR = botDiff.Mind.MAX_AGGRO_BOT_DIST * botDiff.Mind.MAX_AGGRO_BOT_DIST
		botDiff.Scattering.DIST_FROM_OLD_POINT_TO_NOT_AIM_SQRT = Math.sqrt(botDiff.Scattering.DIST_FROM_OLD_POINT_TO_NOT_AIM)
	}

	static clearString(s: string)
	{
		return s.replace(/[\b]/g, "")
			.replace(/[\f]/g, "")
			.replace(/[\n]/g, "")
			.replace(/[\r]/g, "")
			.replace(/[\t]/g, "")
			.replace(/[\\]/g, "");
	}

	static getBody(data: any, err = 0, errmsg = null)
	{
		return AITweaks.clearString(AITweaks.getUnclearedBody(data, err, errmsg));
	}

	static nullResponse()
	{
		return AITweaks.getBody(null);
	}
	
	static getUnclearedBody(data: any, err = 0, errmsg = null)
	{
		return AITweaks.serialize({
			"err": err,
			"errmsg": errmsg,
			"data": data
		});
	}
	
	static serialize(data: { err: number; errmsg: any; data: any; }, prettify = false)
	{
		if (prettify)
		{
			return JSON.stringify(data, null, "\t");
		}
		else
		{
			return JSON.stringify(data);
		}
	}

	static roundNumber(stat) //Actually truncates
	{
		if (typeof(stat) == "number")
		{
			let absoluteNum = Math.sqrt(stat * stat)
			let decimal = absoluteNum < 1 ? true : false
			let integer = decimal ? 0 : stat - (stat % 1)
			if (integer == stat)
				return stat
			let negative = stat < 0 ? true : false
			
			let strStat = (stat * 1).toString().replace("-","").replace(".","") //Convert to string
			// console.log(`${absoluteNum} ${decimal} ${integer} ${negative} ${strStat}`)
			for (let i = 1; i < strStat.length; i++)//count the leading zeroes
				if (strStat[i] == "0")
					null//zeroes++
				else
					strStat = strStat.length < i + 3 ? strStat : strStat.slice(0, i + 3)
			stat = +(integer.toString() + "." + strStat.slice(1)) * (negative ? -1 : 1)
		}
		return stat
	}
	
	
    
	//This function is used when the value will vary by bot difficulty. Values can theoretically be infinitely low or infinitely high
	//value is an array of all possible values

	static changeStat(type, value, difficulty, botCat, multiplier?)
	{
		if (multiplier == undefined)
			multiplier = 1
		let setValue

		if (value.length == 1)
		{
			if (typeof(value[0]) == "number")
				botCat[type] = value[0] * multiplier
			else
				botCat[type] = value[0]
			return
		}
			
		let exceptions = ["VisibleDistance", "PART_PERCENT_TO_HEAL", "HearingSense", "AIMING_TYPE"] //Distance is on here because there's a config value to modify that on its own, same with hearing
		if (!exceptions.includes(type) && typeof(value[0]) == "number")//Some values don't work with this system. Things with unusual caps, like visible angle.
		{
			//These values must be whole numbers
			let decimalExceptions = ["BAD_SHOOTS_MIN", "BAD_SHOOTS_MAX", "MIN_SHOOTS_TIME", "MAX_SHOOTS_TIME"]
			
			let divisor = 100
			
			if (Math.trunc(difficulty) != difficulty && !decimalExceptions.includes(type)) //If it's not a whole number.. ..Oh boy. We're getting into a rabbit hole now, aren't we?
			{
				let newValues = [value[0]] //An array with the lowest possible value as its starting point
				for (let val = 0; val < value.length - 1; val++)
				{
					let difference = value[val + 1] - value[val]
					for (let i = 0; i < divisor; i++)
						newValues.push(newValues[(val * divisor) + i] + (difference / divisor))
				}
				value = newValues
				difficulty = Math.round(difficulty * divisor)
			}
			else if (Math.trunc(difficulty) != difficulty && decimalExceptions.includes(type))
			{
				difficulty = Math.round(difficulty)
			}
			let numValues = value.length - 1 //This should allow for variations in the size of the difficulty setting arrays.
			
			//Should allow for a smooth transition into difficulties greater than the standard 0-5 range
			if (difficulty > numValues)
			{
				if (value[(numValues - 1)] - value[numValues] < 0) //going up
					{setValue = value[numValues] + ((value[numValues] - value[(numValues - 1)]) * (difficulty - numValues))
					if(setValue > 100 && type.slice(-4) == "_100")
						setValue = 100}
				else if (value[numValues] == 0)
					setValue = 0
				else
					setValue = value[numValues] * Math.pow((value[numValues] / value[(numValues - 1)]) , difficulty - numValues)
			}
			else if (difficulty < 0)
			{
				if (value[1] - value[0] < 0) //going up
					setValue = value[0] + ((value[0] - value[1]) * (difficulty * -1))
				else if (value[0] <= 0)
					setValue = 0
				else
				{
					setValue = value[0] * Math.pow((value[0] / value[(1)]) , difficulty * -1)
				}
			}
			else
				setValue = value[difficulty]
			if (Math.round(value[numValues]) == value[numValues]) //If all values are integers, keep it that way
				if (value.find(i => Math.round[value[i]] == value[i]))
				{
					//console.log(value)
					setValue = Math.round(setValue)
				}
		}
		else
		{
			let numValues = value.length - 1
			difficulty = Math.round(difficulty)
			if (difficulty > numValues)
				difficulty = numValues
			if (difficulty < 0)
				difficulty = 0
			setValue = value[difficulty]
		}
		botCat[type] = setValue * multiplier
	}


	static clone(data: any) {
		return JSON.parse(JSON.stringify(data));
	}
}


module.exports = { mod: new AITweaks() }