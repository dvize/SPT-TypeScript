import { ConfigServer } from "@spt-aki/servers/ConfigServer";
import { ConfigTypes } from "@spt-aki/models/enums/ConfigTypes";
import { IBotConfig } from "@spt-aki/models/spt/config/IBotConfig";
import { IInRaidConfig } from "@spt-aki/models/spt/config/IInraidConfig";
import { BotHelper } from "@spt-aki/helpers/BotHelper";
import { ProfileHelper } from "@spt-aki/helpers/ProfileHelper";
import { IBotBase } from "@spt-aki/models/eft/common/tables/IBotBase";
import { IBotType } from "@spt-aki/models/eft/common/tables/IBotType";
import { BotGenerationCacheService } from "@spt-aki/services/BotGenerationCacheService";
import { RandomUtil } from "@spt-aki/utils/RandomUtil";
import { JsonUtil } from "@spt-aki/utils/JsonUtil";
import { IPmcData } from "@spt-aki/models/eft/common/IPmcData";
import { HashUtil } from "@spt-aki/utils/HashUtil";
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import { ILogger } from "@spt-aki/models/spt/utils/ILogger";
import {
  POOPConfig,
  progressRecord,
  AITemplate,
  CoreAITemplate,
  legendFile,
} from "./POOPClassDef";
import { ILocationBase } from "@spt-aki/models/eft/common/ILocationBase";
import { BotController } from "@spt-aki/controllers/BotController";
import { BotGenerationDetails } from "@spt-aki/models/spt/bots/BotGenerationDetails";
import { BotGenerator } from "@spt-aki/generators/BotGenerator";

export class GlobalValues {
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
  public static botController: BotController;
  public static config: POOPConfig;
  public static inRaidConfig: IInRaidConfig;
  public static progressRecord: progressRecord;
  public static sessionID: string;
  public static botGenerationCacheService: BotGenerationCacheService;
  public static legendaryFile: legendFile;
  public static ScavAltRolesPickList: string[];
  public static modName: string = "POOP";
  public static hashUtil: HashUtil;
  public static randomUtil: RandomUtil;
  public static jsonUtil: JsonUtil;
  public static AITemplates: AITemplate[];
  public static CoreAITemplate: CoreAITemplate;
  public static botGenerator: BotGenerator;

  public static legendWinMin: number = 10;
  public static LegendaryPlayerModeChance: number = 2;
  public static LegendarySpawned: boolean = false;

  static clone(data: any) {
    return JSON.parse(JSON.stringify(data));
  }
}
