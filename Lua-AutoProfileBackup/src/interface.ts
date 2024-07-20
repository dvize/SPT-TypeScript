export interface ModConfig 
{
    Enabled: boolean;
    BackupSavedLog: boolean;
    MaximumBackupDeleteLog: boolean;
    MaximumBackupPerProfile: number;
    AutoBackup: AutoBackup;
}

export interface AutoBackup 
{
    OnGameStart: boolean;
    OnRaidStart: boolean;
    OnRaidEnd: boolean;
    OnLogout: boolean;
}