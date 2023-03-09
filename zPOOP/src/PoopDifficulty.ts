import { DependencyContainer } from "tsyringe";
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import { GlobalValues as gv } from "./GlobalValuesModule";
import {RoleCase, POOPConfig, AITemplate, PmcTypes, RaiderTypes, RogueTypes, ScavTypes, BossTypes, FollowerTypes } from "./POOPClassDef";
import { IBotBase } from '@spt-aki/models/eft/common/tables/IBotBase';
import { IHealthTreatmentRequestData } from "@spt-aki/models/eft/health/IHealthTreatmentRequestData";
import { Health, BodyPartsHealth } from '@spt-aki/models/eft/common/tables/IBotBase';
import { BodyParts } from '@spt-aki/models/eft/common/IGlobals';

export class POOPDifficulty
{
    static SetRogueNeutral() {
		gv.logger.info("POOP: Setting Rogue Neutral to USECs")
		//Rogues will only *ever* use exusec behaviour, so it's appropriate to flip the switch here. If they become a behaviour option, this will have to default to true if behaviour is enabled.
		if (gv.config.AIChanges.RoguesNeutralToUsecs) {
			gv.botTypes[RoleCase["exusec"]].difficulty.easy.Mind.DEFAULT_ENEMY_USEC = true
			gv.botTypes[RoleCase["exusec"]].difficulty.normal.Mind.DEFAULT_ENEMY_USEC = false
			gv.botTypes[RoleCase["exusec"]].difficulty.hard.Mind.DEFAULT_ENEMY_USEC = true
			gv.botTypes[RoleCase["exusec"]].difficulty.impossible.Mind.DEFAULT_ENEMY_USEC = true
		}
	}

	static changeHealth(bots: IBotBase[], multiplier: number) {
		for (let bot in bots)
		{
			//loop through each bot and directly set limb health to multiplier * base health
			for (let limb in bots[bot].Health)
			{
				bots[bot].Health.BodyParts[limb].Health.Current = Math.floor(bots[bot].Health.BodyParts[limb].Health.Current * multiplier);
				bots[bot].Health.BodyParts[limb].Health.Maximum = Math.floor(bots[bot].Health.BodyParts[limb].Health.Maximum * multiplier);
			}	
		}
	}

	static AdjustHealthValues(PMCMult: number, ScavMult: number, RaiderMult: number, BossMul: number, CultistMult: number) {
		gv.logger.info("POOP: Adjusting Health Values by Multiplier");
		//call changeHealth for each bot type based on group type
		POOPDifficulty.changeHealth(POOPDifficulty.ConvertStringToIBotBaseArray(PmcTypes), PMCMult);
	}

	static ConvertStringToIBotBaseArray(botArray: string[]): IBotBase[] {
		let botBaseArray: IBotBase[] = [];
		for (let bot in botArray) {
			botBaseArray.push(gv.botTypes[botArray[bot]]);
		}
		return botBaseArray;
	}

    static NoTalking()
	{
		//need to make sure difficulty settings don't override this

		gv.logger.info("POOP: Disabling Talking");		
		//read the values from config then loop through bots and if it fits the criteria, set the value to false
		let scavs = gv.config.AIChanges.AllowBotsToTalk.Scavs;
		let pmcs = gv.config.AIChanges.AllowBotsToTalk.PMCs;
		let raiders = gv.config.AIChanges.AllowBotsToTalk.Raiders;
		let rogues = gv.config.AIChanges.AllowBotsToTalk.Rogues;
		let bosses = gv.config.AIChanges.AllowBotsToTalk.Bosses;
		let followers = gv.config.AIChanges.AllowBotsToTalk.Followers;

		for (let botName in gv.botTypes)
		{
			if(!scavs && ScavTypes.includes(botName))
				gv.botTypes[botName].difficulty.easy.Mind.CAN_TALK = false;
				gv.botTypes[botName].difficulty.normal.Mind.CAN_TALK = false;
				gv.botTypes[botName].difficulty.hard.Mind.CAN_TALK = false;
				gv.botTypes[botName].difficulty.impossible.Mind.CAN_TALK = false;
			if(!pmcs && PmcTypes.includes(botName))
				gv.botTypes[botName].difficulty.easy.Mind.CAN_TALK = false;
				gv.botTypes[botName].difficulty.normal.Mind.CAN_TALK = false;
				gv.botTypes[botName].difficulty.hard.Mind.CAN_TALK = false;
				gv.botTypes[botName].difficulty.impossible.Mind.CAN_TALK = false;
			if(!raiders && RaiderTypes.includes(botName))
				gv.botTypes[botName].difficulty.easy.Mind.CAN_TALK = false;
				gv.botTypes[botName].difficulty.normal.Mind.CAN_TALK = false;
				gv.botTypes[botName].difficulty.hard.Mind.CAN_TALK = false;
				gv.botTypes[botName].difficulty.impossible.Mind.CAN_TALK = false;
			if(!rogues && RogueTypes.includes(botName))	
				gv.botTypes[botName].difficulty.easy.Mind.CAN_TALK = false;
				gv.botTypes[botName].difficulty.normal.Mind.CAN_TALK = false;
				gv.botTypes[botName].difficulty.hard.Mind.CAN_TALK = false;
				gv.botTypes[botName].difficulty.impossible.Mind.CAN_TALK = false;
			if(!bosses && BossTypes.includes(botName))	
				gv.botTypes[botName].difficulty.easy.Mind.CAN_TALK = false;
				gv.botTypes[botName].difficulty.normal.Mind.CAN_TALK = false;
				gv.botTypes[botName].difficulty.hard.Mind.CAN_TALK = false;
				gv.botTypes[botName].difficulty.impossible.Mind.CAN_TALK = false;
			if(!followers && FollowerTypes.includes(botName))
				gv.botTypes[botName].difficulty.easy.Mind.CAN_TALK = false;
				gv.botTypes[botName].difficulty.normal.Mind.CAN_TALK = false;
				gv.botTypes[botName].difficulty.hard.Mind.CAN_TALK = false;
				gv.botTypes[botName].difficulty.impossible.Mind.CAN_TALK = false;
		}
	}

}