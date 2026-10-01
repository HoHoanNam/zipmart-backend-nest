import { IsString } from 'class-validator';

/**
 * The CSV content itself, as text in the JSON body — not a multipart file
 * upload. This app has no generic file-upload infra outside Cloudinary
 * image uploads (`src/uploads`), and a CSV's content is small text, so the
 * admin-web client reads the file locally and posts its text content here,
 * same "no new upload infra" spirit as `Product.images` being plain URLs.
 */
export class DryRunImportDto {
  @IsString()
  csv!: string;
}
