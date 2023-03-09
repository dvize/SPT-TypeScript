import { IBotBase } from "@spt-aki/models/eft/common/tables/IBotBase";
import { GlobalValues as gv} from "./GlobalValuesModule";
import { POOPDifficulty as pd} from "./POOPDifficulty";
import { progressRecord } from "./POOPClassDef";
import { HashUtil } from "@spt-aki/utils/HashUtil";
import * as crypto from 'crypto';
import { IPmcData } from "@spt-aki/models/eft/common/IPmcData";
import { Difficulties } from "@spt-aki/models/eft/common/tables/IBotType";
import { Item } from "@spt-aki/models/eft/common/tables/IItem";

export class LegendaryPlayer {

//LEGENDARY PLAYER METHODS

    //store legendary player into botcache
	static PushLegendaryPlayer(SessionID: string)
	{
		
		let player = this.ReadFileEncrypted(`${gv.modFolder}/donottouch/legendary.json`);
		if (player == null) {
			return;
		}

		//legendary player chance is 15 percent right now
        let randomChance = gv.randomUtil.getChance100(100-gv.LegendaryPlayerModeChance);
		if (randomChance) {
			
			//create array of bots based on player.info.side and player.info.settings.difficulty
			let botarray: IBotBase[] = [];
			let difficultyArray: string[] = ["easy", "normal", "hard", "impossible"];

			//loop through the difficulty array and create 2 bots for each difficulty 
			for (let i = 0; i < difficultyArray.length; i++) {
				let difficulty = difficultyArray[i];
				let bot = this.CreateBot(player, difficulty);
				botarray.push(bot);
				botarray.push(bot);

				//generate the key as it is a string value of player.info.side + player.info.settings.difficulty
				let key = bot.Info.Settings.Role + bot.Info.Settings.BotDifficulty;

				//push the botarray into the botgenerationcache using storemethod
				gv.botGenerationCacheService.storeBots(key, botarray);
			}
		}
	}

	static CheckLegendaryPlayer(progressRecord: progressRecord, SessionID: string){
		//check if progressfile has consecutivesuccesful raids over const legendwinmin
		let progressFile: progressRecord = this.ReadFileEncrypted(`${gv.modFolder}/donottouch/progress.json`);
		if (progressFile == null) {
            gv.logger.info(`Progress file not found, creating new file`);
			this.CreateProgressFile(0, 0, 0);
		}

		let winMinimum: number = gv.legendWinMin;
		let successRaids: number = progressRecord.successfulConsecutiveRaids;
        let failedRaids: number = progressRecord.failedConsecutiveRaids;
        let runThroughs: number = progressRecord.runThroughs;

		//if win minimum is reached, create legendary player
        if (successRaids >= winMinimum) {
            gv.logger.info(`POOP: Updating with ${successRaids} successful raids, ${failedRaids} failed raids, and ${runThroughs} runthroughs`);
            this.StoreLegendBotFile(SessionID);
        }

        this.CreateProgressFile(successRaids, failedRaids, runThroughs);

	}

	static CreateBot(player: IPmcData, difficulty: string): IBotBase
	{
		let bot: IBotBase = this.clone(player);
		this.PreparePlayerStashIDs(bot.Inventory.items);
		bot.aid = gv.hashUtil.generate();
		bot._id = "pmc"+bot.aid;
		bot.Info.Settings.BotDifficulty = difficulty;
		if(bot.Info.Side.toLowerCase() == "usec")
		{
			bot.Info.Settings.Role = "sptusec";
		}
		else if(bot.Info.Side.toLowerCase() == "bear")
		{
			bot.Info.Settings.Role = "sptbear";
		}

		//does bot side need to be savage to fix pmc spawn?
		bot.Info.Side = "Savage";
		return bot;
	}

	static StoreLegendBotFile(SessionID: string)
	{
		if(gv.config.EnableLegendaryPlayerMode){
			let data: IPmcData = gv.profileHelper.getPmcProfile(SessionID);
			let legendaryFile: IPmcData = gv.clone(data);
			
			let items = legendaryFile.Inventory.items;
			this.PreparePlayerStashIDs(items);
	
			this.SaveToFileEncrypted(legendaryFile, `${gv.modFolder}/donottouch/legendary.json`);
		}
	}

//PROGRESS FILE RELATED METHODS

static CreateProgressFile(successful: number, failed: number, runthroughs: number){
    let progressFile: progressRecord = {
        successfulConsecutiveRaids: successful,
        failedConsecutiveRaids: failed,
        runThroughs: runthroughs
    }
    this.SaveToFileEncrypted(progressFile, `${gv.modFolder}/donottouch/progress.json`);
}


//TOOL METHODS
	static PreparePlayerStashIDs(items: any): Item[] {

		let newItems = [];
		for (let i = 0; i < items.length; i++) {
			let item = items[i];
			if (item._id == "hideout") {
				continue;
			}
			item._id = gv.hashUtil.generate();
			newItems.push(item);
		}
		return newItems;
	}

	static SaveToFileEncrypted(data: any, filePath: string) {
		var fs = require('fs');
		const hashedData = { ...data, hash: this.HashEncode(data) };
		fs.writeFile(gv.modFolder + filePath, JSON.stringify(hashedData, null, 4), function (err) {
			if (err) throw err;
		});
	}

	static HashEncode(data: any): string {
		const hash = crypto.createHash('sha256');
		hash.update(JSON.stringify(data));
		return hash.digest('hex');
	  }

	static ReadFileEncrypted(filePath: string): any {
		var fs = require('fs');
		const jsonString = fs.readFileSync(filePath, 'utf-8');
		const data = JSON.parse(jsonString);

		// Now you can access the original data and the hash
		const originalData = { ...data };
		delete originalData.hash;
		const hash = data.hash;

		// Verify the hash by comparing it to a new hash of the original data
		const newHash = this.HashEncode(originalData);
		const isHashValid = hash === newHash;

		if (isHashValid) {
			return originalData;
		}
		else {
			gv.logger.error(`POOP:${filePath} Hash is not valid`);
			return null;
		}
	}

	static clone(data: any) {
		return JSON.parse(JSON.stringify(data));
	}

}