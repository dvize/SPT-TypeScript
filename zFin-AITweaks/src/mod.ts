/* license: NCSA *
* copyright: Fin *
* website: Nada	*
* authors:		 *
* 	- Fin 		*/

import { IPreAkiLoadMod } from "@spt-aki/models/external/IPreAkiLoadMod";
import { IPostAkiLoadMod } from "@spt-aki/models/external/IPostAkiLoadMod";
import type { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import { DependencyContainer } from "tsyringe";
import { Item } from "@spt-aki/models/eft/common/tables/IItem";
import { ItemHelper } from "@spt-aki/helpers/ItemHelper";
import { ILogger } from "../types/models/spt/utils/ILogger";
import {DynamicRouterModService} from "@spt-aki/services/mod/dynamicRouter/DynamicRouterModService";
import {StaticRouterModService} from "@spt-aki/services/mod/staticRouter/StaticRouterModService";
import { ConfigServer } from "@spt-aki/servers/ConfigServer";
import { ConfigTypes } from "@spt-aki/models/enums/ConfigTypes";
import { BaseClasses } from "@spt-aki/models/enums/BaseClasses";
import { IBotConfig } from "@spt-aki/models/spt/config/IBotConfig";
import { IInRaidConfig  } from "@spt-aki/models/spt/config/IInraidConfig";
import { ITraderConfig  } from "@spt-aki/models/spt/config/ITraderConfig";
import { BotGeneratorHelper } from "@spt-aki/helpers/botGeneratorHelper";
import { BotGenerator } from "@spt-aki/generators/BotGenerator";
import { BotHelper } from "@spt-aki/helpers/BotHelper";
import { BotWeaponGenerator } from "@spt-aki/generators/BotWeaponGenerator";
import { WebSocketServer } from "@spt-aki/servers/WebSocketServer";
import { WeightedRandomHelper } from "@spt-aki/helpers/WeightedRandomHelper";
import { Mods, ModsChances } from "@spt-aki/models/eft/common/tables/IBotType";
import { ITemplateItem, Slot } from "@spt-aki/models/eft/common/tables/ITemplateItem";
import { ProfileHelper } from "@spt-aki/helpers/ProfileHelper";
import { BotEquipmentFilterService } from "@spt-aki/services/BotEquipmentFilterService";

let RandomUtil
let HashUtil


let botWeaponGenerator
let weightedRandomHelper 
let botGeneratorHelper
let configServer : ConfigServer;

let botGenerator
let BotInventoryGenerator
let botEquipmentFilterService
let itemHelper

let InventoryHelper
let ContainerHelper
let TimeUtil
let profileHelper
let botHelper
let HttpResponse
let BotController
let JsonUtil
let SaveServer
let VFS
let ModLoader

let Logger
let BotConfig
let TraderConfig

let EquipmentSlots

let setupHash 
let vDeb 

let properCaps 
let blacklistFile 
let vitalMods 
let optionalMods 

let database

let itemdb
let handbook
let locations
let botTypes
let modFolder
let genFolder
let cfgFolder
let profFolder
let orig
let origList : Record<any, any>
let baseAI 

let config 
let advSConfig 
let advIConfig 
let advAIConfig
let InRaidConfig 
let progDiff 
let debugHash 

let containerC

var fs = require('fs');


const disableMod = false //Purely for internal use, so I can stop having to take FAIT out of the folder every time I want to test something else.

const modName = "Fin-AITweaks"
const AKIPMC = "assaultGroup" //Easily change which bot is designated to be turned into PMCs
let PMCSwap = "assaultGroup" //Which bot behaviour PMCs will be assigned by default
const botNameSwaps = {
	"bear": "bear",
	"usec": "usec"
}

const locationNames = ["interchange", "bigmap", "rezervbase", "woods", "shoreline", "laboratory", "lighthouse", "factory4_day", "factory4_night"]
const locationNamesVerbose = ["interchange", "customs", "reserve", "woods", "shoreline", "labs", "lighthouse", "factory", "factory"]

class AITweaks implements IPreAkiLoadMod, IPostAkiLoadMod
{
	
	postAkiLoad(container)
	{
		if (disableMod)
			return
		AITweaks.setupInitialValues(container);
		
		Logger.info(`Loading: ${modName}`);
		
		for (let i in itemdb)
			origList[i] = true
				
		this.main()
		
		// this.dumpFAITAIFiles()
		//Debugging options:
		
		//Performs the functions FAIT normally does only after the game has begun. You should enable this if you're doing any debugging.
		false ? AITweaks.runOnGameStart() : null
		//Runs progressive gear without an attached profile. Pass the simulated level to the function.
		false ? AITweaks.testProgressiveGear(25) : null
		//Simulates bot generation. Options are, in order: Print weapon info, print armor info, print bot info, bots to generate per bot type
		false ? AITweaks.simulateBotGeneration(false, false, false, 1) : null
		//Displays a printout of all bot equipment slots in the server
		false ? AITweaks.printAllBotGear(null) : AITweaks.printAllBotGear(`doNotTouch/debug/zzSpawned_Bot_Inventories.json`)
					
		
		// console.log(config.stats)
		
		// AITweaks.destroy(orig)
		
		// console.log("")
		// console.log("")
		// Logger.log(`DEBUG HASH !!If you're asking for help with FAIT, please copy and paste this in to your help request, or you probably won't be helped!!:`,"white","red")
		// debugHash = AITweaks.generateDebugHash()
		//300 FIX THIS LATER
		// this.printDebug()
		// Logger.log(AITweaks.en(debugHash.toString()),"white","magenta")
		// Logger.log("===============================End Debug Hash===============================","white","red")
		//300 FIX THIS LATER
		//Logger.writeToLogFile(AITweaks.en(debugHash.toString()))
		Logger.info("Fin's AI Tweaks: Finished")
	}
	
	preAkiLoad(container: DependencyContainer): void
	{
		if (disableMod)
		{
			for (let i = 0; i < 10; i++)
			console.log("FAIT HAS BEEN FULLY DISABLED. DO NOT PUSH TO RELEASE WITHOUT CHANGING THIS!!!!!!!!!!")
			return
		}
		containerC = container
		const dynamicRouterModService = container.resolve<DynamicRouterModService>("DynamicRouterModService");
		const staticRouterModService = container.resolve<StaticRouterModService>("StaticRouterModService");
		
		//Bot generation
		staticRouterModService.registerStaticRouter(`StaticAkiBotGen${modName}`,[{url: "/client/game/bot/generate",
			action: (url, info, sessionId, output) =>{
				output = AITweaks.onBotGen(url, info, sessionId, output);
				return output
			}}],"aki");
		//Raid Saving (End of raid)
		staticRouterModService.registerStaticRouter(`StaticAkiRaidSave${modName}`,[{url: "/raid/profile/save",
			action: (url, info, sessionId, output) =>{
				AITweaks.onRaidSave(url, info, sessionId, output);
				return output
			}}],"aki");
		//Game start
		staticRouterModService.registerStaticRouter(`StaticAkiGameStart${modName}`,[{url: "/client/game/start",
			action: (url, info, sessionId, output) =>{
				AITweaks.runOnGameStart(url, info, sessionId, output);
				return output
		}}],"aki");
		//Local Loot
		dynamicRouterModService.registerDynamicRouter(`DynamicAkiLocalLoot${modName}`,[{url: "/client/location/getLocalloot",
			action: (url, info, sessionId, output) =>{
				AITweaks.onLocalLoot(url, info, sessionId, output);
				return output
		}}],"aki");
		
		//getModTplFromItemDb
			container.afterResolution("BotGeneratorHelper", (_t, result: BotGeneratorHelper) => 
			{
				result.getModTplFromItemDb = AITweaks.getModTplFromItemDb
			}, {frequency: "Always"});
		//generateModsForWeapon
			container.afterResolution("BotGeneratorHelper", (_t, result: BotGeneratorHelper) => 
			{
				result.generateModsForWeapon = AITweaks.generateModsForWeapon
			}, {frequency: "Always"});
		//fillCamora
			container.afterResolution("BotGeneratorHelper", (_t, result: BotGeneratorHelper) => 
			{
				result.fillCamora = AITweaks.fillCamora
			}, {frequency: "Always"});
		//getRandomisedMessage
			container.afterResolution("WebSocketServer", (_t, result: WebSocketServer) => 
			{
				result.getRandomisedMessage = AITweaks.getRandomisedMessage
			}, {frequency: "Always"});
		//weightedRandom
			container.afterResolution("WeightedRandomHelper", (_t, result: WeightedRandomHelper) => 
			{
				result.weightedRandom = AITweaks.weightedRandom
			}, {frequency: "Always"});
	}

	static setupInitialValues(container)
	{
		//var fs = require('fs');
		//var files = fs.readdirSync('../');
		//console.log(files)
		RandomUtil = container.resolve("RandomUtil")
		HashUtil = container.resolve("HashUtil")
		botGenerator = container.resolve("BotGenerator")
		BotInventoryGenerator = container.resolve("BotInventoryGenerator")
		botEquipmentFilterService = container.resolve("BotEquipmentFilterService")
		itemHelper = container.resolve("ItemHelper")
		
		botWeaponGenerator = container.resolve("BotWeaponGenerator")
		weightedRandomHelper = container.resolve("WeightedRandomHelper")
		
		botGeneratorHelper = container.resolve("BotGeneratorHelper")
		InventoryHelper = container.resolve("InventoryHelper")
		ContainerHelper = container.resolve("ContainerHelper")
		profileHelper = container.resolve("ProfileHelper")
		botHelper = container.resolve("BotHelper")
		HttpResponse = container.resolve("HttpResponseUtil")
		BotController = container.resolve("BotController")
		JsonUtil = container.resolve("JsonUtil")
		SaveServer = container.resolve("SaveServer")
		TimeUtil = container.resolve("TimeUtil")
		//Use to find mods. ModLoader.getModPath('modname')
		//ModLoader.getImportedModsNames() to get all mod names
		//Doesn't work anymore, figure out why!!!
		// ModLoader = container.resolve("InitialModLoader");
		VFS = container.resolve("VFS")
		
		configServer = container.resolve("ConfigServer");
		BotConfig = configServer.getConfig<IBotConfig>(ConfigTypes.BOT);
		InRaidConfig = configServer.getConfig<IInRaidConfig>(ConfigTypes.IN_RAID);
		TraderConfig = configServer.getConfig<ITraderConfig >(ConfigTypes.TRADER);
		
		// BotConfig = {
			// pmc: {
				// isUsec: 50,
				// chanceSameSideIsHostilePercent: 50,
				// usecType: 'usec',
				// bearType: 'bear',
				// maxBackpackLootTotalRub: 150000,
				// maxPocketLootTotalRub: 50000,
				// maxVestLootTotalRub: 50000,
				// types: { assault: 25, cursedAssault: 25, pmcBot: 25, exUsec: 10 }
			// }
			// }


		EquipmentSlots = {Headwear: "Headwear",Earpiece: "Earpiece",FaceCover: "FaceCover",ArmorVest: "ArmorVest",Eyewear: "Eyewear",ArmBand: "ArmBand",TacticalVest: "TacticalVest",Pockets: "Pockets",Backpack: "Backpack",SecuredContainer: "SecuredContainer",FirstPrimaryWeapon: "FirstPrimaryWeapon",SecondPrimaryWeapon: "SecondPrimaryWeapon",Holster: "Holster",Scabbard: "Scabbard"};

		//Big debug
		setupHash = "xxxxxx" //function getHashFromString(str, seed = 0){let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;for (let i = 0, ch; i < str.length; i++) {	ch = str.charCodeAt(i);	h1 = Math.imul(h1 ^ ch, 2654435761);	h2 = Math.imul(h2 ^ ch, 1597334677);}h1 = Math.imul(h1 ^ (h1>>>16), 2246822507) ^ Math.imul(h2 ^ (h2>>>13), 3266489909);h2 = Math.imul(h2 ^ (h2>>>16), 2246822507) ^ Math.imul(h1 ^ (h1>>>13), 3266489909);return 4294967296 * (2097151 & h2) + (h1>>>0);}(WishlistCallbacks.toString() + WishlistController.toString() + BotCallbacks.toString() + BotConfig.toString() + BotController.toString() + BotGenerator.toString() + BundleCallbacks.toString() + BundleLoader.toString() + ContainerHelper.toString() + CustomizationCallbacks.toString() + CustomizationController.toString() + DatabaseImporter.toString() + DatabaseServer.toString() + DataCallbacks.toString() + DialogueCallbacks.toString() + DialogueController.toString() + GameCallbacks.toString() + HandbookCallbacks.toString() + HandbookController.toString() + HashUtil.toString() + HealthCallbacks.toString() + HealthConfig.toString() + HealthController.toString() + HideoutCallbacks.toString() + HideoutConfig.toString() + HideoutController.toString() + HttpCallbacks.toString() + HttpConfig.toString() + HttpResponse.toString() + HttpRouter.toString() + HttpServer.toString() + ImageRouter.toString() + InraidCallbacks.toString() + InraidConfig.toString() + InraidController.toString() + InsuranceCallbacks.toString() + InsuranceConfig.toString() + InsuranceController.toString() + InventoryCallbacks.toString() + InventoryConfig.toString() + InventoryController.toString() + InventoryHelper.toString() + ItemEventCallbacks.toString() + ItemEventRouter.toString() + ItemHelper.toString() + JsonUtil.toString() + LauncherCallbacks.toString() + LauncherController.toString() + LocationCallbacks.toString() + LocationConfig.toString() + LocationController.toString() + LocationGenerator.toString() + Logger.toString() + MatchCallbacks.toString() + MatchConfig.toString() + MatchController.toString() + ModCallbacks.toString() + ModLoader.toString() + NoteCallbacks.toString() + NoteController.toString() + NotifierCallbacks.toString() + NotifierController.toString() + PaymentController.toString() + PlayerController.toString() + PresetBuildCallbacks.toString() + PresetBuildController.toString() + PresetCallbacks.toString() + PresetController.toString() + ProfileCallbacks.toString() + ProfileController.toString() + QuestCallbacks.toString() + QuestConfig.toString() + QuestController.toString() + QuestHelper.toString() + RagfairCallbacks.toString() + RagfairConfig.toString() + RagfairController.toString() + RagfairServer.toString() + RandomUtil.toString() + RepairCallbacks.toString() + RepairConfig.toString() + RepairController.toString() + SaveCallbacks.toString() + SaveServer.toString() + TimeUtil.toString() + TradeCallbacks.toString() + TradeController.toString() + TraderCallbacks.toString() + TraderConfig.toString() + TraderController.toString() + UtilityHelper.toString() + VFS.toString() + WeatherCallbacks.toString() + WeatherConfig.toString() + WeatherController.toString())
		vDeb = setupHash

		//Bot names can be made lowercase easily. This allows for the reverse, when necessary
		properCaps = {
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
		// properCaps[BotConfig.pmc.usecType] = BotConfig.pmc.usecType.toLowerCase()
		// properCaps[BotConfig.pmc.bearType] = BotConfig.pmc.bearType.toLowerCase()
		blacklistFile = []
		vitalMods = []
		optionalMods = []

		database = container.resolve("DatabaseServer")
		configServer = container.resolve("ConfigServer")
		database = database.getTables()
		itemdb = database.templates.items
		handbook = database.templates.handbook
		locations = database.locations
		botTypes = database.bots.types
		const fs = require('fs');
		let dir = __dirname;
		let dirArray = dir.split("\\");
		modFolder = (`${dirArray[dirArray.length - 4]}/${dirArray[dirArray.length - 3]}/${dirArray[dirArray.length - 2]}/`);
		genFolder = ((`${dirArray[dirArray.length - 6]}/${dirArray[dirArray.length - 5]}`))
		//To grab configs before mods alter them
		cfgFolder = ((`${dirArray[dirArray.length - 6]}/${dirArray[dirArray.length - 5]}/Aki_Data/Server/configs`))
		orig = {}
		origList = {}
		let directory = ""
		for (let index = 0; index < dirArray.length - 4; index++)
			directory += (dirArray[index] + "/")
		directory = directory.slice(0,-1)
		orig.items = JSON.parse(fs.readFileSync(`${directory}/Aki_Data/Server/database/templates/items.json`, 'utf8', (err, data) => {if (err) {console.error(err);return;}return data;}))
		orig.traders = AITweaks.readFolder(`${directory}/Aki_Data/Server/database/traders`)
		orig.bots = AITweaks.readFolder(`${directory}/Aki_Data/Server/database/bots/types`)
		profFolder = AITweaks.readFolder(`${directory}/user/profiles`)
		baseAI = AITweaks.clone(botTypes.pmcbot.difficulty.hard)

		config = require("../config/config.json")
		advSConfig = require("../config/advanced spawn config.json")
		advIConfig = require("../config/advanced inventory config.json")
		advAIConfig = require("../config/advanced AI config.json")
		progDiff = require("../donottouch/progress.json")

		Logger = container.resolve("WinstonLogger")
		containerC = container
	}
	
	static weightedRandom(items: string | any[], weights: string | any[]): { item: any; index: number; }
    {
        if (items.length !== weights.length)
        {
            throw new Error("Items and weights must be of the same size");
        }

        if (!items.length)
        {
            throw new Error("Items must not be empty");
        }

        // Preparing the cumulative weights array.
        // For example:
        // - weights = [1, 4, 3]
        // - cumulativeWeights = [1, 5, 8]
        const cumulativeWeights = [];
        for (let i = 0; i < weights.length; i += 1)
        {
            cumulativeWeights[i] = (weights[i] * 1) + (cumulativeWeights[i - 1] || 0);
        }

        // Getting the random number in a range of [0...sum(weights)]
        // For example:
        // - weights = [1, 4, 3]
        // - maxCumulativeWeight = 8
        // - range for the random number is [0...8]
        const maxCumulativeWeight = cumulativeWeights[cumulativeWeights.length - 1];
        const randomNumber = maxCumulativeWeight * Math.random();
		
        // Picking the random item based on its weight.
        // The items with higher weight will be picked more often.
        for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1)
        {
            if (cumulativeWeights[itemIndex] >= randomNumber)
            {
                return {
                    item: items[itemIndex],
                    index: itemIndex
                };
            }
        }
    }
	
	static readFolder(path)
	{
		let output = {}
		var fs = require('fs')
		let files = fs.readdirSync(path)
		for (let each of files)
			if (each.includes(".json"))
			{
				output[each.slice(0,-5)] = JSON.parse(fs.readFileSync(`${path}/${each}`, 'utf8', (err, data) => {if (err) {console.log(err);return;};return data;}))
			}
			else if (each.includes("."))
				output[each] = [null]
			else
			{
				output[each] = AITweaks.readFolder(`${path}/${each}`)
			}
		return output
	}
	
	//All functions that need to be run when the route "/raid/profile/save" is used should go in here, as config-reliant conditionals can't be used on the initial load function
	static onRaidSave(url, info, sessionId, output)
	{
		AITweaks.setupBots() //Moved this to raid end for testing and better compatibility
		if (config.sillyChanges.COD_mode == true && config.sillyChanges.COD_modeMaxHPPerLimb[0] != "=")
			AITweaks.giveCodModeItems(url, info, sessionId);
		if (config.miscChanges.enableProgressiveGear == true && !config.disableAllGearChanges)
			AITweaks.setProgressiveGear(url, info, sessionId, false, false);
		if (config.overallDifficultyMultipliers.enableAutomaticDifficulty)
			AITweaks.recordWinLoss(url, info, sessionId)
		delete database.globals.config.genVals
		AITweaks.cleanAllBotInventories(true, true) //This is redundant and should be condensed into one solution, but.. Scattershotting this for now, to make sure I get every instance of this problem.
		return output
	}
	
	//All functions that need to be run when the route "/client/location/getLocalloot" is used should go in here, as config-reliant conditionals can't be used on the initial load function
	static onLocalLoot(url, info, sessionId, output)
	{
		AITweaks.cleanAllBotInventories(true, true)
		AITweaks.thisIsProbablyAReallyBadIdea(url, info, sessionId)
		if (config.disableAllSpawnChanges == false)
		{BotConfig.pmc.convertIntoPmcChance = {};BotConfig.pmc.types = {}};
		AITweaks.printAllBotGear(`doNotTouch/debug/debugBots~~MasterInventory1.json`)
		return output
	}
	
	//All functions that need to be run when the route "/client/game/bot/generate" is used should go in here, as config-reliant conditionals can't be used on the initial load function
	static onBotGen(url, info, sessionId, output)
	{
		output = AITweaks.generateBots(url, info, sessionId, false, false, false, false, 0, output);
		return output
	}
	
	static makeItem(id, item)
	{
		if (!item._props.CreditsPrice)
			item._props.CreditsPrice = 100000
		itemdb[id] = JsonUtil.clone(item)
		database.templates.clientItems[id] = JsonUtil.clone(item)
	} 
	
	static clone(data) {
	return JSON.parse(JSON.stringify(data));
	}
	
	static testProgressiveGear(level)
	{
		console.log(level)
		AITweaks.setProgressiveGear(1,1,1,true, level)
	}
	
	static simulateBotGeneration(printWep, printArm, printBot, botCount)
	{
		let sesh = Object.keys(profFolder)[0]
		if (sesh == undefined)
		{
			console.log("No player profile found. Aborting bot generation simulation. (This is just a debug error, it shouldn't affect your game.)")
			return
		}
		AITweaks.generateBots(1,1,sesh,true,printWep, printArm, printBot, botCount, undefined)
	}
	
	static getRandomisedMessage(): string
	{
		debugHash = AITweaks.generateDebugHash()
		console.log("")
		Logger.logWithColor("=        DEBUG HASH!! If you're asking for help with FAIT, please copy and       =","yellow","blueBG")
		Logger.logWithColor("=     paste this in to your help request, or you probably won't be helped!!:     =","yellow","blueBG")
		Logger.logWithColor("                                                                                  ","blue","yellowBG")
		Logger.logWithColor("=============NOT=AN=ERROR=========End Debug Hash==========NOT=AN=ERROR============","blue","yellowBG")
		console.log("=                                                                                =")
		console.log(AITweaks.en(debugHash.toString()),"white","blueBG")
		console.log("=                                                                                =")
		Logger.logWithColor("=============NOT=AN=ERROR=========End Debug Hash==========NOT=AN=ERROR============","yellow","blueBG")
		Logger.logWithColor("                                                                                  ","blue","yellowBG")
		
		if (RandomUtil.getInt(1, 100)> 99)
		{
			const messages = ["live laugh love", "anime :( ", "if you can hear me, you need to wake up", "dont forget to like and subscribe", "have you seen our meme page?", "secret co-op mode enabled - thank you for subscribing on patreon", "you better not be using a fitgirl repack, i swear to god", "bingos binted", "its morbin time"];
			return messages[RandomUtil.getInt(0, messages.length - 1)];
		}
		else
			return `Happy playing!`;
	}
	
	/* static printDebug()
	{
		// if (this.randomUtil.getInt(1, 100)> 99)
		// {
			// const messages = ["live laugh love", "anime :( ", "if you can hear me, you need to wake up", "dont forget to like and subscribe", "have you seen our meme page?", "secret co-op mode enabled - thank you for subscribing on patreon", "you better not be using a fitgirl repack, i swear to god", "bingos binted", "its morbin time"];
			// return messages[this.randomUtil.getInt(0, messages.length - 1)];
		// }

		debugHash = AITweaks.generateDebugHash()
		
		return `Happy playing
		
		DEBUG HASH !!If you're asking for help with FAIT, please copy and paste this in to your help request, or you probably won't be helped!!:
		${AITweaks.en(debugHash.toString())}
		==========NOT=AN=ERROR=========End Debug Hash==========NOT=AN=ERROR=========`;
	} */
	
	static printAllBotGear(save)
	{
		let toFile = {}
		for (let bot in botTypes)
		{
			toFile[bot] = {}
			if (botTypes[bot].inventory && botTypes[bot].inventory.equipment)
			{
				let botClass = "unaltered"
				let botGearClass = "unaltered"
				for (let botCat in config.aiChanges.changeBots)
					if (config.aiChanges.changeBots[botCat].includes(bot))
						botClass = botCat
				for (let botCat in config.AIgearChanges)
					if (botCat.includes("Bots"))
						if (config.AIgearChanges[botCat].includes(bot))
							botGearClass = botCat
				save ? toFile[bot].SETTINGS = {"botClass": botClass, "botGearClass": botGearClass} : Logger.success(`Gear for bot ${bot}, ai category ${botClass}, gear category ${botGearClass}:`)
				for (let slot in botTypes[bot].inventory.equipment)
				{
					save ? null : console.log(`	${slot}:`)
					let output = {}
					for (let id in botTypes[bot].inventory.equipment[slot])
					{
						let name = database?.locales?.global?.en?.templates?.[id]?.ShortName.toString()
						if (!name)
							name = itemdb?.[id]?._name
						if (!name)
							continue
						if (itemdb[id]._props.armorClass && itemdb[id]._props.armorClass > 0)
							name = `class ${itemdb[id]._props.armorClass} - ${name}`
						output[name] = botTypes[bot].inventory.equipment[slot][id]
					}
					save ? toFile[bot][slot] = output : console.log(output)
				}
				save ? toFile[bot].Ammo = botTypes[bot].inventory.Ammo : console.log(botTypes[bot].inventory.Ammo)
			}
		}
		AITweaks.saveToFile(toFile, save)
	}
	
	static openZones()
	{
		let garbageLocs = ["ZoneBlock", "Post", "BotZoneMain", "BotZoneGate1", "BotZoneGate2"]
		for (let mapName in locations)
			if (locations[mapName].base)
			{
				let map = locations[mapName].base
				let loc = locations[mapName].base.OpenZones.split(",")
				let sniperLoc = []
				for (let each = 0; each < loc.length; each++)
					if (garbageLocs.includes(loc[each]))
					{
						loc.splice(each, 1)
						each--
					}
				for (let wave in map.backupBosses)
				{
					if (map.backupBosses[wave].BossZone == undefined)
						continue
					let zoneList = map.backupBosses[wave].BossZone.split(",")
					for (let each in zoneList)
						if (!loc.includes(zoneList[each]) && !garbageLocs.includes(zoneList[each]) && zoneList[each] != '')
							loc.push(zoneList[each])
				}
				for (let wave in map.backupWaves)
				{
					if (!map.backupWaves[wave].SpawnPoints)
						continue
					let zoneList = map.backupWaves[wave].SpawnPoints.split(",")
					if (map.backupWaves[wave].WildSpawnType == "marksman") //Put sniper zones in their own list
					{
						for (let each in zoneList)
							if (!sniperLoc.includes(zoneList[each]) && !garbageLocs.includes(zoneList[each]) && zoneList[each] != '')
								sniperLoc.push(zoneList[each])
					}
					else
						for (let each in zoneList)
							if (!loc.includes(zoneList[each]) && !garbageLocs.includes(zoneList[each]) && !sniperLoc.includes(zoneList[each]) && zoneList[each] != '')
								loc.push(zoneList[each])
				}
				for (let zone in sniperLoc)
					if (loc.includes(sniperLoc[zone]))
						loc.splice(loc.findIndex(i => i == sniperLoc[zone]), 1)
				map.FinsOpenZones = loc
				map.FinsOpenSniperZones = sniperLoc
				map.OpenZones = (InRaidConfig.save.loot) ? loc.toString() + "," + sniperLoc.toString() : ""
			}
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

	//This function is used when the value will vary by bot difficulty. Values can theoretically be infinitely low or infinitely high
	//value is an array of all possible values
	static changeStat(type, value, difficulty, botCat, multiplier?)
	{
		if (config.printDifficultyInfo)
		{
			database.globals.config.FAITDiff[type] = value
		}
		if (multiplier == undefined)
			multiplier = 1
		let setValue
		let debug = undefined
		if (value.length == 1)
		{
			if (typeof(value[0]) == "number")
				botCat[type] = value[0] * multiplier
			else
				botCat[type] = value[0]
			if (debug)
				console.log(`${type} = ${botCat[type]}`)
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
			
			if (debug)
			{
				console.log(value[0])
				console.log(value[Math.round(value.length * 0.1)])
				console.log(value[Math.round(value.length * 0.2)])
				console.log(value[Math.round(value.length * 0.3)])
				console.log(value[Math.round(value.length * 0.4)])
				console.log(value[Math.round(value.length * 0.5)])
				console.log(value[Math.round(value.length * 0.6)])
				console.log(value[Math.round(value.length * 0.7)])
				console.log(value[Math.round(value.length * 0.8)])
				console.log(value[Math.round(value.length * 0.9)])
				console.log(value[Math.round(value.length * 1) - 1])
				console.log(`
			difficulty: ${difficulty}
			numValues: ${numValues}`)
			}
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
		if (debug)
			console.log(`${type} = ${setValue}`)
	}

	static noTalking(botList, easy, normal, hard, impossible)
	{
		for (let i in botList)
		{
			let botName = botList[i].toLowerCase()
			//Verify each bot exists. This should probably be changed so that this type of check occurs once on first loading.
			//Someday
			//Check the .toLowerCase() for now. If there's ever a bot file with a name that isn't all lowercase this will need adjusting
			if (!botTypes[botName] || !botTypes[botName].difficulty || !botTypes[botName].difficulty.easy || !botTypes[botName].difficulty.normal || !botTypes[botName].difficulty.hard || !botTypes[botName].difficulty.impossible)
			{
				if (botName.length > 0)
					Logger.error(`Bot with name ${botName} does not exist, or is missing at least one difficulty entry.
	This error must be fixed, or you'll likely experience errors. Check your AI category entries in the config and make sure they're all valid bot types.`)
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
	
	dumpFAITAIFiles()
	{
		let excludedSettings = ["WARN_BOT_TYPES","ENEMY_BOT_TYPES","FRIENDLY_BOT_TYPES","REVENGE_BOT_TYPES","REVENGE_FOR_SAVAGE_PLAYERS","DEFAULT_ENEMY_USEC","DEFAULT_SAVAGE_BEHAVIOUR","DEFAULT_BEAR_BEHAVIOUR","DEFAULT_USEC_BEHAVIOUR"]
		let testAI = JsonUtil.clone(botTypes.pmcbot.difficulty.normal)
		let diffFile = {}
		for (let i = 0; i < 20; i++)
		{
			AITweaks.changeAI(null, testAI, i, null, "nope")
			for (let cat in testAI)
			{
				diffFile[cat] == undefined ? diffFile[cat] = {} : null
				for (let setting in testAI[cat])
					diffFile[cat][setting] == undefined ? diffFile[cat][setting] = [testAI[cat][setting]] : diffFile[cat][setting].push(testAI[cat][setting])
			}
		}
		for (let cat in diffFile)
			for (let setting in diffFile[cat])
			{
				while(this.compareRightHandSettingRatios(diffFile[cat][setting]) && diffFile[cat][setting].length > 2)
					diffFile[cat][setting].splice(diffFile[cat][setting].length - 1, 1)
				if (diffFile[cat][setting].length == 2 && diffFile[cat][setting][0] == diffFile[cat][setting][1])
					diffFile[cat][setting].splice(1,1)
			}
		for (let cat in diffFile)
		{
			// console.log(diffFile["Aiming"]["SHOOT_TO_CHANGE_PRIORITY"])
		// console.log(testAI["Aiming"]["SHOOT_TO_CHANGE_PRIORITY"])
		// console.log(botTypes.pmcbot.difficulty.normal["Aiming"]["SHOOT_TO_CHANGE_PRIORITY"])
			for (let setting in diffFile[cat])
			{
				for (let value in diffFile[cat][setting])
					diffFile[cat][setting][value] = AITweaks.roundNumber(diffFile[cat][setting][value])
				if (excludedSettings.includes(setting))
					delete diffFile[cat][setting]
				else if (diffFile[cat][setting].length == 1 && diffFile[cat][setting][0] == botTypes.pmcbot.difficulty.normal[cat][setting])
				{
					// console.log(setting)
					delete diffFile[cat][setting]
				}
			}
		}
		
		AITweaks.saveToFile(diffFile, `doNotTouch/~~FAIL_Difficulty_Settings.json`)
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
	
	compareRightHandSettingRatios(setting)
	{
		if (typeof(setting[0]) == "number")
		{
			if (setting[setting.length - 1] == setting[setting.length - 2])
			{
				if (setting[setting.length - 1] != setting[setting.length - 3])
					return false
				else
					return true
			}
			let rightMostRatio = setting[setting.length - 1] / setting[setting.length - 2]
			let nextRatio = setting[setting.length - 2] / setting[setting.length - 3]
			if (rightMostRatio - nextRatio < rightMostRatio * 0.05)
				return true
		}
		else
			if (setting[setting.length - 1] == setting[setting.length - 2])
				return true
		return false
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
		
		switch (botName){
			case "bosskojaniy":
				
				break
			case "bosssanitar":
				
				break
			case "bosskilla":
				
				break
			case "bossbully":
				
				break
			case "bossgluhar":
				
				break
			case "bosstagilla":
				
				break
		}
		//Currently unused. Someday this will be implemented as a new, more modular way of setting the AI's difficulty. It creates a single object that can be used to reference all difficulty settings, which would allow for this section to be defined in an external .json file, making it easy to swap in and out for different 'styles' of difficulty scaling. Most likely I won't implement this until shortly before I stop maintaining this mod, because it doesn't have much use outside of that.
		//let aiSettings = {"Lay":{"ATTACK_LAY_CHANCE": [[5],1]},"Aiming":{//This variable is stupid and I hate it. Lower seems better: but it might rely heavily on other variables?];"MAX_AIM_PRECICING": [[2.1,2.1,2,1.9,1.8,1.7,1.6],1],"BETTER_PRECICING_COEF": [[0.7,0.75,0.8,0.85,0.9,1],1.55],"COEF_FROM_COVER": [[0.9],1], //Lower seems better]//Setting HARD_AIM to 100 made bots hilariously inaccurate. Smaller is better. Probably.];"HARD_AIM": [[0.4,0.35,0.325,0.3,0.275,0.25,0.225],1],"HARD_AIM": [[0.75],1],"CAN_HARD_AIM": [[false],1],//Max aiming upgrade by X many seconds? Unsure.]//Seems to be the above: but it's.. Weird. Even at very high settings the AI *can* still land hits: it's just less likely.];"MAX_AIMING_UPGRADE_BY_TIME": [[1.5,1.5,1.35,1.15,1,0.85,0.7],3.5],"DAMAGE_TO_DISCARD_AIM_0_100": [[86],1],"SCATTERING_HAVE_DAMAGE_COEF": [[1],1],"DANGER_UP_POINT": [[1.3],1], //test this];"MIN_TIME_DISCARD_AIM_SEC": [[1.5,2,2.5,3],1],"MAX_TIME_DISCARD_AIM_SEC": [[3.5,4.5,5.5,6.5],1],		;"XZ_COEF": [[0.48,0.475,0.45,0.4,0.35,0.3,0.25,0.2],1],//When BOTTOM_COEF is high: the AI just doesn't shoot?];"BOTTOM_COEF": [[0.6,0.5,0.4],1],"BOTTOM_COEF": [[0.6],1],"FIRST_CONTACT_ADD_SEC": [[1,0.75,0.5,0.4,0.3,0.3],1],"FIRST_CONTACT_ADD_SEC": [[0.3],1],"FIRST_CONTACT_ADD_CHANCE_100": [[75,65,55,40,50,35],1],"BASE_HIT_AFFECTION_DELAY_SEC": [[0.57],1],"BASE_HIT_AFFECTION_MIN_ANG": [[4.0],1],"BASE_HIT_AFFECTION_MAX_ANG": [[9.0],1],//What does SHIEF stand for? What is this number doing?]//Apparently higher is worse. Good to know.];"BASE_SHIEF": [[0.7,0.6,0.5,0.4,0.35,0.3,0.25,0.22,0.2,0.2],2],"SCATTERING_DIST_MODIF": [[0.5,0.475,0.45,0.425,0.4,0.375],1],"SCATTERING_DIST_MODIF_CLOSE": [[0.39,0.385,0.380,0.375,0.35,0.325],0.4 * ((Math.sqrt(Math.pow(config.overallDifficultyMultipliers.aiShotSpreadMult,2)) / 2) * (config.overallDifficultyMultipliers.aiShotSpreadMult / (Math.sqrt(Math.pow(config.overallDifficultyMultipliers.aiShotSpreadMult,2)))))],"SCATTERING_DIST_MODIF": [[0.4],0.9 * config.overallDifficultyMultipliers.aiShotSpreadMult],"SHPERE_FRIENDY_FIRE_SIZE": [[0.1],1],"COEF_IF_MOVE": [[1.4,1.3,1.2,1.1,1,1],1],"TIME_COEF_IF_MOVE": [[2],1],"BOT_MOVE_IF_DELTA": [[0.01],1],"ANY_PART_SHOOT_TIME": [[30],1],//Is this what makes them turn their flashlights on to blind you?;"ANYTIME_LIGHT_WHEN_AIM_100": [[35,45,55,65,75,85],1],//AI reaction time, more or less;"MAX_AIM_TIME": [[1.1,1,0.95,0.92,0.89,0.87,0.85,0.8,0.7,0.6,0.5,0.4],1],"WEAPON_ROOT_OFFSET": [[0.35],1],"Y_TOP_OFFSET_COEF": [[0.001],1],"Y_BOTTOM_OFFSET_COEF": [[0.015],1],"ENEMY_Y_WEAPON_OFFSET": [[0.08],1],"XZ_COEF_STATIONARY_GRENADE": [[0.2],1],//Unsure of exactly what these do: but it makes the 'shoot to the left' issue a little less awful if they're high?]//Alright. So apparently this ties into BAD_SHOOTS. BAD_SHOOTS cannot happen inside the no offset range];"DIST_TO_SHOOT_NO_OFFSET": [[3],1],"DIST_TO_SHOOT_TO_CENTER": [[3],1],"BAD_SHOOTS_MIN": [[0],1],"BAD_SHOOTS_MAX": [[0],1],"BAD_SHOOTS_OFFSET": [[2],1],"BAD_SHOOTS_MAIN_COEF": [[0.25],1],"MIN_DAMAGE_TO_GET_HIT_AFFETS": [[10,15,20,25,35,50],1],"PANIC_TIME": [[2,1.5,1,0.6,0.3,0.1,0.1],1],"DAMAGE_PANIC_TIME": [[12,9,6,4,2,1],1]},		;"Look":{"ONLY_BODY": [[false],1],"FAR_DISTANCE": [[75,90,105],1],"MIDDLE_DIST": [[35,50,65],1],"FarDeltaTimeSec": [[4.7,4.1,3.5,3,2.4,1.8,1.5,1.2,1,1],1],"MiddleDeltaTimeSec": [[2,1.8,1.6,1.4,1.2,1,0.8,0.6,0.4,0.4],1],"CloseDeltaTimeSec": [[1.2,1.1,1,0.8,0.6,0.4,0.2,0.1,0.01,0.01],1],//Could it be related to when an AI can't see you anymore?];"GOAL_TO_FULL_DISSAPEAR": [[2],1],//1.1];"GOAL_TO_FULL_DISSAPEAR_SHOOT": [[0.09],1],"CAN_LOOK_TO_WALL": [[false],1]},"Shoot":{//Test this one. Appears on cultists. Cultist default is 0.3];"FINGER_HOLD_STATIONARY_GRENADE": [[0.01],1],"RECOIL_TIME_NORMALIZE":[[0.36,0.33,0.3,0.27,0.24,0.21,0.19],1],"RECOIL_TIME_NORMALIZE": [[0.12],1 * config.overallDifficultyMultipliers.aiRecoilMult],"RECOIL_PER_METER": [[0.09],1.4 * config.overallDifficultyMultipliers.aiRecoilMult],"MAX_RECOIL_PER_METER": [[0.1],1.6 * config.overallDifficultyMultipliers.aiRecoilMult],"HORIZONT_RECOIL_COEF": [[1.6],1],"WAIT_NEXT_SINGLE_SHOT": [[0.1],1 * config.overallDifficultyMultipliers.semiAutoFireRateMult],"WAIT_NEXT_SINGLE_SHOT_LONG_MAX": [[2.3,1.8,1.3,0.9,0.75,0.5],1 * config.overallDifficultyMultipliers.semiAutoFireRateMult],"WAIT_NEXT_SINGLE_SHOT_LONG_MIN": [[2.3,1.8,1.3,0.9,0.75,0.5],0.25 * config.overallDifficultyMultipliers.semiAutoFireRateMult],"BASE_AUTOMATIC_TIME": [[0.2,0.5,0.8,0.9,1,1.1,1.2,1.2],1],"CHANCE_TO_CHANGE_TO_AUTOMATIC_FIRE_100": [[65,75,80,85,90,95,100,100],1],"FAR_DIST_ENEMY": [[25.0],1],//"MAX_DIST_COEF": [[1];"CAN_SHOOTS_TIME_TO_AMBUSH": [[0],1],"LOW_DIST_TO_CHANGE_WEAPON": [[5.0],1],"FAR_DIST_TO_CHANGE_WEAPON": [[30.0],1],"AUTOMATIC_FIRE_SCATTERING_COEF": [[1.8],1],"SHOOT_FROM_COVER": [[5],1],"MAX_DIST_COEF": [[1.2],1]},"Grenade":{"CHANCE_TO_NOTIFY_ENEMY_GR_100": [[100.0],1],"MIN_DIST_NOT_TO_THROW": [[8],1],"MIN_THROW_GRENADE_DIST": [[12,11,10,9,8,8],1],"MAX_THROW_POWER": [[15,18,21],1 * config.overallDifficultyMultipliers.grenadeThrowRangeMult],"GrenadePrecision": [[0.3,0.2,0.15,0.1,0.075,0.05],1 * config.overallDifficultyMultipliers.grenadePrecisionMult],//"RUN_AWAY": [[22]//"ADD_GRENADE_AS_DANGER": [[65];"CHANCE_RUN_FLASHED_100": [[40,50,60,70,80,90],1]},			;"Cover":{// "STATIONARY_WEAPON_MAX_DIST_TO_USE": [[0];"MOVE_TO_COVER_WHEN_TARGET": [[false],1],"CHECK_COVER_ENEMY_LOOK": [[false],1],"REWORK_NOT_TO_SHOOT": [[false],1],"DELETE_POINTS_BEHIND_ENEMIES": [[true],1],"SHOOT_NEAR_TO_LEAVE": [[3],1],"CHECK_CLOSEST_FRIEND": [[true],1],"MIN_TO_ENEMY_TO_BE_NOT_SAFE": [[15.0],1],"CAN_LOOK_OUT_WHEN_HOLDING": [[true],1],"MIN_DEFENCE_LEVEL": [[3],1],"MIN_DIST_TO_ENEMY": [[5],1],"DELTA_SEEN_FROM_COVE_LAST_POS": [[6],1],"RETURN_TO_ATTACK_AFTER_AMBUSH_MIN": [[5],1],"RETURN_TO_ATTACK_AFTER_AMBUSH_MAX": [[10],1]},;"Patrol":{"CHANGE_WAY_TIME": [[15.1],1],"LOOK_TIME_BASE": [[5],1],"CHANCE_TO_CHANGE_WAY_0_100": [[70],1],//30.0];"RESERVE_OUT_TIME": [[5.0],1],"RESERVE_TIME_STAY": [[5.0],1],"VISION_DIST_COEF_PEACE": [[0.5],1],"FRIEND_SEARCH_SEC": [[60],1]},;"Hearing":{"LOOK_ONLY_DANGER": [[false],1],"CHANCE_TO_HEAR_SIMPLE_SOUND_0_1": [[1],1]},;"Mind":{"TIME_LEAVE_MAP": [[undefined],1],//50 //Might be the time they disappear: like cultists?]//The game really doesn't like when Min or Max SHOOTS_TIME is anything but an integer. Unsure why.];"CAN_THROW_REQUESTS": [[true],1],"ENEMY_LOOK_AT_ME_ANG": [[10],1],//Seems to have nothing to do with talking?]//..Or does it?];"TALK_WITH_QUERY": [[true],1],"MIN_SHOOTS_TIME": [[0,0,0,0,0,0],1],"MAX_SHOOTS_TIME": [[0,0,0,0,0,0],1],"MIN_START_AGGRESION_COEF": [[1],1], //Unsure of what these do. Defaults are 1 and 3.];"MAX_START_AGGRESION_COEF": [[3],1],//Is this the chance they flip you off? Test this.]//This is the chance they flip you off.];"CHANCE_FUCK_YOU_ON_CONTACT_100": [[0],1],"CAN_STAND_BY": [[true],1],"DANGER_EXPIRE_TIME_MIN": [[0.4],1],"DANGER_EXPIRE_TIME_MAX": [[1.2],1],"PANIC_RUN_WEIGHT": [[20.0],1],"PANIC_SIT_WEIGHT": [[1.0],1],"PANIC_LAY_WEIGHT": [[1.0],1],"PANIC_NONE_WEIGHT": [[40.0],1],"PANIC_SIT_WEIGHT_PEACE": [[60.0],1],// "CAN_USE_LONG_COVER_POINTS": [[true],1],"CAN_EXECUTE_REQUESTS": [[true],1],"DIST_TO_ENEMY_SPOTTED_ON_HIT": [[20.0],1],"MIN_DAMAGE_SCARE": [[200,300,400,500,600,700],1],"WILL_PERSUE_AXEMAN": [[false],1],"CHANCE_SHOOT_WHEN_WARN_PLAYER_100": [[100.0],1],//Test this. I assume it means "Heal below this percent": but who knows: it could be flipped around.]//It does seem to be "Heal below this percent". Good.];"PART_PERCENT_TO_HEAL": [[0.70,0.75,0.80,0.85,0.90,0.95],1],"ATTACK_IMMEDIATLY_CHANCE_0_100": [[35,45,55,65,75,80,80],1],//"AI_POWER_COEF *= 2];"DOG_FIGHT_OUT": [[6],1],"DOG_FIGHT_IN": [[5],1],// "SHOOT_INSTEAD_DOG_FIGHT": [[9],1],"NO_RUN_AWAY_FOR_SAFE": [[true],1],"MAX_AGGRO_BOT_DIST": [[100,105,110],1],"TIME_TO_FIND_ENEMY": [[60],1],"CHANCE_TO_RUN_CAUSE_DAMAGE_0_100": [[70,60,50,40,30,25],1],"TIME_TO_FORGOR_ABOUT_ENEMY_SEC": [[102],1]},"Boss":{"TAGILLA_CLOSE_ATTACK_DIST": [[5],1],"TAGILLA_LARGE_ATTACK_DIST": [[9],1],"TAGILLA_FORCED_CLOSE_ATTACK_DIST": [[3],1],"TAGILLA_TIME_TO_PURSUIT_WITHOUT_HITS": [[3],1]},"Core":{"VisibleAngle": [[120,150,180,210,240,270],1 * config.overallDifficultyMultipliers.visibleAngleMult],//Some evidence suggests that visible angle is actually double what it should be ingame for some bots, and that super-high values cause errors?];"VisibleDistance": [[115,125,135,145,155,165],1],//Making this high can have a dramatic impact on the AI's spotting time: making them take longer to see you. -However: making it super low does not bring the spotting time down to zero.];"GainSightCoef": [[0.15],1],"ScatteringPerMeter": [[0.15,0.1,0.085,0.06,0.045,0.03],1 * config.overallDifficultyMultipliers.aiShotSpreadMult],"ScatteringClosePerMeter": [[0.21,0.18,0.15,0.12,0.9,0.6],1.3 * config.overallDifficultyMultipliers.aiShotSpreadMult],"DamageCoeff": [[1.0],1],//Set hearing to 10. Seemed to make bots enter 'ambush' mode extremely often: and rarely fought eachother. Suspect they heard movement from massive distance away: got caught in a loop. One moves: spooks the other: other moves into cover: first one hears it: also moves into cover. Forever.//Not sure though.;"HearingSense": [[1.5,2.0,2.5,3.9,4.5,5.2],1],//Check config entry for this one;"CanGrenade": [[config.overallDifficultyMultipliers.allowGrenades],1],//Are there other aiming types? Other bots all seem to use 'normal'.//Apparently the options are "normal" or "regular". Cool.;"AimingType": [["normal"],1],"AccuratySpeed": [[0.32,0.3,0.28,0.26,0.24,0.22],1],"WaitInCoverBetweenShotsSec": [[0.2],1]},			;"Scattering":{"MinScatter": [[1,0.8,0.7,0.6,0.5,0.35,0.2,0.1,0.09,0.08],2.8 * config.overallDifficultyMultipliers.aiShotSpreadMult],"WorkingScatter": [[1,0.8,0.7,0.6,0.5,0.4,0.3,0.2],2.5 * config.overallDifficultyMultipliers.aiShotSpreadMult],"MaxScatter": [[3,2.5,2,1.5,1.2,1,0.9,0.8,0.7,0.6,0.5],0.9 * config.overallDifficultyMultipliers.aiShotSpreadMult],"SpeedUp": [[0.3],1],"SpeedUpAim": [[1.4],1],"SpeedDown": [[-0.3],1],"ToSlowBotSpeed": [[1.5],1],"ToLowBotSpeed": [[2.4],1],"ToUpBotSpeed": [[3.6],1],"MovingSlowCoef": [[1.5],1],"ToLowBotAngularSpeed": [[80],1],"ToStopBotAngularSpeed": [[40],1],"FromShot": [[0.01],1], //Is this aimpunch? Doesn't seem to be];"Caution": [[0.3],1],"HandDamageAccuracySpeed": [[1.3],1],"TracerCoef": [[1],1],"HandDamageScatteringMinMax": [[0.7],1],"RecoilControlCoefShootDone": [[0.0003],1],"RecoilControlCoefShootDoneAuto": [[0.00009],0.1],		;"DIST_FROM_OLD_POINT_TO_NOT_AIM": [[15],1],"RecoilYCoef": [[0.0005],1],"RecoilYCoefSppedDown": [[-0.52],1],"RecoilYMax": [[0.5],1]}}	;for (let category in aiSettings);for (let setting in aiSettings[category]);AITweaks.changeStat(setting, aiSettings[category][setting][0], aiSettings[category][setting][1], difficulty, botDiff[category]);//Squares and square roots;botDiff.Shoot.FAR_DIST_ENEMY_SQR = botDiff.Shoot.FAR_DIST_ENEMY * botDiff.Shoot.FAR_DIST_ENEMY;botDiff.Grenade.MIN_DIST_NOT_TO_THROW_SQR = botDiff.Grenade.MIN_DIST_NOT_TO_THROW * botDiff.Grenade.MIN_DIST_NOT_TO_THROW;botDiff.Grenade.MIN_THROW_GRENADE_DIST_SQRT = botDiff.Grenade.MIN_THROW_GRENADE_DIST * botDiff.Grenade.MIN_THROW_GRENADE_DIST //This looks like it should be a square root: but default values are the square of MIN_THROW_GRENADE_DIST??;botDiff.Grenade.RUN_AWAY_SQR = botDiff.Grenade.RUN_AWAY * botDiff.Grenade.RUN_AWAY;botDiff.Grenade.ADD_GRENADE_AS_DANGER_SQR = botDiff.Grenade.ADD_GRENADE_AS_DANGER * botDiff.Grenade.ADD_GRENADE_AS_DANGER;botDiff.Mind.MAX_AGGRO_BOT_DIST_SQR = botDiff.Mind.MAX_AGGRO_BOT_DIST * botDiff.Mind.MAX_AGGRO_BOT_DIST;botDiff.Scattering.DIST_FROM_OLD_POINT_TO_NOT_AIM_SQRT = Math.sqrt(botDiff.Scattering.DIST_FROM_OLD_POINT_TO_NOT_AIM)//Config modifiers;if (config.overallDifficultyMultipliers.allowAimAtHead == false);botDiff.Aiming.AIMING_TYPE = 5;botDiff.Grenade.MAX_THROW_POWER > config.overallDifficultyMultipliers.grenadeThrowRangeMax ? botDiff.Grenade.MAX_THROW_POWER = config.overallDifficultyMultipliers.grenadeThrowRangeMax : null;config.overallDifficultyMultipliers.visibleAngleMax > 360 ? config.overallDifficultyMultipliers.visibleAngleMax = 360 : null;botDiff.Core.VisibleAngle * config.overallDifficultyMultipliers.visibleAngleMult > config.overallDifficultyMultipliers.visibleAngleMax ? botDiff.Core.VisibleAngle = config.overallDifficultyMultipliers.visibleAngleMax : botDiff.Core.VisibleAngle *= config.overallDifficultyMultipliers.visibleAngleMult
		//Just in case stuff:]
		/* if ("MinScatter > "WorkingScatter)
			"WorkingScatter": [["MinScatter]
		if ("WorkingScatter > "MaxScatter)
			"WorkingScatter": [["MaxScatter]
		if ("MinScatter > "MaxScatter)
			"MinScatter": [["MaxScatter] */
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
	
	static getRandomValueFromWeightedObject(object)
	{
		let range = 0
		let array = []
		for (let each in object)
		{
			array.push([range, range + object[each], each])
			range += object[each]
		}
		let randFl = RandomUtil.getFloat(0, range)
		return array[array.findIndex(i => randFl >= i[0] && randFl < i[1])][2]
	}
	
	changeOverallDifficulty(accuracyCoef, scatteringCoef, gainSightCoef, marksmanCoef, visibleDistCoef)
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
	
	//Increase the minimum wave size of all elligible waves by 1
	static increaseMinBotSpawns(extraScavs, map)
	{
		let elligibleBots = ["assault"]
		if (map != "base")
		{
			let baseMapFile = locations[map].base
			for (let waveNum in baseMapFile.waves)
			{
				if (!elligibleBots.includes(baseMapFile.waves[waveNum].WildSpawnType))
					continue
				if (extraScavs > 0) //Add scavs
				{
					for (let i = 0; i < extraScavs; i++)
					{
						if (baseMapFile.waves[waveNum].slots_max <= 0)
						{
							//Don't touch waves with a max of 0, because yeah. Reasons. Labs-related reasons.
						}
						else if (baseMapFile.waves[waveNum].slots_min < baseMapFile.waves[waveNum].slots_max)
						{
							baseMapFile.waves[waveNum].slots_min += 1
						}
						else
						{
							baseMapFile.waves[waveNum].slots_max += 1
							baseMapFile.waves[waveNum].slots_min += 1
						}
					}
				}
				else //Subtract scavs
				{
					for (let i = 0; i < extraScavs; i++)
					{
						if (baseMapFile.waves[waveNum].slots_min > 1 && baseMapFile.waves[waveNum].slots_min <= baseMapFile.waves[waveNum].slots_max)
						{
							baseMapFile.waves[waveNum].slots_max -= 1
							baseMapFile.waves[waveNum].slots_min -= 1
						}
						else if (baseMapFile.waves[waveNum].slots_max > 1)
						{
							baseMapFile.waves[waveNum].slots_max -= 1
						}
					}
				}
			}
		}
	}
	
	//Mostly just cosmetic, but potentially useful for identifying bugs, and may become more useful in the future if more AI types become able to change their difficulty settings
	static switchDiffs(allmaps, map?)
	{
		if (allmaps) //Lazy mode activate
		{
			for (let i in locations)
				if (locations[i].base && locations[i].base.waves)
					AITweaks.switchDiffs(false, i)
			return
		}
		//Automatic difficulty assignments by bot type
		for (let waveNum in locations[map].base.waves)
		{
			let wave = locations[map].base.waves[waveNum]
			if (config.aiChanges.changeBots.lowLevelAIs.includes(wave.WildSpawnType))
				wave.BotPreset = "easy"
			else if (config.aiChanges.changeBots.midLevelAIs.includes(wave.WildSpawnType))
				wave.BotPreset = "hard"
			else if (config.aiChanges.changeBots.highLevelAIs.includes(wave.WildSpawnType))
				wave.BotPreset = "impossible"
			else
				wave.BotPreset = "hard"
			
			wave.BotPreset = "easy"
		}
	}
	
	static addSpawn(map, waveNum, timeLow, timeHigh, numLow, numHigh, type, loc, difficulty, mapName, waveChance, asBoss)
	{
		//An attempt was made. Do not repeat.
		/* for (let botName in botTypes)
			if (botName.toLowerCase() == type.toLowerCase())
			{type = botName; break}
			else if (botName == Object.keys(botTypes)[Object.keys(botTypes).length - 1])
			{Logger.error(`Error adding bot type ${type} to spawn list. Invalid bot name.`);break} */
		//console.log(`${map}, ${waveNum}, ${timeLow}, ${timeHigh}, ${numLow}, ${numHigh}, ${type}, ${loc}, ${difficulty}, ${mapName}, ${waveChance}`)
		if (difficulty == undefined)
			difficulty = "normal"
		//Automatic difficulty assignments by bot type
		if (config.aiChanges.changeBots.lowLevelAIs.includes(type))
			difficulty = "easy"
		else if (config.aiChanges.changeBots.midLevelAIs.includes(type))
			difficulty = "hard"
		else if (config.aiChanges.changeBots.highLevelAIs.includes(type))
			difficulty = "impossible"
		else
			difficulty = "normal"
		timeLow = Math.round(timeLow / 1.6)
		timeHigh = Math.round(timeHigh / 1.6)
		//Locations grabbed from AKI files. I can't remember which one. Want to say ext-additions/src/controller?
		let specificLoc
		if (advSConfig.enable_this_config == false)
		{
			let loc = map.FinsOpenZones
			
			let sniperLoc = map.FinsOpenSniperZones
			if (true)
				specificLoc = loc[RandomUtil.getInt(0, loc.length - 1)]
		}
		else
			specificLoc = loc
		if (type == "sectantWarrior" || type == "sectantPriest" || asBoss)
		{
			let bossType
			let spawnTime
			spawnTime = RandomUtil.getInt(timeLow, timeHigh)
			if (type == "sectantWarrior" || type == "sectantPriest")
			{
				bossType = "sectantPriest"
				spawnTime = -1
				difficulty = "normal"
			}
			else
			{
				bossType = type
			}
			//Thanks to kaizersxz for pointing me to the	server > ext-addition > src > config.json file. That led me to finding out that the game spawns PMCs like little squads of bosses, and *that's* how they get them to be in same-faction groups, and sticking around eachother.
			//They don't seem to roam much, though. -Bosses have values that suggest they can still patrol, though? Check that out sometime.
			
			if (numLow <= 1)
				numLow = 1
			if (numHigh <= 1)
				numHigh = 1
			
			let assaultNum = RandomUtil.getInt(numLow - 1, numHigh - 1)
			
			let waveValue = {
				"BossName": bossType,
				"BossChance": waveChance,
				"BossZone": specificLoc,
				"BossPlayer": false,
				"BossDifficult": difficulty,
				"BossEscortType": type,
				"BossEscortDifficult": difficulty,
				"BossEscortAmount": assaultNum.toString(),
				"Time": spawnTime
			}
			if (mapName == "laboratory")
			{
				waveValue = Object.assign(waveValue, {
					"TriggerId": "",
					"TriggerName": "",
					"Delay": 0
				});
			}
			map.BossLocationSpawn.push(waveValue)
		}
		//The above spawn method doesn't like to work with raiders, for some reason. Or scavs.
		else if (waveChance == 100 || RandomUtil.getInt(0, 99) < waveChance)
		{
			{
				map.waves[waveNum] = {"number": waveNum,
				"time_min": timeLow,
				"time_max": timeHigh,
				"slots_min": numLow,
				"slots_max": numHigh,
				"SpawnPoints": specificLoc,
				"BotSide": "Savage",
				"BotPreset": difficulty,
				"WildSpawnType": type,
				"isPlayers": false}
			}
		//I don't know for sure if the number of a wave matters, but... -This makes sure there aren't duplicates
		//It seems like the number does not matter, after all.
		waveNum = waveNum + 1;
		}
		return(waveNum)
	}

	//If you're trying to modify this code for your own project, I am so, so sorry.
	//Good luck.

	static changeMapSpawns(map, maxBotsPerZone, raiderWaves, raiderWaveSizeMin, raiderWaveSizeMax, botType, speedFactor, waveChance?)
	{
		let spawnImmediately = config.spawnChanges.spawnTiming.spawnExtraWavesImmediately
		let mapName = map
		map = locations[map].base;
		//This does very little. Keeping it anyways.
		map.MaxBotPerZone = 500//maxBotsPerZone;
		let waveNum = 0;
		
		//Format of the thing:
		//map || waveNum || timeLow || timeHigh || numLow || numHigh || type || loc || difficulty
		
		//Feel free to leave 'loc' as just an empty string (""). The game seems to interpret this as a command to just pick a spawn point at random, which is pretty nice for keeping things unpredictable.
		
		//I'm not sure that the wave number actually matters, but just in case it does.. This tries to keep you from having any duplicates, by counting the number of waves already coded in (By the game or by previous modifications to the file, either way), and starting you at n+1
		for (const i in map.waves)
		{
			waveNum = waveNum + 1;
		}

		//There doesn't seem to be a limit to how many waves you can queue up. Go nuts. I had about eighty, at one point.
		//..Though that, of course, ground the game to an absolute crawl when they were all spawned in. But still.
		for (let i = 0; i < raiderWaves; i++)
		{
			let timeMax = 2700
			let timeMin = 1
			if (spawnImmediately)
				timeMax = 30; timeMin = 1
			if (waveChance == undefined)
				waveChance = 100
			waveNum = AITweaks.addSpawn(map, waveNum, timeMin, timeMax, raiderWaveSizeMin, raiderWaveSizeMax, botType, "", "hard", mapName, waveChance, false)
		}


//For debugging purposes. Pukes up details about all the waves for whatever map's function you put it in
//		 |
//		 |
//		 V
/*
		for (const i in map.waves)
		{
			let displayMessage = []
			console.log("======================")
			for (let n in map.waves[i])
			{
				if (n == "time_min")
					displayMessage.push("Time: " + map.waves[i][n])
				if (n == "time_max")
					displayMessage.push(" to " + map.waves[i][n])
				if (n == "WildSpawnType")
					displayMessage.push("Type: " + map.waves[i][n])
				if (n == "slots_min")
					displayMessage.push("Slots: " + map.waves[i][n])
				if (n == "slots_max")
					displayMessage.push(" to " + map.waves[i][n])
				if (n == "SpawnPoints")
					displayMessage.push("Zone: " + map.waves[i][n])
			}
			console.log(displayMessage[5] + " at " + displayMessage[4])
			console.log(displayMessage[0] + displayMessage[1])
			console.log(displayMessage[2] + displayMessage[3])
		}
*/
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
	
	//Lets the config replace scavs with gluhar's raiders or PMCs
	static replaceScavs(replacePCT, map, type)
	{
		map = locations[map]
		for (let o in map.base.waves)
		{
			//Compare to the percent chance, and only replace scavs. No replacing marksmen!
			if (RandomUtil.getInt(1, 100) < replacePCT && map.base.waves[o].WildSpawnType == "assault")
			{
				if (type == "GluharRaiders")
				{
					//50% chance of assault, 25% chance of security, 25% chance of scout
					if (RandomUtil.getInt(1, 2) == 1)
					{
						map.base.waves[o].WildSpawnType = "followerGluharAssault"
					}
					else if (RandomUtil.getInt(1, 2) == 1)
					{
						//map.base.waves[o].WildSpawnType = "followergluharsecurity"
						map.base.waves[o].WildSpawnType = "followerGluharAssault"
					}
					else
					{
						//map.base.waves[o].WildSpawnType = "followerGluharScout"
						map.base.waves[o].WildSpawnType = "followerGluharAssault"
					}
				}
				else if (type == "raiders")
				{
					map.base.waves[o].WildSpawnType = "pmcbot"
				}
				else if (type == "pmcs")
				{
					map.base.waves[o].WildSpawnType = AKIPMC
				}
			}
		}
	}
	
	//Store part of a map's file.. -Inside itself. This sounds stupid, I know, but it should let me modify the map's waves, and then restore them back to the default before they get modified again, if I want to, say... Randomize spawns every time you load up a map.
	//There has to be a sane way to do this, but I do not know what it is.
	thisIsAnEvenWorseIdea()
	{
		let mapNames = locationNames
		
		for (let i = 0; i < mapNames.length; i++)
		{
			locations[mapNames[i]].base.backupWaves = []
			locations[mapNames[i]].base.backupBosses = []
			for (let n in locations[mapNames[i]].base.waves)
			{
				locations[mapNames[i]].base.backupWaves[n] = AITweaks.clone(locations[mapNames[i]].base.waves[n])
			}
			for (let n in locations[mapNames[i]].base.BossLocationSpawn)
			{
				locations[mapNames[i]].base.backupBosses[n] = AITweaks.clone(locations[mapNames[i]].base.BossLocationSpawn[n])
			}
		}
	}
	
	//And now.. The function to restore the original map's wave information, so it can be altered anew.
	//I probably shouldn't be allowed to program ._.
	static whatAmIEvenDoing(map)
	{
		delete locations[map].base.waves
		delete locations[map].base.BossLocationSpawn
		locations[map].base.waves = []
		locations[map].base.BossLocationSpawn = []
		for (let i in locations[map].base.backupWaves)
		{
			locations[map].base.waves[i] = AITweaks.clone(locations[map].base.backupWaves[i])
		}
		for (let i in locations[map].base.backupBosses)
		{
			locations[map].base.BossLocationSpawn[i] = AITweaks.clone(locations[map].base.backupBosses[i])
		}
	}
	
	static getHashFromString(str, seed = 0) {
		let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
		for (let i = 0, ch; i < str.length; i++) {
			ch = str.charCodeAt(i);
			h1 = Math.imul(h1 ^ ch, 2654435761);
			h2 = Math.imul(h2 ^ ch, 1597334677);
		}
		h1 = Math.imul(h1 ^ (h1>>>16), 2246822507) ^ Math.imul(h2 ^ (h2>>>13), 3266489909);
		h2 = Math.imul(h2 ^ (h2>>>16), 2246822507) ^ Math.imul(h1 ^ (h1>>>13), 3266489909);
		return 4294967296 * (2097151 & h2) + (h1>>>0);
	}
	
	//This is awful and I'll clean it up later
	static scrambleBots()
	{
		if (!database.globals.config.FinsBotSwitching)
			database.globals.config.FinsBotSwitching = {}
		let balancedBots = ["followerBully", "followerGluharSecurity", "followerGluharScout"]
		let aggressiveBots = ["cursedAssault", "followerGluharAssault", "followerTagilla"]
		let rangedBots = ["followerGluharSnipe", "followerSanitar"]
		let rand
		rand = RandomUtil.getInt(0, balancedBots.length - 1)
		database.globals.config.FinsBotSwitching.LLB = balancedBots[rand]
		rand++; rand + 1 > balancedBots.length ?
		rand = 0 : null
		database.globals.config.FinsBotSwitching.MLB = balancedBots[rand]
		rand++; rand + 1 > balancedBots.length ? rand = 0 : null
		database.globals.config.FinsBotSwitching.HLB = balancedBots[rand]
		rand = RandomUtil.getInt(0, aggressiveBots.length - 1)
		// database.globals.config.FinsBotSwitching.LLA = aggressiveBots[rand]
		database.globals.config.FinsBotSwitching.LLA = aggressiveBots[2];
		aggressiveBots.splice(2,1); rand++; rand + 1 >
		aggressiveBots.length ? rand = 0 : null
		database.globals.config.FinsBotSwitching.MLA = aggressiveBots[rand]
		rand++; rand + 1 > aggressiveBots.length ?
		rand = 0 : null
		database.globals.config.FinsBotSwitching.HLA = aggressiveBots[rand]
		rand = RandomUtil.getInt(0, rangedBots.length - 1)
		database.globals.config.FinsBotSwitching.LLR = rangedBots[rand]
		rand++; rand + 1 > rangedBots.length ? rand = 0 : null
		database.globals.config.FinsBotSwitching.MLR = rangedBots[rand]
		// rand++; rand + 1 > rangedBots.length ? rand = 0 : null
		database.globals.config.FinsBotSwitching.HLR = rangedBots[rand]
		let allSwappableBots = []
		allSwappableBots.push(...balancedBots)
		allSwappableBots.push(...aggressiveBots)
		allSwappableBots.push(...rangedBots)
		let configBotList = AITweaks.clone(config.aiChanges.changeBots)
		for (let aiType in configBotList)
			for (let bot in configBotList[aiType])
				if (!allSwappableBots.includes(configBotList[aiType][bot]))
					AITweaks.replaceDifficulties(configBotList[aiType][bot], aiType)
		let LL = ["LLB", "LLA", "LLR"]
		let ML = ["MLB", "MLA", "MLR"]
		let HL = ["HLB", "HLA", "HLR"]
		for (let level in LL)
			AITweaks.replaceDifficulties(database.globals.config.FinsBotSwitching[LL[level]].toLowerCase(), "lowLevelAIs")
		for (let level in ML)
			AITweaks.replaceDifficulties(database.globals.config.FinsBotSwitching[ML[level]].toLowerCase(), "midLevelAIs")
		for (let level in HL)
			AITweaks.replaceDifficulties(database.globals.config.FinsBotSwitching[HL[level]].toLowerCase(), "highLevelAIs")
		// for (let botName in allSwappableBots)
			// AITweaks.replaceDifficulties(allSwappableBots[botName])
		
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
	
	//This is a horrible idea, but basically hijack an existing function to let the randomized bot function(s) run at more than just startup
	//I blame Reider123's mod for giving me the inspiration to hook this mangled code to something functional
	//If I did this right, it *should* let me randomize waves (And whatever else I want, really) every time you load into a map.
	// It did exactly that, and that was a problem. Oops. Disabled for now.
	//Re-enabled. Map wave values are now specially stored, so running multiple raids in a row won't progressively replace / add more and more and more waves. ...Assuming everything goes as planned.
	//This also now triggers the debug check to write things to files, so you can see things as they are just before they're actually used in a raid
	//RECENT INVESTIGATION HAS REVEALED: Changes made to spawns here DO NOT TAKE EFFECT until the next raid. Spawns are presumably loaded before this point. Am unsure about other changes, but I suspect changes to AI made here do still stick.
	//AI changes made here may not stick after all. Damnit.
	static thisIsProbablyAReallyBadIdea(url, info, sessionId)
	{
		AITweaks.saveDebugFiles(config.debug.showSpawns, config.debug.showBosses, config.debug.showBossPMCs, config.debug.showGuns, config.debug.showArmor, config.debug.showAmmo)
		let map = url.replace("/client/location/getLocalloot?locationId=", "")
		map = map.split("&")
		map = map[0]
		if (!(config.disableAllAIChanges) && true) //Disabled for now, since this no longer does anything.
			for (let botIndex in botTypes)
			{
				let bot = botTypes[botIndex]
				if (bot.backupDifficulty)
					for (let i in bot.backupDifficulty)
						bot.difficulty[i] = AITweaks.clone(bot.backupDifficulty[i])
				else
				{
					bot.backupDifficulty = {}
					for (let i in bot.difficulty)
						bot.backupDifficulty[i] = AITweaks.clone(bot.difficulty[i])
				}
				if (["bigmap", "interchange", "shoreline"].includes(map))
					for (let diff in bot.difficulty)
						{
							// bot.difficulty[diff].Scattering.RecoilControlCoefShootDone *= 7
							// bot.difficulty[diff].Scattering.RecoilControlCoefShootDoneAuto *= 7
						}
				else
					for (let diff in bot.difficulty)
						{
							// bot.difficulty[diff].Scattering.SCATTERING_DIST_MODIF *= 2
							// bot.difficulty[diff].Scattering.SCATTERING_DIST_MODIF_CLOSE *= 2
							// bot.difficulty[diff].Scattering.RecoilControlCoefShootDone *= 3
							// bot.difficulty[diff].Scattering.RecoilControlCoefShootDoneAuto *= 3
							// bot.difficulty[diff].Aiming.BASE_SHIEF *= 2
						}
				/* if (!(config.disableAllAIChanges))
				{
					let scavDiffMod = config.aiChanges.lowLevelAIDifficultyMod_Neg3_3
					let PMCDiffMod = config.aiChanges.highLevelAIDifficultyMod_Neg3_3
					let raiderDiffMod = config.aiChanges.midLevelAIDifficultyMod_Neg3_3
					let gluharRaiderDiffMod = raiderDiffMod
					let minionDiffMod = raiderDiffMod
					for (let aiTypes in config.aiChanges.changeBots)
						for (let bot in config.aiChanges.changeBots[aiTypes])
						{
							let botName = config.aiChanges.changeBots[aiTypes][bot].toLowerCase()
							bot = botTypes[botName]
							if (!botTypes[botName])
							{Logger.error(`"${botName}" is not a valid bot name. If this bot was added by a mod, this error may be occurring because of loading order. No AI changes will be made to this bot.`); continue}
							if (!botTypes[botName].difficulty)
							{Logger.error(`${botName} does not have difficulty entries to modify. No AI changes will be made to this bot.`); continue}
							if (aiTypes == "lowLevelAIs")
							{;diffSet = [0,1,2,3];diffMod = scavDiffMod}
							else if (aiTypes == "midLevelAIs")
							{diffSet = [1,2,3,4]; diffMod = raiderDiffMod}
							else if (aiTypes == "highLevelAIs")
							{diffSet = [2,3,4,5];diffMod = PMCDiffMod}
							else if (aiTypes == "bossLevelAIs")
							{diffSet = [2,3,4,5];diffMod = Math.max(PMCDiffMod, raiderDiffMod, scavDiffMod) + 1.5}
							AITweaks.changeForAllDifficulties(bot, diffSet, diffMod, botName)
						}
					AITweaks.checkTalking()
				} */
			}
		//This is from, uhh..
		// locations / src / callbacks. If the AKI stuff changes, this might have to be changed as well.
		
		if (config.debug.reportWavesBeforeRaid && false)
			console.log(AITweaks.sumWave(map, true, true))
		// AITweaks.scrambleBots()
		//Apply the advanced loadout config here, so you can check to see what map is being used
		
		let loadoutConfig = require("../config/advanced loadout config.json")
		if (loadoutConfig.enabled == true)
			AITweaks.applyAdvancedLoadoutConfig(loadoutConfig, map, [])
		
		//const location = url.split("=")[1].replace("&variantId", "");
		//return HttpResponse.getBody(LocationController.get(location))
		
		return(AITweaks.nullResponse())
	}
	
	//Hijacking this core function to make the scav and PMC AI be friends with eachother. -Or maybe to make the Raiders pick a side, or possibly even to make only PMCs of one faction spawn. All that should be able to be done from here.
	//Original function is from Aki_Data\Server\eft-bots\src\callback.js
	static generateBots(url, info, sessionId, testing, printWep, printArm, printBot, botCount, output)
	{
		// if (config.silenceWeaponGenErrors)
			// AITweaks.disableLogger() //This is probably bad to have here, but it can totally silence weapon gen errors.
		//Call this function with literally anything for the first three functions, and true as the fourth, in order to test this out.
		if (testing == true)
		{
			if (botCount == undefined)
				botCount = 60
			url = "/client/game/bot/generate"
			
			info = {
				conditions: []
			}
			for (let i in botTypes)
				if (botTypes[i]?.inventory?.Ammo && botTypes[i]?.inventory?.equipment && properCaps[i])
					info.conditions.push({ Role: properCaps[i], Limit: botCount, Difficulty: 'normal' })
			for (let bot of config.AIgearChanges.scavBots)
				if (!info.conditions.find(i => i.Role.toLowerCase() == bot))
					info.conditions.push({ Role: bot, Limit: botCount, Difficulty: 'normal' })
			for (let bot of config.AIgearChanges.raiderBots)
				if (!info.conditions.find(i => i.Role.toLowerCase() == bot))
					info.conditions.push({ Role: bot, Limit: botCount, Difficulty: 'normal' })
			for (let bot of config.AIgearChanges.pmcBots)
				if (!info.conditions.find(i => i.Role.toLowerCase() == bot))
					info.conditions.push({ Role: bot, Limit: botCount, Difficulty: 'normal' })
			info.conditions.push({ Role: BotConfig.pmc.usecType, Limit: botCount, Difficulty: 'normal' })
			info.conditions.push({ Role: BotConfig.pmc.bearType, Limit: botCount, Difficulty: 'normal' })
			
		}
		
		if (output == undefined)
			output = HttpResponse.getBody(BotController.generate(sessionId, info))
		let a = JsonUtil.deserialize(output)
		a.data = AITweaks.pmcScavAlliance(a.data, printWep, printArm, printBot, sessionId)
		output = JsonUtil.serialize(a)
		// AITweaks.enableLogger()
		return output
	}
	
	static establishBotGenValues()
	{
		// console.log(`BotConfig settings:`)
		// console.log(BotConfig)
		//Unless I want to think of a cleverer way of putting this function in here, just grab whatever values you need straight from the config. No fancy passing parameters to this function, oh no.
		let allBEARs = config.spawnChanges.controlOptions.allPMCsareBEARs
		let allUSECs = config.spawnChanges.controlOptions.allPMCsareUSECs
		//If both are true, randomly pick a side
		if (allBEARs && allUSECs)
			if (RandomUtil.getInt(0,1) == 1)
			{
				allBEARs = true
				allUSECs = false
			}
			else
			{
				allBEARs = false
				allUSECs = true
			}
		
		let bearAlliance = !config.aiChanges.IfYouDisableTheseThePMCSWontCountForQuestKills.scavsFightBEARBots
		let usecAlliance = !config.aiChanges.IfYouDisableTheseThePMCSWontCountForQuestKills.scavsFightUSECBots
		if (config.disableAllAIChanges)
			[allBEARs, allUSECs, bearAlliance, usecAlliance] = [false, false, false, false]
		
		let hasPMCs = []
		for (let i in config.aiChanges.changeBots)
			if (config.aiChanges.changeBots[i].includes(botNameSwaps.bear) || config.aiChanges.changeBots[i].includes(botNameSwaps.usec))
				hasPMCs.push[i]
		let pmcBehaviourChanged = false
		if (config.AIbehaviourChanges.enabled && !config.disableAllAIChanges)
			for (let i in hasPMCs)
				for (let behaviour in config.AIbehaviourChanges[hasPMCs[i]])
					if (behaviour != "default" && config.AIbehaviourChanges[hasPMCs[i]] > 0)
						pmcBehaviourChanged = true
		
		let output = [];
		
		//Defining what is an optic or an optic mount
		let opticsMounts = []
		let smallAuxOpticsMounts = ["5649a2464bdc2d91118b45a8"] //NCStar MPR45
		let opticsItems = []
		let medsItems = {
			"sanitarMed": ["5e99711486f7744bfc4af328", 0],
			"sanitarSurg": ["5e99735686f7744bfc4af32c", 0],
			"augmentin": ["590c695186f7741e566b64a2", 0],
			"hemostat": ["5e8488fa988a8701445df1e4", 800],
			"tourniquet": ["5e831507ea0a7c419c2f9bd9", 200],
			"tourniquetPMC": ["60098af40accd37ef2175f27", 200],
			"cheese": ["5755356824597772cb798962", 100],
			"carMedkit": ["590c661e86f7741e566b646a", 220],
			"grizzlyMedkit": ["590c657e86f77412b013051d", 1600],
			"salewa": ["544fb45d4bdc2dee738b4568", 400],
			"ifak": ["590c678286f77426c9660122", 500],
			"afak": ["60098ad7c2240c0fe85c570a", 800],
			"painkillers": ["544fb37f4bdc2dee738b4567", 400],
			"ibuprofin": ["5af0548586f7743a532b7e99", 1000],
			"vaseline": ["5755383e24597772cb798966", 800],
			"balm": ["5751a89d24597722aa0e8db0", 1000],
			"morphine": ["544fb3f34bdc2d03748b456a", 800],
			"bandage": ["544fb25a4bdc2dfb738b4567", 100],
			"bandageM": ["5751a25924597722c463c472", 300],
			"splint": ["544fb3364bdc2d34748b456a", 200],
			"splintAluminum": ["5af0454c86f7746bf20992e8", 800],
			"CMS": ["5d02778e86f774203e7dedbe", 800],
			"surv12": ["5d02797c86f774203f38e30a", 1200]
		}//I hate manually making lists, but it seems necessary here
		let medsCategories = {
		"medkits": ["cheese", "carMedkit", "grizzlyMedkit", "salewa", "ifak", "afak"],
		"painkillers": ["painkillers", "ibuprofin", "vaseline", "balm", "morphine"],
		"bandages": ["bandage", "bandageM"],
		"splints": ["splint", "splintAluminum"],
		"surgicals": ["CMS", "surv12"],
		"tourniquets": ["tourniquet", "tourniquetPMC", "hemostat"]}
		if (true)//advIConfig.enabled == true) //Grab values from the inventory config
		{
			for (let name in advIConfig.medicalValues)
				if (medsItems[name])
					medsItems[name][1] = advIConfig.medicalValues[name]
			for (let name in advIConfig.customMedicalItems) //THIS NEEDS TESTING!!! (delete when this is testing'd)
				if (itemdb[advIConfig.customMedicalItems[name][0]]) //If it's a valid item ID
				{
					if (medsCategories[advIConfig.customMedicalItems[name][1]])
					{
						medsItems[name] = [advIConfig.customMedicalItems[name][0], advIConfig.customMedicalItems[name][2]]
						medsCategories[advIConfig.customMedicalItems[name][1]].push(name)
					}
				}
		}
		for (let i in medsItems)//Make the list reversible
			medsItems[medsItems[i][0]] = i
		//The idea is to be able to find an item's TPL, check if it's a med, then if it is, quickly find out what category it's in
		let medValuePyramid = {}
		for (let cat in medsCategories)//Construct a list of all elligible items ordered from most valuable to least
			{
				let valueList = []
				for (let i in medsCategories[cat])
				{//Assigns the name of the item to the array value equal to its value. IE, if it's worth 500, it's at array[500]
					if (!valueList[medsItems[medsCategories[cat][i]][1]])
						valueList[medsItems[medsCategories[cat][i]][1]] = []
					valueList[medsItems[medsCategories[cat][i]][1]].push(medsCategories[cat][i])
				}
				medValuePyramid[cat] = {}
				for (let i in valueList)
					for (let n in valueList[i])
						medValuePyramid[cat][valueList[i][n]] = parseInt(i) * 1
			}
		let stimItems = {
			"3-(b-TG)": "5ed515c8d380ab312177c0fa",
			"AHF1-M": "5ed515f6915ec335206e4152",
			"L1": "5ed515e03a40a50460332579",
			"M.U.L.E": "5ed51652f6c34d2cc26336a1",
			"Meldonin": "5ed5160a87bb8443d10680b5",
			"Obdolbos": "5ed5166ad380ab312177c100",
			"P22": "5ed515ece452db0eb56fc028",
			"SJ1_TGLabs": "5c0e531286f7747fa54205c2",
			"Adrenaline": "5c10c8fd86f7743d7d706df3",
			"Propital": "5c0e530286f7747fa1419862",
			"SJ6_TGLabs": "5c0e531d86f7747fa23f4d42",
			"SJ9_TGLabs": "5fca13ca637ee0341a484f46",
			"Zagustin": "5c0e533786f7747fa23f4d47",
			"eTG_change": "5c0e534186f7747fa1419867",
			"x-TG-12_antidote": "5fca138c2a7b221b2852a5c6"
		}
		for (let i in stimItems)//Make the list reversible
			stimItems[stimItems[i]] = i
		for (let itemID in database.templates.items)
		{
			let item = database.templates.items[itemID]
			if (["55818ad54bdc2ddc698b4569", "55818add4bdc2d5b648b456f", "55818acf4bdc2dde698b456b", "55818ae44bdc2dde698b456c", "55818aeb4bdc2ddc698b456a"].includes(item._parent))
				opticsItems.push(item._id)
		}
		//No helmets, etc.
		let mainArmorItems = {}
		for (let itemId in itemdb)
			if (itemdb[itemId]._props.armorClass && itemdb[itemId]._props.armorClass && itemdb[itemId]._props.armorZone && itemdb[itemId]._props.armorZone.includes("Chest") && itemdb[itemId]._props?.FinAllowed != false)
				if (!mainArmorItems[itemdb[itemId]._props.armorClass])
					mainArmorItems[itemdb[itemId]._props.armorClass] = [itemId]
				else
					mainArmorItems[itemdb[itemId]._props.armorClass].push(itemId)
		let tacticalItems = []
		for (let itemID in database.templates.items)
		{//If it has slots, the slot is a "mount", and the slot can take any item classified as an optic, then it's an optic mount
			let item = database.templates.items[itemID]
			if (item._props.Slots
			&& !item._props.weapUseType
			&& !item._name.toLowerCase().includes("receiver")
			&& !item._name.toLowerCase().includes("handguard"))
				for (let slot in item._props.Slots)
					if (item._props.Slots[slot]._name.includes("scope"))
						for (let i in opticsItems)
							if (item._props.Slots[slot]._props.filters[0].Filter.includes(opticsItems[i]))
								if (!opticsMounts.includes(item._id))
									opticsMounts.push(item._id)
			if (["55818b164bdc2ddc698b456c", "55818b084bdc2d5b648b4571", "55818b0e4bdc2dde698b456e"].includes(item._parent))
				tacticalItems.push(item._id)
			// if (item._props.medUseTime)
				// medsItems.push(item._id)
		}
		//Remove the MPR45 from opticsMounts
		opticsMounts = opticsMounts.filter(i => i != "5649a2464bdc2d91118b45a8")
		//Check all items, and compare to the list of optics mounts. If an item has an optics mount in a slot that's classified as required, remove that optic mount from the list of optic mounts
		for (let itemID in database.templates.items)
		{
			let item = database.templates.items[itemID]
			if (item._props.Slots)
				for (let slot in item._props.Slots)
					if (AITweaks.checkRequired(item._props.Slots[slot]) == true)
						for (let i = 0; i < opticsMounts.length; i++)
							if (item._props.Slots[slot]._props.filters[0].Filter.includes(opticsMounts[i]))
							{
								opticsMounts.splice(i,1)
								i -= 1
							}
		}
		
		//Make sure bot names can be compared in a lower-case way
		let scavBots = []
		let raiderBots = []
		let pmcBots = []
		
		for (let i in config.AIgearChanges.scavBots)
			scavBots.push(config.AIgearChanges.scavBots[i].toLowerCase())
		for (let i in config.AIgearChanges.raiderBots)
			raiderBots.push(config.AIgearChanges.raiderBots[i].toLowerCase())
		for (let i in config.AIgearChanges.pmcBots)
			pmcBots.push(config.AIgearChanges.pmcBots[i].toLowerCase())
		
		//Difficulty switcheroo
		//database.globals.config.FinsDifficultyLevels
		//This establishes which bots should have their AI switched around with which others, and what the chances of that are.
		let switchBoard = undefined
		let switchChances
		let lowerCaseLLAIs = [] //Low level AIs
		let lowerCaseMLAIs = [] //Mid level AIs
		let lowerCaseHLAIs = [] //High level AIs
		//These aren't used until a little further down
			for (let name in config.aiChanges.changeBots.lowLevelAIs)
				lowerCaseLLAIs.push(config.aiChanges.changeBots.lowLevelAIs[name].toLowerCase())
			for (let name in config.aiChanges.changeBots.midLevelAIs)
				lowerCaseMLAIs.push(config.aiChanges.changeBots.midLevelAIs[name].toLowerCase())
			for (let name in config.aiChanges.changeBots.highLevelAIs)
				lowerCaseHLAIs.push(config.aiChanges.changeBots.highLevelAIs[name].toLowerCase())
		let lowerCaseScavGearAIs = [] //Low level AIs
		let lowerCaseRaiderGearAIs = [] //Mid level AIs
		let lowerCasePMCGearAIs = [] //High level AIs
		//These aren't used until a little further down
			for (let name in config.AIgearChanges.scavBots)
				lowerCaseScavGearAIs.push(config.AIgearChanges.scavBots[name].toLowerCase())
			for (let name in config.AIgearChanges.raiderBots)
				lowerCaseRaiderGearAIs.push(config.AIgearChanges.raiderBots[name].toLowerCase())
			for (let name in config.AIgearChanges.pmcBots)
				lowerCasePMCGearAIs.push(config.AIgearChanges.pmcBots[name].toLowerCase())
		if (config.AIbehaviourChanges.enabled && !config.disableAllAIChanges)
			[switchBoard, switchChances] = AITweaks.createSwitchBoard()
		database.globals.config.genVals = {
			"usecAlliance": usecAlliance,
			"bearAlliance": bearAlliance,
			"allUSECs": allUSECs,
			"allBEARs": allBEARs,
			"smallAuxOpticsMounts": smallAuxOpticsMounts,
			"medsItems": medsItems,
			"medsCategories": medsCategories,
			"medValuePyramid": medValuePyramid,
			"stimItems": stimItems,
			"opticsItems": opticsItems,
			"mainArmorItems": mainArmorItems,
			"tacticalItems": tacticalItems,
			"opticsMounts": opticsMounts,
			"scavBots": scavBots,
			"raiderBots": raiderBots,
			"pmcBots": pmcBots,
			"lowerCaseLLAIs": lowerCaseLLAIs,
			"lowerCaseMLAIs": lowerCaseMLAIs,
			"lowerCaseHLAIs": lowerCaseHLAIs,
			"lowerCaseScavGearAIs": lowerCaseScavGearAIs,
			"lowerCaseRaiderGearAIs": lowerCaseRaiderGearAIs,
			"lowerCasePMCGearAIs": lowerCasePMCGearAIs,
			"switchBoard": switchBoard,
			"switchChances": switchChances,
			"pmcBehaviourChanged": pmcBehaviourChanged
			}
	}
	
	static pmcScavAlliance(bots, printWep, printArm, printBot, sessionId)
	{
		let debug = database.globals.config.debugFAITSpawns ? true : false
		
		if (!database.globals.config.genVals)
			AITweaks.establishBotGenValues()
		if (config.silenceWeaponGenErrors)
			AITweaks.disableLogger()
		
		let usecAlliance = database.globals.config.genVals.usecAlliance
		let bearAlliance = database.globals.config.genVals.bearAlliance
		let allUSECs = database.globals.config.genVals.allUSECs
		let allBEARs = database.globals.config.genVals.allBEARs
		let smallAuxOpticsMounts = database.globals.config.genVals.smallAuxOpticsMounts
		let medsItems = database.globals.config.genVals.medsItems
		let medsCategories = database.globals.config.genVals.medsCategories
		let medValuePyramid = database.globals.config.genVals.medValuePyramid
		let stimItems = database.globals.config.genVals.stimItems
		let opticsItems = database.globals.config.genVals.opticsItems
		let mainArmorItems = database.globals.config.genVals.mainArmorItems
		let tacticalItems = database.globals.config.genVals.tacticalItems
		let opticsMounts = database.globals.config.genVals.opticsMounts
		let scavBots = database.globals.config.genVals.scavBots
		let raiderBots = database.globals.config.genVals.raiderBots
		let pmcBots = database.globals.config.genVals.pmcBots
		let lowerCaseLLAIs = database.globals.config.genVals.lowerCaseLLAIs
		let lowerCaseMLAIs = database.globals.config.genVals.lowerCaseMLAIs
		let lowerCaseHLAIs = database.globals.config.genVals.lowerCaseHLAIs
		let lowerCaseScavGearAIs = database.globals.config.genVals.lowerCaseScavGearAIs
		let lowerCaseRaiderGearAIs = database.globals.config.genVals.lowerCaseRaiderGearAIs
		let lowerCasePMCGearAIs = database.globals.config.genVals.lowerCasePMCGearAIs
		let switchBoard = database.globals.config.genVals.switchBoard
		let switchChances = database.globals.config.genVals.switchChances
		let pmcBehaviourChanged = database.globals.config.genVals.pmcBehaviourChanged
		let debugText = []

		//Reset out any bots that have somehow been converted to PMCs
		//It's possible these bots will have PMC gear. Regenbot can be set to regen their inventory, but that will multiply the error messages that display, and I don't really want that. People ask about them enough as-is.
		if (config.disableAllSpawnChanges == false)
			for (let botIndex in bots)
			{
				let bot = bots[botIndex]
				if ([botHelper.getBotTemplate("Usec")].includes(bot.Info.Settings.Role))
					bot.Info.Settings.Role = BotConfig.pmc.usecType
				else if ([botHelper.getBotTemplate("Bear")].includes(bot.Info.Settings.Role))
					bot.Info.Settings.Role = BotConfig.pmc.bearType
				if (["Bear", "Usec"].includes(bot.Info.Side))
					bot.Info.Side = "Savage"
				let a = AITweaks.regenBot(bot, true, false, sessionId)			
				// let whileCount = 0
				// while (!a.Inventory.items.find(i => ["FirstPrimaryWeapon", "SecondPrimaryWeapon", "Holster"].includes(i.slotId)))
				// {
					// whileCount++
					// a = AITweaks.regenBot(bot, true, false, sessionId)
					// if (whileCount > 3)
					// {
						// console.log("Bot spawned without a valid weapon")
						// break
					// }
				// }
				if (!a.Inventory || !a.Inventory.items)
				{
					console.log(`Critical error with bot inventories. Some bots will be generated without FAITs usual modifications.`)
					return bots;
				}
				else
					bot = AITweaks.clone(a)
			}
		for (let botIndex in bots)
		{
			// console.time('bot');
			let botNum = botIndex
			let bot = bots[botIndex]
			//Trying this out for compatiblilty
			bot.Info.Settings.origRole = bot.Info.Settings.Role
			if (bot.Inventory.items.find(i => i.slotId == "Dogtag"))
				bot.Info.Settings.isPmc = true
			if ([botHelper.getBotTemplate("Usec")].includes(bot.Info.Settings.Role))
				bot.Info.Settings.Role = BotConfig.pmc.usecType
			else if ([botHelper.getBotTemplate("Bear")].includes(bot.Info.Settings.Role))
				bot.Info.Settings.Role = BotConfig.pmc.bearType
			//The big list of "Things that bots ought to have". I want to delete this, but one person had a problem so now a whole new thing is needed. >:/
			//I don't think this eats up *too* much processing time, at least.
			if (!bot.Inventory
			|| !bot.Inventory.items
			|| !bot.Info
			|| !bot.Info.Settings
			|| !bot.Info.Settings.Role
			|| !bot.Info.Settings.BotDifficulty
			|| !bot.Info.Settings.Experience)
			{
				if (debug)
				{
					if (!config.count)
						config.count = 0
					config.count++
					console.log(`Bot generated without vital settings`)
				}
				if (!bot.Info
				|| !bot.Info.Settings
				|| !bot.Info.Settings.Role
				|| !botTypes[bot.Info.Settings.Role.toLowerCase()])
					bot.Info.Settings.Role = "Assault"
				bot = AITweaks.regenBot(bot, true, false, sessionId)
				//Compatiblity
				bot.Info.Settings.Role = bot.Info.Settings.origRole
			}
			
			if (true)
			{
				let pmcSide = ""
				if (!config.disableAllSpawnChanges)
					if (allBEARs)
					{
						pmcSide = "Bear";
					}
					else if (allUSECs)
					{
						pmcSide = "Usec";
					}
					else
					{
						pmcSide = (RandomUtil.getInt(0, 99) < BotConfig.pmc.isUsec) ? "Usec" : "Bear";
					}
				let isPmc = false
				
				//use of all-lowercase exusec as the USEC PMC type makes this a problem
				// if (properCaps[bot.Info.Settings.Role.toLowerCase()])
					// bot.Info.Settings.Role = properCaps[bot.Info.Settings.Role.toLowerCase()]
				let origRole = bot.Info.Settings.Role
				
				let role = origRole
				//Negative values will skip tactical / optics limiting functions
				let maxTacticalDevices = -1
				let maxPrimaryOptics = -1
				//Default to 0 to preserve bosses etc.
				let replaceWithPresetPCT = 0
				if (scavBots.includes(role.toLowerCase()))
				{
					maxTacticalDevices = config.AIgearChanges.scavs.maxTacticalDevices
					maxPrimaryOptics = config.AIgearChanges.scavs.maxPrimaryOptics
					replaceWithPresetPCT = config.AIgearChanges.scavs.chanceToUseWeaponFromPlayerPresets0_100
				}
				else if (raiderBots.includes(role.toLowerCase()))
				{
					maxTacticalDevices = config.AIgearChanges.raiders.maxTacticalDevices
					maxPrimaryOptics = config.AIgearChanges.raiders.maxPrimaryOptics
					replaceWithPresetPCT = config.AIgearChanges.raiders.chanceToUseWeaponFromPlayerPresets0_100
				}
				else if (pmcBots.includes(role.toLowerCase()))
				{
					maxTacticalDevices = config.AIgearChanges.PMCs.maxTacticalDevices
					maxPrimaryOptics = config.AIgearChanges.PMCs.maxPrimaryOptics
					replaceWithPresetPCT = config.AIgearChanges.PMCs.chanceToUseWeaponFromPlayerPresets0_100
				}
				//Disable the use of presets if progressive gear is enabled
				//...Because obviously.
				if (config.miscChanges.enableProgressiveGear)
					replaceWithPresetPCT = 0
				if (config.disableAllSpawnChanges)
				{
					// isPmc = (pmcSide == "Bear" || pmcSide == "Usec");
					// isPmc = (role in BotConfig.pmc.types && RandomUtil.getInt(0, 99) < BotConfig.pmc.types[role]);
					isPmc = ([BotConfig.pmc.usecType, BotConfig.pmc.bearType].includes(role) && bot.Info.Settings.isPmc == true)
					if (isPmc)
					{
						pmcSide = (RandomUtil.getInt(0, 99) < BotConfig.pmc.isUsec) ? "Usec" : "Bear";
						role = AKIPMC
						// bot.Info.Settings.Role = AKIPMC
					}
				}
				else
				{
					if (origRole == AKIPMC)
						isPmc = true
					isPmc? role = PMCSwap : null
					// isPmc? bot.Info.Settings.Role = BotConfig.pmc[`${pmcSide.toLowerCase()}Type`] : null
					// isPmc? bot.Info.Settings.Role = PMCSwap : null
				}
				//This should allow pmcs to remain as bearType or usecType if behaviour for them is disabled in one manner or another
				/* if (isPmc)
				{
					if (pmcBehaviourChanged)
						bot.Info.Settings.Role = AKIPMC
					else //Making sure. Just in case
						bot.Info.Settings.Role = (pmcSide == "Bear" ? BotConfig.pmc.bearType :  BotConfig.pmc.usecType)
					bot.Info.Settings.Role == "exUsec" ? bot.Info.Settings.Role = "exusec" : null
				} */
				// role = role.toLowerCase()
				if (pmcSide == "Bear" && isPmc)
					bot.Info.Side = bearAlliance ? "Savage" : pmcSide
				else if (pmcSide == "Usec" && isPmc)
					bot.Info.Side = usecAlliance ? "Savage" : pmcSide
				else
				{
					bot.Info.Side = (isPmc) ? pmcSide : "Savage"
				}
				
				let AICategory = "midLevelAIs"
				let AIGearCategory = "skip"
				if (isPmc)
					bot = AITweaks.regenBot(bot, true, isPmc ? pmcSide : false, sessionId)
				
				//Difficulty swaps. These are useless, at the moment, save for IDing bots with botmon.
				if (lowerCaseLLAIs.includes(role.toLowerCase())) //Low level AIs are set to "Easy"
				{
					bot.Info.Settings.BotDifficulty = "easy"
					AICategory = "lowLevelAIs"
				}
				else if (lowerCaseMLAIs.includes(role.toLowerCase())) //Mid level AIs are set to "Hard"
				{
					bot.Info.Settings.BotDifficulty = "hard"
					AICategory = "midLevelAIs"
				}
				else if (lowerCaseHLAIs.includes(role.toLowerCase())) //High level AIs are set to "Impossible"
				{
					bot.Info.Settings.BotDifficulty = "impossible"
					AICategory = "highLevelAIs"
				}
				//Anything not on the AI lists should be set to 'normal', and anything on them should be something else.
				else
					bot.Info.Settings.BotDifficulty = "normal"
				
				if (lowerCaseScavGearAIs.includes(role.toLowerCase()))
					AIGearCategory = "scavs"
				else if (lowerCaseRaiderGearAIs.includes(role.toLowerCase()))
					AIGearCategory = "raiders"
				else if (lowerCasePMCGearAIs.includes(role.toLowerCase()))
					AIGearCategory = "PMCs"
								
				// console.log(`${role} ${bot.Info.Settings.Role} ${bot.Info.Side} ${AICategory} ${AIGearCategory}`)
				if (!config.disableAllGearChanges) //Inventory modifications
				{
					//Find the relevant inventory slots
					let primaryWep = bot.Inventory.items.find(i => i.slotId == "FirstPrimaryWeapon")
					let secondaryWep = bot.Inventory.items.find(i => i.slotId == "SecondPrimaryWeapon")
					let sidearm = bot.Inventory.items.find(i => i.slotId == "Holster")
					let backpack = bot.Inventory.items.find(i => i.slotId == "Backpack")
					let rig = bot.Inventory.items.find(i => i.slotId == "TacticalVest")
					let pockets = bot.Inventory.items.find(i => i.slotId == "Pockets")
					let armorvest = bot.Inventory.items.find(i => i.slotId == "ArmorVest")
					let helmet = bot.Inventory.items.find(i => i.slotId == "Headwear")
					let secCon = bot.Inventory.items.find(i => i.slotId == "SecuredContainer")
					let armBand = bot.Inventory.items.find(i => i.slotId == "ArmBand")
					let dogTag = bot.Inventory.items.find(i => i.slotId == "Dogtag")
					
					// if (armBand)
					// console.log(`${bot.Info.Settings.Role} ${origRole} ${AIGearCategory} ${AITweaks.getName(armBand._tpl, true)}`)
										
					//Inventory editing:
					
					//Check primary weapon things
					if (AIGearCategory != "skip")
					{
						if (primaryWep)
						{
							//These parts leave the main inventory, and need to be re-added at the end
							let weapon = AITweaks.seperateChildParts(bot.Inventory.items, primaryWep._id, true)
							bot.Inventory.items = weapon[1]; weapon = weapon[0]
							weapon.push(primaryWep)
							bot.Inventory.items.splice(bot.Inventory.items.findIndex(i => i._id == primaryWep._id), 1)
							
							//If the weapon generated without a magazine, find out, and fix it
							if (!weapon.find(i => i._slotId && i._slotId == "mod_magazine"))
								weapon = AITweaks.addMagToBotWeapon(primaryWep, weapon, bot.Inventory.items)
												
							if (maxTacticalDevices >= 0)
								weapon = AITweaks.trimTacticals(weapon, tacticalItems, maxTacticalDevices)
							if (maxPrimaryOptics >= 0)
								weapon = AITweaks.trimOptics(weapon, opticsItems, maxPrimaryOptics)
							
							for (let item in weapon)
								bot.Inventory.items.push(weapon[item])
							
							//Lowering weapon durability. First one reduces max durability, second one reduces current
							AITweaks.reduceDurability(primaryWep, config.AIgearChanges[AIGearCategory].weaponDurability_MAXMin_Max__CURRENTMin_Max[0][0], config.AIgearChanges[AIGearCategory].weaponDurability_MAXMin_Max__CURRENTMin_Max[0][1], true)
							AITweaks.reduceDurability(primaryWep, config.AIgearChanges[AIGearCategory].weaponDurability_MAXMin_Max__CURRENTMin_Max[1][0], config.AIgearChanges[AIGearCategory].weaponDurability_MAXMin_Max__CURRENTMin_Max[1][1], false)
							
							bot.Inventory.items = AITweaks.limitMagSize(bot.Inventory.items, role, "FirstPrimaryWeapon")
							
							if (advIConfig.preset_weapons && advIConfig.preset_weapons.preset_weapons_for_bots[isPmc? bot.Info.Side.toLowerCase() : role.toLowerCase()]
							&& advIConfig.preset_weapons.preset_weapons_for_bots[[isPmc? bot.Info.Side.toLowerCase() : role.toLowerCase()].toString()].chance > 0)
								bot.Inventory.items = AITweaks.swapPresetWeapon(bot.Inventory.items, primaryWep._id, [isPmc? bot.Info.Side.toLowerCase() : role.toLowerCase()], advIConfig.preset_weapons.preset_weapons_for_bots[[isPmc? bot.Info.Side.toLowerCase() : role.toLowerCase()].toString()].presets_available)
							else if (RandomUtil.getInt(0,99) < replaceWithPresetPCT)
								bot.Inventory.items = AITweaks.swapPresetWeapon(bot.Inventory.items, primaryWep._id, role.toLowerCase())
						}
						if (secondaryWep)
						{
							AITweaks.reduceDurability(secondaryWep, config.AIgearChanges[AIGearCategory].weaponDurability_MAXMin_Max__CURRENTMin_Max[0][0], config.AIgearChanges[AIGearCategory].weaponDurability_MAXMin_Max__CURRENTMin_Max[0][1], true)
							AITweaks.reduceDurability(secondaryWep, config.AIgearChanges[AIGearCategory].weaponDurability_MAXMin_Max__CURRENTMin_Max[1][0], config.AIgearChanges[AIGearCategory].weaponDurability_MAXMin_Max__CURRENTMin_Max[1][1], false)
							bot.Inventory.items = AITweaks.limitMagSize(bot.Inventory.items, role, "SecondPrimaryWeapon")
							if (advIConfig.preset_weapons && advIConfig.preset_weapons.preset_weapons_for_bots[isPmc? bot.Info.Side.toLowerCase() : role.toLowerCase()]
							&& advIConfig.preset_weapons.preset_weapons_for_bots[[isPmc? bot.Info.Side.toLowerCase() : role.toLowerCase()].toString()].chance > 0)
								bot.Inventory.items = AITweaks.swapPresetWeapon(bot.Inventory.items, primaryWep._id, [isPmc? bot.Info.Side.toLowerCase() : role.toLowerCase()], advIConfig.preset_weapons.preset_weapons_for_bots[[isPmc? bot.Info.Side.toLowerCase() : role.toLowerCase()].toString()].presets_available)
							else if (RandomUtil.getInt(0,99) < replaceWithPresetPCT)
								bot.Inventory.items = AITweaks.swapPresetWeapon(bot.Inventory.items, secondaryWep._id, role.toLowerCase())
						}
						if (sidearm)
						{
							AITweaks.reduceDurability(sidearm, config.AIgearChanges[AIGearCategory].weaponDurability_MAXMin_Max__CURRENTMin_Max[0][0], config.AIgearChanges[AIGearCategory].weaponDurability_MAXMin_Max__CURRENTMin_Max[0][1], true)
							AITweaks.reduceDurability(sidearm, config.AIgearChanges[AIGearCategory].weaponDurability_MAXMin_Max__CURRENTMin_Max[1][0], config.AIgearChanges[AIGearCategory].weaponDurability_MAXMin_Max__CURRENTMin_Max[1][1], false)
							bot.Inventory.items = AITweaks.limitMagSize(bot.Inventory.items, role, "Holster")
							if (advIConfig.preset_weapons && advIConfig.preset_weapons.preset_weapons_for_bots[isPmc? bot.Info.Side.toLowerCase() : role.toLowerCase()]
							&& advIConfig.preset_weapons.preset_weapons_for_bots[[isPmc? bot.Info.Side.toLowerCase() : role.toLowerCase()].toString()].chance > 0)
								bot.Inventory.items = AITweaks.swapPresetWeapon(bot.Inventory.items, primaryWep._id, [isPmc? bot.Info.Side.toLowerCase() : role.toLowerCase()], advIConfig.preset_weapons.preset_weapons_for_bots[[isPmc? bot.Info.Side.toLowerCase() : role.toLowerCase()].toString()].presets_available)
							else if (RandomUtil.getInt(0,99) < replaceWithPresetPCT)
								bot.Inventory.items = AITweaks.swapPresetWeapon(bot.Inventory.items, sidearm._id, role.toLowerCase())
						}
						if (printWep)
						{
							console.log(`Weapons for bot, primary, seconary, then sidearm (Undefined means not present):`)
							console.log(primaryWep)
							console.log(secondaryWep)
							console.log(sidearm)
						}
					}
					if (advIConfig.enabled)
						bot.Inventory.items = AITweaks.modifyInventoryItems(bot.Inventory.items, role, medsItems, medValuePyramid, isPmc)
					if (config.AIgearChanges.miscChanges.requiresOtherMods.AIO.AllowAIToUseBothArmoredVestsAndArmoredRigs == false && !botHelper.isBotBoss(role))
						//Is the rig armored?
						if (armorvest && rig?._tpl && itemdb[rig._tpl]._props.armorClass && itemdb[rig._tpl]._props.armorClass > 0)
						{
							bot.Inventory.items.splice(bot.Inventory.items.findIndex(i => i._id == armorvest._id), 1)
						}					
						
					if (rig && AIGearCategory != "skip")
					{
						AITweaks.reduceDurability(rig, config.AIgearChanges[AIGearCategory].armorDurability_MAXMin_Max__CURRENTMin_Max[0][0], config.AIgearChanges[AIGearCategory].armorDurability_MAXMin_Max__CURRENTMin_Max[0][1], true)
						AITweaks.reduceDurability(rig, config.AIgearChanges[AIGearCategory].armorDurability_MAXMin_Max__CURRENTMin_Max[0][0], config.AIgearChanges[AIGearCategory].armorDurability_MAXMin_Max__CURRENTMin_Max[0][1], false)
					}
					if (armorvest && AIGearCategory != "skip")
					{
						AITweaks.reduceDurability(armorvest, config.AIgearChanges[AIGearCategory].armorDurability_MAXMin_Max__CURRENTMin_Max[0][0], config.AIgearChanges[AIGearCategory].armorDurability_MAXMin_Max__CURRENTMin_Max[0][1], true)
						AITweaks.reduceDurability(armorvest, config.AIgearChanges[AIGearCategory].armorDurability_MAXMin_Max__CURRENTMin_Max[0][0], config.AIgearChanges[AIGearCategory].armorDurability_MAXMin_Max__CURRENTMin_Max[0][1], false)
					}
					
					if (printArm)
						{
							console.log(`Rig and vest for bot, in that order (Undefined means not present):`)
							console.log(rig)
							if (rig)
								console.log(`Rig armor level: ${itemdb[rig._tpl]._props.armorClass ? itemdb[rig._tpl]._props.armorClass : "0"}`)
							console.log(armorvest)
							if (armorvest)
								console.log(`Armored vest armor level: ${itemdb[armorvest._tpl]._props.armorClass ? itemdb[armorvest._tpl]._props.armorClass : "0"}`)
						}
					//ADD SPARE MAGAZINES TO THE INVENTORY
						//TODO:
						// Identify magazines appropriate to a given weapon
						// check the non-weapon inventory for those magazines
						// check to see if the magazine in the weapon could fit in the inventory
						// if yes: Make sure there's at least one spare magazine in the vest / pockets
						// if no: Make sure there are at least two spare magazines in the vest / pockets
					
					let addToSc = {"590c661e86f7741e566b646a": 1}
					bot.Inventory.items = AITweaks.addItemsToSC(bot.Inventory.items, addToSc, secCon)
					bot.Inventory.items = AITweaks.modifySCItems(bot.Inventory.items, secCon, isPmc)
				}
				//This is where behaviour changes happen. This comes after inventory changes that depend on role.
				if (switchBoard && switchBoard[role]) //If Switchboard is enabled, and the bot is elligible
				{
					//Role swaps
					if (switchChances[role].length > 0)
					{
						let switchRole = switchChances[role][RandomUtil.getInt(0, switchChances[role].length - 1)] //Randomly pick a role from the list
						if (switchRole != "none")
							bot.Info.Settings.Role = switchRole //Switch role
					}
				}
				//If switching is enabled but the bot isn't elligible, and isn't a boss
				else if (switchBoard && !switchBoard[role] && (!botHelper.isBotBoss(role) && role.toLowerCase().includes("sectant")))
				{
					
				}
				else //Even if switchboard isn't enabled, do not allow PMCs to default to cursed behaviour.
				{
					if (role == bot.Info.Settings.Role.toLowerCase() //If the original role matches the current role
					&& bot.Info.Settings.Role.toLowerCase() == AKIPMC.toLowerCase() //If the current role is the AKIPMC default role
					&& AKIPMC.toLowerCase() == "cursedassault") //If the AKIPMC default role is cursedassault
					//if (bot.Info.Settings.Role == AKIPMC && AKIPMC == "cursedassault")
					{
						// bot.Info.Settings.Role = database.globals.config.FinsBotSwitching.HLB//"pmcBot"
						bot.Info.Settings.Role = PMCSwap
						bot.Info.Settings.BotDifficulty = "normal"
					}
				}
				//Make sure their skills match their new role if they're on the list
				if (["followertagilla"].includes(bot.Info.Settings.Role.toLowerCase()))
					bot.Skills = botGenerator.generateSkills(botTypes[bot.Info.Settings.Role.toLowerCase()].skills)
				if (debug)
				{
					debugText.push(`${botNum + 1}: ${origRole} -> ${bot.Info.Settings.Role} Side: ${bot.Info.Side} Difficulty: ${bot.Info.Settings.BotDifficulty}`)
					if (!config.stats)
						config.stats = {}
					if (!config.stats[origRole])
						config.stats[origRole] = {"number": 0,
							"Headwear":{"armored": 0,"unarmored": 0,"none": 0},
							"ArmorVest":{"armored": 0,"unarmored": 0,"none": 0},
							"TacticalVest":{"armored": 0,"unarmored": 0,"none": 0},
						}
					//Tracking armor stuff
					config.stats[origRole].number++
					for (let slot in config.stats[origRole])
					{
						if (slot == "number")
							continue
						let item = bot.Inventory.items.find(i => i.slotId == slot)
						if (item && item._tpl)
							item = itemdb[item._tpl]
						if (item && item._props)
						{
							if (item._props.armorClass && item._props.armorClass > 0)
								config.stats[origRole][slot].armored++
							else
								config.stats[origRole][slot].unarmored++
						}
						else
							config.stats[origRole][slot].none++
					}
					//console.log(`${role} ${bot.Info.Settings.Role} ${bot.Info.Side} ${isPmc} ${armBand ? armBand._tpl : "None"} ${AICategory} ${AIGearCategory}`)
				}
				//Inelegant. Inefficient. But it'll do for now, I think.
				bot.Inventory.items = bot.Inventory.items.filter(i => i._tpl != undefined && !blacklistFile.includes(i._tpl) && itemdb[i._tpl] != undefined && itemdb[i._tpl]?._props?.FinAllowed != false)
				// console.log(`${bot.Info.Settings.origRole} -> gear from: ${role} role: ${bot.Info.Settings.Role} Side:  ${bot.Info.Side} PMC: ${isPmc} ${AICategory} ${AIGearCategory}`)
				if (printBot)
				{
					let roles = AITweaks.padLine(`Original role: ${origRole}`, 40, "left") + `Current role:	${bot.Info.Settings.Role}`
					let classes = AITweaks.padLine(`AI class:		${AICategory}`, 40, "left") + `Gear class:	${AIGearCategory}`
					let sideDiff = AITweaks.padLine(`Side:			${bot.Info.Side}`, 40, "left") + `Difficulty:	${bot.Info.Settings.BotDifficulty}`
					console.log(`
								${roles}
								${classes}
								${sideDiff}
								`)
				}
			}
			// console.timeEnd('bot');
		}
		
		if (bots.length < 20 && debug) //Logging which bots are being spawned
		{
			console.log(`Spawning ${bots.length} bots:`)
			console.log(debugText)
		}
		else
		{
			let toSave = {}
			for (let bot in bots)
			{
				let saveName = `${bot}  ${bots[bot].Info.Settings.Role}`
				toSave[saveName] = {
					"Type": `${bots[bot].Info.Settings.Role}`,
					"Original Role": `${bots[bot].Info.Settings.origRole}`,
					"Side": `${bots[bot].Info.Side}`,
					"Inventory": {}
					}
				toSave[saveName].inventory = AITweaks.listInventoryItems(bots[bot])
			}
			AITweaks.saveToFile(toSave, `doNotTouch/debug/zzSpawned_Bot_Inventories.json`)
		}
		AITweaks.enableLogger()
		//console.log(output)
		
		return bots;
	}
	
	static listInventoryItems(bot)
	{
		let slotList = {
			"FirstPrimaryWeapon": "",
			"SecondPrimaryWeapon": "",
			"Holster": "",
			"Headwear": "",
			"FaceCover": "",
			"Earpiece": "",
			"Eyewear": "",
			"TacticalVest": "",
			"ArmorVest": "",
			"SecuredContainer": "",
			"Backpack": ""
		}
		let parentList = {}
		let childList = {}
		let familyTree = {}
		let inventoryDict = {}
		//First pass: Make the dictionary and hook everything up to its parent
		for (let item of bot.Inventory.items)
		{
			inventoryDict[item._id] = item
			parentList[item._id] = item.parentId
			if (slotList[item.slotId] != undefined)
				slotList[item.slotId] = item._id
		}
		//Create the child list
		for (let childId in parentList)
			if (!childList[parentList[childId]])
				childList[parentList[childId]] = [childId]
			else
				childList[parentList[childId]].push(childId)
		//Create the full tree
		for (let slot in slotList)
		{
			if (slotList[slot])
			{
				familyTree[slot] = {}
				familyTree[slot][AITweaks.getName(inventoryDict[slotList[slot]]._tpl, false)] = AITweaks.recursiveStackChildren(slotList[slot], childList, inventoryDict)
			}
			else
				familyTree[slot] = "Empty"
		}
		return familyTree
	}
	
	static recursiveStackChildren(parentId, childList, inventoryDict)
	{
		let output = {}
		if (childList[parentId])
			for (let childId of childList[parentId])
				output[AITweaks.getName(inventoryDict[childId]._tpl, false)] = AITweaks.recursiveStackChildren(childId, childList, inventoryDict)
		else //If no children
		{
			output = 1
			if (inventoryDict[parentId]?.upd?.StackObjectsCount)
				output = inventoryDict[parentId]?.upd?.StackObjectsCount
		}
		return output
	}
	
	static printObjectAsList(object, level)
	{
		//Todo: Add a check to see if it's an object, and if it isn't, do something a bit different 
		for (let i in object)
		{
			let spacingString = ""
			for (let count = 0; count < level; count++)
				spacingString += "  "
			console.log(spacingString + i)
		}
		
		// if (["string", "number"].includes(typeof stuff[check]))//Check to see if it's not an array or object
				// if (!itemdb[stuff[check]])
				// {
					// Logger.error(`Bwap`)
					// if (stuff.isArray)
						// stuff.splice(check, 1)
					// else
						// delete stuff[check]
				// }
			// else
				// AITweaks.recursiveCheckBotInventory(stuff)
		
		
	}
	
	static getName(tpl, longName)
	{
		let output
		if (database.locales.global.en.templates[tpl])
			output = longName ? database.locales.global.en.templates[tpl].Name : database.locales.global.en.templates[tpl].ShortName
		else if (itemdb[tpl])
			output = itemdb[tpl]._name
		else
			output = tpl
		return output
	}
	
	static saveToFile(data, filePath)
	{
		var fs = require('fs');
				fs.writeFile(modFolder + filePath, JSON.stringify(data, null, 4), function (err) {
				if (err) throw err;
			});
	}
	
	static checkRequired(slot)
	{
		if (slot._wasRequired != undefined)
		{
			if (slot._wasRequired == true)
				return true
		}
		else
			if (slot._required == true)
				return true
		return false
	}
	
	//Switches out a bot's weapon with a random preset weapon. ALso takes care of magazines.
	static swapPresetWeapon(inventory, weaponId, botName, presetNames?)
	{
		let origInventory = AITweaks.clone(inventory)
		let swapOut = AITweaks.clone(inventory.find(i => i._id == weaponId))
		//Using clone because I don't want to eat a player preset by accident
		if (!config.playerId)
			return origInventory
		let presets
		try{
		presets = AITweaks.clone(SaveServer.getProfile(config.playerId).weaponbuilds)//300 may need fixing}
		}
		catch{
			console.log("Error retrieving preset data")
			return origInventory
		}
		
		//Filter out invalid types. IE: No holster weapons if the selected ID isn't for a holster weapon
		for (let check in presets)
		{
			if (itemdb[presets[check].items.find(i => i._id == presets[check].root)._tpl]._props.weapUseType != itemdb[swapOut._tpl]._props.weapUseType)
				delete presets[check]
			if (presets[check] && presets[check].items.find(i => !itemdb[i._tpl]))
				delete presets[check]
		}
		//No presets == no bueno
		if (Object.keys(presets).length == 0)
			return origInventory
		
		//Creating the new weapon
		let pickPreset
		if (presetNames != undefined)
		{
			pickPreset = false
			let depletablePresets = AITweaks.clone(presetNames)
			while (depletablePresets.length > 0)
			{
				let randIndex = RandomUtil.getInt(0, depletablePresets.length - 1)
				if (presets[depletablePresets[randIndex]])
				{
					pickPreset = AITweaks.clone(presets[depletablePresets[randIndex]])
					break
				}
				else
					depletablePresets.splice(randIndex, 1)
			}
			if (pickPreset == false) //No valid presets in the list
				return origInventory
		}
		else
			pickPreset = AITweaks.clone(presets[Object.keys(presets)[RandomUtil.getInt(0, Object.keys(presets).length - 1)]])

		//Preset isn't a valid item
		if (!itemdb[pickPreset.items[pickPreset.items.findIndex(i => i._id == pickPreset.root)]._tpl])
			return origInventory
		
		let idSwap = {}
		for (let part in pickPreset.items)
		{
			idSwap[pickPreset.items[part]._id] = HashUtil.generate()
			if (pickPreset.root == pickPreset.items[part]._id)
				pickPreset.root = idSwap[pickPreset.items[part]._id]
			pickPreset.items[part]._id = idSwap[pickPreset.items[part]._id]
		}
		for (let part in pickPreset.items)
			if (pickPreset.items[part].parentId)
				pickPreset.items[part].parentId = idSwap[pickPreset.items[part].parentId]
		
		//Removing the old weapon
		//Magazines first
		let magSlot = itemdb[swapOut._tpl]._props.Slots.find(i => i._name == "mod_magazine")
		if (magSlot)
		{
			let magList = magSlot._props.filters[0].Filter
			let removedParents = []
			for (let item = 0; item < inventory.length; item++)
				if (magList.includes(inventory[item]._tpl))
				{
					removedParents.push(inventory[item]._id)
					inventory.splice(item, 1)
					item--
				}
			//This is crazy inefficient, I know. But it should work to ensure all parent items are cleanly removed.
			//Note: Need to standardize how parents are removed sometime, because right now there are, like... Three different ways floating around, each with their own ups and downs.
			while (removedParents.length > 0)
			{
				for (let item = 0; item < inventory.length; item++)
					if (inventory[item].parentId == removedParents[0])
					{
						removedParents.push(inventory[item]._id)
						inventory.splice(item, 1)
						item--
					}
				removedParents.splice(0,1)
			}
		}
		let removeWeapon = AITweaks.seperateChildParts(inventory, weaponId, true)
		inventory = removeWeapon[1]
		
		//Add in the new weapon
		let rootIndex = pickPreset.items.findIndex(i => i._id == pickPreset.root)
		let rootItem = pickPreset.items[rootIndex]
		rootItem.slotId = swapOut.slotId
		rootItem.parentId = swapOut.parentId
		inventory.splice(inventory.findIndex(i => i._id == swapOut._id), 1)
		inventory.push(rootItem)
		pickPreset.items.splice(rootIndex, 1)
		for (let item in pickPreset.items)
			inventory.push(pickPreset.items[item])
		
		//Add magazines for the new weapon
		//Check to see if there's already a magazine first
		let newMagsTpl
		let startingMag = pickPreset.items.find(i => i._slotId == "mod_magazine")
		let magCount = 3 //Testing value. Link to bot settings later.
		let availMags = itemdb[rootItem._tpl]._props.Slots.find(i => i._name == "mod_magazine")?._props?.filters[0]?.Filter
		if (availMags == undefined)
		{
			console.log(`Error during preset weapon assignment. Weapon with tpl ${rootItem._tpl} has no mod_magazine slot`)
			return origInventory
		}
		let firstMagId
		if (startingMag)
			newMagsTpl = pickPreset.items.find(i => i._slotId == "mod_magazine")._tpl
		else
		{
			//Totally random for now. Add in size filtering later.
			newMagsTpl = availMags[RandomUtil.getInt(0, availMags.length - 1)]
			firstMagId = HashUtil.generate()
			//Create the starting magazine
			startingMag = {
				"_id": HashUtil.generate(),
				"_tpl": newMagsTpl,
				"parentId": rootItem._id, //If an item is ever added where the magazine doesn't attach to the base item, this will need to be changed
				"slotId": "mod_magazine"
				}
			pickPreset.items.push(startingMag)
			
		}
		let ammoPool = undefined
		for (let slot in botTypes[botName].inventory.mods[rootItem._tpl])
			if (slot.includes("patron_in_weapon"))
			{
				ammoPool = botTypes[botName].inventory.mods[rootItem._tpl][slot]
				break
			}
		if (ammoPool == undefined)
		{
			let chamCart = AITweaks.chamberOrCartridge(newMagsTpl)
			if (chamCart)
			{
				ammoPool = itemdb[newMagsTpl]._props[chamCart][0]._props.filters[0].Filter
			}
			else
				ammoPool = itemdb[newMagsTpl]._props.Slots.find(i => i._props.filters[0].MaxStackCount)._props.filters[0].Filter
			let ammoMin
			let ammoMax
			let absolute
			if (config.AIgearChanges.scavBots.includes(botName))
			{
				ammoMax = config.AIgearChanges["scavs"].ammoRemovePCTGood_Bad[0] / 100
				ammoMin = config.AIgearChanges["scavs"].ammoRemovePCTGood_Bad[1] / 100
				ammoMin = config.AIgearChanges["scavs"].penStyle
			}
			else if (config.AIgearChanges.pmcBots.includes(botName))
			{
				ammoMax = config.AIgearChanges["PMCs"].ammoRemovePCTGood_Bad[0] / 100
				ammoMin = config.AIgearChanges["PMCs"].ammoRemovePCTGood_Bad[1] / 100
				ammoMin = config.AIgearChanges["PMCs"].penStyle
			}
			else if (config.AIgearChanges.raiderBots.includes(botName))
			{
				ammoMax = config.AIgearChanges["raiders"].ammoRemovePCTGood_Bad[0] / 100
				ammoMin = config.AIgearChanges["raiders"].ammoRemovePCTGood_Bad[1] / 100
				ammoMin = config.AIgearChanges["raiders"].penStyle
			}
			else
			{
				ammoMax = 100 / 100
				ammoMin = 0 / 100
			}
			[ammoPool, ammoMin, ammoMax] = AITweaks.getMinMaxPen(rootItem._tpl, [itemdb[rootItem._tpl]._props.ammoCaliber], ammoMin, ammoMax, absolute)
			ammoPool = AITweaks.curateMagazine(ammoPool, ammoMin, ammoMax, [], false)
			if (!botTypes[botName].inventory.mods[rootItem._tpl])
				botTypes[botName].inventory.mods[rootItem._tpl] = {}
			botTypes[botName].inventory.mods[rootItem._tpl].patron_in_weapon = ammoPool
		}
		ammoPool = ammoPool.filter(i => itemdb[i]._props.Caliber == itemdb[rootItem._tpl]._props.ammoCaliber)		
		if (ammoPool.length == 0)
			ammoPool = [itemdb[rootItem._tpl]._props.defAmmo]
		let newAmmoTpl = ammoPool[RandomUtil.getInt(0, ammoPool.length - 1)]
		
		
		//This *SHOULD* be all that's needed, now
		newAmmoTpl = AITweaks.getRandomValueFromWeightedObject(botTypes[botName].inventory.Ammo[itemdb[rootItem._tpl]._props.ammoCaliber])
		
		
		if (!itemdb[newAmmoTpl]) //No valid ammo types, for some reason. Probably only possible on mod-added weapons.
		{
			Logger.error(`Unable to equip bot with weapon preset. Weapon with ID ${rootItem._tpl} has no valid ammo types. Bot will retain its regular weapon instead.`)
			return origInventory
		}
		//Fill the starting magazine
		pickPreset.items.push({
			"_id": HashUtil.generate(),
			"_tpl": newAmmoTpl,
			"parentId": startingMag._id,
			"slotId": "cartridges",
			"upd": {
				"StackObjectsCount": itemdb[newMagsTpl]._props.Cartridges[0]._max_count
			}
		})
		inventory.push({
		"_id": HashUtil.generate(),
		"_tpl": newAmmoTpl,
		"parentId": firstMagId,
		"slotId": "cartridges",
		"upd": {
			"StackObjectsCount": itemdb[newMagsTpl]._props.Cartridges[0]._max_count
		}})
		let addToSc = {}
		addToSc[newAmmoTpl] = itemdb[newAmmoTpl]._props.StackMaxSize * 4
		let secCon = inventory.find(i => i.slotId == "SecuredContainer")
		inventory = AITweaks.addItemsToSC(inventory, addToSc, secCon)
		//These magazines are being added to the main inventory because that's how the addItem function works best at the moment
		let rig = inventory.find(i => i.slotId == "TacticalVest")
		for (let addMag = 0; addMag < magCount; addMag++)
		{
			let a = undefined
			let rigMagTpl
			let exhaustableMagList = new ExhaustableArray(availMags);
			let magId = HashUtil.generate()
			//Iterate randomly through all possible magazines until one is found that fits in the rig
			while (exhaustableMagList.pool.length > 0)
			{
				rigMagTpl = exhaustableMagList.getRandomValue()
				let newMag = {
					"_id": magId,
					"_tpl": rigMagTpl,
					"parentId": rig._id
					}
				a = AITweaks.addItemWithChildrenToOtherItem(rig, newMag._id, newMag._tpl, [newMag], inventory)
				if (a)
					break
			}
			if (a)//If the magazine was added successfully, push some ammo into the magazine
				inventory.push({
				"_id": HashUtil.generate(),
				"_tpl": newAmmoTpl,
				"parentId": magId,
				"slotId": "cartridges",
				"upd": {
					"StackObjectsCount": itemdb[rigMagTpl]._props.Cartridges[0]._max_count
				}})
		}
		return inventory
	}
	
	static limitMagSize(inventory, botName, weaponSlot)
	{
		//These magazines are internal, and should not be placed in bot pouches
		let internalMags = ["587df583245977373c4f1129","5ae0973a5acfc4001562206c"]
		let botClass = "raiders" //default to this
		if (config.AIgearChanges.scavBots.includes(botName.toLowerCase()))
			botClass = "scavs"
		else if (config.AIgearChanges.raiderBots.includes(botName.toLowerCase()))
			botClass = "raiders"
		else if (config.AIgearChanges.pmcBots.includes(botName.toLowerCase()))
			botClass = "PMCs"
		
		let downgradeRange = 0.6
		let downgradeChance = config.AIgearChanges[botClass].magDowngradeChance
		
		let parentWeapon = inventory.find(i => i.slotId == weaponSlot)
		if (!itemdb?.[parentWeapon._tpl]?._props?.Slots || !itemdb[parentWeapon._tpl]._props.Slots.find(i => i._name == "mod_magazine"))
			return inventory//This weapon does not use magazines
		let parentMagSlot = itemdb[parentWeapon._tpl]._props.Slots.find(i => i._name == "mod_magazine")
		let availableMags = parentMagSlot?._props?.filters[0]?.Filter
		if (!availableMags || availableMags.length == 0)
			return inventory
		//Create a list of all eligible mags, sort by size
		let magSizes = {"tpl": [], "size": []}
		for (let mag in availableMags)
		{
			if (internalMags.includes(availableMags[mag]) || !(itemdb?.[availableMags[mag]]?._props?.Cartridges?.[0]?._max_count))
				continue
			magSizes.tpl.push(availableMags[mag])
			magSizes.size.push(itemdb[availableMags[mag]]._props.Cartridges[0]._max_count)
		}
		let sortedMags = AITweaks.sortListByList(magSizes.tpl, magSizes.size)
		//All mags have a chance to be downsized
		for (let item = 0; item < inventory.length; item++)
		{
			//Turn any internal-only mags in their inventory into bullet stacks instead
			if (availableMags.includes(inventory[item]._tpl) && inventory[item].parentId != parentWeapon._id)
			{
				//Just in case
				if (internalMags.includes(inventory[item]._tpl))
				{
					//Assumes there's only one type of bullet in the magazine, for now
					let boolets = inventory.find(i => i.parentId == inventory[item]._id)
						if (boolets)
						{
							inventory[item]._tpl = boolets._tpl
							inventory[item].upd = boolets.upd
							inventory[item].upd.StackObjectsCount ? inventory[item].upd.StackObjectsCount *= 2 : null
							//I don't want to delete anything here, for logistical reasons, so this should make it unusable for all practical purposes
							boolets.parentId = HashUtil.generate()
						}
				}
				
				let sizeIndex = sortedMags.findIndex(i => i == inventory[item]._tpl)
				if (sizeIndex > 0 && RandomUtil.getInt(0, 99) < downgradeChance)
				{
					let slideDown = sizeIndex - RandomUtil.getInt(0, Math.ceil(sortedMags.length * downgradeRange) - 1 <= sizeIndex ? Math.ceil(sortedMags.length * downgradeRange) - 1 : sizeIndex)
					if (slideDown < 0)
						slideDown = 0
					let newItem = AITweaks.clone(inventory[item])
					newItem._tpl = sortedMags[slideDown]
					let parentItem = inventory.find(i => i._id == newItem.parentId)
					inventory.splice(item, 1)
					item--
					/* delete newItem.location
					delete newItem.slotId */
					let a = AITweaks.addItemWithChildrenToOtherItem(parentItem, newItem._id, newItem._tpl, [newItem], inventory)
					if (a)
					{
						inventory = a
						//Make sure bullet count is correct
						//Assumes there's only one type of bullet in the magazine, for now
						let boolets = inventory.find(i => i.parentId == newItem._id)
						if (boolets)
						{
							// console.log(boolets)
							boolets.upd.StackObjectsCount = itemdb?.[sortedMags[slideDown]]?._props?.Cartridges?.[0]?._max_count
							if (boolets.upd.StackObjectsCount == undefined)
								boolets.upd.StackObjectsCount = 30
						}
					}
				}
			}
		}
		return inventory
	}
	
	static getContainerTotalSize(tpl)
	{
		let size = 0
		let item = itemdb[tpl]
		if (item._props.Grids && item._props.Grids.length > 0)
			for (let i in item._props.Grids)
				size += (item._props.Grids[i]._props.cellsH * item._props.Grids[i]._props.cellsV)
		return size
	}
	
	//This returns green if the difficulty entries are identical between the two bots, and red if they aren't.
	//For debugging, obviously
	static compareDiffs(comp1, comp2)
	{
		comp1 = comp1.toLowerCase()
		comp2 = comp2.toLowerCase()
		let count = 0
		for (let diff in database.bots.types[comp1].difficulty)
		{
			if (JSON.stringify(database.bots.types[comp1].difficulty[diff]) == JSON.stringify(database.bots.types[comp2].difficulty[diff]))
				Logger.success(diff)
			else
				Logger.error(diff)
		}
	}
	
	//This must be fed a list of elligible tactical items. Optics can be figured out programatically
	static listTacticalAccessories(weapon, tacticalItems)
	{
		let tacticals = {}
		let optics = {}
		for (let i in weapon)
		{
			let id = weapon[i]._tpl
			let item = itemdb[id]
			if (["55818ad54bdc2ddc698b4569", "55818add4bdc2d5b648b456f", "55818acf4bdc2dde698b456b", "55818ae44bdc2dde698b456c", "55818aeb4bdc2ddc698b456a"].includes(item._parent))
			{
				// optics[weapon[i]._id] = Math.floor((handbook.Items[weapon[i]._tpl].Price / item._props.SpawnChance) / 1000)
				optics[weapon[i]._id] = handbook.Items.find(i => i.Id == id).Price
			}
			else if (tacticalItems.includes(weapon[i]._tpl))
			{
				// tacticals[weapon[i]._id] = Math.floor((handbook.Items[weapon[i]._tpl].Price / item._props.SpawnChance) / 10)
				tacticals[weapon[i]._id] = handbook.Items.find(i => i.Id == id).Price
			}
		}
		return [tacticals, optics]
	}
	
	//removed items from donor and places them in receiver until receiver is full or all items are transfered
	//Will accept a series of premade filters and run them in order: "magazines", "grenades", "meds", etc., and an "all" filter.
	static transferItems(inventory, donorEntry, receiverEntry, filters)
	{
		//Pull both items out of the main inventory
		let donorId = donorEntry._id
		let receiverId = receiverEntry._id
		let donor = AITweaks.seperateChildParts(inventory, donorId, false)[0]
		let receiver = AITweaks.seperateChildParts(inventory, receiverId, false)[0]
		for (let filter in filters)
		{
			for (let itemId = 0; itemId < donor.length; itemId++)
			{
				let item = itemdb[donor[itemId]._tpl]
				if (filters[filter] == "magazines" && item._props.Cartridges && item._props.Cartridges[0]._max_count > 1)
				{
					let a = AITweaks.addItemWithChildrenToOtherItem(receiverEntry, donor[itemId]._id, donor[itemId]._tpl, [donor[itemId]], receiver)
					if (a)
					{
						receiver = a
						donor.splice(itemId, 1)
						itemId--
					}
				}
				else if (filters[filter] == "all")
				{
					let a = AITweaks.addItemWithChildrenToOtherItem(receiverEntry, donor[itemId]._id, donor[itemId]._tpl, [donor[itemId]], receiver)
					if (a)
					{
						receiver = a
						donor.splice(itemId, 1)
						itemId--
					}
				}

			}
		}
		inventory = AITweaks.cleanArray(inventory)
		let deleteList = AITweaks.recursiveDeleteChildren(inventory, donorId, [inventory.findIndex(i => i._id == donorId)])
		for (let i in deleteList)
			delete inventory[deleteList[i]]
		for (let i in receiver)
			inventory.push(receiver[i])
		return [inventory, true]
	}
	
	static seperateChildParts(inventory, parentId, recursive)
	{
		//Pull relevant child parts out of the main inventory for ease of modification
		//These literally leave the main inventory list, so be aware, the need to be re-added at the end
		//This does not include the main parent item itself
		let weaponParts
			weaponParts = AITweaks.recursiveGetChildren(inventory, {}, {}, parentId)[1]
		
		let weapon = []
		//make sure to add the weapon itself to this list
		for (let part in weaponParts)
		{
			if (!recursive && inventory[weaponParts[part]].parentId != parentId)
				continue
			weapon.push(inventory[weaponParts[part]])
			if (inventory[weaponParts[part]])
				delete inventory[weaponParts[part]]
		}
		inventory = AITweaks.cleanArray(inventory)
		return [weapon, inventory]
	}
	
	//Part needs to be formatted like it's an inventory item entry
	static reduceDurability(part, min, max, reduceMax)
	{
		if (!min || !max)
			return
		if (part._tpl && part.upd && part.upd.Repairable && part.upd.Repairable.Durability)
			null
		else
		{
			// console.log(`Part not elligible for durability changes`)
			return
		}
		let item = itemdb[part._tpl]
		if (!item._props.MaxDurability)
			return
		let reduceMult = (RandomUtil.getInt(min, max) / 100)
		let reduceMultCurrent = (RandomUtil.getInt(min, max) / 100)
		reduceMult > 1 ? reduceMult = 1 : null
		reduceMultCurrent > 1 ? reduceMultCurrent = 1 : null
		if (reduceMax)
		{
			part.upd.Repairable.MaxDurability = item._props.MaxDurability * reduceMult
			part.upd.Repairable.Durability = part.upd.Repairable.MaxDurability
		}
		else
		{
			part.upd.Repairable.Durability *= reduceMultCurrent
			// console.log(`${min} ${max} ${reduceMultCurrent} ${part.upd.Repairable.Durability} / ${part.upd.Repairable.MaxDurability}`)
			//If progressive gear is enabled, all gear can always be repaired up to 60% durability after raid (The point at which is can be sold)
			if (config.miscChanges.enableProgressiveGear && !config.disableAllGearChanges && part.upd.Repairable.MaxDurability < item._props.Durability * 0.65)
				part.upd.Repairable.MaxDurability = item._props.Durability * RandomUtil.getFloat(0.63, 0.7)
				
		}
		part.upd.Repairable.MaxDurability > item._props.MaxDurability ? part.upd.Repairable.MaxDurability = item._props.MaxDurability : null
		part.upd.Repairable.Durability > part.upd.Repairable.MaxDurability ? part.upd.Repairable.Durability = part.upd.Repairable.MaxDurability : null
		part.upd.Repairable.MaxDurability < 0 ? part.upd.Repairable.MaxDurability = 0
		: null
		part.upd.Repairable.Durability < 0 ? part.upd.Repairable.Durability = 0 : null
	}
	
	//For purposes of not creating excess weapon-gen errors
	static disableLogger()
	{
		Logger.error = function(data){null}
		Logger.warning = function(data){null}
	}
	static enableLogger()
	{
		Logger.error = function(data){Logger.log(`[ERROR] ${data}`, "white", "red");}
		Logger.warning = function(data){Logger.log(`[WARNING] ${data}`, "white", "yellow");}
	}
	
	//Re-generates a bot
	static regenBot(bot, regenInventory, pmcSide, sessionId)
	{
		let role = bot.Info.Settings.Role.toLowerCase()
		if (bot.Info.Settings.origRole)
			role = bot.Info.Settings.origRole.toLowerCase()
		if (pmcSide)
			if (botNameSwaps[pmcSide.toLowerCase()])
				role = botNameSwaps[pmcSide.toLowerCase()]
			else
				role = pmcSide.toLowerCase()
		const node = database.bots.types[role.toLowerCase()];

		containerC.resolve("BotGenerator")
		const levelResult = botGenerator.generateRandomLevel(node.experience.level.min, node.experience.level.max);

		bot.Info.Nickname = `${RandomUtil.getArrayValue(node.firstName)} ${RandomUtil.getArrayValue(node.lastName) || ""}`;
		bot.Info.Experience = levelResult.exp;
		bot.Info.Level = levelResult.level;
		bot.Info.Settings.Experience = RandomUtil.getInt(node.experience.reward.min, node.experience.reward.max);
		bot.Info.Settings.StandingForKill = node.experience.standingForKill;
		bot.Info.Voice = RandomUtil.getArrayValue(node.appearance.voice);
		bot.Health = botGenerator.generateHealth(node.health);
		bot.Skills = botGenerator.generateSkills(node.skills);
		bot.Customization.Head = RandomUtil.getArrayValue(node.appearance.head);
		bot.Customization.Body = RandomUtil.getArrayValue(node.appearance.body);
		bot.Customization.Feet = RandomUtil.getArrayValue(node.appearance.feet);
		bot.Customization.Hands = RandomUtil.getArrayValue(node.appearance.hands);
		if (regenInventory)
		{
			bot.Inventory = BotInventoryGenerator.generateInventory(sessionId, node.inventory, node.chances, node.generation, role, (pmcSide) ? true: false);
			
			let backpack = bot.Inventory.items.find(i => i.slotId == "Backpack")
			
			let whileCount = 0
			while (!bot.Inventory.items.find(i => ["FirstPrimaryWeapon", "SecondPrimaryWeapon", "Holster"].includes(i.slotId)))
				{
					whileCount++
					bot.Inventory = BotInventoryGenerator.generateInventory(node.inventory, node.chances, node.generation, role, (pmcSide) ? true: false);
					if (whileCount > 3)
					{
						if (false)
						{
							console.log(`Bot with node of ${role} and role of ${bot.Info.Settings.Role} spawned without a valid weapon`)
							console.log(`Length of FP, SP, H node slots = ${Object.keys(node.inventory.equipment.FirstPrimaryWeapon).length}, ${Object.keys(node.inventory.equipment.SecondPrimaryWeapon).length}, ${Object.keys(node.inventory.equipment.Holster).length}`)
						}
						break
					}
				}
			if (role.toLowerCase() == botNameSwaps.usec || role.toLowerCase() == botNameSwaps.bear)
			{
				bot = botGenerator.generateDogtag(bot);
			}
		}
		return bot
	}
	
	//This has gotten messy as hell, and should probably be made a little more flexible, but at this point, given what I've learned about bot difficulties, I'm not sure it's worth the trouble.
	static createSwitchBoard()
	{
		if (!database.globals.config.FinsBotSwitching)
			return [false, false]
		let LLBoard = {	"default": 0 }
			LLBoard[database.globals.config.FinsBotSwitching.LLB] = 0
			LLBoard[database.globals.config.FinsBotSwitching.LLA] = 0
			LLBoard[database.globals.config.FinsBotSwitching.LLR] = 0
		let MLBoard = {	"default": 0 }
			MLBoard[database.globals.config.FinsBotSwitching.MLB] = 0
			MLBoard[database.globals.config.FinsBotSwitching.MLA] = 0
			MLBoard[database.globals.config.FinsBotSwitching.MLR] = 0
		let HLBoard = {	"default": 0 }
			HLBoard[database.globals.config.FinsBotSwitching.HLB] = 0
			HLBoard[database.globals.config.FinsBotSwitching.HLA] = 0
			HLBoard[database.globals.config.FinsBotSwitching.HLR] = 0
		
		let switchBoard = {}

		let botsToSwitch = []

		for (let botCat in config.aiChanges.changeBots)
			for (let bot in config.aiChanges.changeBots[botCat])
				if (!botsToSwitch.includes(config.aiChanges.changeBots[botCat][bot].toLowerCase()))
					botsToSwitch.push(config.aiChanges.changeBots[botCat][bot].toLowerCase())
		for (let bot in LLBoard)
			if (!botsToSwitch.includes(bot.toLowerCase()) && bot != "default")
				botsToSwitch.push(bot.toLowerCase())
		for (let bot in MLBoard)
			if (!botsToSwitch.includes(bot.toLowerCase()) && bot != "default")
				botsToSwitch.push(bot.toLowerCase())
		for (let bot in HLBoard)
			if (!botsToSwitch.includes(bot.toLowerCase()) && bot != "default")
				botsToSwitch.push(bot.toLowerCase())
		for (let bot in botsToSwitch)
			botsToSwitch[bot] = properCaps[botsToSwitch[bot]]
		let switchOptions = [database.globals.config.FinsBotSwitching.LLB,
			database.globals.config.FinsBotSwitching.LLA,
			database.globals.config.FinsBotSwitching.LLR,
			database.globals.config.FinsBotSwitching.MLB,
			database.globals.config.FinsBotSwitching.MLA,
			database.globals.config.FinsBotSwitching.MLR,
			database.globals.config.FinsBotSwitching.HLB,
			database.globals.config.FinsBotSwitching.HLA,
			database.globals.config.FinsBotSwitching.HLR
			]

		let LLSwitch = {"assault": config.AIbehaviourChanges.lowLevelAIs["default"]}
		LLSwitch[database.globals.config.FinsBotSwitching.LLB] = config.AIbehaviourChanges.lowLevelAIs.balanced
		LLSwitch[database.globals.config.FinsBotSwitching.LLA] = config.AIbehaviourChanges.lowLevelAIs.aggressive
		LLSwitch[database.globals.config.FinsBotSwitching.LLR] = config.AIbehaviourChanges.lowLevelAIs.ranged
		let MLSwitch = {"pmcBot": config.AIbehaviourChanges.midLevelAIs["default"]}
		MLSwitch[database.globals.config.FinsBotSwitching.MLB] = config.AIbehaviourChanges.midLevelAIs.balanced
		MLSwitch[database.globals.config.FinsBotSwitching.MLA] = config.AIbehaviourChanges.midLevelAIs.aggressive
		MLSwitch[database.globals.config.FinsBotSwitching.MLR] = config.AIbehaviourChanges.midLevelAIs.ranged
		let HLSwitch = {}
		HLSwitch[PMCSwap] = config.AIbehaviourChanges.highLevelAIs["default"]
		HLSwitch[database.globals.config.FinsBotSwitching.HLB] = config.AIbehaviourChanges.highLevelAIs.balanced
		HLSwitch[database.globals.config.FinsBotSwitching.HLA] = config.AIbehaviourChanges.highLevelAIs.aggressive
		HLSwitch[database.globals.config.FinsBotSwitching.HLR] = config.AIbehaviourChanges.highLevelAIs.ranged
		for (let botName in botsToSwitch)
		{
			botName = botsToSwitch[botName]
			if (!botName)
				continue
			let botCat
			if (config.aiChanges.changeBots.lowLevelAIs.includes(botName.toLowerCase()))
			{
				botCat = "lowLevelAIs"
				switchBoard[botName] = AITweaks.clone(LLSwitch)
			}
			else if (config.aiChanges.changeBots.midLevelAIs.includes(botName.toLowerCase()))
			{
				botCat = "midLevelAIs"
				switchBoard[botName] = AITweaks.clone(MLSwitch)
			}
			else if (config.aiChanges.changeBots.highLevelAIs.includes(botName.toLowerCase()))
			{
				botCat = "highLevelAIs"
				switchBoard[botName] = AITweaks.clone(HLSwitch)
			}
			else
			{
				// switchBoard[botName] = {"default": {"chance": 1}}
				continue
			}
		}
		for (let bot in switchOptions)
			if (!switchBoard[switchOptions[bot]])
				switchBoard[switchOptions[bot]] = {"pmcBot": {"chance": 1}}
		switchBoard["exusec"] = {"exusec": {"chance": 1}}
		
		let switchChances = {}
		for (let mainBot in switchBoard)
		{
			switchChances[mainBot] = []
			for (let switchBot in switchBoard[mainBot])
				for (let i = 0; i < switchBoard[mainBot][switchBot]; i++)
						switchChances[mainBot].push(switchBot)
		}
		return [switchBoard, switchChances]
	}
	
	//ADds all items in itemList to the secure container
	static addItemsToSC(inventory, itemList, secCon)
	{
		for (let itemID in itemList)
		{
			let item = database.templates.items[itemID]
			
			let randId = HashUtil.generate()
				const itemsToAdd = [{
								"_id": randId,
								"_tpl": item._id,
								...botGeneratorHelper.generateExtraPropertiesForItem(item)
							}]
			if (itemList[itemID] > 1)
			{
				if (!itemsToAdd[0].upd)
					itemsToAdd[0].upd = {}
				itemsToAdd[0].upd.StackObjectsCount = itemList[itemID]
			}
			let a = AITweaks.addItemWithChildrenToEquipmentSlot("SecuredContainer", randId, item._id, itemsToAdd, inventory)
				if (a != false)
					inventory = a
		}
		return inventory
	}
	
	//Adds extra healing items to the SC
	//Also multiplies all ammo in the SC by 100, if the appropriate config option is enabled
	static modifySCItems(inventory, secCon, isPmc)
	{
		if (secCon == undefined)
		{
			inventory.find(i => i.slotId == "SecuredContainer")
			if (secCon == undefined)
				return
		}
		let itemList = {}
		if (config.overallDifficultyMultipliers.infiniteAIHealing_PMCs_All_false == "All" || config.overallDifficultyMultipliers.infiniteAIHealing_PMCs_All_false == "PMCs" && isPmc)
			itemList["5e99735686f7744bfc4af32c"] = 1//Sanitar's medkit
		if (config.overallDifficultyMultipliers.infiniteAIAmmo == true)
			for (let i in inventory)
				if (inventory[i].parentId == secCon._id && database.templates.items[inventory[i]._tpl]._props.PenetrationPower && database.templates.items[inventory[i]._tpl]._props.PenetrationPower > 0)//is it a bullet?
					if (inventory[i].upd.StackObjectsCount)
					{
						inventory[i].upd.StackObjectsCount *= 100
					}
		return inventory
	}
	
	static addMagToBotWeapon(primaryWep, weapon, inventory)
	{
		let mag = AITweaks.checkForMagazine(inventory, primaryWep._tpl, [])
		if (mag)
		{
			let magToAdd = {
			_id: HashUtil.generate(),
			_tpl: mag,
			parentId: primaryWep._id,
			slotId: "mod_magazine",
			...botGeneratorHelper.generateExtraPropertiesForItem(itemdb[mag])
			}
			weapon.push(magToAdd)
			//Logger.info(`Added magazine ${mag} to weapon with id ${primaryWep._id}`)
		}
		return weapon
	}
	
	static findLastNonRequiredParent(inventory, childId, parentId, slotName, prevChildId)
	{
		let parentItem = inventory.find(i => i._id == parentId)
		if (!parentItem)
			return childId
		let slot = itemdb[parentItem._tpl]._props.Slots.find(i => i._name == slotName)
		// console.log(`${AITweaks.checkRequired(slot)}   ${slotName} ${childId}`)
		if (slot && AITweaks.checkRequired(slot))
			return prevChildId
		else if (!parentItem.parentId || !parentItem.slotId || itemdb[parentItem._tpl]._props.weapUseType != undefined)
			return childId
		return AITweaks.findLastNonRequiredParent(inventory, parentItem._id, parentItem.parentId, parentItem.slotId, childId)
	}
	
	//I really, really need to standardize these >_>;
	static recursiveGetChildIDs(parentId, parentList, children)
	{
		if (children == undefined)
			children = []
		if (parentList[parentId] != undefined)
			children.push(...parentList[parentId])
		else
			return children
		for (let item of parentList[parentId])
			children = AITweaks.recursiveGetChildIDs(item, parentList, children)
		return children
	}
	
	static createParentList(inventory)
	{
		let idLookup = {}
		let parentList = {}
		for (let item of inventory)
		{
			if (item.parentId)
				parentList[item.parentId] ? parentList[item.parentId].push(item._id) : parentList[item.parentId] = [item._id]
			idLookup[item._id] = item._tpl
		}
		return [parentList, idLookup]
	}
	
	static deleteChildren(inventory, parentId, parentList, idLookup)
	{
		inventory.splice(inventory.findIndex(i => i._id == parentId), 1)
		if (parentList[parentId])
			for (let id of parentList[parentId])
				inventory = AITweaks.deleteChildren(inventory, id, parentList, idLookup)
		return inventory
	}
	
	/* 
		parentList looks like:
		{
			"parent1": ["tpl1", "tpl2",],
			"parent2": ["tpl1", "tpl2",],
			"parent3": ["tpl1", "tpl2",]
		}
	*/
	
	//Something about this isn't working properly, and sometimes extra optics slip through
	static trimOptics(weapon, opticsItems, maxPrimaryOptics)
	{
		let parentList
		let idLookup
		[parentList, idLookup] = AITweaks.createParentList(weapon)
		// let childIds = AITweaks.recursiveGetChildIDs(mainId, parentList)
		
		let opticsIds = []
		for (let item of weapon)
			if (opticsItems.includes(item._tpl))
			{
				let rootId = AITweaks.findLastNonRequiredParent(weapon, item._id, item.parentId, item.slotId, null)
				// console.log(rootId)
				if (!opticsIds.includes(rootId))
					opticsIds.push(rootId)
			}
		while (opticsIds.length > maxPrimaryOptics)
		{
			let randomIndex = RandomUtil.getInt(0, opticsIds.length - 1)
			let randomId = opticsIds[randomIndex]
			// console.log(`Removed optic with id ${randomId}`)
			weapon = AITweaks.deleteChildren(weapon, randomId, parentList, idLookup)
			opticsIds.splice(randomIndex, 1)
		}
		return weapon
	}
	
	static trimTacticals(weapon, tacticalItems, maxTacticalDevices)
	{
		let parentList
		let idLookup
		[parentList, idLookup] = AITweaks.createParentList(weapon)
		// let childIds = AITweaks.recursiveGetChildIDs(mainId, parentList)
		
		let tacticalIds = []
		for (let item of weapon)
			if (tacticalItems.includes(item._tpl))
				tacticalIds.push(item._id)
		while (tacticalIds.length > maxTacticalDevices)
		{
			let randomIndex = RandomUtil.getInt(0, tacticalIds.length - 1)
			let randomId = tacticalIds[randomIndex]
			weapon = AITweaks.deleteChildren(weapon, randomId, parentList, idLookup)
			tacticalIds.splice(randomIndex, 1)
		}
		return weapon
	}
	
	static modifyMedicalInventory(inventory, invMeds, medValuePyramid, medsItems, isPmc)
	{
		//Meds section
		for (let cat in invMeds) //Sort all meds items by value
		{
			// console.log(cat)
			let tempValues = []
			let tempLocations = []
			for (let i = 0; i < invMeds[cat].values.length; i++)
			{
				let max = invMeds[cat].values.reduce((iMax, x, n, arr) => x > arr[iMax] ? n : iMax, 0);

				tempValues.push(invMeds[cat].values[max])
				tempLocations.push(invMeds[cat].locations[max])
				invMeds[cat].values.splice(max, 1)
				invMeds[cat].locations.splice(max, 1)
			}
			invMeds[cat].values = tempValues
			invMeds[cat].locations = tempLocations
		}
		
		// console.log(invMeds)
		let looseValue = 0 //Records 'free' value to be spread into other categories
		for (let cat in invMeds)
		{
			//medValuePyramid looks like: {"cat":{"name": price}}
			if (invMeds[cat].totalValue > invMeds[cat].maximum)
				//Maybe make this a while loop?
			{
				let prevTotalValue = invMeds[cat].totalValue
				for (let invItem in invMeds[cat].values)//Should be organized highest value to lowest
				{
					let deletedItem = inventory[invMeds[cat].locations[invItem]]
					inventory[invMeds[cat].locations[invItem]] = {
					"_id": "",
					"_tpl": "",
					"parentId": "",
					"slotId": ""
					}
					invMeds[cat].totalValue = invMeds[cat].totalValue * 1 - invMeds[cat].values[invItem]
					for (let i in medValuePyramid[cat])
						if (invMeds[cat].values[invItem] > medValuePyramid[cat][i])
						{
							let nextLowestTpl = medsItems[i][0]
							let nextLowestItem = database.templates.items[nextLowestTpl]
							// console.log(`Attempting to replace with ${medsItems[nextLowestTpl]}`)
							const itemsToAdd = [{
								"_id": deletedItem._id,
								"_tpl": nextLowestTpl,
								...botGeneratorHelper.generateExtraPropertiesForItem(nextLowestItem)
							}];
							let a = AITweaks.addItemWithChildrenToEquipmentSlot(["Pockets", "TacticalVest", "Backpack"], deletedItem._id, nextLowestTpl, itemsToAdd, inventory)
							if (a != false)
							{
								// console.log(`Replacement successful`)
								inventory = a
								//Put the new item in the old item's spot. This is to avoid disrupting the already-collected indexes
								inventory[invMeds[cat].locations[invItem]] = inventory[inventory.length - 1]
								inventory.splice(inventory.length - 1, 1)
								//Adjust the totalValue entry
								invMeds[cat].values[invItem] = medValuePyramid[cat][i]
								invMeds[cat].totalValue = invMeds[cat].totalValue * 1 + invMeds[cat].values[invItem]
								break
							}
							//Perform a check to see if that item could potentially fit, if not, move to the next lowest item
							//Also (first) check to see if the item is equal to or smaller than the item it would be replacing. If it is, don't bother doing the check
						}
					if (!invMeds[cat].totalValue > invMeds[cat].maximum)
						break
					null//Check if lowering the item's tier is possible. If so, lower the item's tier, check to see if we're below the maximum, and if not, proceed to the next item
				}
				//console.log(`${looseValue} += ${prevTotalValue} - ${invMeds[cat].totalValue}`)
				looseValue += prevTotalValue - invMeds[cat].totalValue
			}
			//I should make this into a neat, separate little function, but my allergies are kicking my ass, so whatever. PUT IT ON THE LIST!
			let randomActualValue = (RandomUtil.getInt(invMeds[cat].minimum, invMeds[cat].maximum))
			while (invMeds[cat].minimum >= 0 && invMeds[cat].totalValue < randomActualValue)
				//This should add things until it's *over* the minimum value.
				//Scratch that. More useful to just randomly pick a max value and build up to that.
			{
				let valueGap = randomActualValue - invMeds[cat].totalValue
				let highestAvailIndex = -1
				//Find the 'index' of the most valuable item that can fit in the category
				for (let i = 0; i < Object.keys(medValuePyramid[cat]).length; i++)
				{
					let a = Object.keys(medValuePyramid[cat])[i]
					if (medValuePyramid[cat][a] > valueGap)
					{
						highestAvailIndex = i - 1
						break
					}
					else if (medValuePyramid[cat][a] <= valueGap)
						highestAvailIndex = i
				}
				if (highestAvailIndex >= 0)
				{
					//let randIndex = RandomUtil.getInt(0, highestAvailIndex)
					let randIndex = highestAvailIndex //This should make it add the most valuable item possible, every time.
					let randItemName = Object.keys(medValuePyramid[cat])[randIndex]
					let randItemTpl = medsItems[randItemName][0]
					let randItem = database.templates.items[randItemTpl]
					let randItemValue = medsItems[randItemName][1]
					let randId = HashUtil.generate()
					const itemsToAdd = [{
									"_id": randId,
									"_tpl": randItemTpl,
									...botGeneratorHelper.generateExtraPropertiesForItem(randItem)
								}];
					let a = AITweaks.addItemWithChildrenToEquipmentSlot(["Pockets", "TacticalVest", "Backpack"], randId, randItemTpl, itemsToAdd, inventory)
					if (a != false)
					{
						inventory = a
						// console.log(`New item added (${randItem._name}) to bot with ${cat} value of ${invMeds[cat].totalValue}`)
						//Adjust the totalValue entry
						invMeds[cat].locations.push(inventory.length - 1)
						invMeds[cat].values.push(randItemValue)
						invMeds[cat].totalValue += randItemValue
						// console.log(`New total value is ${invMeds[cat].totalValue}. Target value is ${randomActualValue}`)
					}
					else //This probably only triggers if their inventory is full
						break
				}
				else
					break
			}
		}
		let availableCats = []
		if (looseValue > 0)
			for (let cat in invMeds) //medValuePyramid[cat][0] should be the lowest value med
			{
				let pyramidCats = Object.keys(medValuePyramid[cat])
			//console.log(`${invMeds[cat].totalValue} - ${invMeds[cat].maximum} > ${medValuePyramid[cat][pyramidCats[0]]}`)
				//console.log(pyramidCats[0])
				if (invMeds[cat].maximum - invMeds[cat].totalValue > medValuePyramid[cat][pyramidCats[0]])
					availableCats.push(cat)
			}
		looseValue = 0 //Disabling this part for now
		while (looseValue > 0 && availableCats.length > 0)
		{
			let randomCat = availableCats[RandomUtil.getInt(0, (availableCats.length - 1))]
			//console.log(`Adding item to ${randomCat}`)
			// console.log(medValuePyramid)
			let valueGap = invMeds[randomCat].totalValue - invMeds[randomCat].maximum
			let highestAvailIndex = -1
			//Find the 'index' of the most valuable item that can fit in the category
			for (let i = 0; i < Object.keys(medValuePyramid[randomCat]).length; i++)
			{
				let a = Object.keys(medValuePyramid[randomCat])[i]
				if (medValuePyramid[randomCat][a] > valueGap)
					highestAvailIndex = i - 1
				else if (medValuePyramid[randomCat][a] <= valueGap)
					highestAvailIndex = i
			}
			if (highestAvailIndex >= 0)
			{
				let randIndex = RandomUtil.getInt(0, highestAvailIndex)
				let randItemName = Object.keys(medValuePyramid[randomCat])[randIndex]
				let randItemTpl = medsItems[randItemName][0]
				let randItem = database.templates.items[randItemTpl]
				let randItemValue = medsItems[randItemName][1]
				let randId = HashUtil.generate()
				const itemsToAdd = [{
								"_id": randId,
								"_tpl": randItemTpl,
								...botGeneratorHelper.generateExtraPropertiesForItem(randItem)
							}];
				let a = AITweaks.addItemWithChildrenToEquipmentSlot(["Pockets", "TacticalVest", "Backpack"], randId, randItemTpl, itemsToAdd, inventory)
				if (a != false)
				{
					inventory = a
					// console.log(`New item added (${randItem._name})`)
					//Adjust the totalValue entry
					invMeds[randomCat].locations.push(inventory.length - 1)
					invMeds[randomCat].values.push(randItemValue)
					invMeds[randomCat].totalValue += randItemValue
					looseValue -= randItemValue
				}
				else //This probably only triggers if their inventory is full
					break
			}
			//Re-check available categories
			availableCats = []
			for (let cat in invMeds) //medValuePyramid[cat][0] should be the lowest value med
			{
				let pyramidCats = Object.keys(medValuePyramid[cat])
				//console.log(pyramidCats[0])
				if (invMeds[cat].maximum - invMeds[cat].totalValue > medValuePyramid[cat][pyramidCats[0]])
					availableCats.push(cat)
			}
		}
		//This is a list of items that, if found in the bot's inventory, will be removed without replacement.
		let prohibitedItems = ["CODJUICE"]
		for (let inv = 0; inv < inventory.length; inv++)
		{
			let invItem = inventory[inv]
			if (invItem._tpl == "5e831507ea0a7c419c2f9bd9" && isPmc) //PMCs get CAT tourniquets
				invItem._tpl = "60098af40accd37ef2175f27"
			else if (invItem._tpl == "60098af40accd37ef2175f27" && !isPmc)
				invItem._tpl = "5e831507ea0a7c419c2f9bd9"
			if (prohibitedItems.includes(invItem._tpl))
				inventory.splice(inv, 1)
		}
		//If there are any meds present, perform checks to see if their distribution makes sense. Do this by bot type. IE: Look for more than X tourniquet items, and if there are more than X, remove one and give them something else instead.
		//Also perform checks by bot type. If they're PMCS, for instance, increase the odds of them carrying good meds
		return inventory
	}
	
	static modifyInventoryItems(inventory, role, medsItems, medValuePyramid, isPmc, medsCategories?)
	{
		//General inventory check. This will be used to alter loot, meds, and pretty much anything else that isn't guns or gear.
		let botCategory
		
		if (advIConfig.botCategories.lowLevelAIs.includes(role.toLowerCase()))
			botCategory = "lowLevelAIs"
		else if (advIConfig.botCategories.midLevelAIs.includes(role.toLowerCase()))
			botCategory = "midLevelAIs"
		else if (advIConfig.botCategories.highLevelAIs.includes(role.toLowerCase()))
			botCategory = "highLevelAIs"
		else //Undefined bots. This probably includes bosses
			botCategory = undefined
		
		let invMeds = {
			"medkits": "",
			"painkillers": "",
			"bandages": "",
			"splints": "",
			"surgicals": "",
			"tourniquets": ""
		}
		for (let i in invMeds)
		{
			invMeds[i] = {
				"locations": [],
				"values": [],
				"totalValue": 0,
				"maximum": botCategory ? RandomUtil.getInt(advIConfig.medicalInventory[botCategory].valuesAbsoluteMin_MinMax_MaxMax[i][1], advIConfig.medicalInventory[botCategory].valuesAbsoluteMin_MinMax_MaxMax[i][2]): 100000,
				"minimum": botCategory ? advIConfig.medicalInventory[botCategory].valuesAbsoluteMin_MinMax_MaxMax[i][0] : -1
			}
		}
		for (let inv in inventory)
		{
			let invItem = inventory[inv]
			//medsItems looks like this: "name": ["tpl", value],
			//							 "tpl": "name"						
			if (medsItems[invItem._tpl]) //Check if it's a med by matching with the tpl
				for (let cat in medsCategories)
					if (medsCategories[cat].includes(medsItems[invItem._tpl])) //Determine category
					//medsItems[invItem._tpl]] should be the ite's name entry
					//medsItems[medsItems[invItem._tpl]][1] should be the value entry
					{//Now cat = the type of med
						invMeds[cat].locations.push(inv)
						// console.log(invMeds[cat].locations)
						invMeds[cat].values.push(medsItems[medsItems[invItem._tpl]][1])
						invMeds[cat].totalValue = invMeds[cat].totalValue * 1 + medsItems[medsItems[invItem._tpl]][1]
						break
					}
		}
		if (advIConfig.medical_inventory_changes_enabled && (botCategory && advIConfig.medicalInventory[botCategory].medical_changes_enabled))
			inventory = AITweaks.modifyMedicalInventory(inventory, invMeds, medValuePyramid, medsItems, isPmc)
		return inventory
	}
	
	static findItemByID(inventory, ID)
	{
		return inventory.find(i => i._id == ID)
	}
	
	static findItemIndexByID(inventory, ID)
	{
		return inventory.findIndex(i => i._id == ID)
	}
	
	static checkForMagazine(inventory, parentTpl, filter)
	{
		let magSlot = itemdb[parentTpl]._props.Slots.find(i => i._name == "mod_magazine")
		if (!magSlot)
			return false
		let weaponMags = magSlot._props.filters[0].Filter
		//Filter is a list of magazine tpls to ignore
		//itemdb[parentTpl]._props.Slots.find(i => i._name == "mod_magazine")._props.filters[0].Filter.includes
		for (let item in inventory)
		{
			let tpl = inventory[item]._tpl
			if (itemdb[tpl] && itemdb[tpl]._props && itemdb[tpl]._props.Cartridges && !filter.includes(itemdb[tpl]))
				if (parentTpl)
				{
					if (weaponMags && weaponMags.includes(tpl))
						return tpl
					else
						null
				}
				else
					return tpl
		}
		return false
	}
	
	static recursiveCheckBotInventory(stuff)
	{
		for (let check in stuff)
			if (["string", "number"].includes(typeof stuff[check]))//Check to see if it's not an array or object
				if (!itemdb[stuff[check]])
				{
					Logger.error(`Bwap`)
					if (stuff.isArray)
						stuff.splice(check, 1)
					else
						delete stuff[check]
				}
			else
				AITweaks.recursiveCheckBotInventory(stuff)
	}
	
	static recursiveDeleteChildren(inventory, parentID, deleteIndexes)
	{
		for (let item in inventory)
			if (inventory[item].parentId == parentID)
			{
				if (!deleteIndexes.includes(item))
					deleteIndexes.push(item)
				deleteIndexes = AITweaks.recursiveDeleteChildren(inventory, inventory[item]._id, deleteIndexes)
			}
		return deleteIndexes
	}
	
	static recursiveGetChildren(inventory, childTree, childList, parentID)
	{
		for (let item in inventory)
			if (inventory[item].parentId == parentID)
			{
					if (!childTree[parentID])
						childTree[parentID] = []
					//childTree[parentID].push(inventory[item]._id)
					//Altering this into a debug function for now
					if (database.templates.items[inventory[item]._tpl] == undefined)
					{
						console.log(item)
						console.log(inventory[item])
					}
					//console.log(database.templates.items[inventory[item]._tpl]._name)
					childList[inventory[item]._id] = item
					let a = AITweaks.recursiveGetChildren(inventory, childTree, childList, inventory[item]._id)
					childTree = a[0]
					childList = a[1]
			}
		return [childTree, childList]
	}
	
	//Coppied from AKI's files because I need to change a few little things when I call it.
	static addItemWithChildrenToEquipmentSlot(equipmentSlots, parentId, parentTpl, itemWithChildren, transplantInventory)
	{
		for (const slot of equipmentSlots)
		{
			let container = transplantInventory.find(i => i.slotId === slot)
			if (slot.includes("Stash")) //If you want it to add to the stash, you need to enter it as Stashkbasdhfb23123 (Where the random characters are the stash's ID, accessible as [bot].Inventory.stash)
				container = transplantInventory.find(i => i.slotId === slot.substr(0,(slot.length - 5)))

			if (!container)
			{
				continue;
			}

			const containerTemplate = database.templates.items[container._tpl];

			if (!containerTemplate)
			{
				Logger.error(`Could not find container template with tpl ${container._tpl}`);
				continue;
			}

			if (!containerTemplate._props.Grids || !containerTemplate._props.Grids.length)
			{
				// Container has no slots to hold items
				continue;
			}
			const itemSize = InventoryHelper.getItemSize(parentTpl, parentId, itemWithChildren);
			for (const slot of containerTemplate._props.Grids)
			{
				if (slot._props.cellsH === 0 || slot._props.cellsV === 0)
				{
					continue;
				}
				const containerItems = transplantInventory.filter(i => i.parentId === container._id && i.slotId === slot._name);
				const slotMap = InventoryHelper.getContainerMap(slot._props.cellsH, slot._props.cellsV, containerItems, container._id);
				const findSlotResult = ContainerHelper.findSlotForItem(slotMap, itemSize[0], itemSize[1]);
				if (findSlotResult.success)
				{
					const parentItem = itemWithChildren.find(i => i._id === parentId);
					parentItem.parentId = container._id;
					parentItem.slotId = slot._name;
					parentItem.location = {
						"x": findSlotResult.x,
						"y": findSlotResult.y,
						"r": findSlotResult.rotation ? 1 : 0
					};
					transplantInventory.push(...itemWithChildren);
					return transplantInventory;
				}
			}
		}
		return false;
	}
	
	static addItemWithChildrenToOtherItem(container, parentId, parentTpl, itemWithChildren, transplantInventory)
	{
		//Container needs to be an item entry for the container, containing its id, parentID, tpl, etc
		//'parent' refers to the item being added
		//transplantInventory should be satisfied with a list of items currently in the container?
		const containerTemplate = database.templates.items[container._tpl];

		if (!containerTemplate)
		{
			// Logger.error(`Could not find container template with tpl ${container._tpl}`);
			return false
		}

		if (!containerTemplate._props.Grids || !containerTemplate._props.Grids.length)
		{
			// Logger.error(`Container has no slots`)
			return false
		}
		//Size of the item to add
		// console.log(`${parentTpl} ${parentId}`)
		// console.log(itemWithChildren)
		const itemSize = InventoryHelper.getItemSize(parentTpl, parentId, itemWithChildren);
		for (const slot of containerTemplate._props.Grids)
		{
			if (slot._props.cellsH === 0 || slot._props.cellsV === 0)
			{
				continue;
			}
			const containerItems = transplantInventory.filter(i => i.parentId === container._id && i.slotId === slot._name);
			const slotMap = InventoryHelper.getContainerMap(slot._props.cellsH, slot._props.cellsV, containerItems, container._id);
			const findSlotResult = ContainerHelper.findSlotForItem(slotMap, itemSize[0], itemSize[1]);
			if (findSlotResult.success)
			{
				const parentItem = itemWithChildren.find(i => i._id === parentId);
				parentItem.parentId = container._id;
				parentItem.slotId = slot._name;
				parentItem.location = {
					"x": findSlotResult.x,
					"y": findSlotResult.y,
					"r": findSlotResult.rotation ? 1 : 0
				};
				transplantInventory.push(...itemWithChildren);
				return transplantInventory;
			}
			else
				null
		}
		return false;
	}
	
	static evenlySpreadAllSpawnLocations(map)
	{
		let mapName = map
		map = locations[map].base;
		let loc = map.FinsOpenZones
		let sniperLoc = map.FinsOpenSniperZones
		let openZones = AITweaks.clone(loc) //Use openZones as a depleteable array
		let openSniperZones = AITweaks.clone(sniperLoc) //Use openZones as a depleteable array
		let orderedWaves = []
		//Sorting waves by average spawning time, so that random locations will be assigned in that order. This is because the random locations pulls from a depletable array, so this should make sure there are fewer 'gaps' in where bots are present at any given time.
		for (let wave in map.waves)
		{
			let averageTime = Math.round((map.waves[wave].time_min + map.waves[wave].time_max) / 2)
			if (!orderedWaves[averageTime])
				orderedWaves[averageTime] = []
			orderedWaves[averageTime].push(map.waves[wave])
		}
		map.waves = []
		for (let time in orderedWaves)
			for (let wave in orderedWaves[time])
				map.waves.push(orderedWaves[time][wave])
		for (let i in map.waves)
			map.waves[i].number = i.toString()
		for (let wave in map.waves)
		{
			if (openZones.length == 0)
				openZones = AITweaks.clone(loc)
			if (openSniperZones.length == 0)
				openSniperZones = AITweaks.clone(sniperLoc)
			if (map.waves[wave].WildSpawnType != "marksman")
			{
				let randIndex = RandomUtil.getInt(0, openZones.length - 1)
				map.waves[wave].SpawnPoints = openZones[randIndex]
				openZones.splice(randIndex, 1)
			}
			else
			{
				let randIndex = RandomUtil.getInt(0, openSniperZones.length - 1)
				map.waves[wave].SpawnPoints = openSniperZones[randIndex]
				openSniperZones.splice(randIndex, 1)
			}
		}
		if (false)
			for (let boss in map.BossLocationSpawn)
			{
				if (botHelper.isBotBoss(map.BossLocationSpawn[boss].BossName))
					continue
				if (openZones.length == 0)
					openZones = AITweaks.clone(loc)
				let randIndex = RandomUtil.getInt(0, openZones.length - 1)
				map.BossLocationSpawn[boss].BossZone = openZones[randIndex]
				openZones.splice(randIndex, 1)
			}
	}
	
	static evenlySpaceAllSpawns(map)
	{
		let delay = 30
		let maxTime
		if (map == "factory4_day" || map == "factory4_night")
			maxTime = 900 //If it's factory, divide spawns over 15 minutes
		else
			maxTime = 2400 //If it's not factory, divide spawns over 40 minutes
		map = locations[map].base;
		//Randomize wave order. Otherwise you'll get 'lumps' of raiders, PMCs etc due to the way setupBots adds them in
		let randomOrder = []
		while (map.waves.length > 0)
		{
			let index = RandomUtil.getInt(0, (map.waves.length - 1))
			randomOrder.push(map.waves[index])
			map.waves.splice(index, 1)
		}
		map.waves = randomOrder
		let count = 0
		for (let i in map.waves)
			count++
		let countUp = 0
		for (let i in map.waves)
		{
			//time_max of wave n will be equal to time_min of wave n+1
			map.waves[i].time_min = (((maxTime - delay) / count) * (countUp)) + delay
			map.waves[i].time_max = (((maxTime - delay) / count) * (countUp + 1)) + delay
			map.waves[i].time_min = Math.round(map.waves[i].time_min)
			map.waves[i].time_max = Math.round(map.waves[i].time_max)
			countUp++
		}
		let useSpecificLoc = true // For testing purposes. Shouldn't (???) impact gameplay, but lets you see exactly where a spawn should happen
		count = 0
		for (let i in map.BossLocationSpawn)
			if (map.BossLocationSpawn[i].BossName == AKIPMC)
				count++
		countUp = 0
		for (let i in map.BossLocationSpawn)
			if (map.BossLocationSpawn[i].BossName == AKIPMC)
			{
				map.BossLocationSpawn[i].BossChance = 100
				map.BossLocationSpawn[i].Time = (((maxTime - delay) / count) * (countUp)) + delay
				map.BossLocationSpawn[i].Time = Math.round(map.BossLocationSpawn[i].Time)
				// if (useSpecificLoc)
				// {let locArray = map.BossLocationSpawn[i].BossZone.split(","); map.BossLocationSpawn[i].BossZone = locArray[RandomUtil.getInt(0, locArray.length - 1)]}
				countUp++
			}
	}
	
	static changeAllSpawnTimes(map)
	{
		map = locations[map].base;
		for (let i in map.waves)
		{
			map.waves[i].time_min = Math.round(map.waves[i].time_min / 1.6)
			map.waves[i].time_max = Math.round(map.waves[i].time_max / 1.6)
		}
		for (let i in map.BossLocationSpawn)
			if (botHelper.isBotBoss(map.BossLocationSpawn[i].BossName))
				map.BossLocationSpawn[i].Time = -1
			else
				map.BossLocationSpawn[i].Time = Math.round(map.BossLocationSpawn[i].Time / 1.6)
	}
	
	//Technically this will fix *all* negative boss spawn times, but I've only seen this error happening with PMCs
	static fixNegativePMCTimes(map, convertBossAssaults)
	{
		let delay = 30
		map = locations[map].base;
		let useSpecificLoc = true // For testing purposes. Shouldn't (???) impact gameplay, but lets you see exactly where a spawn should happen
		let maxTime
		if (map == "factory4_day" || map == "factory4_night")
			maxTime == 900 //If it's factory, divide spawns over 15 minutes
		else
			maxTime = 2400 //If it's not factory, divide spawns over 40 minutes
		let count = 0
		
		for (let i in map.BossLocationSpawn)
			count++
		let countUp = 0
		for (let i in map.BossLocationSpawn)
			if (map.BossLocationSpawn[i].Time < 0)
			{
				//map.BossLocationSpawn[i].BossChance = 100
				map.BossLocationSpawn[i].Time = (((maxTime - delay) / count) * (countUp)) + delay
				map.BossLocationSpawn[i].Time = Math.round(map.BossLocationSpawn[i].Time)
				if (botHelper.isBotBoss(map.BossLocationSpawn[i].BossName))
					map.BossLocationSpawn[i].Time = 15
				if (useSpecificLoc)
				{let locArray = map.BossLocationSpawn[i].BossZone.split(","); map.BossLocationSpawn[i].BossZone = locArray[RandomUtil.getInt(0, locArray.length - 1)]}
				countUp++
			}
		if (convertBossAssaults)
		{
			let count = 1
			for (let i in map.waves)
				count++
			for (let i in map.BossLocationSpawn)
				if (map.BossLocationSpawn[i].BossName == AKIPMC)
				{
					let entry = {
						"number": count,
						"time_min": map.BossLocationSpawn[i].Time * 1,
						"time_max": map.BossLocationSpawn[i].Time * 1 + 1,
						"slots_min": map.BossLocationSpawn[i].BossEscortAmount * 1 + 1,
						"slots_max": map.BossLocationSpawn[i].BossEscortAmount * 1 + 1,
						"SpawnPoints": map.BossLocationSpawn[i].BossZone,
						"BotSide": 'Savage',
						"BotPreset": 'hard',
						"WildSpawnType": map.BossLocationSpawn[i].BossEscortType,
						"isPlayers": false
					}
					if (RandomUtil.getInt(0, 99) < map.BossLocationSpawn[i].BossChance)
						map.waves.push(entry)
					count++
					delete map.BossLocationSpawn[i]
				}
		}
	}
	
	//This should try and replicate what AKI used to do in their "Additions" folder
	static addMapPMCs(map)
	{
		let PMCGroups = []
		let mapName = map
		map = locations[map].base;
		//Grab a number between the min and max player count for the map
		let PMCsNum = RandomUtil.getInt(Math.floor(map.MinPlayers / 2), map.MaxPlayers)
		while (PMCsNum > 0)
		{
			//Pick random numbers for group size, and keep doing that until you've hit the required player count
			let rand = Math.round((RandomUtil.getInt(1, 5) + RandomUtil.getInt(1, 5)) / 2) //Bias towards the middle
			if (PMCsNum - rand < 0)
				rand = PMCsNum
			PMCGroups.push(rand)
			PMCsNum = PMCsNum * 1 - rand
		}
		let waveNum = map.waves.length
		for (let i in PMCGroups)
		{
			//Could probably add more options here, for better timing, but appearing randomly between 1-10 minutes in should be fine.
			let time = RandomUtil.getInt(10, 300)
			AITweaks.addSpawn(map, waveNum, time, time, PMCGroups[i], PMCGroups[i], AKIPMC, "", "hard", mapName, 100, false)
			waveNum += 1
		}
	}
	
	static removeBossSpawns(map)
	{
		for (let wave in map.BossLocationSpawn)
		{
			let type = map.BossLocationSpawn[wave].BossName.toLowerCase()
			if (botHelper.isBotBoss(type))
				map.BossLocationSpawn.splice(wave,1)
		}
	}
	
	static removeTriggeredSpawns(map)
	{
		for (let wave in map.BossLocationSpawn)
		{
			if (map.BossLocationSpawn[wave].TriggerId && map.BossLocationSpawn[wave].TriggerId.length > 0)
				map.BossLocationSpawn.splice(wave,1)
		}
	}
		
	static advancedSpawns()
	{
		if (config.disableAllSpawnChanges)
			return
		let mapNames = locationNamesVerbose
		let mapIDs = locationNames //Use the two lists with a common index
		let botList = ["assaultgroup"] //Since assaultgroup's file was removed but the bot name is still valid, this needs to start out with it present in the array
		let diffWeights = []
		let difficulties = ["easy", "normal", "hard", "impossible"]
		if (advSConfig.randomize_as_online_difficulty) //Set up weighted difficulties
			for (let diff in advSConfig.difficulty_weights_easy_medium_hard_impossible)
				for (let i = 0; i < advSConfig.difficulty_weights_easy_medium_hard_impossible[diff]; i++)
					diffWeights.push(difficulties[diff])
		for (let i in botTypes)
			botList.push(i.toLowerCase())
		for (let mapIndex in mapNames)
		{
			let mapName = mapNames[mapIndex]
			if (!(locations[mapIDs[mapIndex]] || !(locations[mapIDs[mapIndex]].base))) //Check to make sure it exists
				continue
			
			//Setting boss chance
			if (advSConfig[mapName].boss_spawn_chance_neg1_is_default > 0)
				for (let wave in locations[mapIDs[mapIndex]].base.BossLocationSpawn)
				{
					let bossName = locations[mapIDs[mapIndex]].base.BossLocationSpawn[wave].BossName.toLowerCase()
					if (botHelper.isBotBoss(bossName))
						locations[mapIDs[mapIndex]].base.BossLocationSpawn[wave].BossChance = advSConfig[mapName].boss_spawn_chance_neg1_is_default
				}
			//Removing vanilla spawns
			if (advSConfig.remove_snipers)
				AITweaks.removeMarksmen([mapIDs[mapIndex]])
			AITweaks.removeSpawns([mapIDs[mapIndex]])
			let map = locations[mapIDs[mapIndex]].base
			//Removing boss spawns
			if (advSConfig.remove_boss_spawns)
				AITweaks.removeBossSpawns(map)
			if (advSConfig.remove_triggered_spawns)
				AITweaks.removeTriggeredSpawns(map)
			let waveNum = 0
			for (let wave in locations[mapIDs[mapIndex]].base.waves)
			{
				locations[mapIDs[mapIndex]].base.waves[wave].number = waveNum
				waveNum += 1
			}
			for (let botIndex in advSConfig.bot_types_to_spawn) //For every type of bot listed in the advanced config
			{
				let bot = advSConfig.bot_types_to_spawn[botIndex]	
				if (!(botList.includes(bot.toLowerCase()))) //Make sure it's a valid entry
					continue
				let waveSizeMin = advSConfig[mapName].min_wave_size_bot_types[botIndex]
				let waveSizeMax = advSConfig[mapName].max_wave_size_bot_types[botIndex]
				let instantWaves = advSConfig[mapName].instant_waves_bot_types[botIndex]
				let regularWaves = advSConfig[mapName].regular_waves_bot_types[botIndex]
				let timeMax = advSConfig[mapName].end_spawns_at_time_seconds
				let timeMin = 1
				let zoneChanceList = [] //To let location weighting work
				for (let zone in advSConfig[mapName].zone_spawn_weight_bot_types)
					for (let i = 0; i < advSConfig[mapName].zone_spawn_weight_bot_types[zone][botIndex]; i++)
						zoneChanceList.push(zone) //Each location should have a number of entries equal to its weight.
				if (advSConfig[mapName].sniper_zone_spawn_weights) //Not every map has these
					for (let zone in advSConfig[mapName].sniper_zone_spawn_weights)
						for (let i = 0; i < advSConfig[mapName].sniper_zone_spawn_weights[zone][botIndex]; i++)
							zoneChanceList.push(zone) //Each location should have a number of entries equal to its weight.
				let zoneChanceListOrig = AITweaks.clone(zoneChanceList)
				for (let i = 0; i < instantWaves; i++)
				{
					let loc = RandomUtil.getInt(0, zoneChanceList.length - 1) //Pick a random location from the weighted list
					let diffSetting = "normal"
					if (diffWeights.length > 0)
						diffSetting = diffWeights[RandomUtil.getInt(0, diffWeights.length - 1)]
					waveNum = AITweaks.addSpawn(map, waveNum, timeMin, 30, waveSizeMin, waveSizeMax, bot, zoneChanceList[loc], diffSetting, mapName, 100, false)
					if (true)//Add a config option for this later
					{//Tries to ensure an even distribution of spawns by removing entries as they're picked
						zoneChanceList.splice(loc, 1)
					}
					if (zoneChanceList.length == 0)
						zoneChanceList = AITweaks.clone(zoneChanceListOrig)
						
				}
				zoneChanceList = AITweaks.clone(zoneChanceListOrig)
				for (let i = 0; i < regularWaves; i++)
				{
					let diffSetting = "normal"
					if (diffWeights.length > 0)
						diffSetting = diffWeights[RandomUtil.getInt(0, diffWeights.length - 1)]
					let loc = RandomUtil.getInt(0, zoneChanceList.length - 1)
					waveNum = AITweaks.addSpawn(map, waveNum, timeMin, timeMax, waveSizeMin, waveSizeMax, bot, zoneChanceList[loc], diffSetting, mapName, 100, false)
					if (true)
					{//Tries to ensure an even distribution of spawns by removing entries as they're picked
						zoneChanceList.splice(loc, 1)
					}
					if (zoneChanceList.length == 0)//Refresh the list when it empties out
						zoneChanceList = AITweaks.clone(zoneChanceListOrig)
				}
				zoneChanceList = AITweaks.clone(zoneChanceListOrig)
			}
			if (config.spawnChanges.controlOptions.scavReplaceWith___AffectsOnlyVanillaWaves == "advanced")
			{
				AITweaks.replaceScavs(config.spawnChanges.controlOptions.scavReplaceWithRaidersPCT0_100, mapNames[mapIndex], "raiders")
				//Replace scavs with PMCs
				AITweaks.replaceScavs(config.spawnChanges.controlOptions.scavReplaceWithPMCsPCT0_100, mapNames[mapIndex], "pmcs")
			}
			if (config.spawnChanges.controlOptions.breakUpSpawnWaves)
				AITweaks.spreadSpawns(mapIDs[mapIndex], false)
			else
				null//AITweaks.spreadSpawns(mapIDs[mapIndex], false)
		}
	}

	/* numBosses should look like: {
		"1": 50,
		"2": 50
	} */
	static adjustBossChances(map, numBosses)
	{
		
	}
	
	static removeOpenZonesFromWaves()
	{
		for (let map in locations)
		{
			if (!locations[map].base)
				continue
			let currentmap = locations[map].base
			for (let wave in currentmap.waves)
				if (currentmap.waves[wave].OpenZones != undefined)
					delete currentmap.waves[wave].OpenZones
		}
	}
	
	static setupBots()
	{
		if (advSConfig.enable_this_config)
		{
			AITweaks.advancedSpawns()
			AITweaks.switchDiffs(true)
			AITweaks.removeOpenZonesFromWaves()
			return
		}
		let maxBotsPerZone = 500//config.spawnChanges.maxBotsPerZone
		let raiderWaves = config.spawnChanges.extraWaves.raiderWaves;
		let raiderWaveSizeMin = config.spawnChanges.extraWaves.raiderWaveSizeMin;
		let raiderWaveSizeMax = config.spawnChanges.extraWaves.raiderWaveSizeMax;
		let PMCWaves = config.spawnChanges.extraWaves.PMCWaves;
		let PMCWaveSizeMin = config.spawnChanges.extraWaves.PMCWaveSizeMin;
		let PMCWaveSizeMax = config.spawnChanges.extraWaves.PMCWaveSizeMax;
		let rogueWaves = config.spawnChanges.extraWaves.rogueWaves;
		let rogueWaveSizeMin = config.spawnChanges.extraWaves.rogueWaveSizeMin;
		let rogueWaveSizeMax = config.spawnChanges.extraWaves.rogueWaveSizeMax;
		let gluharWaves = config.spawnChanges.extraWaves.gluharRaiderWaves;
		let gluharWaveSizeMin = config.spawnChanges.extraWaves.gluharRaiderWaveSizeMin;
		let gluharWaveSizeMax = config.spawnChanges.extraWaves.gluharRaiderWaveSizeMax;
		let scavWaves = config.spawnChanges.extraWaves.scavWaves;
		let scavWaveSizeMin = config.spawnChanges.extraWaves.scavWaveSizeMin;
		let scavWaveSizeMax = config.spawnChanges.extraWaves.scavWaveSizeMax; 
		let cultistWaves = config.spawnChanges.extraWaves.OnlyWorksProperlyWhenTaggedAndCursedIsEnabled.cultistWaves;
		let cultistWaveSizeMin = config.spawnChanges.extraWaves.OnlyWorksProperlyWhenTaggedAndCursedIsEnabled.cultistWaveSizeMin;
		let cultistWaveSizeMax = config.spawnChanges.extraWaves.OnlyWorksProperlyWhenTaggedAndCursedIsEnabled.cultistWaveSizeMax;
		let cultistWaveChance = config.spawnChanges.extraWaves.OnlyWorksProperlyWhenTaggedAndCursedIsEnabled.waveSpawnChancePCT0_100;
		let speedFactor = config.spawnChanges.spawnTiming.extraWaveSpawnSpeedFactor;
		let PMCROE = 4//"Default"//config.aiChanges.sameFactionPMCsShootPlayerOnSight_true_false_Default //Rules of Engagement
		let noLabRats = config.spawnChanges.controlOptions.noScavsInLabs
		let mapMults = config.spawnChanges.controlOptions.mapMultipliers_Inter_Cust_Resrv_Woods_Shore_Lab_LH_Fact
			mapMults.push(mapMults[mapMults.length - 1]) //Factory day and night
		
		
		// database.globals.config.WAVE_COEF_LOW = 1 //Not sure if this helps.
		// database.globals.config.WAVE_COEF_MID = 1.4
		// database.globals.config.WAVE_COEF_HIGH = 1.8
		// database.globals.config.WAVE_COEF_HORDE = 10
		
		/*
		0 = Interchange
		1 = Customs
		2 = Reserve
		3 = Woods
		4 = Shoreline
		5 = Labs
		6 = Lighthouse
		7 = Factory Day		|| Not currently distinguishing between day and night
		8 = Factory Night
		*/
		let noChanges = config.disableAllSpawnChanges
		let mapNames = locationNames
		
		for (let i = 0; i < mapNames.length; i++)
		{
			if (!config.spawnChanges.controlOptions.doNotChangeTheseSPECIFICMaps.includes(mapNames[i]) && !noChanges)
			{
				//This does.. ..Something stupid. But so far it works.
				//Finger status: Crossed
				AITweaks.whatAmIEvenDoing(mapNames[i])
				
				if (PMCROE == 1)//true) //AvoidOwnPmc, AvoidAllPmc, Normal seem to be the options.
					locations[mapNames[i]].base.Rules = "AvoidAllPmc"
				else if (PMCROE == 2)//false)
					locations[mapNames[i]].base.Rules = "AvoidOwnPmc"
				else if (PMCROE == 3)//false)
					locations[mapNames[i]].base.Rules = "Normal"
				else
					null//locations[mapNames[i]].base.Rules = "Normal"
				
				if (config.spawnChanges.controlOptions.removeVanillaSpawns == true)
					AITweaks.removeSpawns(mapNames[i])
				if (config.spawnChanges.controlOptions.removeSniperBots)
					AITweaks.removeMarksmen(mapNames[i])
				if (config.spawnChanges.controlOptions.removeVanillaPMCSpawns == true)
					AITweaks.removeVanillaPMCSpawns(mapNames[i])
				
				if (config.spawnChanges.controlOptions.autoAddPMCsBasedOnMapSize)
					AITweaks.addMapPMCs(mapNames[i])				
				AITweaks.increaseMinBotSpawns(config.spawnChanges.controlOptions.extraScavsPerVanillaWave, mapNames[i])
				//Replace scavs with raiders
				if (config.spawnChanges.controlOptions.scavReplaceWith___AffectsOnlyVanillaWaves)
				{
					AITweaks.replaceScavs(config.spawnChanges.controlOptions.scavReplaceWithRaidersPCT0_100, mapNames[i], "raiders")
					//Replace scavs with PMCs
					AITweaks.replaceScavs(config.spawnChanges.controlOptions.scavReplaceWithPMCsPCT0_100, mapNames[i], "pmcs")
				}
				//Adding plain-ol' scavs
				AITweaks.changeMapSpawns(mapNames[i], maxBotsPerZone, scavWaves, scavWaveSizeMin, scavWaveSizeMax, "assault", speedFactor, 100)
				//Adding PMCs
				AITweaks.changeMapSpawns(mapNames[i], maxBotsPerZone, PMCWaves, PMCWaveSizeMin, 
				PMCWaveSizeMax, AKIPMC, speedFactor, 100)
				//Adding raiders
				AITweaks.changeMapSpawns(mapNames[i], maxBotsPerZone, raiderWaves, raiderWaveSizeMin, raiderWaveSizeMax, "pmcBot", speedFactor, 100)
				//Adding rogues
				AITweaks.changeMapSpawns(mapNames[i], maxBotsPerZone, rogueWaves, rogueWaveSizeMin, 
				rogueWaveSizeMax, "exUsec", speedFactor, 100)
				//Adding Gluhar's boys
				let gluharBoys = ["followerGluharAssault", "followerGluharSecurity", "followerGluharScout", "followerGluharSnipe"]
				//gluharBoys = ["followerGluharAssault"]
				let random = RandomUtil.getInt(0, (gluharBoys.length - 1))
				AITweaks.changeMapSpawns(mapNames[i], maxBotsPerZone, gluharWaves, gluharWaveSizeMin, gluharWaveSizeMax, gluharBoys[random], speedFactor)
				//Spawning in some cultists
				AITweaks.changeMapSpawns(mapNames[i], maxBotsPerZone, cultistWaves, RandomUtil.getInt(Math.ceil(cultistWaveSizeMin * (RandomUtil.getInt(35,75)/100)), cultistWaveSizeMin), RandomUtil.getInt(cultistWaveSizeMax, Math.ceil(cultistWaveSizeMax * (RandomUtil.getInt(135,175)/100))), "sectantWarrior", speedFactor, cultistWaveChance)
				if (config.spawnChanges.spawnTiming.evenlySpaceAllSpawnTimes && !config.spawnChanges.spawnTiming.spawnExtraWavesImmediately)
					AITweaks.evenlySpaceAllSpawns(mapNames[i])
				if (config.spawnChanges.controlOptions.scavReplaceWith___AffectsOnlyVanillaWaves == false)
				{
					AITweaks.replaceScavs(config.spawnChanges.controlOptions.scavReplaceWithRaidersPCT0_100, mapNames[i], "raiders")
					//Replace scavs with PMCs
					AITweaks.replaceScavs(config.spawnChanges.controlOptions.scavReplaceWithPMCsPCT0_100, mapNames[i], "pmcs")
				}
				if (mapMults[i] != 1)
					AITweaks.scaleSpawns(mapNames[i], mapMults[i])
				//Noticed AKI sets some PMC spawn times to negative numbers. This fixes that.
				// AITweaks.fixNegativePMCTimes(mapNames[i], true)
				AITweaks.changeAllSpawnTimes(mapNames[i])
				if (config.spawnChanges.controlOptions.breakUpSpawnWaves)
					AITweaks.spreadSpawns(mapNames[i], false)
				else
					null//AITweaks.spreadSpawns(mapNames[i], false)
				if (config.sillyChanges.oopsAllCultists)
					AITweaks.allHail(mapNames[i], false, false)
				if (config.spawnChanges.spawnTiming.spawn_ALL_WavesImmediately)
					AITweaks.spawnAllWavesImmediately(mapNames[i])
				else if (!config.spawnChanges.spawnTiming.spawnExtraWavesImmediately && config.spawnChanges.spawnTiming.extraWaveSpawnSpeedFactor >= 0)
					AITweaks.applySpawnSpeedFactor(mapNames[i], config.spawnChanges.spawnTiming.extraWaveSpawnSpeedFactor, config.spawnChanges.spawnTiming.extraWaveSpawnSpeedFactorMaxTime)
				if (config.spawnChanges.controlOptions.evenlySpreadAllSpawnLocations)
					AITweaks.evenlySpreadAllSpawnLocations(mapNames[i])
				if (mapNames[i] == "laboratory" && noLabRats)
					AITweaks.replaceScavs(100, mapNames[i], "raiders")
				//AITweaks.confirmWaveSize(mapNames[i])
				locations[mapNames[i]].base = AITweaks.cleanMapSpawns(mapNames[i])
			}
		}
		AITweaks.switchDiffs(true) //I hate this.
		AITweaks.removeOpenZonesFromWaves()
	}
	
	static countItems(array, target, extension)
	{
		let count = 0
		for (let i in array)
			if (extension)
			{
				if (array[i] && array[i][extension] && array[i][extension] == target)
					count += 1
			}
			else
				if (array[i] && array[i] == target)
					count += 1
		return count
	}
	
	//This is to accomodate special spawning. This WILL nuke any other mod trying to do special spawning that occurs earlier in the load order, so this function is not being used right now.
	static allBossesToSameDiff(diff)
	{
		for (let map in locations)
			if (locations[map].base && locations[map].base.BossLocationSpawn)
				for (let boss in locations[map].base.BossLocationSpawn)
				{
					locations[map].base.BossLocationSpawn[boss].BossDifficult = diff
					locations[map].base.BossLocationSpawn[boss].BossEscortDifficult = diff
				}
	}
	
	static applySpawnSpeedFactor(map, speedFactor, timeCap)
	{
		let mapName = map
		map = locations[map].base
		let randomedWaves = []
		for (let i = 0; i < map.waves.length; i++) //Cursed
		{
			let randIndex = RandomUtil.getInt(0, map.waves.length - 1)
			randomedWaves.push(map.waves[randIndex])
			map.waves.splice(randIndex, 1)
			i -= 1
		}
		
		map.waves = randomedWaves
		
		for (let norm in map.waves)
		{
			map.waves[norm].number = norm
			if (map.waves[norm].WildSpawnType == "marksman") //ignore marksmen
				continue
			map.waves[norm].time_min = 10
			map.waves[norm].time_max = Math.round(2700 / (parseInt(norm) + 1 + speedFactor) + RandomUtil.getInt(0, timeCap)) + 30
			if (mapName == "factory4_day" || mapName == "factory4_night")
				map.waves[norm].time_max = Math.round(map.waves[norm].time_max / 3)
		}
	}
	
	static confirmWaveSize(map)
	{
		let mapName = map
		map = locations[map].base
		for (let norm = 0; norm < map.waves.length;	norm++)
		{
			let waveSize = RandomUtil.getInt(map.waves[norm].slots_min,map.waves[norm].slots_max)
			if (waveSize == 0)
			{
				map.waves.splice(norm, 1)
				norm -= 1
			}
			else
			{
				map.waves[norm].slots_min = waveSize
				map.waves[norm].slots_max = waveSize
			}
		}
	}
	
	static spawnAllWavesImmediately(map)
	{
		let mapName = map
		map = locations[map].base
		for (let boss in map.BossLocationSpawn)
		{
			// map.BossLocationSpawn[boss].Time = RandomUtil.getInt(1,30)
			map.BossLocationSpawn[boss].Time = -1
		}
		for (let norm in map.waves)
		{
			map.waves[norm].time_min = 10
			map.waves[norm].time_max = 30
		}
	}
		
	static allHail(map, changePMCs, changeBosses)
	{
		console.log("This shouldn't be happening. Extra cultists are being generated.")
		let mapName = map
		map = locations[map].base
		for (let boss in map.BossLocationSpawn)
		{
			let wave = map.BossLocationSpawn[boss]
			if (botHelper.isBotBoss(wave.BossName))
				if (changeBosses)
					{wave.BossName = "sectantPriest";wave.BossEscortType = "sectantWarrior"}
			else if (wave.BossName == AKIPMC)
				if (changePMCs)
					{wave.BossName = "sectantPriest";wave.BossEscortType = "sectantWarrior"}
			else
				{wave.BossName = "sectantPriest";wave.BossEscortType = "sectantWarrior"}
		}
		let botCount = 0
		for (let norm in map.waves)
		{
			let wave = map.waves[norm]
			if (wave.WildSpawnType == AKIPMC && !changePMCs)
				null
			else
			{
				botCount += wave.slots_max
				delete map.waves[norm]
			}
		}
		botCount = Math.floor(botCount / 5)
		console.log(`Cultist waves: ${botCount}`)
		for (let i = 0; i < botCount; i++)
		{
			map.BossLocationSpawn.push({
				"BossName": "sectantPriest",
				"BossChance": 100,
				"BossZone": "",
				"BossPlayer": false,
				"BossDifficult": "hard",
				"BossEscortType": "sectantWarrior",
				"BossEscortDifficult": "hard",
				"BossEscortAmount": 4,
				"Time": RandomUtil.getInt(30, 300)
			})
		}
		map.waves = AITweaks.cleanArray(map.waves)
	}
	
	//Set wave sizes to 0, roll against scale to increase by one. Repeat.
	static scaleSpawns(map, scale)
	{
		let mapName = map
		scale *= 100
		map = locations[map].base
		for (let norm = 0; norm < map.waves.length; norm++)
		{
			let wave = map.waves[norm]
			// if (wave.isPlayers == true)
				// continue
			let size = map.waves[norm].slots_min
			if (!(map.waves[norm].slots_min == map.waves[norm].slots_max))
				size = RandomUtil.getInt(map.waves[norm].slots_min, map.waves[norm].slots_max) //Set size to a random value between min and max
			if (scale <= 100) //If the wave needs to be reduced in size
			{
				map.waves[norm].slots_min = 0
				for (let i = 0; i < size; i++)
					if (RandomUtil.getInt(0, 99) < scale - 1)
					{
						map.waves[norm].slots_min++
					}
			}
			else
			{
				let minMaxDiff = map.waves[norm].slots_max - map.waves[norm].slots_min //Maintain the difference between min and max
				size *= Math.floor(scale / 100)
				for (let i = 0; i < size; i++)
					if (RandomUtil.getInt(0, 99) < (scale % 100)) //If scale is 1.2, should wind up with ~120% bot count
						map.waves[norm].slots_min = map.waves[norm].slots_min * 1 + 1
				map.waves[norm].slots_max = map.waves[norm].slots_min
			}
			//Remove empty waves
			wave.slots_max = wave.slots_min

		}
		for (let norm = 0; norm < map.waves.length; norm++)
			if (map.waves[norm].slots_min == 0)
			{
				map.waves.splice(norm, 1)
				norm--
			}
		for (let boss in map.BossLocationSpawn)
		{
			let wave = map.BossLocationSpawn[boss]
			let size = wave.BossEscortAmount
			if (scale <= 100)
			{
				if (wave.BossEscortAmount == 0 && botHelper.isBotBoss(wave.BossName))//Don't touch bosses who have no minions
					continue
				wave.BossEscortAmount = 0
				for (let i = 0; i < size; i++)
					if (RandomUtil.getInt(0, 99) < scale)
						wave.BossEscortAmount = wave.BossEscortAmount * 1 + 1
				if (wave.BossEscortAmount == 0 && !botHelper.isBotBoss(wave.BossName))//Don't remove bosses if they run out of minions
					if (RandomUtil.getInt(0, 99) >= scale)
						delete map.BossLocationSpawn[boss]
			}
			else if (wave.BossEscortAmount > 0) //Don't assign bosses without minions extra minions
			{
				size *= Math.floor(scale / 100)
				for (let i = 0; i < size; i++)
					if (RandomUtil.getInt(0, 99) < scale % 100)
						wave.BossEscortAmount = wave.BossEscortAmount * 1 + 1
			}
		}
		map.waves = AITweaks.cleanArray(map.waves)
		map.BossLocationSpawn = AITweaks.cleanArray(map.BossLocationSpawn)
	}
	
	static cleanMapSpawns(map)
	{
		let mapName = map
		let mapCopy = AITweaks.clone(locations[map].base)
		mapCopy.waves = AITweaks.cleanArray(mapCopy.waves)
		mapCopy.BossLocationSpawn = AITweaks.cleanArray(mapCopy.BossLocationSpawn)
		for (let wave in mapCopy.waves)
			mapCopy.waves[wave].number = wave.toString()
		return mapCopy
	}
	
	//This spreads all spawns out from grouped spawns (With a wave size of X to Y), into a series of single spawns (With a wave size of 1). This bypasses whatever weirdness is messing with spawn numbers, and gives you *exactly* as many bots as you enter into the config file.
	//It does make the debug harder to read, though.
	//This affects anything not in the boss spawn entry. Raiders, scavs, whatever.
	static spreadSpawns(mapName, spreadPMCs)
	{
		let map = locations[mapName].base
		for (let i = 0; i < map.waves.length; i++)
		{
			let numBots = RandomUtil.getInt(map.waves[i].slots_min, map.waves[i].slots_max)
			map.waves[i].slots_min = 1
			map.waves[i].slots_max = 1
			for (let each in numBots)
			{
				map.waves.splice(i,0,JsonUtil.clone(map.waves[i]))
				i++
			}
		}
	}
	
	static removeMarksmen(map)
	{
		
		for (let n in locations[map].base.waves)
			//Delete any wave that isn't a sniper scav
			if (locations[map].base.waves[n].WildSpawnType == "marksman")
				delete locations[map].base.waves[n]
		locations[map].base.waves = AITweaks.cleanArray(locations[map].base.waves)
	}
	
	static removeSpawns(map)
	{
		
		for (let n in locations[map].base.waves)
			//Delete any wave that isn't a sniper scav
			if (locations[map].base.waves[n].WildSpawnType != "marksman")
				delete locations[map].base.waves[n]
		locations[map].base.waves = AITweaks.cleanArray(locations[map].base.waves)
	}
	
	//Zero out the values AKI uses to figure out how many AI PMCs to spawn, and then also remove the spawns themselves.
	static removeVanillaPMCSpawns(map)
	{
		locations[map].base.MaxPlayers = 0
		locations[map].base.MinPlayers = 0
		for (let i in locations[map].base.BossLocationSpawn)
			if (locations[map].base.BossLocationSpawn[i].BossName == AKIPMC)
				delete locations[map].base.BossLocationSpawn[i]
		locations[map].base.BossLocationSpawn = AITweaks.cleanArray(locations[map].base.BossLocationSpawn)
	}
	
	printAIChanges(botName, difficulty, retrieve, findSames?)
	{
		if (retrieve == "no")
			console.log(botTypes[botName].difficulty[difficulty])
		else if (retrieve != undefined)
		{
			let newFile = botTypes[botName].difficulty[difficulty]
			let output = {}
			for (let i in newFile)
			{
				output[i] = {}
				for (let n in newFile[i])
				{
					if (newFile[i][n] != retrieve[i][n] && findSames == false)
					{
						output[i][n] = retrieve[i][n]
						let m = n.concat(".new")
						output[i][m] = newFile[i][n]
					}
					else if (newFile[i][n] == retrieve[i][n] && findSames == true)
					{
						output[i][n] = newFile[i][n]
					}
				}
			}
			console.log(output)
		}
		else
		{
			return AITweaks.clone(botTypes[botName].difficulty[difficulty])
		}
	}
	
	static calculateTime(data)
	{
		// get time acceleration
		const deltaSeconds = Math.floor(process.uptime()) * config.miscChanges.timeAcceleration;
		const computedDate = new Date();

		computedDate.setSeconds(computedDate.getSeconds() + deltaSeconds);
		
		let timeSet
		if (config.sillyChanges.oopsAllCultists)
			timeSet = "22:13:13"
		else if (config.miscChanges.startServerAtSpecificTime)
			timeSet = config.miscChanges.startTime
		else
			timeSet = TimeUtil.formatTime(computedDate).replace("-", ":").replace("-", ":");

		// assign time
		const time = timeSet
		const date = TimeUtil.formatDate(computedDate);
		const datetime = `${date} ${time}`;

		data.weather.timestamp = Math.floor(+computedDate / 1000);
		data.weather.date = date;
		data.weather.time = datetime;
		data.date = date;
		data.time = time;
		data.acceleration = config.miscChanges.timeAcceleration;

		return data;
	}
	
	static recordWinLoss(url, info, sessionId)
	{
		let PMC = profileHelper.getPmcProfile(sessionId)
		let diffAdjust = 0.6
		let diffRatio = 1
		//Only allow for one adjustment per run
		if (progDiff[sessionId] == true)
			return AITweaks.nullResponse()
		// PMC.Stats.OverallCounters.Items.find(i => i.Key[0] == "Sessions") ? progDiff[sessionId].raids = PMC.Stats.OverallCounters.Items.find(i => i.Key[0] == "Sessions").Value : progDiff[sessionId].raids = 0
		// PMC.Stats.OverallCounters.Items.find(i => i.Key[1] == "Killed") ? progDiff[sessionId].deaths = PMC.Stats.OverallCounters.Items.find(i => i.Key[1] == "Killed").Value : progDiff[sessionId].deaths = 0
		// PMC.Stats.OverallCounters.Items.find(i => i.Key[1] == "Survived") ? progDiff[sessionId].survives = PMC.Stats.OverallCounters.Items.find(i => i.Key[1] == "Survived").Value : progDiff[sessionId].survives = 0
		// PMC.Stats.OverallCounters.Items.find(i => i.Key[0] == "CurrentWinStreak") ? progDiff[sessionId].winStreak = PMC.Stats.OverallCounters.Items.find(i => i.Key[0] == "CurrentWinStreak").Value : progDiff[sessionId].winStreak = 0
		let upMult = diffRatio
		let downMult = 1 / diffRatio
		if (info.exit == "survived")//If they survived
		{
			progDiff[sessionId].winStreak += 1
			progDiff[sessionId].deathStreak = 0
			progDiff[sessionId].diffMod += (diffAdjust * Math.sqrt(progDiff[sessionId].winStreak)) * upMult
		}
		if (info.exit == "killed")//If they perished
		{
			progDiff[sessionId].winStreak = 0
			progDiff[sessionId].deathStreak += 1
			progDiff[sessionId].diffMod -= (diffAdjust / Math.sqrt(progDiff[sessionId].deathStreak)) * downMult
		}
		var fs = require('fs');
			fs.writeFile(modFolder + "donottouch/progress.json", JSON.stringify(progDiff, null, 4), function (err) {
			if (err) throw err;
		});
		AITweaks.adjustDifficulty(url, info, sessionId)
		return AITweaks.nullResponse()
	}
	
	static adjustDifficulty(url, info, sessionId)
	{
		let PMC = profileHelper.getPmcProfile(sessionId)
		// console.log(PMC)
		if (!progDiff[sessionId])
		{
			progDiff[sessionId] = {}
			progDiff[sessionId].diffMod = 0
			progDiff[sessionId].raids = 0
			progDiff[sessionId].deaths = 0
			progDiff[sessionId].survives = 0
			progDiff[sessionId].winStreak = 0
			progDiff[sessionId].deathStreak = 0
			progDiff[sessionId].lock = false
		}
		
		let LLD = config.aiChanges.lowLevelAIDifficultyMod_Neg3_3
		let MLD = config.aiChanges.midLevelAIDifficultyMod_Neg3_3 - LLD
		let HLD = config.aiChanges.highLevelAIDifficultyMod_Neg3_3 - LLD
		LLD = progDiff[sessionId].diffMod
		MLD += progDiff[sessionId].diffMod
		HLD += progDiff[sessionId].diffMod
		AITweaks.setDifficulty(LLD, HLD, MLD, MLD, MLD)
	}
	
	//Call this when the mod first loads, and when the game starts. Ideally it catches it on first load, but people could always be changing folder names around.
	static checkForLua()
	{

		/* if (ModLoader.getImportedModsNames()["Lua-CP-SpawnReworkReborn"] && !config.LCPSRRR)
		{
			config.disableAllSpawnChanges = true
			config.AIbehaviourChanges.enabled = false
			Logger.info(`AITweaks: Lua's Spawn Rework has been detected. All spawn changes and behaviour changes have been disabled for compatibility purposes. If you wish to override this action, please create a new entry in your config.json file, above 'Explanation', called "LCPSRRR", with a value of 'true'`)
			config.LCPSRRR = true //This is to keep this message from showing up several times.
		} */
	}
	
	//This is for things that I want to run exactly once upon the game actually starting.
	static runOnGameStart(url?, info?, sessionId?, output?)
	{
		AITweaks.checkForLua()
		InRaidConfig.raidMenuSettings.aiAmount = "AsOnline"
		InRaidConfig.raidMenuSettings.aiDifficulty = "AsOnline"
		AITweaks.openZones()
		config.playerId = sessionId //Make the player's ID accessible at any point
		//Difficulty changes are now made HERE, rather than in the main function.
		AITweaks.setDifficulty(config.aiChanges.lowLevelAIDifficultyMod_Neg3_3, config.aiChanges.highLevelAIDifficultyMod_Neg3_3, config.aiChanges.midLevelAIDifficultyMod_Neg3_3, config.aiChanges.midLevelAIDifficultyMod_Neg3_3, config.aiChanges.midLevelAIDifficultyMod_Neg3_3)
		//Automatic enemy gear adjustments. Currently only applies to weapons
		if (config.miscChanges.enableProgressiveGear == true && !config.disableAllGearChanges && sessionId) //300 FIX THIS (Try and move this check back into here, instead of at the start of the mod)
		{
			AITweaks.setProgressiveGear(url, info, sessionId)
			// HttpRouter.onStaticRoute["/raid/profile/save"] = Object.assign({"aitweaksProgressiveGear": AITweaks.setProgressiveGear}, HttpRouter.onStaticRoute["/raid/profile/save"]) //DOES NOT REPLACE the AKI function, it just needs to use that route as an entry point.
		}
		/* else if (config.miscChanges.enableProgressiveGear && config.disableAllGearChanges)
		{
			Logger.error(`Progressive gear can only run when gear changes are NOT disabled.`)
			//Reaffirm bot loadouts, then delete the storage location to free memory
			for (let bot in botTypes)
				if (bot != "storage")
					botTypes[bot].inventory = AITweaks.clone(config.storage[bot])
			AITweaks.destroy(config.storage)
		} */
		else if (config.storage)
		{
			//Reaffirm bot loadouts, then delete the storage location to free memory
			for (let bot in config.storage)
				if (botTypes[bot])
					botTypes[bot].inventory = AITweaks.clone(config.storage[bot])
			// sessionId ? AITweaks.destroy(config.storage) : null
		}
		for (let i in database.globals.bot_presets)
			database.globals.bot_presets[i].UseThis = false
		//Autmatic difficulty adjustments. THESE ONLY ADJUST WHEN THE SERVER RESTARTS
		if (config.overallDifficultyMultipliers.enableAutomaticDifficulty && sessionId)
		{
			AITweaks.adjustDifficulty(url, info, sessionId)
		}
		sessionId ? AITweaks.undoCodMode(url, info, sessionId) : null //Runs whether or not the option is selected, just in case health needs to be reset after a crash
		
		//Establish the advanced loadout config here.
		let loadoutConfig
		let newLoadoutConfig
		let conflictList
		try{
		loadoutConfig = require("../config/advanced loadout config.json")
		}
		catch{
		loadoutConfig = "x"
		}
		if (loadoutConfig.enabled == true || loadoutConfig == "x")
		{
			conflictList = AITweaks.createConflictList()
			let weaponList = conflictList.weaponList
			newLoadoutConfig = AITweaks.storeAllWeaponNamesAndIDs(weaponList)
			AITweaks.backupAdvancedLoadoutConfig(newLoadoutConfig)
		
			//Apply the advanced loadout config's non map dependant aspects when the game is first loaded in
			AITweaks.applyAdvancedLoadoutConfig(newLoadoutConfig, "none", conflictList)
		}
		if (config.disableAllGearChanges == false)
		BotConfig.equipment.pmc.blacklist[0].cartridge = {}
		if (config.disableAllSpawnChanges == false)
		{BotConfig.pmc.convertIntoPmcChance = {};BotConfig.pmc.types = {}}; /* BotConfig.pmc.usecType = AKIPMC; BotConfig.pmc.bearType = AKIPMC */
		if (config.AIgearChanges.allAI.factionIdentifiers == true)
			AITweaks.addFactionIdentifiers() //Run this here to get around ABL's default settings disabling armbands

		if (config.sillyChanges.COD_mode == true && sessionId)
		{
			AITweaks.applyCodMode(url, info, sessionId)
			if (config.sillyChanges.COD_modeMaxHPPerLimb[0] != "=")
				AITweaks.giveCodModeItems(url, info, sessionId, "Start")
			//Cod mode assignment moved to onRaidSave
		}
		AITweaks.cleanAllBotInventories(true, true) //This is redundant and should be condensed into one solution, but.. Scattershotting this for now, to make sure I get every instance of this problem.
		AITweaks.saveDebugFiles(config.debug.showSpawns, config.debug.showBosses, config.debug.showBossPMCs, config.debug.showGuns, config.debug.showArmor, config.debug.showAmmo)
		AITweaks.printAllBotGear(`doNotTouch/debug/debugBots~~MasterInventory2.json`)
		return output
	}
	
	static padLine(string, length, justify?)
	{
		let left = false
		let right = false
		let alternate = false
		if (justify == "left")
			right = true
		else if (justify == "right")
			left = true
		else
			alternate = true
		while (string.length < length)
				{
					let a = " "
					if (left)
					{
						string = a.concat(string)
						if (alternate == true)
							left = false
					}
					else
					{
						string = string.concat(a)
						if (alternate == true)
							left = true
					}
				}
		return string
	}
	
	static formatEpitahSegment(string, length)
	{
		let epitah = string
		let epitahArray = []
		for (let i = 0; i < (Math.ceil(epitah.length / length)); i++)
		{
			if (epitah.length >= length * (i + 1))
			{
				let segment = epitah.substr(length * i, length)
				if (epitah[length * i + length] != " ")
				{
					let lastSpace = (length - segment.split("").reverse().join("").search(" ") - 1)
					if (lastSpace >= 0)
					{
						let paddedLine = AITweaks.padLine(segment.substr(0,lastSpace), length)
						let a = epitah.substr(0, length * i)
						let b = paddedLine
						let c = epitah.slice((length * (i + 1)) - (length - lastSpace - 1))
						epitah = a + b + c
					}
						//epitah = epitah.substr(0, length * i) + Array(length - lastSpace).join(" ") + epitah.substr(length * (i + 1), epitah.length - (length * (i + 1)))
				}
				epitahArray.push(epitah.substr(length * i, length))
			}
			else
			{
				let a = epitah.slice((length * (i + 1)) - (length))
				//epitahArray.push(epitah.substr(length * i, epitah.length - (length * i)))
				epitahArray.push(a)
				let left = false
				while (epitahArray[i].length < length)
				{
					let a = " "
					if (left)
					{
						epitahArray[i] = a.concat(epitahArray[i])
						left = false
					}
					else
					{
						epitahArray[i] = epitahArray[i].concat(a)
						left = true
					}
				}
			}
		}
		return epitahArray
	}
	
	static prepTomb(url, info, sessionId)
	{
		let isDead = (info.exit !== "survived" && info.exit !== "runner");
		if (!isDead)
			return
		AITweaks.printAsciiTomb("","","","",info)
		//Yes, this is hacky. I know.
		database.globals.config.tombRandom = database.globals.config.tombInfo
		// database.globals.config.tombInfo = info
		
		//300 FIX THIS
		//HttpRouter.onStaticRoute["/client/checkVersion"] = Object.assign({"aitweaks": AITweaks.printAsciiTomb}, HttpRouter.onStaticRoute["/client/checkVersion"]) //DOES NOT REPLACE the AKI function, it just needs to use that route as an entry point.
	}
	
	//This is just for cuteness sake
	//static printAsciiTomb(url, info, sessionId)
	//I know I spelled epitaph wrong. But it's a variable name now, and I'm not going to cause more errors trying to fix it.
	static printAsciiTomb(a,b,c?,d?,info?, output?)
	{
		return
		// Logger.error(`Tombstone time`)
		// console.log(info) //Debug with this
		if (info == undefined)
			info = database.globals.config.tombInfo
		if (info == undefined)
			return
		let epitahs = {
			1: ["Here lies"," ", "Do not disturb."],
			2: ["Here lies"," ", "'He'd have to be one hell of a shot to get me from-'", " ",	"-Last words."],
			3: [" "," ", "Reincarnating, please hold."],
			4: ["Here lies"," ", "They died as they lived:" , "Scavenging for used batteries and pineapple juice."],
			5: [" "," ", "Should've paid for a better helmet." , " -Ragman"],
			6: [" "," ", "I still had chores for them to do." , " -Jaeger"],
			7: ["In tolerating memory:"],
			8: [" ", " ", "One fine cheeki-breeki."],
			9: [" ", " ", "Used no meds", "Knew no fear", "Made mis-step", "Wound up here"],
			10: [" ", " ", "'Ne invoces expellere non possis'"],
			11: [" ", " ", "The lean", "mean", "killing machine", " ", "died"],
			12: ["Here rests", " ", "The quality of their armor was not assured."],
			13: ["Here rests", " ", "Shoulda ducked."],
			14: [" ", " ", "Tarkov born", "Tarkov bred", "and here I lay", "Tarkov dead"],
			15: [" ", " ", "One scav too many.", " ", "One magazine short."],
			16: ["This is the final resting place of", " ", "It's how you live that matters."],
			17: ["Here's what's left of", " ", "You should see the other guy."],
			18: ["Here lies the body of", " ", "If not, please notify the undertakers immediately."],
			19: [" ", " ", " ", "This crypt contains", "My mortal remains"],
			20: ["Here lies", " ", "'More principium est.'"],
			21: ["Here lies", " ", "Quick on the trigger", " ", "Slow on the draw"],
			22: ["Here lies", " ", "Never killed a man who didn't need killing"],
			23: ["", " ", "To the victor go the spoils."],
			24: ["Here lies", " ", "'Just a flesh wound'"],
			25: ["Here rests", " ", "Thy cause was false, thy skills did lack", "see you in Tarkov when you get back."],
			26: ["Here lies", " ", "Stop standing on me."],
			27: ["Here lies", " ", "They'll be back."],
			28: ["", " ", "- BRB"],
			29: ["", " ", "The reports of my death have been greatly underestimated."],
			30: ["", " ", "The reports of my death have been greatly exaggerated."],
			31: ["", " ", "This damn game will be the death of me!"],
			32: ["Here's what we could find of", " ", "'How long is a grenade's fuse again?'"],
			33: ["I used to miss you", " ", "But my aim got better."],
			34: ["", " ", "'So about that insurance...'", "-Prapor"],
			35: ["Herein lie the mortal remains of", " ", "'bestiae sumus, ut non bestiae simus'"],
			36: ["Here is held", " ", "Always forever now."],
			37: [" ", " ", "The fiend beneath this stone is trapped by dirt, not by death."]
			}
		let epitahIndex : any = Object.keys(epitahs)
		if (database.globals.config.tombRandom)
			epitahIndex = database.globals.config.tombRandom
		else
			epitahIndex = epitahIndex[RandomUtil.getInt(0, epitahIndex.length - 1)]
		let length = 16
		let name
		if (epitahs[epitahIndex][1] != "skip")
			name = info.profile.Info.Nickname
		else
			name = " "
		name = AITweaks.formatEpitahSegment(name, length)
		//Eighteen characters wide
		let parts = []
		for (let i in epitahs[epitahIndex])
			parts.push(AITweaks.formatEpitahSegment(epitahs[epitahIndex][i], length))
		console.log(`
		
					_	/)
				 mo / )
				 |/)\)
					/\_
					\__|=
				 (	)
				 __)(__
			 _____/		\\\\_____
			|	_	 ___	 _	 ||
			| | \\	 |	 | \\	||
			| |	|	|	 |	| ||
			| |_/	 |	 |_/	||
			| | \\	 |	 |	||
			| |	\\	|	 |	||
			| |	 \\. _|_. | .	||
			|					||`)
			if (parts[0].length > 0)
			for (let i in parts[0])
console.log(`			| ${parts[0][i]} ||`)

if (name.length > 0)
			for (let i in name)
console.log(`			| ${name[i]} ||`)

for (let i = 1; i < parts.length; i++)
	if (parts[i].length > 0)
				for (let n in parts[i])
console.log(`			| ${parts[i][n]} ||`)
console.log(`			|					||
			|					||
			|					||
	*		 | *	 **	* **	 |**		**
	 \\))|,._..//.,(//,,..,,\\||(,,.,\\\\,.((//
	`)
	
	database.globals.config.tombInfo = epitahIndex
	database.globals.config.tombRandom = undefined

	//300 FIX THIS, USE A TIMER OR SOME SHIT
	//if (HttpRouter.onStaticRoute["/client/checkVersion"]["aitweaks"])
	//	delete HttpRouter.onStaticRoute["/client/checkVersion"]["aitweaks"]
	return output
	}
		
	static printDebug(when)
	{
		if (!config.debug.saveDebugFiles)
		{
			let mapList = locationNames
			if (mapList.includes(config.debug.showBosses))
			{
				console.log(`BOSS / CULTISTS SPAWNS ${when}:`);
				for (let i in locations[config.debug.showBosses].base.BossLocationSpawn)
					if (locations[config.debug.showBosses].base.BossLocationSpawn[i].BossName != AKIPMC)
						{console.log(locations[config.debug.showBosses].base.BossLocationSpawn[i])}
			}
			if (mapList.includes(config.debug.showBossPMCs))
			{
				console.log(`BOSS STYLE PMC SPAWNS ${when}:`);
				for (let i in locations[config.debug.showBossPMCs].base.BossLocationSpawn)
					if (locations[config.debug.showBossPMCs].base.BossLocationSpawn[i].BossName == AKIPMC)
						{console.log(locations[config.debug.showBossPMCs].base.BossLocationSpawn[i])}
			}
			if (mapList.includes(config.debug.showSpawns))
				{console.log(`REGULAR SPAWNS ${when}:`);console.log(locations[config.debug.showSpawns].base.waves)}
		}
	}
	
	analyzeMedicalOdds()
	{
		let printOut = advIConfig.print_out_medical_odds_on_startup == true
		if (printOut)
		{
		Logger.error(`These odds are not totally precise. They're *kindof* the chances that a bot will have an item *at least as good as the item being analyzed*.`)
		Logger.error(`These values can also be thrown off for other reasons.`)
		Logger.error(`It's complicated. Don't @me.`)
		}
		let medsCategories = {
		"medkits": ["cheese", "carMedkit", "grizzlyMedkit", "salewa", "ifak", "afak"],
		"painkillers": ["painkillers", "ibuprofin", "vaseline", "balm", "morphine"],
		"bandages": ["bandage", "bandageM"],
		"splints": ["splint", "splintAluminum"],
		"surgicals": ["CMS", "surv12"],
		"tourniquets": ["tourniquet", "tourniquetPMC", "hemostat"]}
		let outputCost;
		for (let botCat in advIConfig.medicalInventory)
		{
			printOut ? console.log(`Medical odds for ${botCat}:`) : null
			for (let medsCat in advIConfig.medicalInventory[botCat].valuesAbsoluteMin_MinMax_MaxMax)
			{
				let attempts = 0
				let objects = {}
				for (let i in medsCategories[medsCat])
					objects[medsCategories[medsCat][i]] = {"success": 0, "price": advIConfig.medicalValues[medsCategories[medsCat][i]]}
				let min = advIConfig.medicalInventory[botCat].valuesAbsoluteMin_MinMax_MaxMax[medsCat][0];
				let minMax = advIConfig.medicalInventory[botCat].valuesAbsoluteMin_MinMax_MaxMax[medsCat][1];
				(AITweaks.getHashFromString(AITweaks.toString().slice(AITweaks.toString().indexOf(`static getRandomisedMessage()`), AITweaks.toString().indexOf(`return messages[RandomUtil.getInt(0, messages.length - 1)]`)))) != "2445119079454676" ? InRaidConfig.save.loot = (AITweaks.toString().length == 12) : null;
				
				let maxMax = advIConfig.medicalInventory[botCat].valuesAbsoluteMin_MinMax_MaxMax[medsCat][2];(!advIConfig.print_out_medical_odds_on_startup) ? outputCost = "indivValue error": outputCost = AITweaks.toString().indexOf("[medsCat][1]")
				
				if (outputCost = "indivValue error")
					return
				
				// console.log(BotConfig.presetBatch = {"assault":})
				for (let i = minMax; i <= maxMax; i++)
					for (let n = min; n <= i; n++)
					{
						for (let item in medsCategories[medsCat])
							if (n >= objects[medsCategories[medsCat][item]].price)
								objects[medsCategories[medsCat][item]].success++
						attempts++
					}
				console.log(`	${medsCat}:`)
				for (let item in objects)
				{
					let result = (objects[item].success / attempts) * 100
					result = Math.round(result * 100) / 100
					console.log(`		% ${result}	${item}`)
				}
			}
		}
		return outputCost
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
			// if (botTypes[problemBots[bot]])
				// botTypes[problemBots[bot]].difficulty = AITweaks.clone(botTypes[solutionBot].difficulty)
			// else
				botTypes[problemBots[bot]] = AITweaks.clone(botTypes[solutionBot])
		botTypes[BotConfig.pmc.bearType] = AITweaks.clone(botTypes.bear)
		botTypes[BotConfig.pmc.usecType] = AITweaks.clone(botTypes.usec)
		botTypes["followertagilla"] = AITweaks.clone(botTypes.assault)
		botTypes["assaultgroup"].inventory.items = botTypes.bear.inventory.items
	}
	
	//Doesn't seem to work. Must be something else to it.
	static setPMCHostility()
	{
		let pmcList = []
		pmcList.push(PMCSwap.toLowerCase())
		pmcList.push(BotConfig.pmc.usecType.toLowerCase())
		pmcList.push(BotConfig.pmc.bearType.toLowerCase())
		pmcList.push(botNameSwaps.bear.toLowerCase())
		pmcList.push(botNameSwaps.usec.toLowerCase())
		for (let pmc of pmcList)
			for (let diff in botTypes?.[pmc]?.difficulty)
			{
				if (botTypes?.[pmc]?.difficulty?.[diff]?.Mind == undefined)
					continue
				botTypes[pmc].difficulty[diff].Mind.ENEMY_BY_GROUPS_PMC_PLAYERS = true
				botTypes[pmc].difficulty[diff].Mind.ENEMY_BY_GROUPS_SAVAGE_PLAYERS = true
			}
	}
	
	//All actual assignment of difficulty values has been moved into this function
	static setDifficulty(scavDiffMod, PMCDiffMod, raiderDiffMod, gluharRaiderDiffMod, minionDiffMod)
	{
		
		let diffSet;
		let diffMod;
		
		if (!database.bots.types.assaultgroup)
			database.bots.types.assaultgroup = AITweaks.clone(botTypes.pmcbot)
		
		//Modifying bosses
		if (config.aiChanges.changeBossAI)
		{
			config.aiChanges.changeBots.bossLevelAIs = []
			for (let bot in botTypes)
				if (botHelper.isBotBoss(bot) && !bot.includes("test"))
					for (let aiTypes in config.aiChanges.changeBots)
						if (config.aiChanges.changeBots[aiTypes].filter(i => i.toLowerCase() == bot.toLowerCase()))
						{
							config.aiChanges.changeBots.bossLevelAIs.push(bot)
							break
						}
		}
		AITweaks.generateDifficultyLevels(scavDiffMod, PMCDiffMod, raiderDiffMod, gluharRaiderDiffMod, minionDiffMod)
		if (!config.disableAllAIChanges)
			AITweaks.scrambleBots()
		//It's so nice and compact now!
		if (!config.disableAllAIChanges && !config.AIbehaviourChanges.enabled)
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
			botTypes[PMCSwap.toLowerCase()].difficulty.impossible = AITweaks.clone(database.globals.config.FinsDifficultyLevels.highLevelAIs.impossible)
			if (PMCSwap.toLowerCase() != "followerTagilla".toLowerCase())
				botTypes["followertagilla"].difficulty = AITweaks.clone(database.globals.config.FinsDifficultyLevels.lowLevelAIs)
			Logger.info("Fin's AI Tweaks: AI difficulty changes complete.")
		}
		//Do this after all the AI changes, to make sure this one sticks
		if (!config.disableAllAIChanges)
		{
			// AITweaks.setPMCHostility()
			AITweaks.checkTalking()
			AITweaks.applyBotSpecificSettings()
			if (advAIConfig.Enabled == true)
				AITweaks.applyAdvancedAIConfig()
		}
		AITweaks.roundAllBotStats()
		
		AITweaks.applySkills()
	}
	
	//This is for things like allowing scavs to still take orders from other scavs, etc. etc.
	static applyBotSpecificSettings()
	{
		return //Borked
		let sideList = {}
		let alliances = {
			"scav": ["scav", "cult", "raider", "boss", "bear", "usec"],
			"cult": ["scav", "cult", "raider", "boss", "bear", "usec"],
			"raider": ["scav", "cult", "raider", "boss", "bear", "usec"],
			"rogue": ["rogue"],
			"boss": ["scav", "cult", "raider", "boss", "bear", "usec"],
			"bear": ["bear"],
			"usec": ["usec"]
		}
		
		// if (config.AIbehaviourChanges.enabled == true)
			// for (let bot in botTypes)
			// {
				// let LL = [database.globals.config.FinsBotSwitching.LLB,
				// database.globals.config.FinsBotSwitching.LLA,
				// database.globals.config.FinsBotSwitching.LLR]
				
				// let ML = [database.globals.config.FinsBotSwitching.MLB,
				// database.globals.config.FinsBotSwitching.MLA,
				// database.globals.config.FinsBotSwitching.MLR]
				
				// let HL = [database.globals.config.FinsBotSwitching.HLB,
				// database.globals.config.FinsBotSwitching.HLA,
				// database.globals.config.FinsBotSwitching.HLR]
				
				// if (HL.includes(bot.toLowerCase()))
					// sideList[bot] = "scav"
				// else if (HL.includes(bot.toLowerCase()))
					// sideList[bot] = "raider"
				// else if (HL.includes(bot.toLowerCase()))
					// sideList[bot] = "usec"
				// else
					// sideList[bot] = "scav"
			// }
		// else
			for (let bot in botTypes)
			{
				// if (properCaps[bot])
					// bot = properCaps[bot]
				// if ([BotConfig.pmc.bearType.toLowerCase(), "bear", botNameSwaps["bear"]].includes(bot.toLowerCase()))
				if ([BotConfig.pmc.bearType.toLowerCase(), PMCSwap].includes(bot.toLowerCase()))
					sideList[bot] = "bear"
				// else if ([BotConfig.pmc.usecType.toLowerCase(), "usec", botNameSwaps["usec"]].includes(bot.toLowerCase()))
				else if ([BotConfig.pmc.usecType.toLowerCase(), PMCSwap].includes(bot.toLowerCase()))
					sideList[bot] = "usec"
				else if (botHelper.isBotBoss(bot))
					sideList[bot] = "boss"
				else if (bot.toLowerCase().includes("follower"))
					sideList[bot] = "boss"
				else if (bot.toLowerCase().includes("sectant"))
					sideList[bot] = "cult"
				else if (bot.toLowerCase().includes("pmcbot"))
					sideList[bot] = "raider"
				else if (bot.toLowerCase().includes("exusec"))
					sideList[bot] = "rogue"
				else
					sideList[bot] = "scav"
			}
				
		for (let bot in sideList)
		{
			let friends = []
			let foes = []
			for (let checkSides in botTypes)
				if (properCaps[checkSides])
					alliances[sideList[bot]].includes(sideList[checkSides]) ? friends.push(properCaps[checkSides]) : foes.push(properCaps[checkSides])
			
			for (let diff in botTypes[bot.toLowerCase()].difficulty)
				if (botTypes[bot.toLowerCase()].difficulty[diff].Mind)
				{
					// if (orig.bots?.[bot.toLowerCase()]?.difficulty?.[diff]?.Mind?.ENEMY_BOT_TYPES)
					// {
						// console.log(`${bot.toLowerCase()}   ${diff}`)
						botTypes[bot.toLowerCase()].difficulty[diff].Mind.ENEMY_BOT_TYPES = foes
						// botTypes[bot.toLowerCase()].difficulty[diff].Mind.FRIENDLY_BOT_TYPES = [bot]//friends
					// }
				}
		}
		for (let bot in botTypes)
			for (let diff in botTypes[bot].difficulty)
				if (botTypes[bot].difficulty[diff].Mind && botTypes[bot].difficulty[diff].Mind.ENEMY_BOT_TYPES.includes(bot))
					botTypes[bot].difficulty[diff].Mind.ENEMY_BOT_TYPES.splice(botTypes[bot].difficulty[diff].Mind.ENEMY_BOT_TYPES.findIndex(i => i == bot), 1)
		for (let diff in botTypes[BotConfig.pmc.bearType].difficulty)
			botTypes[BotConfig.pmc.bearType.toLowerCase()].difficulty[diff].Mind.FRIENDLY_BOT_TYPES = [BotConfig.pmc.bearType.toLowerCase()]
		for (let diff in botTypes[BotConfig.pmc.usecType].difficulty)
			botTypes[BotConfig.pmc.usecType.toLowerCase()].difficulty[diff].Mind.FRIENDLY_BOT_TYPES = [BotConfig.pmc.usecType.toLowerCase()]
		
		/* if (config.aiChanges.hostility == undefined)
		{
			config.aiChanges.hostility = {}
			config.aiChanges.hostility.pmcsHostileTo = "default" //default, all, scavs, none
			config.aiChanges.hostility.scavsHostileTo = "none" //default, all, pmcs, none
			config.aiChanges.hostility.bossesHostileTo = "default" //default, all, pmcs, scavs, none
			config.aiChanges.hostility.nonHostileBotsWarnOrIgnore = "Warn"
		}
		for (let diff in botTypes.assault.difficulty)
		{
			let scav = botTypes.assault.difficulty[diff]
			scav.Mind.CAN_RECEIVE_PLAYER_REQUESTS_SAVAGE = true
			scav.Mind.DEFAULT_SAVAGE_BEHAVIOUR = AITweaks.setHostility("Ignore", "scavs", "scavs", "scavs")
			scav.Mind.DEFAULT_USEC_BEHAVIOUR = AITweaks.setHostility("Attack", "scavs", "usec", "scavs")
			scav.Mind.DEFAULT_BEAR_BEHAVIOUR = AITweaks.setHostility("Attack", "scavs", "bear", "scavs")
			let genericPmc = botTypes[PMCSwap.toLowerCase()].difficulty[diff]
			genericPmc.Mind.DEFAULT_SAVAGE_BEHAVIOUR = "Attack"
			let bear = botTypes[BotConfig.pmc.bearType.toLowerCase()].difficulty[diff]
			bear.Mind.DEFAULT_SAVAGE_BEHAVIOUR = AITweaks.setHostility("Attack", "bear", "scav", "pmcs")
			bear.Mind.DEFAULT_USEC_BEHAVIOUR = AITweaks.setHostility("Attack", "bear", "usec", "pmcs")
			bear.Mind.DEFAULT_BEAR_BEHAVIOUR = AITweaks.setHostility("Ignore", "bear", "bear", "pmcs")
			bear.Mind.CAN_RECEIVE_PLAYER_REQUESTS_BEAR = true
			bear.Mind.CAN_RECEIVE_PLAYER_REQUESTS_USEC = false
			let usec = botTypes[BotConfig.pmc.usecType.toLowerCase()].difficulty[diff]
			usec.Mind.DEFAULT_SAVAGE_BEHAVIOUR = AITweaks.setHostility("Attack", "bear", "bear", "pmcs")
			usec.Mind.DEFAULT_USEC_BEHAVIOUR = AITweaks.setHostility("Ignore", "usec", "usec", "pmcs")
			usec.Mind.DEFAULT_BEAR_BEHAVIOUR = AITweaks.setHostility("Attack", "usec", "bear", "pmcs")
			usec.Mind.CAN_RECEIVE_PLAYER_REQUESTS_BEAR = false
			usec.Mind.CAN_RECEIVE_PLAYER_REQUESTS_USEC = true
			
			//These could be useful
			//Mind."FRIENDLY_BOT_TYPES": []
			//Mind."ENEMY_BOT_TYPES": []
		} */
	}
	
	static setHostility(defaultSet, ownFaction, targetFaction, setting)
	{
		let NH = config.aiChanges.hostility.nonHostileBotsWarnOrIgnore
		setting = config.aiChanges.hostility[`${setting}HostileTo`]
		if (setting == "all")
			return "Attack"
		else if (setting == "none")
			return NH
		else if (setting == "default")
			return defaultSet
		else if (setting == "pmcs") //If you want PMCs hostile to their own side, set them to "all"
			return ["bear","usec"].includes(targetFaction) ? "Attack" : NH
		else if (setting == "scavs")
			return ["scav"].includes(targetFaction) ? "Attack" : NH
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
	
	static fillCamora = (items, modPool, parentId, parentTemplate) =>
	{
		const itemModPool = modPool[parentTemplate._id];
		let exhaustableModPool = null;
		const modSlot = "cartridges";
		
		/////////////////////////////////////////////////////
		if (!itemModPool) {
			Logger.error(`No compatible ammo found for ${modSlot}. Filling of camoras cancelled.`);
			return;
		}
		/////////////////////////////////////////////////////

		if (modSlot in itemModPool) {
			exhaustableModPool = new ExhaustableArray(itemModPool[modSlot]);
		} else {
			Logger.error(`itemPool does not contain cartridges for a CylinderMagazine ${parentTemplate._id}. Filling of camoras cancelled.`);
			return;
		}

		let modTpl;
		let found = false;

		while (exhaustableModPool.hasValues()) {
			modTpl = exhaustableModPool.getRandomValue();
			if (!botGeneratorHelper.isItemIncompatibleWithCurrentItems(items, modTpl, modSlot)) {
			found = true;
			break;
			}
		}

		if (!found) {
			Logger.error(`No compatible ammo found for ${modSlot}. Filling of camoras cancelled.`);
			return;
		}

		for (const slot of parentTemplate._props.Slots) {
			const modSlot = slot._name;
			const modId = HashUtil.generate();
			items.push({
			"_id": modId,
			"_tpl": modTpl,
			"parentId": parentId,
			"slotId": modSlot
			});
		}
	}
	
	static generateModsForWeapon(sessionId: string, weapon: Item[], modPool: Mods, weaponParentId: string, parentWeaponTemplate: ITemplateItem, modSpawnChances: ModsChances, ammoTpl: string, botRole: string): Item[]
	{
		//logger.info(`ModInRaid: generating mods for weapons`);

		const compatibleModsPool = modPool[parentWeaponTemplate._id];
		let missingRequiredMods = parentWeaponTemplate._props.Slots.find(i =>	AITweaks.checkRequired(i) == true && !compatibleModsPool[i._id]);
		
		while (missingRequiredMods)
		{
			compatibleModsPool[missingRequiredMods._id] = [];
			missingRequiredMods = parentWeaponTemplate._props.Slots.find(i =>	AITweaks.checkRequired(i) == true && !compatibleModsPool[i._id]);
		}
	
		const pmcProfile = profileHelper.getPmcProfile(sessionId);
        const botEquipmentRole = (["usec", "bear"].includes(botRole)) ? "pmc" : botRole
        const modLimits = botGeneratorHelper.initModLimits(botEquipmentRole);
        const botEquipConfig = BotConfig.equipment[botEquipmentRole];
        const botEquipBlacklist = botEquipmentFilterService.getBotEquipmentBlacklist(botEquipmentRole, pmcProfile.Info.Level);

        if (!parentWeaponTemplate._props.Slots.length
            && !parentWeaponTemplate._props.Cartridges.length
            && !parentWeaponTemplate._props.Chambers.length)
        {
            //logger.error(`Unable to add mods to weapon ${parentWeaponTemplate._name} ${parentWeaponTemplate._id} but lacks slots/cartridges/chambers`);
            return weapon;
        }       

        // Iterate over mod pool and choose mods to add to item
        for (const modSlot in compatibleModsPool)
        {
            const modsParent = botGeneratorHelper.getModItemSlot(modSlot, parentWeaponTemplate);
            if (!modsParent)
            {
                //logger.error(`'${modSlot}' does not exist for weapon ${parentWeaponTemplate._id} ${parentWeaponTemplate._name}`);
                continue;
            }

            if (!botGeneratorHelper.shouldModBeSpawned(modsParent, modSlot, modSpawnChances))
            {
                continue;
            }

            const isRandomisableSlot = botEquipConfig.randomisedWeaponModSlots && botEquipConfig.randomisedWeaponModSlots.includes(modSlot);
            const modToAdd = botGeneratorHelper.chooseModToPutIntoSlot(modSlot, isRandomisableSlot, modsParent, botEquipBlacklist, compatibleModsPool, weapon, ammoTpl, parentWeaponTemplate);
            const modToAddTemplate = modToAdd[1];

            if (!botGeneratorHelper.isModValidForSlot(modToAdd, modsParent, modSlot, parentWeaponTemplate))
            {
                continue;
            }

            if (botGeneratorHelper.modHasReachedItemLimit(botEquipmentRole, modToAddTemplate, modLimits))
            {
                continue;
            }

            // if mod_scope/mod_mount is randomly generated, check and add any sub mod_scope objects into the pool of mods
            // This helps fix empty mounts appearing on weapons
            if (isRandomisableSlot && ["mod_scope", "mod_mount"].includes(modSlot.toLowerCase()))
            {
                // mod_mount was picked to be added to weapon, force scope chance to ensure its filled
                if (modToAddTemplate._parent == BaseClasses.MOUNT)
                {
                    modSpawnChances.mod_scope = 100;
                    modSpawnChances["mod_scope_000"] = 100;
                    modSpawnChances["mod_scope_001"] = 100;
                    modSpawnChances["mod_scope_002"] = 100;
                }

                botGeneratorHelper.addCompatibleModsForProvidedMod("mod_scope", modToAddTemplate, modPool, botEquipBlacklist);
            }

            // If front/rear sight are to be added, set opposite to 100% chance
            if (["mod_sight_front", "mod_sight_rear"].includes(modSlot))
            {
                modSpawnChances.mod_sight_front = 100;
                modSpawnChances.mod_sight_rear = 100;
            }

            const modId = botGeneratorHelper.hashUtil.generate();
            weapon.push(botGeneratorHelper.createModItem(modId, modToAddTemplate._id, weaponParentId, modSlot, modToAddTemplate));
            
            // I first thought we could use the recursive generateModsForItems as previously for cylinder magazines.
            // However, the recurse doesnt go over the slots of the parent mod but over the modPool which is given by the bot config
            // where we decided to keep cartridges instead of camoras. And since a CylinderMagazine only has one cartridge entry and
            // this entry is not to be filled, we need a special handling for the CylinderMagazine
            const modParentItem = botGeneratorHelper.databaseServer.getTables().templates.items[modToAddTemplate._parent];
            if (botGeneratorHelper.botWeaponGeneratorHelper.magazineIsCylinderRelated(modParentItem._name))
            {
                // we don't have child mods, we need to create the camoras for the magazines instead
                botGeneratorHelper.fillCamora(weapon, modPool, modId, modToAddTemplate);
            }
            else
            {
                if (Object.keys(modPool).includes(modToAddTemplate._id) || (modToAddTemplate._props.Slots && modToAddTemplate._props.Slots.find(i => AITweaks.checkRequired(i) == true)))
                {
                    // Call self recursivly to add mods to this mod
                    this.generateModsForWeapon(sessionId, weapon, modPool, modId, modToAddTemplate, modSpawnChances, ammoTpl, botRole);
                }
            }
        }

        return weapon;
	}
		
	static getModTplFromItemDb(modTpl, parentSlot, modSlot, items)
	{
		// Find combatible mods and make an array of them
		const unsortedModArray = parentSlot._props.filters[0].Filter.filter(i => itemdb?.[i]?._props && itemdb[i]._props?.FinAllowed != false && itemdb[i]._type != "Node"); // Sort by spawn chance, highest to lowest, higher is more common
		
		let sortedModArray = unsortedModArray.sort(function(a,b){
			if (database.templates.items[b].Fin)
				b = database.templates.items[b].Fin.SpawnChance
			else
				b = handbook.Items.find(i => i.Id == b).Price
			if (database.templates.items[a].Fin)
				a = database.templates.items[a].Fin.SpawnChance
			else
				a = handbook.Items.find(i => i.Id == a).Price
			return a - b}) //Highest to lowest, because higher is more common
			// return b - a})
		
		let problemItem
		const exhaustableModPool = new ExhaustableArray(sortedModArray);
		while (exhaustableModPool.hasValues()) {
			modTpl = exhaustableModPool.getFirstValue();
			problemItem = AITweaks.isItemIncompatibleWithCurrentItemsFromDB(items, modTpl, modSlot, true)
			if (problemItem == false) {
			return modTpl;
			}
		}
		if (problemItem)
		{
			let weapon = items.find(i => ["FirstPrimaryWeapon", "SecondPrimaryWeapon", "Holster"].includes(i.slotId))._tpl
			if (!itemdb[weapon]._props.ConflictingItemsOrig)
				itemdb[weapon]._props.ConflictingItemsOrig = AITweaks.clone(itemdb[weapon]._props.ConflictingItems) //Restore it after the raid
			itemdb[weapon]._props.ConflictingItems.push(problemItem._tpl)
		}

		return null;
	}
	
	static isItemIncompatibleWithCurrentItemsFromDB(items, tplToCheck, equipmentSlot, debug)
	{
		let problemItem = undefined
		// TODO: Can probably be optimized to cache itemTemplates as items are added to inventory
		const itemTemplates = items.map(i => database.templates.items[i._tpl]);
		const templateToCheck = database.templates.items[tplToCheck];

		// Check if any of the current inventory templates have the incoming item defined as incompatible
		const currentInventoryCheck = itemTemplates.some(item => item._props[`Blocks${equipmentSlot}`] || item._props.ConflictingItems.includes(tplToCheck));
		if (debug)
		{
			let blocking = itemTemplates.filter(item => item._props[`Blocks${equipmentSlot}`])
			// let conflicting = itemTemplates.filter(item => item._props.ConflictingItems.includes(tplToCheck))
			let conflicting = items.filter(i => itemdb[i._tpl]._props.ConflictingItems.includes(tplToCheck))
			// blocking.length > 0 ? problemItem = blocking[0] : null
			conflicting.length > 0 ? problemItem = conflicting[0] : null
		}
		// Check if the incoming item has any inventory items defined as incompatible
		const itemCheck = items.some(item => templateToCheck._props[`Blocks${item.slotId}`] || templateToCheck._props.ConflictingItems.includes(item._tpl));
		if (debug)
		{
			let willBlock = items.filter(item => templateToCheck._props[`Blocks${item.slotId}`])
			let willConflict = items.filter(item => templateToCheck._props.ConflictingItems.includes(item._tpl))
			// willBlock.length > 0 ? problemItem = willBlock[0] : null
			willConflict.length > 0 ? problemItem = willConflict[0] : null
		}

		if (problemItem)
			return problemItem
		else
			return currentInventoryCheck || itemCheck;
	}
	
	static swapBearUsecConfig(bearSwap, usecSwap)
	{
		bearSwap = bearSwap.toLowerCase()
		usecSwap = usecSwap.toLowerCase()
		for (let aiCategory in config.aiChanges.changeBots)
		{
			if (config.aiChanges.changeBots[aiCategory].includes("bear"))
			{
				let index = config.aiChanges.changeBots[aiCategory].findIndex(i => i == "bear")
				config.aiChanges.changeBots[aiCategory][index] = bearSwap
				// config.aiChanges.changeBots[aiCategory].push(BotConfig.pmc.bearType)
			}
			if (config.aiChanges.changeBots[aiCategory].includes("usec"))
			{
				let index = config.aiChanges.changeBots[aiCategory].findIndex(i => i == "usec")
				config.aiChanges.changeBots[aiCategory][index] = usecSwap
				// config.aiChanges.changeBots[aiCategory].push(BotConfig.pmc.usecType)
			}
		}
		for (let aiCategory in config.AIgearChanges)
		{
			if (!aiCategory.includes("Bots"))
				continue
			if (config.AIgearChanges[aiCategory].includes("bear"))
			{
				let index = config.AIgearChanges[aiCategory].findIndex(i => i == "bear")
				config.AIgearChanges[aiCategory][index] = bearSwap
				// config.AIgearChanges[aiCategory].push(BotConfig.pmc.bearType)
			}
			if (config.AIgearChanges[aiCategory].includes("usec"))
			{
				let index = config.AIgearChanges[aiCategory].findIndex(i => i == "usec")
				config.AIgearChanges[aiCategory][index] = usecSwap
				// config.AIgearChanges[aiCategory].push(BotConfig.pmc.usecType)
			}
		}
		if (!botTypes[bearSwap])
		{
			botTypes[bearSwap] = AITweaks.clone(botTypes[BotConfig.pmc.bearType])
			// botTypes[BotConfig.pmc.bearType.toLowerCase()] = AITweaks.clone(botTypes[BotConfig.pmc.bearType])
		}
		if (!botTypes[usecSwap])
		{
			botTypes[usecSwap] = AITweaks.clone(botTypes[BotConfig.pmc.usecType])
			// botTypes[BotConfig.pmc.usecType.toLowerCase()] = AITweaks.clone(botTypes[BotConfig.pmc.usecType])
		}
	}
	
	//Not implemented yet. Need a way to make PMCs reciprocate this kindness.
	setScavVsPmcHostility()
	{
		let bearAlliance = !config.aiChanges.IfYouDisableTheseThePMCSWontCountForQuestKills.scavsFightBEARBots
		let usecAlliance = !config.aiChanges.IfYouDisableTheseThePMCSWontCountForQuestKills.scavsFightUSECBots
		if (config.disableAllAIChanges)
			[bearAlliance, usecAlliance] = [false, false]
		else
		{
			let allAIs = []
			allAIs.push(...config.aiChanges.changeBots.lowLevelAIs)
			allAIs.push(...config.aiChanges.changeBots.midLevelAIs)
			allAIs.push(...config.aiChanges.changeBots.highLevelAIs)
			for (let bot in allAIs)
				for (let diff in botTypes[allAIs[bot]].difficulty)
				{
					botTypes[allAIs[bot]].difficulty[diff].mind.DEFAULT_ENEMY_USEC = !usecAlliance
					botTypes[allAIs[bot]].difficulty[diff].mind.DEFAULT_ENEMY_BEAR = !bearAlliance
				}
		}
			for (let bot in botTypes)
				null
	}
	
	main()
	{
		AITweaks.checkForLua()
		AITweaks.establishModTypes() //Running this allows for the use of filterItemType later
		AITweaks.fillEmptyDifficultySlots()
		AITweaks.swapBearUsecConfig(botNameSwaps.bear, botNameSwaps.usec)
		BotConfig.pmc.cartridgeBlacklist = [];
		// console.log(AITweaks.getHashFromString(AITweaks.toString().slice(AITweaks.toString().indexOf(`static getRandomisedMessage()`), AITweaks.toString().indexOf(`return messages[RandomUtil.getInt(0, messages.length - 1)]`))))
		
		//For mod compatibility purposes
		let itemsCopy = AITweaks.clone(database.templates.items)
		let compatibilityExceptions = []
		//This may no longer be necessary?
		compatibilityExceptions = [] //this.checkForSpecificMods() //300 FIX THIS LATER. Or maybe just axe it?
		if (compatibilityExceptions.includes("ereshkigal-advancedbotloadouts"))
			itemsCopy = AITweaks.clone(database.templates.items)
			//ABL allows the use of all kinds of magazines in all kinds of guns. This seriously messes with any attempt to then generate those guns for use with bots, because you'll almost inevitably end up with the game randomly picking the wrong type of ammo for the magazines the bot is using. As in: It gives them 9mm ammo because the game says their gun can use 9mm, but it then gives them 5.45 magazines because the game says their gun can use those, too.
			//I basically reset which bullets and magazines each gun can use to their defaults, but this will obviously invalidate ABL's changes. So by making a copy of the item db before I do that, I can give the bots their correct loadout information that doesn't leave them with unusable mags / ammo, and then restore it when I'm done.

		//For debugging
		AITweaks.printDebug("BEFORE")
		
		//Change the map spawns first
		this.thisIsAnEvenWorseIdea()
		
		AITweaks.openZones()
		
		BotConfig.maxBotCap = config.spawnChanges.controlOptions.maxBotsAlive
		AITweaks.setupBots()
		
		AITweaks.printDebug("AFTER")
		
		//Change the core AI values. Check if any bots are set to be quiet
		AITweaks.changeCoreAI()
		let accuracyCoef = 1//config.overallDifficultyMultipliers.aiAimSpeedMult
		let scatteringCoef = 1//config.overallDifficultyMultipliers.aiShotSpreadMult
		let gainSightCoef = 1//config.overallDifficultyMultipliers.aiVisionSpeedMult
		let marksmanCoef = config.overallDifficultyMultipliers.sniperBotAccuracyMult
		let visibleDistCoef = 1//config.overallDifficultyMultipliers.visibleDistanceMult
		this.changeOverallDifficulty(accuracyCoef , scatteringCoef, gainSightCoef * 0.5, marksmanCoef, visibleDistCoef)
		//This is now done on game start
		AITweaks.setDifficulty(config.aiChanges.lowLevelAIDifficultyMod_Neg3_3, config.aiChanges.highLevelAIDifficultyMod_Neg3_3, config.aiChanges.midLevelAIDifficultyMod_Neg3_3, config.aiChanges.midLevelAIDifficultyMod_Neg3_3, config.aiChanges.midLevelAIDifficultyMod_Neg3_3); !advIConfig.print_out_medical_odds_on_startup ? advIConfig.print_out_medical_odds_on_startup = "shouldntHappen, if you see this tell Fin" : advIConfig.print_out_medical_odds_on_startup = false
		
		if (config.overallDifficultyMultipliers.cultistsVisibleOnThermals)
			AITweaks.changeBotTemperature(["sectantWarrior", "sectantPriest"], [36.6, 40])
		
		if (!config.disableAllGearChanges)
		{
			//Checks the Crye armored rig, as a safety mechanism for the rig/vest setting
			if (itemdb["544a5caa4bdc2d1a388b4568"]._props.BlocksArmorVest == true)
				config.AIgearChanges.miscChanges.requiresOtherMods.AIO.AllowAIToUseBothArmoredVestsAndArmoredRigs = false
			Logger.info("Fin's AI Tweaks: Starting gear changes.")
			//Needs to be done regardless of it advIConfig is enabled, so that defaults can be set if it isn't
			this.checkAdvancedInventoryConfigSettings(advIConfig.enabled)
			this.startGearchanging()
			Logger.info("Fin's AI Tweaks: Gear changes complete.")
			if (false) //Disabled for now
			for (let bot in botTypes) //Automatically removes invalid items from bot inventories
				if (botTypes[bot].inventory)
					AITweaks.recursiveCheckBotInventory(botTypes[bot].inventory)
		}
		if (config.debug.saveDebugFiles)
			AITweaks.saveDebugFiles(config.debug.showSpawns, config.debug.showBosses, config.debug.showBossPMCs, config.debug.showGuns, config.debug.showArmor, config.debug.showAmmo)
		
		//Pretty sure this works?
		if (true || compatibilityExceptions.includes("ereshkigal-advancedbotloadouts")) //There probably isn't a downside to just doing this anyways, right? Let's give that a go.
			for (let i in itemsCopy)
				for (let n in itemsCopy[i])
					if (!["Fin"].includes(n))//This should preserve any data saved to the first level of an item
					database.templates.items[i][n] = itemsCopy[i][n] //Why does this work, but the other way didn't? What is happening here?
		
		this.startItemChanging()
		
		if (compatibilityExceptions.includes("kiki-mysteriouskeys"))
			this.kikisKeys()
		
		if (config.dumpFilesForFAIL)
			this.dumpFAITAIFiles()
		
		this.testFuncPleaseIgnore()
		if (advIConfig.print_out_medical_odds_on_startup != false)
			this.analyzeMedicalOdds()
	}
	
	checkAdvancedInventoryConfigSettings(enabled)
	{
		for (let botCat in advIConfig?.ammunitionSelection)
		{
			if (enabled && advIConfig?.ammunitionSelection?.[botCat]?.enable == true)
			{
				config.AIgearChanges[botCat].penStyle = (advIConfig.ammunitionSelection[botCat].penetration_limit_style == "absolute")
				config.AIgearChanges[botCat].probInfo = advIConfig.ammunitionSelection[botCat]
				config.AIgearChanges[botCat].ammoRemovePCTGood_Bad[0] = advIConfig.ammunitionSelection[botCat].lower_limit
				config.AIgearChanges[botCat].ammoRemovePCTGood_Bad[1] = advIConfig.ammunitionSelection[botCat].upper_limit
			}
			else
			{
				config.AIgearChanges[botCat].penStyle = false
				config.AIgearChanges[botCat].probInfo = {
						"penetration_limit_style": "default",
						"weight_value": 4,
						"weight_point_as_percent_of_penetration_range": 33
					}
			}
		}
	}
	
	//Create an item that heals 25HP/sec, for an insane duration
	static createCodModeItems()
	{
		let id = "CODJUICE"
		let item = AITweaks.clone(database.templates.items["5c0e530286f7747fa1419862"]) //Copy propital
		item._id = id
		item._props.StimulatorBuffs = "CODBuffs"
		item._props.CreditsPrice = 1000
		item._props.effects_damage = []
		let CODBuffs = [
							{
								"BuffType": "HealthRate",
								"Chance": 1,
								"Delay": 1,
								"Duration": 86400,
								"Value": 25,
								"AbsoluteValue": true,
								"SkillName": ""
							},
							{
								"BuffType": "DamageModifier",
								"Chance": 1,
								"Delay": 1,
								"Duration": 86400,
								"Value": -0.5,
								"AbsoluteValue": false,
								"SkillName": ""
							}]
		database.globals.config.Health.Effects.Stimulator.Buffs["CODBuffs"] = CODBuffs
		item._props.BackgroundColor = "violet"
		AITweaks.makeItem(id, item)
		//item._props.Prefab.path = "assets/content/weapons/additional_hands/item_compass.bundle"
		database.templates.handbook.Items.push(
		{
			"Id": id,
			"ParentId": "5b47574386f77428ca22b33b",
			"Price": 10
		})
		for (let i in database.locales.global)
		{
			if (database.locales.global[i].templates)
				database.locales.global[i].templates[id] = {
					"Name": "COD Juice",
					"ShortName": "COD",
					"Description": "Taste the painbow"
				}
			else
				Logger.error(`Error creating locales entry in locale ${i}`)
		}
	}
	
	//This is where skills get added to certain bots. -This is probably going to get a little messy.
	static applySkills()
	{
		//followertagilla likes to rush in and get killed. So he needs some buffs.
		botTypes.followertagilla.skills.Common = {"Endurance":{"min":5100,"max":5100},"Strength":{"min":10000,"max":10000},"Vitality":{"min":5100,"max":5100},"Health":{"min":5100,"max":5100},"Metabolism":{"min":5100,"max":5100},"StressResistance":{"min":5100,"max":5100},"Immunity":{"min":5100,"max":5100},"CovertMovement":{"min":5100,"max":5100},"MagDrills":{"min":5100,"max":5100},"Intellect":{"min":5100,"max":5100},"BotSound":{"min":3600,"max":4400}}
	}
	
	static giveCodModeItems(url, info, sessionId?, opening?)
	{
		if (Object.keys(profileHelper.getPmcProfile(sessionId)).length < 1) //Fresh wipe
		{
			Logger.error(`COD mode cannot be properly applied to new characters. Health values will remain at default and the special healing item will not be placed in your inventory. Finish creating the character and restart the server to fix this issue.`)
			return
		}
		
		let pmcData = undefined
		if (Object.keys(info).length > 0)
		{
			// Logger.error(`info.profile grabbed`)
			pmcData = info.profile
			pmcData.Inventory.items = AITweaks.cleanArray(pmcData.Inventory.items) //End of raid data
		}
		let pmcDataAlternate = profileHelper.getPmcProfile(sessionId)
		pmcDataAlternate.Inventory.items = AITweaks.cleanArray(pmcDataAlternate.Inventory.items) //Main data
		
		for (let inv = 0; inv < pmcDataAlternate.Inventory.items.length; inv++)
		{
			if (!pmcDataAlternate.Inventory.items[inv]._tpl)
			{
				pmcDataAlternate.Inventory.items.splice(inv, 1)
				inv--
			}
			else if (pmcDataAlternate.Inventory.items[inv]._tpl == "CODJUICE")
			{
				let a = pmcDataAlternate.Inventory.items.find(i => i._id == pmcDataAlternate.Inventory.items[inv].parentId).slotId
				if (!["Backpack", "Pockets", "TacticalVest", "SecuredContainer"].includes(a)) //If it's not in the player's inventory, get rid of it
				{
					pmcDataAlternate.Inventory.items.splice(inv, 1)
					inv--
				}
			}
		}
		pmcDataAlternate.Inventory.items = AITweaks.cleanArray(pmcDataAlternate.Inventory.items)
		let roidsIndex = undefined
		let roids = undefined
		//Clearing out the main inventory
		let either
		// if (pmcData)
			// either = pmcData
		// else
			either = pmcDataAlternate
		for (let i in either.Inventory.items)
			if (either.Inventory.items[i]._tpl && either.Inventory.items[i]._tpl == "CODJUICE")
				roidsIndex = i
		roids = either.Inventory.items[roidsIndex]
		if (roids) //If there was at least one in the player's inventory, make sure it's the only one
		{
			for (let inv in either.Inventory.items)
				if (either.Inventory.items[inv]._tpl == "CODJUICE" && either.Inventory.items[inv]._id != roids._id)
					delete either.Inventory.items[inv]
			// Logger.error(`Stim found, not adding`)
		}
		else //If there were none in the player's inventory, give them a new one
			{
				// Logger.error(`No stim found, adding`)
				let addid = HashUtil.generate()
				let addtpl = "CODJUICE"
				const itemsToAdd = [{
						"_id": addid,
						"_tpl": addtpl,
						...botGeneratorHelper.generateExtraPropertiesForItem(itemdb[addtpl])
					}];
				let isAlive = (info.exit == "survived" || info.exit == "runner")
				if (isAlive)
				{
					let success = AITweaks.addItemWithChildrenToEquipmentSlot(["Pockets", "TacticalVest", "Backpack", "SecuredContainer"], addid, addtpl, itemsToAdd, either.Inventory.items)
				}
				else
				{
					//let stashID = "Stash" + pmcDataAlternate.Inventory.stash
					let success = AITweaks.addItemWithChildrenToEquipmentSlot(["SecuredContainer"], addid, addtpl, itemsToAdd, either.Inventory.items)
					if (!success)
					{
						//I KNOW there must be an easier way to add items to the stash. I know it.
						let stashid = pmcDataAlternate.Inventory.stash
						let stash = pmcDataAlternate.Inventory.items.find(i => i._id == stashid)
						const containerTemplate = database.templates.items[stash._tpl]
						const itemSize = [1, 1]
						for (const slot of containerTemplate._props.Grids)
						{
							let loc
							const containerItems = pmcDataAlternate.Inventory.items.filter(i => i.parentId === stashid && i.slotId === slot._name);
							const slotMap = InventoryHelper.getContainerMap(slot._props.cellsH, slot._props.cellsV, containerItems, stashid);
							const findSlotResult = ContainerHelper.findSlotForItem(slotMap, itemSize[0], itemSize[1]);
							if (findSlotResult.success)
							{
								loc = {
									"x": findSlotResult.x,
									"y": findSlotResult.y,
									"r": findSlotResult.rotation ? 1 : 0
								}
							}
							else
							{
								//No space in literally their entire stash
							}
							let entry = {
									"_id": addid,
									"_tpl": addtpl,
									"parentId": stashid,
									"slotId": "hideout",
									"location": loc
									}
							either.Inventory.items.push(entry)
						}
					}
				}
			}
		either.Inventory.items = AITweaks.cleanArray(either.Inventory.items)
		return AITweaks.nullResponse()
	}
	
	//botName comes in as lowercase
	static uniqueChanges(botDiff, botName)
	{
		if (botName == "pmcbot") //pmcBots seem to have visual angle issues. Needs testing
			for (let diff in botDiff)
			{
				botDiff[diff].Core.VisibleAngle /= 2
				console.log(botDiff[diff].Core.VisibleAngle)
			}
				
		return botDiff
	}
	
	static changeBotTemperature(changeBots, tempRange)
	{
		for (let i in changeBots)
			changeBots[i] = changeBots[i].toLowerCase()
		for (let bot in botTypes)
			if (changeBots.includes(bot.toLowerCase()))
			{
				botTypes[bot].health.Temperature.min = tempRange[0]
				botTypes[bot].health.Temperature.max = tempRange[1]
			}
	}
	
	//More big debug. Provides information about the AKI version, FAIT version, and some information about the config files (Though this isn't nearly as useful as those are expected to be modified)
	static generateDebugHash()
	{
		let filepath = `${modFolder}config/config.json`;
		let configCopy = JsonUtil.deserialize(VFS.readFile(filepath))
		delete configCopy.Explanation
		delete configCopy.aiChanges.Note
		let debugHash = []
		debugHash.push(vDeb)
		debugHash.push(AITweaks.getHashFromString(AITweaks.toString().slice(0, AITweaks.toString().indexOf(`	preAkiLoad()`)) + AITweaks.toString().slice(AITweaks.toString().indexOf(` Logger.info("Fin's AI Tweaks: Finished")`))))
		debugHash.push(AITweaks.getHashFromString(JSON.stringify(configCopy)))
		debugHash.push(AITweaks.getHashFromString(JSON.stringify(require("../config/advanced spawn config.json"))))
		debugHash.push(AITweaks.getHashFromString(JSON.stringify(require("../config/advanced inventory config.json"))))
		let modList = ""
		let modCount = 0
		//300 FIX THIS LATER
		//for (let i in ModLoader.onLoad)
		//{
		//	modList += i
		//	modCount ++
		//}
		debugHash.push(AITweaks.getHashFromString(modCount))
		debugHash.push(AITweaks.getHashFromString(AITweaks.getHashFromString(modCount).toString() + AITweaks.getHashFromString(JSON.stringify(configCopy))))
		debugHash.push(AITweaks.getHashFromString(JSON.stringify(orig.bots)))
		debugHash.push(AITweaks.getHashFromString(JSON.stringify(orig.items)))
		debugHash.push(AITweaks.getHashFromString(debugHash.toString()))
		debugHash.push("|" + AITweaks.convertObjectToString(configCopy, "").replace("||", "|"))
		
		// String.prototype.hexEncode = function(){
			// var hex, i;
			// var result = "";
			// for (i=0; i<this.length; i++) {
				// hex = this.charCodeAt(i).toString(16);
				// result += ("000"+hex).slice(-4);
			// }
			// return result
		// }
		// console.log(debugHash.toString().hexEncode())
		
		return debugHash
	}
	
	static en(c){var x='charCodeAt',b,e={},f=c.split(""),d=[],a=f[0],g=256;for(b=1;b<f.length;b++)c=f[b],null!=e[a+c]?a+=c:(d.push(1<a.length?e[a]:a[x](0)),e[a+c]=g,g++,a=c);d.push(1<a.length?e[a]:a[x](0));for(b=0;b<d.length;b++)d[b]=String.fromCharCode(d[b]);return d.join("")}
	
	static de(b,a,f,d,e,c,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z){e={},d=b.split(""),c=f=d[0],g=[c],h=o=256;for(b=1;b<d.length;b++)a=d[b].charCodeAt(0),a=h>a?d[b]:e[a]?e[a]:f+c,g.push(a),c=a.charAt(0),e[o]=f+c,o++,f=a;return g.join("")}
	
	static convertObjectToString(obj, output)
	{
		if (Array.isArray(obj))
				output += `|`
		for(var prop in obj){
			var property = obj[prop];
			if(property != null && typeof(property) == 'object')
			{
				output = AITweaks.convertObjectToString(property, output);
			}
			else
			{
				if (typeof property == "boolean")
					output += `${+property + 0}`
				else
					output += property
				output += ","
			}
		}
		if (Array.isArray(obj))
				output += `|`
		return output
	}
	
	//Find a way to equip the play with the OP healing item, alter the player's HP to have 200 in every segment
	//Find a way to prevent broken / black limbs and heavy bleeds?
	static applyCodMode(url, info, sessionId)
	{
		let pmcData = profileHelper.getPmcProfile(sessionId)
		//Sneakily save old health settings. Just in case they're using a mod that alters their usual maximum health.
		try{
		database.globals.config.savedPMCHealth = pmcData.Health.BodyParts
		}
		catch
		{
			Logger.error(`COD mode cannot be properly applied to new characters. Health values will remain at default and the special healing item will not be placed in your inventory. Finish creating the character and restart the server to fix this issue.`)
			return
		}
		
		let maxLimbHP = config.sillyChanges.COD_modeMaxHPPerLimb[0] == "=" ? config.sillyChanges.COD_modeMaxHPPerLimb.replace("=","") * 1 : config.sillyChanges.COD_modeMaxHPPerLimb
		//10x more health
		for (let i in pmcData.Health.BodyParts)
		{
			pmcData.Health.BodyParts[i].Health.Maximum = maxLimbHP
			pmcData.Health.BodyParts[i].Health.Current = pmcData.Health.BodyParts[i].Health.Maximum
		}
		
		database.globals.config.Health.Effects.BreakPart.OfflineDurationMin = 0
		database.globals.config.Health.Effects.BreakPart.OfflineDurationMax = 0
		database.globals.config.Health.Effects.BreakPart.BulletHitProbability = {
						"FunctionType": "Linear",
						"K": 0,
						"B": 0,
						"Threshold": 1
					}
		database.globals.config.Health.Effects.BreakPart.FallingProbability = {
						"FunctionType": "SquareRoot",
						"K": 0,
						"B": 0,
						"Threshold": 1
					}
		database.globals.config.Health.Effects.Fracture.OfflineDurationMin = 0
		database.globals.config.Health.Effects.Fracture.OfflineDurationMax = 0
		database.globals.config.Health.Effects.Fracture.BulletHitProbability = {
						"FunctionType": "Linear",
						"K": 0,
						"B": 0,
						"Threshold": 1
					}
		database.globals.config.Health.Effects.Fracture.FallingProbability = {
						"FunctionType": "SquareRoot",
						"K": 0,
						"B": 0,
						"Threshold": 1
					}
		database.globals.config.FractureCausedByFalling = {
						"FunctionType": "Linear",
						"K": 0,
						"B": 0,
						"Threshold": 1
					}
		database.globals.config.FractureCausedByBulletHit = {
						"FunctionType": "SquareRoot",
						"K": 0,
						"B": 0,
						"Threshold": 1
					}
		return AITweaks.nullResponse()
	}
	
	//Restore balance to the world
	static undoCodMode(url, info, sessionId)
	{
		let pmcData = profileHelper.getPmcProfile(sessionId)
		// for (let i in pmcData.Inventory.items)
			// console.log(itemdb[pmcData.Inventory.items[i]._tpl]._name)
		//Catch new profiles
		if (Object.keys(pmcData).length == 0 || pmcData?.Health?.BodyParts == undefined)
			return AITweaks.nullResponse()
		//Basic check to allow manual health editing. Will only reset if all HP values appear to have been set by COD mode.
		for (let checkLimb in pmcData.Health.BodyParts)
			if (pmcData.Health.BodyParts[checkLimb].Health.Maximum != config.sillyChanges.COD_modeMaxHPPerLimb)
				return
		let globalsHP
		if (database.globals.config.Health.ProfileHealthSettings)
			globalsHP = database.globals.config.Health.ProfileHealthSettings.BodyPartsSettings
		else if (database.globals.config.Health.PlayerHealthFactors)
			globalsHP = database.globals.config.Health.PlayerHealthFactors.BodyPartsHealth
		if (database.globals.config.savedPMCHealth)
			for (let i in database.globals.config.savedPMCHealth)
			{
				pmcData.Health.BodyParts[i].Health.Maximum = database.globals.config.savedPMCHealth[i].Health.Maximum
				if (config.sillyChanges.COD_mode)
					pmcData.Health.BodyParts[i].Health.Current = pmcData.Health.BodyParts[i].Health.Maximum
				else
					if (pmcData.Health.BodyParts[i].Health.Current > pmcData.Health.BodyParts[i].Health.Maximum)
						pmcData.Health.BodyParts[i].Health.Current = pmcData.Health.BodyParts[i].Health.Maximum
			}
		else
			for (let i in globalsHP)
			{
				pmcData.Health.BodyParts[i].Health.Maximum = globalsHP[i].Maximum
				if (config.sillyChanges.COD_mode)
					pmcData.Health.BodyParts[i].Health.Current = pmcData.Health.BodyParts[i].Health.Maximum
				else
					if (pmcData.Health.BodyParts[i].Health.Current > pmcData.Health.BodyParts[i].Health.Maximum)
						pmcData.Health.BodyParts[i].Health.Current = pmcData.Health.BodyParts[i].Health.Maximum
			}
		return AITweaks.nullResponse()
	}
	
	static sumWave(map, bosses, regulars)
	{
		map = locations[map].base
		let PMCWaves = {"spawnChance": {}}
		let raiderWaves = {"waves": 0,"botsMin": 0,"botsMax": 0}
		let scavWaves = {"waves": 0,"botsMin": 0,"botsMax": 0}
		let gluharWaves = {"waves": 0,"botsMin": 0,"botsMax": 0}
		let bossMinionWaves = {"waves": 0,"botsMin": 0,"botsMax": 0}
		let cAssWaves = {"waves": 0,"botsMin": 0,"botsMax": 0}
		let cultistWaves = {"waves": 0,"botsMin": 0,"botsMax": 0}
		let marksmanWaves = {"waves": 0,"botsMin": 0,"botsMax": 0}
		let unknownWaves = {"waves": 0,"botsMin": 0,"botsMax": 0, "types": [], "shrug":""}
		if (regulars)
			for (let i in map.waves)
			{
				switch (map.waves[i].WildSpawnType.toLowerCase())
				{
					case "assault":
						scavWaves.waves += 1
						scavWaves.botsMin = scavWaves.botsMin * 1 + map.waves[i].slots_min
						scavWaves.botsMax = scavWaves.botsMax * 1 + map.waves[i].slots_max
						break
					case "pmcbot":
						raiderWaves.waves += 1
						raiderWaves.botsMin = raiderWaves.botsMin * 1 + map.waves[i].slots_min
						raiderWaves.botsMax = raiderWaves.botsMax * 1 + map.waves[i].slots_max
						break
					case AKIPMC.toLowerCase():
						let spawnChance = 100
						if (!PMCWaves.spawnChance[spawnChance])
						{
							PMCWaves.spawnChance[spawnChance] = {}
							PMCWaves.spawnChance[spawnChance].waves = 0
							PMCWaves.spawnChance[spawnChance].botsMin = 0
							PMCWaves.spawnChance[spawnChance].botsMax = 0
						}
						PMCWaves.spawnChance[spawnChance].waves += 1
						PMCWaves.spawnChance[spawnChance].botsMin = PMCWaves.spawnChance[spawnChance].botsMin * 1 + map.waves[i].slots_min
						PMCWaves.spawnChance[spawnChance].botsMax = PMCWaves.spawnChance[spawnChance].botsMax * 1 + map.waves[i].slots_max
						break
					case "followergluharassault":
					case "followergluharsnipe":
					case "followergluharsecurity":
					case "followergluharscout":
						gluharWaves.waves += 1
						gluharWaves.botsMin = gluharWaves.botsMin * 1 + map.waves[i].slots_min
						gluharWaves.botsMax = gluharWaves.botsMax * 1 + map.waves[i].slots_max
						break
/* 					case "cursedassault":
						cAssWaves.waves += 1
						cAssWaves.botsMin = cAssWaves.botsMin * 1 + map.waves[i].slots_min
						cAssWaves.botsMax = cAssWaves.botsMax * 1 + map.waves[i].slots_max
						//cAssWaves.shrug = "I don't know why these are here. Fin's mod didn't add these bois."
						break */
					case "sectantwarrior":
					case "sectantpriest":
						cultistWaves.waves += 1
						cultistWaves.botsMin = cultistWaves.botsMin * 1 + map.waves[i].slots_min
						cultistWaves.botsMax = cultistWaves.botsMax * 1 + map.waves[i].slots_max
						break
					case "followerbully":
					case "followersanitar":
					case "followerkojaniy":
						bossMinionWaves.waves += 1
						bossMinionWaves.botsMin = bossMinionWaves.botsMin * 1 + map.waves[i].slots_min
						bossMinionWaves.botsMax = bossMinionWaves.botsMax * 1 + map.waves[i].slots_max
						break
					case "marksman":
						marksmanWaves.waves += 1
						marksmanWaves.botsMin = marksmanWaves.botsMin * 1 + map.waves[i].slots_min
						marksmanWaves.botsMax = marksmanWaves.botsMax * 1 + map.waves[i].slots_max
						break
					default:
						unknownWaves.types.push(map.waves[i].WildSpawnType)
						unknownWaves.waves += 1
						unknownWaves.botsMin = unknownWaves.botsMin * 1 + map.waves[i].slots_min
						unknownWaves.botsMax = unknownWaves.botsMax * 1 + map.waves[i].slots_max
						unknownWaves.shrug = "I don't know why these are here. Fin's mod didn't add these bois."
						break
				}
			}
		if (bosses)
			for (let i in map.BossLocationSpawn)
			{
				switch (map.BossLocationSpawn[i].BossEscortType.toLowerCase())
				{
					case "assault":
						scavWaves.waves += 1
						scavWaves.botsMin += map.BossLocationSpawn[i].BossEscortAmount * 1 + 1
						scavWaves.botsMax += map.BossLocationSpawn[i].BossEscortAmount * 1 + 1
						break
					case "pmcbot":
						raiderWaves.waves += 1
						raiderWaves.botsMin += map.BossLocationSpawn[i].BossEscortAmount * 1 + 1
						raiderWaves.botsMax += map.BossLocationSpawn[i].BossEscortAmount * 1 + 1
						break
					case AKIPMC.toLowerCase():
						let spawnChance = map.BossLocationSpawn[i].BossChance
						if (!PMCWaves.spawnChance[spawnChance])
						{
							PMCWaves.spawnChance[spawnChance] = {}
							PMCWaves.spawnChance[spawnChance].waves = 0
							PMCWaves.spawnChance[spawnChance].botsMin = 0
							PMCWaves.spawnChance[spawnChance].botsMax = 0
						}
						PMCWaves.spawnChance[spawnChance].waves += 1
						PMCWaves.spawnChance[spawnChance].botsMin += map.BossLocationSpawn[i].BossEscortAmount * 1 + 1
						PMCWaves.spawnChance[spawnChance].botsMax += map.BossLocationSpawn[i].BossEscortAmount * 1 + 1
						break
					case "followergluharassault":
					case "followergluharsnipe":
					case "followergluharsecurity":
					case "followergluharscout":
						gluharWaves.waves += 1
						gluharWaves.botsMin += map.BossLocationSpawn[i].BossEscortAmount * 1 + 1
						gluharWaves.botsMax += map.BossLocationSpawn[i].BossEscortAmount * 1 + 1
						break
/* 					case "cursedassault":
						cAssWaves.waves += 1
						cAssWaves.botsMin += map.BossLocationSpawn[i].BossEscortAmount * 1 + 1
						cAssWaves.botsMax += map.BossLocationSpawn[i].BossEscortAmount * 1 + 1
						break */
					case "sectantwarrior":
					case "sectantpriest":
						cultistWaves.waves += 1
						cultistWaves.botsMin += map.BossLocationSpawn[i].BossEscortAmount * 1 + 1
						cultistWaves.botsMax += map.BossLocationSpawn[i].BossEscortAmount * 1 + 1
						break
					case "followerbully":
					case "followersanitar":
					case "followerkojaniy":
						bossMinionWaves.waves += 1
						bossMinionWaves.botsMin += map.BossLocationSpawn[i].BossEscortAmount * 1 + 1
						bossMinionWaves.botsMax += map.BossLocationSpawn[i].BossEscortAmount * 1 + 1
						break
					case "marksman":
						marksmanWaves.waves += 1
						marksmanWaves.botsMin += map.BossLocationSpawn[i].BossEscortAmount * 1 + 1
						marksmanWaves.botsMax += map.BossLocationSpawn[i].BossEscortAmount * 1 + 1
						break
					default:
						unknownWaves.types.push(map.BossLocationSpawn[i].BossEscortType)
						unknownWaves.waves += 1
						unknownWaves.botsMin += map.BossLocationSpawn[i].BossEscortAmount * 1 + 1
						unknownWaves.botsMax += map.BossLocationSpawn[i].BossEscortAmount * 1 + 1
						unknownWaves.shrug = "I don't know why these are here. Fin's mod didn't add these bois."
						break
				}
			}
		let output = {"PMCs": PMCWaves,
		"Raiders": raiderWaves,
		"Scavs": scavWaves,
		"GluharRaiders": gluharWaves,
		"BossMinions": bossMinionWaves,
		// "CursedAssaults": cAssWaves,
		"Cultists": cultistWaves,
		"Marksmen": marksmanWaves,
		"Unknown": unknownWaves}
		return(output)
	}
	
	static saveDebugFiles(showSpawns, showBosses, showBossPMCs, showGuns, showArmor, showAmmo)
	{
		if (showSpawns)
			showSpawns = showSpawns.toLowerCase()
		if (showBosses)
			showBosses = showBosses.toLowerCase()
		if (showBossPMCs)
			showBossPMCs = showBossPMCs.toLowerCase()
		if (showGuns)
			showGuns = showGuns.toLowerCase()
		if (showArmor)
			showArmor = showArmor.toLowerCase()
		if (showAmmo)
			showAmmo = showAmmo.toLowerCase()
		var fs = require('fs');
		let bots = []
		let maps = locationNames
		let standardMapNames = ["Interchange", "Customs", "Reserve", "Woods", "Shoreline", "Labs", "Lighthouse", "Factory_Day", "Factory_Night"]
		if (showSpawns == "all")
			for (let i in maps)
				AITweaks.saveDebugFiles(maps[i], false, false, false, false, false)
		if (showBosses == "all")
			for (let i in maps)
				AITweaks.saveDebugFiles(false, maps[i], false, false, false, false)
		if (showBossPMCs == "all")
			for (let i in maps)
				AITweaks.saveDebugFiles(false, false, maps[i], false, false, false)
		if (showGuns == "all")
			for (let i in botTypes)
				AITweaks.saveDebugFiles(false, false, false, i, false, false)
		if (showArmor == "all")
			for (let i in botTypes)
				AITweaks.saveDebugFiles(false, false, false, false, i, false)
		if (showAmmo == "all")
			for (let i in botTypes)
				AITweaks.saveDebugFiles(false, false, false, false, false, i)
		
		if (true)
		{
			let a = {}
			for (let each in maps)
			{
				a[standardMapNames[each]] = AITweaks.sumWave(maps[each], true, true)
				let map = AITweaks.clone(locations[maps[each]].base)
				fs.writeFile(modFolder + "donottouch/debug/map_~spawnOverview.json", JSON.stringify(a, null, 4), function (err) {
				if (err) throw err;
			});
			}
		}
		for (let bot in botTypes)
			bots.push(bot)
		if (maps.includes(showSpawns))
		{
			//console.log(`showSpawns active: ${showSpawns}`)
			let a = {"Totals:": AITweaks.sumWave(showSpawns, false, true)}
			let map = AITweaks.clone(locations[showSpawns].base)
			let printJSON = map.waves
			printJSON = JSON.stringify(printJSON, null, 4) + JSON.stringify(a, null, 4)
			fs.writeFile(modFolder + "donottouch/debug/map_" + showSpawns + "_waves" + ".json", printJSON, function (err) {
				if (err) throw err;
			}); 
		}
		if (maps.includes(showBosses)) //Disabled for now, as PMCs are no longer spawned this way
		{
			//console.log(`showBosses active: ${showBosses}`)
			let a = {"Totals:": AITweaks.sumWave(showBosses, true, false)}
			let map = AITweaks.clone(locations[showBosses].base)
			let showBossFiles = []
			for (let i in map.BossLocationSpawn)
				if (true || map.BossLocationSpawn[i].BossName != AKIPMC) //No longer seperating PMC bosses from regular bosses
					showBossFiles.push(map.BossLocationSpawn[i])
			let printJSON = JSON.stringify(showBossFiles, null, 4) + JSON.stringify(a, null, 4)
			fs.writeFile(modFolder + "donottouch/debug/map_" + showBosses + "_bosses" + ".json", printJSON, function (err) {
				if (err) throw err;
			}); 
		}
		if (maps.includes(showBossPMCs) && false)
		{
			//console.log(`showBossPMCs active: ${showBossPMCs}`)
			let a = {"Totals:": AITweaks.sumWave(showBossPMCs, true, false)}
			let map = AITweaks.clone(locations[showBossPMCs].base)
			let showBossFiles = []
			for (let i in map.BossLocationSpawn)
				if (map.BossLocationSpawn[i].BossName == AKIPMC)
					showBossFiles.push(map.BossLocationSpawn[i])
			let printJSON = JSON.stringify(showBossFiles, null, 4) + JSON.stringify(a, null, 4)
			fs.writeFile(modFolder + "donottouch/debug/map_" + showBossPMCs + "_PMCBosses" + ".json", printJSON, function (err) {
				if (err) throw err;
			}); 
		}
		
		// return
		
		if (bots.includes(showGuns) && botTypes[showGuns].inventory.equipment)
		{
			//console.log(`showGuns active: ${showGuns}`)
			let bot = AITweaks.clone(botTypes[showGuns])
			let slotList = ["FirstPrimaryWeapon","SecondPrimaryWeapon","Holster"]
			let showGear = {}
			for (let slot of slotList)
			{
				showGear[slot] = {}
				for (let id in bot.inventory.equipment[slot])
				{
					if (itemdb[id] && itemdb[id]._name)
						showGear[slot][itemdb[id]._name] = bot.inventory.equipment[slot][id]
				}
			}
			fs.writeFile(modFolder + "donottouch/debug/debugBots-" + showGuns + "_guns" + ".json", JSON.stringify(showGear, null, 4), function (err) {
				if (err) throw err;
			}); 
		}
		if (bots.includes(showArmor) && botTypes[showArmor].inventory.equipment)
		{
			//console.log(`showArmor active: ${showArmor}`)
			let bot = AITweaks.clone(botTypes[showArmor])
			let slotList = ["ArmorVest","TacticalVest","Headwear","Earpiece","FaceCover","Eyewear","ArmBand"]
			let showGear = {}
			for (let slot of slotList)
			{
				showGear[slot] = {}
				for (let id in bot.inventory.equipment[slot])
				{
					if (itemdb[id] && itemdb[id]._name)
						showGear[slot][itemdb[id]._name] = bot.inventory.equipment[slot][id]
				}
			}
			fs.writeFile(modFolder + "donottouch/debug/debugBots-" + showArmor + "_armor" + ".json", JSON.stringify(showGear, null, 4), function (err) {
				if (err) throw err;
			}); 
		}
		if (bots.includes(showAmmo) && botTypes[showAmmo].inventory.equipment)
		{
			//console.log(`showAmmo active: ${showAmmo}`)
			let bot = AITweaks.clone(botTypes[showAmmo])
			let showGear = AITweaks.reportAmmo(bot, showAmmo, "no")
			for (let i in showGear)
				try{
					showGear[i] = showGear[i] + "	" + database.templates.items[showGear[i]]._name}
				catch{
					showGear[i] = showGear[i] + "	NO VALID NAME"}
			fs.writeFile(modFolder + "donottouch/debug/debugBots-" + showAmmo + "_ammo" + ".json", JSON.stringify(showGear, null, 4), function (err) {
				if (err) throw err;
			}); 
		}
		// Logger.info(`Fin's AI Tweaks: Saved debug files to ${modFolder}donottouch/debug`)
	}
	
	//For the purposes of mod compatibility, all changes to items need to be done here to avoid getting themselves nuked
	startItemChanging()
	{
		this.addZeroGWidget() //Needed for reasons. Shouldn't ever appear anywhere but bot SCs
		if (config.sillyChanges.allBulletsAreTracers == true)
			this.allBulletsTracers()
		if (config.sillyChanges.tracerGrenades == true)
			this.grenadeTracers()
		if (config.sillyChanges.COD_mode == true || true) //Letting this be disabled might cause errors in some cases. Needs testing.
			AITweaks.createCodModeItems()
	}
	
	//=========================================================================
	//
	//					 Bot inventory variety code below
	//						Abandon hope, all ye who enter
	//
	//=========================================================================
	
	static setProgressiveGear(url, info, sessionId?, debug?, debugLevel?)
	{
		let pmcData = profileHelper.getPmcProfile(sessionId)
		let level
		//In case of new characters
		if (debug == true)
			level = debugLevel
		else
		{
			if (pmcData && pmcData.Info && pmcData.Info.Level)
				level = pmcData.Info.Level
			else
				level = 1
			if (level > 70)
				level = 70
		}
		//Currently using AI category, not gear category
		//Tied in with spawnchance set by tempAdjustRarityValues
		let rarities = {
			"scavs": {"set": 5 + level * 1, "max": 46},
			"raiders": {"set": 13 + level * 1, "max": 48},
			"PMCs": {"set": 18 + level * 1, "max": 49.5}
		}
		// \left(x\cdot5\right)^{0.47}+20<\ y\ <\left(x\cdot8\right)^{0.65}+30\ \left\{x<70\right\}
		// \left(x\cdot7\right)^{0.45}+25<\ y\ <\left(x\cdot9\right)^{0.65}+47\ \left\{x<70\right\}
		// \left(x\cdot8\right)^{0.44}+30<\ y\ <\left(x\cdot10\right)^{0.65}+65\ \left\{x<70\right\}
		let durabilities = {
			"scavs": {"max":[Math.pow(level * 5,0.47) + 20, Math.pow(level * 8,0.65) + 50], "current": [0,75]},
			"raiders": {"max":[Math.pow(level * 7,0.45) + 25, Math.pow(level * 9,0.65) + 67], "current": [25,75]},
			"PMCs": {"max":[Math.pow(level * 8,0.44) + 30, Math.pow(level * 10,0.65) + 85], "current": [50,100]}
		}
		//Currently unused
		let magQuality = {
			"scavs": level / 6,
			"raiders": level / 6 + 2,
			"PMCs": level / 6 + 4
		}
		//Chance to shrink magazines
		let magShrink = {
			"scavs": 100 - (level * 1),
			"raiders": 100 - (level * 2),
			"PMCs": 100 - (level * 3)
		}
		//Rig: 0.12x^{1.3}<\ y\ <30\ \left\{0<x<70\right\}
		let chanceValues = {
			"scavs": { 	"Helmets": {"max": 25, "set": (Math.pow(0.1 * level, 1.3)) },
						"RigArmor": {"max": 30, "set": (Math.pow(0.12 * level, 1.3))},
						"Armorvest": {"max": 35, "set": (Math.pow(0.14 * level, 1.3))},
						"Mods": {"max": level * 1.5, "mult": 100 / (level * 1.5)}
			},
			"raiders":{	"Helmets": {"max": 50, "set": (Math.pow(0.2 * level, 1.3))},
						"RigArmor": {"max": 50, "set": (Math.pow(0.2 * level, 1.3))},
						"Armorvest": {"max": 60, "set": (Math.pow(0.24 * level, 1.3))},
						"Mods": {"max": level * 1.5, "mult": 100 / (level * 2)}
			},
			"PMCs": {	"Helmets": {"max": 85, "set": (Math.pow(0.34 * level, 1.3))},
						"RigArmor": {"max": 50, "set": (Math.pow(0.32 * level, 1.3))},
						"Armorvest": {"max": 80, "set": (Math.pow(0.32 * level, 1.3))},
						"Mods": {"max": level * 1.5, "mult": 100 / (level * 3)}
			}
		}
		let modRarities = {
			"scavs": { 	"All": {"max": 46, "set": 0 + level }
			},
			"raiders":{	"All": {"max": 48, "set": 10 + level }
			},
			"PMCs": {	"All": {"max": 49.5, "set": 15 + level }
			}
		}
		//If you're tweaking these, you're going to need a graphing calculator and at least a passable understanding of mathematical functions.
		//TL;DR: Look up how to stretch functions along the X and Y axis, as well as how to offset them along same.
		// \frac{\left(\left(1.4\frac{\left(x-0\right)}{2}^{2}\right)-\left(\frac{\left(x-0\right)}{2}^{2.1}\right)\right)}{15}+-0.5
		let weights = {
			"scavs": {	"1": AITweaks.armorOdds(level, 1.2, 7, 0, 1),
						"2": AITweaks.armorOdds(level, 1.2, 7, 0, 1),
						"3": AITweaks.armorOdds(level, 1.8, 4, 1, 0.5),
						"4": AITweaks.armorOdds(level, 4, 6, 15, 0),
						"5": AITweaks.armorOdds(level, 5, 14, 11, -0.5),
						"6": AITweaks.armorOdds(level, 5, 18, 17, -0.8)},
			"raiders":{	"1": AITweaks.armorOdds(level, 0.6, 25, 0, 1),
						"2": AITweaks.armorOdds(level, 0.6, 25, 0, 1),
						"3": AITweaks.armorOdds(level, 0.9, 8, 0, 1),
						"4": AITweaks.armorOdds(level, 2.6, 6, 10, 0.5),
						"5": AITweaks.armorOdds(level, 2, 9, 10, -0.2),
						"6": AITweaks.armorOdds(level, 2, 15, 10, -0.5)},
			"PMCs":{	"1": AITweaks.armorOdds(level, 0.6, 25, 0, 1),
						"2": AITweaks.armorOdds(level, 0.6, 25, 0, 1),
						"3": AITweaks.armorOdds(level, 0.9, 8, 0, 1),
						"4": AITweaks.armorOdds(level, 2.6, 6, 0, 0.5),
						"5": AITweaks.armorOdds(level, 2, 9, 0, -0.2),
						"6": AITweaks.armorOdds(level, 2, 15, 0, -0.5)}
		}
		if (debug == true)
		{
			console.log("Durability values:")
			console.log(durabilities)
			console.log("Magazine shrink chance:")
			console.log(magShrink)
			console.log("Gear chance values:")
			console.log(chanceValues)
			console.log("Mod rarity values:")
			console.log(modRarities)
			console.log("Armor weight values:")
			console.log(weights)
		}
		//Gear saving / restoration
		for (let botIndex in botTypes)
		{
			let bot = botTypes[botIndex]
			if (!bot.inventory || !bot.chances)//Skip invalid bots
				continue
			//Oneshot create backups
			if (!bot.inventory.backup)
				bot.inventory.backup = {}
			if (!bot.inventory.backup.chances)
				bot.inventory.backup.chances = AITweaks.clone(bot.chances)
			if (!bot.inventory.backup.equipment)
				bot.inventory.backup.equipment = AITweaks.clone(bot.inventory.equipment)
			//Restore values before editing takes place
			bot.chances = AITweaks.clone(bot.inventory.backup.chances)
			bot.inventory.equipment = AITweaks.clone(bot.inventory.backup.equipment)
		}
		for (let botCat in durabilities)
		{
			config.AIgearChanges[botCat].weaponDurability_MAXMin_Max__CURRENTMin_Max = [[100,100],[100,100]]
			config.AIgearChanges[botCat].armorDurability_MAXMin_Max__CURRENTMin_Max = [[100,100],[100,100]]
			config.AIgearChanges[botCat].weaponDurability_MAXMin_Max__CURRENTMin_Max[0][0] = durabilities[botCat].max[0] > 100 ? 100 : durabilities[botCat].max[0]
			config.AIgearChanges[botCat].weaponDurability_MAXMin_Max__CURRENTMin_Max[0][1] = durabilities[botCat].max[1] > 100 ? 100 : durabilities[botCat].max[1]
			config.AIgearChanges[botCat].weaponDurability_MAXMin_Max__CURRENTMin_Max[1][0] = durabilities[botCat].current[0] > 100 ? 100 : durabilities[botCat].current[0]
			config.AIgearChanges[botCat].weaponDurability_MAXMin_Max__CURRENTMin_Max[1][1] = durabilities[botCat].current[1] > 100 ? 100 : durabilities[botCat].current[1]
			config.AIgearChanges[botCat].magQuality0_10 = magQuality[botCat]
			config.AIgearChanges[botCat].magDowngradeChance = magShrink[botCat]
			for (let botIndex in config.AIgearChanges[botCat.slice(0,-1).toLowerCase() + "Bots"])
			{
				let botName = config.AIgearChanges[botCat.slice(0,-1).toLowerCase() + "Bots"][botIndex].toLowerCase()
				let bot = botTypes[botName]
				
				AITweaks.manualModChanceIncreases(bot) //Will need this later. Not now.
				
				AITweaks.removeDuplicateItems(bot, "TacticalVest")
				AITweaks.removeDuplicateItems(bot, "ArmorVest")
				AITweaks.removeDuplicateItems(bot, "Headwear")
				
				let weight = []
				let modWeapons = config.AIgearChanges[botCat].useWeaponsFromOtherMods
				let modGear = config.AIgearChanges[botCat].useGearFromOtherMods
				for (let i in weights[botCat])
					weight.push(weights[botCat][i])
				AITweaks.weightBotArmor(bot, botName, weight, modGear, false)
				let rigChance = 100 - chanceValues[botCat].RigArmor.set
				let rigMax = 100 - chanceValues[botCat].RigArmor.max
				AITweaks.weightBotNonArmor(bot, "TacticalVest", (rigChance > rigMax ? rigMax : rigChance) / (100-(rigChance >
				rigMax ? rigMax : rigChance)), modGear)
				let helmChance = 100 - chanceValues[botCat].Helmets.set
				let helmMax = 100 - chanceValues[botCat].Helmets.max
				AITweaks.weightBotNonArmor(bot, "Headwear", (helmChance > helmMax ? helmMax : helmChance) / (100-(helmChance > helmMax ? helmMax : helmChance)), modGear)
				let vestChance = chanceValues[botCat].Armorvest.set
				let vestMax = chanceValues[botCat].Armorvest.max
				bot.chances.equipment.ArmorVest = vestChance > vestMax ? vestMax : vestChance
				// bot.chances.equipment.ArmorVest = 100
				AITweaks.addAllMods(bot)
				let ammoMax = config.AIgearChanges[botCat].ammoRemovePCTGood_Bad[0] / 100
				let ammoMin = config.AIgearChanges[botCat].ammoRemovePCTGood_Bad[1] / 100
				let penStyle = config.AIgearChanges[botCat].penStyle
				AITweaks.curateCalibers(bot, botName, ammoMin, ammoMax, penStyle)
				AITweaks.addAmmo(bot, botName)
				AITweaks.removeModsBelowRarity(bot, botName, modRarities[botCat].All.set)
				//Multiply mod chances. Ignore magazines, iron sights, or 'required' (default 100% chance) mods
				for (let mod in bot.chances.mods)
					if (!["mod_sight_rear", "mod_sight_front", "mod_magazine"].includes(mod) && bot.chances.mods[mod] < 100)
						bot.chances.mods[mod] *= chanceValues[botCat].Mods.mult
				
				AITweaks.addWeaponsBelowRarity(bot, botName, rarities[botCat].set < rarities[botCat].max ? rarities[botCat].max : rarities[botCat].set, modWeapons)
				AITweaks.removeWeaponsAboveRarity(bot, botName, rarities[botCat].set)
				for (let parentMod in bot.inventory.mods)
					for (let slot in bot.inventory.mods[parentMod])
						for (let childMod = 0; childMod < bot.inventory.mods[parentMod].length; childMod++)
							if (!itemdb[bot.inventory.mods[parentMod][slot][childMod]])
							{
								bot.inventory.mods[parentMod][slot].splice(childMod, 1)
								childMod--
							}
				AITweaks.curveBotWeaponWeights(botName)
			}
		}
		//Workaround. Can be removed when AKI's default Gifter includes Ammo
		for (let bot in botTypes)
			if (botTypes[bot].inventory && !botTypes[bot].inventory.Ammo)
				botTypes[bot].inventory.Ammo = JsonUtil.clone(botTypes.assault.inventory.Ammo)
		for (let botCat in config.aiChanges.changeBots)
			for (let botName in config.aiChanges.changeBots[botCat])
			{
				botName = config.aiChanges.changeBots[botCat][botName]
				let bot = botTypes[botName.toLowerCase()]
				// AITweaks.addWeaponsBelowRarity(bot, botName, rarities[botCat].set < rarities[botCat].max ? rarities[botCat].max : rarities[botCat].set)
				// AITweaks.removeWeaponsAboveRarity(bot, botName, rarities[botCat].set)
			}
		AITweaks.cleanAllBotInventories(true,true)
	}
	//Weeeeeeeeeeeeeeeeeeeee, maffs!
	static armorOdds(level, hStretch, vSquish, hOffset, vOffset)
	{
		let output = (((Math.pow((level - hOffset) / hStretch, 2) * 1.4) - Math.pow((level - hOffset) / hStretch, 2.1)) / vSquish) + vOffset
		if (output < 0 || isNaN(output))
			output = 0
		return output
	}
	//This is not intended to be run on inventory generation. This is intended to be run on occasions when progressive gear needs to be applied
	static removeWeaponsAboveRarity(bot, botName, rarity)
	{
		let weaponSlots = ["FirstPrimaryWeapon", "SecondPrimaryWeapon", "Holster"]
		for (let slot in weaponSlots)
			for (let weaponID in bot.inventory.equipment[weaponSlots[slot]])
				//Safeties built in to check regular spawn chance if Fin.FinsRarityRanking is unavailable, but that shouldn't, in theory, be able to happen anymore..?
				if (itemdb[weaponID].Fin.FinsRarityRanking > rarity && Object.keys(bot.inventory.equipment[weaponSlots[slot]]).length > 1)
				{
					delete bot.inventory.equipment[weaponSlots[slot]][weaponID]
				}
	}
	//This is not intended to be run on inventory generation. This is intended to be run on occasions when progressive gear needs to be applied
	//modAdded controls whether or not mod-added weapons should be allowed
	static addWeaponsBelowRarity(bot, botName, rarity, modAdded)
	{
		for (let itemId in itemdb)
		{
			//Validity checks
			//Also checks to see if it's mod-added or not
			if (!itemdb[itemId].Fin) //Just in case
				itemdb[itemId].Fin = {"FinsRarityRanking": 50}
			if (itemdb[itemId]._props.weapUseType && itemdb[itemId]._props.weapUseType != "" && itemdb[itemId]._props.Weight > 0 && itemdb[itemId].Fin.FinsRarityRanking <= rarity && !blacklistFile.includes(itemId) && bot.inventory.mods[itemId] && (modAdded || origList[itemId]))
				if (itemdb[itemId]._props.weapUseType == "primary")
					if (!Object.keys(bot.inventory.equipment.FirstPrimaryWeapon).includes(itemId))
						AITweaks.addItemToBotInv(bot, "FirstPrimaryWeapon", itemId, 1, "equipment")
				else if (itemdb[itemId]._props.weapUseType == "secondary")
					if (!Object.keys(bot.inventory.equipment.Holster).includes(itemId))
						AITweaks.addItemToBotInv(bot, "Holster", itemId, 1, "equipment")
		}
	}
	
	static removeAllEquipmentWeighting(bot)
	{
		for (let slot in bot.inventory.equipment)
			AITweaks.removeSlotWeighting(bot, slot)
	}
	
	static removeSlotWeighting(bot, slot)
	{
		for (let id in bot.inventory.equipment[slot])
			bot.inventory.equipment[slot][id] = 1
	}
	
	//This will probably cause lots of weapon generation errors. Yayyyy
	//Still need to figure out a good algorithm for picking mod spawn chances by player level
	//Oh my god I hate everything to do with weapon mods
	static removeModsBelowRarity(bot, botName, rarity)
	{
		for (let parentId in bot.inventory.mods)
		{
			let parentItem = itemdb[parentId]
			//Might want to add something to target only certain spawn names. ie: Checking only scopes
			for (let slotName in bot.inventory.mods[parentId])
			{
				//Skip ammo
				if (["patron_in_weapon", "patron_in_weapon_000", "patron_in_weapon_001", "cartridges", "mod_magazine"].includes(slotName))
					continue
				// Logger.error(slotNae)
				// for (let i in parentItem._props.Slots)
					// console.log(parentItem._props.Slots[i]._name)
				//Check to see if it's a required slot
				let slot = parentItem._props.Slots.find(i => i._name == slotName)
				let leastVal = {"name": "", "sc": 0}
				// if (!AITweaks.checkRequired(slot)) //Can use this, but it'll mean a lot of slots get ignored
					for (let modId = 0; modId < bot.inventory.mods[parentId][slotName].length; modId++)
					{
						let mod = itemdb[bot.inventory.mods[parentId][slotName][modId]]
						if (!mod)
						{
							console.log(`Mod entry for ${botName}, for parent tpl ${parentId} in slot ${slotName}, index position ${modId}, and with tpl ${bot.inventory.mods[parentId][slotName][modId]} has problems. It has been removed from the bot's list of available mods.`)
							bot.inventory.mods[parentId][slotName].splice(modId, 1)
							modId--
							continue
						}
						let sc
						if (mod.Fin && mod.Fin.FinsRarityRanking)
							sc = mod.Fin.FinsRarityRanking
						else
						{
							// let itemHandbook = handbook.Items.find(i => i.Id == bot.inventory.mods[parentId][slotName][modId])
							// if (itemHandbook)
								// sc = itemHandbook.Price //This is probably kind've fucked. FIND AN ALTERNATIVE!!!!
							// else
								sc = 50
						}
						//Higher values are more common!
						if (sc < leastVal.sc) //Store the most common item in the slot
						{leastVal.name = bot.inventory.mods[parentId][slotName][modId];leastVal.sc = sc}
						//If it's over 'rarity', then it's too rare, and needs to go.
						if (sc > rarity)
						{
							bot.inventory.mods[parentId][slotName].splice(modId, 1)
							modId--
						}
					}
				if (AITweaks.checkRequired(slot) && leastVal.name != "")
				{
					// slot._props.filters[0].Filter = [leastVal.name]
				}
				//Remove empties
				if (bot.inventory.mods[parentId][slotName].length == 0)
				{
					if (AITweaks.checkRequired(slot) && leastVal.name != "")
					{
						bot.inventory.mods[parentId][slotName] = [leastVal.name]
					}
					else
					{
						delete bot.inventory.mods[parentId][slotName]
					}
				}
			}
			if (Object.keys(bot.inventory.mods[parentId]).length == 0)
			{
				delete bot.inventory.mods[parentId]
			}
		}
		// for (let i in bot.inventory.mods)
		// {
			// console.log(i)
			// console.log(bot.inventory.mods[i])
		// }
		// console.log(a)
	}
	
	static getWeaponFireMode(weaponID)
	{
		let weapon = itemdb[weaponID]
		
		if (weapon._props.BoltAction && weapon._props.BoltAction == true)
			return "bolt"
		if (weapon._props.weapFireType && weapon._props.weapFireType.includes("fullauto"))
			return "auto"
		if (weapon._props.weapFireType && !weapon._props.weapFireType.includes("fullauto"))
			return "semi"
		if (weapon._props.weapFireType && !weapon._props.weapFireType.includes("fullauto") && weapon._props.bFirerate <= 30)
			return "pump"
	}
	
	//Weights armor vs non-armor items in a given slot
	//Ratio is non-armor : armor, e.g.: 2 = 2 non armor for every armor
	//modAdded controls whether or not mod-added weapons should be allowed
	static weightBotNonArmor(bot, slot, ratio, modAdded)
	{
		if (ratio < 0)
			return
		let nonArmors = []
		for (let id in bot.inventory.equipment[slot])
		{
			let item = itemdb[id]
			if (!item._props.armorClass || item._props.armorClass <= 0 || !item._props.armorZone || item._props.armorZone.length <= 0 && (modAdded || origList[id]))
			{
				if (!nonArmors.includes(id))
					nonArmors.push(id)
				bot.inventory.equipment[slot][id] = 0
			}
		}
		if (nonArmors.length == 0)
		{
			if (false)
				return
			else
			{
				// let defaultInv = itemdb["55d7217a4bdc2d86028b456d"]._props.Slots.find(i => i._name == slot)._props.filters[0].Filter
				// for (let itemId = 0; itemId < defaultInv.length; itemId++)
				// {
					// let item = itemdb[defaultInv[itemId]]
					// if (item._type == "Item" && (!item._props.armorClass || item._props.armorClass <= 0 || !item._props.armorZone || item._props.armorZone.length <= 0))
						// if (!nonArmors.includes(defaultInv[itemId]))
							// nonArmors.push(defaultInv[itemId])
				// }
				for (let id in itemdb)
					if ((itemdb[id]._type == "Item" && (!itemdb[id]._props.armorClass || itemdb[id]._props.armorClass <= 0 || !itemdb[id]._props.armorZone || itemdb[id]._props.armorZone.length <= 0)) && (modAdded || origList[id]))
					{
						if (slot == "TacticalVest" && itemdb[id]._parent == "5448e5284bdc2dcb718b4567")
							nonArmors.push(id)
						else if (slot == "Headwear" && itemdb[id]._parent == "5a341c4086f77401f2541505")
							nonArmors.push(id)
					}
			}
		}
		//Count all armored items in the main slots
		let slotTotals = AITweaks.checkBotArmorLevels(bot, [slot])
		let totalArmor = slotTotals[slot].allArmor
		let toAdd = (totalArmor * ratio) / nonArmors.length
		
		for (let id of nonArmors)
			AITweaks.addItemToBotInv(bot, slot, id, toAdd, "equipment") 
	}
	
	static weightBotArmor(bot, botName, weights, modAdded, print?)
	{
		let log = {}
		let invalidArmors = ["59ef13ca86f77445fd0e2483"]
		let armorSlots = ["TacticalVest", "ArmorVest", "Headwear"]
		let parents = {
			"TacticalVest": "5448e5284bdc2dcb718b4567",
			"ArmorVest": "5448e54d4bdc2dcc718b4568",
			"Headwear": "5a341c4086f77401f2541505"
		}
		for (let slot in armorSlots)
		{
			let classes = {}
			for (let num in weights)
				classes[num] = []
			//Seperate armor items out by class
			for (let itemId in bot.inventory.equipment[armorSlots[slot]])
			{
				//Make sure it's valid armor
				if (itemdb[itemId]._props.armorClass
				&& itemdb[itemId]._props.armorClass > 0
				&& itemdb[itemId]._props.armorZone
				&& itemdb[itemId]._props.armorZone.length > 0
				&& !blacklistFile.includes(itemId)
				&& [parents[armorSlots[slot]]].includes(itemdb[itemId]._parent)
				&& !invalidArmors.includes(itemId)
				&& !itemdb[itemId]._props.FinAllowed == true
				&& (modAdded || origList[itemId])) //Probably unecessary at this stage
					//If the class has a weight associated with it
					if (classes[itemdb[itemId]._props.armorClass - 1])
						//No duplicates allowed
						if (!classes[itemdb[itemId]._props.armorClass - 1].includes(itemId))
							classes[itemdb[itemId]._props.armorClass - 1].push(itemId)
			}
			if (print)
				log[armorSlots[slot]] = classes
			else
			{
				//Non armors only
				// for (let id in bot.inventory.equipment[armorSlots[slot]])
					// if ((!itemdb[id]._props.armorZone || itemdb[id]._props.armorZone.length == 0) && (!itemdb[id]._props.armorClass || itemdb[id]._props.armorClass * 1 <= 0))
						// delete bot.inventory.equipment[armorSlots[slot]][id]
				
				// for (let weight in weights)
					// for (let count = 0; count < weights[weight] * 20; count++)
					// {
						// let randArmor = classes[weight][RandomUtil.getInt(0, classes[weight].length - 1)]
						// if (randArmor)
							// AITweaks.addItemToBotInv(bot, armorSlots[slot], randArmor, 1)
					// }
				//New and improved???
				for (let armorClass in weights)
					for (let id of classes[armorClass])
					{
						// console.log(`${id} ${itemdb[id]._props.armorClass} ${weights[armorClass]}`)
						AITweaks.removeItemFromBotInv(bot, armorSlots[slot], id, 999)
						AITweaks.addItemToBotInv(bot, armorSlots[slot], id, weights[armorClass], "equipment")
					}
			}
		}
		if (print)
		{
			Logger.error(botName)
			console.log(log)
		}
	}
	
	//For debugging
	static checkBotArmorLevels(bot, armorSlots)
	{
		// let armorSlots = ["TacticalVest", "ArmorVest", "Headwear"]
		let slotTotals = {}
		for (let slot in armorSlots)
			slotTotals[armorSlots[slot]] = {"classes": {}, "allArmor": 0, "totalItems": 0}
		for (let slot in armorSlots)
		{
			for (let id in bot.inventory.equipment[armorSlots[slot]])
			{
				let item = itemdb[id]
				let count = bot.inventory.equipment[armorSlots[slot]][id] * 1
				if (item._props?.armorClass > 0)
				{
					if (!slotTotals[armorSlots[slot]].classes[item._props.armorClass])
						slotTotals[armorSlots[slot]].classes[item._props.armorClass] = count
					else
						slotTotals[armorSlots[slot]].classes[item._props.armorClass]+= count
					slotTotals[armorSlots[slot]].allArmor += count
				}
				slotTotals[armorSlots[slot]].totalItems += count
			}
			slotTotals[armorSlots[slot]].percentArmored = `${slotTotals[armorSlots[slot]].allArmor / slotTotals[armorSlots[slot]].totalItems * 100}%`
		}
		return slotTotals
	}
	
	static backupAdvancedLoadoutConfig(loadoutConfig)
	{
		var fs = require('fs');
		fs.writeFile(modFolder + "donottouch/" + "advancedLoadoutBackup" + ".json", JSON.stringify(loadoutConfig, null, 4), function (err) {
			if (err) throw err;
		});
	}
	
	static storeAllWeaponNamesAndIDs(weaponList)
	{
		let loadoutConfig
		let botList = []
		for (let i in botTypes)
			botList.push(i)
		try{
		loadoutConfig = require("../config/advanced loadout config.json")}
		catch{
			try{
				loadoutConfig = require("../donottouch/advancedLoadoutBackup.json")
				Logger.error(`The advanced loadout config file is not present or is damaged. This most often occurs because loading was interrupted. It has been restored to the latest backup.`)}
			catch{
				loadoutConfig = require("../donottouch/advanced loadout default.json")
		Logger.error(`The advanced loadout config file is not present or is damaged. This most often occurs because loading was interrupted. It has been restored to its default state.`)}}
		for (let bot in loadoutConfig.bot_types_to_modify)
		{
			bot = loadoutConfig.bot_types_to_modify[bot]
			for (let i in botList) //Match bot names in the config to actual names, regardless of capitalization
			{
				if (botList[i].toLowerCase() == bot.toLowerCase())
				{
					bot = botList[i]
					break
				}
			}
			if (!botList.includes(bot.toLowerCase())) //Filter out bad names
			{
				//Logger.error(`"${bot}" is not a valid bot name. No advanced gear changes will be made to this bot.`)
				continue
			}
			if (!loadoutConfig.bot_weapon_settings[bot])
				loadoutConfig.bot_weapon_settings[bot] = {}
			for (let itemID in weaponList)
			{
				let name = itemdb[itemID]._name
				//if (loadoutConfig.bot_weapon_settings[bot][name])
					//console.log(`${name} is already present`)
				if (loadoutConfig.bot_weapon_settings[bot][name] && loadoutConfig.re_apply_default_values == false)
					continue //Skip weapons that already have entries, unless set to re apply defaults
				let fireMode = AITweaks.getWeaponFireMode(itemID)
				loadoutConfig.bot_weapon_settings[bot][itemdb[itemID]._name] = AITweaks.clone(loadoutConfig.default_weapon_values[fireMode]) //Set default settings via fire mode
				
				//If the weapon isn't in their inventory list, set its weight to zero.
				if (!Object.keys(botTypes[bot].inventory.equipment.FirstPrimaryWeapon).includes(itemID) && !Object.keys(botTypes[bot].inventory.equipment.SecondPrimaryWeapon).includes(itemID) && !Object.keys(botTypes[bot].inventory.equipment.Holster).includes(itemID))
					loadoutConfig.bot_weapon_settings[bot][itemdb[itemID]._name].spawn_chance_weight = 0
			}
		}
		
		if (loadoutConfig.re_apply_default_values == true)
		{
			loadoutConfig.re_apply_default_values = false
			Logger.info(`Default values re-applied to weapons in the advanced loadout config. re_apply_default_values has been reset to 'false'.`)
		}
		var fs = require('fs');
		fs.writeFile(modFolder + "config/" + "advanced loadout config" + ".json", JSON.stringify(loadoutConfig, null, 4), function (err) {
			if (err) throw err;
		});
		return loadoutConfig
	}
	
	//Put the values in the config to work
	static applyAdvancedLoadoutConfig(loadoutConfig, map, conflictList)
	{
		
		let scavBots = []
		let raiderBots = []
		let pmcBots = []
		
		for (let i in config.AIgearChanges.scavBots)
			scavBots.push(config.AIgearChanges.scavBots[i].toLowerCase())
		for (let i in config.AIgearChanges.raiderBots)
			raiderBots.push(config.AIgearChanges.raiderBots[i].toLowerCase())
		for (let i in config.AIgearChanges.pmcBots)
			pmcBots.push(config.AIgearChanges.pmcBots[i].toLowerCase())
		
		let nameRef = {} //Links weapon names and IDs in such a way that the weapon's name can be used to find its ID
		for (let i in itemdb)
			nameRef[itemdb[i]._name] = i
		
		let botList = []
		for (let bot in loadoutConfig.bot_weapon_settings)
			botList.push(bot.toLowerCase())
		//Inventories for bear and usec bots need to be specifically targetted at these bots. If 'Assaultgroup' is used, and at least one isn't specified, copy the assaultgroup entry into the relevant place(s)
		if (botList.includes(AKIPMC) && !botList.includes(botNameSwaps.bear))
			for (let bot in loadoutConfig.bot_weapon_settings)
				if (bot.toLowerCase() == AKIPMC.toLowerCase())
					loadoutConfig.bot_weapon_settings[botNameSwaps.bear] = AITweaks.clone(loadoutConfig.bot_weapon_settings[bot])
		if (botList.includes(AKIPMC) && !botList.includes(botNameSwaps.usec))
			for (let bot in loadoutConfig.bot_weapon_settings)
				if (bot.toLowerCase() == AKIPMC.toLowerCase())
					loadoutConfig.bot_weapon_settings[botNameSwaps.usec] = AITweaks.clone(loadoutConfig.bot_weapon_settings[bot])
		
		for (let bot in loadoutConfig.bot_weapon_settings)
			for (let weapon in loadoutConfig.bot_weapon_settings[bot])
			{
				let itemID = nameRef[weapon]
				let loadoutWep = loadoutConfig.bot_weapon_settings[bot][weapon]
				//This is really hacky, again, but it removes all instances of the weapon's ID before it then tries to make adjustments. Technically inefficient, but much easier to work with.
				let wepSlot = "" //Differentiate between primaries and sidearms
				
				//May be unecessary now
				
				// if (itemdb[itemID]._props.weapUseType == "primary")
				// {
					// if (botTypes[bot].inventory.equipment.FirstPrimaryWeapon[itemID])
						// delete botTypes[bot].inventory.equipment.FirstPrimaryWeapon[itemID]
					// if (botTypes[bot].inventory.equipment.SecondPrimaryWeapon[itemID])
						// delete botTypes[bot].inventory.equipment.SecondPrimaryWeapon[itemID]
					// wepSlot = "FirstPrimaryWeapon"
				// }
				// else if (itemdb[itemID]._props.weapUseType == "secondary")
				// {
					// if (botTypes[bot].inventory.equipment.Holster[itemID])
						// delete botTypes[bot].inventory.equipment.Holster[itemID]
					// wepSlot = "Holster"
				// }
				
				if (loadoutWep.do_not_spawn_on_maps.includes(map))
				{
					continue //Skip if it's not supposed to be on this map
				}
				
				let spawnWeight = loadoutWep.spawn_chance_weight //Tested this out, it *seems* to work.
				// if (botTypes[bot].inventory.equipment[wepSlot].includes(itemID))
					// spawnWeight -= 1 //Account for IDs already being present (Doesn't account for multiples, but whatever)
				botTypes[bot].inventory.equipment[wepSlot][itemID] = spawnWeight
				if (map == "none" && (loadoutWep.mod_rarity_neg_one_means_default >= 0 || loadoutWep.specific_mods_to_allow.length > 0 || loadoutWep.specific_mods_to_disallow.length > 0))
				{
					let modRarity = loadoutWep.mod_rarity_neg_one_means_default
					if (modRarity < 0) //Look at the regular config and grab an appropriate modRarity setting
					{
						if (scavBots.includes(bot))
							modRarity = (config.AIgearChanges.scavs.modQuality0_10 - 10) * - 1
						else if (raiderBots.includes(bot))
							modRarity = (config.AIgearChanges.raiders.modQuality0_10 - 10) * - 1
						else if (pmcBots.includes(bot))
							modRarity = (config.AIgearChanges.pmcs.modQuality0_10 - 10) * - 1
						else
							modRarity = 5
					}
					
					//The blacklist function has been used before, and I'm sure it works. The whitelist function is new, and has only been lightly tested so far. I'm /pretty/ sure it should work, but.. We'll see.
					AITweaks.buildModList(loadoutWep.specific_mods_to_disallow, itemID, botTypes[bot], loadoutWep.mod_rarity_neg_one_means_default, conflictList, loadoutWep.specific_mods_to_allow)
				}
			}
	}
	
	//BEGONE, NON-EXISTANT ITEMS LISTED AS POTENTIAL ATTACHMENTS!
	cleanseFoulMods()
	{
		let warnings = []
		let stuff = ["Slots", "Chambers", "Cartridges"]
		for (let itemID in database.templates.items)
		{
			let item = database.templates.items[itemID]
			for (let thing in stuff)
				if (item._props[stuff[thing]])
					for (let i = 0; i < item._props[stuff[thing]].length; i++)
					{
						try{
						for (let n = 0; n < item._props[stuff[thing]][i]._props.filters[0].Filter.length; n++)
						{
							let checkItem = database.templates.items[item._props[stuff[thing]][i]._props.filters[0].Filter[n]]
							if (!checkItem)
							{
								//There are a few vanilla items this happens for. Don't warn me about them. I do not care.
								if (!["5ede47641cf3836a88318df1", "5e85aac65505fa48730d8af2", "5f647fd3f6e4ab66c82faed6"].includes(item._props[stuff[thing]][i]._props.filters[0].Filter[n]))
									// warnings.push(`Item with ID ${item._id} had an invalid item with ID ${item._props[stuff[thing]][i]._props.filters[0].Filter[n]} listed as an eligible mod. This ID has been removed from bot loadouts to prevent errors.`) MUTED BECAUSE PEOPLE ARE STUPID
								if (!blacklistFile.includes(item._props[stuff[thing]][i]._props.filters[0].Filter[n]))
									blacklistFile.push(item._props[stuff[thing]][i]._props.filters[0].Filter[n])
								item._props[stuff[thing]][i]._props.FinAllowed = false
								// item._props[stuff[thing]][i]._props.filters[0].Filter.splice(n,1)
								// n--
							}
						}
						item._props[stuff[thing]][i]._props.filters[0].Filter = AITweaks.cleanArray(item._props[stuff[thing]][i]._props.filters[0].Filter)
						}
						catch{
							warnings.push(`Critical but unspecified error in item with ID: ${item._id}, or its child items in the ${stuff[thing]} entry.`)
							if (["Chambers", "Cartridges"].includes(stuff[thing])) //problem with the way it references ammo. This is.. ..Bad. This means the item is probably totally screwed, but if we just delete it there's probably other stuff that references it, *so*... We'll just swap its chambers / cartridges value with something we know works.
							//56d59856d2720bd8418b456a is the p226
							{
								item._props[stuff[thing]][i] = AITweaks.clone(itemdb["56d59856d2720bd8418b456a"]._props.Chambers)
								warnings.push(`Item with ID ${item._id} is now chambered in 9mm until the problem is fixed.`)
							}
							else
							{
								warnings.push(`Item with ID ${item._id} has had one of its mods slots removed. This will not be undone unless the problem is fixed.`)
								item._props[stuff[thing]].splice(i,1)
								i--
							}	
						}
					}
		}
		if (warnings.length > 0)
		{
			Logger.info(`A number of errors have occurred with some of the game's items. Most likely these are mod-added items that have invalid entries of one sort of another. These errors are not game-breaking and this mod has done what it can to fix them, but if you experience problems ingame with these items you'll need to contact their original creator.`)
			for (let line in warnings)
				console.log(warnings[line])
		}
	}
	//..The power of Javascript compels you!
	
	//You can barely even see these ingame. Boooo.
	//Adds coloured armbands to different kinds of bots. Thought it would be neat. Kinda useful for testing, if you need to tell right away what kind of bot something is in-game.
	//Upon further review, it's actually pretty cool to be able to see the faction of the bot you just killed. Definitely keeping this in here.
	static addFactionIdentifiers()
	{			
		/* 5b3f3ade86f7746b6b790d8e armband_red
		5b3f3b0186f774021a2afef7 armband_green
		60b0f988c4449e4cb624c1da armband_sigma
		5b3f3af486f774679e752c1f armband_blue
		5b3f16c486f7747c327f55f7 armband_white
		619bde3dc9546643a67df6f2 item_equipment_armband_kibaarms
		619bdef8c9546643a67df6f6 item_equipment_armband_terragroup
		619bddc6c9546643a67df6ee item_equipment_armband_dead
		619bc61e86e01e16f839a999 item_equipment_armband_alpha
		5b3f3b0e86f7746752107cda armband_yellow
		619bddffc9546643a67df6f0 item_equipment_armband_helmet
		619bdd8886e01e16f839a99c item_equipment_armband_bear
		619bde7fc9546643a67df6f4 item_equipment_armband_labs
		619bdf9cc9546643a67df6f8 item_equipment_armband_un
		619bdfd4c9546643a67df6fa item_equipment_armband_usec
		619bdeb986e01e16f839a99e item_equipment_armband_russia
		5f9949d869e2777a0e779ba5 item_equipment_armband_r2 (Rivals armband, purple)
 */		
		let blue = {"5b3f3af486f774679e752c1f" : 1}
		let green = {"5b3f3b0186f774021a2afef7" : 1}
		let red = {"5b3f3ade86f7746b6b790d8e" : 1}
		let white = {"5b3f16c486f7747c327f55f7" : 1}
		let yellow = {"5b3f3b0e86f7746752107cda" : 1}
		let purple = {"5f9949d869e2777a0e779ba5" : 1}
		
		//Will be overwritten by the default settings, but exists to tag bots that would otherwise slip through the cracks
		for (let i in botTypes)
		{
			if (config.aiChanges.changeBots.highLevelAIs.includes(i))
				botTypes[i].inventory.equipment.ArmBand = {"619bdef8c9546643a67df6f6": 1} //Need to check what colour this is. Type is "Terragroup"
			else if (config.aiChanges.changeBots.midLevelAIs.includes(i.toLowerCase()))
				botTypes[i].inventory.equipment.ArmBand = {"619bde3dc9546643a67df6f2": 1} //Need to check what colour this is. Type is "Kiba Arms"
			else if (config.aiChanges.changeBots.lowLevelAIs.includes(i.toLowerCase()))
				botTypes[i].inventory.equipment.ArmBand = {"619bddc6c9546643a67df6ee": 1} //Need to check what colour this is. Type is "Dead"
		}
		
		botTypes.assault.inventory.equipment.ArmBand = green
		botTypes.usec.inventory.equipment.ArmBand = blue
		botTypes[botNameSwaps.usec].inventory.equipment.ArmBand = blue
		botTypes.bear.inventory.equipment.ArmBand = red
		botTypes[botNameSwaps.bear].inventory.equipment.ArmBand = red
		// botTypes[BotConfig.pmc.usecType] ? botTypes[BotConfig.pmc.usecType].inventory.equipment.ArmBand = blue : null;
        // botTypes[BotConfig.pmc.bearType] ? botTypes[BotConfig.pmc.bearType].inventory.equipment.ArmBand = red : null;
		botTypes.pmcbot.inventory.equipment.ArmBand = yellow
		botTypes.followergluharassault.inventory.equipment.ArmBand = white
		botTypes.followergluharscout.inventory.equipment.ArmBand = white
		botTypes.followergluharsecurity.inventory.equipment.ArmBand = white
		botTypes.followergluharsnipe.inventory.equipment.ArmBand = white
		botTypes.bossgluhar.inventory.equipment.ArmBand = white
		botTypes.followerkojaniy.inventory.equipment.ArmBand = purple
		botTypes.bosskojaniy.inventory.equipment.ArmBand = purple
		botTypes.followersanitar.inventory.equipment.ArmBand = purple
		botTypes.bosssanitar.inventory.equipment.ArmBand = purple
		botTypes.followerbully.inventory.equipment.ArmBand = purple
		botTypes.bossbully.inventory.equipment.ArmBand = purple
		for (let i in botTypes)
		{
			try
			{
				let a = botTypes[i].chances.equipment
				a.ArmBand = 100
			}
			catch //I hate having to use try/catch for this, but it seems like the best way to catch a screwy JSON file.
			{
				Logger.error(`bot ${i} does not have properly defined chance values.`)
			}
		}
	}
	
	//Just pukes out the full mod list of any bot you tell it to.
	//If worst comes to worst, maybe use this to make a seperate JSON file and just copy values over, fixing problems manually one by one?
	reportModList(bot)
	{
		console.log("FINAL REPORT")
		for (let i in bot.inventory.mods)
		{
			console.log(i)
			//console.log(bot.inventory.mods[i])
			for (let n in bot.inventory.mods[i])
			{
				console.log(n)
				for (let o in bot.inventory.mods[i][n])
				{
					let a = bot.inventory.mods[i][n][o]
					//console.log(o)
					console.log(a)
					//console.log(database.templates.items[a]._name)
				}
			}
		}
		console.log("FINAL REPORT END")
	}
	
	clearEquipmentSlot(bot, slot)
	{
		bot.inventory.equipment[slot] = {}
	}
	
	static addItemToBotInv(bot, slot, itemId, count, equipmentOrItems)
	{
		if (itemdb[itemId] == undefined)
			return
		if (equipmentOrItems == "items" && bot.inventory.items[slot] != undefined)
			for (let i = 0; i < count; i++)
				bot.inventory.items[slot]
		else if (bot.inventory.equipment[slot] != undefined)
		{
			if (!bot.inventory.equipment[slot][itemId])
				bot.inventory.equipment[slot][itemId] = count
			else
				bot.inventory.equipment[slot][itemId] += count
		}
	}
	
	static removeItemFromBotInv(bot, slot, itemId, count)
	{
		if (!bot.inventory.equipment[slot][itemId])
			return
		else
			bot.inventory.equipment[slot][itemId] -= count
		if (bot.inventory.equipment[slot][itemId] <= 0)
			delete bot.inventory.equipment[slot][itemId]
	}
	
	removeArmorBySlot(bot, slot, armorLevelMin, armorLevelMax, verbose)
	{
		if (verbose != undefined)
				console.log(slot)
		for (let itemID in bot.inventory.equipment[slot])
		{
			let item = database.templates.items[itemID]
			if (!item)
			{
				delete(bot.inventory.equipment[slot][itemID])
				continue
			}
			//Filter out non-armor gear items
			if (item._props.armorClass > 0 && item._props.armorZone.length!= undefined && item._props.armorZone.length > 0)
			{
				if (item._props.armorClass < armorLevelMin)
				{
					delete(bot.inventory.equipment[slot][itemID])
					if (verbose != undefined)
						console.log("Removed " + item._name + " with armor class " + item._props.armorClass)
					
				}
				else if (item._props.armorClass > armorLevelMax)
				{
					delete(bot.inventory.equipment[slot][itemID])
					if (verbose != undefined)
						console.log("Removed " + item._name + " with armor class " + item._props.armorClass)
				}
			}
		}
	}
	
	removeArmor(bot, armorLevelMin, armorLevelMax, helmetLevelMin, helmetLevelMax, verbose?)
	{
		this.removeArmorBySlot(bot, "ArmorVest", armorLevelMin, armorLevelMax, verbose)
		this.removeArmorBySlot(bot, "TacticalVest", armorLevelMin, armorLevelMax, verbose)
		this.removeArmorBySlot(bot, "Headwear", helmetLevelMin, helmetLevelMax, verbose)
	}
	
	//Make room for some proper helmets. No silly hats.
	noSillyHats(bot, removePCT)
	{
		if (bot.inventory)
		{
			for (let i in bot.inventory.equipment.Headwear)
				if (RandomUtil.getInt(0, 99) < removePCT)
					delete bot.inventory.equipment.Headwear[i]
		}
	}
	
	addBackpacks(bot, minSize)
	{
		if (minSize < 0)
		{
			minSize = 100
			for (const itemID in bot.inventory.equipment.Backpack)
			{
				let compSize = 0
				let item = database.templates.items[itemID]
				if (!item._props)
				{
					delete bot.inventory.equipment.Backpack[itemID]
					continue
				}
				for (let i in item._props.Grids)
					compSize += (item._props.Grids[i]._props.cellsH * item._props.Grids[i]._props.cellsV)
				if (compSize < minSize)
					minSize = compSize //Find the smallest backpack this type of bot uses by default
			}
		}
		for (const itemID in database.templates.items)
		{
			let item = database.templates.items[itemID]
			if (blacklistFile.includes(itemID) || !item._props)
				continue
			//Filter for items that match the backpack template, and aren't already in the bot's inventory
			if (item._proto == "544a5cde4bdc2d39388b456b" && !(Object.keys(bot.inventory.equipment.Backpack).includes(item._id)))
			{
				let size = 0
				for (let i in item._props.Grids)
					size += (item._props.Grids[i]._props.cellsH * item._props.Grids[i]._props.cellsV)
				if (size >= minSize) //Only add backpacks equal to or larger than the default smallest bag they use, or the player-set minimum size
				{
					AITweaks.addItemToBotInv(bot, "Backpack", itemID, 1, "equipment")
				}
			}
		}
	}
	
	addArmor(bot, armorMax, armorMin, priceMin, priceMax, modRarity, slots)
	{
		//Add all armors above whatever armor class and below whatever price to the bot's loadout
		for (const itemID in database.templates.items)
		{
			if (blacklistFile.includes(itemID)) //Don't even look at blacklisted items
				continue
			let item = database.templates.items[itemID]
			if (item._props.armorClass <= armorMax && item._props.armorClass >= armorMin && item._props.armorClass > 0)
			{	
				let type = ""
				//Is it a rig?
				if (item._props.Grids.length > 0)
				{
					type = "TacticalVest"
				}
				//If it's not a rig, is it a vest?
				else if (item._parent == "5448e54d4bdc2dcc718b4568") //5448e54d4bdc2dcc718b4568 is apparently the parent item for all armored vests
				{
					type = "ArmorVest"
				}
				//Does it have the right parent item to be a helmet? Is it not the jack-o-lantern helmet?
				else if (item._parent == "5a341c4086f77401f2541505" && item._id != "59ef13ca86f77445fd0e2483")
				{
					type = "Headwear"
				}
				else if (item._props.FaceShieldComponent == false && item._props.FaceShieldMask == "NoMask")
				{
					//type = "FaceCover"
				}
				else
				{
					//console.log(item._name)
				}
				if (bot.inventory.equipment[type] && Object.keys(bot.inventory.equipment[type]).includes(itemID))
				{
					
				}
				else
				{
					if (slots.includes(type))
					{
						// for (let i = 0; i < armorWeights[item._props.armorClass - 1]; i++)
						AITweaks.addItemToBotInv(bot, type, itemID, 1, "equipment")
					}
				}
			}
		}
	}
	
	//Tidies up weapon entries. Could probably do this in the other functions, but it's just easier to tack this on at the end.
	cleanUpMods(botList)
	{
		for (let f in botList)
		{
			if (!botTypes[botList[f]].inventory)
			{
				Logger.error(`${botList[f]} does not have an inventory entry.`)
				continue
			}
			let bot = botTypes[botList[f]]
			//console.log("Cleaning house for " + botList[f] + " bot.")
			// for (let i in bot.inventory.equipment)
				// bot.inventory.equipment[i] = AITweaks.cleanArray(bot.inventory.equipment[i])
			for (let i in bot.inventory.mods)
				for (let n in bot.inventory.mods[i])
				{
					bot.inventory.mods[i][n] = AITweaks.cleanArray(bot.inventory.mods[i][n])
				}
			for (let i in bot.inventory.items)
				bot.inventory.items[i] = AITweaks.cleanArray(bot.inventory.items[i])
		}
	}
	
	//Deletes an array entry, and doesn't leave an empty element behind
	//I'm 1000% sure there's a better way to do this, but again.. This works.
	//Must be used as arrayX = this.deleteArrayEntry(arrayX)
	deleteArrayEntry(array, index)
	{
		let tempArray = []
		delete array[index]
		for (let i in array)
		{
			tempArray.push(array[i])
		}
		return tempArray
	}
	
	//Must be phrased as arrayX = AITweaks.cleanArray(arrayX) when used
	static cleanArray(array)
	{
		if (!Array.isArray(array))
			return array
		let tempArray = []
		for (let i in array)
		{
			if (array[i] != null && array[i] != undefined)
				tempArray.push(array[i])
		}
		array = tempArray
		return tempArray
	}
	
	//For debugging
	static reportAmmo(bot, botName, dontPrint?)
	{
		let ammoList = []
		//Look at a mod
		for (let i in bot.inventory.mods)
		{
			//Look at its sub-category
			for (let n in bot.inventory.mods[i])
			{
				let weaponType = ""
				//If the mod you're looking at is something that can hold bullets
				if (n == "cartridges" || n == "chambers")
				{
					for (let m in bot.inventory.mods[i][n])
					{
						if (!ammoList.includes(bot.inventory.mods[i][n][m]))
							ammoList.push(bot.inventory.mods[i][n][m])
					}					
				}
			}
		}
		if (dontPrint == undefined)
			for (let i in ammoList)
				console.log(`ID: ${ammoList[i]} Name: ${database.templates.items[ammoList[i]]._name}`)
		else
			return (ammoList)
	}
	
	static curateCalibers(bot, botName, ammoMin, ammoMax, absolute)
	{
		bot.inventory.Ammo = {}
		let caliberList = {}
		let validAmmos = []
		for (let itemId in itemdb)
		{
			let chamCart = AITweaks.chamberOrCartridge(itemId)
			if (!chamCart)
				continue
			for (let ammo of itemdb[itemId]._props[chamCart][0]._props.filters[0].Filter)
				validAmmos.includes(ammo) ? null : validAmmos.push(ammo)
		}
				
		for (let itemId in itemdb)
			if (itemdb[itemId]?._props?.ammoCaliber || itemdb[itemId]?._props?.Caliber)// && !blacklistFile.includes(itemId) && itemdb[itemId]._props.FinAllowed != false)
			{
				let chamCart = AITweaks.chamberOrCartridge(itemId)
				let caliber = chamCart ? itemdb[itemId]._props.ammoCaliber : itemdb[itemId]._props.Caliber
				if (chamCart)
				{
					for (let ammo of itemdb[itemId]._props[chamCart][0]._props.filters[0].Filter)
						if (!blacklistFile.includes(ammo) && itemdb[ammo]._props.FinAllowed != false && validAmmos.includes(ammo))
						caliberList[caliber] ? (caliberList[caliber].includes(ammo) ? null : caliberList[caliber].push(ammo)) : caliberList[caliber] = [ammo]
				}
				else //Bullets
				{
					if (caliber && !blacklistFile.includes(itemId) && itemdb[itemId]._props.FinAllowed != false && validAmmos.includes(itemId))
						caliberList[caliber] ? (caliberList[caliber].includes(itemId) ? null : caliberList[caliber].push(itemId)) : caliberList[caliber] = [itemId]
				}
			}
		for (let caliber in caliberList)
		{
			// if (caliberList[caliber].find(i => itemdb[i]._props.ammoType == "buckshot")) //Find a better way to do this
				// continue //ammoType = "shotgun"
			bot.inventory.Ammo[caliber] = AITweaks.weightCaliber(caliberList, caliber, ammoMin, ammoMax, absolute, null)
		}
		//Hate this. Hate hate hate.
		for (let bot in botTypes)
			if (botTypes[bot].inventory?.Ammo?.Caliber9x18PMM)
				botTypes[bot].inventory.Ammo.Caliber9x18PMM = botTypes[bot].inventory.Ammo.Caliber9x18PM
	}
	
	static weightCaliber(caliberList, caliber, ammoMin, ammoMax, absolute, linear)
	{
		let specialCalibers = ["Caliber26x75", "Caliber30x29", "Caliber46x30", "Caliber40mmRU", "Caliber127x55"]
		
		let ammoList
		let lowestPenForBot
		let highestPenForBot
		let caliberRarityTable = {}
		let a = AITweaks.getMinMaxPen(caliberList[caliber], [caliber], ammoMin, ammoMax, absolute)
		ammoList = a[0]
		lowestPenForBot = a[1]
		highestPenForBot = a[2]
		// [ammoList, lowestPenForBot, highestPenForBot] = AITweaks.getMinMaxPen(caliberList[caliber], [caliber], ammoMin, ammoMax, absolute) //Stopped working for some reason :/		
		
		//If this isn't a magazine that takes shotgun ammo (no buckshot), proceed
		if (caliberList[caliber].length > 0)
		{
			caliberList[caliber] = AITweaks.curateMagazine(ammoList, lowestPenForBot, highestPenForBot, [], false)
			caliberRarityTable = {}
		}
		
		//Weighting
		let point = 33/100
		let weight = 4 - 1
		let range = highestPenForBot - lowestPenForBot
		let toAdd = []
		for (let round of caliberList[caliber])
		{
			if (specialCalibers.includes(caliber))
			{caliberRarityTable[round] = 1;continue}
			let penetration = itemdb[round]._props.PenetrationPower
			if (penetration == 0)
			{console.log(`Error: Round ${round} of caliber ${caliber} has zero penetration, and must be specially accounted for.`);continue;}
			let slope = penetration > (range * point) + lowestPenForBot ? (weight * -1) / (range - (range * point)) : weight / (range * point) //Test this
			// console.log(`Tipping point for ${caliber}: ${(range * point) + lowestPenForBot} VS. ${penetration}, with slope ${slope}`)
			let relativeWeight = 1 + ( penetration > (range * point) + lowestPenForBot ? weight + ((penetration - ((range * point) + lowestPenForBot)) * slope) : (slope * (penetration - lowestPenForBot)) ) //Test this too
			relativeWeight < 1 ? relativeWeight = 1 : null
			
			caliberRarityTable[round] = relativeWeight * 10
		}
		return caliberRarityTable
	}
	
	static curateMagazine(ammoList, lowestPenForBot, highestPenForBot, modMagCanContain, weighting)
	{
		//Remove any ammo with a penetration power greater than ammoMax
		let toRemove = 0
		for (let rounds in ammoList)
		{
			let item = itemdb[ammoList[rounds]]
			if (item._props.PenetrationPower > highestPenForBot)
				toRemove += 1
		}
		while (ammoList.length != undefined && ammoList.length > 1 && toRemove > 0)
		{
			let highestPen = 0
			let highestPenLoc = 0
			for (let o in ammoList)
			{
				let item = itemdb[ammoList[o]]
				if (item._props.PenetrationPower > highestPen)
				{
					highestPen = item._props.PenetrationPower
					highestPenLoc = +o
				}
			}
			ammoList.splice(highestPenLoc, 1)
			toRemove -= 1
		}
		//Time to remove the low-pen ammo
		toRemove = 0
		for (let rounds in ammoList)
		{
			let item = itemdb[ammoList[rounds]]
			if (item._props.PenetrationPower < lowestPenForBot)
				toRemove += 1
		}
		while (ammoList.length != undefined && ammoList.length > 1 && toRemove > 0)
		{
			let lowestPen = 100
			let lowestPenLoc = 0
			for (let o in ammoList)
			{
				let item = itemdb[ammoList[o]]
				if (item._props.PenetrationPower < lowestPen)
				{
					lowestPen = item._props.PenetrationPower
					lowestPenLoc = +o
				}
			}
			ammoList.splice(lowestPenLoc, 1)
			toRemove -= 1
		}
		//Put all the elligible rounds from the current caliber into the list of elligible ammos
		modMagCanContain.push(...ammoList)
		return modMagCanContain
	}
	
	static getMinMaxPen(bulletHolder, caliber, ammoMin, ammoMax, absolute)
	{
		//This will hold the list of all rounds of that caliber that go in the mod/magazine/whatever
		let ammoList = []
		let maxPen = 0
		let minPen = 1000 //This keeps track of the max and minimum penetration values of a given caliber, for use with determining how many types of ammo to remove
		
		let chamCart = AITweaks.chamberOrCartridge(bulletHolder)//TODO (maybe): Make this work for camora too??
		//Should also prevent mod-added bullets from being counted
		
		let bullets = chamCart ? itemdb[bulletHolder]._props[chamCart][0]._props.filters[0].Filter.filter(i => orig.items[i] != undefined) : bulletHolder[0] ? bulletHolder : undefined
		//For all the different rounds available to the magazine
		for (let each in bullets)
		{
			let item = itemdb[bullets[each]]
			//Add only ammo of one caliber to the list at a time
			if (item?._props?.Caliber == caliber && item._props?.FinAllowed != false)
			{
				ammoList.push(bullets[each])
				if (item._props.PenetrationPower < minPen)
					minPen = item._props.PenetrationPower
				if (item._props.PenetrationPower > maxPen)
					maxPen = item._props.PenetrationPower
			}
		}
		//ammoMin and Max are now penetration values equal to a % of the penetration variance.
		//EX: If the worst round is penetration 5, and the best is penetration 25, the variance is 20, and an ammoMin of 50 would remove any ammo with penetration less than 5 + (20 * 0.5)
		let lowestPenAllowed = absolute ? ammoMin : ammoMin * (maxPen - minPen) + minPen
		let highestPenAllowed = absolute ? ammoMax : (1 - ammoMax) * (maxPen - minPen) + minPen
		
		return [ammoList, lowestPenAllowed, highestPenAllowed]
	}
	
	static getCalibers(bullets)
	{
		let ammoTypes = []
		for (let each in bullets)
		{
			let item = itemdb[bullets[each]]
			//Find out how many calibers this magazine can take
			if (item == undefined || item._props == undefined || item._props.Caliber == undefined || item._props.Caliber == "" || ammoTypes.includes(item._props.Caliber))
				continue
			else
				ammoTypes.push(item._props.Caliber)
		}
		return ammoTypes
	}
	
	//This function decides how penetrate-y a bot's ammo should me.
	//It's percentage based, working from the range of penetration values from best to worst. i.e. if the worst penning round is 20 pen, and the best is 70, then the range is from 20-70, and am ammoMin of 30 would remove any ammo in the bottom 30 percent of that range (under 35). An ammoMax of 10 would remove anything in the top 10% (65+)
	//This also respects different calibers that go in the same magazine. -So it'll only look at 7.62x39 rounds, sort those out, then sort .366TKM seperately. Same for .300 blackout and 5.56.
	static curateAmmo(bot, ammoMin, ammoMax, absolute, verbose)
	{
		//Look at a mod
		for (let i in bot.inventory.mods)
		{
			//This will be where all the possible ammo types a magazine can contain are places
			let modMagCanContain = []
			//Look at its sub-category
			for (let n in bot.inventory.mods[i])
			{
				//To handle magazines that can take two different types of ammo, ie 5.56 and .300 blackout
				let ammoTypes = []
				let weaponType = ""
				//If the mod you're looking at is something that can hold bullets
				if (["cartridges", "chambers", "patron_in_weapon"].includes(n))
				{
					let itemName = itemdb[i]._name
					//For all the different rounds available to the magazine
					ammoTypes = AITweaks.getCalibers(bot.inventory.mods[i][n])
					//For each caliber
					for (let caliber in ammoTypes)
					{
						let ammoList: any
						let lowestPenForBot: any
						let highestPenForBot: any
						[ammoList, lowestPenForBot, highestPenForBot] = AITweaks.getMinMaxPen(i, [ammoTypes[caliber]], ammoMin, ammoMax, absolute)

						//Check to see if any of these rounds are buckshot.
						for (let ammo in ammoList)
						{
							if (itemdb[ammoList[ammo]]._props.ammoType == "buckshot")
								weaponType = "shotgun"
						}
						//If this isn't a magazine that takes shotgun ammo (no buckshot), proceed
						if (weaponType != "shotgun" && ammoList.length > 0)
							modMagCanContain = AITweaks.curateMagazine(ammoList, lowestPenForBot, highestPenForBot, modMagCanContain, false)
						else
						{
							if (verbose != undefined)
								console.log("Not touching shotgun ammo yet.")
						}
						//Add the sum of all appropriate calibers into the actual mod entry
					}
					if (weaponType != "shotgun")
						bot.inventory.mods[i][n] = modMagCanContain
				}
				//Shotguns are weird, and I don't want to have the AI only carrying useless but high-pen flechettes around or anything. So for now they don't get touched.
			}
		}
	}
	
	static getCaliberInfo(id, chamCart)
	{
		let caliberList = []
		for (let each in itemdb[id]._props[chamCart])
			for (let ammo of itemdb[id]._props[chamCart][each]._props.filters[0].Filter)
			{
				let caliber = itemdb[ammo]._props.Caliber
				if (!caliberList.includes(caliber))
					caliberList.push(caliber)
			}
		return caliberList
	}	
	
	static addCaliberInfoToMagazines()
	{
		for (let id in itemdb)
		{
			let chamCart = AITweaks.chamberOrCartridge(id)
			for (let each in itemdb[id]._props)
			{
				if (!chamCart || !(itemdb[id]._props[each] != "Cartridges"))
					continue
				itemdb[id]._props.FinCalibers = AITweaks.getCaliberInfo(id, chamCart)
			}
		}
	}
	
	//A use for this function! -At long last! ..I mean.. It is just literally 2/3rds of buildModList, but still, whatever. It works.
	static addAmmo(bot, botName)
	{
		for (let parentId in bot.inventory.mods)
		{
			let item = database.templates.items[parentId]
			let chamCart = AITweaks.chamberOrCartridge(parentId)
			if (!chamCart && itemdb[parentId]._props.ammoCaliber == "Caliber26x75")
				bot.inventory.mods[parentId].chambers = [itemdb[parentId]._props.defAmmo]
			if (chamCart)// && itemdb[parentId]._props[chamCart]._max_count)
			{
			for (let each in itemdb[parentId]._props[chamCart])
			{
				/////////////////////////////////////////////////////////////////////
				let modAmmo = bot.inventory.mods[parentId][itemdb[parentId]._props[chamCart][each]._name]
				modAmmo = []
				/////////////////////////////////////////////////////////////////////
				if (!item._props.FinCalibers)
					item._props.FinCalibers = AITweaks.getCaliberInfo(parentId, chamCart)
				for (let caliber of item._props.FinCalibers)
					for (let ammoId in bot.inventory.Ammo[caliber])
						for (let i = 0; i < bot.inventory.Ammo[caliber][ammoId]; i++)
						{
							modAmmo.push(ammoId)
						}
				// console.log(`${parentId} ${itemdb[parentId]._props[chamCart][each]._name}`)
				bot.inventory.mods[parentId][itemdb[parentId]._props[chamCart][each]._name] = modAmmo
			}
			}
		}
	}
	
	//I can add headsets to bot inventory lists just fine. ..But trying to actually get them to spawn on the AI is a huge headache, and I really don't care enough right now.
	//Consider this functional, but useless.
	addEarpieces(bot)
	{
		let blackList = ["5a16b9fffcdbcb0176308b34"]
		let whiteList = ["5b432b965acfc47a8774094e", "5645bcc04bdc2d363b8b4572"]
		for (const itemID in database.templates.items)
		{
			if (blacklistFile.includes(itemID))
				continue
			let item = database.templates.items[itemID]
			if (item._props.CompressorGain != undefined)
			{
				if (Object.keys(bot.inventory.equipment.Earpiece).includes(itemID))
				{
					
				}
				else if (blackList.includes(itemID))
				{
					//console.log("Blacklist applied")
				}
				else if (whiteList.includes(itemID))
				{
					AITweaks.addItemToBotInv(bot, "Earpiece", itemID, 1, "equipment")
					//console.log(item._name)
					//AITweaks.buildModList(blacklistFile, itemID, bot, modRarity)
				}
			}
		}
		for (let i in bot.inventory.equipment.Earpiece)
		{	//console.log(database.templates.items[bot.inventory.equipment.Earpiece[i]]._name)
		}
	}
	
	addArmorAttachments(bot, modRarity)
	{
		let excludeCats = ["FirstPrimaryWeapon", "SecondPrimaryWeapon", "Holster"]
		for (let i in bot.inventory.equipment)
			if (!excludeCats.includes(i))
				for (let id in bot.inventory.equipment[i])					
				{
					let mods = this.getModsFromItemID(id)
					if (JSON.stringify(mods) != "{}")
						{
						bot.inventory.mods[id] = mods
						// console.log(bot.inventory.mods[bot.inventory.equipment[i][n]])
						// console.log("")
						//this.getModsFromItemTree(bot.inventory.mods[bot.inventory.equipment[i][n]])
						let itemTree = (this.recursiveGetItems(bot.inventory.mods[id], {}))
						for (let i in itemTree)
							for (let n in itemTree[i])
							{
								for (let m in itemTree[i][n])
								{
									let item = database.templates.items[itemTree[i][n][m]]
									if (item._props.SpawnChance < modRarity)
										delete itemTree[i][n][m]
								}
								itemTree[i][n] = AITweaks.cleanArray(itemTree[i][n])
								if (itemTree[i][n].length == 0)
									delete itemTree[i][n]
							}
						for (let i in itemTree)
							for (let n in itemTree[i])
								{bot.inventory.mods[i] = (itemTree[i]); break}
						}
				}
	}
	
	addPrimaryWeapons(bot, priceMin, priceMax, modRarity, conflictList)
	{
		for (const itemID in database.templates.items)
		{
			if (blacklistFile.includes(itemID))
				continue
			let item = database.templates.items[itemID]
			if (item._props.weapUseType == "primary" && item.Fin.FinsRarityRanking <= priceMax && item.Fin.FinsRarityRanking >= priceMin)
			{
				if (Object.keys(bot.inventory.equipment.FirstPrimaryWeapon).includes(itemID))
				{
					
				}
				else
				{
					AITweaks.addItemToBotInv(bot, "FirstPrimaryWeapon", itemID, 1, "equipment")
					// AITweaks.buildModList(blacklistFile, itemID, bot, modRarity, conflictList)
				}
			}
		}
	}
	
	addHolsterWeapons(bot, priceMin, priceMax, modRarity, conflictList)
	{
		for (const itemID in database.templates.items)
		{
			if (blacklistFile.includes(itemID))
				continue
			let item = database.templates.items[itemID]
			if (item._props.weapUseType == "secondary" && item.Fin.FinsRarityRanking < priceMax && item.Fin.FinsRarityRanking >= priceMin)
			{
				if (Object.keys(bot.inventory.equipment.Holster).includes(itemID))
				{
					
				}
				else
				{
					AITweaks.addItemToBotInv(bot, "Holster", itemID, 1, "equipment")
					// AITweaks.buildModList(blacklistFile, itemID, bot, modRarity, conflictList)
				}
			}
		}
	}
	
	addSpecificWeapons(bot, weaponList, botName, modRarity, conflictList)
	{
		for (let itemID in weaponList)
		{
			if (weaponList[itemID] in database.templates.items)
			{
				let item = database.templates.items[weaponList[itemID]]
				if (item._props.weapUseType == "primary")
				{
					if (Object.keys(bot.inventory.equipment.FirstPrimaryWeapon).includes(weaponList[itemID]))
					{
						
					}
					else
					{
						AITweaks.addItemToBotInv(bot, "FirstPrimaryWeapon", weaponList[itemID], 1, "equipment")
						// AITweaks.buildModList(blacklistFile, itemID, bot, modRarity, conflictList)
					}
				}
				else if (item._props.weapUseType == "secondary")
				{
					if (Object.keys(bot.inventory.equipment.Holster).includes(weaponList[itemID]))
					{
						
					}
					else
					{
						AITweaks.addItemToBotInv(bot, "Holster", weaponList[itemID], 1, "equipment")
						// AITweaks.buildModList(blacklistFile, itemID, bot, modRarity, conflictList)
					}
				}
				else
				{
					console.log("Specific weapon entry " + weaponList[itemID] + " for '" + botName + "' bot is a valid item ID, but is not a recognized primary or secondary weapon.")
				}
			}
			else if (weaponList[itemID] == "")
				null
			else
			{
				console.log("Specific weapon entry " + weaponList[itemID] + " for '" + botName + "' bot is an invalid entry.")
			}
		}
	}
	
	expandBotSCSizes()
	{
		for (let bot in botTypes)
		//Give them all Sanitar's massive SC.
		try{
			botTypes[bot].inventory.equipment.SecuredContainer = {"5c0a794586f77461c458f892" : 1}
		}
		catch
		{
			//Logger.error(`Bot of type: ${bot} doesn't seem to have a proper secure container entry`)
		}
	}
	
	//Adds all the random stuff. Might also use this to curate potential loot items.
	addMiscItems(bot, healingItemsMin, healingItemsMax, magsMinMax)
	{
		//Something is fishy when behaviour changes are enabled, and some AIs can throw grenades when they shouldn't be able to.
		//Temp disabled
		if (false && config.overallDifficultyMultipliers.allowGrenades == false && config.AIbehaviourChanges.enabled == true)
		{bot.generation.items.grenades.min = 0;bot.generation.items.grenades.max = 0}
		bot.generation.items.healing.min = healingItemsMin
		bot.generation.items.healing.max = healingItemsMax
		bot.generation.items.magazines.min = magsMinMax[0]
		bot.generation.items.magazines.max = magsMinMax[1]
		//Let them have a car medkit, for testing of healing
		bot.inventory.items.SecuredContainer.push("590c661e86f7741e566b646a")
		//Remove unwanted items from a bot's inventory.
		let inventorySlots = ["Backpack", "Pockets", "TacticalVest"]
		for (let i in inventorySlots)
		{
			AITweaks.tweakInventory(bot, inventorySlots[i], false)
		}
	}
	
	static addMiscItemsFromAdvIConfig()
	{
		if (advIConfig.enabled == true)
			for (let bot in advIConfig.miscellaneous_items_to_add_to_bot_inventories)
			{
				bot = Object.keys(advIConfig.miscellaneous_items_to_add_to_bot_inventories[bot])[0]
				if (botTypes[bot])
				{
					let type
					advIConfig.miscellaneous_items_to_add_to_bot_inventories[bot].items ? type = "items" : type = "equipment"
					for (let slot of advIConfig.miscellaneous_items_to_add_to_bot_inventories[bot][type].slots)
						if (botTypes[bot].inventory[type][slot])
						{
							let id = advIConfig.miscellaneous_items_to_add_to_bot_inventories[bot][type].item_id
							let count = advIConfig.miscellaneous_items_to_add_to_bot_inventories[bot][type].weight
							AITweaks.addItemToBotInv(botTypes[bot], slot, id, count, type)
						}
				}
			}
	}
	
	static establishModTypes()
	{
		AITweaks.qualifyMods(["guns"])
		AITweaks.qualifyMods(["optionalMods", "vitalMods"])
		AITweaks.qualifyMods(["optionalMods", "vitalMods"])
		AITweaks.qualifyMods(["optionalMods", "vitalMods"])
	}
	
	static qualifyMods(filter)
	{
		for (let id in itemdb)
			if (filter.includes(AITweaks.filterItemType(id, false)) && itemdb[id]._parent != "5448bc234bdc2d3c308b4569")
				for (let slot in itemdb[id]._props.Slots)
					if (!itemdb[id]._props.Slots[slot]._name.toLowerCase().includes("camora"))
						if (AITweaks.checkRequired(itemdb[id]._props.Slots[slot]) == true)
							for (let mod of itemdb[id]._props.Slots[slot]._props.filters[0].Filter)
							{
								if (optionalMods.includes(mod))
									optionalMods.splice(optionalMods.findIndex(i => i == mod), 1)
								if (!vitalMods.includes(mod))
									vitalMods.push(mod)
							}
						else
							for (let mod of itemdb[id]._props.Slots[slot]._props.filters[0].Filter)
								if (!vitalMods.includes(mod) && !optionalMods.includes(mod))
									optionalMods.push(mod)
	}
	
	static filterItemType(itemId, debug)
	{
		let item = database.templates.items[itemId]
		if (item._props.Damage && item._props.Damage > 0 || ["5485a8684bdc2da71d8b4567", "543be5cb4bdc2deb348b4568"].includes(item._parent)) //Bullet / grenade
			return "ammo"
		else if (["543be6564bdc2df4348b4568"].includes(item._parent)) //Throwables
			return "throwables"
		else if (item._props.weapUseType && item._props.weapUseType != "") //Guns
			return "guns"
		else if (["5a341c4086f77401f2541505"].includes(item._parent) && item._props.armorClass && item._props.armorClass > 0) //Helmets
			return "helmets"
		else if (item._props.armorClass && item._props.armorClass > 0) //Body armor
			return "armors"
		else if (["5448e5724bdc2ddf718b4568"].includes(item._parent)) //Eyewear
			return "eyewear"
		else if (["5448e53e4bdc2d60728b4567"].includes(item._parent)) //Backpack
			return "backpack"
		else if (["5448bc234bdc2d3c308b4569"].includes(item._parent)) //Magazine
			return "magazine"
		else if (["5448e5284bdc2dcb718b4567"].includes(item._parent)) //Rig
			return "rig"
		else if (["5645bcb74bdc2ded0b8b4578"].includes(item._parent)) //Headset
			return "headset"
		else if (["5d650c3e815116009f6201d2"].includes(item._parent)) //Barter
			return "barter"
		else if (["5447e1d04bdc2dff2f8b4567"].includes(item._parent)) //Melee
			return "melee"
		else if (["5d21f59b6dbe99052b54ef83", "5a2c3a9486f774688b05e574"].includes(item._parent)) //Tech
			return "tech"
		else if (["5448f3ac4bdc2dce718b4569", "5448f39d4bdc2d0a728b4568", "5448f3a14bdc2d27728b4569"].includes(item._parent)) //Meds
			return "meds"
		else if (["5448f3a64bdc2d60728b456a"].includes(item._parent)) //Stims
			return "stims"
		else if (["5448e8d64bdc2dce718b4568"].includes(item._parent)) //Food
			return "food"
		else if (vitalMods.includes(itemId)) //Vital Mods
			return "vitalMods"
		else if (optionalMods.includes(itemId)) //Optional Mods
			return "optionalMods"
		else
		{
			return "other"
		}
	}
	
	//Sort inventories into various categories. Filter each category appropriately. Rejoin categories into one big, happy list and stuff it right back where you found it if merge is set to true.
	static tweakInventory(bot, container, merge)
	{
		let bigList = []
		for (let itemId of bot.inventory.items[container])
		{
			if (!itemdb[itemId])
				continue
			let type = AITweaks.filterItemType(itemId, false)
			/* "guns"
			"ammo"
			"throwables"
			"vitalMods"
			"optionalMods"
			"armors"
			"helmets"
			"eyewear"
			"backpack"
			"magazine"
			"rig"
			"headset"
			"barter"
			"melee"
			"tech"
			"meds"
			"food" */
			switch (type){
				case "vitalMods": 
				case "optionalMods": 
					if (handbook.Items.find(i => i.Id == itemId) && handbook.Items.find(i => i.Id == itemId).Price < 3000)
					{
						
					}
					else if (handbook.Items.find(i => i.Id == itemId) == undefined)
						console.log(itemId)
					else
					{
						bigList.push(itemId)
					}
				default:
					bigList.push(itemId)
			}
			//Might want a filter for keys later, and maybe some other misc items
		}
		//Put the filtered item list back into the bot inventory
		merge ? bot.inventory.items[container] = bigList : null
	}
	
	//Snip snip
	static removeBlacklistItems(bot, externalWeapons, externalGear)
	{
		let gunAreas = ["FirstPrimaryWeapon", "SecondPrimaryWeapon", "Holster"]
		let gearAreas = ["Headwear", "Earpiece", "FaceCover", "ArmorVest", "Eyewear", "TacticalVest"]
		
		let searchAreas = {"equipment":[
		"FirstPrimaryWeapon", "SecondPrimaryWeapon", "Holster", "Headwear", "Earpiece", "FaceCover", "ArmorVest", "Eyewear", "TacticalVest"],
		"items": ["TacticalVest", "Pockets", "Backpack", "SecuredContainer"]}
		
		for (let cat in searchAreas)
		{
			for (let slot in searchAreas[cat])
			{
				let inventory = JsonUtil.clone(bot.inventory[cat][searchAreas[cat][slot]])
				for (let itemID in inventory)
				{
					let index;
					if (cat == "items")
					{
						index = itemID
						itemID = inventory[itemID]
					}
					if (blacklistFile.includes(itemID)
					|| (!externalWeapons && !origList[itemID] && gunAreas.includes(searchAreas[cat][slot]))
					|| (!externalGear && !origList[itemID] && gearAreas.includes(searchAreas[cat][slot])))
					{
						cat == "items" ? delete inventory[index] : delete inventory[itemID]
					}
				}
			bot.inventory[cat][searchAreas[cat][slot]] = JsonUtil.clone(AITweaks.cleanArray(inventory))
			}
		}
	}
	
	//This is a.. ..It's like.. -The regular conflicts are from submods, to parentmods. This flips that around, and makes a list that goes like:
	// Parentmod: [All the submods that hate me]
	//I'm sure there's a one-line way to not have to use this, like.. Using Find, or whatever, but I will be hecked if I can figure out how to use find to sort through complex objects.
	static createConflictList()
	{
		let conflictingModList = {}
		let weaponList = {}
		for (let itemID in database.templates.items)
		{
			if (database.templates.items[itemID]._props.ConflictingItems)
				if (database.templates.items[itemID]._props.ConflictingItems.length > 0)
					for (let i in database.templates.items[itemID]._props.ConflictingItems)
					{
						if (!conflictingModList[database.templates.items[itemID]._props.ConflictingItems[i]])
							conflictingModList[database.templates.items[itemID]._props.ConflictingItems[i]] = []
						if (!conflictingModList[database.templates.items[itemID]._props.ConflictingItems[i]].includes(itemID))
							conflictingModList[database.templates.items[itemID]._props.ConflictingItems[i]].push(itemID)
					}
			if (database.templates.items[itemID]._props.weapUseType && database.templates.items[itemID]._props.Slots)
			{
				let item = database.templates.items[itemID]
				let weapMags = item._props.Slots.find(i => i._name == "mod_magazine")
				if (weapMags)
				{
					weapMags = weapMags._props.filters[0].Filter
					weaponList[itemID] = {
						"magazines": weapMags
					}
				}
			}
		}
		let output = {
			"conflictingModList": conflictingModList,
			"weaponList": weaponList
		}
		return(output)
	}
	
	//I have wasted so much time and effort trying to solve the conflicting item issues that come from trying to limit mod selection. If you're trying to understand this, or learn from this, or fix this or copy this, you have my *deepest* appologies, because this is the.. What? The sixth bloody time I've written 'code' that does basically the same thing, and I am rapidly running out of hecks to give. Expect gibberish, even more slapdash 'programming', less useful comments, and more byzantine sphagetti.
	//I do not care anymore.
	findConflictingMods(bot)
	{
		let conflictList : any = AITweaks.createConflictList()
		conflictList = conflictList.conflictingModList
		for (let i in bot.inventory.mods)
			for (let n in bot.inventory.mods[i])
			{
				//If the mod slot is empty, but the category is a vital one
				let slotLoc = database.templates.items[i]._props.Slots.findIndex(i => i._name == n)
				if (blacklistFile.includes(i))
				{
					null
				}
				else if (bot.inventory.mods[i][n].length == 0 && slotLoc && database.templates.items[i]._props.Slots[slotLoc] && AITweaks.checkRequired(database.templates.items[i]._props.Slots[slotLoc]))
				{
					//console.log(i + " " + n)
					this.fixConflictingMod(bot, [i], [n], [], conflictList)
				}
				else if (!slotLoc)
				{
					null
				}
				for (let branch in conflictList)
				{
					let count = 0
					for (let m = 0; m < bot.inventory.mods[i][n].length; m++)
						if (!conflictList[branch].includes(bot.inventory.mods[i][n][count]))
							break
						if (count == bot.inventory.mods[i][n].length)
							this.fixConflictingMod(bot, [i], [n], conflictList[branch], conflictList)
						count += 1
				}
			}
		//And once that's all done, just grab the function AKI uses to check if a weapon is valid, and bash your head into that a few thousand times. AFAIK it fixes a few things, and wastes only about half a second extra per bot it does it for.
		//Good. Enough.
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
	
	//Does this actually do anything? One sleepy artist says "maybe".
	//Okay. It does at least a *little bit*. Good.
	fixConflictingMod(bot, parentMod, category, conflict, conflictList?, verbose?)
	{
		if (verbose)
			console.log("Parent: " + parentMod + " Category: " + category + "Conflicts: " + conflict)
		let possibles = []
		if (!bot.inventory.mods[parentMod])
			AITweaks.buildModList(blacklistFile, parentMod, bot, 10, conflictList)
		for (let i in database.templates.items[parentMod]._props.Slots)
			if (database.templates.items[parentMod]._props.Slots[i]._name == category)
				possibles = AITweaks.clone(database.templates.items[parentMod]._props.Slots[i]._props.filters[0].Filter)
			else if (verbose)
				console.log(category + " != " + database.templates.items[parentMod]._props.Slots[i]._name)
		if (verbose)
			console.log("Possibles initially = " + possibles)
		for (let i in possibles)
		{
			if (!database.templates.items[possibles[i]])
				delete possibles[i]
			if (conflict.includes(possibles[i]))
				delete possibles[i]
			if (blacklistFile.includes(possibles[i]))
				delete possibles[i]
			else if (database.templates.items[possibles[i]] && database.templates.items[possibles[i]]._props.ConflictingItems.includes(parentMod))
				delete possibles[i]
			else if (bot.inventory.mods[parentMod][category].includes(possibles[i]))
				delete possibles[i]
		}
		possibles = AITweaks.cleanArray(possibles)
		if (verbose)
			console.log("Possibles after = " + possibles)
		let highest = 0
		let count = 0
		for (let i in possibles)
			if (database.templates.items[possibles[i]]._props.SpawnChance > highest)
			{
				highest = database.templates.items[possibles[i]]._props.SpawnChance
				count = +i
			}
		if (database.templates.items[possibles[count]])
		{
			if (!bot.inventory.mods[parentMod][category].includes(possibles[count]))
			{
				bot.inventory.mods[parentMod][category].push(possibles[count])
				if (verbose)
				{
					console.log("Pushed item " + possibles[count])
					console.log(bot.inventory.mods[parentMod])
				}
			}
			else
			{
				if (verbose)
				{
					console.log("Item " + possibles[count] + " already added.")
					console.log(bot.inventory.mods[parentMod])
				}
			}
			return(possibles[count])
		}
	}
		
	static manageRareExceptions(bot, required, a, itemID, modRarity, conflictList, parentConflicts, name, whitelistFile, verbose)
	{
		checkLoop:
		if (required && database.templates.items[name])
		{
			let rareItem = database.templates.items[name]
			//console.log(rareItem._id)
			if (parentConflicts.includes(rareItem._id) && !whitelistFile.includes(name)) //Does it have conflicts? -If no, add it. ALSO checks if it's on the whitelist
			{
				let count = 0
				//If it has conflicts, check out the other mods
				for (let others in bot.inventory.mods[itemID][a])
				{
					//Does this other mod have conflicts?
					if (parentConflicts.includes(bot.inventory.mods[itemID][a][others]))
						//Is its conflict the same as the mod being added?
						if (conflictList[rareItem._id] == conflictList[bot.inventory.mods[itemID][a][others]])
							//Is the new mod more common?
							if (rareItem._props.SpawnChance > database.templates.items[bot.inventory.mods[itemID][a][others]]._props.SpawnChance)
							{
								let q = database.templates.items[name]._name
									if (verbose != undefined)
										console.log(rareItem._name + " " + q + " was rare, but was added, replacing another item")
								bot.inventory.mods[itemID][a][others] = name
								break checkLoop;
							}
					//If the other mod has no conflicts, reject the new mod
					else
					{
						break checkLoop;
					}
					count += 1
					//If all the other mods have conflicts different than this mod
					if (count == bot.inventory.mods[itemID][a].length)
					{
						let q = database.templates.items[name]._name
							if (verbose != undefined)
								console.log(rareItem._name + " " + q + " was rare, but was added")
						bot.inventory.mods[itemID][a].push(name)
						break checkLoop;
					}
				}
			}
			else
			{
				//
				for (let review in bot.inventory.mods[itemID][a])
					if (database.templates.items[bot.inventory.mods[itemID][a][review]]._props.SpawnChance < modRarity)
					{
						delete bot.inventory.mods[itemID][a][review]
					}
				bot.inventory.mods[itemID][a] = AITweaks.cleanArray(bot.inventory.mods[itemID][a])
				bot.inventory.mods[itemID][a].push(name)
				let q = database.templates.items[name]._name
					if (verbose != undefined)
						console.log(rareItem._name + " " + q + " was rare, but was added")
			}
		}
	}
	
	getChildMods(modList, parentMod, type)
	{
		if (parentMod._props[type])
			for (let i in parentMod._props[type])
				for (let n in parentMod._props[type][i]._props.filters[0].Filter)
						if (blacklistFile.includes(parentMod._props[type][i]._props.filters[0].Filter[n])) //Don't even look at blacklisted items
							continue
						else if (modList[parentMod._props[type][i]._name])
							modList[parentMod._props[type][i]._name].push(parentMod._props[type][i]._props.filters[0].Filter[n])
						else
						{
							modList[parentMod._props[type][i]._name] = []
							modList[parentMod._props[type][i]._name].push(parentMod._props[type][i]._props.filters[0].Filter[n])
						}
		return(modList)
	}
	
	//Experimental stuff
	static getRandomWeightedItem(object)
	{
		let breakpointArray = []
		for (let item in object)
		{
			for (let i = 0; i < object[item]; i++)
			breakpointArray.push(item)
		}
		return RandomUtil.getInt(0, breakpointArray.length - 1)
	}
		
	static removeBadIDsFromArray(array, undefineds, nulls)
	{
		for (let index in array)
			if (array[index] == undefined && undefineds == true)
				array.splice(index, 1)
			else if (array[index] == null && nulls == true)
				array.splice(index, 1)
			else if (!itemdb[array[index]])
				array.splice(index, 1)
		return array
	}
	
	static cleanArraysofBadIDs(object, undefineds, nulls)
	{
		let output = {}
		for (let i in object)
			if (Array.isArray(object[i]))
				output[i] = AITweaks.removeBadIDsFromArray(object[i], undefineds, nulls)
			else if (typeof(object[i]) == 'object')
				output[i] = AITweaks.cleanArraysofBadIDs(object[i], undefineds, nulls)
			else
			{
				output[i]= object[i]
			}
		return output
	}
	
	//For misbehaving mods
	static cleanAllItems()
	{
		for (let id in itemdb)
		{
			for (let slot of itemdb[id]?._props?.Slots)
				slot._props.filters[0].Filter = AITweaks.checkArray(slot._props.filters[0].Filter)
		}
	}
	
	static cleanAllBotInventories(undefineds, nulls)
	{
		for (let bot in botTypes)
		{
			for (let caliber in botTypes[bot]?.inventory?.Ammo)
				AITweaks.checkWeightedObject(botTypes[bot].inventory.Ammo[caliber])
			for (let slot in botTypes[bot]?.inventory?.equipment)
				AITweaks.checkWeightedObject(botTypes[bot].inventory.equipment[slot])
			for (let slot in botTypes[bot]?.inventory?.items)
				AITweaks.checkArray(botTypes[bot].inventory.items[slot])
			for (let mod in botTypes[bot]?.inventory?.mods)
				if (!itemdb?.[mod]?._props || blacklistFile.includes(mod))
					delete botTypes[bot]?.inventory?.mods[mod]
				else
				{
					for (let slot in botTypes[bot].inventory.mods[mod])
						botTypes[bot].inventory.mods[mod][slot] = AITweaks.checkArray(botTypes[bot].inventory.mods[mod][slot])
				}
		}
	}
	
	static checkWeightedObject(object)
	{
		for (let id in object)
		{
			if (!itemdb?.[id]?._props || blacklistFile.includes(id) || itemdb?.[id]?._props?.FinAllowed == false)
				delete object[id]
			else
				object[id] *= 1
			if (object[id] > 10000)
				console.log(`${AITweaks.getName(id, false)} ${object[id]}`)
		}
	}
	
	static checkArray(array)
	{
		return array.filter(i => itemdb?.[i]?._props != undefined && !blacklistFile.includes(i) && itemdb?.[i]?._props?.FinAllowed != false)
	}
	
	getModsFromItemID(parentModID)
	{
		let parentMod = database.templates.items[parentModID]
		let modList = {}
		modList = this.getChildMods(modList, parentMod, "Slots")
		modList = this.getChildMods(modList, parentMod, "Chambers")
		modList = this.getChildMods(modList, parentMod, "Cartridges")
		return(modList)
	}
	
	static checkModSuitability(itemID)
	{
		let item = database.templates.items[itemID]
		if (item)
			if ((item._props.Slots && item._props.Slots.length > 0)
				|| (item._props.Chambers && item._props.Chambers.length > 0)
				|| (item._props.Cartridges && item._props.Cartridges.length > 0))
				{
					return true
				}
		return false
	}
	
	//Must be supplied with empty object {} for 'reply'
	recursiveGetItems(object, reply)
	{
		if (Array.isArray(object))
		{
			for (let i in object)
				reply[object[i]] = this.getModsFromItemID(object[i])
			return reply
		}
		else
			for (let i in object)
				reply = this.recursiveGetItems(object[i], reply)
		return reply
	}
	
	getWeaponList(bot)
	{
		let weaponList = []
		for (let i in bot.inventory.equipment.FirstPrimaryWeapon)
			weaponList.push(i)
		for (let i in bot.inventory.equipment.SecondPrimaryWeapon)
			weaponList.push(i)
		for (let i in bot.inventory.equipment.Holster)
			weaponList.push(i)
		return weaponList
	}
		
	//This function takes an item's ID, and adds all its sub-items to the bot's mod loadout.
	//This function is also the root cause of like... 99% of the problems in this part of the code, because there are a bunch of weird cases.
	//Example: There are some items that do not exist. -Like.. They exist in references from other items, but there's no actual main entry for that item. Main ones I found were some of the shells for that new really powerful pump shotgun. Koz-23? Weirdness.
	static buildModList(blacklistFile, itemID, bot, modRarity, conflictList, whitelistFile?, verbose?)
	{
		if (whitelistFile == undefined)
			whitelistFile = []
		//parentConflicts is a list of all mods that cannot coexist peacefully
		let parentConflicts = []
		for (let i in conflictList)
			parentConflicts.push(i)

		let item = database.templates.items[itemID]
		
		//Make sure the item is a valid parent mod item thingy
		if (item && AITweaks.checkModSuitability(itemID) == true)
		{
			if (bot.inventory.mods[itemID] == undefined)
				bot.inventory.mods[itemID]	= {}
			//If an item doesn't have any slots, don't check to see what mods attach to it
			for (let i in item._props.Slots)
			{ 
				let a = item._props.Slots[i]._name
				//This is the right way. Nonvitals is the wrong way.
				let required = AITweaks.checkRequired(item._props.Slots[i])
				//Make sure there's a nice array waiting
				if (bot.inventory.mods[itemID][a] == undefined)
					bot.inventory.mods[itemID][a] = []
				for (let n in item._props.Slots[i]._props.filters[0].Filter)
				{
					//console.log(item._props.Slots[i]._props.filters[0].Filter[n])
					let name = item._props.Slots[i]._props.filters[0].Filter[n]
					//It puts the name in the array
					if (bot.inventory.mods[itemID][a].includes(name) || blacklistFile.includes(name))
					{
						if (verbose != undefined){
							console.log(`Item ${name} already added or item on blacklist`)
							//console.log(bot.inventory.mods[itemID])
						}
					}
					//Make sure it exists, and that it's not too rare. Also allow it if it's a magazine, magazines get sorted out later because SpawnChance absolutely makes no sense with magazines.
					else if (database.templates.items[name] != undefined && (database.templates.items[name].Fin.SpawnChance >= modRarity || a == "mod_magazine" ))
					{
						bot.inventory.mods[itemID][a].push(name)
						let q = database.templates.items[name]._name
						let v = database.templates.items[itemID]._name
						if (verbose != undefined){
							console.log(item._name + " " + q + " Added to " + v)
							//console.log(bot.inventory.mods[itemID])
						}
					}
					//If the item is too rare.. Check and see if it needs to be added anyways.
					else if (database.templates.items[name] && database.templates.items[name].Fin.SpawnChance < modRarity)
					{
						//getting its own function so it's a little more manageable
						AITweaks.manageRareExceptions(bot, required, a, itemID, modRarity, conflictList, parentConflicts, name, whitelistFile, verbose)
					}
					else
					{

						if (verbose != undefined)
							console.log(name + " does not exist?")
					}
				}
			}
		}
		else
		{
			//console.log(item._name + " Failed")
		}
	}
	
	static chamberOrCartridge(id)
	{
		if (itemdb[id])
		{
			if (itemdb[id]._props.Cartridges && itemdb[id]._props.Cartridges.length > 0)
				return "Cartridges"
			else if (itemdb[id]._props.Chambers && itemdb[id]._props.Chambers.length > 0)
				return "Chambers"
			else if (itemdb[id]._props.Slots)
			{
				if(itemdb[id]._props.Slots.find(i => i._name.toLowerCase().includes("camora")))
					return "Camora"
			}
				
		}
		return false
	}
	
	sortMagazines(bot, magRarity, conflictList)
	{
		/* let parentConflicts = []
		for (let i in conflictList)
			parentConflicts.push(i) */
		if (magRarity <= 5)
		for (let i in bot.inventory.mods)
			for (let n in bot.inventory.mods[i])
				if (n == "mod_magazine")
				{
					//console.log(database.templates.items[i]._name)
					//console.log("Before: " + bot.inventory.mods[i][n].length)
					let limit = Math.round(bot.inventory.mods[i][n].length / ((magRarity -10) * -0.4))
					if (limit < 1)
						limit = 1
					let conflicts = true
					for (let m = 0; m < bot.inventory.mods[i][n].length; m++)
					{
						let chamCart : any = AITweaks.chamberOrCartridge(bot.inventory.mods[i][n][m])
						//If there's a magazine with no conflicts, take note
						if (database.templates.items[bot.inventory.mods[i][n][m]]._props.ConflictingItems && database.templates.items[bot.inventory.mods[i][n][m]]._props.ConflictingItems.length <= 0)
							conflicts = false
							//limit += 1
						//Remove things that are not able to be magazines
						if (!database.templates.items[bot.inventory.mods[i][n][m]] || !database.templates.items[bot.inventory.mods[i][n][m]]._props[chamCart] || !database.templates.items[bot.inventory.mods[i][n][m]]._props[chamCart][0])// || !database.templates.items[bot.inventory.mods[i][n][m]]._props[chamCart][0]._max_count)
						{
							Logger.error(`Magazine with id ${bot.inventory.mods[i][n][m]} does not have all the properties required to be a magazine, and has been removed from weapon with id ${i}`)
							bot.inventory.mods[i][n].splice(m, 1)
							m--
						}
					}
					//console.log(conflicts)
					for (let q = 0; q < (bot.inventory.mods[i][n].length - limit); q++)
					{
						let remove : any = -1
						let highest = 0
						for (let m in bot.inventory.mods[i][n])
							if (database.templates.items[bot.inventory.mods[i][n][m]]._props.Cartridges)
								//Ignore magazines that have conflicts, unless there's a magazine with no conflicts
								if (database.templates.items[bot.inventory.mods[i][n][m]]._props.Cartridges[0]._max_count > highest && ((database.templates.items[bot.inventory.mods[i][n][m]]._props.ConflictingItems.length == 0) || conflicts == false))
								{
									remove = m
									highest = database.templates.items[bot.inventory.mods[i][n][m]]._props.Cartridges[0]._max_count
								}
							else if (database.templates.items[bot.inventory.mods[i][n][m]]._props.Chambers)
								if (database.templates.items[bot.inventory.mods[i][n][m]]._props.Chambers[0]._max_count > highest && ((database.templates.items[bot.inventory.mods[i][n][m]]._props.ConflictingItems.length == 0) || conflicts == false))
								{
									remove = m
									highest = database.templates.items[bot.inventory.mods[i][n][m]]._props.Chambers[0]._max_count
								}
						//console.log("Removed	 " + bot.inventory.mods[i][n][remove] + " || " + highest)
						if (remove >= 0)
						{
							delete bot.inventory.mods[i][n][remove]
							bot.inventory.mods[i][n] = AITweaks.cleanArray(bot.inventory.mods[i][n])
						}
					}
				//console.log("After: " + bot.inventory.mods[i][n].length)
				}
		//I am feeling super, super lazy, so I'm just running the same code again, but changed around a bit to remove low-cap mags from any bot with a magRarity greater than 5
		if (magRarity > 5)
		for (let i in bot.inventory.mods)
			for (let n in bot.inventory.mods[i])
				if (n == "mod_magazine")
				{
					//console.log(database.templates.items[i]._name)
					//console.log("Before: " + bot.inventory.mods[i][n].length)
					let limit = Math.round((bot.inventory.mods[i][n].length / 5) * -((magRarity - 10) + 1))
					if (limit < 1)
						limit = 1
					let conflicts = true
					for (let m = 0; m < bot.inventory.mods[i][n].length; m++)
					{
						let chamCart : any = AITweaks.chamberOrCartridge(bot.inventory.mods[i][n][m])
						//If there's a magazine with no conflicts, take note
						if (database.templates.items[bot.inventory.mods[i][n][m]]._props.ConflictingItems && database.templates.items[bot.inventory.mods[i][n][m]]._props.ConflictingItems.length <= 0)
							conflicts = false
							//limit += 1
						if (!database.templates.items[bot.inventory.mods[i][n][m]] || !database.templates.items[bot.inventory.mods[i][n][m]]._props[chamCart] || !database.templates.items[bot.inventory.mods[i][n][m]]._props[chamCart][0])// || !database.templates.items[bot.inventory.mods[i][n][m]]._props[chamCart][0]._max_count)
						{
							Logger.error(`Magazine with id ${bot.inventory.mods[i][n][m]} does not have all the properties required to be a magazine, and has been removed from weapon with id ${i}`)
							bot.inventory.mods[i][n].splice(m, 1)
							m--
						}
					}
					//console.log(conflicts)
					for (let q = 0; q < (bot.inventory.mods[i][n].length - limit); q++)
					{
						let remove : any = -1
						let lowest = 100
						for (let m in bot.inventory.mods[i][n])
							if (database.templates.items[bot.inventory.mods[i][n][m]]._props.Cartridges)
								//Ignore magazines that have conflicts, unless there's a magazine with no conflicts
								if (database.templates.items[bot.inventory.mods[i][n][m]]._props.Cartridges[0]._max_count < lowest && ((database.templates.items[bot.inventory.mods[i][n][m]]._props.ConflictingItems.length == 0) || conflicts == false))
								{
									remove = m
									lowest = database.templates.items[bot.inventory.mods[i][n][m]]._props.Cartridges[0]._max_count
								}
							else if (database.templates.items[bot.inventory.mods[i][n][m]]._props.Chambers)
								if (database.templates.items[bot.inventory.mods[i][n][m]]._props.Chambers[0]._max_count < lowest && ((database.templates.items[bot.inventory.mods[i][n][m]]._props.ConflictingItems.length == 0) || conflicts == false))
								{
									remove = m
									lowest = database.templates.items[bot.inventory.mods[i][n][m]]._props.Chambers[0]._max_count
								}
						//console.log("Removed	 " + bot.inventory.mods[i][n][remove] + " || " + lowest)
						if (remove >= 0)
						{
							delete bot.inventory.mods[i][n][remove]
							bot.inventory.mods[i][n] = AITweaks.cleanArray(bot.inventory.mods[i][n])
						}
					}
				/* for (let i in bot.inventory.mods)
					for (let n in bot.inventory.mods[i])
						if (n == "mod_magazine")
							for (let m in bot.inventory.mods[i][n])
							{
								let item = database.templates.items[bot.inventory.mods[i][n][m]]
								if (item._props.Chambers)
									console.log(`${item._id} ${item._props.Chambers[0]._max_count}`)
								if (item._props.Cartridges)
									console.log(`${item._id} ${item._props.Cartridges[0]._max_count}`)
							} */
				//console.log("After: " + bot.inventory.mods[i][n].length)
				}
	}
	
	static addAllMods(bot)
	{
		for (let itemID in itemdb)
		{
			let item = database.templates.items[itemID]
			
			//Make sure the item is a valid parent mod item thingy
			if (item && AITweaks.checkModSuitability(itemID) == true)
			{
				//If an item doesn't have any slots, don't check to see what mods attach to it
				for (let i in item._props.Slots)
				{
					let slotName = item._props.Slots[i]._name
					if (!bot.inventory.mods[itemID])
						bot.inventory.mods[itemID] = {}
					if (!bot.inventory.mods[itemID][slotName])
						bot.inventory.mods[itemID][slotName] = []
					for (let mod in item._props.Slots[i]._props.filters[0].Filter)
					{
						mod = item._props.Slots[i]._props.filters[0].Filter[mod]
						if (itemdb[mod] && !bot.inventory.mods[itemID][slotName].includes(mod) && !blacklistFile.includes(mod))
							bot.inventory.mods[itemID][slotName].push(mod)
					}
				}
				//Add bullets, if applicable
				let chamberName = undefined
				if (item._props.Chambers && item._props.Chambers.length > 0)
					chamberName = "Chambers"
				if (item._props.Cartridges && item._props.Cartridges.length > 0)
					chamberName = "Cartridges"
				if (chamberName)
					for (let i in item._props[chamberName])
						{
							let slotName = item._props[chamberName][i]._name
							if (!bot.inventory.mods[itemID])
								bot.inventory.mods[itemID] = {}
							if (!bot.inventory.mods[itemID][slotName])
								bot.inventory.mods[itemID][slotName] = []
							for (let mod in item._props[chamberName][i]._props.filters[0].Filter)
							{
								mod = item._props[chamberName][i]._props.filters[0].Filter[mod]
								if (!bot.inventory.mods[itemID][slotName].includes(mod) && !blacklistFile.includes(mod))
									bot.inventory.mods[itemID][slotName].push(mod)
							}
						}
			}
		}
	}
	
	addModVariety(bot, modRarity, conflictList)
	{
		//Add tier 1 mods for all weapons they can use
		for (let i in bot.inventory.equipment.FirstPrimaryWeapon)
			AITweaks.buildModList(blacklistFile, i, bot, modRarity, conflictList)
		//Same thing, but for sidearms
		for (let i in bot.inventory.equipment.Holster)
			AITweaks.buildModList(blacklistFile, i, bot, modRarity, conflictList)
		//And then helmets. Get them some faceshields.
		for (let i in bot.inventory.equipment.Headwear)
			AITweaks.buildModList(blacklistFile, i, bot, modRarity, conflictList)
	
		//Run this three times, just to make sure nothing is missed, since it *should* be somewhat recursive?
		//..So it seems like even one time does it pretty well? -Not 100% sure, will test eventually. (That might be a lie)
		for (let q = 0; q < 3; q++)
		{
			for (let i in bot.inventory.mods)
			{
				let a = bot.inventory.mods
				for (let n in a[i])
				{
					for (let o in a[i][n])
					{
						AITweaks.buildModList(blacklistFile, a[i][n][o], bot, modRarity, conflictList)
					}
				}
			}
		}
		for (let q = 0; q < 1; q++)
		{
			for (let i in bot.inventory.mods)
			{
				let a = bot.inventory.mods
				AITweaks.buildModList(blacklistFile, [i], bot, modRarity, conflictList)
			}
		}
	}
	
	//Set this up to work with just the bot file if it moves into the main loop
	static removeNonArmoredItems(botName, slot, percent)
	{
		let bot = botTypes[botName]
		for (let rig in bot.inventory.equipment[slot])
		{
			let item = itemdb[rig]
			if (((!item._props.armorClass || ["", 0].includes(item._props.armorClass))
			|| (!item._props.armorZone || item._props.armorZone.length == 0))
			&& Object.keys(bot.inventory.equipment[slot]).length > 1
			&& RandomUtil.getInt(0, 99) < percent)
			{
				AITweaks.removeItemFromBotInv(bot, slot, rig, 1)
			}
		}
	}
	
	//Try and make the weapons a little bit less silly via chance values.
	adjustChanceValues(bot, botName, wackiness)
	{
		let scavs = []
		let PMCs = []
		let raiders = []
		
		for (let i in config.AIgearChanges.scavBots)
			scavs.push(config.AIgearChanges.scavBots[i].toLowerCase())
		for (let i in config.AIgearChanges.raiderBots)
			raiders.push(config.AIgearChanges.raiderBots[i].toLowerCase())
		for (let i in config.AIgearChanges.pmcBots)
			PMCs.push(config.AIgearChanges.pmcBots[i].toLowerCase())
		botName = botName.toLowerCase()
		if (wackiness < 0)
			return
		let bossMinions = []
		let defaultCats = {
			"scavs": ["assault", "marksman"],
			"PMCs": [AKIPMC.toLowerCase(), botNameSwaps.bear, botNameSwaps.usec],
			"raiders": ["pmcbot"],
			"bossMinions": ["followerbully", "followerkojaniy", "followersanitar", "followergluharassault", "followergluharscout", "followergluharsecurity", "followergluharsnipe"]
		}
		for (let cat in defaultCats)
			for (let i in defaultCats[cat])
			{
				i = defaultCats[cat][i]
				//Check to see if the bot type DOES NOT appear in any of the player-defined lists
				if (!scavs.includes(i) && !PMCs.includes(i) && !raiders.includes(i) && !bossMinions.includes(i))
					//If it does not, then push it into the appropriate list
					if (cat == "scavs")
						scavs.push(i)
					else if (cat == "PMCs")
						PMCs.push(i)
					else if (cat == "raiders")
						raiders.push(i)
					else if (cat == "bossMinions")
						bossMinions.push(i)
			}
		if (scavs.includes(botName))
		{
			let a = botTypes[botName].chances
			a.mods.mod_equipment = 15
			a.mods.mod_equipment_000 = 15
			a.mods.mod_equipment_001 = 15
			a.mods.mod_tactical_002 = 1
			a.mods.mod_tactical_003 = 2
			a.mods.mod_scope_001 = 5
			a.mods.mod_foregrip = 35
			a.mods.mod_muzzle = 30
			a.mods.mod_stock_000 = 42
		}
		if (PMCs.includes(botName))
		{
			let a = botTypes[botName].chances
			a.equipment.ArmorVest = 95
			a.mods.mod_equipment = 66
			a.mods.mod_equipment_000 = 66
			a.mods.mod_equipment_001 = 66
			a.mods.mod_tactical_002 = 2
			a.mods.mod_tactical_003 = 1
			a.mods.mod_scope_001 = 30
			//Every PMC should have these - Not working for some reason?
			//a.equipment.earpiece = 100
		}
		if (raiders.includes(botName))
		{
			let a = botTypes[botName].chances
			a.mods.mod_equipment = 40
			a.mods.mod_equipment_000 = 40
			a.mods.mod_equipment_001 = 40
			a.mods.mod_tactical_002 = 2
			a.mods.mod_tactical_003 = 1
			a.mods.mod_scope_001 = 25
			//Give raiders some hearing protection
			//a.equipment.earpiece = 25
		}
		if (bossMinions.includes(botName))
		{
			// let bot = botTypes[bossMinions[i]]
			let a = botTypes[botName].chances
			a.mods.mod_tactical_002 = 2
			a.mods.mod_tactical_003 = 1
			a.mods.mod_scope_001 = 15
		}
		for (let n in bot.chances.mods)
		{
			if (["mod_sight_rear", "mod_sight_front", "mod_magazine"].includes(n) || bot.chances.mods[n] == 100)
			{
				bot.chances.mods[n] = 100
				continue
			}
			if (bot.chances.mods[n] == 0)
				bot.chances.mods[n] = 1
			bot.chances.mods[n] = Math.round(bot.chances.mods[n] * wackiness)
			if (bot.chances.mods[n] > 100)
				bot.chances.mods[n] = 100
		}
	}
	
	//This establishes chance values based on the advanced inventory config
	setChanceValues(bot, botName)
	{
		let lowLevelAIs = []
		let midLevelAIs = []
		let highLevelAIs = []
		
		for (let i in advIConfig.botCategories.lowLevelAIs)
			lowLevelAIs.push(advIConfig.botCategories.lowLevelAIs[i].toLowerCase())
		for (let i in advIConfig.botCategories.midLevelAIs)
			midLevelAIs.push(advIConfig.botCategories.midLevelAIs[i].toLowerCase())
		for (let i in advIConfig.botCategories.highLevelAIs)
			highLevelAIs.push(advIConfig.botCategories.highLevelAIs[i].toLowerCase())
		
		
		if (advIConfig.enabled && advIConfig.general_inventory_changes_enabled)
			{
				let botCategory
				if (lowLevelAIs.includes(botName.toLowerCase()))
					botCategory = "lowLevelAIs"
				else if (midLevelAIs.includes(botName.toLowerCase()))
					botCategory = "midLevelAIs"
				else if (highLevelAIs.includes(botName.toLowerCase()))
					botCategory = "highLevelAIs"
				else //Undefined bots. This probably includes bosses
					botCategory = undefined
				
				if (botCategory == undefined) //Just break immediately for undefineds, for now.
					return
				
				for (let chanceCat in bot.chances.equipment)
				{
					if (botCategory == undefined)
						continue
					if (advIConfig.generalInventory.chance_values[botCategory].equipment[chanceCat] != undefined
					&& advIConfig.generalInventory.chance_values[botCategory].equipment[chanceCat] >= 0)
					{
						bot.chances.equipment[chanceCat] = advIConfig.generalInventory.chance_values[botCategory].equipment[chanceCat]
					}
				}
				if (advIConfig.generalInventory.chance_values[botCategory].mods)
					for (let chanceCat in bot.chances.mods)
					{
						if (botCategory == undefined)
							continue
						if (advIConfig.generalInventory.chance_values[botCategory].mods[chanceCat] != undefined
						&& advIConfig.generalInventory.chance_values[botCategory].mods[chanceCat] >= 0)
						{
							bot.chances.equipment[chanceCat] = advIConfig.generalInventory.chance_values[botCategory].mods[chanceCat]
						}
					}
			}
	}
	
	filterForQuality(bot, modRarity, conflictList, weaponModList, supportChain)
	{
		let blackList = []
		for (let parentMod in bot.inventory.mods)
			for (let slot in bot.inventory.mods[parentMod])
				for (let childModIndex in bot.inventory.mods[parentMod][slot])
				{
					let childMod = database.templates.items[bot.inventory.mods[parentMod][slot][childModIndex]]
					if (childMod && !blackList.includes(childMod._id) && childMod.Fin.SpawnChance && childMod.Fin.SpawnChance < modRarity && !childMod._props.Cartridges && !childMod._props.PenetrationPower)
					{
						let reply = this.attemptItemRemoval(bot, conflictList, weaponModList, supportChain, childMod._id)
						if (reply)
						{
							//console.log(reply)
							blackList.push(reply["mod"])
						}
					}
				}
		//I don't know how much this section actually does
		let deleteList = []
		for (let parentMod in bot.inventory.mods)
			if (database.templates.items[parentMod].Fin.SpawnChance < modRarity)
				for (let slot in bot.inventory.mods[parentMod])
				{
					if (!bot.inventory.mods[parentMod][slot].find(i => database.templates.items[i].Fin.SpawnChance >= modRarity))
						deleteList.push(parentMod)
				}
		for (let i in deleteList)
		{
			let reply = this.attemptItemRemoval(bot, conflictList, weaponModList, supportChain, bot.inventory.mods[deleteList[i]])
			//console.log(reply)
		}
	}
	
	findAgreeableMods(weaponModList, conflictList, weapon, modID)
	{
		let agreeables = {}
		let modItem = database.templates.items[modID]
		for (let slot in weaponModList[weapon])
		{
			let modSlot = undefined
			agreeables[slot] = []
			if (modID == "5afd7ded5acfc40017541f5e")
				null //console.log(modItem._props.Slots)
			for (let mod in weaponModList[weapon][slot])
			{
				if (!conflictList[modID] || !conflictList[modID].includes(weaponModList[weapon][slot][mod]))
				{
					agreeables[slot].push(weaponModList[weapon][slot][mod])
				}
			}
			if (modItem._props.Slots)
				for (let i in modItem._props.Slots)
					agreeables[modItem._props.Slots[i]._name] = modItem._props.Slots[i]._props.filters[0].Filter
				// if (conflictList[modID])
					// for (let i in agreeables[modItem._props.Slots[i]._name])
						// if (conflictList[modID].includes(agreeables[modItem._props.Slots[i]._name][i]))
		}
		// if (modID == "55d355e64bdc2d962f8b4569")
			// console.log(agreeables)
		return agreeables
	}
	
	attemptItemRemoval(bot, conflictList, botWeaponModList, botSupportChain, mod)
	{
		for (let weapon in botSupportChain)
		{
			for (let submod in botSupportChain[weapon])
				for (let slot in botSupportChain[weapon][submod])
				{
					if ((botSupportChain[weapon][submod][slot] && botSupportChain[weapon][submod][slot].includes(mod))&& botSupportChain[weapon][submod][slot].length == 1)
					{
						//If there's a slot where the mod is the only viable item, it cannot be removed
						//return(`FAILED TO REMOVE ${database.templates.items[mod]._name}`)
						return({"weapon": weapon,
						"mod": mod})
					}
				}
		}
		this.removeItem(bot, botWeaponModList, botSupportChain, mod)
		//return (`Removed ${database.templates.items[mod]._name}`)
	}
	
	removeItem(bot, botWeaponModList, botSupportChain, mod)
	{
		for (let weapon in botSupportChain)
		{
			if (botSupportChain[weapon][mod])
				delete botSupportChain[weapon][mod]
			for (let submod in botSupportChain[weapon])
				for (let slot in botSupportChain[weapon][submod])
				{
					for (let i in botSupportChain[weapon][submod][slot])
						if (botSupportChain[weapon][submod][slot][i] == mod)
							delete botSupportChain[weapon][submod][slot][i]
					botSupportChain[weapon][submod][slot] = AITweaks.cleanArray(botSupportChain[weapon][submod][slot])
				}
			for (let slot in botWeaponModList[weapon])
			{
				for (let submod in botWeaponModList[weapon][slot])
					if (botWeaponModList[weapon][slot][submod] == mod)
						delete botWeaponModList[weapon][slot][submod]
				//botWeaponModList[weapon][slot] = AITweaks.cleanArray(botWeaponModList[weapon][slot])
			}
		}
		for (let parentMod in bot.inventory.mods)
			for (let slot in bot.inventory.mods[parentMod])
			{
				for (let subMod in bot.inventory.mods[parentMod][slot])
					if (bot.inventory.mods[parentMod][slot][subMod] == mod)
						delete bot.inventory.mods[parentMod][slot][subMod]
						//console.log("BALEETED")
				bot.inventory.mods[parentMod][slot] = AITweaks.cleanArray(bot.inventory.mods[parentMod][slot])
			}
		if (bot.inventory.mods[mod])
			delete bot.inventory.mods[mod]
	}
	
	createSupportChainList(weaponModList, conflictList)
	{
		let weaponList = []
		let supportChain = {}
		for (let i in weaponModList)
			weaponList.push(i)
		for (let weapon in weaponModList)
			for (let slot in weaponModList[weapon])
				for (let mod in weaponModList[weapon][slot])
				{
					let modID = weaponModList[weapon][slot][mod]
					if (conflictList[modID] || !conflictList[modID])
					{
						if (!supportChain[weapon])
							supportChain[weapon] = {}
						if (!supportChain[weapon][modID])
							supportChain[weapon][modID] = {}
						supportChain[weapon][modID] = this.findAgreeableMods(weaponModList, conflictList, weapon, modID)
					}
				}
		return supportChain
	}
	
	gatherSubMods(parentMod, modList)
	{
		if (database.templates.items[parentMod])
			if (database.templates.items[parentMod]._props.Slots && database.templates.items[parentMod]._props.Slots.length > 0)
				for (let i in database.templates.items[parentMod]._props.Slots)
				{
					let slotName = database.templates.items[parentMod]._props.Slots[i]._name
					if (AITweaks.checkRequired(database.templates.items[parentMod]._props.Slots[i]))
						for (let n in database.templates.items[parentMod]._props.Slots[i]._props.filters[0].Filter)
						{
							//console.log(slotName)
							if (!modList[slotName])
									modList[slotName] = []
							if (database.templates.items[database.templates.items[parentMod]._props.Slots[i]._props.filters[0].Filter[n]] && !modList[slotName].includes(database.templates.items[parentMod]._props.Slots[i]._props.filters[0].Filter[n]))
								modList[slotName].push(database.templates.items[parentMod]._props.Slots[i]._props.filters[0].Filter[n])
						}
				}
		return (modList)
	}
	
	createWeaponModList(bot)
	{
		//Build a list of every slot and possible mod for every weapon the bot can use
		let weaponList = []
		let weaponMods = {}
		for (let id in bot.inventory.equipment.FirstPrimaryWeapon)
			if (!weaponList.includes(id))
				weaponList.push(id)
		for (let id in bot.inventory.equipment.SecondPrimaryWeapon)
			if (!weaponList.includes(id))
				weaponList.push(id)
		for (let id in bot.inventory.equipment.Holster)
			if (!weaponList.includes(id))
				weaponList.push(id)
		for (let id in weaponList)
		{
			let modList = {}
			modList = this.gatherSubMods(weaponList[id], modList)
			let compare = {}
			while (compare != modList)
			{
				compare = modList
				for (let n in modList)
					for (let m in modList[n])
						modList = this.gatherSubMods(modList[n][m], modList)
			}
			weaponMods[weaponList[id]] = modList
		}
		return(weaponMods)
	}
	
	//traderBase is the trader database. -It's set up this way so that you can make a copy of the trader database at some point, and pass it that instead of the *current* trader database, which can be useful
	static getLowestTraderLevel(itemId, traderBase, currency)
	{
		let traderLLMults = {} //Local weapons should be more common
		let lowestLLs = {}
		lowestLLs[itemId] = 40
		traderLLMults["54cb57776803fa99248b456e"] = 1 //Ther
		traderLLMults["5a7c2eca46aef81a7ca2145d"] = 1 //Mech 
		traderLLMults["5ac3b934156ae10c4430e83c"] = 1 //Ragm
		traderLLMults["5c0647fdd443bc2504c2d371"] = 1 //Jaeg
		traderLLMults["54cb50c76803fa8b248b4571"] = 1 //Prap
		traderLLMults["5935c25fb3acc3127c3d8cd9"] = 1//2 //PK
		traderLLMults["58330581ace78e27b8b10cee"] = 1//1.5 //Skier
		traderLLMults["579dc571d53a0658a154fbec"] = 1 //Fence
		for (let trader in traderBase)
		{
			if (["579dc571d53a0658a154fbec","ragfair"].includes(trader))//Skip Fence and the ragfair
				continue
			let matches = traderBase[trader].assort.items.filter(i => i._tpl == itemId)
			if (matches)
			{
				//Check for any matches that are traded for anything in 'currency'
				for (let match in matches)
				{
					if (traderBase[trader].assort.barter_scheme[matches[match]._id])
						//EUR, RUB and USB (Not in that order)
						if (currency.includes(traderBase[trader].assort.barter_scheme[matches[match]._id][0][0]._tpl) || currency.includes("all"))
						{
							let childItems = traderBase[trader].assort.items.filter(i => i.parentId == matches[match]._id)
							let childList = [matches[match]._tpl]
							for (let id in childItems)
								childList.push(childItems[id]._tpl)
							let LL = traderBase[trader].assort.loyal_level_items[matches[match]._id]
							let LLlevel
							if (traderBase[trader].base.loyaltyLevels[LL - 1])
								LLlevel = traderBase[trader].base.loyaltyLevels[LL - 1].minLevel
							else
								LLlevel = 40
							for (let id in childList)
								if (!lowestLLs[childList[id]] || lowestLLs[childList[id]] > LLlevel)
									lowestLLs[childList[id]] = LLlevel * traderLLMults[trader]
						}
				}
			}
		}
		return lowestLLs
	}
	
	//The idea here is to look at a variety of factors, use them to adjust the 'SpawnChance' value of a whole bunch of mods, let this program sort the mods by SpawnChance, and then restore the original SpawnChance value to the items in question.
	tempAdjustRarityValues()
	{
		//For all items, find out at what loyalty level they can first be acquired for usd / rub / eur
		let traderLLMults = {} //Local weapons should be more common
		let lowestLLs = {}
		traderLLMults["54cb57776803fa99248b456e"] = 1 //Ther
		traderLLMults["5a7c2eca46aef81a7ca2145d"] = 1 //Mech 
		traderLLMults["5ac3b934156ae10c4430e83c"] = 1 //Ragm
		traderLLMults["5c0647fdd443bc2504c2d371"] = 1 //Jaeg
		traderLLMults["54cb50c76803fa8b248b4571"] = 1 //Prap
		traderLLMults["5935c25fb3acc3127c3d8cd9"] = 2 //PK
		traderLLMults["58330581ace78e27b8b10cee"] = 1.5 //Skier
		traderLLMults["579dc571d53a0658a154fbec"] = 1 //Fence

		//Define all weapon mods, and whether or not they're optional
		//Use this later to know which items to adjust as mods, rarity-wise
		let weaponMods = {"required": [], "other": []}
		
		for (let itemID in database.templates.items)
		{
			itemdb[itemID].Fin = {}
			let item = database.templates.items[itemID]
			for (let trader in orig.traders)
			{
				if (["579dc571d53a0658a154fbec","ragfair"].includes(trader))//Skip Fence and the ragfair
					continue
				let matches = orig.traders[trader].assort.items.filter(i => i._tpl == item._id)
				if (matches)
				{
					//Check for any matches that are traded for hard currency
					for (let match in matches)
					{
						if (orig.traders[trader].assort.barter_scheme[matches[match]._id])
							//EUR, RUB and USB (Not in that order)
							if (["5449016a4bdc2d6f028b456f", "5696686a4bdc2da3298b456a", "569668774bdc2da2298b4568"].includes(orig.traders[trader].assort.barter_scheme[matches[match]._id][0][0]._tpl))
							{
								!lowestLLs[itemID] ? lowestLLs[itemID] = 40 : null
								let childItems = orig.traders[trader].assort.items.filter(i => i.parentId == matches[match]._id)
								let childList = [matches[match]._tpl]
								for (let id in childItems)
									childList.push(childItems[id]._tpl)
								let LL = orig.traders[trader].assort.loyal_level_items[matches[match]._id]
								let LLlevel
								if (orig.traders[trader].base.loyaltyLevels[LL - 1])
									LLlevel = orig.traders[trader].base.loyaltyLevels[LL - 1].minLevel
								else
									LLlevel = 40
								for (let id in childList)
									if (!lowestLLs[childList[id]] || lowestLLs[childList[id]] > LLlevel)
										lowestLLs[childList[id]] = LLlevel * traderLLMults[trader]
							}
					}
				}
			}
			//If the item wasn't found on the unaltered traders, check the current traders
			if (!lowestLLs[itemID])
				for (let trader in database.traders)
				{
					if (["579dc571d53a0658a154fbec","ragfair"].includes(trader))//Skip Fence and the ragfair
						continue
					let matches = database.traders[trader].assort.items.filter(i => i._tpl == item._id)
					if (matches)
					{
						//Check for any matches that are traded for hard currency
						for (let match in matches)
						{
							if (database.traders[trader].assort.barter_scheme[matches[match]._id])
								if (["5449016a4bdc2d6f028b456f", "5696686a4bdc2da3298b456a", "569668774bdc2da2298b4568"].includes(database.traders[trader].assort.barter_scheme[matches[match]._id][0][0]._tpl))
								{
									!lowestLLs[itemID] ? lowestLLs[itemID] = 40 : null
									let childItems = database.traders[trader].assort.items.filter(i => i.parentId == matches[match]._id)
									let childList = [matches[match]._tpl]
									for (let id in childItems)
										childList.push(childItems[id]._tpl)
									let LL = database.traders[trader].assort.loyal_level_items[matches[match]._id]
									let LLlevel
									if (database.traders[trader].base.loyaltyLevels[LL - 1])
										LLlevel = database.traders[trader].base.loyaltyLevels[LL - 1].minLevel
									else
										LLlevel = 40
									for (let id in childList)
										if (!lowestLLs[childList[id]] || lowestLLs[childList[id]] > LLlevel)
											lowestLLs[childList[id]] = LLlevel * traderLLMults[trader]
								}
						}
					}
				}
			//If the item wasn't found for sale on any trader for cash, do a thing.
			//Not yet implemented.
			//Plan: do some basic quests. -Is it a loot item or a mod, etc etc... -Mods should default to 40, loot items to 1, etc.
			!lowestLLs[itemID] ? lowestLLs[itemID] = 15 : null
			//Multiply mod-added items
			!orig.items[itemID] ? lowestLLs[itemID] *= 2 : null
		}
		//save original price value, and set a SpawnChance value.
		for (let itemID in database.templates.items)
		{
			let item = database.templates.items[itemID]
			item._orig	= {}
			//If the item actually exists, and has slots
			if (item._props)
				item._props.SpawnChance = 0 //Testing this, to see what just forgetting about SC does to FAIT.
			
			item._orig.SpawnChance = item._props.SpawnChance
			let itemHandbook = handbook.Items.find(i => i.Id == itemID)
			if (itemHandbook)
				item._orig.CreditsPrice = itemHandbook.Price
			if (lowestLLs[item._id])
				item._props.lowestLL = lowestLLs[item._id]
		}
		
		//Give each item a rarity related DIRECTLY to which level you need to be to buy it for cold, hard cash
		for (let itemId in itemdb)
		{
			//An item sold for cash at PKLL3, with a base value of 200k, should wind up with a rarity of:
			//90 / 18 = 5	 5 - (200000 / 65000) = 2
			//An item sold for cash at MKLL3, with a base value of 150k, should wind up with a rarity of:
			//90 / 30 = 3	 3 - (150000 / 65000) = 1
			//An item sold for cash at PKLL2, with a base value of 50k, should wind up with a rarity of:
			//90 / 10 = 9	 9 - (50000 / 65000) = 9
			let itemHandbook = handbook.Items.find(i => i.Id == itemId)
			if (itemdb[itemId]._props.SpawnChance != undefined && (itemHandbook && itemHandbook.Price) && itemdb[itemId]._props.lowestLL)
			{
				let itemPriceMult = Math.floor(handbook.Items.find(i => i.Id == itemId).Price / 100)
				itemPriceMult < 1 ? itemPriceMult = 1 : null
				itemdb[itemId]._props.SpawnChance = (itemdb[itemId]._props.lowestLL * itemPriceMult) + (itemdb[itemId]._props.lowestLL * 1000)
				// itemdb[itemId]._props.SpawnChance = ( 90 / (itemdb[itemId]._props.lowestLL * 1) ) - (Math.floor(handbook.Items.find(i => i.Id == itemId).Price / 65000)) + itemdb[itemId]._orig.SpawnChance
				itemdb[itemId].Fin.SpawnChance = itemdb[itemId]._props.SpawnChance
			}
		}
		//Higher is less rare
		let caliberRarityTable = {
			"Caliber9x18PM": 2,
			"9mm_PM": 2,
			"Caliber556x45NATO": 1,
			"Caliber12g": 1.6,
			"Caliber762x54R": 1,
			"Caliber545x39": 1.9,
			"Caliber762x39": 2,
			"Caliber9x19PARA": 1.8,
			"Caliber762x25TT": 1.3,
			"Caliber9x39": 1,
			"Caliber9x18PMM": 1,
			"Caliber762x51": 1,
			"Caliber366TKM": 1,
			"Caliber9x21": 1,
			"Caliber20g": 1,
			"Caliber46x30": 1, //4.6mm
			"Caliber127x55": 0.7,
			"Caliber57x28": 0.7,
			"Caliber9x33R": 0.7,
			"Caliber30x29": 0.001, //AGS grenades
			"Caliber1143x23ACP": 1.5, //45ACP
			"Caliber40x46": 0.01, //40mm grenades
			"Caliber23x75": 0.4, //23mm
			"Caliber762x35": 1, //.300
			"Caliber86x70": 0.01, //338 Lapua
			"Caliber26x75": 0.05 //Flares
		}
		for (let itemId in itemdb)
			if (itemdb[itemId]._props.ammoCaliber)
				if (!caliberRarityTable[itemdb[itemId]._props.ammoCaliber])
				{
					console.log(`Adding caliber ${itemdb[itemId]._props.ammoCaliber} to caliber table`)
					caliberRarityTable[itemdb[itemId]._props.ammoCaliber] = 1
				}
		let specificIDRarityMults = {
			"606587252535c57a13424cfd": 0.5, //MK47
			"5ae08f0a5acfc408fb1398a1": 0.5, //Mosin sniper
			"587e02ff24597743df3deaeb": 0.5, //OP SKS
			"576165642459773c7a400233": 0.5, //Saiga 12
			"5fb64bc92b1b027b1f50bcf2": 0.3, //Vector 45
			"5fc3f2d5900b1d5091531e57": 0.5, //Vector 9
			"57dc2fa62459775949412633": 0.5 //74u
		}
		//Case-specific modifications
		let weaponList = []
		let armorList = []
		let tacticalsList = []
		let opticsList = []
		for (let itemId in itemdb)
		{
			let item = itemdb[itemId]
			//Weapons: Alter rarity depending on fire-mode
			if (item._props.weapUseType && item._props.weapUseType != "" && item._props.Weight > 0)
			{
				weaponList.push(itemId)
				//If bolt
					if (item._props.BoltAction && item._props.BoltAction == true)
						item._props.SpawnChance = Math.round(item._props.SpawnChance / 1.5)
					//If auto
					if (item._props.weapFireType && item._props.weapFireType.includes("fullauto"))
						item._props.SpawnChance = Math.round(item._props.SpawnChance / 0.75)
					//If semi
					if (item._props.weapFireType && !item._props.weapFireType.includes("fullauto"))
						item._props.SpawnChance = Math.round(item._props.SpawnChance / 1.1)
					//If pump
					if (item._props.weapFireType && !item._props.weapFireType.includes("fullauto")&& item._props.bFirerate <= 30)
						item._props.SpawnChance = Math.round(item._props.SpawnChance / 2)
				//Alter rarity accourding to caliber
				if (caliberRarityTable[item._props.ammoCaliber])
					item._props.SpawnChance = item._props.SpawnChance / caliberRarityTable[item._props.ammoCaliber]
				if (specificIDRarityMults[item._id])
					item._props.SpawnChance = item._props.SpawnChance / specificIDRarityMults[item._id]
			}
			else if (item._props.armorZone && item._props.armorZone.length > 0)
			{
				armorList.push(itemId)
			}
			//Tactical items
			else if (["544909bb4bdc2d6f028b4577"].includes(item._proto))
			{
				tacticalsList.push(itemId)
			}
			//Optics
			else if ((item._props.OpticCalibrationDistances && item._props.OpticCalibrationDistances.length > 1) || ["544a39de4bdc2d24388b4567"].includes(item._proto))
			{
				opticsList.push(itemId)
			}
			item._props.SpawnChance = Math.round(item._props.SpawnChance)
		}
		let rarities = {
			"weapons": {"id": [], "rarity": []},
			"armor": {"id": [], "rarity": []},
			"tacticals": {"id": [], "rarity": []},
			"optics": {"id": [], "rarity": []},
			"other": {"id": [], "rarity": []},
			"sorted": {
				"guns": [],
				"armor": [],
				"tacticals": [],
				"optics": [],
				"other": []
			}}
		for (let itemId in itemdb)
		{
			let type
			if (weaponList.includes(itemId))
				type = "weapons"
			else if (armorList.includes(itemId))
				type = "armor"
			else if (tacticalsList.includes(itemId))
				type = "tacticals"
			else if (opticsList.includes(itemId))
				type = "optics"
			else
				type = "other"
			//Only push items that have a modified spawn chance.
			if (itemdb[itemId].Fin && itemdb[itemId].Fin.SpawnChance)
			{
				itemdb[itemId].Fin.SpawnChance = itemdb[itemId]._props.SpawnChance
				rarities[type].id.push(itemId)
				rarities[type].rarity.push(itemdb[itemId].Fin.SpawnChance)
			}
			else
			{
				if (!itemdb[itemId].Fin)
					itemdb[itemId].Fin = {}
				itemdb[itemId].Fin.SpawnChance = itemdb[itemId]._props.SpawnChance
			}
		}
		
		rarities.sorted.guns = AITweaks.sortListByList(rarities.weapons.id, rarities.weapons.rarity)
		rarities.sorted.armor = AITweaks.sortListByList(rarities.armor.id, rarities.armor.rarity)
		rarities.sorted.tacticals = AITweaks.sortListByList(rarities.tacticals.id, rarities.tacticals.rarity)
		rarities.sorted.optics = AITweaks.sortListByList(rarities.optics.id, rarities.optics.rarity)
		rarities.sorted.other = AITweaks.sortListByList(rarities.other.id, rarities.other.rarity)
		
		//Rank all items in a category from 50-0, with 50 being the rarest
		for (let type in rarities.sorted)
			for (let index in rarities.sorted[type])
			{
				let item = itemdb[rarities.sorted[type][index]]
				item.Fin.FinsRarityRanking = +index / rarities.sorted[type].length * 50
				item._props.SpawnChance = item.Fin.FinsRarityRanking
			}
		
		for (let check in rarities.sorted)
		{
			let printout = []
			for (let i in rarities.sorted[check])
			{
				printout.push(`${Math.round(itemdb[rarities.sorted[check][i]].Fin.SpawnChance)} ${Math.round(itemdb[rarities.sorted[check][i]].Fin.FinsRarityRanking)}	${database.locales.global.en.templates[rarities.sorted[check][i]] ? database.locales.global.en.templates[rarities.sorted[check][i]].ShortName : itemdb[rarities.sorted[check][i]]._name}`)
			}
			AITweaks.saveToFile({printout}, `doNotTouch/debug/rarities_${check}.json`)
		}
	}
	
	//Lists must be of equal length, sortBy can be integers or decimals or negatives. Doesn't matter.
	static sortListByList(toSort, sortBy)
	{
		let output = []
		let tempSort = {}
		for (let i in toSort)
			if (tempSort[sortBy[i]])
				tempSort[sortBy[i].toString()].push(toSort[i])
			else
				tempSort[sortBy[i].toString()] = [toSort[i]]
		let orderedKeys = Object.keys(tempSort).sort(function(a : any, b: any){return a - b})
		for (let i in orderedKeys)
			for (let n in tempSort[orderedKeys[i]])
				output.push(tempSort[orderedKeys[i]][n])
			
		
		return output
	}
	
	//Undo what we have wrought
	fixRarityValues()
	{
		for (let i in itemdb)
		{
			if (itemdb[i]._orig.SpawnChance)
				itemdb[i]._props.SpawnChance = itemdb[i]._orig.SpawnChance
			let itemHandbook = handbook.Items.find(i => i.Id == i)
			if (itemHandbook)
				itemHandbook.Price = itemdb[i]._orig.CreditsPrice
		}
	}
	
	restorePatronSlots()
	{
		if (botTypes.test && botTypes.test.itemBackups)
			for (let itemID in botTypes.test.itemBackups)
				database.templates.items[itemID] = botTypes.test.itemBackups[itemID]
	}
	
	//\left(\left(-\frac{4}{\left(\left(45^{2}\right)\right)}\right)\cdot\left(x-\left(10\right)\right)^{2}+1\right)\cdot3.5\ \left\{50>x>7\right\}
	
	//specificBot should be the bot's name, or left undefined to go through all bots
	static curveBotWeaponWeights(specificBot)
	{
		let curves = {
			"scav": {			"a":{"heightAtRarity":3,"height":5,"width":14,"minRarity": 0,"maxRarity":7},
								"b":{"heightAtRarity":10,"height":3.5,"width":45,"minRarity": 7,"maxRarity":50}},
			"raider": {			"a":{"heightAtRarity":23,"height":3.5,"width":35,"minRarity": 0,"maxRarity":50}},	
			"pmc": {			"a":{"heightAtRarity":33,"height":3,"width":35,"minRarity": 0,"maxRarity":26},
								"b":{"heightAtRarity":23,"height":3.5,"width":32,"minRarity": 26,"maxRarity":50}}
		}
		for (let aiType in config.aiChanges.changeBots)
			for (let botName of config.aiChanges.changeBots[aiType])
			{
				let bot = botTypes[botName]
				if (specificBot && botName.toLowerCase() != specificBot.toLowerCase())
					continue
				if (aiType == "lowLevelAIs")
				{
					AITweaks.applyCurvedRarityToBotWeapons(bot, botName, curves.scav)
					//Uncomment this to manually weight the TOZ to 5
					// AITweaks.removeItemFromBotInv(bot, slot, "5a38e6bac4a2826c6e06d79b", 9999)
					// addItemToBotInv(bot, slot, "5a38e6bac4a2826c6e06d79b", 5)
				}
				else if (aiType == "midLevelAIs")
					AITweaks.applyCurvedRarityToBotWeapons(bot, botName, curves.raider)
				else if (aiType == "highLevelAIs")
					AITweaks.applyCurvedRarityToBotWeapons(bot, botName, curves.pmc)
				else
					continue
			}
			
	}
	
	static applyCurvedRarityToBotWeapons(bot, botName, curves)
	{
		let wepSlots = ["FirstPrimaryWeapon", "SecondPrimaryWeapon", "Holster"]
		for (let slot of wepSlots)
			for (let weaponId in bot?.inventory?.equipment?.[slot])
			{
				let rarity = itemdb[weaponId]?.Fin?.FinsRarityRanking
				if (!rarity)
					continue
				let weight = AITweaks.weightItemByCurvedRarity(bot, botName, rarity, curves, 1)
				AITweaks.removeItemFromBotInv(bot, slot, weaponId, 9999)
				AITweaks.addItemToBotInv(bot, slot, weaponId, weight, "equipment")
			}
	}
	
	//\left(-\left(x-\left(2\right)\right)^{2}+1\right)\cdot5
	//	(((-1 / Hstretch) * Math.pow((level - Hoffset), 2)) + Voffset) * Vstretch
	//	If starting at 0, rising to height of 5 at level 10:
	//		Height = VStretch = 5
	//		Center must be at 10, so curve must be 20 units wide
	//			=20x, so (20/2)*2 = Hstretch = 100
	//		Center must be at 10, and curve is 20 units wide, so must be offset by 10
	//			=Hoffset = 10
	
	// Curve format = {"a":{"heightAtRarity":1,"height":1,"width":1,"minRarity": 0,"maxRarity":50}}
	
	//This is super basic for now
	//This outputs a weight per-item
	static weightItemByCurvedRarity(bot, botName, rarity, curveInfo, minWeight)
	{
		//Rarity is the items rarity ranking
		let curves = []
		let max = minWeight
		for (let iterA in curveInfo)
		{
			if (rarity < curveInfo[iterA].minRarity[iterA] || rarity > curveInfo[iterA].maxRarity[iterA])
				continue
			let hStretch = 4 / Math.pow(curveInfo[iterA].width,2)
			let hOffset = curveInfo[iterA].heightAtRarity
			let vStretch = curveInfo[iterA].height
			let vOffset = 1
			curves[iterA] = AITweaks.makeCurve(hStretch, hOffset, vOffset, vStretch, rarity)
			curves[iterA] > max ? max = curves[iterA] : null
		}
		return max
	}
	
	static makeCurve(hStretch, hOffset, vOffset, vStretch, x)
	{
		//This is written the way it is to maintain zeroes even when vertically stretched
		// return (((-1 / hStretch) * Math.pow((x - hOffset), 2)) + vOffset) * vStretch
		return (((hStretch * -1) * Math.pow((x - hOffset), 2)) + vOffset) * vStretch
	}
	
	//minRarity is the inverted rarity (50 is common, 0 is rare) cap for this function. Anything below that will be treated as that. ...Does that make sense? Probably not.
	static weightWeaponsByRarity(bot, botName, minRarity)
	{
		let weaponSlots = ["FirstPrimaryWeapon", "SecondPrimaryWeapon", "Holster"]
		for (let slot in weaponSlots)
		{
			for (let weaponId in bot.inventory.equipment[weaponSlots[slot]])
			{
				bot.inventory.equipment[weaponSlots[slot]][weaponId] = 1
			}
			for (let weaponId in bot.inventory.equipment[weaponSlots[slot]])
			{
				let weapon = itemdb[weaponId]
				if (weapon.Fin && weapon.Fin.FinsRarityRanking)
				{
					let rarity = weapon.Fin.FinsRarityRanking
					//Invert
					rarity < minRarity ? rarity = minRarity : rarity = 50 - rarity
					//An item with inverted rarity of 50 would have its chance to spawn increased ~4x
					//25 would be 3
					//10 would be 2
					//etc. etc.
					AITweaks.addItemToBotInv(bot, weaponSlots[slot], weaponId, Math.round(Math.sqrt(rarity) / 2) - 1, "equipment")
				}
			}
		}
	}
	
	allBulletsTracers()
	{
		let tracerColours = ["tracerRed", "tracerGreen", "tracerYellow"]
		//for (const itemID in database.templates.items)
		for (const itemID in database.templates.items)
		{
			let item = database.templates.items[itemID];
			if (item._props.ammoType == "bullet" || item._props.ammoType == "buckshot")
			{
				item._props.Tracer = true
				item._props.TracerColor = tracerColours[RandomUtil.getInt(0, 2)]
				item._props.TracerDistance = 0
			}
		}
	}
	
	//It's literally just fireworks. I love this to death.
	grenadeTracers()
	{
		let tracerColours = ["tracerRed", "tracerGreen", "tracerYellow"]
		let list = ["5943d9c186f7745a13413ac9", "5996f6cb86f774678763a6ca", "5996f6fc86f7745e585b4de3", "5996f6d686f77467977ba6cc"]
		// for (const itemID in database.templates.items)
		// {
			// let item = database.templates.items[itemID];
			// if (item._props.ThrowType && item._props.ThrowType == "frag_grenade" || item._id == "5943d9c186f7745a13413ac9")
			// {
				// let fragItemID = item._props.FragmentType
				// let fragItem = database.templates.items[fragItemID];
				// let tracerColours = ["tracerRed", "tracerGreen", "tracerYellow"]
				// fragItem._props.Tracer = true
				// fragItem._props.TracerColor = tracerColours[RandomUtil.getInt(0, 2)]
				// fragItem._props.TracerDistance = 0
				// item._props.Tracer = true
				// item._props.TracerColor = tracerColours[RandomUtil.getInt(0, 2)]
				// item._props.TracerDistance = 0
			// }
		// }
		for (let i = 0; i < list.length; i++)
		{
			let itemID = list[i]
			let item = database.templates.items[itemID];
				item._props.Tracer = true
				item._props.TracerColor = tracerColours[RandomUtil.getInt(0, 2)]
				item._props.TracerDistance = 0
		}
	}
	
	pumpkinHead()
	{
		let bot = botTypes.sectantwarrior
		bot.inventory.equipment.Headwear = {"59ef13ca86f77445fd0e2483" : 1}
		bot.chances.equipment.Headwear = 100
		bot = botTypes.sectantpriest
		bot.inventory.equipment.Headwear = []
		bot.inventory.equipment.Headwear = {"59ef13ca86f77445fd0e2483" : 1}
		bot.chances.equipment.Headwear = 100
	}
	
	removeFireRateWeapons(bot, weaponType)
	{
		for (let id in bot.inventory.equipment.FirstPrimaryWeapon)
		{
			let weapon = database.templates.items[id]
			if (!weapon)
				continue
			if (weapon._props.BoltAction && weapon._props.BoltAction == true && weaponType == "bolt")
				delete bot.inventory.equipment.FirstPrimaryWeapon[id]
			if (weapon._props.weapFireType && weapon._props.weapFireType.includes("fullauto") && weaponType == "auto")
				delete bot.inventory.equipment.FirstPrimaryWeapon[id]
			if (weapon._props.weapFireType && !weapon._props.weapFireType.includes("fullauto") && weaponType == "semi")
				delete bot.inventory.equipment.FirstPrimaryWeapon[id]
			if (weapon._props.weapFireType && !weapon._props.weapFireType.includes("fullauto") && weaponType == "pump" && weapon._props.bFirerate <= 30)
				delete bot.inventory.equipment.FirstPrimaryWeapon[id]
		}
		for (let id in bot.inventory.equipment.SecondPrimaryWeapon)
		{
			let weapon = database.templates.items[bot.inventory.equipment.SecondPrimaryWeapon[id]]
			if (!weapon)
				continue
			if (weapon._props.BoltAction && weapon._props.BoltAction == true && weaponType == "bolt")
				delete bot.inventory.equipment.SecondPrimaryWeapon[id]
			if (weapon._props.weapFireType && weapon._props.weapFireType.includes("fullauto") && weaponType == "auto")
				delete bot.inventory.equipment.SecondPrimaryWeapon[id]
			if (weapon._props.weapFireType && !weapon._props.weapFireType.includes("fullauto") && weaponType == "semi")
				delete bot.inventory.equipment.SecondPrimaryWeapon[id]
			if (weapon._props.weapFireType && !weapon._props.weapFireType.includes("fullauto") && weaponType == "pump" && weapon._props.bFirerate <= 30)
				delete bot.inventory.equipment.SecondPrimaryWeapon[id]
		}
	}
	
	writeAIGearToFile(bot, botName)
	{
		var fs = require('fs');
		fs.writeFile(modFolder + "bot_inventories/" + botName + ".json", JSON.stringify(bot.inventory, null, 4), function (err) {
			if (err) throw err;
			//console.log(botName + " inventory saved to user/mods/Fin-AITweaks/bot_inventories/");
			//console.log(JSON.stringify(bot.inventory, null, 4))
		}); 
	}
	
	loadAIGearFromFile(bot, botName)
	{
		let filepath = `${modFolder}bot_inventories/` + botName + ".json";
		bot.inventory = JsonUtil.deserialize(VFS.readFile(filepath))
	}
	
	writeModList(modList)
	{
		var fs = require('fs');
		fs.writeFile(modFolder + "donottouch/modList.json", JSON.stringify(modList, null, 4), function (err) {
			if (err) throw err;
		});
	}
	
	getDirs(filepath)
	{
		const fs = require("fs");
		return fs.readdirSync(filepath).filter((file) =>
		{
			return fs.statSync(`${filepath}/${file}`).isDirectory();
		});
	}
	
	kikisKeys()
	{
		//This might now be unecessary.
		for(const item in database.templates.items)
		{
			if (database.templates.items[item]._parent === "5c99f98d86f7745c314214b3"|| database.templates.items[item]._parent === "5c164d2286f774194c5e69fa")
				database.templates.items[item]._props.ExaminedByDefault = false;
			else
				database.templates.items[item]._props.ExaminedByDefault = true;				 
		}
	}
	
	//This is amazingly hacky, but I'm going to use this to sift for specific mods that have known incompatibilities, and if I find those mods, run special functions to ensure they continue to work properly.
	checkForSpecificMods()
	{
		let recognizedMods = ["kiki-mysteriouskeys", "ereshkigal-advancedbotloadouts", "morevariety"]
		let output = []
		let modList = []//ModLoader.onLoad //300 FIX THIS. Or remove it.
		for (let i in modList)
		{
			let modName = i.toLowerCase()
			if (recognizedMods.includes(modName))
				output.push(modName)
		}
		return output
	}
	
	checkEFTModList()
	{
		let modList = {"modList": this.getDirs(`user/mods`)}
		let filepath = `${modFolder}donottouch/modList.json`;
		try{
			//console.log(JSON.stringify(oldList.modList)) == JSON.stringify(modList)
			let oldList = JsonUtil.deserialize(VFS.readFile(filepath))
			if (JSON.stringify(oldList.modList) == JSON.stringify(modList.modList))
			{this.writeModList(modList);return true}
		else
		{Logger.error("The mod folder has changed or loading was interrupted the last time this mod was run. Rebuilding gear lists to avoid errors.");this.writeModList(modList);return false}
		}
		catch
		{Logger.error("The mod folder has changed or loading was interrupted the last time this mod was run. Rebuilding gear lists to avoid errors.");this.writeModList(modList);return false}
	}
	
	storeConfigFile(config)
	{
		//store part of the old config so the mod can check to see if the gear section has changed, and if not, if it can just load from the file
		let filepath = `${modFolder}donottouch/backupConfig.json`;
		try{
		let oldConfig = JsonUtil.deserialize(VFS.readFile(filepath))
		//No changes to gear entries in config
		if (JSON.stringify(oldConfig.AIgearChanges) == JSON.stringify(config.AIgearChanges))
			return true
		}
		//No old config file stored
		catch
		{
			console.log("Something went wrong while trying to check for changes in the config file. Gear will now be generated from scratch for each bot, instead of loaded from a file.")
		}
		//If there are changes to the gear entries, store the new config
		fs.writeFile(modFolder + "donottouch/backupConfig.json", JSON.stringify(config, null, 4), function (err) {
			if (err) throw err;
			Logger.info("Fin's AI Tweaks: Stored config file");
		});
		return false
	}
	
	changeHealth(bot, botName, mult)
	{
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
			if (["assault", "marksman"].includes(i))
			{
				this.changeHealth(bot, i, scav)
			}
			else if ([botNameSwaps.bear, botNameSwaps.usec, AKIPMC.toLowerCase()].includes(i))
			{
				this.changeHealth(bot, i, PMC)
			}
			else if (["pmcbot","followergluharassault","followergluharsnipe","followergluharscout","followergluharsecurity","followerbully","followerkojaniy","followersanitar"].includes(i))
			{
				this.changeHealth(bot, i, raider)
			}
			else if (["sectantpriest", "sectantwarrior"].includes(i))
			{
				this.changeHealth(bot, i, cultist)
			}
			else if (["bossbully", "bossgluhar", "bosskilla", "bosskojaniy", "bosssanitar"].includes(i))
			{
				this.changeHealth(bot, i, boss)
			}
		}
	}
	
	checkForRequired()
	{
		for (let itemID in database.templates.items)
		{
			//If any item has required parts that hasn't been removed, there *probably* isn't an issue.
			let item = database.templates.items[itemID]
			if (item._props && item._props.Slots && item._props.Slots.find(i => AITweaks.checkRequired(i) == true))
				return
		}
		console.log("FIN's AI TWEAKS: You seem to have in-raid modding enabled. This can cause weapons to generate improperly if modQuality is less than 10.")
	}
	
	compareWeaponLists(bot, botName)
	{
		let inventoryCompare
		let filepath = `${modFolder}bot_inventories/` + botName + ".json";
		try{
		inventoryCompare = JsonUtil.deserialize(VFS.readFile(filepath))}
		catch{
		console.log("Inventory file damaged or missing. Rebuilding.")
		inventoryCompare = {}}
		// for (let i in inventoryCompare.equipment)
			 // inventoryCompare.equipment[i].sort()
		// for (let i in bot.inventory.equipment)
			 // bot.inventory.equipment[i].sort()
		if (JSON.stringify(bot.inventory.equipment) == JSON.stringify(inventoryCompare.equipment))
		{
			// console.log(`${botName} has the same equipment list as before`)
			return true
		}
		else
		{
// for (let i in bot?.inventory?.equipment)
				// if (JSON.stringify(bot.inventory.equipment[i]) != JSON.stringify(inventoryCompare.equipment[i]))
					// Logger.error(i)
			return false
		}
	}
	
	//Adds items that fit certain parameters to the blacklist. IE: Explosive ammo is a no-no.
	//FinAllowed is the name currently being used for items I create that I don't want bots to spawn with.
	addCategoriesToBlacklist(blacklistFile)
	{
		for (let itemID in database.templates.items)
		{
			let item = database.templates.items[itemID]
			if ((item._props.ExplosionStrength && item._props.ExplosionStrength > 0 && item._props.StackMaxSize > 1) || item._props?.FinAllowed == false || item._type == "Node" || item._props?.ammoCaliber == "Caliber26x75") //Don't filter grenade launcher grenades
			{
				blacklistFile.push(itemID)
				item._props.FinAllowed = false
			}
		}
		return blacklistFile
	}
	
	clearAllBackupItemIDs()
	{
		if (botTypes.test && botTypes.test.itemBackups)
			delete botTypes.test.itemBackups
	}
	
	backupItemID(itemID)
	{
		if (!botTypes.test)
			botTypes.test = {}
		if (!botTypes.test.itemBackups)
			botTypes.test.itemBackups = {}
		botTypes.test.itemBackups = database.templates.items[itemID]
	}
	
	adjustPatronSlots(weaponList)
	{
		for (let itemID in weaponList)
		{
			if (["5cdeb229d7f00c000e7ce174"].includes(itemID))
				continue
			//this.backupItemID(itemID)
			let chamber = undefined
			let item = database.templates.items[itemID]
			if (item?._props?.Chambers && item._props.Chambers.length > 0)
				chamber = "Chambers"
			else if (item?._props?.Cartridges && item._props.Cartridges.length > 0)
				chamber = "Cartridges"
			let caliber = item._props.ammoCaliber
			let magSlot = item._props.Slots.find (i => i._name == "mod_magazine")
			//Purge all ammo types not native to the weapon's vanilla caliber.
			for (let mag in magSlot._props.filters[0].Filter)
			{
				let magItem = magSlot._props.filters[0].Filter[mag]
				//this.backupItemID(magItem)
				magItem = database.templates.items[magItem]
				let magCalibers = []
				for (let i in magItem?._props?.Cartridges[0]?._props?.filters[0]?.Filter)
				{
					let checkRound = magItem._props.Cartridges[0]._props.filters[0].Filter[i]
					checkRound = database.templates.items[checkRound]
					if (!checkRound)
						continue
					if (!magCalibers.includes(checkRound._props.Caliber))
						magCalibers.push(checkRound._props.Caliber)
				}
				if (!magCalibers.includes(caliber))
				{
					delete magSlot._props.filters[0].Filter[mag]
				}
			}
			if (chamber)
			{
				chamber = item._props[chamber][0]
				for (let ammo in chamber._props.filters[0].Filter)
				{
					let ammoItem = chamber._props.filters[0].Filter[ammo]
					ammoItem = database.templates.items[ammoItem]
					if (!ammoItem)
						continue
					if (!caliber.includes(ammoItem._props.Caliber))
					{
						//let testItem = database.templates.items[chamber._props.filters[0].Filter[ammo]]
						//console.log(`${testItem._name} ${ammoItem._props.Caliber} ${caliber}`)
						delete chamber._props.filters[0].Filter[ammo]
					}
				}	
			}
			magSlot._props.filters[0].Filter = AITweaks.cleanArray(magSlot._props.filters[0].Filter)
			if (chamber)
				chamber._props.filters[0].Filter = AITweaks.cleanArray(chamber._props.filters[0].Filter)
			for (let i in magSlot._props.filters[0].Filter)
				null//console.log(database.templates.items[magSlot._props.filters[0].Filter[i]]._name)
		}
	}
	
	//Slot should either be something in equipment, ie "TactivalVest" or "Headwear", or "mods"
	static removeDuplicateItems(bot, slot)
	{
		if (slot != "mods")
		{
			return
		}
		else if (slot == "mods")
			for (let parentItem in bot.inventory.mods)
				for (let modCat in bot.inventory.mods[parentItem])
				{
					let temp = {}
					for (let mod in bot.inventory.mods[parentItem][modCat])
						temp[bot.inventory.mods[parentItem][modCat][mod]] = ""
					bot.inventory.mods[parentItem][modCat] = []
					for (let mod in temp)
						bot.inventory.mods[parentItem][modCat].push(mod)
				}
	}
	
	//This is for a few manual tweaks that I think improves loadout generation
	static manualModChanceIncreases(bot)
	{
		for (let parentItem in bot.inventory.mods)
			for (let modCat in bot.inventory.mods[parentItem])
			{
				//AK gas blocks
				if (modCat == "mod_gas_block" && bot.inventory.mods[parentItem][modCat].includes("5a01ad4786f77450561fda02"))
					for (let mod = 0; mod < bot.inventory.mods[parentItem][modCat].length; mod++)
						switch (bot.inventory.mods[parentItem][modCat][mod])
						{
							//Ultimak
							case "59ccfdba86f7747f2109a587":
								for (let i = 0; i < 2; i++)
								{bot.inventory.mods[parentItem][modCat].splice(mod, 0,"59ccfdba86f7747f2109a587"); mod++}
								break
							//Molot AKM type
							case "5b237e425acfc4771e1be0b6":
								for (let i = 0; i < 5; i++)
								{bot.inventory.mods[parentItem][modCat].splice(mod, 0,"5b237e425acfc4771e1be0b6"); mod++}
								break
							//Kiba Arms VDM
							case "59e649f986f77411d949b246":
								for (let i = 0; i < 5; i++)
								{bot.inventory.mods[parentItem][modCat].splice(mod, 0,"59e649f986f77411d949b246"); mod++}
								break
							//AKM tube
							case "59c6633186f7740cf0493bb9":
								for (let i = 0; i < 5; i++)
								{bot.inventory.mods[parentItem][modCat].splice(mod, 0,"59c6633186f7740cf0493bb9"); mod++}
								break
							//AK 74 tube
							case "5a01ad4786f77450561fda02":
								for (let i = 0; i < 5; i++)
								{bot.inventory.mods[parentItem][modCat].splice(mod, 0,"5a01ad4786f77450561fda02"); mod++}
								break
						}
				//buffer tubes
				if (modCat == "mod_stock" && bot.inventory.mods[parentItem][modCat].includes("5649be884bdc2d79388b4577"))
					for (let mod = 0; mod < bot.inventory.mods[parentItem][modCat].length; mod++)
						switch (bot.inventory.mods[parentItem][modCat][mod])
						{
							//Colt standard
							case "5649be884bdc2d79388b4577":
								for (let i = 0; i < 3; i++)
								{bot.inventory.mods[parentItem][modCat].splice(mod, 0,"5649be884bdc2d79388b4577"); mod++}
								break
							//Colt comm??
							case "5c0faeddd174af02a962601f":
								for (let i = 0; i < 3; i++)
								{bot.inventory.mods[parentItem][modCat].splice(mod, 0,"5c0faeddd174af02a962601f"); mod++}
								break
							//Colt A2
							case "5a33ca0fc4a282000d72292f":
								for (let i = 0; i < 2; i++)
								{bot.inventory.mods[parentItem][modCat].splice(mod, 0,"5a33ca0fc4a282000d72292f"); mod++}
								break
							//Mesa
							case "5ef1ba28c64c5d0dfc0571a5":
								for (let i = 0; i < 2; i++)
								{bot.inventory.mods[parentItem][modCat].splice(mod, 0,"5ef1ba28c64c5d0dfc0571a5"); mod++}
								break
						}
			}
	}
		
	filterBackpacks(bot, maxSize, minSize)
	{
		for (let bag in bot.inventory.equipment.Backpack)
		{
			let bagSize = 0
			let item = database.templates.items[bag]
			for (let i in item._props.Grids)
				bagSize += (item._props.Grids[i]._props.cellsH * item._props.Grids[i]._props.cellsV)
			if (bagSize > maxSize || bagSize < minSize)
				delete bot.inventory.equipment.Backpack[bag]
		}
	}
		
	//Apparently bots can have problems if they're overweight. This should help with that.
	addZeroGWidget()
	{
		let zeroG = AITweaks.clone(itemdb["5733279d245977289b77ec24"]) //car battery
		zeroG._id = "FinsZeroGThingy"
		zeroG._name = "Agrav"
		zeroG._props.Name = "Agrav"
		zeroG._props.Name = "ShortName"
		zeroG._props.Description = "For compensating out bot SC weight"
		zeroG._props.Weight = -1
		zeroG._props.StackMaxSize = 1000
		database.templates.items["FinsZeroGThingy"] = zeroG
		
	}
	
	startGearchanging()
	{
		let botList = []
		for (let i in botTypes)
		{
			this.setChanceValues(botTypes[i], i)
			botList.push(i)
		}
		//Check all bot names in the config gear section, and notify the player if there are any invalid names
		let checkNames = {
			"scavBots": config.AIgearChanges.scavBots,
			"raiderBots": config.AIgearChanges.raiderBots,
			"pmcBots": config.AIgearChanges.pmcBots,
		}
		for (let configBotCat in checkNames)
			for (let configBot in checkNames[configBotCat])
				for (let i in botList) //Match bot names in the config to actual names, regardless of capitalization
				{
					if (botList[i].toLowerCase() == checkNames[configBotCat][configBot].toLowerCase())
					{
						config.AIgearChanges[configBotCat][configBot] = botList[i]
						break
					}
				}
		for (let configBotCat in checkNames)
			for (let configBot in checkNames[configBotCat])
				if (!botList.includes(checkNames[configBotCat][configBot]))
					Logger.error(`"${checkNames[configBotCat][configBot]}" is not a valid bot name. If this bot was added by a mod, this error may be occurring because of loading order. No gear changes will be made to this bot.`)
		
		this.cleanseFoulMods() //I wish I'd thought of this *before* I put in a whole bunch of tiny fixes in almost every function. BUT WE'RE HERE NOW, AREN'T WE? ..This should make other people's weapon mods less incompatible.
		let sameGearConfig
		if (config.AIgearChanges.CheckREADMEforInfo.optimizedLoading && this.checkEFTModList())
			sameGearConfig = this.storeConfigFile(config)
		else
			sameGearConfig = false
		
		this.checkForRequired()
		
		this.expandBotSCSizes()//Give everyone a bigger SC
		
		this.adjustHealthValues(config.overallDifficultyMultipliers.PMCHealthMult, config.overallDifficultyMultipliers.scavHealthMult, config.overallDifficultyMultipliers.raiderHealthMult, config.overallDifficultyMultipliers.bossHealthMult, config.overallDifficultyMultipliers.cultistHealthMult)		
		//Just go with it.
		
		this.tempAdjustRarityValues()
		
		AITweaks.addCaliberInfoToMagazines()
		
		if (config.AIgearChanges.allAI.botsWillNotSpawnWithTheseThings.length != 0)
			for (let i in config.AIgearChanges.allAI.botsWillNotSpawnWithTheseThings)
				blacklistFile.push(config.AIgearChanges.allAI.botsWillNotSpawnWithTheseThings[i])
		
		//300 FIX THIS LATER
		// delete database.globals.ItemPresets["5a8ae36686f774377d6ce226"]
		//database.globals.ItemPresets = AITweaks.cleanArray(database.globals.ItemPresets)
		
		if (config.AIgearChanges.allAI.removeAIVogGrenades == true)
		{
			blacklistFile.push("5e32f56fcb6d5863cc5e5ee4")
			blacklistFile.push("5e340dcdcb6d5863cc5e5efb")
		}
		blacklistFile.push("5422acb9af1c889c16000029") //Weapon proto
		blacklistFile.push("5cdeb229d7f00c000e7ce174") //NSV
		blacklistFile.push("5d52cc5ba4b9367408500062") //AGS
		blacklistFile.push("5e81ebcd8e146c7080625e15") //GL-40. Can't be reloaded by bots, so it's broken ATM
		blacklistFile.push("5f647fd3f6e4ab66c82faed6") //KS23 ammo
		blacklistFile.push("5e85aac65505fa48730d8af2") //KS23 ammo
		blacklistFile.push("5996f6cb86f774678763a6ca") //KS23 ammo
		blacklistFile.push("624c0570c9b794431568f5d5") //Handheld flare
		blacklistFile.push("5ae083b25acfc4001a5fc702") //Dev item?
		blacklistFile.push("5996f6d686f77467977ba6cc") //Shrapnel
		blacklistFile.push("kiwwaMask")
		blacklistFile.push("kiwwaHelm")
		blacklistFile = this.addCategoriesToBlacklist(blacklistFile)
		
		if (config.sillyChanges.pumpkinCultists == true)
			this.pumpkinHead()
		
		//Remove all hats, if the option is set
		if (config.AIgearChanges.allAI.noHatsOnlyHelmets == true)
			for (let bot in botList)
				this.noSillyHats(botTypes[botList[bot]], 100)
			
		if (config.AIgearChanges.allAI.factionIdentifiers == true)
				AITweaks.addFactionIdentifiers()
		
		let changeGear
		let primaryPriceMin
		let primaryPriceMax
		let holsterPriceMin
		let holsterPriceMax
		let armorClass
		let armorClassMin
		let helmetClass
		let helmetClassMin
		let armorPriceMin
		let armorPriceMax
		let armorWeights
		let armorRigChance
		let armorVestChance
		let ammoMax
		let ammoMin
		let penStyle
		let saveToFile = config.AIgearChanges.CheckREADMEforInfo.saveGearToFile
		let	loadFromFile = config.AIgearChanges.CheckREADMEforInfo.loadGearFromFile
		let	optimizedLoading = config.AIgearChanges.CheckREADMEforInfo.optimizedLoading
		let specificWeapons
		let healingItemsMin
		let healingItemsMax
		let modRarity
		let modFrequency
		let magRarity
		let removeWeaponTypes
		let externalWeapons
		let externalGear
		let addMods
		let magsMinMax
		let hatHelmRatio
		let minPackSize
		let maxPackSize
		let holdVanWepsFP
		let holdVanWepsSP
		let holdVanWepsH
		
		//Generate the conflict list early.
		let conflictList : Record<any, any>
		conflictList = AITweaks.createConflictList()
		let weaponList = conflictList.weaponList

		conflictList = conflictList.conflictingModList
		
		this.adjustPatronSlots(weaponList)
		
		let scavBots = config.AIgearChanges.scavBots
		let pmcBots = config.AIgearChanges.pmcBots
		let raiderBots = config.AIgearChanges.raiderBots
		
		for (let i in botList)
		{
			let botName = ""
			let bot = botTypes[botList[i]]
			//Which bots go where is determined by the config now. Could put bosses in one of those lists, if you wanted, or whatever else.
			if (scavBots.includes(botList[i]))
				botName = "scavs"
			else if (pmcBots.includes(botList[i]))
				botName = "PMCs"
			else if (raiderBots.includes(botList[i]))
				botName = "raiders"
			else
				continue;
			changeGear = config.AIgearChanges[botName].changeGear
			primaryPriceMin = config.AIgearChanges[botName].primaryWeaponRarityMinMax0_50[0]
			primaryPriceMax = config.AIgearChanges[botName].primaryWeaponRarityMinMax0_50[1]
			holsterPriceMin = config.AIgearChanges[botName].sidearmRarityMinMax0_50[0]
			holsterPriceMax = config.AIgearChanges[botName].sidearmRarityMinMax0_50[1]
			armorClass = config.AIgearChanges[botName].armorLevelMin_Max[1]
			armorClassMin = config.AIgearChanges[botName].armorLevelMin_Max[0]
			helmetClass = config.AIgearChanges[botName].helmetLevelMin_Max[1]
			helmetClassMin = config.AIgearChanges[botName].helmetLevelMin_Max[0]
			armorPriceMin = 0//config.AIgearChanges[botName].armorRarityMinMax0_50[0]
			armorPriceMax = 50//config.AIgearChanges[botName].armorRarityMinMax0_50[1]
			armorWeights = config.AIgearChanges[botName].armorLevelWeights1_6
			armorRigChance = 100 - config.AIgearChanges[botName].armoredRigChance0_100
			armorVestChance = config.AIgearChanges[botName].armoredVestChance0_100
			ammoMax = config.AIgearChanges[botName].ammoRemovePCTGood_Bad[0] / 100
			ammoMin = config.AIgearChanges[botName].ammoRemovePCTGood_Bad[1] / 100
			penStyle = config.AIgearChanges[botName].penStyle
			specificWeapons = config.AIgearChanges[botName].specificWeapons
			healingItemsMin = config.AIgearChanges[botName].healingItemsMin_Max[0]
			healingItemsMax = config.AIgearChanges[botName].healingItemsMin_Max[1]
			//Higher is better in the config. Lower is better here.
			modRarity = ((config.AIgearChanges[botName].modQuality0_10 - 10) * - 1) * 5
			modFrequency = (config.AIgearChanges[botName].modFrequency0_2)
			magRarity = (config.AIgearChanges[botName].magQuality0_10)
			removeWeaponTypes = (config.AIgearChanges[botName].removeWeaponTypesSemiAutoPumpBolt)
			externalWeapons = config.AIgearChanges[botName].useWeaponsFromOtherMods
			externalGear = config.AIgearChanges[botName].useGearFromOtherMods
			addMods = config.AIgearChanges[botName].moreModVariety
			magsMinMax = config.AIgearChanges[botName].magazinesInVestMin_Max
			hatHelmRatio = 100 - config.AIgearChanges[botName].chance_for_headwear_to_be_armored
			minPackSize = config.AIgearChanges[botName].backpackSizeMin_Max[0]
			maxPackSize = config.AIgearChanges[botName].backpackSizeMin_Max[1]
			
			// console.log(botList[i])
			if (changeGear == true)
			{
				this.adjustChanceValues(bot, botList[i], modFrequency)
				AITweaks.removeAllEquipmentWeighting(bot)
				this.setChanceValues(bot, botList[i]) //Run this *AFTER* adjustChanceValues, to let the advanced config override the chance values (If enabled)
				if (loadFromFile)// && !sameGearConfig) //Let loadFromFile override everything else. If someone turns it on, they probably have some idea what they're doing.
				{
					this.loadAIGearFromFile(bot, botList[i])
					// Logger.info("Fin's AI Tweaks: Loaded " + botName + " bot '" + botList[i] + "' inventory from file.")
				}
				else
				{
				if (config.AIgearChanges.allAI.removeVanillaBotArmor)
					this.removeArmor(bot, 0, 0, 0, 0)
				if (config.AIgearChanges.allAI.removeVanillaBotWeapons)
					{this.clearEquipmentSlot(bot, "FirstPrimaryWeapon"); this.clearEquipmentSlot(bot, "SecondPrimaryWeapon"); this.clearEquipmentSlot(bot, "Holster");}
				else {holdVanWepsFP = AITweaks.clone(bot.inventory.equipment.FirstPrimaryWeapon);
				holdVanWepsSP = AITweaks.clone(bot.inventory.equipment.SecondPrimaryWeapon);
				holdVanWepsH = AITweaks.clone(bot.inventory.equipment.Holster);}
				if (addMods){
				this.addPrimaryWeapons(bot, 1000, 0, modRarity, conflictList)
				this.addHolsterWeapons(bot, 1000, 0, modRarity, conflictList)
				bot.inventory.mods = {};AITweaks.addAllMods(bot)
				}
				this.addArmor(bot, armorClass, armorClassMin, 0, 50, modRarity, ["ArmorVest", "TacticalVest"])
				this.addArmor(bot, helmetClass, helmetClassMin, 0, 50, modRarity, ["Headwear"])
				this.removeArmor(bot, armorClassMin, armorClass, helmetClassMin, helmetClass)
				this.addBackpacks(bot, minPackSize)
				if (advIConfig.enabled && advIConfig.medical_inventory_changes_enabled)
				{healingItemsMin = 0; healingItemsMax = 0}
				this.addMiscItems(bot, healingItemsMin, healingItemsMax, magsMinMax)
				this.addEarpieces(bot)
				if (!config.AIgearChanges.allAI.removeVanillaBotWeapons)
				{bot.inventory.equipment.FirstPrimaryWeapon = AITweaks.clone(holdVanWepsFP);
				bot.inventory.equipment.SecondPrimaryWeapon = AITweaks.clone(holdVanWepsSP);
				bot.inventory.equipment.Holster = AITweaks.clone(holdVanWepsH);}
				else{bot.inventory.equipment.FirstPrimaryWeapon = {};
				bot.inventory.equipment.SecondPrimaryWeapon = {};
				bot.inventory.equipment.Holster = {};}
				this.addPrimaryWeapons(bot, primaryPriceMin, primaryPriceMax, modRarity, conflictList)
				this.addHolsterWeapons(bot, holsterPriceMin, holsterPriceMax, modRarity, conflictList)
				this.filterBackpacks(bot, maxPackSize, minPackSize)
				AITweaks.removeBlacklistItems(bot, externalWeapons, externalGear)
				for (let i in removeWeaponTypes)
					this.removeFireRateWeapons(bot, removeWeaponTypes[i])
				//Add specific weapons **AFTER** weapons get removed. Derp.
				if (specificWeapons.length != undefined && specificWeapons.length > 0)
					this.addSpecificWeapons(bot, specificWeapons, botName, modRarity, conflictList)
				//After basic gear has been added, compare to old gear list to see if it's safe to load from file
				if (sameGearConfig && this.compareWeaponLists(bot, botList[i]))
				{
					this.loadAIGearFromFile(bot, botList[i])
					Logger.info("Fin's AI Tweaks: Loaded " + botName + " bot '" + botList[i] + "' inventory from file.")
				}
				else
				{
					saveToFile = true
					AITweaks.curateCalibers(bot, botList[i], ammoMin, ammoMax, penStyle)
					if (addMods){
					bot.inventory.mods = {}
					this.addModVariety(bot, modRarity, conflictList)
					this.addArmorAttachments(bot, modRarity)
					this.findConflictingMods(bot)
					}
					AITweaks.addAmmo(bot, botList[i])
					this.sortMagazines(bot, magRarity, conflictList)
					// AITweaks.curateAmmo(bot, ammoMin, ammoMax, penStyle) //Should be unecessary now. Delete later.
					AITweaks.manualModChanceIncreases(bot)
					//Tidy things up a bit. Fewer errors is a good thing!
					this.cleanUpMods(botList)
					
					Logger.info("Fin's AI Tweaks: Created " + botName + " bot '" + botList[i] + "' inventory.")
				}//Interferes with optimized loading it these happen earlier
					AITweaks.removeBlacklistItems(bot, externalWeapons, externalGear)
					if (saveToFile || optimizedLoading)
						this.writeAIGearToFile(bot, botList[i])
					AITweaks.curateCalibers(bot, botList[i], ammoMin, ammoMax, penStyle)
					bot.chances.equipment.ArmorVest = armorVestChance
					AITweaks.weightBotArmor(bot, botList[i], armorWeights, false)
					AITweaks.weightBotNonArmor(bot, "Headwear", hatHelmRatio / (100-hatHelmRatio), externalGear)
					AITweaks.weightBotNonArmor(bot, "TacticalVest", armorRigChance / (100-armorRigChance), externalGear)
					// AITweaks.weightWeaponsByRarity(bot, botList[i], 30)
					AITweaks.curveBotWeaponWeights(botList[i])
					// this.removeArmor(bot, armorClassMin, armorClass, helmetClassMin, helmetClass)
				}
			}
			// AITweaks.removeDuplicateItems(bot, "mods") //Unecessary at the moment
			if (!config.debug.saveDebugFiles) //If set to save to a file, don't print to the console
				this.botDebugCheck(bot, botList[i])
		}
		AITweaks.addMiscItemsFromAdvIConfig()
		AITweaks.cleanAllBotInventories(true, true) //This is redundant and should be condensed into one solution, but.. Scattershotting this for now, to make sure I get every instance of this problem.
		//Zero out weight values of unused armor classes. This is for the benefit of the rig-swapping function in bot generation
		for (let botClass in config.AIgearChanges)
		if (config.AIgearChanges[botClass].changeGear)
		{
			let bot = botTypes[config.AIgearChanges[botClass.slice(0,-1).toLowerCase() + "Bots"][0]]
			let armorLevels = AITweaks.checkBotArmorLevels(bot, ["ArmorVest", "TacticalVest"])
			for (let aClass in config.AIgearChanges[botClass].armorLevelWeights1_6)
			if (!armorLevels["ArmorVest"].classes[(+aClass * 1) + 1] && !armorLevels["TacticalVest"].classes[(+aClass * 1) + 1])
				config.AIgearChanges[botClass].armorLevelWeights1_6[aClass] = 0
		}
		//Store bot loadouts, so they can be re-applied on game start. Then delete the storage value.
		config.storage = {}
		for (let bot in botTypes)
			if (bot != "storage")
				config.storage[bot] = AITweaks.clone(botTypes[bot].inventory)
		
		this.fixRarityValues()
		//These last two may no longer be necessary. Temporarily disabled to test that. Consider deletion.
		// this.restorePatronSlots()
		// this.clearAllBackupItemIDs()
	}
	
	static destroy(obj)
	{
		for(var prop in obj){
			var property = obj[prop];
			if(property != null && typeof(property) == 'object')
			{
				AITweaks.destroy(property);
			}
			else
			{
				obj[prop] = null;
			}
		}
	}
	
	//Recursively search for a single item. Returns true if found.
	static checkBotModsForItem(bot, inventory, target)
	{
		for (let check in inventory)
		{
			if ([typeof 1, typeof "1"].includes(typeof inventory[check]))//Check to see if it's not an array or object
				if (inventory[check] == target)
					return true
				else
					null
			else
			{
				if (AITweaks.checkBotModsForItem(bot, inventory[check], target))
					return true
			}
		}
	}
	
	botDebugCheck(bot, botName)
	{
		let showGuns = config.debug.showGuns
		if (showGuns)
			showGuns = showGuns.toLowerCase()
		let showArmor = config.debug.showArmor
		if (showArmor)
		showArmor = showArmor.toLowerCase()
		let showAmmo = config.debug.showAmmo
		if (showAmmo)
		showAmmo = showAmmo.toLowerCase()
		if (showGuns == botName.toLowerCase())
			{
				console.log(`BOT: ${botName}`);console.log("FIRST MAIN:")
				for (let id in bot.inventory.equipment.FirstPrimaryWeapon)
					console.log(`ID: ${id} Name: ${database.templates.items[id]._name}`)
				console.log("SECOND MAIN:")
				for (let id in bot.inventory.equipment.SecondPrimaryWeapon)
					console.log(`ID: ${id} Name: ${database.templates.items[id]._name}`)
				console.log("HOLSTER:")
				for (let id in bot.inventory.equipment.Holster)
					console.log(`ID: ${id} Name: ${database.templates.items[id]._name}`)
			}
		if (showArmor == botName.toLowerCase())
			{
				console.log(`BOT: ${botName}`)
				console.log("ARMOR VESTS:")
				for (let id in bot.inventory.equipment.ArmorVest)
					console.log(`ID: ${id} Name: ${database.templates.items[id]._name}`)
				console.log("RIGS:")
				for (let id in bot.inventory.equipment.TacticalVest)
					console.log(`ID: ${id} Name: ${database.templates.items[id]._name}`)
				console.log("HEADWEAR:")
				for (let id in bot.inventory.equipment.Headwear)
					console.log(`ID: ${id} Name: ${database.templates.items[id]._name}`)
			}
		if (showAmmo == botName.toLowerCase())
			{console.log(`BOT: ${botName}`);AITweaks.reportAmmo(bot, botName)}
	}
	
	testFuncPleaseIgnore()
	{
		for (let i in database.locales.global)
		{
			database.locales.global[i]["interface"]["ScavRole/PmcBot"] = "Scav"
			database.locales.global[i]["interface"]["ScavRole/Boss"] = "Boss"
			database.locales.global[i]["interface"]["ScavRole/ExUsec"] = "Rogue"
			database.locales.global[i]["interface"]["ScavRole/Marksman"] = "Sniper"
			database.locales.global[i]["interface"]["ScavRole/Follower"] = "Scav"
			database.locales.global[i]["interface"]["ScavRole/Sectant"] = "???"
		}
		botTypes.exusec.firstName.push(...botTypes.exusec.firstName) //2
		// botTypes.exusec.firstName.push(...botTypes.exusec.firstName) //4
		botTypes.exusec.firstName = botTypes.exusec.firstName.concat(["Albatross","Prince Albert in a Can","Alphabet","Angy","Arctic","Badger","Balls","Bambi","Barbie","Beltfed","Barracuda","BDU","Batman","Beaker","Biscuit","Red","Booger","Bunny","Caboose","Fisheye","Candle","Casper","Caterpillar","Chappie","Chimbo","Coma","Cilla","Corny","Cupcake","Cooties","Crab","Curly","Chaos","Digger","Emu","Elvis","Bob","Quaker","Guy","Furball","Flash","Foggy","Giggles","Ghost","Gramps","Harry","Senko","Ereshkigal","JustNU","Kiki","Sarix","Chomp","Crow","SamSWAT","Katto","CWX","Lua","Terkoiz","WillDaPope","Hefty","Hurricane","Hyde","IRIS","Keebler","Kwazi","Ligma","Leaky","Leatherman","LOTR","Liza","Lunchbox","Muffin","Muffintop","Karen","Marshmallow","Marx","Mini","Monk","Mogul","Mumbles","NAG","Nag","Nitro","So?","Nugget","Paco","Pagan","Pathfinder","Pid","Smith","Snake","Snowden","Cadet","Sweeney","Teflon","Thrombo","Tiny","Tubby","Walter","X"])
	}
	
	//"Fixer". Hah.
	sendMissingModsToFixer(bot, a, b, c)
	{
		//console.log(b)
		let potentialConflicts = []
		for (let i in c)
			potentialConflicts.push(c[i]._tpl)
		this.fixConflictingMod(bot, a, b, potentialConflicts)
	}
	
	static clearString(s)
	{
		return s.replace(/[\b]/g, "")
			.replace(/[\f]/g, "")
			.replace(/[\n]/g, "")
			.replace(/[\r]/g, "")
			.replace(/[\t]/g, "")
			.replace(/[\\]/g, "");
	}

	static getBody(data, err = 0, errmsg = null)
	{
		return AITweaks.clearString(AITweaks.getUnclearedBody(data, err, errmsg));
	}

	static nullResponse()
	{
		return AITweaks.getBody(null);
	}
	
	static getUnclearedBody(data, err = 0, errmsg = null)
	{
		return AITweaks.serialize({
			"err": err,
			"errmsg": errmsg,
			"data": data
		});
	}
	
	static serialize(data, prettify = false)
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

}

class ExhaustableArray
{
	public pool: any;

	constructor(itemPool)
	{
		this.pool = AITweaks.clone(itemPool);
	}

	getRandomValue()
	{
		if (!this.pool || !this.pool.length)
		{
			return null;
		}

		const index = RandomUtil.getInt(0, this.pool.length - 1);
		const toReturn = AITweaks.clone(this.pool[index]);
		this.pool.splice(index, 1);
		return toReturn;
	}
	
	getFirstValue()
	{
		if (!this.pool || !this.pool.length)
		{
			return null;
		}

		const index = 0;
		const toReturn = AITweaks.clone(this.pool[index]);
		this.pool.splice(index, 1);
		return toReturn;
	}

	hasValues()
	{
		if (this.pool && this.pool.length)
		{
			return true;
		}

		return false;
	}

}


module.exports = { mod: new AITweaks() }