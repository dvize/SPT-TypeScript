import { IPreAkiLoadMod } from "@spt-aki/models/external/IPreAkiLoadMod";
import { IPostAkiLoadMod } from "@spt-aki/models/external/IPostAkiLoadMod";
import { DynamicRouterModService } from "@spt-aki/services/mod/dynamicRouter/DynamicRouterModService";
import { StaticRouterModService } from "@spt-aki/services/mod/staticRouter/StaticRouterModService";
import { DependencyContainer } from "tsyringe";
import { BotGenerationCacheService } from "@spt-aki/services/BotGenerationCacheService";
import { GlobalValues as gv } from "./GlobalValuesModule";
import { RoleCase, POOPConfig, AITemplate } from "./POOPClassDef";
import { RecordSkills as rs } from "./RecordSkillChanges";
import { POOPDifficulty as pd } from "./POOPDifficulty";
import { ConfigTypes } from "@spt-aki/models/enums/ConfigTypes";
import { IBotConfig } from "@spt-aki/models/spt/config/IBotConfig";
import { IInRaidConfig } from "@spt-aki/models/spt/config/IInraidConfig";
import {
  Difficulty,
  Difficulties,
} from "@spt-aki/models/eft/common/tables/IBotType";
import { Overrides } from "./Overrides";
import { LegendaryPlayer as lp } from "./LegendaryPlayer";
import JSON5 from "json5";
import { SecureContainerHelper } from "../../../Server/project/src/helpers/SecureContainerHelper";

class POOP implements IPreAkiLoadMod, IPostAkiLoadMod {
  preAkiLoad(container: DependencyContainer): void {
    gv.logger = container.resolve("WinstonLogger");

    //setup json5 for require
    //require("json5/lib/register");

    //get path to current mod folder (one directory up from this file)
    gv.modFolder = __dirname.split("\\").slice(0, -1).join("\\");

    //read ${gv.modFolder}/config/config.json5 and set gv.config
    gv.config = JSON5.parse(
      require("fs").readFileSync(`${gv.modFolder}/config/config.json5`, "utf8")
    ) as POOPConfig;

    //set config checks early in case i need to not setup dynamic/static routers.
    const dynamicRouterModService = container.resolve<DynamicRouterModService>(
      "DynamicRouterModService"
    );
    const staticRouterModService = container.resolve<StaticRouterModService>(
      "StaticRouterModService"
    );

    //On Profile Selected (Set gv.SessionID)
    staticRouterModService.registerStaticRouter(
      `${gv.modName}:ProfileSelected`,
      [
        {
          url: "/client/game/profile/select",
          action: (url, info, sessionId, output) => {
            gv.sessionID = sessionId;
            return output;
          },
        },
      ],
      "aki"
    );

    //Raid Saving (End of raid)
    staticRouterModService.registerStaticRouter(
      `${gv.modName}:RaidSaved`,
      [
        {
          url: "/raid/profile/save",
          action: (url, info, sessionId, output) => {
            Overrides.onRaidSave(url, info, sessionId, output);
            return output;
          },
        },
      ],
      "aki"
    );

    // The GetBot override to change scav bot types
    container.afterResolution(
      "BotGenerationCacheService",
      (_t, result: BotGenerationCacheService) => {
        result.getBot = Overrides.getBot;
      },
      { frequency: "Always" }
    );
  }

  postAkiLoad(container: DependencyContainer): void {
    this.setupInitialValues(container);

    //Setup Difficulty
    gv.CoreAITemplate = pd.readCoreTemplate();
    gv.AITemplates = pd.readAITemplate();

    //Setup AI Templates in Config.
    pd.setupAITemplates(gv.botTypes, gv.CoreAITemplate, gv.AITemplates);

    //Enable Setting from config
    if (gv.config.AIChanges.RoguesNeutralToUsecs) {
      pd.SetRogueNeutral();
    }

    if (gv.config.AIChanges.AllowHealthTweaks.Enabled) {
      pd.AdjustHealthValues(
        gv.config.AIChanges.AllowHealthTweaks.Multipliers.PMCHealthMult,
        gv.config.AIChanges.AllowHealthTweaks.Multipliers.ScavHealthMult,
        gv.config.AIChanges.AllowHealthTweaks.Multipliers.RaiderHealthMult,
        gv.config.AIChanges.AllowHealthTweaks.Multipliers.BossHealthMult,
        gv.config.AIChanges.AllowHealthTweaks.Multipliers.CultistHealthMult
      );
    }

    pd.NoTalking();

    //Don't use this unless trying to find skill differences in easy - impossible bot types
    //rs.recordSkills(); //Record Skills for all bots
    //rs.filterSkills(); //Filter Skills for values that remain same for all bots

    gv.logger.info("POOP: Finished");
  }

  setupInitialValues(container) {
    gv.logger.info("POOP: SetupInitialValues");
    gv.profileHelper = container.resolve("ProfileHelper");
    gv.botHelper = container.resolve("BotHelper");
    gv.configServer = container.resolve("ConfigServer");
    gv.botGenerationCacheService = container.resolve(
      "BotGenerationCacheService"
    );
    gv.randomUtil = container.resolve("RandomUtil");
    gv.hashUtil = container.resolve("HashUtil");
    gv.databaseServer = container.resolve("DatabaseServer");
    gv.database = gv.databaseServer.getTables();
    gv.locations = gv.database.locations;
    gv.botTypes = gv.database.bots.types;

    // Setup Base AI Difficulty
    //gv.baseAIDifficulty = gv.clone(gv.botTypes);

    //Load Config Files
    gv.botConfig = gv.configServer.getConfig<IBotConfig>(ConfigTypes.BOT);
    gv.inRaidConfig = gv.configServer.getConfig<IInRaidConfig>(
      ConfigTypes.IN_RAID
    );

    //Load Progress File and log issue if it doesn't exist
    try {
      gv.progressRecord = lp.ReadFileEncrypted(
        gv.modFolder + "/donottouch/progress.json"
      );
    } catch (error) {
      gv.logger.info("POOP: Progress file: " + error);
    }

    //Load Legendary File and log issue if it doesn't exist
    try {
      gv.legendaryFile = lp.ReadFileEncrypted(
        gv.modFolder + "/donottouch/legendary.json"
      );
    } catch (error) {
      gv.logger.info("POOP: Legendary file: " + error);
    }
  }
}

module.exports = { mod: new POOP() };
