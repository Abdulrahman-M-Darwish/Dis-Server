import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class SearchUsersDto {
  @IsNotEmpty()
  @IsString()
  search?: string;
  @IsOptional()
  @IsString()
  beforeId?: string;
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
