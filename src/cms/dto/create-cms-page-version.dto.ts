import { IsString } from 'class-validator';

/** Creates a brand new immutable `CmsPageVersion` — "editing" a page's content, never an in-place update. */
export class CreateCmsPageVersionDto {
  @IsString()
  title!: string;

  @IsString()
  content!: string;
}
