import { GlobalValues as gv } from "./GlobalValuesModule";
import { IBotBase } from "@spt-aki/models/eft/common/tables/IBotBase";
import { RoleCase } from "./POOPClassDef";

export class Overrides{
    public static assaultTypes: string[] = ["assaulteasy", "assaultnormal", "assaulthard", "cursedassaulteasy",
		"cursedassaultnormal", "cursedassaulthard", "assaultimpossible", "cursedassaultimpossible"];

	public static pmcTypes: string[] = ["sptbeareasy", "sptbearnormal", "sptbearhard", "sptuseceasy",
		"sptusecnormal", "sptusechard", "sptbearimpossible", "sptusecimpossible"];

    // use (gv.botGenerationCacheService as any) to get around the private access modifier
    // this is a hacky way to do it, but it works

    static getBot(key: string): IBotBase 
    {
        gv.logger.warning(`requested bot type ${key} from cache`);
        if ((gv.botGenerationCacheService as any).storedBots.has(key)) {
            const cachedOfType = (gv.botGenerationCacheService as any).storedBots.get(key);
            if (cachedOfType.length > 0) {
                if (Overrides.assaultTypes.includes(key.toLowerCase())) {

                    if (gv.randomUtil.getChance100(gv.config.AIChanges.ChanceChangeScavToNewRole)) {
                        let newrole: string = gv.randomUtil.getArrayValue(gv.config.AIChanges.ScavAlternateRolesAllowed).toLowerCase();
                        newrole = RoleCase[newrole];
                        cachedOfType[cachedOfType.length - 1].Info.Settings.Role = newrole;
                        cachedOfType[cachedOfType.length - 1].Info.Side = "Savage";

                        gv.logger.info(`POOP: Substituting ${key} with ${newrole}!`);
                        return cachedOfType.pop();
                    }
                }

                if(gv.config.DebugOutput) 
                        gv.logger.info(`POOP: Not Substituting ${key}!`);

                return cachedOfType.pop();
            }

            gv.logger.error((gv.botGenerationCacheService as any).localisationService.getText("bot-cache_has_zero_bots_of_requested_type", key));
        }

        gv.logger.error((gv.botGenerationCacheService as any).localisationService.getText("bot-no_bot_type_in_cache", key));

        return undefined;
        
    }


    //All functions that need to be run when the route "/raid/profile/save" is used should go in here, as config-reliant conditionals can't be used on the initial load function
	static onRaidSave(url: string, info: any, sessionId: string, output: string) {
		gv.logger.info('POOP: onRaidSave')

		//read gv.progressRecord and set the values for successfulConsecutive raids, failedConsecutive raids, and runthroughs
		if (gv.progressRecord) {
			let successfulConsecutiveRaids = gv.progressRecord.successfulConsecutiveRaids;
			let failedConsecutiveRaids = gv.progressRecord.failedConsecutiveRaids;
			let runthroughs = gv.progressRecord.runThroughs;

			//Check if the raid was successful then increment successful raids
			if (info.exit == "survived")
			{
				successfulConsecutiveRaids++;
				failedConsecutiveRaids = 0;
			}
			else if (info.exit == "killed")
			{
				failedConsecutiveRaids++;
				successfulConsecutiveRaids = 0;
			}
			else if (info.exit == "runner")
			{
                runthroughs++;
				gv.logger.info("POOP: Runner Status. Your raid was not counted.");
			}
		}

		//Check if the raid was successful then increment successful raids
		
		return output
	}
}

