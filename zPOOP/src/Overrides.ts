import { GlobalValues as gv } from "./GlobalValues";
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
import { IPmcData } from "@spt-aki/models/eft/common/IPmcData";
import { POOPDifficulty as pd } from "./POOPDifficulty";

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
      lp.CreateProgressFile(0, 0, sessionId, 0, info);
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

    //grab difficulty from progress file
    let newDifficulty: number =
      gv.progressRecord.currentDifficulty !== null
        ? gv.progressRecord.currentDifficulty
        : 0;

    if (info.exit !== "runner") {
      //check if automatic difficulty is enabled and adjust difficulty accordingly
      if (gv.config.EnableAutomaticDifficulty) {
        //if successfulConsecutiveRaids is positive on powercurve based on number
        if (successfulConsecutiveRaids > 0) {
          const power = 0.5; // Adjust power to change the difficulty curve
          const difficultyIncrease = 0.1; // Adjust the difficulty increase to change the slope of the curve
          const increase =
            Math.pow(successfulConsecutiveRaids, power) * difficultyIncrease;
          newDifficulty = Number((newDifficulty + increase).toFixed(2)); // round to 2 decimal places
          gv.logger.info(`POOP: Increased difficulty to: ${newDifficulty}`);
        } else if (failedConsecutiveRaids > 0) {
          const power = 0.5; // Adjust power to change the difficulty curve
          const difficultyDecrease = 0.1; // Adjust the difficulty decrease to change the slope of the curve
          const decrease =
            Math.pow(failedConsecutiveRaids, power) * difficultyDecrease;
          newDifficulty = Number((newDifficulty - decrease).toFixed(2)); // round to 2 decimal places
          gv.logger.info(`POOP: Decreased difficulty to: ${newDifficulty}`);
        }

        //regenerate difficulties
        gv.progressRecord.currentDifficulty = newDifficulty;
        pd.setupAITemplates(gv.botTypes, gv.CoreAITemplate, gv.AITemplates);

        //Have to redo the other settings since ai templates have changed
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
      }
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
        newDifficulty,
        info
      );
    }

    //check if legendary player mode is enabled
    lp.CheckLegendaryPlayer(gv.progressRecord, sessionId);

    return output;
  }

  static generateBot(
    sessionId: string,
    bot: IBotBase,
    botJsonTemplate: IBotType,
    botGenerationDetails: BotGenerationDetails
  ): IBotBase {
    //check if random chance is passed from LegendaryPlayerModeChance and the bot requested is a pmc
    gv.logger.info(
      `POOP: Bot Type: ${botGenerationDetails.role} and side: ${botGenerationDetails.side}`
    );
    if (
      gv.randomUtil.getChance100(gv.LegendaryPlayerModeChance) &&
      botGenerationDetails.isPmc &&
      //check if spawn is not the actual player id
      gv.sessionID !== bot._id &&
      gv.sessionID !== bot.aid &&
      gv.LegendarySpawned == false &&
      //check if legendary file is not null
      gv.legendaryFile &&
      botGenerationDetails.side === gv.legendaryFile.pmcData.Info.Side
    ) {
      //if so, then we need to generate a legendary player from pmc
      let player: IPmcData = gv.legendaryFile.pmcData;
      const botRole = botGenerationDetails.role.toLowerCase();
      bot = gv.clone(player);
      bot.Info.GameVersion = "edge_of_darkness";
      bot.Info.Settings.Role = botGenerationDetails.role;

      //have to set side to savage so player has to fight them.. causes dict error if set
      //bot.Info.Side = "Savage";

      //generate dog tag
      if (gv.botHelper.isBotPmc(botRole)) {
        (gv.botGenerator as any).getRandomisedGameVersionAndCategory(bot.Info);
        bot = (gv.botGenerator as any).generateDogtag(bot);
      }

      //generate new id
      bot = (gv.botGenerator as any).generateId(bot);
      //generate inventory id
      //bot = (gv.botGenerator as any).generateInventoryID(bot);
      bot = (gv.botGenerator as any).generateInventoryID(bot);

      gv.logger.info(
        `POOP: Generated Legendary PMC ${bot.Info.Nickname} of type ${bot.Info.Settings.Role} and side ${bot.Info.Side}`
      );

      gv.LegendarySpawned = true;
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

      bot.Info.Nickname = (gv.botGenerator as any as any).generateBotNickname(
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
      bot.Info.Settings.Experience = gv.randomUtil.getInt(
        botJsonTemplate.experience.reward.min,
        botJsonTemplate.experience.reward.max
      );
      bot.Info.Settings.StandingForKill =
        botJsonTemplate.experience.standingForKill;
      bot.Info.Voice = gv.randomUtil.getArrayValue(
        botJsonTemplate.appearance.voice
      );
      bot.Health = (gv.botGenerator as any).generateHealth(
        botJsonTemplate.health,
        bot.Info.Side === "Savage"
      );
      bot.Skills = (gv.botGenerator as any).generateSkills(
        <any>botJsonTemplate.skills
      ); // TODO: fix bad type, bot jsons store skills in dict, output needs to be array
      bot.Customization.Head = gv.randomUtil.getArrayValue(
        botJsonTemplate.appearance.head
      );
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
      bot.Customization.Hands = gv.randomUtil.getArrayValue(
        botJsonTemplate.appearance.hands
      );
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
