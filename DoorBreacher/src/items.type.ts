import { ITemplateItem } from "@spt-aki/models/eft/common/tables/ITemplateItem";

export interface ItemsJson {
  doorbreacher: ITemplateItem;
  doorbreacherbox: ITemplateItem;
}

export interface doorbreacher {
  _id: string;
  _name: string;
  _parent: string;
  _type: string;
  _props: _props;
  _proto: string;
}

export interface _props {
  ammoCaliber?: string;
  StackSlots?: StackSlots[];
  filters?: Filters[];
  InsuranceDisabled?: boolean;
  QuestStashMaxCount?: number;
  IsSpecialSlotOnly?: boolean;
  IsUnremovable?: boolean;
  ammoType?: string;
  InitialSpeed?: number;
  BallisticCoeficient?: number;
  BulletMassGram?: number;
  BulletDiameterMilimeters?: number;
  Damage?: number;
  ammoAccr?: number;
  ammoRec?: number;
  ammoDist?: number;
  buckshotBullets?: number;
  PenetrationPower?: number;
  PenetrationPowerDiviation?: number;
  ammoHear?: number;
  ammoSfx?: string;
  MisfireChance?: number;
  MinFragmentsCount?: number;
  MaxFragmentsCount?: number;
  ammoShiftChance?: number;
  casingName?: string;
  casingEjectPower?: number;
  casingMass?: number;
  casingSounds?: string;
  ProjectileCount?: number;
  PenetrationChance?: number;
  RicochetChance?: number;
  FragmentationChance?: number;
  Deterioration?: number;
  SpeedRetardation?: number;
  Tracer?: boolean;
  TracerColor?: string;
  TracerDistance?: number;
  ArmorDamage?: number;
  Caliber?: string;
  StaminaBurnPerDamage?: number;
  HeavyBleedingDelta?: number;
  LightBleedingDelta?: number;
  ShowBullet?: boolean;
  HasGrenaderComponent?: boolean;
  FuzeArmTimeSec?: number;
  ExplosionStrength?: number;
  MinExplosionDistance?: number;
  MaxExplosionDistance?: number;
  FragmentsCount?: number;
  FragmentType?: string;
  ShowHitEffectOnExplode?: boolean;
  ExplosionType?: string;
  AmmoLifeTimeSec?: number;
  Contusion?: Contusion;
  ArmorDistanceDistanceDamage?: ArmorDistanceDistanceDamage;
  Blindness?: Blindness;
  IsLightAndSoundShot?: boolean;
  LightAndSoundShotAngle?: number;
  LightAndSoundShotSelfContusionTime?: number;
  LightAndSoundShotSelfContusionStrength?: number;
  MalfMisfireChance?: number;
  DurabilityBurnModificator?: number;
  HeatFactor?: number;
  MalfFeedChance?: number;
  RemoveShellAfterFire?: boolean;
  Name?: string;
  ShortName?: string;
  Description?: string;
  Weight?: number;
  BackgroundColor?: string;
  Width?: number;
  Height?: number;
  StackMaxSize?: number;
  ItemSound?: string;
  Prefab?: Prefab;
  UsePrefab?: UsePrefab;
  StackObjectsCount?: number;
  NotShownInSlot?: boolean;
  ExaminedByDefault?: boolean;
  ExamineTime?: number;
  IsUndiscardable?: boolean;
  IsUnsaleable?: boolean;
  IsUnbuyable?: boolean;
  IsUngivable?: boolean;
  IsLockedafterEquip?: boolean;
  QuestItem?: boolean;
  LootExperience?: number;
  ExamineExperience?: number;
  HideEntrails?: boolean;
  RepairCost?: number;
  RepairSpeed?: number;
  ExtraSizeLeft?: number;
  ExtraSizeRight?: number;
  ExtraSizeUp?: number;
  ExtraSizeDown?: number;
  ExtraSizeForceAdd?: boolean;
  MergesWithChildren?: boolean;
  CanSellOnRagfair?: boolean;
  CanRequireOnRagfair?: boolean;
  ConflictingItems?: unknown[];
  Unlootable?: boolean;
  UnlootableFromSlot?: string;
  UnlootableFromSide?: unknown[];
  AnimationVariantsNumber?: number;
  DiscardingBlock?: boolean;
  RagFairCommissionModifier?: number;
  IsAlwaysAvailableForInsurance?: boolean;
  DiscardLimit?: number;
  DropSoundType?: string;
  StackMinRandom?: number;
  StackMaxRandom?: number;
}

export interface Prefab {
  path: string;
  rcid: string;
}

export interface UsePrefab {
  path: string;
  rcid: string;
}

export interface Contusion {
  x: number;
  y: number;
  z: number;
}

export interface ArmorDistanceDistanceDamage {
  x: number;
  y: number;
  z: number;
}

export interface Blindness {
  x: number;
  y: number;
  z: number;
}

export interface doorbreacherbox {
  _id: string;
  _name: string;
  _parent: string;
  _type: string;
  _props: _props;
  _proto: string;
}

export interface StackSlots {
  _name: string;
  _id: string;
  _parent: string;
  _max_count: number;
  _props: _props;
  _proto: string;
}

export interface Filters {
  Filter: string[];
}
