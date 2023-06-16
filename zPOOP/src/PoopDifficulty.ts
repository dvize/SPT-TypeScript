import { DependencyContainer } from "tsyringe";
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import { GlobalValues as gv } from "./GlobalValues";
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
  CultistTypes,
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
  IBotType,
  Difficulties,
  Difficulty,
} from "@spt-aki/models/eft/common/tables/IBotType";

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
          gv.config.DebugOutput &&
            gv.logger.info(
              "POOP: Found applicable AITemplate : template = " +
                template +
                " botType = " +
                botType
            );
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

      //create the botType.difficulty.easy and botType.difficulty.hard and botType.difficulty.impossible and set them to appropriate botType.difficulty values
      botTypes[botType].difficulty.easy = POOPDifficulty.applyDifficultyChange(
        gv.clone(applicableTemplate.difficulty.normal),
        "easy",
        applicableTemplate.AIDifficultyModifier,
        applicableTemplate.OverrideConfigMultipliers
      );
      botTypes[botType].difficulty.normal =
        POOPDifficulty.applyDifficultyChange(
          gv.clone(applicableTemplate.difficulty.normal),
          "normal",
          applicableTemplate.AIDifficultyModifier,
          applicableTemplate.OverrideConfigMultipliers
        );
      botTypes[botType].difficulty.hard = POOPDifficulty.applyDifficultyChange(
        gv.clone(applicableTemplate.difficulty.normal),
        "hard",
        applicableTemplate.AIDifficultyModifier,
        applicableTemplate.OverrideConfigMultipliers
      );
      botTypes[botType].difficulty.impossible =
        POOPDifficulty.applyDifficultyChange(
          gv.clone(applicableTemplate.difficulty.normal),
          "impossible",
          applicableTemplate.AIDifficultyModifier,
          applicableTemplate.OverrideConfigMultipliers
        );
    }

    //setup CoreAITemplate - used when not overridden by AITemplate
    POOPDifficulty.setupCoreAITemplate(CoreAITemplate);
    gv.databaseServer.getTables().bots.core = CoreAITemplate;
  }

  //centralize difficulty changes + the hardcoded difficulty modifiers.
  static applyDifficultyChange(
    setting: Difficulty,
    difficultyOption: string,
    AIDifficultyModifier: number,
    OverrideConfigMultipliers: boolean
  ): Difficulty {
    let diffSetting: Difficulty;
    let progRecordDifficulty: number;
    gv.logger.info("POOP: Applying difficulty change: " + difficultyOption);
    //check if gv.progressRecord.currentDifficulty is undefined or null, if so, set it to 0
    if (!gv.progressRecord) {
      progRecordDifficulty = 0;
    } else {
      progRecordDifficulty = gv.progressRecord.currentDifficulty;
    }
    //switch the difficultyOption
    switch (difficultyOption) {
      case "easy":
        //apply the easy changes to the normal difficulty
        diffSetting = POOPDifficulty.setDifficultyModifier(
          setting,
          gameDifficulty["easy"] +
            gv.config.Difficulty.OverallDifficultyModifier +
            progRecordDifficulty +
            AIDifficultyModifier,
          OverrideConfigMultipliers
        );
        return diffSetting;
      case "normal":
        //apply the normal changes to the normal difficulty
        diffSetting = POOPDifficulty.setDifficultyModifier(
          setting,
          gameDifficulty["normal"] +
            gv.config.Difficulty.OverallDifficultyModifier +
            progRecordDifficulty +
            AIDifficultyModifier,
          OverrideConfigMultipliers
        );
        return diffSetting;
      case "hard":
        //apply the hard changes to the normal difficulty
        diffSetting = POOPDifficulty.setDifficultyModifier(
          setting,
          gameDifficulty["hard"] +
            gv.config.Difficulty.OverallDifficultyModifier +
            progRecordDifficulty +
            AIDifficultyModifier,
          OverrideConfigMultipliers
        );
        return diffSetting;
      case "impossible":
        //apply the impossible changes to the normal difficulty
        diffSetting = POOPDifficulty.setDifficultyModifier(
          setting,
          gameDifficulty["impossible"] +
            gv.config.Difficulty.OverallDifficultyModifier +
            progRecordDifficulty +
            AIDifficultyModifier,
          OverrideConfigMultipliers
        );
        return diffSetting;
      default:
        //apply no changes so it will default to normal
        return setting;
    }
  }

  static setupCoreAITemplate(CoreAITemplate: CoreAITemplate) {
    //setup the CoreAITemplate

    CoreAITemplate.CAN_SHOOT_TO_HEAD =
      gv.config.Difficulty.DirectValue.CanAimForHead;
  }
  static setDifficultyModifier(
    setting: Difficulty,
    DifficultyModifier: number,
    OverrideConfigMultipliers: boolean
  ): Difficulty {
    //if we are not overriding the config multipliers, just return the setting
    if (OverrideConfigMultipliers) {
      return setting;
    }

    gv.config.DebugOutput &&
      gv.logger.info(
        "POOP: Setting DifficultyModifier = " + DifficultyModifier
      );

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
    POOPDifficulty.SetupAimSpeedMultiplier(setting);

    //setup Accuracy multiplier
    POOPDifficulty.SetupShotSpreadMultiplier(setting);

    //setup vision speed multiplier
    POOPDifficulty.SetupVisionSpeedMultiplier(setting);

    //setup visible distance multiplier
    POOPDifficulty.SetupVisibleDistanceMultiplier(setting);

    //setup FullAutoFireRateMult
    POOPDifficulty.SetupFullAutoFireRateMultiplier(setting);
    gv.config.Difficulty.Multipliers.FullAutoFireRateMult;

    //setup Recoil multiplier
    POOPDifficulty.SetupRecoilMultiplier(setting);

    //setup hearing multiplier
    POOPDifficulty.SetupHearingMultiplier(setting);

    //setup Visible Angle with floor 120 and max 320
    if (gv.config.Difficulty.DirectValue.VisibleAngle < 120) {
      setting.Change.VisibleAngle = 120;
    } else if (gv.config.Difficulty.DirectValue.VisibleAngle > 320) {
      setting.Change.VisibleAngle = 320;
    } else {
      setting.Change.VisibleAngle =
        gv.config.Difficulty.DirectValue.VisibleAngle;
    }

    //setup Grenade Precision multiplier
    POOPDifficulty.SetupGrenadePrecisionMultiplier(setting);

    //setup Grenade Throw Range Max
    setting.Grenade.MAX_THROW_POWER =
      gv.config.Difficulty.DirectValue.GrenadeThrowRangeMax;

    //setup aim type to random  or config value
    if (gv.config.Difficulty.DirectValue.AimingType == "random") {
      setting.Aiming.AIMING_TYPE = gv.randomUtil.getInt(1, 5);
    } else {
      setting.Aiming.AIMING_TYPE = gv.config.Difficulty.DirectValue.AimingType;
    }

    //setup AllowGrenades
    setting.Core.CanGrenade = gv.config.Difficulty.DirectValue.AllowGrenades;

    //Hopefully setting distance to 0 works
    if (gv.config.Difficulty.DirectValue.AllowStationaryTurrets) {
      setting.Cover.STATIONARY_WEAPON_MAX_DIST_TO_USE = 0;
    }

    return setting;
  }

  static SetupGrenadePrecisionMultiplier(setting: Difficulty) {
    setting.Aiming.BASE_SHIEF_STATIONARY_GRENADE =
      Number(setting.Aiming.BASE_SHIEF_STATIONARY_GRENADE) /
      gv.config.Difficulty.Multipliers.GrenadePrecisionMult;
    setting.Grenade.GrenadePrecision =
      Number(setting.Grenade.GrenadePrecision) /
      gv.config.Difficulty.Multipliers.GrenadePrecisionMult;
  }

  static SetupHearingMultiplier(setting: Difficulty) {
    setting.Core.HearingSense =
      Number(setting.Core.HearingSense) *
      gv.config.Difficulty.Multipliers.HearingMult;
  }

  static SetupRecoilMultiplier(setting: Difficulty) {
    //on rate of fire how much recoil is added.
    setting.Shoot.RECOIL_DELTA_PRESS =
      Number(setting.Shoot.RECOIL_DELTA_PRESS) /
      gv.config.Difficulty.Multipliers.RecoilMult;
    /* setting.Shoot.RECOIL_PER_METER =
      Number(setting.Shoot.RECOIL_PER_METER) /
      gv.config.Difficulty.Multipliers.RecoilMult; */
  }

  static SetupFullAutoFireRateMultiplier(setting: Difficulty) {
    //how long hold down the trigger with automatic fire
    setting.Shoot.BASE_AUTOMATIC_TIME =
      Number(setting.Shoot.BASE_AUTOMATIC_TIME) /
      gv.config.Difficulty.Multipliers.FullAutoFireRateMult;
  }

  static SetupVisibleDistanceMultiplier(setting: Difficulty) {
    //set min floor of 50 meters for visble distance
    if (Number(setting.Core.VisibleDistance) < 50) {
      setting.Core.VisibleDistance = 50;
    } else {
      setting.Core.VisibleDistance =
        Number(setting.Core.VisibleDistance) *
        gv.config.Difficulty.Multipliers.VisibleDistanceMult;
    }

    setting.Shoot.MAX_DIST_COEF =
      Number(setting.Shoot.MAX_DIST_COEF) *
      gv.config.Difficulty.Multipliers.VisibleDistanceMult;
  }

  //makes them move wierdly if too high
  static SetupVisionSpeedMultiplier(setting: Difficulty) {
    setting.Core.GainSightCoef =
      Number(setting.Core.GainSightCoef) /
      gv.config.Difficulty.Multipliers.VisionSpeedMult;
  }

  static SetupShotSpreadMultiplier(setting: Difficulty) {
    //method that has all the shot spread multipliers
    setting.Scattering.MaxScatter =
      Number(setting.Scattering.MaxScatter) /
      gv.config.Difficulty.Multipliers.ShotSpreadMult;
    setting.Scattering.MinScatter =
      Number(setting.Scattering.MinScatter) /
      gv.config.Difficulty.Multipliers.ShotSpreadMult;
    setting.Shoot.AUTOMATIC_FIRE_SCATTERING_COEF =
      Number(setting.Shoot.AUTOMATIC_FIRE_SCATTERING_COEF) /
      gv.config.Difficulty.Multipliers.ShotSpreadMult;
  }

  private static SetupAimSpeedMultiplier(setting: Difficulty) {
    //method that has all the aim speed multipliers

    //zeroing speed factor
    setting.Aiming.BETTER_PRECICING_COEF =
      Number(setting.Aiming.BETTER_PRECICING_COEF) *
      gv.config.Difficulty.Multipliers.AimSpeedMult;
    //aim speed factor when blinded
    setting.Aiming.FLASH_ACCURATY =
      Number(setting.Aiming.FLASH_ACCURATY) /
      gv.config.Difficulty.Multipliers.AimSpeedMult;
    //aim speed factor when in smoke
    setting.Aiming.SMOKE_ACCURATY =
      Number(setting.Aiming.SMOKE_ACCURATY) /
      gv.config.Difficulty.Multipliers.AimSpeedMult;
    //Reacquire target speed factor when in smoke
    setting.Aiming.SMOKE_GAIN_SIGHT =
      Number(setting.Aiming.SMOKE_GAIN_SIGHT) /
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
    POOPDifficulty.changeHealth(
      POOPDifficulty.ConvertStringToIBotBaseArray(ScavTypes),
      ScavMult
    );
    POOPDifficulty.changeHealth(
      POOPDifficulty.ConvertStringToIBotBaseArray(RaiderTypes),
      RaiderMult
    );
    POOPDifficulty.changeHealth(
      POOPDifficulty.ConvertStringToIBotBaseArray(BossTypes),
      BossMul
    );
    POOPDifficulty.changeHealth(
      POOPDifficulty.ConvertStringToIBotBaseArray(CultistTypes),
      CultistMult
    );
  }

  static ConvertStringToIBotBaseArray(botArray: string[]): IBotBase[] {
    let botBaseArray: IBotBase[] = [];
    for (let bot in botArray) {
      botBaseArray.push(gv.botTypes[botArray[bot]]);
    }
    return botBaseArray;
  }

  static setBotTalkConfig(botType: string, config: boolean) {
    let bot: IBotType = gv.botTypes[botType];

    bot.difficulty["easy"].Mind.CAN_TALK = config;
    bot.difficulty["normal"].Mind.CAN_TALK = config;
    bot.difficulty["hard"].Mind.CAN_TALK = config;
    bot.difficulty["impossible"].Mind.CAN_TALK = config;

    gv.CoreAITemplate[botType];
  }

  static NoTalking() {
    //need to make sure difficulty settings don't override this
    //go through ScavTypes, PmcTypes, RaiderTypes, RogueTypes, BossTypes, and FollowerTypes and set CAN_TALK based on gv.config.AIChanges.AllowBotsToTalk
    for (let scav in ScavTypes) {
      POOPDifficulty.setBotTalkConfig(
        ScavTypes[scav],
        gv.config.AIChanges.AllowBotsToTalk.Scavs
      );
    }
    for (let pmc in PmcTypes) {
      POOPDifficulty.setBotTalkConfig(
        PmcTypes[pmc],
        gv.config.AIChanges.AllowBotsToTalk.PMCs
      );
    }
    for (let raider in RaiderTypes) {
      POOPDifficulty.setBotTalkConfig(
        RaiderTypes[raider],
        gv.config.AIChanges.AllowBotsToTalk.Raiders
      );
    }
    for (let rogue in RogueTypes) {
      POOPDifficulty.setBotTalkConfig(
        RogueTypes[rogue],
        gv.config.AIChanges.AllowBotsToTalk.Rogues
      );
    }
    for (let boss in BossTypes) {
      POOPDifficulty.setBotTalkConfig(
        BossTypes[boss],
        gv.config.AIChanges.AllowBotsToTalk.Bosses
      );
    }
    for (let follower in FollowerTypes) {
      POOPDifficulty.setBotTalkConfig(
        FollowerTypes[follower],
        gv.config.AIChanges.AllowBotsToTalk.Followers
      );
    }
  }
}
