import { IBotBase } from "@spt-aki/models/eft/common/tables/IBotBase";
import { globalValues } from "./POOP";
import { PoopDifficulty } from "./PoopDifficulty";
import { HashUtil } from "@spt-aki/utils/HashUtil";
import { config } from "process";

export class LegendaryPlayer {

	public static assaultTypes: string[] = ["assaulteasy", "assaultnormal", "assaulthard", "cursedassaulteasy",
		"cursedassaultnormal", "cursedassaulthard"];

	public static pmcTypes: string[] = ["sptbeareasy", "sptbearnormal", "sptbearhard", "sptuseceasy",
		"sptusecnormal", "sptusechard"];

	static getBot(key: string): IBotBase {
		globalValues.Logger.warning(`requested bot type ${key} from cache`);
		if (globalValues.botGenerationCacheService.storedBots.has(key)) {
			const cachedOfType = globalValues.botGenerationCacheService.storedBots.get(key);

			if (cachedOfType.length > 0) {
				//this logic is fcuked up.   assault is included in cursedassault and assaultGroup?
				if (LegendaryPlayer.assaultTypes.includes(key.toLowerCase())) {
					let chance = globalValues.botGenerator.randomUtil.getChance100(globalValues.config.aiChanges.chanceChangeScavToWild);

					if (chance) {
						let newrole: string = globalValues.botGenerator.randomUtil.getArrayValue(globalValues.config.aiChanges.scavAltRolesPickList);
						newrole = globalValues.roleCase[newrole];
						cachedOfType[cachedOfType.length - 1].Info.Settings.Role = newrole;
						cachedOfType[cachedOfType.length - 1].Info.Side = "Savage";
						
						
						globalValues.Logger.info(`POOP: Substituting ${key} with ${newrole}!`);
						return cachedOfType.pop();
					}
					globalValues.Logger.info(`POOP: Not Substituting ${key}!`);
				}

				return cachedOfType.pop();
			}

			globalValues.Logger.error(globalValues.botGenerationCacheService.localisationService.getText("bot-cache_has_zero_bots_of_requested_type", key));
		}

		globalValues.Logger.error(globalValues.botGenerationCacheService.localisationService.getText("bot-no_bot_type_in_cache", key));

		return undefined;
	}
	
	static legendaryPlayerCheck(sessionID: string) {
		if (globalValues.progressRecord[sessionID]) {

			if (globalValues.profileHelper.getPmcProfile(sessionID)) {

				let setLegendary: boolean;
				//Logger.info(`in legendaryPlayerCheck function`)

				let therecord = globalValues.progressRecord[sessionID];

				//Logger.info(`therecord: ${globalValues.serialize(therecord)}`)
				

				if (therecord.deathStreak > 0) {
					setLegendary = false;
					globalValues.Logger.info(`Last Winstreak: ${this.serialize(therecord.winStreak)}`)
					this.createLegendPlayer(sessionID, setLegendary);
					return;
				}
				if (therecord.winStreak >= 10) //change this later back to 10
				{
					setLegendary = true;
					globalValues.Logger.info(`Current Winstreak: ${this.serialize(therecord.winStreak)}`)
					this.createLegendPlayer(sessionID, setLegendary);
					return;
				}
			}
		}

	}

	static createLegendPlayer(sessionID: string, setLegendary: boolean): void {
		if (setLegendary) {
			//do stuff here, add check to see if entry already exists
			//check if existing array of playerprofiles

			let playerprofile = this.clone(globalValues.profileHelper.getPmcProfile(sessionID));

			if (playerprofile) {

				for(let item in playerprofile.Inventory.items)
				{
					playerprofile.Inventory.items[item]._id = globalValues.hashUtil.generate();
				}

				let newActIDBot = globalValues.hashUtil.generate();
				globalValues.Logger.info(`newActIDBot: ${newActIDBot}`);
				if (globalValues.legendaryFile[sessionID]) {
					globalValues.Logger.info(`POOP: Legendary Player Exists, Overwriting`)
					//Logger.info(`playerprofile stringified: ${JSON.stringify(playerprofile)}`)
					globalValues.legendaryFile[sessionID] = playerprofile;
					globalValues.legendaryFile[sessionID].aid = newActIDBot;
					globalValues.legendaryFile[sessionID]._id = "pmc"+newActIDBot;
					globalValues.legendaryFile[sessionID].Info.Settings.Role;
					globalValues.legendaryFile[sessionID].Info.Settings.BotDifficulty = "hard";
					this.saveToFile(globalValues.legendaryFile, "donottouch/legendary.json");
				}
				else {
					globalValues.Logger.info(`POOP: Legendary Player Does not exist, adding`)
					//Logger.info(`playerprofile stringified: ${JSON.stringify(playerprofile)}`)
					globalValues.legendaryFile[sessionID] = playerprofile;
					globalValues.legendaryFile[sessionID].aid = newActIDBot;
					globalValues.legendaryFile[sessionID]._id = "pmc"+newActIDBot;
					globalValues.legendaryFile[sessionID].Info.Settings.Role;
					globalValues.legendaryFile[sessionID].Info.Settings.BotDifficulty = "hard";
					this.saveToFile(globalValues.legendaryFile, "donottouch/legendary.json");
				}
				//Logger.info('Saved Legendary Player');
				//revert profile back in case it changed.
			}
		}
		else {
			//should i clear legendary profile?
			globalValues.Logger.info('POOP: setLegendary was false. Do not save Legendary Player')

		}
	}

	static refreshLegendPlayerIds(playerprofile: IBotBase, sessionID: string): void {
		
		for(let item in playerprofile.Inventory.items)
		{
			playerprofile.Inventory.items[item]._id = globalValues.hashUtil.generate();
		}

		let newActIDBot = globalValues.hashUtil.generate();
		globalValues.Logger.info(`newActIDBot: ${newActIDBot}`);
		if (globalValues.legendaryFile[sessionID]) {
			globalValues.legendaryFile[sessionID] = playerprofile;
			globalValues.legendaryFile[sessionID].aid = newActIDBot;
			globalValues.legendaryFile[sessionID]._id = "pmc"+newActIDBot;
			globalValues.legendaryFile[sessionID].Info.Settings.Role;
			globalValues.legendaryFile[sessionID].Info.Settings.BotDifficulty = "hard";
			globalValues.Logger.info(`POOP: Refreshing Item Ids for Legendary Player`);
			//Logger.info(`playerprofile stringified: ${JSON.stringify(playerprofile)}`)
		}
	}
	

	static storeLegendinCache(bot: IBotBase, sessionID: string): void {

		globalValues.Logger.info(`in storeLegendinCache function`)
		//determine if chance
		let chance = globalValues.botGenerator.randomUtil.getChance100(globalValues.config.aiChanges.chanceLegendReplacesPMC);
		globalValues.Logger.info(`chance: ${chance}`);
		if (chance) 
		{
			
			//determine original side to store as sptBearnormal or sptUsecnormal
			let newRole: string;
			let cacheKey: string; 

			if(bot.Info.Side.toLowerCase() == "usec"){
				newRole = "sptUsec";
			}
			else{
				newRole = "sptBear";
			}

			//fill in other ai settings.
			globalValues.botGenerator.generateDogtag(bot);
			bot.Info.Side = "Savage"
			bot.Info.Settings.Role = newRole;

			let botarray: IBotBase[] = [];

			//Gen difficulties and then push
			
			bot.Info.Settings.BotDifficulty = `easy`;
			this.refreshLegendPlayerIds(bot, sessionID);
			botarray.push(bot);
			cacheKey = `${bot.Info.Settings.Role}${bot.Info.Settings.BotDifficulty}`;
			globalValues.Logger.info(`POOP cacheKey: ${cacheKey}`)
			//globalValues.Logger.info(`POOP botarray: ${JSON.stringify(botarray, null, '\t')}`)	
			globalValues.botGenerationCacheService.storeBots(cacheKey, botarray);
			botarray = [];

			bot.Info.Settings.BotDifficulty = `normal`;
			this.refreshLegendPlayerIds(bot, sessionID);
			botarray.push(bot);
			cacheKey = `${bot.Info.Settings.Role}${bot.Info.Settings.BotDifficulty}`;
			globalValues.Logger.info(`POOP cacheKey: ${cacheKey}`)
			//globalValues.Logger.info(`POOP botarray: ${JSON.stringify(botarray, null, '\t')}`)	
			globalValues.botGenerationCacheService.storeBots(cacheKey, botarray);
			botarray = [];

			bot.Info.Settings.BotDifficulty = `hard`;
			this.refreshLegendPlayerIds(bot, sessionID);
			botarray.push(bot);
			cacheKey = `${bot.Info.Settings.Role}${bot.Info.Settings.BotDifficulty}`;
			globalValues.Logger.info(`POOP cacheKey: ${cacheKey}`)
			//globalValues.Logger.info(`POOP botarray: ${JSON.stringify(botarray, null, '\t')}`)	
			globalValues.botGenerationCacheService.storeBots(cacheKey, botarray);
			botarray = [];

			globalValues.Logger.info(`POOP: Throwing legendary PMC into cachedbots (not guaranteed)`)
		}
	}

	static saveToFile(data, filePath) {
		var fs = require('fs');
		fs.writeFile(globalValues.modFolder + filePath, JSON.stringify(data, null, 4), function (err) {
			if (err) throw err;
		});
	}

	//does it know if it should be a death or survival?
	static progDifficultygenerated(survivalcount: number, threshold: number, step: number): number {
		let change = Math.round(Math.pow(step, survivalcount) * 100) / 100
		change -= 1;

		if (change > threshold) {
			return threshold
		} else {
			let output = change.toFixed(2)
			return parseFloat(output);
		}
	}


	static recordWinLoss(url, info, sessionId): void {

		let threshold = 8;
		let step = 1.05;
		if (globalValues.config.enableAutomaticDifficulty) {
			
			if (info.exit == "survived")//If they survived
			{
				globalValues.progressRecord[sessionId].winStreak += 1
				globalValues.progressRecord[sessionId].deathStreak = 0
				let diffAdjustment = this.progDifficultygenerated(globalValues.progressRecord[sessionId].winStreak, threshold, step)
				globalValues.progressRecord[sessionId].diffMod += diffAdjustment;
				globalValues.Logger.info(`POOP: Added ${diffAdjustment} ... New Difficulty =  ${globalValues.progressRecord[sessionId].diffMod}`)
			}
			else if (info.exit == "killed")//If they perished
			{
				globalValues.progressRecord[sessionId].winStreak = 0
				globalValues.progressRecord[sessionId].deathStreak += 1
				let diffAdjustment = this.progDifficultygenerated(globalValues.progressRecord[sessionId].deathStreak, threshold, step)
				globalValues.progressRecord[sessionId].diffMod -= diffAdjustment;
				globalValues.Logger.info(`POOP: Subtracted ${diffAdjustment} ... New Difficulty =  ${globalValues.progressRecord[sessionId].diffMod}`)
			}

			PoopDifficulty.adjustDifficulty(url, info, sessionId)
		}

		this.saveToFile(globalValues.progressRecord, "donottouch/progress.json");

		//return globalValues.nullResponse()
		return;
	}

	static serialize(data: { err: number; errmsg: any; data: any; }, prettify = false) {
		if (prettify) {
			return JSON.stringify(data, null, "\t");
		}
		else {
			return JSON.stringify(data);
		}
	}

	static clone(data: any) {
		return JSON.parse(JSON.stringify(data));
	}

}