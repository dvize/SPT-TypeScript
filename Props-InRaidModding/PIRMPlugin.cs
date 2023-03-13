using System;
using BepInEx;
using BepInEx.Configuration;
using UnityEngine;
using EFT;
using System.IO;
using System.Reflection;
using PIRM;
using EFT.InventoryLogic;
using System.Linq;
using HarmonyLib;
using System.Collections.Generic;

namespace PIRM
{

    [BepInPlugin("com.dvize.PIRM", "dvize.PIRM", "1.5.0")]
    class PIRMPlugin : BaseUnityPlugin
    { 
        private void Start()
        {
            new PIRMMethod17Patch().Enable();
            new PIRMGlass2426Smethod1().Enable();
            new SlotViewMethod2().Enable();
            new EFTInventoryLogicModPatch().Enable();


            //Extras?  Check again later
            //new PIRMGlass2426Smethod2().Enable();
            //new Glass2426CheckMissingParts().Enable();
            //new SetRaidModdablePatch().Enable();
            //new ModSlotViewPatch().Enable();


        }

    }
}
