import { GlobalValues as gv } from "./GlobalValuesModule";
import { IBotBase } from "@spt-aki/models/eft/common/tables/IBotBase";
import {
  RoleCase,
  progressRecord,
  assaultTypesBotGen,
  pmcTypesBotGen,
} from "./POOPClassDef";
import { LegendaryPlayer as lp } from "./LegendaryPlayer";

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

        //this section is after we know we are not spawning for a substitute scav role
        if (gv.config.DebugOutput)
          gv.logger.info(`POOP: Not Substituting ${key}!`);

        //legendary player chance is 15 percent right now
        let randomChance = gv.randomUtil.getChance100(
          gv.LegendaryPlayerModeChance
        );
        if (randomChance) {
          Overrides.grabLegendaryPlayer(key);
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

  //helper function to grab legendary player for use in getBot botcache
  static grabLegendaryPlayer(key: string): IBotBase {
    //grab random difficulty from difficultyarray
    let randomDifficulty: string = gv.randomUtil.getArrayValue(
      Overrides.legendaryDifficultyArray
    );

    //set key = "legendary" + random difficulty
    key = "legendary" + randomDifficulty;

    //check if bot cache has legendary player
    if ((gv.botGenerationCacheService as any).storedBots.has(key)) {
      const legendPlayer = (gv.botGenerationCacheService as any).storedBots.get(
        key
      );

      if (legendPlayer.length > 0) {
        //setup random role from curated config scav role list
        let newrole: string = gv.randomUtil
          .getArrayValue(gv.config.AIChanges.ScavAlternateRolesAllowed)
          .toLowerCase();
        newrole = RoleCase[newrole];

        //assign new role and side to bot
        legendPlayer[legendPlayer.length - 1].Info.Settings.Role = newrole;
        legendPlayer[legendPlayer.length - 1].Info.Side = "Savage";

        gv.config.DebugOutput &&
          gv.logger.info(`POOP: Substituting ${key} with ${newrole}!`);
        return legendPlayer.pop();
      }
    }

    gv.logger.error(
      (gv.botGenerationCacheService as any).localisationService.getText(
        "bot-cache_has_zero_bots_of_requested_type",
        key
      )
    );
  }

  //All functions that need to be run when the route "/raid/profile/save" is used should go in here, as config-reliant conditionals can't be used on the initial load function
  static onRaidSave(url: string, info: any, sessionId: string, output: string) {
    gv.logger.info("POOP: onRaidSave");

    //try read values from progress record and if not we need to set them to 0
    let successfulConsecutiveRaids: number = 0;
    let failedConsecutiveRaids: number = 0;

    //if gv.ProgressRecord is null, then we need to generate a new progress file
    if (gv.progressRecord == null) {
      gv.logger.info(`POOP: Progress file not found, creating new file`);
      lp.CreateProgressFile(0, 0, sessionId, info);
      gv.progressRecord = lp.ReadFileEncrypted(
        `${gv.modFolder}/donottouch/progress.json`
      ); //assign progressFile to gv.progressRecord
    } else {
      successfulConsecutiveRaids = gv.progressRecord.successfulConsecutiveRaids;
      failedConsecutiveRaids = gv.progressRecord.failedConsecutiveRaids;
    }

    //read gv.progressRecord and set the values for successfulConsecutive raids, failedConsecutive raids, and runthroughs
    if (gv.progressRecord) {
      //Check if the raid was successful then increment successful raids
      if (info.exit == "survived") {
        successfulConsecutiveRaids++;
        failedConsecutiveRaids = 0;
      } else if (info.exit == "killed") {
        failedConsecutiveRaids++;
        successfulConsecutiveRaids = 0;
      } else if (info.exit == "runner") {
        gv.logger.info("POOP: Runner Status. Your raid was not counted.");
      }
    }

    //Update progress file
    if (gv.progressRecord != null) {
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
