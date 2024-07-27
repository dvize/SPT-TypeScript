// license: NCSA
// copyright: Fin
// authors: Fin, Props (updated)

import { inject, type DependencyContainer } from "tsyringe";
import type { IPostDBLoadMod } from "@spt/models/external/IPostDBLoadMod";
import type { AbstractWinstonLogger } from '@spt/utils/logging/AbstractWinstonLogger';
import type { DatabaseServer } from "@spt/servers/DatabaseServer";
import type { VFS } from "@spt/utils/VFS";
import { jsonc } from "jsonc";
import path from "node:path";
import type { ITemplateItem } from "@spt/models/eft/common/tables/ITemplateItem";

interface ModConfig {
  distortion_Multiplier: number;
  ambient_noise_reduction_multiplier: number;
  maximum_helmet_deafness: string;
  full_Stat_Control: boolean;
  stats: Stats;
}

interface Stats {
  CompressorTreshold: number;
  CompressorAttack: number;
  CompressorRelease: number;
  CompressorGain: number;
  CutoffFreq: number;
  Resonance: number;
  CompressorVolume: number;
  DryVolume: number;
}

//Code
class FESMod implements IPostDBLoadMod {
  private modConfig: ModConfig;
  private logger: AbstractWinstonLogger;
  private vfs: VFS;

  public async postDBLoad(container: DependencyContainer): Promise<void> {
    this.logger = container.resolve<AbstractWinstonLogger>("WinstonLogger");
    this.vfs = container.resolve<VFS>("VFS");

    this.modConfig = await this.loadConfig();
    this.logger.info("FESMod: Config loaded successfully");
    const databaseServer = container.resolve<DatabaseServer>("DatabaseServer");
    this.quieterHeadsets(databaseServer);
  }

  private async loadConfig(): Promise<ModConfig> {
    const configFile = path.resolve(__dirname, "../config/config.jsonc");
    try {
      const configContent = await this.vfs.readFile(configFile);
      return jsonc.parse(configContent);
    } catch (error) {
      this.logger.error(`FESMod: Error loading config from ${configFile}: ${error}`);
      throw new Error('FESMod: Configuration load failed');
    }
  }

  public quieterHeadsets(databaseServer: DatabaseServer): void {
    const database = databaseServer.getTables();
    this.logger.info("FESMod: Processing Headphone and Deafness Related Items");

    // biome-ignore lint/complexity/noForEach: <explanation>
    Object.entries(database.templates.items).forEach(([itemID, item]: [string, ITemplateItem]) => {
      if (item._parent === "5645bcb74bdc2ded0b8b4578") {
        this.applyAudioSettings(item);
      }
      if (item._props.DeafStrength && item._parent === "5a341c4086f77401f2541505") {
        this.applyDeafStrength(item);
      }
    });
  }

  private applyAudioSettings(item: ITemplateItem): void {
    if (this.modConfig.full_Stat_Control) {
      Object.assign(item._props, this.modConfig.stats);
    } else {
      item._props.Distortion *= this.modConfig.distortion_Multiplier;
      item._props.AmbientVolume *= this.modConfig.ambient_noise_reduction_multiplier;
    }
  }

  private applyDeafStrength(item: ITemplateItem): void {
    item._props.DeafStrength = this.modConfig.maximum_helmet_deafness;
  }
}

module.exports = { mod: new FESMod() };