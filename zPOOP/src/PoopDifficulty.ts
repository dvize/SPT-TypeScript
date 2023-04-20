import { DependencyContainer } from "tsyringe";
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import { GlobalValues as gv } from "./GlobalValuesModule";
import {
  RoleCase,
  POOPConfig,
  AITemplate,
  PmcTypes,
  RaiderTypes,
  RogueTypes,
  ScavTypes,
  BossTypes,
  FollowerTypes,
  CoreAITemplate,
  Core,
  gameDifficulty,
} from "./POOPClassDef";
import { IBotBase } from "@spt-aki/models/eft/common/tables/IBotBase";
import { IHealthTreatmentRequestData } from "@spt-aki/models/eft/health/IHealthTreatmentRequestData";
import {
  Health,
  BodyPartsHealth,
} from "@spt-aki/models/eft/common/tables/IBotBase";
import { BodyParts } from "@spt-aki/models/eft/common/IGlobals";
import JSON5 from "json5";
import { IBotConfig } from "@spt-aki/models/spt/config/IBotConfig";
import {
  Difficulty,
  IBotType,
} from "@spt-aki/models/eft/common/tables/IBotType";
import { Difficulties } from "@spt-aki/models/eft/common/tables/IBotType";

export class POOPDifficulty {
  static readAITemplate(): AITemplate[] {
    let AITemplates: AITemplate[] = [];
    const fs = require("fs");
    const path = require("path");
    const directoryPath = path.join(
      gv.modFolder,
      "config/AITemplates/RoleSpecific"
    );

    try {
      fs.readdirSync(directoryPath).forEach(function (file) {
        let template: AITemplate;
        try {
          const fileContents = fs.readFileSync(path.join(directoryPath, file));
          template = JSON5.parse(fileContents);
        } catch (err) {
          gv.logger.error(`Failed to parse JSON5 file ${file}: ${err}`);
          return;
        }

        gv.config.DebugOutput &&
          gv.logger.info(`POOP: Adding AITemplate ${file}`);
        gv.config.DebugOutput && gv.logger.info(JSON.stringify(template));
        AITemplates.push(template);
      });
    } catch (err) {
      gv.logger.error(`Failed to read directory ${directoryPath}: ${err}`);
    }
    return AITemplates;
  }

  static readCoreTemplate(): CoreAITemplate {
    let CoreTemplate: CoreAITemplate = null;
    const fs = require("fs");
    const path = require("path");
    const directoryPath = path.join(
      gv.modFolder,
      "config/AITemplates/core/core.json5"
    );

    try {
      let template = fs.readFileSync(directoryPath);
      CoreTemplate = JSON5.parse(template);
    } catch (err) {
      gv.logger.error(err);
    }

    return CoreTemplate;
  }

  static setupAITemplates(
    botTypes: IBotType[],
    CoreAITemplate: CoreAITemplate,
    AITemplates: AITemplate[]
  ) {
    //read bot config and alter bot types accordingly by looping through each bot type and applying the appropriate template
    for (let botType in botTypes) {
      //create an array to store all AITemplates where their RoleTypes array includes the botType
      let applicableTemplate: AITemplate;
      //loop through each AITemplate
      for (let template in AITemplates) {
        //if the AITemplate's RoleTypes array includes the botType, set it as the applicable template. we only want first applicable template, so break out of the loop
        if (AITemplates[template].RoleTypes.includes(botType)) {
          applicableTemplate = AITemplates[template];
          break;
        }
      }

      //if the applicableTemplate is null or undefined, skip this botType
      if (applicableTemplate == null || applicableTemplate == undefined) {
        gv.logger.info(
          `POOP: No applicable AITemplate for ${botType}, skipping`
        );
        continue;
      }

      //apply the AITemplates.difficulty.normal values to the botType in the applicableTemplate
      botTypes[botType].difficulty.normal =
        applicableTemplate.difficulty.normal;

      //create the botType.difficulty.easy and botType.difficulty.hard and botType.difficulty.impossible and set them to appropriate botType.difficulty values
      botTypes[botType].difficulty.easy = this.applyDifficultyChange(
        botTypes[botType].difficulty.normal,
        "easy"
      );
      botTypes[botType].difficulty.hard = this.applyDifficultyChange(
        botTypes[botType].difficulty.normal,
        "hard"
      );
      botTypes[botType].difficulty.impossible = this.applyDifficultyChange(
        botTypes[botType].difficulty.normal,
        "impossible"
      );

      //setup CoreAITemplate - used when not overridden by AITemplate
    }
  }

  //centralize difficulty changes + the hardcoded difficulty modifiers.
  static applyDifficultyChange(
    setting: Difficulty,
    difficultyOption: string
  ): Difficulty {
    //switch the difficultyOption
    switch (difficultyOption) {
      case "easy":
        //apply the easy changes to the normal difficulty
        return this.setDifficultyModifier(
          setting,
          gameDifficulty["easy"] +
            gv.config.Difficulty.OverallDifficultyModifier
        );
      case "hard":
        //apply the hard changes to the normal difficulty
        return this.setDifficultyModifier(
          setting,
          gameDifficulty["hard"] +
            gv.config.Difficulty.OverallDifficultyModifier
        );
      case "impossible":
        //apply the impossible changes to the normal difficulty
        return this.setDifficultyModifier(
          setting,
          gameDifficulty["impossible"] +
            gv.config.Difficulty.OverallDifficultyModifier
        );
      default:
        //apply no changes so it will default to normal
        return setting;
    }
  }

  static setDifficultyModifier(
    setting: Difficulty,
    DifficultyModifier: number
  ): Difficulty {
    //apply the difficulty modifier to the difficulty settings

    gv.config.Difficulty.Multipliers.AimSpeedMult;

    return setting;
  }

  //RANDOM MISC FUNCTIONS
  static SetRogueNeutral() {
    gv.logger.info("POOP: Setting Rogue Neutral to USECs");
    //Rogues will only *ever* use exusec behaviour, so it's appropriate to flip the switch here. If they become a behaviour option, this will have to default to true if behaviour is enabled.
    if (gv.config.AIChanges.RoguesNeutralToUsecs) {
      //loop through POOPClassDef.RogueTypes and set the difficulty.easy.Mind.DEFAULT_ENEMY_USEC values
      for (let rogue in RogueTypes) {
        gv.botTypes[RogueTypes[rogue]].difficulty.easy.Mind.DEFAULT_ENEMY_USEC =
          false;
        gv.botTypes[RogueTypes[rogue]].difficulty.easy.Mind.DEFAULT_ENEMY_USEC =
          false;
        gv.botTypes[
          RogueTypes[rogue]
        ].difficulty.normal.Mind.DEFAULT_ENEMY_USEC = false;
        gv.botTypes[RogueTypes[rogue]].difficulty.hard.Mind.DEFAULT_ENEMY_USEC =
          false;
        gv.botTypes[
          RogueTypes[rogue]
        ].difficulty.impossible.Mind.DEFAULT_ENEMY_USEC = false;
      }
    }
  }

  static changeHealth(bots: IBotBase[], multiplier: number) {
    for (let bot in bots) {
      //loop through each bot and directly set limb health to multiplier * base health
      for (let limb in bots[bot].Health) {
        bots[bot].Health.BodyParts[limb].Health.Current = Math.floor(
          bots[bot].Health.BodyParts[limb].Health.Current * multiplier
        );
        bots[bot].Health.BodyParts[limb].Health.Maximum = Math.floor(
          bots[bot].Health.BodyParts[limb].Health.Maximum * multiplier
        );
      }
    }
  }

  static AdjustHealthValues(
    PMCMult: number,
    ScavMult: number,
    RaiderMult: number,
    BossMul: number,
    CultistMult: number
  ) {
    gv.logger.info("POOP: Adjusting Health Values by Multiplier");
    //call changeHealth for each bot type based on group type
    POOPDifficulty.changeHealth(
      POOPDifficulty.ConvertStringToIBotBaseArray(PmcTypes),
      PMCMult
    );
  }

  static ConvertStringToIBotBaseArray(botArray: string[]): IBotBase[] {
    let botBaseArray: IBotBase[] = [];
    for (let bot in botArray) {
      botBaseArray.push(gv.botTypes[botArray[bot]]);
    }
    return botBaseArray;
  }

  static NoTalking() {
    //need to make sure difficulty settings don't override this

    const botTypes = [
      { types: ScavTypes, name: "Scavs" },
      { types: PmcTypes, name: "PMCs" },
      { types: RaiderTypes, name: "Raiders" },
      { types: RogueTypes, name: "Rogues" },
      { types: BossTypes, name: "Bosses" },
      { types: FollowerTypes, name: "Followers" },
    ];
    const config = gv.config.AIChanges.AllowBotsToTalk;

    for (let { types, name } of botTypes) {
      if (!config[name]) {
        for (let botName in gv.botTypes) {
          if (types.includes(botName)) {
            for (let Element of ["Easy", "Normal", "Hard", "Impossible"]) {
              gv.botTypes[botName].difficulty[Element].Mind.CAN_TALK = false;
            }
          }
        }
      }
    }
  }
}
