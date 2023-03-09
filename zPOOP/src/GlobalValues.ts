import { ConfigServer } from "@spt-aki/servers/ConfigServer";
import { ConfigTypes } from "@spt-aki/models/enums/ConfigTypes";
import { IBotConfig } from "@spt-aki/models/spt/config/IBotConfig";
import { IInRaidConfig } from "@spt-aki/models/spt/config/IInraidConfig";
import { BotHelper } from "@spt-aki/helpers/BotHelper";
import { ProfileHelper } from "@spt-aki/helpers/ProfileHelper";
import { IBotBase } from "@spt-aki/models/eft/common/tables/IBotBase";
import { IGenerateBotsRequestData } from "@spt-aki/models/eft/bot/IGenerateBotsRequestData";
import { IBotType } from "@spt-aki/models/eft/common/tables/IBotType"
import { BotGenerationCacheService } from "@spt-aki/services/BotGenerationCacheService"
import { RandomUtil } from "@spt-aki/utils/RandomUtil";
import { JsonUtil } from "@spt-aki/utils/JsonUtil";
import { IPmcData } from "@spt-aki/models/eft/common/IPmcData";
import { HashUtil } from "@spt-aki/utils/HashUtil";
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import { ILogger } from "@spt-aki/models/spt/utils/ILogger";
import { POOPConfig, progressRecord } from './POOPClassDef';
import { ILocationBase } from '@spt-aki/models/eft/common/ILocationBase';

export class GlobalValues
{
	public static configServer: ConfigServer;
	public static profileHelper: ProfileHelper;
	public static botHelper: BotHelper;
	public static logger: ILogger;
	public static botConfig: IBotConfig;
	public static database: any;
	public static databaseServer: DatabaseServer;
	public static locations: ILocationBase;
	public static botTypes: IBotType[];
	public static modFolder: string;
	public static baseAIDifficulty: IBotBase;
	public static config: POOPConfig;
	public static inRaidConfig: IInRaidConfig;
	public static progressRecord: progressRecord;
	public static sessionID: string;
	public static botGenerationCacheService: BotGenerationCacheService;
	public static legendaryFile: IPmcData;
	public static ScavAltRolesPickList: string[];
	public static modName: string = "POOP";
	public static hashUtil: HashUtil;
	public static randomUtil: RandomUtil;
	public static jsonUtil: JsonUtil;

 	public static legendWinMin: number = 10;

    static clone(data: any) {
		return JSON.parse(JSON.stringify(data));
	}
}