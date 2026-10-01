import { IsString, Matches } from 'class-validator';

export class CreateCmsPageDto {
  /** Lowercase letters, digits, and hyphens only — used directly in the public URL (`/pages/:slug` on frontend-web). */
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug chỉ được chứa chữ thường, số và dấu gạch ngang',
  })
  slug!: string;

  @IsString()
  title!: string;

  @IsString()
  content!: string;
}
