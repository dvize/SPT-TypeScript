import { GlobalValues as gv } from "./GlobalValuesModule";
import { IBotBase } from "@spt-aki/models/eft/common/tables/IBotBase";
import { RoleCase } from "./POOPClassDef";

export class Overrides{
    public static assaultTypes: string[] = ["assaulteasy", "assaultnormal", "assaulthard", "cursedassaulteasy",
		"cursedassaultnormal", "cursedassaulthard", "assaultimpossible", "cursedassaultimpossible"];

	public static pmcTypes: string[] = ["sptbeareasy", "sptbearnormal", "sptbearhard", "sptuseceasy",
		"sptusecnormal", "sptusechard", "sptbearimpossible", "sptusecimpossible"];

    static getBot(key: string): IBotBase 
    {
        gv.logger.warning(`requested bot type ${key} from cache`);
        if (gv.botGenerationCacheService.storedBots.has(key)) {
            const cachedOfType = gv.botGenerationCacheService.storedBots.get(key);
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

            gv.logger.error(gv.botGenerationCacheService.localisationService.getText("bot-cache_has_zero_bots_of_requested_type", key));
        }

        gv.logger.error(gv.botGenerationCacheService.localisationService.getText("bot-no_bot_type_in_cache", key));

        return undefined;
        
    }
}

