import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  register() {
    return { message: 'User Registered Successfully' };
  }
}
