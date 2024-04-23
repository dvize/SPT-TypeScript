"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FluentAssortConstructor = void 0;
class FluentAssortConstructor {
    itemsToSell = [];
    barterScheme = {};
    loyaltyLevel = {};
    hashUtil;
    logger;
    constructor(hashutil, logger) {
        this.hashUtil = hashutil;
        this.logger = logger;
    }
    /**
     * Start selling item with tpl
     * @param itemTpl Tpl id of the item you want trader to sell
     * @param itemId Optional - set your own Id, otherwise unique id will be generated
     */
    createSingleAssortItem(itemTpl, itemId = undefined) {
        // Create item ready for insertion into assort table
        const newItemToAdd = {
            _id: !itemId ? this.hashUtil.generate() : itemId,
            _tpl: itemTpl,
            parentId: "hideout", // Should always be "hideout"
            slotId: "hideout", // Should always be "hideout"
            upd: {
                UnlimitedCount: false,
                StackObjectsCount: 100
            }
        };
        this.itemsToSell.push(newItemToAdd);
        return this;
    }
    createComplexAssortItem(items) {
        items[0].parentId = "hideout";
        items[0].slotId = "hideout";
        if (!items[0].upd) {
            items[0].upd = {};
        }
        items[0].upd.UnlimitedCount = false;
        items[0].upd.StackObjectsCount = 100;
        this.itemsToSell.push(...items);
        return this;
    }
    addStackCount(stackCount) {
        this.itemsToSell[0].upd.StackObjectsCount = stackCount;
        return this;
    }
    addUnlimitedStackCount() {
        this.itemsToSell[0].upd.StackObjectsCount = 999999;
        this.itemsToSell[0].upd.UnlimitedCount = true;
        return this;
    }
    makeStackCountUnlimited() {
        this.itemsToSell[0].upd.StackObjectsCount = 999999;
        return this;
    }
    addBuyRestriction(maxBuyLimit) {
        this.itemsToSell[0].upd.BuyRestrictionMax = maxBuyLimit;
        this.itemsToSell[0].upd.BuyRestrictionCurrent = 0;
        return this;
    }
    addLoyaltyLevel(level) {
        this.loyaltyLevel[this.itemsToSell[0]._id] = level;
        return this;
    }
    addMoneyCost(currencyType, amount) {
        this.barterScheme[this.itemsToSell[0]._id] = [
            [
                {
                    count: amount,
                    _tpl: currencyType
                }
            ]
        ];
        return this;
    }
    addBarterCost(itemTpl, count) {
        const sellableItemId = this.itemsToSell[0]._id;
        // No data at all, create
        if (Object.keys(this.barterScheme).length === 0) {
            this.barterScheme[sellableItemId] = [[
                    {
                        count: count,
                        _tpl: itemTpl
                    }
                ]];
        }
        else {
            // Item already exists, add to
            const existingData = this.barterScheme[sellableItemId][0].find(x => x._tpl === itemTpl);
            if (existingData) {
                // itemtpl already a barter for item, add to count
                existingData.count += count;
            }
            else {
                // No barter for item, add it fresh
                this.barterScheme[sellableItemId][0].push({
                    count: count,
                    _tpl: itemTpl
                });
            }
        }
        return this;
    }
    /**
     * Reset objet ready for reuse
     * @returns
     */
    export(data) {
        const itemBeingSoldId = this.itemsToSell[0]._id;
        if (data.assort.items.find(x => x._id === itemBeingSoldId)) {
            this.logger.error(`Unable to add complex item with item key ${this.itemsToSell[0]._id}, key already used`);
            return;
        }
        data.assort.items.push(...this.itemsToSell);
        data.assort.barter_scheme[itemBeingSoldId] = this.barterScheme[itemBeingSoldId];
        data.assort.loyal_level_items[itemBeingSoldId] = this.loyaltyLevel[itemBeingSoldId];
        this.itemsToSell = [];
        this.barterScheme = {};
        this.loyaltyLevel = {};
        return this;
    }
}
exports.FluentAssortConstructor = FluentAssortConstructor;
//# sourceMappingURL=fluentTraderAssortCreator.js.map