import { IBotBase } from "@spt-aki/models/eft/common/tables/IBotBase";
import { GlobalValues as gv } from "./GlobalValuesModule";
import { POOPDifficulty as pd } from "./POOPDifficulty";
import {
  RoleCase,
  legendFile,
  pmcTypesBotGen,
  progressRecord,
} from "./POOPClassDef";
import { HashUtil } from "@spt-aki/utils/HashUtil";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { IPmcData } from "@spt-aki/models/eft/common/IPmcData";
import { Difficulties } from "@spt-aki/models/eft/common/tables/IBotType";
import { Item } from "@spt-aki/models/eft/common/tables/IItem";
import { PmcDurabilityArmor } from "../types/models/spt/config/IBotDurability";
import {
  Condition,
  IGenerateBotsRequestData,
} from "@spt-aki/models/eft/bot/IGenerateBotsRequestData";
import { BotGenerationDetails } from "@spt-aki/models/spt/bots/BotGenerationDetails";
import { BotGenerator } from "@spt-aki/generators/BotGenerator";

export class LegendaryPlayer {
  //LEGENDARY PLAYER METHODS

  static CheckLegendaryPlayer(
    progressRecord: progressRecord,
    SessionID: string
  ) {
    //check if progressfile has consecutivesuccesful raids over const legendwinmin
    let winMinimum: number = gv.legendWinMin;
    let successRaids: number;
    let failedRaids: number;
    try {
      successRaids = progressRecord.successfulConsecutiveRaids;
      failedRaids = progressRecord.failedConsecutiveRaids;
    } catch (err) {
      gv.logger.info("POOP: No progress file found at CheckLegendaryPlayer");
      return;
    }

    //if win minimum is reached, create legendary player
    if (successRaids >= winMinimum) {
      gv.logger.info(
        `POOP: Updating with ${successRaids} successful raids, ${failedRaids} failed raids`
      );
      LegendaryPlayer.CreateLegendBotFile(SessionID);
    }
  }

  static CreateBot(player: IPmcData, difficulty: string): IBotBase {
    let bot: IBotBase = gv.clone(player);
    LegendaryPlayer.PreparePlayerStashIDs(bot.Inventory.items);
    bot.aid = gv.hashUtil.generate();
    bot._id = "pmc" + bot.aid;
    bot.Info.Settings.BotDifficulty = difficulty;
    if (bot.Info.Side.toLowerCase() == "usec") {
      bot.Info.Settings.Role = "sptusec";
    } else if (bot.Info.Side.toLowerCase() == "bear") {
      bot.Info.Settings.Role = "sptbear";
    }

    //does bot side need to be savage to fix pmc spawn?
    bot.Info.Side = "Savage";
    return bot;
  }

  static CreateLegendBotFile(SessionID: string) {
    if (gv.config.EnableLegendaryPlayerMode) {
      let data: IPmcData = gv.profileHelper.getPmcProfile(SessionID);
      let legendaryFile: legendFile;
      legendaryFile = {
        SessionID: SessionID,
        pmcData: gv.clone(data),
      };

      let items = legendaryFile.pmcData.Inventory.items;
      LegendaryPlayer.PreparePlayerStashIDs(items);
      gv.legendaryFile = legendaryFile;

      LegendaryPlayer.SaveToFile(
        legendaryFile,
        `${gv.modFolder}/donottouch/legendary.json`
      );
    }
  }

  //PROGRESS FILE RELATED METHODS

  static CreateProgressFile(
    successful: number,
    failed: number,
    sessionID: string,
    data: IPmcData
  ) {
    let progressFile: progressRecord = {
      SessionID: sessionID,
      successfulConsecutiveRaids: successful,
      failedConsecutiveRaids: failed,
    };
    LegendaryPlayer.SaveToFile(
      progressFile,
      `${gv.modFolder}/donottouch/progress.json`
    );

    //update the global progress file
    gv.progressRecord = progressFile;
  }

  //TOOL METHODS
  static PreparePlayerStashIDs(items: any): Item[] {
    let newItems = [];
    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      if (item._id == "hideout") {
        continue;
      }
      item._id = gv.hashUtil.generate();
      newItems.push(item);
    }
    return newItems;
  }

  static SaveToFile(data: any, filePath: string) {
    var fs = require("fs");
    //gv.logger.info("POOP: Data: " + JSON.stringify(data, null, 4));

    //write file even if it exists
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
      gv.logger.info("Data written successfully!");
    } catch (error) {
      gv.logger.error("Error writing data:" + error);
    }

    gv.logger.info("POOP: Saved File: " + filePath);
  }

  static ReadFile(filePath: string): any {
    try {
      const jsonString = fs.readFileSync(filePath, "utf-8");
      let decryptedData = JSON.parse(jsonString);
      return decryptedData;
    } catch (err) {
      console.error(`Error reading file: ${filePath}`, err);
      return null;
    }
  }

  static clone(data: any) {
    return JSON.parse(JSON.stringify(data));
  }
}
