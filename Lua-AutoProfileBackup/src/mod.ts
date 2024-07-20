import fs from "node:fs";
import type { DependencyContainer } from "tsyringe";
import type { IPreSptLoadMod } from "@spt/models/external/IPreSptLoadMod";
import type { IPostDBLoadMod } from "@spt/models/external/IPostDBLoadMod";
import type { IPostSptLoadMod } from "@spt/models/external/IPostSptLoadMod";
import type { SaveServer } from "@spt/servers/SaveServer";
import type { ILogger } from "@spt/models/spt/utils/ILogger";
import { LogBackgroundColor } from "@spt/models/spt/logging/LogBackgroundColor";
import { LogTextColor } from "@spt/models/spt/logging/LogTextColor";
import type { StaticRouterModService } from "@spt/services/mod/staticRouter/StaticRouterModService";
import type { VFS } from "@spt/utils/VFS";
import type { ModConfig } from "./interface";

import { jsonc } from "jsonc";

import path from "node:path";
import type { Watermark } from "@spt/utils/Watermark";

import pkg from "../package.json";

export class Mod implements IPreSptLoadMod, IPostDBLoadMod, IPostSptLoadMod 
{
    readonly modName = `${pkg.author}-${pkg.name}`;
    private modConfig: ModConfig;
    private logger: ILogger;
    private vfs: VFS;
    protected profilePath: string;
    protected sptVersion: string;

    public preSptLoad(container: DependencyContainer) : void 
    {
        const staticRouterModService: StaticRouterModService =
      container.resolve<StaticRouterModService>("StaticRouterModService");

        // get logger
        this.logger = container.resolve<ILogger>("WinstonLogger");

        // Get VFS to read in configs
        this.vfs = container.resolve<VFS>("VFS");

        // Read in the json c config content and parse it into json
        this.modConfig = jsonc.parse(this.vfs.readFile(path.resolve(__dirname, "../config/config.jsonc")));

        if (this.modConfig?.AutoBackup?.OnGameStart) 
        {
            staticRouterModService.registerStaticRouter(
                `${this.modName}-/client/game/start`,
                [
                    {
                        url: "/client/game/start",
                        action: async (url, info, sessionId, output) : Promise<string> =>
                        {
                            this.onEvent("onGameStart", sessionId);
                            return output;
                        }
                    }
                ],
                "spt"
            );
        }

        if (this.modConfig?.AutoBackup?.OnRaidStart) 
        {
            staticRouterModService.registerStaticRouter(
                `${this.modName}-/client/raid/configuration`,
                [
                    {
                        url: "/client/raid/configuration",
                        action: async (url, info, sessionId, output) : Promise<string> =>
                        {
                            this.onEvent("onRaidStart", sessionId);
                            return output;
                        }
                    }
                ],
                "spt"
            );
        }

        if (this.modConfig?.AutoBackup?.OnRaidEnd) 
        {
            staticRouterModService.registerStaticRouter(
                `${this.modName}-/raid/profile/save`,
                [
                    {
                        url: "/raid/profile/save",
                        action: async (url, info, sessionId, output) : Promise<string> =>
                        {
                            this.onEvent("onRaidEnd", sessionId);
                            return output;
                        }
                    }
                ],
                "spt"
            );
        }

        if (this.modConfig?.AutoBackup?.OnLogout) 
        {
            staticRouterModService.registerStaticRouter(
                `${this.modName}-/client/game/logout`,
                [
                    {
                        url: "/client/game/logout",
                        action: async (url, info, sessionId, output) : Promise<string> =>
                        {
                            this.onEvent("onLogout", sessionId);
                            return output;
                        }
                    }
                ],
                "spt"
            );
        }
    }

    public postSptLoad(container: DependencyContainer): void 
    {
        const saveServer = container.resolve<SaveServer>("SaveServer");
        for (const profileKey in saveServer.getProfiles()) 
        {
            const sessionID = saveServer.getProfile(profileKey).info.id;
            if (sessionID !== profileKey) 
            {
                saveServer.deleteProfileById(profileKey);
                fs.rename(
                    `${this.profilePath}/${profileKey}.json`,
                    `${this.profilePath}/${sessionID}.json`,
                    () => 
                    {
                        saveServer.loadProfile(sessionID);
                    }
                );
                this.logger.info(
                    `${this.modName}: Profile "${profileKey}.json" => "${sessionID}.json" name fixed`
                );
            }
        }
    }

    public postDBLoad(container: DependencyContainer): void 
    {
        this.logger = container.resolve<ILogger>("WinstonLogger");
        this.logger.info(
            `Loading: ${this.modName} ${pkg.version}${
                this.modConfig.Enabled ? "" : " [Disabled]"
            }`
        );
        if (!this.modConfig.Enabled) 
        {
            return;
        }

        const dirArray = __dirname.split("\\");
        this.profilePath = `${dirArray[dirArray.length - 4]}/profiles`; // Pon, Pin, Fon, Fin
        this.vfs = container.resolve<VFS>("VFS");
        this.sptVersion = container.resolve<Watermark>("Watermark").getVersionTag();
    }

    public onEvent(event: string, sessionID: string) : void
    {
        const sessionPath = `${this.profilePath}/AutoBackup/${this.sptVersion}/${sessionID}/`;

        if (!this.vfs.exists(sessionPath)) 
        {
            this.logger.success(`${this.modName}: "${sessionPath}" has been created`);
            this.vfs.createDir(sessionPath);
        }

        if (this.modConfig?.MaximumBackupPerProfile >= 0) 
        {
            const profileList = this.vfs
                .getFilesOfType(sessionPath, "json")
                .sort((a, b) => fs.statSync(a).ctimeMs - fs.statSync(b).ctimeMs);
            let delCount = 0;
            let fileName = "";

            while (
                profileList.length &&
        profileList.length >= this.modConfig.MaximumBackupPerProfile
            ) 
            {
                const lastProfile = profileList[0];
                fileName = lastProfile.split("\\").pop();
                this.vfs.removeFile(lastProfile);
                profileList.splice(0, 1);
                delCount++;
            }

            if (this.modConfig?.MaximumBackupDeleteLog) 
            {
                if (delCount === 1) 
                {
                    this.logger.log(
                        `${this.modName} @ ${sessionID}: Maximum backup reached (${this.modConfig.MaximumBackupPerProfile}), Backup file "${fileName}" deleted`,
                        LogTextColor.RED,
                        LogBackgroundColor.DEFAULT
                    );
                }
                else if (delCount > 1) 
                {
                    this.logger.log(
                        `${this.modName} @ ${sessionID}: Maximum backup reached (${this.modConfig.MaximumBackupPerProfile}), Total "${delCount}" backup files deleted`,
                        LogTextColor.RED,
                        LogBackgroundColor.DEFAULT
                    );
                }
            }
        }

        const backupFileName = `${event}-${new Date()
            .toISOString()
            .replace(/[:.]/g, "")}.json`;
        this.vfs.copyFile(
            `${this.profilePath}/${sessionID}.json`,
            `${sessionPath}${backupFileName}`
        );
        if (this.modConfig?.BackupSavedLog) 
        {
            this.logger.log(
                `${this.modName} @ ${sessionID}: New backup file "${backupFileName}" saved`,
                LogTextColor.WHITE,
                LogBackgroundColor.MAGENTA
            );
        }
    }
}

module.exports = { mod: new Mod() };
