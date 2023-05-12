import { IBotBase } from "@spt-aki/models/eft/common/tables/IBotBase";
import { GlobalValues as gv } from "./GlobalValues";
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

  static CreateLegendBotFile(SessionID: string) {
    if (gv.config.EnableLegendaryPlayerMode) {
      let data: IPmcData = gv.profileHelper.getPmcProfile(SessionID);
      let legendaryFile: legendFile;
      legendaryFile = {
        SessionID: SessionID,
        pmcData: gv.clone(data),
      };

      let items = legendaryFile.pmcData.Inventory.items;
      (gv.botGenerator as any).generateInventoryID(legendaryFile.pmcData);
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
    newDifficulty: number,
    data: IPmcData
  ) {
    let progressFile: progressRecord = {
      SessionID: sessionID,
      successfulConsecutiveRaids: successful,
      failedConsecutiveRaids: failed,
      currentDifficulty: newDifficulty,
    };
    LegendaryPlayer.SaveToFile(
      progressFile,
      `${gv.modFolder}/donottouch/progress.json`
    );

    //update the global progress file
    gv.progressRecord = progressFile;
  }

  //TOOL METHODS
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
      gv.logger.info(`POOP: No file exists at: ${filePath}. This is Normal`);
      return null;
    }
  }

  static clone(data: any) {
    return JSON.parse(JSON.stringify(data));
  }
}
