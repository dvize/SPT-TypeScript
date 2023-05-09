import { GlobalValues as gv } from "./GlobalValuesModule";
import { IBotBase } from "@spt-aki/models/eft/common/tables/IBotBase";
import {
  RoleCase,
  progressRecord,
  assaultTypesBotGen,
  pmcTypesBotGen,
} from "./POOPClassDef";
import { LegendaryPlayer as lp } from "./LegendaryPlayer";
import { BotGenerationDetails } from "@spt-aki/models/spt/bots/BotGenerationDetails";
import { IBotType } from "@spt-aki/models/eft/common/tables/IBotType";
import { BotGenerator } from "@spt-aki/generators/BotGenerator";
import { IPmcData } from "@spt-aki/models/eft/common/IPmcData";
import { Level } from "../../../Server/project/src/models/eft/common/IGlobals";

export class Overrides {
  // use (gv.botGenerationCacheService as any) to get around the private access modifier
  // this is a hacky way to do it, but it works
  private static legendaryDifficultyArray: string[] = ["hard", "impossible"];

  static getBot(key: string): IBotBase {
    gv.config.DebugOutput &&
      gv.logger.warning(`requested bot type ${key} from cache`);

    //check if bot cache has requested bot type
    if ((gv.botGenerationCacheService as any).storedBots.has(key)) {
      const cachedOfType = (gv.botGenerationCacheService as any).storedBots.get(
        key
      );
      if (cachedOfType.length > 0) {
        if (assaultTypesBotGen.includes(key.toLowerCase())) {
          let chance = gv.randomUtil.getChance100(
            gv.config.AIChanges.ChanceChangeScavToNewRole
          );

          if (chance) {
            let newrole: string = gv.randomUtil
              .getArrayValue(gv.config.AIChanges.ScavAlternateRolesAllowed)
              .toLowerCase();
            newrole = RoleCase[newrole];
            cachedOfType[cachedOfType.length - 1].Info.Settings.Role = newrole;
            cachedOfType[cachedOfType.length - 1].Info.Side = "Savage";

            gv.config.DebugOutput &&
              gv.logger.info(`POOP: Substituting ${key} with ${newrole}!`);
            return cachedOfType.pop();
          }
        }

        //this is still return the original cached bot
        return cachedOfType.pop();
      }

      gv.logger.error(
        (gv.botGenerationCacheService as any).localisationService.getText(
          "bot-cache_has_zero_bots_of_requested_type",
          key
        )
      );
    }
    return undefined;
  }

  //All functions that need to be run when the route "/raid/profile/save" is used should go in here, as config-reliant conditionals can't be used on the initial load function
  static onRaidSave(url: string, info: any, sessionId: string, output: string) {
    gv.logger.info("POOP: onRaidSave");

    //try read values from progress record and if not we need to set them to 0
    let successfulConsecutiveRaids: number = 0;
    let failedConsecutiveRaids: number = 0;

    //reset legendary spawned for next raid
    gv.LegendarySpawned = false;

    //if gv.ProgressRecord is null, then we need to generate a new progress file
    if (!gv.progressRecord) {
      gv.logger.info(`POOP: Progress file not found, creating new file`);
      lp.CreateProgressFile(0, 0, sessionId, info);
      gv.progressRecord = lp.ReadFile(
        `${gv.modFolder}/donottouch/progress.json`
      ); //assign progressFile to gv.progressRecord
    } else {
      successfulConsecutiveRaids = gv.progressRecord.successfulConsecutiveRaids;
      failedConsecutiveRaids = gv.progressRecord.failedConsecutiveRaids;
    }

    //read gv.progressRecord and set the values for successfulConsecutive raids, failedConsecutive raids, and runthroughs
    if (gv.progressRecord && info.exit === "survived") {
      successfulConsecutiveRaids++;
      failedConsecutiveRaids = 0;
    } else if (gv.progressRecord && info.exit === "killed") {
      failedConsecutiveRaids++;
      successfulConsecutiveRaids = 0;
    } else if (gv.progressRecord && info.exit === "runner") {
      gv.logger.info("POOP: Runner Status. Your raid was not counted.");
    }

    //Update progress file
    if (gv.progressRecord) {
      gv.logger.info(
        `POOP: Updated progress file {SuccessfulConsecutiveRaids: ${successfulConsecutiveRaids}, FailedConsecutiveRaids: ${failedConsecutiveRaids}}`
      );
      lp.CreateProgressFile(
        successfulConsecutiveRaids,
        failedConsecutiveRaids,
        sessionId,
        info
      );
    }

    lp.CheckLegendaryPlayer(gv.progressRecord, sessionId);

    return output;
  }
}

export class CustomBotGenerator extends BotGenerator {
  static generateBot(
    sessionId: string,
    bot: IBotBase,
    botJsonTemplate: IBotType,
    botGenerationDetails: BotGenerationDetails
  ): IBotBase {
    //check if random chance is passed from LegendaryPlayerModeChance and the bot requested is a pmc

    gv.logger.info(`POOP: Checking if bot is a PMC`);
    if (
      gv.randomUtil.getChance100(gv.LegendaryPlayerModeChance) &&
      botGenerationDetails.isPmc &&
      //check if spawn is not the actual player id
      gv.sessionID !== bot._id &&
      gv.sessionID !== bot.aid
    ) {
      //if so, then we need to generate a legendary player from pmc
      let player: IPmcData = gv.clone(gv.legendaryFile.pmcData);

      bot = player;
      bot.Info.GameVersion = "edge_of_darkness";
      bot.Info.Settings.Role = botGenerationDetails.role;

      //generate dog tag - this is causing undefined error
      bot = gv.botGenerator.generateDogtag(bot);
      //generate new id
      bot = (gv.botGenerator as any).generateNewId(bot);
      //generate inventory id
      bot = (gv.botGenerator as any).generateInventoryID(bot);

      gv.logger.info(
        `POOP: Generated Legendary PMC ${bot.Info.Nickname} of type ${bot.Info.Settings.Role}`
      );

      return bot;
    } else {
      //this is the original code.. keep unless generating
      const botRole = botGenerationDetails.role.toLowerCase();
      const botLevel = (
        gv.botGenerator as any
      ).botLevelGenerator.generateBotLevel(
        botJsonTemplate.experience.level,
        botGenerationDetails,
        bot
      );

      if (!botGenerationDetails.isPlayerScav) {
        (gv.botGenerator as any).botEquipmentFilterService.filterBotEquipment(
          botJsonTemplate,
          botLevel.level,
          botGenerationDetails
        );
      }

      bot.Info.Nickname = (gv.botGenerator as any).generateBotNickname(
        botJsonTemplate,
        botGenerationDetails.isPlayerScav,
        botRole
      );

      const skipChristmasItems = !(
        gv.botGenerator as any
      ).seasonalEventService.christmasEventEnabled();
      if (skipChristmasItems) {
        (
          gv.botGenerator as any
        ).seasonalEventService.removeChristmasItemsFromBotInventory(
          botJsonTemplate.inventory,
          botGenerationDetails.role
        );
      }

      bot.Info.Experience = botLevel.exp;
      bot.Info.Level = botLevel.level;
      bot.Info.Settings.Experience = (gv.botGenerator as any).randomUtil.getInt(
        botJsonTemplate.experience.reward.min,
        botJsonTemplate.experience.reward.max
      );
      bot.Info.Settings.StandingForKill =
        botJsonTemplate.experience.standingForKill;
      bot.Info.Voice = (gv.botGenerator as any).randomUtil.getArrayValue(
        botJsonTemplate.appearance.voice
      );
      bot.Health = (gv.botGenerator as any).generateHealth(
        botJsonTemplate.health,
        bot.Info.Side === "Savage"
      );
      bot.Skills = (gv.botGenerator as any).generateSkills(
        <any>botJsonTemplate.skills
      ); // TODO: fix bad type, bot jsons store skills in dict, output needs to be array
      bot.Customization.Head = (
        gv.botGenerator as any
      ).randomUtil.getArrayValue(botJsonTemplate.appearance.head);
      bot.Customization.Body = (
        gv.botGenerator as any
      ).weightedRandomHelper.getWeightedInventoryItem(
        botJsonTemplate.appearance.body
      );
      bot.Customization.Feet = (
        gv.botGenerator as any
      ).weightedRandomHelper.getWeightedInventoryItem(
        botJsonTemplate.appearance.feet
      );
      bot.Customization.Hands = (
        gv.botGenerator as any
      ).randomUtil.getArrayValue(botJsonTemplate.appearance.hands);
      bot.Inventory = (
        gv.botGenerator as any
      ).botInventoryGenerator.generateInventory(
        sessionId,
        botJsonTemplate,
        botRole,
        botGenerationDetails.isPmc,
        botLevel.level
      );

      if (gv.botHelper.isBotPmc(botRole)) {
        (gv.botGenerator as any).getRandomisedGameVersionAndCategory(bot.Info);
        bot = (gv.botGenerator as any).generateDogtag(bot);
      }

      // generate new bot ID
      bot = (gv.botGenerator as any).generateId(bot);

      // generate new inventory ID
      bot = (gv.botGenerator as any).generateInventoryID(bot);
    }

    return bot;
  }
}
