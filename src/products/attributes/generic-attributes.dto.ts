/**
 * Fallback schema for categories created dynamically by admin — no dedicated
 * attribute DTO exists for them, so any JSON object is accepted as-is (no
 * decorated properties means `validate()` never reports an error).
 */
export class GenericAttributesDto {}
