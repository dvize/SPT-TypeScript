import { IPreAkiLoadMod } from "@spt-aki/models/external/IPreAkiLoadMod";
import { IPostAkiLoadMod } from "@spt-aki/models/external/IPostAkiLoadMod";
import { DynamicRouterModService } from "@spt-aki/services/mod/dynamicRouter/DynamicRouterModService";
import { StaticRouterModService } from "@spt-aki/services/mod/staticRouter/StaticRouterModService";
import { DependencyContainer } from "tsyringe";
import { BotGenerationCacheService } from "@spt-aki/services/BotGenerationCacheService"
import { GlobalValues as gv } from "./GlobalValuesModule";
import {RoleCase, POOPConfig, AITemplate, PmcTypes, RaiderTypes, RogueTypes, ScavTypes, BossTypes, FollowerTypes } from "./POOPClassDef";
import { POOPDifficulty as pd } from "./POOPDifficulty";
import { ConfigTypes } from "@spt-aki/models/enums/ConfigTypes";
import { IBotConfig } from "@spt-aki/models/spt/config/IBotConfig";
import { IInRaidConfig } from "@spt-aki/models/spt/config/IInraidConfig";
import { Difficulty, Difficulties } from '@spt-aki/models/eft/common/tables/IBotType';
import { Overrides } from "./Overrides";
import { LegendaryPlayer as lp } from "./LegendaryPlayer";

class POOP implements IPreAkiLoadMod, IPostAkiLoadMod {

	preAkiLoad(container: DependencyContainer): void {
		gv.logger = container.resolve("WinstonLogger")
		gv.config = require("../config/config.json");


		//set config checks early in case i need to not setup dynamic/static routers.
		const dynamicRouterModService = container.resolve<DynamicRouterModService>("DynamicRouterModService");
		const staticRouterModService = container.resolve<StaticRouterModService>("StaticRouterModService");


		//On Profile Selected (Set gv.SessionID)
		staticRouterModService.registerStaticRouter(`${gv.modName}:ProfileSelected`, [{
			url: "/client/game/profile/select",
			action: (url, info, sessionId, output) => {
				gv.sessionID = sessionId;
				return output
			}
		}], "aki");

		//Raid Saving (End of raid)
		staticRouterModService.registerStaticRouter(`${gv.modName}:RaidSaved`, [{
			url: "/raid/profile/save",
			action: (url, info, sessionId, output) => {
				Overrides.onRaidSave(url, info, sessionId, output);
				return output
			}
		}], "aki");

		// The GetBot override to change scav bot types
			container.afterResolution("BotGenerationCacheService", (_t, result: BotGenerationCacheService) => {
				result.getBot = Overrides.getBot;
			}, { frequency: "Always" });
	
	}

	postAkiLoad(container: DependencyContainer): void {
		this.setupInitialValues(container);

		//Enable Setting from config
		if(gv.config.AIChanges.RoguesNeutralToUsecs){
			pd.SetRogueNeutral();
		}

		if (gv.config.AIChanges.AllowHealthTweaks.Enabled) {
			pd.AdjustHealthValues(gv.config.AIChanges.AllowHealthTweaks.Multipliers.PMCHealthMult, 
				gv.config.AIChanges.AllowHealthTweaks.Multipliers.ScavHealthMult,
				gv.config.AIChanges.AllowHealthTweaks.Multipliers.RaiderHealthMult, 
				gv.config.AIChanges.AllowHealthTweaks.Multipliers.BossHealthMult,
				gv.config.AIChanges.AllowHealthTweaks.Multipliers.CultistHealthMult)
		}

		pd.NoTalking();

		gv.logger.info("POOP: Finished")
	}

	setupInitialValues(container) {
		gv.logger.info('POOP: SetupInitialValues');
		gv.profileHelper = container.resolve("ProfileHelper");
		gv.botHelper = container.resolve("BotHelper");
		gv.configServer = container.resolve("ConfigServer");
		gv.botGenerationCacheService = container.resolve("BotGenerationCacheService");
		gv.hashUtil = container.resolve("HashUtil");
		gv.databaseServer = container.resolve("DatabaseServer");
		gv.database = gv.databaseServer.getTables();
		gv.locations = gv.database.locations;
		gv.botTypes = gv.database.bots.types;

		//get path to current mod folder (one directory up from this file)
		gv.modFolder = __dirname.split("\\").slice(0, -1).join("\\");
		
		// Setup Base AI Difficulty
		//gv.baseAIDifficulty = gv.clone(gv.botTypes);

		//Load Config Files
		gv.botConfig = gv.configServer.getConfig<IBotConfig>(ConfigTypes.BOT);
		gv.inRaidConfig = gv.configServer.getConfig<IInRaidConfig>(ConfigTypes.IN_RAID);

		//Load Progress File and log issue if it doesn't exist
		try {
			gv.progressRecord = lp.ReadFileEncrypted(gv.modFolder + "/donottouch/progress.json");
		} catch (error) {
			gv.logger.info("POOP: Progress file not found.");
		}

		//Load Legendary File and log issue if it doesn't exist
		try {
			gv.legendaryFile = lp.ReadFileEncrypted(gv.modFolder + "/donottouch/legendary.json");
		} catch (error) {
			gv.logger.info("POOP: Legendary file not found.");
		}

	}

	

}

module.exports = { mod: new POOP() }