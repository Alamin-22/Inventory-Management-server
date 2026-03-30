import { TBrand } from '@app/modules/auth/auth.interface';

export type TSequenceKey = 'heroStage.displayOrder' | 'category.displayOrder';
// add more keys here as you need

export interface ISharedCounter {
  storePreference: TBrand;
  key: TSequenceKey | string;
  seq: number;
}
