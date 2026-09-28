import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator"

export class AdminLoginDto {
    @ApiProperty({ example: 'sourav@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: "password" })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string
}