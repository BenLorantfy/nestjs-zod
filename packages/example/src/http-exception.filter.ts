import { Logger, ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';
import { ZodSerializationException } from 'nestjs-zod';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const status = exception.getStatus();

        if (exception instanceof ZodSerializationException) {
            const zodError = exception.getZodError();
            this.logger.error(`ZodSerializationException: ${zodError.message}`);
        }

        response
            .status(status)
            .json({
                statusCode: status
            });
    }
}
