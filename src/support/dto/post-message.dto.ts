import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class PostMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body!: string;
}
