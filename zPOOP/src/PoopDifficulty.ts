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

			//loop through POOPClassDef.RogueTypes and set the difficulty.easy.Mind.DEFAULT_ENEMY_USEC values
			for (let rogue in RogueTypes) {
				gv.botTypes[rogue].difficulty.easy.Mind.DEFAULT_ENEMY_USEC = false;
				gv.botTypes[rogue].difficulty.normal.Mind.DEFAULT_ENEMY_USEC = false;
				gv.botTypes[rogue].difficulty.hard.Mind.DEFAULT_ENEMY_USEC = false;
				gv.botTypes[rogue].difficulty.impossible.Mind.DEFAULT_ENEMY_USEC = false;
			}
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

		const botTypes = [
			{ types: ScavTypes, name: "Scavs" },
			{ types: PmcTypes, name: "PMCs" },
			{ types: RaiderTypes, name: "Raiders" },
			{ types: RogueTypes, name: "Rogues" },
			{ types: BossTypes, name: "Bosses" },
			{ types: FollowerTypes, name: "Followers" }
		  ];
		  const config = gv.config.AIChanges.AllowBotsToTalk;
		  
		  for (let { types, name } of botTypes) {
			if (!config[name]) {
			  for (let botName in gv.botTypes) {
				if (types.includes(botName)) {
				  for (let difficulty of ["easy", "normal", "hard", "impossible"]) {
					gv.botTypes[botName].difficulty[difficulty].Mind.CAN_TALK = false;
				  }}}}
			}
	}
}