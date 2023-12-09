"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Mod {
    postDBLoad(container) {
        // Resolve the CustomItemService container
        const CustomItem = container.resolve("CustomItemService");
        //read the items.json file with type ItemsJson
        const itemsjson = require("../database/templates/items.json");
        setupItems(itemsjson, CustomItem);
    }
    //Check if our item is in the server or not
    postAkiLoad(container) {
        const db = container.resolve("DatabaseServer");
        const item = db.getTables().templates.items;
        console.log("DoorBreacher: Added the following items:");
        console.log(item["doorbreacher"]._props);
        console.log(item["doorbreacherbox"]._props);
        ModifyAmmoPropForWeapons(db);
        console.log("DoorBreacher: Finished Modifying Ammo Properties for Weapons");
    }
}
module.exports = { mod: new Mod() };
function setupItems(itemsjson, CustomItem) {
    //make locale for DoorBreacher
    const DoorBreacherLocale = {
        en: {
            name: "12/70 Door-Breaching Round",
            shortName: "Breach",
            description: "The door-breaching round is designed to destroy deadbolts, locks, and hinges without risking lives by ricocheting or penetrating through doors. These frangible rounds are made of a dense sintered material which can destroy a lock or hinge and then immediately disperse.",
        },
    };
    //add new custom item
    const DoorBreacher = {
        newItem: itemsjson.doorbreacher,
        fleaPriceRoubles: 8000,
        handbookPriceRoubles: 10000,
        handbookParentId: "5b47574386f77428ca22b33b",
        locales: DoorBreacherLocale,
    };
    //make locale for DoorBreacherBox
    const DoorBreacherBoxLocale = {
        en: {
            name: "12/70 Door-Breaching 5-Round Box",
            shortName: "Breach",
            description: "A 5-round box of 12ga door breaching shells. The door-breaching round is designed to destroy deadbolts, locks, and hinges without risking lives by ricocheting or penetrating through doors.  These frangible rounds are made of a dense sintered material which can destroy a lock or hinge and then immediately disperse.",
        },
    };
    //add new custom item
    const DoorBreacherBox = {
        newItem: itemsjson.doorbreacherbox,
        fleaPriceRoubles: 40000,
        handbookPriceRoubles: 50000,
        handbookParentId: "5b47574386f77428ca22b33c",
        locales: DoorBreacherBoxLocale,
    };
    //create the items
    CustomItem.createItem(DoorBreacher);
    CustomItem.createItem(DoorBreacherBox);
}
function ModifyAmmoPropForWeapons(db) {
    const chambersData = [
        { name: "patron_in_weapon", index: 0 },
        { name: "patron_in_weapon_000", index: 1 },
        { name: "patron_in_weapon_001", index: 2 },
        { name: "cartridges", index: 3 },
    ];
    const isItemSlotsExist = (item) => item._props.Chambers && item._props.Chambers.length > 0;
    const filtersIncludeAttachment = (filterArray) => filterArray.includes("560d5e524bdc2d25448b4571");
    for (const item of Object.values(db.getTables().templates.items)) {
        if (isItemSlotsExist(item)) {
            for (const chamberData of chambersData) {
                const index = chamberData.index;
                const chamberName = chamberData.name;
                const chambers = item._props.Chambers;
                const isModFilterExist = (Chambers) => Chambers.findIndex((chamber) => chamber._name === chamberName);
                const indexInChambers = isModFilterExist(chambers);
                if (indexInChambers > -1 &&
                    filtersIncludeAttachment(chambers[indexInChambers]._props.filters[0].Filter)) {
                    //write to console the chamber name and the item.name
                    console.log("DoorBreacher added to: " +
                        item._name +
                        " in chamber: " +
                        chamberName);
                    chambers[indexInChambers]._props.filters[0].Filter.push("doorbreacher");
                }
            }
        }
    }
}
