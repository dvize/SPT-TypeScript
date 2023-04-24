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
import { Aiming } from "./POOPClassDef";

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
        //gv.config.DebugOutput && gv.logger.info(JSON.stringify(template));
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
    }

    //setup CoreAITemplate - used when not overridden by AITemplate
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
    //set a floor for each of the multiplers in the difficulty
    for (let setting in gv.config.Difficulty.Multipliers) {
      if (
        gv.config.Difficulty.Multipliers[setting] + DifficultyModifier <
        0.01
      ) {
        gv.config.Difficulty.Multipliers[setting] = 0.01;
      } else {
        gv.config.Difficulty.Multipliers[setting] += DifficultyModifier;
      }
    }

    //setup Aim multiplier
    POOPDifficulty.SetupAimMultiplier(setting);

    //setup Shot Spread multiplier
    gv.config.Difficulty.Multipliers.ShotSpreadMult;

    //setup vision speed multiplier
    gv.config.Difficulty.Multipliers.VisionSpeedMult;
    gv.config.Difficulty.Multipliers.AccuracyMult;
    gv.config.Difficulty.Multipliers.SniperBotAccuracyMult;
    gv.config.Difficulty.Multipliers.VisibleDistanceMult;
    gv.config.Difficulty.Multipliers.SemiAutoFireRateMult;
    gv.config.Difficulty.Multipliers.FullAutoFireRateMult;
    gv.config.Difficulty.Multipliers.RecoilMult;
    gv.config.Difficulty.Multipliers.HearingMult;
    gv.config.Difficulty.Multipliers.VisibleAngleMult;
    gv.config.Difficulty.Multipliers.VisibleAngleMax;
    gv.config.Difficulty.Multipliers.GrenadePrecisionMult;
    gv.config.Difficulty.Multipliers.GrenadeThrowRangeMax;
    if (gv.config.Difficulty.DirectValue.AllowAimAtHead) {
      //this sets to // 4 - randomly + center + without head
      setting.Aiming.AIMING_TYPE = 4;
    }
    gv.config.Difficulty.DirectValue.AllowGrenades;
    gv.config.Difficulty.DirectValue.AllowStationaryTurrets;

    return setting;
  }

  private static SetupAimMultiplier(setting: Difficulty) {
    //method that has all the aim speed multipliers

    //zeroing speed factor
    setting.Aiming.BETTER_PRECICING_COEFF =
      Number(setting.Aiming.BETTER_PRECICING_COEFF) *
      gv.config.Difficulty.Multipliers.AimSpeedMult;
    //aim speed factor when blinded
    setting.Aiming.FLASH_ACCURACY_COEFF =
      Number(setting.Aiming.FLASH_ACCURACY_COEFF) *
      gv.config.Difficulty.Multipliers.AimSpeedMult;
    //aim speed factor when in smoke
    setting.Aiming.SMOKE_ACCURATY =
      Number(setting.Aiming.SMOKE_ACCURATY) *
      gv.config.Difficulty.Multipliers.AimSpeedMult;
    //Reacquire target speed factor when in smoke
    setting.Aiming.SMOKE_GAIN_SIGHT =
      Number(setting.Aiming.SMOKE_GAIN_SIGHT) *
      gv.config.Difficulty.Multipliers.AimSpeedMult;
    //aim speed.. not sure if bigger is better or worse (I think lower is better)
    //use inverse of multiplication to get a division
    setting.Core.AccuratySpeed =
      Number(setting.Core.AccuratySpeed) /
      gv.config.Difficulty.Multipliers.AimSpeedMult;
    //coefficient speed of converging on spread angle. bigger is better
    setting.Scattering.SpeedUpAim =
      Number(setting.Scattering.SpeedUpAim) *
      gv.config.Difficulty.Multipliers.AimSpeedMult;
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
