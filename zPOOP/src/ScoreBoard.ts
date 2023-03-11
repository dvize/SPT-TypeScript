import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { GlobalValues as gv } from './GlobalValuesModule';


    interface ScoreData {
    playerID: string;
    scoreID: string;
    score: number;
    timestamp: string;
    }

    interface PlayerData {
    lastScoreTimestamp: string;
    }

    const scoresFilePath = path.resolve(gv.modFolder, '/donottouch/progress.json');
    const key = 'mysecretkey'; // secret key
    const algorithm = 'aes-256-cbc';
    const iv = crypto.randomBytes(16);

    export function encrypt(data: any) { 
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }

    export function decrypt(encrypted: string) {
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return JSON.parse(decrypted);
    }

    export function writeScores(scores: any) {
        const encryptedScores = encrypt(scores);
        fs.writeFileSync(scoresFilePath, encryptedScores);
    }

    export function readScores() {
        const encryptedScores = fs.readFileSync(scoresFilePath, 'utf8');
        return decrypt(encryptedScores);
    }

    function addScore(scoreData: ScoreData) {
        const scores = readScores();
        const { playerID, scoreID, score, timestamp } = scoreData;
        const playerScores = scores[playerID];
        const lastScoreTimestamp = playerScores ? playerScores.lastScoreTimestamp : null;
        const hoursSinceLastScore = lastScoreTimestamp
            ? (Date.now() - Date.parse(lastScoreTimestamp)) / 1000 / 3600
            : Infinity;
        
        if (hoursSinceLastScore < 24) {
            console.log(`Cannot add score for player ${playerID}, wait for ${24 - hoursSinceLastScore} hours`);
            return;
        }
        
        if (playerScores) {
            // Player already exists, update their score
            playerScores[scoreID] = scoreData;
            playerScores.lastScoreTimestamp = timestamp;
        } else {
            // Player does not exist, create a new score with the playerID as the key
            scores[playerID] = {
            [scoreID]: scoreData,
            lastScoreTimestamp: timestamp
            };
        }
        
        writeScores(scores);
        console.log(`Score added for player ${playerID}: ${score}`);
    }



