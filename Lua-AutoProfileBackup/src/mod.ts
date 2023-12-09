import fs from "fs";
import { DependencyContainer } from "tsyringe";
import { IPreAkiLoadMod } from "@spt-aki/models/external/IPreAkiLoadMod";
import { IPostDBLoadMod } from "@spt-aki/models/external/IPostDBLoadMod";
import { IPostAkiLoadMod } from "@spt-aki/models/external/IPostAkiLoadMod";
import { SaveServer } from "@spt-aki/servers/SaveServer";
import { ILogger } from "@spt-aki/models/spt/utils/ILogger";
import { LogBackgroundColor } from "@spt-aki/models/spt/logging/LogBackgroundColor";
import { LogTextColor } from "@spt-aki/models/spt/logging/LogTextColor";
import { StaticRouterModService } from "@spt-aki/services/mod/staticRouter/StaticRouterModService";
import { VFS } from "@spt-aki/utils/VFS";

import { jsonc } from "jsonc";
import path from "path";
import { Watermark } from "@spt-aki/utils/Watermark";

import pkg from "../package.json";

class Mod implements IPreAkiLoadMod, IPostDBLoadMod, IPostAkiLoadMod 
{
    readonly modName = `${pkg.author}-${pkg.name}`;
    private modConfig: any;
    private logger: ILogger;
    private vfs: VFS;
    protected profilePath: string;
    protected akiVersion: string;

    public preAkiLoad(container: DependencyContainer): void 
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
                        action: (
                            url: string,
                            info: any,
                            sessionID: string,
                            output: string
                        ): any => 
                        {
                            this.onEvent("onGameStart", sessionID);
                            return output;
                        }
                    }
                ],
                "aki"
            );
        }

        if (this.modConfig?.AutoBackup?.OnRaidStart) 
        {
            staticRouterModService.registerStaticRouter(
                `${this.modName}-/client/raid/configuration`,
                [
                    {
                        url: "/client/raid/configuration",
                        action: (
                            url: string,
                            info: any,
                            sessionID: string,
                            output: string
                        ): any => 
                        {
                            this.onEvent("onRaidStart", sessionID);
                            return output;
                        }
                    }
                ],
                "aki"
            );
        }

        if (this.modConfig?.AutoBackup?.OnRaidEnd) 
        {
            staticRouterModService.registerStaticRouter(
                `${this.modName}-/raid/profile/save`,
                [
                    {
                        url: "/raid/profile/save",
                        action: (
                            url: string,
                            info: any,
                            sessionID: string,
                            output: string
                        ): any => 
                        {
                            this.onEvent("onRaidEnd", sessionID);
                            return output;
                        }
                    }
                ],
                "aki"
            );
        }
    }

    public postAkiLoad(container: DependencyContainer): void 
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
        this.akiVersion = container.resolve<Watermark>("Watermark").getVersionTag();
    }

    public onEvent(event: string, sessionID: string) 
    {
        const sessionPath = `${this.profilePath}/AutoBackup/${this.akiVersion}/${sessionID}/`;

        if (!this.vfs.exists(sessionPath)) 
        {
            this.logger.success(`${this.modName}: "${sessionPath}" has been created`);
            this.vfs.createDir(sessionPath);
        }

        if (this.modConfig?.MaximumBackupPerProfile >= 0) 
        {
            const profileList = this.vfs
                .getFilesOfType(sessionPath, "json")
                .sort(function (a, b) 
                {
                    return fs.statSync(a).ctimeMs - fs.statSync(b).ctimeMs;
                });
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
