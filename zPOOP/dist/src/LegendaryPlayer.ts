import { IBotBase } from "@spt-aki/models/eft/common/tables/IBotBase";
import { GlobalValues as gv } from "./GlobalValuesModule";
import { POOPDifficulty as pd } from "./POOPDifficulty";
import { progressRecord } from "./POOPClassDef";
import { HashUtil } from "@spt-aki/utils/HashUtil";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { IPmcData } from "@spt-aki/models/eft/common/IPmcData";
import { Difficulties } from "@spt-aki/models/eft/common/tables/IBotType";
import { Item } from "@spt-aki/models/eft/common/tables/IItem";

const passphrase = "mysecretpassphrase";
const salt = crypto.randomBytes(16); // generate a random salt
const key = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, "sha256");

const algorithm = "aes-256-cbc";
const iv = crypto.randomBytes(16);

export class LegendaryPlayer {
  //LEGENDARY PLAYER METHODS

  //store legendary player into botcache
  static PushLegendaryPlayer(SessionID: string) {
    let player = this.ReadFileEncrypted(
      `${gv.modFolder}/donottouch/legendary.json`
    );
    if (player == null) {
      return;
    }

    //legendary player chance is 15 percent right now
    let randomChance = gv.randomUtil.getChance100(
      100 - gv.LegendaryPlayerModeChance
    );
    if (randomChance) {
      //create array of bots based on player.info.side and player.info.settings.difficulty
      let botarray: IBotBase[] = [];
      let difficultyArray: string[] = ["easy", "normal", "hard", "impossible"];

      //loop through the difficulty array and create 2 bots for each difficulty
      for (let i = 0; i < difficultyArray.length; i++) {
        let difficulty: string = difficultyArray[i];

        let bot1: IBotBase = this.CreateBot(player, difficulty);
        botarray.push(bot1);

        // let bot2 = this.CreateBot(player, difficulty);
        // botarray.push(bot2);

        //generate the key as it is a string value of player.info.side + player.info.settings.difficulty
        let key: string =
          bot1.Info.Settings.Role + bot1.Info.Settings.BotDifficulty;

        //push the botarray into the botgenerationcache using storemethod
        gv.botGenerationCacheService.storeBots(key, botarray);
      }
    }
  }

  static CheckLegendaryPlayer(
    progressRecord: progressRecord,
    SessionID: string
  ) {
    //check if progressfile has consecutivesuccesful raids over const legendwinmin
    let winMinimum: number = gv.legendWinMin;
    let successRaids: number = progressRecord.successfulConsecutiveRaids;
    let failedRaids: number = progressRecord.failedConsecutiveRaids;

    //if win minimum is reached, create legendary player
    if (successRaids >= winMinimum) {
      gv.logger.info(
        `POOP: Updating with ${successRaids} successful raids, ${failedRaids} failed raids`
      );
      this.CreateLegendBotFile(SessionID);
    }
  }

  static CreateBot(player: IPmcData, difficulty: string): IBotBase {
    let bot: IBotBase = this.clone(player);
    this.PreparePlayerStashIDs(bot.Inventory.items);
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
      let legendaryFile: IPmcData = gv.clone(data);

      let items = legendaryFile.Inventory.items;
      this.PreparePlayerStashIDs(items);

      this.SaveToFileEncrypted(
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
    this.SaveToFileEncrypted(
      progressFile,
      `${gv.modFolder}/donottouch/progress.json`
    );
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

  static SaveToFileEncrypted(data: any, filePath: string) {
    var fs = require("fs");

    //use encrypt from scoreboard
    let hashedData = this.encrypt(data);

    //write file even if it exists
    fs.writeFile(
      gv.modFolder + filePath,
      JSON.stringify(hashedData, null, 4),
      function (err) {
        if (err) throw err;
      }
    );
  }

  static ReadFileEncrypted(filePath: string): any {
    var fs = require("fs");
    const jsonString = fs.readFileSync(filePath, "utf-8");

    //use decrypt on jsonstring
    let decryptedData = this.decrypt(jsonString);
    return decryptedData;
  }

  static clone(data: any) {
    return JSON.parse(JSON.stringify(data));
  }

  static encrypt(data: any) {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
  }

  static decrypt(encrypted: string) {
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return JSON.parse(decrypted);
  }
}
