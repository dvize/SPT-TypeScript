import { IBotBase } from "@spt-aki/models/eft/common/tables/IBotBase";
import { BotGenerationCacheService } from "@spt-aki/services/BotGenerationCacheService";
import { globalValues} from "./mod";
import { PoopDifficulty } from "./PoopDifficulty";


export class LegendaryPlayer
{
    static getBot(role: string): IBotBase {
		//need to also modify botcacheservice so when retrieving if no cached value then default to 

		if (["assault", "cursedassault"].includes(role.toLowerCase())) {
			// if the role is assault or cursedassault, change to newrole and return bot based on chance.

			if (globalValues.botGenerationCacheService.storedBots.has(role)) {
				let cachedOfType = globalValues.botGenerationCacheService.storedBots.get(role); //still an array of maps of that type

				if (cachedOfType.length > 0) {
					let chance = globalValues.botGenerator.randomUtil.getChance100(globalValues.config.aiChanges.chanceChangeScavToWild);
					//let mymodified = JSON.stringify(cachedOfType[0], null, "\t")
					//Logger.info(`mymodified = ${mymodified}`)

					if (chance) {
						//let tempside = botGenerator.getRandomisedPmcSide().toLowerCase();
						//let newrole = botGenerator.getPmcRoleByDescription(tempside); //will use built-in function
						let newrole: string = globalValues.botGenerator.randomUtil.getArrayValue(globalValues.scavAltRolesPickList);
						newrole = globalValues.roleCase[newrole];
						cachedOfType[cachedOfType.length - 1].Info.Settings.Role = newrole;
						cachedOfType[cachedOfType.length - 1].Info.Side = "Savage";
						globalValues.botGenerationCacheService.logger.info(`AITweaks: Substituting ${role} with ${newrole}!`);
						return cachedOfType.pop();

						//when bot dies return its role type to normal assault?
					}
					globalValues.botGenerationCacheService.logger.info(`AITweaks: Not Substituting ${role}!`);
					return cachedOfType.pop();
				}

			}

			globalValues.botGenerationCacheService.logger.error(`OH NO! Cache does not contain ${role} in it!`);
			return undefined;
		}

		if (globalValues.botGenerationCacheService.storedBots.has(role)) {
			let cachedOfType = globalValues.botGenerationCacheService.storedBots.get(role);
			if (cachedOfType.length > 0) {
				return cachedOfType.pop();
			}

			globalValues.botGenerationCacheService.logger.error(`OH NO! Cache array does not contain value for ${role}!`);
		}


		globalValues.botGenerationCacheService.logger.error(`OH NO! Cache does not contain ${role} in it!`);
		return undefined;
	}

	static storeBots(botsToStore: IBotBase[]): void {
		const pmcTypeLabel = "PMC";
		//Logger.info(`In globalValues.storeBots Function`)
		botsToStore.forEach(bot => {
			const type = bot.sptIsPmc ? pmcTypeLabel : bot.Info.Settings.Role;
			if (globalValues.botGenerationCacheService.storedBots.has(type)) {
				if (type == pmcTypeLabel) {
					//Logger.info(`${type} is a pmcTypeLabel`)
					if (globalValues.legendaryFile[globalValues.GlobalSessionID] && globalValues.config.enableLegendaryPlayerMode) {
						//Logger.info(`legendaryFile[SessionID] exists`)
						try {
							let chance = globalValues.botGenerator.randomUtil.getChance100(globalValues.config.aiChanges.chanceLegendReplacesPMC)
							if (chance) {
								//Logger.info(`Hit the chance of replacing PMC`)

								bot = globalValues.legendaryFile[globalValues.GlobalSessionID];
								//Logger.info(`legendaryFile[GlobalSessionID] is the replacement for e`)

								bot = globalValues.botGenerator.generateDogtag(bot);
								bot.Info.Side = "Savage"
								bot.Info.Settings.BotDifficulty = "hard"
								bot.Info.Settings.Role = globalValues.botGenerator.randomUtil.getArrayValue(["followerBirdEye", "followerBigPipe", "bossKnight", "bossKilla"]);
								//botGenerator.botEquipmentFilterService.filterBotEquipment(e, playerLevelPMC, true, e.Info.Settings.Role);

								globalValues.botGenerationCacheService.storedBots.get(type).unshift(bot);
								globalValues.Logger.info(`Throwing legendary PMC of ${bot.Info.Settings.Role} into cachedbots (not guaranteed)`)
								return;
							}
						}
						catch {
							globalValues.Logger.error(`BotstoStore for Legendary had an error`)
						}
					}

				}
				//Logger.info(`Has ${type} but not PMC so just storing on stack`)
				globalValues.botGenerationCacheService.storedBots.get(type).unshift(bot);
			}
			else {
				//Logger.info(`Does not have ${type} so setting type`)
				globalValues.botGenerationCacheService.storedBots.set(type, [bot]);
			}
		});
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
				if (globalValues.legendaryFile[sessionID]) {
					globalValues.Logger.info(`Legendary Player Exists, Overwriting`)
					//Logger.info(`playerprofile stringified: ${JSON.stringify(playerprofile)}`)
					globalValues.legendaryFile[sessionID] = playerprofile;
					globalValues.legendaryFile[sessionID].Info.Settings.Role;
					globalValues.legendaryFile[sessionID].Info.Settings.BotDifficulty = "hard";
					this.saveToFile(globalValues.legendaryFile, "donottouch/legendary.json");
				}
				else {
					globalValues.Logger.info(`Legendary Player Does not exist, adding`)
					//Logger.info(`playerprofile stringified: ${JSON.stringify(playerprofile)}`)
					globalValues.legendaryFile[sessionID] = playerprofile;
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
			globalValues.Logger.info('setLegendary was false. Do not save Legendary Player')

		}
	}

    static saveToFile(data, filePath) {
		var fs = require('fs');
		fs.writeFile(globalValues.modFolder + filePath, JSON.stringify(data, null, 4), function (err) {
			if (err) throw err;
		});
	}

	static progDifficultygenerated(survivalcount: number, difficulty: number, threshold: number, step: number): number {
		let increase = Math.round(Math.pow(step, survivalcount) * 100) / 100
		difficulty += increase
		difficulty -= 1;
		if (difficulty > threshold) {
			return threshold
		} else {
			let output = difficulty.toFixed(2)
			return parseFloat(output);
		}
	}

	static recordWinLoss(url, info, sessionId): void {

		let difficulty = 0
		let threshold = 10
		let step = 1.05

		///fix this so its not using a base difficulty included
		if (info.exit == "survived")//If they survived
		{
			globalValues.progressRecord[sessionId].winStreak += 1
			globalValues.progressRecord[sessionId].deathStreak = 0
			globalValues.progressRecord[sessionId].diffMod += this.progDifficultygenerated(globalValues.progressRecord[sessionId].winStreak, difficulty, threshold, step)
			globalValues.Logger.info(`New Difficulty =  +${globalValues.progressRecord[sessionId].diffMod}`)
		}
		else if (info.exit == "killed")//If they perished
		{
			globalValues.progressRecord[sessionId].winStreak = 0
			globalValues.progressRecord[sessionId].deathStreak += 1
			globalValues.progressRecord[sessionId].diffMod -= this.progDifficultygenerated(globalValues.progressRecord[sessionId].deathStreak, difficulty, threshold, step)
			globalValues.Logger.info(`New Difficulty =  -${globalValues.progressRecord[sessionId].diffMod}`)
		}

		if (globalValues.config.enableAutomaticDifficulty) {
			globalValues.Logger.info(`Fins AI Tweaks:  Difficulty adjusted by ${globalValues.progressRecord[sessionId].diffMod}`)
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