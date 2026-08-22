import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // En NestJS + Passport (JwtStrategy), request.user contiene el payload validado del JWT
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
