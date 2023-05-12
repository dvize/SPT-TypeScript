import { GlobalValues as gv } from "./GlobalValues";
import { IBotType } from "@spt-aki/models/eft/common/tables/IBotType";
import { Difficulty } from "@spt-aki/models/eft/common/tables/IBotType";

export class RecordSkills {
  static recordSkills() {
    gv.logger.info("POOP: Recording Skills");

    //create a skill value type to use in the record
    type skillvalue = number | string | boolean;

    //grab botTypes Difficulties and grab the lower, middle, middle-upper, and upper value ranges for each category of each difficulty and write to botType as filename in mod folder
    for (let i in gv.botTypes) {
      gv.logger.info("POOP: is looking at bottype: " + i);

      // Create a Map to store the values for each category and it needs to be clear each time we loop through a new bot
      let storage = new Map<string, skillvalue[]>();

      let bot: IBotType = gv.botTypes[i];
      //loop through each difficulty of a bot and combine them from the different difficulties into one array

      for (let j of ["easy", "normal", "hard", "impossible"]) {
        let settings: Difficulty = bot.difficulty[j];

        gv.logger.info("POOP: is looking at difficulty: " + j);
        //loop through the keys within the categories like shooting, movement, etc

        // Loop through the keys within the categories like shooting, movement, etc
        for (let category in settings) {
          gv.logger.info("POOP: is looking at category: " + category);

          // Loop through the values within the category and add them to the storage Map
          for (let key in settings[category]) {
            gv.logger.info("POOP: is looking at setting: " + key);

            // Check if the storage Map already has an entry for this key
            let mykey: string = category + "." + key;
            if (!storage.has(mykey)) {
              // If not, create a new entry with an empty array
              storage.set(mykey, []);
            }

            // Add the value to the array associated with this key in the storage Map
            storage.get(mykey).push(settings[category][key]);
            //output the stringify of the storage key and value
            gv.logger.info(
              "POOP: " + key + " " + JSON.stringify(storage.get(mykey))
            );
          }
        }
      }

      // Convert the storage Map to an object
      let storageObj = Object.fromEntries(storage);

      // Write the storage object to a file as JSON
      let filePath = gv.modFolder + "/ranges/" + i + ".json";
      let fs = require("fs");

      gv.logger.info(`POOP: Writing to ${filePath}`);
      fs.writeFile(filePath, JSON.stringify(storageObj), function (err) {
        if (err) throw err;
        console.log(i + "Saved!");
      });
    }
  }

  //read the jsons in ranges folder and filter all values within them where the array doesn't have a value change
  static filterSkills() {
    gv.logger.info("POOP: Filtering Skills");

    //create a skill value type to use in the record
    type skillvalue = number | string | boolean;

    //read json files in ranges folder
    let fs = require("fs");
    let path = require("path");
    let directoryPath = path.join(gv.modFolder, "ranges");
    fs.readdir(directoryPath, function (err, files) {
      //handling error
      if (err) {
        return console.log("Unable to scan directory: " + err);
      }
      //listing all files using forEach
      files.forEach(function (file) {
        let fsv = require("fs");
        gv.logger.info(`POOP: Reading ${file}`);

        //read the file using filestream
        let fileData = fsv.readFileSync(gv.modFolder + "/ranges/" + file);
        fileData = JSON.parse(fileData);

        // Loop through the keys within the categories like shooting, movement, etc
        for (let setting in fileData) {
          gv.logger.info("POOP: is looking at Setting: " + setting);

          // Loop through the values within the category and add them to the storage Map
          for (let element in fileData[setting]) {
            gv.logger.info("POOP: is looking at element: " + element);

            // Output the stringify of the storage key and value
            gv.logger.info(
              "POOP: element " +
                element +
                " " +
                JSON.stringify(fileData[setting][element])
            );

            // Check if fileData[setting] is an array
            if (Array.isArray(fileData[setting])) {
              // Check if all elements in the array are equal
              gv.logger.info(
                `arrayequal: ${fileData[setting].every(
                  (val, i, arr) => val === arr[0]
                )}`
              );
              if (fileData[setting].every((val, i, arr) => val === arr[0])) {
                // If all elements are equal, delete the setting
                gv.logger.info(
                  "POOP: Deleting the setting because all elements the same in: " +
                    setting
                );
                delete fileData[setting];
                break;
              }
            }
          }
        }

        //write the file back to the ranges folder
        let fsx = require("fs");
        let rangesFolder = gv.modFolder + "/ranges";
        // Check if the "ranges" folder exists, create it if it doesn't
        if (!fsx.existsSync(rangesFolder)) {
          fsx.mkdirSync(rangesFolder);
        }

        // Write the file back to the ranges folder
        gv.logger.info(`POOP: Writing to ${file}`);
        fsx.writeFile(
          rangesFolder + "/" + file,
          JSON.stringify(fileData),
          function (err) {
            if (err) {
              gv.logger.error(`Error writing file: ${err}`);
            } else {
              console.log(file + " Saved!");
            }
          }
        );
      });
    });
  }
}
