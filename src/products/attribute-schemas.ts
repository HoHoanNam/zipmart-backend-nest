import { CategorySlug } from '../categories/category.entity.js';
import { ApparelAttributesDto } from './attributes/apparel-attributes.dto.js';
import { ElectronicsAttributesDto } from './attributes/electronics-attributes.dto.js';
import { FoodAttributesDto } from './attributes/food-attributes.dto.js';
import { GenericAttributesDto } from './attributes/generic-attributes.dto.js';
import { HouseholdAttributesDto } from './attributes/household-attributes.dto.js';

/**
 * Which class validates `Product.attributes` for a given category slug.
 * Keyed by `string` (not `CategorySlug`) because categories are no longer a
 * fixed 4-value set — admin can create new categories at runtime, and those
 * fall back to `DEFAULT_ATTRIBUTE_SCHEMA` below since no dedicated DTO can
 * be generated for them.
 */
export const CATEGORY_ATTRIBUTE_SCHEMA: Record<string, new () => object> = {
  [CategorySlug.ELECTRONICS]: ElectronicsAttributesDto,
  [CategorySlug.APPAREL]: ApparelAttributesDto,
  [CategorySlug.HOUSEHOLD]: HouseholdAttributesDto,
  [CategorySlug.FOOD]: FoodAttributesDto,
};

/** Fallback for any category slug not in `CATEGORY_ATTRIBUTE_SCHEMA` above. */
export const DEFAULT_ATTRIBUTE_SCHEMA: new () => object = GenericAttributesDto;
