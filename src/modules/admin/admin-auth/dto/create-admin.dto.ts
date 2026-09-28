import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from "class-validator";
import { AdminRole } from "../../../../generated/prisma/enums.js";

export class CreateAdminDto {
    @ApiProperty({ example: 'New Admin' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'sourav@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'strongPassword123' })
    @IsString()
    @MinLength(8)
    password: string;

    @ApiProperty({ enum: AdminRole, example: AdminRole.SUPPORT_ADMIN })
    @IsEnum(AdminRole)
    role: AdminRole;
}