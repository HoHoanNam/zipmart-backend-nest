import { CategorySlug } from '../categories/category.entity.js';
import { ApparelAttributesDto } from './attributes/apparel-attributes.dto.js';
import { ElectronicsAttributesDto } from './attributes/electronics-attributes.dto.js';
import { FoodAttributesDto } from './attributes/food-attributes.dto.js';
import { HouseholdAttributesDto } from './attributes/household-attributes.dto.js';

/** Which class validates `Product.attributes` for a given category slug. */
export const CATEGORY_ATTRIBUTE_SCHEMA: Record<CategorySlug, new () => object> = {
  [CategorySlug.ELECTRONICS]: ElectronicsAttributesDto,
  [CategorySlug.APPAREL]: ApparelAttributesDto,
  [CategorySlug.HOUSEHOLD]: HouseholdAttributesDto,
  [CategorySlug.FOOD]: FoodAttributesDto,
};
